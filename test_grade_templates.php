<?php
require_once 'lib/ai_handler.php';

// Initialize the AI handler
$aiHandler = new AIHandler();

// Test different grade formats
$grades = [
    'b.com',
    'B.Com',
    'B.com',
    'b.Com',
    'B Com',
    'b com',
    '11cbse',
    '11 CBSE',
    '11-CBSE',
    '12cbse',
    '12 CBSE',
    'unknown-grade' // Should fall back to default
];

echo "<h1>Grade Template Test</h1>";
echo "<pre>";

foreach ($grades as $grade) {
    echo "Testing grade: " . $grade . "\n";
    
    // For long template
    echo "  Long template: ";
    $template = $aiHandler->getPromptTemplate('long', $grade);
    $firstLine = strtok($template, "\n");
    echo substr($firstLine, 0, 50) . "...\n";
    
    // For short template
    echo "  Short template: ";
    $template = $aiHandler->getPromptTemplate('short', $grade);
    $firstLine = strtok($template, "\n");
    echo substr($firstLine, 0, 50) . "...\n";
    
    echo "\n";
}

echo "</pre>";
?> 