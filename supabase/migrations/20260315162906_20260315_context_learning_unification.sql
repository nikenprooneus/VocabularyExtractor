/*
  # Context-Based Learning Unification

  ## Summary
  This migration consolidates the vocabulary storage model around a new `words` table
  (replacing `vocabulary_data`) and restructures `concept_words` to link directly to
  `words` rows via `word_id` instead of storing a redundant text `word` column.

  ## Changes

  ### 1. Truncate concept_words
  - Clean slate before altering schema (all rows are test data)

  ### 2. New Lookup Tables (read-only for authenticated users)
  - `tones` — e.g. "Neutral", "Slightly Formal"
  - `dialects` — e.g. "American English", "British English"
  - `modes` — e.g. "Written", "Spoken"
  - `nuances` — e.g. "Positive", "Negative", "Neutral"
  - `registers` — e.g. "Academic", "Casual", "Professional"
  Each table: id (UUID PK), name (TEXT UNIQUE NOT NULL), created_at

  ### 3. Rename vocabulary_data → words
  - Column `results` renamed to `note` (stores GeneratedResult JSON)
  - Add 5 nullable FK columns: tone_id, register_id, dialect_id, mode_id, nuance_id
  - Add UNIQUE constraint on (user_id, word, example)

  ### 4. Restructure concept_words
  - Drop old `word` TEXT column
  - Add `word_id` UUID NOT NULL FK → words(id) ON DELETE CASCADE

  ### Security
  - All new tables have RLS enabled
  - Lookup tables: SELECT for authenticated users only
  - words table: full CRUD for owner only (mirrors vocabulary_data policies)
  - concept_words: updated policies remain owner-scoped
*/

-- ─── 1. Clean slate ───────────────────────────────────────────────────────────
TRUNCATE TABLE concept_words;

-- ─── 2. Lookup tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dialects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nuances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Seed tones
INSERT INTO tones (name) VALUES
  ('Neutral'),
  ('Slightly Formal'),
  ('Formal'),
  ('Very Formal'),
  ('Slightly Informal'),
  ('Informal'),
  ('Very Informal'),
  ('Humorous'),
  ('Sarcastic'),
  ('Serious'),
  ('Ironic'),
  ('Solemn')
ON CONFLICT (name) DO NOTHING;

-- Seed dialects
INSERT INTO dialects (name) VALUES
  ('American English'),
  ('British English'),
  ('Australian English'),
  ('Canadian English'),
  ('Indian English'),
  ('South African English'),
  ('Irish English'),
  ('Scottish English'),
  ('New Zealand English'),
  ('General English')
ON CONFLICT (name) DO NOTHING;

-- Seed modes
INSERT INTO modes (name) VALUES
  ('Written'),
  ('Spoken'),
  ('Written and Spoken'),
  ('Literary'),
  ('Digital / Online')
ON CONFLICT (name) DO NOTHING;

-- Seed nuances
INSERT INTO nuances (name) VALUES
  ('Positive'),
  ('Negative'),
  ('Neutral'),
  ('Ambiguous'),
  ('Pejorative'),
  ('Meliorative'),
  ('Euphemistic')
ON CONFLICT (name) DO NOTHING;

-- Seed registers
INSERT INTO registers (name) VALUES
  ('Academic'),
  ('Casual'),
  ('Professional'),
  ('Technical'),
  ('Legal'),
  ('Medical'),
  ('Literary'),
  ('Journalistic'),
  ('Religious'),
  ('Colloquial')
ON CONFLICT (name) DO NOTHING;

-- ─── RLS on lookup tables ────────────────────────────────────────────────────

ALTER TABLE tones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dialects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tones"
  ON tones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read dialects"
  ON dialects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read modes"
  ON modes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read nuances"
  ON nuances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read registers"
  ON registers FOR SELECT TO authenticated USING (true);

-- ─── 3. Rename vocabulary_data → words, restructure ──────────────────────────

ALTER TABLE vocabulary_data RENAME TO words;

-- Rename results column to note
ALTER TABLE words RENAME COLUMN results TO note;

-- Add FK columns for lookup tables
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS tone_id uuid REFERENCES tones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS register_id uuid REFERENCES registers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dialect_id uuid REFERENCES dialects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mode_id uuid REFERENCES modes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nuance_id uuid REFERENCES nuances(id) ON DELETE SET NULL;

-- Add unique constraint on (user_id, word, example)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'words_user_id_word_example_key'
  ) THEN
    ALTER TABLE words ADD CONSTRAINT words_user_id_word_example_key UNIQUE (user_id, word, example);
  END IF;
END $$;

-- Update RLS policies on words table (drop old vocabulary_data policies, add new ones)
DROP POLICY IF EXISTS "Users can read own vocabulary data" ON words;
DROP POLICY IF EXISTS "Users can insert own vocabulary data" ON words;
DROP POLICY IF EXISTS "Users can update own vocabulary data" ON words;
DROP POLICY IF EXISTS "Users can delete own vocabulary data" ON words;

CREATE POLICY "Users can read own words"
  ON words FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON words FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
  ON words FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own words"
  ON words FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ─── 4. Restructure concept_words: drop word text, add word_id FK ────────────

-- Drop old word column
ALTER TABLE concept_words DROP COLUMN IF EXISTS word;

-- Add word_id FK
ALTER TABLE concept_words
  ADD COLUMN IF NOT EXISTS word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE;
