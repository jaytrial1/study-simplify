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

$pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
$subjectPath = $pdfRoot . $grade . '/' . $subject;

// Validate the path
$realRoot = realpath($pdfRoot);
$realSubjectPath = realpath($subjectPath);

if (!$realSubjectPath || strpos($realSubjectPath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
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
