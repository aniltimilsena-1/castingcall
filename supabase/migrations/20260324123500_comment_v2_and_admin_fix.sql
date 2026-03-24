-- 1. Table for photo_comment_likes (ensure it exists and has proper policies)
CREATE TABLE IF NOT EXISTS public.photo_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.photo_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

ALTER TABLE public.photo_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public comment likes viewable" ON public.photo_comment_likes;
CREATE POLICY "Public comment likes viewable" ON public.photo_comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can toggle own comment likes" ON public.photo_comment_likes;
CREATE POLICY "Users can toggle own comment likes" ON public.photo_comment_likes FOR ALL USING (auth.uid() = user_id);

-- 2. Update photo_comments policies for Admins
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.photo_comments;
CREATE POLICY "Admins can delete any comment" ON public.photo_comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- 3. Nested Comments fix (ensure parent_id exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='photo_comments' AND column_name='parent_id') THEN
        ALTER TABLE public.photo_comments ADD COLUMN parent_id UUID REFERENCES public.photo_comments(id) ON DELETE CASCADE;
    END IF;
END $$;
