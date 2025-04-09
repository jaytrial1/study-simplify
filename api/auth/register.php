<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/validation.php';

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
$required = ['name', 'email', 'password', 'confirm_password', 'grade'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "All fields are required"]);
        exit;
    }
}

if (!validateEmail($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if ($data['password'] !== $data['confirm_password']) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match']);
    exit;
}

// Check existing email
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already registered']);
    exit;
}

// Get tuition class from subdomain
$host = $_SERVER['HTTP_HOST'];
$parts = explode('.', $host);
$tuition_class = null;

// Check if we're on a subdomain
if (count($parts) >= 2) {
    if ($parts[1] === 'localhost') {
        // Local development
        $tuition_class = strtolower(str_replace(' ', '', $parts[0]));
    } elseif (strpos($host, 'studysimplify.in') !== false) {
        // Production
        $tuition_class = strtolower(str_replace(' ', '', $parts[0]));
    }
}

// Hash password
$hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);

// Insert user with tuition class
$stmt = $conn->prepare("INSERT INTO users (name, email, password, grade_level, tuition_class) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $data['name'], $data['email'], $hashed_password, $data['grade'], $tuition_class);

if ($stmt->execute()) {
    http_response_code(201);
    echo json_encode(['message' => 'Registration successful']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed']);
}

$stmt->close();
$conn->close();
?>