
-- 1. Function to notify admins when someone uploads a payment screenshot
CREATE OR REPLACE FUNCTION notify_admins_of_payment()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    actor_name TEXT;
BEGIN
    -- Get the name of the user who paid
    SELECT name INTO actor_name FROM profiles WHERE user_id = NEW.user_id;

    -- Loop through all Admins and notify them
    FOR admin_record IN SELECT user_id FROM profiles WHERE role = 'Admin' LOOP
        INSERT INTO notifications (user_id, actor_id, title, message, is_read)
        VALUES (
            admin_record.user_id, 
            NEW.user_id, 
            'New Payment for Verification', 
            actor_name || ' has uploaded a payment screenshot for PRO upgrade.', 
            false
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to notify the User when their payment status changes
CREATE OR REPLACE FUNCTION notify_user_of_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO notifications (user_id, actor_id, title, message, is_read)
        VALUES (
            NEW.user_id, 
            auth.uid(), -- The Admin who modified it
            CASE 
                WHEN NEW.status = 'approved' THEN 'Payment Approved! 🎉' 
                WHEN NEW.status = 'rejected' THEN 'Payment Rejected ❌'
                ELSE 'Payment Update' 
            END,
            CASE 
                WHEN NEW.status = 'approved' THEN 'Welcome to PRO! Your manual payment has been verified. You now have full access.' 
                WHEN NEW.status = 'rejected' THEN 'We could not verify your payment. Please check your screenshot or contact support: ' || COALESCE(NEW.admin_notes, 'Invalid screenshot')
                ELSE 'Your payment verification status has changed to ' || NEW.status
            END,
            false
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers
DROP TRIGGER IF EXISTS tr_notify_admin_on_payment ON payment_verifications;
CREATE TRIGGER tr_notify_admin_on_payment
AFTER INSERT ON payment_verifications
FOR EACH ROW EXECUTE FUNCTION notify_admins_of_payment();

DROP TRIGGER IF EXISTS tr_notify_user_on_payment_status ON payment_verifications;
CREATE TRIGGER tr_notify_user_on_payment_status
AFTER UPDATE OF status ON payment_verifications
FOR EACH ROW EXECUTE FUNCTION notify_user_of_payment_status();
