
-- Add phone column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update existing profiles (optional)
-- UPDATE public.profiles SET phone = '+97798XXXXXXXX' WHERE role = 'Admin';
