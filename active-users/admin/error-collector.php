<?php
// Set proper content type for text download
header('Content-Type: text/plain');
header('Content-Disposition: attachment; filename="diagnostic-log.txt"');

// Basic authentication to protect sensitive data
function authenticate() {
    if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW']) ||
        $_SERVER['PHP_AUTH_USER'] !== 'admin' || $_SERVER['PHP_AUTH_PW'] !== 'password') {
        header('WWW-Authenticate: Basic realm="Admin Access"');
        header('HTTP/1.0 401 Unauthorized');
        echo "Authentication required to access log data";
        exit;
    }
    return true;
}

// Authenticate user
authenticate();

// Start collecting diagnostic info
$output = "======= DIAGNOSTIC LOG COLLECTION =======\n";
$output .= "Generated: " . date('Y-m-d H:i:s') . "\n\n";

// Server information
$output .= "===== SERVER INFO =====\n";
$output .= "PHP Version: " . phpversion() . "\n";
$output .= "Server: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
$output .= "Request Time: " . date('Y-m-d H:i:s', $_SERVER['REQUEST_TIME']) . "\n";
$output .= "Hostname: " . gethostname() . "\n";

// Session information
session_start();
$output .= "\n===== SESSION INFO =====\n";
$output .= "Session ID: " . session_id() . "\n";
$output .= "Session Status: " . (session_status() == PHP_SESSION_ACTIVE ? "Active" : "Inactive") . "\n";
$output .= "Session Data: " . print_r($_SESSION, true) . "\n";

// Database connection test
$output .= "\n===== DATABASE CONNECTION TEST =====\n";
try {
    require_once '../../config/database.php';
    $conn = getConnection();
    $output .= "Database Connection: Successful\n";
    
    // Check if users table exists
    $result = $conn->query("SHOW TABLES LIKE 'users'");
    $output .= "Users Table Exists: " . ($result->num_rows > 0 ? "Yes" : "No") . "\n";
    
    // Check if active_users table exists
    $result = $conn->query("SHOW TABLES LIKE 'active_users'");
    $output .= "Active Users Table Exists: " . ($result->num_rows > 0 ? "Yes" : "No") . "\n";
    
    // Check for logged in users
    if (isset($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
        $stmt = $conn->prepare("SELECT id, name FROM users WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $userData = $result->fetch_assoc();
            $output .= "Current User Info: Found user with ID {$userId}, Name: {$userData['name']}\n";
        } else {
            $output .= "Current User Info: No user found with ID {$userId}\n";
        }
    }
    
    // Sample JOIN query to test
    $output .= "\n===== JOIN QUERY TEST =====\n";
    $joinSql = "SELECT a.id, a.user_id, u.name 
                FROM active_users a 
                LEFT JOIN users u ON a.user_id = u.id 
                LIMIT 5";
    $result = $conn->query($joinSql);
    
    if ($result) {
        $output .= "JOIN Query Execution: Success\n";
        $output .= "Sample Results:\n";
        while ($row = $result->fetch_assoc()) {
            $output .= "  - User ID: " . ($row['user_id'] ?? 'NULL') . 
                       ", Name: " . ($row['name'] ?? 'NULL') . "\n";
        }
    } else {
        $output .= "JOIN Query Execution: Failed - " . $conn->error . "\n";
    }
    
    // Check recent active_users entries
    $output .= "\n===== RECENT ACTIVE USERS =====\n";
    $result = $conn->query("SELECT user_id, session_id, last_activity FROM active_users ORDER BY last_activity DESC LIMIT 10");
    
    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $output .= "User ID: " . ($row['user_id'] ?? 'NULL') . 
                       ", Session: " . substr($row['session_id'], 0, 10) . "..., " .
                       "Last Active: " . $row['last_activity'] . "\n";
        }
    } else {
        $output .= "No recent active users found\n";
    }
    
    // Check PHP error log location
    $output .= "\n===== PHP ERROR LOG =====\n";
    $logPath = ini_get('error_log');
    $output .= "Error Log Path: " . ($logPath ? $logPath : "Not configured") . "\n";
    
    // Try to fetch recent errors from error log if possible
    if ($logPath && file_exists($logPath) && is_readable($logPath)) {
        $output .= "\nRecent Error Log Entries:\n";
        // Get last 50 lines of the error log
        $logLines = array_slice(file($logPath), -50);
        foreach ($logLines as $line) {
            if (strpos($line, 'Track API') !== false || 
                strpos($line, 'Debug session') !== false || 
                strpos($line, 'JOIN query') !== false) {
                $output .= $line;
            }
        }
    } else {
        $output .= "Cannot access error log file directly\n";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    $output .= "Database Connection Error: " . $e->getMessage() . "\n";
}

// Print all collected information
echo $output;
?> 