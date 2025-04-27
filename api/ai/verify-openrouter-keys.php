<?php
// Script to verify OpenRouter API keys individually
require_once __DIR__ . '/../../lib/config.php';

// Set error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// HTML header and styles
echo "<!DOCTYPE html>
<html>
<head>
    <title>OpenRouter API Key Verification</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .key-info { margin-bottom: 20px; padding: 10px; border-radius: 5px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .warning { background-color: #fff3cd; border: 1px solid #ffeeba; }
        .pending { background-color: #d1ecf1; border: 1px solid #bee5eb; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
        button { padding: 8px 16px; background: #007bff; color: white; border: none; 
                border-radius: 4px; cursor: pointer; margin: 10px 0; }
        button:hover { background: #0069d9; }
    </style>
</head>
<body>
    <h1>OpenRouter API Key Verification</h1>
    <p>This script will test each OpenRouter API key individually to diagnose authentication issues.</p>";

// Constants
$OPENROUTER_URL = DEEPSEEK_API_URL;
$OPENROUTER_MODEL = DEEPSEEK_MODEL;
$KEYS = DEEPSEEK_KEYS;

// Function to test an individual API key
function testOpenRouterKey($url, $model, $key, $index) {
    echo "<div id='key-{$index}' class='key-info pending'>";
    echo "<h3>Testing Key {$index}: " . substr($key, 0, 12) . "...</h3>";
    
    // Validate key format
    if (strpos($key, 'sk-or-v1-') !== 0) {
        echo "<p>⚠️ <strong>WARNING:</strong> Key doesn't start with 'sk-or-v1-' which is the expected format for OpenRouter.</p>";
    }
    
    echo "<p>Testing connection to OpenRouter... <span id='status-{$index}'>pending</span></p>";
    
    $testMessageData = [
        'model' => $model,
        'messages' => [
            [
                'role' => 'system',
                'content' => 'You are a helpful assistant.'
            ],
            [
                'role' => 'user',
                'content' => 'Say "Test successful!" and nothing else.'
            ]
        ],
        'stream' => false,
        'max_tokens' => 10 // Keep response short
    ];
    
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $key,
        'HTTP-Referer: http://localhost:3000', 
        'X-Title: StudySimplify API Key Test'
    ];
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($testMessageData),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20
    ]);
    
    $startTime = microtime(true);
    $response = curl_exec($ch);
    $endTime = microtime(true);
    $duration = round(($endTime - $startTime) * 1000);
    
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "<p>HTTP Status Code: <strong>{$httpCode}</strong> (Response time: {$duration}ms)</p>";
    
    if (!empty($curlError)) {
        echo "<p>CURL Error: {$curlError}</p>";
    }
    
    // Check response
    $success = false;
    $responseData = json_decode($response, true);
    
    if ($httpCode === 200) {
        echo "<p>✅ <strong>API Connection Successful!</strong></p>";
        
        // Check for a proper response format
        $validFormat = false;
        $content = "[No content found in expected format]";
        
        if (isset($responseData['choices'][0]['message']['content'])) {
            $validFormat = true;
            $content = $responseData['choices'][0]['message']['content'];
        } else if (isset($responseData['choices'][0]['text'])) {
            $validFormat = true;
            $content = $responseData['choices'][0]['text'];
        } else if (isset($responseData['text'])) {
            $validFormat = true;
            $content = $responseData['text'];
        }
        
        if ($validFormat) {
            echo "<p>✅ <strong>Response format is valid</strong></p>";
            echo "<p>Response content: <code>{$content}</code></p>";
            echo "<script>document.getElementById('key-{$index}').className = 'key-info success';</script>";
            echo "<script>document.getElementById('status-{$index}').innerHTML = '✅ SUCCESS';</script>";
            $success = true;
        } else {
            echo "<p>⚠️ <strong>Warning:</strong> API returned HTTP 200 but with unexpected format</p>";
            echo "<pre>" . htmlspecialchars(json_encode($responseData, JSON_PRETTY_PRINT)) . "</pre>";
            echo "<script>document.getElementById('key-{$index}').className = 'key-info warning';</script>";
            echo "<script>document.getElementById('status-{$index}').innerHTML = '⚠️ FORMAT ISSUE';</script>";
        }
    } else {
        echo "<p>❌ <strong>API Request Failed</strong></p>";
        
        if (isset($responseData['error']['message'])) {
            echo "<p>Error message: " . $responseData['error']['message'] . "</p>";
        } else if (isset($responseData['message'])) {
            echo "<p>Error message: " . $responseData['message'] . "</p>";
        }
        
        echo "<pre>" . htmlspecialchars($response) . "</pre>";
        echo "<script>document.getElementById('key-{$index}').className = 'key-info error';</script>";
        echo "<script>document.getElementById('status-{$index}').innerHTML = '❌ FAILED';</script>";
    }
    
    echo "</div>";
    return $success;
}

// Test each key individually
$validKeyCount = 0;
echo "<h2>Testing All Keys</h2>";

foreach ($KEYS as $index => $key) {
    if (testOpenRouterKey($OPENROUTER_URL, $OPENROUTER_MODEL, $key, $index)) {
        $validKeyCount++;
    }
}

// Summary
echo "<h2>Summary</h2>";
if ($validKeyCount === 0) {
    echo "<p>❌ <strong>No valid OpenRouter API keys found.</strong> Please check your OpenRouter account and update the keys in config.php.</p>";
    
    echo "<div class='key-info warning'>";
    echo "<h3>How to Fix</h3>";
    echo "<ol>
        <li>Log in to your OpenRouter account at <a href='https://openrouter.ai/keys' target='_blank'>https://openrouter.ai/keys</a></li>
        <li>Create new API keys if your existing ones are expired or invalid</li>
        <li>Ensure you copy the full key starting with 'sk-or-v1-'</li>
        <li>Update the DEEPSEEK_KEYS array in lib/config.php</li>
        <li>Make sure you have sufficient credits/quota in your OpenRouter account</li>
    </ol>";
    echo "</div>";
} else {
    echo "<p>✅ Found {$validKeyCount} valid OpenRouter API keys out of " . count($KEYS) . " total keys.</p>";
}

echo "<button onclick='window.location.reload()'>Test Again</button>";
echo "</body></html>";
?> 