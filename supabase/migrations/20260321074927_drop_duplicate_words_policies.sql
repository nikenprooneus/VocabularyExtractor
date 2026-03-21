/*
  # Drop duplicate permissive policies on public.words

  ## Summary
  The words table had two sets of permissive policies for each action
  (SELECT, INSERT, UPDATE, DELETE) for the authenticated role. Having multiple
  permissive policies for the same role/action means Postgres applies OR logic,
  which can unexpectedly widen access and causes the "Multiple Permissive Policies"
  security warning. The older "their own vocabulary data" set is removed here;
  the "own words" set was already re-created with the (select auth.uid()) fix.

  ## Policies removed
  - "Users can view their own vocabulary data"
  - "Users can insert their own vocabulary data"
  - "Users can update their own vocabulary data"
  - "Users can delete their own vocabulary data"
*/

DROP POLICY IF EXISTS "Users can view their own vocabulary data"   ON public.words;
DROP POLICY IF EXISTS "Users can insert their own vocabulary data" ON public.words;
DROP POLICY IF EXISTS "Users can update their own vocabulary data" ON public.words;
DROP POLICY IF EXISTS "Users can delete their own vocabulary data" ON public.words;
