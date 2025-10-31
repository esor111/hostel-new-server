# Student Attendance & Check-In/Out System - Requirements Document

## 📋 Overview

A standalone attendance tracking system for hostel students that captures:
1. **Daily Attendance** - Was the student present on a given day?
2. **Check-In/Out Activity** - When did the student enter/exit the hostel?

This system is **completely isolated** from billing, payments, room management, and other modules.

---

## 🎯 Core Concepts

### Concept 1: Attendance (Daily Presence)
- **Purpose:** Track if a student was present on a specific date
- **Granularity:** ONE record per student per day
- **Captured Data:** Date + First check-in time of that day
- **Example:** "Was John present on Jan 15, 2025?" → YES (first checked in at 8:30 AM)

### Concept 2: Check-In/Out (Activity Log)
- **Purpose:** Track ALL entry/exit movements throughout the day
- **Granularity:** MULTIPLE records per student per day
- **Captured Data:** Every check-in and check-out timestamp pair
- **Example:** "When did John enter/exit on Jan 15?" → 
  - Entry 1: 8:30 AM - 12:00 PM (3h 30m)
  - Entry 2: 2:00 PM - 6:00 PM (4h)

---

## 👥 User Roles & Permissions

### Students
**Can Do:**
- Check themselves IN
- Check themselves OUT
- View their own attendance history
- View their own check-in/out activity log

**Cannot Do:**
- Check in/out other students
- View other students' data
- Access admin reports
- Manually create/edit attendance records

### Admin
**Can Do:**
- View ALL students' attendance reports
- View ALL students' check-in/out activity
- Filter reports by date range, student, status
- Export reports
- View current status (who's checked in right now)

**Cannot Do:**
- Manually check in/out students (only students can do this)
- Edit historical attendance records

---

## 🔑 Authentication & Authorization (Future Implementation)

### Phase 1: No Auth (Testing)
- All endpoints accept `studentId` and `hostelId` as parameters
- No JWT token validation
- Direct database operations
- Used for thorough API testing

**Example Request (No Auth):**
```
POST /attendance/check-in
Body: {
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "hostelId": "660e8400-e29b-41d4-a716-446655440001"
}
```

### Phase 2: With Auth (Production)
- JWT token required in Authorization header
- Token contains: `userId` (for students) OR `businessId` (for admin)
- System resolves IDs automatically

**Student Flow:**
```
POST /attendance/check-in
Headers: { Authorization: "Bearer <token>" }
Token payload: { userId: "user_abc123", ... }

Backend Process:
1. Extract userId from JWT token
2. Query: SELECT id FROM students WHERE userId = 'user_abc123' AND hostelId = ?
3. Get studentId from query result
4. Use studentId for attendance operations
```

**Admin Flow:**
```
GET /attendance/reports
Headers: { Authorization: "Bearer <token>" }
Token payload: { businessId: "biz_xyz789", ... }

Backend Process:
1. Extract businessId from JWT token
2. Query: SELECT id FROM hostel_profiles WHERE businessId = 'biz_xyz789'
3. Get hostelId from query result
4. Use hostelId to filter attendance reports
```

### Key Understanding: ID Mapping

**Student Context:**
- `userId` = User account ID (from auth system, stored in JWT)
- `studentId` = Student record ID (auto-generated UUID in students table)
- Relationship: `students.userId` column links them
- Example: userId "user_abc123" → studentId "550e8400-e29b-41d4-a716-446655440000"

**Hostel Context:**
- `businessId` = Business account ID (from auth system, stored in JWT)
- `hostelId` = Hostel record ID (auto-generated UUID in hostel_profiles table)
- Relationship: `hostel_profiles.businessId` column links them
- Example: businessId "biz_xyz789" → hostelId "660e8400-e29b-41d4-a716-446655440001"

---

## 📊 Data Models

### Table 1: student_attendance (Daily Presence)

**Purpose:** Track which students were present on which days

**Fields:**
- `id` - UUID, primary key, auto-generated
- `studentId` - UUID, references students table
- `hostelId` - UUID, references hostel_profiles table
- `date` - Date only (e.g., "2025-01-15")
- `firstCheckInTime` - Time only (e.g., "08:30:00") in Nepal timezone
- `type` - Enum: "INITIAL" or "MANUAL"
- `notes` - Text, optional
- `createdAt` - Timestamp, auto-generated
- `updatedAt` - Timestamp, auto-updated

**Constraints:**
- Unique: (studentId, hostelId, date) - One attendance record per student per day
- Index: (studentId, date) for fast queries
- Index: (hostelId, date) for report generation

**Example Records:**
```
Record 1:
{
  id: "770e8400-e29b-41d4-a716-446655440002",
  studentId: "550e8400-e29b-41d4-a716-446655440000",
  hostelId: "660e8400-e29b-41d4-a716-446655440001",
  date: "2025-01-15",
  firstCheckInTime: "08:30:00",
  type: "MANUAL",
  notes: null
}

Record 2 (Initial check-in during configuration):
{
  id: "880e8400-e29b-41d4-a716-446655440003",
  studentId: "550e8400-e29b-41d4-a716-446655440000",
  hostelId: "660e8400-e29b-41d4-a716-446655440001",
  date: "2025-01-10",
  firstCheckInTime: "14:00:00",
  type: "INITIAL",
  notes: "Auto check-in during student configuration"
}
```

### Table 2: student_checkin_checkout (Activity Log)

**Purpose:** Track every entry and exit movement

**Fields:**
- `id` - UUID, primary key, auto-generated
- `studentId` - UUID, references students table
- `hostelId` - UUID, references hostel_profiles table
- `checkInTime` - Full timestamp (e.g., "2025-01-15 08:30:00") in Nepal timezone
- `checkOutTime` - Full timestamp, nullable (null = currently checked in)
- `status` - Enum: "CHECKED_IN" or "CHECKED_OUT"
- `type` - Enum: "INITIAL" or "MANUAL"
- `notes` - Text, optional
- `createdAt` - Timestamp, auto-generated
- `updatedAt` - Timestamp, auto-updated

**Constraints:**
- Index: (studentId, status) for finding active check-ins
- Index: (hostelId, checkInTime) for report generation
- Index: (studentId, checkInTime) for student history

**Example Records:**
```
Record 1 (Currently checked in):
{
  id: "990e8400-e29b-41d4-a716-446655440004",
  studentId: "550e8400-e29b-41d4-a716-446655440000",
  hostelId: "660e8400-e29b-41d4-a716-446655440001",
  checkInTime: "2025-01-15 08:30:00",
  checkOutTime: null,
  status: "CHECKED_IN",
  type: "MANUAL",
  notes: null
}

Record 2 (Completed session):
{
  id: "aa0e8400-e29b-41d4-a716-446655440005",
  studentId: "550e8400-e29b-41d4-a716-446655440000",
  hostelId: "660e8400-e29b-41d4-a716-446655440001",
  checkInTime: "2025-01-14 08:00:00",
  checkOutTime: "2025-01-14 18:00:00",
  status: "CHECKED_OUT",
  type: "MANUAL",
  notes: null
}

Record 3 (Second session same day):
{
  id: "bb0e8400-e29b-41d4-a716-446655440006",
  studentId: "550e8400-e29b-41d4-a716-446655440000",
  hostelId: "660e8400-e29b-41d4-a716-446655440001",
  checkInTime: "2025-01-14 20:00:00",
  checkOutTime: "2025-01-14 22:30:00",
  status: "CHECKED_OUT",
  type: "MANUAL",
  notes: "Evening study session"
}
```

---

## 🔄 Business Logic & Workflows

### Workflow 1: Initial Check-In (Auto during Configuration)

**Trigger:** Admin configures a new student

**Process:**
1. Admin completes student configuration
2. System automatically creates TWO records:
   - One in `student_attendance` table (marks today as present)
   - One in `student_checkin_checkout` table (marks as checked in)
3. Both records have `type = "INITIAL"`
4. Student is now "checked in" and "present for today"

**Example:**
```
Admin configures student "John Doe" on Jan 10, 2025 at 2:00 PM

Result:
- student_attendance: { date: "2025-01-10", firstCheckInTime: "14:00:00", type: "INITIAL" }
- student_checkin_checkout: { checkInTime: "2025-01-10 14:00:00", checkOutTime: null, type: "INITIAL" }
```

### Workflow 2: Student Check-In (First time of the day)

**Trigger:** Student clicks "Check In" button

**Validation:**
1. Student must exist
2. Student must be configured (isConfigured = true, status != "Pending Configuration")
3. Student must NOT be currently checked in (no active check-in record)
4. Check if attendance exists for today

**Process:**

**Case A: First check-in of the day**
1. No attendance record exists for today
2. Create attendance record (date, firstCheckInTime)
3. Create check-in/out record (checkInTime, checkOutTime=null)
4. Return success

**Case B: Subsequent check-in of the day**
1. Attendance record already exists for today
2. Only create check-in/out record (checkInTime, checkOutTime=null)
3. Return success

**Example (First check-in):**
```
Student "John Doe" checks in on Jan 15, 2025 at 8:30 AM

Request:
POST /attendance/check-in
Body: { studentId: "550e...", hostelId: "660e..." }

Result:
- student_attendance: { date: "2025-01-15", firstCheckInTime: "08:30:00", type: "MANUAL" }
- student_checkin_checkout: { checkInTime: "2025-01-15 08:30:00", checkOutTime: null, type: "MANUAL" }

Response:
{
  success: true,
  message: "Checked in successfully",
  attendance: {
    date: "2025-01-15",
    firstCheckInTime: "08:30:00",
    isFirstOfDay: true
  },
  checkIn: {
    id: "990e...",
    checkInTime: "2025-01-15 08:30:00",
    status: "CHECKED_IN"
  }
}
```

**Example (Second check-in same day):**
```
Student "John Doe" checks in again on Jan 15, 2025 at 2:00 PM
(Already checked in at 8:30 AM and checked out at 12:00 PM)

Request:
POST /attendance/check-in
Body: { studentId: "550e...", hostelId: "660e..." }

Result:
- student_attendance: No new record (already exists for today)
- student_checkin_checkout: { checkInTime: "2025-01-15 14:00:00", checkOutTime: null, type: "MANUAL" }

Response:
{
  success: true,
  message: "Checked in successfully",
  attendance: {
    date: "2025-01-15",
    firstCheckInTime: "08:30:00",
    isFirstOfDay: false
  },
  checkIn: {
    id: "cc0e...",
    checkInTime: "2025-01-15 14:00:00",
    status: "CHECKED_IN"
  }
}
```

### Workflow 3: Student Check-Out

**Trigger:** Student clicks "Check Out" button

**Validation:**
1. Student must exist
2. Student must be currently checked in (active check-in record exists)

**Process:**
1. Find the active check-in record (checkOutTime = null)
2. Update checkOutTime to current timestamp
3. Update status to "CHECKED_OUT"
4. Calculate duration
5. Return success

**Example:**
```
Student "John Doe" checks out on Jan 15, 2025 at 12:00 PM
(Checked in at 8:30 AM)

Request:
POST /attendance/check-out
Body: { studentId: "550e...", hostelId: "660e..." }

Result:
- student_checkin_checkout record updated:
  {
    checkInTime: "2025-01-15 08:30:00",
    checkOutTime: "2025-01-15 12:00:00",  // Updated
    status: "CHECKED_OUT"  // Updated
  }

Response:
{
  success: true,
  message: "Checked out successfully",
  checkOut: {
    id: "990e...",
    checkInTime: "2025-01-15 08:30:00",
    checkOutTime: "2025-01-15 12:00:00",
    duration: "3h 30m",
    status: "CHECKED_OUT"
  }
}
```

### Workflow 4: Student Views Own History

**Trigger:** Student requests their attendance history

**Process:**
1. Query both tables filtered by studentId
2. Apply optional filters (date range)
3. Return combined data

**Example:**
```
Request:
GET /attendance/my-history?dateFrom=2025-01-01&dateTo=2025-01-31
Headers: { studentId: "550e..." } (or from JWT in Phase 2)

Response:
{
  studentId: "550e...",
  studentName: "John Doe",
  dateRange: { from: "2025-01-01", to: "2025-01-31" },
  summary: {
    totalDaysPresent: 20,
    totalCheckIns: 45,
    totalDuration: "180h 30m",
    averageDurationPerDay: "9h 1m"
  },
  attendance: [
    {
      date: "2025-01-15",
      firstCheckInTime: "08:30:00",
      wasPresent: true,
      checkInOutSessions: [
        {
          checkInTime: "2025-01-15 08:30:00",
          checkOutTime: "2025-01-15 12:00:00",
          duration: "3h 30m"
        },
        {
          checkInTime: "2025-01-15 14:00:00",
          checkOutTime: "2025-01-15 18:00:00",
          duration: "4h"
        }
      ],
      totalDurationForDay: "7h 30m"
    },
    {
      date: "2025-01-14",
      firstCheckInTime: "08:00:00",
      wasPresent: true,
      checkInOutSessions: [
        {
          checkInTime: "2025-01-14 08:00:00",
          checkOutTime: "2025-01-14 18:00:00",
          duration: "10h"
        }
      ],
      totalDurationForDay: "10h"
    }
  ]
}
```

---

## 📈 Admin Reports

### Report 1: Daily Attendance Report

**Purpose:** See which students were present on a specific date

**Query:** student_attendance table

**Example Request:**
```
GET /attendance/reports/daily?date=2025-01-15&hostelId=660e...

Response:
{
  hostelId: "660e...",
  hostelName: "Sunrise Hostel",
  date: "2025-01-15",
  summary: {
    totalStudents: 50,
    totalPresent: 45,
    totalAbsent: 5,
    attendanceRate: "90%"
  },
  presentStudents: [
    {
      studentId: "550e...",
      studentName: "John Doe",
      firstCheckInTime: "08:30:00",
      roomNumber: "101"
    },
    {
      studentId: "551e...",
      studentName: "Jane Smith",
      firstCheckInTime: "07:45:00",
      roomNumber: "102"
    }
  ],
  absentStudents: [
    {
      studentId: "552e...",
      studentName: "Bob Wilson",
      roomNumber: "103",
      lastSeenDate: "2025-01-14"
    }
  ]
}
```

### Report 2: Check-In/Out Activity Report

**Purpose:** See all entry/exit movements for a date or date range

**Query:** student_checkin_checkout table

**Example Request:**
```
GET /attendance/reports/activity?dateFrom=2025-01-15&dateTo=2025-01-15&hostelId=660e...

Response:
{
  hostelId: "660e...",
  dateRange: { from: "2025-01-15", to: "2025-01-15" },
  summary: {
    totalCheckIns: 52,
    totalCheckOuts: 48,
    currentlyCheckedIn: 4,
    averageDuration: "8h 15m"
  },
  activities: [
    {
      studentId: "550e...",
      studentName: "John Doe",
      sessions: [
        {
          checkInTime: "2025-01-15 08:30:00",
          checkOutTime: "2025-01-15 12:00:00",
          duration: "3h 30m"
        },
        {
          checkInTime: "2025-01-15 14:00:00",
          checkOutTime: "2025-01-15 18:00:00",
          duration: "4h"
        }
      ],
      totalDuration: "7h 30m"
    }
  ]
}
```

### Report 3: Current Status Report

**Purpose:** See who is currently checked in right now

**Query:** student_checkin_checkout WHERE checkOutTime IS NULL

**Example Request:**
```
GET /attendance/current-status?hostelId=660e...

Response:
{
  hostelId: "660e...",
  timestamp: "2025-01-15 15:30:00",
  currentlyCheckedIn: 12,
  students: [
    {
      studentId: "550e...",
      studentName: "John Doe",
      roomNumber: "101",
      checkInTime: "2025-01-15 14:00:00",
      durationSoFar: "1h 30m"
    },
    {
      studentId: "553e...",
      studentName: "Alice Brown",
      roomNumber: "104",
      checkInTime: "2025-01-15 08:00:00",
      durationSoFar: "7h 30m"
    }
  ]
}
```

### Report 4: Date Range Summary

**Purpose:** Aggregate statistics over a period

**Example Request:**
```
GET /attendance/reports/summary?dateFrom=2025-01-01&dateTo=2025-01-31&hostelId=660e...

Response:
{
  hostelId: "660e...",
  dateRange: { from: "2025-01-01", to: "2025-01-31" },
  summary: {
    totalDays: 31,
    averageAttendanceRate: "88%",
    totalCheckIns: 1240,
    totalCheckOuts: 1235,
    averageCheckInsPerDay: 40,
    mostActiveDay: {
      date: "2025-01-15",
      checkIns: 52
    },
    leastActiveDay: {
      date: "2025-01-05",
      checkIns: 28
    }
  },
  topStudents: [
    {
      studentId: "550e...",
      studentName: "John Doe",
      daysPresent: 30,
      totalCheckIns: 65,
      totalDuration: "240h",
      attendanceRate: "96.7%"
    }
  ],
  dailyBreakdown: [
    {
      date: "2025-01-15",
      present: 45,
      absent: 5,
      checkIns: 52,
      checkOuts: 48
    }
  ]
}
```

### Report 5: Student-Specific Report (Admin View)

**Purpose:** Admin views detailed history of a specific student

**Example Request:**
```
GET /attendance/reports/student/550e...?dateFrom=2025-01-01&dateTo=2025-01-31&hostelId=660e...

Response:
{
  student: {
    studentId: "550e...",
    name: "John Doe",
    email: "john@example.com",
    roomNumber: "101"
  },
  dateRange: { from: "2025-01-01", to: "2025-01-31" },
  summary: {
    daysPresent: 28,
    daysAbsent: 3,
    totalCheckIns: 65,
    totalDuration: "224h 30m",
    averageDurationPerDay: "8h 1m",
    attendanceRate: "90.3%"
  },
  dailyRecords: [
    {
      date: "2025-01-15",
      firstCheckInTime: "08:30:00",
      sessions: [
        { checkInTime: "08:30:00", checkOutTime: "12:00:00", duration: "3h 30m" },
        { checkInTime: "14:00:00", checkOutTime: "18:00:00", duration: "4h" }
      ],
      totalDuration: "7h 30m"
    }
  ]
}
```

---

## 🚫 Validation Rules

### Check-In Validations

**Rule 1: Student Must Exist**
```
Error: Student not found
HTTP Status: 404
Message: "Student with ID 550e... does not exist"
```

**Rule 2: Student Must Be Configured**
```
Error: Student not configured
HTTP Status: 400
Message: "Student must be configured before checking in"
Condition: student.isConfigured = false OR student.status = "Pending Configuration"
```

**Rule 3: Student Must NOT Be Currently Checked In**
```
Error: Already checked in
HTTP Status: 400
Message: "Student is already checked in. Please check out first."
Condition: EXISTS (SELECT 1 FROM student_checkin_checkout WHERE studentId = ? AND checkOutTime IS NULL)
```

### Check-Out Validations

**Rule 1: Student Must Exist**
```
Error: Student not found
HTTP Status: 404
Message: "Student with ID 550e... does not exist"
```

**Rule 2: Student Must Be Currently Checked In**
```
Error: Not checked in
HTTP Status: 400
Message: "Student is not currently checked in. Cannot check out."
Condition: NOT EXISTS (SELECT 1 FROM student_checkin_checkout WHERE studentId = ? AND checkOutTime IS NULL)
```

---

## 🔍 Filter Options

### Date Filters
- `date` - Specific date (e.g., "2025-01-15")
- `dateFrom` - Start date (e.g., "2025-01-01")
- `dateTo` - End date (e.g., "2025-01-31")

### Student Filters
- `studentId` - Specific student UUID
- `studentName` - Search by name (partial match)

### Status Filters
- `status` - "CHECKED_IN" or "CHECKED_OUT"
- `type` - "INITIAL" or "MANUAL"

### Pagination
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 50, max: 100)

### Sorting
- `sortBy` - Field to sort by (e.g., "checkInTime", "date")
- `sortOrder` - "ASC" or "DESC" (default: "DESC")

**Example:**
```
GET /attendance/reports/activity?
  dateFrom=2025-01-01&
  dateTo=2025-01-31&
  studentId=550e...&
  status=CHECKED_OUT&
  page=1&
  limit=20&
  sortBy=checkInTime&
  sortOrder=DESC
```

---

## ⚠️ Error Handling

### Common Errors

**1. Student Not Found**
```
{
  success: false,
  error: "NOT_FOUND",
  message: "Student with ID 550e... does not exist",
  statusCode: 404
}
```

**2. Already Checked In**
```
{
  success: false,
  error: "ALREADY_CHECKED_IN",
  message: "Student is already checked in. Please check out first.",
  statusCode: 400,
  data: {
    currentCheckIn: {
      id: "990e...",
      checkInTime: "2025-01-15 08:30:00"
    }
  }
}
```

**3. Not Checked In**
```
{
  success: false,
  error: "NOT_CHECKED_IN",
  message: "Student is not currently checked in. Cannot check out.",
  statusCode: 400
}
```

**4. Student Not Configured**
```
{
  success: false,
  error: "NOT_CONFIGURED",
  message: "Student must be configured before checking in",
  statusCode: 400,
  data: {
    studentStatus: "Pending Configuration",
    isConfigured: false
  }
}
```

**5. Invalid Date Range**
```
{
  success: false,
  error: "INVALID_DATE_RANGE",
  message: "dateFrom must be before dateTo",
  statusCode: 400
}
```

---

## 🔌 API Endpoints Summary

### Student Endpoints (Phase 1: No Auth)

```
POST   /attendance/check-in
Body: { studentId, hostelId, notes? }
Response: { success, message, attendance, checkIn }

POST   /attendance/check-out
Body: { studentId, hostelId, notes? }
Response: { success, message, checkOut }

GET    /attendance/my-history
Query: studentId, hostelId, dateFrom?, dateTo?, page?, limit?
Response: { studentId, summary, attendance[] }
```

### Admin Endpoints (Phase 1: No Auth)

```
GET    /attendance/reports/daily
Query: hostelId, date, page?, limit?
Response: { date, summary, presentStudents[], absentStudents[] }

GET    /attendance/reports/activity
Query: hostelId, dateFrom?, dateTo?, studentId?, status?, page?, limit?
Response: { dateRange, summary, activities[] }

GET    /attendance/current-status
Query: hostelId
Response: { timestamp, currentlyCheckedIn, students[] }

GET    /attendance/reports/summary
Query: hostelId, dateFrom, dateTo
Response: { dateRange, summary, topStudents[], dailyBreakdown[] }

GET    /attendance/reports/student/:studentId
Query: hostelId, dateFrom?, dateTo?
Response: { student, summary, dailyRecords[] }
```

---

## 🚀 Implementation Phases

### Phase 1: Core Functionality (No Auth)
- ✅ Create database tables and migrations
- ✅ Implement check-in/check-out logic
- ✅ Implement validation rules
- ✅ Create all API endpoints
- ✅ Test all endpoints thoroughly
- ✅ Verify data integrity

### Phase 2: Initial Check-In Integration
- ✅ Add auto check-in to student configuration process
- ✅ Test configuration flow
- ✅ Verify initial records are created correctly

### Phase 3: Reports & Filtering
- ✅ Implement all report types
- ✅ Add filtering and pagination
- ✅ Test report accuracy
- ✅ Optimize query performance

### Phase 4: Authentication (Future)
- ✅ Add JWT token validation
- ✅ Implement userId → studentId resolution
- ✅ Implement businessId → hostelId resolution
- ✅ Add authorization guards
- ✅ Update all endpoints to use tokens
- ✅ Test with real tokens

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Students can check in/out multiple times per day
- ✅ First check-in of day creates attendance record
- ✅ Subsequent check-ins only create activity records
- ✅ Cannot check in if already checked in
- ✅ Cannot check out if not checked in
- ✅ Initial check-in happens automatically during configuration
- ✅ All reports show accurate data
- ✅ Filters work correctly
- ✅ Pagination works correctly

### Non-Functional Requirements
- ✅ No impact on existing modules (billing, payments, rooms, etc.)
- ✅ Fast query performance (< 500ms for reports)
- ✅ Data stored in Nepal timezone
- ✅ Records kept forever (no deletion)
- ✅ Clear error messages
- ✅ Comprehensive API documentation

---

## 📝 Notes

### Timezone Handling
- All timestamps stored in Nepal timezone (UTC+5:45)
- No conversion needed for display
- Database column type: `timestamp without time zone`

### Data Retention
- All attendance records kept permanently
- No automatic deletion or archiving
- Historical data valuable for analytics

### Performance Considerations
- Index on (studentId, date) for fast lookups
- Index on (hostelId, date) for report generation
- Index on (studentId, status) for finding active check-ins
- Pagination required for large datasets

### Future Enhancements (Not in Scope)
- Mobile app integration
- QR code check-in
- Geolocation verification
- Biometric authentication
- Push notifications
- Export to Excel/PDF
- Attendance-based billing rules
- Automated absence alerts

---

## ✅ Testing Checklist

### Unit Tests
- [ ] Check-in creates attendance record (first of day)
- [ ] Check-in creates activity record only (subsequent)
- [ ] Check-out updates activity record
- [ ] Validation rules work correctly
- [ ] Error handling works correctly

### Integration Tests
- [ ] Full check-in/out cycle
- [ ] Multiple check-ins same day
- [ ] Initial check-in during configuration
- [ ] All report endpoints return correct data
- [ ] Filters work correctly
- [ ] Pagination works correctly

### Manual Testing
- [ ] Test with Postman/Insomnia
- [ ] Verify database records
- [ ] Test edge cases
- [ ] Test error scenarios
- [ ] Verify report accuracy

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation
