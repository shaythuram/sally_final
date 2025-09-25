-- Migration: Add bot_id and meeting_id to calls
-- Safe to run multiple times
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS bot_id TEXT,
ADD COLUMN IF NOT EXISTS meeting_id TEXT;

-- Indexes for quicker lookup (optional)
CREATE INDEX IF NOT EXISTS idx_calls_bot_id ON calls(bot_id);
CREATE INDEX IF NOT EXISTS idx_calls_meeting_id ON calls(meeting_id);

