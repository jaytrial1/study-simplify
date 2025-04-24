<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../../config/database.php';

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

if (!isset($requestData['user_id']) || !isset($requestData['tuition_class'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $conn = getConnection();
    
    // Debug output - output the input parameters
    error_log("Checking status for user_id: " . $requestData['user_id'] . ", tuition_class: " . $requestData['tuition_class']);
    
    // Query to check if user is approved and active in the tuition class, including admin restriction check
    $stmt = $conn->prepare("SELECT id, is_approved_by_owner, is_active_by_owner, is_active_by_admin 
                           FROM users 
                           WHERE id = ? AND subdomain_identifier = ?");
    
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    
    $stmt->bind_param("is", $requestData['user_id'], $requestData['tuition_class']);
    $stmt->execute();
    $result = $stmt->get_result();
    
    // Debug - output the query results
    error_log("Query results row count: " . $result->num_rows);
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'success' => false, 
            'error' => 'User not found in the specified tuition class',
            'debug_info' => [
                'user_id' => $requestData['user_id'],
                'tuition_class' => $requestData['tuition_class']
            ]
        ]);
        exit;
    }
    
    $user = $result->fetch_assoc();
    
    // Debug - output the retrieved data
    error_log("User data: " . json_encode($user));
    
    // Don't convert to boolean, send raw values from database
    echo json_encode([
        'success' => true,
        'is_approved_by_owner' => $user['is_approved_by_owner'],
        'is_active_by_owner' => $user['is_active_by_owner'],
        'is_active_by_admin' => $user['is_active_by_admin'],
        'user_id' => $user['id']
    ]);
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    error_log("Error in check_status.php: " . $e->getMessage());
    exit;
} 