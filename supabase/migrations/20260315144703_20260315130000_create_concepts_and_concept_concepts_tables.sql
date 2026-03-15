/*
  # Phase 1: Create normalized Knowledge Graph tables

  ## Summary
  Creates two new tables to replace the adjacency-list pattern in `concept_words`:

  ### New Tables

  1. `concepts`
     - `id` (uuid, PK) — intentionally accepts externally supplied UUIDs so we can
       preserve existing IDs during data migration
     - `user_id` (uuid, FK → auth.users) — owner of the concept
     - `name` (text, NOT NULL) — the concept label (e.g. "mind", "instinct")
     - `created_at` (timestamptz)

  2. `concept_concepts`
     - `id` (uuid, PK, auto-generated)
     - `user_id` (uuid, FK → auth.users)
     - `parent_id` (uuid, FK → concepts.id) — the broader / parent concept
     - `child_id` (uuid, FK → concepts.id) — the narrower / child concept
     - UNIQUE constraint on `(parent_id, child_id)` — prevents duplicate edges and
       enables `ON CONFLICT DO NOTHING` in the application layer

  ### Security
  - RLS enabled on both tables
  - Users can only SELECT / INSERT / UPDATE / DELETE their own rows
*/

-- ─── concepts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS concepts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concepts"
  ON concepts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concepts"
  ON concepts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concepts"
  ON concepts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own concepts"
  ON concepts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for frequent user-scoped queries
CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON concepts(user_id);

-- ─── concept_concepts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS concept_concepts (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id   uuid  NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  child_id    uuid  NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  CONSTRAINT concept_concepts_parent_child_unique UNIQUE (parent_id, child_id)
);

ALTER TABLE concept_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own concept relationships"
  ON concept_concepts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own concept relationships"
  ON concept_concepts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own concept relationships"
  ON concept_concepts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own concept relationships"
  ON concept_concepts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for edge lookups in both directions
CREATE INDEX IF NOT EXISTS idx_concept_concepts_user_id  ON concept_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_concepts_parent   ON concept_concepts(parent_id);
CREATE INDEX IF NOT EXISTS idx_concept_concepts_child    ON concept_concepts(child_id);
