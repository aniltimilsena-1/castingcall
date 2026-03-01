-- Add smart search fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS mood_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personality_traits TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS looks_like TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visual_search_keywords TEXT DEFAULT '';

-- Add index for trending_score
CREATE INDEX IF NOT EXISTS idx_profiles_trending_score ON public.profiles (trending_score DESC);

-- Update existing profiles with some sample data
UPDATE public.profiles
SET 
  mood_tags = ARRAY['energetic', 'optimistic'],
  style_tags = ARRAY['street', 'minimalist'],
  personality_traits = ARRAY['extrovert', 'charismatic'],
  looks_like = ARRAY['Timothée Chalamet', 'Modern Youth'],
  trending_score = 85.5
WHERE role = 'Actor' AND name LIKE 'A%';

UPDATE public.profiles
SET 
  mood_tags = ARRAY['dark', 'mysterious'],
  style_tags = ARRAY['luxury', 'vintage'],
  personality_traits = ARRAY['introvert', 'thoughtful'],
  looks_like = ARRAY['Zendaya', 'Classical'],
  trending_score = 92.0
WHERE role = 'Actor' AND name LIKE 'B%';

UPDATE public.profiles
SET 
  mood_tags = ARRAY['calm', 'serene'],
  style_tags = ARRAY['organic', 'ethical'],
  personality_traits = ARRAY['altruistic', 'reliable'],
  looks_like = ARRAY['Natural', 'Eco-conscious'],
  trending_score = 78.0
WHERE role = 'Model';
