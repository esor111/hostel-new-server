import { Controller, Get, Post, Body, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('monthly-stats')
  @ApiOperation({ summary: 'Get monthly billing statistics' })
  @ApiResponse({ status: 200, description: 'Monthly billing statistics retrieved successfully' })
  async getMonthlyStats() {
    const stats = await this.billingService.getMonthlyStats();
    
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: 'Generate monthly invoices for all active students' })
  @ApiResponse({ status: 201, description: 'Monthly invoices generated successfully' })
  async generateMonthlyInvoices(@Body() generateDto: any) {
    const result = await this.billingService.generateMonthlyInvoices(
      generateDto.month,
      generateDto.year,
      generateDto.dueDate
    );
    
    return {
      status: HttpStatus.CREATED,
      data: result
    };
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get billing schedule for upcoming months' })
  @ApiResponse({ status: 200, description: 'Billing schedule retrieved successfully' })
  async getBillingSchedule(@Query('months') months: number = 6) {
    const schedule = await this.billingService.getBillingSchedule(months);
    
    return {
      status: HttpStatus.OK,
      data: schedule
    };
  }

  @Get('preview/:month/:year')
  @ApiOperation({ summary: 'Preview billing for a specific month' })
  @ApiResponse({ status: 200, description: 'Billing preview retrieved successfully' })
  async previewBilling(
    @Query('month') month: number,
    @Query('year') year: number
  ) {
    const preview = await this.billingService.previewMonthlyBilling(month, year);
    
    return {
      status: HttpStatus.OK,
      data: preview
    };
  }

  @Get('students-ready')
  @ApiOperation({ summary: 'Get students ready for billing' })
  @ApiResponse({ status: 200, description: 'Students ready for billing retrieved successfully' })
  async getStudentsReadyForBilling() {
    const students = await this.billingService.getStudentsReadyForBilling();
    
    return {
      status: HttpStatus.OK,
      data: students
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get billing history' })
  @ApiResponse({ status: 200, description: 'Billing history retrieved successfully' })
  async getBillingHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const history = await this.billingService.getBillingHistory(page, limit);
    
    return {
      status: HttpStatus.OK,
      data: history
    };
  }
}