<?php
// webhook_handler.php
// This script should be placed in the 'affiliate' folder: e.g., https://app.studysimplify.in/affiliate/webhook_handler.php

// Custom error logging for this script
ini_set('log_errors', 1); // Enable error logging
ini_set('display_errors', 0); // Disable displaying errors to the output (important for webhooks)
ini_set('error_log', __DIR__ . '/webhook_debug.log'); // Log errors to a file in the current directory

error_log("--- affiliate/webhook_handler.php execution started. Custom logging enabled. ---");

// Include the database connection script
require_once __DIR__ . '/../config/database.php'; // Adjusted path - go up one level from affiliate to public_html, then into config

$webhookSecret = 'uEtV8jYVep@2Gwh'; // Your Webhook Secret from Razorpay Dashboard
// Log files are no longer the primary storage, but can be kept for debugging if needed.
// $logFile = __DIR__ . '/webhook_payment_log.txt'; 
// $buyerEmailsLogFile = __DIR__ . '/buyer_emails_log.txt'; 

// Get the webhook payload and signature
$payload = file_get_contents('php://input');
$receivedSignature = isset($_SERVER['HTTP_X_RAZORPAY_SIGNATURE']) ? $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] : '';

// Verify the signature
$expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

if (!hash_equals($expectedSignature, $receivedSignature)) {
    http_response_code(400);
    error_log("Webhook signature mismatch (affiliate). Expected: $expectedSignature, Received: $receivedSignature. Payload: $payload");
    echo "Signature verification failed.";
    exit;
}

$eventData = json_decode($payload, true);
error_log("--- affiliate/webhook_handler.php accessed, signature OK ---"); // DEBUG
error_log("Webhook Raw Payload in affiliate/webhook_handler.php: " . $payload); // DEBUG

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    error_log("Webhook JSON decode error (affiliate): " . json_last_error_msg() . ". Payload: $payload");
    echo "Invalid payload.";
    exit;
}

// Initialize variables for database insertion
$affiliate_email_from_notes = null;
$affiliate_user_id = null;
$commission_amount = 500.00;
$principal_amount = 2000.00;
$buyer_email_from_notes = null;
$buyer_user_id = null;
$razorpay_payment_id = null;
$payment_status_from_webhook = null;
$affiliate_upi_id_from_notes = null; // Added for UPI ID
$buyer_subdomain_identifier = null; // Added for subdomain
// commission_paid_status defaults to 'pending' in the DB

$isSuccessfulPayment = false;

if (isset($eventData['event'])) {
    $eventName = $eventData['event'];
    $notes = [];

    error_log("Webhook Event in affiliate/webhook_handler.php: " . $eventName); // DEBUG

    // This handler is specifically for affiliate payment links, so we primarily care about payment_link.paid
    if ($eventName === 'payment_link.paid') {
        if (isset($eventData['payload']['payment_link']['entity']['notes'])) {
            $notes = $eventData['payload']['payment_link']['entity']['notes'];
        }
        // Fallback for notes in payment entity within payment_link.paid
        // This structure can sometimes occur if the payment object is more detailed in the webhook.
        if (empty($notes) && isset($eventData['payload']['payment']['entity']['notes'])){
            $notes = $eventData['payload']['payment']['entity']['notes'];
        }
        
        $razorpay_payment_id = $eventData['payload']['payment']['entity']['id'] ?? null;
        $payment_status_from_webhook = $eventData['payload']['payment_link']['entity']['status'] ?? null;
        
        error_log("Event is payment_link.paid. Status from webhook: {$payment_status_from_webhook}. Payment ID: {$razorpay_payment_id}"); // Detailed log

        if ($payment_status_from_webhook === 'paid') {
            $isSuccessfulPayment = true;
            error_log("Payment status is 'paid'. Setting isSuccessfulPayment to true.");
        } else {
            error_log("Payment status is NOT 'paid' ({$payment_status_from_webhook}). isSuccessfulPayment remains false.");
        }
    } else {
        // If it's not payment_link.paid, we will not process it for affiliate commission.
        error_log("Received event type '{$eventName}', which is not 'payment_link.paid'. This event will not be processed for affiliate commission.");
        http_response_code(200); // Acknowledge event, but don't process further for commission logic.
        echo "Event received but not processed for affiliate commission as it's not payment_link.paid.";
        exit;
    }

    if (!$isSuccessfulPayment) {
        error_log("Payment not successful for event: " . $eventName . " with status: " . $payment_status_from_webhook);
        http_response_code(200);
        echo "Payment not in a successful state.";
        exit;
    }

    // Extract data from notes
    if (!empty($notes)) {
        $affiliate_email_from_notes = $notes['affiliate_email_context'] ?? null; // Note: key was affiliate_email_context
        $buyer_email_from_notes = $notes['buyer_email'] ?? null;
        $affiliate_upi_id_from_notes = $notes['affiliate_upi_id'] ?? null; // Extract affiliate UPI ID
        error_log("Extracted from notes - Affiliate Email Context: {$affiliate_email_from_notes}, Buyer Email: {$buyer_email_from_notes}, Affiliate UPI: {$affiliate_upi_id_from_notes}");
    } else {
        error_log("Notes array is empty or not found for a successful payment event. Cannot proceed with affiliate logic.");
        http_response_code(200); // Acknowledge but log error
        echo "Webhook processed, but notes were missing for affiliate data.";
        exit;
    }

    // Critical data check: buyer_email and affiliate_email are needed
    if (empty($buyer_email_from_notes) || !filter_var($buyer_email_from_notes, FILTER_VALIDATE_EMAIL)) {
        error_log("Buyer email is missing or invalid from notes. Payload: " . $payload);
        http_response_code(400); // Bad request if critical info missing
        echo "Buyer email missing or invalid.";
        exit;
    }
    if (empty($affiliate_email_from_notes) || !filter_var($affiliate_email_from_notes, FILTER_VALIDATE_EMAIL)) {
        error_log("Affiliate (context) email is missing or invalid from notes. Payload: " . $payload);
        // Decide if this is critical enough to exit or just log. For now, let's log and proceed if buyer email is okay.
        // If affiliate_user_id lookup fails, it will be NULL in the DB.
    }

    // Database operations
    $conn = null;
    try {
        $conn = getConnection();
        if (!$conn) {
            throw new Exception("Database connection failed in webhook_handler.");
        }

        // Get affiliate_user_id
        if ($affiliate_email_from_notes) {
            $stmt_aff = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
            if ($stmt_aff) {
                $stmt_aff->bind_param("s", $affiliate_email_from_notes);
                $stmt_aff->execute();
                $result_aff = $stmt_aff->get_result();
                if ($row_aff = $result_aff->fetch_assoc()) {
                    $affiliate_user_id = $row_aff['id'];
                }
                $stmt_aff->close();
            } else {
                error_log("Failed to prepare statement for affiliate user ID lookup: " . $conn->error);
            }
        }

        // Get buyer_user_id and subdomain_identifier
        // IMPORTANT: Assuming 'subdomain_identifier' is the correct column name in your 'users' table.
        // If it's different, this query needs to be adjusted.
        $stmt_buy = $conn->prepare("SELECT id, subdomain_identifier FROM users WHERE email = ? LIMIT 1");
        if ($stmt_buy) {
            $stmt_buy->bind_param("s", $buyer_email_from_notes);
            $stmt_buy->execute();
            $result_buy = $stmt_buy->get_result();
            if ($row_buy = $result_buy->fetch_assoc()) {
                $buyer_user_id = $row_buy['id'];
                $buyer_subdomain_identifier = $row_buy['subdomain_identifier'] ?? null; // Fetch subdomain identifier
                error_log("Webhook: Found buyer_user_id: {$buyer_user_id} and buyer_subdomain_identifier: {$buyer_subdomain_identifier} for email: {$buyer_email_from_notes}");
            } else {
                error_log("Webhook: Buyer email {$buyer_email_from_notes} not found in users table.");
            }
            $stmt_buy->close();
        } else {
            error_log("Failed to prepare statement for buyer user ID and subdomain lookup: " . $conn->error);
        }

        // Insert into affiliate table
        $sql_insert = "INSERT INTO affiliate (affiliate_email, affiliate_user_id, commission_amount, principal_amount, buyer_email, buyer_user_id, razorpay_payment_id, payment_status, affiliate_upi_id, buyer_subdomain_identifier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt_insert = $conn->prepare($sql_insert);
        if ($stmt_insert) {
            $stmt_insert->bind_param("siddsissss", 
                $affiliate_email_from_notes, 
                $affiliate_user_id, 
                $commission_amount, 
                $principal_amount, 
                $buyer_email_from_notes, 
                $buyer_user_id, 
                $razorpay_payment_id, 
                $payment_status_from_webhook,
                $affiliate_upi_id_from_notes, // Added
                $buyer_subdomain_identifier   // Added
            );
            
            if ($stmt_insert->execute()) {
                error_log("Webhook: Successfully inserted record into affiliate table. Payment ID: " . $razorpay_payment_id);

                // Now, update the users table for the buyer
                if ($buyer_user_id) { // Prefer updating by user_id if available
                    // 1. Mark as approved and active
                    $stmt_user_approve = $conn->prepare("UPDATE users SET is_approved_by_owner = 1, is_active_by_owner = 1, payment_type = 'online' WHERE id = ?");
                    if ($stmt_user_approve) {
                        $stmt_user_approve->bind_param("i", $buyer_user_id);
                        if ($stmt_user_approve->execute()) {
                            error_log("Webhook: Successfully set is_approved_by_owner=1, is_active_by_owner=1 for buyer_user_id: " . $buyer_user_id);
                        } else {
                            error_log("Webhook: Failed to set approved/active for buyer_user_id: " . $buyer_user_id . ". Error: " . $stmt_user_approve->error);
                        }
                        $stmt_user_approve->close();
                    } else {
                        error_log("Webhook: Failed to prepare statement for setting user approved/active. Error: " . $conn->error);
                    }

                    // 2. Update Progress_status to 'subscribed'
                    // Ensure 'subscribed' is the exact string value used in your users.Progress_status enum/varchar column.
                    $stmt_user_progress = $conn->prepare("UPDATE users SET Progress_status = 'subscribed' WHERE id = ?");
                    if ($stmt_user_progress) {
                        $stmt_user_progress->bind_param("i", $buyer_user_id);
                        if ($stmt_user_progress->execute()) {
                            error_log("Webhook: Successfully set Progress_status='subscribed' for buyer_user_id: " . $buyer_user_id);
                        } else {
                            error_log("Webhook: Failed to set Progress_status for buyer_user_id: " . $buyer_user_id . ". Error: " . $stmt_user_progress->error);
                        }
                        $stmt_user_progress->close();
                    } else {
                        error_log("Webhook: Failed to prepare statement for setting user Progress_status. Error: " . $conn->error);
                    }
                } elseif ($buyer_email_from_notes) {
                    // Fallback to updating by email if buyer_user_id was not found (e.g., new user)
                    // This is less ideal as email might not be unique if your system allows it, or student might change it.
                    // But it can be a fallback if user creation is handled elsewhere or if email is a reliable unique key for pending users.
                    error_log("Webhook: buyer_user_id not found. Attempting to update users table by email: " . $buyer_email_from_notes);
                    
                    // 1. Mark as approved and active by email
                    $stmt_user_approve_email = $conn->prepare("UPDATE users SET is_approved_by_owner = 1, is_active_by_owner = 1, payment_type = 'online' WHERE email = ?");
                    if ($stmt_user_approve_email) {
                        $stmt_user_approve_email->bind_param("s", $buyer_email_from_notes);
                        if ($stmt_user_approve_email->execute()) {
                            error_log("Webhook: Successfully set is_approved_by_owner=1, is_active_by_owner=1 for buyer_email: " . $buyer_email_from_notes);
                        } else {
                            error_log("Webhook: Failed to set approved/active for buyer_email: " . $buyer_email_from_notes . ". Error: " . $stmt_user_approve_email->error);
                        }
                        $stmt_user_approve_email->close();
                    } else {
                        error_log("Webhook: Failed to prepare statement for setting user approved/active by email. Error: " . $conn->error);
                    }

                    // 2. Update Progress_status to 'subscribed' by email
                    $stmt_user_progress_email = $conn->prepare("UPDATE users SET Progress_status = 'subscribed' WHERE email = ?");
                    if ($stmt_user_progress_email) {
                        $stmt_user_progress_email->bind_param("s", $buyer_email_from_notes);
                        if ($stmt_user_progress_email->execute()) {
                            error_log("Webhook: Successfully set Progress_status='subscribed' for buyer_email: " . $buyer_email_from_notes);
                        } else {
                            error_log("Webhook: Failed to set Progress_status for buyer_email: " . $buyer_email_from_notes . ". Error: " . $stmt_user_progress_email->error);
                        }
                        $stmt_user_progress_email->close();
                    } else {
                        error_log("Webhook: Failed to prepare statement for setting user Progress_status by email. Error: " . $conn->error);
                    }
                } else {
                    error_log("Webhook: Cannot update users table for buyer as both buyer_user_id and buyer_email_from_notes are missing.");
                }

            } else {
                error_log("Webhook: Failed to insert record into affiliate table. Error: " . $stmt_insert->error . " Payload: " . $payload);
            }
            $stmt_insert->close();
        } else {
             error_log("Failed to prepare statement for affiliate table insertion. Error: " . $conn->error);
        }

        if ($conn) {
            $conn->close();
        }

    } catch (Exception $e) {
        error_log("Database operation failed in webhook_handler: " . $e->getMessage() . " Payload: " . $payload);
        if ($conn) {
            $conn->close();
        }
        http_response_code(500); // Internal server error
        echo "Error processing webhook data.";
        exit;
    }

} else {
    error_log("Event type not found in payload. Payload: " . $payload);
    http_response_code(400); // Bad request if event type missing
    echo "Event type missing.";
    exit;
}

http_response_code(200);
echo "Webhook received and processed successfully.";

?> 