<?php
// Create this file in your project root
require_once __DIR__ . '/models/ChatHistory.php';

try {
    $chatHistory = new ChatHistory();
    
    // Changed user_id from 1 to 12 to match your existing user
    $userId = 12;  // Your existing user ID
    
    // Test creating a session
    $sessionId = $chatHistory->createSession(
        $userId,  // Using correct user_id
        'Accountancy',
        'Chapter1',
        ['Question1', 'Question2']
    );
    echo "Created session with ID: " . $sessionId . "\n";

    // Test adding a message
    if ($sessionId) {
        $success = $chatHistory->addMessage(
            $sessionId,
            'user',
            'Test message'
        );
        echo "Added message: " . ($success ? "success" : "failed") . "\n";
    }

    // Test getting history with details
    $history = $chatHistory->getHistory($userId);  // Using correct user_id
    echo "\nRetrieved history details:\n";
    foreach ($history as $entry) {
        echo "\nChat Session ID: " . $entry['id'] . "\n";
        echo "Subject: " . $entry['subject'] . "\n";
        echo "Chapter: " . $entry['chapter'] . "\n";
        echo "Questions: " . $entry['question_identifier'] . "\n";
        echo "Conversation:\n";
        $conversation = json_decode($entry['conversation'], true);
        foreach ($conversation as $message) {
            echo "- " . $message['sender'] . ": " . $message['message'] . 
                 " (at " . $message['timestamp'] . ")\n";
        }
        echo "Created at: " . $entry['created_at'] . "\n";
        echo "Updated at: " . $entry['updated_at'] . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
} 