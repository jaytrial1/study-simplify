-- Combined SQL script for creating the database structure ONLY
-- Based on studysimplify_new.sql, new.sql, and update_users_table.sql

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `studysimplify_new` -- You might need to create this database first in Hostinger
-- Or uncomment the following lines:
-- CREATE DATABASE IF NOT EXISTS `studysimplify_new` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- USE `studysimplify_new`;
--

DELIMITER $$
--
-- Procedures
--
CREATE PROCEDURE `cleanup_inactive_users` ()   BEGIN
  DELETE FROM active_users
  WHERE last_activity < (NOW() - INTERVAL 15 MINUTE);
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `active_users`
--

CREATE TABLE `active_users` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `page` varchar(255) DEFAULT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT current_timestamp(),
  `first_seen` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_history`
--

CREATE TABLE `chat_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `grade` varchar(50) NOT NULL,
  `question_identifier` varchar(255) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `chapter` varchar(100) DEFAULT NULL,
  `conversation` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owners`
--

CREATE TABLE `owners` (
  `owner_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `class_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `subdomain_identifier` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_plans`
--

CREATE TABLE `owner_plans` (
  `plan_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `plan_type` enum('semester','full_year','custom') NOT NULL,
  `price_per_student` decimal(10,2) NOT NULL,
  `initial_student_count` int(11) DEFAULT 0,
  `current_total_students` int(11) DEFAULT 0,
  `active_student_count` int(11) DEFAULT 0,
  `inactive_approved_student_count` int(11) DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `payment_done` decimal(10,2) DEFAULT 0.00,
  `total_due_amount` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('pending_initialization','pending_payment','active','payment_due','grace_period','expired','fully_paid') DEFAULT 'pending_initialization',
  `date_of_last_payment` date DEFAULT NULL,
  `installment_count` int(11) DEFAULT 1,
  `installment_interval_days` int(11) DEFAULT NULL,
  `next_installment_due_date` date DEFAULT NULL,
  `next_installment_amount` decimal(10,2) DEFAULT NULL,
  `payment_deadline_for_addition` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_plan_history`
--

CREATE TABLE `owner_plan_history` (
  `history_id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `plan_type` enum('semester','full_year','custom') NOT NULL,
  `price_per_student` decimal(10,2) NOT NULL,
  `students_at_expiry` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `total_amount_paid` decimal(10,2) NOT NULL,
  `archived_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `owner_tokens`
--

CREATE TABLE `owner_tokens` (
  `id` int(11) NOT NULL,
  `owner_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `saved_answers`
--

CREATE TABLE `saved_answers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `question_identifier` varchar(255) DEFAULT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `chapter` varchar(100) DEFAULT NULL,
  `grade` varchar(50) DEFAULT NULL,
  `answer_text` text DEFAULT NULL,
  `save_type` enum('Best response','question_related') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_approval_history`
--

CREATE TABLE `student_approval_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `owner_id` INT NOT NULL,
    `first_approved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_approval` (`student_id`, `owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `subdomain_identifier` varchar(255) DEFAULT NULL,
  `is_active_by_owner` tinyint(1) DEFAULT 0,
  `is_approved_by_owner` tinyint(1) DEFAULT 0, -- Added from new.sql
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(50) DEFAULT NULL, -- Added from update_users_table.sql
  `password` varchar(255) NOT NULL,
  `grade_level` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Indexes for dumped tables
--

--
-- Indexes for table `active_users`
--
ALTER TABLE `active_users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `last_activity` (`last_activity`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `device_fingerprint` (`device_fingerprint`),
  ADD KEY `idx_active_users_user_id` (`user_id`); -- Added potential FK index


--
-- Indexes for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `owners`
--
ALTER TABLE `owners`
  ADD PRIMARY KEY (`owner_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `subdomain_identifier` (`subdomain_identifier`);

--
-- Indexes for table `owner_plans`
--
ALTER TABLE `owner_plans`
  ADD PRIMARY KEY (`plan_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `owner_plan_history`
--
ALTER TABLE `owner_plan_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `owner_tokens`
--
ALTER TABLE `owner_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `owner_id` (`owner_id`);

--
-- Indexes for table `saved_answers`
--
ALTER TABLE `saved_answers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_answer` (`user_id`,`subject`,`question_identifier`,`chapter`,`answer_text`(255));

-- Indexes for table student_approval_history (Defined in CREATE TABLE)
-- Adding explicit FK indexes below


--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

-- --------------------------------------------------------

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `active_users`
--
ALTER TABLE `active_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_history`
--
ALTER TABLE `chat_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owners`
--
ALTER TABLE `owners`
  MODIFY `owner_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_plans`
--
ALTER TABLE `owner_plans`
  MODIFY `plan_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_plan_history`
--
ALTER TABLE `owner_plan_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owner_tokens`
--
ALTER TABLE `owner_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `saved_answers`
--
ALTER TABLE `saved_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- AUTO_INCREMENT for table student_approval_history (Defined in CREATE TABLE)

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Constraints for dumped tables
--

--
-- Constraints for table `active_users`
--
ALTER TABLE `active_users`
  ADD CONSTRAINT `fk_active_users_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


--
-- Constraints for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD CONSTRAINT `chat_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE; -- Added ON DELETE/UPDATE

--
-- Constraints for table `owner_plans`
--
ALTER TABLE `owner_plans`
  ADD CONSTRAINT `owner_plans_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`owner_id`) ON DELETE CASCADE;

--
-- Constraints for table `owner_plan_history`
--
ALTER TABLE `owner_plan_history`
  ADD CONSTRAINT `owner_plan_history_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`owner_id`) ON DELETE CASCADE;

--
-- Constraints for table `owner_tokens`
--
ALTER TABLE `owner_tokens`
  ADD CONSTRAINT `owner_tokens_ibfk_1` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`owner_id`) ON DELETE CASCADE;

--
-- Constraints for table `saved_answers`
--
ALTER TABLE `saved_answers`
  ADD CONSTRAINT `fk_saved_answers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE; -- Added Constraint


--
-- Constraints for table `student_approval_history`
--
ALTER TABLE `student_approval_history`
  ADD CONSTRAINT `fk_student_approval_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE, -- Added Constraint
  ADD CONSTRAINT `fk_student_approval_owner` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`owner_id`) ON DELETE CASCADE ON UPDATE CASCADE; -- Added Constraint

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
ALTER TABLE `users` ADD COLUMN `is_active_by_admin` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active_by_owner