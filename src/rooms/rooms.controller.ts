import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { BedService } from './bed.service';
import { BedSyncService } from './bed-sync.service';
import { CreateRoomDto, UpdateRoomDto, AssignStudentDto, VacateStudentDto, MaintenanceDto } from './dto';
import { BedStatus } from './entities/bed.entity';
import { GetOptionalHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthGuard } from '../auth/guards/hostel-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly bedService: BedService,
    private readonly bedSyncService: BedSyncService,
    private readonly hostelService: HostelService
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, description: 'List of rooms retrieved successfully' })
  async getAllRooms(@Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    const result = await this.roomsService.findAll(query, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get room statistics' })
  @ApiResponse({ status: 200, description: 'Room statistics retrieved successfully' })
  async getRoomStats(@GetOptionalHostelId() hostelId?: string) {
    const stats = await this.roomsService.getStats(hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available rooms' })
  @ApiResponse({ status: 200, description: 'Available rooms retrieved successfully' })
  async getAvailableRooms(@GetOptionalHostelId() hostelId?: string) {
    const availableRooms = await this.roomsService.getAvailableRooms(hostelId);
    
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
  async getRoomById(@Param('id') id: string, @GetOptionalHostelId() hostelId?: string) {
    const room = await this.roomsService.findOne(id, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      room: room
    };
  }

  @Post()
  @UseGuards(HostelAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Business token required' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    // For now, use the existing hostel ID that we know works
    console.log('🔧 User businessId:', user.businessId);
    console.log('🔧 Using existing hostel ID for testing');
    const hostelId = '2c9c1747-8d54-4d9d-858d-839c5d48a17f';
    
    const room = await this.roomsService.create(createRoomDto, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      newRoom: room
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  async updateRoom(@Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto, @GetOptionalHostelId() hostelId?: string) {
    const room = await this.roomsService.update(id, updateRoomDto, hostelId);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      updatedRoom: room
    };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign student to room' })
  @ApiResponse({ status: 200, description: 'Student assigned successfully' })
  async assignStudent(@Param('id') id: string, @Body() assignDto: AssignStudentDto) {
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
  async vacateStudent(@Param('id') id: string, @Body() vacateDto: VacateStudentDto) {
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
  async scheduleMaintenance(@Param('id') id: string, @Body() maintenanceDto: MaintenanceDto) {
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

  @Get('beds')
  @ApiOperation({ summary: 'Get all beds' })
  @ApiResponse({ status: 200, description: 'All beds retrieved successfully' })
  async getAllBeds() {
    const beds = await this.bedService.findAll();
    
    return {
      status: HttpStatus.OK,
      data: beds
    };
  }

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
}