
-- Fix foreign keys for photo_likes and photo_comments to point to profiles
-- This helps Supabase understand the relationship for joins

-- First, ensure user_id in profiles has a unique constraint (it should, as it's often used as an alternative key)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Drop existing FKs if they point to auth.users
ALTER TABLE IF EXISTS public.photo_likes DROP CONSTRAINT IF EXISTS photo_likes_user_id_fkey;
ALTER TABLE IF EXISTS public.photo_comments DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;

-- Add FKs pointing to public.profiles(user_id)
ALTER TABLE public.photo_likes 
    ADD CONSTRAINT photo_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.photo_comments 
    ADD CONSTRAINT photo_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Also fix photo_captions
ALTER TABLE IF EXISTS public.photo_captions DROP CONSTRAINT IF EXISTS photo_captions_user_id_fkey;
ALTER TABLE public.photo_captions 
    ADD CONSTRAINT photo_captions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
