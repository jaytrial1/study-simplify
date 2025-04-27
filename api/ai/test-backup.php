<?php
// Test script for the backup API system
require_once __DIR__ . '/../../lib/ai_handler.php';

// Set error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Backup API System Test</h1>";

// Create an instance of the AIHandler
$ai = new AIHandler();

echo "<p>Current model: <strong>" . $ai->model . "</strong></p>";

// Test function for API calls
function testAPICall($ai, $prompt) {
    echo "<h2>Testing API Call</h2>";
    echo "<p>Prompt: " . htmlspecialchars($prompt) . "</p>";
    
    try {
        $startTime = microtime(true);
        $response = $ai->callGeminiAPI($prompt);
        $endTime = microtime(true);
        $executionTime = round(($endTime - $startTime) * 1000); // in milliseconds
        
        echo "<div style='background-color: #e6ffe6; padding: 10px; border-radius: 5px;'>";
        echo "<p><strong>Success!</strong> Response received in {$executionTime}ms</p>";
        echo "<p><strong>Response:</strong> " . nl2br(htmlspecialchars(substr($response, 0, 300))) . "...</p>";
        echo "</div>";
    } catch (Exception $e) {
        echo "<div style='background-color: #ffe6e6; padding: 10px; border-radius: 5px;'>";
        echo "<p><strong>Error:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
        echo "</div>";
    }
}

// Test with a simple prompt
testAPICall($ai, "Explain the concept of API failover in one paragraph.");

// Test with a more complex prompt that might be more likely to fail
testAPICall($ai, "Write a detailed explanation of quantum computing principles and their applications in modern cryptography, including references to Shor's algorithm and its implications for RSA encryption.");

echo "<p><strong>Test complete!</strong> Check the PHP error logs for detailed information about which API keys were tried.</p>";
?> 