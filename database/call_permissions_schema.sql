-- Call permissions schema (standalone) ---------------------------------------
-- This file only creates and secures the call_permissions table.
-- It does not touch Storage buckets/policies.

-- Table holds a single row per call_id with owner and (optional) role assignees
CREATE TABLE IF NOT EXISTS call_permissions (
  call_id UUID PRIMARY KEY REFERENCES calls(call_id) ON DELETE CASCADE,
  owner   UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  admin   UUID NULL     REFERENCES user_profiles(uid) ON DELETE SET NULL,
  editor  UUID NULL     REFERENCES user_profiles(uid) ON DELETE SET NULL,
  viewer  UUID NULL     REFERENCES user_profiles(uid) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS ------------------------------------------------------------------------
ALTER TABLE call_permissions ENABLE ROW LEVEL SECURITY;

-- Owner can read their row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'select_call_permissions_owner'
      AND schemaname = 'public' AND tablename = 'call_permissions'
  ) THEN
    CREATE POLICY "select_call_permissions_owner"
    ON call_permissions FOR SELECT TO authenticated
    USING (auth.uid() = owner);
  END IF;
END $$;

-- Owner can insert their row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'insert_call_permissions_owner'
      AND schemaname = 'public' AND tablename = 'call_permissions'
  ) THEN
    CREATE POLICY "insert_call_permissions_owner"
    ON call_permissions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner);
  END IF;
END $$;

-- Owner can update their row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'update_call_permissions_owner'
      AND schemaname = 'public' AND tablename = 'call_permissions'
  ) THEN
    CREATE POLICY "update_call_permissions_owner"
    ON call_permissions FOR UPDATE TO authenticated
    USING (auth.uid() = owner)
    WITH CHECK (auth.uid() = owner);
  END IF;
END $$;

-- Optional: keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_call_permissions_updated_at'
  ) THEN
    CREATE TRIGGER trg_call_permissions_updated_at
    BEFORE UPDATE ON call_permissions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


