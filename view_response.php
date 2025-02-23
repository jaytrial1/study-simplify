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
        /* Updated Base Styles */
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #374151;
        }

        .container {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            margin: 2rem auto;
        }

        /* Chat-style Content */
        .content {
            max-width: 800px;
            margin: 0 auto;
            padding: 1.5rem;
        }

        .message-block {
            background: #f9fafb;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            position: relative;
        }

        .message-block:before {
            content: '';
            position: absolute;
            left: -32px;
            top: 12px;
            width: 24px;
            height: 24px;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234b5563"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>');
        }

        /* Enhanced Content Elements */
        .step-by-step {
            background: #fff;
            border-left: 4px solid #3b82f6;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border-radius: 8px;
        }

        .key-point {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            padding: 1.5rem;
            margin: 1.5rem 0;
            border-radius: 8px;
            position: relative;
        }

        .key-point:before {
            content: '🔑';
            position: absolute;
            left: -1.5rem;
            top: -0.5rem;
            font-size: 1.5rem;
        }

        .code-block {
            background: #1e293b;
            color: #f8fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
        }

        .quote {
            border-left: 4px solid #94a3b8;
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            color: #64748b;
            font-style: italic;
        }

        /* Improved Typography */
        h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b;
            margin: 2rem 0 1rem;
        }

        h3 {
            font-size: 1.25rem;
            font-weight: 500;
            color: #1e293b;
            margin: 1.5rem 0 1rem;
        }

        /* Interactive Elements */
        .copy-button {
            position: absolute;
            right: 1rem;
            top: 1rem;
            background: #e2e8f0;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .copy-button:hover {
            background: #cbd5e1;
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
                    
                    // Convert markdown-style elements to HTML
                    $replacements = [
                        // Code blocks
                        '/```([a-z]*)\n(.*?)```/s' => '<div class="code-block">$2</div>',
                        
                        // Headers
                        '/^#### (.*?)$/m' => '<h4>$1</h4>',
                        '/^### (.*?)$/m' => '<h3>$1</h3>',
                        '/^## (.*?)$/m' => '<h2>$1</h2>',
                        
                        // Step-by-step
                        '/\*\*Step-by-Step Explanation:\*\*(.*?)(?=\*\*|$)/s' => 
                        '<div class="step-by-step"><h3>Step-by-Step Explanation</h3>$1</div>',
                        
                        // Key points
                        '/\*\*Key Points:\*\*(.*?)(?=\*\*|$)/s' => 
                        '<div class="key-point"><h3>Key Points</h3>$1</div>',
                        
                        // Quotes
                        '/^> (.*?)$/m' => '<div class="quote">$1</div>',
                        
                        // Lists
                        '/^\s*[-•]\s*(.*?)$/m' => '<li>$1</li>',
                        '/((?:<li>.*?<\/li>\s*)+)/' => '<ul>$1</ul>',
                        
                        // Bold text
                        '/\*\*(.*?)\*\*/' => '<strong>$1</strong>',
                        
                        // Links
                        '/\[(.*?)\]\((.*?)\)/' => '<a href="$2" class="text-blue-600 hover:underline">$1</a>'
                    ];

                    foreach ($replacements as $pattern => $replacement) {
                        $text = preg_replace($pattern, $replacement, $text);
                    }

                    // Final cleanup
                    $text = nl2br($text);
                    $text = '<div class="message-block">' . $text . '</div>';
                    
                    echo $text;
                ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html> 