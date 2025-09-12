import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { 
  SendPushNotificationDto, 
  BookingNotificationDto 
} from './dto/send-notification.dto';
import { PushNotificationTypeEnum } from './enums/notification-types.enum';
import { 
  BOOKING_NOTIFICATION_MESSAGES, 
  formatNotificationMessage 
} from './templates/booking-notification-messages';

@Injectable()
export class NotificationCommunicationService {
  private readonly logger = new Logger(NotificationCommunicationService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Get notification service URL from environment or use default
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
      'https://api.kaha.com.np/notifications/api/v3'
    );
  }

  /**
   * Send structured push notification to notification microservice
   */
  async sendPushNotification(body: SendPushNotificationDto): Promise<void> {
    const baseUrl = `${this.notificationServiceUrl}/push-notifications/structured`;

    try {
      this.logger.log(`Sending notification: ${body.type} to users: ${body.receiverUserIds?.join(', ')}`);
      
      await firstValueFrom(this.httpService.post(baseUrl, body));
      
      this.logger.log(`Notification sent successfully: ${body.type}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${body.type}`, error.message);
      // Don't throw error to prevent blocking main business logic
    }
  }

  /**
   * Send booking request notification to admins
   */
  async sendBookingRequestNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_REQUEST];
    const { title, message } = formatNotificationMessage(template, {
      contactName: data.contactName,
      checkInDate: data.checkInDate,
      guestCount: data.guestCount || 1
    });

    const notification: SendPushNotificationDto = {
      receiverBusinessIds: [data.hostelId],
      title,
      message,
      type: PushNotificationTypeEnum.BOOKING_REQUEST,
      meta: {
        type: PushNotificationTypeEnum.BOOKING_REQUEST,
        business: {
          id: data.hostelId,
          linkId: ''
        },
        booking: {
          id: data.bookingId,
          checkInDate: data.checkInDate,
          guestCount: data.guestCount
        }
      }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send booking approval notification to contact person
   */
  async sendBookingApprovedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_APPROVED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      hostelName: data.hostelName
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId],
      title,
      message,
      type: PushNotificationTypeEnum.BOOKING_APPROVED,
      meta: {
        type: PushNotificationTypeEnum.BOOKING_APPROVED,
        user: {
          id: data.contactPersonId,
          linkId: ''
        },
        booking: {
          id: data.bookingId,
          checkInDate: data.checkInDate,
          guestCount: data.guestCount
        }
      }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send booking rejection notification to contact person
   */
  async sendBookingRejectedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_REJECTED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      reason: data.reason || 'No specific reason provided'
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId],
      title,
      message,
      type: PushNotificationTypeEnum.BOOKING_REJECTED,
      meta: {
        type: PushNotificationTypeEnum.BOOKING_REJECTED,
        user: {
          id: data.contactPersonId,
          linkId: ''
        },
        booking: {
          id: data.bookingId,
          checkInDate: data.checkInDate,
          guestCount: data.guestCount
        }
      }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send multi-guest booking confirmation notification to contact person
   */
  async sendBookingConfirmedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_CONFIRMED];
    const { title, message } = formatNotificationMessage(template, {
      guestCount: data.guestCount || 1,
      checkInDate: data.checkInDate,
      hostelName: data.hostelName
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId],
      title,
      message,
      type: PushNotificationTypeEnum.BOOKING_CONFIRMED,
      meta: {
        type: PushNotificationTypeEnum.BOOKING_CONFIRMED,
        user: {
          id: data.contactPersonId,
          linkId: ''
        },
        booking: {
          id: data.bookingId,
          checkInDate: data.checkInDate,
          guestCount: data.guestCount
        }
      }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send booking cancellation notification to contact person
   */
  async sendBookingCancelledNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_CANCELLED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      reason: data.reason || 'No specific reason provided'
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId],
      title,
      message,
      type: PushNotificationTypeEnum.BOOKING_CANCELLED,
      meta: {
        type: PushNotificationTypeEnum.BOOKING_CANCELLED,
        user: {
          id: data.contactPersonId,
          linkId: ''
        },
        booking: {
          id: data.bookingId,
          checkInDate: data.checkInDate,
          guestCount: data.guestCount
        }
      }
    };

    await this.sendPushNotification(notification);
  }
}