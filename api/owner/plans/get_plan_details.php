<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../../../config/database.php';

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

// Validate owner_id parameter
if (empty($_GET['owner_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Owner ID is required']);
    exit;
}

$owner_id = intval($_GET['owner_id']);

$conn = getConnection();

// Skip token verification in testing mode
if (!isset($_GET['testing'])) {
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
}

// Fetch the owner's plan details
$stmt = $conn->prepare("SELECT op.*, o.full_name, o.class_name, o.subdomain_identifier
                        FROM owner_plans op
                        INNER JOIN owners o ON op.owner_id = o.owner_id
                        WHERE op.owner_id = ?
                        ORDER BY op.created_at DESC
                        LIMIT 1");
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // No plan found for this owner
    echo json_encode([
        'status' => 'success',
        'plan' => null,
        'message' => 'No plan found for this owner'
    ]);
} else {
    $plan = $result->fetch_assoc();
    
    // Get real-time student counts from the users table
    $counts_stmt = $conn->prepare("SELECT 
                                COUNT(*) as total_students,
                                SUM(CASE WHEN is_active_by_owner = 1 THEN 1 ELSE 0 END) as active_count,
                                SUM(CASE WHEN is_active_by_owner = 0 AND is_approved_by_owner = 1 THEN 1 ELSE 0 END) as inactive_approved_count
                            FROM users 
                            WHERE subdomain_identifier = ?");
    $counts_stmt->bind_param("s", $plan['subdomain_identifier']);
    $counts_stmt->execute();
    $counts_result = $counts_stmt->get_result();
    $counts = $counts_result->fetch_assoc();
    
    // Override the stored values with real-time counts
    $plan['actual_total_students'] = (int)$counts['total_students'];
    $plan['actual_active_students'] = (int)$counts['active_count'];
    $plan['actual_inactive_approved_students'] = (int)$counts['inactive_approved_count'];
    
    // Format numeric values
    $plan['total_amount'] = floatval($plan['total_amount']);
    $plan['payment_done'] = floatval($plan['payment_done']);
    $plan['total_due_amount'] = floatval($plan['total_due_amount']);
    $plan['price_per_student'] = floatval($plan['price_per_student']);
    
    if (isset($plan['next_installment_amount'])) {
        $plan['next_installment_amount'] = floatval($plan['next_installment_amount']);
    }
    
    // Format dates for JSON
    if ($plan['start_date']) {
        $plan['start_date'] = date('Y-m-d', strtotime($plan['start_date']));
    }
    if ($plan['expiry_date']) {
        $plan['expiry_date'] = date('Y-m-d', strtotime($plan['expiry_date']));
    }
    if ($plan['date_of_last_payment']) {
        $plan['date_of_last_payment'] = date('Y-m-d', strtotime($plan['date_of_last_payment']));
    }
    if ($plan['next_installment_due_date']) {
        $plan['next_installment_due_date'] = date('Y-m-d', strtotime($plan['next_installment_due_date']));
    }
    if ($plan['payment_deadline_for_addition']) {
        $plan['payment_deadline_for_addition'] = date('Y-m-d', strtotime($plan['payment_deadline_for_addition']));
    }
    
    echo json_encode([
        'status' => 'success',
        'plan' => $plan
    ]);
}

$stmt->close();
$conn->close();
?> 