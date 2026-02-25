
-- Add parent_id to photo_comments for nested replies
ALTER TABLE public.photo_comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.photo_comments(id) ON DELETE CASCADE;
