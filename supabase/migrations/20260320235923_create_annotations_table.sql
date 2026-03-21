/*
  # Create Annotations Table

  ## Overview
  Stores per-user, per-book text annotations (highlights + optional notes) made in the EPUB reader.

  ## New Tables

  ### `annotations`
  Persists a single highlight/annotation tied to a user and a specific book.

  | Column       | Type        | Description                                                        |
  |--------------|-------------|--------------------------------------------------------------------|
  | id           | uuid PK     | Stable identifier, generated client-side for offline-first support |
  | user_id      | uuid FK     | References auth.users – the annotating user                        |
  | book_id      | text        | Stable identifier for the book (EPUB identifier or SHA-256 hash)   |
  | cfi          | text        | EPUB CFI range string that precisely locates the selection         |
  | text         | text        | The highlighted / selected text content                            |
  | color        | text        | Highlight colour key: 'yellow' | 'green' | 'blue' | 'pink'         |
  | note         | text        | Optional reader note attached to the highlight                     |
  | created_at   | timestamptz | Row creation time                                                  |
  | updated_at   | timestamptz | Last modification time (auto-updated via trigger)                  |

  ## Security
  - RLS enabled; four separate policies (SELECT / INSERT / UPDATE / DELETE)
  - Every policy verifies `auth.uid() = user_id`

  ## Performance
  - Index on `(user_id, book_id)` for the primary query pattern (load all annotations for a book)
  - Index on `user_id` alone for dashboard-level queries
*/

CREATE TABLE IF NOT EXISTS annotations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id     text        NOT NULL,
  cfi         text        NOT NULL,
  text        text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT 'yellow',
  note        text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS annotations_user_book_idx ON annotations (user_id, book_id);
CREATE INDEX IF NOT EXISTS annotations_user_idx       ON annotations (user_id);

ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_annotations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'annotations_updated_at_trigger'
  ) THEN
    CREATE TRIGGER annotations_updated_at_trigger
      BEFORE UPDATE ON annotations
      FOR EACH ROW EXECUTE FUNCTION update_annotations_updated_at();
  END IF;
END $$;

CREATE POLICY "Users can view own annotations"
  ON annotations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own annotations"
  ON annotations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
  ON annotations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
  ON annotations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
