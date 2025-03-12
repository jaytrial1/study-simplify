<?php
header("Content-Type: application/json");
session_start();

// Get parameters
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';
$subject = isset($_GET['subject']) ? $_GET['subject'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';

if (empty($grade) || empty($subject) || empty($chapter)) {
    http_response_code(400);
    echo json_encode(['error' => 'Grade, subject, and chapter parameters are required']);
    exit;
}

$pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
$chapterPath = $pdfRoot . $grade . '/' . $subject . '/' . $chapter;

// Validate the path
$realRoot = realpath($pdfRoot);
$realChapterPath = realpath($chapterPath);

if (!$realChapterPath || strpos($realChapterPath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$questions = [];
if (is_dir($chapterPath)) {
    // First check for MD files (preferred format)
    $mdFiles = glob($chapterPath . '/*.md');
    
    // Also check for PDF files (legacy format)
    $pdfFiles = glob($chapterPath . '/*.pdf');
    
    // Process both MD and PDF files
    foreach ($mdFiles as $file) {
        // Remove .md extension and add to array
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

echo json_encode(['questions' => $questions]);
?>
