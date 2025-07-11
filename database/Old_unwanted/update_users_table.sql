-- SQL script to add phone_number column to users table
ALTER TABLE users ADD COLUMN phone_number VARCHAR(50) DEFAULT NULL AFTER email; 