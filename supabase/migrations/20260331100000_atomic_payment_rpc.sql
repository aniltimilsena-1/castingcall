
-- SECURITY HARDENING: Atomic Payment Approval/Rejection RPCs
-- This ensures that all side effects (role updates, subscription creation, transactions, notifications)
-- happen within a single database transaction.

-- 1. Create approve_payment_v2 RPC
CREATE OR REPLACE FUNCTION public.approve_payment_v2(
    v_id UUID,
    v_user_id UUID,
    v_payment_type TEXT,
    v_amount FLOAT,
    v_currency TEXT DEFAULT 'NPR',
    v_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    -- Only allow Admins to execute this
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can approve payments.';
    END IF;

    -- 1. Perform core side effects based on payment type
    IF v_payment_type = 'pro' THEN
        UPDATE public.profiles SET plan = 'pro' WHERE user_id = v_user_id;
    ELSIF v_payment_type = 'fan_pass' THEN
        INSERT INTO public.fan_subscriptions (subscriber_id, talent_id, status, expires_at)
        VALUES (
            v_user_id, 
            (v_metadata->>'talent_id')::UUID, 
            'active', 
            (NOW() + INTERVAL '30 days')
        )
        ON CONFLICT (subscriber_id, talent_id) DO UPDATE SET
            status = 'active',
            expires_at = (NOW() + INTERVAL '30 days');
    ELSIF v_payment_type = 'product' THEN
        INSERT INTO public.product_purchases (buyer_id, product_id, amount_paid)
        VALUES (v_user_id, (v_metadata->>'product_id')::UUID, v_amount);
    ELSIF v_payment_type = 'tip' THEN
        INSERT INTO public.tips (sender_id, receiver_id, amount, post_url, message)
        VALUES (v_user_id, (v_metadata->>'talent_id')::UUID, v_amount, v_metadata->>'post_url', 'Gift approved by admin');
    ELSIF v_payment_type = 'unlock' THEN
        INSERT INTO public.photo_purchases (buyer_id, photo_url, amount_paid)
        VALUES (v_user_id, v_metadata->>'post_url', v_amount);
    END IF;

    -- 2. Mark the verification record as approved
    UPDATE public.payment_verifications 
    SET status = 'approved' 
    WHERE id = v_id;

    -- 3. Create a transaction record
    INSERT INTO public.transactions (user_id, amount, currency, payment_type, payment_method, metadata)
    VALUES (v_user_id, v_amount, v_currency, v_payment_type, 'manual_verification', v_metadata);

    -- 4. Create a notification
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
        v_user_id, 
        'Payment Approved', 
        'Your payment for ' || UPPER(v_payment_type) || ' has been verified. Access granted!'
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create reject_payment_v2 RPC
CREATE OR REPLACE FUNCTION public.reject_payment_v2(
    v_id UUID,
    v_user_id UUID,
    v_payment_type TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Only allow Admins to execute this
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'Admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can reject payments.';
    END IF;

    -- 1. Mark the verification record as rejected
    UPDATE public.payment_verifications 
    SET status = 'rejected' 
    WHERE id = v_id;

    -- 2. Create a notification
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
        v_user_id, 
        'Payment Rejected', 
        'Your payment for ' || UPPER(v_payment_type) || ' was rejected. Please check your details.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
