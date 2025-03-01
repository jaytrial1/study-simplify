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
                try {
                    // Pass all filter parameters to the method
                    $filters = [
                        'grade' => $_GET['grade'] ?? null,
                        'subject' => $_GET['subject'] ?? null,
                        'chapter' => $_GET['chapter'] ?? null,
                        'search' => $_GET['search'] ?? null
                    ];
                    
                    $result = $chatHistory->getHistoryWithFilters($_GET['user_id'], $filters);
                    if ($result === false) {
                        throw new Exception('Failed to retrieve chat history');
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'filters' => $result['filters'],
                        'history' => $result['history']
                    ]);
                } catch (Exception $e) {
                    error_log("Error getting user history: " . $e->getMessage());
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Failed to retrieve chat history'
                    ]);
                }
            } else if (isset($_GET['session_id'])) {
                // Get specific chat session
                if (!is_numeric($_GET['session_id'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Invalid session ID'
                    ]);
                    break;
                }

                $session = $chatHistory->getSession($_GET['session_id']);
                if (!$session) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'error' => 'Chat session not found'
                    ]);
                    break;
                }

                $conversation = json_decode($session['conversation'], true);
                
                // Filter out system messages
                $filteredConversation = array_filter($conversation, function($msg) {
                    return $msg['sender'] !== 'system';
                });
                
                echo json_encode([
                    'success' => true,
                    'conversation' => array_values($filteredConversation)
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
            
            // Get grade from request data
            $_GET['grade'] = $data['grade'] ?? null;  // Set grade in $_GET for createSession
            
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