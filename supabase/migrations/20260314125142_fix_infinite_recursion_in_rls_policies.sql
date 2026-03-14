/*
  # Fix Infinite Recursion in RLS Policies
  
  ## Overview
  This migration fixes the infinite recursion error in the profiles table RLS policies
  by using a security definer function instead of direct table queries in admin policies.
  
  ## Problem
  The admin policies were checking the profiles table within the policies themselves,
  causing infinite recursion when trying to fetch user profiles.
  
  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check if a user is an admin
  2. Replace the problematic admin policies with ones that use this function
  3. Keep performance optimization with (select auth.uid()) pattern
  
  ## Changes Made
  
  ### Security Functions
  - `is_admin()` - Helper function that checks if the current user has admin role
    (bypasses RLS using SECURITY DEFINER)
  
  ### Updated Policies
  - Removed admin-specific policies that caused infinite recursion
  - Simplified to single SELECT and UPDATE policies per table
  - Users can view and update their own profile
  - Admins can view and update all profiles via the is_admin() function
  
  ## Security
  All security guarantees remain intact with proper data isolation.
*/

-- =====================================================
-- Create helper function to check admin status
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- =====================================================
-- PROFILES TABLE - Fix infinite recursion
-- =====================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new optimized policies without recursion
CREATE POLICY "Users can view own profile and admins can view all"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = id 
    OR public.is_admin()
  );

CREATE POLICY "Users can update own profile and admins can update all"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = id 
    OR public.is_admin()
  )
  WITH CHECK (
    (select auth.uid()) = id 
    OR public.is_admin()
  );