-- Enable real-time for messages table
-- This allows the app to listen for new messages instantly without refreshing

BEGIN;
  -- If the publication does not exist, create it (standard Supabase practice)
  -- Most Supabase projects already have this, but this is safe
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- Add the messages table to the real-time publication
  -- We use "REPLICA IDENTITY FULL" to ensure all column values are available in the payload
  ALTER TABLE public.messages REPLICA IDENTITY FULL;
  
  -- Add table to publication if not already there
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
COMMIT;
