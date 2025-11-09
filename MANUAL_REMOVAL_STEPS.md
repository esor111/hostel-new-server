# Manual Steps to Remove OLD Notification System

## ✅ Step 1: Update `bookings.module.ts` (COMPLETED)

Already done! ✅
- Removed `NotificationCommunicationModule` import
- Removed from imports array

---

## ⏳ Step 2: Update `multi-guest-booking.service.ts`

### **A. Update Imports (Line 13-15)**

**Find:**
```typescript
import { NotificationCommunicationService } from '../notification-communication/notification-communication.service';
import { ConfigService } from '@nestjs/config';
import { BusinessIntegrationService } from '../hostel/services/business-integration.service';
```

**Replace with:**
```typescript
import { ConfigService } from '@nestjs/config';
import { BusinessIntegrationService } from '../hostel/services/business-integration.service';
import { HostelNotificationService } from './hostel-notification.service';
```

---

### **B. Update Constructor (Line 94-99)**

**Find:**
```typescript
    private dataSource: DataSource,
    private bedSyncService: BedSyncService,
    private validationService: BookingValidationService,
    private notificationService: NotificationCommunicationService,
    private configService: ConfigService,
    private businessIntegrationService: BusinessIntegrationService,
  ) { }
```

**Replace with:**
```typescript
    private dataSource: DataSource,
    private bedSyncService: BedSyncService,
    private validationService: BookingValidationService,
    private configService: ConfigService,
    private businessIntegrationService: BusinessIntegrationService,
    private hostelNotificationService: HostelNotificationService,
  ) { }
```

---

### **C. Delete OLD Notification Block 1 (Line ~179-191)**

**Location:** Inside `createMultiGuestBooking` method

**DELETE THIS ENTIRE BLOCK:**
```typescript
        // Trigger notification for new booking request (to hostel admins)
        try {
          await this.notificationService.sendBookingRequestNotification({
            bookingId: savedBooking.id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: bookingData.checkInDate,
            contactName: bookingData.contactPerson.name,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: bookingData.guests.length
          });
          this.logger.log(`📱 Notification sent for new booking: ${savedBooking.bookingReference}`);
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking request notification: ${notificationError.message}`);
        }
```

---

### **D. Replace OLD Notification Block 2 (Line ~454-470)**

**Location:** Inside `confirmBooking` method

**FIND THIS BLOCK:**
```typescript
        // Trigger notification for booking confirmation (to contact person)
        try {
          this.logger.log(`📱 Attempting to send booking confirmation notification for: ${booking.bookingReference}`);
          await this.notificationService.sendBookingConfirmedNotification({
            bookingId: booking.id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: booking.checkInDate ? booking.checkInDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            contactName: booking.contactName,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: confirmedGuestCount
          });
          this.logger.log(`📱 Booking confirmation notification sent successfully: ${booking.bookingReference}`);
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking confirmation notification: ${notificationError.message}`);
          // Don't let notification failure cause transaction rollback
        }
```

**REPLACE WITH:**
```typescript
        // 🆕 NEW: Send notification via express server
        if (adminJwt) {
          try {
            this.logger.log(`📱 Sending notification via express server for: ${booking.bookingReference}`);
            await this.hostelNotificationService.notifyUserOfConfirmation(booking, adminJwt);
            this.logger.log(`✅ Notification sent successfully`);
          } catch (notifError) {
            this.logger.warn(`⚠️ Failed to send notification: ${notifError.message}`);
            // Don't let notification failure cause transaction rollback
          }
        }
```

---

### **E. Delete OLD Notification Block 3 (Line ~1310-1323)**

**Location:** Inside `approveBooking` method

**DELETE THIS ENTIRE BLOCK:**
```typescript
        // Trigger notification for booking approval (to contact person)
        try {
          await this.notificationService.sendBookingApprovedNotification({
            bookingId: id,
            contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
            hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
            checkInDate: booking.checkInDate,
            contactName: booking.contactName,
            hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
            guestCount: booking.totalGuests
          });
        } catch (notificationError) {
          this.logger.warn(`⚠️ Failed to send booking approval notification: ${notificationError.message}`);
        }
```

---

### **F. Delete OLD Notification Block 4 (Line ~1395-1408)**

**Location:** Inside `rejectBooking` method

**DELETE THIS ENTIRE BLOCK:**
```typescript
      // Send rejection notification
      try {
        await this.notificationService.sendBookingRejectedNotification({
          bookingId: booking.id,
          contactPersonId: 'placeholder-user-id', // TODO: Map contact person to actual user ID
          hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
          checkInDate: booking.checkInDate,
          contactName: booking.contactName,
          hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
          rejectionReason: dto.reason
        });
      } catch (notificationError) {
        this.logger.warn(`⚠️ Failed to send rejection notification: ${notificationError.message}`);
      }
```

---

### **G. Update `confirmBooking` Method Signature (Line ~317)**

**FIND:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string): Promise<ConfirmationResult> {
```

**REPLACE WITH:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string, adminJwt?: any): Promise<ConfirmationResult> {
```

---

### **H. Add Room Relations (Line ~323 and ~330)**

**FIND (Line ~323):**
```typescript
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests']
        });
```

**REPLACE WITH:**
```typescript
        let booking = await manager.findOne(MultiGuestBooking, {
          where: { id },
          relations: ['guests', 'guests.bed', 'guests.bed.room']
        });
```

**FIND (Line ~330):**
```typescript
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: id },
            relations: ['guests']
          });
```

**REPLACE WITH:**
```typescript
          booking = await manager.findOne(MultiGuestBooking, {
            where: { bookingReference: id },
            relations: ['guests', 'guests.bed', 'guests.bed.room']
          });
```

---

## ⏳ Step 3: Update `bookings.controller.ts`

### **Update `confirmMultiGuestBooking` Method (Line ~237)**

**FIND:**
```typescript
  async confirmMultiGuestBooking(@Param('id') id: string, @Body() confirmDto: ConfirmBookingDto) {
    const result = await this.multiGuestBookingService.confirmBooking(id, confirmDto.processedBy);
```

**REPLACE WITH:**
```typescript
  async confirmMultiGuestBooking(
    @Param('id') id: string, 
    @Body() confirmDto: ConfirmBookingDto,
    @Request() req
  ) {
    const result = await this.multiGuestBookingService.confirmBooking(
      id, 
      confirmDto.processedBy,
      undefined,
      req.user
    );
```

---

## ✅ Summary of Changes

### **Files Modified:**
1. ✅ `bookings.module.ts` - Removed OLD module
2. ⏳ `multi-guest-booking.service.ts` - 8 changes needed
3. ⏳ `bookings.controller.ts` - 1 change needed

### **What's Being Removed:**
- ❌ `NotificationCommunicationService` (4 usages)
- ❌ All placeholder user IDs
- ❌ Manual data passing (hostelName, checkInDate, etc.)

### **What's Being Added:**
- ✅ `HostelNotificationService` 
- ✅ Real FCM token integration
- ✅ Express server integration
- ✅ Room data loading

---

## 🧪 After Completion - Test

1. Start servers:
   ```bash
   # Terminal 1
   cd hostel-new-server
   npm run start:dev
   
   # Terminal 2
   cd notification-express-server
   npm run dev
   ```

2. Test with real booking confirmation API

3. Verify notification received on device

---

**Follow the steps above carefully, one at a time!** 🚀
