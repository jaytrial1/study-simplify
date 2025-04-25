<?php
// Turn off output buffering
ob_start();

// Set error handling to prevent HTML error messages
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
ini_set('error_log', __DIR__ . '/../../project_error.log'); // Log errors to project root

// Set timezone to UTC for consistent time handling
date_default_timezone_set('UTC');

// Wrap everything in try/catch to prevent PHP errors from breaking JSON response
try {
    header("Content-Type: application/json");
    require_once '../../config/database.php';
    require_once '../../utils/validation.php';

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

    // Check if the OTP exists and is valid, comparing times in UTC
    $stmt = $conn->prepare("SELECT id FROM password_reset WHERE email = ? AND otp = ? AND expires_at > CONVERT_TZ(NOW(), @@session.time_zone, '+00:00') AND is_used = 0");
    $stmt->bind_param("ss", $email, $otp);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        // OTP invalid, expired, or already used
        http_response_code(400);
        
        // Check if OTP exists at all - Keep this secondary check simple for now
        $checkStmt = $conn->prepare("SELECT id, expires_at, is_used FROM password_reset WHERE email = ? ORDER BY created_at DESC LIMIT 1");
        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            $otpRecord = $checkResult->fetch_assoc();
            
            // Check if OTP is expired
            $expiryTime = strtotime($otpRecord['expires_at']);
            if (time() > $expiryTime) {
                echo json_encode(['error' => 'OTP has expired. Please request a new one.']);
            } 
            // Check if OTP is already used
            elseif ($otpRecord['is_used'] == 1) {
                echo json_encode(['error' => 'OTP has already been used. Please request a new one.']);
            } 
            // Otherwise, it's just invalid
            else {
                echo json_encode(['error' => 'Invalid OTP. Please check and try again.']);
            }
        } else {
            echo json_encode(['error' => 'No OTP found for this email. Please request a new one.']);
        }
        
        $checkStmt->close();
        $stmt->close();
        $conn->close();
        exit;
    }

    // OTP is valid
    // Don't mark as used yet - wait until password is actually reset
    $resetId = $result->fetch_assoc()['id'];

    // Return success
    echo json_encode([
        'message' => 'OTP verified successfully',
        'success' => true
    ]);

    // Close database connection
    $stmt->close();
    $conn->close();
} catch (Throwable $mainError) {
    // Clear any output that might have been sent
    ob_end_clean();
    
    // Log the error
    error_log("Uncaught error in verify-otp.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    
    // Set content type header
    header('Content-Type: application/json');
    http_response_code(500);
    
    // Return a clean JSON error response
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

// Clean the output buffer and send the response
ob_end_flush(); 