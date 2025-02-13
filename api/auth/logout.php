<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

$conn = getConnection();

// Get the token from Authorization header
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization'])) {
    $token = str_replace('Bearer ', '', $headers['Authorization']);
}

if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'No token provided']);
    exit;
}

// Invalidate the token in the database
$stmt = $conn->prepare("UPDATE users SET token = NULL WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();

if ($stmt->affected_rows > 0) {
    echo json_encode(['message' => 'Logged out successfully']);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid token']);
}

$conn->close();
