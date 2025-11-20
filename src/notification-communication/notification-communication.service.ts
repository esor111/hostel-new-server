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
      'https://dev.kaha.com.np/notifications/api/v3'
    );
  }

  /**
   * Send structured push notification to notification microservice
   */
  async sendPushNotification(body: SendPushNotificationDto): Promise<void> {
    const baseUrl = `${this.notificationServiceUrl}/push-notifications/structured`;
    
    // Log full request payload
    console.log('📱 ========== NOTIFICATION PAYLOAD ==========');
    console.log(JSON.stringify(body, null, 2));
    console.log('📱 ==========================================');
    
    this.logger.log(`Full Request Payload: ${JSON.stringify(body, null, 2)}`);
    this.logger.log(`Request URL: ${baseUrl}`);
    this.logger.log(`Request Method: POST`);
    
    try {
      this.logger.log(`Sending notification: ${body.type} to users: ${body.receiverUserIds?.join(', ')}, businesses: ${body.receiverBusinessIds?.join(', ')}`);
      
      const response = await firstValueFrom(this.httpService.post(baseUrl, body));
      
      // Log the notification response
      this.logger.log(`Notification Response Status: ${response.status}`);
      this.logger.log(`Notification Response Data: ${JSON.stringify(response.data, null, 2)}`);
      this.logger.log(`Notification Response Headers: ${JSON.stringify(response.headers, null, 2)}`);
      
      this.logger.log(`Notification sent successfully: ${body.type}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${body.type}`, error.message);
      if (error.response) {
        this.logger.error(`Error Response Status: ${error.response.status}`);
        this.logger.error(`Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        this.logger.error(`Error Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      }
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
   * Get business owner's user ID from kaha-main API
   * @param businessId - Business UUID
   * @returns Owner's user ID
   */
  private async getBusinessOwnerId(businessId: string): Promise<string> {
    const url = `https://dev.kaha.com.np/main/api/v3/businesses/owner?businessId=${businessId}`;
    
    try {
      console.log(`\n🔍 ===== FETCHING BUSINESS OWNER =====`);
      console.log(`🏢 Business ID: ${businessId}`);
      console.log(`🌐 URL: ${url}`);
      
      this.logger.log(`🔍 Fetching business owner for: ${businessId}`);
      
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'accept': '*/*' }
        })
      );
      const endTime = Date.now();
      
      console.log(`⏱️ Owner API Response Time: ${endTime - startTime}ms`);
      console.log(`📊 Response Status: ${response.status}`);
      console.log(`👤 Owner Data:`, JSON.stringify(response.data, null, 2));
      
      const ownerId = response.data?.id;
      
      if (!ownerId) {
        console.log(`❌ Owner ID not found in response`);
        throw new Error('Owner ID not found in response');
      }
      
      console.log(`👤 Owner ID: ${ownerId}`);
      console.log(`👤 Owner Name: ${response.data?.fullName}`);
      console.log(`👤 Owner Contact: ${response.data?.contactNumber}`);
      console.log(`✅ ===== BUSINESS OWNER FETCHED =====\n`);
      
      this.logger.log(`✅ Found owner: ${response.data?.fullName} (${ownerId})`);
      
      return ownerId;
    } catch (error) {
      console.log(`\n❌ ===== BUSINESS OWNER FETCH FAILED =====`);
      console.log(`🏢 Business ID: ${businessId}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Status: ${error.response?.status}`);
      console.log(`❌ Error Response:`, error.response?.data);
      console.log(`❌ ===== BUSINESS OWNER FETCH FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to fetch business owner: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking request notification to admins (business notification)
   */
  async sendBookingRequestNotification(data: BookingNotificationDto): Promise<void> {
    console.log('📱 Preparing BOOKING_REQUEST notification with data:', JSON.stringify(data, null, 2));
    
    const template = BOOKING_NOTIFICATION_MESSAGES[PushNotificationTypeEnum.BOOKING_REQUEST];
    const { title, message } = formatNotificationMessage(template, {
      contactName: data.contactName,
      checkInDate: data.checkInDate,
      guestCount: data.guestCount || 1
    });

    // Convert hostelId to businessId for notification system
    const businessId = await this.getBusinessIdFromHostelId(data.hostelId);
    console.log('📱 Converted hostelId to businessId:', data.hostelId, '->', businessId);

    // Get business owner's user ID
    const ownerUserId = await this.getBusinessOwnerId(businessId);
    console.log('📱 Converted businessId to ownerUserId:', businessId, '->', ownerUserId);

    const notification: SendPushNotificationDto = {
      receiverUserIds: [ownerUserId], // Use owner's user ID instead of businessId
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