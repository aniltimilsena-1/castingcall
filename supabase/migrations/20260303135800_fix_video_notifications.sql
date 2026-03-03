
-- Update notification trigger to support both Photos and Videos
CREATE OR REPLACE FUNCTION notify_on_photo_interaction()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    actor_name TEXT;
    is_video BOOLEAN := FALSE;
BEGIN
    -- 1. Find the owner of the media (check profiles.photo_url, profiles.photos AND profiles.videos)
    SELECT user_id, (videos IS NOT NULL AND NEW.photo_url = ANY(videos)) INTO owner_id, is_video
    FROM public.profiles 
    WHERE photo_url = NEW.photo_url 
       OR (photos IS NOT NULL AND NEW.photo_url = ANY(photos))
       OR (videos IS NOT NULL AND NEW.photo_url = ANY(videos))
    LIMIT 1;

    -- 2. Find the name of the person who liked/commented
    SELECT name INTO actor_name 
    FROM public.profiles 
    WHERE user_id = NEW.user_id;

    -- Default name if not found
    IF actor_name IS NULL OR actor_name = '' THEN
        actor_name := 'Someone';
    END IF;

    -- 3. Only notify if the owner is different from the actor
    IF owner_id IS NOT NULL AND owner_id != NEW.user_id THEN
        INSERT INTO public.notifications (user_id, actor_id, photo_url, title, message, is_read)
        VALUES (
            owner_id, 
            NEW.user_id,
            NEW.photo_url,
            CASE 
                WHEN TG_TABLE_NAME = 'photo_likes' THEN 
                    CASE WHEN is_video THEN 'New Video Like' ELSE 'New Photo Like' END
                ELSE 
                    CASE WHEN is_video THEN 'New Video Comment' ELSE 'New Photo Comment' END
            END,
            CASE 
                WHEN TG_TABLE_NAME = 'photo_likes' THEN 
                    actor_name || (CASE WHEN is_video THEN ' liked your video' ELSE ' liked your photo' END)
                ELSE 
                    actor_name || (CASE WHEN is_video THEN ' commented on your video' ELSE ' commented on your photo' END)
            END,
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
