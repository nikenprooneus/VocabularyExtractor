/*
  # Optimize RLS Policies for Performance
  
  ## Overview
  This migration optimizes Row Level Security (RLS) policies to improve query performance at scale
  by wrapping auth functions in SELECT statements to prevent re-evaluation for each row.
  
  ## Changes Made
  
  ### 1. RLS Policy Optimization
  All policies have been updated to use `(select auth.uid())` instead of `auth.uid()` to prevent
  re-evaluation for each row, significantly improving performance at scale.
  
  #### Profiles Table Policies:
  - "Users can view their own profile" - Optimized SELECT policy
  - "Users can update their own profile" - Optimized UPDATE policy  
  - "Admins can view all profiles" - Optimized SELECT policy with role check
  - "Admins can update all profiles" - Optimized UPDATE policy with role check
  
  #### Settings Table Policies:
  - "Users can view their own settings" - Optimized SELECT policy
  - "Users can insert their own settings" - Optimized INSERT policy
  - "Users can update their own settings" - Optimized UPDATE policy
  - "Users can delete their own settings" - Optimized DELETE policy
  
  #### Output Fields Table Policies:
  - "Users can view their own output fields" - Optimized SELECT policy
  - "Users can insert their own output fields" - Optimized INSERT policy
  - "Users can update their own output fields" - Optimized UPDATE policy
  - "Users can delete their own output fields" - Optimized DELETE policy
  
  #### Vocabulary Data Table Policies:
  - "Users can view their own vocabulary data" - Optimized SELECT policy
  - "Users can insert their own vocabulary data" - Optimized INSERT policy
  - "Users can update their own vocabulary data" - Optimized UPDATE policy
  - "Users can delete their own vocabulary data" - Optimized DELETE policy
  
  ### 2. Index Cleanup
  Removed unused indexes that were not being utilized by queries:
  - idx_settings_user_id
  - idx_output_fields_user_id
  - idx_vocabulary_data_user_id
  - idx_vocabulary_data_created_at
  - idx_profiles_role
  - idx_profiles_email
  
  Note: These indexes will be re-added if query patterns show they are needed in the future.
  
  ## Performance Impact
  - Significantly improved query performance for large datasets
  - Reduced CPU usage for RLS policy evaluation
  - Cleaner index footprint with only actively used indexes
  
  ## Security
  All security guarantees remain intact - only the performance characteristics have been improved.
*/

-- =====================================================
-- PROFILES TABLE - Drop and recreate optimized policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Optimized SELECT policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Optimized UPDATE policies
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- SETTINGS TABLE - Drop and recreate optimized policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own settings" ON settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON settings;

CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own settings"
  ON settings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- OUTPUT_FIELDS TABLE - Drop and recreate optimized policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own output fields" ON output_fields;
DROP POLICY IF EXISTS "Users can insert their own output fields" ON output_fields;
DROP POLICY IF EXISTS "Users can update their own output fields" ON output_fields;
DROP POLICY IF EXISTS "Users can delete their own output fields" ON output_fields;

CREATE POLICY "Users can view their own output fields"
  ON output_fields FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own output fields"
  ON output_fields FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own output fields"
  ON output_fields FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own output fields"
  ON output_fields FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- VOCABULARY_DATA TABLE - Drop and recreate optimized policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own vocabulary data" ON vocabulary_data;
DROP POLICY IF EXISTS "Users can insert their own vocabulary data" ON vocabulary_data;
DROP POLICY IF EXISTS "Users can update their own vocabulary data" ON vocabulary_data;
DROP POLICY IF EXISTS "Users can delete their own vocabulary data" ON vocabulary_data;

CREATE POLICY "Users can view their own vocabulary data"
  ON vocabulary_data FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own vocabulary data"
  ON vocabulary_data FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own vocabulary data"
  ON vocabulary_data FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own vocabulary data"
  ON vocabulary_data FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- =====================================================
-- INDEX CLEANUP - Remove unused indexes
-- =====================================================

DROP INDEX IF EXISTS idx_settings_user_id;
DROP INDEX IF EXISTS idx_output_fields_user_id;
DROP INDEX IF EXISTS idx_vocabulary_data_user_id;
DROP INDEX IF EXISTS idx_vocabulary_data_created_at;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_email;