-- Enable RLS on tables that have policies defined but RLS never enabled.
-- Without ENABLE ROW LEVEL SECURITY, the policies below are dormant and
-- the tables are effectively readable/writable by any authenticated user.

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
