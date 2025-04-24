<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../../config/database.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify it's a GET request
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get subdomain from query parameter
if (!isset($_GET['subdomain'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing subdomain parameter']);
    exit;
}

$subdomain = $_GET['subdomain'];

try {
    $conn = getConnection();
    
    // Check if any users from this subdomain have is_active_by_admin=0
    $stmt = $conn->prepare("SELECT 
                            CASE WHEN COUNT(*) > 0 AND SUM(is_active_by_admin) = 0 
                            THEN 'suspended' ELSE 'active' END as service_status
                           FROM users 
                           WHERE subdomain_identifier = ?");
    
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    
    $stmt->bind_param("s", $subdomain);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'is_suspended' => false,
            'service_status' => 'active',
            'message' => 'No users found for this subdomain'
        ]);
        exit;
    }
    
    $row = $result->fetch_assoc();
    $is_suspended = ($row['service_status'] === 'suspended');
    
    echo json_encode([
        'is_suspended' => $is_suspended,
        'service_status' => $row['service_status'],
        'message' => $is_suspended ? 
            'Your service has been suspended by the administrator due to overdue payment.' : 
            'Your service is active.'
    ]);
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    error_log("Error in check_admin_suspension.php: " . $e->getMessage());
    exit;
} 