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
$stmt = $conn->prepare("SELECT id, password, name, grade_level, subdomain_identifier FROM users WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($data['password'], $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit;
}

// Check if user is allowed to access from this subdomain
$host = $_SERVER['HTTP_HOST'];
$parts = explode('.', $host);
$current_subdomain = null;

// Determine current subdomain
if (count($parts) >= 2) {
    if ($parts[1] === 'localhost' || strpos($host, 'studysimplify.in') !== false) {
        $current_subdomain = strtolower(str_replace(' ', '', $parts[0]));
    }
}

// If user has a tuition_class, they must access from that subdomain
if ($user['subdomain_identifier'] !== null) {
    if ($user['subdomain_identifier'] !== $current_subdomain) {
        http_response_code(403);
        echo json_encode(['error' => 'Access restricted. Please log in from your assigned class portal.']);
        exit;
    }
}
// If user has no tuition_class (main domain user), they can only access from main domain
else if ($current_subdomain !== null) {
    http_response_code(403);
    echo json_encode(['error' => 'This account can only be accessed from the main website.']);
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
    'grade' => $user['grade_level'],
    'tuition_class' => $user['subdomain_identifier']
]);

$stmt->close();
$conn->close();
