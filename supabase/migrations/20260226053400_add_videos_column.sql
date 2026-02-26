-- ============================================================
-- Migration: Add videos column + fix existing profile roles
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add separate videos column (SEPARATE from photos column)
--    photos[] → portfolio images only
--    videos[] → video reel only
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}';

COMMENT ON COLUMN profiles.videos IS 'Video reel URLs. Free: max 1. PRO: unlimited.';

-- 2. If you want to manually fix a specific user's role, replace
--    'your-email@example.com' and 'Choreographer' with real values:
--
-- UPDATE profiles
--   SET role = 'Choreographer'
--   WHERE email = 'your-email@example.com';

-- 3. Make sure the Supabase auth trigger maps metadata → profile
--    (this only applies if you have a handle_new_user trigger)
--    If your trigger already maps raw_user_meta_data->>'role', skip this.
--    Otherwise add it:
--
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (user_id, email, name, role)
--   VALUES (
--     NEW.id,
--     NEW.email,
--     COALESCE(NEW.raw_user_meta_data->>'name', ''),
--     COALESCE(NEW.raw_user_meta_data->>'role', '')
--   )
--   ON CONFLICT (user_id) DO UPDATE
--     SET name = EXCLUDED.name,
--         role = EXCLUDED.role;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
