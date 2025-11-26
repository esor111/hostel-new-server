import { DataSource } from 'typeorm';

// Test script to check database timezone handling
async function testDatabaseTimezone() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'kaha-dev',
    password: 'kaha-dev',
    database: 'kaha_hostel_db',
  });

  await dataSource.initialize();
  console.log('✅ Connected to database\n');

  // Test 1: Check PostgreSQL timezone setting
  const timezoneResult = await dataSource.query('SHOW timezone');
  console.log('📍 PostgreSQL timezone:', timezoneResult[0].TimeZone);

  // Test 2: Get a sample record
  const result = await dataSource.query(`
    SELECT 
      id,
      check_in_time,
      check_out_time,
      created_at
    FROM student_checkin_checkout 
    WHERE student_id = '36238584-a1a1-4eaf-a829-17a813f593d1'
    ORDER BY check_in_time DESC 
    LIMIT 1
  `);

  if (result.length > 0) {
    const record = result[0];
    console.log('\n📊 Sample Record from Database:');
    console.log('ID:', record.id);
    console.log('check_in_time (raw from DB):', record.check_in_time);
    console.log('check_in_time (as Date):', new Date(record.check_in_time));
    console.log('check_in_time (ISO):', new Date(record.check_in_time).toISOString());
    console.log('created_at (raw from DB):', record.created_at);
    console.log('created_at (ISO):', new Date(record.created_at).toISOString());
  }

  // Test 3: Insert a test timestamp and read it back
  const testTime = new Date('2025-11-25T17:53:00.000Z'); // 5:53 PM Nepal = 12:08 PM UTC
  console.log('\n🧪 Test Insert:');
  console.log('Inserting timestamp:', testTime.toISOString());
  
  await dataSource.query(`
    INSERT INTO student_checkin_checkout 
    (id, student_id, hostel_id, check_in_time, status, type)
    VALUES 
    ('test-timezone-123', '36238584-a1a1-4eaf-a829-17a813f593d1', 'bdfd794a-2381-4401-8a53-e9ed5ccf5fed', $1, 'CHECKED_IN', 'MANUAL')
  `, [testTime]);

  const readBack = await dataSource.query(`
    SELECT check_in_time FROM student_checkin_checkout WHERE id = 'test-timezone-123'
  `);
  
  console.log('Read back from DB:', readBack[0].check_in_time);
  console.log('Read back as ISO:', new Date(readBack[0].check_in_time).toISOString());
  console.log('Match?', new Date(readBack[0].check_in_time).toISOString() === testTime.toISOString());

  // Cleanup
  await dataSource.query(`DELETE FROM student_checkin_checkout WHERE id = 'test-timezone-123'`);

  await dataSource.destroy();
  console.log('\n✅ Test complete');
}

testDatabaseTimezone().catch(console.error);
