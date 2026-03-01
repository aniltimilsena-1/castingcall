-- Payment Verification for Manual QR/Bank Transfers

CREATE TABLE IF NOT EXISTS public.payment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    screenshot_url TEXT NOT NULL,
    amount FLOAT NOT NULL,
    payment_method TEXT NOT NULL, -- 'qr', 'bank_transfer'
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own verification requests" ON public.payment_verifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own verification requests" ON public.payment_verifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can see all verification requests" ON public.payment_verifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- Create storage bucket for payment screenshots if not exists
-- (Assuming the user will run this or I'll handle it via documentation)
