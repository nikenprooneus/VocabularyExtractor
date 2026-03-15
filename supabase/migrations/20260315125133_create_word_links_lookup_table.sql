/*
  # Create word_links lookup table

  ## Summary
  Creates a new normalized lookup table for concept link relationship types.
  This replaces the free-text `concept_link` column on the concepts table with
  a proper relational foreign key, preparing the schema for a Knowledge Graph architecture.

  ## New Tables
  - `word_links`
    - `id` (uuid, primary key, auto-generated)
    - `name` (text, unique, not null) — the relationship label

  ## Seed Data
  Pre-populates 8 canonical relationship types:
    1. idiom
    2. nominal
    3. agent
    4. patient
    5. action
    6. described by
    7. describing
    8. other phrase

  ## Security
  - RLS is enabled on `word_links`
  - All authenticated users can read the lookup table (it is shared reference data)
  - No insert/update/delete policies are created — only admins via service role can mutate it
*/

CREATE TABLE IF NOT EXISTS word_links (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

ALTER TABLE word_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read word_links"
  ON word_links
  FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO word_links (name) VALUES
  ('idiom'),
  ('nominal'),
  ('agent'),
  ('patient'),
  ('action'),
  ('described by'),
  ('describing'),
  ('other phrase')
ON CONFLICT (name) DO NOTHING;
