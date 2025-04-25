<?php
// Turn off output buffering
ob_start();

// Set error handling to prevent HTML error messages
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
// Adjust path for owner context
ini_set('error_log', __DIR__ . '/../../../project_error.log'); 

// For email sending
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Adjust paths for owner context
require_once '../../../libs/PHPMailer-master/src/Exception.php';
require_once '../../../libs/PHPMailer-master/src/PHPMailer.php';
require_once '../../../libs/PHPMailer-master/src/SMTP.php';

// Wrap everything in try/catch to prevent PHP errors from breaking JSON response
try {
    header("Content-Type: application/json");
    // Adjust paths for owner context
    require_once '../../../config/database.php';
    require_once '../../../utils/validation.php';

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

    // Check if the email exists in the OWNERS table
    $stmt = $conn->prepare("SELECT owner_id, full_name FROM owners WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Email not registered for an owner account']);
        $stmt->close();
        $conn->close();
        exit;
    }

    $owner = $result->fetch_assoc();
    // $ownerId = $owner['owner_id']; // We don't actually need the ID here
    $ownerName = $owner['full_name'];

    // Set timezone to UTC for consistent time handling
    date_default_timezone_set('UTC');

    // Generate a 6-digit OTP
    $otp = sprintf("%06d", mt_rand(0, 999999));

    // Set OTP expiry time (10 minutes from now)
    $expiryTime = date('Y-m-d H:i:s', time() + 600);

    // Check if an entry already exists for this email in the OWNER_password_reset table
    $checkStmt = $conn->prepare("SELECT id FROM owner_password_reset WHERE email = ? AND is_used = 0");
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

    // If resending, update the existing record in OWNER_password_reset
    if ($checkResult->num_rows > 0) {
        $resetId = $checkResult->fetch_assoc()['id'];
        $updateStmt = $conn->prepare("UPDATE owner_password_reset SET otp = ?, created_at = NOW(), expires_at = ?, is_used = 0 WHERE id = ?");
        $updateStmt->bind_param("ssi", $otp, $expiryTime, $resetId);
        $success = $updateStmt->execute();
        $updateStmt->close();
    } else {
        // Insert a new record into OWNER_password_reset
        $insertStmt = $conn->prepare("INSERT INTO owner_password_reset (email, otp, expires_at) VALUES (?, ?, ?)");
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
    
    // --- Start Email Sending Logic ---
    $mailSent = false;

    try {
        error_log("Owner Send OTP: Attempting SMTP to: $email with OTP: $otp");
        
        $mail = new PHPMailer(true);
        // Keep SMTPDebug off for production, but we can log errors
        // $mail->SMTPDebug = 2; 
        $mail->Debugoutput = function($str, $level) {
            // Only log errors, not the full debug chatter unless needed
             if ($level >= 2) { // Log warnings and errors
                 error_log("Owner Send OTP - PHPMailer ($level): $str");
             }
        };
        
        // Server settings (Using confirmed working settings)
        $mail->isSMTP();
        $mail->Host = 'smtp.hostinger.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'notreply@studysimplify.in'; 
        $mail->Password = '1@ys@hiL'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;
        
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false, // Fine for Hostinger generally
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        // Recipients
        $mail->setFrom('notreply@studysimplify.in', 'StudySimplify Owner Support'); // Customize From Name
        $mail->addAddress($email); // Send to owner's email
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'StudySimplify Owner - Password Reset OTP'; // Customize Subject
        
        // Email template customized for Owner
        $emailBody = '
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #4166d5;">StudySimplify - Owner Portal</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">Owner Password Reset Request</h3>
                <p>Hello ' . htmlspecialchars($ownerName) . ',</p>
                <p>We received a request to reset the password for your StudySimplify Owner account. Use the following One-Time Password (OTP):</p>
                <div style="text-align: center; padding: 15px;">
                    <div style="font-size: 24px; letter-spacing: 5px; font-weight: bold; background-color: #eee; padding: 10px; border-radius: 5px; display: inline-block;">' . $otp . '</div>
                </div>
                <p>This code is valid for 10 minutes.</p>
                <p>If you did not request this, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div style="font-size: 12px; color: #777; text-align: center; margin-top: 20px;">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ' . date('Y') . ' StudySimplify. All rights reserved.</p>
            </div>
        </div>';
        
        $mail->Body = $emailBody;
        $mail->AltBody = "Your OTP for the StudySimplify Owner password reset is: $otp. This code is valid for 10 minutes.";
        
        if ($mail->send()) {
            $mailSent = true;
            error_log("Owner Send OTP: Email sent successfully via SMTP");
            echo json_encode(['message' => 'OTP sent successfully to your owner email address', 'success' => true]);
        } else {
             error_log("Owner Send OTP: Primary SMTP send failed: " . $mail->ErrorInfo);
        }
        
    } catch (Exception $e) {
        error_log('Owner Send OTP: SMTP Exception: ' . $e->getMessage());
    }

    // Fallback to PHP mail() only if SMTP absolutely failed
    if (!$mailSent) {
        error_log("Owner Send OTP: SMTP failed, trying PHP mail() function (Likely won't work on localhost)");
        
        // Set email headers for plain PHP mail
        $headers = 'MIME-Version: 1.0' . "\r\n";
        $headers .= 'Content-type: text/html; charset=UTF-8' . "\r\n";
        $headers .= 'From: StudySimplify Owner Support <notreply@studysimplify.in>' . "\r\n"; 
        $headers .= 'Reply-To: noreply@studysimplify.in' . "\r\n";
        
        $mailSubject = 'StudySimplify Owner - Password Reset OTP'; // Customize Subject
        
        $mailResult = @mail($email, $mailSubject, $emailBody, $headers); // Use HTML body
        
        if ($mailResult) {
            error_log("Owner Send OTP: Email sent successfully via PHP mail()");
            echo json_encode(['message' => 'OTP sent successfully to your owner email address', 'success' => true]);
        } else {
            error_log("Owner Send OTP: PHP mail() function also failed");
            // Provide OTP in response for local testing since email failed
            error_log("Owner Send OTP: DEVELOPMENT MODE: Bypassing email for testing");
            echo json_encode([
                'message' => 'Email sending failed. For testing, use OTP: ' . $otp,
                'success' => true,
                'dev_otp' => $otp // Remove this in production
            ]);
        }
    }
    // --- End Email Sending Logic ---

    // Close database connection
    $conn->close();
} catch (Throwable $mainError) {
    ob_end_clean();
    error_log("Uncaught error in owner/send-otp.php: " . $mainError->getMessage() . "\n" . $mainError->getTraceAsString());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred. Please try again later.']);
    exit;
}

ob_end_flush();
?> 