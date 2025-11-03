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
  bedType?: string; // single, bunk, etc.
  bunkLevel?: string; // top, bottom (for bunk beds)
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
    this.logger.log(`🛏️ Received ${bedPositions.length} bed positions to sync`);

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

      // Get existing beds for this room, sorted by bedNumber
      const existingBeds = await this.bedRepository.find({
        where: { roomId },
        order: { bedNumber: 'ASC' }
      });

      // Get room details for defaults
      const room = await this.roomRepository.findOne({
        where: { id: roomId }
      });

      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Separate beds by status
      const occupiedBeds = existingBeds.filter(bed => 
        bed.status === BedStatus.OCCUPIED || bed.status === BedStatus.RESERVED
      );
      
      const availableBeds = existingBeds.filter(bed => 
        bed.status === BedStatus.AVAILABLE || bed.status === BedStatus.MAINTENANCE
      );

      this.logger.log(`📊 Bed inventory: ${occupiedBeds.length} occupied/reserved, ${availableBeds.length} available`);

      // Track processed bed IDs
      const processedBedIds = new Set<string>();

      // PHASE 1: Process each layout position
      for (let i = 0; i < bedPositions.length; i++) {
        const position = bedPositions[i];
        const layoutBedId = position.id;

        // Try to find exact match first (for occupied beds)
        let matchedBed = existingBeds.find(bed => 
          bed.bedIdentifier === layoutBedId && !processedBedIds.has(bed.id)
        );

        if (matchedBed) {
          // EXACT MATCH - Just update metadata, don't change bedIdentifier
          this.logger.log(`✅ Exact match: ${layoutBedId} (${matchedBed.status})`);
          
          await this.bedRepository.update(matchedBed.id, {
            gender: position.gender || matchedBed.gender,
            monthlyRate: position.bedDetails?.monthlyRate || room.monthlyRate,
            description: `Bed ${matchedBed.bedNumber} in ${room.name}`,
            status: matchedBed.status === BedStatus.OCCUPIED || matchedBed.status === BedStatus.RESERVED 
              ? matchedBed.status 
              : BedStatus.AVAILABLE
          });
          
          processedBedIds.add(matchedBed.id);
          continue;
        }

        // No exact match - try to reuse available bed
        matchedBed = availableBeds.find(bed => !processedBedIds.has(bed.id));
        
        if (matchedBed) {
          // REUSE AVAILABLE BED - Safe to update bedIdentifier
          this.logger.log(`🔄 Reusing bed ${matchedBed.bedIdentifier} → ${layoutBedId}`);
          
          await this.bedRepository.update(matchedBed.id, {
            bedIdentifier: layoutBedId,
            gender: position.gender || matchedBed.gender,
            monthlyRate: position.bedDetails?.monthlyRate || room.monthlyRate,
            description: `Bed ${matchedBed.bedNumber} in ${room.name}`,
            status: BedStatus.AVAILABLE
          });
          
          processedBedIds.add(matchedBed.id);
          continue;
        }

        // No match found - create new bed (bed count increased)
        this.logger.log(`🆕 Creating new bed ${layoutBedId}`);
        try {
          const newBed = await this.createBedFromPosition(roomId, position, room);
          processedBedIds.add(newBed.id);
        } catch (error) {
          this.logger.error(`❌ Failed to create bed ${layoutBedId}: ${error.message}`);
        }
      }

      // PHASE 2: Handle unprocessed beds
      for (const bed of existingBeds) {
        if (processedBedIds.has(bed.id)) {
          continue; // Already handled
        }

        if (bed.status === BedStatus.OCCUPIED || bed.status === BedStatus.RESERVED) {
          // CRITICAL: Keep occupied beds even if not in layout
          this.logger.warn(`⚠️ Occupied bed ${bed.bedIdentifier} not in layout - keeping it`);
          continue;
        }

        // DELETE available/maintenance beds not in layout
        this.logger.log(`🗑️ Deleting unused bed: ${bed.bedIdentifier}`);
        await this.bedRepository.delete(bed.id);
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
      'Maintenance': '#6B7280' // Gray
    };

    return colorMap[status] || '#6B7280'; // Default to gray
  }

  /**
   * Merge Bed entity data into bedPositions for API response
   * Enhances bedPositions with status, occupant info, color, and details from Bed entities
   * Ensures proper data flow from API to frontend for bed color visualization
   * Updates bedPosition IDs to match bed identifiers for frontend mapping
   */
  async mergeBedDataIntoPositions(bedPositions: BedPosition[], beds: Bed[]): Promise<BedPosition[]> {
    if (!bedPositions || bedPositions.length === 0) {
      return bedPositions;
    }

    this.logger.log(`🔄 Starting mergeBedDataIntoPositions`);
    this.logger.log(`📦 bedPositions count: ${bedPositions.length}`);
    this.logger.log(`🛏️ beds count: ${beds.length}`);
    this.logger.log(`📋 bedPosition IDs: ${bedPositions.map(p => p.id).join(', ')}`);
    this.logger.log(`🔑 bed identifiers: ${beds.map(b => `${b.bedIdentifier}(${b.status})`).join(', ')}`);

    // Create multiple maps for flexible bed lookup
    const bedByIdentifier = new Map<string, Bed>();
    const bedBySimpleId = new Map<string, Bed>();
    
    beds.forEach(bed => {
      bedByIdentifier.set(bed.bedIdentifier, bed);
      
      // Also map by simple ID (extract bed1, bed2 from complex identifiers)
      const simpleIdMatch = bed.bedIdentifier.match(/bed(\d+)$/);
      if (simpleIdMatch) {
        const simpleId = `bed${simpleIdMatch[1]}`;
        bedBySimpleId.set(simpleId, bed);
      }
    });

    // Merge bed data into each position and update position ID to match bed identifier
    const enhancedPositions = bedPositions.map((position, index) => {
      this.logger.debug(`🔍 Matching position[${index}]: id="${position.id}"`);
      
      // Try to find matching bed by exact identifier first
      let bed = bedByIdentifier.get(position.id);
      if (bed) {
        this.logger.debug(`✅ Exact match found: ${position.id} → ${bed.bedIdentifier} (${bed.status})`);
      }
      
      // If not found, try to find by simple ID pattern
      if (!bed) {
        bed = bedBySimpleId.get(position.id);
        if (bed) {
          this.logger.debug(`✅ Simple ID match found: ${position.id} → ${bed.bedIdentifier} (${bed.status})`);
        }
      }
      
      // If still not found, try to match by position index
      if (!bed && beds.length > index) {
        bed = beds[index];
        if (bed) {
          this.logger.debug(`✅ Index match found: position[${index}] → ${bed.bedIdentifier} (${bed.status})`);
        }
      }

      if (!bed) {
        this.logger.warn(`❌ No bed entity found for position: ${position.id}`);
      }

      if (bed) {
        // Update position ID to match bed identifier for frontend consistency
        const enhancedPosition = {
          ...position,
          id: bed.bedIdentifier, // KEY FIX: Update position ID to match bed identifier
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

        this.logger.debug(`Enhanced bed position ${position.id} → ${bed.bedIdentifier} with status ${bed.status}`);
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
          if (bed.status === BedStatus.OCCUPIED || bed.status === BedStatus.RESERVED) {
            // Keep occupied/reserved beds
            this.logger.warn(`Keeping occupied/reserved orphaned bed ${bed.bedIdentifier}`);
          } else {
            // Delete non-occupied orphaned beds
            await this.bedRepository.delete(bed.id);
            this.logger.debug(`Deleted orphaned bed ${bed.bedIdentifier}`);
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
    this.logger.log(`🆕 Creating bed from position: ${position.id} for room ${roomId}`);
    this.logger.log(`🏠 Room details: ID=${room.id}, hostelId=${room.hostelId}, name=${room.name}`);
    
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

    // Create description based on bed type and bunk level
    let description = `Bed ${bedNumber} in ${room.name}`;
    if (position.bedType === 'bunk' && position.bunkLevel) {
      description = `${position.bunkLevel.charAt(0).toUpperCase() + position.bunkLevel.slice(1)} bunk bed ${bedNumber} in ${room.name}`;
    }

    const bedData = {
      roomId,
      hostelId: room.hostelId, // CRITICAL FIX: Add missing hostelId
      bedIdentifier: position.id,
      bedNumber,
      status: BedStatus.AVAILABLE, // Default to available
      gender: (position.gender as 'Male' | 'Female' | 'Any') || room.gender as 'Male' | 'Female' | 'Any' || 'Any',
      monthlyRate: room.monthlyRate,
      description,
      currentOccupantId: null,
      currentOccupantName: null,
      occupiedSince: null
    };

    this.logger.log(`💾 Creating bed entity with data:`, JSON.stringify(bedData, null, 2));

    const bed = this.bedRepository.create(bedData);
    
    this.logger.log(`💾 Saving bed entity to database...`);
    const savedBed = await this.bedRepository.save(bed);
    this.logger.log(`✅ Bed saved successfully with ID: ${savedBed.id}`);
    
    return savedBed;
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
        hostelId: room.hostelId, // CRITICAL FIX: Add missing hostelId
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
   * Generate a unique bed identifier that matches bedPosition ID format
   * Creates room-specific identifiers to ensure global uniqueness while maintaining consistency
   */
  private async generateUniqueBedIdentifier(originalId: string, roomId: string): Promise<string> {
    // Get room details for room-specific identifier
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    const roomNumber = room?.roomNumber || 'R';
    
    // For simple IDs like "bed1", "bed2", create room-specific version
    if (originalId.match(/^bed\d+$/)) {
      const roomSpecificId = `${roomNumber}-${originalId}`;
      
      // Check if this room-specific ID already exists
      const existingBed = await this.bedRepository.findOne({ where: { bedIdentifier: roomSpecificId } });
      
      if (!existingBed) {
        // Room-specific ID is available, use it
        return roomSpecificId;
      } else if (existingBed.roomId === roomId) {
        // ID exists in the same room, that's fine (updating existing bed)
        return roomSpecificId;
      }
      // If there's still a conflict, fall through to generate unique version
    }
    
    // Extract bed number from any format
    let bedNumber: number;
    const bedNumberMatch = originalId.match(/bed(\d+)/);
    if (bedNumberMatch) {
      bedNumber = parseInt(bedNumberMatch[1]);
    } else {
      const existingBedsInRoom = await this.bedRepository.count({ where: { roomId } });
      bedNumber = existingBedsInRoom + 1;
    }
    
    // Generate room-specific base ID
    let baseId = `${roomNumber}-bed${bedNumber}`;
    
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
      
      // Check if this simple ID would conflict with existing beds in OTHER rooms
      const existingBed = await this.bedRepository.findOne({
        where: { bedIdentifier: simpleId }
      });
      
      if (existingBed && existingBed.roomId !== roomId) {
        // Conflict with another room - but still prefer simple format
        // Generate a unique simple ID for this room
        let alternativeSimpleId = simpleId;
        let counter = 1;
        
        while (true) {
          const conflictCheck = await this.bedRepository.findOne({
            where: { bedIdentifier: alternativeSimpleId }
          });
          
          if (!conflictCheck || conflictCheck.roomId === roomId) {
            // No conflict or conflict is within same room (acceptable)
            break;
          }
          
          // Try next simple ID
          counter++;
          alternativeSimpleId = `bed${i + counter}`;
          
          // Safety break to avoid infinite loop
          if (counter > 100) {
            alternativeSimpleId = position.id; // Fall back to original
            break;
          }
        }
        
        normalizedPositions.push({
          ...position,
          id: alternativeSimpleId
        });
      } else {
        // No conflict or conflict is within same room - use simple ID
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
          where: { id: bedId },
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
   * Handle booking confirmation - keep beds as RESERVED with occupant information
   * Updates bed occupant information when bookings are confirmed but maintains RESERVED status
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
          where: { id: assignment.bedId },
          relations: ['room']
        });

        if (!bed) {
          this.logger.warn(`⚠️ Bed ${assignment.bedId} not found during confirmation`);
          continue;
        }

        // Update bed to reserved with occupant information
        await this.bedRepository.update(bed.id, {
          status: BedStatus.RESERVED,
          currentOccupantId: assignment.guestId,
          currentOccupantName: assignment.guestName,
          occupiedSince: new Date(),
          notes: `Reserved by ${assignment.guestName} via booking ${bookingId}`
        });

        // Log the confirmation with color change
        const reservedColor = this.getBedStatusColor(BedStatus.RESERVED);
        this.logger.log(`✅ Bed ${assignment.bedId} confirmed: RESERVED → RESERVED (${reservedColor}) for ${assignment.guestName}`);

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
          where: { id: bedId },
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
        bedId: bed.id, // Use UUID instead of bedIdentifier
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