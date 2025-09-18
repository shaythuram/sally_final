-- Migration: Add labels, members_emails, members_uids to existing calls and backfill

BEGIN;

-- 1) Add columns if they do not exist
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS members_emails JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS members_uids JSONB DEFAULT '[]'::jsonb;

-- 2) Backfill NULLs to empty arrays
UPDATE calls SET labels = '[]'::jsonb WHERE labels IS NULL;
UPDATE calls SET members_emails = '[]'::jsonb WHERE members_emails IS NULL;
UPDATE calls SET members_uids = '[]'::jsonb WHERE members_uids IS NULL;

-- 3) Enforce NOT NULL
ALTER TABLE calls
  ALTER COLUMN labels SET NOT NULL,
  ALTER COLUMN members_emails SET NOT NULL,
  ALTER COLUMN members_uids SET NOT NULL;

-- 4) Optional indexes for JSONB array membership queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_calls_labels_gin'
  ) THEN
    CREATE INDEX idx_calls_labels_gin ON calls USING GIN (labels);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_calls_members_emails_gin'
  ) THEN
    CREATE INDEX idx_calls_members_emails_gin ON calls USING GIN (members_emails);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_calls_members_uids_gin'
  ) THEN
    CREATE INDEX idx_calls_members_uids_gin ON calls USING GIN (members_uids);
  END IF;
END $$;

COMMIT;


