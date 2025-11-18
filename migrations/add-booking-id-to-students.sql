-- Add booking_id column to students table to link students back to their booking
-- This allows us to retrieve the contact person (parent) information for any student

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS booking_id UUID NULL;

-- Add foreign key constraint (check if it doesn't exist first)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_students_booking' 
        AND table_name = 'students'
    ) THEN
        ALTER TABLE students
        ADD CONSTRAINT fk_students_booking
        FOREIGN KEY (booking_id) 
        REFERENCES multi_guest_bookings(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_booking_id ON students(booking_id);

-- 🔧 FIX: Remove foreign key constraint on multi_guest_bookings.user_id
-- The user_id is from external Kaha API, not a local users table
ALTER TABLE multi_guest_bookings
DROP CONSTRAINT IF EXISTS FK_05d1df436632dc19446274b6a6b;

-- Ensure user_id can be nullable (it should store external Kaha userId)
ALTER TABLE multi_guest_bookings 
ALTER COLUMN user_id DROP NOT NULL;

-- Add phone and email columns to booking_guests table
ALTER TABLE booking_guests
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '';

-- Add indexes for guest contact lookups
CREATE INDEX IF NOT EXISTS idx_booking_guests_email ON booking_guests(email);
CREATE INDEX IF NOT EXISTS idx_booking_guests_phone ON booking_guests(phone);

-- Note: Existing students will have NULL booking_id (since they were created before this change)
-- New students created from bookings will have the booking_id populated automatically
-- Existing booking_guests will have empty phone/email (need manual update if needed)
