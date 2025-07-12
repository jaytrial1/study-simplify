ALTER TABLE `users`
ADD COLUMN `trial_start_date` DATE NULL DEFAULT NULL COMMENT 'Stores the date when the student''s 7-day trial period begins.' AFTER `updated_at`; 