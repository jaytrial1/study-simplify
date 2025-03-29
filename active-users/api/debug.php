<?php
header('Content-Type: application/json');
session_start();

// Include database connection
require_once '../../config/database.php';

// Connect to database
$conn = getConnection();

// DIAGNOSTIC CODE START
// Session diagnostic logging
$sessionData = [
    'session_id' => session_id(),
    'user_id' => $_SESSION['user_id'] ?? 'null',
    'session_active' => (session_status() == PHP_SESSION_ACTIVE) ? 'yes' : 'no'
];
error_log("Debug session data: " . json_encode($sessionData));

// Check if user_id exists in the users table
$userExists = false;
$userName = null;
if (isset($_SESSION['user_id'])) {
    $checkUserStmt = $conn->prepare("SELECT id, name FROM users WHERE id = ?");
    $checkUserStmt->bind_param("i", $_SESSION['user_id']);
    $checkUserStmt->execute();
    $userResult = $checkUserStmt->get_result();
    
    if ($userResult->num_rows > 0) {
        $userData = $userResult->fetch_assoc();
        error_log("User found in DB: " . json_encode($userData));
        $userExists = true;
        $userName = $userData['name'];
    } else {
        error_log("No user found with ID: " . $_SESSION['user_id']);
    }
}
// DIAGNOSTIC CODE END

// Simple admin authentication
function authenticate() {
    // Compare with hardcoded credentials
    if ($_SERVER['PHP_AUTH_USER'] !== 'admin' || $_SERVER['PHP_AUTH_PW'] !== 'password') {
        header('HTTP/1.0 401 Unauthorized');
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }
    
    return true;
}

// Try to authenticate
if (!isset($_SERVER['PHP_AUTH_USER']) || !isset($_SERVER['PHP_AUTH_PW'])) {
    header('WWW-Authenticate: Basic realm="Admin Access"');
    header('HTTP/1.0 401 Unauthorized');
    echo json_encode(['error' => 'Authentication required']);
    exit;
} else {
    authenticate();
}

// Get all active users with detailed information
$stmt = $conn->prepare("SELECT 
                      a.id, 
                      a.user_id, 
                      a.session_id, 
                      a.device_fingerprint,
                      a.ip_address,
                      a.page,
                      a.last_activity,
                      a.first_seen,
                      TIMESTAMPDIFF(SECOND, a.last_activity, NOW()) as seconds_since_last_ping,
                      u.name as user_name
                      FROM active_users a
                      LEFT JOIN users u ON a.user_id = u.id
                      ORDER BY a.last_activity DESC");
$stmt->execute();
$result = $stmt->get_result();

// ADDITIONAL DIAGNOSTIC CODE
$joinQuerySuccess = ($stmt->errno === 0) ? 'Success' : 'Failed: ' . $stmt->error;
error_log("JOIN query execution: " . $joinQuerySuccess);

$users = [];
$userDiagnostics = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
    
    // Add diagnostics for each user
    $userDiagnostics[] = [
        'user_id' => $row['user_id'],
        'session_id' => $row['session_id'],
        'name_retrieved' => $row['user_name'] ? 'yes' : 'no'
    ];
}
error_log("User rows diagnostic: " . json_encode($userDiagnostics));

// Get MySQL server timestamp for comparison
$timeStmt = $conn->prepare("SELECT NOW() as server_time");
$timeStmt->execute();
$timeResult = $timeStmt->get_result();
$serverTime = $timeResult->fetch_assoc()['server_time'];

// Return detailed debug info
echo json_encode([
    'status' => 'success',
    'timestamp' => date('Y-m-d H:i:s'),
    'server_time' => $serverTime,
    'php_time' => date('Y-m-d H:i:s'),
    'active_user_count' => count($users),
    'server_info' => [
        'php_version' => phpversion(),
        'mysql_version' => $conn->server_info
    ],
    // Include diagnostic info in response
    'diagnostic_info' => [
        'session' => $sessionData,
        'current_user_exists' => $userExists,
        'current_user_name' => $userName,
        'join_query_success' => $joinQuerySuccess
    ],
    'users' => $users
]);

$conn->close();
?> 