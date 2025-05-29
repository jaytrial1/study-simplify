<?php
// api/affiliate_razorpay/webhook_handler.php

// Enable error reporting for debugging (remove or adjust for production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set a longer execution time if payouts might take time, though webhooks should be fast.
// set_time_limit(60);

// Adjust paths as per your project structure
require_once __DIR__ . '../../../config/db_connect.php';
require_once __DIR__ . '../../../utils/sanitize_utils.php'; // If not already autoloaded or part of db_connect
require_once __DIR__ . '../../../vendor/razorpay/razorpay-php/Razorpay.php'; // Path to Razorpay SDK

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

// --- Configuration Constants ---
// Replace with your actual keys and secrets. Store securely.
define('RAZORPAY_KEY_ID', 'rzp_test_bqaCFLyb2Nt506'); // Not strictly needed for webhook verification, but good for consistency if API calls made from here
define('RAZORPAY_KEY_SECRET', '2jLxGk8AFIza2FqHhXuD14jo');
define('RAZORPAY_WEBHOOK_SECRET', 'YOUR_RAZORPAY_WEBHOOK_SECRET');
define('YOUR_RAZORPAYX_ACCOUNT_NUMBER', 'YOUR_RAZORPAYX_ACCOUNT_NUMBER'); // From your RazorpayX dashboard for Payouts
define('SUBSCRIPTION_AMOUNT_PAISE', 100000); // 1000 INR
define('COMMISSION_PERCENTAGE', 20);
$commission_amount_paise = (SUBSCRIPTION_AMOUNT_PAISE * COMMISSION_PERCENTAGE) / 100;

// --- Database and API Initialization ---
$db = getConnection();
if (!$db) {
    http_response_code(503);
    error_log("Razorpay Webhook: Database connection failed.");
    // Don't output JSON here as Razorpay might interpret it as a failed signature if it expects empty body on error for retry.
    exit; // Exit silently, Razorpay will retry.
}

// API client for Payouts
$api = new Api(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

// --- Webhook Signature Verification ---
$payload = file_get_contents('php://input');
$received_signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

if (empty($received_signature)) {
    http_response_code(400);
    error_log("Razorpay Webhook: Signature missing.");
    exit;
}

try {
    // The utility object for verification is part of the $api instance if SDK v2.x.x is used
    // For older SDKs, it might be: Razorpay\Api\Utility::verifyWebhookSignature(...)
    $api->utility->verifyWebhookSignature($payload, $received_signature, RAZORPAY_WEBHOOK_SECRET);
} catch (SignatureVerificationError $e) {
    http_response_code(400);
    error_log("Razorpay Webhook: Signature verification failed: " . $e->getMessage());
    exit;
}

// --- Process Valid Webhook ---
$event_data = json_decode($payload, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    error_log("Razorpay Webhook: Invalid JSON payload.");
    exit;
}

// Only process 'payment.link.paid' events for this handler
if (!isset($event_data['event']) || $event_data['event'] !== 'payment.link.paid') {
    error_log("Razorpay Webhook: Received event " . ($event_data['event'] ?? 'unknown') . ", not 'payment.link.paid'. Skipping.");
    http_response_code(200); // Acknowledge receipt to prevent retries
    echo json_encode(['status' => 'success', 'message' => 'Event received but not the one we process here.']);
    exit;
}

$payment_link_entity = $event_data['payload']['payment_link']['entity'] ?? null;
$payment_entity = $event_data['payload']['payment']['entity'] ?? null;

if (!$payment_link_entity || !$payment_entity) {
    http_response_code(400);
    error_log("Razorpay Webhook 'payment.link.paid': Payload structure incorrect. Missing payment_link or payment entity.");
    exit;
}

$razorpay_payment_link_id = $payment_link_entity['id'];
$razorpay_payment_id = $payment_entity['id'];
$payment_status_from_webhook = $payment_entity['status']; // Should be 'captured' for successful payment
$paid_amount_paise_from_webhook = (int)$payment_entity['amount'];
$customer_email = isset($payment_entity['email']) ? strtolower(sanitize_input($payment_entity['email'])) : '';
// $customer_contact = isset($payment_entity['contact']) ? sanitize_input($payment_entity['contact']) : '';
$notes = $payment_link_entity['notes'] ?? [];

$affiliate_user_id_from_notes = $notes['affiliate_user_id'] ?? null;
$affiliate_upi_id_from_notes = $notes['affiliate_upi_id'] ?? null;

// Validate payment status and amount
if ($payment_status_from_webhook !== 'captured' || $paid_amount_paise_from_webhook < SUBSCRIPTION_AMOUNT_PAISE) {
    error_log("Razorpay Webhook: Payment not captured or amount mismatch for link ID {$razorpay_payment_link_id}. Status: {$payment_status_from_webhook}, Amount: {$paid_amount_paise_from_webhook}");
    // Optionally, update affiliate_referrals table to 'payment_failed' or similar
    // $stmt_fail = $db->prepare("UPDATE affiliate_referrals SET link_status = 'payment_failed', updated_at = NOW() WHERE razorpay_payment_link_id = ?");
    // $stmt_fail->bind_param("s", $razorpay_payment_link_id);
    // $stmt_fail->execute();
    // $stmt_fail->close();
    http_response_code(200); // Acknowledge, but don't process further for this logic
    echo json_encode(['status' => 'success', 'message' => 'Payment not successfully captured or amount mismatch.']);
    exit;
}

// --- Payment Successful: Proceed with DB updates and Payout ---
$db->begin_transaction();
try {
    // 1. Update affiliate_referrals table
    $stmt_update_referral = $db->prepare(
        "UPDATE affiliate_referrals 
         SET link_status = 'paid', commission_status = 'pending_payout', razorpay_payment_id = ?, referred_user_email = ?, notes_from_razorpay = ?, updated_at = NOW() 
         WHERE razorpay_payment_link_id = ? AND affiliate_user_id = ? AND link_status = 'generated'"
    );
    $notes_json = json_encode($notes);
    $stmt_update_referral->bind_param("ssssi", $razorpay_payment_id, $customer_email, $notes_json, $razorpay_payment_link_id, $affiliate_user_id_from_notes);
    $stmt_update_referral->execute();
    $referral_updated_rows = $stmt_update_referral->affected_rows;
    $stmt_update_referral->close();

    if ($referral_updated_rows === 0) {
        error_log("Razorpay Webhook: affiliate_referrals record not updated for link ID {$razorpay_payment_link_id}. May be duplicate webhook or data mismatch (affiliate_user_id or status not 'generated').");
        $db->rollback();
        http_response_code(200); // Acknowledge duplicate/mismatch gracefully
        echo json_encode(['status' => 'success', 'message' => 'Referral record not updated, possibly duplicate or data mismatch.']);
        exit;
    }
    
    // 2. Activate/Update User Y's account (the referred customer)
    $referred_user_id = null;
    if (!empty($customer_email)) {
        $stmt_find_user = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt_find_user->bind_param("s", $customer_email);
        $stmt_find_user->execute();
        $result_user = $stmt_find_user->get_result();
        if ($user_data = $result_user->fetch_assoc()) {
            $referred_user_id = $user_data['id'];
            $stmt_activate_user = $db->prepare("UPDATE users SET Progress_status = 'subscribed', is_active_by_owner = 1, trial_expiry_date = NULL, updated_at = NOW() WHERE id = ?");
            $stmt_activate_user->bind_param("i", $referred_user_id);
            $stmt_activate_user->execute();
            $stmt_activate_user->close();
        } else {
            error_log("Razorpay Webhook: New customer email {$customer_email} (for link ID {$razorpay_payment_link_id}) not found in users table. Manual account creation/linking for User Y may be needed.");
            // Business Decision: Create new user or just log? For now, log.
        }
        $stmt_find_user->close();
        
        if($referred_user_id){
            $stmt_link_ruid = $db->prepare("UPDATE affiliate_referrals SET referred_user_id = ? WHERE razorpay_payment_link_id = ?");
            $stmt_link_ruid->bind_param("is", $referred_user_id, $razorpay_payment_link_id);
            $stmt_link_ruid->execute();
            $stmt_link_ruid->close();
        }
    } else {
         error_log("Razorpay Webhook: Customer email not provided in payment for link ID {$razorpay_payment_link_id}. Cannot find/activate User Y.");
    }

    // 3. Initiate Commission Payout (20% of 1000 INR = 200 INR)
    $payout_processed_successfully = false;
    if (!empty($affiliate_upi_id_from_notes)) {
        // More robust: Create Contact & Fund Account first, then Payout with fund_account_id.
        // Simplified for this example: Payout directly to VPA.
        // This may require specific permissions or setup in your RazorpayX account.
        $payout_data = [
            'account_number' => YOUR_RAZORPAYX_ACCOUNT_NUMBER,
            'fund_account'  => [
                'account_type' => 'vpa',
                'contact' => [ // Create a contact on the fly for the VPA
                    'name' => 'Affiliate ' . ($affiliate_user_id_from_notes ?? 'Unknown'), // Use affiliate user ID or name if available
                    // 'email' => $affiliate_email_from_notes, // If you store/pass affiliate email in notes
                    // 'contact' => $affiliate_contact_from_notes, // If available
                ],
                'vpa' => [
                    'address' => $affiliate_upi_id_from_notes
                ]
            ],
            'amount' => $commission_amount_paise,
            'currency' => 'INR',
            'mode' => 'UPI',
            'purpose' => 'affiliate_commission',
            'queue_if_low_balance' => true,
            'reference_id' => 'AFF_COMM_' . $razorpay_payment_link_id, // Unique reference for idempotency
            'narration' => 'StudySimplify Affiliate Commission for Referral' // Max 30 chars for narration
            // 'notes' => [ 'payment_link_id' => $razorpay_payment_link_id ] // Optional notes for the payout
        ];
        
        try {
            $payout = $api->payout->create($payout_data);
            $razorpay_payout_id = $payout->id;
            $payout_status_from_api = $payout->status; // e.g., 'pending', 'processing', 'processed', 'failed'

            $our_commission_status_for_db = 'payout_initiated';
            if (in_array($payout_status_from_api, ['processed'])) $our_commission_status_for_db = 'payout_successful';
            if (in_array($payout_status_from_api, ['failed', 'rejected', 'reversed'])) $our_commission_status_for_db = 'payout_failed';
            
            $stmt_update_payout = $db->prepare("UPDATE affiliate_referrals SET commission_status = ?, razorpay_payout_id = ?, updated_at = NOW() WHERE razorpay_payment_link_id = ?");
            $stmt_update_payout->bind_param("sss", $our_commission_status_for_db, $razorpay_payout_id, $razorpay_payment_link_id);
            $stmt_update_payout->execute();
            $stmt_update_payout->close();
            if ($our_commission_status_for_db === 'payout_successful') $payout_processed_successfully = true;

        } catch (Exception $payout_ex) {
            error_log("Razorpay Payout API Error for link ID {$razorpay_payment_link_id}: " . $payout_ex->getMessage());
            $stmt_fail_payout = $db->prepare("UPDATE affiliate_referrals SET commission_status = 'payout_failed', updated_at = NOW() WHERE razorpay_payment_link_id = ?");
            $stmt_fail_payout->bind_param("s", $razorpay_payment_link_id);
            $stmt_fail_payout->execute();
            $stmt_fail_payout->close();
        }
    } else {
        error_log("Razorpay Webhook: Affiliate UPI ID missing in notes for link ID {$razorpay_payment_link_id}. Cannot process commission payout.");
        $stmt_missing_upi = $db->prepare("UPDATE affiliate_referrals SET commission_status = 'missing_details', updated_at = NOW() WHERE razorpay_payment_link_id = ?");
        $stmt_missing_upi->bind_param("s", $razorpay_payment_link_id);
        $stmt_missing_upi->execute();
        $stmt_missing_upi->close();
    }

    $db->commit();
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Webhook processed.']);

} catch (Exception $e) {
    $db->rollback();
    error_log("Razorpay Webhook Main Processing Error for link ID " . ($razorpay_payment_link_id ?? 'unknown') . ": " . $e->getMessage());
    http_response_code(500); // Indicate server error to Razorpay for potential retry
    // Do not echo JSON here on 500, Razorpay might retry.
    exit;
}

if ($db) $db->close();
?> 