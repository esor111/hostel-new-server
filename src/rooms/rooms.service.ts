import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus, MaintenanceStatus } from './entities/room.entity';
import { Building } from './entities/building.entity';
import { RoomType } from './entities/room-type.entity';
import { Amenity, AmenityCategory } from './entities/amenity.entity';
import { RoomAmenity } from './entities/room-amenity.entity';
import { RoomLayout } from './entities/room-layout.entity';
import { RoomOccupant } from './entities/room-occupant.entity';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Building)
    private buildingRepository: Repository<Building>,
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
  ) { }

  async findAll(filters: any = {}) {
    const { status = 'all', type = 'all', search = '', page = 1, limit = 20 } = filters;

    const queryBuilder = this.roomRepository.createQueryBuilder('room')
      .leftJoinAndSelect('room.building', 'building')
      .leftJoinAndSelect('room.roomType', 'roomType')
      .leftJoinAndSelect('room.occupants', 'occupants', 'occupants.status = :occupantStatus', { occupantStatus: 'Active' })
      .leftJoinAndSelect('occupants.student', 'student')
      .leftJoinAndSelect('room.amenities', 'roomAmenities')
      .leftJoinAndSelect('roomAmenities.amenity', 'amenity')
      .leftJoinAndSelect('room.layout', 'layout');

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

    // Transform to API response format (EXACT same as current JSON structure)
    const transformedItems = rooms.map(room => this.transformToApiResponse(room));

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

  async findOne(id: string) {
    const room = await this.roomRepository.findOne({
      where: { id },
      relations: [
        'building',
        'roomType',
        'occupants',
        'occupants.student',
        'amenities',
        'amenities.amenity',
        'layout'
      ]
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Ensure occupancy is accurate for this room
    await this.syncRoomOccupancy([room]);

    return this.transformToApiResponse(room);
  }

  async create(createRoomDto: any) {
    console.log('🏠 Creating new room');
    console.log('📤 Create data received:', JSON.stringify(createRoomDto, null, 2));

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

    // Create room entity
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
      roomTypeId: roomType?.id,
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
      await this.roomLayoutRepository.save({
        roomId: savedRoom.id,
        name: 'Default Layout',
        layoutData: createRoomDto.layout,
        isActive: true,
        version: 1,
        dimensions: createRoomDto.layout.dimensions,
        theme: createRoomDto.layout.theme
      });
    }

    return this.findOne(savedRoom.id);
  }

  async update(id: string, updateRoomDto: any) {
    console.log('🏠 Updating room:', id);
    console.log('📤 Update data received:', JSON.stringify(updateRoomDto, null, 2));

    const room = await this.findOne(id);

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
    }

    // Update amenities if provided
    if (updateRoomDto.amenities !== undefined) {
      await this.updateRoomAmenities(id, updateRoomDto.amenities);
    }

    // Update layout if provided
    if (updateRoomDto.layout !== undefined) {
      await this.updateRoomLayout(id, updateRoomDto.layout);
    }

    return this.findOne(id);
  }

  async getStats() {
    const totalRooms = await this.roomRepository.count();
    const activeRooms = await this.roomRepository.count({
      where: { status: 'ACTIVE' }
    });
    const maintenanceRooms = await this.roomRepository.count({
      where: { status: 'MAINTENANCE' }
    });

    // Get accurate occupancy data from RoomOccupant records
    const occupancyResult = await this.roomRepository
      .createQueryBuilder('room')
      .select('SUM(room.bedCount)', 'totalBeds')
      .where('room.status = :status', { status: 'ACTIVE' })
      .getRawOne();

    // Count actual active occupants
    const actualOccupiedResult = await this.roomOccupantRepository
      .createQueryBuilder('occupant')
      .innerJoin('occupant.room', 'room')
      .select('COUNT(occupant.id)', 'totalOccupied')
      .where('occupant.status = :status', { status: 'Active' })
      .andWhere('room.status = :roomStatus', { roomStatus: 'ACTIVE' })
      .getRawOne();

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

  async getAvailableRooms() {
    const availableRooms = await this.roomRepository.find({
      where: { status: 'ACTIVE' },
      relations: ['roomType', 'amenities', 'amenities.amenity', 'occupants']
    });

    // Sync occupancy for all rooms to ensure accurate data
    await this.syncRoomOccupancy(availableRooms);

    const filtered = availableRooms.filter(room => room.availableBeds > 0);

    return filtered.map(room => this.transformToApiResponse(room));
  }

  // Sync room occupancy with actual RoomOccupant records
  private async syncRoomOccupancy(rooms: Room[]): Promise<void> {
    for (const room of rooms) {
      // Count actual active occupants for this room
      const actualOccupancy = await this.roomOccupantRepository.count({
        where: { 
          roomId: room.id, 
          status: 'Active' 
        }
      });

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

  // Transform normalized data back to exact API format
  private transformToApiResponse(room: Room): any {
    // Get active layout
    const activeLayout = room.layout;

    // Get amenities list
    const amenities = room.amenities?.map(ra => ra.amenity.name) || [];

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

    // Calculate accurate available beds
    const actualOccupancy = occupants.length;
    const availableBeds = room.bedCount - actualOccupancy;

    // Return EXACT same structure as current JSON
    return {
      id: room.id,
      name: room.name,
      type: room.roomType?.name || 'Private', // Default fallback
      bedCount: room.bedCount,
      occupancy: actualOccupancy, // Use actual occupancy from occupants array
      gender: room.gender,
      monthlyRate: room.roomType?.baseMonthlyRate || 0,
      dailyRate: room.roomType?.baseDailyRate || 0,
      amenities: amenities,
      status: room.status,
      layout: activeLayout?.layoutData || null,
      floor: room.building?.name || 'Ground Floor', // Fallback
      roomNumber: room.roomNumber,
      occupants: occupants,
      availableBeds: availableBeds, // Use calculated available beds
      lastCleaned: room.lastCleaned,
      maintenanceStatus: room.maintenanceStatus,
      pricingModel: room.roomType?.pricingModel || 'monthly',
      description: room.description,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
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

      if (existingLayout) {
        console.log('📝 Updating existing layout');
        // Update existing layout
        await this.roomLayoutRepository.update(
          { roomId },
          {
            layoutData,
            dimensions: layoutData.dimensions,
            bedPositions: layoutData.bedPositions,
            furnitureLayout: layoutData.furnitureLayout,
            layoutType: layoutData.layoutType || 'standard',
            isActive: true,
            updatedBy: 'system' // You might want to pass the actual user
          }
        );
      } else {
        console.log('🆕 Creating new layout');
        // Create new layout
        await this.roomLayoutRepository.save({
          roomId,
          layoutData,
          dimensions: layoutData.dimensions,
          bedPositions: layoutData.bedPositions,
          furnitureLayout: layoutData.furnitureLayout,
          layoutType: layoutData.layoutType || 'standard',
          isActive: true,
          createdBy: 'system' // You might want to pass the actual user
        });
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