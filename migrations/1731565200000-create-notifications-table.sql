-- Migration: Create notifications table
-- Date: 2025-11-14
-- Description: Create notifications table for capturing user and business notifications with seen/unseen tracking

CREATE TYPE recipient_type_enum AS ENUM ('USER', 'BUSINESS');
CREATE TYPE notification_category_enum AS ENUM ('PAYMENT', 'BOOKING', 'CONFIGURATION', 'INVOICE', 'GENERAL', 'BULK_MESSAGE');
CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type recipient_type_enum NOT NULL,
    recipient_id UUID NOT NULL,
    category notification_category_enum NOT NULL,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    status delivery_status_enum NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_notifications_recipient ON notifications (recipient_type, recipient_id);
CREATE INDEX idx_notifications_category ON notifications (category);
CREATE INDEX idx_notifications_status ON notifications (status);
CREATE INDEX idx_notifications_seen_at ON notifications (seen_at);
CREATE INDEX idx_notifications_created_at ON notifications (created_at);
CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Stores notification records for both users and businesses with delivery tracking';
COMMENT ON COLUMN notifications.recipient_type IS 'Whether notification is for USER or BUSINESS';
COMMENT ON COLUMN notifications.recipient_id IS 'UUID of the recipient (userId or businessId)';
COMMENT ON COLUMN notifications.category IS 'Type of notification (PAYMENT, BOOKING, etc.)';
COMMENT ON COLUMN notifications.metadata IS 'Additional structured data (FCM token, booking details, etc.)';
COMMENT ON COLUMN notifications.status IS 'Delivery status (PENDING, SENT, FAILED, SKIPPED)';
COMMENT ON COLUMN notifications.seen_at IS 'When recipient marked as seen (NULL = unseen)';
