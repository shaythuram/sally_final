-- Migration: Add call_link to upcoming_calls
-- Safe to run multiple times
ALTER TABLE upcoming_calls
ADD COLUMN IF NOT EXISTS call_link TEXT; 

-- Optional simple URL-ish format check (comment out if undesired)
-- ALTER TABLE upcoming_calls
--   ADD CONSTRAINT IF NOT EXISTS upcoming_calls_call_link_is_url
--   CHECK (call_link IS NULL OR call_link ~* '^(https?|zoommtg|msteams):');
