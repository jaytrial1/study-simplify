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

// Fetch all owners with their details
$stmt = $conn->prepare("SELECT o.owner_id, o.full_name, o.class_name, o.email, o.phone_number, 
                       o.subdomain_identifier, o.created_at
                       FROM owners o
                       ORDER BY o.created_at DESC");
$stmt->execute();
$result = $stmt->get_result();

if ($result) {
    $owners = [];
    while ($row = $result->fetch_assoc()) {
        $owners[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'owners' => $owners,
        'count' => count($owners)
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to retrieve owners',
        'mysql_error' => $conn->error
    ]);
}

$stmt->close();
$conn->close();
?> 