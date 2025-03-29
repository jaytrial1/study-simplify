-- Active Users Tracking System - Database Setup
-- This script creates the necessary table for tracking active users

CREATE TABLE IF NOT EXISTS active_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                     -- Can be NULL for anonymous users
  session_id VARCHAR(255) NOT NULL,     -- PHP session ID
  ip_address VARCHAR(45) NOT NULL,      -- Support for IPv6
  user_agent TEXT,                      -- Browser/device info
  page VARCHAR(255),                    -- Current page
  device_fingerprint VARCHAR(255),      -- Persistent device identifier
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last ping time
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,    -- When user first appeared
  INDEX (last_activity),                -- For efficient cleanup
  INDEX (session_id),                   -- For efficient lookups
  INDEX (device_fingerprint)            -- For device identification
);

-- Add a cleanup procedure to remove stale records
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_inactive_users()
BEGIN
  DELETE FROM active_users 
  WHERE last_activity < (NOW() - INTERVAL 15 MINUTE);
END //
DELIMITER ;

-- Optional: Create an event to automatically run cleanup
-- Uncomment if your MySQL server has event scheduler enabled
/*
CREATE EVENT IF NOT EXISTS cleanup_active_users_event
ON SCHEDULE EVERY 15 MINUTE
DO
  CALL cleanup_inactive_users();
*/ 