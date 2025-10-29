import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from './dto/maintenance-request.dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('maintenance')
@Controller('maintenance')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
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
    @GetHostelId() hostelId: string,
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
      }, hostelId);
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
  async getStats(@GetHostelId() hostelId: string) {
    try {
      const stats = await this.maintenanceService.getStats(hostelId);
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
  async getRequestById(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      const request = await this.maintenanceService.getRequestById(id, hostelId);
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
  async createRequest(@GetHostelId() hostelId: string, @Body() createRequestDto: CreateMaintenanceRequestDto) {
    try {
      const request = await this.maintenanceService.createRequest(createRequestDto, hostelId);
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
    @GetHostelId() hostelId: string,
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateMaintenanceRequestDto
  ) {
    try {
      const request = await this.maintenanceService.updateRequest(id, updateRequestDto, hostelId);
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
    @GetHostelId() hostelId: string,
    @Param('id') id: string,
    @Body() assignData: { assignedTo: string; scheduledAt?: Date }
  ) {
    try {
      const request = await this.maintenanceService.assignRequest(id, assignData.assignedTo, assignData.scheduledAt, hostelId);
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
    @GetHostelId() hostelId: string,
    @Param('id') id: string,
    @Body() completionData: { cost?: number; notes?: string }
  ) {
    try {
      const request = await this.maintenanceService.completeRequest(id, completionData.cost, completionData.notes, hostelId);
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
  async deleteRequest(@GetHostelId() hostelId: string, @Param('id') id: string) {
    try {
      await this.maintenanceService.deleteRequest(id, hostelId);
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