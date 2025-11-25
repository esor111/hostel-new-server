-- Add contact_person_user_id column to students table
-- This stores the contact person's userId for booking-related notifications

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS contact_person_user_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_contact_person_user_id 
ON students(contact_person_user_id);

-- Add comment
COMMENT ON COLUMN students.contact_person_user_id IS 'Contact person userId from booking (for notifications to parent/guardian)';
