-- Migration to safely remove security deposit data before enum schema update
-- Run this BEFORE starting the application after removing SECURITY_DEPOSIT from enum

-- Step 1: Check existing security deposit records
SELECT COUNT(*) as security_deposit_count 
FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 2: Backup security deposit data (optional - for recovery if needed)
CREATE TABLE IF NOT EXISTS security_deposit_backup AS
SELECT * FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 3: Remove all security deposit records
DELETE FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 4: Verify removal
SELECT COUNT(*) as remaining_security_deposits 
FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 5: Show remaining fee types
SELECT fee_type, COUNT(*) as count 
FROM student_financial_info 
GROUP BY fee_type 
ORDER BY fee_type;