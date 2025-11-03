-- ============================================
-- Database Status Check for Attendance Seeding
-- ============================================
-- Run this before seeding to see current state
-- Usage: psql -U postgres -d hostel_db -f scripts/check-database-status.sql

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🏢 HOSTEL STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  COUNT(*) as total_hostels,
  COUNT(*) FILTER (WHERE is_active = true) as active_hostels
FROM hostel_profiles;

\echo ''
\echo 'Active Hostels:'
SELECT 
  id,
  hostel_name as name,
  business_id,
  created_at::date as created
FROM hostel_profiles
WHERE is_active = true
ORDER BY created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '👥 STUDENT STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE hostel_id IS NOT NULL) as with_hostel
FROM students
GROUP BY status
ORDER BY count DESC;

\echo ''
\echo 'Active Students with Hostel Assignment:'
SELECT 
  s.id,
  s.name,
  s.status,
  h.hostel_name as hostel,
  s.created_at::date as enrolled
FROM students s
LEFT JOIN hostel_profiles h ON s.hostel_id = h.id
WHERE s.status = 'Active'
ORDER BY s.created_at DESC
LIMIT 10;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 ATTENDANCE STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT date) as unique_dates,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM student_attendance;

\echo ''
\echo 'Recent Attendance (Last 5 records):'
SELECT 
  sa.date,
  s.name as student,
  h.hostel_name as hostel,
  sa.first_check_in_time as check_in,
  sa.type
FROM student_attendance sa
JOIN students s ON sa.student_id = s.id
JOIN hostel_profiles h ON sa.hostel_id = h.id
ORDER BY sa.date DESC, sa.first_check_in_time DESC
LIMIT 5;

\echo ''
\echo 'Attendance by Student:'
SELECT 
  s.name,
  COUNT(sa.id) as attendance_days,
  MIN(sa.date) as first_attendance,
  MAX(sa.date) as last_attendance
FROM students s
LEFT JOIN student_attendance sa ON s.id = sa.student_id
WHERE s.status = 'Active'
GROUP BY s.id, s.name
ORDER BY attendance_days DESC
LIMIT 10;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✅ SEEDING READINESS CHECK'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

WITH readiness AS (
  SELECT 
    (SELECT COUNT(*) FROM hostel_profiles WHERE is_active = true) as hostels,
    (SELECT COUNT(*) FROM students WHERE status = 'Active' AND hostel_id IS NOT NULL) as students,
    (SELECT COUNT(*) FROM student_attendance) as attendance_records
)
SELECT 
  CASE 
    WHEN hostels > 0 THEN '✅' 
    ELSE '❌' 
  END || ' Hostels: ' || hostels as hostel_status,
  CASE 
    WHEN students > 0 THEN '✅' 
    ELSE '❌' 
  END || ' Active Students with Hostel: ' || students as student_status,
  CASE 
    WHEN hostels > 0 AND students > 0 THEN '✅ READY TO SEED'
    ELSE '❌ NOT READY - Need hostels and students first'
  END as seeding_status,
  'Current attendance records: ' || attendance_records as existing_data
FROM readiness;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo ''
\echo 'To seed attendance data, run:'
\echo '  npm run seed:attendance'
\echo ''
