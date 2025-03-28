<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/ChatHistory.php';

// Prevent PHP errors from showing in output
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// Set response headers
header('Content-Type: application/json');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Get the JSON data from the request
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['user_id']) || !isset($data['question'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
    exit;
}

try {
    // Create chat history object with database connection from function
    $chatHistory = new ChatHistory();
    
    // Check for existing session
    $sessionId = $chatHistory->getExistingSession($data['user_id'], $data['question']);
    
    if ($sessionId) {
        // Session exists
        echo json_encode([
            'success' => true, 
            'exists' => true,
            'session_id' => $sessionId
        ]);
    } else {
        // No existing session
        echo json_encode([
            'success' => true,
            'exists' => false
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}
?> 