import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MultiGuestBooking, MultiGuestBookingStatus } from './entities/multi-guest-booking.entity';
import { BookingGuest, GuestStatus } from './entities/booking-guest.entity';
import { Bed, BedStatus } from '../rooms/entities/bed.entity';
import { CreateMultiGuestBookingDto } from './dto/multi-guest-booking.dto';

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
    private dataSource: DataSource,
  ) {}

  async createMultiGuestBooking(createDto: CreateMultiGuestBookingDto): Promise<any> {
    // Extract data from the nested structure
    const bookingData = createDto.data;
    this.logger.log(`Creating multi-guest booking for ${bookingData.contactPerson.name} with ${bookingData.guests.length} guests`);

    // Use transaction to ensure data consistency
    return await this.dataSource.transaction(async manager => {
      try {
        // Validate bed availability and get bed details
        const bedIds = bookingData.guests.map(guest => guest.bedId);
        const beds = await manager.find(Bed, {
          where: bedIds.map(bedId => ({ bedIdentifier: bedId })),
          relations: ['room']
        });

        // Validate all beds exist
        if (beds.length !== bedIds.length) {
          const foundBedIds = beds.map(bed => bed.bedIdentifier);
          const missingBeds = bedIds.filter(bedId => !foundBedIds.includes(bedId));
          throw new BadRequestException(`Beds not found: ${missingBeds.join(', ')}`);
        }

        // Check bed availability
        const unavailableBeds = beds.filter(bed => bed.status !== BedStatus.AVAILABLE);
        if (unavailableBeds.length > 0) {
          const unavailableBedIds = unavailableBeds.map(bed => bed.bedIdentifier);
          throw new BadRequestException(`Beds not available: ${unavailableBedIds.join(', ')}`);
        }

        // Validate gender compatibility
        const genderMismatches: string[] = [];
        for (const guest of bookingData.guests) {
          const bed = beds.find(b => b.bedIdentifier === guest.bedId);
          if (bed && bed.gender && bed.gender !== 'Any' && bed.gender !== guest.gender) {
            genderMismatches.push(
              `Bed ${guest.bedId} is designated for ${bed.gender} but guest ${guest.name} is ${guest.gender}`
            );
          }
        }

        if (genderMismatches.length > 0) {
          throw new BadRequestException(`Gender compatibility issues: ${genderMismatches.join('; ')}`);
        }

        // Validate no duplicate bed assignments
        const uniqueBedIds = new Set(bedIds);
        if (uniqueBedIds.size !== bedIds.length) {
          throw new BadRequestException('Cannot assign multiple guests to the same bed');
        }

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
          const bed = beds.find(b => b.bedIdentifier === guestDto.bedId);
          return manager.create(BookingGuest, {
            bookingId: savedBooking.id,
            bedId: guestDto.bedId,
            guestName: guestDto.name,
            age: guestDto.age,
            gender: guestDto.gender,
            status: GuestStatus.PENDING,
            assignedRoomNumber: bed?.room?.roomNumber,
            assignedBedNumber: bed?.bedNumber
          });
        });

        await manager.save(BookingGuest, guests);

        // Reserve beds temporarily
        for (const bedId of bedIds) {
          await manager.update(Bed, { bedIdentifier: bedId }, { 
            status: BedStatus.RESERVED,
            notes: `Reserved for booking ${savedBooking.bookingReference}`
          });
        }

        this.logger.log(`✅ Created multi-guest booking ${savedBooking.bookingReference} with ${guests.length} guests`);

        // Return complete booking with guests
        return this.findBookingById(savedBooking.id);
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
          where: bedIds.map(bedId => ({ bedIdentifier: bedId }))
        });

        const failedAssignments: string[] = [];
        const successfulAssignments: string[] = [];

        // Check each bed's current status
        for (const guest of booking.guests) {
          const bed = beds.find(b => b.bedIdentifier === guest.bedId);
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
        for (const guest of booking.guests) {
          if (successfulAssignments.includes(guest.bedId)) {
            // Confirm guest and assign bed
            await manager.update(BookingGuest, guest.id, {
              status: GuestStatus.CONFIRMED
            });

            // Update bed to occupied with occupant information
            await manager.update(Bed, { bedIdentifier: guest.bedId }, {
              status: BedStatus.OCCUPIED,
              currentOccupantId: guest.id,
              currentOccupantName: guest.guestName,
              occupiedSince: new Date(),
              notes: `Occupied by ${guest.guestName} via booking ${booking.bookingReference}`
            });
          } else {
            // Cancel failed guest assignments
            await manager.update(BookingGuest, guest.id, {
              status: GuestStatus.CANCELLED
            });
          }
        }

        this.logger.log(`✅ Confirmed multi-guest booking ${booking.bookingReference} (${confirmedGuestCount}/${booking.totalGuests} guests)`);

        return {
          success: true,
          message: failedAssignments.length > 0 
            ? `Booking partially confirmed: ${confirmedGuestCount}/${booking.totalGuests} guests assigned`
            : 'Multi-guest booking confirmed successfully',
          bookingId: id,
          confirmedGuests: confirmedGuestCount,
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

        // Release beds and track which ones were released
        const bedIds = booking.guests.map(guest => guest.bedId);
        const releasedBeds: string[] = [];

        for (const bedId of bedIds) {
          const bed = await manager.findOne(Bed, { where: { bedIdentifier: bedId } });
          if (bed) {
            // Only release if bed is reserved or occupied by this booking
            if (bed.status === BedStatus.RESERVED || 
                (bed.status === BedStatus.OCCUPIED && bed.currentOccupantName)) {
              await manager.update(Bed, { bedIdentifier: bedId }, {
                status: BedStatus.AVAILABLE,
                currentOccupantId: null,
                currentOccupantName: null,
                occupiedSince: null,
                notes: `Released due to booking cancellation: ${reason}`
              });
              releasedBeds.push(bedId);
            }
          }
        }

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
      items: bookings.map(booking => this.transformToApiResponse(booking)),
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
  async getBookingsByStatus(status: MultiGuestBookingStatus): Promise<any[]> {
    const bookings = await this.multiGuestBookingRepository.find({
      where: { status },
      relations: ['guests'],
      order: { createdAt: 'DESC' }
    });

    return bookings.map(booking => this.transformToApiResponse(booking));
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
        .leftJoin(Bed, 'bed', 'bed.bedIdentifier = guest.bedId')
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
      where: bedIds.map(bedId => ({ bedIdentifier: bedId }))
    });

    const available: string[] = [];
    const unavailable: string[] = [];
    const conflicts: { bedId: string; reason: string }[] = [];

    for (const bedId of bedIds) {
      const bed = beds.find(b => b.bedIdentifier === bedId);
      
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
   * Generate unique booking reference
   */
  private generateBookingReference(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MGB${timestamp.slice(-6)}${random}`;
  }
}