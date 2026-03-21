/*
  # Drop unused indexes

  ## Summary
  The following indexes were reported as never used by the query planner.
  Removing them reduces write overhead (every INSERT/UPDATE/DELETE must maintain
  all indexes on the table) and saves storage.

  ## Indexes dropped
  - public.concept_concepts : idx_concept_concepts_parent
  - public.concept_concepts : idx_concept_concepts_child
  - public.flashcard_configs : idx_flashcard_configs_user_id
  - public.concept_words    : concepts_user_id_idx
  - public.annotations      : annotations_user_idx
  - public.reading_progress : reading_progress_user_id_idx

  Note: the new covering indexes added in the previous migration replace any
  legitimate lookup need that these served.
*/

DROP INDEX IF EXISTS public.idx_concept_concepts_parent;
DROP INDEX IF EXISTS public.idx_concept_concepts_child;
DROP INDEX IF EXISTS public.idx_flashcard_configs_user_id;
DROP INDEX IF EXISTS public.concepts_user_id_idx;
DROP INDEX IF EXISTS public.annotations_user_idx;
DROP INDEX IF EXISTS public.reading_progress_user_id_idx;
