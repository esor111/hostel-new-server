import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SendToStudentsDto } from './dto/send-to-students.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notificationServerUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServerUrl = this.configService.get<string>(
      'NOTIFICATION_SERVER_URL',
      'http://localhost:3007',
    );
    this.logger.log(`Notification server URL: ${this.notificationServerUrl}`);
  }

  /**
   * Send notification to multiple students
   * This calls the Express notification server which handles:
   * - Getting userIds from studentIds
   * - Getting FCM tokens
   * - Sending to Firebase
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
}
