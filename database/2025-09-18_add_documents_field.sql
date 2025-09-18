-- Migration: Add documents JSONB field to existing calls and backfill

BEGIN;

-- 1) Add column if it does not exist
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2) Backfill NULLs to empty array
UPDATE calls SET documents = '[]'::jsonb WHERE documents IS NULL;

-- 3) Enforce NOT NULL
ALTER TABLE calls
  ALTER COLUMN documents SET NOT NULL;

-- 4) Optional: index for JSONB queries on documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_calls_documents_gin'
  ) THEN
    CREATE INDEX idx_calls_documents_gin ON calls USING GIN (documents);
  END IF;
END $$;

COMMIT;


