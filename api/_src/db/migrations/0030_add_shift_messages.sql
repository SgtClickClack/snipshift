-- Migration: Add shift messages table for ephemeral chat channels
-- Description: Creates shift_messages table for dedicated chat channels between venue owners and assigned workers for filled shifts

-- Create shift_messages table
CREATE TABLE IF NOT EXISTS shift_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMP, -- NULL means unread, timestamp means read
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS shift_messages_shift_id_idx ON shift_messages(shift_id);
CREATE INDEX IF NOT EXISTS shift_messages_sender_id_idx ON shift_messages(sender_id);
CREATE INDEX IF NOT EXISTS shift_messages_recipient_id_idx ON shift_messages(recipient_id);
CREATE INDEX IF NOT EXISTS shift_messages_shift_created_at_idx ON shift_messages(shift_id, created_at);
CREATE INDEX IF NOT EXISTS shift_messages_read_at_idx ON shift_messages(read_at);

-- Add comments for documentation
COMMENT ON TABLE shift_messages IS 'Stores ephemeral chat messages for filled shifts between venue owner and assigned worker. Channels are archived/disabled 24 hours after shift completion.';
COMMENT ON COLUMN shift_messages.read_at IS 'NULL means unread, timestamp means when the message was read by the recipient';
