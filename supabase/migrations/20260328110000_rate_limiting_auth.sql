-- Auth Attempts Table for Rate Limiting and Security Audit
CREATE TABLE IF NOT EXISTS public.auth_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- email or phone
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    success BOOLEAN DEFAULT FALSE,
    action_type TEXT -- 'login', 'signup', 'reset'
);

-- Enable RLS
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Only Allow Inserts from anyone (we use it anonymously)
-- But limit it somehow? 
-- Actually, the service will perform insertions.
CREATE POLICY "Enable insert for authenticated users only" ON public.auth_attempts FOR INSERT WITH CHECK (true);
-- Allow service_role to read but not public?
-- Actually, we'll use a RPC to check, so we don't need SELECT for public.

-- Create an Index for fast counting
CREATE INDEX IF NOT EXISTS idx_auth_attempts_identifier_time ON public.auth_attempts(identifier, attempted_at DESC);

-- Function to check if rate limited
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(target_identifier TEXT, max_attempts INTEGER DEFAULT 5, interval_minutes INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    recent_attempts INTEGER;
BEGIN
    SELECT COUNT(*) INTO recent_attempts
    FROM public.auth_attempts
    WHERE identifier = target_identifier
      AND attempted_at > NOW() - (interval_minutes * INTERVAL '1 minute');

    RETURN recent_attempts >= max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to record auth attempt
CREATE OR REPLACE FUNCTION public.record_auth_attempt(target_identifier TEXT, is_success BOOLEAN, action_type TEXT, client_ip TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.auth_attempts (identifier, success, action_type, ip_address)
    VALUES (target_identifier, is_success, action_type, client_ip);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
