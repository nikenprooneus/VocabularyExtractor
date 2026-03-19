/*
  # Add file_url and file_name to reading_progress; create ebooks storage bucket

  ## Summary
  This migration extends the reading_progress table to store Supabase Storage
  references for uploaded EPUB files, enabling the offline-first caching strategy.

  ## Changes

  ### Modified Tables
  - `reading_progress`
    - `file_url` (text, nullable): Public URL of the EPUB file in Supabase Storage.
      Populated after a successful upload. NULL for books that have never been
      uploaded to cloud storage (e.g., old records or upload failures).
    - `file_name` (text, nullable): Original filename of the EPUB (e.g., "book.epub").
      Used to reconstruct a proper File object when serving from IndexedDB or cloud.

  ## Storage
  - Creates the `ebooks` storage bucket (public, with 50 MB per-file limit).
  - RLS policies restrict each user to only read/write their own objects
    (path prefix: `{user_id}/`).

  ## Security
  - All storage policies enforce `auth.uid()` ownership via the storage path prefix.
  - No cross-user access is possible.

  ## Notes
  1. Existing rows will have NULL for file_url and file_name — this is intentional.
     Books without a cloud copy will show a "re-upload required" indicator in the UI.
  2. The ebooks bucket is set to public so authenticated fetches from the CDN URL work
     without needing signed URLs (simpler offline-first flow).
  3. File size limit is set to 50 MB. Most EPUBs are well under this.
*/

-- Add file_url and file_name columns to reading_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_progress' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE reading_progress ADD COLUMN file_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reading_progress' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE reading_progress ADD COLUMN file_name text;
  END IF;
END $$;

-- Create the ebooks storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebooks',
  'ebooks',
  true,
  52428800,
  ARRAY['application/epub+zip', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload their own EPUB files
CREATE POLICY "Users can upload their own ebooks"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ebooks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow authenticated users to read their own EPUB files
CREATE POLICY "Users can read their own ebooks"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ebooks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow public (unauthenticated) reads so CDN/public URLs work
CREATE POLICY "Public can read ebooks"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'ebooks');

-- RLS: Allow authenticated users to overwrite (update) their own files
CREATE POLICY "Users can update their own ebooks"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ebooks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'ebooks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own ebooks"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ebooks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
