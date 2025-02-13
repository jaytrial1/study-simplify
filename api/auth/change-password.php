<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);
$userId = $_GET['id'];

// Validate current password
$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!password_verify($data['currentPassword'], $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Current password is incorrect']);
    exit;
}

// Update with new password
$hashedPassword = password_hash($data['newPassword'], PASSWORD_DEFAULT);
$updateStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$updateStmt->bind_param("si", $hashedPassword, $userId);

if ($updateStmt->execute()) {
    echo json_encode(['message' => 'Password updated successfully']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update password']);
}

$conn->close(); 