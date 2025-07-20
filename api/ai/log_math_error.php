<?php
// api/ai/log_math_error.php

header('Content-Type: application/json');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/auth_middleware.php';

// Get the posted data
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    exit;
}

// Extract data from the request
$userId = $data->user_id ?? null;
$sessionId = $data->session_id ?? null;
$aiResponse = $data->ai_response ?? null;
$errorMessage = $data->error_message ?? null;

// Validate required fields
if (empty($userId) || empty($sessionId) || empty($aiResponse) || empty($errorMessage)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

try {
    $conn = getConnection();

    $stmt = $conn->prepare("INSERT INTO math_errors (user_id, session_id, ai_response, error_message) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        throw new Exception("Prepare failed: (" . $conn->errno . ") " . $conn->error);
    }
    
    $stmt->bind_param("isss", $userId, $sessionId, $aiResponse, $errorMessage);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Math error logged successfully.']);
    } else {
        throw new Exception("Execute failed: (" . $stmt->errno . ") " . $stmt->error);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    error_log("Math error logging failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'An internal server error occurred while logging the math error.']);
} 