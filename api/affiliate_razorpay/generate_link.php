<?php
// api/affiliate_razorpay/generate_link.php

// Enable error reporting for debugging (remove or adjust for production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for production (e.g., your specific frontend domain)
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Adjust paths as per your project structure
require_once __DIR__ . '../../../config/db_connect.php'; 
require_once __DIR__ . '../../../utils/jwt_utils.php'; 
require_once __DIR__ . '../../../utils/sanitize_utils.php';
require_once __DIR__ . '../../../vendor/razorpay/razorpay-php/Razorpay.php'; // Path to Razorpay SDK

use Razorpay\Api\Api;

// --- Configuration Constants ---
// Replace with your actual keys and secrets. Store securely (e.g., env variables).
define('RAZORPAY_KEY_ID', 'rzp_test_bqaCFLyb2Nt506');
define('RAZORPAY_KEY_SECRET', '2jLxGk8AFIza2FqHhXuD14jo');
define('SUBSCRIPTION_AMOUNT_PAISE', 100000); // 1000 INR in paise
define('COMMISSION_PERCENTAGE', 20);
$commission_amount_paise = (SUBSCRIPTION_AMOUNT_PAISE * COMMISSION_PERCENTAGE) / 100;

// --- Database and API Initialization ---
$db = getConnection();
if (!$db) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'error' => 'Database connection failed.']);
    exit;
}

$api = new Api(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

// --- Authenticate Affiliate User (JWT) ---
$auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
if (!$auth_header) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'error' => 'Authorization header missing']);
    exit();
}

$token = str_replace('Bearer ', '', $auth_header);
$user_data_from_token = validate_jwt_token($token); // This function needs to exist in jwt_utils.php

if (!$user_data_from_token || !isset($user_data_from_token['user_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'error' => 'Invalid or expired token']);
    exit();
}
$affiliate_user_id = $user_data_from_token['user_id'];
// $affiliate_name = $user_data_from_token['name'] ?? 'Affiliate User'; // Optional: get name from token
// $affiliate_email = $user_data_from_token['email'] ?? 'affiliate@example.com'; // Optional: get email from token

// --- Get and Validate POST Data ---
$post_data = json_decode(file_get_contents('php://input'), true);
$affiliate_upi_id = isset($post_data['upi_id']) ? sanitize_input($post_data['upi_id']) : null;

if (empty($affiliate_upi_id) || !preg_match('/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/', $affiliate_upi_id)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'error' => 'Invalid or missing UPI ID.']);
    exit;
}

// --- Prepare Data for Razorpay Payment Link API ---
$payment_link_data = [
    'amount' => SUBSCRIPTION_AMOUNT_PAISE,
    'currency' => 'INR',
    'accept_partial' => false,
    'description' => 'StudySimplify Subscription Referral',
    // 'customer' => [ // Optional: Prefill customer details if available
    //     'name' => 'New Customer',
    //     'email' => 'customer@example.com',
    //     'contact' => '+919999999999'
    // ],
    'notify' => [
        'sms' => false, // Set to true if you want Razorpay to notify customer via SMS
        'email' => false // Set to true if you want Razorpay to notify customer via Email
    ],
    'reminder_enable' => false,
    'notes' => [
        'affiliate_user_id' => (string)$affiliate_user_id, // Your internal ID for the affiliate
        'affiliate_upi_id'  => $affiliate_upi_id,
        'app_name'          => 'StudySimplify'
    ],
    // Consider making callback_url more dynamic if needed, or a generic success page
    'callback_url' => 'https://' . ($_SERVER['HTTP_HOST'] ?? 'app.studysimplify.in') . '/payment-success.html', 
    'callback_method' => 'get'
];

try {
    $link = $api->paymentLink->create($payment_link_data);
    $payment_link_id_from_razorpay = $link->id;
    $short_url = $link->short_url;

    // --- Store in affiliate_referrals table ---
    $stmt_insert = $db->prepare(
        "INSERT INTO affiliate_referrals (affiliate_user_id, affiliate_upi_id, payment_amount, commission_amount, razorpay_payment_link_id, link_status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, 'generated', NOW(), NOW())"
    );
    $payment_amount_decimal = SUBSCRIPTION_AMOUNT_PAISE / 100;
    $commission_amount_decimal = $commission_amount_paise / 100;
    $stmt_insert->bind_param("isdds", $affiliate_user_id, $affiliate_upi_id, $payment_amount_decimal, $commission_amount_decimal, $payment_link_id_from_razorpay);
    
    if (!$stmt_insert->execute()) {
        throw new Exception("Database error: Failed to store referral link details. " . $stmt_insert->error);
    }
    $stmt_insert->close();

    http_response_code(200);
    echo json_encode([
        'status' => 'success', 
        'payment_link' => $short_url,
        'payment_link_id' => $payment_link_id_from_razorpay // For frontend reference if needed
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Razorpay Affiliate Payment Link Creation Error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'error' => 'Failed to create payment link: ' . $e->getMessage()]);
}

if ($db) $db->close();
?> 