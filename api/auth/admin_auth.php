<?php
/**
 * Authentication utility for admin API endpoints
 * This provides a common way to verify an admin is authenticated
 */

/**
 * Authenticate an admin using token-based authentication
 * 
 * @return int|false The admin ID if authenticated, false otherwise
 */
function authenticate_admin() {
    $authHeader = null;

    // Try multiple ways to get the Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) {
            $authHeader = $requestHeaders['Authorization'];
        }
    }

    // Try getting token from query parameters as fallback
    if (!$authHeader && isset($_GET['auth_token'])) {
        $authHeader = 'Bearer ' . $_GET['auth_token'];
    }

    // Check if we have a token
    if (!$authHeader) {
        return false;
    }

    $token = trim(str_replace('Bearer ', '', $authHeader));
    if (empty($token)) {
        return false;
    }

    // Verify token against database
    require_once __DIR__ . '/../../config/database.php';
    $conn = getConnection();

    $stmt = $conn->prepare("SELECT admin_id FROM admin_tokens WHERE token = ? AND expires_at > NOW()");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        return false;
    }

    $admin = $result->fetch_assoc();
    $admin_id = $admin['admin_id'];

    $stmt->close();
    $conn->close();

    return $admin_id;
}
?> 