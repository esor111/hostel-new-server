# Attendance System - JWT Authentication Integration

## 📋 Table of Contents
1. [Background & Context](#background--context)
2. [Current State (No Auth)](#current-state-no-auth)
3. [Target State (With Auth)](#target-state-with-auth)
4. [Authentication Architecture](#authentication-architecture)
5. [Implementation Plan](#implementation-plan)
6. [API Changes](#api-changes)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## 📖 Background & Context

### What We Built (Phase 1)
In Phase 1, we built a complete attendance tracking system with:
- ✅ Two database tables (`student_attendance`, `student_checkin_checkout`)
- ✅ 7 API endpoints (3 student, 4 admin)
- ✅ Complete business logic (check-in/out with validation)
- ✅ 5 report types (daily, activity, summary, history, current status)
- ✅ Comprehensive testing (all endpoints working)

### Current Limitation
**All endpoints currently require manual ID passing:**
- Students must provide `studentId` and `hostelId` in request body/query
- Admins must provide `hostelId` in query parameters
- No authentication or authorization
- Anyone can access any endpoint with any IDs

### Why We Need Auth
1. **Security:** Prevent unauthorized access to attendance data
2. **User Experience:** Students/admins shouldn't need to know their IDs
3. **Data Integrity:** Ensure students can only check themselves in/out
4. **Role-Based Access:** Students can't access admin reports
5. **Audit Trail:** Track who performed which actions

---

## 🔒 Current State (No Auth)

### Current API Calls

#### Student Endpoints
```bash
# Check-In
POST /hostel/api/v1/attendance/check-in
Body: {
  "studentId": "020a47c8-87b5-4910-b5f0-7b42b918799f",  # ❌ Manual
  "hostelId": "f95dd338-e812-4de4-bd9b-f68318b6ff5b",   # ❌ Manual
  "notes": "Morning check-in"
}

# Check-Out
POST /hostel/api/v1/attendance/check-out
Body: {
  "studentId": "020a47c8-87b5-4910-b5f0-7b42b918799f",  # ❌ Manual
  "hostelId": "f95dd338-e812-4de4-bd9b-f68318b6ff5b",   # ❌ Manual
  "notes": "Leaving for class"
}

# My History
GET /hostel/api/v1/attendance/my-history?studentId=xxx&hostelId=xxx&dateFrom=xxx
```

#### Admin Endpoints
```bash
# Current Status
GET /hostel/api/v1/attendance/current-status?hostelId=xxx  # ❌ Manual

# Daily Report
GET /hostel/api/v1/attendance/reports/daily?hostelId=xxx&date=2025-10-31  # ❌ Manual

# Activity Report
GET /hostel/api/v1/attendance/reports/activity?hostelId=xxx&dateFrom=xxx  # ❌ Manual

# Summary Report
GET /hostel/api/v1/attendance/reports/summary?hostelId=xxx&dateFrom=xxx&dateTo=xxx  # ❌ Manual
```

### Current Controller Code
```typescript
@Controller('attendance')
export class AttendanceController {
  @Post('check-in')
  async checkIn(@Body() checkInDto: CheckInDto) {
    // checkInDto contains: studentId, hostelId, notes
    return this.attendanceService.checkIn(checkInDto);
  }

  @Get('reports/daily')
  async getDailyReport(
    @Query('hostelId') hostelId: string,  // ❌ Manual from query
    @Query('date') date: string
  ) {
    return this.attendanceService.getDailyReport(hostelId, date);
  }
}
```

### Current DTOs
```typescript
// check-in.dto.ts
export class CheckInDto {
  @IsUUID()
  studentId: string;  // ❌ Required in request

  @IsUUID()
  hostelId: string;   // ❌ Required in request

  @IsOptional()
  @IsString()
  notes?: string;
}
```

---

## 🎯 Target State (With Auth)

### Target API Calls

#### Student Endpoints
```bash
# Check-In
POST /hostel/api/v1/attendance/check-in
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Body: {
  "notes": "Morning check-in"  # ✅ Only optional fields
}
# studentId and hostelId auto-resolved from JWT token

# Check-Out
POST /hostel/api/v1/attendance/check-out
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Body: {
  "notes": "Leaving for class"  # ✅ Only optional fields
}

# My History
GET /hostel/api/v1/attendance/my-history?dateFrom=2025-10-01
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
# studentId and hostelId auto-resolved from JWT token
```

#### Admin Endpoints
```bash
# Current Status
GET /hostel/api/v1/attendance/current-status
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
# hostelId auto-resolved from JWT token

# Daily Report
GET /hostel/api/v1/attendance/reports/daily?date=2025-10-31
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
# hostelId auto-resolved from JWT token

# Activity Report
GET /hostel/api/v1/attendance/reports/activity?dateFrom=2025-10-01
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
# hostelId auto-resolved from JWT token

# Summary Report
GET /hostel/api/v1/attendance/reports/summary?dateFrom=2025-10-01&dateTo=2025-10-31
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
# hostelId auto-resolved from JWT token
```

### Target Controller Code
```typescript
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostelId } from '../hostel/decorators/hostel-id.decorator';
import { HostelContextInterceptor } from '../hostel/interceptors/hostel-context.interceptor';
import { StudentId } from './decorators/student-id.decorator';
import { StudentContextInterceptor } from './interceptors/student-context.interceptor';

@Controller('attendance')
export class AttendanceController {
  // Student endpoint
  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(StudentContextInterceptor)
  async checkIn(
    @StudentId() studentId: string,  // ✅ Auto from JWT
    @HostelId() hostelId: string,    // ✅ Auto from JWT
    @Body() checkInDto: CheckInDto
  ) {
    return this.attendanceService.checkIn({
      ...checkInDto,
      studentId,
      hostelId
    });
  }

  // Admin endpoint
  @Get('reports/daily')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(HostelContextInterceptor)
  async getDailyReport(
    @HostelId() hostelId: string,  // ✅ Auto from JWT
    @Query('date') date: string
  ) {
    return this.attendanceService.getDailyReport(hostelId, date);
  }
}
```

### Target DTOs
```typescript
// check-in.dto.ts
export class CheckInDto {
  // studentId and hostelId removed - auto-resolved from JWT

  @IsOptional()
  @IsString()
  notes?: string;  // ✅ Only optional fields remain
}
```

---

## 🏗️ Authentication Architecture

### JWT Token Structures

#### Student Token Payload
```json
{
  "id": "afc70db3-6f43-4882-92fd-4715f25ffc95",
  "kahaId": "U-8C695E",
  "iat": 1761911511
}
```

**Key Field:** `id` (this is the userId stored in `students.userId` column)

#### Admin Token Payload
```json
{
  "id": "admin-uuid-here",
  "businessId": "biz_123456",
  "kahaId": "A-123456",
  "role": "admin",
  "iat": 1761911511
}
```

**Key Field:** `businessId` (this is stored in `hostel_profiles.businessId` column)

---

### ID Resolution Flow

#### Student Flow (NEW - Need to Create)
```
┌─────────────────────────────────────────────────────────────┐
│ 1. Student makes API call with JWT token                    │
│    POST /attendance/check-in                                 │
│    Headers: { Authorization: "Bearer <token>" }              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. JwtAuthGuard validates token                              │
│    - Verifies signature                                      │
│    - Checks expiration                                       │
│    - Extracts payload → req.user = { id: "afc70db3..." }    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. StudentContextInterceptor runs                            │
│    - Gets userId from req.user.id                            │
│    - Queries database:                                       │
│      SELECT id, hostelId FROM students WHERE userId = ?     │
│    - Result:                                                 │
│      studentId = "020a47c8-87b5-4910-b5f0-7b42b918799f"    │
│      hostelId = "f95dd338-e812-4de4-bd9b-f68318b6ff5b"     │
│    - Attaches to request:                                    │
│      req.studentId = studentId                               │
│      req.hostelId = hostelId                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Controller method executes                                │
│    @StudentId() extracts req.studentId                       │
│    @HostelId() extracts req.hostelId                         │
│    Calls service with resolved IDs                           │
└─────────────────────────────────────────────────────────────┘
```

#### Admin Flow (EXISTING - Use from HostelModule)
```
┌─────────────────────────────────────────────────────────────┐
│ 1. Admin makes API call with JWT token                      │
│    GET /attendance/reports/daily?date=2025-10-31            │
│    Headers: { Authorization: "Bearer <token>" }              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. JwtAuthGuard validates token                              │
│    - Verifies signature                                      │
│    - Checks expiration                                       │
│    - Extracts payload → req.user = { businessId: "biz..." } │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. HostelContextInterceptor runs (from HostelModule)         │
│    - Gets businessId from req.user.businessId                │
│    - Queries database:                                       │
│      SELECT id FROM hostel_profiles WHERE businessId = ?    │
│    - Result:                                                 │
│      hostelId = "f95dd338-e812-4de4-bd9b-f68318b6ff5b"     │
│    - Attaches to request:                                    │
│      req.hostelId = hostelId                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Controller method executes                                │
│    @HostelId() extracts req.hostelId                         │
│    Calls service with resolved hostelId                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Database Schema Context

#### students Table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,                    -- Auto-generated (studentId)
  user_id VARCHAR,                        -- From JWT token.id (userId)
  "hostelId" UUID REFERENCES hostel_profiles(id),
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  is_configured BOOLEAN,
  status VARCHAR,
  ...
);

-- Example Record:
-- id: "020a47c8-87b5-4910-b5f0-7b42b918799f"  (studentId - primary key)
-- user_id: "afc70db3-6f43-4882-92fd-4715f25ffc95"  (userId - from JWT)
-- hostelId: "f95dd338-e812-4de4-bd9b-f68318b6ff5b"
```

#### hostel_profiles Table
```sql
CREATE TABLE hostel_profiles (
  id UUID PRIMARY KEY,                    -- Auto-generated (hostelId)
  business_id VARCHAR UNIQUE,             -- From JWT token.businessId
  hostel_name VARCHAR,
  is_active BOOLEAN,
  ...
);

-- Example Record:
-- id: "f95dd338-e812-4de4-bd9b-f68318b6ff5b"  (hostelId - primary key)
-- business_id: "biz_123456"  (businessId - from JWT)
```

---

## 🛠️ Implementation Plan

### Phase 1: Create Student Auth Components

#### File 1: StudentContextInterceptor
**Path:** `src/attendance/interceptors/student-context.interceptor.ts`

**Purpose:** Resolve userId → studentId + hostelId

**Logic:**
```typescript
1. Extract userId from JWT token (req.user.id)
2. Query: SELECT id, hostelId FROM students WHERE userId = ?
3. If not found → throw NotFoundException
4. Attach to request: req.studentId, req.hostelId
```

**Similar to:** `src/hostel/interceptors/hostel-context.interceptor.ts`

---

#### File 2: @StudentId() Decorator
**Path:** `src/attendance/decorators/student-id.decorator.ts`

**Purpose:** Extract studentId from request

**Logic:**
```typescript
Extract req.studentId (set by StudentContextInterceptor)
```

**Similar to:** `src/hostel/decorators/hostel-id.decorator.ts`

---

### Phase 2: Update DTOs

#### Remove IDs from Request Bodies

**Files to update:**
- `src/attendance/dto/check-in.dto.ts`
- `src/attendance/dto/check-out.dto.ts`
- `src/attendance/dto/attendance-filters.dto.ts`

**Changes:**
```typescript
// BEFORE
export class CheckInDto {
  @IsUUID()
  studentId: string;  // ❌ Remove

  @IsUUID()
  hostelId: string;   // ❌ Remove

  @IsOptional()
  @IsString()
  notes?: string;
}

// AFTER
export class CheckInDto {
  @IsOptional()
  @IsString()
  notes?: string;  // ✅ Only optional fields
}
```

---

### Phase 3: Update Controller

#### Add Guards, Interceptors, Decorators

**File:** `src/attendance/attendance.controller.ts`

**Imports needed:**
```typescript
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostelId } from '../hostel/decorators/hostel-id.decorator';
import { HostelContextInterceptor } from '../hostel/interceptors/hostel-context.interceptor';
import { StudentId } from './decorators/student-id.decorator';
import { StudentContextInterceptor } from './interceptors/student-context.interceptor';
```

**Student Endpoints Pattern:**
```typescript
@Post('check-in')
@UseGuards(JwtAuthGuard)
@UseInterceptors(StudentContextInterceptor)
async checkIn(
  @StudentId() studentId: string,
  @HostelId() hostelId: string,
  @Body() checkInDto: CheckInDto
) {
  return this.attendanceService.checkIn({
    ...checkInDto,
    studentId,
    hostelId
  });
}
```

**Admin Endpoints Pattern:**
```typescript
@Get('reports/daily')
@UseGuards(JwtAuthGuard)
@UseInterceptors(HostelContextInterceptor)
async getDailyReport(
  @HostelId() hostelId: string,
  @Query('date') date: string
) {
  if (!date) {
    throw new BadRequestException('date is required');
  }
  return this.attendanceService.getDailyReport(hostelId, date);
}
```

---

### Phase 4: Update Module

**File:** `src/attendance/attendance.module.ts`

**Add imports:**
```typescript
import { HostelModule } from '../hostel/hostel.module';
import { AuthModule } from '../auth/auth.module';
import { Student } from '../students/entities/student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudentAttendance,
      StudentCheckInOut,
      Student  // ✅ Add for StudentContextInterceptor
    ]),
    HostelModule,  // ✅ Add for HostelContextInterceptor
    AuthModule,    // ✅ Add for JwtAuthGuard
  ],
  ...
})
```

---

## 📊 API Changes Summary

### Student Endpoints

| Endpoint | Before | After |
|----------|--------|-------|
| **Check-In** | `POST /attendance/check-in`<br>Body: `{studentId, hostelId, notes}` | `POST /attendance/check-in`<br>Headers: `Authorization: Bearer <token>`<br>Body: `{notes}` |
| **Check-Out** | `POST /attendance/check-out`<br>Body: `{studentId, hostelId, notes}` | `POST /attendance/check-out`<br>Headers: `Authorization: Bearer <token>`<br>Body: `{notes}` |
| **My History** | `GET /attendance/my-history?studentId=xxx&hostelId=xxx` | `GET /attendance/my-history`<br>Headers: `Authorization: Bearer <token>` |

### Admin Endpoints

| Endpoint | Before | After |
|----------|--------|-------|
| **Current Status** | `GET /attendance/current-status?hostelId=xxx` | `GET /attendance/current-status`<br>Headers: `Authorization: Bearer <token>` |
| **Daily Report** | `GET /attendance/reports/daily?hostelId=xxx&date=xxx` | `GET /attendance/reports/daily?date=xxx`<br>Headers: `Authorization: Bearer <token>` |
| **Activity Report** | `GET /attendance/reports/activity?hostelId=xxx&...` | `GET /attendance/reports/activity?...`<br>Headers: `Authorization: Bearer <token>` |
| **Summary Report** | `GET /attendance/reports/summary?hostelId=xxx&...` | `GET /attendance/reports/summary?...`<br>Headers: `Authorization: Bearer <token>` |

---

## 🧪 Testing Strategy

### Prerequisites
1. Get valid JWT tokens (student + admin)
2. Ensure tokens contain correct fields (`id` for student, `businessId` for admin)
3. Verify student record exists with matching `userId`

### Test Cases

#### Test 1: Student Check-In with Valid Token
```bash
curl -X POST http://localhost:3001/hostel/api/v1/attendance/check-in \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"notes": "Morning check-in"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Checked in successfully",
  "attendance": {
    "date": "2025-10-31",
    "firstCheckInTime": "08:30:00",
    "isFirstOfDay": true
  },
  "checkIn": {
    "id": "uuid-here",
    "checkInTime": "2025-10-31T08:30:00.000Z",
    "status": "CHECKED_IN"
  }
}
```

#### Test 2: Admin Daily Report with Valid Token
```bash
curl "http://localhost:3001/hostel/api/v1/attendance/reports/daily?date=2025-10-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Expected Response:**
```json
{
  "hostelId": "f95dd338-e812-4de4-bd9b-f68318b6ff5b",
  "date": "2025-10-31",
  "summary": {
    "totalStudents": 50,
    "totalPresent": 45,
    "totalAbsent": 5,
    "attendanceRate": "90.0%"
  },
  "presentStudents": [...]
}
```

#### Test 3: No Token (Unauthorized)
```bash
curl -X POST http://localhost:3001/hostel/api/v1/attendance/check-in \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test"}'
```

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### Test 4: Invalid Student (Not Found)
```bash
# Token with userId that doesn't exist in students table
curl -X POST http://localhost:3001/hostel/api/v1/attendance/check-in \
  -H "Authorization: Bearer <token_with_invalid_userId>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Test"}'
```

**Expected Response:**
```json
{
  "statusCode": 404,
  "message": "Student record not found"
}
```

#### Test 5: Student Accessing Admin Endpoint (Forbidden)
```bash
# Student token trying to access admin report
curl "http://localhost:3001/hostel/api/v1/attendance/reports/daily?date=2025-10-31" \
  -H "Authorization: Bearer <student_token>"
```

**Expected Response:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## 🚀 Rollout Plan

### Stage 1: Development (Current)
- ✅ Implement auth components
- ✅ Update controller and DTOs
- ✅ Test with curl/Postman
- ✅ Verify all endpoints work

### Stage 2: Integration Testing
- Test with frontend
- Verify token refresh works
- Test concurrent users
- Load testing

### Stage 3: Staging Deployment
- Deploy to staging environment
- Monitor error rates
- Gather feedback
- Fix any issues

### Stage 4: Production Deployment
- Deploy to production
- Monitor closely
- Have rollback plan ready
- Document any issues

---

## 📝 Files Summary

### New Files to Create (2)
1. `src/attendance/interceptors/student-context.interceptor.ts`
2. `src/attendance/decorators/student-id.decorator.ts`

### Files to Update (4)
3. `src/attendance/attendance.controller.ts`
4. `src/attendance/attendance.module.ts`
5. `src/attendance/dto/check-in.dto.ts`
6. `src/attendance/dto/check-out.dto.ts`

### Files to Reference (Existing)
- `src/hostel/interceptors/hostel-context.interceptor.ts` (pattern to follow)
- `src/hostel/decorators/hostel-id.decorator.ts` (pattern to follow)
- `src/auth/guards/jwt-auth.guard.ts` (use directly)

---

## ✅ Success Criteria

1. ✅ All student endpoints work with JWT token
2. ✅ All admin endpoints work with JWT token
3. ✅ No manual ID passing required
4. ✅ Proper error messages for auth failures
5. ✅ Performance < 200ms per request
6. ✅ No breaking changes to service layer
7. ✅ Documentation updated

---

## 🎯 Next Steps

1. **Review this document** - Ensure understanding is correct
2. **Create new files** - StudentContextInterceptor + @StudentId() decorator
3. **Update controller** - Add guards, interceptors, decorators
4. **Update DTOs** - Remove IDs from request bodies
5. **Update module** - Add imports
6. **Test thoroughly** - All endpoints with real tokens
7. **Document changes** - Update API docs

---

**Document Version:** 1.0  
**Last Updated:** October 31, 2025  
**Status:** Ready for Implementation  
**Estimated Time:** 1-2 hours
