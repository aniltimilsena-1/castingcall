-- Create applications table for casting calls
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, reviewed, accepted, rejected
    message TEXT,
    UNIQUE(project_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Applicants can see their own applications" ON public.applications
    FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Project owners can see applications for their projects" ON public.applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = applications.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can apply to projects" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Project owners can update application status" ON public.applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = applications.project_id AND user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = applications.project_id AND user_id = auth.uid()
        )
    );
