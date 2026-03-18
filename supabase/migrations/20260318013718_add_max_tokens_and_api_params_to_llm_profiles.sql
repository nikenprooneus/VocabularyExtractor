/*
  # Add max_tokens and api_params to llm_profiles

  ## Summary
  Adds two new optional columns to the llm_profiles table to support
  per-profile API parameter configuration.

  ## New Columns
  - `max_tokens` (integer, nullable): Per-profile override for the maximum
    number of completion tokens sent in API requests. When null, the global
    llm_max_tokens setting is used.
  - `api_params` (jsonb, nullable): JSON object controlling which optional
    API parameters are included in requests. Shape:
      { useTemperature: bool, useMaxTokens: bool, useJsonSchema: bool }
    When null, all parameters default to enabled.

  ## Notes
  - Both columns are nullable so existing profiles continue to work without
    modification.
  - No destructive changes; existing data is preserved.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'llm_profiles' AND column_name = 'max_tokens'
  ) THEN
    ALTER TABLE llm_profiles ADD COLUMN max_tokens integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'llm_profiles' AND column_name = 'api_params'
  ) THEN
    ALTER TABLE llm_profiles ADD COLUMN api_params jsonb DEFAULT NULL;
  END IF;
END $$;
