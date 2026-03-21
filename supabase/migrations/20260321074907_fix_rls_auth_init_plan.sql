/*
  # Fix RLS auth initialization plan on all affected tables

  ## Summary
  All RLS policies that called auth.uid() directly were re-evaluating the function for
  every row scanned, causing unnecessary overhead at scale. Wrapping the call in
  (select auth.uid()) forces Postgres to evaluate it once per statement instead.

  ## Tables affected
  - public.words           (4 policies)
  - public.concept_words   (4 policies)
  - public.concept_concepts (4 policies)
  - public.llm_profiles    (4 policies)
  - public.concepts        (4 policies)
  - public.reading_progress (4 policies)
  - public.annotations     (4 policies)

  ## Change pattern
  All USING / WITH CHECK expressions changed from:
    auth.uid() = <col>
  to:
    (select auth.uid()) = <col>
*/

-- ============================================================
-- public.words
-- ============================================================
DROP POLICY IF EXISTS "Users can read own words"    ON public.words;
DROP POLICY IF EXISTS "Users can insert own words"  ON public.words;
DROP POLICY IF EXISTS "Users can update own words"  ON public.words;
DROP POLICY IF EXISTS "Users can delete own words"  ON public.words;

CREATE POLICY "Users can read own words"
  ON public.words FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own words"
  ON public.words FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own words"
  ON public.words FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own words"
  ON public.words FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.concept_words
-- ============================================================
DROP POLICY IF EXISTS "Users can read own concept_words"   ON public.concept_words;
DROP POLICY IF EXISTS "Users can insert own concept_words" ON public.concept_words;
DROP POLICY IF EXISTS "Users can update own concept_words" ON public.concept_words;
DROP POLICY IF EXISTS "Users can delete own concept_words" ON public.concept_words;

CREATE POLICY "Users can read own concept_words"
  ON public.concept_words FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own concept_words"
  ON public.concept_words FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own concept_words"
  ON public.concept_words FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own concept_words"
  ON public.concept_words FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.concept_concepts
-- ============================================================
DROP POLICY IF EXISTS "Users can view own concept relationships"   ON public.concept_concepts;
DROP POLICY IF EXISTS "Users can insert own concept relationships" ON public.concept_concepts;
DROP POLICY IF EXISTS "Users can update own concept relationships" ON public.concept_concepts;
DROP POLICY IF EXISTS "Users can delete own concept relationships" ON public.concept_concepts;

CREATE POLICY "Users can view own concept relationships"
  ON public.concept_concepts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own concept relationships"
  ON public.concept_concepts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own concept relationships"
  ON public.concept_concepts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own concept relationships"
  ON public.concept_concepts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.llm_profiles
-- ============================================================
DROP POLICY IF EXISTS "Users can select own llm profiles" ON public.llm_profiles;
DROP POLICY IF EXISTS "Users can insert own llm profiles" ON public.llm_profiles;
DROP POLICY IF EXISTS "Users can update own llm profiles" ON public.llm_profiles;
DROP POLICY IF EXISTS "Users can delete own llm profiles" ON public.llm_profiles;

CREATE POLICY "Users can select own llm profiles"
  ON public.llm_profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own llm profiles"
  ON public.llm_profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own llm profiles"
  ON public.llm_profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own llm profiles"
  ON public.llm_profiles FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.concepts
-- ============================================================
DROP POLICY IF EXISTS "Users can view own concepts"   ON public.concepts;
DROP POLICY IF EXISTS "Users can insert own concepts" ON public.concepts;
DROP POLICY IF EXISTS "Users can update own concepts" ON public.concepts;
DROP POLICY IF EXISTS "Users can delete own concepts" ON public.concepts;

CREATE POLICY "Users can view own concepts"
  ON public.concepts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own concepts"
  ON public.concepts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own concepts"
  ON public.concepts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own concepts"
  ON public.concepts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.reading_progress
-- ============================================================
DROP POLICY IF EXISTS "Users can view own reading progress"   ON public.reading_progress;
DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
DROP POLICY IF EXISTS "Users can delete own reading progress" ON public.reading_progress;

CREATE POLICY "Users can view own reading progress"
  ON public.reading_progress FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON public.reading_progress FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own reading progress"
  ON public.reading_progress FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON public.reading_progress FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- public.annotations
-- ============================================================
DROP POLICY IF EXISTS "Users can view own annotations"   ON public.annotations;
DROP POLICY IF EXISTS "Users can insert own annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can update own annotations" ON public.annotations;
DROP POLICY IF EXISTS "Users can delete own annotations" ON public.annotations;

CREATE POLICY "Users can view own annotations"
  ON public.annotations FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own annotations"
  ON public.annotations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own annotations"
  ON public.annotations FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own annotations"
  ON public.annotations FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
