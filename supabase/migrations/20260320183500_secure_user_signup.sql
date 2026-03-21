
-- Security Fix: Prevent users from becoming admins during sign-up.
-- Use hardcoded role instead of trusting raw_user_meta_data for 'role'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''), 
    NEW.email,
    'Actor' -- HARDCODE default role! Do NOT trust metadata for roles.
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;

-- Existing trigger 'on_auth_user_created' already exists, no need to re-create.
-- This function will now be used for all new sign-ups.
