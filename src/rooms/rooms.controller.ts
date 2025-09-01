import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

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
}