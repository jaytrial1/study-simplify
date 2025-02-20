<?php
header('Content-Type: application/json');
require_once '../../lib/pdf_parser.php';

try {
    // Get POST data
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Debug log
    error_log("Received extraction request: " . json_encode($data));
    
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
    
    // Debug log the paths
    $basePath = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
    $fullPath = $basePath . $data['grade'] . '/' . $data['subject'] . '/' . $data['chapter'] . '/';
    error_log("Looking for PDFs in: " . $fullPath);
    
    $parser = new PDFParser();
    
    // Handle both single question and array of questions
    $questions = is_array($data['questions']) ? $data['questions'] : [$data['questions']];
    $results = [];
    $successCount = 0;
    
    foreach ($questions as $question) {
        try {
            // Debug log each file attempt
            $pdfPath = $fullPath . $question . '.pdf';
            error_log("Attempting to read: " . $pdfPath);
            
            if (!file_exists($pdfPath)) {
                error_log("PDF not found: " . $pdfPath);
                continue;
            }
            
            $result = $parser->extractText(
                $data['grade'],
                $data['subject'],
                $data['chapter'],
                $question
            );
            
            $results[] = [
                'question' => $question,
                'text' => $result['text'],
                'pages' => $result['pages'],
                'size' => $result['size']
            ];
            $successCount++;
            
        } catch (Exception $e) {
            error_log("Error extracting from {$question}.pdf: " . $e->getMessage());
        }
    }
    
    if ($successCount === 0) {
        throw new Exception('Failed to extract text from any of the provided PDFs');
    }
    
    echo json_encode([
        'success' => true,
        'results' => $results
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
