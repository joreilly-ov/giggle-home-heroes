-- Ensure RLS is enabled and add the missing owner-scoped INSERT policy
-- on public.videos so client inserts cannot spoof user_id.
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos: insert own" ON public.videos;
CREATE POLICY "videos: insert own"
  ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow owners to read their own rows (including drafts), in addition to
-- the existing public read of posted rows.
DROP POLICY IF EXISTS "videos: select own or posted" ON public.videos;
CREATE POLICY "videos: select own or posted"
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR status = 'posted');
