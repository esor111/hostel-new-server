-- Migration: Add user_id column to multi_guest_bookings table
-- This enables user-based booking management and authentication

-- Add user_id column to multi_guest_bookings table
ALTER TABLE multi_guest_bookings 
ADD COLUMN user_id VARCHAR(255);

-- Create index on user_id for better query performance
CREATE INDEX idx_multi_guest_bookings_user_id ON multi_guest_bookings(user_id);

-- Optional: Update existing bookings to have a placeholder user_id
-- This can be customized based on your migration strategy
-- UPDATE multi_guest_bookings SET user_id = 'legacy-user' WHERE user_id IS NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN multi_guest_bookings.user_id IS 'User ID from JWT token - links booking to authenticated user';