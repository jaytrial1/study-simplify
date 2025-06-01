<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for your domain in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request (pre-flight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

ini_set('display_errors', 0); // Suppress errors from output
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../admin_api_errors.log'); // Log errors to a file

// TODO: Implement robust admin authentication/authorization here
/*
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403); // Forbidden
    echo json_encode(['status' => 'error', 'message' => 'Access denied. Admin privileges required.']);
    exit;
}
*/

require_once __DIR__ . '/../../../config/database.php'; // Path to your database config

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'Only POST method is allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['affiliate_record_id']) || !is_numeric($input['affiliate_record_id'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Invalid or missing affiliate_record_id.']);
    exit;
}

$affiliateRecordId = (int)$input['affiliate_record_id'];
$conn = getConnection();

if (!$conn) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    error_log("update_commission_status.php: Database connection failed.");
    exit;
}

try {
    $conn->begin_transaction();

    $stmt = $conn->prepare("UPDATE affiliate SET commission_paid_status = 'paid', commission_paid_at = NOW() WHERE id = ? AND commission_paid_status = 'pending'");
    if (!$stmt) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("i", $affiliateRecordId);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to execute statement: " . $stmt->error);
    }
    
    $affectedRows = $stmt->affected_rows;
    $stmt->close();

    if ($affectedRows > 0) {
        $conn->commit();
        echo json_encode(['status' => 'success', 'message' => 'Commission status updated to paid.']);
    } else {
        // This could happen if the record was already paid, or ID not found, or status was not pending
        $conn->rollback();
        // Check if the record exists and was already paid
        $checkStmt = $conn->prepare("SELECT commission_paid_status FROM affiliate WHERE id = ?");
        $checkStmt->bind_param("i", $affiliateRecordId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $existingStatus = null;
        if($row = $result->fetch_assoc()){
            $existingStatus = $row['commission_paid_status'];
        }
        $checkStmt->close();

        if($existingStatus === 'paid'){
             echo json_encode(['status' => 'info', 'message' => 'Commission was already marked as paid.']);
        } else if ($existingStatus === null){
            http_response_code(404); // Not Found
            echo json_encode(['status' => 'error', 'message' => 'Affiliate record not found.']);
        } else {
             http_response_code(400); // Bad Request
            echo json_encode(['status' => 'error', 'message' => 'Commission status could not be updated. Record might not be in pending state or ID is incorrect.']);
        }
    }
    
    $conn->close();

} catch (Exception $e) {
    if ($conn && $conn->get_transaction_status()) { // Check if transaction is active
         $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred: ' . $e->getMessage()]);
    error_log("update_commission_status.php: Error - " . $e->getMessage() . " for ID: " . $affiliateRecordId);
    if ($conn && $conn->ping()) {
        $conn->close();
    }
}

?> 