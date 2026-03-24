-- Automated Crash Analytics Table
CREATE TABLE IF NOT EXISTS public.crash_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional if guest
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_stack TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT a report (even guests)
CREATE POLICY "Telemetry: Insert crash reports" 
ON public.crash_reports FOR INSERT 
WITH CHECK (true);

-- Only Admins can VIEW reports
CREATE POLICY "Telemetry: Select crash reports" 
ON public.crash_reports FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Only Admins can DELETE reports
CREATE POLICY "Telemetry: Delete crash reports"
ON public.crash_reports FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- NOTE: Application layer must enforce rate limiting (max reports/session) 
-- to mitigate anonymous flood/DoS attacks.
