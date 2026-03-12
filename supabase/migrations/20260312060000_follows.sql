-- ── Follows Table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Indexes for fast look-ups in both directions
CREATE INDEX IF NOT EXISTS follows_follower_idx  ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON public.follows (following_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read follows
CREATE POLICY "follows_select_all"
  ON public.follows FOR SELECT USING (true);

-- Only the follower themselves can insert
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Only the follower themselves can delete (unfollow)
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ── Notification Trigger ───────────────────────────────────────────────────────
-- Insert a notification when user A follows user B
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  follower_name TEXT;
BEGIN
  SELECT name INTO follower_name FROM public.profiles WHERE user_id = NEW.follower_id LIMIT 1;
  INSERT INTO public.notifications (user_id, title, message)
  VALUES (
    NEW.following_id,
    'New Follower',
    COALESCE(follower_name, 'Someone') || ' started following you.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_follow ON public.follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
