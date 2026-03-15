/*
  # Drop incorrect unique constraint on concepts table

  ## Problem
  The table has a UNIQUE (user_id, name) constraint named `concepts_user_name_unique`.
  This prevents the same word (e.g., "intuitive") from being saved under multiple
  different parent concept paths, which is a valid and expected use case.

  A previous migration attempted to drop a constraint named `concepts_user_id_name_key`
  but that name was wrong, so the constraint silently remained.

  ## Changes
  - Drop `concepts_user_name_unique` constraint from the `concepts` table

  ## Impact
  Users will now be able to save the same word name under different parent concepts
  (e.g., "intuitive" under both "instinct" and "ease" as separate meaning trees).
*/

ALTER TABLE concepts DROP CONSTRAINT IF EXISTS concepts_user_name_unique;
