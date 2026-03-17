/*
  # Add LLM Provider Profiles System

  ## Summary
  Introduces a multi-provider profile architecture for LLM configuration, replacing
  the single flat API key/provider/model stored directly in the settings table.

  ## New Tables

  ### `llm_profiles`
  Stores named LLM provider configurations per user. Each profile holds all the
  information needed to make API calls to a specific provider endpoint.

  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users) — owner of the profile
  - `name` (text) — human-readable label, e.g. "My OpenAI Work Account"
  - `provider` (text) — one of: openai, anthropic, google, deepseek, openai-compatible
  - `api_key` (text) — the API key for this provider
  - `base_url` (text, nullable) — custom endpoint for proxies or openai-compatible providers
  - `model` (text) — model identifier (free-text to support unlisted frontier models)
  - `is_custom_model` (boolean) — when true the UI renders a text input instead of a dropdown
  - `created_at`, `updated_at` (timestamptz)

  ## Modified Tables

  ### `settings`
  - Adds `active_llm_profile_id` (text, nullable) — stores the `id` of the currently
    selected profile. Kept as text (not a FK) so it survives profile deletion gracefully.

  ## Security
  - RLS enabled on `llm_profiles`
  - Four separate RLS policies (select, insert, update, delete) — users can only
    access their own profiles.

  ## Notes
  1. The legacy flat columns (api_key, base_url, model, llm_provider) on the settings
     table are left intact. The application's migration logic in SettingsContext will
     read those columns once to seed the first profile for existing users.
  2. `active_llm_profile_id` is nullable — a null value means no profile is selected yet.
  3. All changes are non-destructive; existing rows in settings are unaffected.
*/

CREATE TABLE IF NOT EXISTS public.llm_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'openai',
  api_key text NOT NULL DEFAULT '',
  base_url text,
  model text NOT NULL DEFAULT '',
  is_custom_model boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own llm profiles"
  ON public.llm_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own llm profiles"
  ON public.llm_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own llm profiles"
  ON public.llm_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own llm profiles"
  ON public.llm_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'active_llm_profile_id'
  ) THEN
    ALTER TABLE public.settings ADD COLUMN active_llm_profile_id text;
  END IF;
END $$;
