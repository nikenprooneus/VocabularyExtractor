/*
  # Add Concept Tree configuration columns to settings table

  ## Summary
  Adds two new columns to the `settings` table to store Concept Tree prompt and output field
  configurations independently from the existing TMRND configuration.

  ## New Columns
  - `concept_tree_prompt_template` (text) - The LLM prompt template used exclusively for the
    Concept Tree generation. Defaults to empty string so the feature is opt-in.
  - `concept_tree_output_fields` (jsonb) - Array of output field objects `[{id, name}]` used
    to parse the Concept Tree LLM response. Defaults to empty array `[]`.

  ## Why separate columns?
  - Keeps the TMRND prompt lean (no Concept Bank injection, no polysemy tags)
  - Allows users to configure CT fields (Tier1, Tier2, Tier3, etc.) independently
  - Enables parallel LLM calls at generate time with focused, purpose-built prompts
  - No data loss risk: purely additive migration with safe defaults

  ## Security
  - Existing RLS policies on the `settings` table already cover these new columns.
    No additional policy changes are required.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'concept_tree_prompt_template'
  ) THEN
    ALTER TABLE settings ADD COLUMN concept_tree_prompt_template text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'concept_tree_output_fields'
  ) THEN
    ALTER TABLE settings ADD COLUMN concept_tree_output_fields jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
