-- 1. Extend Payment Verifications
ALTER TABLE public.payment_verifications 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'pro',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Persistent Unlocks for Premium Feed Posts
CREATE TABLE IF NOT EXISTS public.photo_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    amount_paid FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, photo_url)
);

-- Enable RLS
ALTER TABLE public.photo_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for Unlocks
CREATE POLICY "Users can see their own unlocked posts" ON public.photo_purchases 
FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can manage all unlocks" ON public.photo_purchases 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin'
    )
);

-- Update Transactions to include specific types
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'pro',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
