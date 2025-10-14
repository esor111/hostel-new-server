import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { Bed } from './entities/bed.entity';
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
    private bedSyncService: BedSyncService,
  ) { }

  /**
   * Get all rooms WITHOUT layout data (lightweight for listing)
   */
  async findAllLightweight(filters: any = {}, hostelId?: string) {
    const { status = 'all', type = 'all', search = '', page = 1, limit = 20 } = filters;

    console.log('🆕 RoomsNewService.findAllLightweight - hostelId:', hostelId);

    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .leftJoinAndSelect('room.amenities', 'roomAmenities')
      .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
      .leftJoinAndSelect('room.layout', 'layout') // Only to check if layout exists
      .leftJoinAndSelect('room.beds', 'beds'); // For accurate availability

    if (hostelId) {
      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId });
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
      hasLayout: !!room.layout // Flag to indicate layout exists
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

    // Return dimensions in FEET (unscaled) - frontend will scale
    const dimensions = {
      width: layout.dimensions?.width || 300,
      height: layout.dimensions?.height || layout.dimensions?.length || 400,
      unit: 'feet' // Important: feet, not px!
    };

    // Return doors UNSCALED (in feet)
    const doors = this.getDoorsUnscaled(layout.layoutData?.doors || layout.layoutData?.doorPositions || []);

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
   * Build complete furniture array UNSCALED (in feet) - frontend will scale
   */
  private async buildFurnitureArrayUnscaled(room: Room, layout: RoomLayout): Promise<any[]> {
    const furniture = [];

    // Get bed positions from layout
    let bedPositions = layout.bedPositions || layout.layoutData?.bedPositions || [];

    // If no bedPositions but has elements, convert
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
    }

    console.log(`🛏️ Processing ${bedPositions.length} bed positions`);

    // Process beds - UNSCALED (in feet)
    for (const position of bedPositions) {
      // Find matching bed entity
      const matchingBed = room.beds?.find(bed => bed.bedIdentifier === position.id);

      if (!matchingBed) {
        console.log(`⚠️ No matching bed entity for position: ${position.id}`);
        continue;
      }

      // Calculate orientation
      const isRotated = (position.rotation || 0) % 180 === 90;
      const orientation = isRotated ? 'vertical' :
        (position.width >= position.height ? 'horizontal' : 'vertical');

      // Convert status (Occupied from booking -> Reserved)
      let status: string = matchingBed.status;
      if (status === 'Occupied' && matchingBed.notes && matchingBed.notes.includes('via booking')) {
        status = 'Reserved';
      }

      furniture.push({
        id: position.id, // "B1" - visual identifier
        refId: matchingBed.id, // "bed-uuid-aaa-111" - real UUID for booking
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
          bedId: matchingBed.id,
          status, // From Bed entity!
          bedType: position.bedType || 'single',
          bedLabel: position.id,
          orientation
        },

        metadata: {
          rotation: position.rotation || 0,
          occupantId: matchingBed.currentOccupantId,
          bedNumber: matchingBed.bedNumber,
          monthlyRate: matchingBed.monthlyRate?.toString(),
          gender: matchingBed.gender
        }
      });
    }

    // Process other furniture - UNSCALED (in feet)
    const furnitureLayout = layout.furnitureLayout || layout.layoutData?.furnitureLayout || [];

    console.log(`🪑 Processing ${furnitureLayout.length} other furniture items`);

    for (const item of furnitureLayout) {
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

    return furniture;
  }
}
