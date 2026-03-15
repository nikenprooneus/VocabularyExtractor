/*
  # Create Concepts Table

  ## Summary
  Creates the `concepts` table for storing hierarchical vocabulary concept trees.
  Each concept represents a semantic node (tier 1/2/3 or word) in a polysemic
  meaning tree. Concepts are user-owned and can be linked in a parent-child
  hierarchy to represent concept ancestry paths like "human > emotion > anger".

  ## New Tables

  ### `concepts`
  - `id` (uuid, PK) - Unique identifier
  - `user_id` (uuid, FK to auth.users) - Owner of the concept
  - `name` (text) - Concept name, always stored lowercase-trimmed
  - `parent_id` (uuid, nullable, FK self-referencing concepts.id) - Parent concept
    in the hierarchy; NULL means this is a root concept
  - `created_at` (timestamptz) - Record creation timestamp

  ## Constraints
  - Unique constraint on (user_id, name) prevents duplicate concept names per user
  - Self-referencing FK on parent_id enforces referential integrity within the tree

  ## Security
  - RLS enabled with strict per-user access policies
  - Users can only read, insert, and update their own concepts
*/

CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES concepts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT concepts_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS concepts_user_id_idx ON concepts(user_id);
CREATE INDEX IF NOT EXISTS concepts_parent_id_idx ON concepts(parent_id);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own concepts"
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
