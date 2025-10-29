import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function completeEnumFix() {
  console.log('🔧 Completing enum schema fix...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'kaha_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kaha_hostel_db',
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    // Step 1: Drop the backup table that's preventing enum cleanup
    console.log('🗑️ Dropping backup table that depends on old enum...');
    await queryRunner.query(`DROP TABLE IF EXISTS security_deposit_backup`);

    // Step 2: Now drop the old enum type
    console.log('🗑️ Dropping old enum type...');
    await queryRunner.query(`DROP TYPE IF EXISTS student_financial_info_fee_type_enum_old`);

    // Step 3: Verify current enum values
    console.log('📋 Verifying final enum values...');
    const finalEnums = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'student_financial_info_fee_type_enum'
      )
      ORDER BY enumlabel
    `);
    
    console.log('✅ Final enum values:', finalEnums.map(e => e.enumlabel));

    // Step 4: Verify no security_deposit records exist
    const securityDepositCount = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM student_financial_info 
      WHERE fee_type = 'security_deposit'
    `);
    
    console.log(`📊 Security deposit records remaining: ${securityDepositCount[0].count}`);

    await queryRunner.release();

    console.log('🎉 Enum schema fix completed successfully!');
    console.log('✅ You can now start the application - TypeORM sync will work');

  } catch (error) {
    console.error('❌ Error during enum schema fix:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
completeEnumFix()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });