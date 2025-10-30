import { Controller, Get, Post, Body, Param, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { GenerateMonthlyInvoicesDto } from './dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('billing')
@Controller('billing')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  @Get('monthly-stats')
  @ApiOperation({ summary: 'Get monthly billing statistics' })
  @ApiResponse({ status: 200, description: 'Monthly billing statistics retrieved successfully' })
  async getMonthlyStats(@GetHostelId() hostelId: string) {
    const stats = await this.billingService.getMonthlyStats(hostelId);

    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: 'Generate monthly invoices for all active students' })
  @ApiResponse({ status: 201, description: 'Monthly invoices generated successfully' })
  async generateMonthlyInvoices(@GetHostelId() hostelId: string, @Body() generateDto: GenerateMonthlyInvoicesDto) {
    const result = await this.billingService.generateMonthlyInvoices(
      generateDto.month,
      generateDto.year,
      generateDto.dueDate ? new Date(generateDto.dueDate) : undefined,
      hostelId
    );

    return {
      status: HttpStatus.CREATED,
      data: result
    };
  }

  @Get('schedule')
  @ApiOperation({ summary: 'Get billing schedule for upcoming months' })
  @ApiResponse({ status: 200, description: 'Billing schedule retrieved successfully' })
  async getBillingSchedule(@GetHostelId() hostelId: string, @Query('months') months: number = 6) {
    const schedule = await this.billingService.getBillingSchedule(months, hostelId);

    return {
      status: HttpStatus.OK,
      data: schedule
    };
  }

  @Get('preview/:month/:year')
  @ApiOperation({ summary: 'Preview billing for a specific month' })
  @ApiResponse({ status: 200, description: 'Billing preview retrieved successfully' })
  async previewBilling(
    @GetHostelId() hostelId: string,
    @Query('month') month: number,
    @Query('year') year: number
  ) {
    const preview = await this.billingService.previewMonthlyBilling(month, year, hostelId);

    return {
      status: HttpStatus.OK,
      data: preview
    };
  }

  @Get('students-ready')
  @ApiOperation({ summary: 'Get students ready for billing' })
  @ApiResponse({ status: 200, description: 'Students ready for billing retrieved successfully' })
  async getStudentsReadyForBilling(@GetHostelId() hostelId: string) {
    const students = await this.billingService.getStudentsReadyForBilling(hostelId);

    return {
      status: HttpStatus.OK,
      data: students
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get billing history' })
  @ApiResponse({ status: 200, description: 'Billing history retrieved successfully' })
  async getBillingHistory(
    @GetHostelId() hostelId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    const history = await this.billingService.getBillingHistory(page, limit, hostelId);

    return {
      status: HttpStatus.OK,
      data: history
    };
  }

  @Post('generate-nepalese-monthly')
  @ApiOperation({ summary: 'Generate monthly invoices using Nepalese billing system' })
  @ApiResponse({ status: 201, description: 'Nepalese monthly invoices generated successfully' })
  async generateNepalesesMonthlyInvoices(@GetHostelId() hostelId: string, @Body() generateDto: GenerateMonthlyInvoicesDto) {
    // 🔧 FIX: Use the existing billing service which has proper dependency injection
    // Instead of manually creating NepalesesBillingService, delegate to the main billing service
    const result = await this.billingService.generateNepalesesMonthlyInvoices(
      generateDto.month,
      generateDto.year,
      generateDto.dueDate ? new Date(generateDto.dueDate) : undefined,
      hostelId
    );

    return {
      status: HttpStatus.CREATED,
      data: result
    };
  }

  @Get('payment-due-students')
  @ApiOperation({ summary: 'Get students with payments due (Nepalese billing)' })
  @ApiResponse({ status: 200, description: 'Payment due students retrieved successfully' })
  async getPaymentDueStudents(@GetHostelId() hostelId: string) {
    // 🔧 FIX: Use the main billing service which has proper dependency injection
    const students = await this.billingService.getPaymentDueStudents(hostelId);

    return {
      status: HttpStatus.OK,
      data: students
    };
  }

  @Get('invoices/:monthKey')
  @ApiOperation({ summary: 'Get invoices by month for student-wise breakdown' })
  @ApiResponse({ status: 200, description: 'Monthly invoices retrieved successfully' })
  async getInvoicesByMonth(@Param('monthKey') monthKey: string, @GetHostelId() hostelId: string) {
    try {
      console.log(`🔍 Controller: Getting invoices for month ${monthKey}, hostelId: ${hostelId}`);
      const invoices = await this.billingService.getInvoicesByMonth(monthKey, hostelId);

      return {
        status: HttpStatus.OK,
        data: invoices
      };
    } catch (error) {
      console.error('Controller error in getInvoicesByMonth:', error);
      throw error;
    }
  }
}