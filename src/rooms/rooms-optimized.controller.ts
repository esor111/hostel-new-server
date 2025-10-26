import { Controller, Get, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RoomsOptimizedService } from './rooms-optimized.service';

@ApiTags('rooms-optimized')
@Controller('rooms-optimized')
export class RoomsOptimizedController {
  constructor(
    private readonly roomsOptimizedService: RoomsOptimizedService
  ) {}

  @Get('lightweight')
  @ApiOperation({ summary: 'Get lightweight room list for UI cards (FAST)' })
  @ApiResponse({ status: 200, description: 'Lightweight room list retrieved successfully' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by room status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by room type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by room name or number' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getLightweightRooms(@Query() query: any) {
    console.log('🚀 getLightweightRooms - query:', query);

    const result = await this.roomsOptimizedService.findAllLightweight(query, query.hostelId);

    // Return EXACT same format as original API for compatibility
    return {
      status: HttpStatus.OK,
      result: result
    };
  }

  @Get(':id/layout')
  @ApiOperation({ summary: 'Get room layout data for design view (SEPARATE)' })
  @ApiResponse({ status: 200, description: 'Room layout retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  async getRoomLayout(@Param('id') id: string, @Query() query: any) {
    console.log('🎨 getRoomLayout - roomId:', id, 'query:', query);

    const layout = await this.roomsOptimizedService.getRoomLayout(id, query.hostelId);

    return {
      status: HttpStatus.OK,
      data: layout
    };
  }

  @Get(':id/bed-status')
  @ApiOperation({ summary: 'Get room bed status for quick checks (FAST)' })
  @ApiResponse({ status: 200, description: 'Room bed status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiQuery({ name: 'hostelId', required: false, description: 'Filter by hostel ID (businessId)' })
  async getRoomBedStatus(@Param('id') id: string, @Query() query: any) {
    console.log('🛏️ getRoomBedStatus - roomId:', id, 'query:', query);

    const bedStatus = await this.roomsOptimizedService.getRoomBedStatus(id, query.hostelId);

    return {
      status: HttpStatus.OK,
      data: bedStatus
    };
  }
}