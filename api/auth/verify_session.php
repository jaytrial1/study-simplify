<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/session_manager.php';
require_once '../../utils/auth_middleware.php';

// This endpoint simply validates the session and returns user data if valid
$userData = authenticateRequest();

if ($userData) {
    // Session is valid, return success with minimal user data
    echo json_encode([
        'success' => true,
        'user_id' => $userData['id'],
        'name' => $userData['name']
    ]);
} else {
    // Session is invalid or expired
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Session expired or invalid. Please log in again.',
        'session_expired' => true
    ]);
}
?> 