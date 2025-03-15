<?php
header("Content-Type: application/json");
session_start();

// Get parameters
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';
$subject = isset($_GET['subject']) ? $_GET['subject'] : '';

if (empty($grade) || empty($subject)) {
    http_response_code(400);
    echo json_encode(['error' => 'Grade and subject parameters are required']);
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
$subjectPath = $pdfRoot . $grade . '/' . $subject;

// Log paths for debugging
error_log("Server name: " . $_SERVER['SERVER_NAME']);
error_log("Is local server: " . ($isLocalServer ? "true" : "false"));
error_log("PDF root path: " . $pdfRoot);
error_log("Subject path: " . $subjectPath);

// Validate the path
$realRoot = realpath($pdfRoot);
$realSubjectPath = realpath($subjectPath);

if (!$realSubjectPath || strpos($realSubjectPath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path', 'path_info' => [
        'document_root' => $_SERVER['DOCUMENT_ROOT'],
        'base_path' => $basePath,
        'full_path' => $pdfRoot,
        'subject_path' => $subjectPath
    ]]);
    exit;
}

$chapters = [];
if (is_dir($subjectPath)) {
    $dirs = array_filter(glob($subjectPath . '/*'), 'is_dir');
    foreach ($dirs as $dir) {
        $chapters[] = basename($dir);
    }
}

echo json_encode(['chapters' => $chapters]);
?>
