
/*
  # Wipe Core Graph Tables

  ## Summary
  Clears all test data from the four core graph tables while preserving the 5 TMRND lookup tables.

  ## Tables Truncated
  - `concept_concepts` - relationship edges between concepts (cleared first due to FK dependencies)
  - `concept_words` - junction table linking words to concepts
  - `concepts` - core concept nodes
  - `words` - core word nodes

  ## Behavior
  - `RESTART IDENTITY` resets all serial/sequence counters to 1 for a fully clean slate
  - `CASCADE` handles any remaining foreign key constraints automatically

  ## Tables Left Untouched
  - `tones`, `dialects`, `modes`, `nuances`, `registers` (TMRND lookup tables remain fully seeded)
*/

TRUNCATE TABLE concept_concepts, concept_words, concepts, words RESTART IDENTITY CASCADE;
