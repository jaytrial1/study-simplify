# 7-Day Trial Feature Specification

## 1. Non-Technical Overview

This document outlines the 7-day free trial feature for students signing up under a tuition owner's active subdomain on the StudySimplify platform.

### For New Students:
*   **Automatic Trial Access:** When a student signs up on a tuition owner's specific subdomain (e.g., `classA.studysimplify.in`), they will automatically receive 7 days of free access to the AI chatbot features, provided the tuition owner's main plan with StudySimplify is active.
*   **Trial Notifications:** During their trial period, students will see notifications (e.g., a toaster message on the chatbot page) informing them they are on a trial and how many days are remaining. Their settings page will also reflect their trial status.
*   **Post-Trial:** After the 7-day trial period expires, their access to the chatbot will automatically be revoked. To continue using the service, the tuition owner will need to formally approve them, adding them to the owner's paid plan.

### For Tuition Owners:
*   **Automatic Student Trials:** New students who successfully register under an owner's active subdomain will automatically begin a 7-day free trial.
*   **Dashboard Visibility:** These trial students will be visible in the owner's student management dashboard. A new column, `Progress_status`, will clearly indicate if a student is on 'demo', 'subscribed' (part of the paid plan), or if their 'demo' has 'expired'.
*   **No Billing Impact for Trials:** Students on their 7-day trial ('demo' status) will not be counted towards the owner's billable student numbers.
*   **Approving Trial Students:**
    *   The owner can review students who are on 'demo' or whose demo has 'expired'.
    *   At any point (during or after the trial), the owner can choose to "approve" a student. This action will change the student's `Progress_status` to 'subscribed', making them part of the owner's paid plan and subject to standard billing.
    *   If an owner takes no action, the student's trial will simply expire after 7 days, and access will cease.
*   **Dashboard Views:**
    *   The default view in the student management section will show "Approved Students" (those who are 'subscribed' and part of the paid plan).
    *   Owners can switch to other views like "Pending Students" (showing active 'demo' users) or "All Students".
    *   The `Progress_status` column will always be visible, providing clarity regardless of the selected view.

## 2. Technical Implementation Plan

This section details the technical changes required to implement the 7-day trial feature, providing a procedural outline for backend modifications.

### A. Database Modifications

**Table: `users`**
*   Add Column: `trial_expiry_date`
    *   Type: `DATE`
    *   Nullable: Yes
    *   Description: Stores the date when the student's 7-day trial period ends.
*   Add Column: `Progress_status`
    *   Type: `ENUM('demo', 'subscribed', 'expired')`
    *   Nullable: Yes (Default: NULL or 'demo' if appropriate for your insert logic)
    *   Description: Tracks the student's current lifecycle stage concerning the trial and subscription.

### B. Backend Logic

**i. Student Registration (Modify `api/auth/register.php`)**

```php
// At the beginning of the script, after including necessary files (config, database connection)
// and sanitizing input data (e.g., $_POST variables).

// --- 1. Pre-Registration Owner Plan Check --- 
$subdomain_identifier = null; // Function to extract subdomain from $_SERVER['HTTP_HOST']
// Example: (Illustrative, adapt to your existing subdomain detection logic)
if (isset($_SERVER['HTTP_HOST'])) {
    $hostParts = explode('.', $_SERVER['HTTP_HOST']);
    if (count($hostParts) > 2 && $hostParts[1] === 'studysimplify' && $hostParts[2] === 'in') {
        $subdomain_identifier = $hostParts[0];
    } elseif (count($hostParts) > 1 && $hostParts[1] === 'localhost') {
        $subdomain_identifier = $hostParts[0];
    }
}

if ($subdomain_identifier) {
    // Connect to the database (ensure $conn is your active mysqli connection object)

    // DB Query 1: Get owner_id from `owners` table
    $stmt_owner = $conn->prepare("SELECT owner_id FROM owners WHERE subdomain_identifier = ?");
    $stmt_owner->bind_param("s", $subdomain_identifier);
    $stmt_owner->execute();
    $result_owner = $stmt_owner->get_result();

    if ($result_owner->num_rows > 0) {
        $owner_data = $result_owner->fetch_assoc();
        $owner_id = $owner_data['owner_id'];

        // DB Query 2: Get payment_status from `owner_plans` table for $owner_id
        $stmt_plan = $conn->prepare("SELECT payment_status FROM owner_plans WHERE owner_id = ? ORDER BY plan_id DESC LIMIT 1"); // Assuming latest plan is relevant
        $stmt_plan->bind_param("i", $owner_id);
        $stmt_plan->execute();
        $result_plan = $stmt_plan->get_result();

        if ($result_plan->num_rows > 0) {
            $plan_data = $result_plan->fetch_assoc();
            $owner_plan_status = $plan_data['payment_status'];
            
            $active_plan_statuses = ['active', 'fully_paid', 'payment_due', 'grace_period'];
            if (!in_array($owner_plan_status, $active_plan_statuses)) {
                echo json_encode(['success' => false, 'error' => 'Tuition portal is currently inactive. Please contact the administrator.']);
                exit;
            }
        } else {
            // No plan found for owner, treat as inactive
            echo json_encode(['success' => false, 'error' => 'Tuition portal configuration error. Please contact the administrator.']);
            exit;
        }
        $stmt_plan->close();
    } else {
        // Subdomain identifier does not match any owner
        echo json_encode(['success' => false, 'error' => 'Invalid tuition portal.']);
        exit;
    }
    $stmt_owner->close();
} // End of owner plan check for subdomains

// --- Proceed with existing user registration logic (hashing password, checking if email exists, etc.) ---

// --- 2. If Owner's Plan is Active (or registration is on main domain) & User Insert is Successful ---
// Inside the block where the INSERT INTO users query has just been successfully executed:
// Assume $user_id is the ID of the newly inserted user.

if ($subdomain_identifier) { // Only apply trial logic if registered via an active owner's subdomain
    $trial_expiry_date_calc = date('Y-m-d', strtotime('+7 days'));
    $initial_progress_status = 'demo';
    $initial_is_active_by_owner = 0;

    $stmt_update_trial = $conn->prepare("UPDATE users SET trial_expiry_date = ?, Progress_status = ?, is_active_by_owner = ? WHERE id = ?");
    $stmt_update_trial->bind_param("ssii", $trial_expiry_date_calc, $initial_progress_status, $initial_is_active_by_owner, $user_id);
    $stmt_update_trial->execute();
    // Error handling for this update can be added.
    $stmt_update_trial->close();
} else {
    // For main domain users, set Progress_status to 'subscribed' or NULL if not applicable.
    // This example assumes main domain users are auto-subscribed or don't use this status.
    $main_domain_progress_status = 'subscribed'; // Or handle as per main domain logic
    $stmt_update_main = $conn->prepare("UPDATE users SET Progress_status = ? WHERE id = ?");
    $stmt_update_main->bind_param("si", $main_domain_progress_status, $user_id);
    $stmt_update_main->execute();
    $stmt_update_main->close();
}

// --- Continue with sending success response ---
```

**ii. Student Login & Access Control (Modify `api/auth/login.php`)**

```php
// After existing credential validation is successful and user data is fetched from `users` table.
// Assume $user (array) contains fetched user data including `id`, `is_active_by_owner`, `Progress_status`, `trial_expiry_date`, `tuition_class_identifier`.
// Assume $conn is your active mysqli connection object.

// --- Implement Access Rules --- 
$current_date_str = date('Y-m-d');
$access_granted = false;
$error_message = 'Access Denied.'; // Default error

if ($user['is_active_by_owner'] == 1) {
    // --- Rule 1: Subscribed User Access ---
    if ($user['tuition_class_identifier']) {
        // This is a subdomain user, check their owner's plan status
        $stmt_owner = $conn->prepare("SELECT owner_id FROM owners WHERE subdomain_identifier = ?");
        $stmt_owner->bind_param("s", $user['tuition_class_identifier']);
        $stmt_owner->execute();
        $result_owner = $stmt_owner->get_result();
        if ($owner_data = $result_owner->fetch_assoc()) {
            $owner_id = $owner_data['owner_id'];
            $stmt_plan = $conn->prepare("SELECT payment_status FROM owner_plans WHERE owner_id = ? ORDER BY plan_id DESC LIMIT 1");
            $stmt_plan->bind_param("i", $owner_id);
            $stmt_plan->execute();
            $result_plan = $stmt_plan->get_result();
            if ($plan_data = $result_plan->fetch_assoc()) {
                $owner_plan_status = $plan_data['payment_status'];
                $active_plan_statuses = ['active', 'fully_paid', 'payment_due', 'grace_period'];
                if (in_array($owner_plan_status, $active_plan_statuses)) {
                    if ($user['Progress_status'] !== 'subscribed') {
                        // Data consistency check/fix: If active_by_owner=1, status should be subscribed.
                        $stmt_fix_status = $conn->prepare("UPDATE users SET Progress_status = 'subscribed' WHERE id = ?");
                        $stmt_fix_status->bind_param("i", $user['id']);
                        $stmt_fix_status->execute();
                        $stmt_fix_status->close();
                        $user['Progress_status'] = 'subscribed'; // Update in-memory data
                    }
                    $access_granted = true;
                } else {
                    $error_message = 'Tuition portal is currently inactive.';
                }
            } else { $error_message = 'Tuition configuration error.'; }
            $stmt_plan->close();
        } else { $error_message = 'Tuition owner not found.'; }
        $stmt_owner->close();
    } else {
        // Main domain subscribed user - assumed access is granted if is_active_by_owner = 1
        // or add specific main domain checks if necessary.
        if ($user['Progress_status'] !== 'subscribed') {
             // Data consistency fix for main domain user
            $stmt_fix_status = $conn->prepare("UPDATE users SET Progress_status = 'subscribed' WHERE id = ?");
            $stmt_fix_status->bind_param("i", $user['id']);
            $stmt_fix_status->execute();
            $stmt_fix_status->close();
            $user['Progress_status'] = 'subscribed';
        }
        $access_granted = true;
    }
} elseif ($user['is_active_by_owner'] == 0) {
    // --- Rule 2: Trial User Access ---
    if ($user['Progress_status'] === 'demo' && $user['trial_expiry_date'] && strtotime($user['trial_expiry_date']) >= strtotime($current_date_str)) {
        $access_granted = true;
    } else {
        if ($user['Progress_status'] === 'expired' || ($user['Progress_status'] === 'demo' && $user['trial_expiry_date'] && strtotime($user['trial_expiry_date']) < strtotime($current_date_str))) {
            $error_message = 'Your trial period has ended. Please contact your tuition owner.';
             // Optional: Ensure Progress_status is 'expired' if trial_expiry_date has passed for a 'demo' user
            if ($user['Progress_status'] === 'demo' && $user['trial_expiry_date'] && strtotime($user['trial_expiry_date']) < strtotime($current_date_str)){
                $stmt_expire_manual = $conn->prepare("UPDATE users SET Progress_status = 'expired' WHERE id = ?");
                $stmt_expire_manual->bind_param("i", $user['id']);
                $stmt_expire_manual->execute();
                $stmt_expire_manual->close();
            }
        } else {
            $error_message = 'Your account is not currently active. Please contact your tuition owner.';
        }
    }
}

if (!$access_granted) {
    echo json_encode(['success' => false, 'error' => $error_message]);
    exit;
}

// --- Access granted, proceed to generate token/session ---
// Add Progress_status and trial_expiry_date to the success response if user is on trial.
$response_data = [
    'success' => true,
    'token' => $token, // Your existing token
    'userId' => $user['id'],
    // ... other existing response data
    'progressStatus' => $user['Progress_status'],
    'trialExpiryDate' => ($user['Progress_status'] === 'demo' ? $user['trial_expiry_date'] : null)
];
echo json_encode($response_data);

```

**iii. Daily Cron Job (New script: `api/cron/expire_trials.php`)**

```php
<?php
// Ensure this path is correct for your project structure
require_once __DIR__ . '/../../config/database.php'; // Or your central DB connection script
// require_once __DIR__ . '/../../lib/logging.php'; // If you have a logging utility

function expireUserTrials() {
    $conn = getConnection(); // Assumes getConnection() is available globally or via include
    if (!$conn) {
        // log_error("expire_trials_cron: Failed to connect to database.");
        error_log("expire_trials_cron: Failed to connect to database.");
        return;
    }

    $today_date_str = date('Y-m-d');
    $expired_count = 0;
    $error_details = [];

    $sql_select = "SELECT id FROM users WHERE Progress_status = 'demo' AND trial_expiry_date < ?";
    $stmt_select = $conn->prepare($sql_select);
    if (!$stmt_select) {
        // log_error("expire_trials_cron: Prepare statement failed (select): " . $conn->error);
        error_log("expire_trials_cron: Prepare statement failed (select): " . $conn->error);
        $conn->close();
        return;
    }
    $stmt_select->bind_param("s", $today_date_str);
    $stmt_select->execute();
    $result_select = $stmt_select->get_result();

    $sql_update = "UPDATE users SET Progress_status = 'expired' WHERE id = ?";
    $stmt_update = $conn->prepare($sql_update);
    if (!$stmt_update) {
        // log_error("expire_trials_cron: Prepare statement failed (update): " . $conn->error);
        error_log("expire_trials_cron: Prepare statement failed (update): " . $conn->error);
        $stmt_select->close();
        $conn->close();
        return;
    }

    while ($user_to_expire = $result_select->fetch_assoc()) {
        $user_id_to_expire = $user_to_expire['id'];
        $stmt_update->bind_param("i", $user_id_to_expire);
        if ($stmt_update->execute()) {
            if ($stmt_update->affected_rows > 0) {
                $expired_count++;
            }
        } else {
            $error_details[] = "Failed to update user ID: {$user_id_to_expire} - " . $stmt_update->error;
        }
    }

    $stmt_select->close();
    $stmt_update->close();
    $conn->close();

    $log_message = "expire_trials_cron: Successfully expired {$expired_count} user trials.";
    if (!empty($error_details)) {
        $log_message .= " Errors encountered: " . implode("; ", $error_details);
    }
    // log_info($log_message);
    error_log($log_message); // Using PHP error_log for simplicity
}

expireUserTrials();
?>
```

**iv. Owner Actions (Modify API endpoint, e.g., `api/owner/manage_student.php` or create a new one like `api/owner/update_student_status.php`)**

```php
// This script would handle actions like 'approve_trial_student', 'deny_trial_student'
// It expects parameters like `action` and `user_id` from the owner's dashboard.
// Assume $conn is your active mysqli connection object and owner authentication has been performed.
// Assume $owner_id is the ID of the currently logged-in owner.

$action = $_POST['action'] ?? null;
$student_user_id = $_POST['user_id'] ?? null;

if (!$action || !$student_user_id) {
    echo json_encode(['success' => false, 'error' => 'Missing required parameters.']);
    exit;
}

// --- Verify that the student belongs to this owner --- (Important security check)
$stmt_verify = $conn->prepare("SELECT u.id, o.owner_id FROM users u JOIN owners o ON u.tuition_class_identifier = o.subdomain_identifier WHERE u.id = ? AND o.owner_id = ?");
$stmt_verify->bind_param("ii", $student_user_id, $owner_id);
$stmt_verify->execute();
if ($stmt_verify->get_result()->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Student not found or does not belong to this tuition.']);
    $stmt_verify->close();
    exit;
}
$stmt_verify->close();

if ($action === 'approve_trial_student') {
    // --- Action: Approve Student (Transition from 'demo' or 'expired' to 'subscribed') ---
    $conn->begin_transaction(); // Use transactions for atomicity

    $stmt_update_user = $conn->prepare("UPDATE users SET Progress_status = 'subscribed', is_active_by_owner = 1 WHERE id = ?");
    $stmt_update_user->bind_param("i", $student_user_id);
    $user_updated = $stmt_update_user->execute();
    $stmt_update_user->close();

    if (!$user_updated) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => 'Failed to update student status.']);
        exit;
    }

    // --- Integrate with existing billing logic ---
    // Fetch owner's plan details
    $stmt_plan_details = $conn->prepare("SELECT plan_id, price_per_student, current_total_students, payment_done, payment_status FROM owner_plans WHERE owner_id = ? ORDER BY plan_id DESC LIMIT 1");
    $stmt_plan_details->bind_param("i", $owner_id);
    $stmt_plan_details->execute();
    $result_plan_details = $stmt_plan_details->get_result();
    $plan = $result_plan_details->fetch_assoc();
    $stmt_plan_details->close();

    if (!$plan) {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => 'Owner plan not found.']);
        exit;
    }

    // Check if student was already counted (e.g., re-approving after a lapse, this logic assumes they are newly billable)
    // For simplicity, this example assumes any approval makes them newly billable or confirms billable status.
    // More complex logic might be needed if a student can be deactivated and reactivated within the same billing cycle without re-incrementing count.

    $new_total_students = $plan['current_total_students'] + 1; // This assumes the student wasn't already in current_total_students for this plan.
                                                              // If you only want to increment if they were previously 'demo' or 'expired', add a check.
    $new_total_amount = $plan['price_per_student'] * $new_total_students;
    $new_total_due = $new_total_amount - $plan['payment_done'];

    $update_plan_sql = "UPDATE owner_plans SET current_total_students = ?, total_amount = ?, total_due_amount = ?";
    $update_plan_params_types = "idd";
    $update_plan_params_values = [$new_total_students, $new_total_amount, $new_total_due];

    $new_payment_status = $plan['payment_status']; // By default, keep current status unless changed below

    if ($plan['payment_status'] === 'fully_paid' && $new_total_due > 0) {
        $new_payment_deadline_calc = date('Y-m-d', strtotime('+5 days'));
        $update_plan_sql .= ", payment_deadline_for_addition = ?, payment_status = ?";
        $update_plan_params_types .= "ss";
        $update_plan_params_values[] = $new_payment_deadline_calc;
        $update_plan_params_values[] = 'payment_due'; // Change status to payment_due
    } elseif ($new_total_due <= 0 && $plan['payment_status'] !== 'fully_paid') {
        // If approving makes the plan fully paid
        $update_plan_sql .= ", payment_status = ?";
        $update_plan_params_types .= "s";
        $update_plan_params_values[] = 'fully_paid';
        $update_plan_sql .= ", payment_deadline_for_addition = NULL"; // Clear deadline if it became fully paid
    } else if ($new_total_due > 0 && $plan['payment_status'] === 'fully_paid'){
        // This case should be covered by the first if, but as a safeguard if $new_total_due was 0 after approval
    } else if ($new_total_due > 0 && $plan['payment_status'] === 'pending_payment'){
         $update_plan_sql .= ", payment_status = ?"; // Keep as pending_payment or move to payment_due as per your flow
         $update_plan_params_types .= "s";
         $update_plan_params_values[] = 'pending_payment'; 
    }

    $update_plan_sql .= " WHERE plan_id = ?";
    $update_plan_params_types .= "i";
    $update_plan_params_values[] = $plan['plan_id'];

    $stmt_update_plan = $conn->prepare($update_plan_sql);
    // Need to use call_user_func_array for bind_param with dynamic params
    $stmt_update_plan->bind_param($update_plan_params_types, ...$update_plan_params_values);
    
    $plan_updated = $stmt_update_plan->execute();
    $stmt_update_plan->close();

    if ($plan_updated) {
        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Student approved and billing updated.']);
    } else {
        $conn->rollback();
        echo json_encode(['success' => false, 'error' => 'Failed to update owner billing plan.']);
    }

} elseif ($action === 'deny_trial_student') {
    // --- Action: Deny/Remove Student (from 'demo' status) ---
    $stmt_deny_user = $conn->prepare("UPDATE users SET Progress_status = 'expired', is_active_by_owner = 0 WHERE id = ?"); // Ensure is_active_by_owner is 0
    $stmt_deny_user->bind_param("i", $student_user_id);
    if ($stmt_deny_user->execute()) {
        echo json_encode(['success' => true, 'message' => 'Student trial access denied/revoked.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update student status.']);
    }
    $stmt_deny_user->close();
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action.']);
}
```

### C. Frontend Considerations

**i. Owner Dashboard (Student List Section)**

*   **New Column:** Add a column to display `Progress_status` ('demo', 'subscribed', 'expired') for each student. This column should be visible in all student list views.
*   **View Modifications:**
    *   **"Approved Students" View (New Default/Option):** Filter to show users where `users.is_active_by_owner = 1` (their `Progress_status` will be 'subscribed').
    *   **"Pending Students" View:** Filter to show users where `users.is_active_by_owner = 0` AND `users.Progress_status = 'demo'` AND `users.trial_expiry_date >= CURRENT_DATE`.
    *   **"All Students" View:** No change, shows all students associated with the owner.
*   **Action Buttons:** Ensure "Approve" and "Deny/Remove" actions are available and contextually appropriate based on the student's `Progress_status`.

**ii. Student-Facing UI**

*   **Chatbot Page:**
    *   If logged-in user has `Progress_status = 'demo'` and trial is active:
        *   Display a non-intrusive toaster notification (e.g., on page load or first interaction): "You are using a trial version. [X] days remaining." (Calculate X from `trial_expiry_date`).
*   **Settings Page:**
    *   Display user's current status:
        *   If `Progress_status = 'demo'` and trial active: "Trial active: [X] days remaining until [trial_expiry_date]."
        *   If `Progress_status = 'expired'`: "Your trial has expired. Please contact your tuition owner for full access."
        *   If `Progress_status = 'subscribed'`: "Your plan is subscribed through [Tuition Class Name]."

This plan aims for clarity, minimal disruption to existing stable features, and leverages current architectural patterns (like cron jobs and owner dashboard structure) for sustainability. 