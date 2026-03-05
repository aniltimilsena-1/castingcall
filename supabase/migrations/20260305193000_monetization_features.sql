-- Locked Content & Fan Subscriptions
ALTER TABLE public.photo_captions 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price FLOAT DEFAULT 0;

-- 1. Fan Subscriptions
CREATE TABLE IF NOT EXISTS public.fan_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active', -- 'active', 'expired'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subscriber_id, talent_id)
);

-- 2. Digital Goods (Store)
CREATE TABLE IF NOT EXISTS public.digital_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price FLOAT NOT NULL,
    currency TEXT DEFAULT 'USD',
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Purchases
CREATE TABLE IF NOT EXISTS public.product_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
    amount_paid FLOAT NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tips / Gifts
CREATE TABLE IF NOT EXISTS public.tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    currency TEXT DEFAULT 'USD',
    post_url TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Fans can see their own subscriptions" ON public.fan_subscriptions 
FOR SELECT USING (auth.uid() = subscriber_id);

CREATE POLICY "Talents can see their fans" ON public.fan_subscriptions 
FOR SELECT USING (auth.uid() = talent_id);

CREATE POLICY "Anyone can see digital products" ON public.digital_products 
FOR SELECT USING (TRUE);

CREATE POLICY "Sellers can manage their products" ON public.digital_products 
FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can see their purchases" ON public.product_purchases 
FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can see their sales" ON public.product_purchases 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.digital_products WHERE id = product_id AND seller_id = auth.uid()
    )
);

CREATE POLICY "Users can see tips they sent or received" ON public.tips 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Anyone can send a tip" ON public.tips 
FOR INSERT WITH CHECK (auth.uid() = sender_id);
