<?php
// Turn off PHP error output that might interfere with JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

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
if (empty($data['plan_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Plan ID is required']);
    exit;
}

$plan_id = intval($data['plan_id']);
$conn = getConnection();

// Start transaction
$conn->begin_transaction();

try {
    // Get plan details
    $plan_stmt = $conn->prepare("SELECT op.owner_id, op.payment_status, op.price_per_student, op.installment_count, op.installment_interval_days, o.subdomain_identifier 
                                 FROM owner_plans op
                                 INNER JOIN owners o ON op.owner_id = o.owner_id
                                 WHERE op.plan_id = ?");
    $plan_stmt->bind_param("i", $plan_id);
    $plan_stmt->execute();
    $plan_result = $plan_stmt->get_result();
    
    if ($plan_result->num_rows === 0) {
        throw new Exception("Plan not found");
    }
    
    $plan = $plan_result->fetch_assoc();
    
    // Check if plan is in pending_initialization status
    if ($plan['payment_status'] !== 'pending_initialization') {
        throw new Exception("Plan is not in pending initialization status");
    }
    
    $owner_id = $plan['owner_id'];
    $subdomain = $plan['subdomain_identifier'];
    $price_per_student = $plan['price_per_student'];
    
    // Count all approved students (both active and inactive)
    $student_stmt = $conn->prepare("SELECT 
                                   COUNT(*) as approved_count,
                                   SUM(CASE WHEN is_active_by_owner = 1 THEN 1 ELSE 0 END) as active_count,
                                   SUM(CASE WHEN is_active_by_owner = 0 THEN 1 ELSE 0 END) as inactive_count
                                   FROM users 
                                   WHERE subdomain_identifier = ? AND payment_type = 'cash'");
    $student_stmt->bind_param("s", $subdomain);
    $student_stmt->execute();
    $student_result = $student_stmt->get_result();
    $student_counts = $student_result->fetch_assoc();
    
    $total_student_count = $student_counts['approved_count'];
    $active_student_count = $student_counts['active_count'];
    $inactive_student_count = $student_counts['inactive_count'];
    
    // Calculate total amount based on price_per_student and total approved student count
    $total_amount = $price_per_student * $total_student_count;
    
    // Don't calculate installment details yet - first payment is advance payment
    // Next installment details will be set after first payment is made
    
    // Update plan to pending_payment status
    $update_stmt = $conn->prepare("UPDATE owner_plans 
                                  SET payment_status = 'pending_payment',
                                      initial_student_count = ?,
                                      current_total_students = ?,
                                      active_student_count = ?,
                                      inactive_approved_student_count = ?,
                                      total_amount = ?,
                                      total_due_amount = ?,
                                      next_installment_amount = NULL,
                                      next_installment_due_date = NULL
                                  WHERE plan_id = ?");
    
    $update_stmt->bind_param("iiiiddi", 
                           $total_student_count, 
                           $total_student_count, 
                           $active_student_count,
                           $inactive_student_count,
                           $total_amount, 
                           $total_amount,
                           $plan_id);
    
    $update_result = $update_stmt->execute();
    
    if (!$update_result) {
        throw new Exception("SQL Error: " . $conn->error);
    }
    
    if ($update_stmt->affected_rows <= 0) {
        throw new Exception("Failed to update plan status");
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Initial roster finalized successfully',
        'student_count' => $total_student_count,
        'total_amount' => $total_amount
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to finalize roster',
        'message' => $e->getMessage(),
        'mysql_error' => $conn->error
    ]);
}

// Close connection
$conn->close();
?> 