# Hostel Notification Integration - Required Updates

## ✅ Updates Completed

### 1. **Fixed `getFcmTokens()` Method** ✅
**File:** `src/bookings/hostel-notification.service.ts`

**Issue:** API returns token objects, not strings
```typescript
// ❌ OLD (Wrong)
return response.data?.tokens || [];  // Returns objects

// ✅ NEW (Correct)
const tokenObjects = response.data?.tokens || [];
const fcmTokens = tokenObjects.map(obj => obj.fcmToken).filter(token => token);
return fcmTokens;  // Returns strings
```

**API Response Format:**
```json
{
  "tokens": [
    {
      "fcmToken": "eteC5j8N2006...",  // ← Extract this string
      "userId": "afc70db3-...",
      "businessId": null,
      "platform": "ios",
      "deviceId": "1C5C53F0-..."
    }
  ]
}
```

### 2. **Updated Endpoint URL** ✅
Changed from `https://kaha.com.np` to `https://dev.kaha.com.np`

### 3. **Added Logging** ✅
Added comprehensive logging for debugging:
- Token fetch attempts
- Number of tokens retrieved
- Error details

---

## ⏳ Updates Still Needed

### 1. **Load Booking with Room Relations** ⏳
**File:** `src/bookings/multi-guest-booking.service.ts` (Line ~323)

**Current:**
```typescript
let booking = await manager.findOne(MultiGuestBooking, {
  where: { id },
  relations: ['guests']  // ❌ Missing room data
});
```

**Required:**
```typescript
let booking = await manager.findOne(MultiGuestBooking, {
  where: { id },
  relations: ['guests', 'guests.bed', 'guests.bed.room']  // ✅ Include room data
});
```

**Do this in TWO places:**
- Line ~323: First findOne (by id)
- Line ~330: Second findOne (by bookingReference)

---

### 2. **Inject HostelNotificationService** ⏳
**File:** `src/bookings/multi-guest-booking.service.ts`

**Add import:**
```typescript
import { HostelNotificationService } from './hostel-notification.service';
```

**Add to constructor (after `businessIntegrationService`):**
```typescript
constructor(
  // ... existing dependencies
  private businessIntegrationService: BusinessIntegrationService,
  private hostelNotificationService: HostelNotificationService,  // ← Add this
) { }
```

---

### 3. **Update `confirmBooking` Method Signature** ⏳
**File:** `src/bookings/multi-guest-booking.service.ts` (Line ~317)

**Current:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string): Promise<ConfirmationResult>
```

**Required:**
```typescript
async confirmBooking(id: string, processedBy?: string, hostelId?: string, adminJwt?: any): Promise<ConfirmationResult>
```

---

### 4. **Add Notification Call in `confirmBooking`** ⏳
**File:** `src/bookings/multi-guest-booking.service.ts` (After booking confirmation, around line ~465)

**Add after the OLD notification block:**
```typescript
// 🆕 NEW: Send notification via express server
if (adminJwt) {
  try {
    this.logger.log(`📱 Sending notification via express server for: ${booking.bookingReference}`);
    await this.hostelNotificationService.notifyUserOfConfirmation(booking, adminJwt);
    this.logger.log(`✅ Notification sent successfully`);
  } catch (notifError) {
    this.logger.warn(`⚠️ Failed to send express notification: ${notifError.message}`);
    // Don't throw - notification failure shouldn't break booking flow
  }
}
```

---

### 5. **Update Controller to Pass JWT** ⏳
**File:** `src/bookings/bookings.controller.ts` (Line ~237)

**Current:**
```typescript
async confirmMultiGuestBooking(@Param('id') id: string, @Body() confirmDto: ConfirmBookingDto) {
  const result = await this.multiGuestBookingService.confirmBooking(id, confirmDto.processedBy);
  // ...
}
```

**Required:**
```typescript
async confirmMultiGuestBooking(
  @Param('id') id: string, 
  @Body() confirmDto: ConfirmBookingDto,
  @Request() req  // ← Add this
) {
  const result = await this.multiGuestBookingService.confirmBooking(
    id, 
    confirmDto.processedBy,
    undefined,  // hostelId
    req.user    // ← Pass JWT payload
  );
  // ...
}
```

---

## 🧪 Test Results

### **Test Script:** `test-hostel-notification.js`

**Status:** ✅ **PASSED**

**Results:**
```
✅ Login successful
✅ JWT decoded - User ID extracted
✅ FCM token retrieved (iOS device)
✅ Notification sent to express server
✅ Firebase confirmed delivery
   Message ID: projects/kaha-32386/messages/1762697633245547
```

**Notification Delivered:**
- **Title:** ✅ Booking Confirmed
- **Message:** Kaha Test Hostel confirmed your booking for Deluxe Room 101
- **Platform:** iOS
- **Tap Action:** Opens "My Bookings" page

---

## 📋 Implementation Checklist

- [x] Fix `getFcmTokens()` to extract token strings
- [x] Update endpoint URL to production
- [x] Add comprehensive logging
- [x] Test notification flow independently
- [ ] Load booking with room relations
- [ ] Inject `HostelNotificationService` into service
- [ ] Update `confirmBooking` method signature
- [ ] Add notification call in `confirmBooking`
- [ ] Update controller to pass JWT
- [ ] Test with real booking confirmation API
- [ ] Verify user receives notification on device

---

## 🚀 Next Steps

1. **Manual Updates:** Complete the 5 pending updates listed above
2. **Test Real API:** Confirm a booking via API and verify notification
3. **Expand Flows:** Add notifications for booking creation and cancellation
4. **Replace Hardcoded Names:** Implement real business/user name fetching

---

## 📝 Environment Variables

Add to `.env`:
```env
# Notification servers
KAHA_NOTIFICATION_URL=https://dev.kaha.com.np
EXPRESS_NOTIFICATION_URL=http://localhost:3008

# Optional: If kaha-notification requires auth
KAHA_API_KEY=your-api-key-here
```

---

## ✅ Success Criteria

- [x] Test script sends notification successfully
- [ ] Real booking confirmation triggers notification
- [ ] User receives notification on device
- [ ] Notification shows correct business name and room
- [ ] Tapping notification opens correct booking
- [ ] Booking flow completes even if notification fails

---

**Status:** Infrastructure ready, integration pending manual updates.
