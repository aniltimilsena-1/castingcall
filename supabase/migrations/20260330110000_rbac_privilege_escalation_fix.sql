-- ============================================================
-- Migration: Security Hardening (Privilege Escalation & RLS)
-- Author: Antigravity AI
-- ============================================================

-- 1. Fix CRITICAL Privilege Escalation during Signup
-- Ensure users CANNOT set their own role during registration.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''), 
    NEW.email,
    'Actor' -- HARDCODE default role to prevent metadata injection (Escalation Fix)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix Privilege Escalation via RLS (Update Own Role)
-- Prevent users from modifying the 'role' and 'plan' columns.
-- We use a BEFORE UPDATE trigger to enforce this constraint at the DB level.

CREATE OR REPLACE FUNCTION public.enforce_profile_role_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-admins from changing roles or plans
  IF (NOT (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin'))) THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
      NEW.role = OLD.role; -- Revert role change
    END IF;
    IF (NEW.plan IS DISTINCT FROM OLD.plan) THEN
      NEW.plan = OLD.plan; -- Revert plan change
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_enforce_profile_security ON public.profiles;
CREATE TRIGGER tr_enforce_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_role_security();

-- 3. Additional Admin Sanitization
-- Ensure admins are only created via explicit SEED or internal dashboard.
-- (Done via the handle_new_user fix above)
