/*
  # Migrate flashcard_configs to a dedicated table

  ## Summary
  Moves flashcard configuration data out of the JSONB column on the `settings` table
  and into a proper relational table, matching the pattern used by `output_fields`.

  ## New Tables

  ### `flashcard_configs`
  - `id` (uuid, primary key) - Auto-generated unique identifier
  - `user_id` (uuid, FK → profiles.id CASCADE) - Owner of the config
  - `card_order` (integer, default 0) - Display/sort order of the card
  - `front_field_id` (text, default '') - ID of the output field shown on the card front
  - `back_field_ids` (jsonb, default []) - Array of output field IDs shown on the card back (max 3)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Data Migration
  - Existing `flashcard_configs` JSONB data from the `settings` table is migrated
    into individual rows in the new table, preserving all field assignments.
  - Old IDs are not preserved (they were Date.now() strings, not UUIDs); fresh UUIDs
    are generated for each migrated row.

  ## Modified Tables

  ### `settings`
  - Removes the `flashcard_configs` JSONB column after data migration

  ## Security
  - RLS enabled on `flashcard_configs`
  - 4 separate policies (SELECT, INSERT, UPDATE, DELETE) using the optimized
    `(select auth.uid()) = user_id` pattern, matching `output_fields` exactly
  - Users can only access their own flashcard config rows

  ## Notes
  1. Data is migrated before the column is dropped to prevent any data loss
  2. `back_field_ids` uses JSONB array to stay consistent with existing patterns
  3. An index on `user_id` is added for query performance
*/

-- 1. Create the new flashcard_configs table
CREATE TABLE IF NOT EXISTS public.flashcard_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  card_order INTEGER DEFAULT 0,
  front_field_id TEXT DEFAULT '',
  back_field_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Migrate existing data from settings.flashcard_configs into the new table
-- Fresh UUIDs are generated because old IDs were Date.now() strings (not UUIDs)
INSERT INTO public.flashcard_configs (user_id, card_order, front_field_id, back_field_ids, created_at, updated_at)
SELECT
  s.user_id,
  COALESCE((elem->>'cardOrder')::integer, (ordinality::integer) - 1),
  COALESCE(elem->>'frontFieldId', ''),
  COALESCE(elem->'backFieldIds', '[]'::jsonb),
  now(),
  now()
FROM public.settings s,
     jsonb_array_elements(
       CASE
         WHEN s.flashcard_configs IS NOT NULL
              AND jsonb_typeof(s.flashcard_configs) = 'array'
         THEN s.flashcard_configs
         ELSE '[]'::jsonb
       END
     ) WITH ORDINALITY AS arr(elem, ordinality);

-- 3. Enable Row Level Security
ALTER TABLE public.flashcard_configs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (4 separate, matching output_fields pattern with optimized auth.uid())
CREATE POLICY "Users can view their own flashcard configs"
  ON public.flashcard_configs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own flashcard configs"
  ON public.flashcard_configs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own flashcard configs"
  ON public.flashcard_configs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own flashcard configs"
  ON public.flashcard_configs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 5. Index for query performance
CREATE INDEX IF NOT EXISTS idx_flashcard_configs_user_id ON public.flashcard_configs(user_id);

-- 6. Drop the legacy flashcard_configs column from settings (data has been migrated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'flashcard_configs'
  ) THEN
    ALTER TABLE public.settings DROP COLUMN flashcard_configs;
  END IF;
END $$;
