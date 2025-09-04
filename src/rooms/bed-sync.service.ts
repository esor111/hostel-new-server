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
   */
  async syncBedsFromLayout(roomId: string, bedPositions: BedPosition[]): Promise<void> {
    this.logger.log(`🔄 Syncing beds from layout for room ${roomId}`);

    try {
      // Validate bedPositions first
      const validation = await this.validateBedPositions(bedPositions);
      if (!validation.isValid) {
        throw new Error(`Invalid bed positions: ${validation.errors.join(', ')}`);
      }

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
      const expectedBedIdentifiers = new Set(bedPositions.map(pos => pos.id));

      // Process each bed position
      for (const bedPosition of bedPositions) {
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

          if (globalExistingBed) {
            this.logger.warn(`⚠️ Bed identifier ${bedIdentifier} already exists globally, skipping`);
            continue;
          }

          // Create new bed
          try {
            await this.createBedFromPosition(roomId, bedPosition, room);
            this.logger.debug(`🆕 Created bed ${bedIdentifier}`);
          } catch (error) {
            this.logger.error(`❌ Failed to create bed ${bedIdentifier}: ${error.message}`);
            // Continue with other beds
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
    return bedPositions.map(position => {
      const bed = bedMap.get(position.id);

      if (bed) {
        // Merge bed entity data into position with color and details
        return {
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
      }

      // Return original position with default color if no corresponding bed entity
      return {
        ...position,
        color: this.getBedStatusColor('Available'), // Default to available color
        status: position.status || 'Available'
      };
    });
  }

  /**
   * Validate bedPositions array for consistency and correctness
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

    // Validate bed identifier format
    for (const position of bedPositions) {
      if (!position.id || !position.id.match(/^bed\d+$/)) {
        errors.push(`Invalid bed identifier format: ${position.id}. Expected format: bed1, bed2, etc.`);
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