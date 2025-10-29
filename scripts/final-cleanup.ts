import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function finalCleanup() {
  console.log('🧹 Final cleanup and verification...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'kaha_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kaha_hostel_db',
    synchronize: false,
    logging: false, // Reduce noise
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    // Verify enum values
    console.log('📋 Verifying enum values...');
    const enumValues = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'student_financial_info_fee_type_enum'
      )
      ORDER BY enumlabel
    `);
    
    console.log('✅ Current enum values:', enumValues.map(e => e.enumlabel));

    // Check if security_deposit exists in enum
    const hasSecurityDeposit = enumValues.some(e => e.enumlabel === 'security_deposit');
    
    if (hasSecurityDeposit) {
      console.log('❌ security_deposit still exists in enum!');
      return false;
    } else {
      console.log('✅ security_deposit successfully removed from enum');
    }

    // Show current fee type distribution
    console.log('📊 Current fee type distribution:');
    const feeDistribution = await queryRunner.query(`
      SELECT fee_type, COUNT(*) as count 
      FROM student_financial_info 
      GROUP BY fee_type 
      ORDER BY fee_type
    `);
    
    feeDistribution.forEach((row: any) => {
      console.log(`   - ${row.fee_type}: ${row.count} records`);
    });

    // Clean up any remaining old enum types
    console.log('🧹 Cleaning up any remaining old enum types...');
    await queryRunner.query(`DROP TYPE IF EXISTS student_financial_info_fee_type_enum_old CASCADE`);

    await queryRunner.release();

    console.log('🎉 Final cleanup completed successfully!');
    console.log('✅ Database is ready - you can now start the application');
    return true;

  } catch (error) {
    console.error('❌ Error during final cleanup:', error);
    return false;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
finalCleanup()
  .then((success) => {
    if (success) {
      console.log('✅ All cleanup completed successfully!');
      console.log('🚀 You can now start your NestJS application');
      process.exit(0);
    } else {
      console.log('❌ Cleanup incomplete - please check the logs');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });