import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payments with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments(@Query() query: any) {
    const result = await this.paymentsService.findAll(query);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Payment statistics retrieved successfully' })
  async getPaymentStats() {
    const stats = await this.paymentsService.getStats();
    
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods() {
    const methods = await this.paymentsService.getPaymentMethods();
    
    return {
      status: HttpStatus.OK,
      data: methods
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentById(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);
    
    return {
      status: HttpStatus.OK,
      data: payment
    };
  }

  @Post()
  @ApiOperation({ summary: 'Record new payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  async recordPayment(@Body(ValidationPipe) createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentsService.create(createPaymentDto);
    
    return {
      status: HttpStatus.CREATED,
      data: payment
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async updatePayment(@Param('id') id: string, @Body(ValidationPipe) updatePaymentDto: UpdatePaymentDto) {
    const payment = await this.paymentsService.update(id, updatePaymentDto);
    
    return {
      status: HttpStatus.OK,
      data: payment
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment' })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  async deletePayment(@Param('id') id: string) {
    const result = await this.paymentsService.remove(id);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get payments for a specific student' })
  @ApiResponse({ status: 200, description: 'Student payments retrieved successfully' })
  async getStudentPayments(@Param('studentId') studentId: string) {
    const payments = await this.paymentsService.findByStudentId(studentId);
    
    return {
      status: HttpStatus.OK,
      data: payments
    };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Record multiple payments' })
  @ApiResponse({ status: 201, description: 'Bulk payments recorded successfully' })
  async recordBulkPayments(@Body(ValidationPipe) bulkPaymentDto: any) {
    const result = await this.paymentsService.createBulk(bulkPaymentDto);
    
    return {
      status: HttpStatus.CREATED,
      data: result
    };
  }

  @Get('summary/monthly')
  @ApiOperation({ summary: 'Get monthly payment summary' })
  @ApiResponse({ status: 200, description: 'Monthly payment summary retrieved successfully' })
  async getMonthlyPaymentSummary(@Query('months') months: number = 12) {
    const summary = await this.paymentsService.getMonthlyPaymentSummary(months);
    
    return {
      status: HttpStatus.OK,
      data: summary
    };
  }
}