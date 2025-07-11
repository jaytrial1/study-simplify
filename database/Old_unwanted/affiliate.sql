CREATE TABLE `affiliate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `affiliate_email` VARCHAR(255) DEFAULT NULL,
  `affiliate_user_id` INT DEFAULT NULL,
  `commission_amount` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  `principal_amount` DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  `buyer_email` VARCHAR(255) NOT NULL,
  `buyer_user_id` INT DEFAULT NULL,
  `razorpay_payment_id` VARCHAR(255) DEFAULT NULL,
  `payment_status` VARCHAR(50) DEFAULT NULL,
  `commission_paid_status` ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  `webhook_received_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `affiliate_upi_id` VARCHAR(255) DEFAULT NULL,
  `buyer_subdomain_identifier` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_affiliate_user_id` (`affiliate_user_id`),
  KEY `idx_buyer_user_id` (`buyer_user_id`),
  KEY `idx_razorpay_payment_id` (`razorpay_payment_id`),
  KEY `idx_affiliate_email` (`affiliate_email`),
  KEY `idx_buyer_email` (`buyer_email`),
  KEY `idx_affiliate_upi_id` (`affiliate_upi_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



ALTER TABLE affiliate
ADD COLUMN commission_paid_at TIMESTAMP NULL DEFAULT NULL AFTER commission_paid_status;