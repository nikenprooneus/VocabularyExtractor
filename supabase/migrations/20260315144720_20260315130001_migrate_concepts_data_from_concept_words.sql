/*
  # Phase 2: Extract concept entities and relationships from concept_words

  ## Summary
  Copies existing data from the legacy `concept_words` table into the two new
  normalised tables — preserving all existing UUIDs and relationships exactly.

  ### Step 1 — Migrate concept entities
  All rows in `concept_words` where `node_type = 'concept'` are inserted into
  `concepts`, keeping their exact `id`, `user_id`, `name`, and `created_at` values.

  ### Step 2 — Migrate concept relationships (edges)
  All concept rows that have a non-null `parent_id` are inserted into
  `concept_concepts` as directed edges (parent → child).
  A new `id` UUID is generated for each edge row.

  ### Important Notes
  - No rows are deleted or modified in `concept_words` during this phase.
    Deletion happens in Phase 3 only after this step succeeds.
  - The UNIQUE constraint on concept_concepts(parent_id, child_id) is naturally
    satisfied because each parent→child pair exists exactly once in the source data.
*/

-- Step 1: Copy concept entities (preserve exact UUIDs)
INSERT INTO concepts (id, user_id, name, created_at)
SELECT id, user_id, name, created_at
FROM concept_words
WHERE node_type = 'concept';

-- Step 2: Copy parent→child relationships
INSERT INTO concept_concepts (user_id, parent_id, child_id)
SELECT user_id, parent_id, id
FROM concept_words
WHERE node_type = 'concept'
  AND parent_id IS NOT NULL;
