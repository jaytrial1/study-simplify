CREATE TABLE student_approval_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    owner_id INT NOT NULL,
    first_approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_approval (student_id, owner_id)
);



ALTER TABLE users 
ADD COLUMN is_approved_by_owner BOOLEAN DEFAULT FALSE 
AFTER is_active_by_owner;



ALTER TABLE `users` ADD COLUMN `is_active_by_admin` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active_by_owner`