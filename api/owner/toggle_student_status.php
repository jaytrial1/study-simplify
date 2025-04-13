<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

// Simple token-based authentication check
$authHeader = null;

// Try multiple ways to get the Authorization header
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    if (isset($requestHeaders['Authorization'])) {
        $authHeader = $requestHeaders['Authorization'];
    }
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Try getting token from data as fallback
if (!$authHeader && isset($data['auth_token'])) {
    $authHeader = 'Bearer ' . $data['auth_token'];
}

if (!$authHeader) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Authorization token is required',
        'debug' => [
            'has_post_data' => !empty($data),
            'post_data_keys' => $data ? array_keys($data) : []
        ]
    ]);
    exit;
}

$token = trim(str_replace('Bearer ', '', $authHeader));
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid authorization token']);
    exit;
}

$conn = getConnection();

// Verify token is valid in the database
$token_check = $conn->prepare("SELECT owner_id FROM owner_tokens WHERE token = ? AND expires_at > NOW()");
$token_check->bind_param("s", $token);
$token_check->execute();
$token_result = $token_check->get_result();

if ($token_result->num_rows === 0) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Invalid or expired token',
        'token_prefix' => substr($token, 0, 5) . '...'
    ]);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
if (empty($data['owner_id']) || empty($data['student_id']) || !isset($data['activate'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Required parameters missing']);
    exit;
}

$owner_id = $data['owner_id'];
$student_id = $data['student_id'];
$activate = (bool)$data['activate'];

$conn = getConnection();

// Step 1: Verify the owner
$stmt = $conn->prepare("SELECT subdomain_identifier FROM owners WHERE owner_id = ?");
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Owner not found']);
    exit;
}

$owner = $result->fetch_assoc();
$subdomain = $owner['subdomain_identifier'];

// Step 2: Verify the student belongs to this owner's class
$stmt = $conn->prepare("SELECT id, name, subdomain_identifier, is_active_by_owner 
                         FROM users 
                         WHERE id = ?");
$stmt->bind_param("i", $student_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Student not found']);
    exit;
}

$student = $result->fetch_assoc();

// Verify student belongs to this subdomain
if ($student['subdomain_identifier'] !== $subdomain) {
    http_response_code(403);
    echo json_encode(['error' => 'Student is not part of this class']);
    exit;
}

// Step 3: Update the student's status
$stmt = $conn->prepare("UPDATE users SET is_active_by_owner = ? WHERE id = ?");
$activateVal = $activate ? 1 : 0;
$stmt->bind_param("ii", $activateVal, $student_id);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    // Step 4: Update the owner_plans counts if needed
    // For feature 2, we'll just update the active_student_count
    if ($activate) {
        // Increment active_student_count for this owner
        $planStmt = $conn->prepare("UPDATE owner_plans 
                                    SET active_student_count = active_student_count + 1 
                                    WHERE owner_id = ?");
        $planStmt->bind_param("i", $owner_id);
        $planStmt->execute();
    } else {
        // Decrement active_student_count for this owner
        $planStmt = $conn->prepare("UPDATE owner_plans 
                                    SET active_student_count = GREATEST(0, active_student_count - 1) 
                                    WHERE owner_id = ?");
        $planStmt->bind_param("i", $owner_id);
        $planStmt->execute();
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Student status updated successfully',
        'student_id' => $student_id,
        'is_active' => $activate
    ]);
} else {
    echo json_encode([
        'status' => 'info',
        'message' => 'No changes made',
        'student_id' => $student_id,
        'is_active' => (bool)$student['is_active_by_owner']
    ]);
}

$stmt->close();
$conn->close();
?> 