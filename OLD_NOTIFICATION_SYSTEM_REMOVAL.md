# OLD Notification System - Components to Remove

## 📋 **Summary of OLD System**

The old notification system uses `NotificationCommunicationService` which:
- ❌ Uses placeholder user IDs
- ❌ Requires manual data passing (hostelName, checkInDate, etc.)
- ❌ Doesn't integrate with express notification server
- ❌ Has incomplete implementation

**New System:** `HostelNotificationService` 
- ✅ Fetches real FCM tokens
- ✅ Integrates with express server
- ✅ Uses real booking data
- ✅ Proper error handling

---

## 🗑️ **Components to Remove**

### **1. Remove from `bookings.module.ts`**

**File:** `src/bookings/bookings.module.ts`

**Remove import:**
```typescript
import { NotificationCommunicationModule } from '../notification-communication/notification-communication.module';
```

**Remove from imports array:**
```typescript
imports: [
  // ... other imports
  NotificationCommunicationModule, // ← REMOVE THIS LINE
  // ... other imports
],
```

---

### **2. Remove from `multi-guest-booking.service.ts`**

**File:** `src/bookings/multi-guest-booking.service.ts`

#### **A. Remove Import (Line 13)**
```typescript
import { NotificationCommunicationService } from '../notification-communication/notification-communication.service';
```

#### **B. Remove from Constructor (Line 97)**
```typescript
constructor(
  // ... other dependencies
  private notificationService: NotificationCommunicationService, // ← REMOVE THIS LINE
  // ... other dependencies
) { }
```

#### **C. Remove OLD Notification Calls**

**Location 1: Line ~182 (createMultiGuestBooking method)**
```typescript
// REMOVE THIS ENTIRE BLOCK:
try {
  await this.notificationService.sendBookingRequestNotification({
    bookingId: savedBooking.id,
    contactPersonId: 'placeholder-user-id',
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

**Location 2: Line ~457 (confirmBooking method)**
```typescript
// REMOVE THIS ENTIRE BLOCK:
try {
  this.logger.log(`📱 Attempting to send booking confirmation notification for: ${booking.bookingReference}`);
  await this.notificationService.sendBookingConfirmedNotification({
    bookingId: booking.id,
    contactPersonId: 'placeholder-user-id',
    hostelId: hostelId || this.configService.get('HOSTEL_BUSINESS_ID', 'default-hostel-id'),
    checkInDate: booking.checkInDate ? booking.checkInDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    contactName: booking.contactName,
    hostelName: this.configService.get('HOSTEL_NAME', 'Kaha Hostel'),
    guestCount: confirmedGuestCount
  });
  this.logger.log(`📱 Booking confirmation notification sent successfully: ${booking.bookingReference}`);
} catch (notificationError) {
  this.logger.warn(`⚠️ Failed to send booking confirmation notification: ${notificationError.message}`);
}
```

**Location 3: Line ~1313 (approveBooking method)**
```typescript
// REMOVE THIS ENTIRE BLOCK:
try {
  await this.notificationService.sendBookingApprovedNotification({
    bookingId: id,
    contactPersonId: 'placeholder-user-id',
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

**Location 4: Line ~1398 (rejectBooking method)**
```typescript
// REMOVE THIS ENTIRE BLOCK:
try {
  await this.notificationService.sendBookingRejectedNotification({
    bookingId: booking.id,
    contactPersonId: 'placeholder-user-id',
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

## ✅ **What to Keep**

### **Keep the NEW System:**
- ✅ `HostelNotificationService` (already created)
- ✅ `HttpModule` import in `bookings.module.ts`
- ✅ `HostelNotificationService` in providers array

---

## 🔄 **Replacement Plan**

After removing OLD system, add NEW system calls:

### **1. In `confirmBooking` method (Line ~457)**
**Replace OLD notification with:**
```typescript
// 🆕 NEW: Send notification via express server
if (adminJwt) {
  try {
    this.logger.log(`📱 Sending notification via express server for: ${booking.bookingReference}`);
    await this.hostelNotificationService.notifyUserOfConfirmation(booking, adminJwt);
    this.logger.log(`✅ Notification sent successfully`);
  } catch (notifError) {
    this.logger.warn(`⚠️ Failed to send notification: ${notifError.message}`);
  }
}
```

### **2. Future: Add for other flows**
- `createMultiGuestBooking` → `notifyAdminOfNewBooking()`
- `cancelBooking` → `notifyAdminOfCancellation()`

---

## 📝 **Step-by-Step Removal Process**

1. ✅ Remove `NotificationCommunicationModule` from `bookings.module.ts` imports
2. ✅ Remove `NotificationCommunicationService` import from `multi-guest-booking.service.ts`
3. ✅ Remove `notificationService` from constructor
4. ✅ Remove all 4 OLD notification call blocks
5. ✅ Add `HostelNotificationService` import
6. ✅ Add `hostelNotificationService` to constructor
7. ✅ Add NEW notification call in `confirmBooking`

---

## ⚠️ **Important Notes**

- **Don't delete the `notification-communication` folder** - it might be used by other modules
- **Only remove references in the bookings module**
- **Test after each removal** to ensure nothing breaks
- **The NEW system is already tested and working** ✅

---

## 🎯 **Benefits of Removal**

1. ✅ No more placeholder user IDs
2. ✅ Cleaner code
3. ✅ Real FCM token integration
4. ✅ Proper express server integration
5. ✅ Better error handling
6. ✅ Actual room data in notifications

---

**Ready to remove? Follow the step-by-step process above!** 🚀
