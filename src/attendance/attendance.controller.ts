import { Controller, Post, Get, Body, Query, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, StudentCheckInDto, StudentCheckOutDto, AttendanceFiltersDto } from './dto';
import { HostelAuthWithContextGuard } from '../auth/guards/hostel-auth-with-context.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetHostelId } from '../hostel/decorators/hostel-context.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { StudentsService } from '../students/students.service';
import { HostelService } from '../hostel/hostel.service';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly studentsService: StudentsService,
    private readonly hostelService: HostelService
  ) {}

  /**
   * STUDENT: Check in using Business Token (auto-resolves studentId and hostelId)
   * POST /attendance/student/check-in
   * Requires Business Token with userId and businessId - both IDs auto-resolved
   */
  @Post('student/check-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async studentCheckIn(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StudentCheckInDto
  ) {
    // Validate Business Token
    if (!user.businessId) {
      throw new BadRequestException(
        'Business token required. Please switch to hostel profile before checking in.'
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

    // Step 3: Check in using auto-resolved IDs
    return this.attendanceService.checkIn({
      studentId: student.id,
      hostelId: hostel.id,
      notes: dto.notes
    });
  }

  /**
   * ADMIN: Check in (requires studentId in body)
   * POST /attendance/check-in
   */
  @Post('check-in')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async checkIn(@Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkIn(checkInDto);
  }

  /**
   * STUDENT: Check out using Business Token (auto-resolves studentId and hostelId)
   * POST /attendance/student/check-out
   * Requires Business Token with userId and businessId - both IDs auto-resolved
   */
  @Post('student/check-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async studentCheckOut(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StudentCheckOutDto
  ) {
    // Validate Business Token
    if (!user.businessId) {
      throw new BadRequestException(
        'Business token required. Please switch to hostel profile before checking out.'
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

    // Step 3: Check out using auto-resolved IDs
    return this.attendanceService.checkOut({
      studentId: student.id,
      hostelId: hostel.id,
      notes: dto.notes
    });
  }

  /**
   * ADMIN: Check out (requires studentId in body)
   * POST /attendance/check-out
   */
  @Post('check-out')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async checkOut(@Body() checkOutDto: CheckOutDto) {
    return this.attendanceService.checkOut(checkOutDto);
  }

  /**
   * Get student's own attendance history
   * GET /attendance/my-history?studentId=xxx&hostelId=xxx&dateFrom=xxx&dateTo=xxx
   */
  @Get('my-history')
  async getMyHistory(@Query() filters: AttendanceFiltersDto) {
    const { studentId, hostelId } = filters;
    if (!studentId || !hostelId) {
      throw new Error('studentId and hostelId are required');
    }
    return this.attendanceService.getMyHistory(studentId, hostelId, filters);
  }

  /**
   * Get current status - who's checked in right now
   * GET /attendance/current-status?page=1&limit=20&search=John
   */
  @Get('current-status')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async getCurrentStatus(
    @GetHostelId() hostelId: string,
    @Query() filters: AttendanceFiltersDto
  ) {
    return this.attendanceService.getCurrentStatus(hostelId, filters);
  }

  /**
   * Get daily attendance report
   * GET /attendance/reports/daily?date=2025-10-31&page=1&limit=20&search=John
   */
  @Get('reports/daily')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async getDailyReport(
    @GetHostelId() hostelId: string,
    @Query('date') date: string,
    @Query() filters: AttendanceFiltersDto
  ) {
    if (!date) {
      throw new Error('date is required');
    }
    return this.attendanceService.getDailyReport(hostelId, date, filters);
  }

  /**
   * Get activity report (check-in/out movements)
   * GET /attendance/reports/activity?hostelId=xxx&dateFrom=xxx&dateTo=xxx
   */
  @Get('reports/activity')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async getActivityReport(
    @GetHostelId() hostelId: string,
    @Query() filters: AttendanceFiltersDto
  ) {
    return this.attendanceService.getActivityReport(hostelId, filters);
  }

  /**
   * Get summary report for date range
   * GET /attendance/reports/summary?hostelId=xxx&dateFrom=xxx&dateTo=xxx
   */
  @Get('reports/summary')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async getSummaryReport(
    @GetHostelId() hostelId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    if (!dateFrom || !dateTo) {
      throw new Error('dateFrom and dateTo are required');
    }
    return this.attendanceService.getSummaryReport(hostelId, dateFrom, dateTo);
  }

  /**
   * TEST: Create initial check-in
   * POST /attendance/test/initial-checkin
   */
  @Post('test/initial-checkin')
  @UseGuards(HostelAuthWithContextGuard)
  @ApiBearerAuth()
  async testInitialCheckIn(@Body() body: { studentId: string; hostelId: string }) {
    return this.attendanceService.createInitialCheckIn(body.studentId, body.hostelId);
  }
}