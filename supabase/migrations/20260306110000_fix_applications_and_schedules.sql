
-- Add missing columns to applications
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create missing audition_slots table
CREATE TABLE IF NOT EXISTS public.audition_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'available', -- 'available', 'booked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audition_slots ENABLE ROW LEVEL SECURITY;

-- Policies for audition_slots
CREATE POLICY "Anyone can see availability" ON public.audition_slots
    FOR SELECT USING (TRUE);

CREATE POLICY "Project owners can manage slots" ON public.audition_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = audition_slots.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage slots" ON public.audition_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );
