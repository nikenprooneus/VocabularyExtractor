/*
  # Add LLM Provider Configuration Columns to Settings

  ## Summary
  Adds three new columns to the `settings` table to support first-class multi-provider
  AI integrations: provider selection, temperature control, and token limit.

  ## New Columns
  - `llm_provider` (text, default 'openai') — Identifies which AI provider to route calls to.
    Valid values: 'openai', 'anthropic', 'google', 'deepseek', 'custom'
  - `temperature` (numeric, default 0.7) — Controls output randomness (0.0–2.0).
  - `llm_max_tokens` (integer, default 2000) — Maximum tokens to generate per response,
    preventing run-on completions and controlling costs.

  ## Modified Tables
  - `settings` — 3 new columns added (non-destructive, all have safe defaults)

  ## Notes
  1. All three columns are optional with sensible defaults so existing rows are unaffected.
  2. No RLS changes needed — existing policies on `settings` already cover these columns.
  3. The `temperature` column uses `numeric` to support fractional values like 0.7, 1.2, etc.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'llm_provider'
  ) THEN
    ALTER TABLE public.settings ADD COLUMN llm_provider text DEFAULT 'openai';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'temperature'
  ) THEN
    ALTER TABLE public.settings ADD COLUMN temperature numeric DEFAULT 0.7;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'llm_max_tokens'
  ) THEN
    ALTER TABLE public.settings ADD COLUMN llm_max_tokens integer DEFAULT 2000;
  END IF;
END $$;
