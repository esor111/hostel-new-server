import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { MultiGuestBooking } from './entities/multi-guest-booking.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * Service to handle hostel booking notifications
 * Integrates with notification-express-server to send push notifications
 */
@Injectable()
export class HostelNotificationService {
  private readonly logger = new Logger(HostelNotificationService.name);
  
  // Notification servers
  private readonly KAHA_NOTIFICATION_URL: string;
  private readonly EXPRESS_NOTIFICATION_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Get URLs from environment or use defaults
    this.KAHA_NOTIFICATION_URL = this.configService.get<string>(
      'KAHA_NOTIFICATION_URL',
      'http://localhost:3000'
    );
    this.EXPRESS_NOTIFICATION_URL = this.configService.get<string>(
      'EXPRESS_NOTIFICATION_URL',
      'https://dev.kaha.com.np'
    );
    
    this.logger.log(`📱 Notification service initialized`);
    this.logger.log(`   Kaha Notification: ${this.KAHA_NOTIFICATION_URL}`);
    this.logger.log(`   Express Notification: ${this.EXPRESS_NOTIFICATION_URL}`);
  }

  /**
   * Notify user when admin confirms booking
   * Flow: Admin confirms → User receives notification
   */
  async notifyUserOfConfirmation(
    booking: MultiGuestBooking,
    adminJwt: JwtPayload
  ): Promise<void> {
    try {
      console.log(`🔔 BOOKING NOTIFICATION START - Booking ID: ${booking.id}`);
      console.log(`📋 Booking userId: ${booking.userId}`);
      console.log(`👤 Admin JWT ID: ${adminJwt.id}`);
      this.logger.log(`📱 Sending confirmation notification for booking ${booking.id}`);
      
      // 1. Get user FCM token
      const userFcmTokens = await this.getFcmTokens(booking.userId, false);
      if (!userFcmTokens.length) {
        this.logger.warn(`⚠️ No FCM token found for user ${booking.userId}`);
        return;
      }
      
      // 2. Get business name (hardcoded for now)
      const businessName = await this.getBusinessName(adminJwt.id);
      
      // 3. Get room info from booking guests
      const { roomName, roomId } = await this.getRoomInfoFromBooking(booking);
      
      // 4. Compose payload matching express server format
      const payload = {
        fcmToken: userFcmTokens[0],
        bookingStatus: 'Confirmed',
        senderName: businessName,
        recipientId: booking.userId,
        recipientType: 'USER',
        bookingDetails: {
          bookingId: booking.id,
          roomName: roomName,
          roomId: roomId
        }
      };
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 5. Send to express server
      await this.sendNotification(payload);
      
      this.logger.log(`✅ Confirmation notification sent successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to send confirmation notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break booking flow
    }
  }

  /**
   * Notify admin when user creates booking
   * Flow: User creates → Admin receives notification
   * NOTE: Not used yet - will be implemented later
   */
  async notifyAdminOfNewBooking(
    booking: MultiGuestBooking,
    userJwt: JwtPayload
  ): Promise<void> {
    try {
      this.logger.log(`📱 Sending new booking notification for booking ${booking.id}`);
      
      // 1. Get admin FCM token (using hostelId from booking)
      const adminFcmTokens = await this.getFcmTokens(booking.hostelId, true);
      if (!adminFcmTokens.length) {
        this.logger.warn(`⚠️ No FCM token found for business ${booking.hostelId}`);
        return;
      }
      
      // 2. Get user name (hardcoded for now)
      const userName = await this.getUserName(userJwt.id);
      
      // 3. Compose payload
      const payload = {
        fcmToken: adminFcmTokens[0],
        bookingStatus: 'Requested',
        senderName: userName,
        recipientId: booking.hostelId,
        recipientType: 'BUSINESS',
        bookingDetails: {
          bookingId: booking.id,
          roomName: 'test-room', // Hardcoded for now
          roomId: 'test-room-id'
        }
      };
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 4. Send to express server
      await this.sendNotification(payload);
      
      this.logger.log(`✅ New booking notification sent successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to send new booking notification: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * Notify admin when user cancels booking
   * Flow: User cancels → Admin receives notification
   * NOTE: Not used yet - will be implemented later
   */
  async notifyAdminOfCancellation(
    booking: MultiGuestBooking,
    userJwt: JwtPayload
  ): Promise<void> {
    try {
      this.logger.log(`📱 Sending cancellation notification for booking ${booking.id}`);
      
      // 1. Get admin FCM token
      const adminFcmTokens = await this.getFcmTokens(booking.hostelId, true);
      if (!adminFcmTokens.length) {
        this.logger.warn(`⚠️ No FCM token found for business ${booking.hostelId}`);
        return;
      }
      
      // 2. Get user name (hardcoded for now)
      const userName = await this.getUserName(userJwt.id);
      
      // 3. Compose payload
      const payload = {
        fcmToken: adminFcmTokens[0],
        bookingStatus: 'Cancelled',
        senderName: userName,
        recipientId: booking.hostelId,
        recipientType: 'BUSINESS',
        bookingDetails: {
          bookingId: booking.id,
          roomName: 'test-room', // Hardcoded for now
          roomId: 'test-room-id'
        }
      };
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 4. Send to express server
      await this.sendNotification(payload);
      
      this.logger.log(`✅ Cancellation notification sent successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to send cancellation notification: ${error.message}`);
      this.logger.error(error.stack);
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
   * Get business name (hardcoded for now)
   * TODO: Implement actual API call to fetch business data
   */
  private async getBusinessName(businessId: string): Promise<string> {
    // Hardcoded for testing
    this.logger.log(`📝 Using hardcoded business name for: ${businessId}`);
    return 'Test Business';
    
    // TODO: Later implementation
    // const business = await this.businessIntegrationService.getBusinessData(businessId);
    // return business.name;
  }

  /**
   * Get user name (hardcoded for now)
   * TODO: Implement actual API call to fetch user data
   */
  private async getUserName(userId: string): Promise<string> {
    // Hardcoded for testing
    this.logger.log(`📝 Using hardcoded user name for: ${userId}`);
    return 'Test User';
    
    // TODO: Later implementation
    // const user = await this.userIntegrationService.getUserData(userId);
    // return user.name;
  }

  /**
   * Extract room information from booking
   * Returns first confirmed guest's room info, or fallback if none found
   */
  private async getRoomInfoFromBooking(booking: MultiGuestBooking): Promise<{ roomName: string; roomId: string }> {
    try {
      // Check if booking has guests with bed relations loaded
      if (!booking.guests || booking.guests.length === 0) {
        this.logger.warn(`⚠️ No guests found in booking ${booking.id}`);
        return { roomName: 'Your Room', roomId: 'unknown' };
      }

      // Get first guest's bed info
      const firstGuest = booking.guests[0];
      if (!firstGuest.bedId) {
        this.logger.warn(`⚠️ No bed assigned to first guest in booking ${booking.id}`);
        return { roomName: 'Your Room', roomId: 'unknown' };
      }

      // If bed relation is loaded with room
      if (firstGuest.bed?.room) {
        const room = firstGuest.bed.room;
        this.logger.log(`✅ Found room: ${room.name} (${room.id})`);
        return {
          roomName: room.name || room.roomNumber || 'Your Room',
          roomId: room.id
        };
      }

      // Fallback: use assigned room from booking if available
      if (booking.assignedRoom) {
        this.logger.log(`📝 Using assigned room from booking: ${booking.assignedRoom}`);
        return {
          roomName: booking.assignedRoom,
          roomId: 'assigned-room'
        };
      }

      // Final fallback
      this.logger.warn(`⚠️ Could not determine room for booking ${booking.id}, using fallback`);
      return { roomName: 'Your Room', roomId: 'unknown' };

    } catch (error) {
      this.logger.error(`❌ Error getting room info: ${error.message}`);
      return { roomName: 'Your Room', roomId: 'unknown' };
    }
  }
}
