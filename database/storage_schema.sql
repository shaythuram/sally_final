-- Supabase Storage and file metadata schema for call recordings and documents

-- 1) Create Storage buckets (id = name). These are idempotent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('call-recordings', 'call-recordings', false, NULL, ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/m4a'
  ]),
  ('call-documents', 'call-documents', false, NULL, ARRAY[
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf', 'image/png', 'image/jpeg'
  ])
ON CONFLICT (id) DO NOTHING;

-- 2) Helper notes on object naming convention (enforced via policies below):
--    name format: "<owner_uid>/<call_id>/<filename>"
--    Example: "00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111/rec.mp3"

-- 3) Row Level Security policies for recordings bucket
-- Enable RLS on storage.objects (enabled by default in Supabase projects)
-- Policies allow authenticated users to manage only files under their own uid path

CREATE POLICY "recordings_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "recordings_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-recordings'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "recordings_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'call-recordings'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "recordings_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 4) Row Level Security policies for documents bucket

CREATE POLICY "documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'call-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "documents_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'call-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'call-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'call-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 5) Relational metadata tables (optional but recommended)

-- Table to store metadata for recordings per call (supports multiple recordings per call)
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(call_id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- path in 'call-recordings' bucket
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_call_recordings"
ON call_recordings FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "insert_own_call_recordings"
ON call_recordings FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "update_own_call_recordings"
ON call_recordings FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "delete_own_call_recordings"
ON call_recordings FOR DELETE
USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_owner_id ON call_recordings(owner_id);

-- Table to store metadata for documents per call
CREATE TABLE IF NOT EXISTS call_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(call_id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- path in 'call-documents' bucket
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE call_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_call_documents"
ON call_documents FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "insert_own_call_documents"
ON call_documents FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "update_own_call_documents"
ON call_documents FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "delete_own_call_documents"
ON call_documents FOR DELETE
USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_call_documents_call_id ON call_documents(call_id);
CREATE INDEX IF NOT EXISTS idx_call_documents_owner_id ON call_documents(owner_id);


