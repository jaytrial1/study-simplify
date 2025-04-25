<?php
// Turn off output buffering
ob_start();

// Set error handling to prevent HTML error messages
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
// Adjust path for owner context
ini_set('error_log', __DIR__ . '/../../../project_error.log'); 

// Set timezone to UTC for consistent time handling
date_default_timezone_set('UTC');

// Wrap everything in try/catch to prevent PHP errors from breaking JSON response
try {
    header("Content-Type: application/json");
    // Adjust paths for owner context
    require_once '../../../config/database.php';
    require_once '../../../utils/validation.php';

    // Get POST data
    $data = json_decode(file_get_contents("php://input"), true);

    // Check required fields
    if (empty($data['email']) || empty($data['otp'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email and OTP are required']);
        exit;
    }

    $email = trim($data['email']);
    $otp = trim($data['otp']);

    // Validate email format
    if (!validateEmail($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit;
    }

    // Validate OTP format (6 digits)
    if (!preg_match('/^\d{6}$/', $otp)) {
        http_response_code(400);
        echo json_encode(['error' => 'OTP must be 6 digits']);
        exit;
    }

    // Connect to the database
    $conn = getConnection();

    // Check if the OTP exists and is valid in the OWNER table, comparing times in UTC
    $stmt = $conn->prepare("SELECT id FROM owner_password_reset WHERE email = ? AND otp = ? AND expires_at > CONVERT_TZ(NOW(), @@session.time_zone, '+00:00') AND is_used = 0");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // OTP invalid, expired, or already used
        http_response_code(400);
        
        // Check specific reason for failure in OWNER table
        $checkStmt = $conn->prepare("SELECT id, expires_at, is_used FROM owner_password_reset WHERE email = ? ORDER BY created_at DESC LIMIT 1");
        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            $otpRecord = $checkResult->fetch_assoc();
            $expiryTime = strtotime($otpRecord['expires_at']); // Use stored UTC expiry
            
            if (time() > $expiryTime) { // Compare against current UTC time
                echo json_encode(['error' => 'OTP has expired. Please request a new one.']);
            } elseif ($otpRecord['is_used'] == 1) {
                echo json_encode(['error' => 'OTP has already been used. Please request a new one.']);
            } else {
                // If not expired or used, it must be invalid (wrong OTP entered)
                error_log("Owner Verify OTP: Invalid OTP entered for email: $email. Submitted: $otp");
                echo json_encode(['error' => 'Invalid OTP. Please check and try again.']);
            }
        } else {
            error_log("Owner Verify OTP: No OTP found for email: $email");
            echo json_encode(['error' => 'No OTP found for this email. Please request a new one.']);
        }
        
        $checkStmt->close();
        $stmt->close();
        $conn->close();
        exit;
    }

    // OTP is valid for the owner
    // Don't mark as used yet - wait until password is actually reset
    // $resetId = $result->fetch_assoc()['id']; // We don't actually need the ID here

    error_log("Owner Verify OTP: Successful verification for email: $email");
    echo json_encode([
        'message' => 'OTP verified successfully',
        'success' => true
    ]);

    // Close database connection
    $stmt->close();
    $conn->close();
} catch (Throwable $mainError) {
    ob_end_clean();
    error_log("Uncaught error in owner/verify-otp.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

ob_end_flush();
?> 