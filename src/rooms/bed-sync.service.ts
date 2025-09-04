import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bed, BedStatus } from './entities/bed.entity';
import { Room } from './entities/room.entity';
import { RoomLayout } from './entities/room-layout.entity';

export interface BedPosition {
  id: string; // bed1, bed2, etc.
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  occupantId?: string | null;
  occupantName?: string;
  status?: string;
  gender?: string;
  color?: string; // Color for bed status visualization
  bedDetails?: {
    bedNumber?: string;
    monthlyRate?: number;
    lastCleaned?: Date;
    maintenanceNotes?: string;
    occupiedSince?: Date;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class BedSyncService {
  private readonly logger = new Logger(BedSyncService.name);

  constructor(
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomLayout)
    private roomLayoutRepository: Repository<RoomLayout>,
  ) { }

  /**
   * Synchronize Bed entities from bedPositions in room layout
   * Creates/updates Bed entities based on bedPositions array
   * Enhanced to handle complex bed IDs and resolve conflicts
   */
  async syncBedsFromLayout(roomId: string, bedPositions: BedPosition[]): Promise<void> {
    this.logger.log(`🔄 Syncing beds from layout for room ${roomId}`);

    try {
      // Validate bedPositions first
      const validation = await this.validateBedPositions(bedPositions);
      if (!validation.isValid) {
        this.logger.error(`Validation failed: ${validation.errors.join(', ')}`);
        throw new Error(`Invalid bed positions: ${validation.errors.join(', ')}`);
      }

      // Log warnings but continue processing
      if (validation.warnings.length > 0) {
        this.logger.warn(`Validation warnings: ${validation.warnings.join(', ')}`);
      }

      // Normalize bed positions to handle complex IDs
      const normalizedPositions = await this.normalizeBedPositions(bedPositions, roomId);
      this.logger.debug(`Normalized ${bedPositions.length} bed positions`);

      // Use normalized positions for the rest of the sync process
      const processedPositions = normalizedPositions;

      // Get existing beds for this room
      const existingBeds = await this.bedRepository.find({
        where: { roomId }
      });

      // Get room details for defaults
      const room = await this.roomRepository.findOne({
        where: { id: roomId }
      });

      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Create a map of existing beds by bedIdentifier
      const existingBedMap = new Map<string, Bed>();
      existingBeds.forEach(bed => {
        existingBedMap.set(bed.bedIdentifier, bed);
      });

      // Track which beds should exist after sync
      const expectedBedIdentifiers = new Set(processedPositions.map(pos => pos.id));

      // Process each bed position
      for (const bedPosition of processedPositions) {
        const bedIdentifier = bedPosition.id;
        const existingBed = existingBedMap.get(bedIdentifier);

        if (existingBed) {
          // Update existing bed if needed
          await this.updateBedFromPosition(existingBed.id, bedPosition, room);
          this.logger.debug(`✅ Updated bed ${bedIdentifier}`);
        } else {
          // Check if bed identifier already exists globally (unique constraint)
          const globalExistingBed = await this.bedRepository.findOne({
            where: { bedIdentifier }
          });

          if (globalExistingBed && globalExistingBed.roomId !== roomId) {
            // Generate a unique identifier to resolve conflict
            const uniqueIdentifier = await this.generateUniqueBedIdentifier(bedIdentifier, roomId);
            this.logger.warn(`⚠️ Bed identifier ${bedIdentifier} already exists globally, using ${uniqueIdentifier}`);
            
            // Update the bedPosition with the new identifier for consistency
            bedPosition.id = uniqueIdentifier;
            
            // Create new bed with unique identifier
            try {
              await this.createBedFromPosition(roomId, bedPosition, room);
              this.logger.debug(`🆕 Created bed ${uniqueIdentifier} (resolved conflict)`);
            } catch (error) {
              this.logger.error(`❌ Failed to create bed ${uniqueIdentifier}: ${error.message}`);
              // Continue with other beds
            }
          } else {
            // Create new bed with original identifier
            try {
              await this.createBedFromPosition(roomId, bedPosition, room);
              this.logger.debug(`🆕 Created bed ${bedIdentifier}`);
            } catch (error) {
              this.logger.error(`❌ Failed to create bed ${bedIdentifier}: ${error.message}`);
              // Continue with other beds
            }
          }
        }
      }

      // Deactivate beds that are no longer in the layout
      for (const existingBed of existingBeds) {
        if (!expectedBedIdentifiers.has(existingBed.bedIdentifier)) {
          // Don't delete, just mark as inactive if it's not occupied
          if (existingBed.status !== BedStatus.OCCUPIED) {
            await this.bedRepository.update(existingBed.id, {
              status: BedStatus.OUT_OF_ORDER,
              description: 'Removed from layout'
            });
            this.logger.debug(`🚫 Deactivated bed ${existingBed.bedIdentifier}`);
          } else {
            this.logger.warn(`⚠️ Cannot deactivate occupied bed ${existingBed.bedIdentifier}`);
          }
        }
      }

      this.logger.log(`✅ Successfully synced beds for room ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ Error syncing beds from layout for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Get color for bed status visualization
   * Returns hex color codes for different bed statuses
   */
  private getBedStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'Available': '#10B981', // Green
      'Occupied': '#EF4444',  // Red
      'Reserved': '#F59E0B',  // Yellow/Orange
      'Maintenance': '#6B7280', // Gray
      'Out_Of_Order': '#6B7280' // Gray
    };

    return colorMap[status] || '#6B7280'; // Default to gray
  }

  /**
   * Merge Bed entity data into bedPositions for API response
   * Enhances bedPositions with status, occupant info, color, and details from Bed entities
   * Ensures proper data flow from API to frontend for bed color visualization
   */
  async mergeBedDataIntoPositions(bedPositions: BedPosition[], beds: Bed[]): Promise<BedPosition[]> {
    if (!bedPositions || bedPositions.length === 0) {
      return bedPositions;
    }

    // Create a map of beds by bedIdentifier for efficient lookup
    const bedMap = new Map<string, Bed>();
    beds.forEach(bed => {
      bedMap.set(bed.bedIdentifier, bed);
    });

    // Merge bed data into each position
    const enhancedPositions = bedPositions.map(position => {
      const bed = bedMap.get(position.id);

      if (bed) {
        // Merge bed entity data into position with color and details
        const enhancedPosition = {
          ...position,
          status: bed.status,
          occupantId: bed.currentOccupantId,
          occupantName: bed.currentOccupantName,
          gender: bed.gender,
          color: this.getBedStatusColor(bed.status),
          bedDetails: {
            bedNumber: bed.bedNumber,
            monthlyRate: bed.monthlyRate,
            lastCleaned: bed.lastCleaned,
            maintenanceNotes: bed.maintenanceNotes,
            occupiedSince: bed.occupiedSince
          }
        };

        this.logger.debug(`Enhanced bed position ${position.id} with status ${bed.status} and color ${enhancedPosition.color}`);
        return enhancedPosition;
      }

      // Return original position with default color if no corresponding bed entity
      const defaultPosition = {
        ...position,
        color: this.getBedStatusColor('Available'), // Default to available color
        status: position.status || 'Available'
      };

      this.logger.debug(`Using default data for bed position ${position.id}`);
      return defaultPosition;
    });

    this.logger.log(`Enhanced ${enhancedPositions.length} bed positions with bed entity data`);
    return enhancedPositions;
  }

  /**
   * Validate bedPositions array for consistency and correctness
   * Enhanced to handle complex bed IDs from frontend
   */
  async validateBedPositions(bedPositions: BedPosition[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!bedPositions || bedPositions.length === 0) {
      return { isValid: true, errors, warnings };
    }

    // Check for duplicate bed identifiers
    const bedIds = bedPositions.map(pos => pos.id);
    const duplicateIds = bedIds.filter((id, index) => bedIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate bed identifiers found: ${duplicateIds.join(', ')}`);
    }

    // Enhanced bed identifier format validation - accept both simple and complex formats
    for (const position of bedPositions) {
      if (!position.id || typeof position.id !== 'string' || position.id.trim() === '') {
        errors.push(`Invalid bed identifier: ${position.id}. Bed ID cannot be empty.`);
        continue;
      }

      // Accept multiple formats:
      // - Simple: bed1, bed2, etc.
      // - Complex: single-bed-1756712592717-0m18, bunk-bed-1756712592718-abc123
      // - Legacy: BED-001-ABC, BUNK-001-XYZ
      const simpleFormat = /^bed\d+$/;
      const complexFormat = /^(single-bed|bunk-bed|bed)-\d+-[a-zA-Z0-9]+$/;
      const legacyFormat = /^(BED|BUNK)-\d+-[A-Z0-9]+$/;
      
      if (!simpleFormat.test(position.id) && 
          !complexFormat.test(position.id) && 
          !legacyFormat.test(position.id)) {
        warnings.push(`Bed identifier ${position.id} uses non-standard format. Consider using simple format (bed1, bed2, etc.) for better compatibility.`);
      }

      // Validate required UI positioning fields
      if (typeof position.x !== 'number' || typeof position.y !== 'number') {
        errors.push(`Bed ${position.id} missing valid x,y coordinates`);
      }

      if (typeof position.width !== 'number' || typeof position.height !== 'number') {
        errors.push(`Bed ${position.id} missing valid width,height dimensions`);
      }

      if (typeof position.rotation !== 'number') {
        warnings.push(`Bed ${position.id} missing rotation value, defaulting to 0`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Resolve conflicts between Bed entities and bedPositions
   * Bed entity is considered the source of truth for booking data
   */
  async resolveBedConflicts(roomId: string): Promise<void> {
    this.logger.log(`🔧 Resolving bed conflicts for room ${roomId}`);

    try {
      // Get room with layout and beds
      const room = await this.roomRepository.findOne({
        where: { id: roomId },
        relations: ['layout', 'beds']
      });

      if (!room || !room.layout || !room.layout.bedPositions) {
        this.logger.warn(`No layout found for room ${roomId}, skipping conflict resolution`);
        return;
      }

      const bedPositions = room.layout.bedPositions as BedPosition[];
      const beds = room.beds || [];

      // Find beds that exist in entities but not in layout
      const layoutBedIds = new Set(bedPositions.map(pos => pos.id));
      const orphanedBeds = beds.filter(bed => !layoutBedIds.has(bed.bedIdentifier));

      if (orphanedBeds.length > 0) {
        this.logger.warn(`Found ${orphanedBeds.length} orphaned beds not in layout`);

        for (const bed of orphanedBeds) {
          if (bed.status === BedStatus.OCCUPIED) {
            // Keep occupied beds, add them back to layout
            this.logger.warn(`Keeping occupied orphaned bed ${bed.bedIdentifier}`);
          } else {
            // Mark non-occupied orphaned beds as out of order
            await this.bedRepository.update(bed.id, {
              status: BedStatus.OUT_OF_ORDER,
              description: 'Orphaned bed - not in current layout'
            });
            this.logger.debug(`Marked orphaned bed ${bed.bedIdentifier} as out of order`);
          }
        }
      }

      // Find layout positions without corresponding bed entities
      const bedEntityIds = new Set(beds.map(bed => bed.bedIdentifier));
      const missingBeds = bedPositions.filter(pos => !bedEntityIds.has(pos.id));

      if (missingBeds.length > 0) {
        this.logger.log(`Creating ${missingBeds.length} missing bed entities`);

        for (const position of missingBeds) {
          await this.createBedFromPosition(roomId, position, room);
          this.logger.debug(`Created missing bed entity for ${position.id}`);
        }
      }

      this.logger.log(`✅ Resolved bed conflicts for room ${roomId}`);
    } catch (error) {
      this.logger.error(`❌ Error resolving bed conflicts for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Create Bed entities from existing room layouts (migration support)
   * Used during initial migration to create bed entities from bedPositions
   */
  async createBedsFromExistingLayout(roomId: string): Promise<Bed[]> {
    this.logger.log(`🔄 Creating beds from existing layout for room ${roomId}`);

    try {
      // Get room with layout
      const room = await this.roomRepository.findOne({
        where: { id: roomId },
        relations: ['layout']
      });

      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      if (!room.layout || !room.layout.bedPositions) {
        this.logger.warn(`No layout found for room ${roomId}, creating beds based on bedCount`);
        return this.createDefaultBedsForRoom(roomId, room.bedCount);
      }

      const bedPositions = room.layout.bedPositions as BedPosition[];
      const createdBeds: Bed[] = [];

      // Create bed entity for each position
      for (const position of bedPositions) {
        const bed = await this.createBedFromPosition(roomId, position, room);
        createdBeds.push(bed);
      }

      this.logger.log(`✅ Created ${createdBeds.length} beds from layout for room ${roomId}`);
      return createdBeds;
    } catch (error) {
      this.logger.error(`❌ Error creating beds from layout for room ${roomId}:`, error);
      throw error;
    }
  }

  /**
   * Update bed entity from bedPosition data
   */
  private async updateBedFromPosition(bedId: string, position: BedPosition, room: Room): Promise<Bed> {
    const updateData: Partial<Bed> = {};

    // Only update fields that might have changed from layout
    if (position.gender && position.gender !== 'undefined') {
      updateData.gender = position.gender as 'Male' | 'Female' | 'Any';
    }

    // Don't override occupant data from layout - bed entity is source of truth
    // Don't override status from layout - bed entity is source of truth

    // Update if there are changes
    if (Object.keys(updateData).length > 0) {
      await this.bedRepository.update(bedId, updateData);
    }

    return this.bedRepository.findOne({ where: { id: bedId } });
  }

  /**
   * Create new bed entity from bedPosition
   */
  private async createBedFromPosition(roomId: string, position: BedPosition, room: Room): Promise<Bed> {
    // Generate bed number from identifier
    // For complex identifiers like "single-bed-1756712592717-0m18", generate a simple number
    let bedNumber: string;

    if (position.id.startsWith('bed') && position.id.match(/^bed\d+$/)) {
      // Simple format: bed1, bed2, etc.
      bedNumber = position.id.replace('bed', '');
    } else {
      // Complex format: generate sequential number based on existing beds
      const existingBeds = await this.bedRepository.find({ where: { roomId } });
      bedNumber = (existingBeds.length + 1).toString();
    }

    // Ensure bedNumber is not too long (max 10 chars)
    if (bedNumber.length > 10) {
      bedNumber = bedNumber.substring(0, 10);
    }

    const bed = this.bedRepository.create({
      roomId,
      bedIdentifier: position.id,
      bedNumber,
      status: BedStatus.AVAILABLE, // Default to available
      gender: (position.gender as 'Male' | 'Female' | 'Any') || room.gender as 'Male' | 'Female' | 'Any' || 'Any',
      monthlyRate: room.monthlyRate,
      description: `Bed ${bedNumber} in ${room.name}`,
      currentOccupantId: null,
      currentOccupantName: null,
      occupiedSince: null
    });

    return this.bedRepository.save(bed);
  }

  /**
   * Create default beds for room without layout
   */
  private async createDefaultBedsForRoom(roomId: string, bedCount: number): Promise<Bed[]> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    const beds: Bed[] = [];

    for (let i = 1; i <= bedCount; i++) {
      const bed = this.bedRepository.create({
        roomId,
        bedIdentifier: `bed${i}`,
        bedNumber: i.toString(),
        status: BedStatus.AVAILABLE,
        gender: room.gender as 'Male' | 'Female' | 'Any' || 'Any',
        monthlyRate: room.monthlyRate,
        description: `Bed ${i} in ${room.name}`,
        currentOccupantId: null,
        currentOccupantName: null,
        occupiedSince: null
      });

      const savedBed = await this.bedRepository.save(bed);
      beds.push(savedBed);
    }

    return beds;
  }

  /**
   * Generate a unique bed identifier to resolve conflicts
   * Converts complex IDs to simple format and ensures uniqueness
   */
  private async generateUniqueBedIdentifier(originalId: string, roomId: string): Promise<string> {
    // Get room details for context
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    const roomNumber = room?.roomNumber || 'R';
    
    // Convert complex ID to simple format
    let baseId: string;
    
    if (originalId.match(/^bed\d+$/)) {
      // Already simple format, just add room prefix
      baseId = `${roomNumber}-${originalId}`;
    } else {
      // Complex format - extract bed number or generate one
      const existingBedsInRoom = await this.bedRepository.count({ where: { roomId } });
      const bedNumber = existingBedsInRoom + 1;
      baseId = `${roomNumber}-bed${bedNumber}`;
    }
    
    // Ensure uniqueness by checking database
    let uniqueId = baseId;
    let counter = 1;
    
    while (await this.bedRepository.findOne({ where: { bedIdentifier: uniqueId } })) {
      uniqueId = `${baseId}-${counter}`;
      counter++;
    }
    
    return uniqueId;
  }

  /**
   * Convert complex bed IDs to simple format (bed1, bed2, etc.)
   * Used to standardize bed identifiers from frontend
   */
  private convertToSimpleBedId(complexId: string, roomId: string, bedIndex: number): string {
    // If already in simple format, return as is
    if (complexId.match(/^bed\d+$/)) {
      return complexId;
    }
    
    // Convert complex ID to simple format
    return `bed${bedIndex + 1}`;
  }

  /**
   * Normalize bedPositions to use simple bed IDs
   * Converts complex frontend IDs to simple format for better compatibility
   */
  async normalizeBedPositions(bedPositions: BedPosition[], roomId: string): Promise<BedPosition[]> {
    const normalizedPositions: BedPosition[] = [];
    
    for (let i = 0; i < bedPositions.length; i++) {
      const position = bedPositions[i];
      const simpleId = this.convertToSimpleBedId(position.id, roomId, i);
      
      // Check if this simple ID would conflict with existing beds
      const existingBed = await this.bedRepository.findOne({
        where: { bedIdentifier: simpleId }
      });
      
      if (existingBed && existingBed.roomId !== roomId) {
        // Use the original complex ID to avoid conflicts
        normalizedPositions.push(position);
      } else {
        // Use the simple ID
        normalizedPositions.push({
          ...position,
          id: simpleId
        });
      }
    }
    
    return normalizedPositions;
  }

  /**
   * Handle bed status changes during booking operations
   * Ensures bed color updates propagate to frontend room visualization immediately
   */
  async handleBookingStatusChange(bedIds: string[], newStatus: BedStatus, bookingReference?: string): Promise<void> {
    this.logger.log(`🔄 Handling booking status change for beds: ${bedIds.join(', ')} → ${newStatus}`);

    try {
      for (const bedId of bedIds) {
        const bed = await this.bedRepository.findOne({
          where: { bedIdentifier: bedId },
          relations: ['room']
        });

        if (!bed) {
          this.logger.warn(`⚠️ Bed ${bedId} not found during booking status change`);
          continue;
        }

        const oldStatus = bed.status;
        const updateData: Partial<Bed> = {
          status: newStatus
        };

        // Add booking-specific notes
        if (bookingReference) {
          updateData.notes = `${newStatus} for booking ${bookingReference}`;
        }

        // Update bed status
        await this.bedRepository.update(bed.id, updateData);

        // Log the status change with color information
        const oldColor = this.getBedStatusColor(oldStatus);
        const newColor = this.getBedStatusColor(newStatus);
        
        this.logger.log(`✅ Bed ${bedId} status: ${oldStatus} (${oldColor}) → ${newStatus} (${newColor})`);

        // Trigger room occupancy recalculation if needed
        if (bed.room) {
          await this.updateRoomOccupancyFromBeds(bed.room.id);
        }
      }

      this.logger.log(`✅ Completed booking status change for ${bedIds.length} beds`);
    } catch (error) {
      this.logger.error(`❌ Error handling booking status change: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update room occupancy statistics based on bed-level changes
   * Ensures room occupancy calculations reflect bed-level data
   */
  async updateRoomOccupancyFromBeds(roomId: string): Promise<void> {
    try {
      const beds = await this.bedRepository.find({
        where: { roomId }
      });

      const occupiedBeds = beds.filter(bed => bed.status === BedStatus.OCCUPIED).length;
      const reservedBeds = beds.filter(bed => bed.status === BedStatus.RESERVED).length;
      const availableBeds = beds.filter(bed => bed.status === BedStatus.AVAILABLE).length;
      const totalBeds = beds.length;

      // Update room with calculated occupancy
      await this.roomRepository.update(roomId, {
        occupancy: occupiedBeds,
        // availableBeds calculation: available beds minus reserved beds
        // This ensures reserved beds are not counted as available
      });

      this.logger.debug(`📊 Updated room ${roomId} occupancy: ${occupiedBeds}/${totalBeds} occupied, ${reservedBeds} reserved, ${availableBeds} available`);
    } catch (error) {
      this.logger.error(`❌ Error updating room occupancy for ${roomId}: ${error.message}`);
    }
  }

  /**
   * Handle booking confirmation - convert RESERVED beds to OCCUPIED
   * Updates bed status and occupant information when bookings are confirmed
   */
  async handleBookingConfirmation(bookingId: string, guestAssignments: Array<{
    bedId: string;
    guestName: string;
    guestId: string;
  }>): Promise<void> {
    this.logger.log(`✅ Handling booking confirmation for booking ${bookingId}`);

    try {
      for (const assignment of guestAssignments) {
        const bed = await this.bedRepository.findOne({
          where: { bedIdentifier: assignment.bedId },
          relations: ['room']
        });

        if (!bed) {
          this.logger.warn(`⚠️ Bed ${assignment.bedId} not found during confirmation`);
          continue;
        }

        // Update bed to occupied with occupant information
        await this.bedRepository.update(bed.id, {
          status: BedStatus.OCCUPIED,
          currentOccupantId: assignment.guestId,
          currentOccupantName: assignment.guestName,
          occupiedSince: new Date(),
          notes: `Occupied by ${assignment.guestName} via booking ${bookingId}`
        });

        // Log the confirmation with color change
        const occupiedColor = this.getBedStatusColor(BedStatus.OCCUPIED);
        this.logger.log(`✅ Bed ${assignment.bedId} confirmed: RESERVED → OCCUPIED (${occupiedColor}) for ${assignment.guestName}`);

        // Update room occupancy
        if (bed.room) {
          await this.updateRoomOccupancyFromBeds(bed.room.id);
        }
      }

      this.logger.log(`✅ Completed booking confirmation for ${guestAssignments.length} beds`);
    } catch (error) {
      this.logger.error(`❌ Error handling booking confirmation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle booking cancellation - release beds back to AVAILABLE
   * Updates bed colors in room layouts when bookings are cancelled
   */
  async handleBookingCancellation(bedIds: string[], reason: string): Promise<void> {
    this.logger.log(`❌ Handling booking cancellation for beds: ${bedIds.join(', ')}`);

    try {
      for (const bedId of bedIds) {
        const bed = await this.bedRepository.findOne({
          where: { bedIdentifier: bedId },
          relations: ['room']
        });

        if (!bed) {
          this.logger.warn(`⚠️ Bed ${bedId} not found during cancellation`);
          continue;
        }

        const oldStatus = bed.status;

        // Release bed back to available
        await this.bedRepository.update(bed.id, {
          status: BedStatus.AVAILABLE,
          currentOccupantId: null,
          currentOccupantName: null,
          occupiedSince: null,
          notes: `Released due to booking cancellation: ${reason}`
        });

        // Log the cancellation with color change
        const availableColor = this.getBedStatusColor(BedStatus.AVAILABLE);
        this.logger.log(`✅ Bed ${bedId} cancelled: ${oldStatus} → AVAILABLE (${availableColor})`);

        // Update room occupancy
        if (bed.room) {
          await this.updateRoomOccupancyFromBeds(bed.room.id);
        }
      }

      this.logger.log(`✅ Completed booking cancellation for ${bedIds.length} beds`);
    } catch (error) {
      this.logger.error(`❌ Error handling booking cancellation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get real-time bed status for room visualization
   * Ensures bed color updates are immediately available for frontend
   */
  async getRealTimeBedStatus(roomId: string): Promise<Array<{
    bedId: string;
    status: string;
    color: string;
    occupantName?: string;
    occupiedSince?: Date;
  }>> {
    try {
      const beds = await this.bedRepository.find({
        where: { roomId }
      });

      return beds.map(bed => ({
        bedId: bed.bedIdentifier,
        status: bed.status,
        color: this.getBedStatusColor(bed.status),
        occupantName: bed.currentOccupantName,
        occupiedSince: bed.occupiedSince
      }));
    } catch (error) {
      this.logger.error(`❌ Error getting real-time bed status for room ${roomId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Migration script to generate Bed entities from existing bedPositions
   * This method processes all rooms and creates bed entities
   */
  async migrateAllRoomsToBedsEntities(): Promise<{ processed: number; created: number; errors: string[] }> {
    this.logger.log('🚀 Starting migration: Creating Bed entities from existing bedPositions');

    const results = {
      processed: 0,
      created: 0,
      errors: []
    };

    try {
      // Get all rooms with layouts
      const rooms = await this.roomRepository.find({
        relations: ['layout', 'beds']
      });

      this.logger.log(`Found ${rooms.length} rooms to process`);

      for (const room of rooms) {
        try {
          results.processed++;

          // Skip if room already has bed entities
          if (room.beds && room.beds.length > 0) {
            this.logger.debug(`Room ${room.roomNumber} already has ${room.beds.length} beds, skipping`);
            continue;
          }

          // Create beds from layout or default beds
          const createdBeds = await this.createBedsFromExistingLayout(room.id);
          results.created += createdBeds.length;

          this.logger.log(`✅ Migrated room ${room.roomNumber}: created ${createdBeds.length} beds`);
        } catch (error) {
          const errorMsg = `Failed to migrate room ${room.roomNumber}: ${error.message}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      this.logger.log(`🎉 Migration completed: Processed ${results.processed} rooms, created ${results.created} beds`);

      if (results.errors.length > 0) {
        this.logger.warn(`⚠️ Migration had ${results.errors.length} errors`);
      }

      return results;
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw error;
    }
  }
}