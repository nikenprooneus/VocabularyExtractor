/*
  # Phase 3: Refactor concept_words into a pure vocabulary-words table

  ## Summary
  Now that concept entities and their hierarchy are safely stored in the new
  `concepts` and `concept_concepts` tables, we clean up `concept_words` so it
  exclusively holds vocabulary words.

  ### Changes

  1. Delete all concept-type rows (they have been safely migrated in Phase 2)
  2. Drop the self-referencing FK constraint on parent_id (references concept_words.id)
  3. Drop the node_type CHECK constraint
  4. Drop the node_type column entirely
  5. Rename column `name`      → `word`      (vocabulary word, not a concept label)
  6. Rename column `parent_id` → `concept_id` (now points to concepts.id)
  7. Add a new FK constraint: concept_id → concepts(id)

  ### Important Notes
  - Step 1 (DELETE) runs before any structural changes to ensure clean state
  - The rename operations use IF EXISTS guards where possible
  - After this migration, concept_words holds ONLY word nodes with concept_id as the FK
*/

-- Step 1: Remove migrated concept rows (safe — they are fully copied to `concepts`)
DELETE FROM concept_words WHERE node_type = 'concept';

-- Step 2: Drop the self-referencing FK on parent_id (pointed to concept_words.id)
ALTER TABLE concept_words DROP CONSTRAINT IF EXISTS concept_words_parent_id_fkey;

-- Step 3: Drop the node_type CHECK constraint
ALTER TABLE concept_words DROP CONSTRAINT IF EXISTS concepts_node_type_check;

-- Step 4: Drop the node_type column
ALTER TABLE concept_words DROP COLUMN IF EXISTS node_type;

-- Step 5: Rename name → word
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concept_words' AND column_name = 'name'
  ) THEN
    ALTER TABLE concept_words RENAME COLUMN name TO word;
  END IF;
END $$;

-- Step 6: Rename parent_id → concept_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'concept_words' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE concept_words RENAME COLUMN parent_id TO concept_id;
  END IF;
END $$;

-- Step 7: Add FK constraint concept_id → concepts(id)
ALTER TABLE concept_words
  ADD CONSTRAINT concept_words_concept_id_fkey
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE;
