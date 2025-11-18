-- Remove unique constraint on students.email to allow shared parent emails
-- Multiple students can have the same parent email, but phone numbers remain unique

-- Drop the unique index on email
DROP INDEX IF EXISTS "IDX_25985d58c714a4a427ced57507";

-- Note: Phone number remains unique as the primary identifier for students
-- This allows multiple students to share the same parent/guardian email address