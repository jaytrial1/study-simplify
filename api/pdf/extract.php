<?php
header('Content-Type: application/json');
require_once '../../lib/pdf_parser.php';

try {
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        throw new Exception('Invalid request data');
    }
    
    // Validate required fields
    $required = ['grade', 'subject', 'chapter', 'questions'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $parser = new PDFParser();
    
    // Handle single or multiple questions
    if (is_array($data['questions'])) {
        $text = $parser->extractMultipleTexts(
            $data['grade'],
            $data['subject'],
            $data['chapter'],
            $data['questions']
        );
    } else {
        $text = $parser->extractText(
            $data['grade'],
            $data['subject'],
            $data['chapter'],
            $data['questions']
        );
    }
    
    echo json_encode([
        'success' => true,
        'text' => $text
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
