-- Simple SQL script to remove security deposit data
-- Run this in your PostgreSQL client (pgAdmin, DBeaver, etc.)

-- Step 1: Check how many security deposit records exist
SELECT 'Current security deposit records:' as info, COUNT(*) as count 
FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 2: Show all fee types before cleanup
SELECT 'Fee types before cleanup:' as info, fee_type, COUNT(*) as count 
FROM student_financial_info 
GROUP BY fee_type 
ORDER BY fee_type;

-- Step 3: Create backup (optional - comment out if not needed)
DROP TABLE IF EXISTS security_deposit_backup;
CREATE TABLE security_deposit_backup AS
SELECT *, NOW() as backup_created_at
FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 4: Remove all security deposit records
DELETE FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 5: Verify removal
SELECT 'Security deposits after removal:' as info, COUNT(*) as count 
FROM student_financial_info 
WHERE fee_type = 'security_deposit';

-- Step 6: Show remaining fee types
SELECT 'Fee types after cleanup:' as info, fee_type, COUNT(*) as count 
FROM student_financial_info 
GROUP BY fee_type 
ORDER BY fee_type;

-- Success message
SELECT '✅ Security deposit data removal completed!' as result;