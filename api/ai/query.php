<?php
require_once '../../lib/pdf_parser.php';
require_once '../../lib/ai_handler.php';
require_once '../../lib/config.php';

header('Content-Type: application/json');

try {
    // Get POST data
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
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
    
    // Handle multiple questions if needed
    $questions = is_array($data['questions']) ? $data['questions'] : [$data['questions']];
    $responses = [];
    
    foreach ($questions as $question) {
        // Extract text from PDF
        $result = $parser->extractText(
            $data['grade'],
            $data['subject'],
            $data['chapter'],
            $question
        );
        
        // Get appropriate template
        $template = $aiHandler->getPromptTemplate($data['answerType']);
        
        // Create prompt
        $prompt = $aiHandler->createPrompt($template, [
            'extracted_text' => $result['text'],
            'user_prompt' => $data['userPrompt'],
            'question_name' => $question
        ]);
        
        // Get AI response
        $aiResponse = $aiHandler->callGeminiAPI($prompt);
        
        $responses[] = [
            'questionName' => $question,
            'text' => $aiResponse,
            'extractionInfo' => [
                'pages' => $result['pages'],
                'size' => $result['size'],
                'length' => strlen($result['text'])
            ]
        ];
    }
    
    // Return response
    http_response_code(API_SUCCESS);
    echo json_encode([
        'success' => true,
        'answerType' => $data['answerType'],
        'responses' => $responses
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Error in AI query: " . $e->getMessage());
    http_response_code(API_ERROR);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
