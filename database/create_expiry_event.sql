-- Enable the event scheduler
SET GLOBAL event_scheduler = ON;

-- Drop the event if it already exists to avoid errors
DROP EVENT IF EXISTS check_plan_expiry_event;

-- Create the event to run daily at 3:00 AM
CREATE EVENT check_plan_expiry_event
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 3 HOUR
DO
  -- Update plans that have expired
  UPDATE owner_plans 
  SET payment_status = 'expired',
      updated_at = NOW()
  WHERE expiry_date IS NOT NULL 
    AND expiry_date < CURDATE()
    AND payment_status != 'expired'; 