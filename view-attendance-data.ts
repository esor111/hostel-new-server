import { DataSource } from 'typeorm';
import AppDataSource from './src/database/data-source';

async function viewAttendanceData() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Connected!\n');

    // Get attendance records with student and hostel details
    const attendanceRecords = await AppDataSource.query(`
      SELECT 
        sa.id,
        sa.student_id,
        sa.hostel_id,
        sa.date,
        sa.first_check_in_time,
        sa.type,
        sa.notes,
        sa."createdAt",
        sa."updatedAt",
        s.name as student_name,
        s.email as student_email,
        h.name as hostel_name
      FROM student_attendance sa
      LEFT JOIN students s ON sa.student_id = s.id
      LEFT JOIN hostel_profiles h ON sa.hostel_id = h.id
      ORDER BY sa.date DESC, sa."createdAt" DESC
      LIMIT 50
    `);

    console.log(`\n📊 ATTENDANCE RECORDS (Total: ${attendanceRecords.length})\n`);
    console.log('='.repeat(120));

    if (attendanceRecords.length === 0) {
      console.log('No attendance records found.');
    } else {
      attendanceRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. Record ID: ${record.id}`);
        console.log(`   Student: ${record.student_name || 'N/A'} (${record.student_email || 'N/A'})`);
        console.log(`   Hostel: ${record.hostel_name || 'N/A'}`);
        console.log(`   Date: ${record.date}`);
        console.log(`   First Check-in Time: ${record.first_check_in_time}`);
        console.log(`   Type: ${record.type}`);
        console.log(`   Notes: ${record.notes || 'None'}`);
        console.log(`   Created At: ${new Date(record.createdAt).toLocaleString()}`);
        console.log(`   Updated At: ${new Date(record.updatedAt).toLocaleString()}`);
        console.log('-'.repeat(120));
      });
    }

    // Get summary statistics
    const stats = await AppDataSource.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT hostel_id) as unique_hostels,
        COUNT(DISTINCT date) as unique_dates,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM student_attendance
    `);

    console.log('\n\n📈 SUMMARY STATISTICS');
    console.log('='.repeat(120));
    console.log(`Total Attendance Records: ${stats[0].total_records}`);
    console.log(`Unique Students: ${stats[0].unique_students}`);
    console.log(`Unique Hostels: ${stats[0].unique_hostels}`);
    console.log(`Unique Dates: ${stats[0].unique_dates}`);
    console.log(`Date Range: ${stats[0].earliest_date || 'N/A'} to ${stats[0].latest_date || 'N/A'}`);

    // Get attendance by type
    const typeStats = await AppDataSource.query(`
      SELECT 
        type,
        COUNT(*) as count
      FROM student_attendance
      GROUP BY type
      ORDER BY count DESC
    `);

    console.log('\n📊 ATTENDANCE BY TYPE');
    console.log('='.repeat(120));
    typeStats.forEach(stat => {
      console.log(`${stat.type}: ${stat.count} records`);
    });

    // Get recent check-in/check-out records
    const checkInOutRecords = await AppDataSource.query(`
      SELECT 
        scio.id,
        scio.student_id,
        scio.hostel_id,
        scio.check_in_time,
        scio.check_out_time,
        scio.status,
        scio.type,
        scio.notes,
        s.name as student_name,
        h.name as hostel_name
      FROM student_checkin_checkout scio
      LEFT JOIN students s ON scio.student_id = s.id
      LEFT JOIN hostel_profiles h ON scio.hostel_id = h.id
      ORDER BY scio.check_in_time DESC
      LIMIT 20
    `);

    console.log('\n\n🔄 RECENT CHECK-IN/CHECK-OUT RECORDS (Last 20)');
    console.log('='.repeat(120));
    
    if (checkInOutRecords.length === 0) {
      console.log('No check-in/check-out records found.');
    } else {
      checkInOutRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. Record ID: ${record.id}`);
        console.log(`   Student: ${record.student_name || 'N/A'}`);
        console.log(`   Hostel: ${record.hostel_name || 'N/A'}`);
        console.log(`   Check-in: ${new Date(record.check_in_time).toLocaleString()}`);
        console.log(`   Check-out: ${record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'Not checked out'}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Type: ${record.type}`);
        console.log(`   Notes: ${record.notes || 'None'}`);
        console.log('-'.repeat(120));
      });
    }

    await AppDataSource.destroy();
    console.log('\n✅ Database connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

viewAttendanceData();
