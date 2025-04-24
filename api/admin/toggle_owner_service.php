<?php
// Set JSON content type header
header("Content-Type: application/json");

// Include database configuration
require_once '../../config/database.php';

// Initialize response array
$response = [
    'status' => 'error',
    'error' => 'An unknown error occurred'
];

try {
    // Check for required parameters
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['subdomain']) || !isset($input['action'])) {
        throw new Exception("Missing required parameters: subdomain and action");
    }
    
    $subdomain = $input['subdomain'];
    $action = $input['action'];
    
    // Validate action
    if ($action !== 'stop' && $action !== 'resume') {
        throw new Exception("Invalid action. Must be 'stop' or 'resume'");
    }
    
    // Determine new status value
    $newStatus = ($action === 'stop') ? 0 : 1;
    
    // Get database connection
    $conn = getConnection();
    
    // Update user statuses for the specified subdomain
    $updateQuery = "UPDATE users SET is_active_by_admin = ? WHERE subdomain_identifier = ?";
    $stmt = $conn->prepare($updateQuery);
    $stmt->bind_param("is", $newStatus, $subdomain);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update user statuses: " . $stmt->error);
    }
    
    $affectedRows = $stmt->affected_rows;
    
    // Set success response
    $response['status'] = 'success';
    $response['message'] = ($action === 'stop' ? 'Service stopped' : 'Service resumed') . " for $affectedRows users";
    $response['affected_rows'] = $affectedRows;
    unset($response['error']);
    
} catch (Exception $e) {
    // Set error message
    $response['error'] = $e->getMessage();
} finally {
    // Close database connection if exists
    if (isset($conn) && $conn) {
        $conn->close();
    }
}

// Return JSON response
echo json_encode($response);
?> 