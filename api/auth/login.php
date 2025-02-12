<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/validation.php';

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit;
}

if (!validateEmail($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

// Check user credentials
$stmt = $conn->prepare("SELECT id, password, name, grade_level FROM users WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($data['password'], $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit;
}

// Generate a simple token (in production, use a proper JWT library)
$token = bin2hex(random_bytes(32));

// Return success response
echo json_encode([
    'message' => 'Login successful',
    'token' => $token,
    'user_id' => $user['id'],
    'name' => $user['name'],
    'grade' => $user['grade_level']
]);

$stmt->close();
$conn->close();
