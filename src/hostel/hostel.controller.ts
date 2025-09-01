import { Controller, Get, Post, Put, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HostelService } from './hostel.service';
import { CreateHostelProfileDto, UpdateHostelProfileDto } from './dto/hostel-profile.dto';

@ApiTags('hostel')
@Controller('hostel')
export class HostelController {
  constructor(private readonly hostelService: HostelService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get hostel profile' })
  @ApiResponse({ status: 200, description: 'Hostel profile retrieved successfully' })
  async getProfile() {
    try {
      const profile = await this.hostelService.getProfile();
      return {
        success: true,
        data: profile,
        message: 'Hostel profile retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Post('profile')
  @ApiOperation({ summary: 'Create hostel profile' })
  @ApiResponse({ status: 201, description: 'Hostel profile created successfully' })
  async createProfile(@Body() createProfileDto: CreateHostelProfileDto) {
    try {
      const profile = await this.hostelService.createProfile(createProfileDto);
      return {
        success: true,
        data: profile,
        message: 'Hostel profile created successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update hostel profile' })
  @ApiResponse({ status: 200, description: 'Hostel profile updated successfully' })
  async updateProfile(@Body() updateProfileDto: UpdateHostelProfileDto) {
    try {
      const profile = await this.hostelService.updateProfile(updateProfileDto);
      return {
        success: true,
        data: profile,
        message: 'Hostel profile updated successfully'
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