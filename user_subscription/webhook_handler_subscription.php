<?php
// user_subscription/webhook_handler_subscription.php
ini_set('log_errors', 1);
ini_set('display_errors', 0);
ini_set('error_log', __DIR__ . '/subscription_webhook_debug.log');

error_log("--- user_subscription/webhook_handler_subscription.php execution started ---");

require_once __DIR__ . '/../config/database.php'; // Go up one level to public_html, then into config

$webhookSecret = 'uEtV8jYVep@2Gwh'; // Using the same secret as affiliate, ensure this endpoint is configured in Razorpay

$payload = file_get_contents('php://input');
$receivedSignature = isset($_SERVER['HTTP_X_RAZORPAY_SIGNATURE']) ? $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] : '';

$expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

if (!hash_equals($expectedSignature, $receivedSignature)) {
    http_response_code(400);
    error_log("Subscription Webhook: Signature mismatch. Expected: $expectedSignature, Received: $receivedSignature. Payload: $payload");
    echo "Signature verification failed.";
    exit;
}

$eventData = json_decode($payload, true);
error_log("Subscription Webhook: Signature OK. Raw Payload: " . $payload);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    error_log("Subscription Webhook: JSON decode error: " . json_last_error_msg() . ". Payload: $payload");
    echo "Invalid payload.";
    exit;
}

$subscriber_email_from_notes = null;
$razorpay_payment_id = null;
$payment_status_from_webhook = null;
$isSuccessfulPayment = false;

if (isset($eventData['event'])) {
    $eventName = $eventData['event'];
    $notes = [];
    error_log("Subscription Webhook Event: " . $eventName);

    // Consolidate notes and payment details extraction based on typical successful payment events
    if ($eventName === 'payment_link.paid') {
        if (isset($eventData['payload']['payment_link']['entity']['notes'])) {
            $notes = $eventData['payload']['payment_link']['entity']['notes'];
        }
        if (empty($notes) && isset($eventData['payload']['payment']['entity']['notes'])){
            $notes = $eventData['payload']['payment']['entity']['notes'];
        }
        $razorpay_payment_id = $eventData['payload']['payment']['entity']['id'] ?? null;
        $payment_status_from_webhook = $eventData['payload']['payment_link']['entity']['status'] ?? null;
        
        error_log("Subscription Webhook: Event is payment_link.paid. Status from webhook: {$payment_status_from_webhook}. Payment ID: {$razorpay_payment_id}");

        if ($payment_status_from_webhook === 'paid') {
            $isSuccessfulPayment = true;
            error_log("Subscription Webhook: Payment status is 'paid'. Setting isSuccessfulPayment to true.");
        } else {
            error_log("Subscription Webhook: Payment status for payment_link.paid is NOT 'paid' ({$payment_status_from_webhook}). isSuccessfulPayment remains false.");
        }

    } elseif ($eventName === 'payment.captured') { // Often used for direct payments too
        if (isset($eventData['payload']['payment']['entity']['notes'])) {
            $notes = $eventData['payload']['payment']['entity']['notes'];
        }
        $razorpay_payment_id = $eventData['payload']['payment']['entity']['id'] ?? null;
        $payment_status_from_webhook = $eventData['payload']['payment']['entity']['status'] ?? null;
        
        error_log("Subscription Webhook: Event is payment.captured. Status from webhook: {$payment_status_from_webhook}. Payment ID: {$razorpay_payment_id}");

        if ($payment_status_from_webhook === 'captured') {
            $isSuccessfulPayment = true;
            error_log("Subscription Webhook: Payment status is 'captured'. Setting isSuccessfulPayment to true.");
        } else {
            error_log("Subscription Webhook: Payment status for payment.captured is NOT 'captured' ({$payment_status_from_webhook}). isSuccessfulPayment remains false.");
        }
    } else {
        error_log("Subscription Webhook: Received event type '{$eventName}'. This event will not be processed for subscription activation.");
        http_response_code(200); // Acknowledge other events but don't process for subscription
        echo "Event received but not processed for subscription.";
        exit;
    }

    if (!$isSuccessfulPayment) {
        error_log("Subscription Webhook: Payment not successful for event: " . $eventName . " with status: " . $payment_status_from_webhook . ". Payment ID: " . $razorpay_payment_id);
        http_response_code(200);
        echo "Payment not in a successful state.";
        exit;
    }

    // Extract subscriber_email from notes
    if (!empty($notes)) {
        $subscriber_email_from_notes = $notes['subscriber_email'] ?? null;
        error_log("Subscription Webhook: Extracted from notes - Subscriber Email: {$subscriber_email_from_notes}");
    } else {
        error_log("Subscription Webhook: Notes array is empty or not found for a successful payment event. Cannot update user subscription. Payment ID: " . $razorpay_payment_id);
        http_response_code(200); // Acknowledge but log error
        echo "Webhook processed, but notes were missing for subscriber data.";
        exit;
    }

    if (empty($subscriber_email_from_notes) || !filter_var($subscriber_email_from_notes, FILTER_VALIDATE_EMAIL)) {
        error_log("Subscription Webhook: Subscriber email is missing or invalid from notes. Payment ID: " . $razorpay_payment_id . ". Payload: " . $payload);
        http_response_code(400); // Bad request if critical info missing
        echo "Subscriber email missing or invalid.";
        exit;
    }

    // Database operations to update user subscription status
    $conn = null;
    try {
        $conn = getConnection();
        if (!$conn) {
            throw new Exception("Subscription Webhook: Database connection failed.");
        }

        // Update user status. Ensure Progress_status='subscribed' is correct for your enum/varchar.
        $stmt_update_user = $conn->prepare("UPDATE users SET Progress_status = 'subscribed', is_approved_by_owner = 1, is_active_by_owner = 1, payment_type = 'online' WHERE email = ?");
        if (!$stmt_update_user) {
            throw new Exception("Subscription Webhook: Failed to prepare statement for user update: " . $conn->error);
        }
        
        $stmt_update_user->bind_param("s", $subscriber_email_from_notes);
        
        if ($stmt_update_user->execute()) {
            if ($stmt_update_user->affected_rows > 0) {
                error_log("Subscription Webhook: Successfully updated user subscription status for email: " . $subscriber_email_from_notes . ". Payment ID: " . $razorpay_payment_id);
            } else {
                error_log("Subscription Webhook: User status update query executed, but no rows affected (user might not exist or already updated). Email: " . $subscriber_email_from_notes . ". Payment ID: " . $razorpay_payment_id);
                // This is not necessarily an error to send to Razorpay, could be a new user not yet in DB or already active.
            }
        } else {
            throw new Exception("Subscription Webhook: Failed to execute user subscription status update. Email: " . $subscriber_email_from_notes . ". Error: " . $stmt_update_user->error);
        }
        $stmt_update_user->close();
        $conn->close();

    } catch (Exception $e) {
        error_log("Subscription Webhook: Database operation failed: " . $e->getMessage() . ". Payment ID: " . $razorpay_payment_id . ". Payload: " . $payload);
        if ($conn && $conn->ping()) {
            $conn->close();
        }
        http_response_code(500); // Internal server error
        echo "Error processing subscription webhook data.";
        exit;
    }

} else {
    error_log("Subscription Webhook: Event type not found in payload. Payload: " . $payload);
    http_response_code(400); // Bad request if event type missing
    echo "Event type missing.";
    exit;
}

http_response_code(200);
echo "Subscription webhook received and processed successfully.";

?> 