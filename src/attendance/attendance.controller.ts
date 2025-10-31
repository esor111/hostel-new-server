import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto, AttendanceFiltersDto } from './dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Student checks in
   * POST /attendance/check-in
   */
  @Post('check-in')
  async checkIn(@Body() checkInDto: CheckInDto) {
    return this.attendanceService.checkIn(checkInDto);
  }

  /**
   * Student checks out
   * POST /attendance/check-out
   */
  @Post('check-out')
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
   * GET /attendance/current-status?hostelId=xxx
   */
  @Get('current-status')
  async getCurrentStatus(@Query('hostelId') hostelId: string) {
    if (!hostelId) {
      throw new Error('hostelId is required');
    }
    return this.attendanceService.getCurrentStatus(hostelId);
  }

  /**
   * Get daily attendance report
   * GET /attendance/reports/daily?hostelId=xxx&date=2025-10-31
   */
  @Get('reports/daily')
  async getDailyReport(
    @Query('hostelId') hostelId: string,
    @Query('date') date: string
  ) {
    if (!hostelId || !date) {
      throw new Error('hostelId and date are required');
    }
    return this.attendanceService.getDailyReport(hostelId, date);
  }

  /**
   * Get activity report (check-in/out movements)
   * GET /attendance/reports/activity?hostelId=xxx&dateFrom=xxx&dateTo=xxx
   */
  @Get('reports/activity')
  async getActivityReport(@Query() filters: AttendanceFiltersDto) {
    if (!filters.hostelId) {
      throw new Error('hostelId is required');
    }
    return this.attendanceService.getActivityReport(filters.hostelId, filters);
  }

  /**
   * Get summary report for date range
   * GET /attendance/reports/summary?hostelId=xxx&dateFrom=xxx&dateTo=xxx
   */
  @Get('reports/summary')
  async getSummaryReport(
    @Query('hostelId') hostelId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string
  ) {
    if (!hostelId || !dateFrom || !dateTo) {
      throw new Error('hostelId, dateFrom, and dateTo are required');
    }
    return this.attendanceService.getSummaryReport(hostelId, dateFrom, dateTo);
  }

  /**
   * TEST: Create initial check-in
   * POST /attendance/test/initial-checkin
   */
  @Post('test/initial-checkin')
  async testInitialCheckIn(@Body() body: { studentId: string; hostelId: string }) {
    return this.attendanceService.createInitialCheckIn(body.studentId, body.hostelId);
  }
}
