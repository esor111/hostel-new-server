import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from './dto/maintenance-request.dto';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all maintenance requests' })
  @ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  async getAllRequests(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('roomId') roomId?: string,
  ) {
    try {
      const requests = await this.maintenanceService.getAllRequests({
        status,
        priority,
        type,
        roomId
      });
      return {
        success: true,
        data: requests,
        message: 'Maintenance requests retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  @ApiResponse({ status: 200, description: 'Maintenance statistics retrieved successfully' })
  async getStats() {
    try {
      const stats = await this.maintenanceService.getStats();
      return {
        success: true,
        data: stats,
        message: 'Maintenance statistics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get maintenance request by ID' })
  @ApiResponse({ status: 200, description: 'Maintenance request retrieved successfully' })
  async getRequestById(@Param('id') id: string) {
    try {
      const request = await this.maintenanceService.getRequestById(id);
      return {
        success: true,
        data: request,
        message: 'Maintenance request retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create new maintenance request' })
  @ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
  async createRequest(@Body() createRequestDto: CreateMaintenanceRequestDto) {
    try {
      const request = await this.maintenanceService.createRequest(createRequestDto);
      return {
        success: true,
        data: request,
        message: 'Maintenance request created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update maintenance request' })
  @ApiResponse({ status: 200, description: 'Maintenance request updated successfully' })
  async updateRequest(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateMaintenanceRequestDto
  ) {
    try {
      const request = await this.maintenanceService.updateRequest(id, updateRequestDto);
      return {
        success: true,
        data: request,
        message: 'Maintenance request updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Assign maintenance request to staff' })
  @ApiResponse({ status: 200, description: 'Maintenance request assigned successfully' })
  async assignRequest(
    @Param('id') id: string,
    @Body() assignData: { assignedTo: string; scheduledAt?: Date }
  ) {
    try {
      const request = await this.maintenanceService.assignRequest(id, assignData.assignedTo, assignData.scheduledAt);
      return {
        success: true,
        data: request,
        message: 'Maintenance request assigned successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Mark maintenance request as completed' })
  @ApiResponse({ status: 200, description: 'Maintenance request completed successfully' })
  async completeRequest(
    @Param('id') id: string,
    @Body() completionData: { cost?: number; notes?: string }
  ) {
    try {
      const request = await this.maintenanceService.completeRequest(id, completionData.cost, completionData.notes);
      return {
        success: true,
        data: request,
        message: 'Maintenance request completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete maintenance request' })
  @ApiResponse({ status: 200, description: 'Maintenance request deleted successfully' })
  async deleteRequest(@Param('id') id: string) {
    try {
      await this.maintenanceService.deleteRequest(id);
      return {
        success: true,
        message: 'Maintenance request deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }
}