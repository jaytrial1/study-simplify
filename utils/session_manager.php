<?php
/**
 * Session Manager Utility
 * Handles creating, validating, and invalidating user sessions
 */

/**
 * Creates a new session for a user, invalidating any existing sessions
 * 
 * @param int $userId The user ID
 * @param string $ipAddress The user's IP address
 * @param string $userAgent The user's browser user agent
 * @return string The new session ID
 */
function createUserSession($userId, $ipAddress = null, $userAgent = null) {
    $conn = getConnection();
    
    // Generate a secure random session ID
    $sessionId = bin2hex(random_bytes(32)); // 64 character hex string
    
    // First, invalidate any existing sessions for this user
    $stmt = $conn->prepare("DELETE FROM active_sessions WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Create new session
    $stmt = $conn->prepare("INSERT INTO active_sessions (session_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("siss", $sessionId, $userId, $ipAddress, $userAgent);
    $stmt->execute();
    $stmt->close();
    
    return $sessionId;
}

/**
 * Validates if a session is active and valid
 * 
 * @param string $sessionId The session ID to validate
 * @return array|false User data if valid, false if invalid
 */
function validateSession($sessionId) {
    $conn = getConnection();
    
    // Check if session exists and get user data
    $stmt = $conn->prepare("
        SELECT u.id, u.name, u.email, u.grade_level, u.subdomain_identifier, u.Progress_status
        FROM active_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.session_id = ?
    ");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        return false; // Session not found
    }
    
    $userData = $result->fetch_assoc();
    $stmt->close();
    
    // Update last activity time
    $stmt = $conn->prepare("UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = ?");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $stmt->close();
    
    return $userData;
}

/**
 * Invalidates a specific session
 * 
 * @param string $sessionId The session ID to invalidate
 * @return bool True if successful
 */
function invalidateSession($sessionId) {
    $conn = getConnection();
    
    $stmt = $conn->prepare("DELETE FROM active_sessions WHERE session_id = ?");
    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $rowsAffected = $stmt->affected_rows;
    $stmt->close();
    
    return $rowsAffected > 0;
}

/**
 * Invalidates all sessions for a user
 * 
 * @param int $userId The user ID
 * @return bool True if successful
 */
function invalidateAllUserSessions($userId) {
    $conn = getConnection();
    
    $stmt = $conn->prepare("DELETE FROM active_sessions WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $rowsAffected = $stmt->affected_rows;
    $stmt->close();
    
    return $rowsAffected > 0;
}

/**
 * Cleans up expired sessions (optional, can be run via cron)
 * 
 * @param int $hoursOld Sessions older than this many hours will be removed
 * @return int Number of sessions removed
 */
function cleanupOldSessions($hoursOld = 24) {
    $conn = getConnection();
    
    $stmt = $conn->prepare("DELETE FROM active_sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL ? HOUR)");
    $stmt->bind_param("i", $hoursOld);
    $stmt->execute();
    $rowsAffected = $stmt->affected_rows;
    $stmt->close();
    
    return $rowsAffected;
}

/**
 * Starts a secure PHP session with appropriate cookie settings.
 * Ensures the session cookie is available across the entire site.
 */
function startSecureSession() {
    if (session_status() == PHP_SESSION_NONE) {
        $cookieParams = session_get_cookie_params();
        session_set_cookie_params([
            'lifetime' => $cookieParams['lifetime'],
            'path' => '/', // Cookie available for the entire domain
            'domain' => $cookieParams['domain'],
            'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off', // Use secure cookies on HTTPS
            'httponly' => true, // Prevent client-side script access
            'samesite' => 'Lax' // CSRF protection
        ]);
        session_start();
    }
}
?> 