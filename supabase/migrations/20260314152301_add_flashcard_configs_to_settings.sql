/*
  # Add Flashcard Configurations to Settings Table

  1. Changes
    - Add `flashcard_configs` column to existing `settings` table
    - Column stores JSONB array of flashcard configuration objects
    - Each flashcard config contains: id, cardOrder, frontFieldId, backFieldIds array

  2. Purpose
    - Enables users to create custom flashcard layouts via drag-and-drop
    - Stores which output fields are assigned to front/back of each flashcard
    - Supports multiple flashcards with configurable field arrangements

  3. Structure
    - Type: JSONB for flexible storage of configuration objects
    - Default: Empty array
    - No foreign keys or complex constraints (temporary Supabase setup)

  4. Security
    - Inherits existing RLS policies from settings table
    - Users can only access their own flashcard configurations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'flashcard_configs'
  ) THEN
    ALTER TABLE settings ADD COLUMN flashcard_configs JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;