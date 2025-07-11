<?php
header('Content-Type: application/json');
require_once '../../utils/session_manager.php'; // Use the new session manager
startSecureSession(); // Start the session securely

// Include database connection
require_once '../../config/database.php';

// Connect to database
$conn = getConnection();

// Get user data
$sessionId = session_id();
$userId = $_SESSION['user_id'] ?? null;
$page = $_POST['page'] ?? $_SERVER['HTTP_REFERER'] ?? 'unknown';
$ipAddress = $_SERVER['REMOTE_ADDR'];
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
$deviceId = $_POST['device_id'] ?? null; // Get device ID if provided by client
$status = $_POST['status'] ?? 'active'; // Default to active unless specified

// DIAGNOSTIC CODE: Log session data for troubleshooting
error_log("Track API Session: " . json_encode([
    'session_id' => session_id(),
    'user_id' => $userId,
    'has_session' => isset($_SESSION) ? 'yes' : 'no'
]));

// Verify user_id exists in users table before using it
if ($userId) {
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ?");
    $checkStmt->bind_param("i", $userId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    if ($result->num_rows == 0) {
        // User doesn't exist in database, don't use this ID
        error_log("Track API: User ID $userId not found in users table. Setting to null.");
        $userId = null;
    }
}

// Generate a device fingerprint for persistent identification
$deviceFingerprint = generateDeviceFingerprint($ipAddress, $userAgent, $deviceId);

// Function to generate a more persistent device fingerprint
function generateDeviceFingerprint($ip, $userAgent, $deviceId = null) {
    // If client provided a device ID, use it
    if ($deviceId) {
        return $deviceId;
    }
    
    // Otherwise generate a fingerprint based on IP and user agent
    // We hash it to create a consistent identifier
    $fingerprint = hash('sha256', $ip . '|' . $userAgent);
    
    return $fingerprint;
}

// CRITICAL FIX: Aggressively cleanup any user who hasn't pinged in the last 60 seconds
// Since pings happen every 30 seconds, this catches anyone who missed even a single ping
$maxAllowedInactiveTime = 60; // seconds
$stmt = $conn->prepare("DELETE FROM active_users WHERE 
                      TIME_TO_SEC(TIMEDIFF(NOW(), last_activity)) > ?");
$stmt->bind_param("i", $maxAllowedInactiveTime);
$stmt->execute();
$deletedCount = $conn->affected_rows;
if ($deletedCount > 0) {
    error_log("Removed $deletedCount inactive users that haven't pinged in the last 60 seconds");
}

// ALSO: Clean up any stale records that are older than 5 minutes
$stmt = $conn->prepare("DELETE FROM active_users WHERE last_activity < (NOW() - INTERVAL 5 MINUTE)");
$stmt->execute();

// Handle inactive status - immediately REMOVE the user record
if ($status === 'inactive') {
    // Delete the user record completely
    $stmt = $conn->prepare("DELETE FROM active_users 
                          WHERE device_fingerprint = ? OR session_id = ?");
    $stmt->bind_param("ss", $deviceFingerprint, $sessionId);
    $stmt->execute();
    
    // Count active users after removing this one
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM active_users");
    $stmt->execute();
    $result = $stmt->get_result();
    $activeUsersCount = $result->fetch_assoc()['count'];
    
    // Return response
    echo json_encode([
        'status' => 'success',
        'message' => 'User removed from active list',
        'active_users' => $activeUsersCount,
        'device_id' => $deviceFingerprint
    ]);
    
    $conn->close();
    exit;
}

// For active users, continue with normal tracking logic
// Check if this device fingerprint already exists
$stmt = $conn->prepare("SELECT id FROM active_users WHERE 
                        (session_id = ? OR device_fingerprint = ?)");
$stmt->bind_param("ss", $sessionId, $deviceFingerprint);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Update existing record
    $row = $result->fetch_assoc();
    $stmt = $conn->prepare("UPDATE active_users SET 
                          last_activity = CURRENT_TIMESTAMP, 
                          page = ?, 
                          user_id = ?, 
                          session_id = ?,
                          device_fingerprint = ? 
                          WHERE id = ?");
    $stmt->bind_param("sissi", $page, $userId, $sessionId, $deviceFingerprint, $row['id']);
    $stmt->execute();
} else {
    // No record for this device, insert new record
    $stmt = $conn->prepare("INSERT INTO active_users 
                          (session_id, user_id, ip_address, user_agent, page, device_fingerprint) 
                          VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sissss", $sessionId, $userId, $ipAddress, $userAgent, $page, $deviceFingerprint);
    $stmt->execute();
}

// Count active users
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM active_users");
$stmt->execute();
$result = $stmt->get_result();
$activeUsersCount = $result->fetch_assoc()['count'];

// Return device fingerprint to client for storage
echo json_encode([
    'status' => 'success',
    'active_users' => $activeUsersCount,
    'device_id' => $deviceFingerprint // Return fingerprint so client can store it
]);

$conn->close();
?> 