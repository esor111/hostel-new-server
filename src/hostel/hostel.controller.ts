import { Controller, Get, Post, Put, Body, Param, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { HostelService, CreateHostelDto, SyncHostelDataDto } from './hostel.service';

@ApiTags('hostel')
@Controller('hostel')
export class HostelController {
  private readonly logger = new Logger(HostelController.name);

  constructor(private readonly hostelService: HostelService) {}

  @Get()
  @ApiOperation({ summary: 'Get all hostels' })
  @ApiResponse({ status: 200, description: 'Hostels retrieved successfully' })
  async getAllHostels() {
    try {
      const hostels = await this.hostelService.findAll();
      return {
        success: true,
        data: hostels,
        message: 'Hostels retrieved successfully'
      };
    } catch (error) {
      this.logger.error('Error getting all hostels:', error);
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Get(':businessId')
  @ApiOperation({ summary: 'Get hostel by businessId' })
  @ApiResponse({ status: 200, description: 'Hostel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Hostel not found' })
  async getHostelByBusinessId(@Param('businessId') businessId: string) {
    try {
      const hostel = await this.hostelService.findByBusinessId(businessId);
      if (!hostel) {
        return {
          success: false,
          message: 'Hostel not found',
          statusCode: HttpStatus.NOT_FOUND
        };
      }
      return {
        success: true,
        data: hostel,
        message: 'Hostel retrieved successfully'
      };
    } catch (error) {
      this.logger.error(`Error getting hostel by businessId ${businessId}:`, error);
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Post('register')
  @ApiOperation({ 
    summary: 'Register hostel (for kaha-main-v3 microservice)',
    description: 'Endpoint for kaha-main-v3 to call when hostels are created/updated'
  })
  @ApiResponse({ status: 201, description: 'Hostel registered successfully' })
  @ApiResponse({ status: 409, description: 'Hostel already exists' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessId: { type: 'string', description: 'Business ID from kaha-main-v3' },
        name: { type: 'string', description: 'Hostel name' },
        isActive: { type: 'boolean', description: 'Whether hostel is active', default: true }
      },
      required: ['businessId', 'name']
    }
  })
  async registerHostel(@Body() createHostelDto: CreateHostelDto) {
    try {
      this.logger.log(`Hostel registration request for businessId: ${createHostelDto.businessId}`);
      
      const hostel = await this.hostelService.createHostel(createHostelDto);
      
      this.logger.log(`Hostel registered successfully: ${hostel.name} (${hostel.businessId})`);
      
      return {
        success: true,
        data: hostel,
        message: 'Hostel registered successfully'
      };
    } catch (error) {
      this.logger.error(`Error registering hostel for businessId ${createHostelDto.businessId}:`, error);
      
      if (error.status === 409) {
        return {
          success: false,
          message: error.message,
          statusCode: HttpStatus.CONFLICT
        };
      }
      
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put('sync')
  @ApiOperation({ 
    summary: 'Sync hostel data (for kaha-main-v3 microservice)',
    description: 'Endpoint for kaha-main-v3 to sync hostel data (create or update)'
  })
  @ApiResponse({ status: 200, description: 'Hostel data synced successfully' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        businessId: { type: 'string', description: 'Business ID from kaha-main-v3' },
        name: { type: 'string', description: 'Hostel name' },
        isActive: { type: 'boolean', description: 'Whether hostel is active', default: true }
      },
      required: ['businessId', 'name']
    }
  })
  async syncHostelData(@Body() syncData: SyncHostelDataDto) {
    try {
      this.logger.log(`Hostel sync request for businessId: ${syncData.businessId}`);
      
      const hostel = await this.hostelService.syncHostelData(syncData);
      
      this.logger.log(`Hostel synced successfully: ${hostel.name} (${hostel.businessId})`);
      
      return {
        success: true,
        data: hostel,
        message: 'Hostel data synced successfully'
      };
    } catch (error) {
      this.logger.error(`Error syncing hostel data for businessId ${syncData.businessId}:`, error);
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear hostel cache (admin only)' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    try {
      this.hostelService.clearAllCache();
      return {
        success: true,
        message: 'Hostel cache cleared successfully'
      };
    } catch (error) {
      this.logger.error('Error clearing hostel cache:', error);
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }
}