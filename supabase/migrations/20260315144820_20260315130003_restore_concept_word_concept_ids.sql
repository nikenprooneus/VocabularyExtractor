/*
  # Fix: Restore concept_id values on word rows in concept_words

  ## Summary
  During Phase 3, renaming parent_id → concept_id happened after the DELETE of
  concept rows, but the column rename preserved the existing values. However,
  the FK constraint addition required the referenced concept rows to exist.
  Since we verified the UUIDs now exist in the `concepts` table (they were
  preserved exactly in Phase 2), we restore the correct concept_id values
  for the two existing word rows using their known original parent UUIDs.

  The original parent_id values came from the concept_words data snapshot:
  - Word row 444c5716 ("intuitive") → parent was b1c48983 (instinct)
  - Word row 97f17691  ("intuitive") → parent was 6795b0c9 (ease)

  These UUIDs exist in concepts (migrated in Phase 2), so the FK is satisfied.
*/

UPDATE concept_words
SET concept_id = 'b1c48983-46f0-4fd6-9654-ff027abe56e7'
WHERE id = '444c5716-bcfe-47cb-a3ec-372d5e8d4e24'
  AND concept_id IS NULL;

UPDATE concept_words
SET concept_id = '6795b0c9-7514-4321-b6c4-0f20c53a4baa'
WHERE id = '97f17691-1cb9-4269-8680-f9582e9647dc'
  AND concept_id IS NULL;
