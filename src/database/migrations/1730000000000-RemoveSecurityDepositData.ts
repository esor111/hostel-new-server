import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSecurityDepositData1730000000000 implements MigrationInterface {
    name = 'RemoveSecurityDepositData1730000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Starting security deposit data removal migration...');

        // Step 1: Check existing security deposit records
        const countResult = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM student_financial_info 
      WHERE fee_type = 'security_deposit'
    `);

        const securityDepositCount = parseInt(countResult[0].count);
        console.log(`📊 Found ${securityDepositCount} security deposit records to remove`);

        if (securityDepositCount > 0) {
            // Step 2: Create backup table (optional)
            console.log('💾 Creating backup of security deposit data...');
            await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS security_deposit_backup AS
        SELECT *, NOW() as backup_created_at
        FROM student_financial_info 
        WHERE fee_type = 'security_deposit'
      `);

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
                throw new Error(`❌ Migration failed: ${remainingCount} security deposit records still exist`);
            }

            // Step 5: Show remaining fee types
            const feeTypesResult = await queryRunner.query(`
        SELECT fee_type, COUNT(*) as count 
        FROM student_financial_info 
        GROUP BY fee_type 
        ORDER BY fee_type
      `);

            console.log('📋 Remaining fee types after migration:');
            feeTypesResult.forEach((row: any) => {
                console.log(`   - ${row.fee_type}: ${row.count} records`);
            });
        } else {
            console.log('✅ No security deposit records found - migration not needed');
        }

        console.log('🎉 Security deposit data removal migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Reverting security deposit data removal...');

        // Check if backup exists
        const backupExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'security_deposit_backup'
      )
    `).then(result => result[0].exists);

        if (backupExists) {
            console.log('💾 Restoring security deposit data from backup...');

            // Restore data from backup (excluding backup_created_at column)
            await queryRunner.query(`
        INSERT INTO student_financial_info (
          id, created_at, updated_at, student_id, fee_type, amount, 
          effective_from, effective_to, is_active, notes
        )
        SELECT 
          id, created_at, updated_at, student_id, fee_type, amount, 
          effective_from, effective_to, is_active, notes
        FROM security_deposit_backup
      `);

            console.log('✅ Security deposit data restored from backup');
        } else {
            console.log('⚠️ No backup found - cannot restore security deposit data');
        }
    }
}