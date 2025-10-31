import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomType } from './entities/room-type.entity';
import { Amenity } from './entities/amenity.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { Bed } from './entities/bed.entity';
import { Hostel } from '../hostel/entities/hostel.entity';
import { BedSyncService } from './bed-sync.service';

@Injectable()
export class RoomsOptimizedService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(RoomType)
    private roomTypeRepository: Repository<RoomType>,
    @InjectRepository(Amenity)
    private amenityRepository: Repository<Amenity>,
    @InjectRepository(RoomLayout)
    private roomLayoutRepository: Repository<RoomLayout>,
    @InjectRepository(Bed)
    private bedRepository: Repository<Bed>,
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    private bedSyncService: BedSyncService,
  ) { }

  /**
   * Resolve hostelId from businessId or UUID
   */
  private async resolveHostelId(inputId?: string): Promise<string | null> {
    if (!inputId) return null;

    const cleanInputId = inputId.trim();
    console.log('🔍 Resolving hostelId from input:', `"${cleanInputId}"`);

    try {
      const hostel = await this.hostelRepository
        .createQueryBuilder('hostel')
        .where('(hostel.id::text = :inputId OR hostel.businessId = :inputId)', { inputId: cleanInputId })
        .andWhere('hostel.isActive = :isActive', { isActive: true })
        .getOne();

      if (hostel) {
        console.log('✅ Found hostel:', {
          inputId: cleanInputId,
          matchedBy: hostel.id === cleanInputId ? 'hostel.id' : 'hostel.businessId',
          hostelId: hostel.id,
          businessId: hostel.businessId,
          name: hostel.name
        });
        return hostel.id;
      }

      console.log('❌ No hostel found with id OR businessId:', cleanInputId);
      return null;
    } catch (error) {
      console.error('❌ Error resolving hostelId:', error.message);
      return null;
    }
  }

  /**
   * OPTIMIZED: Lightweight room list for UI cards (no layout/bed data)
   */
  async findAllLightweight(filters: any = {}, hostelId?: string) {
    const { status = 'all', type = 'all', search = '', page = 1, limit = 20 } = filters;

    console.log('🚀 RoomsOptimizedService.findAllLightweight - hostelId:', hostelId);
    console.log('🚀 RoomsOptimizedService.findAllLightweight - filters:', filters);

    if (hostelId !== undefined && hostelId !== null && hostelId !== '') {
      const effectiveHostelId = await this.resolveHostelId(hostelId);

      if (!effectiveHostelId) {
        console.log('❌ Hostel not found for hostelId:', hostelId, '- returning empty results');
        return {
          items: [],
          pagination: { page, limit, total: 0, totalPages: 0 }
        };
      }

      // OPTIMIZED: Essential fields + layout check (but not full layout data)
      const queryBuilder = this.roomRepository.createQueryBuilder('room')
        .leftJoinAndSelect('room.roomType', 'roomType')
        .leftJoinAndSelect('room.layout', 'layout')
        .leftJoinAndSelect('room.amenities', 'roomAmenities', 'roomAmenities.isActive = :amenityActive', { amenityActive: true })
        .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
        .select([
          'room.id',
          'room.name',
          'room.roomNumber',
          'room.bedCount',
          'room.occupancy',
          'room.gender',
          'room.floor',
          'room.monthlyRate',
          'room.status',
          'room.maintenanceStatus',
          'room.images', // Added missing images column
          'room.createdAt',
          'room.updatedAt',
          'roomType.name',
          'roomType.baseDailyRate',
          'layout.id',
          'layout.layoutData',
          'layout.dimensions',
          'layout.layoutType',
          'roomAmenities.id',
          'roomAmenities.isActive',
          'amenity.id',
          'amenity.name',
          'amenity.description'
        ]);

      queryBuilder.andWhere('room.hostelId = :hostelId', { hostelId: effectiveHostelId });

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

      // Transform to response - SAME structure as original API but optimized
      const transformedItems = rooms.map(room => {
        // Get amenities list in proper format
        const amenities = room.amenities?.map((ra, index) => ({
          id: (index + 1).toString(),
          name: ra.amenity.name,
          description: ra.amenity.description || ra.amenity.name
        })) || [];

        // Include layout data if it exists (for room designer compatibility)
        let layoutData = null;
        if (room.layout?.layoutData) {
          layoutData = room.layout.layoutData;
        } else if (room.layout) {
          // Reconstruct layout from separate fields if needed
          layoutData = {
            dimensions: room.layout.dimensions,
            layoutType: room.layout.layoutType,
            elements: [], // Will be populated by separate API if needed
            theme: {
              name: room.layout.layoutType || 'Modern',
              wallColor: '#F8F9FA',
              floorColor: '#E9ECEF'
            }
          };
        }

        return {
          id: room.id,
          name: room.name,
          type: room.roomType?.name || 'Private',
          bedCount: room.bedCount,
          occupancy: room.occupancy,
          gender: room.gender,
          monthlyRate: room.monthlyRate || room.roomType?.baseMonthlyRate || 0,
          dailyRate: room.roomType?.baseDailyRate || Math.round((room.monthlyRate || 0) / 30) || 0,
          amenities: amenities,
          status: room.status,
          layout: layoutData, // Include layout for compatibility
          floor: room.floor || 1, // Use actual floor number
          roomNumber: room.roomNumber,
          occupants: [], // No occupants in lightweight mode for performance
          availableBeds: room.bedCount - room.occupancy,
          lastCleaned: null,
          maintenanceStatus: room.maintenanceStatus,
          pricingModel: 'monthly',
          description: '',
          images: room.images || [],
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          beds: [], // No beds in lightweight mode for performance
          hostelId: effectiveHostelId
        };
      });

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

    // No hostelId provided - return empty for security
    console.log('⚠️ No hostelId provided - returning empty results for security');
    return {
      items: [],
      pagination: { page, limit, total: 0, totalPages: 0 }
    };
  }

  /**
   * OPTIMIZED: Get room layout data separately for design view
   */
  async getRoomLayout(id: string, hostelId?: string) {
    console.log('🎨 Getting room layout for room:', id);

    const whereCondition: any = { id };
    if (hostelId) {
      const effectiveHostelId = await this.resolveHostelId(hostelId);
      if (effectiveHostelId) {
        whereCondition.hostelId = effectiveHostelId;
      }
    }

    const room = await this.roomRepository.findOne({
      where: whereCondition,
      relations: ['layout', 'beds'],
      select: ['id', 'name', 'roomNumber', 'bedCount', 'gender', 'monthlyRate']
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.layout) {
      return {
        roomId: room.id,
        roomName: room.name,
        roomNumber: room.roomNumber,
        layout: null,
        message: 'No layout configured for this room'
      };
    }

    // Get complete layout with bed data for design view
    let enhancedLayout = room.layout.layoutData;

    // If no layoutData, construct from individual fields
    if (!enhancedLayout) {
      enhancedLayout = {
        dimensions: room.layout.dimensions,
        bedPositions: room.layout.bedPositions,
        furnitureLayout: room.layout.furnitureLayout,
        layoutType: room.layout.layoutType,
        elements: [], // Will be populated below
        theme: {
          name: room.layout.layoutType || 'Modern',
          wallColor: '#F8F9FA',
          floorColor: '#E9ECEF'
        }
      };
    }

    // Merge bed data into layout positions if beds exist
    if (enhancedLayout?.bedPositions && room.beds?.length > 0) {
      enhancedLayout.bedPositions = await this.bedSyncService.mergeBedDataIntoPositions(
        enhancedLayout.bedPositions,
        room.beds
      );
    }

    // Ensure elements array exists for room designer
    if (!enhancedLayout.elements && enhancedLayout.bedPositions) {
      // Convert bedPositions back to elements format for room designer
      enhancedLayout.elements = [
        ...(enhancedLayout.bedPositions || []).map(bed => ({
          id: bed.id,
          type: bed.bedType === 'bunk' ? 'bunk-bed' : 'single-bed',
          x: bed.x,
          y: bed.y,
          width: bed.width,
          height: bed.height,
          rotation: bed.rotation || 0,
          zIndex: 0,
          properties: {
            bedId: bed.id,
            bedType: bed.bedType,
            status: bed.status,
            bedLabel: `Bed ${bed.bedNumber || bed.id}`,
            orientation: 'north'
          }
        })),
        ...(enhancedLayout.furnitureLayout || [])
      ];
    }

    return {
      roomId: room.id,
      roomName: room.name,
      roomNumber: room.roomNumber,
      layout: enhancedLayout,
      bedCount: room.bedCount,
      lastUpdated: room.layout.updatedAt
    };
  }

  /**
   * OPTIMIZED: Get bed status only for quick status checks
   */
  async getRoomBedStatus(id: string, hostelId?: string) {
    console.log('🛏️ Getting bed status for room:', id);

    const whereCondition: any = { roomId: id };
    if (hostelId) {
      const effectiveHostelId = await this.resolveHostelId(hostelId);
      if (effectiveHostelId) {
        // Add hostel filter to bed query
        const room = await this.roomRepository.findOne({
          where: { id, hostelId: effectiveHostelId },
          select: ['id', 'name', 'roomNumber', 'bedCount', 'occupancy']
        });

        if (!room) {
          throw new NotFoundException('Room not found');
        }
      }
    }

    const beds = await this.bedRepository.find({
      where: whereCondition,
      select: ['id', 'bedNumber', 'bedIdentifier', 'status', 'currentOccupantName', 'monthlyRate']
    });

    const room = await this.roomRepository.findOne({
      where: { id },
      select: ['id', 'name', 'roomNumber', 'bedCount', 'occupancy']
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return {
      roomId: room.id,
      roomName: room.name,
      roomNumber: room.roomNumber,
      totalBeds: room.bedCount,
      occupancy: room.occupancy,
      beds: beds.map(bed => ({
        id: bed.id,
        bedNumber: bed.bedNumber,
        bedIdentifier: bed.bedIdentifier,
        status: bed.status,
        occupantName: bed.currentOccupantName,
        monthlyRate: bed.monthlyRate,
        color: this.getBedStatusColor(bed.status)
      }))
    };
  }



  /**
   * Get color for bed status visualization
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
}