<?php
// Set error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// HTML header for readability in browser
header('Content-Type: text/html');
echo "<pre>";

// Your API configuration
$apiKey = 'AIzaSyDdKHmIzLbGBKIX_j2DWm8Lg4Jqy4CihYo';
$apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';

try {
    // Simple test prompt
    $testPrompt = "Say hello and introduce yourself in one sentence.";
    
    echo "Testing Gemini API connection...\n\n";
    echo "API URL: " . $apiUrl . "\n";
    echo "API Key (first 5 chars): " . substr($apiKey, 0, 5) . "...\n\n";
    
    // Format request data
    $data = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [['text' => $testPrompt]]
            ]
        ]
    ];
    
    // Initialize curl
    $ch = curl_init($apiUrl . '?key=' . $apiKey);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    
    echo "Sending request with data:\n";
    echo json_encode($data, JSON_PRETTY_PRINT) . "\n\n";
    
    // Execute request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    echo "HTTP Status Code: " . $httpCode . "\n\n";
    
    if ($error = curl_error($ch)) {
        echo "CURL ERROR: " . $error . "\n";
    }
    
    echo "Raw API Response:\n";
    echo "--------------------------\n";
    echo $response . "\n";
    echo "--------------------------\n\n";
    
    // Parse response
    $responseData = json_decode($response, true);
    
    if ($httpCode === 200) {
        echo "✅ API Connection: SUCCESS\n";
        echo "✅ Response Format: " . (isset($responseData['candidates'][0]['content']['parts'][0]['text']) ? "VALID" : "INVALID") . "\n";
        if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            echo "\nAI Response: " . $responseData['candidates'][0]['content']['parts'][0]['text'] . "\n";
        }
    } else {
        echo "❌ API Connection: FAILED\n";
        if (isset($responseData['error'])) {
            echo "Error details: " . json_encode($responseData['error'], JSON_PRETTY_PRINT) . "\n";
        }
    }
    
    curl_close($ch);

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
}

echo "</pre>";
