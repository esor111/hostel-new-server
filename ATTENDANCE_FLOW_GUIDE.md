# Hostel Attendance System - Complete Flow Guide

## Overview
The system tracks student check-ins/check-outs with JWT authentication. Two user types: **Students** (self check-in/out) and **Admins** (manage all students).

---

## Authentication

### JWT Token Types

**Student Token** (Business Token - Required):
```json
{
  "id": "afc70db3-6f43-4882-92fd-4715f25ffc95",  // userId
  "businessId": "biz_123456",                     // Hostel identifier
  "kahaId": "U-8C695E",
  "iat": 1761911511,
  "exp": 1761997911
}
```
**Note**: Students MUST switch to business profile before checking in/out

**Admin Token** (Business Token):
```json
{
  "id": "admin-uuid",
  "businessId": "biz_123456",  // Hostel identifier
  "kahaId": "A-123456",
  "iat": 1761911511
}
```

### Guards

1. **JwtAuthGuard** - Basic JWT validation (student endpoints)
2. **HostelAuthWithContextGuard** - JWT + hostel context (admin endpoints)

---

## Check-In Flow (Student)

### Endpoint
```
POST /hostel/api/v1/attendance/student/check-in
```

### Request
```bash
Headers:
  Authorization: Bearer <business_token>
  Content-Type: application/json

Body:
{
  "notes": "Going to library"  // Optional - hostelId auto-resolved from token
}
```

### Flow Steps

1. **JWT Validation** - `JwtAuthGuard` validates token, extracts `req.user.id` (userId) and `req.user.businessId`

2. **Hostel Resolution** - Controller calls `hostelService.findByBusinessId(user.businessId)`
   ```sql
   SELECT * FROM hostel_profiles WHERE businessId = ?
   ```
   Returns: `hostelId = "f95dd338-e812-4de4-bd9b-f68318b6ff5b"`

3. **Student Resolution** - Controller calls `studentsService.findByUserId(user.id, hostelId)`
   ```sql
   SELECT * FROM students WHERE userId = ? AND hostelId = ?
   ```
   Returns: `studentId = "020a47c8-87b5-4910-b5f0-7b42b918799f"

4. **Validations**:
   - ✓ Business Token required (`businessId` present)
   - ✓ Hostel exists for businessId
   - ✓ Student exists
   - ✓ Student is configured (`isConfigured = true`)
   - ✓ Student NOT already checked in (no active record with `status=CHECKED_IN, checkOutTime=null`)

5. **Check First of Day**:
   ```sql
   SELECT * FROM student_attendance 
   WHERE studentId = ? AND hostelId = ? AND date = '2025-11-10'
   ```

6. **Create Attendance Record** (if first of day):
   ```sql
   INSERT INTO student_attendance (studentId, hostelId, date, firstCheckInTime, type, notes)
   VALUES ('020a47c8-...', 'f95dd338-...', '2025-11-10', '08:30:00', 'MANUAL', 'Going to library')
   ```

7. **Create Check-In Record**:
   ```sql
   INSERT INTO student_checkin_checkout (studentId, hostelId, checkInTime, status, type, notes)
   VALUES ('020a47c8-...', 'f95dd338-...', '2025-11-10T08:30:00.000Z', 'CHECKED_IN', 'MANUAL', 'Going to library')
   ```

### Response
```json
{
  "success": true,
  "message": "Checked in successfully",
  "attendance": {
    "date": "2025-11-10",
    "firstCheckInTime": "08:30:00",
    "isFirstOfDay": true
  },
  "checkIn": {
    "id": "uuid",
    "checkInTime": "2025-11-10T08:30:00.000Z",
    "status": "CHECKED_IN"
  }
}
```

---

## Check-Out Flow (Student)

### Endpoint
```
POST /hostel/api/v1/attendance/student/check-out
```

### Request
```bash
Headers:
  Authorization: Bearer <business_token>

Body:
{
  "notes": "Returning from library"  // Optional - hostelId auto-resolved from token
}
```

### Flow Steps

1. **JWT Validation** - Same as check-in

2. **Student Resolution** - Same as check-in

3. **Validations**:
   - ✓ Student exists
   - ✓ Student IS currently checked in

4. **Find Active Check-In**:
   ```sql
   SELECT * FROM student_checkin_checkout
   WHERE studentId = ? AND status = 'CHECKED_IN' AND checkOutTime IS NULL
   ORDER BY checkInTime DESC LIMIT 1
   ```

5. **Update Check-Out**:
   ```sql
   UPDATE student_checkin_checkout
   SET checkOutTime = '2025-11-10T14:30:00.000Z', status = 'CHECKED_OUT'
   WHERE id = ?
   ```

6. **Calculate Duration**: `checkOutTime - checkInTime`

### Response
```json
{
  "success": true,
  "message": "Checked out successfully",
  "checkOut": {
    "id": "uuid",
    "checkInTime": "2025-11-10T08:30:00.000Z",
    "checkOutTime": "2025-11-10T14:30:00.000Z",
    "duration": "6 hours 0 minutes",
    "status": "CHECKED_OUT"
  }
}
```

---

## Admin Endpoints

### 1. Admin Check-In
```
POST /hostel/api/v1/attendance/check-in
Headers: Authorization: Bearer <business_token>
Body: { "studentId": "uuid", "hostelId": "uuid", "notes": "..." }
```

### 2. Current Status
```
GET /hostel/api/v1/attendance/current-status
Headers: Authorization: Bearer <business_token>
```
Returns: Who's currently checked in

### 3. Daily Report
```
GET /hostel/api/v1/attendance/reports/daily?date=2025-11-10
Headers: Authorization: Bearer <business_token>
```
Returns: Attendance summary for specific date

### 4. Activity Report
```
GET /hostel/api/v1/attendance/reports/activity?dateFrom=2025-11-01&dateTo=2025-11-10
Headers: Authorization: Bearer <business_token>
```
Returns: All check-in/out movements

### 5. Summary Report
```
GET /hostel/api/v1/attendance/reports/summary?dateFrom=2025-11-01&dateTo=2025-11-10
Headers: Authorization: Bearer <business_token>
```
Returns: Aggregated statistics

---

## Database Tables

### student_attendance
One record per student per day
```
- id, studentId, hostelId
- date (YYYY-MM-DD)
- firstCheckInTime (HH:MM:SS)
- type, notes
```

### student_checkin_checkout
Multiple records per day (each session)
```
- id, studentId, hostelId
- checkInTime (timestamp)
- checkOutTime (timestamp, nullable)
- status (CHECKED_IN | CHECKED_OUT)
- type, notes
```

### students
```
- id (studentId - primary key)
- userId (from JWT token)
- hostelId
- isConfigured, status
```

---

## Student Configuration with Auto Check-In

### Endpoint
```
POST /hostel/api/v1/students/configure
```

### Request
```bash
Headers:
  Authorization: Bearer <business_token>
  Content-Type: application/json

Body:
{
  "roomFee": 5000,
  "maintenanceFee": 1000,
  "advanceAmount": 10000,
  "guardian": { "name": "...", "phone": "..." },
  "course": "...",
  "institution": "..."
}
```

### Flow
1. **Validate Business Token** - Extract `userId` and `businessId`
2. **Resolve hostelId** - From `businessId`
3. **Resolve studentId** - From `userId` + `hostelId`
4. **Configure Student** - Set fees, create invoice, record advance payment
5. **Auto Check-In** - Automatically create initial check-in with type=INITIAL

### Auto Check-In Details
- **Triggered**: Automatically after successful student configuration
- **Type**: `INITIAL` (vs `MANUAL` for regular check-ins)
- **Creates**:
  - `student_attendance` record (date, firstCheckInTime, type=INITIAL)
  - `student_checkin_checkout` record (checkInTime, status=CHECKED_IN, type=INITIAL)
- **Failure Handling**: Logs warning but doesn't fail configuration
- **Notes**: "Auto check-in during student configuration"

---

## Key Scenarios

### Multiple Check-Ins Per Day
- First check-in creates `student_attendance` record
- Subsequent check-ins only create `student_checkin_checkout` records
- Each session tracked separately

### Business Token Required Error
```json
{
  "statusCode": 400,
  "message": "Business token required. Please switch to hostel profile before checking in."
}
```

### Hostel Not Found Error
```json
{
  "statusCode": 404,
  "message": "Hostel not found for businessId: biz_123456"
}
```

### Student Not Found Error
```json
{
  "statusCode": 404,
  "message": "No student found for user U-8C695E in this hostel. Please contact admin."
}
```

### Already Checked In Error
```json
{
  "statusCode": 400,
  "message": "Student is already checked in. Please check out first."
}
```

### Not Checked In Error
```json
{
  "statusCode": 400,
  "message": "Student is not currently checked in. Cannot check out."
}
```

---

## Summary

### ✅ **Key Changes Implemented**

1. **Business Token Required**: Students must switch to business profile before check-in/out
2. **Auto-Resolution**: `userId` + `businessId` from token → `studentId` + `hostelId`
3. **Simplified Request**: Only optional `notes` in request body (no `hostelId`)
4. **Student Configuration**: Uses Business Token instead of actual IDs
5. **Auto Check-In**: Automatic initial check-in after student configuration

### 🔄 **Request Flow**

**Before** (Manual IDs):
```json
POST /attendance/student/check-in
Headers: Authorization: Bearer <user_token>
Body: { "hostelId": "uuid", "notes": "..." }
```

**After** (Auto-resolved):
```json
POST /attendance/student/check-in
Headers: Authorization: Bearer <business_token>
Body: { "notes": "..." }  // hostelId auto-resolved
```

### 📊 **Database Impact**

- **student_attendance**: Tracks daily attendance (one per day)
- **student_checkin_checkout**: Tracks individual sessions (multiple per day)
- **INITIAL** type: Auto check-in after configuration
- **MANUAL** type: Regular student check-ins

### 🛡️ **Security**

- JWT validation required
- Business context verification
- Hostel access control
- Student record validation
- Proper error handling

---

**Updated**: November 10, 2025
**Status**: All changes implemented and documented

## Code References

**Controllers**:
- `src/attendance/attendance.controller.ts`
  - Lines 27-63: Student check-in (Business Token flow)
  - Lines 81-117: Student check-out (Business Token flow)
- `src/students/students.controller.ts`
  - Lines 337-372: Student configuration (Business Token flow)

**Services**:
- `src/attendance/attendance.service.ts`
  - Lines 32-115: Check-in logic
  - Lines 120-170: Check-out logic
  - Lines 431-463: Initial check-in (auto after configuration)
- `src/students/students.service.ts`
  - Lines 1215-1223: Auto check-in call after configuration
- `src/hostel/hostel.service.ts`
  - Lines 32-51: `findByBusinessId()` method

**DTOs**:
- `src/attendance/dto/student-check-in.dto.ts` - Removed hostelId
- `src/attendance/dto/student-check-out.dto.ts` - Removed hostelId

**Guards**:
- `src/auth/guards/jwt-auth.guard.ts` - Basic JWT validation
- `src/auth/guards/hostel-auth-with-context.guard.ts` - Admin endpoints
