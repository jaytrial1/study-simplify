<?php
header('Content-Type: application/json');
error_log("--- generate_payment_link.php accessed ---"); // DEBUG

// Razorpay Test Credentials
$keyId = 'rzp_live_5rpmGepQCY8FEw';
$keySecret = 'Bd2sszN6IX272msoCETaoFvI';

$response = ['success' => false, 'message' => 'An unexpected error occurred.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("Received POST data in generate_payment_link.php: " . print_r($_POST, true)); // DEBUG

    $affiliate_upi_id = isset($_POST['upi_id']) ? trim($_POST['upi_id']) : null;
    $amount_param = isset($_POST['amount']) ? trim($_POST['amount']) : null;
    $buyer_email_param = isset($_POST['buyer_email']) ? trim($_POST['buyer_email']) : null; // New buyer_email
    $affiliate_email_context_param = isset($_POST['affiliate_email_context']) ? trim($_POST['affiliate_email_context']) : null; // New affiliate_email_context

    if (empty($affiliate_upi_id) || empty($amount_param) || empty($buyer_email_param)) {
        $response['message'] = 'Affiliate UPI ID, Amount, and Buyer Email are required.';
        echo json_encode($response);
        exit;
    }
    if (!filter_var($buyer_email_param, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = 'Invalid Buyer Email format.';
        echo json_encode($response);
        exit;
    }
    // Affiliate email context is optional for core logic but good for records
    if (empty($affiliate_email_context_param) || !filter_var($affiliate_email_context_param, FILTER_VALIDATE_EMAIL)) {
        error_log("Affiliate context email is missing or invalid in generate_payment_link.php: " . $affiliate_email_context_param);
        // Not exiting, as it's context, but buyer_email is critical for the customer.
    }

    if (!is_numeric($amount_param) || floatval($amount_param) <= 0) {
        $response['message'] = 'Invalid amount specified.';
        echo json_encode($response);
        exit;
    }

    $amount_in_paise = intval(floatval($amount_param) * 100);
    $currency = 'INR';
    $description = 'Payment for: ' . $buyer_email_param . ' (Ref: Affiliate ' . $affiliate_upi_id . ')';

    $data = [
        'amount' => $amount_in_paise,
        'currency' => $currency,
        'accept_partial' => false,
        'description' => $description,
        'customer' => [
            'email' => $buyer_email_param
        ],
        'notify' => [
            'sms' => false,
            'email' => false
        ],
        'reminder_enable' => false,
        'notes' => [
            'affiliate_upi_id' => $affiliate_upi_id,
            'buyer_email' => $buyer_email_param,
            'affiliate_email_context' => $affiliate_email_context_param ?: 'Not Provided',
            'source' => 'affiliate_settings_link_v3' // Updated source
        ]
    ];

    if (!empty($buyer_email_param)) {
        error_log("Customer email (buyer) being added to Razorpay data: " . $buyer_email_param); // DEBUG
    } else {
        error_log("Buyer email was empty, not adding to Razorpay customer data."); // DEBUG
    }
    error_log("Data being sent to Razorpay - NOTES section: " . print_r($data['notes'], true)); // DEBUG

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/payment_links');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_USERPWD, $keyId . ':' . $keySecret);
    $headers = [];
    $headers[] = 'Content-Type: application/json';
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $api_response = curl_exec($ch);
    $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (curl_errno($ch)) {
        $response['message'] = 'cURL Error: ' . curl_error($ch);
    } else {
        $decoded_response = json_decode($api_response, true);
        if ($http_status == 200 || $http_status == 201) {
            if (isset($decoded_response['short_url'])) {
                $response['success'] = true;
                $response['payment_link'] = $decoded_response['short_url'];
                $response['message'] = 'Payment link generated successfully.';
            } else {
                $response['message'] = 'Failed to create payment link. Unexpected response from Razorpay.';
                $response['razorpay_response'] = $decoded_response;
            }
        } else {
            $response['message'] = 'Razorpay API Error: ' . (isset($decoded_response['error']['description']) ? $decoded_response['error']['description'] : $api_response);
            $response['http_status'] = $http_status;
            $response['razorpay_response'] = $decoded_response;
        }
    }
    curl_close($ch);
} else {
    $response['message'] = 'Invalid request method.';
}
echo json_encode($response);
?> 
