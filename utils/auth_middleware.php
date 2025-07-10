<?php
/**
 * Authentication Middleware
 * Validates user session and provides user data for protected endpoints
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/session_manager.php';

/**
 * Authenticates a request using the provided token
 * 
 * @return array|false User data if authenticated, false otherwise
 */
function authenticateRequest() {
    // Get headers
    $headers = getallheaders();
    
    // Check for Authorization header
    $token = null;
    if (isset($headers['Authorization'])) {
        // Format: "Bearer <token>"
        $auth = explode(' ', $headers['Authorization']);
        if (count($auth) == 2 && strtolower($auth[0]) == 'bearer') {
            $token = $auth[1];
        }
    }
    
    // If no token in header, check for token in request parameters
    if (!$token && isset($_GET['token'])) {
        $token = $_GET['token'];
    }
    
    // If still no token, check POST data
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
    
    // If no token found, authentication fails
    if (!$token) {
        return false;
    }
    
    // Validate the session
    return validateSession($token);
}

/**
 * Requires authentication for an API endpoint
 * Automatically sends error response if not authenticated
 * 
 * @return array User data if authenticated
 */
function requireAuth() {
    $userData = authenticateRequest();
    
    if (!$userData) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Session expired or invalid. Please log in again.',
            'session_expired' => true
        ]);
        exit;
    }
    
    return $userData;
}
?> 