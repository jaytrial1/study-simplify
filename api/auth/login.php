<?php
header("Content-Type: application/json");
require_once '../../config/database.php';
require_once '../../utils/validation.php';
require_once '../../utils/session_manager.php'; // Add session manager

$conn = getConnection();

// Get POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate inputs
if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit;
}

if (!validateEmail($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

// Check user credentials
$stmt = $conn->prepare("SELECT id, password, name, grade_level, subdomain_identifier, is_active_by_owner, Progress_status, trial_expiry_date FROM users WHERE email = ?");
$stmt->bind_param("s", $data['email']);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user || !password_verify($data['password'], $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit;
}

// Check if user is allowed to access from this subdomain
$host = $_SERVER['HTTP_HOST'];
$parts = explode('.', $host);
$current_subdomain = null;

// Determine current subdomain
if (count($parts) >= 2) {
    if ($parts[1] === 'localhost' || strpos($host, 'studysimplify.in') !== false) {
        $current_subdomain = strtolower(str_replace(' ', '', $parts[0]));
    }
}

// If user has a tuition_class, they must access from that subdomain
if ($user['subdomain_identifier'] !== null) {
    if ($user['subdomain_identifier'] !== $current_subdomain) {
        http_response_code(403);
        echo json_encode(['error' => 'Access restricted. Please log in from your assigned class portal.']);
        exit;
    }
}
// If user has no tuition_class (main domain user), they can only access from main domain
else if ($current_subdomain !== null) {
    http_response_code(403);
    echo json_encode(['error' => 'This account can only be accessed from the main website.']);
    exit;
}

// --- START: Implement Access Rules ---
$current_date_str = date('Y-m-d');
$access_granted = false;
$error_message = 'Access Denied.'; // Default error

// Rule 1: Check if user is approved and active by owner
if ($user['is_active_by_owner'] == 1) {
    // User is directly approved and active by owner
    if ($user['subdomain_identifier']) {
        // This is a subdomain user, check their owner's plan status
        $stmt_owner = $conn->prepare("SELECT owner_id FROM owners WHERE subdomain_identifier = ?");
        $stmt_owner->bind_param("s", $user['subdomain_identifier']);
        $stmt_owner->execute();
        $result_owner = $stmt_owner->get_result();
        if ($owner_data = $result_owner->fetch_assoc()) {
            $owner_id = $owner_data['owner_id'];
            $stmt_plan = $conn->prepare("SELECT payment_status FROM owner_plans WHERE owner_id = ? ORDER BY plan_id DESC LIMIT 1");
            $stmt_plan->bind_param("i", $owner_id);
            $stmt_plan->execute();
            $result_plan = $stmt_plan->get_result();
            if ($plan_data = $result_plan->fetch_assoc()) {
                $owner_plan_status = $plan_data['payment_status'];
                
                // Only block login if plan is explicitly expired or suspended
                $blocked_plan_statuses = ['expired', 'suspended', 'terminated'];
                
                if (!in_array($owner_plan_status, $blocked_plan_statuses)) {
                    // The user is approved and the owner's plan is active. Access is granted.
                    // We no longer force the status to 'subscribed' here,
                    // as a user can be approved but still in a trial/demo state.
                    $access_granted = true;
                } else {
                    $error_message = 'Tuition portal is currently inactive. Please contact the administrator.';
                }
            } else {
                // No plan found - create one automatically with active status
                $stmt_create_plan = $conn->prepare("INSERT INTO owner_plans 
                    (owner_id, plan_type, start_date, expiry_date, payment_status, price_per_student, 
                    current_total_students, active_student_count, inactive_approved_student_count, 
                    total_amount, payment_done, total_due_amount, installment_count, created_at) 
                    VALUES (?, 'standard', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 
                    'active', 99.00, 0, 0, 0, 0, 0, 0, 1, NOW())");
                
                $stmt_create_plan->bind_param("i", $owner_id);
                
                if ($stmt_create_plan->execute()) {
                    $access_granted = true;
                } else {
                    $error_message = 'Failed to initialize tuition portal.';
                }
                $stmt_create_plan->close();
            }
            $stmt_plan->close();
        } else {
            $error_message = 'Tuition owner not found.';
        }
        $stmt_owner->close();
    } else {
        // Main domain subscribed user - assumed access is granted if is_active_by_owner = 1
        // We no longer force the status to 'subscribed' here.
        $access_granted = true;
    }
} 
// Rule 2: Check if user is on trial or has other status
else {
    // User is not approved/active by owner, check their progress status directly
    switch ($user['Progress_status']) {
        case 'demo':
            // Trial status - let the database's stored value determine access
            // The cron job will update expired trials automatically
            if ($user['trial_expiry_date'] && strtotime($user['trial_expiry_date']) >= strtotime($current_date_str)) {
                $access_granted = true;
            } else {
                $error_message = 'Your trial period has ended. Please contact your tuition owner.';
            }
            break;
            
        case 'expired':
            $error_message = 'Your trial period has ended. Please contact your tuition owner.';
            break;
            
        case 'subscribed':
            // If status is subscribed but is_active_by_owner is 0, this is inconsistent
            // Fix the inconsistency by setting is_active_by_owner to 1
            $stmt_fix = $conn->prepare("UPDATE users SET is_active_by_owner = 1 WHERE id = ?");
            $stmt_fix->bind_param("i", $user['id']);
            $stmt_fix->execute();
            $stmt_fix->close();
            $access_granted = true;
            break;
            
        default:
            $error_message = 'Your account is not currently active. Please contact your tuition owner.';
            break;
    }
}

if (!$access_granted) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => $error_message]);
    exit;
}
// --- END: Implement Access Rules ---

// Get IP address and user agent for session tracking
$ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;

// Create a new session for the user (this will invalidate any existing sessions)
$sessionId = createUserSession($user['id'], $ip_address, $user_agent);

// CRITICAL FIX: Set the user_id in the PHP session so tracking works
startSecureSession();
$_SESSION['user_id'] = $user['id'];

// Return success response with the session ID
echo json_encode([
    'message' => 'Login successful',
    'token' => $sessionId, // Use session ID as the token
    'user_id' => $user['id'],
    'name' => $user['name'],
    'grade' => $user['grade_level'],
    'tuition_class' => $user['subdomain_identifier'],
    'progressStatus' => $user['Progress_status'],
    'trialExpiryDate' => ($user['Progress_status'] === 'demo' ? $user['trial_expiry_date'] : null)
]);

$stmt->close();
$conn->close();
?>
