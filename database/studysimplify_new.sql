-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 13, 2025 at 04:25 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `studysimplify_new`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `cleanup_inactive_users` ()   BEGIN
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

--
-- Dumping data for table `owners`
--

INSERT INTO `owners` (`owner_id`, `full_name`, `class_name`, `email`, `phone_number`, `password`, `subdomain_identifier`, `created_at`, `updated_at`) VALUES
(1, 'Jay Jariwala', 'classa', 'j@gmail.com', '', '$2y$10$SSTAsxKBuALQSASOxN3SqOQJt5s/wCJu/AQnznH3X5Q6zYwgJ6Yki', 'classa', '2025-04-11 12:49:30', '2025-04-11 12:49:30'),
(2, 'Jay Jariwala', 'classb', 'jari@gmail.com', '', '$2y$10$/3NTRQe7Xw4UK7Kfdz2ZQe15x0pvkuPQ5fEbNV7lsrqGMCY3LU4Z.', 'classb', '2025-04-11 13:28:26', '2025-04-11 13:28:26');

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

--
-- Dumping data for table `owner_plans`
--

INSERT INTO `owner_plans` (`plan_id`, `owner_id`, `plan_type`, `price_per_student`, `initial_student_count`, `current_total_students`, `active_student_count`, `inactive_approved_student_count`, `start_date`, `expiry_date`, `total_amount`, `payment_done`, `total_due_amount`, `payment_status`, `date_of_last_payment`, `installment_count`, `installment_interval_days`, `next_installment_due_date`, `next_installment_amount`, `payment_deadline_for_addition`, `created_at`, `updated_at`) VALUES
(2, 2, 'semester', 0.00, 0, 0, 0, 0, NULL, NULL, 0.00, 0.00, 0.00, 'pending_initialization', NULL, 1, NULL, NULL, NULL, NULL, '2025-04-11 13:28:26', '2025-04-11 13:28:26'),
(3, 1, 'semester', 1200.00, 10, 17, 5, 7, '2025-04-11', '2025-10-11', 20400.00, 6000.00, 14400.00, 'active', NULL, 1, NULL, NULL, NULL, NULL, '2025-04-11 13:42:43', '2025-04-11 13:57:46');

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

--
-- Dumping data for table `owner_plan_history`
--

INSERT INTO `owner_plan_history` (`history_id`, `owner_id`, `plan_type`, `price_per_student`, `students_at_expiry`, `start_date`, `end_date`, `total_amount_paid`, `archived_at`) VALUES
(1, 1, 'full_year', 1000.00, 8, '2024-04-11', '2025-03-11', 8000.00, '2025-03-10 18:30:00');

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

--
-- Dumping data for table `owner_tokens`
--

INSERT INTO `owner_tokens` (`id`, `owner_id`, `token`, `created_at`, `expires_at`) VALUES
(2, 2, '2082cd90bfa173cc5794f333fdb5903fa5602411df1bc5d543196445f3dd3833', '2025-04-11 13:50:18', '2025-04-12 13:50:18'),
(3, 1, '1e88f6420a3d9d430cb786de1b06fb201085315621afbadb4ae57c6640eda6e8', '2025-04-11 13:50:37', '2025-04-12 13:50:37');

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
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `subdomain_identifier` varchar(255) DEFAULT NULL,
  `is_active_by_owner` tinyint(1) DEFAULT 0,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `grade_level` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `subdomain_identifier`, `is_active_by_owner`, `name`, `email`, `password`, `grade_level`, `created_at`, `updated_at`) VALUES
(2, 'classa', 0, 'jay jariwala', 'jariwalaj065@gmail.com', '$2y$10$QuBmcfA1OXE/JHG/LX6yv.oUwnjOX2evinlzkGdr1oL2EEnrWcXHm', '11 CBSE', '2025-04-11 13:11:37', '2025-04-11 13:57:46'),
(3, 'classa', 0, 'jay jariwala', 'j@gmail.com', '$2y$10$52aK8YG5tUG/wLzWu4/2sOaTDfu0T2KTBRERfUv70kbG4ln5wa/ti', '11 CBSE', '2025-04-11 13:37:10', '2025-04-11 13:57:44');

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
  ADD KEY `device_fingerprint` (`device_fingerprint`);

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

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `active_users`
--
ALTER TABLE `active_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT for table `chat_history`
--
ALTER TABLE `chat_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `owners`
--
ALTER TABLE `owners`
  MODIFY `owner_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `owner_plans`
--
ALTER TABLE `owner_plans`
  MODIFY `plan_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `owner_plan_history`
--
ALTER TABLE `owner_plan_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `owner_tokens`
--
ALTER TABLE `owner_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `saved_answers`
--
ALTER TABLE `saved_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chat_history`
--
ALTER TABLE `chat_history`
  ADD CONSTRAINT `chat_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
