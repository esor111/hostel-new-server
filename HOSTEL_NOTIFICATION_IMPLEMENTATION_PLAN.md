# Hostel Notification Integration - Implementation Plan

## ✅ What We've Created

### 1. **HostelNotificationService** (`src/bookings/hostel-notification.service.ts`)
A complete notification service with:
- ✅ FCM token retrieval from kaha-notification server
- ✅ Smart notification methods for all 3 flows
- ✅ Hardcoded names for initial testing
- ✅ Proper error handling (doesn't break booking flow)

### 2. **Module Registration** (`src/bookings/bookings.module.ts`)
- ✅ Added `HttpModule` import
- ✅ Added `HostelNotificationService` to providers

---

## 🎯 Next Steps - Manual Integration Required

### **Step 1: Add Import to Service**

**File:** `src/bookings/multi-guest-booking.service.ts`

**Add import at top:**
```typescript
import { HostelNotificationService } from './hostel-notification.service';
```

**Add to constructor (line 99, after `businessIntegrationService`):**
```typescript
private hostelNotificationService: HostelNotificationService,
```

---

### **Step 2: Update confirmBooking Method Signature**

**File:** `src/bookings/multi-guest-booking.service.ts`

**Find line 317:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string): Promise<ConfirmationResult> {
```

**Change to:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string, adminJwt?: any): Promise<ConfirmationResult> {
```

---

### **Step 3: Add Notification Call in confirmBooking**

**File:** `src/bookings/multi-guest-booking.service.ts`

**After line 465 (after the OLD notification try-catch block), add:**
```typescript
        // 🆕 NEW: Send notification via express server
        if (adminJwt) {
          try {
            this.logger.log(`📱 Sending notification via express server for: ${booking.bookingReference}`);
            await this.hostelNotificationService.notifyUserOfConfirmation(booking, adminJwt);
          } catch (notifError) {
            this.logger.warn(`⚠️ Failed to send express notification: ${notifError.message}`);
          }
        }
```

---

### **Step 4: Update Controller to Pass JWT**

**File:** `src/bookings/bookings.controller.ts`

**Find line 237 (confirmMultiGuestBooking method):**
```typescript
async confirmMultiGuestBooking(@Param('id') id: string, @Body() confirmDto: ConfirmBookingDto) {
  const result = await this.multiGuestBookingService.confirmBooking(id, confirmDto.processedBy);
```

**Change to:**
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

## 🧪 Testing

### **1. Start Both Servers**

**Terminal 1 - Hostel Server:**
```bash
cd hostel-new-server
npm run start:dev
```

**Terminal 2 - Notification Express Server:**
```bash
cd notification-express-server
npm run dev
```

**Terminal 3 - Kaha Notification Server:**
```bash
cd kaha-notification
npm run start:dev
```

### **2. Test Booking Confirmation**

```bash
# Confirm a booking (use admin token)
POST http://localhost:3007/booking-requests/multi-guest/:bookingId/confirm
Headers:
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  Content-Type: application/json
Body:
{
  "processedBy": "admin"
}
```

### **3. Expected Flow**

1. ✅ Admin calls confirm endpoint
2. ✅ Booking status → CONFIRMED
3. ✅ Service extracts `adminJwt.id` (businessId)
4. ✅ Service calls kaha-notification to get user FCM token
5. ✅ Service sends to express-server with hardcoded business name
6. ✅ Express server sends FCM notification
7. ✅ User receives: "Test Business confirmed your booking for test-room"

### **4. Check Logs**

**Hostel Server Logs:**
```
📱 Sending notification via express server for: BK-001
📱 Notification sent successfully
```

**Express Server Logs:**
```
📱 Sending confirmation notification for booking abc-123
🔍 Fetching FCM token for user: user_123
✅ FCM token found: ccd1YnkeTuizh...
📤 Sending payload: {...}
✅ Express server response: {...}
✅ Confirmation notification sent successfully
```

---

## 🔧 Environment Variables

### **Hostel Server** (`.env`)
```env
# Notification servers
KAHA_NOTIFICATION_URL=http://localhost:3000
EXPRESS_NOTIFICATION_URL=http://localhost:3008
```

---

## 📝 Implementation Summary

### **Files Created:**
1. ✅ `src/bookings/hostel-notification.service.ts` - Complete notification service

### **Files Modified:**
2. ✅ `src/bookings/bookings.module.ts` - Added HttpModule and service registration

### **Files to Modify (Manual):**
3. ⏳ `src/bookings/multi-guest-booking.service.ts` - Add import, inject service, add notification call
4. ⏳ `src/bookings/bookings.controller.ts` - Pass JWT to service

---

## 🚀 After Testing Works

Once the confirm booking notification works:

### **Expand to Other Flows:**

**1. User Creates Booking → Admin Notified**
Add in `createMultiGuestBooking()` method

**2. User Cancels Booking → Admin Notified**
Add in `cancelBooking()` method

### **Implement Real Names:**

Replace hardcoded names with actual API calls:
- `getBusinessName()` - Call business integration service
- `getUserName()` - Create user integration service

---

## ⚠️ Important Notes

1. **Error Handling:** Notification failures won't break booking flow
2. **Hardcoded Names:** Using "Test Business" and "Test User" for initial testing
3. **Room Name:** Using "test-room" hardcoded
4. **JWT Structure:** Assumes `JWT.id` is the businessId for admin tokens
5. **FCM Token:** Fetched from kaha-notification server using userId

---

## 🎯 Success Criteria

- ✅ Admin confirms booking
- ✅ User receives push notification
- ✅ Notification shows: "Test Business confirmed your booking for test-room"
- ✅ Tapping notification opens My Bookings page
- ✅ Booking flow completes successfully even if notification fails

---

**Ready to implement! Follow the manual steps above.** 🚀
