/*
  # Add context_definition column to concepts table

  ## Summary
  Adds a nullable text column `context_definition` to the `concepts` table to store
  the contextual meaning that justified saving a word under a specific concept path.

  ## Changes
  - `concepts` table: new column `context_definition` (text, nullable)
    - Only populated for `node_type = 'word'` rows
    - Tier 1/2/3 concept nodes leave this null

  ## Notes
  - Existing rows are unaffected; the column defaults to NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'context_definition'
  ) THEN
    ALTER TABLE concepts ADD COLUMN context_definition text;
  END IF;
END $$;
