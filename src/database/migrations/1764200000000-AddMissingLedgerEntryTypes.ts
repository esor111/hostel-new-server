import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingLedgerEntryTypes1764200000000 implements MigrationInterface {
    name = 'AddMissingLedgerEntryTypes1764200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add missing enum values to ledger_entries_v2_type_enum
        // PostgreSQL requires ALTER TYPE to add new enum values
        
        // Check if enum exists and add missing values
        // The enum values should match LedgerEntryType in ledger-entry.entity.ts:
        // Invoice, Payment, Discount, Adjustment, Refund, Penalty, Credit Note, 
        // Debit Note, Admin Charge, Advance Payment, Monthly Payment, Checkout Settlement

        // Add 'Adjustment' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Adjustment' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Adjustment';
                END IF;
            END $$;
        `);

        // Add 'Checkout Settlement' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Checkout Settlement' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Checkout Settlement';
                END IF;
            END $$;
        `);

        // Add 'Advance Payment' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Advance Payment' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Advance Payment';
                END IF;
            END $$;
        `);

        // Add 'Monthly Payment' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Monthly Payment' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Monthly Payment';
                END IF;
            END $$;
        `);

        // Add 'Refund' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Refund' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Refund';
                END IF;
            END $$;
        `);

        // Add 'Penalty' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Penalty' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Penalty';
                END IF;
            END $$;
        `);

        // Add 'Credit Note' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Credit Note' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Credit Note';
                END IF;
            END $$;
        `);

        // Add 'Debit Note' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Debit Note' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Debit Note';
                END IF;
            END $$;
        `);

        // Add 'Admin Charge' if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'Admin Charge' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
                ) THEN
                    ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE IF NOT EXISTS 'Admin Charge';
                END IF;
            END $$;
        `);

        console.log('✅ Added missing ledger entry type enum values');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL doesn't support removing enum values easily
        // This would require recreating the enum type
        console.log('⚠️ Cannot remove enum values in PostgreSQL without recreating the type');
    }
}
