-- Restrict seed/admin RPC functions to service_role only.
-- Revoke EXECUTE from PUBLIC, anon, and authenticated for any overload
-- of public.seed_insert_contractor and public.seed_insert_review.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('seed_insert_contractor', 'seed_insert_review')
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END $$;
