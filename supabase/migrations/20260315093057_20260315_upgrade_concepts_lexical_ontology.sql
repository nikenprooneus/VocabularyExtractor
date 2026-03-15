/*
  # Lexical Ontology Upgrade — Polysemy & Node Type Support

  ## Summary
  Upgrades the `concepts` table to support a true Lexical Ontology where:
  - The same vocabulary word can appear multiple times with different semantic lineages (polysemy)
  - Each node is typed as either a shared 'concept' (Tier 1/2/3) or a 'word' (vocabulary entry)
  - The relationship label between a word and its parent concept is preserved

  ## Changes

  ### 1. Remove Unique Constraint on (user_id, name)
  The old unique constraint prevented saving a word like "intuitive" more than once.
  With polysemy, the same word can have multiple meanings, each linked to a different
  concept branch. The constraint is dropped so multiple rows with the same name are allowed.

  ### 2. New Column: node_type (text, not null, default 'concept')
  Distinguishes between:
  - 'concept' — a shared abstract concept node (Tier 1, 2, or 3), reused across words
  - 'word'    — a vocabulary word entry, always leaf nodes, may appear multiple times

  ### 3. New Column: concept_link (text, nullable)
  Stores the relationship label from a word node to its parent concept.
  Examples: 'described by', 'nominal', 'agent', 'describing'
  - NULL for concept-type nodes
  - Non-null string for word-type nodes when a link label was provided by the AI

  ## Security
  - RLS remains enabled; no policy changes needed (existing policies cover new columns)
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'concepts'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%user_id%name%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE concepts DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'concepts'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%user_id%name%'
      LIMIT 1
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'concepts'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'concepts_user_id_name_key'
  ) THEN
    NULL;
  END IF;
END $$;

ALTER TABLE concepts DROP CONSTRAINT IF EXISTS concepts_user_id_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'node_type'
  ) THEN
    ALTER TABLE concepts ADD COLUMN node_type text NOT NULL DEFAULT 'concept'
      CHECK (node_type IN ('concept', 'word'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concepts' AND column_name = 'concept_link'
  ) THEN
    ALTER TABLE concepts ADD COLUMN concept_link text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS concepts_user_id_name_node_type_idx
  ON concepts (user_id, name, node_type);

CREATE INDEX IF NOT EXISTS concepts_user_id_parent_id_name_idx
  ON concepts (user_id, parent_id, name);
