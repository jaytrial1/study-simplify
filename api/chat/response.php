<?php
require_once '../../lib/pdf_parser.php';
require_once '../../lib/ai_handler.php';
require_once '../../lib/config.php';
require_once '../../models/ChatHistory.php';

header('Content-Type: application/json');

try {
    // Get POST data
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
        error_log("Previous Messages Count: " . count($previousMessages));
    }
    
    // Determine if this is a new session
    $isNewSession = !isset($data['session_id']) || empty($previousMessages);
    error_log("Is New Session: " . ($isNewSession ? 'yes' : 'no'));

    $prompt = '';
    if ($isNewSession) {
        // Only for new sessions: Extract PDF text and use template
        error_log("New session: Extracting PDF text and using template");
        $result = $parser->extractText(
            $data['grade'],
            $data['subject'],
            $data['chapter'],
            $data['questions']
        );
        
        $template = $aiHandler->getPromptTemplate($data['answerType']);
        $prompt = $aiHandler->createPrompt($template, [
            'extracted_text' => $result['text'],
            'user_prompt' => $data['userPrompt'],
            'question_name' => $data['questions']
        ]);
    } else {
        // For continuing conversations: Just use chat history
        error_log("Continuing conversation: Using only chat history");
        $prompt = $aiHandler->createContinuationPrompt($previousMessages, $data['userPrompt']);
    }
    
    // Get AI response
    $aiResponse = $aiHandler->callGeminiAPI($prompt);
    
    // After getting AI response, save to chat history
    if (isset($data['session_id'])) {
        $chatHistory = new ChatHistory();
        
        // Save user's question
        $chatHistory->addMessage(
            $data['session_id'],
            'user',
            $data['userPrompt']
        );
        
        // Save AI's response
        $chatHistory->addMessage(
            $data['session_id'],
            'ai',
            $aiResponse
        );
    }
    
    echo json_encode([
        'success' => true,
        'response' => $aiResponse,
        'metadata' => [
            'question' => $data['questions'],
            'answerType' => $data['answerType'],
            'extractionInfo' => [
                'pages' => $result['pages'],
                'size' => $result['size']
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 