import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, ValidationPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, UpdateInvoiceStatusDto, SendInvoiceDto } from './dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getAllInvoices(@GetHostelId() hostelId: string, @Query() query: any) {
    const result = await this.invoicesService.findAll(query, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get invoice statistics' })
  @ApiResponse({ status: 200, description: 'Invoice statistics retrieved successfully' })
  async getInvoiceStats(@GetHostelId() hostelId: string) {
    const stats = await this.invoicesService.getStats(hostelId);
    
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(@GetHostelId() hostelId: string, @Param('id') id: string) {
    const invoice = await this.invoicesService.findOne(id, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: invoice
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async createInvoice(@GetHostelId() hostelId: string, @Body(ValidationPipe) createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.invoicesService.create(createInvoiceDto, hostelId);
    
    return {
      status: HttpStatus.CREATED,
      data: invoice
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  async updateInvoice(@GetHostelId() hostelId: string, @Param('id') id: string, @Body(ValidationPipe) updateInvoiceDto: UpdateInvoiceDto) {
    const invoice = await this.invoicesService.update(id, updateInvoiceDto, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: invoice
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiResponse({ status: 200, description: 'Invoice deleted successfully' })
  async deleteInvoice(@GetHostelId() hostelId: string, @Param('id') id: string) {
    const result = await this.invoicesService.remove(id, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get invoices for a specific student' })
  @ApiResponse({ status: 200, description: 'Student invoices retrieved successfully' })
  async getStudentInvoices(@GetHostelId() hostelId: string, @Param('studentId') studentId: string) {
    const invoices = await this.invoicesService.findByStudentId(studentId, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: invoices
    };
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple invoices' })
  @ApiResponse({ status: 201, description: 'Bulk invoices created successfully' })
  async createBulkInvoices(@GetHostelId() hostelId: string, @Body(ValidationPipe) bulkInvoiceDto: any) {
    const result = await this.invoicesService.createBulk(bulkInvoiceDto, hostelId);
    
    return {
      status: HttpStatus.CREATED,
      data: result
    };
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiResponse({ status: 200, description: 'Invoice status updated successfully' })
  async updateInvoiceStatus(@GetHostelId() hostelId: string, @Param('id') id: string, @Body() statusDto: UpdateInvoiceStatusDto) {
    const result = await this.invoicesService.updateStatus(id, statusDto.status, statusDto.notes, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice to student' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  async sendInvoice(@GetHostelId() hostelId: string, @Param('id') id: string) {
    const result = await this.invoicesService.sendInvoice(id, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('overdue/list')
  @ApiOperation({ summary: 'Get overdue invoices' })
  @ApiResponse({ status: 200, description: 'Overdue invoices retrieved successfully' })
  async getOverdueInvoices(@GetHostelId() hostelId: string) {
    const invoices = await this.invoicesService.getOverdueInvoices(hostelId);
    
    return {
      status: HttpStatus.OK,
      data: invoices
    };
  }

  @Get('summary/monthly')
  @ApiOperation({ summary: 'Get monthly invoice summary' })
  @ApiResponse({ status: 200, description: 'Monthly invoice summary retrieved successfully' })
  async getMonthlyInvoiceSummary(@GetHostelId() hostelId: string, @Query('months') months: number = 12) {
    const summary = await this.invoicesService.getMonthlyInvoiceSummary(months, hostelId);
    
    return {
      status: HttpStatus.OK,
      data: summary
    };
  }
}