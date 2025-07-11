-- Add columns for the 7-day trial feature to the users table
ALTER TABLE `users`
  ADD COLUMN `trial_expiry_date` DATE NULL COMMENT 'Stores the date when the student''s 7-day trial period ends.',
  ADD COLUMN `Progress_status` ENUM('demo', 'subscribed', 'expired') NULL COMMENT 'Tracks the student''s current lifecycle stage concerning the trial and subscription.';

-- Create indexes for efficient lookups
ALTER TABLE `users` 
  ADD INDEX `idx_users_trial_expiry` (`trial_expiry_date`),
  ADD INDEX `idx_users_progress_status` (`Progress_status`);

-- Data migration for existing users:
-- Set users with is_active_by_owner=1 to 'subscribed' status
UPDATE `users` SET `Progress_status` = 'subscribed' WHERE `is_active_by_owner` = 1;

-- For users with is_active_by_owner=0 from subdomains, set status to 'expired'
-- This assumes no active trials for existing users when implementing this feature
UPDATE `users` SET `Progress_status` = 'expired' 
WHERE `is_active_by_owner` = 0 AND `subdomain_identifier` IS NOT NULL;

-- Log the migration
-- INSERT INTO `system_logs` (`log_type`, `message`, `created_at`) 
-- VALUES ('SCHEMA_UPDATE', 'Added 7-day trial feature columns to users table', NOW()); 