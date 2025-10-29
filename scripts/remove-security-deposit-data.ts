import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function removeSecurityDepositData() {
  console.log('🚀 Starting security deposit data removal script...');

  // Create a temporary data source for this operation
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kaha_hostel_db',
    synchronize: false, // Important: Don't sync schema yet
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    // Step 1: Check existing security deposit records
    console.log('📊 Checking for existing security deposit records...');
    const countResult = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM student_financial_info 
      WHERE fee_type = 'security_deposit'
    `);
    
    const securityDepositCount = parseInt(countResult[0].count);
    console.log(`Found ${securityDepositCount} security deposit records`);

    if (securityDepositCount > 0) {
      // Step 2: Create backup table
      console.log('💾 Creating backup of security deposit data...');
      await queryRunner.query(`
        DROP TABLE IF EXISTS security_deposit_backup
      `);
      await queryRunner.query(`
        CREATE TABLE security_deposit_backup AS
        SELECT *, NOW() as backup_created_at
        FROM student_financial_info 
        WHERE fee_type = 'security_deposit'
      `);
      console.log('✅ Backup created successfully');

      // Step 3: Remove all security deposit records
      console.log('🗑️ Removing security deposit records...');
      const deleteResult = await queryRunner.query(`
        DELETE FROM student_financial_info 
        WHERE fee_type = 'security_deposit'
      `);
      console.log(`✅ Removed ${deleteResult[1]} security deposit records`);

      // Step 4: Verify removal
      const verifyResult = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM student_financial_info 
        WHERE fee_type = 'security_deposit'
      `);

      const remainingCount = parseInt(verifyResult[0].count);
      if (remainingCount === 0) {
        console.log('✅ All security deposit records successfully removed');
      } else {
        throw new Error(`❌ Removal failed: ${remainingCount} security deposit records still exist`);
      }

      // Step 5: Show remaining fee types
      const feeTypesResult = await queryRunner.query(`
        SELECT fee_type, COUNT(*) as count 
        FROM student_financial_info 
        GROUP BY fee_type 
        ORDER BY fee_type
      `);

      console.log('📋 Remaining fee types:');
      feeTypesResult.forEach((row: any) => {
        console.log(`   - ${row.fee_type}: ${row.count} records`);
      });

      console.log('\n🎉 Security deposit data removal completed successfully!');
      console.log('✅ You can now start the application - TypeORM schema sync will work');
      
    } else {
      console.log('✅ No security deposit records found - no action needed');
      console.log('✅ You can start the application normally');
    }

    await queryRunner.release();

  } catch (error) {
    console.error('❌ Error during security deposit removal:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
removeSecurityDepositData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });