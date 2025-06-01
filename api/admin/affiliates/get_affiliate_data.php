<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for your domain in production
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request (pre-flight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

ini_set('display_errors', 0); // Suppress errors from output in production
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../admin_api_errors.log'); // Log errors to a file

// TODO: Implement robust admin authentication/authorization here
// For now, this is a placeholder. In a real app, verify admin session/token.
/*
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403); // Forbidden
    echo json_encode(['status' => 'error', 'message' => 'Access denied. Admin privileges required.']);
    exit;
}
*/

require_once __DIR__ . '/../../../config/database.php'; // Path to your database config

$conn = getConnection();

if (!$conn) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    error_log("get_affiliate_data.php: Database connection failed.");
    exit;
}

$data = [];

try {
    $stmt = $conn->prepare("SELECT id, affiliate_email, affiliate_user_id, commission_amount, principal_amount, buyer_email, buyer_user_id, razorpay_payment_id, payment_status, commission_paid_status, commission_paid_at, created_at, affiliate_upi_id, buyer_subdomain_identifier FROM affiliate ORDER BY created_at DESC");
    
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    
    $stmt->close();
    $conn->close();
    
    echo json_encode($data); // Output data as JSON

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred while fetching affiliate data: ' . $e->getMessage()]);
    error_log("get_affiliate_data.php: Error - " . $e->getMessage());
    if ($conn && $conn->ping()) { // Check if connection is still alive
        $conn->close();
    }
}

?> 