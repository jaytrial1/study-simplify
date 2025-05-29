# Razorpay Affiliate Payment Link & Automated Commission Payout Plan

## 1. Introduction & Goal

This document outlines the detailed technical plan for implementing an affiliate payment link generation system on the `app.studysimplify.in` subdomain, with automated commission payouts using Razorpay. This feature allows authenticated users on the `app` subdomain (affiliates) to generate a unique payment link for a fixed subscription amount (1000 INR). When a new customer (User Y) pays using this link, the affiliate receives a 20% commission automatically. The new customer's account is also automatically approved/activated.

This plan is based on the specifications in `Affiliate Paymnet.md` and aligns with the `modification-approch.mdc` guidelines by primarily adding new, isolated functionality.

## 2. Prerequisites & Setup (User Actions)

Before starting development, the following must be in place:

1.  **Razorpay Account:** A fully activated Razorpay account.
2.  **API Keys:**
    *   `YOUR_RAZORPAY_KEY_ID` (Test and Live)
    *   `YOUR_RAZORPAY_KEY_SECRET` (Test and Live)
    *   Generated from the Razorpay Dashboard.
3.  **RazorpayX Payouts:**
    *   Payouts feature must be enabled on your RazorpayX account.
    *   Sufficient balance must be maintained in the RazorpayX account for commission payouts.
4.  **Webhook Setup:**
    *   Configure a webhook endpoint in the Razorpay Dashboard to point to `https://yourdomain.com/api/affiliate_razorpay/webhook_handler.php`.
    *   Subscribe to the `payment.link.paid` event.
    *   Obtain the `YOUR_RAZORPAY_WEBHOOK_SECRET` from the Razorpay Dashboard after setting up the webhook.
5.  **Razorpay PHP SDK:**
    *   Ensure the official Razorpay PHP SDK is installed in your project (e.g., via Composer: `composer require razorpay/razorpay`) or available for inclusion. The SDK handles many complexities of API interaction.
    *   Base API URL: `https://api.razorpay.com/v1/`

## 3. Frontend Modifications (`public/js/settings.js`)

The necessary HTML structure for the "Affiliate Program" section in `public/html/settings.html` is assumed to be already in place (as per previous discussions). The JavaScript in `public/js/settings.js` will be updated to interact with the new backend API endpoint.

**Key JavaScript Logic Additions:**
*   **Element Selection:** Get references to the UPI input field, generate button, link display area, and message areas within the `#affiliateProgramSection`.
*   **Conditional Display:** Ensure the `#affiliateProgramSection` is only visible if `window.location.hostname` is `app.studysimplify.in` (or whitelisted test domains like `localhost`).
*   **Event Listener for "Generate Link" Button (`#generateAffiliateLinkBtn`):**
    *   Validate the affiliate's UPI ID input (basic format check, e.g., `name@bank`).
    *   On successful validation, make an AJAX (Fetch API) `POST` request to `/api/affiliate_razorpay/generate_link.php`.
    *   **Request Body (JSON):** `{ "upi_id": "affiliate_upi_value" }`
    *   **Headers:** Include `Authorization: Bearer ${localStorage.getItem('token')}` and `Content-Type: application/json`.
    *   **Response Handling:**
        *   On success (HTTP 200-299 and valid JSON response):
            *   Extract `payment_link` from the response.
            *   Display the link in the `#generatedAffiliateLink` input field.
            *   Show the `#generatedLinkContainer`.
            *   Implement a "Copy" button (`#copyAffiliateLinkBtn`) to copy the link to the clipboard.
            *   Show a success message.
        *   On failure: Display the error message from the server response.

*(Refer to the previously generated JavaScript code for `settings.js` for a more concrete example of this logic, adapting the API endpoint URL and payload as needed.)*

## 4. Backend Implementation (PHP)

A new directory `api/affiliate_razorpay/` will be created to house the backend scripts.

**Common Requirements for PHP Scripts:**
*   Error Reporting: `error_reporting(E_ALL); ini_set('display_errors', 1);` (for development)
*   Headers: `header('Content-Type: application/json');` etc.
*   Includes:
    *   `../../config/db_connect.php` (for `getConnection()`)
    *   `../../utils/jwt_utils.php` (for `validate_jwt_token()`)
    *   `../../utils/sanitize_utils.php` (for `sanitize_input()`)
    *   The Razorpay PHP SDK: `require_once 'path/to/razorpay-php/Razorpay.php';`
*   Constants (define these securely, ideally outside web root or via environment variables):
    ```php
    define('RAZORPAY_KEY_ID', 'YOUR_RAZORPAY_KEY_ID');
    define('RAZORPAY_KEY_SECRET', 'YOUR_RAZORPAY_KEY_SECRET');
    define('RAZORPAY_WEBHOOK_SECRET', 'YOUR_RAZORPAY_WEBHOOK_SECRET');
    define('SUBSCRIPTION_AMOUNT_PAISE', 100000); // 1000 INR in paise
    define('COMMISSION_PERCENTAGE', 20);
    define('COMMISSION_AMOUNT_PAISE', (SUBSCRIPTION_AMOUNT_PAISE * COMMISSION_PERCENTAGE) / 100); // 200 INR
    ```

### 4.1. API Endpoint: `api/affiliate_razorpay/generate_link.php`

**Purpose:** Creates a Razorpay Payment Link for the affiliate.

```php
<?php
// Common headers, error reporting, and includes (db_connect, jwt_utils, sanitize_utils, Razorpay SDK)

use Razorpay\Api\Api;

// Define Razorpay constants (KEY_ID, KEY_SECRET) and other constants

$db = getConnection();
$api = new Api(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

// Authenticate affiliate user via JWT
// (Standard JWT validation from Authorization header, get $affiliate_user_id, $affiliate_name, $affiliate_email)
// ... (example from previous Easebuzz generate_link.php can be adapted)

// Get and validate POST data
$post_data = json_decode(file_get_contents('php://input'), true);
$affiliate_upi_id = sanitize_input($post_data['upi_id'] ?? null);

if (empty($affiliate_upi_id) || !preg_match('/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/', $affiliate_upi_id)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'error' => 'Invalid or missing UPI ID.']);
    exit;
}

// Prepare data for Razorpay Payment Link API
$payment_link_data = [
    'amount' => SUBSCRIPTION_AMOUNT_PAISE,
    'currency' => 'INR',
    'accept_partial' => false,
    'description' => 'StudySimplify Subscription',
    'customer' => [ // Minimal customer details, they fill more on Razorpay page
        // 'name' => 'New Customer', // Optional
        // 'email' => 'customer@example.com', // Optional prefill
        // 'contact' => '+919999999999' // Optional prefill
    ],
    'notify' => [
        'sms' => false, // Set to true if you want Razorpay to send SMS
        'email' => false // Set to true if you want Razorpay to send Email
    ],
    'reminder_enable' => false,
    'notes' => [
        'affiliate_user_id' => (string)$affiliate_user_id, // Your internal ID for the affiliate
        'affiliate_upi_id'  => $affiliate_upi_id,
        'app_name'          => 'StudySimplify'
    ],
    'callback_url' => 'https://app.studysimplify.in/payment-success.html', // Or your desired thank you page
    'callback_method' => 'get'
];

try {
    $link = $api->paymentLink->create($payment_link_data);
    $payment_link_id = $link->id;
    $short_url = $link->short_url;

    // Store in affiliate_referrals table
    $stmt_insert = $db->prepare(
        "INSERT INTO affiliate_referrals (affiliate_user_id, affiliate_upi_id, payment_amount, commission_amount, razorpay_payment_link_id, link_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'generated', NOW(), NOW())"
    );
    $payment_amount_decimal = SUBSCRIPTION_AMOUNT_PAISE / 100;
    $commission_amount_decimal = COMMISSION_AMOUNT_PAISE / 100;
    $stmt_insert->bind_param("isdds", $affiliate_user_id, $affiliate_upi_id, $payment_amount_decimal, $commission_amount_decimal, $payment_link_id);
    $stmt_insert->execute();
    $stmt_insert->close();

    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'payment_link' => $short_url,
        'payment_link_id' => $payment_link_id // For reference if needed
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Razorpay Payment Link Creation Error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'error' => 'Failed to create payment link: ' . $e->getMessage()]);
}

if ($db) $db->close();
?>
```

### 4.2. API Endpoint: `api/affiliate_razorpay/webhook_handler.php`

**Purpose:** Handles Razorpay webhooks, specifically `payment.link.paid`.

```php
<?php
// Common headers, error reporting, and includes (db_connect, Razorpay SDK)

use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

// Define Razorpay constants (KEY_ID, KEY_SECRET, WEBHOOK_SECRET) and other constants

$db = getConnection(); // Ensure this is available
$api = new Api(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET); // For Payouts

$payload = file_get_contents('php://input');
$received_signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

if (empty($received_signature)) {
    http_response_code(400);
    error_log("Razorpay Webhook: Signature missing.");
    echo json_encode(['status' => 'error', 'error' => 'Signature missing']);
    exit;
}

try {
    $api->utility->verifyWebhookSignature($payload, $received_signature, RAZORPAY_WEBHOOK_SECRET);
    // Signature is valid, process the event
} catch (SignatureVerificationError $e) {
    http_response_code(400);
    error_log("Razorpay Webhook: Signature verification failed: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'error' => 'Invalid signature']);
    exit;
}

$event_data = json_decode($payload, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    error_log("Razorpay Webhook: Invalid JSON payload.");
    echo json_encode(['status' => 'error', 'error' => 'Invalid JSON']);
    exit;
}

// Check for the correct event
if (!isset($event_data['event']) || $event_data['event'] !== 'payment.link.paid') {
    // Log other events if needed, but don't process for this flow
    error_log("Razorpay Webhook: Received event " . ($event_data['event'] ?? 'unknown') . ", not 'payment.link.paid'.");
    echo json_encode(['status' => 'success', 'message' => 'Event received but not processed.']);
    http_response_code(200); // Acknowledge receipt
    exit;
}

$payment_link_entity = $event_data['payload']['payment_link']['entity'] ?? null;
$payment_entity = $event_data['payload']['payment']['entity'] ?? null;

if (!$payment_link_entity || !$payment_entity) {
    http_response_code(400);
    error_log("Razorpay Webhook 'payment.link.paid': Payload structure incorrect.");
    echo json_encode(['status' => 'error', 'error' => 'Invalid payload structure for payment.link.paid.']);
    exit;
}

$razorpay_payment_link_id = $payment_link_entity['id'];
$razorpay_payment_id = $payment_entity['id'];
$payment_status = $payment_entity['status']; // Should be 'captured'
$paid_amount_paise = $payment_entity['amount'];
$customer_email = strtolower(sanitize_input($payment_entity['email'] ?? ''));
$customer_contact = sanitize_input($payment_entity['contact'] ?? '');
$notes = $payment_link_entity['notes'] ?? [];

$affiliate_user_id_from_notes = $notes['affiliate_user_id'] ?? null;
$affiliate_upi_id_from_notes = $notes['affiliate_upi_id'] ?? null;

if ($payment_status !== 'captured' || $paid_amount_paise < SUBSCRIPTION_AMOUNT_PAISE) {
    error_log("Razorpay Webhook: Payment not captured or amount mismatch for link ID {$razorpay_payment_link_id}. Status: {$payment_status}, Amount: {$paid_amount_paise}");
    // Update affiliate_referrals table to 'payment_failed' or similar
    // ...
    echo json_encode(['status' => 'success', 'message' => 'Payment not successfully captured or amount mismatch.']);
    http_response_code(200);
    exit;
}

// --- Payment Successful - Proceed with activation and commission ---

$db->begin_transaction();

try {
    // 1. Update affiliate_referrals table
    $stmt_update_referral = $db->prepare(
        "UPDATE affiliate_referrals SET link_status = 'paid', commission_status = 'pending_payout', razorpay_payment_id = ?, referred_user_email = ?, notes_from_razorpay = ?, updated_at = NOW() 
         WHERE razorpay_payment_link_id = ? AND affiliate_user_id = ? AND link_status = 'generated'"
    );
    $notes_json = json_encode($notes);
    $stmt_update_referral->bind_param("ssssi", $razorpay_payment_id, $customer_email, $notes_json, $razorpay_payment_link_id, $affiliate_user_id_from_notes);
    $stmt_update_referral->execute();
    $referral_updated_rows = $stmt_update_referral->affected_rows;
    $stmt_update_referral->close();

    if ($referral_updated_rows === 0) {
        // Could be a duplicate webhook or record not found/already processed.
        error_log("Razorpay Webhook: affiliate_referrals record not updated for link ID {$razorpay_payment_link_id}. Already processed or mismatch.");
        $db->rollback(); // Rollback if no primary record updated
        echo json_encode(['status' => 'success', 'message' => 'Referral record not updated, potentially duplicate webhook or mismatch.']);
        http_response_code(200);
        exit;
    }
    
    // 2. Activate/Update User Y's account
    $referred_user_id = null;
    if (!empty($customer_email)) {
        // Try to find existing user by email (e.g., a 'demo' user)
        $stmt_find_user = $db->prepare("SELECT id, Progress_status FROM users WHERE email = ? LIMIT 1");
        $stmt_find_user->bind_param("s", $customer_email);
        $stmt_find_user->execute();
        $result_user = $stmt_find_user->get_result();
        if ($user_data = $result_user->fetch_assoc()) {
            $referred_user_id = $user_data['id'];
            // Update existing user
            $stmt_activate_user = $db->prepare("UPDATE users SET Progress_status = 'subscribed', is_active_by_owner = 1, trial_expiry_date = NULL, updated_at = NOW() WHERE id = ?");
            $stmt_activate_user->bind_param("i", $referred_user_id);
            $stmt_activate_user->execute();
            $stmt_activate_user->close();
        } else {
            // User Y not found by email. Business decision needed:
            // Option A: Create a new basic user account and email them to set password.
            // Option B: Log this and require manual creation/linking of User Y.
            // For now, we log it. The referred_user_id in affiliate_referrals will remain NULL.
            error_log("Razorpay Webhook: New customer email {$customer_email} not found in users table. Manual account creation/linking for User Y may be needed.");
        }
        $stmt_find_user->close();
        
        // Update affiliate_referrals with referred_user_id if found
        if($referred_user_id){
            $stmt_link_ruid = $db->prepare("UPDATE affiliate_referrals SET referred_user_id = ? WHERE razorpay_payment_link_id = ?");
            $stmt_link_ruid->bind_param("is", $referred_user_id, $razorpay_payment_link_id);
            $stmt_link_ruid->execute();
            $stmt_link_ruid->close();
        }
    } else {
         error_log("Razorpay Webhook: Customer email not provided in payment for link ID {$razorpay_payment_link_id}. Cannot find/activate User Y.");
    }


    // 3. Initiate Commission Payout (200 INR)
    if (!empty($affiliate_upi_id_from_notes)) {
        $payout_data = [
            'account_number' => 'YOUR_RAZORPAYX_ACCOUNT_NUMBER', // Your primary RazorpayX account number from which funds are debited
            'fund_account'  => [ // Create fund account on the fly or use existing
                'account_type' => 'vpa',
                'vpa' => [
                    'address' => $affiliate_upi_id_from_notes
                ],
                // 'contact' can be pre-created or created on the fly if needed
                // For simplicity, direct fund account details are used.
                // Ideally, create a Contact for the affiliate, then add a Fund Account to that Contact,
                // then use the fund_account_id in the Payout.
                // This requires an extra step of checking/creating Contact and Fund Account.
            ],
            'amount' => COMMISSION_AMOUNT_PAISE,
            'currency' => 'INR',
            'mode' => 'UPI',
            'purpose' => 'affiliate_commission',
            'queue_if_low_balance' => true,
            'reference_id' => 'AFF_COMM_' . $razorpay_payment_link_id, // Your internal reference
            'narration' => 'StudySimplify Affiliate Commission',
            'notes' => [
                'payment_link_id' => $razorpay_payment_link_id,
                'original_payment_id' => $razorpay_payment_id
            ]
        ];
        
        // Simplified Payout: For a more robust solution, implement Contact & Fund Account management.
        // This example directly uses VPA details. Razorpay might require prior Fund Account creation via API.
        // Consult Razorpay Payout API for best practices on `fund_account` vs `fund_account_id`.
        // If `fund_account_id` is required, you must first create a Contact, then a Fund Account, then use that ID.
        
        // For this example, assuming direct creation via `fund_account` object works for VPA:
        $payout = $api->payout->create($payout_data);
        $razorpay_payout_id = $payout->id;
        $payout_status = $payout->status; // e.g., 'processing', 'processed', 'failed'

        // Update commission_status in affiliate_referrals
        $stmt_update_payout = $db->prepare(
            "UPDATE affiliate_referrals SET commission_status = ?, razorpay_payout_id = ?, updated_at = NOW() 
             WHERE razorpay_payment_link_id = ?"
        );
        // Map Razorpay payout status to your commission_status ENUM
        $our_commission_status = 'payout_initiated'; // Default
        if ($payout_status === 'processed') $our_commission_status = 'payout_successful';
        if ($payout_status === 'failed' || $payout_status === 'rejected' || $payout_status === 'reversed') $our_commission_status = 'payout_failed';
        
        $stmt_update_payout->bind_param("sss", $our_commission_status, $razorpay_payout_id, $razorpay_payment_link_id);
        $stmt_update_payout->execute();
        $stmt_update_payout->close();
    } else {
        error_log("Razorpay Webhook: Affiliate UPI ID missing in notes for link ID {$razorpay_payment_link_id}. Cannot process commission.");
        // Update commission_status to 'payout_failed' or 'missing_details'
        $stmt_fail_payout = $db->prepare(
            "UPDATE affiliate_referrals SET commission_status = 'payout_failed', updated_at = NOW() 
             WHERE razorpay_payment_link_id = ? AND commission_status = 'pending_payout'"
        );
        $stmt_fail_payout->bind_param("s", $razorpay_payment_link_id);
        $stmt_fail_payout->execute();
        $stmt_fail_payout->close();
    }

    $db->commit();
    echo json_encode(['status' => 'success', 'message' => 'Webhook processed successfully.']);
    http_response_code(200);

} catch (Exception $e) {
    $db->rollback();
    error_log("Razorpay Webhook Processing Error: " . $e->getMessage() . " for link ID " . ($razorpay_payment_link_id ?? 'unknown'));
    // Optionally update referral status to error
    echo json_encode(['status' => 'error', 'error' => 'Internal server error during webhook processing.']);
    http_response_code(500); // Or 200 if Razorpay retries on 500
}

if ($db) $db->close();
?>
```
**Note on Payouts within Webhook:** The Razorpay Payout API for creating a fund account and then a payout might be more robust. The example above uses a direct VPA payout structure; you'll need to verify with Razorpay docs if this direct method is preferred or if pre-creating a `fund_account_id` is necessary. For simplicity, it's shown directly. A more complete solution would involve:
1. Check if Contact for affiliate exists by their email/ID. Create if not.
2. Check if Fund Account (VPA) for their UPI exists under that Contact. Create if not.
3. Use the `fund_account_id` in the Payout call.


## 5. Database Schema: `affiliate_referrals` Table

```sql
CREATE TABLE `affiliate_referrals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `affiliate_user_id` INT NOT NULL,                       -- FK to your users table (User X)
  `referred_user_email` VARCHAR(255) DEFAULT NULL,      -- Email of User Y (from payment)
  `referred_user_id` INT DEFAULT NULL,                  -- FK to your users table (User Y, once identified/created)
  `affiliate_upi_id` VARCHAR(255) NOT NULL,             -- UPI ID for commission payout
  `payment_amount` DECIMAL(10, 2) NOT NULL,             -- e.g., 1000.00
  `commission_amount` DECIMAL(10, 2) NOT NULL,          -- e.g., 200.00
  `razorpay_payment_link_id` VARCHAR(255) NOT NULL UNIQUE, -- ID from Razorpay
  `razorpay_payment_id` VARCHAR(255) DEFAULT NULL UNIQUE, -- Payment ID from Razorpay after successful payment
  `razorpay_payout_id` VARCHAR(255) DEFAULT NULL UNIQUE,  -- Payout ID for the commission
  `link_status` ENUM('generated', 'paid', 'expired', 'cancelled', 'payment_failed') NOT NULL DEFAULT 'generated',
  `commission_status` ENUM('pending_payout', 'payout_initiated', 'payout_successful', 'payout_failed', 'missing_details') NOT NULL DEFAULT 'pending_payout',
  `notes_from_razorpay` TEXT DEFAULT NULL,              -- Store the 'notes' object from webhook
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_affiliate_user_id` (`affiliate_user_id`),
  INDEX `idx_referred_user_email` (`referred_user_email`),
  CONSTRAINT `fk_affiliate_user` FOREIGN KEY (`affiliate_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE, -- Adjust 'users' and 'id' if your table names differ
  CONSTRAINT `fk_referred_user` FOREIGN KEY (`referred_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL -- Adjust 'users' and 'id'
);
```

## 6. Security & Error Handling

*   **Webhook Signature Verification:** Crucial for ensuring webhooks are genuinely from Razorpay. Implemented using `verifyWebhookSignature()`.
*   **Input Sanitization:** Use `sanitize_input()` (or equivalent) for all user-provided data (like UPI ID) and data from webhooks.
*   **Prepared Statements:** Use parameterized queries for all database interactions to prevent SQL injection.
*   **Error Logging:** Implement comprehensive server-side logging for API errors, webhook processing issues, and payout failures.
*   **Idempotency for Payouts:** Use Razorpay's `reference_id` (or X-Payout-Idempotency key if available for Payouts API) to ensure payouts are not accidentally processed multiple times for the same commission. The `affiliate_referrals` table status checks also help prevent reprocessing.
*   **Transaction Management:** Use database transactions in the webhook handler when performing multiple related updates (e.g., updating referral status, user status, and initiating payout).
*   **Secure Storage of Keys:** API keys and secrets should be stored securely (e.g., environment variables, configuration files outside the webroot) and not hardcoded directly in scripts in a production environment.

## 7. Alignment with `modification-approch.mdc`

This implementation plan adheres to the `modification-approch.mdc` guidelines:
*   **Clarity & Vision:** The feature and its integration are clearly defined.
*   **Approach Selection:** Uses Razorpay's standard and robust APIs for payment links and payouts.
*   **Professional & Sustainable:** Leverages a well-known payment provider and follows standard API integration practices.
*   **Simplicity (for affiliate):** Affiliate only needs to provide their UPI ID.
*   **Ease of Implementation (relative):** While payment integrations have inherent complexities, this plan breaks it down into manageable components using an established SDK.
*   **Minimum Change & Safety:**
    *   Frontend changes are limited to JavaScript logic in `settings.js` calling new endpoints.
    *   Backend consists of new, isolated API scripts in `api/affiliate_razorpay/`.
    *   User activation logic within the webhook handler is specific to this affiliate flow and updates user records directly based on payment success, minimizing impact on existing user management scripts.
    *   Database changes involve adding a new, dedicated table (`affiliate_referrals`).

This detailed plan should provide a solid foundation for development. Remember to replace placeholders with your actual Razorpay credentials and test thoroughly in Razorpay's test mode before going live. 