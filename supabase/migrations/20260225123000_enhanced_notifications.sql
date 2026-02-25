
-- Update notifications table to support actor profile pictures and deep linking
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update the notification trigger function
CREATE OR REPLACE FUNCTION notify_on_photo_interaction()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    actor_name TEXT;
BEGIN
    -- Find the owner of the photo
    -- Check if it's their main profile photo or in their gallery
    SELECT user_id INTO owner_id 
    FROM public.profiles 
    WHERE photo_url = NEW.photo_url 
       OR (photos IS NOT NULL AND NEW.photo_url = ANY(photos));

    -- Find the name of the person who liked/commented
    SELECT name INTO actor_name 
    FROM public.profiles 
    WHERE user_id = NEW.user_id;

    -- Default name if not found
    IF actor_name IS NULL OR actor_name = '' THEN
        actor_name := 'Someone';
    END IF;

    -- Only notify if the owner is different from the actor
    IF owner_id IS NOT NULL AND owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, photo_url, title, message, is_read)
        VALUES (
            owner_id, 
            NEW.user_id, -- Use actor's user_id
            NEW.photo_url, -- Link to the photo
            CASE 
                WHEN TG_TABLE_NAME = 'photo_likes' THEN 'New Photo Like'
                ELSE 'New Photo Comment'
            END,
            CASE 
                WHEN TG_TABLE_NAME = 'photo_likes' THEN actor_name || ' liked your photo'
                ELSE actor_name || ' commented on your photo'
            END,
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
