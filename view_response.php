<?php
// Use full path to PHP executable
$php_path = 'E:/jay/Xampp/php/php.exe';
$script_path = __DIR__ . '/test_ai_integration.php';

// Create POST data
$postData = [
    'grade' => $_POST['grade'] ?? '',
    'subject' => $_POST['subject'] ?? '',
    'chapter' => $_POST['chapter'] ?? '',
    'questions' => $_POST['questions'] ?? '',
    'answerType' => $_POST['answerType'] ?? 'long', // default to long
    'userPrompt' => $_POST['userPrompt'] ?? ''
];

// Execute the script with POST data
$descriptorspec = array(
    0 => array("pipe", "r"),  // stdin
    1 => array("pipe", "w"),  // stdout
    2 => array("pipe", "w")   // stderr
);

$process = proc_open('"' . $php_path . '" "' . $script_path . '"', $descriptorspec, $pipes);

if (is_resource($process)) {
    // Write POST data to the script
    fwrite($pipes[0], json_encode($postData));
    fclose($pipes[0]);

    // Get the output
    $output = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    
    // Close pipes
    fclose($pipes[1]);
    fclose($pipes[2]);
    
    // Close process
    proc_close($process);

    // Debug logging
    error_log("Raw output from script: " . $output);
    if ($stderr) {
        error_log("stderr: " . $stderr);
    }

    // Try to decode JSON response
    $response = json_decode($output, true);
    if ($response === null) {
        error_log("JSON decode error: " . json_last_error_msg());
    }
}
?>

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
        <?php if (!isset($output) || $output === false): ?>
            <div class="error">
                <h3>Error: Failed to Execute Script</h3>
                <p>The script could not be executed. Please check the PHP path and permissions.</p>
            </div>
        <?php elseif ($response === null): ?>
            <div class="error">
                <h3>Error: Invalid JSON Response</h3>
                <p>The script output could not be parsed as JSON.</p>
                <?php if (isset($output)): ?>
                    <div class="debug-info">
                        <strong>Raw Output:</strong>
                        <?php echo htmlspecialchars($output); ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php elseif (isset($response['success']) && $response['success']): ?>
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
        <?php else: ?>
            <div class="error">
                <h3>Error in Processing</h3>
                <p><?php echo htmlspecialchars($response['error'] ?? 'Unknown error'); ?></p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html> 