<?php
header("Content-Type: application/json");
$pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';

$grades = [];
if (is_dir($pdfRoot)) {
    $dirs = array_filter(glob($pdfRoot . '*'), 'is_dir');
    $realRoot = realpath($pdfRoot);

    if (!is_dir($realRoot)) {
        error_log("PDF repository not found at: " . $pdfRoot);
        http_response_code(500);
        die(json_encode(['error' => 'Server configuration error']));
    }

    foreach ($dirs as $dir) {
        if (strpos(realpath($dir), $realRoot) !== 0) {
            http_response_code(403);
            die(json_encode(['error' => 'Access denied']));
        }
        $grades[] = basename($dir);
    }
}

echo json_encode(['grades' => $grades]);
?> 