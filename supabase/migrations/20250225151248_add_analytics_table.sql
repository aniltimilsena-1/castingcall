-- Create profile_views table to track analytics
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    viewer_ip TEXT, -- Optional, for basic unique tracking if needed
    UNIQUE(viewer_id, profile_id, viewed_at) -- Simplified unique constraint
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Policies for profile_views
-- Anyone can insert a view (could be throttled in the app)
CREATE POLICY "Anyone can record a view" ON public.profile_views
    FOR INSERT WITH CHECK (true);

-- Users can only see views on THEIR OWN profile
CREATE POLICY "Users can view analytics for their own profile" ON public.profile_views
    FOR SELECT USING (
        profile_id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Add index for fast aggregation
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at);
