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
  ) {}

  async createMultiGuestBooking(createDto: CreateMultiGuestBookingDto): Promise<any> {
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

        // Validate gender compatibility
        const guestAssignments = bookingData.guests.map(guest => ({
          bedId: guest.bedId,
          gender: guest.gender
        }));
        
        const genderValidation = await this.validationService.validateGenderCompatibility(guestAssignments);
        if (!genderValidation.isValid) {
          throw new BadRequestException(`Gender compatibility validation failed: ${genderValidation.errors.join('; ')}`);
        }

        // Get bed details for booking creation
        const beds = await manager.find(Bed, {
          where: bedIds.map(bedId => ({ id: bedId })),
          relations: ['room']
        });

        // Create booking
        const booking = manager.create(MultiGuestBooking, {
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
    const booking = await this.multiGuestBookingRepository.findOne({
      where: { id },
      relations: ['guests']
    });

    if (!booking) {
      throw new NotFoundException('Multi-guest booking not found');
    }

    return this.transformToApiResponse(booking);
  }

  /**
   * Find booking entity by ID for internal use (returns raw entity)
   */
  async findBookingEntityById(id: string): Promise<MultiGuestBooking> {
    const booking = await this.multiGuestBookingRepository.findOne({
      where: { id },
      relations: ['guests']
    });

    if (!booking) {
      throw new NotFoundException('Multi-guest booking not found');
    }

    return booking;
  }

  async confirmBooking(id: string, processedBy?: string): Promise<ConfirmationResult> {
    this.logger.log(`Confirming multi-guest booking ${id}`);

    return await this.dataSource.transaction(async manager => {
      try {
        const booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

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

        // Update booking status
        await manager.update(MultiGuestBooking, id, {
          status: finalStatus,
          confirmedGuests: confirmedGuestCount,
          processedBy: processedBy || 'admin',
          processedDate: new Date()
        });

        // Update guest statuses and assign beds
        const guestAssignments = [];
        
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

        // Handle booking confirmation with proper bed synchronization
        if (guestAssignments.length > 0) {
          await this.bedSyncService.handleBookingConfirmation(id, guestAssignments);
        }

        // Create student profiles for confirmed guests
        const createdStudents = [];
        for (const guest of booking.guests) {
          if (successfulAssignments.includes(guest.bedId)) {
            try {
              const student = await this.createStudentFromGuest(manager, guest, booking, {
                processedBy: processedBy || 'admin',
                assignedRoom: null, // Will be handled by bed assignment
                createStudent: true
              });
              createdStudents.push(student);
              this.logger.log(`✅ Created student profile for guest: ${guest.guestName}`);
            } catch (studentError) {
              this.logger.error(`❌ Failed to create student for guest ${guest.guestName}: ${studentError.message}`);
            }
          }
        }

        this.logger.log(`✅ Confirmed multi-guest booking ${booking.bookingReference} (${confirmedGuestCount}/${booking.totalGuests} guests, ${createdStudents.length} students created)`);

        return {
          success: true,
          message: failedAssignments.length > 0 
            ? `Booking partially confirmed: ${confirmedGuestCount}/${booking.totalGuests} guests assigned, ${createdStudents.length} students created`
            : `Multi-guest booking confirmed successfully, ${createdStudents.length} students created`,
          bookingId: id,
          confirmedGuests: confirmedGuestCount,
          createdStudents: createdStudents.length,
          students: createdStudents,
          failedAssignments: failedAssignments.length > 0 ? failedAssignments : undefined
        };
      } catch (error) {
        this.logger.error(`❌ Error confirming booking ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  async cancelBooking(id: string, reason: string, processedBy?: string): Promise<CancellationResult> {
    this.logger.log(`Cancelling multi-guest booking ${id}: ${reason}`);

    return await this.dataSource.transaction(async manager => {
      try {
        const booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });

        if (!booking) {
          throw new NotFoundException('Multi-guest booking not found');
        }

        if (booking.status === MultiGuestBookingStatus.CANCELLED) {
          throw new BadRequestException('Booking is already cancelled');
        }

        if (booking.status === MultiGuestBookingStatus.COMPLETED) {
          throw new BadRequestException('Cannot cancel completed booking');
        }

        // Update booking status
        await manager.update(MultiGuestBooking, id, {
          status: MultiGuestBookingStatus.CANCELLED,
          cancellationReason: reason,
          processedBy: processedBy || 'admin',
          processedDate: new Date()
        });

        // Update guest statuses
        await manager.update(BookingGuest, { bookingId: id }, {
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
          bookingId: id,
          reason,
          releasedBeds
        };
      } catch (error) {
        this.logger.error(`❌ Error cancelling booking ${id}: ${error.message}`);
        throw error;
      }
    });
  }

  async getAllBookings(filters: BookingFilters = {}): Promise<any> {
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
    
    // Apply filters
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
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
    
    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('booking.createdAt', 'DESC');
    
    const [bookings, total] = await queryBuilder.getManyAndCount();
    
    return {
      items: bookings, // Return raw bookings for controller to transform
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

  async getBookingStats(): Promise<BookingStats> {
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
    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      contactPerson: {
        name: booking.contactName,
        phone: booking.contactPhone,
        email: booking.contactEmail
      },
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
   * Get bookings by status
   */
  async getBookingsByStatus(status: MultiGuestBookingStatus): Promise<MultiGuestBooking[]> {
    const bookings = await this.multiGuestBookingRepository.find({
      where: { status },
      relations: ['guests'],
      order: { createdAt: 'DESC' }
    });

    return bookings; // Return raw bookings for controller to transform
  }

  /**
   * Get pending bookings (for admin dashboard)
   */
  async getPendingBookings(): Promise<any[]> {
    return this.getBookingsByStatus(MultiGuestBookingStatus.PENDING);
  }

  /**
   * Search bookings by contact information
   */
  async searchBookings(searchTerm: string): Promise<any[]> {
    const queryBuilder = this.multiGuestBookingRepository.createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guests', 'guests')
      .where('booking.contactName ILIKE :term', { term: `%${searchTerm}%` })
      .orWhere('booking.contactEmail ILIKE :term', { term: `%${searchTerm}%` })
      .orWhere('booking.contactPhone ILIKE :term', { term: `%${searchTerm}%` })
      .orWhere('booking.bookingReference ILIKE :term', { term: `%${searchTerm}%` })
      .orderBy('booking.createdAt', 'DESC');

    const bookings = await queryBuilder.getMany();
    return bookings.map(booking => this.transformToApiResponse(booking));
  }

  /**
   * Get bookings for a specific date range
   */
  async getBookingsByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const bookings = await this.multiGuestBookingRepository.find({
      where: {
        checkInDate: {
          gte: startDate,
          lte: endDate
        } as any
      },
      relations: ['guests'],
      order: { checkInDate: 'ASC' }
    });

    return bookings.map(booking => this.transformToApiResponse(booking));
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
  async getBookingSummary(startDate?: Date, endDate?: Date): Promise<any> {
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
  async approveBooking(id: string, approvalData: ApproveBookingDto): Promise<any> {
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
   * Reject booking (enhanced for single guest compatibility)
   */
  async rejectBooking(id: string, rejectionData: RejectBookingDto): Promise<any> {
    this.logger.log(`Rejecting booking ${id}: ${rejectionData.reason}`);

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
          throw new BadRequestException(`Cannot reject booking with status: ${booking.status}`);
        }

        // Update booking status
        await manager.update(MultiGuestBooking, id, {
          status: MultiGuestBookingStatus.CANCELLED,
          processedBy: rejectionData.processedBy || 'admin',
          processedDate: new Date(),
          rejectionReason: rejectionData.reason
        });

        // Update guest statuses
        await manager.update(BookingGuest, { bookingId: id }, {
          status: GuestStatus.CANCELLED
        });

        // Release any reserved beds
        const bedIds = booking.guests.map(guest => guest.bedId).filter(bedId => bedId !== 'auto-assign');
        if (bedIds.length > 0) {
          await this.bedSyncService.handleBookingCancellation(bedIds, rejectionData.reason);
        }

        this.logger.log(`✅ Rejected booking ${booking.bookingReference}`);

        return {
          success: true,
          message: 'Booking rejected successfully',
          bookingId: id,
          reason: rejectionData.reason
        };
      } catch (error) {
        this.logger.error(`❌ Error rejecting booking ${id}: ${error.message}`);
        throw error;
      }
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
          where: { status: MultiGuestBookingStatus.CANCELLED, rejectionReason: Not(IsNull()) }
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
      phone: primaryGuest?.phone || booking.contactPhone,
      email: primaryGuest?.email || booking.contactEmail,
      guardianName: booking.guardianName || primaryGuest?.guardianName,
      guardianPhone: booking.guardianPhone || primaryGuest?.guardianPhone,
      preferredRoom: booking.preferredRoom,
      course: booking.course || primaryGuest?.course,
      institution: booking.institution || primaryGuest?.institution,
      requestDate: booking.requestDate,
      checkInDate: booking.checkInDate,
      duration: booking.duration,
      status: this.mapMultiGuestStatusToBooking(booking.status),
      notes: booking.notes,
      emergencyContact: booking.emergencyContact,
      address: booking.address || primaryGuest?.address,
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
   * Create student from guest (for approval workflow)
   */
  private async createStudentFromGuest(
    manager: any, 
    guest: BookingGuest, 
    booking: MultiGuestBooking, 
    approvalData: ApproveBookingDto
  ): Promise<Student> {
    // Fixed: Convert room number to UUID using validation service
    let roomUuid = null;
    if (approvalData.assignedRoom) {
      const roomValidation = await this.validationService.validateAndConvertRoomNumber(approvalData.assignedRoom);
      
      if (roomValidation.isValid) {
        roomUuid = roomValidation.roomUuid;
        this.logger.log(`✅ Found room UUID ${roomUuid} for room number ${approvalData.assignedRoom}`);
      } else {
        this.logger.error(`❌ Room validation failed: ${roomValidation.error}`);
        throw new BadRequestException(`Room assignment failed: ${roomValidation.error}`);
      }
    }

    // Generate unique email and phone for each guest to avoid unique constraint violations
    let guestEmail = guest.email || `${guest.guestName.toLowerCase().replace(/\s+/g, '.')}.${guest.id}@guest.booking`;
    
    // Check if email already exists and modify if needed
    const existingEmailStudent = await manager.findOne(Student, { where: { email: guestEmail } });
    if (existingEmailStudent) {
      const timestamp = Date.now().toString().slice(-6);
      guestEmail = `${guest.guestName.toLowerCase().replace(/\s+/g, '.')}.${guest.id}.${timestamp}@guest.booking`;
      this.logger.warn(`Email ${guest.email || 'generated email'} already exists, using ${guestEmail} instead`);
    }
    
    // Generate unique phone number with strict 20-character limit
    let guestPhone = guest.phone;
    if (!guestPhone) {
      // Generate phone from booking contact phone with unique suffix
      const basePhone = booking.contactPhone.replace(/[^0-9]/g, ''); // Keep only digits
      const uniqueSuffix = guest.id.slice(-4); // Last 4 chars of guest ID
      const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp
      
      // Ensure total length stays under 20 characters
      const maxBaseLength = 20 - uniqueSuffix.length - timestamp.length;
      const truncatedBase = basePhone.slice(0, maxBaseLength);
      guestPhone = `${truncatedBase}${uniqueSuffix}${timestamp}`;
    } else {
      // Check if provided phone already exists and modify if needed
      const existingStudent = await manager.findOne(Student, { where: { phone: guestPhone } });
      if (existingStudent) {
        // Generate unique phone by modifying the existing one
        const basePhone = guestPhone.replace(/[^0-9]/g, '').slice(0, 15); // Keep only digits, max 15
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits
        guestPhone = `${basePhone}${timestamp}`;
        this.logger.warn(`Phone ${guest.phone} already exists, using ${guestPhone} instead`);
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
      address: guest.address || booking.address,
      bedNumber: guest.assignedBedNumber,
      roomId: roomUuid, // Fixed: Use UUID instead of room number
      isConfigured: false, // Ensure this is false for pending configuration
      bookingRequestId: null // Fixed: Don't link to booking_requests table since we're using multi_guest_bookings
    });

    const savedStudent = await manager.save(Student, student);
    
    this.logger.log(`✅ Created student profile for ${guest.guestName} (ID: ${savedStudent.id}) with room UUID: ${roomUuid}`);
    
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

}