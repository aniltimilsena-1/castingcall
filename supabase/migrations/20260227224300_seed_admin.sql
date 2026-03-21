-- Seed a fixed admin account
-- Email: admin@caastingcall.me
-- WARNING: DO NOT store hardcoded passwords in migrations. 
-- This password should be set via environment variables or updated immediately.

DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- 1. Check if admin user exists in auth.users
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@caastingcall.me';

  -- 2. If it doesn't exist, create it
  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change_token_current
    )
    VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@caastingcall.me',
      crypt('AdminPassword123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"System Admin", "role":"Admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      '', '', '', ''
    );
  END IF;

  -- 3. Ensure the profile exists and has the 'Admin' role.
  -- The trigger 'handle_new_user' on auth.users will have created the profile with 'Actor' role.
  -- Insert or Update profile
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (admin_id, 'admin@caastingcall.me', 'System Admin', 'Admin')
  ON CONFLICT (user_id) DO UPDATE 
  SET role = 'Admin';
END $$;
