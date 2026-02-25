-- Add messaging features to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Update RLS policies to allow messaging interactions
-- Allow participants (sender/receiver) to update certain fields
-- Note: In a production app, you might want more granular control over WHICH columns they can update.
ALTER POLICY "Allow individual update" ON public.messages 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- If the policy above doesn't exist or has a different name, we might need to create it.
-- Most common default name from templates is "Users can update their own messages"
-- Since we want BOTH participants to update reactions, we ensure at least one policy allows it.
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' AND policyname = 'Allow participants to update messages'
    ) THEN
        CREATE POLICY "Allow participants to update messages" ON public.messages
        FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
END $$;
