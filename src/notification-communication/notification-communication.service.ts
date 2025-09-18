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
import { HostelService } from '../hostel/hostel.service';

@Injectable()
export class NotificationCommunicationService {
  private readonly logger = new Logger(NotificationCommunicationService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly hostelService: HostelService,
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
console.log("notification body", body)
    try {
      this.logger.log(`Sending notification: ${body.type} to users: ${body.receiverUserIds?.join(', ')}, businesses: ${body.receiverBusinessIds?.join(', ')}`);
      
      await firstValueFrom(this.httpService.post(baseUrl, body));
      
      this.logger.log(`Notification sent successfully: ${body.type}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${body.type}`, error.message);
      // Don't throw error to prevent blocking main business logic
    }
  }

  /**
   * Convert hostelId to businessId for notifications
   * @param hostelId - Internal hostel ID from database
   * @returns businessId for notification system
   */
  private async getBusinessIdFromHostelId(hostelId: string): Promise<string> {
    try {
      const businessId = await this.hostelService.getBusinessIdFromHostelId(hostelId);
      
      if (businessId) {
        this.logger.debug(`Converted hostelId ${hostelId} to businessId ${businessId}`);
        return businessId;
      } else {
        this.logger.warn(`Could not find businessId for hostelId ${hostelId}, using fallback`);
        // Fallback to config value
        return this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id');
      }
    } catch (error) {
      this.logger.error(`Error converting hostelId ${hostelId} to businessId:`, error.message);
      // Fallback to config value
      return this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id');
    }
  }

  /**
   * Send booking request notification to admins (business notification)
   */
  async sendBookingRequestNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_REQUEST];
    const { title, message } = formatNotificationMessage(template, {
      contactName: data.contactName,
      checkInDate: data.checkInDate,
      guestCount: data.guestCount || 1
    });

    // Convert hostelId to businessId for notification system
    const businessId = await this.getBusinessIdFromHostelId(data.hostelId);

    const notification: SendPushNotificationDto = {
      receiverBusinessIds: [businessId], // Use businessId instead of hostelId
      title,
      message,
      type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
      // meta: {
      //   type: PushNotificationTypeEnum.BOOKING_REQUEST,
      //   booking: {
      //     id: data.bookingId,
      //     checkInDate: data.checkInDate,
      //     guestCount: data.guestCount
      //   }
      // }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send booking approval notification to contact person (user notification)
   */
  async sendBookingApprovedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_APPROVED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      hostelName: data.hostelName
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId], // Only use receiverUserIds for user notifications
      title,
      message,
      type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
      // meta: {
      //   type: PushNotificationTypeEnum.BOOKING_APPROVED,
      //   booking: {
      //     id: data.bookingId,
      //     checkInDate: data.checkInDate,
      //     guestCount: data.guestCount
      //   }
      // }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send booking rejection notification to contact person (user notification)
   */
  async sendBookingRejectedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_REJECTED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      reason: data.reason || 'No specific reason provided'
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId], // Only use receiverUserIds for user notifications
      title,
      message,
      type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
      // meta: {
      //   type: PushNotificationTypeEnum.BOOKING_REJECTED,
      //   booking: {
      //     id: data.bookingId,
      //     checkInDate: data.checkInDate,
      //     guestCount: data.guestCount
      //   }
      // }
    };

    await this.sendPushNotification(notification);
  }

  /**
   * Send multi-guest booking confirmation notification to contact person (user notification)
   */
  async sendBookingConfirmedNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_CONFIRMED];
    const { title, message } = formatNotificationMessage(template, {
      guestCount: data.guestCount || 1,
      checkInDate: data.checkInDate,
      hostelName: data.hostelName
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId], // Only use receiverUserIds for user notifications
      title,
      message,
      type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
      meta: {
        type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
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
   * Send booking cancellation notification to contact person (user notification)
   */
  async sendBookingCancelledNotification(data: BookingNotificationDto): Promise<void> {
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_CANCELLED];
    const { title, message } = formatNotificationMessage(template, {
      checkInDate: data.checkInDate,
      reason: data.reason || 'No specific reason provided'
    });

    const notification: SendPushNotificationDto = {
      receiverUserIds: [data.contactPersonId], // Only use receiverUserIds for user notifications
      title,
      message,
      type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
      meta: {
        type: PushNotificationTypeEnum.GENERAL, // Changed to GENERAL
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