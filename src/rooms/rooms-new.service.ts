import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { Bed } from './entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { RoomAmenity } from './entities/room-amenity.entity';
import { Amenity, AmenityCategory } from './entities/amenity.entity';
import { BedSyncService } from './bed-sync.service';

@Injectable()
export class RoomsNewService {
  private readonly SCALE_FACTOR = 40; // 1 foot = 40 pixels

  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomLayout)
    private roomLayoutRepository: Repository<RoomLayout>,
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    @InjectRepository(RoomAmenity)
    private roomAmenityRepository: Repository<RoomAmenity>,
    @InjectRepository(Amenity)
    private amenityRepository: Repository<Amenity>,
    private bedSyncService: BedSyncService,
  ) { }

  /**
   * SIMPLIFIED: Find hostelId by checking BOTH hostel.id AND hostel.businessId
   * Mobile app sends businessId, Web app sends hostel.id - we check both!
   */
  private async resolveHostelId(inputId?: string): Promise<string | null> {
    if (!inputId) {
      console.log('🔍 NEW-ROOMS: No inputId provided for hostel resolution');
      return null;
    }

    const cleanInputId = inputId.trim();
    console.log('🔍 NEW-ROOMS: Resolving hostelId from input:', `"${cleanInputId}"`);

    try {
      // FIXED: Handle UUID vs string type mismatch by using separate parameters
      // Try to match as UUID first, then as businessId (string)
      const hostel = await this.hostelRepository
        .createQueryBuilder('hostel')
        .where('(hostel.id::text = :inputId OR hostel.businessId = :inputId)', { inputId: cleanInputId })
        .andWhere('hostel.isActive = :isActive', { isActive: true })
        .getOne();

      if (hostel) {
        console.log('✅ NEW-ROOMS: Found hostel:', {
          inputId: cleanInputId,
          matchedBy: hostel.id === cleanInputId ? 'hostel.id' : 'hostel.businessId',
          hostelId: hostel.id,
          businessId: hostel.businessId,
          name: hostel.name
        });
        
        return hostel.id; // Always return the actual hostel.id for room queries
      }

      console.log('❌ NEW-ROOMS: No hostel found with id OR businessId:', cleanInputId);
      
      // DEBUG: Show available hostels for debugging
      const hostelCount = await this.hostelRepository.count();
      console.log('🔍 NEW-ROOMS: Total hostels in database:', hostelCount);
      
      const allHostels = await this.hostelRepository.find({ 
        where: { isActive: true },
        take: 5
      });
      console.log('🔍 NEW-ROOMS: Available hostels for debugging:', allHostels.map(h => ({ 
        id: h.id, 
        businessId: h.businessId, 
        name: h.name 
      })));
      
      // DEBUG: Try direct query with the input
      const directQuery = await this.hostelRepository
        .createQueryBuilder('hostel')
        .where('hostel.businessId = :businessId', { businessId: cleanInputId })
        .getOne();
      console.log('🔍 NEW-ROOMS: Direct businessId query result:', directQuery ? 'FOUND' : 'NOT FOUND');
      
      return null;
      
    } catch (error) {
      console.error('❌ NEW-ROOMS: Error resolving hostelId:', error.message);
      return null;
    }
  }

  /**
   * Get all rooms WITHOUT layout data (lightweight for listing)
   */
  async findAllLightweight(filters: any = {}, hostelId?: string) {
    const { status = 'all', type = 'all', search = '', page = 1, limit = 20 } = filters;

    console.log('🆕 RoomsNewService.findAllLightweight - hostelId:', hostelId);

    // FLEXIBLE HOSTEL QUERYING: Try both hostelId (UUID) and businessId
    let effectiveHostelId = await this.resolveHostelId(hostelId);

    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .leftJoinAndSelect('room.amenities', 'roomAmenities')
      .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
      .leftJoinAndSelect('room.layout', 'layout') // Only to check if layout exists
      .leftJoinAndSelect('room.beds', 'beds'); // For accurate availability

    if (effectiveHostelId) {
      console.log('✅ NEW-ROOMS: Filtering by resolved hostelId:', effectiveHostelId);
      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId: effectiveHostelId });
    } else {
      console.log('⚠️ NEW-ROOMS: No hostelId resolved - returning empty result');
      // If hostelId was provided but couldn't be resolved, return empty result
      if (hostelId) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }
      console.log('⚠️ NEW-ROOMS: No hostelId provided - returning ALL rooms');
    }

    if (status !== 'all') {
      queryBuilder.andWhere('room.status = :status', { status });
    }

    if (type !== 'all') {
      queryBuilder.andWhere('roomType.name = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(room.name ILIKE :search OR room.roomNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('room.createdAt', 'DESC');

    const [rooms, total] = await queryBuilder.getManyAndCount();

    // Transform to lightweight response (NO layout data!)
    const items = rooms.map(room => this.transformToLightweightResponse(room));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Transform room to lightweight response (NO layout, NO beds array)
   */
  private transformToLightweightResponse(room: Room): any {
    // Get amenities
    const amenities = room.amenities?.map((ra, index) => ({
      id: (index + 1).toString(),
      name: ra.amenity.name,
      description: ra.amenity.description || ra.amenity.name
    })) || [];

    // Calculate availability from beds
    let availableBeds = room.bedCount - room.occupancy;
    if (room.beds && room.beds.length > 0) {
      availableBeds = room.beds.filter(bed => bed.status === 'Available').length;
    }

    return {
      id: room.id,
      name: room.name,
      roomNumber: room.roomNumber,
      type: room.roomType?.name || 'Private',
      bedCount: room.bedCount,
      occupancy: room.occupancy,
      gender: room.gender,
      monthlyRate: room.monthlyRate?.toString() || '0',
      dailyRate: room.roomType?.baseDailyRate?.toString() || '0',
      amenities,
      status: room.status,
      floor: room.building?.name || '1',
      availableBeds,
      description: room.description,
      images: room.images || [],
      hasLayout: !!room.layout, // Flag to indicate layout exists
      hostelId: room.hostelId // Include hostelId for debugging and verification
    };
  }

  /**
   * Get room layout in frontend-ready format (UNSCALED - in feet)
   */
  async getRoomLayoutForFrontend(roomId: string): Promise<any> {
    console.log('🆕 Getting layout for room:', roomId);

    // Get room with all relations
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['layout', 'beds']
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.layout) {
      throw new NotFoundException('Room layout not found');
    }

    const layout = room.layout;
    
    // DEBUG: Log what's in the layout
    console.log('📐 Layout structure:', {
      hasBedPositions: !!layout.bedPositions,
      bedPositionsCount: layout.bedPositions?.length || 0,
      hasLayoutData: !!layout.layoutData,
      layoutDataKeys: layout.layoutData ? Object.keys(layout.layoutData) : [],
      hasElements: !!layout.layoutData?.elements,
      elementsCount: layout.layoutData?.elements?.length || 0,
      elementTypes: layout.layoutData?.elements?.map(e => e.type) || []
    });
    
    console.log('🛏️ Bed entities in room:', room.beds?.length || 0);
    console.log('🛏️ Bed identifiers:', room.beds?.map(b => b.bedIdentifier) || []);

    // Return dimensions in FEET (unscaled) - frontend will scale
    const dimensions = {
      width: layout.dimensions?.width || 300,
      height: layout.dimensions?.height || layout.dimensions?.length || 400,
      unit: 'feet' // Important: feet, not px!
    };

    // Extract doors from elements if they exist there
    let doorsData = layout.layoutData?.doors || layout.layoutData?.doorPositions || [];
    if (doorsData.length === 0 && layout.layoutData?.elements) {
      // Check if doors are in elements array
      doorsData = layout.layoutData.elements.filter(e => e.type === 'door');
    }

    // Return doors UNSCALED (in feet)
    const doors = this.getDoorsUnscaled(doorsData);

    // Build furniture array UNSCALED (in feet)
    const furniture = await this.buildFurnitureArrayUnscaled(room, layout);

    console.log(`✅ Layout prepared: ${furniture.length} furniture items (unscaled)`);

    return {
      roomId: room.id,
      hostelId: room.hostelId,
      dimensions,
      doors,
      furniture
    };
  }

  /**
   * Get doors UNSCALED (in feet) - frontend will scale
   */
  private getDoorsUnscaled(doors: any[]): any[] {
    return doors.map(door => ({
      id: door.id || 'door-1',
      wall: door.wall || 'bottom',
      position: door.position || 0.5,
      width: door.width || 3, // In feet, not pixels!
      x: door.x || null,
      y: door.y || null,
      height: door.height || null
    }));
  }

  /**
   * Update room
   */
  async update(id: string, updateRoomDto: any, hostelId?: string) {
    console.log('🏠 NEW-ROOMS: Updating room:', id);
    console.log('📤 NEW-ROOMS: Update data received:', JSON.stringify(updateRoomDto, null, 2));

    const room = await this.findOne(id, hostelId);

    // Update main room entity
    const updateData: any = {};

    if (updateRoomDto.name !== undefined) updateData.name = updateRoomDto.name;
    if (updateRoomDto.roomNumber !== undefined) updateData.roomNumber = updateRoomDto.roomNumber;
    if (updateRoomDto.capacity !== undefined) updateData.bedCount = updateRoomDto.capacity;
    if (updateRoomDto.bedCount !== undefined) updateData.bedCount = updateRoomDto.bedCount;
    if (updateRoomDto.rent !== undefined) updateData.monthlyRate = updateRoomDto.rent;
    if (updateRoomDto.monthlyRate !== undefined) updateData.monthlyRate = updateRoomDto.monthlyRate;
    if (updateRoomDto.occupancy !== undefined) updateData.occupancy = updateRoomDto.occupancy;
    if (updateRoomDto.gender !== undefined) updateData.gender = updateRoomDto.gender;
    if (updateRoomDto.status !== undefined) updateData.status = updateRoomDto.status;
    if (updateRoomDto.description !== undefined) updateData.description = updateRoomDto.description;
    if (updateRoomDto.images !== undefined) updateData.images = updateRoomDto.images;

    console.log('📝 NEW-ROOMS: Update data to apply:', JSON.stringify(updateData, null, 2));

    // Apply updates to main room entity
    await this.roomRepository.update(id, updateData);

    // Update amenities if provided
    if (updateRoomDto.amenities !== undefined) {
      console.log('🔧 NEW-ROOMS: Updating amenities:', updateRoomDto.amenities);
      await this.updateRoomAmenities(id, updateRoomDto.amenities);
    }

    // Update layout if provided
    if (updateRoomDto.layout !== undefined) {
      console.log('🔧 NEW-ROOMS: Updating layout');
      await this.updateRoomLayout(id, updateRoomDto.layout);
    }

    // Return updated room
    const updatedRoom = await this.findOne(id, hostelId);
    console.log('✅ NEW-ROOMS: Room updated successfully');

    return updatedRoom;
  }

  /**
   * Find one room by ID
   */
  async findOne(id: string, hostelId?: string) {
    console.log('🔍 NEW-ROOMS: Finding room by ID:', id);

    let effectiveHostelId = await this.resolveHostelId(hostelId);

    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .leftJoinAndSelect('room.amenities', 'roomAmenities')
      .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
      .leftJoinAndSelect('room.layout', 'layout')
      .leftJoinAndSelect('room.beds', 'beds')
      .where('room.id = :id', { id });

    if (effectiveHostelId) {
      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId: effectiveHostelId });
    }

    const room = await queryBuilder.getOne();

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return this.transformToLightweightResponse(room);
  }

  /**
   * Build complete furniture array UNSCALED (in feet) - frontend will scale
   */
  private async buildFurnitureArrayUnscaled(room: Room, layout: RoomLayout): Promise<any[]> {
    const furniture = [];

    // Get bed positions from layout
    let bedPositions = layout.bedPositions || layout.layoutData?.bedPositions || [];

    // DEBUG: Check what's in bedPositions from database
    console.log(`🔍 Raw bedPositions from DB:`, JSON.stringify(bedPositions, null, 2));

    // If no bedPositions but has elements, convert (excluding doors)
    if (bedPositions.length === 0 && layout.layoutData?.elements) {
      bedPositions = layout.layoutData.elements
        .filter(e => e.type && e.type.includes('bed'))
        .map(e => ({
          id: e.id,
          x: e.x,
          y: e.y,
          width: e.width,
          height: e.height,
          rotation: e.rotation || 0,
          bedType: e.properties?.bedType || 'single',
          status: e.properties?.status || 'Available',
          gender: e.properties?.gender || 'Any'
        }));
      console.log(`🔄 Converted from elements to bedPositions:`, JSON.stringify(bedPositions, null, 2));
    }

    // CRITICAL FIX: Filter out any doors that might have snuck into bedPositions
    bedPositions = bedPositions.filter(pos => pos.id && !pos.id.includes('door'));
    console.log(`🔍 Final bedPositions after door filtering:`, JSON.stringify(bedPositions, null, 2));

    console.log(`🛏️ Processing ${bedPositions.length} bed positions`);
    console.log(`🛏️ Bed positions data:`, JSON.stringify(bedPositions, null, 2));
    
    // DEBUG: Check what elements are being processed as beds
    if (layout.layoutData?.elements) {
      const bedElements = layout.layoutData.elements.filter(e => e.type && e.type.includes('bed'));
      const doorElements = layout.layoutData.elements.filter(e => e.type === 'door');
      console.log(`🔍 Elements analysis: ${bedElements.length} beds, ${doorElements.length} doors`);
      console.log(`🔍 Bed elements:`, bedElements.map(e => `${e.id}:${e.type}`));
      console.log(`🔍 Door elements:`, doorElements.map(e => `${e.id}:${e.type}`));
    }

    // Process beds - UNSCALED (in feet) - SKIP DOORS
    for (const position of bedPositions) {
      // CRITICAL: Skip any doors that might be in bedPositions
      if (position.id && position.id.includes('door')) {
        console.log(`🚫 Skipping door ${position.id} in bed processing`);
        continue;
      }
      // Find matching bed entity - try multiple matching strategies
      let matchingBed = room.beds?.find(bed => bed.bedIdentifier === position.id);
      
      // If not found by exact match, try to find by ending with position.id
      if (!matchingBed) {
        matchingBed = room.beds?.find(bed => bed.bedIdentifier.endsWith(`-${position.id}`));
      }
      
      // If still not found, try to find by bed number
      if (!matchingBed) {
        const bedNumber = position.id.replace('bed', '');
        matchingBed = room.beds?.find(bed => bed.bedNumber === bedNumber);
      }

      if (!matchingBed) {
        console.log(`⚠️ No matching bed entity for position: ${position.id}`);
        console.log(`⚠️ Available bed identifiers: ${room.beds?.map(b => b.bedIdentifier).join(', ') || 'none'}`);
        // Don't create on-the-fly - beds should be created during room creation
      }

      // Calculate orientation
      const isRotated = (position.rotation || 0) % 180 === 90;
      const orientation = isRotated ? 'vertical' :
        (position.width >= position.height ? 'horizontal' : 'vertical');

      // Get status and metadata from bed entity if available, otherwise use defaults
      let status: string = 'Available';
      let refId: string = position.id; // Fallback to position ID
      let bedId: string = position.id;
      let occupantId: string | null = null;
      let bedNumber: string = position.id;
      let monthlyRate: string = '0';
      let gender: string = 'Any';

      if (matchingBed) {
        // Convert status (Occupied from booking -> Reserved)
        status = matchingBed.status;
        if (status === 'Occupied' && matchingBed.notes && matchingBed.notes.includes('via booking')) {
          status = 'Reserved';
        }
        
        refId = matchingBed.id;
        bedId = matchingBed.id;
        occupantId = matchingBed.currentOccupantId;
        bedNumber = matchingBed.bedNumber;
        monthlyRate = matchingBed.monthlyRate?.toString() || '0';
        gender = matchingBed.gender || 'Any';
      } else {
        // Use position data as fallback
        status = position.status || 'Available';
        gender = position.gender || 'Any';
      }

      furniture.push({
        id: position.id, // "B1" - visual identifier
        refId, // "bed-uuid-aaa-111" - real UUID for booking (or position ID as fallback)
        type: 'bed',
        hostelId: room.hostelId,

        // UNSCALED positions (in feet)
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,

        rotation: position.rotation || 0,
        orientation,

        // Properties for bed
        properties: {
          bedId,
          status,
          bedType: position.bedType || 'single',
          bedLabel: position.id,
          orientation
        },

        metadata: {
          rotation: position.rotation || 0,
          occupantId,
          bedNumber,
          monthlyRate,
          gender
        }
      });
    }

    // Process other furniture - UNSCALED (in feet) - EXCLUDE doors and beds
    let furnitureLayout = layout.furnitureLayout || layout.layoutData?.furnitureLayout || [];
    
    // If no furnitureLayout but has elements, extract non-bed, non-door items
    if (furnitureLayout.length === 0 && layout.layoutData?.elements) {
      furnitureLayout = layout.layoutData.elements.filter(e => 
        e.type && !e.type.includes('bed') && e.type !== 'door'
      );
    }

    console.log(`🪑 Processing ${furnitureLayout.length} other furniture items`);
    console.log(`🪑 Furniture items:`, furnitureLayout.map(f => `${f.id}:${f.type}`));

    for (const item of furnitureLayout) {
      // CRITICAL: Skip doors - they should be in doors array, not furniture
      if (item.type === 'door') {
        console.log(`🚫 Skipping door ${item.id} in furniture processing`);
        continue;
      }
      const orientation = item.width >= item.height ? 'horizontal' : 'vertical';

      furniture.push({
        id: item.id,
        type: item.type,

        // UNSCALED positions (in feet)
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,

        rotation: item.rotation || 0,
        orientation,

        metadata: item.metadata || {}
      });
    }

    console.log(`✅ Built furniture array with ${furniture.length} items total`);
    return furniture;
  }

  /**
   * Update room amenities (junction table)
   */
  private async updateRoomAmenities(roomId: string, amenityNames: string[]) {
    console.log(`🔧 Updating amenities for room ${roomId}:`, amenityNames);

    // Get existing room-amenity relationships
    const existingRoomAmenities = await this.roomAmenityRepository.find({
      where: { roomId },
      relations: ['amenity']
    });

    console.log(`📋 Found ${existingRoomAmenities.length} existing amenities`);

    // Create a map of existing amenities by name
    const existingAmenitiesMap = new Map(
      existingRoomAmenities.map(ra => [ra.amenity.name, ra])
    );

    // Process each amenity name
    for (const amenityName of amenityNames) {
      // Check if this amenity already exists for this room
      const existingRoomAmenity = existingAmenitiesMap.get(amenityName);

      if (existingRoomAmenity) {
        // Reactivate existing amenity if it was deactivated
        if (!existingRoomAmenity.isActive) {
          await this.roomAmenityRepository.update(
            { id: existingRoomAmenity.id },
            { isActive: true }
          );
          console.log(`✅ Reactivated amenity: ${amenityName}`);
        }
        // Remove from map so we know it's still needed
        existingAmenitiesMap.delete(amenityName);
      } else {
        // Create new amenity relationship
        let amenity = await this.amenityRepository.findOne({
          where: { name: amenityName }
        });

        if (!amenity) {
          console.log(`➕ Creating new amenity: ${amenityName}`);
          amenity = await this.amenityRepository.save({
            name: amenityName,
            category: AmenityCategory.UTILITIES,
            isActive: true
          });
        }

        await this.roomAmenityRepository.save({
          roomId,
          amenityId: amenity.id,
          isActive: true,
          installedDate: new Date()
        });
        console.log(`✅ Added amenity: ${amenityName}`);
      }
    }

    // Deactivate amenities that are no longer selected
    for (const [amenityName, roomAmenity] of existingAmenitiesMap) {
      if (roomAmenity.isActive) {
        await this.roomAmenityRepository.update(
          { id: roomAmenity.id },
          { isActive: false }
        );
        console.log(`❌ Deactivated amenity: ${amenityName}`);
      }
    }

    console.log(`✅ Amenities update completed for room ${roomId}`);
  }

  /**
   * Update room layout
   */
  private async updateRoomLayout(roomId: string, layoutData: any) {
    console.log(`🎨 Updating layout for room ${roomId}`);

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['layout']
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.layout) {
      // Update existing layout
      console.log(`📝 Updating existing layout ${room.layout.id}`);
      await this.roomLayoutRepository.update(room.layout.id, {
        bedPositions: layoutData.bedPositions || layoutData.elements?.filter(e => e.type?.includes('bed')),
        furnitureLayout: layoutData.furnitureLayout || layoutData.elements?.filter(e => !e.type?.includes('bed')),
        dimensions: layoutData.dimensions,
        layoutData: layoutData // Store complete layout data including theme and elements
      });
      console.log(`✅ Layout updated successfully`);
    } else {
      // Create new layout
      console.log(`➕ Creating new layout for room ${roomId}`);
      const newLayout = this.roomLayoutRepository.create({
        roomId,
        bedPositions: layoutData.bedPositions || layoutData.elements?.filter(e => e.type?.includes('bed')),
        furnitureLayout: layoutData.furnitureLayout || layoutData.elements?.filter(e => !e.type?.includes('bed')),
        dimensions: layoutData.dimensions,
        layoutData: layoutData // Store complete layout data including theme and elements
      });
      await this.roomLayoutRepository.save(newLayout);
      console.log(`✅ Layout created successfully`);
    }
  }
}
