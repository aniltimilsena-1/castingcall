
-- Create photo_captions table
CREATE TABLE IF NOT EXISTS public.photo_captions (
    photo_url TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.photo_captions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public captions are viewable by everyone" ON public.photo_captions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own photo captions" ON public.photo_captions
    FOR ALL USING (auth.uid() = user_id);
