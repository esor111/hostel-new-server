-- Remove unique constraint on students.email
-- Multiple students can share the same contact person (parent) email

-- Drop the unique constraint on email column
ALTER TABLE students DROP CONSTRAINT IF EXISTS UQ_students_email;

-- Also drop any unique index on email if it exists
DROP INDEX IF EXISTS students_email_key;

-- Note: Phone remains unique as it's the student's personal identifier
