
-- Trigger function for photo interaction notifications
CREATE OR REPLACE FUNCTION notify_on_photo_interaction()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    actor_name TEXT;
BEGIN
    -- Find the owner of the photo
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
        INSERT INTO public.notifications (user_id, title, message, is_read)
        VALUES (
            owner_id, 
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

-- Add triggers to photo_likes and photo_comments
DROP TRIGGER IF EXISTS on_photo_like ON public.photo_likes;
CREATE TRIGGER on_photo_like
    AFTER INSERT ON public.photo_likes
    FOR EACH ROW EXECUTE FUNCTION notify_on_photo_interaction();

DROP TRIGGER IF EXISTS on_photo_comment ON public.photo_comments;
CREATE TRIGGER on_photo_comment
    AFTER INSERT ON public.photo_comments
    FOR EACH ROW EXECUTE FUNCTION notify_on_photo_interaction();
