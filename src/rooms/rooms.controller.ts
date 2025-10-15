import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { BedService } from './bed.service';
import { BedSyncService } from './bed-sync.service';
import { CreateRoomDto, UpdateRoomDto, AssignStudentDto, VacateStudentDto, MaintenanceDto } from './dto';
import { BedStatus } from './entities/bed.entity';
import { GetOptionalHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthGuard } from '../auth/guards/hostel-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
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
  ) { }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, description: 'List of rooms retrieved successfully' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by room status (Active, Maintenance, Inactive)' })
  @ApiQuery({ name: 'gender', required: false, description: 'Filter by gender (Male, Female, Mixed, Any)' })
  @ApiQuery({ name: 'floor', required: false, description: 'Filter by floor number' })
  @ApiQuery({ name: 'buildingId', required: false, description: 'Filter by building ID' })
  @ApiQuery({ name: 'roomTypeId', required: false, description: 'Filter by room type ID' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by room name or number' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', type: Number })
  async getAllRooms(@Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    console.log('🔍 getAllRooms - query.hostelId:', query.hostelId);
    console.log('🔍 getAllRooms - JWT hostelId (optional):', hostelId);

    // SIMPLIFIED: Use query.hostelId directly, let the service handle flexible resolution
    // No JWT token required - purely query-parameter based
    const queryHostelId = query.hostelId || null;
    
    console.log('🎯 Using query hostelId for flexible resolution:', queryHostelId);

    const result = await this.roomsService.findAll(query, queryHostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get room statistics' })
  @ApiResponse({ status: 200, description: 'Room statistics retrieved successfully' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  async getRoomStats(@Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    console.log('📊 getRoomStats - query.hostelId:', query.hostelId);
    
    // SIMPLIFIED: Use query.hostelId directly for flexible resolution
    const queryHostelId = query.hostelId || null;
    
    const stats = await this.roomsService.getStats(queryHostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available rooms' })
  @ApiResponse({ status: 200, description: 'Available rooms retrieved successfully' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  async getAvailableRooms(@Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    console.log('🏠 getAvailableRooms - query.hostelId:', query.hostelId);
    
    // SIMPLIFIED: Use query.hostelId directly for flexible resolution
    const queryHostelId = query.hostelId || null;
    
    const availableRooms = await this.roomsService.getAvailableRooms(queryHostelId);

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
  async getRoomById(@Param('id') id: string, @Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    console.log('🏠 getRoomById - query.hostelId:', query.hostelId);
    
    // SIMPLIFIED: Use query.hostelId directly for flexible resolution
    const queryHostelId = query.hostelId || null;
    
    const room = await this.roomsService.findOne(id, queryHostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      room: room
    };
  }

  @Post()
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new room' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Business token required' })
  async createRoom(@Body() createRoomDto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    console.log('🔧 User businessId:', user.businessId);

    // Get hostel ID from the authenticated user's businessId
    // The HostelAuthWithContextGuard ensures hostel exists and sets up context
    const hostel = await this.hostelService.ensureHostelExists(user.businessId);

    console.log('🏨 Using hostel:', hostel.name, 'ID:', hostel.id);

    const room = await this.roomsService.create(createRoomDto, hostel.id);

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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @ApiQuery({ name: 'roomId', required: false, description: 'Filter by room ID' })
  @ApiQuery({ name: 'gender', required: false, description: 'Filter by gender (Male, Female, Any)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', type: Number })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  async getAvailableBeds(
    @Query('roomId') roomId?: string,
    @Query('gender') gender?: string,
    @Query('limit') limit?: string,
    @Query('hostelId') queryHostelId?: string,
    @GetOptionalHostelId() hostelId?: string
  ) {
    // Handle optional hostelId from query params (frontend sends hostelId, we need to find by businessId)
    let effectiveHostelId = hostelId; // From JWT token context

    if (queryHostelId && !effectiveHostelId) {
      // Frontend sent hostelId in query params, need to find the actual hostel record
      const hostel = await this.hostelService.findByBusinessId(queryHostelId);
      if (hostel) {
        effectiveHostelId = hostel.id; // Use the actual hostel.id for database queries
      }
    }

    const beds = await this.bedService.findAvailableBedsForBooking(
      roomId,
      gender,
      limit ? parseInt(limit) : undefined,
      effectiveHostelId // Pass hostelId to filter beds by hostel
    );

    return {
      status: HttpStatus.OK,
      data: beds
    };
  }

  @Post('beds/validate-availability')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
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
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync bed entities from bedPositions' })
  @ApiResponse({ status: 200, description: 'Bed entities synced successfully' })
  async syncBedsFromPositions(@Param('roomId') roomId: string) {
    console.log(`🔧 Manual bed sync requested for room: ${roomId}`);

    // Get room with layout
    const room = await this.roomsService.findOne(roomId);
    console.log(`🏠 Room found: ${room.name}`);
    console.log(`📐 Layout data:`, JSON.stringify(room.layout, null, 2));

    let bedPositions = null;

    // Try to get bedPositions from different sources
    if (room.layout?.bedPositions && Array.isArray(room.layout.bedPositions) && room.layout.bedPositions.length > 0) {
      bedPositions = room.layout.bedPositions;
      console.log(`🛏️ Found ${bedPositions.length} bedPositions in layout.bedPositions`);
    } else if (room.layout?.layoutData?.elements) {
      // Convert elements to bedPositions
      const elements = room.layout.layoutData.elements.filter(e => e.type && e.type.includes('bed'));
      bedPositions = elements.map(element => ({
        id: element.id,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation || 0,
        bedType: element.properties?.bedType || 'single',
        status: element.properties?.status || 'available',
        gender: element.properties?.gender || 'Any'
      }));
      console.log(`🔄 Converted ${bedPositions.length} elements to bedPositions`);
    } else if (room.layout?.layoutData?.bedPositions) {
      bedPositions = room.layout.layoutData.bedPositions;
      console.log(`🛏️ Found ${bedPositions.length} bedPositions in layoutData.bedPositions`);
    }

    if (bedPositions && bedPositions.length > 0) {
      console.log(`🔄 Syncing ${bedPositions.length} bed positions...`);
      // Use BedSyncService to create bed entities from bedPositions
      await this.bedSyncService.syncBedsFromLayout(roomId, bedPositions);
    } else {
      console.log('⚠️ No bed positions found to sync');
    }

    // Return updated bed count
    const beds = await this.bedService.findByRoomId(roomId);
    console.log(`✅ Manual sync completed: ${beds.length} beds found`);

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