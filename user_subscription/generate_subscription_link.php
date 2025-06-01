<?php
header('Content-Type: application/json');
error_log("--- user_subscription/generate_subscription_link.php accessed ---");

// Razorpay Test Credentials (ensure these are secure and ideally from a config file in a real app)
$keyId = 'rzp_test_bqaCFLyb2Nt506';
$keySecret = '2jLxGk8AFIza2FqHhXuD14jo';

$response = ['success' => false, 'message' => 'An unexpected error occurred.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $subscriber_email = isset($_POST['subscriber_email']) ? trim($_POST['subscriber_email']) : null;
    error_log("Received subscriber_email: " . $subscriber_email);

    if (empty($subscriber_email) || !filter_var($subscriber_email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = 'Valid subscriber email is required.';
        error_log($response['message']);
        echo json_encode($response);
        exit;
    }

    $amount_in_paise = 2100 * 100; // ₹2000
    $currency = 'INR';
    $description = 'StudySimplify Subscription for ' . $subscriber_email;

    $data = [
        'amount' => $amount_in_paise,
        'currency' => $currency,
        'accept_partial' => false,
        'description' => $description,
        'customer' => [
            'email' => $subscriber_email
        ],
        'notify' => [
            'sms' => false, // Or true, based on your preference
            'email' => true  // Send Razorpay email receipt to the subscriber
        ],
        'reminder_enable' => false,
        'notes' => [
            'subscriber_email' => $subscriber_email,
            'source' => 'direct_subscription_settings_v1'
        ]
    ];

    // Remove customer block if email is somehow empty - though validated above
    if (empty($subscriber_email)) {
        unset($data['customer']);
    }

    error_log("Data being sent to Razorpay for direct subscription: " . json_encode($data));

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.razorpay.com/v1/payment_links');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_USERPWD, $keyId . ':' . $keySecret);
    
    $headers = ['Content-Type: application/json'];
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $api_response_body = curl_exec($ch);
    $http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($curl_error) {
        $response['message'] = 'cURL Error: ' . $curl_error;
        error_log("cURL Error in generate_subscription_link.php: " . $curl_error);
    } else {
        $decoded_response = json_decode($api_response_body, true);
        error_log("Razorpay API Response (generate_subscription_link.php) - HTTP Status: $http_status, Body: $api_response_body");

        if (($http_status == 200 || $http_status == 201) && isset($decoded_response['short_url'])) {
            $response['success'] = true;
            $response['payment_link'] = $decoded_response['short_url'];
            $response['message'] = 'Subscription payment link generated successfully.';
        } else {
            $response['message'] = 'Razorpay API Error: ' . (isset($decoded_response['error']['description']) ? $decoded_response['error']['description'] : $api_response_body);
            if (empty($decoded_response['error']['description']) && empty($api_response_body)) {
                 $response['message'] = 'Razorpay API Error: Empty response from server.';
            }
            $response['http_status'] = $http_status;
            $response['razorpay_response_debug'] = $decoded_response; // For server-side logging if needed
        }
    }
} else {
    $response['message'] = 'Invalid request method.';
    error_log($response['message']);
}

echo json_encode($response);
?> 