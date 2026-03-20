
-- Security Fix: Prevent users from updating their own role or plan via client-side Supabase keys.
-- This prevents privilege escalation vulnerabilities (IDOR/Auth Bypass).

-- 1. Create a function to validate profile updates
CREATE OR REPLACE FUNCTION public.check_profile_update_permissions()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user is NOT an admin, they CANNOT change their role or plan.
    -- (auth.uid() is the logged-in user)
    
    -- Check if role or plan are being changed
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.plan IS DISTINCT FROM NEW.plan) THEN
        -- Check if current user is an admin
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'Admin' AND id != NEW.id -- Use id != NEW.id to avoid circularity if the user is an admin updating themselves
        ) THEN
            -- Exception: Allow the INITIAL creation if NEW.role was set by handle_new_user() 
            -- but handle_new_user uses SECURITY DEFINER so it bypasses this anyway.
            
            -- If user is trying to set themselves to Admin or change plan
            RAISE EXCEPTION 'Unauthorized: You cannot change your role or plan status.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS tr_secure_profile_updates ON public.profiles;
CREATE TRIGGER tr_secure_profile_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_update_permissions();

-- 3. Update the RLS policy to be more explicit (optional but good)
-- Already exists: CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
-- The trigger above will now intercept and block unauthorized column changes.
