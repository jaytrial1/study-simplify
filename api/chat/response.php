<?php
require_once '../../lib/pdf_parser.php';
require_once '../../lib/ai_handler.php';
require_once '../../lib/config.php';

header('Content-Type: application/json');

try {
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        throw new Exception('Invalid request data');
    }
    
    // Validate required fields
    $required = ['grade', 'subject', 'chapter', 'questions', 'answerType', 'userPrompt'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Initialize handlers
    $parser = new PDFParser();
    $aiHandler = new AIHandler();
    
    // Extract text from PDF
    $result = $parser->extractText(
        $data['grade'],
        $data['subject'],
        $data['chapter'],
        $data['questions']
    );
    
    // Get appropriate template and create prompt
    $template = $aiHandler->getPromptTemplate($data['answerType']);
    $prompt = $aiHandler->createPrompt($template, [
        'extracted_text' => $result['text'],
        'user_prompt' => $data['userPrompt'],
        'question_name' => $data['questions']
    ]);
    
    // Get AI response
    $aiResponse = $aiHandler->callGeminiAPI($prompt);
    
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