<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../config/database.php';

// For development/testing, we'll bypass the formal authentication
// In production, use proper authentication with tokens
$adminToken = isset($_SERVER['HTTP_AUTHORIZATION']) ? str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']) : '';

// Simple check if token starts with 'admin_token_'
if (strpos($adminToken, 'admin_token_') !== 0 && !isset($_GET['testing'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access']);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (empty($data['plan_id']) || !isset($data['payment_amount'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$plan_id = intval($data['plan_id']);
$payment_amount = floatval($data['payment_amount']);
$payment_date = !empty($data['payment_date']) ? $data['payment_date'] : date('Y-m-d');
$payment_notes = !empty($data['payment_notes']) ? $data['payment_notes'] : '';

// Validate payment amount
if ($payment_amount <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Payment amount must be greater than zero']);
    exit;
}

$conn = getConnection();

// Start transaction
$conn->begin_transaction();

try {
    // Get current plan details
    $plan_stmt = $conn->prepare("SELECT p.*, o.subdomain_identifier 
                                FROM owner_plans p 
                                INNER JOIN owners o ON p.owner_id = o.owner_id
                                WHERE p.plan_id = ?");
    $plan_stmt->bind_param("i", $plan_id);
    $plan_stmt->execute();
    $plan_result = $plan_stmt->get_result();
    
    if ($plan_result->num_rows === 0) {
        throw new Exception("Plan not found");
    }
    
    $plan = $plan_result->fetch_assoc();
    
    // Check if payment is allowed based on status
    $allowed_statuses = ['pending_payment', 'active', 'payment_due', 'grace_period'];
    if (!in_array($plan['payment_status'], $allowed_statuses)) {
        throw new Exception("Cannot record payment for plan with status: " . $plan['payment_status']);
    }
    
    // Calculate new payment values
    $new_payment_done = $plan['payment_done'] + $payment_amount;
    $new_total_due_amount = $plan['total_amount'] - $new_payment_done;
    
    // Determine new payment status
    $new_payment_status = $plan['payment_status'];
    $is_first_payment = ($plan['payment_done'] == 0 && $new_payment_done > 0);
    
    if ($new_total_due_amount <= 0) {
        // Payment is complete
        $new_payment_status = 'fully_paid';
    } elseif ($plan['payment_status'] === 'pending_payment' && $new_payment_done > 0) {
        // First payment moves status from pending_payment to active
        $new_payment_status = 'active';
    }
    
    // Calculate date values
    $start_date = $plan['start_date'];
    $expiry_date = $plan['expiry_date'];
    
    // If this is the first payment, set the start date and calculate expiry date
    if ($is_first_payment) {
        $start_date = $payment_date;
        
        // Calculate expiry date based on plan type
        switch ($plan['plan_type']) {
            case 'semester':
                // Default semester length is 6 months
                $expiry_date = date('Y-m-d', strtotime($start_date . ' + 6 months'));
                break;
                
            case 'full_year':
                $expiry_date = date('Y-m-d', strtotime($start_date . ' + 1 year'));
                break;
                
            case 'custom':
                // Default custom length is 3 months
                $expiry_date = date('Y-m-d', strtotime($start_date . ' + 3 months'));
                break;
        }
    }
    
    // Handle installment calculations
    $next_installment_due_date = null;
    $next_installment_amount = null;
    
    if ($new_payment_status !== 'fully_paid' && $plan['installment_count'] > 1) {
        // Is this the first payment? (transition from pending_payment to active)
        $is_first_payment_for_installments = ($plan['payment_status'] === 'pending_payment' && $new_payment_status === 'active');
        
        if ($is_first_payment_for_installments) {
            // First payment is the advance payment
            // For subsequent installments, divide the remaining amount by (installment_count - 1)
            $remaining_installments = $plan['installment_count'] - 1; // First installment is advance
            
            if ($remaining_installments > 0) {
                // Use start_date (which is set to payment_date for first payment) as the base
                // Calculate next installment due date: start_date + interval_days
                $interval_days = $plan['installment_interval_days'] ?? 30; // Default to 30 days if not set
                $next_installment_due_date = date('Y-m-d', strtotime($start_date . ' + ' . $interval_days . ' days'));
                
                // Calculate next installment amount - divide remaining amount by remaining installments
                $next_installment_amount = $new_total_due_amount / $remaining_installments;
            }
        } else {
            // This is a subsequent payment (not the first one)
            // Calculate how many installments have been paid (as a decimal/float)
            $payment_ratio = $new_payment_done / $plan['total_amount']; 
            $completed_payment_portion = $payment_ratio * $plan['installment_count'];
            
            // Calculate remaining installments (more accurately)
            $remaining_installments = $plan['installment_count'] - $completed_payment_portion;
            
            // Round to nearest integer to avoid floating point issues, ensure minimum 1
            $remaining_installments = max(1, round($remaining_installments));
            
            if ($remaining_installments > 0) {
                // Calculate next installment number (typically a whole number after rounding)
                $installments_completed = $plan['installment_count'] - $remaining_installments;
                
                // Get the interval between installments
                $interval_days = $plan['installment_interval_days'] ?? 30;
                
                // Calculate due date based on start date plus appropriate interval
                // This creates a fixed schedule based on start date
                $next_installment_due_date = date('Y-m-d', strtotime($start_date . ' + ' . ($interval_days * $installments_completed) . ' days'));
                
                // Calculate next installment amount - divide evenly among remaining installments
                $next_installment_amount = $new_total_due_amount / $remaining_installments;
            }
        }
    }
    
    // Clear payment_deadline_for_addition if fully paid or if this payment was for additional students
    $payment_deadline_for_addition = $plan['payment_deadline_for_addition'];
    $inactive_approved_student_count = $plan['inactive_approved_student_count'];
    
    if ($new_payment_status === 'fully_paid') {
        // Only clear these fields if fully paid
        $payment_deadline_for_addition = null;
        $inactive_approved_student_count = 0;
    } else if ($payment_deadline_for_addition) {
        // If there's still an amount due for additional students, maintain the existing deadline
        // Don't modify the payment_deadline_for_addition unless fully paid
        // This ensures the original 5-day window is maintained for the remainder
    }
    
    // Update plan with new values
    $update_stmt = $conn->prepare("UPDATE owner_plans 
                                  SET payment_done = ?,
                                      total_due_amount = ?,
                                      payment_status = ?,
                                      date_of_last_payment = ?,
                                      start_date = ?,
                                      expiry_date = ?,
                                      next_installment_due_date = ?,
                                      next_installment_amount = ?,
                                      payment_deadline_for_addition = ?,
                                      inactive_approved_student_count = ?
                                  WHERE plan_id = ?");
    
    $update_stmt->bind_param("ddsssssdiis", 
                            $new_payment_done,
                            $new_total_due_amount,
                            $new_payment_status,
                            $payment_date,
                            $start_date,
                            $expiry_date,
                            $next_installment_due_date,
                            $next_installment_amount,
                            $payment_deadline_for_addition,
                            $inactive_approved_student_count,
                            $plan_id);
    
    $update_stmt->execute();
    
    if ($update_stmt->affected_rows <= 0) {
        throw new Exception("Failed to update plan payment information");
    }
    
    // If this is the first payment and there are students waiting to be activated, activate them now
    if ($is_first_payment && $plan['payment_status'] === 'pending_payment') {
        // FIXED: Only activate students that are approved but not yet active
        // This ensures we don't change any manual activation decisions by the owner
        $activate_stmt = $conn->prepare("UPDATE users 
                                        SET is_active_by_owner = 1 
                                        WHERE subdomain_identifier = ? 
                                        AND is_approved_by_owner = 1
                                        AND is_active_by_owner = 0");
        $activate_stmt->bind_param("s", $plan['subdomain_identifier']);
        $activate_stmt->execute();
    }
    
    // Insert into payment history table (if you decide to add one)
    // This would record detailed payment history
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Payment recorded successfully',
        'payment_amount' => $payment_amount,
        'new_total_paid' => $new_payment_done,
        'remaining_due' => $new_total_due_amount,
        'payment_status' => $new_payment_status
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to record payment',
        'message' => $e->getMessage(),
        'mysql_error' => $conn->error
    ]);
}

// Close connection
$conn->close();
?> 