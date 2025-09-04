import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { BedService } from './bed.service';
import { BedSyncService } from './bed-sync.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { BedStatus } from './entities/bed.entity';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly bedService: BedService,
    private readonly bedSyncService: BedSyncService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, description: 'List of rooms retrieved successfully' })
  async getAllRooms(@Query() query: any) {
    const result = await this.roomsService.findAll(query);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get room statistics' })
  @ApiResponse({ status: 200, description: 'Room statistics retrieved successfully' })
  async getRoomStats() {
    const stats = await this.roomsService.getStats();
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available rooms' })
  @ApiResponse({ status: 200, description: 'Available rooms retrieved successfully' })
  async getAvailableRooms() {
    const availableRooms = await this.roomsService.getAvailableRooms();
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: {
        items: availableRooms,
        count: availableRooms.length
      }
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, description: 'Room retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomById(@Param('id') id: string) {
    const room = await this.roomsService.findOne(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      room: room
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomsService.create(createRoomDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      newRoom: room
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  async updateRoom(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    const room = await this.roomsService.update(id, updateRoomDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      updatedRoom: room
    };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign student to room' })
  @ApiResponse({ status: 200, description: 'Student assigned successfully' })
  async assignStudent(@Param('id') id: string, @Body() assignDto: any) {
    const result = await this.roomsService.assignStudentToRoom(id, assignDto.studentId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/vacate')
  @ApiOperation({ summary: 'Vacate student from room' })
  @ApiResponse({ status: 200, description: 'Student vacated successfully' })
  async vacateStudent(@Param('id') id: string, @Body() vacateDto: any) {
    const result = await this.roomsService.vacateStudentFromRoom(id, vacateDto.studentId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/maintenance')
  @ApiOperation({ summary: 'Schedule room maintenance' })
  @ApiResponse({ status: 200, description: 'Maintenance scheduled successfully' })
  async scheduleMaintenance(@Param('id') id: string, @Body() maintenanceDto: any) {
    const result = await this.roomsService.scheduleRoomMaintenance(id, maintenanceDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  // ========================================
  // BED MANAGEMENT ENDPOINTS
  // ========================================

  @Get(':roomId/beds')
  @ApiOperation({ summary: 'Get all beds in a room' })
  @ApiResponse({ status: 200, description: 'Beds retrieved successfully' })
  async getRoomBeds(@Param('roomId') roomId: string) {
    const beds = await this.bedService.findByRoomId(roomId);
    
    return {
      status: HttpStatus.OK,
      data: beds
    };
  }

  @Get('beds/identifier/:bedIdentifier')
  @ApiOperation({ summary: 'Get bed by identifier (for mobile app)' })
  @ApiResponse({ status: 200, description: 'Bed retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bed not found' })
  async getBedByIdentifier(@Param('bedIdentifier') bedIdentifier: string) {
    const bed = await this.bedService.findByBedIdentifier(bedIdentifier);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Get('beds/:bedId')
  @ApiOperation({ summary: 'Get bed by ID' })
  @ApiResponse({ status: 200, description: 'Bed retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bed not found' })
  async getBedById(@Param('bedId') bedId: string) {
    const bed = await this.bedService.findOne(bedId);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Put('beds/:bedId/status')
  @ApiOperation({ summary: 'Update bed status' })
  @ApiResponse({ status: 200, description: 'Bed status updated successfully' })
  async updateBedStatus(
    @Param('bedId') bedId: string, 
    @Body() updateDto: { status: BedStatus; notes?: string }
  ) {
    const bed = await this.bedService.updateBedStatusWithSync(bedId, updateDto.status, updateDto.notes);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Post('beds/:bedId/assign')
  @ApiOperation({ summary: 'Assign occupant to bed' })
  @ApiResponse({ status: 200, description: 'Occupant assigned successfully' })
  async assignOccupantToBed(
    @Param('bedId') bedId: string,
    @Body() assignDto: { occupantId: string; occupantName: string; checkInDate?: string }
  ) {
    const bed = await this.bedService.assignOccupant(bedId, {
      occupantId: assignDto.occupantId,
      occupantName: assignDto.occupantName,
      checkInDate: assignDto.checkInDate ? new Date(assignDto.checkInDate) : undefined
    });
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Post('beds/:bedId/release')
  @ApiOperation({ summary: 'Release occupant from bed' })
  @ApiResponse({ status: 200, description: 'Occupant released successfully' })
  async releaseOccupantFromBed(@Param('bedId') bedId: string) {
    const bed = await this.bedService.releaseOccupant(bedId);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Post('beds/:bedId/reserve')
  @ApiOperation({ summary: 'Reserve bed' })
  @ApiResponse({ status: 200, description: 'Bed reserved successfully' })
  async reserveBed(
    @Param('bedId') bedId: string,
    @Body() reserveDto: { notes?: string }
  ) {
    const bed = await this.bedService.reserveBed(bedId, reserveDto.notes);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Post('beds/:bedId/cancel-reservation')
  @ApiOperation({ summary: 'Cancel bed reservation' })
  @ApiResponse({ status: 200, description: 'Bed reservation cancelled successfully' })
  async cancelBedReservation(@Param('bedId') bedId: string) {
    const bed = await this.bedService.cancelReservation(bedId);
    
    return {
      status: HttpStatus.OK,
      data: bed
    };
  }

  @Get(':roomId/beds/stats')
  @ApiOperation({ summary: 'Get bed statistics for room' })
  @ApiResponse({ status: 200, description: 'Bed statistics retrieved successfully' })
  async getRoomBedStats(@Param('roomId') roomId: string) {
    const stats = await this.bedService.getBedStatistics(roomId);
    
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('beds/available')
  @ApiOperation({ summary: 'Get available beds' })
  @ApiResponse({ status: 200, description: 'Available beds retrieved successfully' })
  async getAvailableBeds(
    @Query('roomId') roomId?: string,
    @Query('gender') gender?: string,
    @Query('limit') limit?: string
  ) {
    const beds = await this.bedService.findAvailableBedsForBooking(
      roomId,
      gender,
      limit ? parseInt(limit) : undefined
    );
    
    return {
      status: HttpStatus.OK,
      data: beds
    };
  }

  @Post('beds/validate-availability')
  @ApiOperation({ summary: 'Validate multiple bed availability' })
  @ApiResponse({ status: 200, description: 'Bed availability validated successfully' })
  async validateBedAvailability(
    @Body() validateDto: { bedIdentifiers: string[]; guestGenders?: string[] }
  ) {
    const result = await this.bedService.validateMultipleBedAvailability(
      validateDto.bedIdentifiers,
      validateDto.guestGenders
    );
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get(':roomId/beds/summary')
  @ApiOperation({ summary: 'Get bed availability summary for room' })
  @ApiResponse({ status: 200, description: 'Bed availability summary retrieved successfully' })
  async getBedAvailabilitySummary(@Param('roomId') roomId: string) {
    const summary = await this.bedService.getBedAvailabilitySummary(roomId);
    
    return {
      status: HttpStatus.OK,
      data: summary
    };
  }

  @Post(':roomId/beds/sync')
  @ApiOperation({ summary: 'Sync bed entities from bedPositions' })
  @ApiResponse({ status: 200, description: 'Bed entities synced successfully' })
  async syncBedsFromPositions(@Param('roomId') roomId: string) {
    // Get room with layout
    const room = await this.roomsService.findOne(roomId);
    
    if (room.layout?.bedPositions) {
      // Use BedSyncService to create bed entities from bedPositions
      await this.bedSyncService.syncBedsFromLayout(roomId, room.layout.bedPositions);
    }
    
    // Return updated bed count
    const beds = await this.bedService.findByRoomId(roomId);
    
    return {
      status: HttpStatus.OK,
      message: `Synced ${beds.length} bed entities for room`,
      data: {
        roomId,
        bedsCreated: beds.length,
        beds: beds
      }
    };
  }

  @Post('beds/migrate-all')
  @ApiOperation({ summary: 'Migrate all rooms to create bed entities from bedPositions' })
  @ApiResponse({ status: 200, description: 'Migration completed successfully' })
  async migrateAllRoomsBeds() {
    // This will use the BedSyncService migration method
    const result = await this.bedSyncService.migrateAllRoomsToBedsEntities();
    
    return {
      status: HttpStatus.OK,
      message: 'Migration completed',
      data: result
    };
  }
}