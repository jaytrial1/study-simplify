# StudySimplify - Implemented Owner Workflow Documentation

This document outlines the detailed implementation of the tuition class owner management system within StudySimplify. This represents the actual built functionality, which evolved from the original specifications based on real-world requirements and practical considerations.

## 1. Core Concepts & Architecture

* **Multi-Tenant System**: Built on a single codebase architecture that dynamically serves different content based on subdomains
* **Owners**: Tuition class administrators who manage their own instance through a subdomain (e.g., `classA.mydomain.com`)
* **Students**: End users who register through an owner's subdomain, with access controlled by plan status
* **Plans**: Subscription agreements with flexible payment options and student management
* **Dynamic Configuration**: System detects subdomain through `$_SERVER['HTTP_HOST']`, loading the appropriate branding and owner configuration

## 2. Database Implementation Details

### 2.1 `owners` Table
* Primary key: `owner_id` (AUTO_INCREMENT)
* Core fields:
  * `full_name` - Owner's personal name
  * `class_name` - Display name for the tuition class
  * `email` - Unique identifier for login (with unique constraint)
  * `phone_number` - Contact information
  * `password` - Securely hashed using PHP's password_hash()
  * `subdomain_identifier` - Unique key for subdomain routing
* Timestamp fields: `created_at`, `updated_at` (automatically managed)

### 2.2 `owner_plans` Table (Core Business Logic)
* Primary key: `plan_id` (AUTO_INCREMENT)
* Foreign key: `owner_id` references `owners.owner_id`
* Plan configuration:
  * `plan_type` - ENUM('semester', 'full_year', 'custom')
  * `price_per_student` - Decimal value manually set by admin
* Student tracking:
  * `initial_student_count` - Base number of students at initialization
  * `current_total_students` - Dynamic total including additions
  * `active_student_count` - Count of students with `is_active_by_owner=true`
  * `inactive_approved_student_count` - Tracks students approved since last payment
* Date management:
  * `start_date` - When the plan became active
  * `expiry_date` - Calculated end date (checked by the expiry cron job)
* Payment tracking:
  * `total_amount` - Calculated as `price_per_student * current_total_students`
  * `payment_done` - Running total of payments received
  * `total_due_amount` - Calculated as `total_amount - payment_done`
  * `payment_status` - ENUM('pending_initialization', 'pending_payment', 'active', 'payment_due', 'grace_period', 'expired', 'fully_paid')
  * `date_of_last_payment` - Last payment timestamp
* Installment handling:
  * `installment_count` - Number of installments (default: 1)
  * `installment_interval_days` - Days between payments
  * `next_installment_due_date` - Calculated next payment date
  * `next_installment_amount` - Amount due for next installment
* Special handling for new students:
  * `payment_deadline_for_addition` - 5-day deadline for payment after adding students to a fully-paid plan
* Timestamp fields: `created_at`, `updated_at`

### 2.3 `owner_plan_history` Table
* Primary key: `history_id` (AUTO_INCREMENT)
* Mirrors structure of `owner_plans` to preserve complete snapshot
* Additional fields:
  * `students_at_expiry` - Final student count
  * `archived_at` - When the record was archived
* Populated automatically when plans expire via the cron job

### 2.4 Modified `users` Table
* Added fields:
  * `tuition_class_identifier` - Links to owner's subdomain
  * `is_active_by_owner` - Boolean controlling access (default: false)
* The `grade` field is immutable for subdomain users once set

## 3. User Authentication Implementation

### 3.1 Owner Portal
* Custom authentication against the `owners` table
* Session management with `owner_id` stored in PHP session
* Security features:
  * CSRF protection on forms
  * Password reset functionality
  * Login attempt throttling
* Custom validation rules for owner registration

### 3.2 Student Portal (Subdomain-Specific)
* Dynamic subdomain detection in the application bootstrap
* Customized signup form with tuition-specific fields
* Automated `tuition_class_identifier` assignment
* Access control system checks both plan status and individual activation status

## 4. Owner Dashboard Implementation

The dashboard is implemented as a series of panels with real-time data:

* **Plan Summary Panel**:
  * Dynamic status indicators with color coding
  * Countdown to expiry for active plans
  * Visual indicators for payment status
* **Student Statistics**:
  * Real-time counters for various student categories
  * Visual graphs showing student distribution
* **Financial Summary**:
  * Progress bars for payment completion
  * Due date highlighting with urgency indicators
  * Installment schedule visualization
* **Student Management Interface**:
  * Filterable/sortable data tables
  * Bulk actions for student management
  * Search functionality by name/email/grade
  * Single-click approval system
* **Plan History**:
  * Expandable records with detailed view
  * Export functionality for record-keeping

## 5. Business Logic Implementation

### 5.1 Initial Setup Process
* Admin interface with plan creation wizard
* Dynamic calculation of costs based on student count and price per student
* Status transitions controlled by database triggers and application logic
* Validation rules prevent impossible combinations

### 5.2 Student Onboarding System
* Custom registration flow for subdomain users
* Queue system for owner approval
* Automatic email notifications when students register
* Bulk approval options for efficiency

### 5.3 Plan Activation Logic
* Transaction-based updates to ensure data integrity
* Cascading updates that maintain referential integrity
* Automated date calculations based on plan type selection
* Validation to prevent impossible pricing scenarios

### 5.4 Mid-Plan Student Addition Logic
* Optimized database transactions for student approval
* Special state management for previously fully_paid plans:
  * Sets 5-day payment window via `payment_deadline_for_addition`
  * Recalculates all financial fields
  * Updates payment status if needed
* Detailed logging for auditing purposes

### 5.5 Payment Processing System
* Admin interface for recording manual payments
* Smart allocation of payments to appropriate buckets
* Cascading status updates based on payment amounts
* Date validation to prevent impossible payment dates (fixed in recent update)
* Transaction handling to ensure data consistency

### 5.6 Access Control Implementation
* Multi-level permission system
* Fast lookup via indexed database fields
* Caching layer for performance optimization
* Appropriate messaging based on access state

### 5.7 Plan Expiry & Renewal Implementation
* Automated daily cron job (`check_plan_expiry.php`)
* Transaction-based processing for data integrity
* Detailed logging for audit purposes
* Manual intervention workflow for renewals:
  * Admin dashboard shows expired plans
  * Simple renewal process to create new plan
  * Historical data preservation

## 6. Date Handling & Validation Implementation

* Comprehensive validation system for all date fields
* Recent enhancement to `payment_deadline_for_addition` handling:
  * Detection of invalid dates ('0000-00-00')
  * Reset logic for corrupted dates
  * Format standardization to Y-m-d
  * Prevention of UI date display bugs (1/11/2030 issue)
* MySQL date functions used consistently
* PHP date validation with strtotime() fallbacks

## 7. Technical Implementation Details

### 7.1 Automated Plan Expiry System
* Located at `api/cron/check_plan_expiry.php`
* Features:
  * Transaction-based updates
  * Comprehensive error handling
  * Detailed logging to `plan_expiry.log`
  * Email notification capability (configurable)
  * Performance optimized for large datasets

### 7.2 Admin Testing Tools
* Located at `api/admin/test_plan_expiry.php`
* Features:
  * Visual interface showing plan status
  * Color-coded indicators for expired plans
  * Manual triggering of expiry check
  * Detailed results display
  * No page reload required (AJAX implementation)

## 8. Implementation Challenges & Solutions

* **Date Handling**: Fixed issues with invalid dates by implementing comprehensive validation
* **Payment Tracking**: Implemented a flexible system for different payment schedules
* **Student Management**: Created efficient approval system with proper triggers
* **Plan Expiry**: Built automated detection with manual oversight
* **Database Integrity**: Used transactions and constraints to maintain data consistency

## 9. Future Roadmap

* **Online Payment Gateway**: Integration with payment processors
* **Automated Renewal**: Self-service option for owners
* **Advanced Reporting**: Financial and student activity analytics
* **Notification System**: Email alerts for key events
* **Mobile Dashboard**: Responsive interface for on-the-go management 