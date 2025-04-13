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

// Check owner credentials
$stmt = $conn->prepare("SELECT owner_id, full_name, class_name, password, subdomain_identifier FROM owners WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$result = $stmt->get_result();
$owner = $result->fetch_assoc();

if (!$owner || !password_verify($data['password'], $owner['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit;
}

// Generate a token (in production, use a proper JWT library)
$token = bin2hex(random_bytes(32));

// Store token in owner_tokens table (create this table if it doesn't exist)
$conn->query("CREATE TABLE IF NOT EXISTS owner_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE
)");

// Delete any existing tokens for this owner
$token_cleanup = $conn->prepare("DELETE FROM owner_tokens WHERE owner_id = ?");
$token_cleanup->bind_param("i", $owner['owner_id']);
$token_cleanup->execute();

// Add the new token
$token_insert = $conn->prepare("INSERT INTO owner_tokens (owner_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))");
$token_insert->bind_param("is", $owner['owner_id'], $token);
$token_insert->execute();

// Get owner's plan information
$plan_stmt = $conn->prepare("SELECT plan_id, plan_type, payment_status FROM owner_plans WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1");
$plan_stmt->bind_param("i", $owner['owner_id']);
$plan_stmt->execute();
$plan_result = $plan_stmt->get_result();
$plan = $plan_result->fetch_assoc();

// Return success response
echo json_encode([
    'message' => 'Login successful',
    'token' => $token,
    'owner_id' => $owner['owner_id'],
    'full_name' => $owner['full_name'],
    'class_name' => $owner['class_name'],
    'subdomain_identifier' => $owner['subdomain_identifier'],
    'plan_id' => $plan ? $plan['plan_id'] : null,
    'plan_type' => $plan ? $plan['plan_type'] : null,
    'plan_status' => $plan ? $plan['payment_status'] : null
]);

$stmt->close();
$plan_stmt->close();
$conn->close();
?> 