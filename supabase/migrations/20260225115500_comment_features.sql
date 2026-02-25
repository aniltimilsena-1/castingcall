
-- 1. Table for comment likes
CREATE TABLE IF NOT EXISTS public.photo_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.photo_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.photo_comment_likes ENABLE ROW LEVEL SECURITY;

-- 3. Policies for comment likes
DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON public.photo_comment_likes;
CREATE POLICY "Comment likes are viewable by everyone" ON public.photo_comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle own comment likes" ON public.photo_comment_likes;
CREATE POLICY "Users can toggle own comment likes" ON public.photo_comment_likes FOR ALL USING (auth.uid() = user_id);

-- 4. Policies for editing/deleting comments
DROP POLICY IF EXISTS "Users can update own comments" ON public.photo_comments;
CREATE POLICY "Users can update own comments" ON public.photo_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.photo_comments;
CREATE POLICY "Users can delete own comments" ON public.photo_comments FOR DELETE USING (auth.uid() = user_id);
