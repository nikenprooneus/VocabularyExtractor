/*
  # Add missing covering indexes for foreign keys

  ## Summary
  Several foreign key columns lacked a corresponding index, causing full table scans on
  joined queries and ON DELETE/UPDATE cascades. This migration adds the missing indexes.

  ## Indexes added
  - concept_words(word_id)       — covers concept_words_word_id_fkey
  - concept_words(word_link_id)  — covers concept_words_word_link_id_fkey
  - llm_profiles(user_id)        — covers llm_profiles_user_id_fkey
  - output_fields(user_id)       — covers output_fields_user_id_fkey
  - words(dialect_id)            — covers words_dialect_id_fkey
  - words(mode_id)               — covers words_mode_id_fkey
  - words(nuance_id)             — covers words_nuance_id_fkey
  - words(register_id)           — covers words_register_id_fkey
  - words(tone_id)               — covers words_tone_id_fkey
*/

CREATE INDEX IF NOT EXISTS idx_concept_words_word_id      ON public.concept_words (word_id);
CREATE INDEX IF NOT EXISTS idx_concept_words_word_link_id ON public.concept_words (word_link_id);
CREATE INDEX IF NOT EXISTS idx_llm_profiles_user_id       ON public.llm_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_output_fields_user_id      ON public.output_fields (user_id);
CREATE INDEX IF NOT EXISTS idx_words_dialect_id           ON public.words (dialect_id);
CREATE INDEX IF NOT EXISTS idx_words_mode_id              ON public.words (mode_id);
CREATE INDEX IF NOT EXISTS idx_words_nuance_id            ON public.words (nuance_id);
CREATE INDEX IF NOT EXISTS idx_words_register_id          ON public.words (register_id);
CREATE INDEX IF NOT EXISTS idx_words_tone_id              ON public.words (tone_id);
