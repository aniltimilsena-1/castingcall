-- Add Bhupendra as Admin
-- Email: dsr.bhupendra@gmail.com

DO $$
DECLARE
  target_email TEXT := 'dsr.bhupendra@gmail.com';
  v_user_id UUID;
BEGIN
  -- 1. Check if user exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;

  -- 2. If the user doesn't exist, create them with a temporary password
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
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
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      target_email,
      crypt('BhupendraAdmin123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Bhupendra", "role":"Admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated',
      '', '', '', ''
    );
  END IF;

  -- 3. Ensure the profile exists and has the 'Admin' role.
  -- We temporarily disable the security trigger just to be safe,
  -- although our updated trigger function now allows NULL auth.uid() context.
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (v_user_id, target_email, 'Bhupendra', 'Admin')
  ON CONFLICT (user_id) DO UPDATE 
  SET role = 'Admin';
  
  RAISE NOTICE 'User % is now an Admin.', target_email;
END $$;
