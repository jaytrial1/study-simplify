<?php
require_once 'lib/pdf_parser.php';
require_once 'lib/ai_handler.php';
require_once 'lib/config.php';

// For testing: If no POST data, use sample data
if (empty($_POST)) {
    $_POST = [
        'grade' => 'b.com',
        'subject' => 'Accountancy',
        'chapter' => 'Chapter1',
        'questions' => 'Question1',
        'answerType' => 'long',
        'userPrompt' => 'Please explain this in detail'
    ];
}

// Create POST data with validation
$postData = [];
$required = ['grade', 'subject', 'chapter', 'questions', 'answerType', 'userPrompt'];

// Validate and sanitize each field
foreach ($required as $field) {
    if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
        throw new Exception("Missing or empty field: $field");
    }
    $postData[$field] = trim($_POST[$field]);
}

try {
    // Initialize handlers
    $parser = new PDFParser();
    $aiHandler = new AIHandler();
    
    // Log the path being accessed
    error_log("Attempting to access PDF for: " . 
              "Grade: {$postData['grade']}, " .
              "Subject: {$postData['subject']}, " .
              "Chapter: {$postData['chapter']}, " .
              "Question: {$postData['questions']}");
    
    // Extract text from PDF
    $result = $parser->extractText(
        $postData['grade'],
        $postData['subject'],
        $postData['chapter'],
        $postData['questions']
    );
    
    // Get appropriate template
    $template = $aiHandler->getPromptTemplate($postData['answerType']);
    
    // Create prompt
    $prompt = $aiHandler->createPrompt($template, [
        'extracted_text' => $result['text'],
        'user_prompt' => $postData['userPrompt'],
        'question_name' => $postData['questions']
    ]);
    
    // Get AI response
    $aiResponse = $aiHandler->callGeminiAPI($prompt);
    
    // Create response object
    $response = [
        'success' => true,
        'text' => $aiResponse,
        'answerType' => $postData['answerType'],
        'questionName' => $postData['questions'],
        'extractionInfo' => [
            'pages' => $result['pages'],
            'size' => $result['size'],
            'length' => strlen($result['text'])
        ]
    ];

} catch (Exception $e) {
    error_log("Error in processing: " . $e->getMessage());
    $response = [
        'success' => false,
        'error' => $e->getMessage()
    ];
}

// Keep the existing HTML template
?>

<!DOCTYPE html>
<html>
<head>
    <title>Test AI Response</title>
</head>
<body>
    <form method="POST" action="">
        <div>
            <label>Grade:</label>
            <input type="text" name="grade" value="b.com">
        </div>
        <div>
            <label>Subject:</label>
            <input type="text" name="subject" value="Accountancy">
        </div>
        <div>
            <label>Chapter:</label>
            <input type="text" name="chapter" value="Chapter1">
        </div>
        <div>
            <label>Question:</label>
            <input type="text" name="questions" value="Question1">
        </div>
        <div>
            <label>Answer Type:</label>
            <select name="answerType">
                <option value="long">Long</option>
                <option value="short">Short</option>
            </select>
        </div>
        <div>
            <label>Additional Instructions:</label>
            <textarea name="userPrompt">Please explain this in detail</textarea>
        </div>
        <button type="submit">Get Answer</button>
    </form>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
    <title>AI Study Material</title>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            line-height: 1.8;
            padding: 30px;
            background: #f5f7fa;
            color: #2c3e50;
        }
        
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 2px 15px rgba(0,0,0,0.05);
        }

        h1, h2, h3 { 
            color: #2c3e50;
            margin-top: 2em;
            font-weight: 600;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }

        h1 { font-size: 2.2em; }
        h2 { font-size: 1.8em; }
        h3 { font-size: 1.4em; }

        .memory-tip { 
            background: #f8f9ff;
            padding: 20px;
            border-left: 4px solid #4a90e2;
            margin: 15px 0;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(74,144,226,0.1);
        }

        .memory-tip strong {
            color: #4a90e2;
            display: block;
            margin-bottom: 8px;
        }

        .keyword {
            color: #2980b9;
            font-weight: 600;
        }

        ul { 
            padding-left: 25px;
            margin: 15px 0;
        }

        ul ul {
            margin: 10px 0 10px 20px;
        }

        li {
            margin: 12px 0;
            line-height: 1.6;
        }

        .extraction-info {
            background: #e9ecef;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            font-size: 0.9em;
        }

        .error {
            background: #ffe8e8;
            color: #d63031;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #d63031;
        }

        .sub-section {
            margin-left: 20px;
            padding-left: 15px;
            border-left: 2px solid #eee;
        }

        .explanation {
            color: #34495e;
            margin: 10px 0;
        }

        .example {
            color: #16a085;
            font-style: italic;
            margin: 8px 0;
        }

        .question-info {
            background: #f1f8ff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #2980b9;
        }
        
        .question-info h1 {
            margin-top: 0;
            color: #2980b9;
            font-size: 1.8em;
        }
        
        .answer-type {
            color: #666;
            font-style: italic;
            margin: 5px 0 0 0;
        }

        .debug-info {
            background: #f8f9fa;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if (!isset($response)): ?>
            <div class="error">
                <h3>Error: Failed to Process Request</h3>
                <p>The request could not be processed. Please check your input data.</p>
            </div>
        <?php elseif (!$response['success']): ?>
            <div class="error">
                <h3>Error in Processing</h3>
                <p><?php echo htmlspecialchars($response['error'] ?? 'Unknown error'); ?></p>
            </div>
        <?php else: ?>
            <div class="question-info">
                <h1>Question: <?php echo htmlspecialchars($response['questionName'] ?? 'Unknown'); ?></h1>
                <p class="answer-type">Answer Type: <?php echo ucfirst(htmlspecialchars($response['answerType'] ?? 'Unknown')); ?> Answer Format</p>
            </div>

            <?php if (isset($response['extractionInfo'])): ?>
                <div class="extraction-info">
                    <h3>Document Information</h3>
                    <ul>
                        <li>Pages: <?php echo $response['extractionInfo']['pages']; ?></li>
                        <li>File size: <?php echo number_format($response['extractionInfo']['size'] / 1024, 2); ?> KB</li>
                        <li>Content length: <?php echo number_format($response['extractionInfo']['length']); ?> characters</li>
                    </ul>
                </div>
            <?php endif; ?>
            
            <div class="content">
                <?php 
                    $text = $response['text'];
                    
                    // Headers with better hierarchy
                    $text = preg_replace('/^### (.*?)$/m', '<h3>$1</h3>', $text);
                    $text = preg_replace('/^## (.*?)$/m', '<h2>$1</h2>', $text);
                    
                    // Memory Tips with improved styling
                    $text = preg_replace(
                        '/\*\*Memory Tip:\*\*(.*?)(?=\*\*|$)/s',
                        '<div class="memory-tip"><strong>💡 Memory Tip:</strong>$1</div>',
                        $text
                    );
                    
                    // Improved bullet lists
                    $text = preg_replace('/^\s*[-•]\s*(.*?)$/m', '<li>$1</li>', $text);
                    $text = preg_replace('/((?:<li>.*?<\/li>\s*)+)/', '<ul>$1</ul>', $text);
                    
                    // Keywords with special styling
                    $text = preg_replace('/\*\*(.*?)\*\*/', '<span class="keyword">$1</span>', $text);
                    
                    // Sub-sections
                    $text = preg_replace(
                        '/(\*\*Sub-Factors:\*\*.*?)(?=\*\*|$)/s',
                        '<div class="sub-section">$1</div>',
                        $text
                    );
                    
                    // Examples with special styling
                    $text = preg_replace(
                        '/\*\*Example:\*\*(.*?)(?=\*\*|$)/s',
                        '<div class="example">📝 Example:$1</div>',
                        $text
                    );
                    
                    // Line Breaks
                    $text = nl2br($text);
                    
                    echo $text;
                ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html> 