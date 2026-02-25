
-- Add photos column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
