import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../.env') });

/**
 * Attendance Seeding Script
 * 
 * This script:
 * 1. Fetches existing hostels from the database
 * 2. Fetches existing active students from the database
 * 3. Seeds attendance records for the past 30 days
 * 
 * Usage:
 * npm run ts-node scripts/seed-attendance.ts
 * OR
 * ts-node scripts/seed-attendance.ts
 */

interface StudentData {
  id: string;
  name: string;
  hostelId: string;
  status: string;
}

interface HostelData {
  id: string;
  name: string;
  businessId: string;
}

async function seedAttendance() {
  console.log('🌱 Starting Attendance Seeding Process...\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hostel_db',
    entities: [join(__dirname, '../src/**/*.entity{.ts,.js}')],
    synchronize: false,
  });

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // STEP 1: Fetch existing hostels
    console.log('📍 STEP 1: Fetching existing hostels...');
    const hostels = await dataSource.query<HostelData[]>(`
      SELECT id, hostel_name as name, business_id as "businessId"
      FROM hostel_profiles
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    if (hostels.length === 0) {
      console.log('❌ No hostels found! Please create at least one hostel first.');
      await dataSource.destroy();
      return;
    }

    console.log(`✅ Found ${hostels.length} hostel(s):`);
    hostels.forEach((h, i) => {
      console.log(`   ${i + 1}. ${h.name} (ID: ${h.id}, Business: ${h.businessId})`);
    });
    console.log();

    // STEP 2: Fetch existing active students
    console.log('👥 STEP 2: Fetching active students...');
    const students = await dataSource.query<StudentData[]>(`
      SELECT id, name, hostel_id as "hostelId", status
      FROM students
      WHERE status = 'Active'
      AND hostel_id IS NOT NULL
      ORDER BY created_at DESC
    `);

    if (students.length === 0) {
      console.log('❌ No active students found! Please create students first.');
      await dataSource.destroy();
      return;
    }

    console.log(`✅ Found ${students.length} active student(s):`);
    students.forEach((s, i) => {
      const hostel = hostels.find(h => h.id === s.hostelId);
      console.log(`   ${i + 1}. ${s.name} (ID: ${s.id}) - Hostel: ${hostel?.name || 'Unknown'}`);
    });
    console.log();

    // STEP 3: Check existing attendance records
    console.log('📊 STEP 3: Checking existing attendance records...');
    const existingCount = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM student_attendance
    `);
    console.log(`   Current attendance records: ${existingCount[0].count}`);
    console.log();

    // STEP 4: Generate attendance data for the past 30 days
    console.log('🗓️  STEP 4: Generating attendance data for past 30 days...');
    
    const attendanceRecords = [];
    const today = new Date();
    const daysToGenerate = 30;

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Skip weekends (optional - remove this if you want weekend attendance)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue; // Skip Sunday (0) and Saturday (6)
      }

      for (const student of students) {
        // Randomly decide if student was present (90% attendance rate)
        const isPresent = Math.random() > 0.1;

        if (isPresent) {
          // Generate random check-in time between 18:00 and 23:00
          const hour = 18 + Math.floor(Math.random() * 5);
          const minute = Math.floor(Math.random() * 60);
          const checkInTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;

          attendanceRecords.push({
            studentId: student.id,
            hostelId: student.hostelId,
            date: dateString,
            firstCheckInTime: checkInTime,
            type: 'INITIAL',
            notes: `Seeded attendance for ${student.name}`
          });
        }
      }
    }

    console.log(`   Generated ${attendanceRecords.length} attendance records`);
    console.log();

    // STEP 5: Insert attendance records (with conflict handling)
    console.log('💾 STEP 5: Inserting attendance records...');
    
    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of attendanceRecords) {
      try {
        await dataSource.query(`
          INSERT INTO student_attendance 
            (student_id, hostel_id, date, first_check_in_time, type, notes, created_at, updated_at)
          VALUES 
            ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (student_id, hostel_id, date) DO NOTHING
        `, [
          record.studentId,
          record.hostelId,
          record.date,
          record.firstCheckInTime,
          record.type,
          record.notes
        ]);
        insertedCount++;
      } catch (error) {
        skippedCount++;
        // Silently skip duplicates
      }
    }

    console.log(`   ✅ Inserted: ${insertedCount} records`);
    console.log(`   ⏭️  Skipped (duplicates): ${skippedCount} records`);
    console.log();

    // STEP 6: Verify the seeding
    console.log('✅ STEP 6: Verifying seeded data...');
    
    const finalCount = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM student_attendance
    `);
    
    const studentStats = await dataSource.query(`
      SELECT 
        s.name,
        COUNT(sa.id) as attendance_count
      FROM students s
      LEFT JOIN student_attendance sa ON s.id = sa.student_id
      WHERE s.status = 'Active'
      GROUP BY s.id, s.name
      ORDER BY attendance_count DESC
    `);

    console.log(`   Total attendance records in database: ${finalCount[0].count}`);
    console.log(`\n   Attendance by student:`);
    studentStats.forEach((stat: any) => {
      console.log(`   - ${stat.name}: ${stat.attendance_count} days`);
    });
    console.log();

    // STEP 7: Summary
    console.log('📋 SEEDING SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Hostels found: ${hostels.length}`);
    console.log(`✅ Students found: ${students.length}`);
    console.log(`✅ Records generated: ${attendanceRecords.length}`);
    console.log(`✅ Records inserted: ${insertedCount}`);
    console.log(`✅ Total attendance records: ${finalCount[0].count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Attendance seeding completed successfully!\n');

    // Close connection
    await dataSource.destroy();
    console.log('👋 Database connection closed');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seeding script
seedAttendance();
