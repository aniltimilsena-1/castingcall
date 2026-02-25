
-- Create photo_likes table
CREATE TABLE IF NOT EXISTS public.photo_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(photo_url, user_id)
);

-- Create photo_comments table
CREATE TABLE IF NOT EXISTS public.photo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_comments ENABLE ROW LEVEL SECURITY;

-- Policies for likes
CREATE POLICY "Public likes are viewable by everyone" ON public.photo_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like photos" ON public.photo_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON public.photo_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for comments
CREATE POLICY "Public comments are viewable by everyone" ON public.photo_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can comment on photos" ON public.photo_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.photo_comments
    FOR DELETE USING (auth.uid() = user_id);
