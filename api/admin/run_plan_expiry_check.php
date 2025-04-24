<?php
// Set JSON content type header
header("Content-Type: application/json");

// Initialize response array
$response = [
    'status' => 'error',
    'error' => 'An unknown error occurred',
    'output' => ''
];

try {
    // Capture output from the expiry check script
    ob_start();
    
    // Include the check plan expiry script
    include('../cron/check_plan_expiry.php');
    
    // Get the output
    $output = ob_get_clean();
    
    // Set success response
    $response['status'] = 'success';
    $response['output'] = $output;
    unset($response['error']);
    
} catch (Exception $e) {
    // Set error message
    $response['error'] = $e->getMessage();
    
    // Get any output that might have been generated before the error
    $response['output'] = ob_get_clean();
}

// Return JSON response
echo json_encode($response);
?> 