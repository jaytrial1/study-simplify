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

// Fetch the owner's plan history
$stmt = $conn->prepare("SELECT * FROM owner_plan_history 
                        WHERE owner_id = ? 
                        ORDER BY archived_at DESC");
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // No plan history found for this owner
    echo json_encode([
        'status' => 'success',
        'plans' => [],
        'message' => 'No plan history found for this owner'
    ]);
} else {
    $plans = [];
    
    while ($plan = $result->fetch_assoc()) {
        // Format numeric values
        $plan['price_per_student'] = floatval($plan['price_per_student']);
        $plan['total_amount_paid'] = floatval($plan['total_amount_paid']);
        $plan['students_at_expiry'] = intval($plan['students_at_expiry']);
        
        // Format dates for JSON
        if ($plan['start_date']) {
            $plan['start_date'] = date('Y-m-d', strtotime($plan['start_date']));
        }
        if ($plan['end_date']) {
            $plan['end_date'] = date('Y-m-d', strtotime($plan['end_date']));
        }
        if ($plan['archived_at']) {
            $plan['archived_at'] = date('Y-m-d H:i:s', strtotime($plan['archived_at']));
        }
        
        // Add a status field for display purposes
        $plan['status'] = 'expired'; // All history plans are expired by definition
        
        $plans[] = $plan;
    }
    
    echo json_encode([
        'status' => 'success',
        'plans' => $plans
    ]);
}

$stmt->close();
$conn->close();
?> 