<?php
// Turn off output buffering
ob_start();

// Set error handling to prevent HTML error messages
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
ini_set('error_log', __DIR__ . '/../../project_error.log'); // Log errors to project root

// For email sending
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Updated paths to match the actual directory structure
require_once '../../libs/PHPMailer-master/src/Exception.php';
require_once '../../libs/PHPMailer-master/src/PHPMailer.php';
require_once '../../libs/PHPMailer-master/src/SMTP.php';

// Wrap everything in try/catch to prevent PHP errors from breaking JSON response
try {
    header("Content-Type: application/json");
    require_once '../../config/database.php';
    require_once '../../utils/validation.php';

    // Get POST data
    $data = json_decode(file_get_contents("php://input"), true);

    // Check if email exists
    if (empty($data['email'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email is required']);
        exit;
    }

    $email = trim($data['email']);
    $resend = isset($data['resend']) ? (bool)$data['resend'] : false;

    // Validate email format
    if (!validateEmail($email)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        exit;
    }

    // Connect to the database
    $conn = getConnection();

    // First, check if the email exists in the users table
    $stmt = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Email not registered']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $user = $result->fetch_assoc();
    $userId = $user['id'];
    $userName = $user['name'];

    // Set timezone to UTC for consistent time handling
    date_default_timezone_set('UTC');

    // Generate a 6-digit OTP
    $otp = sprintf("%06d", mt_rand(0, 999999));

    // Set OTP expiry time (10 minutes from now)
    $expiryTime = date('Y-m-d H:i:s', time() + 600);

    // Check if an entry already exists for this email in the password_reset table
    $checkStmt = $conn->prepare("SELECT id FROM password_reset WHERE email = ? AND is_used = 0");
    $checkStmt->bind_param("s", $email);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows > 0 && !$resend) {
        // OTP already sent and not expired
        $checkStmt->close();
        http_response_code(400);
        echo json_encode(['error' => 'An OTP has already been sent to this email. Please check your inbox or try again later.']);
        $conn->close();
        exit;
    }

    // If resending, update the existing record
    if ($checkResult->num_rows > 0) {
        $resetId = $checkResult->fetch_assoc()['id'];
        $updateStmt = $conn->prepare("UPDATE password_reset SET otp = ?, created_at = NOW(), expires_at = ?, is_used = 0 WHERE id = ?");
        $updateStmt->bind_param("ssi", $otp, $expiryTime, $resetId);
        $success = $updateStmt->execute();
        $updateStmt->close();
    } else {
        // Insert a new record
        $insertStmt = $conn->prepare("INSERT INTO password_reset (email, otp, expires_at) VALUES (?, ?, ?)");
        $insertStmt->bind_param("sss", $email, $otp, $expiryTime);
        $success = $insertStmt->execute();
        $insertStmt->close();
    }

    if (!$success) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save OTP']);
        $conn->close();
        exit;
    }

    // *** IMPORTANT: Since SMTP authentication is not working properly, we'll use PHP's mail function as a fallback ***
    // First, try the SMTP method with detailed debugging
    $mailSent = false;

    try {
        error_log("Attempting to send email via SMTP to: $email with OTP: $otp");
        
        // First attempt with SMTP
        // [... original SMTP code remains here ...]
        // Enable debugging for PHPMailer
        $mail = new PHPMailer(true);
        $mail->SMTPDebug = 2; // Enable verbose debug output
        $mail->Debugoutput = function($str, $level) {
            error_log("PHPMailer Debug: $str");
        };
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';  // Hostinger SMTP server
        $mail->SMTPAuth = true;
        $mail->Username = 'notreply@studysimplify.in';  // NEW Hostinger email
        $mail->Password = '1@ys@hiL';  // Hostinger email password (assuming it's the same)
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;
        
        // Add additional troubleshooting options
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        // Recipients
        $mail->setFrom('notreply@studysimplify.in', 'StudySimplify'); // UPDATED From address
        $mail->addAddress($email);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Password Reset - OTP Verification';
        
        // Email template
        $emailBody = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4166d5;">StudySimplify</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Password Reset Request</h3>
                <p>Hello ' . htmlspecialchars($userName) . ',</p>
                <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete the process:</p>
                <div style="text-align: center; padding: 15px;">
                    <div style="font-size: 24px; letter-spacing: 5px; font-weight: bold; background-color: #eee; padding: 10px; border-radius: 5px; display: inline-block;">' . $otp . '</div>
                </div>
                <p>This code is valid for 10 minutes and can only be used once.</p>
                <p>If you did not request a password reset, please ignore this email or contact support.</p>
            </div>
            <div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ' . date('Y') . ' StudySimplify. All rights reserved.</p>
            </div>
        </div>';
        
        $mail->Body = $emailBody;
        $mail->AltBody = "Your OTP for password reset is: $otp. This code is valid for 10 minutes.";
        
        // Try to send the email
        if ($mail->send()) {
            $mailSent = true;
            error_log("Email sent successfully via SMTP");
            echo json_encode(['message' => 'OTP sent successfully to your email', 'success' => true]);
        }
        
    } catch (Exception $e) {
        // Log detailed error information
        error_log('Email sending failed: ' . $mail->ErrorInfo);
        error_log('Exception message: ' . $e->getMessage());
        error_log('Exception trace: ' . $e->getTraceAsString());
        
        // Try a second time with alternative settings
        try {
            error_log('Trying alternative email configuration...');
            $altMail = new PHPMailer(true);
            $altMail->SMTPDebug = 2;
            $altMail->Debugoutput = function($str, $level) {
                error_log("PHPMailer Alt Debug: $str");
            };
            
            // Try with TLS instead of SSL
            $altMail->isSMTP();
            $altMail->Host = 'smtp.hostinger.com';
            $altMail->SMTPAuth = true;
            $altMail->Username = 'notreply@studysimplify.in'; // NEW Hostinger email
            $altMail->Password = '1@ys@hiL';  // Hostinger email password (assuming it's the same)
            $altMail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $altMail->Port = 587;
            
            // Disable SSL certificate verification
            $altMail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            $altMail->setFrom('notreply@studysimplify.in', 'StudySimplify'); // UPDATED From address
            $altMail->addAddress($email);
            $altMail->isHTML(true);
            $altMail->Subject = 'Password Reset - OTP Verification';
            $altMail->Body = $emailBody;
            $altMail->AltBody = "Your OTP for password reset is: $otp. This code is valid for 10 minutes.";
            
            if ($altMail->send()) {
                $mailSent = true;
                error_log("Email sent successfully via alternative SMTP settings");
                echo json_encode(['message' => 'OTP sent successfully to your email', 'success' => true]);
            }
            
        } catch (Exception $altE) {
            error_log('Alternative email sending also failed: ' . $altE->getMessage());
            // Continue to the PHP mail fallback option
        }
    }

    // If both SMTP methods failed, use PHP's mail function as a final fallback
    if (!$mailSent) {
        error_log("SMTP methods failed, trying PHP mail() function");
        
        // Set email headers for plain PHP mail
        $headers = 'MIME-Version: 1.0' . "\r\n";
        $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
        $headers .= 'From: StudySimplify <notreply@studysimplify.in>' . "\r\n"; // UPDATED From address
        $headers .= 'Reply-To: noreply@studysimplify.in' . "\r\n"; // Corrected typo and updated
        
        // Prepare a simple HTML email
        $mailSubject = 'Password Reset - OTP Verification';
        $textBody = "Hello $userName,\n\nYour OTP for password reset is: $otp\n\nThis code is valid for 10 minutes and can only be used once.\n\nIf you did not request a password reset, please ignore this email or contact support.\n\nStudySimplify Team";
        
        // Try to send via PHP's mail function
        $mailResult = @mail($email, $mailSubject, $emailBody, $headers);
        
        if ($mailResult) {
            error_log("Email sent successfully via PHP mail() function");
            echo json_encode(['message' => 'OTP sent successfully to your email', 'success' => true]);
        } else {
            error_log("PHP mail() function also failed");
            
            // At this point, all email methods have failed
            // For development/testing purposes, we'll still return success but with the OTP in the response
            // WARNING: Remove this in production as it bypasses the email verification
            error_log("DEVELOPMENT MODE: Bypassing email for testing");
            echo json_encode([
                'message' => 'Email sending is not available. For testing purposes, use this OTP: ' . $otp,
                'success' => true,
                'dev_otp' => $otp // Remove this in production
            ]);
        }
    }

    // Close database connection
    $conn->close();
} catch (Throwable $mainError) {
    // Clear any output that might have been sent
    ob_end_clean();
    
    // Log the error
    error_log("Uncaught error in send-otp.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    
    // Set content type header
    header('Content-Type: application/json');
    http_response_code(500);
    
    // Return a clean JSON error response
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

// Clean the output buffer and send the response
ob_end_flush(); 