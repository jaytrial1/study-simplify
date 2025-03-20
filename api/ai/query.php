<?php
require_once '../../lib/pdf_parser.php';
require_once '../../lib/ai_handler.php';
require_once '../../lib/config.php';
require_once '../../models/ChatHistory.php';

header('Content-Type: application/json');

try {
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
    
    // Determine if this is a new session
    $isNewSession = $data['isFirstMessage'];
    $responses = [];
    
    foreach ($data['questions'] as $question) {
        $prompt = null;
        
        if ($isNewSession) {
            // Extract PDF text and use template
            $result = $parser->extractText(
                $data['grade'],
                $data['subject'],
                $data['chapter'],
                $question
            );
            
            // Get template and create initial prompt
            $template = $aiHandler->getPromptTemplate($data['answerType'], $data['grade']);
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
        $aiResponse = $aiHandler->callGeminiAPI(
            $isNewSession ? $prompt : 
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
            ] : $aiHandler->createContinuationPrompt($previousMessages, $data['userPrompt']))
        );
        
        // Save messages to chat history
        if (isset($data['session_id'])) {
            $chatHistory->addMessage($data['session_id'], 'user', $data['userPrompt']);
            $chatHistory->addMessage($data['session_id'], 'ai', $aiResponse);
        }
        
        $responses[] = [
            'questionName' => $question,
            'text' => $aiResponse
        ];
    }
    
    echo json_encode([
        'success' => true,
        'responses' => $responses
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
