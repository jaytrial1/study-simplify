<?php
header('Content-Type: application/json');

// Include database connection
require_once '../../config/database.php';

// Handle authentication for admin access
function authenticate() {
    // Simplified auth for local dev environment
    $isLocalEnvironment = false;
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $serverAddr = $_SERVER['SERVER_ADDR'] ?? '';
    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    
    if (
        $host == 'localhost' || 
        $host == '127.0.0.1' || 
        substr($host, 0, 8) == '192.168.' || 
        $serverAddr == '127.0.0.1' || 
        $serverAddr == '::1' || 
        $serverName == 'localhost'
    ) {
        $isLocalEnvironment = true;
    }

    // For development environment, don't require auth
    if ($isLocalEnvironment && isset($_GET['bypass']) && $_GET['bypass'] === 'local') {
        return true;
    }
    
    // Check for Authorization header (Apache may not populate PHP_AUTH variables)
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (strpos(strtolower($auth), 'basic') === 0) {
            $auth = substr($auth, 6);
            $auth = base64_decode($auth);
            list($user, $pass) = explode(':', $auth);
            $_SERVER['PHP_AUTH_USER'] = $user;
            $_SERVER['PHP_AUTH_PW'] = $pass;
        }
    }
    
    // Standard basic auth check
    if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
        header('WWW-Authenticate: Basic realm="Admin Access"');
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    
    // Compare with hardcoded credentials
    if ($_SERVER['PHP_AUTH_USER'] !== 'admin' || $_SERVER['PHP_AUTH_PW'] !== 'password') {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    return true;
}

// If stats type is detailed, require authentication
$statsType = $_GET['type'] ?? 'basic';
if ($statsType === 'detailed') {
    authenticate();
}

// Connect to database
$conn = getConnection();

// Clean up inactive sessions first
$stmt = $conn->prepare("DELETE FROM active_users WHERE last_activity < (NOW() - INTERVAL 15 MINUTE)");
$stmt->execute();

// Get basic stats
$stats = [];

// Get total active users
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM active_users");
$stmt->execute();
$result = $stmt->get_result();
$stats['total_active'] = $result->fetch_assoc()['count'];

// Get logged-in users
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM active_users WHERE user_id IS NOT NULL");
$stmt->execute();
$result = $stmt->get_result();
$stats['logged_in_users'] = $result->fetch_assoc()['count'];

// Get anonymous users
$stats['anonymous_users'] = $stats['total_active'] - $stats['logged_in_users'];

// If detailed stats requested, provide more information
if ($statsType === 'detailed') {
    // Get page distribution
    $stmt = $conn->prepare("SELECT page, COUNT(*) as count FROM active_users GROUP BY page ORDER BY count DESC");
    $stmt->execute();
    $result = $stmt->get_result();
    $pageStats = [];
    while ($row = $result->fetch_assoc()) {
        $pageStats[] = $row;
    }
    $stats['pages'] = $pageStats;
    
    // Get most recent users (limit to 20)
    $stmt = $conn->prepare("SELECT 
                          a.id, 
                          a.user_id, 
                          a.ip_address, 
                          a.page, 
                          a.last_activity, 
                          a.first_seen,
                          u.name as user_name
                          FROM active_users a
                          LEFT JOIN users u ON a.user_id = u.id
                          ORDER BY a.last_activity DESC LIMIT 20");
    $stmt->execute();
    $result = $stmt->get_result();
    $recentUsers = [];
    while ($row = $result->fetch_assoc()) {
        $recentUsers[] = $row;
    }
    $stats['recent_users'] = $recentUsers;
}

// Return stats
echo json_encode([
    'status' => 'success',
    'timestamp' => date('Y-m-d H:i:s'),
    'stats' => $stats
]);

$conn->close();
?> 