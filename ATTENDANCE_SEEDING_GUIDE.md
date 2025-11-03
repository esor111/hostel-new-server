# 📋 Attendance Module Seeding Guide

## Overview
This guide explains how to seed the attendance module with existing hostel and student data.

---

## 🎯 Prerequisites

Before seeding attendance data, ensure you have:

1. **Database running** with existing data:
   - ✅ At least one Hostel profile created
   - ✅ At least one Active student assigned to a hostel

2. **Environment configured**:
   - ✅ `.env` file with correct database credentials
   - ✅ Database connection tested

3. **Dependencies installed**:
   ```bash
   npm install
   ```

---

## 📝 Step-by-Step Process

### Step 1: Verify Existing Data

First, check if you have hostels and students in your database:

```bash
# Connect to PostgreSQL
psql -U postgres -d hostel_db

# Check hostels
SELECT id, hostel_name, business_id FROM hostel_profiles WHERE is_active = true;

# Check active students
SELECT id, name, hostel_id, status FROM students WHERE status = 'Active';

# Exit psql
\q
```

**Expected Output:**
- At least 1 hostel
- At least 1 active student with a `hostel_id`

---

### Step 2: Run the Seeding Script

I've created a script at `/scripts/seed-attendance.ts` that will:

1. ✅ Fetch existing hostel IDs
2. ✅ Fetch existing active student IDs
3. ✅ Generate attendance records for the past 30 days (weekdays only)
4. ✅ Insert records with duplicate handling

**Run the script:**

```bash
# Option 1: Using ts-node
npx ts-node scripts/seed-attendance.ts

# Option 2: If you have ts-node installed globally
ts-node scripts/seed-attendance.ts

# Option 3: Add to package.json scripts section and run
npm run seed:attendance
```

---

### Step 3: Add NPM Script (Optional)

For easier access, add this to your `package.json`:

```json
{
  "scripts": {
    "seed:attendance": "ts-node scripts/seed-attendance.ts"
  }
}
```

Then run:
```bash
npm run seed:attendance
```

---

## 🔍 What the Script Does

### Data Generation Logic

1. **Date Range**: Past 30 days from today
2. **Weekdays Only**: Skips Saturdays and Sundays
3. **Attendance Rate**: 90% (students marked present 90% of the time)
4. **Check-in Time**: Random time between 18:00-23:00 (6 PM - 11 PM)
5. **Type**: All marked as 'INITIAL' attendance

### Example Output

```
🌱 Starting Attendance Seeding Process...

✅ Database connection established

📍 STEP 1: Fetching existing hostels...
✅ Found 2 hostel(s):
   1. Sunrise Hostel (ID: abc-123, Business: BUS001)
   2. Moonlight Hostel (ID: def-456, Business: BUS002)

👥 STEP 2: Fetching active students...
✅ Found 5 active student(s):
   1. Rajesh Kumar (ID: student-1) - Hostel: Sunrise Hostel
   2. Priya Sharma (ID: student-2) - Hostel: Sunrise Hostel
   ...

📊 STEP 3: Checking existing attendance records...
   Current attendance records: 0

🗓️  STEP 4: Generating attendance data for past 30 days...
   Generated 105 attendance records

💾 STEP 5: Inserting attendance records...
   ✅ Inserted: 105 records
   ⏭️  Skipped (duplicates): 0 records

✅ STEP 6: Verifying seeded data...
   Total attendance records in database: 105

   Attendance by student:
   - Rajesh Kumar: 21 days
   - Priya Sharma: 21 days
   ...

📋 SEEDING SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Hostels found: 2
✅ Students found: 5
✅ Records generated: 105
✅ Records inserted: 105
✅ Total attendance records: 105
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Attendance seeding completed successfully!
```

---

## 🛠️ Customization Options

You can modify the script to adjust:

### 1. Number of Days
```typescript
const daysToGenerate = 30; // Change to 60, 90, etc.
```

### 2. Include Weekends
```typescript
// Comment out these lines to include weekends:
// if (dayOfWeek === 0 || dayOfWeek === 6) {
//   continue;
// }
```

### 3. Attendance Rate
```typescript
const isPresent = Math.random() > 0.1; // 90% present
// Change to Math.random() > 0.2 for 80% attendance
```

### 4. Check-in Time Range
```typescript
// Current: 18:00 - 23:00
const hour = 18 + Math.floor(Math.random() * 5);

// Change to morning: 6:00 - 9:00
const hour = 6 + Math.floor(Math.random() * 3);
```

---

## 🔧 Troubleshooting

### Issue 1: No Hostels Found
**Error:** `❌ No hostels found!`

**Solution:**
```sql
-- Create a test hostel
INSERT INTO hostel_profiles (id, business_id, hostel_name, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'BUS001', 'Test Hostel', true, NOW(), NOW());
```

### Issue 2: No Active Students Found
**Error:** `❌ No active students found!`

**Solution:**
```sql
-- Check student status
SELECT id, name, status, hostel_id FROM students;

-- Update student to Active and assign hostel
UPDATE students
SET status = 'Active', hostel_id = 'YOUR_HOSTEL_ID'
WHERE id = 'YOUR_STUDENT_ID';
```

### Issue 3: Database Connection Error
**Error:** Connection refused

**Solution:**
1. Check `.env` file for correct credentials
2. Ensure PostgreSQL is running:
   ```bash
   sudo service postgresql status
   # or
   docker ps  # if using Docker
   ```

### Issue 4: Duplicate Key Errors
**Note:** The script uses `ON CONFLICT DO NOTHING` to handle duplicates automatically. If you see skipped records, it's because they already exist.

---

## 🔄 Re-running the Script

The script is **idempotent** - you can run it multiple times safely:
- Existing records will be skipped (not duplicated)
- Only new records will be inserted
- No data will be lost

To clear all attendance and re-seed:
```sql
-- Clear all attendance records
TRUNCATE TABLE student_attendance CASCADE;

-- Then re-run the script
npx ts-node scripts/seed-attendance.ts
```

---

## 📊 Verify Seeded Data

### Check Total Records
```sql
SELECT COUNT(*) as total_attendance
FROM student_attendance;
```

### View Recent Attendance
```sql
SELECT 
  sa.date,
  s.name as student_name,
  h.hostel_name,
  sa.first_check_in_time,
  sa.type
FROM student_attendance sa
JOIN students s ON sa.student_id = s.id
JOIN hostel_profiles h ON sa.hostel_id = h.id
ORDER BY sa.date DESC
LIMIT 20;
```

### Attendance Summary by Student
```sql
SELECT 
  s.name,
  COUNT(sa.id) as days_present,
  MIN(sa.date) as first_attendance,
  MAX(sa.date) as last_attendance
FROM students s
LEFT JOIN student_attendance sa ON s.id = sa.student_id
WHERE s.status = 'Active'
GROUP BY s.id, s.name
ORDER BY days_present DESC;
```

---

## 🎯 Next Steps

After seeding:

1. **Test the Attendance API endpoints:**
   ```bash
   # Get attendance for a specific date
   GET /hostel/api/v1/attendance?date=2024-11-01

   # Get student attendance summary
   GET /hostel/api/v1/attendance/student/{studentId}/summary
   ```

2. **View in the frontend:**
   - Navigate to the Attendance page
   - Check if seeded data displays correctly
   - Test filtering and date range selection

3. **Monitor performance:**
   - Ensure queries are fast with indexed data
   - Check for any N+1 query issues

---

## 📚 Related Files

- **Script:** `/scripts/seed-attendance.ts`
- **Entity:** `/src/attendance/entities/student-attendance.entity.ts`
- **Service:** `/src/attendance/attendance.service.ts`
- **Controller:** `/src/attendance/attendance.controller.ts`

---

## 💡 Pro Tips

1. **Backup First:** Always backup your database before seeding large amounts of data
   ```bash
   pg_dump -U postgres hostel_db > backup_before_attendance_seed.sql
   ```

2. **Monitor Disk Space:** Attendance data can grow large over time

3. **Index Check:** Ensure proper indexes exist:
   ```sql
   -- Should already exist from entity definition
   CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
   ON student_attendance(student_id, date);
   ```

4. **Test on Staging First:** Run the script on a staging/dev database before production

---

## ❓ FAQ

**Q: Can I seed data for future dates?**
A: Yes, modify the date calculation to use positive offsets.

**Q: Will this slow down my database?**
A: The script inserts in batches and uses conflict handling, so it's optimized for performance.

**Q: Can I seed specific students only?**
A: Yes, modify the student query to filter by specific IDs or names.

**Q: What if I want to seed different check-in patterns?**
A: Customize the time generation logic to create patterns (e.g., early birds, late students).

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Ensure you have hostels and students
# 2. Run the seeding script
npx ts-node scripts/seed-attendance.ts

# 3. Verify
psql -U postgres -d hostel_db -c "SELECT COUNT(*) FROM student_attendance;"

# Done! ✅
```

---

**Happy Seeding! 🌱**
