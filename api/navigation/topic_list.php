<?php
header("Content-Type: application/json");
session_start();

// Get parameters
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';
$subject = isset($_GET['subject']) ? $_GET['subject'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';

// All parameters are required
if (empty($grade) || empty($subject) || empty($chapter)) {
    http_response_code(400);
    echo json_encode(['error' => 'Grade, subject, and chapter parameters are required']);
    exit;
}

// Detect if we're on a local server
$isLocalServer = 
    $_SERVER['SERVER_NAME'] == 'localhost' || 
    $_SERVER['SERVER_NAME'] == '127.0.0.1' ||
    strpos($_SERVER['SERVER_NAME'], '192.168.') === 0 ||
    strpos($_SERVER['SERVER_NAME'], '10.0.') === 0;

// Set proper base path for PDF root
$basePath = $isLocalServer ? '/main' : '';
$pdfRoot = $_SERVER['DOCUMENT_ROOT'] . $basePath . '/public/pdf_repository/';

// Log paths for debugging
error_log("Server name: " . $_SERVER['SERVER_NAME']);
error_log("Is local server: " . ($isLocalServer ? "true" : "false"));
error_log("PDF root path: " . $pdfRoot);

// Define the path to the chapter directory
$chapterPath = $pdfRoot . $grade . '/' . $subject . '/' . $chapter;

// Validate the chapter path
$realRoot = realpath($pdfRoot);
$realChapterPath = realpath($chapterPath);

if (!$realChapterPath || strpos($realChapterPath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path', 'path_info' => [
        'document_root' => $_SERVER['DOCUMENT_ROOT'],
        'base_path' => $basePath,
        'full_path' => $pdfRoot,
        'chapter_path' => $chapterPath
    ]]);
    exit;
}

// Initialize the result array
$result = [
    'found' => false,
    'topics' => []
];

// Check if the chapter directory exists
if (is_dir($chapterPath)) {
    $result['found'] = true;
    
    // Get all markdown files in the chapter
    $mdFiles = glob($chapterPath . '/*.md');
    
    if (count($mdFiles) > 0) {
        foreach ($mdFiles as $mdFile) {
            // Skip topic_list.md if it exists
            if (basename($mdFile) === 'topic_list.md') {
                continue;
            }
            
            // Get the filename without extension
            $topicName = basename($mdFile, '.md');
            
            // Read the file content
            $content = file_get_contents($mdFile);
            $bulletPoints = [];
            
            if ($content !== false) {
                // Split the content into lines
                $lines = explode("\n", $content);
                
                foreach ($lines as $line) {
                    $line = trim($line);
                    
                    // Match headers (h1, h2, h3, h4)
                    if (preg_match('/^(#{1,4})\s+(.+)$/', $line, $matches)) {
                        $headerLevel = strlen($matches[1]) - 1; // 0 for h1, 1 for h2, etc.
                        $headerText = $matches[2];
                        
                        $bulletPoints[] = [
                            'text' => $headerText,
                            'level' => $headerLevel
                        ];
                    }
                }
                
                // Add to the result if we found headers
                $result['topics'][] = [
                    'name' => $topicName,
                    'bullets' => $bulletPoints
                ];
            }
        }
    }
}

// Return the result
echo json_encode($result);
?> 