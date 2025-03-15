<?php
header("Content-Type: application/json");
session_start();

// Get grade from query parameter
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';

if (empty($grade)) {
    http_response_code(400);
    echo json_encode(['error' => 'Grade parameter is required']);
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
$gradePath = $pdfRoot . $grade;

// Log paths for debugging
error_log("Server name: " . $_SERVER['SERVER_NAME']);
error_log("Is local server: " . ($isLocalServer ? "true" : "false"));
error_log("PDF root path: " . $pdfRoot);
error_log("Grade path: " . $gradePath);

// Validate the path
$realRoot = realpath($pdfRoot);
$realGradePath = realpath($gradePath);

if (!$realGradePath || strpos($realGradePath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid grade', 'path_info' => [
        'document_root' => $_SERVER['DOCUMENT_ROOT'],
        'base_path' => $basePath,
        'full_path' => $pdfRoot,
        'grade_path' => $gradePath
    ]]);
    exit;
}

$subjects = [];
if (is_dir($gradePath)) {
    $dirs = array_filter(glob($gradePath . '/*'), 'is_dir');
    foreach ($dirs as $dir) {
        $subjects[] = basename($dir);
    }
}

echo json_encode(['subjects' => $subjects]);
?>
