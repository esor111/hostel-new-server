import { Controller, Get, Param, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoomsNewService } from './rooms-new.service';
import { GetOptionalHostelId } from '../hostel/decorators/hostel-context.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('rooms-new')
@Controller({ path: 'new-rooms', version: '1' })
export class RoomsNewController {
  constructor(
    private readonly roomsNewService: RoomsNewService,
    private readonly hostelService: HostelService
  ) { }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all rooms (NEW - lightweight, no layout)' })
  @ApiResponse({ status: 200, description: 'List of rooms retrieved successfully' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by room status' })
  @ApiQuery({ name: 'gender', required: false, description: 'Filter by gender' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllRooms(@Query() query: any, @GetOptionalHostelId() hostelId?: string) {
    let effectiveHostelId = hostelId;

    console.log('🆕 NEW-ROOMS API - query.hostelId:', query.hostelId);
    console.log('🆕 NEW-ROOMS API - JWT hostelId:', hostelId);

    if (query.hostelId) {
      const hostelByBusinessId = await this.hostelService.findByBusinessId(query.hostelId);
      if (hostelByBusinessId) {
        effectiveHostelId = hostelByBusinessId.id;
        console.log('✅ Found hostel by businessId:', query.hostelId, '-> hostelId:', effectiveHostelId);
      } else {
        effectiveHostelId = query.hostelId;
        console.log('⚠️ Not found by businessId, using as hostelId directly:', effectiveHostelId);
      }
    }

    console.log('🎯 Final effectiveHostelId:', effectiveHostelId);

    const result = await this.roomsNewService.findAllLightweight(query, effectiveHostelId);

    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get(':roomId/layout')
  @ApiOperation({ summary: 'Get room layout (NEW - complete furniture array)' })
  @ApiResponse({ status: 200, description: 'Room layout retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room or layout not found' })
  async getRoomLayout(@Param('roomId') roomId: string) {
    console.log('🆕 NEW-LAYOUT API - roomId:', roomId);

    const layoutResponse = await this.roomsNewService.getRoomLayoutForFrontend(roomId);

    return {
      status: HttpStatus.OK,
      result: layoutResponse
    };
  }
}
