<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

$conn = getConnection();

// GET request to fetch user data
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        exit;
    }

    $stmt = $conn->prepare("SELECT name, email, grade_level FROM users WHERE id = ?");
    $stmt->bind_param("i", $_GET['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    echo json_encode([
        'name' => $user['name'],
        'email' => $user['email'],
        'grade' => $user['grade_level']
    ]);
}

// PUT request to update user data
else if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $_GET['id'];

    // Update user data
    $stmt = $conn->prepare("UPDATE users SET name = ?, email = ?, grade_level = ? WHERE id = ?");
    $stmt->bind_param("sssi", $data['name'], $data['email'], $data['grade'], $userId);

    if ($stmt->execute()) {
        echo json_encode(['message' => 'Profile updated successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update profile']);
    }
}

$conn->close();
