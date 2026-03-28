-- Security Audit Fixes: March 28, 2026
-- HIGH-2: Add admin-only RLS policies for tables touched by adminService
-- HIGH-3: Add message DELETE policy
-- LOW-3: Add rate limiting trigger for comments

-- ══════════════════════════════════════════════════════════════════════
-- HIGH-3: Messages DELETE policy (was missing entirely)
-- ══════════════════════════════════════════════════════════════════════
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can delete own sent messages') THEN
        CREATE POLICY "Users can delete own sent messages" ON public.messages
            FOR DELETE USING (auth.uid() = sender_id);
    END IF;
END $$;

-- Admin can delete any message (moderation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Admins can delete any message') THEN
        CREATE POLICY "Admins can delete any message" ON public.messages
            FOR DELETE USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- HIGH-2: Ensure admin-only INSERT on tables touched by adminService
-- ══════════════════════════════════════════════════════════════════════

-- transactions: Only admins (or service role) should insert
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions') THEN
        CREATE POLICY "Users can view own transactions" ON public.transactions
            FOR SELECT USING (user_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Admins can manage all transactions') THEN
        CREATE POLICY "Admins can manage all transactions" ON public.transactions
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- tips: Users can view, only admins can insert via approval
ALTER TABLE IF EXISTS public.tips ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tips' AND policyname = 'Users can view own tips') THEN
        CREATE POLICY "Users can view own tips" ON public.tips
            FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tips' AND policyname = 'Admins can manage all tips') THEN
        CREATE POLICY "Admins can manage all tips" ON public.tips
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- photo_purchases: Users can view own, admins can insert
ALTER TABLE IF EXISTS public.photo_purchases ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photo_purchases' AND policyname = 'Users can view own purchases') THEN
        CREATE POLICY "Users can view own purchases" ON public.photo_purchases
            FOR SELECT USING (buyer_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photo_purchases' AND policyname = 'Admins can manage all purchases') THEN
        CREATE POLICY "Admins can manage all purchases" ON public.photo_purchases
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- product_purchases: Users can view own, admins can insert
ALTER TABLE IF EXISTS public.product_purchases ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_purchases' AND policyname = 'Users can view own product purchases') THEN
        CREATE POLICY "Users can view own product purchases" ON public.product_purchases
            FOR SELECT USING (buyer_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_purchases' AND policyname = 'Admins can manage all product purchases') THEN
        CREATE POLICY "Admins can manage all product purchases" ON public.product_purchases
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- fan_subscriptions: Users can view own, admins can manage
ALTER TABLE IF EXISTS public.fan_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fan_subscriptions' AND policyname = 'Users can view own subscriptions') THEN
        CREATE POLICY "Users can view own subscriptions" ON public.fan_subscriptions
            FOR SELECT USING (subscriber_id = auth.uid() OR talent_id = auth.uid());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fan_subscriptions' AND policyname = 'Admins can manage all subscriptions') THEN
        CREATE POLICY "Admins can manage all subscriptions" ON public.fan_subscriptions
            FOR ALL USING (
                EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin')
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- LOW-3: Rate limiting trigger for comments (max 10 per minute per user)
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
    recent_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM public.photo_comments
    WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 minute';

    IF recent_count >= 10 THEN
        RAISE EXCEPTION 'Rate limit exceeded: maximum 10 comments per minute';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_comment_rate_limit ON public.photo_comments;
CREATE TRIGGER tr_comment_rate_limit
    BEFORE INSERT ON public.photo_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.check_comment_rate_limit();
