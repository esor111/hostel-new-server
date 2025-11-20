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
    // Get URLs from environment or use defaultsa
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
    const notificationId = `booking_confirm_${booking.id}_${Date.now()}`;
    
    try {
      console.log(`\n🔔 ===== BOOKING CONFIRMATION NOTIFICATION START =====`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`📋 Booking Reference: ${booking.bookingReference}`);
      console.log(`📋 Booking Status: ${booking.status}`);
      console.log(`📋 Booking userId: ${booking.userId}`);
      console.log(`📋 Contact Name: ${booking.contactName}`);
      console.log(`📋 Contact Phone: ${booking.contactPhone}`);
      console.log(`📋 Contact Email: ${booking.contactEmail}`);
      console.log(`👤 Admin JWT:`, JSON.stringify(adminJwt, null, 2));
      console.log(`🏨 Hostel Data:`, booking.hostel ? {
        id: booking.hostel.id,
        name: booking.hostel.name,
        businessId: booking.hostel.businessId
      } : 'No hostel data');
      console.log(`👥 Guests Count: ${booking.guests?.length || 0}`);
      
      this.logger.log(`📱 Sending confirmation notification for booking ${booking.id}`);
      
      // 1. Get user FCM token
      console.log(`\n🔍 STEP 1: Fetching FCM tokens for user ${booking.userId}`);
      const userFcmTokens = await this.getFcmTokens(booking.userId, false);
      console.log(`📱 FCM Tokens Found: ${userFcmTokens.length}`);
      console.log(`📱 FCM Tokens:`, userFcmTokens);
      
      if (!userFcmTokens.length) {
        console.log(`⚠️ NO FCM TOKENS - Notification will be skipped`);
        this.logger.warn(`⚠️ No FCM token found for user ${booking.userId}`);
        return;
      }
      
      // 2. Get business name
      console.log(`\n🏢 STEP 2: Getting business name for admin ${adminJwt.id}`);
      const businessName = await this.getBusinessName(adminJwt.id);
      console.log(`🏢 Business Name: ${businessName}`);
      
      // 3. Get room info from booking guests
      console.log(`\n🏠 STEP 3: Getting room info from booking`);
      const { roomName, roomId } = await this.getRoomInfoFromBooking(booking);
      console.log(`🏠 Room Name: ${roomName}`);
      console.log(`🏠 Room ID: ${roomId}`);
      
      // 4. Compose payload matching express server format
      console.log(`\n📦 STEP 4: Composing notification payload`);
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
      
      console.log(`📦 COMPLETE PAYLOAD:`, JSON.stringify(payload, null, 2));
      console.log(`📦 Payload Size: ${JSON.stringify(payload).length} bytes`);
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 5. Send to express server
      console.log(`\n🚀 STEP 5: Sending to Express server`);
      console.log(`🌐 Express URL: ${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`);
      
      const startTime = Date.now();
      await this.sendNotification(payload);
      const endTime = Date.now();
      
      console.log(`⏱️ Notification sent in ${endTime - startTime}ms`);
      console.log(`✅ BOOKING CONFIRMATION NOTIFICATION SENT SUCCESSFULLY`);
      console.log(`🔔 ===== BOOKING CONFIRMATION NOTIFICATION END =====\n`);
      
      this.logger.log(`✅ Confirmation notification sent successfully`);
    } catch (error) {
      console.log(`\n❌ ===== BOOKING CONFIRMATION NOTIFICATION FAILED =====`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Stack:`, error.stack);
      console.log(`❌ ===== BOOKING CONFIRMATION NOTIFICATION FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to send confirmation notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break booking flow
    }
  }

  /**
   * Notify admin when user creates booking
   * Flow: User creates → Admin receives notification
   */
  async notifyAdminOfNewBooking(
    booking: MultiGuestBooking,
    userJwt: JwtPayload
  ): Promise<void> {
    const notificationId = `booking_new_${booking.id}_${Date.now()}`;
    
    try {
      console.log(`\n🔔 ===== NEW BOOKING NOTIFICATION START =====`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`📋 Booking Reference: ${booking.bookingReference}`);
      console.log(`📋 Booking Status: ${booking.status}`);
      console.log(`📋 Booking userId: ${booking.userId}`);
      console.log(`📋 Contact Name: ${booking.contactName}`);
      console.log(`📋 Contact Phone: ${booking.contactPhone}`);
      console.log(`📋 Contact Email: ${booking.contactEmail}`);
      console.log(`📋 Check-in Date: ${booking.checkInDate}`);
      console.log(`📋 Duration: ${booking.duration}`);
      console.log(`📋 Total Guests: ${booking.totalGuests}`);
      console.log(`📋 Total Amount: ${(booking as any).totalAmount || 'Not calculated'}`);
      console.log(`📋 Notes: ${booking.notes}`);
      console.log(`👤 User JWT:`, JSON.stringify(userJwt, null, 2));
      
      this.logger.log(`📱 Sending new booking notification for booking ${booking.id}`);
      
      // Validate hostel relation is loaded
      if (!booking.hostel) {
        console.log(`❌ CRITICAL ERROR: Hostel relation not loaded`);
        console.log(`📋 Booking object keys:`, Object.keys(booking));
        console.log(`📋 Booking hostelId: ${booking.hostelId}`);
        this.logger.error(`❌ Hostel relation not loaded for booking ${booking.id}`);
        console.log(`❌ ===== NEW BOOKING NOTIFICATION FAILED - NO HOSTEL =====\n`);
        return;
      }
      
      console.log(`🏨 Hostel Data:`, {
        id: booking.hostel.id,
        name: booking.hostel.name,
        businessId: booking.hostel.businessId,
        isActive: booking.hostel.isActive
      });
      
      console.log(`👥 Guests Details:`);
      booking.guests?.forEach((guest, index) => {
        console.log(`   Guest ${index + 1}:`, {
          name: guest.guestName,
          age: guest.age,
          gender: guest.gender,
          phone: guest.phone,
          email: guest.email,
          bedId: guest.bedId,
          status: guest.status,
          assignedRoomNumber: guest.assignedRoomNumber,
          assignedBedNumber: guest.assignedBedNumber
        });
      });
      
      // 1. Get business owner ID from businessId
      console.log(`\n🔍 STEP 1: Fetching business owner for business ${booking.hostel.businessId}`);
      const ownerUserId = await this.getBusinessOwnerId(booking.hostel.businessId);
      console.log(`👤 Owner User ID: ${ownerUserId}`);
      
      // 2. Get owner FCM token using owner's user ID
      console.log(`\n📱 STEP 2: Fetching FCM tokens for owner ${ownerUserId}`);
      const adminFcmTokens = await this.getFcmTokens(ownerUserId, false);
      console.log(`📱 Owner FCM Tokens Found: ${adminFcmTokens.length}`);
      console.log(`📱 Owner FCM Tokens:`, adminFcmTokens);
      
      if (!adminFcmTokens.length) {
        console.log(`⚠️ NO OWNER FCM TOKENS - Notification will be skipped`);
        this.logger.warn(`⚠️ No FCM token found for owner ${ownerUserId}`);
        console.log(`⚠️ ===== NEW BOOKING NOTIFICATION SKIPPED - NO FCM =====\n`);
        return;
      }
      
      // 3. Get user name from booking
      console.log(`\n👤 STEP 3: Getting user name`);
      const userName = booking.contactName || 'A user';
      console.log(`👤 User Name: ${userName}`);
      
      // 4. Get room info from booking
      console.log(`\n🏠 STEP 4: Getting room info from booking`);
      const { roomName, roomId } = await this.getRoomInfoFromBooking(booking);
      console.log(`🏠 Room Name: ${roomName}`);
      console.log(`🏠 Room ID: ${roomId}`);
      
      // 5. Compose payload
      console.log(`\n📦 STEP 5: Composing notification payload`);
      const payload = {
        fcmToken: adminFcmTokens[0],
        bookingStatus: 'Requested',
        senderName: userName,
        recipientId: ownerUserId,
        recipientType: 'BUSINESS',
        bookingDetails: {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          roomName: roomName,
          roomId: roomId,
          checkInDate: booking.checkInDate,
          totalGuests: booking.totalGuests,
          totalAmount: (booking as any).totalAmount || 0,
          contactPhone: booking.contactPhone,
          contactEmail: booking.contactEmail,
          duration: booking.duration,
          notes: booking.notes
        }
      };
      
      console.log(`📦 COMPLETE PAYLOAD:`, JSON.stringify(payload, null, 2));
      console.log(`📦 Payload Size: ${JSON.stringify(payload).length} bytes`);
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 5. Send to express server
      console.log(`\n🚀 STEP 5: Sending to Express server`);
      console.log(`🌐 Express URL: ${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`);
      
      const startTime = Date.now();
      await this.sendNotification(payload);
      const endTime = Date.now();
      
      console.log(`⏱️ Notification sent in ${endTime - startTime}ms`);
      console.log(`✅ NEW BOOKING NOTIFICATION SENT SUCCESSFULLY`);
      console.log(`🔔 ===== NEW BOOKING NOTIFICATION END =====\n`);
      
      this.logger.log(`✅ New booking notification sent successfully`);
    } catch (error) {
      console.log(`\n❌ ===== NEW BOOKING NOTIFICATION FAILED =====`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Stack:`, error.stack);
      console.log(`❌ Error Response:`, error.response?.data);
      console.log(`❌ Error Status:`, error.response?.status);
      console.log(`❌ ===== NEW BOOKING NOTIFICATION FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to send new booking notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break booking creation
    }
  }

  /**
   * Notify admin when user cancels booking
   * Flow: User cancels → Admin receives notification
   */
  async notifyAdminOfCancellation(
    booking: MultiGuestBooking,
    userJwt: JwtPayload
  ): Promise<void> {
    const notificationId = `booking_cancel_${booking.id}_${Date.now()}`;
    
    try {
      console.log(`\n🔔 ===== BOOKING CANCELLATION NOTIFICATION START =====`);
      console.log(`� Notifincation ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`📋 Booking Reference: ${booking.bookingReference}`);
      console.log(`📋 Booking Status: ${booking.status}`);
      console.log(`📋 Booking userId: ${booking.userId}`);
      console.log(`📋 Contact Name: ${booking.contactName}`);
      console.log(`📋 Contact Phone: ${booking.contactPhone}`);
      console.log(`📋 Contact Email: ${booking.contactEmail}`);
      console.log(`👤 User JWT:`, JSON.stringify(userJwt, null, 2));
      
      this.logger.log(`📱 Sending cancellation notification for booking ${booking.id}`);
      
      // Validate hostel relation is loaded
      if (!booking.hostel) {
        console.log(`❌ CRITICAL ERROR: Hostel relation not loaded`);
        console.log(`📋 Booking object keys:`, Object.keys(booking));
        this.logger.error(`❌ Hostel relation not loaded for booking ${booking.id}`);
        console.log(`❌ ===== BOOKING CANCELLATION NOTIFICATION FAILED - NO HOSTEL =====\n`);
        return;
      }
      
      console.log(`🏨 Hostel Data:`, {
        id: booking.hostel.id,
        name: booking.hostel.name,
        businessId: booking.hostel.businessId,
        isActive: booking.hostel.isActive
      });
      
      // 1. Get business owner ID from businessId
      console.log(`\n🔍 STEP 1: Fetching business owner for business ${booking.hostel.businessId}`);
      const ownerUserId = await this.getBusinessOwnerId(booking.hostel.businessId);
      console.log(`👤 Owner User ID: ${ownerUserId}`);
      
      // 2. Get owner FCM token using owner's user ID
      console.log(`\n📱 STEP 2: Fetching FCM tokens for owner ${ownerUserId}`);
      const adminFcmTokens = await this.getFcmTokens(ownerUserId, false);
      console.log(`📱 Owner FCM Tokens Found: ${adminFcmTokens.length}`);
      console.log(`📱 Owner FCM Tokens:`, adminFcmTokens);
      
      if (!adminFcmTokens.length) {
        console.log(`⚠️ NO OWNER FCM TOKENS - Notification will be skipped`);
        this.logger.warn(`⚠️ No FCM token found for owner ${ownerUserId}`);
        console.log(`⚠️ ===== BOOKING CANCELLATION NOTIFICATION SKIPPED - NO FCM =====\n`);
        return;
      }
      
      // 3. Get user name from booking
      console.log(`\n👤 STEP 3: Getting user name`);
      const userName = booking.contactName || 'A user';
      console.log(`👤 User Name: ${userName}`);
      
      // 4. Get room info from booking
      console.log(`\n🏠 STEP 4: Getting room info from booking`);
      const { roomName, roomId } = await this.getRoomInfoFromBooking(booking);
      console.log(`🏠 Room Name: ${roomName}`);
      console.log(`🏠 Room ID: ${roomId}`);
      
      // 5. Compose payload
      console.log(`\n📦 STEP 5: Composing notification payload`);
      const payload = {
        fcmToken: adminFcmTokens[0],
        bookingStatus: 'Cancelled',
        senderName: userName,
        recipientId: ownerUserId,
        recipientType: 'BUSINESS',
        bookingDetails: {
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          roomName: roomName,
          roomId: roomId,
          checkInDate: booking.checkInDate,
          totalGuests: booking.totalGuests,
          totalAmount: (booking as any).totalAmount || 0,
          contactPhone: booking.contactPhone,
          contactEmail: booking.contactEmail,
          cancellationReason: booking.notes || 'User cancelled booking'
        }
      };
      
      console.log(`📦 COMPLETE PAYLOAD:`, JSON.stringify(payload, null, 2));
      console.log(`📦 Payload Size: ${JSON.stringify(payload).length} bytes`);
      
      this.logger.log(`📤 Sending payload:`, JSON.stringify(payload, null, 2));
      
      // 6. Send to express server
      console.log(`\n🚀 STEP 6: Sending to Express server`);
      console.log(`🌐 Express URL: ${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`);
      
      const startTime = Date.now();
      await this.sendNotification(payload);
      const endTime = Date.now();
      
      console.log(`⏱️ Notification sent in ${endTime - startTime}ms`);
      console.log(`✅ BOOKING CANCELLATION NOTIFICATION SENT SUCCESSFULLY`);
      console.log(`🔔 ===== BOOKING CANCELLATION NOTIFICATION END =====\n`);
      
      this.logger.log(`✅ Cancellation notification sent successfully`);
    } catch (error) {
      console.log(`\n❌ ===== BOOKING CANCELLATION NOTIFICATION FAILED =====`);
      console.log(`📋 Notification ID: ${notificationId}`);
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Stack:`, error.stack);
      console.log(`❌ Error Response:`, error.response?.data);
      console.log(`❌ Error Status:`, error.response?.status);
      console.log(`❌ ===== BOOKING CANCELLATION NOTIFICATION FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to send cancellation notification: ${error.message}`);
      this.logger.error(error.stack);
      // Don't throw - notification failure shouldn't break cancellation
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
      console.log(`\n🔍 ===== FCM TOKEN FETCH START =====`);
      console.log(`🎯 Target: ${isBusiness ? 'BUSINESS' : 'USER'}`);
      console.log(`🆔 ID: ${id}`);
      console.log(`🌐 Endpoint: ${endpoint}`);
      console.log(`📋 Params:`, JSON.stringify(params, null, 2));
      
      this.logger.log(`🔍 Fetching FCM tokens for ${isBusiness ? 'business' : 'user'}: ${id}`);
      
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService.get(endpoint, { params })
      );
      const endTime = Date.now();
      
      console.log(`⏱️ FCM API Response Time: ${endTime - startTime}ms`);
      console.log(`📊 Response Status: ${response.status}`);
      console.log(`📊 Response Headers:`, response.headers);
      console.log(`📊 Raw Response Data:`, JSON.stringify(response.data, null, 2));
      
      // Extract FCM token strings from token objects
      // API returns: { tokens: [{ fcmToken: "...", userId: "...", platform: "...", deviceId: "..." }] }
      const tokenObjects = response.data?.tokens || [];
      console.log(`📱 Token Objects Count: ${tokenObjects.length}`);
      
      tokenObjects.forEach((tokenObj, index) => {
        console.log(`📱 Token ${index + 1}:`, {
          fcmToken: tokenObj.fcmToken ? `${tokenObj.fcmToken.substring(0, 20)}...` : 'null',
          userId: tokenObj.userId,
          businessId: tokenObj.businessId,
          platform: tokenObj.platform,
          deviceId: tokenObj.deviceId,
          createdAt: tokenObj.createdAt,
          updatedAt: tokenObj.updatedAt
        });
      });
      
      const fcmTokens = tokenObjects.map(obj => obj.fcmToken).filter(token => token);
      
      console.log(`📱 Valid FCM Tokens: ${fcmTokens.length}`);
      fcmTokens.forEach((token, index) => {
        console.log(`📱 FCM Token ${index + 1}: ${token.substring(0, 30)}...${token.substring(token.length - 10)}`);
      });
      
      console.log(`✅ ===== FCM TOKEN FETCH SUCCESS =====\n`);
      
      this.logger.log(`✅ Retrieved ${fcmTokens.length} FCM token(s)`);
      
      return fcmTokens;
    } catch (error) {
      console.log(`\n❌ ===== FCM TOKEN FETCH FAILED =====`);
      console.log(`🆔 Target ID: ${id}`);
      console.log(`🎯 Target Type: ${isBusiness ? 'BUSINESS' : 'USER'}`);
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Code: ${error.code}`);
      console.log(`❌ Error Status: ${error.response?.status}`);
      console.log(`❌ Error Response:`, error.response?.data);
      console.log(`❌ Error Headers:`, error.response?.headers);
      console.log(`❌ ===== FCM TOKEN FETCH FAILED END =====\n`);
      
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
    const url = `${this.EXPRESS_NOTIFICATION_URL}/hostelno/api/v1/send-hostel-booking-notification`;
    
    try {
      console.log(`\n🚀 ===== EXPRESS SERVER NOTIFICATION SEND START =====`);
      console.log(`🌐 URL: ${url}`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
      console.log(`📦 Payload Size: ${JSON.stringify(payload).length} bytes`);
      console.log(`📦 Content-Type: application/json`);
      
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Hostel-Notification-Service/1.0'
          },
          timeout: 30000 // 30 second timeout
        })
      );
      const endTime = Date.now();
      
      console.log(`⏱️ Express Server Response Time: ${endTime - startTime}ms`);
      console.log(`📊 Response Status: ${response.status}`);
      console.log(`📊 Response Status Text: ${response.statusText}`);
      console.log(`📊 Response Headers:`, response.headers);
      console.log(`📊 Response Data:`, JSON.stringify(response.data, null, 2));
      console.log(`✅ ===== EXPRESS SERVER NOTIFICATION SEND SUCCESS =====\n`);
      
      this.logger.log(`✅ Express server response:`, response.data);
    } catch (error) {
      console.log(`\n❌ ===== EXPRESS SERVER NOTIFICATION SEND FAILED =====`);
      console.log(`🌐 URL: ${url}`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
      console.log(`❌ Error Message: ${error.message}`);
      console.log(`❌ Error Code: ${error.code}`);
      console.log(`❌ Error Timeout: ${error.timeout}`);
      
      if (error.response) {
        console.log(`📊 Error Status: ${error.response.status}`);
        console.log(`📊 Error Status Text: ${error.response.statusText}`);
        console.log(`📊 Error Headers:`, error.response.headers);
        console.log(`📊 Error Data:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log(`📡 Request was made but no response received`);
        console.log(`📡 Request:`, error.request);
      } else {
        console.log(`⚙️ Error setting up request:`, error.message);
      }
      
      console.log(`❌ ===== EXPRESS SERVER NOTIFICATION SEND FAILED END =====\n`);
      
      this.logger.error(`❌ Failed to send to express server: ${error.message}`);
      if (error.response) {
        this.logger.error(`   Status: ${error.response.status}`);
        this.logger.error(`   Data:`, error.response.data);
      }
      throw error;
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
