-- Migration: Add call_link to calls
-- Safe to run multiple times
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS call_link TEXT; 

-- Optional simple URL-ish format check (comment out if undesired)
-- ALTER TABLE calls
--   ADD CONSTRAINT IF NOT EXISTS calls_call_link_is_url
--   CHECK (call_link IS NULL OR call_link ~* '^(https?|zoommtg|msteams):');
