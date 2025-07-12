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

// Try getting token from query parameters as fallback
if (!$authHeader && isset($_GET['auth_token'])) {
    $authHeader = 'Bearer ' . $_GET['auth_token'];
}

// Skip auth check in testing mode
if (!isset($_GET['testing'])) {
    if (!$authHeader) {
        http_response_code(401);
        echo json_encode(['error' => 'Authorization token is required']);
        exit;
    }

    $token = trim(str_replace('Bearer ', '', $authHeader));
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid authorization token']);
        exit;
    }
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate required input
if (empty($data['plan_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Plan ID is required']);
    exit;
}

$plan_id = intval($data['plan_id']);

$conn = getConnection();

// Start transaction to ensure data consistency
$conn->begin_transaction();

try {
    // 1. Get the current plan details
    $stmt = $conn->prepare("SELECT * FROM owner_plans WHERE plan_id = ?");
    $stmt->bind_param("i", $plan_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        throw new Exception("Plan not found");
    }

    $current_plan = $result->fetch_assoc();
    $owner_id = $current_plan['owner_id'];
    
    // Get owner details for reference
    $owner_stmt = $conn->prepare("SELECT full_name, class_name, subdomain_identifier FROM owners WHERE owner_id = ?");
    $owner_stmt->bind_param("i", $owner_id);
    $owner_stmt->execute();
    $owner_result = $owner_stmt->get_result();
    $owner = $owner_result->fetch_assoc();
    
    // 2. Archive the current plan to the history table
    $archive_stmt = $conn->prepare("INSERT INTO owner_plan_history 
                               (owner_id, plan_type, price_per_student, students_at_expiry, 
                                start_date, end_date, total_amount_paid) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    $archive_stmt->bind_param(
        "isidssd", 
        $owner_id, 
        $current_plan['plan_type'], 
        $current_plan['price_per_student'], 
        $current_plan['current_total_students'], 
        $current_plan['start_date'], 
        $current_plan['expiry_date'], 
        $current_plan['payment_done']
    );
    
    $archive_stmt->execute();
    
    if ($archive_stmt->affected_rows <= 0) {
        throw new Exception("Failed to archive current plan to history");
    }
    
    // 3. Reset student approval and activation flags - using the most direct approach possible
    try {
        // Get the subdomain string directly from the database to ensure we have the exact value
        $subdomain_query = $conn->prepare("SELECT subdomain_identifier FROM owners WHERE owner_id = ?");
        $subdomain_query->bind_param("i", $owner_id);
        $subdomain_query->execute();
        $subdomain_result = $subdomain_query->get_result();
        $subdomain_row = $subdomain_result->fetch_assoc();
        $subdomain = $subdomain_row['subdomain_identifier'];
        
        // Try the simplest approach first - direct ID-based update
        $direct_update = true;
        
        // Get IDs first
        $select_sql = "SELECT id FROM users WHERE subdomain_identifier = ?";
        $select_stmt = $conn->prepare($select_sql);
        $select_stmt->bind_param("s", $subdomain);
        $select_stmt->execute();
        $select_result = $select_stmt->get_result();
        
        $user_ids = [];
        while ($row = $select_result->fetch_assoc()) {
            $user_ids[] = $row['id'];
        }
        
        if (empty($user_ids)) {
            $affected_rows = 0;
        } else {
            // Update ONLY approval status but preserve activation status
            $id_list = implode(',', $user_ids);
            $update_sql = "UPDATE users SET 
                is_approved_by_owner = 0, 
                Progress_status = 'demo', 
                trial_start_date = NOW(), 
                trial_expiry_date = NOW() + INTERVAL 7 DAY 
            WHERE id IN ($id_list)";
            $conn->query($update_sql);
            $affected_rows = $conn->affected_rows;
        }
    } catch (Exception $e) {
        // Log the error for debugging
        error_log("Error in renew_plan.php student reset: " . $e->getMessage());
        throw $e;
    }
    
    // 4. Delete the old plan (instead of just marking it expired)
    $delete_plan_stmt = $conn->prepare("DELETE FROM owner_plans WHERE plan_id = ?");
    $delete_plan_stmt->bind_param("i", $plan_id);
    $delete_plan_stmt->execute();
    
    if ($delete_plan_stmt->affected_rows <= 0) {
        throw new Exception("Failed to delete old plan");
    }
    
    // Commit the transaction
    $conn->commit();
    
    // Return success response with owner details for redirection
    echo json_encode([
        'status' => 'success',
        'message' => 'Plan archived and student access reset. Please create a new plan.',
        'owner_id' => $owner_id,
        'owner_name' => $owner['full_name'],
        'class_name' => $owner['class_name'],
        'plan_details' => [
            'previous_plan_type' => $current_plan['plan_type'],
            'previous_price_per_student' => $current_plan['price_per_student']
        ],
        'reset_student_count' => $affected_rows
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'mysql_error' => $conn->error
    ]);
}

$conn->close();
?> 