/*
  # Clean and re-seed TMRND lookup tables with exact canonical values

  ## Summary
  Removes all existing data from the 5 TMRND lookup tables and replaces them
  with the exact, canonical set of values required by the application.

  ## Changes

  ### Truncated Tables
  - `tones` - cleared and reseeded
  - `dialects` - cleared and reseeded
  - `modes` - cleared and reseeded
  - `nuances` - cleared and reseeded
  - `registers` - cleared and reseeded

  ### New Canonical Values

  1. tones (5): Informal, Formal, Slightly informal, Slightly formal, Neutral
  2. dialects (4): American, British, Other, Neutral
  3. modes (3): Spoken, Written, Neutral
  4. nuances (5): Old fashioned, Humorous, Oft positive, Oft negative, Neutral
  5. registers (8): Academic, Literature, Business, Law, Journalism, Medicine, Other, Neutral

  ### Notes
  - CASCADE is safe: no words currently reference any lookup FK columns
  - RESTART IDENTITY resets serial sequences so IDs start from 1
  - No word data is lost by this migration
*/

TRUNCATE tones, dialects, modes, nuances, registers RESTART IDENTITY CASCADE;

INSERT INTO tones (name) VALUES
  ('Informal'),
  ('Formal'),
  ('Slightly informal'),
  ('Slightly formal'),
  ('Neutral');

INSERT INTO dialects (name) VALUES
  ('American'),
  ('British'),
  ('Other'),
  ('Neutral');

INSERT INTO modes (name) VALUES
  ('Spoken'),
  ('Written'),
  ('Neutral');

INSERT INTO nuances (name) VALUES
  ('Old fashioned'),
  ('Humorous'),
  ('Oft positive'),
  ('Oft negative'),
  ('Neutral');

INSERT INTO registers (name) VALUES
  ('Academic'),
  ('Literature'),
  ('Business'),
  ('Law'),
  ('Journalism'),
  ('Medicine'),
  ('Other'),
  ('Neutral');
