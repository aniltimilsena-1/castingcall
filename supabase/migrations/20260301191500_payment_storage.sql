
-- Create payments bucket for verification screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', false) -- Private bucket for security
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payments
CREATE POLICY "Users can upload their own payment screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can see their own payment screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can see all payment screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payments' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );
