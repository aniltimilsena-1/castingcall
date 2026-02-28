
-- Seed a fixed admin account
-- Email: admin@castingcall.com
-- Password: AdminPassword123!

DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@castingcall.com') THEN
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
      'admin@castingcall.com',
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

    -- The trigger handle_new_user will automatically create the profile.
    -- However, to be extra sure the role is 'Admin', we can update it if it was created as 'Actor'
    -- but with our updated trigger it should be 'Admin' already.
    
    UPDATE public.profiles 
    SET role = 'Admin' 
    WHERE user_id = admin_id;
  END IF;
END $$;
