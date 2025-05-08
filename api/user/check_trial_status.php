<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../../config/database.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verify it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get request data
$requestData = json_decode(file_get_contents("php://input"), true);

// Check if user_id is provided
if (!isset($requestData['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing user_id']);
    exit;
}

// Get user ID
$userId = $requestData['user_id'];
$current_date = date('Y-m-d');

try {
    // Get database connection
    $conn = getConnection();
    
    // Get user's current trial status
    $stmt = $conn->prepare("SELECT 
        subdomain_identifier, 
        Progress_status, 
        trial_expiry_date,
        is_approved_by_owner,
        is_active_by_owner,
        is_active_by_admin
        FROM users 
        WHERE id = ?");
    
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    $currentStatus = $user['Progress_status'];
    $expiryDate = $user['trial_expiry_date'];
    $subdomain = $user['subdomain_identifier'];
    $isApprovedByOwner = $user['is_approved_by_owner'];
    $isActiveByOwner = $user['is_active_by_owner'];
    $isActiveByAdmin = $user['is_active_by_admin'];
    
    // Check if we need to update the status (demo → expired)
    $needsUpdate = false;
    if ($currentStatus === 'demo' && $expiryDate !== null) {
        if ($expiryDate < $current_date) {
            // Trial has expired, update status in database
            $updateStmt = $conn->prepare("UPDATE users SET Progress_status = 'expired', is_active_by_owner = 0 WHERE id = ?");
            $updateStmt->bind_param("i", $userId);
            $updateStmt->execute();
            
            // Update our local variables as well
            $currentStatus = 'expired';
            $isActiveByOwner = 0;
            $needsUpdate = true;

            error_log("Trial expired for user $userId - updated status to expired");
        }
    }
    
    // If the user is in a subdomain, check the owner plan status
    $ownerPlanStatus = null;
    if ($subdomain) {
        $ownerStmt = $conn->prepare("
            SELECT p.payment_status 
            FROM owner_plans p
            JOIN owners o ON o.owner_id = p.owner_id
            WHERE o.subdomain_identifier = ?
            ORDER BY p.plan_id DESC
            LIMIT 1
        ");
        $ownerStmt->bind_param("s", $subdomain);
        $ownerStmt->execute();
        $ownerResult = $ownerStmt->get_result();
        
        if ($ownerResult->num_rows > 0) {
            $ownerPlan = $ownerResult->fetch_assoc();
            $ownerPlanStatus = $ownerPlan['payment_status'];
        }
    }
    
    // Check if owner plan has expired - if so, update access flags
    if ($ownerPlanStatus === 'expired' || $ownerPlanStatus === 'suspended') {
        echo json_encode([
            'success' => false,
            'error' => 'Owner plan has expired',
            'ownerPlanStatus' => $ownerPlanStatus,
            'progressStatus' => $currentStatus,
            'trialExpiryDate' => $expiryDate
        ]);
        exit;
    }
    
    // Return user trial status
    echo json_encode([
        'success' => true,
        'progressStatus' => $currentStatus,
        'trialExpiryDate' => $expiryDate,
        'subdomain' => $subdomain,
        'is_approved_by_owner' => $isApprovedByOwner,
        'is_active_by_owner' => $isActiveByOwner,
        'is_active_by_admin' => $isActiveByAdmin,
        'needsUpdate' => $needsUpdate
    ]);
    
} catch (Exception $e) {
    error_log("Error in check_trial_status.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error: ' . $e->getMessage()
    ]);
} 