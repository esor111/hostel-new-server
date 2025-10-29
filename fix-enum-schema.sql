-- Fix PostgreSQL enum type after removing security_deposit
-- Run this in your PostgreSQL client

-- Step 1: Check current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'student_financial_info_fee_type_enum'
);

-- Step 2: Remove the security_deposit value from the enum
ALTER TYPE student_financial_info_fee_type_enum RENAME TO student_financial_info_fee_type_enum_old;

-- Step 3: Create new enum without security_deposit
CREATE TYPE student_financial_info_fee_type_enum AS ENUM (
    'base_monthly',
    'laundry', 
    'food',
    'utilities',
    'maintenance'
);

-- Step 4: Update the column to use the new enum
ALTER TABLE student_financial_info 
ALTER COLUMN fee_type TYPE student_financial_info_fee_type_enum 
USING fee_type::text::student_financial_info_fee_type_enum;

-- Step 5: Drop the old enum type
DROP TYPE student_financial_info_fee_type_enum_old;

-- Step 6: Verify the fix
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'student_financial_info_fee_type_enum'
);

SELECT '✅ Enum type updated successfully!' as result;