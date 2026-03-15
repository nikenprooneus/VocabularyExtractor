/*
  # Rename concepts table to concept_words and add word_link_id FK

  ## Summary
  This migration completes the normalization of the concept link relationship field.
  It renames the `concepts` table to `concept_words`, repairs the self-referencing FK,
  migrates all existing free-text concept_link values to the new FK column, then
  removes the old text column.

  ## Changes

  ### Table Rename
  - `concepts` → `concept_words`

  ### FK Constraint Updates
  - Drop and recreate `parent_id` self-referencing FK to point to `concept_words(id)`
    (preserves ON DELETE SET NULL behavior)

  ### New Column
  - `word_link_id` (uuid, nullable) — FK referencing `word_links(id)`

  ### RLS Policies
  - Drop all 4 existing policies from `concepts` (now on `concept_words`)
  - Recreate identical policies targeting `concept_words`

  ### Data Migration
  - Populate `word_link_id` by matching existing `concept_link` text (case-insensitive)
    against `word_links.name`

  ### Column Removal
  - Drop the now-redundant `concept_link` text column
*/

-- 1. Rename the table
ALTER TABLE concepts RENAME TO concept_words;

-- 2. Drop and recreate the self-referencing FK on parent_id
ALTER TABLE concept_words DROP CONSTRAINT IF EXISTS concepts_parent_id_fkey;
ALTER TABLE concept_words
  ADD CONSTRAINT concept_words_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES concept_words(id) ON DELETE SET NULL;

-- 3. Drop old RLS policies (they were attached to the table, now renamed)
DROP POLICY IF EXISTS "Users can read own concepts" ON concept_words;
DROP POLICY IF EXISTS "Users can insert own concepts" ON concept_words;
DROP POLICY IF EXISTS "Users can update own concepts" ON concept_words;
DROP POLICY IF EXISTS "Users can delete own concepts" ON concept_words;

-- 4. Recreate RLS policies on concept_words
CREATE POLICY "Users can read own concept_words"
  ON concept_words
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concept_words"
  ON concept_words
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concept_words"
  ON concept_words
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own concept_words"
  ON concept_words
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Add word_link_id column referencing word_links
ALTER TABLE concept_words
  ADD COLUMN IF NOT EXISTS word_link_id uuid REFERENCES word_links(id);

-- 6. Data migration: populate word_link_id from existing concept_link text
UPDATE concept_words cw
SET word_link_id = wl.id
FROM word_links wl
WHERE lower(trim(cw.concept_link)) = lower(trim(wl.name))
  AND cw.concept_link IS NOT NULL;

-- 7. Drop the old free-text concept_link column
ALTER TABLE concept_words DROP COLUMN IF EXISTS concept_link;
