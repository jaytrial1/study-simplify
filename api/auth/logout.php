<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/session_manager.php';

// Get token from Authorization header
$headers = getallheaders();
$token = null;

if (isset($headers['Authorization'])) {
    // Format: "Bearer <token>"
    $auth = explode(' ', $headers['Authorization']);
    if (count($auth) == 2 && strtolower($auth[0]) == 'bearer') {
        $token = $auth[1];
    }
}

// If no token in header, check POST data
if (!$token && isset($_POST['token'])) {
    $token = $_POST['token'];
}

// If still no token, check JSON body
if (!$token) {
    $json_data = json_decode(file_get_contents('php://input'), true);
    if (isset($json_data['token'])) {
        $token = $json_data['token'];
    }
}

// If we have a token, invalidate it
$success = false;
if ($token) {
    $success = invalidateSession($token);
}

// Return success response regardless of whether we found a token
// This ensures the client can always "log out" even if the session is already invalid
echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
?>
