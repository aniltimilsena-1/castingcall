
-- Create messages bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages', 'messages', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for messages
CREATE POLICY "Users can upload their own message attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'messages' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can see messages they are part of"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'messages' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        EXISTS (
            SELECT 1 FROM public.messages 
            WHERE (sender_id = auth.uid() OR receiver_id = auth.uid())
            AND content LIKE '%' || name || '%'
        )
    )
  );
