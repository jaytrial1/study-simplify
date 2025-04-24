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
    
    // Get plans where next installment due date or payment deadline for addition is in the past
    $query = "SELECT p.plan_id, p.owner_id, o.full_name, o.subdomain_identifier, p.payment_status, 
                     p.next_installment_due_date, p.payment_deadline_for_addition, p.next_installment_amount,
                     p.total_due_amount
              FROM owner_plans p
              JOIN owners o ON p.owner_id = o.owner_id
              WHERE (
                  (p.next_installment_due_date IS NOT NULL AND p.next_installment_due_date < CURDATE())
                  OR
                  (p.payment_deadline_for_addition IS NOT NULL AND p.payment_deadline_for_addition < CURDATE())
              )
              AND p.payment_status NOT IN ('fully_paid', 'expired')
              ORDER BY p.plan_id";
    
    $result = $conn->query($query);
    
    // Check if query was successful
    if ($result === false) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Fetch all plans
    $plans = [];
    while ($row = $result->fetch_assoc()) {
        // Get service status for this owner
        $subdomainIdentifier = $row['subdomain_identifier'];
        
        $serviceStatusQuery = "SELECT 
                                CASE WHEN COUNT(*) > 0 AND SUM(is_active_by_admin) = 0 
                                THEN 'stopped' ELSE 'active' END as service_status
                               FROM users 
                               WHERE subdomain_identifier = ?";
        
        $stmt = $conn->prepare($serviceStatusQuery);
        $stmt->bind_param("s", $subdomainIdentifier);
        $stmt->execute();
        $serviceResult = $stmt->get_result()->fetch_assoc();
        
        $row['service_status'] = $serviceResult['service_status'];
        
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