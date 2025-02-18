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
    
    // Extract text using Python script
    $result = $parser->extractText(
        $data['grade'],
        $data['subject'],
        $data['chapter'],
        $data['questions']
    );
    
    // Debug info
    error_log("Extraction result: " . json_encode($result));
    
    echo json_encode([
        'success' => true,
        'text' => $result['text'],
        'pages' => $result['pages'],
        'size' => $result['size'],
        'count' => $result['count'] ?? 1,
        'length' => strlen($result['text'])
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Error in PDF extraction: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
