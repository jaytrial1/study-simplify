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
        // Using 6 as a minimum based on user reset script, adjust if needed for owners
        http_response_code(400);
        echo json_encode(['error' => 'Password must be at least 6 characters long']);
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
        error_log("Owner Reset Password: Invalid/Expired/Used OTP check failed for email: $email");
        echo json_encode(['error' => 'Invalid or expired OTP. Please request a new one.']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $resetId = $result->fetch_assoc()['id']; // ID from owner_password_reset table

    // Start transaction
    $conn->begin_transaction();

    try {
        // Hash the new password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Find the owner ID associated with the email
        $ownerStmt = $conn->prepare("SELECT owner_id FROM owners WHERE email = ?");
        $ownerStmt->bind_param("s", $email);
        $ownerStmt->execute();
        $ownerResult = $ownerStmt->get_result();
        
        if ($ownerResult->num_rows === 0) {
            // Should not happen if OTP validation passed, but check anyway
            throw new Exception('Owner account not found during password update.');
        }
        
        $ownerId = $ownerResult->fetch_assoc()['owner_id'];
        $ownerStmt->close(); // Close this statement

        // Update the OWNER's password in the owners table
        $updateStmt = $conn->prepare("UPDATE owners SET password = ? WHERE owner_id = ?");
        $updateStmt->bind_param("si", $hashedPassword, $ownerId);
        $passwordUpdated = $updateStmt->execute();
        
        if (!$passwordUpdated) {
             error_log("Owner Reset Password: Failed to update password for owner_id: $ownerId");
            throw new Exception('Failed to update owner password');
        }
        $updateStmt->close(); // Close this statement
        
        // Mark the OWNER OTP as used in the owner_password_reset table
        $otpStmt = $conn->prepare("UPDATE owner_password_reset SET is_used = 1 WHERE id = ?");
        $otpStmt->bind_param("i", $resetId);
        $otpUpdated = $otpStmt->execute();
        
        if (!$otpUpdated) {
            error_log("Owner Reset Password: Failed to mark OTP as used for id: $resetId");
            throw new Exception('Failed to update owner OTP status');
        }
        $otpStmt->close(); // Close this statement
        
        // Commit the transaction
        $conn->commit();
        
        error_log("Owner Reset Password: Successfully reset password for email: $email");
        echo json_encode([
            'message' => 'Owner password reset successfully. You can now login with your new password.',
            'success' => true
        ]);
        
    } catch (Exception $e) {
        // Rollback the transaction
        $conn->rollback();
        
        http_response_code(500);
        error_log('Owner Password reset transaction error: ' . $e->getMessage());
        echo json_encode(['error' => 'An error occurred during password reset. Please try again.']); // Generic message
        
    } finally {
        // Close main statement and connection
        $stmt->close();
        $conn->close();
    }
} catch (Throwable $mainError) {
    ob_end_clean();
    error_log("Uncaught error in owner/reset-password.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

ob_end_flush();
?> 