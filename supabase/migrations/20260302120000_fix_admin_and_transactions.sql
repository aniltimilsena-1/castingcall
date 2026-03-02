
-- ============================================================
-- FIX 1: Allow Admins to update ANY profile (for PRO upgrades)
-- ============================================================
-- The existing policy "Users can update own profile" only lets 
-- users update their own profile. Admins need to update other 
-- users' plan to 'pro' when approving payments.

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- ============================================================
-- FIX 2: Create the transactions table (was referenced but never created)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'NPR',
    plan_type TEXT DEFAULT 'pro',
    payment_method TEXT DEFAULT 'qr_manual',
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can see their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (user_id = auth.uid());

-- Admins can see all transactions
CREATE POLICY "Admins can manage all transactions" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- Admins can insert transactions (when approving payments)
CREATE POLICY "Admins can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'Admin'
        )
    );

-- ============================================================
-- FIX 3: Allow admin to also delete profiles (for the ban button)
-- ============================================================
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );
