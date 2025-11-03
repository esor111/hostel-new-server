# 🚀 Quick Attendance Seeding Reference

## Prerequisites Checklist
- [ ] PostgreSQL database running
- [ ] At least 1 hostel exists in `hostel_profiles`
- [ ] At least 1 active student exists in `students` with `hostel_id` assigned
- [ ] Environment variables configured in `.env`

## Quick Commands

### 1️⃣ Check if you have data
```bash
# Connect to database
psql -U postgres -d hostel_db

# Check hostels
SELECT COUNT(*) FROM hostel_profiles WHERE is_active = true;

# Check students
SELECT COUNT(*) FROM students WHERE status = 'Active' AND hostel_id IS NOT NULL;

# Exit
\q
```

### 2️⃣ Run the seeding script
```bash
# Option A: Using npm script (recommended)
npm run seed:attendance

# Option B: Direct ts-node
npx ts-node scripts/seed-attendance.ts
```

### 3️⃣ Verify the results
```bash
psql -U postgres -d hostel_db -c "SELECT COUNT(*) FROM student_attendance;"
```

## What You'll Get

- ✅ **30 days** of attendance data (past month)
- ✅ **Weekdays only** (Monday-Friday)
- ✅ **90% attendance rate** (realistic simulation)
- ✅ **Random check-in times** between 18:00-23:00
- ✅ **All active students** included automatically

## Expected Output

```
🌱 Starting Attendance Seeding Process...
✅ Database connection established
📍 Found 2 hostel(s)
👥 Found 5 active student(s)
🗓️  Generated 105 attendance records
💾 Inserted: 105 records
✅ Total attendance records in database: 105
🎉 Attendance seeding completed successfully!
```

## Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| "No hostels found" | Create a hostel first in the admin panel or database |
| "No active students found" | Ensure students have `status = 'Active'` and `hostel_id` set |
| "Database connection error" | Check `.env` file and ensure PostgreSQL is running |
| Script runs but 0 records | Students might not have `hostel_id` assigned |

## Quick Fixes

### Create Test Hostel
```sql
INSERT INTO hostel_profiles (id, business_id, hostel_name, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'BUS001', 'Test Hostel', true, NOW(), NOW());
```

### Assign Student to Hostel
```sql
-- Get hostel ID
SELECT id, hostel_name FROM hostel_profiles LIMIT 1;

-- Update student
UPDATE students
SET hostel_id = 'PASTE_HOSTEL_ID_HERE', status = 'Active'
WHERE id = 'YOUR_STUDENT_ID';
```

### Clear and Re-seed
```sql
TRUNCATE TABLE student_attendance CASCADE;
```
Then run: `npm run seed:attendance`

## Files Location

- **Script:** `/scripts/seed-attendance.ts`
- **Full Guide:** `/ATTENDANCE_SEEDING_GUIDE.md`
- **Entity:** `/src/attendance/entities/student-attendance.entity.ts`

## Support

For detailed information, see: `ATTENDANCE_SEEDING_GUIDE.md`
