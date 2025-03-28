<?php
header("Content-Type: application/json");
session_start();

// Get parameters
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';
$subject = isset($_GET['subject']) ? $_GET['subject'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';

// Check if only grade is provided (for "all questions" mode)
$allQuestionsMode = !empty($grade) && empty($subject) && empty($chapter);

// Regular mode requires all three parameters
if (!$allQuestionsMode && (empty($grade) || empty($subject) || empty($chapter))) {
    http_response_code(400);
    echo json_encode(['error' => 'Grade, subject, and chapter parameters are required unless requesting all questions']);
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

$questions = [];

if ($allQuestionsMode) {
    // "All questions" mode: Get all questions from all subjects/chapters for this grade
    $gradePath = $pdfRoot . $grade;
    error_log("All questions mode - Grade path: " . $gradePath);
    
    // Validate the grade path
    $realRoot = realpath($pdfRoot);
    $realGradePath = realpath($gradePath);

    if (!$realGradePath || strpos($realGradePath, $realRoot) !== 0) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid grade path', 'path_info' => [
            'document_root' => $_SERVER['DOCUMENT_ROOT'],
            'base_path' => $basePath,
            'full_path' => $pdfRoot,
            'grade_path' => $gradePath
        ]]);
        exit;
    }
    
    // Get all subjects
    if (is_dir($gradePath)) {
        $subjects = array_filter(glob($gradePath . '/*'), 'is_dir');
        
        // For each subject, get chapters
        foreach ($subjects as $subjectPath) {
            $subjectName = basename($subjectPath);
            $chapters = array_filter(glob($subjectPath . '/*'), 'is_dir');
            
            // For each chapter, get questions
            foreach ($chapters as $chapterPath) {
                $chapterName = basename($chapterPath);
                
                // Get MD files (preferred format)
                $mdFiles = glob($chapterPath . '/*.md');
                
                // Get PDF files (legacy format)
                $pdfFiles = glob($chapterPath . '/*.pdf');
                
                // Process both MD and PDF files
                foreach ($mdFiles as $file) {
                    $questionName = basename($file, '.md');
                    $questions[] = [
                        'question' => $questionName,
                        'subject' => $subjectName,
                        'chapter' => $chapterName
                    ];
                }
                
                // Process PDF files (but don't add duplicates)
                foreach ($pdfFiles as $file) {
                    $questionName = basename($file, '.pdf');
                    
                    // Check if we already have an MD version
                    $exists = false;
                    foreach ($questions as $q) {
                        if ($q['question'] === $questionName && 
                            $q['subject'] === $subjectName && 
                            $q['chapter'] === $chapterName) {
                            $exists = true;
                            break;
                        }
                    }
                    
                    if (!$exists) {
                        $questions[] = [
                            'question' => $questionName,
                            'subject' => $subjectName,
                            'chapter' => $chapterName
                        ];
                    }
                }
            }
        }
    }
} else {
    // Regular mode: Get questions for a specific chapter
    $chapterPath = $pdfRoot . $grade . '/' . $subject . '/' . $chapter;
    error_log("Chapter path: " . $chapterPath);
    
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

    if (is_dir($chapterPath)) {
        // First check for MD files (preferred format)
        $mdFiles = glob($chapterPath . '/*.md');
        
        // Also check for PDF files (legacy format)
        $pdfFiles = glob($chapterPath . '/*.pdf');
        
        // Process both MD and PDF files
        foreach ($mdFiles as $file) {
            // In regular mode, we just return question names
            $questions[] = basename($file, '.md');
        }
        
        // Process PDF files (but don't add duplicates)
        foreach ($pdfFiles as $file) {
            $baseName = basename($file, '.pdf');
            // Only add if we don't already have an MD version
            if (!in_array($baseName, $questions)) {
                $questions[] = $baseName;
            }
        }
    }
}

// Return the appropriate format based on the mode
if ($allQuestionsMode) {
    echo json_encode(['all_questions' => $questions]);
} else {
    echo json_encode(['questions' => $questions]);
}
?>
