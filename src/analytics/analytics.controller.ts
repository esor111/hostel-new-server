import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  async getDashboardData(@GetHostelId() hostelId: string) {
    const data = await this.analyticsService.getDashboardData(hostelId);
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Get monthly revenue data' })
  @ApiResponse({ status: 200, description: 'Monthly revenue data retrieved successfully' })
  async getMonthlyRevenue(@GetHostelId() hostelId: string) {
    const data = await this.analyticsService.getMonthlyRevenue(hostelId);
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }

  @Get('performance-metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(@GetHostelId() hostelId: string) {
    const data = await this.analyticsService.getPerformanceMetrics(hostelId);
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }
}