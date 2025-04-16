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
if (empty($data['owner_id']) || empty($data['plan_type']) || !isset($data['price_per_student'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$owner_id = intval($data['owner_id']);
$plan_type = $data['plan_type'];
$price_per_student = floatval($data['price_per_student']);
$installment_count = isset($data['installment_count']) ? intval($data['installment_count']) : 1;
$installment_interval_days = null;

if ($installment_count > 1 && isset($data['installment_interval_days'])) {
    $installment_interval_days = intval($data['installment_interval_days']);
}

// Validate plan type
$valid_plan_types = ['semester', 'full_year', 'custom'];
if (!in_array($plan_type, $valid_plan_types)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid plan type']);
    exit;
}

$conn = getConnection();

// First check if the owner exists
$check_owner = $conn->prepare("SELECT owner_id FROM owners WHERE owner_id = ?");
$check_owner->bind_param("i", $owner_id);
$check_owner->execute();
$owner_result = $check_owner->get_result();

if ($owner_result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Owner not found']);
    $check_owner->close();
    $conn->close();
    exit;
}

// Check if the owner already has an active plan
$check_plan = $conn->prepare("SELECT plan_id, payment_status FROM owner_plans WHERE owner_id = ?");
$check_plan->bind_param("i", $owner_id);
$check_plan->execute();
$plan_result = $check_plan->get_result();

// Only owners without plans or with expired plans can get new plans
// OR existing plans in pending_initialization status can be updated
$can_create_new_plan = true;
$existing_plan_id = null;
$should_update_plan = false;

if ($plan_result->num_rows > 0) {
    $plan_row = $plan_result->fetch_assoc();
    $existing_plan_id = $plan_row['plan_id'];
    
    if ($plan_row['payment_status'] === 'pending_initialization') {
        $should_update_plan = true;
        $can_create_new_plan = false;
    } else if ($plan_row['payment_status'] !== 'expired') {
        $can_create_new_plan = false;
    }
}

if (!$can_create_new_plan && !$should_update_plan) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Owner already has an active plan',
        'plan_id' => $existing_plan_id
    ]);
    $check_plan->close();
    $check_owner->close();
    $conn->close();
    exit;
}

// Start transaction
$conn->begin_transaction();

try {
    if ($should_update_plan) {
        // Update existing plan that's in pending_initialization status
        $stmt = $conn->prepare("UPDATE owner_plans 
                              SET plan_type = ?, price_per_student = ?, 
                                  installment_count = ?, installment_interval_days = ?
                              WHERE plan_id = ?");
        
        $stmt->bind_param("sdisi", $plan_type, $price_per_student, $installment_count, 
                         $installment_interval_days, $existing_plan_id);
        
        $stmt->execute();
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Failed to update plan record");
        }
        
        $plan_id = $existing_plan_id;
        $message = 'Plan updated successfully';
    } else {
        // Create new plan with pending_initialization status
        $stmt = $conn->prepare("INSERT INTO owner_plans 
                            (owner_id, plan_type, price_per_student, installment_count, 
                            installment_interval_days, payment_status)
                            VALUES (?, ?, ?, ?, ?, 'pending_initialization')");
        
        $stmt->bind_param("isdis", $owner_id, $plan_type, $price_per_student, $installment_count, $installment_interval_days);
        
        $stmt->execute();
        
        if ($stmt->affected_rows <= 0) {
            throw new Exception("Failed to create plan record");
        }
        
        $plan_id = $stmt->insert_id;
        $message = 'Plan created successfully';
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'plan_id' => $plan_id
    ]);
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to create plan',
        'message' => $e->getMessage(),
        'mysql_error' => $conn->error
    ]);
}

// Close all statements and connection
if (isset($stmt)) $stmt->close();
$check_plan->close();
$check_owner->close();
$conn->close();
?> 