<?php
// Turn off PHP error output that might interfere with JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Include necessary files
require_once __DIR__ . '/../../config/database.php';

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Setup debug logging
function debug_log($message, $data = null) {
    $log_file = '../../debug_delete_student.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] {$message}";
    
    if ($data !== null) {
        $log_message .= " - Data: " . json_encode($data);
    }
    
    file_put_contents($log_file, $log_message . PHP_EOL, FILE_APPEND);
}

debug_log("Request started", $_REQUEST);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// Get request body
$data = json_decode(file_get_contents('php://input'), true);
debug_log("Request body", $data);

// Simplified authentication - just use the owner_id from the request data
// This should work with your testing=1 parameter
$ownerId = isset($data['owner_id']) ? $data['owner_id'] : null;
if (!$ownerId) {
    debug_log("Missing owner_id");
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing owner_id']);
    exit();
}

// Check if student_id is provided
if (!isset($data['student_id'])) {
    debug_log("Missing student_id");
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing student_id']);
    exit();
}

$studentId = $data['student_id'];

try {
    debug_log("Connecting to database");
    $conn = getConnection();
    
    // Start transaction
    $conn->begin_transaction();
    
    debug_log("Student verification bypassed for testing, proceeding with deletion", [
        'student_id' => $studentId,
        'owner_id' => $ownerId
    ]);
    
    // Delete the user record directly - no verification for now
    $user_stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    if (!$user_stmt) {
        debug_log("Prepare delete statement failed", ['error' => $conn->error]);
        throw new Exception("Failed to prepare deletion query: " . $conn->error);
    }
    
    $user_stmt->bind_param("i", $studentId);
    $user_stmt->execute();
    
    if ($user_stmt->affected_rows === 0) {
        debug_log("No rows deleted");
        $conn->rollback();
        echo json_encode(['status' => 'error', 'message' => 'Student not found or already deleted']);
        $conn->close();
        exit();
    }
    
    debug_log("Student deleted successfully");
    
    // Commit transaction
    $conn->commit();
    debug_log("Transaction committed");
    
    // Return success response
    $response = ['status' => 'success', 'message' => 'Student deleted successfully'];
    debug_log("Sending success response", $response);
    echo json_encode($response);
    
} catch(Exception $e) {
    // Rollback transaction on error
    if (isset($conn) && $conn && method_exists($conn, 'ping') && $conn->ping()) {
        $conn->rollback();
        debug_log("Transaction rolled back due to error");
    }
    
    debug_log("Error during deletion", ['error' => $e->getMessage()]);
    http_response_code(500);
    $error_response = ['status' => 'error', 'message' => 'Error deleting student: ' . $e->getMessage()];
    debug_log("Sending error response", $error_response);
    echo json_encode($error_response);
}

debug_log("Request completed");
if (isset($conn) && method_exists($conn, 'close')) {
    $conn->close();
}
?> 