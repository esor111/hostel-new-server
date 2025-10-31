# Attendance System - Quick Reference

## 🎯 Core Concept

**Two Separate Tracking Systems:**

1. **Attendance** = Was student present today? (ONE record per day)
2. **Check-In/Out** = When did student enter/exit? (MULTIPLE records per day)

---

## 📊 Data Tables

### student_attendance
- One record per student per day
- Captures: date + first check-in time
- Used for: "Who was present?"

### student_checkin_checkout
- Multiple records per student per day
- Captures: every entry/exit timestamp
- Used for: "When did they come/go?"

---

## 🔄 Key Workflows

### First Check-In of Day
```
Student checks in at 8:30 AM
→ Creates attendance record (date: today, time: 8:30)
→ Creates check-in/out record (in: 8:30, out: null)
```

### Check-Out
```
Student checks out at 12:00 PM
→ Updates check-in/out record (out: 12:00)
→ No change to attendance (already marked present)
```

### Second Check-In Same Day
```
Student checks in again at 2:00 PM
→ No new attendance record (already present today)
→ Creates NEW check-in/out record (in: 2:00, out: null)
```

---

## 🔑 ID Mapping (For Auth Phase)

### Student Context
```
JWT Token → userId: "user_abc123"
Database → students.userId = "user_abc123"
Result → studentId: "550e8400-..."
```

### Admin Context
```
JWT Token → businessId: "biz_xyz789"
Database → hostel_profiles.businessId = "biz_xyz789"
Result → hostelId: "660e8400-..."
```

---

## ✅ Validation Rules

### Check-In
- ✅ Student must exist
- ✅ Student must be configured
- ✅ Student must NOT be currently checked in

### Check-Out
- ✅ Student must exist
- ✅ Student must BE currently checked in

---

## 📈 Reports

1. **Daily Attendance** - Who was present on date X?
2. **Activity Log** - All check-in/out movements
3. **Current Status** - Who's checked in right now?
4. **Summary** - Stats over date range
5. **Student Detail** - One student's full history

---

## 🚀 Implementation Phases

**Phase 1:** Build & test without auth (use studentId/hostelId directly)  
**Phase 2:** Add auto check-in to student configuration  
**Phase 3:** Implement all reports  
**Phase 4:** Add JWT auth (userId/businessId resolution)

---

## 🔌 API Endpoints (Phase 1)

### Student
```
POST /attendance/check-in
POST /attendance/check-out
GET  /attendance/my-history
```

### Admin
```
GET /attendance/reports/daily
GET /attendance/reports/activity
GET /attendance/current-status
GET /attendance/reports/summary
GET /attendance/reports/student/:id
```

---

## 💡 Key Points

- ✅ Completely isolated from other modules
- ✅ No impact on billing/payments/rooms
- ✅ Store in Nepal timezone
- ✅ Keep records forever
- ✅ Must check-out before next check-in
- ✅ Auto check-in during configuration

---

**See ATTENDANCE_REQUIREMENTS.md for full details**
