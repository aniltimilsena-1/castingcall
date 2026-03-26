ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;
COMMENT ON COLUMN public.profiles.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
