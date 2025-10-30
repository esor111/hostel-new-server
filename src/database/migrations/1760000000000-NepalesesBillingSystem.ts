import { MigrationInterface, QueryRunner } from 'typeorm';

export class NepalesesBillingSystem1760000000000 implements MigrationInterface {
    name = 'NepalesesBillingSystem1760000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add payment type classification to payments table
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD COLUMN "payment_type" VARCHAR(20) DEFAULT 'REGULAR'
        `);

        // Add month covered tracking for advance payments
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD COLUMN "month_covered" VARCHAR(20) NULL
        `);

        // Add advance payment tracking to students table
        await queryRunner.query(`
            ALTER TABLE "students" 
            ADD COLUMN "advance_payment_month" VARCHAR(20) NULL
        `);

        // Add last billing month tracking
        await queryRunner.query(`
            ALTER TABLE "students" 
            ADD COLUMN "last_billing_month" VARCHAR(20) NULL
        `);

        // Create indexes for better performance
        await queryRunner.query(`
            CREATE INDEX "IDX_payments_payment_type" ON "payments" ("payment_type")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_payments_month_covered" ON "payments" ("month_covered")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_students_advance_payment_month" ON "students" ("advance_payment_month")
        `);

        // Add check constraints for data integrity
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD CONSTRAINT "CHK_payment_type" 
            CHECK ("payment_type" IN ('REGULAR', 'ADVANCE', 'MONTHLY', 'REFUND', 'SETTLEMENT'))
        `);

        // Add comment for documentation
        await queryRunner.query(`
            COMMENT ON COLUMN "payments"."payment_type" IS 'Payment classification: ADVANCE (initial), MONTHLY (regular), REFUND (checkout), SETTLEMENT (final)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "payments"."month_covered" IS 'Month covered by payment in YYYY-MM format (e.g., 2025-01)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "students"."advance_payment_month" IS 'Month covered by initial advance payment in YYYY-MM format'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove constraints first
        await queryRunner.query(`
            ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "CHK_payment_type"
        `);

        // Remove indexes
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_students_advance_payment_month"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_payments_month_covered"
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_payments_payment_type"
        `);

        // Remove columns
        await queryRunner.query(`
            ALTER TABLE "students" DROP COLUMN IF EXISTS "last_billing_month"
        `);

        await queryRunner.query(`
            ALTER TABLE "students" DROP COLUMN IF EXISTS "advance_payment_month"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments" DROP COLUMN IF EXISTS "month_covered"
        `);

        await queryRunner.query(`
            ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_type"
        `);
    }
}