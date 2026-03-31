
-- SECURITY UPGRADE: RBAC Whitelist for User Signup
-- Replaces the previous hardcoded 'Actor' role with a validated whitelist.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_role TEXT;
BEGIN
    input_role := NEW.raw_user_meta_data->>'role';
    
    INSERT INTO public.profiles (user_id, name, email, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', ''), 
        NEW.email,
        -- Whitelist check: default to 'Actor' if invalid or unauthorized role requested
        CASE 
            WHEN input_role IN ('Actor', 'Director', 'Singer', 'Choreographer', 'Producer', 'Casting Director') 
            THEN input_role
            ELSE 'Actor'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
