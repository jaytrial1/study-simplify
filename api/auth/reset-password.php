<?php
// Turn off output buffering
ob_start();

// Set error handling to prevent HTML error messages
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
ini_set('error_log', __DIR__ . '/../../project_error.log'); // Log errors to project root

// Wrap everything in try/catch to prevent PHP errors from breaking JSON response
try {
    header("Content-Type: application/json");
    require_once '../../config/database.php';
    require_once '../../utils/validation.php';

    // Get POST data
    $data = json_decode(file_get_contents("php://input"), true);

    // Check required fields
    if (empty($data['email']) || empty($data['otp']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email, OTP, and new password are required']);
        exit;
    }

    $email = trim($data['email']);
    $otp = trim($data['otp']);
    $password = $data['password'];

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

    // Validate password length
    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters long']);
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
        echo json_encode(['error' => 'Invalid or expired OTP. Please request a new one.']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $resetId = $result->fetch_assoc()['id'];

    // Start transaction
    $conn->begin_transaction();

    try {
        // Hash the new password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Check if user exists
        $userStmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $userStmt->bind_param("s", $email);
        $userStmt->execute();
        $userResult = $userStmt->get_result();
        
        if ($userResult->num_rows === 0) {
            throw new Exception('User not found');
        }
        
        $userId = $userResult->fetch_assoc()['id'];
        
        // Update the user's password
        $updateStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
        $updateStmt->bind_param("si", $hashedPassword, $userId);
        $passwordUpdated = $updateStmt->execute();
        
        if (!$passwordUpdated) {
            throw new Exception('Failed to update password');
        }
        
        // Mark the OTP as used
        $otpStmt = $conn->prepare("UPDATE password_reset SET is_used = 1 WHERE id = ?");
        $otpStmt->bind_param("i", $resetId);
        $otpUpdated = $otpStmt->execute();
        
        if (!$otpUpdated) {
            throw new Exception('Failed to update OTP status');
        }
        
        // Commit the transaction
        $conn->commit();
        
        // Return success
        echo json_encode([
            'message' => 'Password reset successfully. Please login with your new password.',
            'success' => true
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction
        $conn->rollback();
        
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
        error_log('Password reset error: ' . $e->getMessage());
    } finally {
        // Close all statements and connection
        if (isset($userStmt)) $userStmt->close();
        if (isset($updateStmt)) $updateStmt->close();
        if (isset($otpStmt)) $otpStmt->close();
        $stmt->close();
        $conn->close();
    }
} catch (Throwable $mainError) {
    // Clear any output that might have been sent
    ob_end_clean();
    
    // Log the error
    error_log("Uncaught error in reset-password.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    
    // Set content type header
    header('Content-Type: application/json');
    http_response_code(500);
    
    // Return a clean JSON error response
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

// Clean the output buffer and send the response
ob_end_flush(); 