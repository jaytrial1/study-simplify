<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

$conn = getConnection();

$data = json_decode(file_get_contents("php://input"), true);
$userId = $_GET['id'];

$stmt = $conn->prepare("SELECT password FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (password_verify($data['password'], $user['password'])) {
    echo json_encode(['message' => 'Password verified']);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Incorrect password']);
}

$conn->close(); 