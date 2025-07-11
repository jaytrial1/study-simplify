<?php
// Turn off PHP error output that might interfere with JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Set up exception handler to ensure we always return JSON
function exception_handler($exception) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $exception->getMessage(),
        'trace' => $exception->getTraceAsString()
    ]);
    exit;
}
set_exception_handler('exception_handler');

// Set up error handler to convert PHP errors to exceptions
function error_handler($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
}
set_error_handler('error_handler');

// Setup debug logging - create a log file in a known location
function debug_log($message, $data = null) {
    $log_file = '../../debug_toggle_student.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] {$message}";
    
    if ($data !== null) {
        $log_message .= " - Data: " . json_encode($data);
    }
    
    file_put_contents($log_file, $log_message . PHP_EOL, FILE_APPEND);
}

header("Content-Type: application/json");
require_once '../../config/database.php';

// Start logging the request
debug_log("Request started", $_REQUEST);

// Simple token-based authentication check
$authHeader = null;

// Try multiple ways to get the Authorization header
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    if (isset($requestHeaders['Authorization'])) {
        $authHeader = $requestHeaders['Authorization'];
    }
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Try getting token from data as fallback
if (!$authHeader && isset($data['auth_token'])) {
    $authHeader = 'Bearer ' . $data['auth_token'];
}

if (!$authHeader) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Authorization token is required',
        'debug' => [
            'has_post_data' => !empty($data),
            'post_data_keys' => $data ? array_keys($data) : []
        ]
    ]);
    exit;
}

$token = trim(str_replace('Bearer ', '', $authHeader));
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid authorization token']);
    exit;
}

$conn = getConnection();

// Verify token is valid in the database
$token_check = $conn->prepare("SELECT owner_id FROM owner_tokens WHERE token = ? AND expires_at > NOW()");
$token_check->bind_param("s", $token);
$token_check->execute();
$token_result = $token_check->get_result();

if ($token_result->num_rows === 0) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Invalid or expired token',
        'token_prefix' => substr($token, 0, 5) . '...'
    ]);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
if (empty($data['owner_id']) || empty($data['student_id']) || !isset($data['activate'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Required parameters missing']);
    exit;
}

$owner_id = $data['owner_id'];
$student_id = $data['student_id'];
$activate = (bool)$data['activate'];
$is_first_approval = isset($data['is_first_approval']) ? (bool)$data['is_first_approval'] : false;

// Start a transaction to ensure all operations are atomic
$conn->begin_transaction();

try {
    // Add transaction debugging
    $debug_info = [];
    $debug_info['action'] = 'toggle_student_status';
    $debug_info['student_id'] = $student_id;
    $debug_info['owner_id'] = $owner_id;
    $debug_info['is_first_approval'] = $is_first_approval;
    $debug_info['activate'] = $activate;
    
    debug_log("Transaction started", $debug_info);
    
    // Step 1: Verify the owner
    debug_log("Verifying owner", ['owner_id' => $owner_id]);
    $stmt = $conn->prepare("SELECT subdomain_identifier FROM owners WHERE owner_id = ?");
    $stmt->bind_param("i", $owner_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Owner not found");
    }

    $owner = $result->fetch_assoc();
    $subdomain = $owner['subdomain_identifier'];

    // Step 2: Verify the student belongs to this owner's class
    $stmt = $conn->prepare("SELECT id, name, subdomain_identifier, is_active_by_owner, is_approved_by_owner, Progress_status
                            FROM users 
                            WHERE id = ?");
    $stmt->bind_param("i", $student_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Student not found");
    }

    $student = $result->fetch_assoc();

    // Verify student belongs to this subdomain
    if ($student['subdomain_identifier'] !== $subdomain) {
        throw new Exception("Student is not part of this class");
    }
    
    // Check if we already have the is_approved_by_owner column
    // If not, add it
    $has_columns_check = $conn->query("SHOW COLUMNS FROM users LIKE 'is_approved_by_owner'");
    if ($has_columns_check->num_rows === 0) {
        $conn->query("ALTER TABLE users ADD COLUMN is_approved_by_owner BOOLEAN DEFAULT FALSE AFTER is_active_by_owner");
        $student['is_approved_by_owner'] = false;
    }
    
    // Create student_approval_history table if it doesn't exist
    $conn->query("CREATE TABLE IF NOT EXISTS student_approval_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        owner_id INT NOT NULL,
        first_approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_approval (student_id, owner_id)
    )");
    
    // Step 3: Get the owner's current plan details
    $plan_stmt = $conn->prepare("SELECT * FROM owner_plans WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1");
    $plan_stmt->bind_param("i", $owner_id);
    $plan_stmt->execute();
    $plan_result = $plan_stmt->get_result();
    
    // Check if the owner has an active plan
    if ($plan_result->num_rows === 0) {
        // Special handling for after renewal - there might be no plan yet
        debug_log("No active plan found for owner", ['owner_id' => $owner_id]);
        
        if ($is_first_approval) {
            // This is a first-time approval but no plan exists.
            // Update just the approval status without updating plan counts
            $stmt = $conn->prepare("UPDATE users SET is_approved_by_owner = 1, is_active_by_owner = ? WHERE id = ?");
            $activateVal = $activate ? 1 : 0;
            $stmt->bind_param("ii", $activateVal, $student_id);
            $stmt->execute();
            
            if ($stmt->affected_rows <= 0) {
                throw new Exception("Failed to update student status");
            }
            
            debug_log("Student approved with no active plan", [
                'student_id' => $student_id, 
                'is_active' => $activate
            ]);
            
            $conn->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Student approved successfully (no active plan)',
                'student_id' => $student_id,
                'is_active' => $activate,
                'is_approved' => true,
                'plan_status' => 'none'
            ]);
            exit;
        } else {
            throw new Exception("Owner does not have an active plan");
        }
    }
    
    $plan = $plan_result->fetch_assoc();
    $previous_status = $plan['payment_status'];
    
    debug_log("Student data", $student);
    debug_log("Plan data before update", $plan);
    
    // Step 4: Handle student activation and approval
    if ($is_first_approval) {
        // This is a first-time approval - will affect billing and cannot be reversed
        
        // Check if student was already approved (prevent duplicate approvals)
        if ($student['is_approved_by_owner']) {
            echo json_encode([
                'status' => 'info',
                'message' => 'Student is already approved',
                'student_id' => $student_id,
                'is_active' => (bool)$student['is_active_by_owner'],
                'is_approved' => true
            ]);
            $conn->commit();
            exit;
        }
        
        // Update both approval and activation status
        $stmt = $conn->prepare("UPDATE users SET is_approved_by_owner = 1, is_active_by_owner = ?, payment_type = 'cash' WHERE id = ?");
        $activateVal = $activate ? 1 : 0;
        $stmt->bind_param("ii", $activateVal, $student_id);
        $stmt->execute();
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Failed to update student status");
        }
        
        // Record this approval in history to prevent future double-counting
        $record_stmt = $conn->prepare("INSERT IGNORE INTO student_approval_history 
                                      (student_id, owner_id) VALUES (?, ?)");
        $record_stmt->bind_param("ii", $student_id, $owner_id);
        $record_stmt->execute();
        
        // Increment the student counts
        $current_stmt = $conn->prepare("UPDATE owner_plans 
                                       SET current_total_students = current_total_students + 1,
                                          inactive_approved_student_count = CASE WHEN ? = 0 THEN inactive_approved_student_count + 1 ELSE inactive_approved_student_count END,
                                          active_student_count = CASE WHEN ? = 1 THEN active_student_count + 1 ELSE active_student_count END
                                       WHERE owner_id = ?");
        $current_stmt->bind_param("iii", $activateVal, $activateVal, $owner_id);
        $current_stmt->execute();
        
        // Get the updated plan values
        $plan_stmt->execute();
        $updated_plan = $plan_stmt->get_result()->fetch_assoc();
        
        // Recalculate total amount based on ALL approved students (current_total_students)
        $new_total_amount = $updated_plan['price_per_student'] * $updated_plan['current_total_students'];
        $new_total_due_amount = $new_total_amount - $updated_plan['payment_done'];
        
        // Check if we need to set a 5-day payment deadline for addition
        $payment_deadline_for_addition = null;
        $new_payment_status = $updated_plan['payment_status'];
        
        if ($previous_status === 'fully_paid' && $new_total_due_amount > 0) {
            // Plan was fully paid before, but now there's a balance due to new student
            debug_log("CRITICAL SECTION: Handling fully_paid to payment_due transition", [
                'previous_status' => $previous_status,
                'new_total_due_amount' => $new_total_due_amount
            ]);
            
            try {
                // Create a separate try/catch for this critical section
                $payment_deadline_for_addition = date('Y-m-d', strtotime('+5 days'));
                debug_log("Payment deadline set", ['deadline' => $payment_deadline_for_addition]);
                
                $new_payment_status = 'payment_due';
                
                // Force numeric format for monetary values to avoid type issues
                $new_total_amount = floatval($new_total_amount);
                $new_total_due_amount = floatval($new_total_due_amount);
                $next_installment_amount = floatval($new_total_due_amount);
                
                debug_log("Values prepared for update", [
                    'new_total_amount' => $new_total_amount,
                    'new_total_due_amount' => $new_total_due_amount,
                    'next_installment_amount' => $next_installment_amount,
                    'owner_id' => $owner_id
                ]);
                
                // Skip all binding issues with a very simple approach - direct SQL
                // Use sprintf to safely format the numbers
                $sql = sprintf(
                    "UPDATE owner_plans 
                     SET total_amount = %.2f,
                         total_due_amount = %.2f,
                         payment_status = 'payment_due',
                         payment_deadline_for_addition = '%s',
                         next_installment_amount = %.2f,
                         next_installment_due_date = NULL
                     WHERE owner_id = %d",
                    $new_total_amount,
                    $new_total_due_amount,
                    $conn->real_escape_string($payment_deadline_for_addition),
                    $next_installment_amount,
                    $owner_id
                );
                
                debug_log("Executing direct SQL", ['sql' => $sql]);
                
                if (!$conn->query($sql)) {
                    debug_log("SQL execution failed", ['error' => $conn->error]);
                    throw new Exception("SQL error: " . $conn->error);
                }
                
                debug_log("Update successful");
                
                // Critical: Commit transaction immediately to avoid any issues
                $conn->commit();
                debug_log("Transaction committed early due to critical section");
                
                // Student was already approved in the section above, just return success
                debug_log("Sending success response for fully_paid transition");
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Student approved and activated successfully',
                    'student_id' => $student_id,
                    'is_active' => $activate,
                    'is_approved' => true,
                    'is_first_approval' => $is_first_approval
                ]);
                debug_log("Request completed for fully_paid transition");
                $conn->close();
                exit(); // Critical: Exit to prevent further processing
                
            } catch (Exception $inner_e) {
                // Log this specific error
                debug_log("Critical error in fully_paid section", ['error' => $inner_e->getMessage()]);
                throw $inner_e; // Re-throw to outer catch
            }
            
            // Track values for debugging
            $debug_info['case'] = 'fully_paid_to_payment_due';
            $debug_info['new_total_amount'] = $new_total_amount;
            $debug_info['new_total_due_amount'] = $new_total_due_amount;
            $debug_info['next_installment_amount'] = $next_installment_amount;
            
        } else {
            // Plan wasn't fully paid, update the amounts and recalculate installment if applicable
            
            // Check if using installments
            if ($updated_plan['installment_count'] > 1) {
                try {
                    // Add debug info 
                    debug_log("Calculating installments", [
                        'total_amount' => $updated_plan['total_amount'],
                        'installment_count' => $updated_plan['installment_count'],
                        'payment_done' => $updated_plan['payment_done']
                    ]);
                    
                    // Calculate already completed installments based on the original plan's amounts
                    // This prevents miscounting when new students join
                    $original_installment_size = ($updated_plan['installment_count'] > 0) ? 
                        $updated_plan['total_amount'] / $updated_plan['installment_count'] : 0;
                        
                    if ($original_installment_size <= 0) {
                        // Avoid future divisions with zero
                        $original_installment_size = 1; // Set to 1 to avoid division by zero
                    }
                    
                    $original_total_installments = max(1, $updated_plan['installment_count']); // Ensure at least 1
                    
                    // How many complete installments have been paid?
                    $current_position = ($original_installment_size > 0) ?
                        $updated_plan['payment_done'] / $original_installment_size : 0;
                    $installments_completed = floor($current_position);
                    
                    // How many installments are left in the original plan?
                    $original_remaining = max(1, $original_total_installments - $installments_completed); // Ensure at least 1
                    
                    // For new student addition, we need the extra amount to be distributed across remaining installments
                    $additional_due = $new_total_due_amount - ($original_remaining * $original_installment_size);
                    
                    // Each remaining installment will be original size + additional portion
                    $next_installment_amount = $original_installment_size;
                    if ($additional_due > 0) {
                        $next_installment_amount += ($additional_due / $original_remaining);
                    }
                    
                    debug_log("Installment calculation completed", [
                        'original_installment_size' => $original_installment_size,
                        'installments_completed' => $installments_completed,
                        'original_remaining' => $original_remaining,
                        'additional_due' => $additional_due,
                        'next_installment_amount' => $next_installment_amount
                    ]);
                } catch (Exception $calc_error) {
                    // If any calculation error, just set a reasonable amount
                    debug_log("Error in installment calculation: " . $calc_error->getMessage());
                    $next_installment_amount = $new_total_due_amount;
                }
                
                // Get next installment due date (from existing or calculate new one)
                $next_installment_due_date = $updated_plan['next_installment_due_date'];
                if (!$next_installment_due_date && $original_remaining > 0) {
                    $interval_days = $updated_plan['installment_interval_days'] ?? 30;
                    $next_installment_due_date = date('Y-m-d', strtotime(date('Y-m-d') . ' + ' . $interval_days . ' days'));
                }
                
                $update_stmt = $conn->prepare("UPDATE owner_plans 
                                              SET total_amount = ?,
                                                  total_due_amount = ?,
                                                  next_installment_amount = ?,
                                                  next_installment_due_date = ?
                                              WHERE owner_id = ?");
                $update_stmt->bind_param("dddsi", 
                                       $new_total_amount,
                                       $new_total_due_amount,
                                       $next_installment_amount,
                                       $next_installment_due_date,
                                       $owner_id);
            } else {
                // Not using installments, just update the amounts
                $update_stmt = $conn->prepare("UPDATE owner_plans 
                                              SET total_amount = ?,
                                                  total_due_amount = ?
                                              WHERE owner_id = ?");
                $update_stmt->bind_param("ddi", 
                                       $new_total_amount,
                                       $new_total_due_amount,
                                       $owner_id);
            }
        }
        
        $update_stmt->execute();
        
        // Update is_active_by_owner and is_approved_by_owner
        if ($activate) {
            // Approving student: Update Progress_status to 'subscribed' and activate
            $stmt = $conn->prepare("UPDATE users SET is_approved_by_owner = 1, is_active_by_owner = 1, Progress_status = 'subscribed', payment_type = 'cash' WHERE id = ?");
            $stmt->bind_param("i", $student_id);
        } else {
            // Denying student: Update Progress_status to 'expired' and deactivate
            $stmt = $conn->prepare("UPDATE users SET is_approved_by_owner = 0, is_active_by_owner = 0, Progress_status = 'expired' WHERE id = ?");
            $stmt->bind_param("i", $student_id);
        }
        $stmt->execute();

        debug_log("User status update", [
            'student_id' => $student_id,
            'activate' => $activate,
            'affected_rows' => $stmt->affected_rows,
            'set_progress_status' => $activate ? 'subscribed' : 'expired'
        ]);

        if ($stmt->affected_rows <= 0) {
            throw new Exception("Failed to update student status");
        }
        
        $action_performed = "approved and " . ($activate ? "activated" : "deactivated");
        
    } else {
        // This is just toggling activation for an already-approved student
        
        // Verify student is already approved
        if (!$student['is_approved_by_owner']) {
            throw new Exception("Student must be approved before they can be activated/deactivated");
        }
        
        // Check if student's status is already what we're trying to set it to
        if ((bool)$student['is_active_by_owner'] === $activate) {
            echo json_encode([
                'status' => 'info',
                'message' => 'No changes needed, student status already set',
                'student_id' => $student_id,
                'is_active' => $activate,
                'is_approved' => true
            ]);
            $conn->commit();
            exit;
        }
        
        // Just update the activation status (not the approval status)
        $stmt = $conn->prepare("UPDATE users SET is_active_by_owner = ? WHERE id = ?");
        $activateVal = $activate ? 1 : 0;
        $stmt->bind_param("ii", $activateVal, $student_id);
        $stmt->execute();
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Failed to update student activation status");
        }
        
        // Recalculate student counts instead of just incrementing/decrementing
        // This ensures the counts are always accurate
        recalculateStudentCounts($conn, $owner_id, $subdomain);
        
        $action_performed = $activate ? "activated" : "deactivated";
    }
    
    // If everything succeeded, commit the transaction
    $conn->commit();
    debug_log("Transaction committed successfully");
    
    debug_log("Sending success response", [
        'status' => 'success',
        'message' => 'Student ' . $action_performed . ' successfully',
        'student_id' => $student_id
    ]);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Student ' . $action_performed . ' successfully',
        'student_id' => $student_id,
        'is_active' => $activate,
        'is_approved' => true,
        'is_first_approval' => $is_first_approval
    ]);
    
} catch (Exception $e) {
    // If anything failed, roll back the transaction
    $conn->rollback();
    debug_log("Transaction rolled back due to error", ['error' => $e->getMessage()]);
    
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'mysql_error' => $conn->error
    ]);
}

/**
 * Recalculate student counts from the database and update the owner_plans table
 * This ensures counts are always in sync with the actual data
 */
function recalculateStudentCounts($conn, $owner_id, $subdomain) {
    // Get accurate counts from the users table
    $stmt = $conn->prepare("SELECT 
                          COUNT(*) as total_approved,
                          SUM(CASE WHEN is_active_by_owner = 1 THEN 1 ELSE 0 END) as active_count,
                          SUM(CASE WHEN is_active_by_owner = 0 AND is_approved_by_owner = 1 THEN 1 ELSE 0 END) as inactive_approved
                        FROM users 
                        WHERE subdomain_identifier = ? AND is_approved_by_owner = 1");
    $stmt->bind_param("s", $subdomain);
    $stmt->execute();
    $result = $stmt->get_result();
    $counts = $result->fetch_assoc();
    
    // Ensure no NULL values (convert to 0)
    $total_approved = (int)$counts['total_approved'];
    $active_count = (int)$counts['active_count'];
    $inactive_approved = (int)$counts['inactive_approved'];
    
    debug_log("Recalculating student counts", [
        'subdomain' => $subdomain,
        'total_approved' => $total_approved,
        'active_count' => $active_count,
        'inactive_approved' => $inactive_approved
    ]);
    
    // Update the owner_plans table with accurate counts
    $update_stmt = $conn->prepare("UPDATE owner_plans 
                                  SET current_total_students = ?,
                                     active_student_count = ?,
                                     inactive_approved_student_count = ?
                                  WHERE owner_id = ?");
    $update_stmt->bind_param("iiii", 
                           $total_approved,
                           $active_count,
                           $inactive_approved,
                           $owner_id);
    $update_stmt->execute();
    
    debug_log("Student counts updated in database", [
        'owner_id' => $owner_id,
        'affected_rows' => $update_stmt->affected_rows
    ]);
}

debug_log("Request completed");
$conn->close();
?> 