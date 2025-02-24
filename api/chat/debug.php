<?php
header('Content-Type: application/json');

// Get current user ID from session or localStorage
$userId = $_GET['user_id'] ?? null;

// Connect to database
require_once '../../config/database.php';
$conn = getConnection();

// Get all chat history for user
$sql = "SELECT * FROM chat_history WHERE user_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$history = [];
while ($row = $result->fetch_assoc()) {
    $history[] = $row;
}

echo json_encode([
    'success' => true,
    'user_id' => $userId,
    'history' => $history
]); 