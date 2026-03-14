-- Fix 404/Not Found on Page Refresh
-- Already handled by vercel.json, but adding a _redirects fallback as well
-- (This file goes into the public folder, but we can also handle it via migration logic if we had a server)

-- Fix CASCADE deletions for Profiles
-- When an admin deletes a profile, we want all related data to be removed automatically.

-- 1. Fix payment_verifications
ALTER TABLE IF EXISTS public.payment_verifications DROP CONSTRAINT IF EXISTS fk_payment_verifications_profiles;
ALTER TABLE IF EXISTS public.payment_verifications DROP CONSTRAINT IF EXISTS payment_verifications_user_id_fkey;
ALTER TABLE public.payment_verifications 
    ADD CONSTRAINT payment_verifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 2. Fix transactions
ALTER TABLE IF EXISTS public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. Fix fan_subscriptions (both subscriber and talent)
ALTER TABLE IF EXISTS public.fan_subscriptions DROP CONSTRAINT IF EXISTS fan_subscriptions_subscriber_id_fkey;
ALTER TABLE IF EXISTS public.fan_subscriptions DROP CONSTRAINT IF EXISTS fan_subscriptions_talent_id_fkey;
ALTER TABLE public.fan_subscriptions 
    ADD CONSTRAINT fan_subscriptions_subscriber_id_fkey 
    FOREIGN KEY (subscriber_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.fan_subscriptions 
    ADD CONSTRAINT fan_subscriptions_talent_id_fkey 
    FOREIGN KEY (talent_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 4. Fix photo_purchases / unlocks
ALTER TABLE IF EXISTS public.photo_purchases DROP CONSTRAINT IF EXISTS photo_purchases_buyer_id_fkey;
ALTER TABLE public.photo_purchases 
    ADD CONSTRAINT photo_purchases_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 5. Fix tips / gifts
ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_sender_id_fkey;
ALTER TABLE IF EXISTS public.tips DROP CONSTRAINT IF EXISTS tips_receiver_id_fkey;
ALTER TABLE public.tips 
    ADD CONSTRAINT tips_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.tips 
    ADD CONSTRAINT tips_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 6. Fix product_purchases
ALTER TABLE IF EXISTS public.product_purchases DROP CONSTRAINT IF EXISTS product_purchases_buyer_id_fkey;
ALTER TABLE public.product_purchases 
    ADD CONSTRAINT product_purchases_buyer_id_fkey 
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 7. Fix digital_products (seller)
ALTER TABLE IF EXISTS public.digital_products DROP CONSTRAINT IF EXISTS digital_products_seller_id_fkey;
ALTER TABLE public.digital_products 
    ADD CONSTRAINT digital_products_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 8. Fix applications
ALTER TABLE IF EXISTS public.applications DROP CONSTRAINT IF EXISTS applications_applicant_id_fkey;
ALTER TABLE public.applications 
    ADD CONSTRAINT applications_applicant_id_fkey 
    FOREIGN KEY (applicant_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 9. Fix follows
ALTER TABLE IF EXISTS public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE IF EXISTS public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
ALTER TABLE public.follows 
    ADD CONSTRAINT follows_follower_id_fkey 
    FOREIGN KEY (follower_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.follows 
    ADD CONSTRAINT follows_following_id_fkey 
    FOREIGN KEY (following_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 10. Fix saved_posts
ALTER TABLE IF EXISTS public.saved_posts DROP CONSTRAINT IF EXISTS saved_posts_user_id_fkey;
ALTER TABLE public.saved_posts 
    ADD CONSTRAINT saved_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 11. Fix photo_likes and photo_comments (already done in some migrations, but ensuring consistency)
ALTER TABLE IF EXISTS public.photo_likes DROP CONSTRAINT IF EXISTS photo_likes_user_id_fkey;
ALTER TABLE public.photo_likes 
    ADD CONSTRAINT photo_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.photo_comments DROP CONSTRAINT IF EXISTS photo_comments_user_id_fkey;
ALTER TABLE public.photo_comments 
    ADD CONSTRAINT photo_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 12. Fix photo_captions (posts)
ALTER TABLE IF EXISTS public.photo_captions DROP CONSTRAINT IF EXISTS photo_captions_user_id_fkey;
ALTER TABLE public.photo_captions 
    ADD CONSTRAINT photo_captions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
