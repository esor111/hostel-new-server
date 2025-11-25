import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { SendToStudentsDto } from './dto/send-to-students.dto';
import { SendToFloorsDto } from './dto/send-to-floors.dto';
import { FloorStatsResponseDto } from './dto/floor-stats.dto';
import { UnifiedNotificationService } from './unified-notification.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Student, StudentStatus } from '../students/entities/student.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notificationServerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly unifiedNotificationService: UnifiedNotificationService,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {
    this.notificationServerUrl = this.configService.get<string>(
      'NOTIFICATION_SERVER_URL',
      'dev.kaha.com.np',
    );
    this.logger.log(`Notification server URL: ${this.notificationServerUrl}`);
  }

  /**
   * Send notification to multiple students using unified approach
   * NEW: Uses the same pattern as configuration notifications
   */
  async sendToStudentsUnified(dto: SendToStudentsDto, adminJwt: JwtPayload, hostelContext?: any): Promise<any> {
    this.logger.log(
      `🔔 Sending UNIFIED bulk notification to ${dto.studentIds.length} students: "${dto.title}"`,
    );

    try {
      const result = await this.unifiedNotificationService.sendBulkNotification({
        studentIds: dto.studentIds,
        title: dto.title,
        message: dto.message,
        type: 'BULK_MESSAGE',
        imageUrl: dto.imageUrl,
        metadata: {
          source: 'admin_bulk_message',
          timestamp: new Date().toISOString()
        }
      }, adminJwt, hostelContext);

      this.logger.log(`✅ Unified bulk notification completed: ${JSON.stringify(result)}`);
      return {
        success: true,
        ...result
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send unified bulk notification: ${error.message}`, error.stack);
      throw new HttpException(
        {
          message: 'Failed to send notification',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send notification to multiple students (LEGACY)
   * This calls the Express notification server which handles:
   * - Getting userIds from studentIds
   * - Getting FCM tokens
   * - Sending to Firebase
   * 
   * NOTE: Consider using sendToStudentsUnified instead for consistency
   */
  async sendToStudents(dto: SendToStudentsDto): Promise<any> {
    this.logger.log(
      `Sending notification to ${dto.studentIds.length} students: "${dto.title}"`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.notificationServerUrl}/notifications/send-to-students`,
          {
            studentIds: dto.studentIds,
            title: dto.title,
            message: dto.message,
            imageUrl: dto.imageUrl || '',
          },
          {
            timeout: 10000, // 10 second timeout
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(
        `Notification sent successfully. Response: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${error.message}`,
        error.stack,
      );

      // Handle different error scenarios
      if (error.response) {
        // Express server responded with error
        throw new HttpException(
          {
            message: 'Failed to send notification',
            details: error.response.data,
          },
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } else if (error.code === 'ECONNREFUSED') {
        // Express server not running
        throw new HttpException(
          {
            message: 'Notification server is not available',
            details: 'Please ensure the notification server is running',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        // Other errors
        throw new HttpException(
          {
            message: 'Failed to send notification',
            details: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   * Get floor statistics for a hostel
   * Returns list of floors with student counts (only floors that exist in this hostel)
   */
  async getFloorStats(hostelId: string): Promise<FloorStatsResponseDto> {
    this.logger.log(`📊 Getting floor statistics for hostel: ${hostelId}`);

    try {
      // Query floors with student and room counts
      const floorStats = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoin('student.room', 'room')
        .select('room.floor', 'floor')
        .addSelect('COUNT(DISTINCT student.id)', 'studentCount')
        .addSelect('COUNT(DISTINCT room.id)', 'roomCount')
        .where('student.hostelId = :hostelId', { hostelId })
        .andWhere('student.status = :status', { status: StudentStatus.ACTIVE })
        .andWhere('student.roomId IS NOT NULL')
        .andWhere('room.floor IS NOT NULL')
        .groupBy('room.floor')
        .orderBy('room.floor', 'ASC')
        .getRawMany();

      const floors = floorStats.map(stat => ({
        floor: parseInt(stat.floor),
        studentCount: parseInt(stat.studentCount),
        roomCount: parseInt(stat.roomCount)
      }));

      const totalStudents = floors.reduce((sum, floor) => sum + floor.studentCount, 0);

      this.logger.log(`✅ Found ${floors.length} floors with ${totalStudents} total students`);

      return {
        floors,
        totalStudents
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get floor statistics: ${error.message}`, error.stack);
      throw new HttpException(
        {
          message: 'Failed to get floor statistics',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send notification to students on specific floors
   * Queries students by floor numbers and sends bulk notification
   */
  async sendToFloors(dto: SendToFloorsDto, adminJwt: JwtPayload, hostelContext?: any): Promise<any> {
    this.logger.log(
      `🔔 Sending floor-wise notification to floors ${dto.floors.join(', ')}: "${dto.title}"`,
    );

    try {
      // Get students on the specified floors
      const students = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoin('student.room', 'room')
        .select(['student.id', 'student.userId', 'student.name'])
        .where('room.floor IN (:...floors)', { floors: dto.floors })
        .andWhere('student.roomId IS NOT NULL')
        .andWhere('student.status = :status', { status: StudentStatus.ACTIVE })
        .andWhere('student.hostelId = :hostelId', { hostelId: hostelContext?.hostelId || adminJwt.businessId })
        .getMany();

      if (students.length === 0) {
        this.logger.warn(`⚠️ No active students found on floors: ${dto.floors.join(', ')}`);
        return {
          success: true,
          sent: 0,
          failed: 0,
          skipped: 0,
          message: 'No active students found on the selected floors',
          details: {
            floors: dto.floors,
            studentsFound: 0
          }
        };
      }

      this.logger.log(`📤 Found ${students.length} students on floors ${dto.floors.join(', ')}`);

      // Extract student IDs for bulk notification
      const studentIds = students.map(s => s.id);

      // Use existing bulk notification service
      const result = await this.unifiedNotificationService.sendBulkNotification({
        studentIds,
        title: dto.title,
        message: dto.message,
        type: 'BULK_MESSAGE',
        imageUrl: dto.imageUrl,
        metadata: {
          source: 'floor_wise_notification',
          floors: dto.floors,
          timestamp: new Date().toISOString()
        }
      }, adminJwt, hostelContext);

      this.logger.log(`✅ Floor-wise notification completed: ${JSON.stringify(result)}`);

      return {
        success: true,
        ...result,
        floors: dto.floors,
        studentsFound: students.length
      };
    } catch (error) {
      this.logger.error(`❌ Failed to send floor-wise notification: ${error.message}`, error.stack);
      throw new HttpException(
        {
          message: 'Failed to send floor-wise notification',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
