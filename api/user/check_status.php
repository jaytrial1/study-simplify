<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../../config/database.php';

// Enhanced error logging for debugging
error_log("check_status.php accessed from: " . $_SERVER['HTTP_HOST']);
error_log("check_status.php request URI: " . $_SERVER['REQUEST_URI']);
error_log("check_status.php referrer: " . ($_SERVER['HTTP_REFERER'] ?? 'not set'));

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get request data
$requestData = json_decode(file_get_contents("php://input"), true);

// Log raw request data for debugging
error_log("Raw request data: " . file_get_contents("php://input"));

if (!isset($requestData['user_id']) || !isset($requestData['tuition_class'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    // Log before attempting database connection
    error_log("Attempting database connection");
    
    // Try to get database connection - wrap in try/catch to catch connection errors
    try {
        $conn = getConnection();
        error_log("Database connection successful");
    } catch (Exception $dbError) {
        error_log("Database connection error: " . $dbError->getMessage());
        throw new Exception("Database connection failed: " . $dbError->getMessage());
    }
    
    // Debug output - output the input parameters
    error_log("Checking status for user_id: " . $requestData['user_id'] . ", tuition_class: " . $requestData['tuition_class']);
    
    // Normalize the tuition class - in case it comes from subdomain
    $tuitionClass = strtolower(trim($requestData['tuition_class']));
    
    // Query to check if user is approved and active in the tuition class, including admin restriction check
    $stmt = $conn->prepare("SELECT id, is_approved_by_owner, is_active_by_owner, is_active_by_admin 
                           FROM users 
                           WHERE id = ? AND LOWER(subdomain_identifier) = ?");
    
    if (!$stmt) {
        error_log("Database prepare error: " . $conn->error);
        throw new Exception("Database error: " . $conn->error);
    }
    
    $stmt->bind_param("is", $requestData['user_id'], $tuitionClass);
    
    // Log query before execution
    error_log("Executing query for user_id=" . $requestData['user_id'] . " and subdomain=" . $tuitionClass);
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Debug - output the query results
    error_log("Query results row count: " . $result->num_rows);
    
    if ($result->num_rows === 0) {
        // Try a fallback query to see if the issue is case sensitivity or trailing spaces
        $fallbackStmt = $conn->prepare("SELECT id, subdomain_identifier FROM users WHERE id = ?");
        $fallbackStmt->bind_param("i", $requestData['user_id']);
        $fallbackStmt->execute();
        $fallbackResult = $fallbackStmt->get_result();
        
        if ($fallbackResult->num_rows > 0) {
            // User exists but subdomain doesn't match
            $userData = $fallbackResult->fetch_assoc();
            error_log("User found with subdomain: " . $userData['subdomain_identifier'] . " but requested: " . $tuitionClass);
        }
        
        http_response_code(404);
        echo json_encode([
            'success' => false, 
            'error' => 'User not found in the specified tuition class',
            'debug_info' => [
                'user_id' => $requestData['user_id'],
                'tuition_class' => $tuitionClass,
                'expected_case_sensitive' => false
            ]
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    
    // Debug - output the retrieved data
    error_log("User data: " . json_encode($user));
    
    // Cast values to integers for consistency
    $isApprovedByOwner = (int)$user['is_approved_by_owner'];
    $isActiveByOwner = (int)$user['is_active_by_owner'];
    $isActiveByAdmin = (int)$user['is_active_by_admin'];
    
    // Don't convert to boolean, send raw values from database
    $response = [
        'success' => true,
        'is_approved_by_owner' => $isApprovedByOwner,
        'is_active_by_owner' => $isActiveByOwner,
        'is_active_by_admin' => $isActiveByAdmin,
        'user_id' => $user['id']
    ];
    
    // Log the response before sending
    error_log("Sending response: " . json_encode($response));
    
    echo json_encode($response);
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    error_log("Critical error in check_status.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error: ' . $e->getMessage(),
        'debug_info' => [
            'time' => date('Y-m-d H:i:s'),
            'host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
        ]
    ]);
    exit;
} 