-- Fix missing ledger entry type enum values
-- Run this SQL directly on your PostgreSQL database to fix the checkout error

-- Add 'Adjustment' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Adjustment' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Adjustment';
    END IF;
END $$;

-- Add 'Checkout Settlement' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Checkout Settlement' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Checkout Settlement';
    END IF;
END $$;

-- Add 'Advance Payment' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Advance Payment' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Advance Payment';
    END IF;
END $$;

-- Add 'Monthly Payment' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Monthly Payment' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Monthly Payment';
    END IF;
END $$;

-- Add 'Refund' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Refund' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Refund';
    END IF;
END $$;

-- Add 'Penalty' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Penalty' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Penalty';
    END IF;
END $$;

-- Add 'Credit Note' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Credit Note' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Credit Note';
    END IF;
END $$;

-- Add 'Debit Note' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Debit Note' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Debit Note';
    END IF;
END $$;

-- Add 'Admin Charge' if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'Admin Charge' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
    ) THEN
        ALTER TYPE "ledger_entries_v2_type_enum" ADD VALUE 'Admin Charge';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ledger_entries_v2_type_enum')
ORDER BY enumsortorder;
