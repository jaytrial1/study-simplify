<?php
header("Content-Type: application/json");

// Detect environment
$isLocalServer = (
    $_SERVER['HTTP_HOST'] === 'localhost' || 
    $_SERVER['HTTP_HOST'] === '127.0.0.1' || 
    strpos($_SERVER['HTTP_HOST'], '192.168.') === 0 || 
    strpos($_SERVER['HTTP_HOST'], '10.0.') === 0
);

error_log("Server detection in grades.php: " . ($isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER"));

// Set the correct PDF repository path based on environment
if ($isLocalServer) {
    // Local path
    $pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/main/public/pdf_repository/';
} else {
    // Production path
    $pdfRoot = $_SERVER['DOCUMENT_ROOT'] . '/public/pdf_repository/';
}

error_log("PDF Repository path: " . $pdfRoot);

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
} else {
    error_log("Directory does not exist: " . $pdfRoot);
    http_response_code(500);
    die(json_encode(['error' => 'PDF repository directory not found', 'path' => $pdfRoot]));
}

echo json_encode(['grades' => $grades]);
?> 