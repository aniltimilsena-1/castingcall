
-- Fix Notifications RLS: Allow users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Ensure comment likes are unique at the database level (safety check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'photo_comment_likes_unique') THEN
        ALTER TABLE public.photo_comment_likes ADD CONSTRAINT photo_comment_likes_unique UNIQUE (comment_id, user_id);
    END IF;
END $$;
