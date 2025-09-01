import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics data' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics retrieved successfully' })
  async getDashboardData() {
    const data = await this.analyticsService.getDashboardData();
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Get monthly revenue data' })
  @ApiResponse({ status: 200, description: 'Monthly revenue data retrieved successfully' })
  async getMonthlyRevenue() {
    const data = await this.analyticsService.getMonthlyRevenue();
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }

  @Get('performance-metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    const data = await this.analyticsService.getPerformanceMetrics();
    
    return {
      status: HttpStatus.OK,
      data: data
    };
  }
}