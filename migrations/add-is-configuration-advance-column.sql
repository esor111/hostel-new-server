-- Migration: Add is_configuration_advance column to payments table
-- Purpose: Separate configuration advance from regular payments for accurate invoice calculations
-- Date: 2025-11-05

-- Step 1: Add the new column with default value false
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS is_configuration_advance BOOLEAN DEFAULT false;

-- Step 2: Update existing configuration advance payments
-- Mark payments as configuration advance if they:
-- 1. Have payment_type = 'ADVANCE'
-- 2. Have notes containing 'configuration' or 'Advance payment'
-- 3. Were processed by 'advance_payment_system'
UPDATE payments 
SET is_configuration_advance = true 
WHERE payment_type = 'ADVANCE' 
  AND (
    notes ILIKE '%configuration%' 
    OR notes ILIKE '%Advance payment - Credit balance%'
  )
  AND processed_by = 'advance_payment_system';

-- Step 3: Verify the migration
-- This query shows how many payments were marked as configuration advance
SELECT 
  COUNT(*) as total_config_advances,
  SUM(amount) as total_config_advance_amount
FROM payments 
WHERE is_configuration_advance = true;

-- Step 4: Show breakdown by payment type
SELECT 
  payment_type,
  is_configuration_advance,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payments 
GROUP BY payment_type, is_configuration_advance
ORDER BY payment_type, is_configuration_advance;

-- Rollback script (if needed):
-- ALTER TABLE payments DROP COLUMN IF EXISTS is_configuration_advance;
