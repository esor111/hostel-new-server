-- Fix undefined values in ledger entry descriptions
-- This script updates existing ledger entries that have "undefined" in their descriptions

-- Update payment entries with undefined student names
UPDATE ledger_entries 
SET description = CONCAT(
    'Payment received - ',
    SUBSTRING(description FROM 'Payment received - ([^-]+) -'),
    ' - ',
    (SELECT name FROM students WHERE students.id = ledger_entries.student_id)
)
WHERE description LIKE '%Payment received%undefined%'
AND type = 'payment'
AND student_id IS NOT NULL;

-- Update invoice entries with undefined student names  
UPDATE ledger_entries 
SET description = CONCAT(
    'Invoice for ',
    SUBSTRING(description FROM 'Invoice for ([^-]+) -'),
    ' - ',
    (SELECT name FROM students WHERE students.id = ledger_entries.student_id)
)
WHERE description LIKE '%Invoice for%undefined%'
AND type = 'invoice'
AND student_id IS NOT NULL;

-- Update discount entries with undefined student names
UPDATE ledger_entries 
SET description = CONCAT(
    'Discount applied - ',
    SUBSTRING(description FROM 'Discount applied - ([^-]+) -'),
    ' - ',
    (SELECT name FROM students WHERE students.id = ledger_entries.student_id)
)
WHERE description LIKE '%Discount applied%undefined%'
AND type = 'discount'
AND student_id IS NOT NULL;

-- Verify the changes
SELECT 
    id,
    student_id,
    type,
    description,
    created_at
FROM ledger_entries 
WHERE description LIKE '%undefined%'
ORDER BY created_at DESC
LIMIT 10;