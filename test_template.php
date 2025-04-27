<?php
require_once 'lib/config.php';
require_once 'lib/ai_handler.php';

// Enable all error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "Testing template selection for practical subjects...\n";

// Create a handler
$handler = new AIHandler();

// Test with different subjects
$testCases = [
    [
        'grade' => 'bcom',
        'subject' => 'accountancy (practical)',
        'type' => 'long'
    ],
    [
        'grade' => 'bcom',
        'subject' => 'Accountancy (practical)',  // Different case
        'type' => 'long'
    ],
    [
        'grade' => 'bcom',
        'subject' => 'accountancy(practical)',   // No space
        'type' => 'long'
    ]
];

// Run tests
foreach ($testCases as $i => $case) {
    echo "\nTest #" . ($i+1) . ":\n";
    echo "Grade: " . $case['grade'] . "\n";
    echo "Subject: " . $case['subject'] . "\n";
    echo "Type: " . $case['type'] . "\n";
    
    try {
        $template = $handler->getPromptTemplate($case['type'], $case['grade'], $case['subject']);
        echo "TEMPLATE FOUND! First few characters: " . substr($template, 0, 50) . "...\n";
    } catch (Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
}

echo "\nDone testing!\n"; 