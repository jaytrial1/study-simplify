<?php
require_once 'lib/pdf_parser.php';

// Override the PDF root path for testing
class TestPDFParser extends PDFParser {
    public function __construct() {
        // Set absolute paths for testing
        $this->pdfRoot = 'E:/jay/Xampp/htdocs/Main/public/pdf_repository/';
        $this->pythonScript = 'E:/jay/Xampp/htdocs/Main/scripts/pdf_extract.py';
        
        // Validate paths
        if (!is_dir($this->pdfRoot)) {
            error_log("PDF root directory not found: " . $this->pdfRoot);
            throw new Exception("PDF repository directory not found");
        }
        
        if (!file_exists($this->pythonScript)) {
            error_log("Python script not found: " . $this->pythonScript);
            throw new Exception("Python extraction script not found");
        }
        
        error_log("Using PDF root: " . $this->pdfRoot);
        error_log("Using Python script: " . $this->pythonScript);
    }

    // Use parent's extractText method which uses Python script
    public function extractText($grade, $subject, $chapter, $questionName) {
        return parent::extractText($grade, $subject, $chapter, $questionName);
    }
}

// Gemini API configuration
$GEMINI_API_KEY = 'AIzaSyDdKHmIzLbGBKIX_j2DWm8Lg4Jqy4CihYo';
$GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite-preview-02-05:generateContent';

// Long answer prompt template
$LONG_PROMPT_TEMPLATE = <<<EOT
You are an EXPERT EXAM PREPARATION TUTOR, highly skilled in creating exam answers that earn TOP MARKS. Your ABSOLUTE GOAL is to help students understand, REMEMBER, and ultimately ACHIEVE the HIGHEST POSSIBLE SCORES on their exams.

QUESTION: {question_name}

Your task is to REWRITE and IMPROVE the textbook/study material into an EXCELLENT, HIGH-SCORING EXAM ANSWER FORMAT that is EASY TO LEARN and MEMORIZE.

Your rewritten answer MUST be specifically designed to impress an examiner and include the following ESSENTIAL elements to MAXIMIZE marks:

- *MAINTAIN ORIGINAL HEADERS:* IMPORTANT: You MUST use the EXACT SAME MAIN HEADERS and SUBHEADERS as provided in the student's textbook/study material. Do NOT change the headings.
    
- *COMPLETE CONTENT COVERAGE:* Ensure the answer FULLY covers ALL the information under each header and subheader. Do not miss any points.
    
- *KEYWORD INTEGRATION & EMPHASIS:* Identify and NATURALLY INTEGRATE all the MAIN KEYWORDS and TERMINOLOGY, highlighted in **bold**.
    
- *CLEAR AND SIMPLE EXPLANATIONS:* Explain all concepts in a VERY CLEAR, SIMPLE, and EASY-TO-UNDERSTAND way.
    
- *STRUCTURED FOR OPTIMAL LEARNING & MEMORIZATION:* ORGANIZE with clear HEADERS, SUBHEADERS, and BULLET POINTS. Structure information in a LOGICAL, STEP-BY-STEP manner.
    
- *MEMORY AIDS FOR QUICK RECALL:* Include "MEMORY TIP" for EACH MAIN POINT using practical techniques like acronyms, analogies, or examples.
    
- *CONCISE AND FOCUSED ON EXAM SUCCESS:* Be DIRECT and focus on information needed for a high-scoring answer.
    
- *14-MARK ANSWER DEPTH:* Ensure sufficient DETAIL for FULL MARKS on a 14-mark question.

Study Material:
{extracted_text}

Additional Instructions:
{user_prompt}
EOT;

// Short answer prompt template
$SHORT_PROMPT_TEMPLATE = <<<EOT
You are an EXPERT EXAM PREPARATION TUTOR. Create a CONCISE but COMPLETE answer suitable for a 4-MARK QUESTION.

Your task is to CONDENSE the given material into a CLEAR, MEMORABLE format that covers all KEY POINTS.

Key requirements:
- Keep it brief but comprehensive
- Highlight main keywords (in **bold**)
- Include 1-2 memory tips
- Use bullet points for clarity
- 4-mark answer depth

Study Material:
{extracted_text}

Additional Instructions:
{user_prompt}
EOT;

function callGeminiAPI($prompt, $apiKey) {
    global $GEMINI_API_URL;
    
    $data = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 1,
            'topP' => 0.95,
            'topK' => 64,
            'maxOutputTokens' => 8192
        ]
    ];

    $ch = curl_init($GEMINI_API_URL . '?key=' . $apiKey);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    // Add these SSL options
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);  // Disable SSL verification
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);  // Disable hostname verification
    
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("API Error: " . $error);
        throw new Exception("API Error: " . $error);
    }

    $responseData = json_decode($response, true);
    
    if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
        return $responseData['candidates'][0]['content']['parts'][0]['text'];
    } else {
        error_log("API Response: " . print_r($responseData, true));
        throw new Exception("Unexpected API response format");
    }
}

try {
    // Check if this is a direct script run or POST request
    if (php_sapi_name() === 'cli') {
        // For testing: Use sample data when run from command line
        $data = [
            'grade' => 'b.com',
            'subject' => 'Accountancy',
            'chapter' => 'Chapter1',
            'questions' => 'Question1',
            'answerType' => 'long',
            'userPrompt' => 'Please explain this in detail'
        ];
    } else {
        // Get POST data for normal web requests
        $rawData = file_get_contents('php://input');
        error_log("Received raw data: " . $rawData); // Debug log
        
        $data = json_decode($rawData, true);
        
        if (!$data) {
            throw new Exception('Invalid request data: ' . json_last_error_msg());
        }
    }
    
    // Validate required fields
    $required = ['grade', 'subject', 'chapter', 'questions', 'answerType', 'userPrompt'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $parser = new TestPDFParser();
    
    // Extract text from PDF
    $result = $parser->extractText(
        $data['grade'],
        $data['subject'],
        $data['chapter'],
        $data['questions']
    );
    
    // Select prompt template based on answer type
    $promptTemplate = ($data['answerType'] === 'long') ? $LONG_PROMPT_TEMPLATE : $SHORT_PROMPT_TEMPLATE;
    
    // Create final prompt
    $finalPrompt = str_replace(
        ['{extracted_text}', '{user_prompt}', '{question_name}'],
        [$result['text'], $data['userPrompt'], $data['questions']],
        $promptTemplate
    );

    // Call Gemini API
    $aiResponse = callGeminiAPI($finalPrompt, $GEMINI_API_KEY);
    
    // Output JSON response
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'text' => $aiResponse,
        'answerType' => $data['answerType'],
        'questionName' => $data['questions'],
        'extractionInfo' => [
            'pages' => $result['pages'],
            'size' => $result['size'],
            'length' => strlen($result['text'])
        ]
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Error occurred: " . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?> 