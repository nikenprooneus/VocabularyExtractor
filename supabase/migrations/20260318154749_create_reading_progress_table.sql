/*
  # Create reading_progress table

  ## Summary
  Stores per-user EPUB reading progress, keyed by a stable book identifier
  (the EPUB's internal dc:identifier metadata field, or a SHA-256 hash of the
  file contents when dc:identifier is absent). This prevents collisions when
  different books share the same filename.

  ## New Tables
  - `reading_progress`
    - `id` (uuid, primary key) – auto-generated row identifier
    - `user_id` (uuid, FK → auth.users) – owner of this progress record
    - `book_id` (text) – stable book identifier (dc:identifier or file hash)
    - `book_title` (text) – human-readable title for display purposes
    - `book_author` (text, nullable) – author string from EPUB metadata
    - `cover_url` (text, nullable) – data-URL or object-URL of the cover image
    - `cfi` (text, nullable) – EPUB CFI (Canonical Fragment Identifier) marking
      the last-read location inside the book
    - `percentage` (numeric 0–1, nullable) – approximate read percentage
    - `last_opened_at` (timestamptz) – timestamp of most recent read session
    - `created_at` (timestamptz) – row creation timestamp

  ## Security
  - RLS enabled; authenticated users can only access their own rows.
  - Separate SELECT, INSERT, UPDATE, DELETE policies enforcing auth.uid() = user_id.
*/

CREATE TABLE IF NOT EXISTS reading_progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id         text        NOT NULL,
  book_title      text        NOT NULL DEFAULT '',
  book_author     text,
  cover_url       text,
  cfi             text,
  percentage      numeric(5,4) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 1)),
  last_opened_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON reading_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON reading_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reading_progress_user_id_idx
  ON reading_progress (user_id);

CREATE INDEX IF NOT EXISTS reading_progress_user_book_idx
  ON reading_progress (user_id, book_id);
