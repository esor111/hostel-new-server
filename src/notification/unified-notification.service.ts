import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { HostelService } from '../hostel/hostel.service';
import { NotificationLogService } from './notification-log.service';
import { RecipientType, NotificationCategory } from './entities/notification.entity';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'PAYMENT' | 'BOOKING' | 'CONFIGURATION' | 'INVOICE' | 'GENERAL' | 'ADMIN_CHARGE' | 'BULK_MESSAGE' | 'BULK_PAYMENT' | 'BULK_INVOICE';
  metadata?: any;
  imageUrl?: string;
}

export interface BulkNotificationPayload {
  studentIds: string[];
  title: string;
  message: string;
  type: 'BULK_MESSAGE' | 'BULK_PAYMENT' | 'BULK_INVOICE';
  metadata?: any;
  imageUrl?: string;
}

/**
 * Unified Notification Service
 * Handles all types of notifications using the same pattern as configuration notifications
 */
@Injectable()
export class UnifiedNotificationService {
  private readonly logger = new Logger(UnifiedNotificationService.name);
  
  // Notification servers
  private readonly KAHA_NOTIFICATION_URL: string;
  private readonly EXPRESS_NOTIFICATION_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly hostelService: HostelService,
    private readonly notificationLogService: NotificationLogService,
  ) {
    // Get URLs from environment or use defaults
    this.KAHA_NOTIFICATION_URL = this.configService.get<string>(
      'KAHA_NOTIFICATION_URL',
      'https://dev.kaha.com.np/notifications'
    );
    this.EXPRESS_NOTIFICATION_URL = this.configService.get<string>(
      'EXPRESS_NOTIFICATION_URL',
      'https://dev.kaha.com.np'
    );
    
    this.logger.log(`🔔 Unified Notification Service initialized`);
    this.logger.log(`   Kaha Notification: ${this.KAHA_NOTIFICATION_URL}`);
    this.logger.log(`   Express Notification: ${this.EXPRESS_NOTIFICATION_URL}`);
  }

  /**
   * Send notification to a single user
   * Uses the same pattern as configuration notifications
   */
  async sendToUser(
    payload: NotificationPayload,
    adminJwt?: JwtPayload,
    hostelContext?: any
  ): Promise<void> {
    let notificationId: string | null = null;
    const sessionId = `unified_${payload.type}_${Date.now()}`;
    
    try {
      console.log(`\n🔔 ===== UNIFIED NOTIFICATION START =====`);
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`📋 Notification Type: ${payload.type}`);
      console.log(`👤 Target userId: ${payload.userId}`);
      console.log(`📧 Title: ${payload.title}`);
      console.log(`💬 Message: ${payload.message}`);
      console.log(`🖼️ Image URL: ${payload.imageUrl || 'None'}`);
      console.log(`📦 Metadata:`, JSON.stringify(payload.metadata, null, 2));
      console.log(`👤 Admin JWT:`, adminJwt ? JSON.stringify(adminJwt, null, 2) : 'None');
      console.log(`🏨 Hostel Context:`, hostelContext ? JSON.stringify(hostelContext, null, 2) : 'None');
      
      // 🔔 NEW: Create notification record before sending
      console.log(`\n📝 STEP 1: Creating notification database record`);
      const notificationData = {
        recipientType: RecipientType.USER,
        recipientId: payload.userId,
        category: payload.type as NotificationCategory,
        title: payload.title,
        message: payload.message,
        metadata: {
          ...payload.metadata,
          imageUrl: payload.imageUrl,
          source: 'unified_notification_service',
          adminJwtId: adminJwt?.id,
          businessId: adminJwt?.businessId,
          sessionId: sessionId,
          timestamp: new Date().toISOString()
        },
      };
      
      console.log(`📝 Notification Data:`, JSON.stringify(notificationData, null, 2));
      
      const notification = await this.notificationLogService.createNotification(notificationData);
      notificationId = notification.id;
      
      console.log(`✅ Notification record created with ID: ${notificationId}`);
      
      // 1. Get user FCM tokens
      console.log(`\n🔍 STEP 2: Fetching FCM tokens for user ${payload.userId}`);
      const userFcmTokens = await this.getFcmTokens(payload.userId, false);
      console.log(`📱 FCM Tokens Found: ${userFcmTokens.length}`);
      console.log(`📱 FCM Tokens:`, userFcmTokens.map(token => `${token.substring(0, 20)}...`));
      
      if (!userFcmTokens.length) {
        console.log(`⚠️ NO FCM TOKENS - Notification will be skipped`);
        this.logger.warn(`⚠️ No FCM token found for user ${payload.userId}`);
        
        // 🔔 NEW: Mark as skipped
        if (notificationId) {
          await this.notificationLogService.markAsSkipped(notificationId, 'No FCM tokens found');
          console.log(`📝 Notification ${notificationId} marked as SKIPPED`);
        }
        console.log(`⚠️ ===== UNIFIED NOTIFICATION SKIPPED - NO FCM =====\n`);
        return;
      }
      
      // 2. Get business/hostel name from JWT businessId
      console.log(`\n🏢 STEP 3: Getting business/hostel name`);
      let businessName = 'Your Hostel'; // Default fallback
      
      if (adminJwt && adminJwt.businessId) {
        console.log(`🔍 Getting hostel name from businessId: ${adminJwt.businessId}`);
        businessName = await this.getBusinessName(adminJwt.businessId);
        console.log(`🏢 Using hostel name from businessId: ${businessName}`);
      } else if (hostelContext && hostelContext.hostelName) {
        businessName = hostelContext.hostelName;
        console.log(`🏨 Using hostel name from context: ${businessName}`);
      } else {
        console.log(`🏢 Using default business name: ${businessName}`);
      }
      
      console.log(`📝 Final sender name: ${businessName}`);
      
      // 3. Compose payload for express server
      console.log(`\n📦 STEP 4: Composing express server payload`);
      
      // Determine if this is a bulk message or booking-related notification
      const isBulkMessage = payload.type === 'BULK_MESSAGE' || payload.type === 'GENERAL';
      
      let expressPayload: any;
      let endpoint: string;
      
      if (isBulkMessage) {
        // Use general notification format (no redirect to booking details)
        expressPayload = {
          fcmToken: userFcmTokens[0],
          senderName: businessName,
          recipientId: payload.userId,
          recipientType: 'USER',
          title: payload.title,
          message: payload.message,
          imageUrl: payload.imageUrl,
          meta: {
            type: 'general',
            notificationType: payload.type,
            metadata: payload.metadata,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
          }
        };
        endpoint = `${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-general-notification`;
        console.log(`📧 Using GENERAL notification endpoint (no redirect)`);
      } else {
        // Use booking notification format (redirects to booking details)
        expressPayload = {
          fcmToken: userFcmTokens[0],
          bookingStatus: 'Confirmed',
          senderName: businessName,
          recipientId: payload.userId,
          recipientType: 'USER',
          bookingDetails: {
            bookingId: `${payload.type.toLowerCase()}_${Date.now()}`,
            roomName: payload.title,
            roomId: payload.type.toLowerCase(),
            notificationType: payload.type,
            title: payload.title,
            message: payload.message,
            metadata: payload.metadata,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
          }
        };
        endpoint = `${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`;
        console.log(`🏨 Using BOOKING notification endpoint (redirects to booking)`);
      }
      
      console.log(`📦 COMPLETE EXPRESS PAYLOAD:`);
      console.log(JSON.stringify(expressPayload, null, 2));
      console.log(`📦 Payload Size: ${JSON.stringify(expressPayload).length} bytes`);
      
      // 4. Send to express server
      console.log(`\n🚀 STEP 5: Sending to Express server`);
      console.log(`🌐 Express URL: ${endpoint}`);
      
      const startTime = Date.now();
      await this.sendNotificationToEndpoint(endpoint, expressPayload);
      const endTime = Date.now();
      
      console.log(`⏱️ Notification sent in ${endTime - startTime}ms`);
      
      // 🔔 NEW: Mark as sent on success
      if (notificationId) {
        await this.notificationLogService.markAsSent(notificationId, userFcmTokens[0]);
        console.log(`📝 Notification ${notificationId} marked as SENT`);
      }
      
      console.log(`✅ UNIFIED NOTIFICATION SENT SUCCESSFULLY - Type: ${payload.type}`);
      console.log(`🔔 ===== UNIFIED NOTIFICATION END =====\n`);
    } catch (error) {
      console.log(`\n❌ ===== UNIFIED NOTIFICATION FAILED =====`);
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`📋 Notification Type: ${payload.type}`);
      console.log(`👤 Target userId: ${payload.userId}`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Stack:`, error.stack);
      console.log(`❌ Error Response:`, error.response?.data);
      console.log(`❌ Error Status:`, error.response?.status);
      console.log(`❌ ===== UNIFIED NOTIFICATION FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to send unified notification: ${error.message}`);
      this.logger.error(error.stack);
      
      // 🔔 NEW: Mark as failed on error
      if (notificationId) {
        await this.notificationLogService.markAsFailed(notificationId, error.message);
        console.log(`📝 Notification ${notificationId} marked as FAILED`);
      }
      
      // Don't throw - notification failure shouldn't break main flow
    }
  }

  /**
   * Send bulk notifications to multiple students
   * Loops through each student and sends individual notifications
   */
  async sendBulkNotification(
    payload: BulkNotificationPayload,
    adminJwt: JwtPayload,
    hostelContext?: any
  ): Promise<{ sent: number; failed: number; skipped: number; details: any }> {
    console.log(`🔔 BULK NOTIFICATION START - Type: ${payload.type}`);
    console.log(`👥 Target students: ${payload.studentIds.length}`);
    console.log(`📧 Title: ${payload.title}`);
    
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      details: {
        sentTo: [] as any[],
        failed: [] as any[],
        skipped: [] as any[]
      }
    };

    // Loop through each student and send individual notification
    for (const studentId of payload.studentIds) {
      try {
        console.log(`📤 Processing student: ${studentId}`);
        
        // Get student info to get userId
        const student = await this.getStudentInfo(studentId);
        if (!student || !student.userId) {
          console.log(`⚠️ Skipping student ${studentId} - No userId found`);
          results.skipped++;
          results.details.skipped.push({
            studentId,
            reason: 'No userId found'
          });
          continue;
        }

        // Send individual notification using unified approach
        await this.sendToUser({
          userId: student.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type as any,
          metadata: {
            ...payload.metadata,
            studentId: studentId,
            studentName: student.name
          }
        }, adminJwt, hostelContext);

        results.sent++;
        results.details.sentTo.push({
          studentId,
          userId: student.userId,
          name: student.name
        });
        
        console.log(`✅ Sent to student: ${student.name} (${studentId})`);
        
      } catch (error) {
        console.log(`❌ Failed to send to student ${studentId}: ${error.message}`);
        results.failed++;
        results.details.failed.push({
          studentId,
          error: error.message
        });
      }
    }

    console.log(`🏁 BULK NOTIFICATION COMPLETED:`);
    console.log(`   ✅ Sent: ${results.sent}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   ⚠️ Skipped: ${results.skipped}`);

    return results;
  }

  /**
   * Get FCM token from kaha-notification server
   * Same as existing implementation
   */
  private async getFcmTokens(id: string, isBusiness: boolean): Promise<string[]> {
    const endpoint = `${this.KAHA_NOTIFICATION_URL}/api/v3/notification-devices/tokens`;
    const params = { [isBusiness ? 'businessIds' : 'userIds']: id };

    try {
      this.logger.log(`🔍 Fetching FCM tokens for ${isBusiness ? 'business' : 'user'}: ${id}`);
      
      const response = await firstValueFrom(
        this.httpService.get(endpoint, { params })
      );
      
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
   * Send notification to express server endpoint
   * Unified method that works with any endpoint
   */
  private async sendNotificationToEndpoint(endpoint: string, payload: any): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, payload)
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
   * Get business/hostel name by businessId from JWT
   * Now actually fetches the real hostel name!
   */
  private async getBusinessName(businessId: string): Promise<string> {
    try {
      console.log(`🔍 Fetching hostel name for businessId: ${businessId}`);
      
      // Use HostelService to get hostel by businessId
      const hostel = await this.hostelService.findByBusinessId(businessId);
      
      if (hostel && hostel.name) {
        console.log(`✅ Found hostel name: ${hostel.name}`);
        return hostel.name;
      } else {
        console.log(`⚠️ No hostel found for businessId: ${businessId}, using fallback`);
        return 'Your Hostel';
      }
    } catch (error) {
      console.log(`❌ Error fetching hostel name: ${error.message}, using fallback`);
      return 'Your Hostel';
    }
  }

  /**
   * Get student info including userId
   * Fetches student data from database with fallback userId
   */
  private async getStudentInfo(studentId: string): Promise<{ userId: string; name: string } | null> {
    const fallbackUserId = 'a635c2da-6fe0-4d10-9dec-e85ddaced067'; // Same fallback as student notification service
    
    try {
      console.log(`🔍 Looking up student info for studentId: ${studentId}`);
      
      const student = await this.studentRepository.findOne({ 
        where: { id: studentId },
        select: ['id', 'userId', 'name', 'phone']
      });
      
      if (student && student.userId) {
        console.log(`✅ Found student: ${student.name} with userId: ${student.userId}`);
        return { 
          userId: student.userId, 
          name: student.name 
        };
      } else if (student && student.phone) {
        // Try to get real userId from phone number (same as student notification service)
        console.log(`🔍 Student found but no userId, checking phone ${student.phone} against Kaha API...`);
        const realUserId = await this.getRealUserId(student.phone);
        console.log(`✅ Using real userId: ${realUserId} for student: ${student.name}`);
        return {
          userId: realUserId,
          name: student.name
        };
      } else if (student) {
        // Student exists but no phone, use fallback
        console.log(`⚠️ Student ${student.name} found but no userId or phone, using fallback`);
        return {
          userId: fallbackUserId,
          name: student.name
        };
      } else {
        console.log(`⚠️ Student ${studentId} not found, using fallback userId`);
        return {
          userId: fallbackUserId,
          name: 'Student' // Default name
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error fetching student info for ${studentId}: ${error.message}`);
      console.log(`   Using fallback userId: ${fallbackUserId}`);
      return {
        userId: fallbackUserId,
        name: 'Student' // Default name
      };
    }
  }

  /**
   * Get real userId by checking phone number against Kaha API
   * Same logic as student notification service
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
}
