import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Student } from './entities/student.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Service to handle student-related notifications
 * Integrates with notification-express-server to send push notifications
 */
@Injectable()
export class StudentNotificationService {
  private readonly logger = new Logger(StudentNotificationService.name);
  
  // Notification servers
  private readonly KAHA_NOTIFICATION_URL: string;
  private readonly EXPRESS_NOTIFICATION_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Get URLs from environment or use defaults
    this.KAHA_NOTIFICATION_URL = this.configService.get<string>(
      'https://dev.kaha.com.np/notifications',
      'https://dev.kaha.com.np/notifications'
    );
    this.EXPRESS_NOTIFICATION_URL = this.configService.get<string>(
      'EXPRESS_NOTIFICATION_URL',
      'http://localhost:3007'
    );
    
    this.logger.log(`📱 Student Notification service initialized`);
    this.logger.log(`   Kaha Notification: ${this.KAHA_NOTIFICATION_URL}`);
    this.logger.log(`   Express Notification: ${this.EXPRESS_NOTIFICATION_URL}`);
  }

  /**
   * Notify student when admin completes their configuration
   * Flow: Admin configures student → Student receives notification
   */
  async notifyStudentOfConfiguration(
    student: Student,
    configurationResult: any,
    adminJwt: JwtPayload
  ): Promise<void> {
    try {
      console.log(`🔔 CONFIGURATION NOTIFICATION START - Student ID: ${student.id}`);
      console.log(`📋 Student userId: ${student.userId}`);
      console.log(`👨‍🎓 Student name: ${student.name}`);
      console.log(`👤 Admin JWT ID: ${adminJwt.id}`);
      console.log(`💰 Monthly fee: NPR ${configurationResult.totalMonthlyFee?.toLocaleString()}`);
      console.log(`📱 Sending configuration notification for student ${student.id}`);
      
      // 1. Get real userId by checking student's phone number against Kaha API
      const realUserId = await this.getRealUserId(student.phone);
      console.log(`🔍 Real userId for phone ${student.phone}: ${realUserId}`);
      
      // 2. Get student FCM token using the real userId
      const studentFcmTokens = await this.getFcmTokens(realUserId, false);
      
      // 2. Get business name (hardcoded for now)
      const businessName = await this.getBusinessName(adminJwt.id);
      
      // 3. Compose payload for student configuration notification (booking notification format)
      const payload = {
        fcmToken: studentFcmTokens[0],
        bookingStatus: 'Confirmed', // Required field for booking endpoint
        senderName: businessName,
        recipientId: realUserId,
        recipientType: 'USER',
        bookingDetails: {
          bookingId: `config_${student.id}`, // Use student config as booking ID
          roomName: student.room ? (student.room.name || student.room.roomNumber || 'Your Room') : 'Your Room',
          roomId: student.roomId || student.id,
          // Additional configuration details
          studentId: student.id,
          studentName: student.name,
          totalMonthlyFee: configurationResult.totalMonthlyFee,
          configurationDate: configurationResult.configurationDate,
          firstInvoice: configurationResult.firstInvoice ? {
            invoiceId: configurationResult.firstInvoice.invoiceId,
            amount: configurationResult.firstInvoice.amount,
            dueDate: configurationResult.firstInvoice.dueDate
          } : null
        }
      };
      
      console.log(`📤 CONFIGURATION PAYLOAD:`);
      console.log(JSON.stringify(payload, null, 2));
      
      // 4. Check if we have FCM tokens before sending
      if (!studentFcmTokens.length) {
        this.logger.warn(`⚠️ No FCM token found for user ${realUserId}`);
        console.log(`⚠️ SKIPPING NOTIFICATION SEND - No FCM tokens available for userId: ${realUserId}`);
        return;
      }
      
      // 5. Send to express server
      console.log(`🚀 Sending to Express server: ${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`);
      await this.sendNotification(payload);
      
      console.log(`✅ CONFIGURATION NOTIFICATION SENT SUCCESSFULLY to ${student.name}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send configuration notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break configuration flow
    }
  }

  /**
   * Notify student when their invoice is generated
   * Flow: System generates invoice → Student receives notification
   */
  async notifyStudentOfInvoice(
    student: Student,
    invoiceDetails: any,
    adminJwt?: JwtPayload
  ): Promise<void> {
    try {
      this.logger.log(`📱 Sending invoice notification for student ${student.id}`);
      
      // 1. Get student FCM token
      const studentFcmTokens = await this.getFcmTokens(student.userId, false);
      if (!studentFcmTokens.length) {
        this.logger.warn(`⚠️ No FCM token found for student user ${student.userId}`);
        return;
      }
      
      // 2. Get business name
      const businessName = adminJwt ? await this.getBusinessName(adminJwt.id) : 'Your Hostel';
      
      // 3. Compose payload for invoice notification (booking notification format)
      const payload = {
        fcmToken: studentFcmTokens[0],
        bookingStatus: 'Confirmed', // Required field for booking endpoint
        senderName: businessName,
        recipientId: student.userId,
        recipientType: 'USER',
        bookingDetails: {
          bookingId: `invoice_${invoiceDetails.invoiceId}`, // Use invoice as booking ID
          roomName: 'Invoice Notification',
          roomId: invoiceDetails.invoiceId,
          // Additional invoice details
          studentId: student.id,
          studentName: student.name,
          invoiceId: invoiceDetails.invoiceId,
          amount: invoiceDetails.amount,
          dueDate: invoiceDetails.dueDate,
          periodStart: invoiceDetails.periodStart,
          periodEnd: invoiceDetails.periodEnd,
          status: invoiceDetails.status
        }
      };
      
      this.logger.log(`📤 Sending invoice payload:`, JSON.stringify(payload, null, 2));
      
      // 4. Send to express server
      await this.sendNotification(payload);
      
      this.logger.log(`✅ Invoice notification sent successfully to student ${student.name}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send invoice notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break invoice flow
    }
  }

  /**
   * Get FCM token from kaha-notification server
   * @param id - JWT.id (userId or businessId)
   * @param isBusiness - true if admin/business token, false if user token
   */
  private async getFcmTokens(id: string, isBusiness: boolean): Promise<string[]> {
    const endpoint = 'https://dev.kaha.com.np/notifications/api/v3/notification-devices/tokens';
    const params = { [isBusiness ? 'businessIds' : 'userIds']: id };

    try {
      this.logger.log(`🔍 Fetching FCM tokens for ${isBusiness ? 'business' : 'user'}: ${id}`);
      
      const response = await firstValueFrom(
        this.httpService.get(endpoint, { params })
      );
      
      // Extract FCM token strings from token objects
      // API returns: { tokens: [{ fcmToken: "...", userId: "...", platform: "...", deviceId: "..." }] }
      const tokenObjects = response.data?.tokens || [];
      const fcmTokens = tokenObjects.map(obj => obj.fcmToken).filter(token => token);
      
      this.logger.log(`✅ Retrieved ${fcmTokens.length} FCM token(s)`);
      
      return fcmTokens;
    } catch (error) {
      this.logger.error(`❌ Failed to fetch FCM tokens: ${error.message}`);
      if (error.response?.data) {
        this.logger.error('Error details:', error.response.data);
      }
      return [];
    }
  }

  /**
   * Send notification to express server
   */
  private async sendNotification(payload: any): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`,
          payload
        )
      );
      
      this.logger.log(`✅ Express server response:`, response.data);
    } catch (error) {
      this.logger.error(`❌ Failed to send to express server: ${error.message}`);
      if (error.response) {
        this.logger.error(`   Status: ${error.response.status}`);
        this.logger.error(`   Data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get real userId by checking phone number against Kaha API
   * If not found, use hardcoded fallback userId
   */
  private async getRealUserId(phoneNumber: string): Promise<string> {
    const fallbackUserId = 'a635c2da-6fe0-4d10-9dec-e85ddaced067';
    
    try {
      console.log(`🔍 Checking phone ${phoneNumber} against Kaha API...`);
      
      const response = await firstValueFrom(
        this.httpService.get(`https://dev.kaha.com.np/main/api/v3/users/check-contact/${phoneNumber}`)
      );
      
      if (response.data && response.data.id) {
        console.log(`✅ Found user: ${response.data.fullName} (${response.data.kahaId})`);
        console.log(`   Real userId: ${response.data.id}`);
        return response.data.id;
      } else {
        console.log(`⚠️ No user found for phone ${phoneNumber}, using fallback`);
        return fallbackUserId;
      }
    } catch (error) {
      console.log(`❌ Error checking phone ${phoneNumber}: ${error.message}`);
      console.log(`   Using fallback userId: ${fallbackUserId}`);
      return fallbackUserId;
    }
  }

  /**
   * Get business name (hardcoded for now)
   * TODO: Implement actual API call to fetch business data
   */
  private async getBusinessName(businessId: string): Promise<string> {
    // Hardcoded for testing
    this.logger.log(`📝 Using hardcoded business name for: ${businessId}`);
    return 'Your Hostel';
    
    // TODO: Later implementation
    // const business = await this.businessIntegrationService.getBusinessData(businessId);
    // return business.name;
  }
}
