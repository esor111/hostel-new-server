import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not, IsNull, MoreThan } from 'typeorm';
import { MultiGuestBooking, MultiGuestBookingStatus } from './entities/multi-guest-booking.entity';
import { BookingGuest, GuestStatus } from './entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { Room } from '../rooms/entities/room.entity';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { CreateMultiGuestBookingDto } from './dto/multi-guest-booking.dto';
import { CreateBookingDto, ApproveBookingDto, RejectBookingDto } from './dto/create-booking.dto';
import { BedSyncService } from '../rooms/bed-sync.service';
import { BookingValidationService } from './validation/booking-validation.service';
import { NotificationCommunicationService } from '../notification-communication/notification-communication.service';
import { ConfigService } from '@nestjs/config';
import { BusinessIntegrationService } from '../hostel/services/business-integration.service';


export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: MultiGuestBookingStatus;
  contactEmail?: string;
  contactPhone?: string;
  checkInDate?: string;
  source?: string;
}

export interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalGuests: number;
  confirmedGuests: number;
  confirmationRate: number;
  averageGuestsPerBooking: number;
}

// Status mapping function to handle case-insensitive status queries
function mapStatusToEnum(status: string): MultiGuestBookingStatus | null {
  if (!status) return null;

  const statusMap: { [key: string]: MultiGuestBookingStatus } = {
    'pending': MultiGuestBookingStatus.PENDING,
    'confirmed': MultiGuestBookingStatus.CONFIRMED,
    'partially_confirmed': MultiGuestBookingStatus.PARTIALLY_CONFIRMED,
    'rejected': MultiGuestBookingStatus.REJECTED,
    'cancelled': MultiGuestBookingStatus.CANCELLED,
    'completed': MultiGuestBookingStatus.COMPLETED,
    // Also handle the actual enum values in case they're passed directly
    'Pending': MultiGuestBookingStatus.PENDING,
    'Confirmed': MultiGuestBookingStatus.CONFIRMED,
    'Partially_Confirmed': MultiGuestBookingStatus.PARTIALLY_CONFIRMED,
    'Rejected': MultiGuestBookingStatus.REJECTED,
    'Cancelled': MultiGuestBookingStatus.CANCELLED,
    'Completed': MultiGuestBookingStatus.COMPLETED
  };

  return statusMap[status.toLowerCase()] || statusMap[status] || null;
}

export interface ConfirmationResult {
  success: boolean;
  message: string;
  bookingId: string;
  confirmedGuests: number;
  failedAssignments?: string[];
}

export interface CancellationResult {
  success: boolean;
  message: string;
  bookingId: string;
  reason: string;
  releasedBeds: string[];
}

@Injectable()
export class MultiGuestBookingService {
  private readonly logger = new Logger(MultiGuestBookingService.name);

  constructor(
    @InjectRepository(MultiGuestBooking)
    private multiGuestBookingRepository: Repository<MultiGuestBooking>,
    @InjectRepository(BookingGuest)
    private bookingGuestRepository: Repository<BookingGuest>,
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private dataSource: DataSource,
    private bedSyncService: BedSyncService,
    private validationService: BookingValidationService,
    private notificationService: NotificationCommunicationService,
    private configService: ConfigService,
    private businessIntegrationService: BusinessIntegrationService,
  ) { }

  async createMultiGuestBooking(createDto: CreateMultiGuestBookingDto, hostelId?: string, userId?: string): Promise<any> {
    // Extract data from the nested structure
    const bookingData = createDto.data;
    this.logger.log(`Creating multi-guest booking for ${bookingData.contactPerson.name} with ${bookingData.guests.length} guests`);

    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async manager => {
      try {
        // Comprehensive validation using validation service
        const dataValidation = this.validationService.validateBookingData(bookingData);
        if (!dataValidation.isValid) {
          throw new BadRequestException(`Booking data validation failed: ${dataValidation.errors.join('; ')}`);
        }

        const bedIds = bookingData.guests.map(guest => guest.bedId);

        // Validate bed IDs
        const bedValidation = await this.validationService.validateBedIds(bedIds);
        if (!bedValidation.isValid) {
          throw new BadRequestException(`Bed validation failed: ${bedValidation.errors.join('; ')}`);
        }

        // Gender validation removed - any guest can book any bed

        // Get bed details for booking creation
        const beds = await manager.find(Bed, {
          where: bedIds.map(bedId => ({ id: bedId })),
          relations: ['room']
        });

        // Create booking
        const booking = manager.create(MultiGuestBooking, {
          hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
          userId: userId, // Store user ID from JWT token
          contactName: bookingData.contactPerson.name,
          contactPhone: bookingData.contactPerson.phone,
          contactEmail: bookingData.contactPerson.email,
          checkInDate: bookingData.checkInDate ? new Date(bookingData.checkInDate) : null,
          duration: bookingData.duration,
          notes: bookingData.notes,
          emergencyContact: bookingData.emergencyContact,
          source: bookingData.source || 'mobile_app',
          totalGuests: bookingData.guests.length,
          confirmedGuests: 0,
          bookingReference: this.generateBookingReference(),
          status: MultiGuestBookingStatus.PENDING
        });

        const savedBooking = await manager.save(MultiGuestBooking, booking);

        // Create guest records
        const guests = bookingData.guests.map((guestDto: any) => {
          const bed = beds.find(b => b.id === guestDto.bedId);
          this.logger.log(`Creating guest record for ${guestDto.name} in bed ${guestDto.bedId}`);
          return manager.create(BookingGuest, {
            bookingId: savedBooking.id,
            bedId: guestDto.bedId,
            guestName: guestDto.name,
            age: guestDto.age,
            gender: guestDto.gender,
            status: GuestStatus.PENDING,
            assignedRoomNumber: bed?.room?.roomNumber,
            assignedBedNumber: bed?.bedIdentifier // Still use bedIdentifier for display
          });
        });

        const savedGuests = await manager.save(BookingGuest, guests);
        this.logger.log(`✅ Created ${savedGuests.length} guest records`);

        // Reserve beds temporarily using BedSyncService for proper synchronization
        await this.bedSyncService.handleBookingStatusChange(
          bedIds,
          BedStatus.RESERVED,
          savedBooking.bookingReference
        );

        this.logger.log(`✅ Created multi-guest booking ${savedBooking.bookingReference} with ${guests.length} guests`);

        // Trigger notification for new booking request (to hostel admins)
        try {
          await this.notificationService.sendBookingRequestNotification({
            bookingId: savedBooking.id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: bookingData.checkInDate,
            contactName: bookingData.contactPerson.name,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: bookingData.guests.length
          });
          this.logger.log(`📱 Notification sent for new booking: ${savedBooking.bookingReference}`);
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking request notification: ${notificationError.message}`);
        }

        // Return complete booking with guests using transaction manager
        const bookingWithGuests = await manager.findOne(MultiGuestBooking, {
          where: { id: savedBooking.id },
          relations: ['guests']
        });

        return this.transformToApiResponse(bookingWithGuests);
      } catch (error) {
        this.logger.error(`❌ Error creating multi-guest booking: ${error.message}`);
        throw error;
      }
    });
  }

  async findBookingById(id: string) {
    // Try to find booking by UUID first, then by booking reference
    let booking = await this.multiGuestBookingRepository.findOne({
      where: { id },
      relations: ['guests']
    });

    // If not found by UUID, try by booking reference
    if (!booking) {
      booking = await this.multiGuestBookingRepository.findOne({
        where: { bookingReference: id },
        relations: ['guests']
      });
    }

    if (!booking) {
      throw new NotFoundException('Multi-guest booking not found');
    }

    return this.transformToApiResponse(booking);
  }

  /**
   * Find booking entity by ID for internal use (returns raw entity)
   */
  async findBookingEntityById(id: string): Promise<MultiGuestBooking> {
    // Try to find booking by UUID first, then by booking reference
    let booking = await this.multiGuestBookingRepository.findOne({
      where: { id },
      relations: ['guests']
    });

    // If not found by UUID, try by booking reference
    if (!booking) {
      booking = await this.multiGuestBookingRepository.findOne({
        where: { bookingReference: id },
        relations: ['guests']
      });
    }

    if (!booking) {
      throw new NotFoundException('Multi-guest booking not found');
    }

    return booking;
  }

  async updateBooking(id: string, updateDto: any): Promise<any> {
    this.logger.log(`Updating multi-guest booking ${id}`);

    return await this.dataSource.transaction(async manager => {
      try {
        // Try to find booking by UUID first, then by booking reference
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

        // If not found by UUID, try by booking reference
        if (!booking) {
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: id },
            relations: ['guests']
          });
        }

        if (!booking) {
          throw new NotFoundException('Multi-guest booking not found');
        }

        // Map legacy fields to multi-guest fields
        const updateData: any = {};

        if (updateDto.name) updateData.contactName = updateDto.name;
        if (updateDto.phone) updateData.contactPhone = updateDto.phone;
        if (updateDto.email) updateData.contactEmail = updateDto.email;
        if (updateDto.guardianName) updateData.guardianName = updateDto.guardianName;
        if (updateDto.guardianPhone) updateData.guardianPhone = updateDto.guardianPhone;
        if (updateDto.preferredRoom) updateData.preferredRoom = updateDto.preferredRoom;
        if (updateDto.course) updateData.course = updateDto.course;
        if (updateDto.institution) updateData.institution = updateDto.institution;
        if (updateDto.checkInDate) updateData.checkInDate = new Date(updateDto.checkInDate);
        if (updateDto.duration) updateData.duration = updateDto.duration;
        if (updateDto.notes) updateData.notes = updateDto.notes;
        if (updateDto.emergencyContact) updateData.emergencyContact = updateDto.emergencyContact;
        if (updateDto.address) updateData.address = updateDto.address;
        if (updateDto.idProofType) updateData.idProofType = updateDto.idProofType;
        if (updateDto.idProofNumber) updateData.idProofNumber = updateDto.idProofNumber;

        // Update the booking using the actual booking ID
        await manager.update(MultiGuestBooking, booking.id, updateData);

        // Return the updated booking
        const updatedBooking = await manager.findOne(MultiGuestBooking, {
          where: { id: booking.id },
          relations: ['guests']
        });

        this.logger.log(`✅ Updated multi-guest booking ${booking.id}`);
        return this.transformToApiResponse(updatedBooking);
      } catch (error) {
        this.logger.error(`❌ Error updating booking ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  async confirmBooking(id: string, processedBy?: string, hostelId?: string): Promise<ConfirmationResult> {
    this.logger.log(`Confirming multi-guest booking ${id}`);

    return await this.dataSource.transaction(async manager => {
      try {
        // Try to find booking by UUID first, then by booking reference
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

        // If not found by UUID, try by booking reference
        if (!booking) {
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: id },
            relations: ['guests']
          });
        }

        if (!booking) {
          throw new NotFoundException('Multi-guest booking not found');
        }

        if (booking.status !== MultiGuestBookingStatus.PENDING) {
          throw new BadRequestException(`Cannot confirm booking with status: ${booking.status}`);
        }

        // Validate beds are still reserved for this booking
        const bedIds = booking.guests.map(guest => guest.bedId);
        const beds = await manager.find(Bed, {
          where: bedIds.map(bedId => ({ id: bedId }))
        });

        const failedAssignments: string[] = [];
        const successfulAssignments: string[] = [];

        // Check each bed's current status
        for (const guest of booking.guests) {
          const bed = beds.find(b => b.id === guest.bedId);
          if (!bed) {
            failedAssignments.push(`Bed ${guest.bedId} no longer exists`);
          } else if (bed.status !== BedStatus.RESERVED) {
            failedAssignments.push(`Bed ${guest.bedId} is no longer reserved (status: ${bed.status})`);
          } else {
            successfulAssignments.push(guest.bedId);
          }
        }

        // If any assignments failed, handle partial confirmation
        let finalStatus = MultiGuestBookingStatus.CONFIRMED;
        let confirmedGuestCount = booking.totalGuests;

        // Initialize guest assignments array for bed sync service
        const guestAssignments: Array<{
          bedId: string;
          guestName: string;
          guestId: string;
        }> = [];

        if (failedAssignments.length > 0) {
          if (successfulAssignments.length === 0) {
            // All assignments failed
            throw new BadRequestException(`Cannot confirm booking: ${failedAssignments.join('; ')}`);
          } else {
            // Partial confirmation
            finalStatus = MultiGuestBookingStatus.PARTIALLY_CONFIRMED;
            confirmedGuestCount = successfulAssignments.length;
          }
        }

        for (const guest of booking.guests) {
          if (successfulAssignments.includes(guest.bedId)) {
            // Confirm guest
            await manager.update(BookingGuest, guest.id, {
              status: GuestStatus.CONFIRMED
            });

            // Prepare assignment for bed sync service
            guestAssignments.push({
              bedId: guest.bedId,
              guestName: guest.guestName,
              guestId: guest.id
            });
          } else {
            // Cancel failed guest assignments
            await manager.update(BookingGuest, guest.id, {
              status: GuestStatus.CANCELLED
            });
          }
        }

        // Handle booking confirmation with proper bed synchronization within transaction
        if (guestAssignments.length > 0) {
          try {
            await this.handleBedConfirmationWithinTransaction(manager, booking.id, guestAssignments);
            this.logger.log(`✅ Bed confirmation completed successfully within transaction`);
          } catch (bedError) {
            this.logger.error(`❌ Error during bed confirmation within transaction: ${bedError.message}`);
            throw bedError;
          }
        }

        // Update booking status AFTER bed confirmation
        await manager.update(MultiGuestBooking, booking.id, {
          status: finalStatus,
          confirmedGuests: confirmedGuestCount,
          processedBy: processedBy || 'admin',
          processedDate: new Date()
        });
        this.logger.log(`✅ Updated booking status to ${finalStatus} with ${confirmedGuestCount} confirmed guests`);

        // Create student profiles for confirmed guests
        const createdStudents = [];
        this.logger.log(`🎓 Creating student profiles for confirmed guests`);

        for (const guest of booking.guests) {
          if (successfulAssignments.includes(guest.bedId)) {
            try {
              this.logger.log(`🎓 Attempting to create student for guest: ${guest.guestName}`);
              const student = await this.createStudentFromGuest(manager, guest, booking, {
                processedBy: processedBy || 'admin',
                assignedRoom: null, // Will be handled by bed assignment
                createStudent: true
              });
              createdStudents.push(student);
              this.logger.log(`✅ Created student profile for guest: ${guest.guestName}`);
            } catch (studentError) {
              this.logger.error(`❌ Failed to create student for guest ${guest.guestName}: ${studentError.message}`);
              this.logger.error(`❌ Student creation error stack: ${studentError.stack}`);
              // Don't let student creation failure cause transaction rollback
              // Just log the error and continue - this ensures booking confirmation still succeeds
            }
          }
        }

        this.logger.log(`✅ Confirmed multi-guest booking ${booking.bookingReference} (${confirmedGuestCount}/${booking.totalGuests} guests, ${createdStudents.length} students created)`);

        // Trigger notification for booking confirmation (to contact person)
        try {
          this.logger.log(`📱 Attempting to send booking confirmation notification for: ${booking.bookingReference}`);
          await this.notificationService.sendBookingConfirmedNotification({
            bookingId: booking.id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: booking.checkInDate ? booking.checkInDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            contactName: booking.contactName,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: confirmedGuestCount
          });
          this.logger.log(`📱 Booking confirmation notification sent successfully: ${booking.bookingReference}`);
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking confirmation notification: ${notificationError.message}`);
          // Don't let notification failure cause transaction rollback
        }

        this.logger.log(`🎯 About to return confirmation result for booking ${booking.bookingReference}`);

        const result = {
          success: true,
          message: failedAssignments.length > 0
            ? `Booking partially confirmed: ${confirmedGuestCount}/${booking.totalGuests} guests assigned, ${createdStudents.length} students created`
            : `Multi-guest booking confirmed successfully, ${createdStudents.length} students created`,
          bookingId: booking.id,
          confirmedGuests: confirmedGuestCount,
          createdStudents: createdStudents.length,
          students: createdStudents,
          failedAssignments: failedAssignments.length > 0 ? failedAssignments : undefined
        };

        this.logger.log(`🎯 Returning confirmation result: ${JSON.stringify(result)}`);
        return result;

      } catch (error) {
        this.logger.error(`❌ Error confirming booking ${id}: ${error.message}`);
        this.logger.error(`❌ Error stack: ${error.stack}`);
        throw error;
      }
    });
  }

  async cancelBooking(id: string, reason: string, hostelId?: string): Promise<CancellationResult> {
    this.logger.log(`Cancelling multi-guest booking ${id}: ${reason}`);

    return await this.dataSource.transaction(async manager => {
      try {
        // Try to find booking by UUID first, then by booking reference
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

        // If not found by UUID, try by booking reference
        if (!booking) {
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: id },
            relations: ['guests']
          });
        }

        if (!booking) {
          throw new NotFoundException('Multi-guest booking not found');
        }

        if (booking.status === MultiGuestBookingStatus.CANCELLED) {
          throw new BadRequestException('Booking is already cancelled');
        }

        if (booking.status === MultiGuestBookingStatus.COMPLETED) {
          throw new BadRequestException('Cannot cancel completed booking');
        }

        // Update booking status using the actual booking ID
        await manager.update(MultiGuestBooking, booking.id, {
          status: MultiGuestBookingStatus.CANCELLED,
          cancellationReason: reason,
          processedDate: new Date()
        });

        // Update guest statuses using the actual booking ID
        await manager.update(BookingGuest, { bookingId: booking.id }, {
          status: GuestStatus.CANCELLED
        });

        // Release beds using BedSyncService for proper synchronization
        const bedIds = booking.guests.map(guest => guest.bedId);
        await this.bedSyncService.handleBookingCancellation(bedIds, reason);

        // All beds are considered released for the response
        const releasedBeds = bedIds;

        this.logger.log(`✅ Cancelled multi-guest booking ${booking.bookingReference}, released ${releasedBeds.length} beds`);

        return {
          success: true,
          message: 'Multi-guest booking cancelled successfully',
          bookingId: booking.id,
          reason,
          releasedBeds
        };
      } catch (error) {
        this.logger.error(`❌ Error cancelling booking ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  async getAllBookings(filters: BookingFilters = {}, hostelId?: string): Promise<any> {
    const {
      page = 1,
      limit = 50,
      status,
      contactEmail,
      contactPhone,
      checkInDate,
      source
    } = filters;

    this.logger.log(`Fetching multi-guest bookings with filters: ${JSON.stringify(filters)}`);

    const queryBuilder = this.multiGuestBookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guests', 'guests');

    // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
    if (hostelId) {
      queryBuilder.andWhere('booking.hostelId = :hostelId', { hostelId });
    }

    // Apply filters
    if (status) {
      const mappedStatus = mapStatusToEnum(status as string);
      if (mappedStatus) {
        queryBuilder.andWhere('booking.status = :status', { status: mappedStatus });
      } else {
        this.logger.warn(`Invalid status value provided: ${status}`);
        // Return empty result for invalid status
        return {
          items: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }
    }

    if (contactEmail) {
      queryBuilder.andWhere('booking.contactEmail ILIKE :email', { email: `%${contactEmail}%` });
    }

    if (contactPhone) {
      queryBuilder.andWhere('booking.contactPhone ILIKE :phone', { phone: `%${contactPhone}%` });
    }

    if (checkInDate) {
      queryBuilder.andWhere('booking.checkInDate = :checkInDate', { checkInDate });
    }

    if (source) {
      queryBuilder.andWhere('booking.source = :source', { source });
    }

    // Get all bookings first for custom sorting
    queryBuilder.orderBy('booking.createdAt', 'DESC');
    const [allBookings, total] = await queryBuilder.getManyAndCount();

    // Sort by status priority (Pending first), then by creation date
    const statusPriority = {
      'Pending': 1,
      'Confirmed': 2,
      'Partially_Confirmed': 3,
      'Completed': 4,
      'Cancelled': 5,
      'Rejected': 6
    };

    const sortedBookings = allBookings.sort((a, b) => {
      const aPriority = statusPriority[a.status] || 7;
      const bPriority = statusPriority[b.status] || 7;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination to sorted results
    const offset = (page - 1) * limit;
    const bookings = sortedBookings.slice(offset, offset + limit);

    // Transform bookings to include preferredRoom
    const transformedBookings = bookings.map(booking => this.transformToApiResponse(booking));

    return {
      items: transformedBookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getBookingStats(hostelId?: string): Promise<BookingStats> {
    this.logger.log('Generating multi-guest booking statistics');

    try {
      const [
        totalBookings,
        pendingBookings,
        confirmedBookings,
        partiallyConfirmedBookings,
        cancelledBookings,
        completedBookings,
        totalGuests,
        confirmedGuests,
        averageGuestsResult
      ] = await Promise.all([
        this.multiGuestBookingRepository.count(),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.PENDING }
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.CONFIRMED }
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.PARTIALLY_CONFIRMED }
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.CANCELLED }
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.COMPLETED }
        }),
        this.bookingGuestRepository.count(),
        this.bookingGuestRepository.count({
          where: { status: GuestStatus.CONFIRMED }
        }),
        this.multiGuestBookingRepository
          .createQueryBuilder('booking')
          .select('AVG(booking.totalGuests)', 'average')
          .getRawOne()
      ]);

      const effectiveConfirmedBookings = confirmedBookings + partiallyConfirmedBookings;
      const confirmationRate = totalBookings > 0 ?
        (effectiveConfirmedBookings / totalBookings) * 100 : 0;

      const averageGuestsPerBooking = averageGuestsResult?.average ?
        parseFloat(averageGuestsResult.average) : 0;

      const stats: BookingStats = {
        totalBookings,
        pendingBookings,
        confirmedBookings: effectiveConfirmedBookings,
        cancelledBookings,
        completedBookings,
        totalGuests,
        confirmedGuests,
        confirmationRate: Math.round(confirmationRate * 100) / 100,
        averageGuestsPerBooking: Math.round(averageGuestsPerBooking * 100) / 100
      };

      this.logger.log(`✅ Generated booking stats: ${totalBookings} total, ${effectiveConfirmedBookings} confirmed, ${confirmationRate.toFixed(1)}% rate`);

      return stats;
    } catch (error) {
      this.logger.error(`❌ Error generating booking statistics: ${error.message}`);
      throw error;
    }
  }

  private transformToApiResponse(booking: MultiGuestBooking) {
    // Get the room number from the first guest's assigned room (for preferredRoom field)
    const preferredRoom = booking.guests?.[0]?.assignedRoomNumber || booking.preferredRoom || null;

    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      contactPerson: {
        name: booking.contactName,
        phone: booking.contactPhone,
        email: booking.contactEmail
      },
      preferredRoom: preferredRoom, // Show actual room number instead of bed ID
      guests: booking.guests?.map(guest => ({
        id: guest.id,
        bedId: guest.bedId,
        name: guest.guestName,
        age: guest.age,
        gender: guest.gender,
        status: guest.status,
        assignedRoomNumber: guest.assignedRoomNumber,
        assignedBedNumber: guest.assignedBedNumber
      })) || [],
      checkInDate: booking.checkInDate,
      duration: booking.duration,
      status: booking.status,
      totalGuests: booking.totalGuests,
      confirmedGuests: booking.confirmedGuests,
      notes: booking.notes,
      emergencyContact: booking.emergencyContact,
      source: booking.source,
      processedBy: booking.processedBy,
      processedDate: booking.processedDate,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }

  /**
   * Transform booking data to the new My Bookings response format
   */
  private async transformToMyBookingsResponse(booking: MultiGuestBooking) {
    // Debug logging to see what we're getting
    this.logger.log(`🔍 DEBUG - Booking ID: ${booking.id}, Reference: ${booking.bookingReference}`);

    // Get enhanced business data for hostel
    let hostelInfo: any = {
      hostelId: booking.hostelId,
      hostelName: booking.hostel?.name || 'Kaha Hostel',
      location: 'Kathmandu, Nepal'
    };

    try {
      if (booking.hostel?.businessId) {
        const businessData = await this.businessIntegrationService.getBusinessData(booking.hostel.businessId);
        if (businessData) {
          hostelInfo = {
            hostelId: booking.hostelId,
            hostelName: businessData.name,
            location: businessData.address || 'Kathmandu, Nepal',
            avatar: businessData.avatar,
            kahaId: businessData.kahaId
          };
        }
      }
    } catch (error) {
      this.logger.error(`Error enhancing hostel info for booking ${booking.id}:`, error);
      // Keep original hostelInfo on error
    }

    const actualBookingId = booking.id; // Store the actual UUID
    const result = {
      id: actualBookingId, // Use actual booking UUID
      status: booking.status.toLowerCase(),
      hostelInfo,
      details: booking.guests?.map(guest => ({
        roomInfo: {
          roomId: guest.bed?.room?.id || guest.bedId.split('-')[0],
          roomType: this.getRoomTypeFromBedCount(guest.bed?.room?.bedCount),
          roomFloor: this.extractFloorFromRoomNumber(guest.bed?.room?.roomNumber),
          capacity: guest.bed?.room?.bedCount || 2
        },
        bedInfo: {
          bedId: guest.bed?.bedIdentifier || guest.bedId,
          status: guest.status.toLowerCase()
        },
        guestInfo: {
          studentId: guest.id,
          studentName: guest.guestName,
          appliedDate: booking.createdAt.toISOString().split('T')[0]
        }
      })) || [],
      createdAt: booking.createdAt.toISOString()
    };

    this.logger.log(`🔍 DEBUG - Returning result with ID: ${result.id}`);
    return result;
  }

  /**
   * Helper method to determine room type based on bed count
   */
  private getRoomTypeFromBedCount(bedCount?: number): string {
    if (!bedCount) return 'Single Room';

    switch (bedCount) {
      case 1:
        return 'Single Room';
      case 2:
        return 'Double Sharing';
      case 3:
        return 'Triple Sharing';
      case 4:
        return 'Quad Sharing';
      default:
        return `${bedCount}-Bed Room`;
    }
  }

  /**
   * Helper method to extract floor number from room number
   */
  private extractFloorFromRoomNumber(roomNumber?: string): number {
    if (!roomNumber) return 1;

    // Try to extract floor from room number (e.g., R101 -> floor 1, R201 -> floor 2)
    const match = roomNumber.match(/\d+/);
    if (match) {
      const number = parseInt(match[0]);
      return Math.floor(number / 100) || 1;
    }

    return 1; // Default to floor 1
  }

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: MultiGuestBookingStatus, hostelId?: string): Promise<any[]> {
    // Build where condition conditionally
    const whereCondition: any = { status };
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const bookings = await this.multiGuestBookingRepository.find({
      where: whereCondition,
      relations: ['guests'],
      order: { createdAt: 'DESC' }
    });

    // Transform bookings to include preferredRoom
    return bookings.map(booking => this.transformToApiResponse(booking));
  }

  /**
   * Get pending bookings (for admin dashboard)
   */
  async getPendingBookings(hostelId?: string): Promise<any[]> {
    return this.getBookingsByStatus(MultiGuestBookingStatus.PENDING, hostelId);
  }

  /**
   * Search bookings by contact information
   */
  async searchBookings(searchTerm: string, hostelId?: string): Promise<any[]> {
    const queryBuilder = this.multiGuestBookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guests', 'guests');

    // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
    if (hostelId) {
      queryBuilder.andWhere('booking.hostelId = :hostelId', { hostelId });
    }

    queryBuilder
      .andWhere('(booking.contactName ILIKE :term OR booking.contactEmail ILIKE :term OR booking.contactPhone ILIKE :term OR booking.bookingReference ILIKE :term)', { term: `%${searchTerm}%` })
      .orderBy('booking.createdAt', 'DESC');

    const bookings = await queryBuilder.getMany();
    return bookings.map(booking => this.transformToApiResponse(booking));
  }

  /**
   * Get bookings for a specific date range
   */
  async getBookingsByDateRange(startDate: Date, endDate: Date, hostelId?: string): Promise<any[]> {
    // Build where condition conditionally
    const whereCondition: any = {
      checkInDate: {
        gte: startDate,
        lte: endDate
      } as any
    };
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const bookings = await this.multiGuestBookingRepository.find({
      where: whereCondition,
      relations: ['guests'],
      order: { checkInDate: 'ASC' }
    });

    return bookings.map(booking => this.transformToApiResponse(booking));
  }

  /**
   * Get user's bookings with proper authentication
   */
  async getUserBookings(userId: string, filters: any = {}): Promise<any> {
    const {
      page = 1,
      limit = 20,
      status
    } = filters;

    this.logger.log(`Fetching bookings for user: ${userId}`);

    const queryBuilder = this.multiGuestBookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guests', 'guests')
      .leftJoinAndSelect('guests.bed', 'bed')
      .leftJoinAndSelect('bed.room', 'room')
      .leftJoinAndSelect('booking.hostel', 'hostel')
      .where('booking.userId = :userId', { userId });

    // Apply status filter if provided
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    // Get all bookings first for custom sorting
    queryBuilder.orderBy('booking.createdAt', 'DESC');
    const [allBookings, total] = await queryBuilder.getManyAndCount();

    // Sort by status priority (Pending first), then by creation date
    const statusPriority = {
      'Pending': 1,
      'Confirmed': 2,
      'Partially_Confirmed': 3,
      'Completed': 4,
      'Cancelled': 5,
      'Rejected': 6
    };

    const sortedBookings = allBookings.sort((a, b) => {
      const aPriority = statusPriority[a.status] || 7;
      const bPriority = statusPriority[b.status] || 7;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Apply pagination to sorted results
    const offset = (page - 1) * limit;
    const bookings = sortedBookings.slice(offset, offset + limit);

    // Transform bookings with enhanced business data
    const transformedBookings = await Promise.all(
      bookings.map(booking => this.transformToMyBookingsResponse(booking))
    );

    return {
      data: transformedBookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Cancel user's own booking
   */
  async cancelUserBooking(bookingId: string, userId: string, reason: string): Promise<any> {
    this.logger.log(`User ${userId} cancelling booking ${bookingId}`);

    return await this.dataSource.transaction(async manager => {
      try {
        // Try to find booking by UUID first, then by booking reference
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id: bookingId, userId },
          relations: ['guests']
        });

        // If not found by UUID, try by booking reference
        if (!booking) {
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: bookingId, userId },
            relations: ['guests']
          });
        }

        if (!booking) {
          throw new NotFoundException('Booking not found or you do not have permission to cancel it');
        }

        if (booking.status === MultiGuestBookingStatus.CANCELLED) {
          throw new BadRequestException('Booking is already cancelled');
        }

        if (booking.status === MultiGuestBookingStatus.COMPLETED) {
          throw new BadRequestException('Cannot cancel completed booking');
        }

        // Update booking status using the actual booking ID
        await manager.update(MultiGuestBooking, booking.id, {
          status: MultiGuestBookingStatus.CANCELLED,
          cancellationReason: reason,
          processedDate: new Date()
        });

        // Update guest statuses using the actual booking ID
        await manager.update(BookingGuest, { bookingId: booking.id }, {
          status: GuestStatus.CANCELLED
        });

        // Release beds
        const bedIds = booking.guests.map(guest => guest.bedId);
        await this.bedSyncService.handleBookingCancellation(bedIds, reason);

        this.logger.log(`✅ User ${userId} cancelled booking ${booking.bookingReference}`);

        return {
          success: true,
          message: 'Booking cancelled successfully',
          bookingId: booking.id,
          reason
        };
      } catch (error) {
        this.logger.error(`❌ Error cancelling user booking ${bookingId}: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Update booking status (internal method)
   */
  async updateBookingStatus(id: string, status: MultiGuestBookingStatus, processedBy?: string): Promise<void> {
    await this.multiGuestBookingRepository.update(id, {
      status,
      processedBy: processedBy || 'system',
      processedDate: new Date()
    });
  }

  /**
   * Get booking summary for reporting
   */
  async getBookingSummary(startDate?: Date, endDate?: Date, hostelId?: string): Promise<any> {
    const queryBuilder = this.multiGuestBookingRepository.createQueryBuilder('booking');

    if (startDate && endDate) {
      queryBuilder.where('booking.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    const [bookings, totalRevenue] = await Promise.all([
      queryBuilder.getMany(),
      queryBuilder
        .leftJoin('booking.guests', 'guest')
        .leftJoin(Bed, 'bed', 'bed.id = guest.bedId')
        .select('SUM(bed.monthlyRate)', 'total')
        .where('booking.status IN (:...statuses)', {
          statuses: [MultiGuestBookingStatus.CONFIRMED, MultiGuestBookingStatus.PARTIALLY_CONFIRMED]
        })
        .getRawOne()
    ]);

    const summary = {
      totalBookings: bookings.length,
      totalGuests: bookings.reduce((sum, booking) => sum + booking.totalGuests, 0),
      confirmedBookings: bookings.filter(b =>
        b.status === MultiGuestBookingStatus.CONFIRMED ||
        b.status === MultiGuestBookingStatus.PARTIALLY_CONFIRMED
      ).length,
      pendingBookings: bookings.filter(b => b.status === MultiGuestBookingStatus.PENDING).length,
      cancelledBookings: bookings.filter(b => b.status === MultiGuestBookingStatus.CANCELLED).length,
      estimatedRevenue: totalRevenue?.total ? parseFloat(totalRevenue.total) : 0,
      averageGuestsPerBooking: bookings.length > 0 ?
        bookings.reduce((sum, booking) => sum + booking.totalGuests, 0) / bookings.length : 0
    };

    return summary;
  }

  /**
   * Validate bed availability for multiple beds
   */
  async validateMultipleBedAvailability(bedIds: string[]): Promise<{
    available: string[];
    unavailable: string[];
    conflicts: { bedId: string; reason: string }[];
  }> {
    const beds = await this.bedRepository.find({
      where: bedIds.map(bedId => ({ id: bedId }))
    });

    const available: string[] = [];
    const unavailable: string[] = [];
    const conflicts: { bedId: string; reason: string }[] = [];

    for (const bedId of bedIds) {
      const bed = beds.find(b => b.id === bedId);

      if (!bed) {
        unavailable.push(bedId);
        conflicts.push({ bedId, reason: 'Bed not found' });
      } else if (bed.status !== BedStatus.AVAILABLE) {
        unavailable.push(bedId);
        conflicts.push({ bedId, reason: `Bed status is ${bed.status}` });
      } else {
        available.push(bedId);
      }
    }

    return { available, unavailable, conflicts };
  }

  /**
   * Create single guest booking (for backward compatibility with BookingRequest)
   */
  async createSingleGuestBooking(dto: CreateBookingDto): Promise<any> {
    this.logger.log(`Creating single guest booking for ${dto.name}`);

    // Convert single guest booking to multi-guest format
    const multiGuestDto: CreateMultiGuestBookingDto = {
      data: {
        contactPerson: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email
        },
        guests: [{
          bedId: dto.preferredRoom || 'auto-assign',
          name: dto.name,
          age: 18, // Default age for single guest bookings
          gender: 'Any' as any, // Default gender
          idProofType: dto.idProofType,
          idProofNumber: dto.idProofNumber,
          emergencyContact: dto.emergencyContact,
          notes: dto.notes
        }],
        checkInDate: dto.checkInDate,
        duration: dto.duration?.toString(),
        notes: dto.notes,
        emergencyContact: dto.emergencyContact,
        source: dto.source || 'website'
      }
    };

    // Use transaction for data consistency
    return await this.dataSource.transaction(async manager => {
      try {
        // Create booking with enhanced fields from BookingRequest
        const booking = manager.create(MultiGuestBooking, {
          contactName: dto.name,
          contactPhone: dto.phone,
          contactEmail: dto.email,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          preferredRoom: dto.preferredRoom,
          course: dto.course,
          institution: dto.institution,
          requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
          checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : null,
          duration: dto.duration?.toString(),
          status: this.mapBookingStatusToMultiGuest(dto.status || 'pending'),
          notes: dto.notes,
          emergencyContact: dto.emergencyContact,
          address: dto.address,
          idProofType: dto.idProofType,
          idProofNumber: dto.idProofNumber,
          source: dto.source || 'website',
          totalGuests: 1,
          confirmedGuests: 0,
          bookingReference: this.generateBookingReference(),
          priorityScore: this.calculatePriorityScore(dto)
        });

        const savedBooking = await manager.save(MultiGuestBooking, booking);

        // Create single guest record
        const guest = manager.create(BookingGuest, {
          bookingId: savedBooking.id,
          bedId: dto.preferredRoom || 'auto-assign',
          guestName: dto.name,
          age: 18, // Default age
          gender: 'Any' as any, // Default gender
          status: GuestStatus.PENDING,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          course: dto.course,
          institution: dto.institution,
          address: dto.address,
          idProofType: dto.idProofType,
          idProofNumber: dto.idProofNumber,
          phone: dto.phone,
          email: dto.email,
          assignedRoomNumber: dto.preferredRoom,
          assignedBedNumber: dto.preferredRoom
        });

        await manager.save(BookingGuest, guest);

        this.logger.log(`✅ Created single guest booking ${savedBooking.bookingReference}`);

        return this.transformToBookingRequestFormat(savedBooking, [guest]);
      } catch (error) {
        this.logger.error(`❌ Error creating single guest booking: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Approve booking (enhanced for single guest compatibility)
   */
  async approveBooking(id: string, approvalData: ApproveBookingDto, hostelId?: string): Promise<any> {
    this.logger.log(`Approving booking ${id}`);

    return await this.dataSource.transaction(async manager => {
      try {
        const booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        if (booking.status !== MultiGuestBookingStatus.PENDING) {
          throw new BadRequestException(`Cannot approve booking with status: ${booking.status}`);
        }

        // Update booking status
        await manager.update(MultiGuestBooking, id, {
          status: MultiGuestBookingStatus.CONFIRMED,
          confirmedGuests: booking.totalGuests,
          processedBy: approvalData.processedBy || 'admin',
          processedDate: new Date(),
          approvedDate: new Date(),
          assignedRoom: approvalData.assignedRoom
        });

        // Update guest statuses
        await manager.update(BookingGuest, { bookingId: id }, {
          status: GuestStatus.CONFIRMED,
          assignedRoomNumber: approvalData.assignedRoom,
          assignedBedNumber: approvalData.assignedBed || 'B1' // Fixed: Use separate bed assignment or default
        });

        // Create student profiles if requested
        const students = [];
        if (approvalData.createStudent) {
          for (const guest of booking.guests) {
            const student = await this.createStudentFromGuest(manager, guest, booking, approvalData);
            students.push(student);
          }
        }

        this.logger.log(`✅ Approved booking ${booking.bookingReference}`);

        // Trigger notification for booking approval (to contact person)
        try {
          await this.notificationService.sendBookingApprovedNotification({
            bookingId: id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: booking.checkInDate ? booking.checkInDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            contactName: booking.contactName,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: booking.totalGuests
          });
          this.logger.log(`📱 Booking approval notification sent: ${booking.bookingReference}`);
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking approval notification: ${notificationError.message}`);
        }

        return {
          success: true,
          message: 'Booking approved successfully',
          bookingId: id,
          approvedDate: new Date(),
          students: students
        };
      } catch (error) {
        this.logger.error(`❌ Error approving booking ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * Reject booking (updated for new rejection flow)
   */
  async rejectBooking(bookingId: string, reason: string, processedBy: string, hostelId?: string) {
    this.logger.log(`Admin ${processedBy} rejecting booking ${bookingId} with reason: ${reason}`);

    return await this.dataSource.transaction(async manager => {
      // Try to find booking by UUID first, then by booking reference
      let booking = await manager.findOne(MultiGuestBooking, {
        where: { id: bookingId },
        relations: ['guests']
      });

      // If not found by UUID, try by booking reference
      if (!booking) {
        booking = await manager.findOne(MultiGuestBooking, {
          where: { bookingReference: bookingId },
          relations: ['guests']
        });
      }

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Check if booking can be rejected
      if (booking.status === MultiGuestBookingStatus.REJECTED) {
        throw new BadRequestException('Booking is already rejected');
      }

      if (booking.status === MultiGuestBookingStatus.CONFIRMED || booking.status === MultiGuestBookingStatus.COMPLETED) {
        throw new BadRequestException('Cannot reject a confirmed or completed booking');
      }

      // Update booking status to REJECTED (not CANCELLED)
      booking.status = MultiGuestBookingStatus.REJECTED;
      booking.rejectionReason = reason;
      booking.processedDate = new Date();
      booking.processedBy = processedBy;

      await manager.save(MultiGuestBooking, booking);

      // Update guest statuses
      await manager.update(
        BookingGuest,
        { bookingId: booking.id },
        { status: GuestStatus.CANCELLED }
      );

      // Release reserved beds
      const bedIds = booking.guests.map(guest => guest.bedId);
      await this.bedSyncService.handleBookingCancellation(bedIds, reason);

      this.logger.log(`✅ Admin rejected booking ${bookingId}`);

      // Send rejection notification
      try {
        await this.notificationService.sendBookingRejectedNotification({
          bookingId: booking.id,
          contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
          hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
          checkInDate: booking.checkInDate ? booking.checkInDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          contactName: booking.contactName,
          hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
          reason: reason
        });
        this.logger.log(`📱 Rejection notification sent for booking: ${booking.bookingReference}`);
      } catch (notificationError) {
        this.logger.warn(`⚠️ Failed to send rejection notification: ${notificationError.message}`);
      }

      return {
        success: true,
        message: 'Booking rejected successfully',
        bookingId: booking.id,
        reason: reason,
        releasedBeds: bedIds
      };
    });
  }

  /**
   * Get booking statistics (enhanced to include single guest bookings)
   */
  async getEnhancedBookingStats(): Promise<any> {
    this.logger.log('Generating enhanced booking statistics');

    try {
      const [
        totalBookings,
        pendingBookings,
        approvedBookings,
        rejectedBookings,
        cancelledBookings,
        singleGuestBookings,
        multiGuestBookings,
        totalGuests,
        confirmedGuests,
        sourceBreakdown,
        monthlyTrend
      ] = await Promise.all([
        this.multiGuestBookingRepository.count(),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.PENDING }
        }),
        this.multiGuestBookingRepository.count({
          where: [
            { status: MultiGuestBookingStatus.CONFIRMED },
            { status: MultiGuestBookingStatus.PARTIALLY_CONFIRMED }
          ]
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.REJECTED }
        }),
        this.multiGuestBookingRepository.count({
          where: { status: MultiGuestBookingStatus.CANCELLED }
        }),
        this.multiGuestBookingRepository.count({
          where: { totalGuests: 1 }
        }),
        this.multiGuestBookingRepository.count({
          where: { totalGuests: MoreThan(1) }
        }),
        this.bookingGuestRepository.count(),
        this.bookingGuestRepository.count({
          where: { status: GuestStatus.CONFIRMED }
        }),
        this.multiGuestBookingRepository
          .createQueryBuilder('booking')
          .select('booking.source', 'source')
          .addSelect('COUNT(*)', 'count')
          .groupBy('booking.source')
          .getRawMany(),
        this.multiGuestBookingRepository
          .createQueryBuilder('booking')
          .select('DATE_TRUNC(\'month\', booking.requestDate)', 'month')
          .addSelect('COUNT(*)', 'count')
          .where('booking.requestDate >= :sixMonthsAgo', {
            sixMonthsAgo: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
          })
          .groupBy('DATE_TRUNC(\'month\', booking.requestDate)')
          .orderBy('month', 'ASC')
          .getRawMany()
      ]);

      const approvalRate = totalBookings > 0 ? (approvedBookings / totalBookings) * 100 : 0;

      const sources = {};
      sourceBreakdown.forEach(row => {
        sources[row.source] = parseInt(row.count);
      });

      const stats = {
        totalBookings,
        pendingBookings,
        approvedBookings,
        rejectedBookings,
        cancelledBookings: cancelledBookings - rejectedBookings, // Cancelled but not rejected
        singleGuestBookings,
        multiGuestBookings,
        totalGuests,
        confirmedGuests,
        approvalRate: Math.round(approvalRate * 100) / 100,
        sourceBreakdown: sources,
        monthlyTrend: monthlyTrend.map(row => ({
          month: row.month,
          count: parseInt(row.count)
        }))
      };

      this.logger.log(`✅ Generated enhanced booking stats: ${totalBookings} total, ${approvedBookings} approved, ${approvalRate.toFixed(1)}% rate`);

      return stats;
    } catch (error) {
      this.logger.error(`❌ Error generating enhanced booking statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform MultiGuestBooking to BookingRequest format for API compatibility
   */
  private transformToBookingRequestFormat(booking: MultiGuestBooking, guests?: BookingGuest[]): any {
    const primaryGuest = guests?.[0] || booking.guests?.[0];

    return {
      id: booking.id,
      name: primaryGuest?.guestName || booking.contactName,
      phone: booking.contactPhone, // Use booking contact phone
      email: booking.contactEmail, // Use booking contact email
      guardianName: booking.guardianName, // Use booking guardian info
      guardianPhone: booking.guardianPhone, // Use booking guardian info
      preferredRoom: booking.preferredRoom,
      course: booking.course, // Use booking course info
      institution: booking.institution, // Use booking institution info
      requestDate: booking.requestDate,
      checkInDate: booking.checkInDate,
      duration: booking.duration,
      status: this.mapMultiGuestStatusToBooking(booking.status),
      notes: booking.notes,
      emergencyContact: booking.emergencyContact,
      address: booking.address, // Use booking address
      idProofType: booking.idProofType || primaryGuest?.idProofType,
      idProofNumber: booking.idProofNumber || primaryGuest?.idProofNumber,
      approvedDate: booking.approvedDate,
      processedBy: booking.processedBy,
      rejectionReason: booking.rejectionReason,
      assignedRoom: booking.assignedRoom,
      priorityScore: booking.priorityScore,
      source: booking.source,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };
  }

  /**
   * Map booking status from BookingRequest to MultiGuestBooking
   */
  private mapBookingStatusToMultiGuest(status: string): MultiGuestBookingStatus {
    switch (status.toLowerCase()) {
      case 'pending':
        return MultiGuestBookingStatus.PENDING;
      case 'approved':
        return MultiGuestBookingStatus.CONFIRMED;
      case 'rejected':
      case 'cancelled':
        return MultiGuestBookingStatus.CANCELLED;
      default:
        return MultiGuestBookingStatus.PENDING;
    }
  }

  /**
   * Map MultiGuestBooking status to BookingRequest format
   */
  private mapMultiGuestStatusToBooking(status: MultiGuestBookingStatus): string {
    switch (status) {
      case MultiGuestBookingStatus.PENDING:
        return 'Pending';
      case MultiGuestBookingStatus.CONFIRMED:
      case MultiGuestBookingStatus.PARTIALLY_CONFIRMED:
        return 'Approved';
      case MultiGuestBookingStatus.CANCELLED:
        return 'Rejected';
      case MultiGuestBookingStatus.COMPLETED:
        return 'Approved';
      default:
        return 'Pending';
    }
  }

  /**
   * Calculate priority score (from BookingRequest logic)
   */
  private calculatePriorityScore(bookingData: CreateBookingDto): number {
    let score = 0;

    // Early application bonus
    const daysUntilCheckIn = bookingData.checkInDate ?
      Math.floor((new Date(bookingData.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    if (daysUntilCheckIn > 30) score += 10;
    else if (daysUntilCheckIn > 7) score += 5;

    // Complete information bonus
    if (bookingData.guardianName && bookingData.guardianPhone) score += 5;
    if (bookingData.emergencyContact) score += 3;
    if (bookingData.idProofType && bookingData.idProofNumber) score += 5;

    // Duration bonus (longer stays get priority)
    if (bookingData.duration && bookingData.duration > 12) score += 10;
    else if (bookingData.duration && bookingData.duration > 6) score += 5;

    return score;
  }

  /**
   * Handle bed confirmation within transaction to ensure consistency
   */
  private async handleBedConfirmationWithinTransaction(
    manager: any,
    bookingId: string,
    guestAssignments: Array<{
      bedId: string;
      guestName: string;
      guestId: string;
    }>
  ): Promise<void> {
    this.logger.log(`✅ Handling bed confirmation within transaction for booking ${bookingId}`);

    for (const assignment of guestAssignments) {
      // Update bed status within the transaction
      await manager.update(Bed, assignment.bedId, {
        status: BedStatus.RESERVED,
        currentOccupantId: assignment.guestId,
        currentOccupantName: assignment.guestName,
        occupiedSince: new Date(),
        notes: `Reserved by ${assignment.guestName} via booking ${bookingId}`
      });

      this.logger.log(`✅ Bed ${assignment.bedId} confirmed within transaction: RESERVED → RESERVED for ${assignment.guestName}`);
    }

    // Schedule room occupancy updates to happen after transaction commits
    setImmediate(async () => {
      try {
        for (const assignment of guestAssignments) {
          const bed = await this.dataSource.getRepository('beds').findOne({
            where: { id: assignment.bedId },
            relations: ['room']
          });
          if (bed?.room) {
            // Use the bed sync service for room occupancy calculation only
            await this.bedSyncService.updateRoomOccupancyFromBeds(bed.room.id);
            this.logger.log(`✅ Updated room occupancy for room ${bed.room.id} after bed confirmation`);
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to update room occupancy after confirmation: ${error.message}`);
      }
    });
  }

  /**
   * Create student from guest (for approval workflow)
   */
  private async createStudentFromGuest(
    manager: any,
    guest: BookingGuest,
    booking: MultiGuestBooking,
    approvalData: ApproveBookingDto
  ): Promise<Student> {
    // Get room information from the bed assignment
    let roomUuid = null;
    if (guest.bedId) {
      // Find the bed and get its room
      const bed = await manager.findOne(Bed, {
        where: { id: guest.bedId },
        relations: ['room']
      });

      if (bed && bed.room) {
        roomUuid = bed.room.id;
        this.logger.log(`✅ Found room UUID ${roomUuid} from bed ${guest.bedId}`);
      } else {
        this.logger.warn(`⚠️ Could not find room for bed ${guest.bedId}`);
      }
    }

    // Fallback: try to use assignedRoom if provided
    if (!roomUuid && approvalData.assignedRoom) {
      const roomValidation = await this.validationService.validateAndConvertRoomNumber(approvalData.assignedRoom);

      if (roomValidation.isValid) {
        roomUuid = roomValidation.roomUuid;
        this.logger.log(`✅ Found room UUID ${roomUuid} for room number ${approvalData.assignedRoom}`);
      } else {
        this.logger.error(`❌ Room validation failed: ${roomValidation.error}`);
        // Don't throw error, just log warning and continue without room assignment
        this.logger.warn(`⚠️ Continuing student creation without room assignment`);
      }
    }

    // Generate unique email and phone for each guest to avoid unique constraint violations
    let guestEmail = `${guest.guestName.toLowerCase().replace(/\s+/g, '.')}.${guest.id}@guest.booking`;

    // Check if email already exists and modify if needed
    const existingEmailStudent = await manager.findOne(Student, { where: { email: guestEmail } });
    if (existingEmailStudent) {
      const timestamp = Date.now().toString().slice(-6);
      guestEmail = `${guest.guestName.toLowerCase().replace(/\s+/g, '.')}.${guest.id}.${timestamp}@guest.booking`;
      this.logger.warn(`Generated email already exists, using ${guestEmail} instead`);
    }

    // Generate unique phone number with strict 20-character limit
    let guestPhone = booking.contactPhone; // Use booking contact phone as base
    if (guestPhone) {
      // Generate phone from booking contact phone with unique suffix
      const basePhone = booking.contactPhone.replace(/[^0-9]/g, ''); // Keep only digits
      const uniqueSuffix = guest.id.slice(-4); // Last 4 chars of guest ID
      const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp

      // Ensure total length stays under 20 characters
      const maxBaseLength = 20 - uniqueSuffix.length - timestamp.length;
      const truncatedBase = basePhone.slice(0, maxBaseLength);
      guestPhone = `${truncatedBase}${uniqueSuffix}${timestamp}`;
    } else {
      // Since we don't have guest phone, use booking phone with uniqueness
      const existingStudent = await manager.findOne(Student, { where: { phone: guestPhone } });
      if (existingStudent) {
        // Generate unique phone by modifying the existing one
        const basePhone = guestPhone.replace(/[^0-9]/g, '').slice(0, 15); // Keep only digits, max 15
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits
        guestPhone = `${basePhone}${timestamp}`;
        this.logger.warn(`Phone already exists, using ${guestPhone} instead`);
      }
    }

    // Final safety check: ensure phone is within 20 character limit
    if (guestPhone.length > 20) {
      guestPhone = guestPhone.slice(0, 20);
      this.logger.warn(`Phone number truncated to fit database limit: ${guestPhone}`);
    }

    const student = manager.create(Student, {
      name: guest.guestName,
      phone: guestPhone,
      email: guestEmail,
      enrollmentDate: new Date(),
      status: StudentStatus.PENDING_CONFIGURATION, // Fixed: Use correct status for pending configuration
      address: booking.address, // Use booking address instead of guest address
      bedNumber: guest.assignedBedNumber,
      roomId: roomUuid, // Fixed: Use UUID instead of room number
      hostelId: booking.hostelId, // Ensure student belongs to the same hostel as the booking
      isConfigured: false, // Ensure this is false for pending configuration
      // bookingRequestId: null // Removed: Don't reference deleted booking_requests
    });

    const savedStudent = await manager.save(Student, student);

    this.logger.log(`✅ Created student profile for ${guest.guestName} (ID: ${savedStudent.id}) with room UUID: ${roomUuid}`);

    // Create RoomOccupant record if room is assigned
    if (roomUuid) {
      const RoomOccupant = (await import('../rooms/entities/room-occupant.entity')).RoomOccupant;
      const roomOccupant = manager.create(RoomOccupant, {
        roomId: roomUuid,
        studentId: savedStudent.id,
        checkInDate: booking.checkInDate || new Date(),
        bedNumber: guest.assignedBedNumber,
        status: 'Active',
        assignedBy: approvalData.processedBy || 'admin',
        notes: `Created from booking ${booking.bookingReference}`
      });

      await manager.save(RoomOccupant, roomOccupant);
      this.logger.log(`✅ Created RoomOccupant record for student ${savedStudent.id} in room ${roomUuid}`);

      // Update room occupancy count
      const Room = (await import('../rooms/entities/room.entity')).Room;
      const room = await manager.findOne(Room, { where: { id: roomUuid } });
      if (room) {
        const occupantCount = await manager.count(RoomOccupant, {
          where: { roomId: roomUuid, status: 'Active' }
        });
        await manager.update(Room, roomUuid, { occupancy: occupantCount });
        this.logger.log(`✅ Updated room ${roomUuid} occupancy to ${occupantCount}`);
      }
    }

    return savedStudent;
  }

  /**
   * Generate unique booking reference
   */
  private generateBookingReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MGB${timestamp.slice(-6)}${random}`;
  }





  /**
   * Transform booking to my-booking format
   */
  private async transformToMyBookingFormat(booking: MultiGuestBooking, userEmail?: string) {
    // Get enhanced business data for hostel
    let hostelInfo: any = {
      name: this.configService.get('HOSTEL_NAME', 'Kaha Hostel Control Center'),
      address: this.configService.get('HOSTEL_ADDRESS', 'Kathmandu, Nepal'),
      contactPhone: this.configService.get('HOSTEL_PHONE', '+977-1234567'),
      contactEmail: this.configService.get('HOSTEL_EMAIL', 'info@kahahostel.com')
    };

    try {
      if (booking.hostel?.businessId) {
        const businessData = await this.businessIntegrationService.getBusinessData(booking.hostel.businessId);
        if (businessData) {
          hostelInfo = {
            name: businessData.name,
            address: businessData.address || hostelInfo.address,
            contactPhone: hostelInfo.contactPhone, // Keep config phone
            contactEmail: hostelInfo.contactEmail, // Keep config email
            avatar: businessData.avatar,
            kahaId: businessData.kahaId
          };
        }
      }
    } catch (error) {
      this.logger.error(`Error enhancing hostel info for booking ${booking.id}:`, error);
      // Keep original hostelInfo on error
    }

    const details = booking.guests.map(guest => ({
      roomInfo: {
        id: guest.bed?.room?.id || 'unknown',
        name: guest.bed?.room?.name || `Room ${guest.bed?.room?.roomNumber || 'Unknown'}`,
        roomNumber: guest.bed?.room?.roomNumber || 'Unknown',
        gender: guest.bed?.room?.gender || 'Any',
        monthlyRate: guest.bed?.monthlyRate || guest.bed?.room?.monthlyRate || 15000
      },
      bedInfo: {
        id: guest.bed?.id || guest.bedId,
        bedNumber: guest.bed?.bedNumber || 'Unknown',
        bedType: 'Single', // Default bed type
        isOccupied: guest.bed?.status === BedStatus.OCCUPIED
      },
      guestInfo: {
        id: guest.id,
        guestName: guest.guestName,
        phone: booking.contactPhone, // Use booking contact phone as guest phone
        email: booking.contactEmail, // Use booking contact email as guest email
        age: guest.age,
        gender: guest.gender,
        status: guest.status.toLowerCase()
      }
    }));

    return {
      id: booking.id, // Use actual booking ID (UUID) instead of booking reference
      bookingReference: booking.bookingReference, // Keep booking reference for display/reference purposes
      status: booking.status.toLowerCase(),
      userEmail: userEmail || booking.contactEmail, // Include user email for identification
      hostelInfo,
      details
    };
  }

}