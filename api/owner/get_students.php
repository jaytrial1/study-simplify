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

// Try getting token from query parameter as fallback
if (!$authHeader && isset($_GET['auth_token'])) {
    $authHeader = 'Bearer ' . $_GET['auth_token'];
}

if (!$authHeader) {
    // Debug output
    $headers = getallheaders();
    $debug_info = [
        'error' => 'Authorization token is required',
        'debug' => [
            'headers_received' => $headers,
            'server_vars' => [
                'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
                'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
                'QUERY_STRING' => $_SERVER['QUERY_STRING'] ?? 'not set',
                'GET_PARAMS' => $_GET
            ]
        ]
    ];
    http_response_code(401);
    echo json_encode($debug_info);
    exit;
}

$token = trim(str_replace('Bearer ', '', $authHeader));
if (empty($token)) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Invalid authorization token',
        'received' => $authHeader
    ]);
    exit;
}

// In a production system, verify the token against stored tokens
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

// Get the owner_id from the request
if (!isset($_GET['owner_id']) || empty($_GET['owner_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Owner ID is required']);
    exit;
}

$owner_id = $_GET['owner_id'];

// First, get the subdomain identifier for this owner
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

// Get students associated with this subdomain
$stmt = $conn->prepare("SELECT id, name, email, grade_level, is_active_by_owner, is_approved_by_owner, created_at 
                        FROM users 
                        WHERE subdomain_identifier = ? 
                        ORDER BY created_at DESC");
$stmt->bind_param("s", $subdomain);
$stmt->execute();
$result = $stmt->get_result();

$students = [];
while ($row = $result->fetch_assoc()) {
    $students[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'grade' => $row['grade_level'],
        'active' => $row['is_active_by_owner'],
        'approved' => $row['is_approved_by_owner'],
        'joined_date' => $row['created_at']
    ];
}

// Count active and inactive students
$activeCount = 0;
$inactiveCount = 0;
foreach ($students as $student) {
    if ($student['active']) {
        $activeCount++;
    } else {
        $inactiveCount++;
    }
}

// Return the response
echo json_encode([
    'status' => 'success',
    'total_students' => count($students),
    'active_students' => $activeCount,
    'inactive_students' => $inactiveCount,
    'students' => $students
]);

$stmt->close();
$conn->close();
?> 