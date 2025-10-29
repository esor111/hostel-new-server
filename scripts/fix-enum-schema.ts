import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function fixEnumSchema() {
  console.log('🔧 Starting enum schema fix...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'kaha_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'kaha_hostel_db',
    synchronize: false, // Important: Don't sync during this operation
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const queryRunner = dataSource.createQueryRunner();

    // Step 1: Check current enum values
    console.log('📋 Checking current enum values...');
    const currentEnums = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'student_financial_info_fee_type_enum'
      )
      ORDER BY enumlabel
    `);
    
    console.log('Current enum values:', currentEnums.map(e => e.enumlabel));

    // Check if security_deposit still exists in enum
    const hasSecurityDeposit = currentEnums.some(e => e.enumlabel === 'security_deposit');
    
    if (hasSecurityDeposit) {
      console.log('🔧 security_deposit found in enum - fixing...');

      // Step 2: Rename old enum
      console.log('📝 Renaming old enum type...');
      await queryRunner.query(`
        ALTER TYPE student_financial_info_fee_type_enum 
        RENAME TO student_financial_info_fee_type_enum_old
      `);

      // Step 3: Create new enum without security_deposit
      console.log('🆕 Creating new enum type...');
      await queryRunner.query(`
        CREATE TYPE student_financial_info_fee_type_enum AS ENUM (
            'base_monthly',
            'laundry', 
            'food',
            'utilities',
            'maintenance'
        )
      `);

      // Step 4: Update column to use new enum
      console.log('🔄 Updating column to use new enum...');
      await queryRunner.query(`
        ALTER TABLE student_financial_info 
        ALTER COLUMN fee_type TYPE student_financial_info_fee_type_enum 
        USING fee_type::text::student_financial_info_fee_type_enum
      `);

      // Step 5: Drop old enum
      console.log('🗑️ Dropping old enum type...');
      await queryRunner.query(`
        DROP TYPE student_financial_info_fee_type_enum_old
      `);

      console.log('✅ Enum schema updated successfully!');
    } else {
      console.log('✅ Enum already clean - no security_deposit found');
    }

    // Step 6: Verify the fix
    const newEnums = await queryRunner.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = 'student_financial_info_fee_type_enum'
      )
      ORDER BY enumlabel
    `);
    
    console.log('📋 Final enum values:', newEnums.map(e => e.enumlabel));

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
fixEnumSchema()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });