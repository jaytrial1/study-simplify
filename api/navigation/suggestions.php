<?php
header("Content-Type: application/json");
session_start();

// Get parameters
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';
$subject = isset($_GET['subject']) ? $_GET['subject'] : '';
$chapter = isset($_GET['chapter']) ? $_GET['chapter'] : '';
$search = isset($_GET['search']) ? $_GET['search'] : '';

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
    $files = glob($chapterPath . '/*.pdf');
    foreach ($files as $file) {
        $question = basename($file, '.pdf');
        if (empty($search) || stripos($question, $search) !== false) {
            $questions[] = $question;
        }
    }
}

echo json_encode(['questions' => $questions]);
?> 