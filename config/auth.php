<?php
/**
 * Authentication utilities for token verification
 */

require_once __DIR__ . '/database.php';

// Function to verify a token - simplified version for testing
function verifyToken($token) {
    // For testing, just return the user_id from localStorage directly
    // In a real implementation, we'd verify this against the database
    
    // This is a simplified implementation for development
    // The real implementation should verify tokens against a database
    return isset($_POST['user_id']) ? $_POST['user_id'] : 1;
}

// Note: In production, use a proper JWT library like firebase/php-jwt
// This is a simplified implementation for development purposes only 