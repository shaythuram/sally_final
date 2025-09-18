-- Migration: Ensure future calls always include documents JSONB with default []

BEGIN;

-- 1) Reassert default and NOT NULL
ALTER TABLE calls
  ALTER COLUMN documents SET DEFAULT '[]'::jsonb,
  ALTER COLUMN documents SET NOT NULL;

-- 2) Trigger to coalesce NULL on insert/update
CREATE OR REPLACE FUNCTION ensure_calls_documents_not_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.documents IS NULL THEN NEW.documents := '[]'::jsonb; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_calls_documents_not_null'
  ) THEN
    CREATE TRIGGER trg_calls_documents_not_null
    BEFORE INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION ensure_calls_documents_not_null();
  END IF;
END $$;

COMMIT;


