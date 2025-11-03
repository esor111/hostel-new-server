import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bed, BedStatus } from './entities/bed.entity';
import { Room } from './entities/room.entity';
import { BedSyncService } from './bed-sync.service';

export interface CreateBedDto {
  roomId: string;
  bedNumber: string;
  bedIdentifier: string;
  gender?: 'Male' | 'Female' | 'Any';
  monthlyRate?: number;
  description?: string;
  notes?: string;
}

export interface UpdateBedDto {
  bedNumber?: string;
  status?: BedStatus;
  gender?: 'Male' | 'Female' | 'Any';
  monthlyRate?: number;
  description?: string;
  notes?: string;
  maintenanceNotes?: string;
}

export interface AssignOccupantDto {
  occupantId: string;
  occupantName: string;
  checkInDate?: Date;
}

export interface BedAvailabilityFilter {
  roomId?: string;
  gender?: 'Male' | 'Female' | 'Any';
  status?: BedStatus;
  minRate?: number;
  maxRate?: number;
}

export interface BedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class BedService {
  private readonly logger = new Logger(BedService.name);

  constructor(
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private bedSyncService: BedSyncService,
  ) { }

  /**
   * Create a new bed entity
   */
  async create(createBedDto: CreateBedDto): Promise<Bed> {
    this.logger.log(`Creating new bed: ${createBedDto.bedIdentifier}`);

    try {
      // Validate room exists
      const room = await this.roomRepository.findOne({
        where: { id: createBedDto.roomId }
      });

      if (!room) {
        throw new NotFoundException(`Room with ID ${createBedDto.roomId} not found`);
      }

      // Check if bed identifier already exists
      const existingBed = await this.bedRepository.findOne({
        where: { bedIdentifier: createBedDto.bedIdentifier }
      });

      if (existingBed) {
        throw new ConflictException(`Bed with identifier ${createBedDto.bedIdentifier} already exists`);
      }

      // Create bed entity
      const bed = this.bedRepository.create({
        roomId: createBedDto.roomId,
        bedNumber: createBedDto.bedNumber,
        bedIdentifier: createBedDto.bedIdentifier,
        status: BedStatus.AVAILABLE,
        gender: createBedDto.gender || room.gender as 'Male' | 'Female' | 'Any' || 'Any',
        monthlyRate: createBedDto.monthlyRate || room.monthlyRate,
        description: createBedDto.description || `Bed ${createBedDto.bedNumber} in ${room.name}`,
        notes: createBedDto.notes,
        currentOccupantId: null,
        currentOccupantName: null,
        occupiedSince: null
      });

      const savedBed = await this.bedRepository.save(bed);
      this.logger.log(`✅ Created bed ${savedBed.bedIdentifier}`);

      return savedBed;
    } catch (error) {
      this.logger.error(`❌ Error creating bed ${createBedDto.bedIdentifier}:`, error);
      throw error;
    }
  }

  /**
   * Find all beds with optional filtering
   */
  async findAll(filter: BedAvailabilityFilter = {}): Promise<Bed[]> {
    const queryBuilder = this.bedRepository.createQueryBuilder('bed')
      .leftJoinAndSelect('bed.room', 'room');

    // Apply filters
    if (filter.roomId) {
      queryBuilder.andWhere('bed.roomId = :roomId', { roomId: filter.roomId });
    }

    if (filter.gender) {
      queryBuilder.andWhere('bed.gender = :gender', { gender: filter.gender });
    }

    if (filter.status) {
      queryBuilder.andWhere('bed.status = :status', { status: filter.status });
    }

    if (filter.minRate !== undefined) {
      queryBuilder.andWhere('bed.monthlyRate >= :minRate', { minRate: filter.minRate });
    }

    if (filter.maxRate !== undefined) {
      queryBuilder.andWhere('bed.monthlyRate <= :maxRate', { maxRate: filter.maxRate });
    }

    // Order by room number and bed number
    queryBuilder.orderBy('room.roomNumber', 'ASC')
      .addOrderBy('bed.bedNumber', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Find bed by ID
   */
  async findOne(id: string): Promise<Bed> {
    const bed = await this.bedRepository.findOne({
      where: { id },
      relations: ['room']
    });

    if (!bed) {
      throw new NotFoundException(`Bed with ID ${id} not found`);
    }

    return bed;
  }

  /**
   * Find bed by bed identifier
   */
  async findByBedIdentifier(bedIdentifier: string): Promise<Bed> {
    const bed = await this.bedRepository.findOne({
      where: { bedIdentifier },
      relations: ['room']
    });

    if (!bed) {
      throw new NotFoundException(`Bed with identifier ${bedIdentifier} not found`);
    }

    return bed;
  }

  /**
   * Update bed information
   */
  async update(id: string, updateBedDto: UpdateBedDto): Promise<Bed> {
    this.logger.log(`Updating bed ${id}`);

    try {
      const bed = await this.findOne(id);

      // Validate status change
      if (updateBedDto.status && updateBedDto.status !== bed.status) {
        await this.validateStatusChange(bed, updateBedDto.status);
      }

      // Update bed entity
      Object.assign(bed, updateBedDto);
      const updatedBed = await this.bedRepository.save(bed);

      this.logger.log(`✅ Updated bed ${updatedBed.bedIdentifier}`);
      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error updating bed ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete bed (soft delete by marking as out of order)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing bed ${id}`);

    try {
      const bed = await this.findOne(id);

      // Check if bed is occupied
      if (bed.status === BedStatus.OCCUPIED) {
        throw new BadRequestException('Cannot remove occupied bed');
      }

      // Delete the bed (if not occupied)
      if (bed.status === BedStatus.OCCUPIED || bed.status === BedStatus.RESERVED) {
        throw new BadRequestException('Cannot delete occupied or reserved bed');
      }
      
      await this.bedRepository.delete(id);

      this.logger.log(`✅ Deleted bed ${bed.bedIdentifier}`);
    } catch (error) {
      this.logger.error(`❌ Error removing bed ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get available beds with optional filtering
   */
  async getAvailableBeds(filter: BedAvailabilityFilter = {}): Promise<Bed[]> {
    return this.findAll({
      ...filter,
      status: BedStatus.AVAILABLE
    });
  }

  /**
   * Validate bed availability for assignment
   */
  async validateBedAvailability(bedId: string, guestGender?: string): Promise<BedValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const bed = await this.findOne(bedId);

      // Check bed status
      if (bed.status !== BedStatus.AVAILABLE) {
        errors.push(`Bed ${bed.bedIdentifier} is not available (status: ${bed.status})`);
      }

      // Gender validation removed - any guest can book any bed

      // Check if bed is in maintenance
      if (bed.status === BedStatus.MAINTENANCE) {
        errors.push(`Bed ${bed.bedIdentifier} is under maintenance`);
      }

      // Add warnings for potential issues
      if (bed.maintenanceNotes) {
        warnings.push(`Bed has maintenance notes: ${bed.maintenanceNotes}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Error validating bed: ${error.message}`],
        warnings
      };
    }
  }

  /**
   * Validate gender compatibility for bed assignment
   */
  async validateGenderCompatibility(bedId: string, guestGender: string): Promise<boolean> {
    // Gender validation removed - any guest can book any bed
    return true;
  }

  /**
   * Assign occupant to bed for booking confirmation (sets status to RESERVED)
   */
  async assignOccupant(bedId: string, assignDto: AssignOccupantDto): Promise<Bed> {
    this.logger.log(`Assigning occupant ${assignDto.occupantName} to bed ${bedId} for booking confirmation`);

    try {
      const bed = await this.findOne(bedId);

      // Validate bed is available or reserved
      if (bed.status !== BedStatus.AVAILABLE && bed.status !== BedStatus.RESERVED) {
        throw new BadRequestException(`Bed ${bed.bedIdentifier} is not available for assignment (status: ${bed.status})`);
      }

      // Update bed with occupant information - set to RESERVED for booking confirmation
      bed.status = BedStatus.RESERVED;
      bed.currentOccupantId = assignDto.occupantId;
      bed.currentOccupantName = assignDto.occupantName;
      bed.occupiedSince = assignDto.checkInDate || new Date();

      const updatedBed = await this.bedRepository.save(bed);

      // Trigger sync with bedPositions
      await this.syncBedStatusToPositions([updatedBed.roomId]);

      this.logger.log(`✅ Assigned occupant to bed ${updatedBed.bedIdentifier} with RESERVED status`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error assigning occupant to bed ${bedId}:`, error);
      throw error;
    }
  }

  /**
   * Check-in occupant to bed (sets status to OCCUPIED for actual physical occupancy)
   */
  async checkInOccupant(bedId: string, assignDto: AssignOccupantDto): Promise<Bed> {
    this.logger.log(`Checking in occupant ${assignDto.occupantName} to bed ${bedId}`);

    try {
      const bed = await this.findOne(bedId);

      // Validate bed is available or reserved
      if (bed.status !== BedStatus.AVAILABLE && bed.status !== BedStatus.RESERVED) {
        throw new BadRequestException(`Bed ${bed.bedIdentifier} is not available for check-in (status: ${bed.status})`);
      }

      // Update bed with occupant information - set to OCCUPIED for actual check-in
      bed.status = BedStatus.OCCUPIED;
      bed.currentOccupantId = assignDto.occupantId;
      bed.currentOccupantName = assignDto.occupantName;
      bed.occupiedSince = assignDto.checkInDate || new Date();

      const updatedBed = await this.bedRepository.save(bed);

      // Trigger sync with bedPositions
      await this.syncBedStatusToPositions([updatedBed.roomId]);

      this.logger.log(`✅ Checked in occupant to bed ${updatedBed.bedIdentifier} with OCCUPIED status`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error checking in occupant to bed ${bedId}:`, error);
      throw error;
    }
  }

  /**
   * Release occupant from bed
   */
  async releaseOccupant(bedId: string): Promise<Bed> {
    this.logger.log(`Releasing occupant from bed ${bedId}`);

    try {
      const bed = await this.findOne(bedId);

      // Validate bed is occupied
      if (bed.status !== BedStatus.OCCUPIED) {
        throw new BadRequestException(`Bed ${bed.bedIdentifier} is not currently occupied`);
      }

      // Clear occupant information
      bed.status = BedStatus.AVAILABLE;
      bed.currentOccupantId = null;
      bed.currentOccupantName = null;
      bed.occupiedSince = null;

      const updatedBed = await this.bedRepository.save(bed);

      // Trigger sync with bedPositions
      await this.syncBedStatusToPositions([updatedBed.roomId]);

      this.logger.log(`✅ Released occupant from bed ${updatedBed.bedIdentifier}`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error releasing occupant from bed ${bedId}:`, error);
      throw error;
    }
  }

  /**
   * Reserve bed for future assignment
   */
  async reserveBed(bedId: string, reservationNotes?: string): Promise<Bed> {
    this.logger.log(`Reserving bed ${bedId}`);

    try {
      const bed = await this.findOne(bedId);

      // Validate bed is available
      if (bed.status !== BedStatus.AVAILABLE) {
        throw new BadRequestException(`Bed ${bed.bedIdentifier} is not available for reservation`);
      }

      // Update bed status to reserved
      bed.status = BedStatus.RESERVED;
      if (reservationNotes) {
        bed.notes = reservationNotes;
      }

      const updatedBed = await this.bedRepository.save(bed);

      // Trigger sync with bedPositions
      await this.syncBedStatusToPositions([updatedBed.roomId]);

      this.logger.log(`✅ Reserved bed ${updatedBed.bedIdentifier}`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error reserving bed ${bedId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel bed reservation
   */
  async cancelReservation(bedId: string): Promise<Bed> {
    this.logger.log(`Cancelling reservation for bed ${bedId}`);

    try {
      const bed = await this.findOne(bedId);

      // Validate bed is reserved
      if (bed.status !== BedStatus.RESERVED) {
        throw new BadRequestException(`Bed ${bed.bedIdentifier} is not currently reserved`);
      }

      // Update bed status to available
      bed.status = BedStatus.AVAILABLE;

      const updatedBed = await this.bedRepository.save(bed);

      // Trigger sync with bedPositions
      await this.syncBedStatusToPositions([updatedBed.roomId]);

      this.logger.log(`✅ Cancelled reservation for bed ${updatedBed.bedIdentifier}`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error cancelling reservation for bed ${bedId}:`, error);
      throw error;
    }
  }

  /**
   * Update bed status with validation
   */
  async updateBedStatus(bedId: string, newStatus: BedStatus, notes?: string): Promise<Bed> {
    this.logger.log(`Updating bed ${bedId} status to ${newStatus}`);

    try {
      const bed = await this.findOne(bedId);

      // Validate status change
      await this.validateStatusChange(bed, newStatus);

      // Update bed status
      bed.status = newStatus;
      if (notes) {
        bed.notes = notes;
      }

      // Clear occupant data if bed becomes available
      if (newStatus === BedStatus.AVAILABLE) {
        bed.currentOccupantId = null;
        bed.currentOccupantName = null;
        bed.occupiedSince = null;
      }

      const updatedBed = await this.bedRepository.save(bed);
      this.logger.log(`✅ Updated bed ${updatedBed.bedIdentifier} status to ${newStatus}`);

      return updatedBed;
    } catch (error) {
      this.logger.error(`❌ Error updating bed ${bedId} status:`, error);
      throw error;
    }
  }

  /**
   * Get bed statistics
   */
  async getBedStatistics(roomId?: string): Promise<any> {
    const queryBuilder = this.bedRepository.createQueryBuilder('bed');

    if (roomId) {
      queryBuilder.where('bed.roomId = :roomId', { roomId });
    }

    const [
      totalBeds,
      availableBeds,
      occupiedBeds,
      reservedBeds,
      maintenanceBeds
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('bed.status = :status', { status: BedStatus.AVAILABLE }).getCount(),
      queryBuilder.clone().andWhere('bed.status = :status', { status: BedStatus.OCCUPIED }).getCount(),
      queryBuilder.clone().andWhere('bed.status = :status', { status: BedStatus.RESERVED }).getCount(),
      queryBuilder.clone().andWhere('bed.status = :status', { status: BedStatus.MAINTENANCE }).getCount(),
    ]);

    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    return {
      totalBeds,
      availableBeds,
      occupiedBeds,
      reservedBeds,
      maintenanceBeds,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    };
  }

  /**
   * Find beds by room ID
   */
  async findByRoomId(roomId: string): Promise<Bed[]> {
    return this.bedRepository.find({
      where: { roomId },
      relations: ['room'],
      order: { bedNumber: 'ASC' }
    });
  }

  // ========================================
  // INTERNAL BOOKING OPERATIONS
  // ========================================

  /**
   * Find multiple beds by bed identifiers (for mobile app booking)
   * Used by booking service to validate and reserve multiple beds
   */
  async findByBedIdentifiers(bedIdentifiers: string[]): Promise<Bed[]> {
    if (!bedIdentifiers || bedIdentifiers.length === 0) {
      return [];
    }

    const beds = await this.bedRepository.find({
      where: { bedIdentifier: In(bedIdentifiers) },
      relations: ['room']
    });

    this.logger.debug(`Found ${beds.length}/${bedIdentifiers.length} beds for identifiers: ${bedIdentifiers.join(', ')}`);
    return beds;
  }

  /**
   * Validate multiple bed availability for booking conflicts
   * Returns detailed validation results for each bed
   */
  async validateMultipleBedAvailability(bedIdentifiers: string[], guestGenders?: string[]): Promise<{
    valid: string[];
    invalid: { bedId: string; errors: string[] }[];
    warnings: { bedId: string; warnings: string[] }[];
  }> {
    this.logger.log(`Validating availability for beds: ${bedIdentifiers.join(', ')}`);

    const beds = await this.findByBedIdentifiers(bedIdentifiers);
    const valid: string[] = [];
    const invalid: { bedId: string; errors: string[] }[] = [];
    const warnings: { bedId: string; warnings: string[] }[] = [];

    for (let i = 0; i < bedIdentifiers.length; i++) {
      const bedId = bedIdentifiers[i];
      const bed = beds.find(b => b.bedIdentifier === bedId);
      const guestGender = guestGenders?.[i];

      if (!bed) {
        invalid.push({ bedId, errors: [`Bed ${bedId} not found`] });
        continue;
      }

      const validation = await this.validateBedAvailability(bed.id, guestGender);

      if (validation.isValid) {
        valid.push(bedId);
      } else {
        invalid.push({ bedId, errors: validation.errors });
      }

      if (validation.warnings.length > 0) {
        warnings.push({ bedId, warnings: validation.warnings });
      }
    }

    this.logger.log(`Validation result: ${valid.length} valid, ${invalid.length} invalid beds`);
    return { valid, invalid, warnings };
  }

  /**
   * Reserve multiple beds for booking (with automatic sync)
   * Used by booking service to reserve beds during booking creation
   */
  async reserveMultipleBeds(bedIdentifiers: string[], reservationNotes?: string): Promise<{
    reserved: string[];
    failed: { bedId: string; reason: string }[];
  }> {
    this.logger.log(`Reserving beds: ${bedIdentifiers.join(', ')}`);

    const beds = await this.findByBedIdentifiers(bedIdentifiers);
    const reserved: string[] = [];
    const failed: { bedId: string; reason: string }[] = [];

    for (const bedId of bedIdentifiers) {
      try {
        const bed = beds.find(b => b.bedIdentifier === bedId);
        if (!bed) {
          failed.push({ bedId, reason: 'Bed not found' });
          continue;
        }

        if (bed.status !== BedStatus.AVAILABLE) {
          failed.push({ bedId, reason: `Bed is ${bed.status}` });
          continue;
        }

        await this.reserveBed(bed.id, reservationNotes);
        reserved.push(bedId);
      } catch (error) {
        failed.push({ bedId, reason: error.message });
      }
    }

    // Trigger sync with bedPositions for all affected rooms
    await this.syncBedStatusToPositions(beds.map(b => b.roomId));

    this.logger.log(`Reserved ${reserved.length}/${bedIdentifiers.length} beds successfully`);
    return { reserved, failed };
  }

  /**
   * Release multiple beds from reservation/occupation (with automatic sync)
   * Used by booking service to release beds during cancellation
   */
  async releaseMultipleBeds(bedIdentifiers: string[]): Promise<{
    released: string[];
    failed: { bedId: string; reason: string }[];
  }> {
    this.logger.log(`Releasing beds: ${bedIdentifiers.join(', ')}`);

    const beds = await this.findByBedIdentifiers(bedIdentifiers);
    const released: string[] = [];
    const failed: { bedId: string; reason: string }[] = [];

    for (const bedId of bedIdentifiers) {
      try {
        const bed = beds.find(b => b.bedIdentifier === bedId);
        if (!bed) {
          failed.push({ bedId, reason: 'Bed not found' });
          continue;
        }

        if (bed.status === BedStatus.RESERVED) {
          await this.cancelReservation(bed.id);
          released.push(bedId);
        } else if (bed.status === BedStatus.OCCUPIED) {
          await this.releaseOccupant(bed.id);
          released.push(bedId);
        } else {
          // Already available, consider it released
          released.push(bedId);
        }
      } catch (error) {
        failed.push({ bedId, reason: error.message });
      }
    }

    // Trigger sync with bedPositions for all affected rooms
    await this.syncBedStatusToPositions(beds.map(b => b.roomId));

    this.logger.log(`Released ${released.length}/${bedIdentifiers.length} beds successfully`);
    return { released, failed };
  }

  /**
   * Reserve multiple beds for confirmed bookings (with automatic sync)
   * Used by booking service during booking confirmation - sets beds to RESERVED, not OCCUPIED
   */
  async reserveMultipleBedsForBooking(assignments: Array<{
    bedIdentifier: string;
    occupantId: string;
    occupantName: string;
    checkInDate?: Date;
  }>): Promise<{
    reserved: string[];
    failed: { bedId: string; reason: string }[];
  }> {
    this.logger.log(`Reserving beds for booking confirmation: ${assignments.length} beds`);

    const bedIdentifiers = assignments.map(a => a.bedIdentifier);
    const beds = await this.findByBedIdentifiers(bedIdentifiers);
    const reserved: string[] = [];
    const failed: { bedId: string; reason: string }[] = [];

    for (const assignment of assignments) {
      try {
        const bed = beds.find(b => b.bedIdentifier === assignment.bedIdentifier);
        if (!bed) {
          failed.push({ bedId: assignment.bedIdentifier, reason: 'Bed not found' });
          continue;
        }

        // Reserve bed with occupant information but keep status as RESERVED
        await this.bedRepository.update(bed.id, {
          status: BedStatus.RESERVED,
          currentOccupantId: assignment.occupantId,
          currentOccupantName: assignment.occupantName,
          occupiedSince: assignment.checkInDate || new Date(),
          notes: `Reserved for ${assignment.occupantName} via booking confirmation`
        });

        reserved.push(assignment.bedIdentifier);
      } catch (error) {
        failed.push({ bedId: assignment.bedIdentifier, reason: error.message });
      }
    }

    // Trigger sync with bedPositions for all affected rooms
    await this.syncBedStatusToPositions(beds.map(b => b.roomId));

    this.logger.log(`Reserved ${reserved.length}/${assignments.length} beds for booking confirmation`);
    return { reserved, failed };
  }

  /**
   * Assign multiple occupants to beds (with automatic sync)
   * Used for actual check-in when guests physically arrive - sets beds to OCCUPIED
   */
  async assignMultipleOccupants(assignments: Array<{
    bedIdentifier: string;
    occupantId: string;
    occupantName: string;
    checkInDate?: Date;
  }>): Promise<{
    assigned: string[];
    failed: { bedId: string; reason: string }[];
  }> {
    this.logger.log(`Assigning occupants to ${assignments.length} beds for actual check-in`);

    const bedIdentifiers = assignments.map(a => a.bedIdentifier);
    const beds = await this.findByBedIdentifiers(bedIdentifiers);
    const assigned: string[] = [];
    const failed: { bedId: string; reason: string }[] = [];

    for (const assignment of assignments) {
      try {
        const bed = beds.find(b => b.bedIdentifier === assignment.bedIdentifier);
        if (!bed) {
          failed.push({ bedId: assignment.bedIdentifier, reason: 'Bed not found' });
          continue;
        }

        await this.checkInOccupant(bed.id, {
          occupantId: assignment.occupantId,
          occupantName: assignment.occupantName,
          checkInDate: assignment.checkInDate
        });
        assigned.push(assignment.bedIdentifier);
      } catch (error) {
        failed.push({ bedId: assignment.bedIdentifier, reason: error.message });
      }
    }

    // Trigger sync with bedPositions for all affected rooms
    await this.syncBedStatusToPositions(beds.map(b => b.roomId));

    this.logger.log(`Assigned occupants to ${assigned.length}/${assignments.length} beds successfully`);
    return { assigned, failed };
  }

  /**
   * Update bed status with automatic sync to bedPositions
   * Enhanced version that triggers sync after status update
   */
  async updateBedStatusWithSync(bedId: string, newStatus: BedStatus, notes?: string): Promise<Bed> {
    const updatedBed = await this.updateBedStatus(bedId, newStatus, notes);

    // Trigger sync with bedPositions for this bed's room
    await this.syncBedStatusToPositions([updatedBed.roomId]);

    return updatedBed;
  }

  /**
   * Get bed availability summary for a room
   * Used by booking service to show available beds to mobile app
   */
  async getBedAvailabilitySummary(roomId: string): Promise<{
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
    reservedBeds: number;
    maintenanceBeds: number;
    availableBedIds: string[];
    occupiedBedIds: string[];
  }> {
    const beds = await this.findByRoomId(roomId);

    const availableBeds = beds.filter(b => b.status === BedStatus.AVAILABLE);
    const occupiedBeds = beds.filter(b => b.status === BedStatus.OCCUPIED);
    const reservedBeds = beds.filter(b => b.status === BedStatus.RESERVED);
    const maintenanceBeds = beds.filter(b => b.status === BedStatus.MAINTENANCE);

    return {
      totalBeds: beds.length,
      availableBeds: availableBeds.length,
      occupiedBeds: occupiedBeds.length,
      reservedBeds: reservedBeds.length,
      maintenanceBeds: maintenanceBeds.length,
      availableBedIds: availableBeds.map(b => b.bedIdentifier),
      occupiedBedIds: occupiedBeds.map(b => b.bedIdentifier)
    };
  }

  /**
   * Find available beds with gender filtering (for mobile app)
   * Used by booking service to suggest available beds
   */
  async findAvailableBedsForBooking(roomId?: string, gender?: string, limit?: number, hostelId?: string): Promise<Bed[]> {
    const queryBuilder = this.bedRepository.createQueryBuilder('bed')
      .leftJoinAndSelect('bed.room', 'room')
      .leftJoinAndSelect('bed.hostel', 'hostel')
      .leftJoinAndSelect('room.hostel', 'roomHostel')
      .where('bed.status = :status', { status: BedStatus.AVAILABLE });

    if (roomId) {
      queryBuilder.andWhere('bed.roomId = :roomId', { roomId });
    }

    // Filter by hostelId if provided (frontend sends hostelId, we search by room.hostelId)
    if (hostelId) {
      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId });
    }

    if (gender) {
      queryBuilder.andWhere('(bed.gender = :gender OR bed.gender = :any)', {
        gender,
        any: 'Any'
      });
    }

    queryBuilder.orderBy('room.roomNumber', 'ASC')
      .addOrderBy('bed.bedNumber', 'ASC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  // ========================================
  // SYNC WITH BEDPOSITIONS
  // ========================================

  /**
   * Trigger sync of bed status to bedPositions for specified rooms
   * This ensures bedPositions reflect current bed entity status
   */
  private async syncBedStatusToPositions(roomIds: string[]): Promise<void> {
    if (!roomIds || roomIds.length === 0) {
      return;
    }

    // Remove duplicates
    const uniqueRoomIds = [...new Set(roomIds)];

    this.logger.debug(`Syncing bed status to bedPositions for rooms: ${uniqueRoomIds.join(', ')}`);

    try {
      // The actual sync happens when room data is requested via RoomService
      // The BedSyncService.mergeBedDataIntoPositions method handles the sync
      // This method serves as a notification that sync is needed
      for (const roomId of uniqueRoomIds) {
        this.logger.debug(`✅ Bed status sync triggered for room ${roomId}`);
        // Future enhancement: Could trigger real-time sync here if needed
        // await this.bedSyncService.syncLayoutFromBeds(roomId);
      }
    } catch (error) {
      this.logger.error(`❌ Error syncing bed status to bedPositions:`, error);
      // Don't throw error to avoid breaking bed operations
    }
  }

  /**
   * Validate status change is allowed
   */
  private async validateStatusChange(bed: Bed, newStatus: BedStatus): Promise<void> {
    const currentStatus = bed.status;

    // Define allowed status transitions
    const allowedTransitions: Record<BedStatus, BedStatus[]> = {
      [BedStatus.AVAILABLE]: [BedStatus.OCCUPIED, BedStatus.RESERVED, BedStatus.MAINTENANCE],
      [BedStatus.OCCUPIED]: [BedStatus.AVAILABLE, BedStatus.MAINTENANCE],
      [BedStatus.RESERVED]: [BedStatus.AVAILABLE, BedStatus.OCCUPIED, BedStatus.MAINTENANCE],
      [BedStatus.MAINTENANCE]: [BedStatus.AVAILABLE]
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus} for bed ${bed.bedIdentifier}`
      );
    }

    // Additional validation for specific transitions
    if (newStatus === BedStatus.OCCUPIED && bed.currentOccupantId) {
      throw new BadRequestException(`Bed ${bed.bedIdentifier} already has an occupant`);
    }

    if (currentStatus === BedStatus.OCCUPIED && newStatus === BedStatus.AVAILABLE && bed.currentOccupantId) {
      // This is handled by releaseOccupant method
      throw new BadRequestException(`Use releaseOccupant method to free occupied bed ${bed.bedIdentifier}`);
    }
  }
}