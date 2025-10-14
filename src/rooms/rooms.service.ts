import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus, MaintenanceStatus } from './entities/room.entity';

import { RoomType } from './entities/room-type.entity';
import { Amenity, AmenityCategory } from './entities/amenity.entity';
import { RoomAmenity } from './entities/room-amenity.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { RoomOccupant } from './entities/room-occupant.entity';
import { Student } from '../students/entities/student.entity';
import { Bed, BedStatus } from './entities/bed.entity';

import { BedSyncService } from './bed-sync.service';
import { HostelScopedService } from '../common/services/hostel-scoped.service';


@Injectable()
export class RoomsService extends HostelScopedService<Room> {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,

    @InjectRepository(RoomType)
    private roomTypeRepository: Repository<RoomType>,
    @InjectRepository(Amenity)
    private amenityRepository: Repository<Amenity>,
    @InjectRepository(RoomAmenity)
    private roomAmenityRepository: Repository<RoomAmenity>,
    @InjectRepository(RoomLayout)
    private roomLayoutRepository: Repository<RoomLayout>,
    @InjectRepository(RoomOccupant)
    private roomOccupantRepository: Repository<RoomOccupant>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,

    private bedSyncService: BedSyncService,
  ) {
    super(roomRepository, 'Room');
  }

  async findAll(filters: any = {}, hostelId?: string) {
    const { status = 'all', type = 'all', search = '', page = 1, limit = 20 } = filters;

    console.log('🔍 RoomsService.findAll - hostelId:', hostelId);
    console.log('🔍 RoomsService.findAll - filters:', filters);

    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .leftJoinAndSelect('room.occupants', 'occupants', 'occupants.status = :occupantStatus', { occupantStatus: 'Active' })
      .leftJoinAndSelect('occupants.student', 'student')
      .leftJoinAndSelect('room.amenities', 'roomAmenities')
      .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
      .leftJoinAndSelect('room.layout', 'layout')
      .leftJoinAndSelect('room.beds', 'beds');

    // Conditional hostel filtering - if hostelId provided, filter by it; if not, return all data
    if (hostelId) {
      console.log('✅ Filtering by hostelId:', hostelId);
      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId });
    } else {
      console.log('⚠️ No hostelId provided - returning ALL rooms');
    }

    // Apply status filter
    if (status !== 'all') {
      queryBuilder.andWhere('room.status = :status', { status });
    }

    // Apply type filter
    if (type !== 'all') {
      queryBuilder.andWhere('roomType.name = :type', { type });
    }

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(room.name ILIKE :search OR room.roomNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    // Order by creation date
    queryBuilder.orderBy('room.createdAt', 'DESC');

    const [rooms, total] = await queryBuilder.getManyAndCount();

    // Ensure occupancy is accurate for all rooms
    await this.syncRoomOccupancy(rooms);

    // Merge Bed entity data into bedPositions for all rooms (hybrid integration)
    for (const room of rooms) {
      if (room.layout?.layoutData?.bedPositions && room.beds && room.beds.length > 0) {
        room.layout.layoutData.bedPositions = await this.bedSyncService.mergeBedDataIntoPositions(
          room.layout.layoutData.bedPositions,
          room.beds
        );
      }
    }

    // Transform to API response format (EXACT same as current JSON structure)
    const transformedItems = await Promise.all(rooms.map(room => this.transformToApiResponse(room)));

    return {
      items: transformedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findOne(id: string, hostelId?: string) {
    // Build where condition conditionally
    const whereCondition: any = { id };
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const room = await this.roomRepository.findOne({
      where: whereCondition,
      relations: [
        'building',
        'roomType',
        'occupants',
        'occupants.student',
        'amenities',
        'amenities.amenity',
        'layout',
        'beds'
      ]
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Ensure occupancy is accurate for this room
    await this.syncRoomOccupancy([room]);

    // Merge Bed entity data into bedPositions for hybrid integration
    if (room.layout?.layoutData?.bedPositions && room.beds && room.beds.length > 0) {
      room.layout.layoutData.bedPositions = await this.bedSyncService.mergeBedDataIntoPositions(
        room.layout.layoutData.bedPositions,
        room.beds
      );
    }

    return await this.transformToApiResponse(room);
  }

  async create(createRoomDto: any, hostelId?: string) {
    console.log('🚨🚨🚨 ROOM CREATE METHOD CALLED 🚨🚨🚨');
    console.log('🏠 Creating new room');
    console.log('📤 Create data received:', JSON.stringify(createRoomDto, null, 2));
    console.log('🏨 Hostel ID received:', hostelId);
    console.log('📐 Layout check - has layout?', !!createRoomDto.layout);
    console.log('📐 Layout elements count:', createRoomDto.layout?.elements?.length || 0);

    // If hostelId is not provided, we need to get it from the authenticated user's businessId
    // This is a fallback for when the middleware/interceptor doesn't work
    if (!hostelId) {
      console.log('⚠️ No hostelId provided, this should not happen with proper authentication');
      throw new Error('Hostel context is required for room creation. Please ensure you are authenticated with a Business Token.');
    }

    // Find or create room type
    let roomType = null;
    if (createRoomDto.type) {
      roomType = await this.roomTypeRepository.findOne({
        where: { name: createRoomDto.type }
      });

      if (!roomType) {
        console.log('🆕 Creating new room type:', createRoomDto.type);
        // Create basic room type if it doesn't exist
        roomType = await this.roomTypeRepository.save({
          name: createRoomDto.type,
          baseMonthlyRate: createRoomDto.rent || createRoomDto.monthlyRate || 0,
          baseDailyRate: createRoomDto.dailyRate || Math.round((createRoomDto.rent || createRoomDto.monthlyRate || 0) / 30),
          defaultBedCount: createRoomDto.capacity || createRoomDto.bedCount || 1,
          maxOccupancy: createRoomDto.capacity || createRoomDto.bedCount || 1,
          isActive: true
        });
      }
    }

    // Create room entity with hostelId
    const room = this.roomRepository.create({
      id: createRoomDto.id,
      name: createRoomDto.name,
      roomNumber: createRoomDto.roomNumber,
      bedCount: createRoomDto.capacity || createRoomDto.bedCount || 1,
      monthlyRate: createRoomDto.rent || createRoomDto.monthlyRate,
      occupancy: createRoomDto.occupancy || 0,
      gender: createRoomDto.gender || 'Any',
      status: createRoomDto.status || RoomStatus.ACTIVE,
      maintenanceStatus: createRoomDto.maintenanceStatus || 'Good',
      lastCleaned: createRoomDto.lastCleaned,
      description: createRoomDto.description,
      images: createRoomDto.images || [],
      roomTypeId: roomType?.id,
      hostelId: hostelId, // Inject hostelId from context (validated above)
      // Map floor to building (simplified for now)
      buildingId: null // Will implement building logic later
    });

    const savedRoom = await this.roomRepository.save(room);

    // Create amenities if provided
    if (createRoomDto.amenities && createRoomDto.amenities.length > 0) {
      await this.createRoomAmenities(savedRoom.id, createRoomDto.amenities);
    }

    // Create occupants if provided
    if (createRoomDto.occupants && createRoomDto.occupants.length > 0) {
      // This will be handled by student service when students are assigned
    }

    // Create layout if provided
    if (createRoomDto.layout) {
      try {
        console.log('💾 Creating room layout...');
        console.log('📐 Layout data to save:', JSON.stringify(createRoomDto.layout, null, 2));
        
        // Convert elements to bedPositions if needed
        let bedPositions = createRoomDto.layout.bedPositions;
        if (!bedPositions && createRoomDto.layout.elements) {
          bedPositions = createRoomDto.layout.elements
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
          console.log(`🔄 Converted ${bedPositions.length} elements to bedPositions for layout storage`);
        }
        
        const layoutToSave = {
          roomId: savedRoom.id,
          layoutData: createRoomDto.layout, // Store complete layout object
          dimensions: createRoomDto.layout.dimensions,
          bedPositions: bedPositions, // CRITICAL FIX: Save bedPositions
          furnitureLayout: createRoomDto.layout.elements ? 
            createRoomDto.layout.elements.filter(e => e.type && !e.type.includes('bed')) : null,
          layoutType: createRoomDto.layout.theme?.name || 'standard',
          isActive: true,
          createdBy: 'system'
        };
        
        console.log('💾 Layout entity to save:', JSON.stringify(layoutToSave, null, 2));
        const savedLayout = await this.roomLayoutRepository.save(layoutToSave);
        console.log('✅ Layout saved successfully with ID:', savedLayout.id);
        console.log('✅ Saved layout details:', {
          id: savedLayout.id,
          roomId: savedLayout.roomId,
          hasBedPositions: !!savedLayout.bedPositions,
          bedPositionsCount: savedLayout.bedPositions?.length || 0,
          hasFurnitureLayout: !!savedLayout.furnitureLayout,
          furnitureCount: savedLayout.furnitureLayout?.length || 0,
          hasLayoutData: !!savedLayout.layoutData,
          layoutDataElementsCount: savedLayout.layoutData?.elements?.length || 0
        });
      } catch (layoutError) {
        console.error('❌ Layout creation failed:', layoutError.message);
        console.error('❌ Layout error stack:', layoutError.stack);
        // Don't throw - allow room creation to continue
      }
    } else {
      console.log('⚠️ No layout provided in createRoomDto');
    }

    // Sync beds with layout after room creation (hybrid integration)
    if (createRoomDto.layout) {
      console.log('🔄 Syncing beds with initial layout - hybrid integration');

      // Handle both bedPositions (legacy) and elements (new frontend format)
      let bedPositions = createRoomDto.layout.bedPositions;

      if (!bedPositions && createRoomDto.layout.elements) {
        // Convert elements to bedPositions format
        console.log('🔄 Converting elements to bedPositions format for room creation');
        bedPositions = [];

        for (const element of createRoomDto.layout.elements) {
          if (element.type && element.type.includes('bed')) {
            // Handle bunk beds with levels
            if (element.type === 'bunk-bed' && element.properties?.levels) {
              console.log(`🔄 Processing bunk bed ${element.id} with ${element.properties.levels.length} levels`);

              // Create separate bed positions for each bunk level
              for (const level of element.properties.levels) {
                bedPositions.push({
                  id: level.id || level.bedId, // Use level.id or level.bedId
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height / 2, // Split height for bunk levels
                  rotation: element.rotation || 0,
                  bedType: 'bunk',
                  status: level.status || 'Available',
                  gender: element.properties?.gender || 'Any',
                  bunkLevel: level.position || 'bottom' // top/bottom
                });
              }
            } else {
              // Handle regular single beds
              bedPositions.push({
                id: element.id,
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                rotation: element.rotation || 0,
                bedType: element.properties?.bedType || 'single',
                status: element.properties?.status || 'Available',
                gender: element.properties?.gender || 'Any'
              });
            }
          }
        }

        console.log(`🔄 Converted ${bedPositions.length} bed positions from ${createRoomDto.layout.elements.filter(e => e.type && e.type.includes('bed')).length} elements for room creation`);
      }

      // Also check if we need to get bedPositions from the saved layout
      if (!bedPositions) {
        console.log('🔍 No bedPositions found, checking saved layout...');
        const savedLayout = await this.roomLayoutRepository.findOne({ where: { roomId: savedRoom.id } });
        if (savedLayout?.bedPositions) {
          bedPositions = savedLayout.bedPositions;
          console.log(`🔄 Found ${bedPositions.length} bedPositions from saved layout`);
        } else if (savedLayout?.layoutData?.elements) {
          // Convert from saved layout elements
          const elements = savedLayout.layoutData.elements.filter(e => e.type && e.type.includes('bed'));
          bedPositions = elements.map(element => ({
            id: element.id,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation || 0,
            bedType: element.properties?.bedType || 'single',
            status: element.properties?.status || 'Available',
            gender: element.properties?.gender || 'Any'
          }));
          console.log(`🔄 Converted ${bedPositions.length} bedPositions from saved layout elements`);
        }
      }

      if (bedPositions && Array.isArray(bedPositions) && bedPositions.length > 0) {
        console.log('🔄 Syncing beds with initial layout');
        console.log('🛏️ Bed positions to sync:', JSON.stringify(bedPositions, null, 2));
        console.log('🏠 Room ID for sync:', savedRoom.id);
        console.log('🏨 Room hostelId:', savedRoom.hostelId);
        
        try {
          console.log('📞 Calling bedSyncService.syncBedsFromLayout...');
          await this.bedSyncService.syncBedsFromLayout(savedRoom.id, bedPositions);
          console.log('✅ Initial bed sync completed successfully');
          
          // Verify beds were actually created
          console.log('🔍 Verifying beds were created...');
          const createdBeds = await this.bedRepository.find({ where: { roomId: savedRoom.id } });
          console.log(`✅ Verification: ${createdBeds.length} beds found in database`);
          
        } catch (error) {
          console.error('❌ Initial bed sync failed:', error.message);
          console.error('❌ Full error details:', error);
          console.error('❌ Error stack:', error.stack);
          // Log the error but don't throw to allow room creation to complete
          // However, we should investigate why bed creation is failing
        }
      } else {
        console.log('⚠️ No bed positions found in initial layout data');
        console.log('📐 Layout data structure:', JSON.stringify(createRoomDto.layout, null, 2));
      }
    }

    // Return simplified response for now to avoid complex relations
    return {
      id: savedRoom.id,
      name: savedRoom.name,
      roomNumber: savedRoom.roomNumber,
      capacity: savedRoom.bedCount,
      rent: savedRoom.monthlyRate,
      hostelId: savedRoom.hostelId,
      status: savedRoom.status,
      createdAt: savedRoom.createdAt
    };
  }

  async update(id: string, updateRoomDto: any, hostelId?: string) {
    console.log('🏠 Updating room:', id);
    console.log('📤 Update data received:', JSON.stringify(updateRoomDto, null, 2));

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
    if (updateRoomDto.maintenanceStatus !== undefined) updateData.maintenanceStatus = updateRoomDto.maintenanceStatus;
    if (updateRoomDto.lastCleaned !== undefined) updateData.lastCleaned = updateRoomDto.lastCleaned;
    if (updateRoomDto.description !== undefined) updateData.description = updateRoomDto.description;
    if (updateRoomDto.images !== undefined) updateData.images = updateRoomDto.images;

    // Handle room type update
    if (updateRoomDto.type !== undefined) {
      let roomType = await this.roomTypeRepository.findOne({
        where: { name: updateRoomDto.type }
      });

      if (!roomType) {
        // Create basic room type if it doesn't exist
        roomType = await this.roomTypeRepository.save({
          name: updateRoomDto.type,
          baseMonthlyRate: updateRoomDto.rent || updateRoomDto.monthlyRate || 0,
          baseDailyRate: Math.round((updateRoomDto.rent || updateRoomDto.monthlyRate || 0) / 30),
          defaultBedCount: updateRoomDto.capacity || updateRoomDto.bedCount || 1,
          maxOccupancy: updateRoomDto.capacity || updateRoomDto.bedCount || 1,
          isActive: true
        });
      }

      updateData.roomTypeId = roomType.id;
    }

    if (Object.keys(updateData).length > 0) {
      console.log('📝 Updating room fields:', updateData);
      await this.roomRepository.update(id, updateData);

      // If bed count changed, ensure bed entities are synchronized
      if (updateData.bedCount !== undefined) {
        console.log('🔄 Bed count changed, ensuring bed synchronization');
        const whereCondition: any = { id };
        if (hostelId) {
          whereCondition.hostelId = hostelId;
        }
        const updatedRoom = await this.roomRepository.findOne({
          where: whereCondition,
          relations: ['layout', 'beds']
        });

        if (updatedRoom?.layout?.layoutData?.bedPositions) {
          await this.bedSyncService.syncBedsFromLayout(id, updatedRoom.layout.layoutData.bedPositions);
        }
      }
    }

    // Update amenities if provided
    if (updateRoomDto.amenities !== undefined) {
      await this.updateRoomAmenities(id, updateRoomDto.amenities);
    }

    // Update layout if provided (includes automatic bed synchronization)
    if (updateRoomDto.layout !== undefined) {
      await this.updateRoomLayout(id, updateRoomDto.layout);
    }

    return this.findOne(id, hostelId);
  }

  async getStats(hostelId?: string) {
    // Build where conditions conditionally
    const baseWhere: any = {};
    if (hostelId) {
      baseWhere.hostelId = hostelId;
    }

    const totalRooms = await this.roomRepository.count({
      where: baseWhere
    });
    const activeRooms = await this.roomRepository.count({
      where: { ...baseWhere, status: 'ACTIVE' }
    });
    const maintenanceRooms = await this.roomRepository.count({
      where: { ...baseWhere, status: 'MAINTENANCE' }
    });

    // Get accurate occupancy data from RoomOccupant records
    const occupancyQueryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .select('SUM(room.bedCount)', 'totalBeds')
      .where('room.status = :status', { status: 'ACTIVE' });

    if (hostelId) {
      occupancyQueryBuilder.andWhere('room.hostelId = :hostelId', { hostelId });
    }

    const occupancyResult = await occupancyQueryBuilder.getRawOne();

    // Count actual active occupants
    const occupiedQueryBuilder = this.roomOccupantRepository
      .createQueryBuilder('occupant')
      .innerJoin('occupant.room', 'room')
      .select('COUNT(occupant.id)', 'totalOccupied')
      .where('occupant.status = :status', { status: 'Active' })
      .andWhere('room.status = :roomStatus', { roomStatus: 'ACTIVE' });

    if (hostelId) {
      occupiedQueryBuilder.andWhere('room.hostelId = :hostelId', { hostelId });
    }

    const actualOccupiedResult = await occupiedQueryBuilder.getRawOne();

    const totalBeds = parseInt(occupancyResult?.totalBeds) || 0;
    const totalOccupied = parseInt(actualOccupiedResult?.totalOccupied) || 0;
    const availableBeds = totalBeds - totalOccupied;
    const occupancyRate = totalBeds > 0 ? (totalOccupied / totalBeds) * 100 : 0;

    return {
      totalRooms,
      activeRooms,
      maintenanceRooms,
      inactiveRooms: totalRooms - activeRooms - maintenanceRooms,
      totalBeds,
      occupiedBeds: totalOccupied,
      availableBeds,
      occupancyRate: Math.round(occupancyRate * 100) / 100
    };
  }

  async getAvailableRooms(hostelId?: string) {
    // Build where condition conditionally
    const whereCondition: any = { status: 'ACTIVE' };
    if (hostelId) {
      whereCondition.hostelId = hostelId;
    }

    const availableRooms = await this.roomRepository.find({
      where: whereCondition,
      relations: ['roomType', 'amenities', 'amenities.amenity', 'occupants', 'beds', 'layout']
    });

    // Sync occupancy for all rooms to ensure accurate data
    await this.syncRoomOccupancy(availableRooms);

    // Merge Bed entity data into bedPositions for available rooms (hybrid integration)
    for (const room of availableRooms) {
      if (room.layout?.layoutData?.bedPositions && room.beds && room.beds.length > 0) {
        room.layout.layoutData.bedPositions = await this.bedSyncService.mergeBedDataIntoPositions(
          room.layout.layoutData.bedPositions,
          room.beds
        );
      }
    }

    const filtered = availableRooms.filter(room => {
      // Use bed-based availability if beds exist, otherwise use traditional calculation
      if (room.beds && room.beds.length > 0) {
        return room.beds.some(bed => bed.status === 'Available');
      }
      return room.availableBeds > 0;
    });

    return await Promise.all(filtered.map(room => this.transformToApiResponse(room)));
  }

  // Sync room occupancy with actual RoomOccupant records and bed data (hybrid integration)
  private async syncRoomOccupancy(rooms: Room[]): Promise<void> {
    for (const room of rooms) {
      // Count actual active occupants for this room
      let actualOccupancy = await this.roomOccupantRepository.count({
        where: {
          roomId: room.id,
          status: 'Active'
        }
      });

      // If room has beds, use bed occupancy as source of truth (hybrid integration)
      if (room.beds && room.beds.length > 0) {
        const bedBasedOccupancy = room.beds.filter(bed => bed.status === 'Occupied').length;

        // Bed entity is source of truth for occupancy in hybrid architecture
        if (bedBasedOccupancy !== actualOccupancy) {
          console.log(`🔄 Hybrid sync: Bed occupancy (${bedBasedOccupancy}) differs from room occupant records (${actualOccupancy}) for room ${room.roomNumber}`);
          console.log(`🔄 Using bed-based occupancy as source of truth`);
          actualOccupancy = bedBasedOccupancy;
        }
      }

      // Update room occupancy if it doesn't match
      if (room.occupancy !== actualOccupancy) {
        console.log(`🔄 Syncing room ${room.roomNumber} occupancy: ${room.occupancy} -> ${actualOccupancy}`);
        await this.roomRepository.update(room.id, {
          occupancy: actualOccupancy
        });
        room.occupancy = actualOccupancy; // Update in-memory object
      }
    }
  }

  // Get color for bed status visualization
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

  // Convert bed status for API response - change Occupied beds from bookings to Reserved
  private convertBedStatusForResponse(bed: any): string {
    // If bed is Occupied but has notes indicating it's from a booking, return Reserved
    if (bed.status === 'Occupied' && bed.notes && bed.notes.includes('via booking')) {
      return 'Reserved';
    }
    
    // Otherwise return the actual status
    return bed.status;
  }

  // Transform normalized data back to exact API format
  private async transformToApiResponse(room: Room): Promise<any> {
    // Get active layout
    const activeLayout = room.layout;
    
    console.log(`🔍 transformToApiResponse for room ${room.roomNumber}:`, {
      hasLayout: !!activeLayout,
      layoutId: activeLayout?.id,
      hasBedPositions: !!activeLayout?.bedPositions,
      bedPositionsCount: activeLayout?.bedPositions?.length || 0,
      hasLayoutData: !!activeLayout?.layoutData,
      layoutDataElementsCount: activeLayout?.layoutData?.elements?.length || 0
    });

    // Get amenities list in proper format with string id, name, and description
    const amenities = room.amenities?.map((ra, index) => ({
      id: (index + 1).toString(), // Convert to string ID starting from "1"
      name: ra.amenity.name,
      description: ra.amenity.description || ra.amenity.name // Use name as fallback for description
    })) || [];

    // Get occupants (from active RoomOccupant records)
    const occupants = room.occupants?.filter(occupant => occupant.status === 'Active')
      .map(occupant => ({
        id: occupant.student?.id,
        name: occupant.student?.name,
        phone: occupant.student?.phone,
        email: occupant.student?.email,
        checkInDate: occupant.checkInDate,
        bedNumber: occupant.bedNumber
      })) || [];

    // Calculate occupancy and availableBeds from Bed entity status (hybrid integration)
    let actualOccupancy = occupants.length;
    let availableBeds = room.bedCount - actualOccupancy;

    if (room.beds && room.beds.length > 0) {
      // Use bed entities for more accurate calculations - bed entity is source of truth
      // Only count truly occupied beds (not those occupied via booking which should be reserved)
      const occupiedBeds = room.beds.filter(bed => 
        bed.status === 'Occupied' && (!bed.notes || !bed.notes.includes('via booking'))
      ).length;
      const availableBedsFromBeds = room.beds.filter(bed => bed.status === 'Available').length;
      const reservedBedsFromBookings = room.beds.filter(bed => 
        bed.status === 'Occupied' && bed.notes && bed.notes.includes('via booking')
      ).length;

      actualOccupancy = occupiedBeds;
      availableBeds = availableBedsFromBeds;
      
      // Log for debugging
      console.log(`Room ${room.roomNumber}: ${occupiedBeds} truly occupied, ${reservedBedsFromBookings} reserved from bookings, ${availableBedsFromBeds} available`);
    }

    // Enhance layout with bed data if beds exist (hybrid integration)
    let enhancedLayout = null;

    if (activeLayout) {
      // Try to get the complete layout data first
      enhancedLayout = activeLayout.layoutData;

      // If no layoutData, construct from individual fields
      if (!enhancedLayout) {
        enhancedLayout = {
          dimensions: activeLayout.dimensions,
          bedPositions: activeLayout.bedPositions,
          furnitureLayout: activeLayout.furnitureLayout,
          layoutType: activeLayout.layoutType
        };
      }

      // Layout data retrieved successfully
    }

    if (enhancedLayout) {
      enhancedLayout = { ...enhancedLayout };

      // Handle both bedPositions (legacy) and elements (new format)
      let bedPositions = enhancedLayout.bedPositions;

      // If no bedPositions but has elements, convert elements to bedPositions
      if (!bedPositions && enhancedLayout.elements) {
        bedPositions = enhancedLayout.elements
          .filter(element => element.type && element.type.includes('bed'))
          .map(element => ({
            id: element.id,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            rotation: element.rotation || 0,
            bedType: element.properties?.bedType || 'single',
            status: element.properties?.status || 'Available',
            gender: element.properties?.gender || 'Any'
          }));
      }

      // Merge bed entity data into positions if beds exist
      if (bedPositions && room.beds && room.beds.length > 0) {
        // SIMPLE FIX: Map bedPosition IDs to match bed identifiers for frontend consistency
        const activeBeds = room.beds.filter(bed => bed.status !== 'Out_Of_Order');

        enhancedLayout.bedPositions = bedPositions.map((position, index) => {
          // Try to find matching bed by position index or identifier
          let matchingBed = activeBeds.find(bed => bed.bedIdentifier === position.id);

          // If no exact match, use bed by index (fallback)
          if (!matchingBed && activeBeds[index]) {
            matchingBed = activeBeds[index];
          }

          if (matchingBed) {
            // Convert bed status for response (Occupied from bookings -> Reserved)
            const responseStatus = this.convertBedStatusForResponse(matchingBed);
            
            // Update position ID to match bed identifier for frontend mapping
            return {
              ...position,
              id: matchingBed.bedIdentifier, // KEY FIX: Ensure IDs match
              status: responseStatus,
              occupantId: matchingBed.currentOccupantId,
              occupantName: matchingBed.currentOccupantName,
              gender: matchingBed.gender,
              color: this.getBedStatusColor(responseStatus),
              bedDetails: {
                bedNumber: matchingBed.bedNumber,
                monthlyRate: matchingBed.monthlyRate,
                lastCleaned: matchingBed.lastCleaned,
                maintenanceNotes: matchingBed.maintenanceNotes,
                occupiedSince: matchingBed.occupiedSince
              }
            };
          }

          // Return original position with default data if no matching bed
          return {
            ...position,
            color: this.getBedStatusColor('Available'),
            status: 'Available'
          };
        });
      } else if (bedPositions) {
        // Ensure bedPositions are included even without bed entities
        enhancedLayout.bedPositions = bedPositions;
      }
    }

    // Return EXACT same structure as current JSON with enhanced bed data
    return {
      id: room.id,
      name: room.name,
      type: room.roomType?.name || 'Private', // Default fallback
      bedCount: room.bedCount,
      occupancy: actualOccupancy, // Use bed-based occupancy if available
      gender: room.gender,
      monthlyRate: room.roomType?.baseMonthlyRate || 0,
      dailyRate: room.roomType?.baseDailyRate || 0,
      amenities: amenities,
      status: room.status,
      layout: enhancedLayout, // Enhanced with bed data
      floor: room.building?.name || 'Ground Floor', // Fallback
      roomNumber: room.roomNumber,
      occupants: occupants,
      availableBeds: availableBeds, // Use bed-based calculation if available
      lastCleaned: room.lastCleaned,
      maintenanceStatus: room.maintenanceStatus,
      pricingModel: room.roomType?.pricingModel || 'monthly',
      description: room.description,
      images: room.images || [], // Always include images array
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      // Include beds array for enhanced functionality (optional) - convert status for response
      beds: (room.beds || []).map(bed => ({
        ...bed,
        status: this.convertBedStatusForResponse(bed)
      }))
    };
  }

  private async createRoomAmenities(roomId: string, amenityNames: string[]) {
    for (const amenityName of amenityNames) {
      // Find or create amenity
      let amenity = await this.amenityRepository.findOne({
        where: { name: amenityName }
      });

      if (!amenity) {
        amenity = await this.amenityRepository.save({
          name: amenityName,
          category: AmenityCategory.UTILITIES, // Default category
          isActive: true
        });
      }

      // Create room-amenity relationship
      await this.roomAmenityRepository.save({
        roomId,
        amenityId: amenity.id,
        isActive: true,
        installedDate: new Date()
      });
    }
  }

  private async updateRoomAmenities(roomId: string, amenityNames: string[]) {
    // Deactivate existing amenities
    await this.roomAmenityRepository.update(
      { roomId },
      { isActive: false }
    );

    // Add new amenities
    if (amenityNames.length > 0) {
      await this.createRoomAmenities(roomId, amenityNames);
    }
  }

  /**
   * Create bed entities directly from layout data
   * This ensures all beds are created immediately when layout is saved
   */
  private async createBedsFromLayoutData(roomId: string, layoutData: any) {
    console.log('🛏️ Creating beds directly from layout data for room:', roomId);
    
    try {
      // Get room details for bed creation
      const room = await this.roomRepository.findOne({
        where: { id: roomId }
      });

      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Clear existing beds for this room to avoid conflicts
      console.log('🗑️ Clearing existing beds for room:', roomId);
      await this.bedRepository.delete({ roomId });

      const bedsToCreate = [];
      const roomPrefix = room.roomNumber || 'R'; // Use room number as prefix

      // Process layout elements to extract bed data
      if (layoutData.elements) {
        console.log(`📐 Processing ${layoutData.elements.length} layout elements`);
        
        for (const element of layoutData.elements) {
          if (element.type && element.type.includes('bed')) {
            console.log(`🛏️ Processing bed element: ${element.id} (${element.type})`);
            
            if (element.type === 'bunk-bed' && element.properties?.levels) {
              // Handle bunk bed - create separate entities for each level
              console.log(`🏗️ Bunk bed ${element.id} has ${element.properties.levels.length} levels`);
              
              for (const level of element.properties.levels) {
                const bedIdentifier = `${roomPrefix}-${level.id}`;
                const bedNumber = element.id.replace('bed', '');
                
                bedsToCreate.push({
                  bedIdentifier,
                  bedNumber,
                  description: `${level.position.charAt(0).toUpperCase() + level.position.slice(1)} bunk ${element.properties?.bedLabel || element.id} in ${room.name}`,
                  bunkLevel: level.position
                });
                
                console.log(`   ✅ Added bunk level: ${bedIdentifier} (${level.position})`);
              }
            } else {
              // Handle single bed
              const bedIdentifier = `${roomPrefix}-${element.id}`;
              const bedNumber = element.id.replace('bed', '');
              
              bedsToCreate.push({
                bedIdentifier,
                bedNumber,
                description: `${element.properties?.bedLabel || element.id} in ${room.name}`,
                bunkLevel: null
              });
              
              console.log(`   ✅ Added single bed: ${bedIdentifier}`);
            }
          }
        }
      }

      // Also process bedPositions if elements are not available
      if (!layoutData.elements && layoutData.bedPositions) {
        console.log(`📍 Processing ${layoutData.bedPositions.length} bed positions`);
        
        for (const position of layoutData.bedPositions) {
          const bedIdentifier = `${roomPrefix}-${position.id}`;
          const bedNumber = position.id.replace('bed', '').replace(/[^0-9]/g, '') || '1';
          
          bedsToCreate.push({
            bedIdentifier,
            bedNumber,
            description: `Bed ${bedNumber} in ${room.name}`,
            bunkLevel: position.bunkLevel || null
          });
          
          console.log(`   ✅ Added bed from position: ${bedIdentifier}`);
        }
      }

      // Create all bed entities
      console.log(`🆕 Creating ${bedsToCreate.length} bed entities`);
      
      for (const bedData of bedsToCreate) {
        try {
          const bed = this.bedRepository.create({
            roomId,
            hostelId: room.hostelId,
            bedIdentifier: bedData.bedIdentifier,
            bedNumber: bedData.bedNumber,
            status: BedStatus.AVAILABLE,
            gender: (room.gender as 'Male' | 'Female' | 'Any') || 'Any',
            monthlyRate: room.monthlyRate,
            description: bedData.description,
            currentOccupantId: null,
            currentOccupantName: null,
            occupiedSince: null
          });

          await this.bedRepository.save(bed);
          console.log(`   ✅ Created bed: ${bedData.bedIdentifier}`);
          
        } catch (error) {
          console.error(`   ❌ Failed to create bed ${bedData.bedIdentifier}:`, error.message);
          // Continue with other beds
        }
      }

      console.log(`✅ Successfully created ${bedsToCreate.length} bed entities for room ${roomId}`);
      return bedsToCreate.length;
      
    } catch (error) {
      console.error('❌ Error creating beds from layout data:', error.message);
      throw error;
    }
  }

  private async updateRoomLayout(roomId: string, layoutData: any) {
    if (!layoutData) {
      return;
    }

    try {
      console.log('🎨 Updating room layout for room:', roomId);
      console.log('📐 Layout data:', JSON.stringify(layoutData, null, 2));

      // Check if layout already exists
      const existingLayout = await this.roomLayoutRepository.findOne({
        where: { roomId }
      });

      // Get room details for generating room-specific bed identifiers
      const room = await this.roomRepository.findOne({
        where: { id: roomId }
      });
      const roomPrefix = room?.roomNumber || 'R';

      // Create corrected bedPositions with room-specific identifiers
      let correctedBedPositions = [];
      
      if (layoutData.elements) {
        for (const element of layoutData.elements) {
          if (element.type && element.type.includes('bed')) {
            if (element.type === 'bunk-bed' && element.properties?.levels) {
              // Handle bunk bed levels
              for (const level of element.properties.levels) {
                correctedBedPositions.push({
                  id: `${roomPrefix}-${level.id}`, // Room-specific identifier
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                  rotation: element.rotation || 0,
                  type: 'bunk-bed-level',
                  properties: {
                    ...element.properties,
                    bedId: `${roomPrefix}-${level.id}`,
                    bunkLevel: level.position,
                    parentBunkId: element.id
                  },
                  status: 'Available',
                  gender: room?.gender || 'Any',
                  color: '#10B981',
                  bedType: 'bunk',
                  bunkLevel: level.position
                });
              }
            } else {
              // Handle single bed
              correctedBedPositions.push({
                id: `${roomPrefix}-${element.id}`, // Room-specific identifier
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height,
                rotation: element.rotation || 0,
                type: element.type,
                properties: {
                  ...element.properties,
                  bedId: `${roomPrefix}-${element.id}`
                },
                status: 'Available',
                gender: room?.gender || 'Any',
                color: '#10B981'
              });
            }
          }
        }
      } else if (layoutData.bedPositions) {
        // Use existing bedPositions but update identifiers
        correctedBedPositions = layoutData.bedPositions.map(pos => ({
          ...pos,
          id: `${roomPrefix}-${pos.id}`,
          properties: {
            ...pos.properties,
            bedId: `${roomPrefix}-${pos.id}`
          }
        }));
      }

      // Store layout with corrected bedPositions
      const layoutToSave = {
        layoutData: {
          ...layoutData,
          bedPositions: correctedBedPositions // Use corrected identifiers
        },
        dimensions: layoutData.dimensions,
        bedPositions: correctedBedPositions, // Use corrected identifiers
        furnitureLayout: layoutData.elements ?
          layoutData.elements.filter(e => e.type && !e.type.includes('bed')) : layoutData.furnitureLayout,
        layoutType: layoutData.layoutType || layoutData.theme?.name || 'standard',
        isActive: true,
        updatedBy: 'system'
      };

      if (existingLayout) {
        console.log('📝 Updating existing layout with corrected bed identifiers');
        await this.roomLayoutRepository.update({ roomId }, layoutToSave);
      } else {
        console.log('🆕 Creating new layout with corrected bed identifiers');
        await this.roomLayoutRepository.save({
          roomId,
          ...layoutToSave,
          createdBy: 'system'
        });
      }

      // Create bed entities directly from layout data (NEW APPROACH)
      // This ensures all beds are created immediately when layout is saved
      console.log('🛏️ Creating bed entities directly from layout data');
      try {
        const bedsCreated = await this.createBedsFromLayoutData(roomId, layoutData);
        console.log(`✅ Successfully created ${bedsCreated} bed entities`);
      } catch (error) {
        console.error('❌ Direct bed creation failed:', error.message);
        throw error;
      }

      console.log('✅ Layout updated successfully');
    } catch (error) {
      console.error('❌ Error updating room layout:', error);
      throw error;
    }
  }

  async assignStudentToRoom(roomId: string, studentId: string) {
    console.log(`🏠 Assigning student ${studentId} to room ${roomId}...`);

    // Find room with current occupancy
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['occupants']
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Find student
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if student is already assigned to a room
    if (student.roomId) {
      throw new Error(`Student is already assigned to room ${student.roomId}`);
    }

    // Check if room has available beds
    if (room.availableBeds <= 0) {
      throw new Error('No available beds in this room');
    }

    // Check if student is already in this room's occupants
    const existingOccupant = await this.roomOccupantRepository.findOne({
      where: {
        roomId,
        studentId,
        status: 'Active'
      }
    });

    if (existingOccupant) {
      throw new Error('Student is already assigned to this room');
    }

    try {
      // 1. Update student's roomId
      await this.studentRepository.update(studentId, {
        roomId: roomId
      });
      console.log(`✅ Updated student ${studentId} roomId to ${roomId}`);

      // 2. Create RoomOccupant record
      const roomOccupant = await this.roomOccupantRepository.save({
        roomId,
        studentId,
        checkInDate: new Date(),
        status: 'Active',
        assignedBy: 'system', // You might want to pass the actual user
        notes: 'Assigned via room management'
      });
      console.log(`✅ Created RoomOccupant record:`, roomOccupant.id);

      // 3. Update room occupancy count
      const currentOccupancy = await this.roomOccupantRepository.count({
        where: { roomId, status: 'Active' }
      });

      await this.roomRepository.update(roomId, {
        occupancy: currentOccupancy
      });
      console.log(`✅ Updated room ${roomId} occupancy to ${currentOccupancy}`);

      return {
        success: true,
        message: 'Student assigned to room successfully',
        roomId,
        studentId,
        occupantId: roomOccupant.id,
        newOccupancy: currentOccupancy
      };
    } catch (error) {
      console.error('❌ Error assigning student to room:', error);
      throw new Error(`Failed to assign student to room: ${error.message}`);
    }
  }

  async vacateStudentFromRoom(roomId: string, studentId: string) {
    console.log(`🏠 Vacating student ${studentId} from room ${roomId}...`);

    // Find room
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Find student
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Check if student is actually assigned to this room
    if (student.roomId !== roomId) {
      throw new Error('Student is not assigned to this room');
    }

    // Find active occupant record
    const occupant = await this.roomOccupantRepository.findOne({
      where: {
        roomId,
        studentId,
        status: 'Active'
      }
    });

    if (!occupant) {
      throw new Error('No active occupancy record found for this student in this room');
    }

    try {
      // 1. Update student's roomId to null
      await this.studentRepository.update(studentId, {
        roomId: null
      });
      console.log(`✅ Cleared student ${studentId} roomId`);

      // 2. Update RoomOccupant record (mark as checked out)
      await this.roomOccupantRepository.update(occupant.id, {
        checkOutDate: new Date(),
        status: 'Checked Out'
      });
      console.log(`✅ Updated RoomOccupant record to Checked Out`);

      // 3. Update room occupancy count
      const currentOccupancy = await this.roomOccupantRepository.count({
        where: { roomId, status: 'Active' }
      });

      await this.roomRepository.update(roomId, {
        occupancy: currentOccupancy
      });
      console.log(`✅ Updated room ${roomId} occupancy to ${currentOccupancy}`);

      return {
        success: true,
        message: 'Student vacated from room successfully',
        roomId,
        studentId,
        occupantId: occupant.id,
        newOccupancy: currentOccupancy
      };
    } catch (error) {
      console.error('❌ Error vacating student from room:', error);
      throw new Error(`Failed to vacate student from room: ${error.message}`);
    }
  }

  async scheduleRoomMaintenance(roomId: string, maintenanceData: any) {
    await this.roomRepository.update(roomId, {
      status: RoomStatus.MAINTENANCE,
      maintenanceStatus: MaintenanceStatus.UNDER_REPAIR,
      lastMaintenance: new Date()
    });

    return {
      success: true,
      message: 'Room maintenance scheduled successfully',
      scheduledDate: maintenanceData.scheduleDate,
      notes: maintenanceData.notes
    };
  }
}