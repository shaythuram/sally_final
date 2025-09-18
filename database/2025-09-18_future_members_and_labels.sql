-- Migration: Ensure future calls always have non-null defaults for labels/members

BEGIN;

-- 1) Reassert defaults and NOT NULL constraints
ALTER TABLE calls
  ALTER COLUMN labels SET DEFAULT '[]'::jsonb,
  ALTER COLUMN labels SET NOT NULL,
  ALTER COLUMN members_emails SET DEFAULT '[]'::jsonb,
  ALTER COLUMN members_emails SET NOT NULL,
  ALTER COLUMN members_uids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN members_uids SET NOT NULL;

-- 2) Create or replace a trigger function to enforce non-null on insert/update
CREATE OR REPLACE FUNCTION ensure_calls_members_and_labels_not_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.labels IS NULL THEN NEW.labels := '[]'::jsonb; END IF;
  IF NEW.members_emails IS NULL THEN NEW.members_emails := '[]'::jsonb; END IF;
  IF NEW.members_uids IS NULL THEN NEW.members_uids := '[]'::jsonb; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_calls_members_and_labels_not_null'
  ) THEN
    CREATE TRIGGER trg_calls_members_and_labels_not_null
    BEFORE INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION ensure_calls_members_and_labels_not_null();
  END IF;
END $$;

COMMIT;


