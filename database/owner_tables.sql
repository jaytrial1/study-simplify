-- StudySimplify - Owner Tables

-- 1. Create the owners table
CREATE TABLE IF NOT EXISTS owners (
    owner_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    subdomain_identifier VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create the owner_plans table
CREATE TABLE IF NOT EXISTS owner_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    plan_type ENUM('semester', 'full_year', 'custom') NOT NULL,
    price_per_student DECIMAL(10,2) NOT NULL,
    initial_student_count INT DEFAULT 0,
    current_total_students INT DEFAULT 0,
    active_student_count INT DEFAULT 0,
    inactive_approved_student_count INT DEFAULT 0,
    start_date DATE NULL,
    expiry_date DATE NULL,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_done DECIMAL(10,2) DEFAULT 0.00,
    total_due_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_status ENUM('pending_initialization', 'pending_payment', 'active', 'payment_due', 'grace_period', 'expired', 'fully_paid') DEFAULT 'pending_initialization',
    date_of_last_payment DATE NULL,
    installment_count INT DEFAULT 1,
    installment_interval_days INT NULL,
    next_installment_due_date DATE NULL,
    next_installment_amount DECIMAL(10,2) NULL,
    payment_deadline_for_addition DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create the owner_plan_history table
CREATE TABLE IF NOT EXISTS owner_plan_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    plan_type ENUM('semester', 'full_year', 'custom') NOT NULL,
    price_per_student DECIMAL(10,2) NOT NULL,
    students_at_expiry INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount_paid DECIMAL(10,2) NOT NULL,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add required columns to the users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active_by_owner BOOLEAN DEFAULT FALSE AFTER tuition_class;

-- Make tuition_class nullable if not already
ALTER TABLE users MODIFY COLUMN tuition_class VARCHAR(50) NULL; 

ALTER TABLE users CHANGE COLUMN tuition_class subdomain_identifier VARCHAR(50);