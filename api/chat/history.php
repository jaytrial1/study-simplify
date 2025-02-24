<?php
require_once '../../models/ChatHistory.php';
require_once '../../lib/config.php';

// Prevent PHP errors from being displayed
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');

$chatHistory = new ChatHistory();

try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            if (isset($_GET['user_id'])) {
                // Get user's chat history with error handling
                try {
                    $filters = [
                        'subject' => $_GET['subject'] ?? null,
                        'chapter' => $_GET['chapter'] ?? null,
                        'question' => $_GET['question'] ?? null
                    ];
                    
                    $history = $chatHistory->getHistory($_GET['user_id'], $filters);
                    if ($history === false) {
                        throw new Exception('Failed to retrieve chat history');
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'history' => $history
                    ]);
                } catch (Exception $e) {
                    error_log("Error getting user history: " . $e->getMessage());
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Failed to retrieve chat history: ' . $e->getMessage()
                    ]);
                }
            } else if (isset($_GET['session_id'])) {
                // Get specific chat session
                $session = $chatHistory->getSession($_GET['session_id']);
                echo json_encode([
                    'success' => true,
                    'conversation' => json_decode($session['conversation'])
                ]);
            } else {
                throw new Exception('Missing user_id or session_id parameter');
            }
            break;

        case 'POST':
            // Create new chat session
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['user_id'], $data['subject'], $data['chapter'], $data['questions'])) {
                throw new Exception('Missing required fields');
            }
            
            // Check for existing session first
            $existingSessionId = $chatHistory->getExistingSession(
                $data['user_id'],
                $data['questions'][0]
            );
            
            if ($existingSessionId) {
                echo json_encode([
                    'success' => true,
                    'session_id' => $existingSessionId,
                    'existing' => true
                ]);
                break;
            }
            
            // If no existing session, create new one
            $sessionId = $chatHistory->createSession(
                $data['user_id'],
                $data['subject'],
                $data['chapter'],
                $data['questions']
            );
            
            if (!$sessionId) {
                throw new Exception('Failed to create session');
            }
            
            echo json_encode([
                'success' => true,
                'session_id' => $sessionId
            ]);
            break;
            
        case 'PUT':
            // Add message to existing session
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['session_id'], $data['sender'], $data['message'])) {
                throw new Exception('Missing required fields');
            }
            
            $success = $chatHistory->addMessage(
                $data['session_id'],
                $data['sender'],
                $data['message']
            );
            
            echo json_encode(['success' => $success]);
            break;
    }
} catch (Exception $e) {
    error_log("Error in chat history API: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}