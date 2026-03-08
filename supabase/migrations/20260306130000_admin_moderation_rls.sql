
-- Add Admin policies for photo_comments
DROP POLICY IF EXISTS "Admins can update any comment" ON public.photo_comments;
CREATE POLICY "Admins can update any comment" 
ON public.photo_comments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.photo_comments;
CREATE POLICY "Admins can delete any comment" 
ON public.photo_comments FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Add Admin policies for photo_likes (optional but good)
DROP POLICY IF EXISTS "Admins can delete any like" ON public.photo_likes;
CREATE POLICY "Admins can delete any like" 
ON public.photo_likes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);

-- Add Admin policies for photo_comment_likes
DROP POLICY IF EXISTS "Admins can delete any comment like" ON public.photo_comment_likes;
CREATE POLICY "Admins can delete any comment like" 
ON public.photo_comment_likes FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'Admin'
  )
);
