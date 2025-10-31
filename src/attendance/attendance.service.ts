import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  StudentAttendance, 
  AttendanceType 
} from './entities/student-attendance.entity';
import { 
  StudentCheckInOut, 
  CheckInOutStatus, 
  CheckInOutType 
} from './entities/student-checkin-checkout.entity';
import { Student, StudentStatus } from '../students/entities/student.entity';
import { CheckInDto, CheckOutDto, AttendanceFiltersDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(StudentAttendance)
    private attendanceRepository: Repository<StudentAttendance>,
    
    @InjectRepository(StudentCheckInOut)
    private checkInOutRepository: Repository<StudentCheckInOut>,
    
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  /**
   * Student checks in
   */
  async checkIn(checkInDto: CheckInDto) {
    const { studentId, hostelId, notes } = checkInDto;

    // Validation 1: Student must exist
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validation 2: Student must be configured
    if (!student.isConfigured || student.status === StudentStatus.PENDING_CONFIGURATION) {
      throw new BadRequestException('Student must be configured before checking in');
    }

    // Validation 3: Student must NOT be currently checked in
    const activeCheckIn = await this.checkInOutRepository.findOne({
      where: {
        studentId,
        status: CheckInOutStatus.CHECKED_IN,
        checkOutTime: null as any
      }
    });

    if (activeCheckIn) {
      throw new BadRequestException('Student is already checked in. Please check out first.');
    }

    // Get current date and time in Nepal timezone
    const now = new Date();
    const todayDate = this.formatDate(now);
    const currentTime = this.formatTime(now);

    // Check if attendance exists for today
    const existingAttendance = await this.attendanceRepository.findOne({
      where: {
        studentId,
        hostelId,
        date: todayDate
      }
    });

    const isFirstOfDay = !existingAttendance;

    // Create attendance record if first check-in of the day
    if (isFirstOfDay) {
      await this.attendanceRepository.save({
        studentId,
        hostelId,
        date: todayDate,
        firstCheckInTime: currentTime,
        type: AttendanceType.MANUAL,
        notes
      });
    }

    // Create check-in/out record
    const checkInRecord = await this.checkInOutRepository.save({
      studentId,
      hostelId,
      checkInTime: now,
      checkOutTime: null,
      status: CheckInOutStatus.CHECKED_IN,
      type: CheckInOutType.MANUAL,
      notes
    });

    return {
      success: true,
      message: 'Checked in successfully',
      attendance: {
        date: todayDate,
        firstCheckInTime: isFirstOfDay ? currentTime : existingAttendance.firstCheckInTime,
        isFirstOfDay
      },
      checkIn: {
        id: checkInRecord.id,
        checkInTime: checkInRecord.checkInTime,
        status: checkInRecord.status
      }
    };
  }

  /**
   * Student checks out
   */
  async checkOut(checkOutDto: CheckOutDto) {
    const { studentId, hostelId, notes } = checkOutDto;

    // Validation 1: Student must exist
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Validation 2: Student must be currently checked in
    const activeCheckIn = await this.checkInOutRepository.findOne({
      where: {
        studentId,
        status: CheckInOutStatus.CHECKED_IN,
        checkOutTime: null as any
      },
      order: { checkInTime: 'DESC' }
    });

    if (!activeCheckIn) {
      throw new BadRequestException('Student is not currently checked in. Cannot check out.');
    }

    // Update check-out time
    const now = new Date();
    activeCheckIn.checkOutTime = now;
    activeCheckIn.status = CheckInOutStatus.CHECKED_OUT;
    if (notes) {
      activeCheckIn.notes = notes;
    }

    await this.checkInOutRepository.save(activeCheckIn);

    // Calculate duration
    const duration = this.calculateDuration(activeCheckIn.checkInTime, now);

    return {
      success: true,
      message: 'Checked out successfully',
      checkOut: {
        id: activeCheckIn.id,
        checkInTime: activeCheckIn.checkInTime,
        checkOutTime: activeCheckIn.checkOutTime,
        duration,
        status: activeCheckIn.status
      }
    };
  }

  /**
   * Get student's own attendance history
   */
  async getMyHistory(studentId: string, hostelId: string, filters?: AttendanceFiltersDto) {
    const { dateFrom, dateTo, page = 1, limit = 50 } = filters || {};

    // Build query for attendance records
    const attendanceQuery = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.studentId = :studentId', { studentId })
      .andWhere('attendance.hostelId = :hostelId', { hostelId });

    if (dateFrom) {
      attendanceQuery.andWhere('attendance.date >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      attendanceQuery.andWhere('attendance.date <= :dateTo', { dateTo });
    }

    const attendanceRecords = await attendanceQuery
      .orderBy('attendance.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get check-in/out sessions for each date
    const history = await Promise.all(
      attendanceRecords.map(async (attendance) => {
        const sessions = await this.checkInOutRepository.find({
          where: {
            studentId,
            hostelId
          },
          order: { checkInTime: 'ASC' }
        });

        // Filter sessions for this date
        const dateSessions = sessions.filter(session => {
          const sessionDate = this.formatDate(new Date(session.checkInTime));
          return sessionDate === attendance.date;
        });

        // Calculate total duration for the day
        const totalDuration = dateSessions.reduce((total, session) => {
          if (session.checkOutTime) {
            const duration = new Date(session.checkOutTime).getTime() - new Date(session.checkInTime).getTime();
            return total + duration;
          }
          return total;
        }, 0);

        return {
          date: attendance.date,
          firstCheckInTime: attendance.firstCheckInTime,
          wasPresent: true,
          checkInOutSessions: dateSessions.map(session => ({
            checkInTime: session.checkInTime,
            checkOutTime: session.checkOutTime,
            duration: session.checkOutTime ? this.calculateDuration(new Date(session.checkInTime), new Date(session.checkOutTime)) : 'In progress'
          })),
          totalDurationForDay: this.formatDuration(totalDuration)
        };
      })
    );

    // Get student info
    const student = await this.studentRepository.findOne({
      where: { id: studentId, hostelId }
    });

    return {
      studentId,
      studentName: student?.name || 'Unknown',
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalDaysPresent: attendanceRecords.length,
        totalCheckIns: history.reduce((sum, day) => sum + day.checkInOutSessions.length, 0)
      },
      attendance: history
    };
  }

  /**
   * Get current status - who's checked in right now
   */
  async getCurrentStatus(hostelId: string) {
    const activeCheckIns = await this.checkInOutRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.student', 'student')
      .where('checkin.hostelId = :hostelId', { hostelId })
      .andWhere('checkin.status = :status', { status: CheckInOutStatus.CHECKED_IN })
      .andWhere('checkin.checkOutTime IS NULL')
      .orderBy('checkin.checkInTime', 'DESC')
      .getMany();

    const now = new Date();
    const students = activeCheckIns.map(checkin => ({
      studentId: checkin.studentId,
      studentName: checkin.student?.name || 'Unknown',
      checkInTime: checkin.checkInTime,
      durationSoFar: this.calculateDuration(new Date(checkin.checkInTime), now)
    }));

    return {
      hostelId,
      timestamp: now,
      currentlyCheckedIn: students.length,
      students
    };
  }

  /**
   * Get daily attendance report
   */
  async getDailyReport(hostelId: string, date: string) {
    const attendanceRecords = await this.attendanceRepository.find({
      where: { hostelId, date },
      relations: ['student']
    });

    const presentStudents = attendanceRecords.map(record => ({
      studentId: record.studentId,
      studentName: record.student?.name || 'Unknown',
      firstCheckInTime: record.firstCheckInTime
    }));

    // Get total students in hostel
    const totalStudents = await this.studentRepository.count({
      where: { hostelId, isConfigured: true }
    });

    return {
      hostelId,
      date,
      summary: {
        totalStudents,
        totalPresent: presentStudents.length,
        totalAbsent: totalStudents - presentStudents.length,
        attendanceRate: totalStudents > 0 ? `${((presentStudents.length / totalStudents) * 100).toFixed(1)}%` : '0%'
      },
      presentStudents
    };
  }

  /**
   * Get activity report (check-in/out movements)
   */
  async getActivityReport(hostelId: string, filters: AttendanceFiltersDto) {
    const { dateFrom, dateTo, studentId, page = 1, limit = 50 } = filters;

    const query = this.checkInOutRepository
      .createQueryBuilder('checkin')
      .leftJoinAndSelect('checkin.student', 'student')
      .where('checkin.hostelId = :hostelId', { hostelId });

    if (dateFrom) {
      query.andWhere('checkin.checkInTime >= :dateFrom', { dateFrom: `${dateFrom} 00:00:00` });
    }
    if (dateTo) {
      query.andWhere('checkin.checkInTime <= :dateTo', { dateTo: `${dateTo} 23:59:59` });
    }
    if (studentId) {
      query.andWhere('checkin.studentId = :studentId', { studentId });
    }

    const [records, total] = await query
      .orderBy('checkin.checkInTime', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Group by student
    const studentMap = new Map();
    records.forEach(record => {
      if (!studentMap.has(record.studentId)) {
        studentMap.set(record.studentId, {
          studentId: record.studentId,
          studentName: record.student?.name || 'Unknown',
          sessions: []
        });
      }
      studentMap.get(record.studentId).sessions.push({
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        duration: record.checkOutTime ? this.calculateDuration(new Date(record.checkInTime), new Date(record.checkOutTime)) : 'In progress'
      });
    });

    return {
      hostelId,
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalCheckIns: total,
        totalCheckOuts: records.filter(r => r.checkOutTime).length,
        currentlyCheckedIn: records.filter(r => !r.checkOutTime).length
      },
      activities: Array.from(studentMap.values()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get summary report for date range
   */
  async getSummaryReport(hostelId: string, dateFrom: string, dateTo: string) {
    const attendanceRecords = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.hostelId = :hostelId', { hostelId })
      .andWhere('attendance.date >= :dateFrom', { dateFrom })
      .andWhere('attendance.date <= :dateTo', { dateTo })
      .getMany();

    const checkInRecords = await this.checkInOutRepository
      .createQueryBuilder('checkin')
      .where('checkin.hostelId = :hostelId', { hostelId })
      .andWhere('checkin.checkInTime >= :dateFrom', { dateFrom: `${dateFrom} 00:00:00` })
      .andWhere('checkin.checkInTime <= :dateTo', { dateTo: `${dateTo} 23:59:59` })
      .getMany();

    // Group by date
    const dailyBreakdown = new Map();
    attendanceRecords.forEach(record => {
      if (!dailyBreakdown.has(record.date)) {
        dailyBreakdown.set(record.date, { date: record.date, present: 0, checkIns: 0, checkOuts: 0 });
      }
      dailyBreakdown.get(record.date).present++;
    });

    checkInRecords.forEach(record => {
      const date = this.formatDate(new Date(record.checkInTime));
      if (!dailyBreakdown.has(date)) {
        dailyBreakdown.set(date, { date, present: 0, checkIns: 0, checkOuts: 0 });
      }
      dailyBreakdown.get(date).checkIns++;
      if (record.checkOutTime) {
        dailyBreakdown.get(date).checkOuts++;
      }
    });

    return {
      hostelId,
      dateRange: { from: dateFrom, to: dateTo },
      summary: {
        totalCheckIns: checkInRecords.length,
        totalCheckOuts: checkInRecords.filter(r => r.checkOutTime).length,
        averageCheckInsPerDay: checkInRecords.length / Math.max(1, dailyBreakdown.size)
      },
      dailyBreakdown: Array.from(dailyBreakdown.values()).sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  /**
   * Create initial check-in (called during student configuration)
   */
  async createInitialCheckIn(studentId: string, hostelId: string) {
    const now = new Date();
    const todayDate = this.formatDate(now);
    const currentTime = this.formatTime(now);

    // Create attendance record
    await this.attendanceRepository.save({
      studentId,
      hostelId,
      date: todayDate,
      firstCheckInTime: currentTime,
      type: AttendanceType.INITIAL,
      notes: 'Auto check-in during student configuration'
    });

    // Create check-in/out record
    await this.checkInOutRepository.save({
      studentId,
      hostelId,
      checkInTime: now,
      checkOutTime: null,
      status: CheckInOutStatus.CHECKED_IN,
      type: CheckInOutType.INITIAL,
      notes: 'Auto check-in during student configuration'
    });

    return {
      success: true,
      message: 'Initial check-in created successfully',
      date: todayDate,
      time: currentTime
    };
  }

  /**
   * Helper: Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Format time to HH:MM:SS
   */
  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Helper: Calculate duration between two dates
   */
  private calculateDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  /**
   * Helper: Format duration in milliseconds to readable string
   */
  private formatDuration(durationMs: number): string {
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}
