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

$pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
$gradePath = $pdfRoot . $grade;

// Validate the path
$realRoot = realpath($pdfRoot);
$realGradePath = realpath($gradePath);

if (!$realGradePath || strpos($realGradePath, $realRoot) !== 0) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid grade']);
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
