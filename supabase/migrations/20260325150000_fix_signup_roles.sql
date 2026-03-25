
-- Fix handle_new_user to allow valid roles from metadata instead of hardcoding 'Actor'
-- Also properly handles users with missing metadata (like phone logic)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_role TEXT;
    input_name TEXT;
BEGIN
    input_role := NEW.raw_user_meta_data->>'role';
    input_name := NEW.raw_user_meta_data->>'name';

    -- Allow valid roles, otherwise default to 'Actor'
    -- This prevents 'Admin' or other elevated roles from being set via metadata
    IF input_role IS NULL OR input_role NOT IN ('Actor', 'Director', 'Singer', 'Choreographer', 'Producer', 'Casting Director') THEN
        input_role := 'Actor';
    END IF;

    -- Default name to the first part of email or 'User' if not provided
    IF input_name IS NULL OR input_name = '' THEN
        IF NEW.email IS NOT NULL THEN
            input_name := split_part(NEW.email, '@', 1);
        ELSIF NEW.phone IS NOT NULL THEN
            input_name := 'User ' || right(NEW.phone, 4);
        ELSE
            input_name := 'New Member';
        END IF;
    END IF;

    INSERT INTO public.profiles (user_id, name, email, role)
    VALUES (
        NEW.id, 
        input_name,
        NEW.email,
        input_role
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions;
