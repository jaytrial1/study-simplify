<?php
// --- Error Handling Setup ---
ini_set('display_errors', 0); // Don't display errors in output (breaks JSON)
ini_set('log_errors', 1);    // Log errors to the server's error log
error_reporting(E_ALL);     // Report all errors

// Custom error log in project folder
$projectLogFile = __DIR__ . '/../../logs/api_errors.log';
$logDir = dirname($projectLogFile);
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Custom logging function
function log_to_file($message) {
    global $projectLogFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message" . PHP_EOL;
    file_put_contents($projectLogFile, $logMessage, FILE_APPEND);
}

log_to_file("[save_config.php] Script started. Request method: " . $_SERVER['REQUEST_METHOD']);

require_once '../../lib/auth_check.php'; // Ensure admin auth is checked first!

header('Content-Type: application/json');

// Check if the request method is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    log_to_file("[save_config.php] Error: Invalid request method: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit;
}

// Authenticate the admin user (Handled by auth_check.php)
try {
    // Example: $adminUser = require_auth();
    log_to_file("[save_config.php] Authentication check passed");
} catch (Exception $e) {
    log_to_file("[save_config.php] Authentication failed: " . $e->getMessage());
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'error' => 'Unauthorized: ' . $e->getMessage()]);
    exit;
}

// Get the input data
$rawInput = file_get_contents('php://input');
log_to_file("[save_config.php] Received raw input: " . substr($rawInput, 0, 200) . "...");

$inputData = json_decode($rawInput, true);

if (json_last_error() !== JSON_ERROR_NONE || !$inputData) {
    log_to_file("[save_config.php] JSON decode error: " . json_last_error_msg());
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data received: ' . json_last_error_msg()]);
    exit;
}

log_to_file("[save_config.php] Parsed input data: " . json_encode(array_keys($inputData)));

// --- Basic Validation ---
$allowedModels = ['gemini', 'deepseek'];
if (!isset($inputData['ai_model']) || !in_array($inputData['ai_model'], $allowedModels)) {
    log_to_file("[save_config.php] Invalid model selected: " . ($inputData['ai_model'] ?? 'Not Set'));
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid AI model selected.']);
    exit;
}

// Add more validation for keys, URL, model names if needed (e.g., check format)

// --- Prepare data ---
$newAiModel = $inputData['ai_model'];
$newEnableLogging = isset($inputData['enable_logging']) ? (bool)$inputData['enable_logging'] : false;
$newGeminiKeysFree = $inputData['gemini_keys']['free'] ?? [];
$newGeminiKeysPaid = $inputData['gemini_keys']['paid'] ?? [];
$newDeepseekKeysFree = $inputData['deepseek_keys']['free'] ?? [];
$newDeepseekKeysPaid = $inputData['deepseek_keys']['paid'] ?? [];
$newDeepseekApiUrl = $inputData['deepseek_api_url'] ?? '';
$newDeepseekModelName = $inputData['deepseek_model_name'] ?? '';
// Add support for Gemini URL/Model
$newGeminiApiUrl = $inputData['gemini_api_url'] ?? ''; 
$newGeminiModelName = $inputData['gemini_model_name'] ?? '';

log_to_file("[save_config.php] Extracted configuration values successfully");

// --- File Paths and Permissions Check ---
$configFilePath = realpath(__DIR__ . '/../../lib/config.php'); // Get absolute path

if (!$configFilePath) {
    log_to_file("[save_config.php] Error: Config file path could not be resolved");
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Config file path could not be resolved.']);
    exit;
}

if (!is_writable($configFilePath)) {
    log_to_file("[save_config.php] Error: Config file is not writable: " . $configFilePath);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Config file is not writable by the server. Check permissions.']);
    exit;
}

log_to_file("[save_config.php] Config file path verified and writable: " . $configFilePath);

// --- Function to format PHP array string ---
function format_php_array_string(array $keys, $indent = '    ') {
    if (empty($keys)) {
        return '[]';
    }
    $output = "[\n";
    foreach ($keys as $key) {
        // Basic escaping for single quotes within the key
        $escapedKey = addcslashes($key, "'\\"); 
        $output .= $indent . $indent . "'" . $escapedKey . "',\n";
    }
    $output .= $indent . ']';
    return $output;
}

// --- Read and Modify Config File ---
try {
    $configContent = file_get_contents($configFilePath);
    if ($configContent === false) {
        throw new Exception('Could not read config file content.');
    }
    log_to_file("[save_config.php] Successfully read config file content");

    // 1. Replace AI_MODEL definition
    $newModelDefinition = "define('AI_MODEL', '{$newAiModel}');";
    $configContent = preg_replace(
        '/(define\(\s*[\'|"]AI_MODEL[\'|"]\s*,\s*[\'|"].*?[\'|"]\s*\);)/i',
        $newModelDefinition,
        $configContent,
        1 // Replace only once
    );
    log_to_file("[save_config.php] Updated AI_MODEL: {$newAiModel}");

    // 1.1 Replace ENABLE_API_LOGGING definition
    $loggingValue = $newEnableLogging ? 'true' : 'false';
    $newLoggingDefinition = "define('ENABLE_API_LOGGING', {$loggingValue});";
    $configContent = preg_replace(
        '/(define\(\s*[\'|"]ENABLE_API_LOGGING[\'|"]\s*,\s*(true|false)\s*\);)/i',
        $newLoggingDefinition,
        $configContent,
        1 // Replace only once
    );
    log_to_file("[save_config.php] Updated ENABLE_API_LOGGING: {$loggingValue}");

    // 2. Replace GEMINI_KEYS definition
    $newGeminiKeysArrayString = "[\n";
    if (!empty($newGeminiKeysFree)) {
        $newGeminiKeysArrayString .= "        // Free tier keys\n";
        foreach ($newGeminiKeysFree as $key) {
            $escapedKey = addcslashes($key, "'\\");
            $newGeminiKeysArrayString .= "        '{$escapedKey}',\n";
        }
    }
    if (!empty($newGeminiKeysPaid)) {
        $newGeminiKeysArrayString .= "        // Paid tier key (last resort)\n";
        foreach ($newGeminiKeysPaid as $key) {
            $escapedKey = addcslashes($key, "'\\");
            $newGeminiKeysArrayString .= "        '{$escapedKey}',\n";
        }
    }
     // Remove trailing comma if exists before closing bracket
     if (substr($newGeminiKeysArrayString, -2) === ",\n") {
         $newGeminiKeysArrayString = substr($newGeminiKeysArrayString, 0, -2) . "\n";
     }
    $newGeminiKeysArrayString .= "    ]";
    $newGeminiKeysDefinition = "define('GEMINI_KEYS', " . $newGeminiKeysArrayString . ");";
    $configContent = preg_replace(
        '/(define\(\s*[\'|"]GEMINI_KEYS[\'|"]\s*,\s*\[.*?\]\s*\);)/is', // Use /s for multiline
        $newGeminiKeysDefinition,
        $configContent,
        1
    );
    log_to_file("[save_config.php] Updated GEMINI_KEYS: " . count($newGeminiKeysFree) . " free, " . count($newGeminiKeysPaid) . " paid");

    // 3. Replace DEEPSEEK_KEYS definition
    $newDeepseekKeysArrayString = "[\n";
     if (!empty($newDeepseekKeysFree)) {
        $newDeepseekKeysArrayString .= "        // Free tier keys - Ensure the format is correct (should start with sk-or-v1-)\n";
        foreach ($newDeepseekKeysFree as $key) {
            $escapedKey = addcslashes($key, "'\\");
            $newDeepseekKeysArrayString .= "        '{$escapedKey}',\n";
        }
    }
    if (!empty($newDeepseekKeysPaid)) {
        $newDeepseekKeysArrayString .= "        // Paid tier key (last resort)\n";
        foreach ($newDeepseekKeysPaid as $key) {
            $escapedKey = addcslashes($key, "'\\");
            $newDeepseekKeysArrayString .= "        '{$escapedKey}',\n";
        }
    }
     // Remove trailing comma
     if (substr($newDeepseekKeysArrayString, -2) === ",\n") {
         $newDeepseekKeysArrayString = substr($newDeepseekKeysArrayString, 0, -2) . "\n";
     }
    $newDeepseekKeysArrayString .= "    ]";
    $newDeepseekKeysDefinition = "define('DEEPSEEK_KEYS', " . $newDeepseekKeysArrayString . ");";
     $configContent = preg_replace(
        '/(define\(\s*[\'|"]DEEPSEEK_KEYS[\'|"]\s*,\s*\[.*?\]\s*\);)/is', // Use /s for multiline
        $newDeepseekKeysDefinition,
        $configContent,
        1
    );
    log_to_file("[save_config.php] Updated DEEPSEEK_KEYS: " . count($newDeepseekKeysFree) . " free, " . count($newDeepseekKeysPaid) . " paid");

     // 4. Replace DEEPSEEK_API_URL
     $newDeepseekUrlDefinition = "define('DEEPSEEK_API_URL', '" . addcslashes($newDeepseekApiUrl, "'\\") . "');";
     $configContent = preg_replace(
         '/(define\(\s*[\'|"]DEEPSEEK_API_URL[\'|"]\s*,\s*[\'|"].*?[\'|"]\s*\);)/i',
         $newDeepseekUrlDefinition,
         $configContent,
         1
     );
     log_to_file("[save_config.php] Updated DEEPSEEK_API_URL");

     // 5. Replace DEEPSEEK_MODEL
     $newDeepseekModelDefinition = "define('DEEPSEEK_MODEL', '" . addcslashes($newDeepseekModelName, "'\\") . "');";
     $configContent = preg_replace(
         '/(define\(\s*[\'|"]DEEPSEEK_MODEL[\'|"]\s*,\s*[\'|"].*?[\'|"]\s*\);)/i',
         $newDeepseekModelDefinition,
         $configContent,
         1
     );
     log_to_file("[save_config.php] Updated DEEPSEEK_MODEL");

     // 6. Replace GEMINI_API_URL - New addition
     $newGeminiUrlDefinition = "define('GEMINI_API_URL', '" . addcslashes($newGeminiApiUrl, "'\\") . "');";
     $configContent = preg_replace(
         '/(define\(\s*[\'|"]GEMINI_API_URL[\'|"]\s*,\s*[\'|"].*?[\'|"]\s*\);)/i',
         $newGeminiUrlDefinition,
         $configContent,
         1
     );
     log_to_file("[save_config.php] Updated GEMINI_API_URL");

     // 7. Replace GEMINI_MODEL - New addition
     $newGeminiModelDefinition = "define('GEMINI_MODEL', '" . addcslashes($newGeminiModelName, "'\\") . "');";
     $configContent = preg_replace(
         '/(define\(\s*[\'|"]GEMINI_MODEL[\'|"]\s*,\s*[\'|"].*?[\'|"]\s*\);)/i',
         $newGeminiModelDefinition,
         $configContent,
         1
     );
     log_to_file("[save_config.php] Updated GEMINI_MODEL");

    // --- Write the modified content back to the file ---
    // Use file locking for safety
    $fileHandle = fopen($configFilePath, 'w');
    if (!$fileHandle) {
        throw new Exception('Could not open config file for writing.');
    }

    if (flock($fileHandle, LOCK_EX)) { // Exclusive lock
        if (fwrite($fileHandle, $configContent) === false) {
            flock($fileHandle, LOCK_UN); // Release lock
            fclose($fileHandle);
            throw new Exception('Could not write to config file.');
        }
        fflush($fileHandle); // Ensure all output is written
        flock($fileHandle, LOCK_UN); // Release lock
        log_to_file("[save_config.php] Successfully wrote updated config to file");
    } else {
        fclose($fileHandle);
        throw new Exception('Could not acquire lock on config file.');
    }

    fclose($fileHandle);

    log_to_file("[save_config.php] Configuration saved successfully");
    echo json_encode(['success' => true, 'message' => 'Configuration saved successfully.']);

} catch (Exception $e) {
    log_to_file("[save_config.php] Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error saving configuration: ' . $e->getMessage()]);
}
?> 