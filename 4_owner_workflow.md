# StudySimplify - Multi-Tenant / Tuition Owner Workflow Specification

This document outlines the features, database structure, user flows, and business logic required to support tuition class owners within the StudySimplify application, building upon the single codebase architecture with dynamic subdomain configuration.

## 1. Core Concepts & Goals

*   **Owners:** Represent individual tuition classes or institutions. Each owner corresponds to a specific subdomain (e.g., `classA.mydomain.com`) managed within the system.
*   **Students (Owner-Affiliated):** Users who sign up or log in via an owner's specific subdomain. Their access is tied to the owner's plan status.
*   **Subdomain Identifier:** A unique key (e.g., "classA") linked to each owner, used for routing, loading branding configurations (`/subdomain/{identifier}/`), and associating students.
*   **Billing & Activation:** Full application access for students under an owner's subdomain is contingent on the owner having an active, paid plan.
*   **Centralized Management:** Owners require a dedicated dashboard to manage their class details, student roster, plan information, and billing.

## 2. Database Schema

The following tables are required. Existing tables (`users`) will be modified.

### 2.1 `owners` Table
Stores information about each tuition class owner.

*   `owner_id` (INT, Primary Key, Auto Increment)
*   `full_name` (VARCHAR)
*   `class_name` (VARCHAR) - Display name for the class.
*   `email` (VARCHAR, Unique)
*   `phone_number` (VARCHAR, Nullable)
*   `password` (VARCHAR) - Securely hashed.
*   `subdomain_identifier` (VARCHAR, Unique) - e.g., "classA". Links to subdomain routing and configuration.
*   `created_at` (TIMESTAMP)
*   `updated_at` (TIMESTAMP)

### 2.2 `owner_plans` Table
Tracks the *current* active or pending plan for each owner. Only one active record per owner.

*   `plan_id` (INT, Primary Key, Auto Increment)
*   `owner_id` (INT, Foreign Key referencing `owners.owner_id`)
*   `plan_type` (ENUM('semester', 'full_year', 'custom')) - Defines the billing cycle type.
*   `price_per_student` (DECIMAL) - Manually set after discussion with the owner.
*   `initial_student_count` (INT) - Number of students confirmed during the initialization phase.
*   `current_total_students` (INT) - Updated count including students added mid-plan (`initial_student_count` + newly approved students).
*   `active_student_count` (INT) - Count of students currently flagged as `is_active_by_owner = true`. (Can be derived from `users` table but useful here for dashboard).
*   `inactive_approved_student_count` (INT) - Primarily tracks students approved *since the last payment was processed* or since the plan became fully paid, useful for triggering logic. Reset after relevant payment.
*   `start_date` (DATE) - Date the current plan became active (typically after initial payment).
*   `expiry_date` (DATE) - Calculated based on `start_date` and `plan_type`. Can be manually adjusted for semester plans.
*   `total_amount` (DECIMAL) - Calculated: `price_per_student` * `current_total_students`. **Note:** This now *always* reflects the total cost based on *all* students currently approved under the plan.
*   `payment_done` (DECIMAL, Default: 0.00) - Total amount paid so far for *this* plan cycle. Manually updated.
*   `total_due_amount` (DECIMAL) - Calculated: `total_amount` - `payment_done`. **Note:** This *always* reflects the current outstanding balance for the plan.
*   `payment_status` (ENUM('pending_initialization', 'pending_payment', 'active', 'payment_due', 'grace_period', 'expired', 'fully_paid')) - Tracks the billing state. (`grace_period` might be used for the 5-day window).
*   `date_of_last_payment` (DATE, Nullable) - Manually updated.
*   `installment_count` (INT, Default: 1) - Number of installments agreed upon (1 for advance+final, >1 for installment plan). Manually set.
*   `installment_interval_days` (INT, Nullable) - Days between installment payments. Manually set if `installment_count` > 1.
*   `next_installment_due_date` (DATE, Nullable) - Calculated: `date_of_last_payment` + `installment_interval_days`.
*   `next_installment_amount` (DECIMAL, Nullable) - Calculated based on `total_due_amount` and remaining installments (relevant only when `payment_status` is not `fully_paid`).
*   `payment_deadline_for_addition` (DATE, Nullable) - **Replaces `new_student_batch_payment_due_date`**. Tracks the 5-day deadline for paying the *new total_due_amount* resulting from student(s) joining after the plan was initially fully paid.
*   `created_at` (TIMESTAMP)
*   `updated_at` (TIMESTAMP)

### 2.3 `owner_plan_history` Table
Archives expired or previous plans for historical reference. Structure mirrors `owner_plans` but captures the state at the time of expiry/renewal.

*   `history_id` (INT, Primary Key, Auto Increment)
*   `owner_id` (INT)
*   `plan_type`
*   `price_per_student`
*   `students_at_expiry` (INT)
*   `start_date`
*   `end_date`
*   `total_amount_paid` (DECIMAL)
*   `archived_at` (TIMESTAMP)

### 2.4 `users` Table Modification
Modify the existing `users` table:

*   Add `tuition_class_identifier` (VARCHAR, Nullable) - Stores the `subdomain_identifier` from the `owners` table if the user signed up via a subdomain. Null for main domain users.
*   Add `is_active_by_owner` (BOOLEAN, Default: false) - Flag indicating if the owner's plan covers this student's access. Managed by the billing/activation logic.
*   Ensure the `grade` column is set during signup for subdomain users and cannot be changed later via the standard settings page.

## 3. Authentication & User Flows

Implement distinct portals or logic based on URL/subdomain access:

### 3.1 Owner Portal
(Accessed via a dedicated URL, e.g., `mydomain.com/owner` or potentially via owner login credentials on the main domain)

*   **Signup:**
    *   Form: Full Name, Class Name, Email, Phone Number, Password.
    *   Action: Creates a record in `owners`. `subdomain_identifier` might be auto-generated or set manually by an admin initially. No plan is created yet.
*   **Login:**
    *   Form: Email, Password.
    *   Action: Authenticates against `owners` table, redirects to Owner Dashboard.

### 3.2 Student Portal (via Subdomain)
(Accessed via `subdomain.mydomain.com`)

*   **Signup:**
    *   Form: Full Name, Email, Phone Number, Grade (Dropdown, **immutable** after selection), Password.
    *   Action: Creates a record in `users`. `tuition_class_identifier` is automatically populated based on the accessed subdomain. `is_active_by_owner` defaults to `false`.
*   **Login:**
    *   Form: Email, Password.
    *   Action: Authenticates against `users` table. Performs access check (see Section 5). If allowed, redirects to `tuition_home.php`. If denied, shows activation message.

## 4. Owner Dashboard

A dedicated interface for logged-in owners, displaying information dynamically pulled from the database:

*   **Current Plan Summary:**
    *   Plan Type (`owner_plans.plan_type`)
    *   Status (`owner_plans.payment_status`)
    *   Active Since (`owner_plans.start_date`)
    *   Expires On (`owner_plans.expiry_date`)
    *   Price Per Student (`owner_plans.price_per_student`)
*   **Student Counts:**
    *   Initial Students (`owner_plans.initial_student_count`)
    *   Currently Active Students (`owner_plans.active_student_count`)
    *   Total Students on Plan (`owner_plans.current_total_students`)
    *   Pending Approval/Payment (`owner_plans.inactive_approved_student_count` if applicable)
*   **Billing Status:**
    *   Total Plan Cost (`owner_plans.total_amount`)
    *   Amount Paid (`owner_plans.payment_done`)
    *   Amount Due (`owner_plans.total_due_amount`)
    *   Next Installment Due (`owner_plans.next_installment_due_date`) - (If applicable)
    *   Next Installment Amount (`owner_plans.next_installment_amount`) - (If applicable)
    *   **Payment Due for Approved Students by:** (`owner_plans.new_student_batch_payment_due_date`) - (Displayed only if applicable, along with the amount calculated as `price_per_head * inactive_approved_student_count`)
    *   **(Simplified)** If `owner_plans.payment_deadline_for_addition` is set: Display "Payment Due by: [date] (`owner_plans.payment_deadline_for_addition`)". The amount shown as due is the main `total_due_amount`.
*   **Student Management Table:**
    *   Interactive table listing users where `users.tuition_class_identifier` matches the owner's subdomain.
    *   Columns: Student Name, Email, Phone Number, Grade, Status (`is_active_by_owner`).
    *   Actions:
        *   **Approve:** (For students with `is_active_by_owner=false`). This action triggers billing logic (see Section 5.4). Updates `owner_plans.inactive_approved_student_count`.
        *   **Deactivate/Remove:** Sets `is_active_by_owner=false`. Does *not* decrease billing counts for the current cycle once approved.
*   **Plan History Table:**
    *   Displays data from `owner_plan_history`.
*   **Payment Section:** (Details depend on integration)
    *   Displays clear calls to action for pending payments.
    *   Interface to record manual payments (if using cash/cheque).

## 5. Billing, Activation & Student Lifecycle

### 5.1 Initial Owner Setup
*   Admin/Sales discusses terms (`plan_type`, `price_per_student`, installments) with the owner.
*   Admin manually creates/updates the initial `owner_plans` record with agreed terms, setting `payment_status` to `pending_initialization`.

### 5.2 Student Initialization Phase
*   Owner instructs students to sign up via the class subdomain (`subdomain.mydomain.com`).
*   Students sign up (`is_active_by_owner` = `false`). They see an "activation pending" message on login.
*   Owner monitors the student list in their dashboard.
*   Owner confirms the list (e.g., clicks a "Finalize Roster" button). This updates `owner_plans.initial_student_count` and sets `payment_status` to `pending_payment`.

### 5.3 Plan Activation & Initial Payment
*   System calculates `total_amount` based on `initial_student_count`.
*   Dashboard prompts owner for the first payment (advance or full, based on agreement).
*   Admin records the payment manually (updates `payment_done`, `date_of_last_payment`).
*   System updates `payment_status` to `active`.
*   System calculates `start_date` and `expiry_date`.
*   System calculates `total_due_amount`, `next_installment_due_date`, `next_installment_amount` if applicable.
*   **Crucially:** System updates `users.is_active_by_owner` to `true` for all students included in the `initial_student_count`.

### 5.4 Handling New Students Mid-Plan (Simplified Logic)
*   New student signs up (`is_active_by_owner` = `false`). Shows "activation pending".
*   Owner sees the new student in the dashboard list.
*   Owner clicks **"Approve"** for the new student.
    *   Record the current `payment_status` before making changes (e.g., `previous_status = owner_plans.payment_status`).
    *   Increment `owner_plans.current_total_students`.
    *   Increment `owner_plans.inactive_approved_student_count` (useful for tracking trigger).
    *   **Always Recalculate:**
        *   `owner_plans.total_amount` = `price_per_head` * `current_total_students`.
        *   `owner_plans.total_due_amount` = `owner_plans.total_amount` - `owner_plans.payment_done`.
    *   Set `users.is_active_by_owner = true` for the approved student *immediately*.
    *   **Check if 5-Day Deadline Applies:**
        *   If `previous_status` was `'fully_paid'` and the new `owner_plans.total_due_amount` is > 0:
            *   Set `owner_plans.payment_deadline_for_addition` = `NOW() + 5 days`.
            *   Optionally, update `payment_status` to `'payment_due'` or `'grace_period'` to reflect the new outstanding amount.
            *   Clear any installment fields (`next_installment_due_date`, `next_installment_amount`) as the full new due amount is expected.
        *   Else (if plan was not previously fully paid):
            *   The increased `total_due_amount` will be handled by the normal installment process. If installments exist, `next_installment_amount` might need recalculation based on the new `total_due_amount` and remaining installments.
            *   Ensure `owner_plans.payment_deadline_for_addition` is `NULL`.
    *   Update `payment_status` if necessary (e.g., from `fully_paid` back to `payment_due` if a deadline was set).

### 5.5 Ongoing Payments (Installments / Post-Addition Payment)
*   Admin records subsequent installment payments or payments made against a `payment_deadline_for_addition`.
*   Updates `payment_done`, `date_of_last_payment`.
*   Recalculates `total_due_amount` (`total_amount` - `payment_done`).
*   If a payment is made that clears the amount due when a `payment_deadline_for_addition` was set:
    *   Clear `payment_deadline_for_addition` (set to `NULL`).
    *   Reset `inactive_approved_student_count` to 0 (as the trigger condition is resolved).
    *   If `total_due_amount` is now <= 0, update `payment_status` to `fully_paid`.
*   If paying an installment (and `payment_status` is not `fully_paid`):
    *   Recalculate `next_installment_due_date` and potentially `next_installment_amount` based on the current `total_due_amount` and remaining installments.
*   If final payment is made (clearing `total_due_amount` to <= 0):
    *   Set `payment_status` to `fully_paid`.
    *   Clear installment fields (`next_installment_due_date`, `next_installment_amount`).
    *   Clear `payment_deadline_for_addition` if set.

### 5.6 Student Access Control Logic (On Student Login)
1.  Get `user.tuition_class_identifier`.
2.  If null, proceed as normal (main domain user).
3.  If set, find the corresponding `owner_plans` record for that identifier.
4.  Check `owner_plans.payment_status`:
    *   If 'pending_initialization', 'pending_payment', 'expired': Deny access, show "Contact owner" message.
    *   If 'active', 'payment_due', 'grace_period', 'fully_paid': Proceed to next check.
5.  Check `user.is_active_by_owner`:
    *   If `true`: Grant access, redirect to `tuition_home.php`.
    *   If `false`: Deny access, show "Contact owner" message.

### 5.7 Plan Expiry & Renewal
*   A cron job or check on login can detect when `expiry_date` is reached.
*   Set `payment_status` to 'expired'.
*   Archive the current `owner_plans` record to `owner_plan_history`.
*   Set `users.is_active_by_owner` to `false` for all associated students.
*   Owner needs to initiate a renewal process (likely involving admin intervention to create a new `owner_plans` record).

## 6. Plan Duration & Payment Methods

*   **Semester Plans:** Offer plan type "Semester". Set `expiry_date` initially to an estimate. Admin must manually update it later when the exact end date (e.g., last exam) is known.
*   **Payment Methods:**
    *   System primarily designed for **manual tracking** (Cash/Cheque). Admin updates payment fields via an interface.
    *   Payment Structures Supported:
        *   **Advance + Balance:** `installment_count = 1`. `next_installment_amount` = `total_due_amount`.
        *   **Installments:** `installment_count > 1`. `installment_interval_days` is set. `next_installment_amount` calculated.
        *   **Full Payment:** Paid upfront. `payment_status` quickly moves to `fully_paid`.

## 7. Integration & Architecture Notes

*   Relies on the **single codebase** model. All owner/student logic resides within the main application.
*   **Dynamic Configuration:** `$_SERVER['HTTP_HOST']` detects the subdomain, determines the `subdomain_identifier`, loads branding (`/subdomain/{identifier}/`), and identifies the associated `owner_id` and `owner_plans`.
*   **Admin Interface:** A separate, secure interface is crucial for admins to manage owners, set pricing, record payments, and adjust plan details (like expiry dates).

## 8. Open Questions / Future Considerations

*   Payment Gateway Integration: Requires specific implementation if automated online payments are desired.
*   Automated Reminders: Email notifications for owners about upcoming payments or plan expiry.
*   Detailed Reporting: More advanced reporting for owners and admins.
*   Owner Self-Service: Allowing owners to initiate renewals or change plans without admin intervention. 