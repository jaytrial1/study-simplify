<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/validation.php';

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
$required = ['full_name', 'class_name', 'email', 'phone_number', 'password', 'confirm_password', 'subdomain_identifier'];
foreach ($required as $field) {
    if (empty($data[$field]) && $field !== 'phone_number') { // Phone number can be empty
        http_response_code(400);
        echo json_encode(['error' => "All fields except phone number are required"]);
        exit;
    }
}

// Email validation
if (!validateEmail($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

// Password matching
if ($data['password'] !== $data['confirm_password']) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match']);
    exit;
}

// Subdomain format validation (alphanumeric with no spaces)
if (!preg_match('/^[a-zA-Z0-9]+$/', $data['subdomain_identifier'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Subdomain identifier must contain only letters and numbers with no spaces']);
    exit;
}

// Normalize subdomain identifier (lowercase)
$subdomain_identifier = strtolower($data['subdomain_identifier']);

// Check if subdomain folder exists
$subdomain_path = '../../subdomain/' . $subdomain_identifier;
if (!file_exists($subdomain_path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Subdomain folder does not exist. Please contact administrator.']);
    exit;
}

// Check existing email
$stmt = $conn->prepare("SELECT owner_id FROM owners WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Email already registered']);
    exit;
}

// Check existing subdomain
$stmt = $conn->prepare("SELECT owner_id FROM owners WHERE subdomain_identifier = ?");
$stmt->bind_param("s", $subdomain_identifier);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    http_response_code(409);
    echo json_encode(['error' => 'Subdomain identifier already registered']);
    exit;
}

// Hash password
$hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);

// Insert owner
$stmt = $conn->prepare("INSERT INTO owners (full_name, class_name, email, phone_number, password, subdomain_identifier) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssss", 
    $data['full_name'], 
    $data['class_name'], 
    $data['email'], 
    $data['phone_number'], 
    $hashed_password, 
    $subdomain_identifier
);

if ($stmt->execute()) {
    $owner_id = $conn->insert_id;
    
    // Create initial empty plan entry (pending_initialization status)
    $plan_stmt = $conn->prepare("INSERT INTO owner_plans (owner_id, plan_type, price_per_student) VALUES (?, 'semester', 0.00)");
    $plan_stmt->bind_param("i", $owner_id);
    $plan_stmt->execute();
    
    http_response_code(201);
    echo json_encode(['message' => 'Registration successful']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Registration failed: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?> 