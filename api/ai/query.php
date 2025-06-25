<?php
// ===== START OF SCRIPT DEBUG LOGGING & CONFIG =====
// Force errors to be logged
ini_set('log_errors', 1);
// Force logging to a specific file in this directory
ini_set('error_log', __DIR__ . '/error_log.txt'); 

error_log("====== query.php script execution started ======");
error_log("Timestamp: " . date('Y-m-d H:i:s'));
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request URI: " . $_SERVER['REQUEST_URI']);
error_log("Auth Header (Server Var): " . (isset($_SERVER['HTTP_AUTHORIZATION']) ? 'Present' : 'MISSING'));
error_log("Auth Header (Redirect Var): " . (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? 'Present' : 'MISSING'));

// Check include paths
$config_path = '../../lib/config.php';
$handler_path = '../../lib/ai_handler.php';
error_log("Checking include: {$config_path} - Exists: " . (file_exists($config_path) ? 'Yes' : 'NO'));
error_log("Checking include: {$handler_path} - Exists: " . (file_exists($handler_path) ? 'Yes' : 'NO'));
// ===== END OF SCRIPT DEBUG LOGGING =====

require_once '../../lib/pdf_parser.php';
require_once '../../lib/ai_handler.php';
require_once '../../lib/config.php';
require_once '../../models/ChatHistory.php';
require_once 'handle_follow_up.php'; // Include the follow-up handler

header('Content-Type: application/json');

try {
    // Check for Authorization header
    $authHeader = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        // Sometimes Apache puts it in a different variable
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) {
            $authHeader = $requestHeaders['Authorization'];
        }
    }
    
    // Simplified token check for development purposes
    // In production, you should validate the token properly
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        throw new Exception('No auth credentials found');
    }
    
    $token = $matches[1];
    // For local development, we'll accept any non-empty token
    // In production, validate the token properly
    if (empty($token)) {
        throw new Exception('Invalid token');
    }
    
    // Process the request data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        throw new Exception('Invalid request data');
    }
    
    // Initialize handlers
    $parser = new PDFParser();
    $aiHandler = new AIHandler();
    $chatHistory = new ChatHistory();
    
    // Get previous messages if session exists
    $previousMessages = [];
    if (isset($data['session_id'])) {
        $previousMessages = $chatHistory->getSessionMessages($data['session_id']);
        error_log("Retrieved messages for session " . $data['session_id'] . ": " . json_encode($previousMessages));
    }
    
    // Check if this is a follow-up request
    $followUpPromptId = null;
    $isFollowUp = false;
    if (isset($data['userPrompt'])) {
        $followUpPromptId = isFollowUpRequest($data['userPrompt']);
        if ($followUpPromptId !== false) {
            $isFollowUp = true;
            error_log("Detected follow-up request: " . $followUpPromptId);
        }
    }
    
    // If it's a follow-up, we need the previous AI response
    $previousAiResponse = '';
    if ($isFollowUp && !empty($previousMessages)) {
        // Find the last AI message
        for ($i = count($previousMessages) - 1; $i >= 0; $i--) {
            if ($previousMessages[$i]['sender'] === 'ai') {
                $previousAiResponse = $previousMessages[$i]['message'];
                break;
            }
        }
    }
    
    // Determine if this is a new session
    $isNewSession = $data['isFirstMessage'];
    $responses = [];
    
    foreach ($data['questions'] as $question) {
        $prompt = null;
        $debugLog = []; // Initialize debug log for this question
        
        if ($isFollowUp) {
            // Load the follow-up template and pass the previous response
            $followUpTemplate = loadFollowUpTemplate($followUpPromptId, $previousAiResponse);
            if (!$followUpTemplate) {
                throw new Exception("Follow-up template not found: " . $followUpPromptId);
            }
            $prompt = $followUpTemplate;
            
            // Update the user message for chat history
            $data['userPrompt'] = "Follow-up question: " . str_replace('_', ' ', $followUpPromptId);
        }
        else if ($isNewSession) {
            // Extract PDF text and use template
            $result = $parser->extractText(
                $data['grade'],
                $data['subject'],
                $data['chapter'],
                $question
            );
            
            // Add debugging for subject
            error_log("QUERY DEBUG - About to call getPromptTemplate");
            error_log("QUERY DEBUG - Grade: '{$data['grade']}', Subject: '{$data['subject']}', Answer Type: '{$data['answerType']}'");
            
            // Get template and create initial prompt
            $template = $aiHandler->getPromptTemplate($data['answerType'], $data['grade'], $data['subject']);
            $initialPrompt = $aiHandler->createPrompt($template, [
                'extracted_text' => $result['text'],
                'user_prompt' => $data['userPrompt'],
                'question_name' => $question
            ]);
            
            if (isset($data['session_id'])) {
                // Simply store the exact prompt we're sending to AI
                $chatHistory->addMessage(
                    $data['session_id'],
                    'system',
                    $initialPrompt
                );
            }
            
            $prompt = $initialPrompt;
        }
        
        // Get AI response with chat history context
        $handlerResponse = $aiHandler->callGeminiAPI(
            $isFollowUp ? $prompt :
            ($isNewSession ? $prompt : 
            ($aiHandler->model === 'gemini' ? [
                'messages' => array_merge(
                    array_map(function($msg) {
                        return [
                            'role' => ($msg['sender'] === 'user' ? 'user' : 'model'),
                            'parts' => [['text' => $msg['message']]]
                        ];
                    }, $previousMessages),
                    [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $data['userPrompt']]]
                        ]
                    ]
                )
            ] : $aiHandler->createContinuationPrompt($previousMessages, $data['userPrompt'])))
        );
        
        // Extract result, error, and debug log from the handler response
        $aiResponseText = null;
        $currentDebugLog = isset($handlerResponse['debug_log']) ? $handlerResponse['debug_log'] : null;
        $shouldSaveAiResponse = true; // Flag to control saving

        if (isset($handlerResponse['success']) && $handlerResponse['success']) {
            $aiResponseText = $handlerResponse['result'];
        } else {
            // This is the critical failure condition where all API keys failed.
            $errorMsg = isset($handlerResponse['error']) ? $handlerResponse['error'] : 'Unknown error from AI Handler';
            error_log("AI Handler failed for question '{$question}': " . $errorMsg);
            
            // Set user-friendly message and prevent saving
            $aiResponseText = "Sorry, our AI service is temporarily unavailable. Please try again later.";
            $shouldSaveAiResponse = false;

            // We might still want to add the error message to the debug log for the client
            if ($currentDebugLog === null) {
                $currentDebugLog = [];
            }
            $currentDebugLog[] = "ERROR: " . $errorMsg;
        }

        // Ensure we always have a string response (should be redundant now but safe)
        if ($aiResponseText === null) {
            $aiResponseText = "Sorry, couldn't get a response.";
            $shouldSaveAiResponse = false; // Don't save null responses
            if ($currentDebugLog === null) {
                $currentDebugLog = [];
            }
            $currentDebugLog[] = "Error: AI response text was null after processing.";
        }
        
        // Save messages to chat history
        if (isset($data['session_id'])) {
            $chatHistory->addMessage($data['session_id'], 'user', $data['userPrompt']);
            
            // Only save the AI response if the flag is true
            if ($shouldSaveAiResponse) {
                $chatHistory->addMessage($data['session_id'], 'ai', $aiResponseText);
            }
        }
        
        // Add to the responses array, including the debug log only if it exists
        $responseItem = [
            'questionName' => $question,
            'text' => $aiResponseText, // Use the extracted/constructed text
            'isFollowUp' => $isFollowUp,
        ];
        
        // Only include debug_log if it's not null
        if ($currentDebugLog !== null) {
            $responseItem['debug_log'] = $currentDebugLog;
        }
        
        $responses[] = $responseItem;
    }
    
    // Final JSON output
    echo json_encode([
        'success' => true, // Keep overall success true if the script ran, error is in the text
        'responses' => $responses
    ]);

} catch (Exception $e) {
    http_response_code(500);
    // Create error response item
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage(),
    ];
    
    // Include debug_log only if it's enabled
    if (defined('ENABLE_API_LOGGING') && ENABLE_API_LOGGING) {
        // Include a basic debug log even in the catch block if possible
        $finalDebugLog = isset($currentDebugLog) ? $currentDebugLog : [];
        $finalDebugLog[] = "FATAL ERROR in query.php: " . $e->getMessage();
        
        $errorResponse['responses'] = [[ 
            'text' => "Fatal error: " . $e->getMessage(),
            'debug_log' => $finalDebugLog
        ]];
    } else {
        $errorResponse['responses'] = [[ 
            'text' => "Fatal error: " . $e->getMessage()
        ]];
    }
    
    echo json_encode($errorResponse);
}
