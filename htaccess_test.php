<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type to JSON
header('Content-Type: application/json');

// Get all headers
$headers = getallheaders();
$authorizationHeader = null;

// Look for Authorization in all possible locations
if (isset($headers['Authorization'])) {
    $authorizationHeader = $headers['Authorization'];
} elseif (isset($headers['authorization'])) {
    $authorizationHeader = $headers['authorization'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authorizationHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authorizationHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['PHP_AUTH_USER'])) {
    $authorizationHeader = 'Basic ' . base64_encode($_SERVER['PHP_AUTH_USER'] . ':' . ($_SERVER['PHP_AUTH_PW'] ?? ''));
} elseif (function_exists('apache_request_headers')) {
    $apacheHeaders = apache_request_headers();
    if (isset($apacheHeaders['Authorization'])) {
        $authorizationHeader = $apacheHeaders['Authorization'];
    }
}

// Prepare response
$response = [
    'status' => 'success',
    'message' => 'Authorization Header Test',
    'authorization_found' => ($authorizationHeader !== null),
    'authorization_value' => $authorizationHeader ? substr($authorizationHeader, 0, 15) . '...' : null,
    'server_variables' => [
        'HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'Not set',
        'REDIRECT_HTTP_AUTHORIZATION' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'Not set',
        'PHP_AUTH_USER' => $_SERVER['PHP_AUTH_USER'] ?? 'Not set',
        'PHP_AUTH_PW' => isset($_SERVER['PHP_AUTH_PW']) ? 'Set (hidden)' : 'Not set',
    ],
    'headers' => array_map(function($header) {
        return (strlen($header) > 20) ? substr($header, 0, 20) . '...' : $header;
    }, $headers),
    'test_result' => ($authorizationHeader !== null) ? 'PASS' : 'FAIL'
];

// Output response
echo json_encode($response, JSON_PRETTY_PRINT); 