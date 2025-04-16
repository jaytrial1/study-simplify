<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
require_once '../../config/database.php';

// For development/testing, we'll bypass the formal authentication
// In production, use proper authentication with tokens
$adminToken = isset($_SERVER['HTTP_AUTHORIZATION']) ? str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']) : '';

// Simple check if token starts with 'admin_token_'
if (strpos($adminToken, 'admin_token_') !== 0 && !isset($_GET['testing'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized access']);
    exit;
}

$conn = getConnection();

// Handle status filter
$status_filter = isset($_GET['status']) ? $_GET['status'] : '';
$status_condition = '';
$params = [];
$types = '';

if (!empty($status_filter)) {
    $status_condition = " WHERE op.payment_status = ? ";
    $params[] = $status_filter;
    $types .= 's';
}

// Fetch all plans with owner details
$query = "SELECT op.*, o.full_name as owner_name, o.subdomain_identifier
          FROM owner_plans op
          INNER JOIN owners o ON op.owner_id = o.owner_id
          $status_condition
          ORDER BY op.updated_at DESC";

$stmt = $conn->prepare($query);

if (!empty($types)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

if ($result) {
    $plans = [];
    while ($row = $result->fetch_assoc()) {
        // Format numeric values as necessary
        $row['total_amount'] = floatval($row['total_amount']);
        $row['payment_done'] = floatval($row['payment_done']);
        $row['total_due_amount'] = floatval($row['total_due_amount']);
        $row['price_per_student'] = floatval($row['price_per_student']);
        
        // Format dates for JSON
        if ($row['start_date']) {
            $row['start_date'] = date('Y-m-d', strtotime($row['start_date']));
        }
        if ($row['expiry_date']) {
            $row['expiry_date'] = date('Y-m-d', strtotime($row['expiry_date']));
        }
        if ($row['date_of_last_payment']) {
            $row['date_of_last_payment'] = date('Y-m-d', strtotime($row['date_of_last_payment']));
        }
        if ($row['next_installment_due_date']) {
            $row['next_installment_due_date'] = date('Y-m-d', strtotime($row['next_installment_due_date']));
        }
        if ($row['payment_deadline_for_addition']) {
            $row['payment_deadline_for_addition'] = date('Y-m-d', strtotime($row['payment_deadline_for_addition']));
        }
        
        $plans[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'plans' => $plans,
        'count' => count($plans)
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to retrieve plans',
        'mysql_error' => $conn->error
    ]);
}

$stmt->close();
$conn->close();
?> 