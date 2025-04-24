<?php
// Set JSON content type header
header("Content-Type: application/json");

// Include database configuration
require_once '../../config/database.php';

// Initialize response array
$response = [
    'status' => 'error',
    'error' => 'An unknown error occurred',
    'plans' => []
];

try {
    // Get database connection
    $conn = getConnection();
    
    // Get only plans with payment_status = 'expired'
    $query = "SELECT p.plan_id, o.full_name, p.payment_status, p.expiry_date
                FROM owner_plans p
                JOIN owners o ON p.owner_id = o.owner_id
                WHERE p.payment_status = 'expired'
                ORDER BY p.expiry_date";
    
    $result = $conn->query($query);
    
    // Check if query was successful
    if ($result === false) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Fetch all plans
    $plans = [];
    while ($row = $result->fetch_assoc()) {
        $plans[] = $row;
    }
    
    // Set success response
    $response['status'] = 'success';
    $response['plans'] = $plans;
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