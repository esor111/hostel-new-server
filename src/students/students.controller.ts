import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, ValidationPipe, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  SearchStudentDto,
  CheckoutStudentDto,
  BulkUpdateStudentDto,
  SwitchBedDto,
  CreateManualStudentDto
} from './dto';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('students')
@Controller('students')
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly hostelService: HostelService
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all students' })
  @ApiResponse({ status: 200, description: 'List of students retrieved successfully' })
  async getAllStudents(@Query() query: any, @GetHostelId() hostelId: string) {
    const result = await this.studentsService.findAll(query, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('pending-configuration')
  @ApiOperation({ summary: 'Get students pending configuration' })
  @ApiResponse({ status: 200, description: 'Pending configuration students retrieved successfully' })
  async getPendingConfigurationStudents(@GetHostelId() hostelId: string) {
    const result = await this.studentsService.getPendingConfigurationStudents(hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiResponse({ status: 200, description: 'Student statistics retrieved successfully' })
  async getStudentStats(@GetHostelId() hostelId: string) {
    const stats = await this.studentsService.getStats(hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: stats
    };
  }

  @Get('billing-timeline')
  @ApiOperation({ summary: 'Get configuration billing timeline with pagination' })
  @ApiResponse({ status: 200, description: 'Billing timeline retrieved successfully with pagination' })
  async getBillingTimeline(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @GetHostelId() hostelId?: string
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    
    const result = await this.studentsService.getConfigurationBillingTimelinePaginated(
      pageNum,
      limitNum,
      hostelId
    );

    // Return with pagination info
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('billing-timeline/legacy')
  @ApiOperation({ summary: 'Get configuration billing timeline (legacy - no pagination)' })
  @ApiResponse({ status: 200, description: 'Billing timeline retrieved successfully' })
  async getBillingTimelineLegacy(@GetHostelId() hostelId: string) {
    const result = await this.studentsService.getConfigurationBillingTimeline(hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudentById(@Param('id') id: string, @GetHostelId() hostelId: string) {
    const student = await this.studentsService.findOne(id, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: student
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async createStudent(@Body(ValidationPipe) createStudentDto: CreateStudentDto, @GetHostelId() hostelId: string) {
    const student = await this.studentsService.create(createStudentDto, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: student
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update student' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  async updateStudent(@Param('id') id: string, @Body(ValidationPipe) updateStudentDto: UpdateStudentDto, @GetHostelId() hostelId: string) {
    const student = await this.studentsService.update(id, updateStudentDto, hostelId);

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

  @Get(':id/checkout-preview')
  @ApiOperation({ summary: 'Get checkout preview for student' })
  @ApiResponse({ status: 200, description: 'Checkout preview retrieved successfully' })
  async getCheckoutPreview(@Param('id') id: string, @GetHostelId() hostelId: string) {
    const result = await this.studentsService.getCheckoutPreview(id, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/checkout')
  @ApiOperation({ summary: 'Process student checkout' })
  @ApiResponse({ status: 200, description: 'Checkout processed successfully' })
  async processCheckout(@Param('id') id: string, @Body(ValidationPipe) checkoutDetails: CheckoutStudentDto, @GetHostelId() hostelId: string) {
    const result = await this.studentsService.processCheckout(id, checkoutDetails, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post(':id/switch-bed')
  @ApiOperation({ summary: 'Switch student to a different bed with full financial integrity' })
  @ApiResponse({ status: 200, description: 'Bed switch completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bed switch request or validation failed' })
  @ApiResponse({ status: 404, description: 'Student or bed not found' })
  async switchBed(
    @Param('id') id: string,
    @Body(ValidationPipe) switchBedDto: SwitchBedDto,
    @GetHostelId() hostelId: string
  ) {
    const result = await this.studentsService.switchBed(id, switchBedDto, hostelId);

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
  async bulkUpdateStudents(@Body(ValidationPipe) bulkUpdateDto: BulkUpdateStudentDto, @GetHostelId() hostelId: string) {
    const result = await this.studentsService.bulkUpdate(bulkUpdateDto, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete student' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  async deleteStudent(@Param('id') id: string, @GetHostelId() hostelId: string) {
    const result = await this.studentsService.remove(id, hostelId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get('my-profile')
  @ApiOperation({ summary: 'Get current user\'s student profile and financial data' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMyProfile(@CurrentUser() user: JwtPayload, @GetHostelId() hostelId: string) {
    try {
      const financialData = await this.studentsService.getUserFinancialData(user.id, hostelId);

      return {
        status: HttpStatus.OK,
        data: financialData
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        // User doesn't have a student record yet - this is the auto-creation opportunity
        const userData = {
          name: `User ${user.id}`,
          email: `${user.id}@temp.com`,
          phone: `+977${Math.random().toString().substr(2, 10)}`
        };

        const newStudent = await this.studentsService.createOrLinkStudentForUser(user.id, userData, hostelId);

        return {
          status: HttpStatus.CREATED,
          data: {
            student: newStudent,
            ledger: { studentId: newStudent.id, entries: [], summary: {} },
            discounts: { studentId: newStudent.id, discounts: [], summary: {} },
            adminCharges: { studentId: newStudent.id, charges: [], summary: {} },
            mapping: { userId: user.id, studentId: newStudent.id, hostelId }
          }
        };
      }
      throw error;
    }
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get student profile by user ID (admin use)' })
  @ApiResponse({ status: 200, description: 'Student profile retrieved successfully' })
  async getStudentByUserId(@Param('userId') userId: string, @GetHostelId() hostelId: string) {
    const student = await this.studentsService.findByUserId(userId, hostelId);

    if (!student) {
      throw new NotFoundException(`No student record found for user ${userId}`);
    }

    return {
      status: HttpStatus.OK,
      data: student
    };
  }

  @Post(':id/configure')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiOperation({ summary: 'Configure student charges with advance payment (Admin)' })
  @ApiResponse({ status: 200, description: 'Student configured successfully with advance payment' })
  async configureStudentById(
    @Param('id') studentId: string,
    @GetHostelId() hostelId: string,
    @CurrentUser() adminUser: JwtPayload,
    @Body(ValidationPipe) configData: any
  ) {
    console.error(`🚨🚨🚨 CONFIGURE STUDENT ENDPOINT HIT - ID: ${studentId} 🚨🚨🚨`);
    console.log(`🎯 CONTROLLER: configureStudentById called - studentId: ${studentId}`);
    console.log(`🎯 CONTROLLER: hostelId: ${hostelId}`);
    console.log(`🎯 CONTROLLER: adminUser:`, adminUser ? { id: adminUser.id, businessId: adminUser.businessId } : 'NULL');
    
    // Configure student with provided IDs and admin JWT for notifications
    const result = await this.studentsService.configureStudent(studentId, configData, hostelId, adminUser);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Configure student charges with advance payment (uses Business Token)' })
  @ApiResponse({ status: 200, description: 'Student configured successfully with advance payment' })
  async configureStudent(
    @CurrentUser() user: JwtPayload,
    @Body(ValidationPipe) configData: any
  ) {
    // Validate Business Token
    if (!user.businessId) {
      throw new NotFoundException(
        'Business token required. Please switch to hostel profile before configuring.'
      );
    }

    // Step 1: Find hostelId from businessId
    const hostel = await this.hostelService.findByBusinessId(user.businessId);
    if (!hostel) {
      throw new NotFoundException(
        `Hostel not found for businessId: ${user.businessId}`
      );
    }

    // Step 2: Find studentId from userId + hostelId
    const student = await this.studentsService.findByUserId(user.id, hostel.id);
    if (!student) {
      throw new NotFoundException(
        `No student found for user ${user.kahaId} in this hostel. Please contact admin.`
      );
    }

    // Step 3: Configure student with resolved IDs and user JWT for notifications
    const result = await this.studentsService.configureStudent(student.id, configData, hostel.id, user);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result
    };
  }

  @Get(':id/payment-status')
  @ApiOperation({ summary: 'Get student payment status (Nepalese billing)' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async getPaymentStatus(@Param('id') id: string, @GetHostelId() hostelId: string) {
    const paymentStatus = await this.studentsService.getPaymentStatus(id, hostelId);

    return {
      status: HttpStatus.OK,
      data: paymentStatus
    };
  }

  @Post(':id/calculate-settlement')
  @ApiOperation({ summary: 'Calculate checkout settlement (Nepalese billing)' })
  @ApiResponse({ status: 200, description: 'Settlement calculated successfully' })
  async calculateSettlement(
    @Param('id') id: string, 
    @Body() body: { checkoutDate: string }, 
    @GetHostelId() hostelId: string
  ) {
    const settlement = await this.studentsService.calculateCheckoutSettlement(id, body.checkoutDate, hostelId);

    return {
      status: HttpStatus.OK,
      data: settlement
    };
  }

  // ==================== MANUAL STUDENT CREATION ENDPOINTS ====================

  @Get('manual-create/floors')
  @ApiOperation({ summary: 'Get available floors for manual student creation' })
  @ApiResponse({ status: 200, description: 'Available floors retrieved successfully' })
  async getAvailableFloors(@GetHostelId() hostelId: string) {
    const floors = await this.studentsService.getAvailableFloors(hostelId);

    return {
      status: HttpStatus.OK,
      data: floors
    };
  }

  @Get('manual-create/floors/:floor/rooms')
  @ApiOperation({ summary: 'Get available rooms on specific floor' })
  @ApiResponse({ status: 200, description: 'Available rooms retrieved successfully' })
  async getAvailableRoomsOnFloor(
    @Param('floor') floor: string,
    @GetHostelId() hostelId: string
  ) {
    const floorNumber = parseInt(floor);
    if (isNaN(floorNumber)) {
      throw new BadRequestException('Invalid floor number');
    }

    const rooms = await this.studentsService.getAvailableRoomsOnFloor(hostelId, floorNumber);

    return {
      status: HttpStatus.OK,
      data: rooms
    };
  }

  @Get('manual-create/rooms/:roomId/beds')
  @ApiOperation({ summary: 'Get available beds in specific room' })
  @ApiResponse({ status: 200, description: 'Available beds retrieved successfully' })
  async getAvailableBedsInRoom(
    @Param('roomId') roomId: string,
    @GetHostelId() hostelId: string
  ) {
    const beds = await this.studentsService.getAvailableBedsInRoom(hostelId, roomId);

    return {
      status: HttpStatus.OK,
      data: beds
    };
  }

  @Post('manual-create')
  @ApiOperation({ summary: 'Create student manually with bed assignment' })
  @ApiResponse({ status: 201, description: 'Manual student created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or bed not available' })
  async createManualStudent(
    @Body(ValidationPipe) createManualStudentDto: CreateManualStudentDto,
    @GetHostelId() hostelId: string
  ) {
    const student = await this.studentsService.createManualStudent(createManualStudentDto, hostelId);

    return {
      status: HttpStatus.CREATED,
      data: student,
      message: 'Manual student created successfully. Student will appear in pending configuration list.'
    };
  }
}