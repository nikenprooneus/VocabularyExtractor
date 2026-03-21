/*
  # Fix mutable search_path on update_annotations_updated_at

  ## Summary
  The trigger function public.update_annotations_updated_at had a mutable
  search_path, which means a malicious user could potentially redirect function
  calls to shadow objects by manipulating the search_path. Setting
  search_path = '' and using fully-qualified names eliminates this risk.

  ## Change
  - Recreate update_annotations_updated_at with SET search_path = ''
  - Reference pg_catalog.now() with full schema qualification
*/

CREATE OR REPLACE FUNCTION public.update_annotations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;
