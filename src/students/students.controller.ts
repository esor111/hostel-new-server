import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { 
  CreateStudentDto, 
  UpdateStudentDto, 
  SearchStudentDto, 
  CheckoutStudentDto, 
  BulkUpdateStudentDto 
} from './dto';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'List of students retrieved successfully' })
  async getAllStudents(@Query() query: any) {
    const result = await this.studentsService.findAll(query);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiResponse({ status: 200, description: 'Student statistics retrieved successfully' })
  async getStudentStats() {
    const stats = await this.studentsService.getStats();
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentById(@Param('id') id: string) {
    const student = await this.studentsService.findOne(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: student
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async createStudent(@Body(ValidationPipe) createStudentDto: CreateStudentDto) {
    const student = await this.studentsService.create(createStudentDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: student
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update student' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  async updateStudent(@Param('id') id: string, @Body(ValidationPipe) updateStudentDto: UpdateStudentDto) {
    const student = await this.studentsService.update(id, updateStudentDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: student
    };
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get student balance' })
  @ApiResponse({ status: 200, description: 'Student balance retrieved successfully' })
  async getStudentBalance(@Param('id') id: string) {
    const balance = await this.studentsService.getStudentBalance(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: balance
    };
  }

  @Get(':id/ledger')
  @ApiOperation({ summary: 'Get student ledger entries' })
  @ApiResponse({ status: 200, description: 'Student ledger retrieved successfully' })
  async getStudentLedger(@Param('id') id: string) {
    const ledger = await this.studentsService.getStudentLedger(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: ledger
    };
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get student payments' })
  @ApiResponse({ status: 200, description: 'Student payments retrieved successfully' })
  async getStudentPayments(@Param('id') id: string) {
    const payments = await this.studentsService.getStudentPayments(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: payments
    };
  }

  @Get(':id/invoices')
  @ApiOperation({ summary: 'Get student invoices' })
  @ApiResponse({ status: 200, description: 'Student invoices retrieved successfully' })
  async getStudentInvoices(@Param('id') id: string) {
    const invoices = await this.studentsService.getStudentInvoices(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: invoices
    };
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Process student checkout' })
  @ApiResponse({ status: 200, description: 'Checkout processed successfully' })
  async processCheckout(@Param('id') id: string, @Body(ValidationPipe) checkoutDetails: CheckoutStudentDto) {
    const result = await this.studentsService.processCheckout(id, checkoutDetails);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post('search')
  @ApiOperation({ summary: 'Advanced search for students' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchStudents(@Body(ValidationPipe) searchDto: SearchStudentDto) {
    const result = await this.studentsService.advancedSearch(searchDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Put('bulk')
  @ApiOperation({ summary: 'Bulk update students' })
  @ApiResponse({ status: 200, description: 'Students updated successfully' })
  async bulkUpdateStudents(@Body(ValidationPipe) bulkUpdateDto: BulkUpdateStudentDto) {
    const result = await this.studentsService.bulkUpdate(bulkUpdateDto);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  async deleteStudent(@Param('id') id: string) {
    const result = await this.studentsService.remove(id);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/configure')
  @ApiOperation({ summary: 'Configure student charges' })
  @ApiResponse({ status: 200, description: 'Student configured successfully' })
  async configureStudent(@Param('id') id: string, @Body(ValidationPipe) configData: any) {
    const result = await this.studentsService.configureStudent(id, configData);
    
    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }
}