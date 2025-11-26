-- Fix attendance timezone issue
-- Change timestamp columns to timestamptz to properly store timezone info

-- Alter student_checkin_checkout table
ALTER TABLE student_checkin_checkout 
  ALTER COLUMN check_in_time TYPE timestamptz USING check_in_time AT TIME ZONE 'Asia/Kathmandu',
  ALTER COLUMN check_out_time TYPE timestamptz USING check_out_time AT TIME ZONE 'Asia/Kathmandu';

-- Note: Existing data will be converted assuming it was stored in Nepal timezone
