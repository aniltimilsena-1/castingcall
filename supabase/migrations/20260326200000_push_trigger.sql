-- 1. Enable pg_net to call the function
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Create the push notification handler function
CREATE OR REPLACE FUNCTION public.handle_new_message_push()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://qvpuqstnizsbykyjdfyo.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cHVxc3RuaXpzYnlreWpkZnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NjksImV4cCI6MjA4NzUwNzk2OX0.YqW4EFnaUGaCJY1VdE9sc1heepUASYbqKh0kKhl6P2E'
      ),
      body := jsonb_build_object(
        'receiver_id', NEW.receiver_id,
        'sender_id', NEW.sender_id,
        'sender_name', (SELECT name FROM profiles WHERE user_id = NEW.sender_id),
        'message_content', COALESCE(NEW.content, 'Sent a file')
      )::TEXT
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger
DROP TRIGGER IF EXISTS on_message_created_push ON public.messages;
CREATE TRIGGER on_message_created_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_push();
