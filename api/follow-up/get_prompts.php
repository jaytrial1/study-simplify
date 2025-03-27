<?php
header('Content-Type: application/json');
session_start();

// Debugging
$debug = [];
$debug['request_time'] = date('Y-m-d H:i:s');

// Check if the user is logged in (either via session or query parameter)
$userId = $_SESSION['user_id'] ?? $_GET['user_id'] ?? null;
$debug['user_id'] = $userId;

if (!$userId) {
    echo json_encode(['error' => 'User not logged in', 'debug' => $debug]);
    exit;
}

// Directory containing follow-up templates
$followUpDir = __DIR__ . '/../ai/templates/follow up';
$debug['template_dir'] = $followUpDir;

// Check parent directory
$templatesDir = dirname($followUpDir);
if (!is_dir($templatesDir)) {
    $debug['templates_dir_exists'] = false;
    echo json_encode([
        'error' => 'Templates directory not found', 
        'debug' => $debug
    ]);
    exit;
}

// Check if directory exists and create it if not
if (!is_dir($followUpDir)) {
    $debug['dir_exists'] = false;
    $debug['parent_dir_contents'] = scandir($templatesDir);
    
    // Try to create the directory
    $dirCreated = mkdir($followUpDir, 0755, true);
    $debug['dir_created'] = $dirCreated;
    
    if (!$dirCreated) {
        echo json_encode([
            'error' => 'Failed to create follow-up templates directory', 
            'debug' => $debug
        ]);
        exit;
    }
    
    // If we created the directory, create sample templates
    $sampleTemplates = [
        'make it simple' => 'You are an expert tutor who helps students understand complex topics by breaking them down into simple concepts. Your task is to:

1. Simplify the previously provided explanation
2. Use simpler language and shorter sentences
3. Remove technical jargon when possible and replace with everyday terms
4. Break down complex ideas into step-by-step explanations
5. If there are math concepts, use very basic examples
6. Include a "Key Takeaway" section at the end with the 1-3 most important points

Make your response noticeably simpler than the previous one, but ensure all critical information is preserved.',

        'give examples' => 'You are an expert tutor who helps students understand concepts through practical examples. Your task is to:

1. Provide 2-4 practical, real-world examples that illustrate the concept
2. Make examples relatable to everyday student life when possible
3. Include at least one simple example and one more complex example
4. For each example, clearly explain how it connects to the original concept
5. If appropriate, include a numerical example (especially for math/science topics)
6. Use examples that are memorable and will help with exam recall

Make your examples concrete, specific, and directly relevant to the main concept.',

        'exam tips' => 'You are an expert exam coach who helps students score maximum marks. Your task is to:

1. Explain how the concept appears in exams (question types, mark allocation)
2. Provide 2-3 potential exam questions on this topic
3. Show a model answer outline for at least one of these questions
4. Highlight key terms examiners look for (use **bold** formatting)
5. Suggest memory techniques specifically for exam recall
6. Mention common mistakes students make on this topic in exams

Focus entirely on helping the student score well in exams on this topic.'
    ];
    
    foreach ($sampleTemplates as $name => $content) {
        $templateFile = $followUpDir . '/' . $name . '.php';
        $fileContent = "<?php\nreturn <<<EOT\n" . $content . "\nEOT;";
        file_put_contents($templateFile, $fileContent);
    }
    
    $debug['sample_templates_created'] = array_keys($sampleTemplates);
}

// Get all PHP files in the directory
$files = glob($followUpDir . '/*.php');
$debug['files_found'] = count($files);

if (empty($files)) {
    $debug['parent_dir_contents'] = scandir(dirname($followUpDir));
    echo json_encode([
        'error' => 'No template files found', 
        'debug' => $debug
    ]);
    exit;
}

$prompts = [];
foreach ($files as $file) {
    // Get the filename without path and extension
    $filename = basename($file, '.php');
    
    // Use the filename as the prompt title (clean it up for display)
    $title = ucfirst($filename);
    
    // Add to our prompts array
    $prompts[] = [
        'id' => $filename,
        'title' => $title
    ];
}

// Sort prompts alphabetically
usort($prompts, function($a, $b) {
    return strcmp($a['title'], $b['title']);
});

$debug['prompts_count'] = count($prompts);
echo json_encode([
    'prompts' => $prompts,
    'debug' => $debug
]); 