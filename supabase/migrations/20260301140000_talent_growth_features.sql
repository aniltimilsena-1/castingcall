-- Talent Growth & Analytics Enhancements

-- 1. Track Portfolio Interactions (Photo/Video views)
CREATE TABLE IF NOT EXISTS public.portfolio_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- owner of the portfolio
    interactor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- person who clicked
    item_url TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'photo' or 'video'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Talent Feedback & Suggestions
CREATE TABLE IF NOT EXISTS public.talent_growth_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'ai_feedback', 'skill_suggestion', 'audition_insight'
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.portfolio_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_growth_data ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can track their own portfolio interactions" ON public.portfolio_interactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can record a portfolio interaction" ON public.portfolio_interactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can see their own growth data" ON public.talent_growth_data
    FOR SELECT USING (user_id = auth.uid());

-- Add some seed/sample growth data for testing (optional but helpful for demo)
-- This will be "AI generated" in the sense of being static insights for now.
