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

log_to_file("[get_config.php] Script started. Request: " . json_encode($_REQUEST));

require_once '../../lib/auth_check.php'; // Assume you have a way to check admin auth

header('Content-Type: application/json');

// Authenticate the admin user
// The auth_check.php script should handle this and throw an exception or exit if not authorized
// For example, it might check a session or validate a token from headers
// Ensure this check is robust in your actual implementation!
try {
    // Example: If auth_check.php returns user info or throws error
    // $adminUser = require_auth(); 
    // For now, we proceed assuming auth is handled by the require_once
    log_to_file("[get_config.php] Authentication check passed (placeholder). ");
} catch (Exception $e) {
    log_to_file("[get_config.php] Authentication failed: " . $e->getMessage());
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'error' => 'Unauthorized: ' . $e->getMessage()]);
    exit;
}


$configFilePath = __DIR__ . '/../../lib/config.php';
$configContent = '';
$responseData = [
    'ai_model' => 'deepseek', // Default
    'gemini_keys' => ['free' => [], 'paid' => []],
    'deepseek_keys' => ['free' => [], 'paid' => []],
    'gemini_api_url' => '',
    'gemini_model_name' => '',
    'deepseek_api_url' => '',
    'deepseek_model_name' => '',
    'enable_logging' => false
];

try {
    log_to_file("[get_config.php] Attempting to read config file: {$configFilePath}");
    if (!file_exists($configFilePath)) {
        throw new Exception('Config file not found.');
    }

    $configContent = file_get_contents($configFilePath);
    if ($configContent === false) {
        throw new Exception('Could not read config file.');
    }
    log_to_file("[get_config.php] Config file read successfully.");

    // --- Extract AI_MODEL ---
    log_to_file("[get_config.php] Parsing AI_MODEL...");
    if (preg_match('/define\(\s*[\'|"]AI_MODEL[\'|"]\s*,\s*[\'|"](.*?)[\'|"]\s*\);/i', $configContent, $matches)) {
        $responseData['ai_model'] = trim($matches[1]);
        log_to_file("[get_config.php] Found AI_MODEL: " . $responseData['ai_model']);
    } else {
        $responseData['ai_model'] = 'gemini'; // Default fallback
        log_to_file("[get_config.php] AI_MODEL define() not found, using default.");
    }

    // --- Extract API Logging Setting ---
    log_to_file("[get_config.php] Parsing ENABLE_API_LOGGING...");
    if (preg_match('/define\(\s*[\'|"]ENABLE_API_LOGGING[\'|"]\s*,\s*(true|false)\s*\);/i', $configContent, $matches)) {
        $responseData['enable_logging'] = trim($matches[1]) === 'true' ? true : false;
        log_to_file("[get_config.php] Found ENABLE_API_LOGGING: " . ($responseData['enable_logging'] ? 'true' : 'false'));
    } else {
        $responseData['enable_logging'] = false; // Default fallback
        log_to_file("[get_config.php] ENABLE_API_LOGGING define() not found, using default (false).");
    }

    // --- Extract Gemini Keys (Free/Paid distinction based on comments) ---
    log_to_file("[get_config.php] Parsing GEMINI_KEYS...");
    if (preg_match('/define\(\s*[\'|"]GEMINI_KEYS[\'|"]\s*,\s*(\[.*?\])\s*\);/is', $configContent, $matches)) {
        $keysContent = $matches[1];
        $freeKeys = [];
        $paidKeys = [];
        $inPaidSection = false;
        
        // Log the matched content for debugging
        log_to_file("[get_config.php] GEMINI_KEYS raw match: " . substr($keysContent, 0, 100) . "...");
        
        // Use regex to find keys and preceding comments
        preg_match_all('/(?:\/\/\s*(Free tier keys|Paid tier key.*?)\s*)?\s*[\'|"](AIzaSy[^\'"\s]+)[\'|"]/i', $keysContent, $keyMatches, PREG_SET_ORDER);
        
        log_to_file("[get_config.php] Found " . count($keyMatches) . " Gemini key matches");
        
        foreach ($keyMatches as $match) {
            $comment = isset($match[1]) ? trim($match[1]) : '';
            $key = $match[2];
            
            log_to_file("[get_config.php] Processing Gemini key: " . substr($key, 0, 10) . "... with comment: " . $comment);
            
            if (stripos($comment, 'Paid tier key') !== false) {
                $inPaidSection = true;
            } elseif (stripos($comment, 'Free tier keys') !== false) {
                 $inPaidSection = false; // Reset if another free comment appears (unlikely)
            }

            if ($inPaidSection) {
                $paidKeys[] = $key;
            } else {
                $freeKeys[] = $key;
            }
        }
         $responseData['gemini_keys'] = ['free' => $freeKeys, 'paid' => $paidKeys];
        log_to_file("[get_config.php] Parsed GEMINI_KEYS: Free=" . count($freeKeys) . ", Paid=" . count($paidKeys));
    } else {
         log_to_file("[get_config.php] Could not parse GEMINI_KEYS define() block or pattern mismatch.");
    }

    // --- Extract DeepSeek Keys (Free/Paid distinction based on comments) ---
    log_to_file("[get_config.php] Parsing DEEPSEEK_KEYS...");
     if (preg_match('/define\(\s*[\'|"]DEEPSEEK_KEYS[\'|"]\s*,\s*(\[.*?\])\s*\);/is', $configContent, $matches)) {
        $keysContent = $matches[1];
        $freeKeys = [];
        $paidKeys = [];
        $inPaidSection = false;
        
        // Log the matched content for debugging
        log_to_file("[get_config.php] DEEPSEEK_KEYS raw match: " . substr($keysContent, 0, 100) . "...");
        
        // Use regex to find keys and preceding comments
        preg_match_all('/(?:\/\/\s*(Free tier keys|Paid tier key.*?)\s*)?\s*[\'|"](sk-or-v1-[^\'"\s]+)[\'|"]/i', $keysContent, $keyMatches, PREG_SET_ORDER);
        
        log_to_file("[get_config.php] Found " . count($keyMatches) . " DeepSeek key matches");
        
        foreach ($keyMatches as $match) {
            $comment = isset($match[1]) ? trim($match[1]) : '';
            $key = $match[2];
            
            log_to_file("[get_config.php] Processing DeepSeek key: " . substr($key, 0, 10) . "... with comment: " . $comment);
            
            if (stripos($comment, 'Paid tier key') !== false) {
                $inPaidSection = true;
            } elseif (stripos($comment, 'Free tier keys') !== false) {
                 $inPaidSection = false; // Reset if another free comment appears
            }

            if ($inPaidSection) {
                $paidKeys[] = $key;
            } else {
                $freeKeys[] = $key;
            }
        }
         $responseData['deepseek_keys'] = ['free' => $freeKeys, 'paid' => $paidKeys];
        log_to_file("[get_config.php] Parsed DEEPSEEK_KEYS: Free=" . count($freeKeys) . ", Paid=" . count($paidKeys));
    } else {
         log_to_file("[get_config.php] Could not parse DEEPSEEK_KEYS define() block or pattern mismatch.");
    }

    // --- Extract Gemini API URL ---
    log_to_file("[get_config.php] Parsing GEMINI_API_URL...");
     if (preg_match('/define\(\s*[\'|"]GEMINI_API_URL[\'|"]\s*,\s*[\'|"](.*?)[\'|"]\s*\);/i', $configContent, $matches)) {
        $responseData['gemini_api_url'] = trim($matches[1]);
        log_to_file("[get_config.php] Found GEMINI_API_URL: " . $responseData['gemini_api_url']);
    } else {
        log_to_file("[get_config.php] GEMINI_API_URL define() not found or pattern mismatch.");
    }

    // --- Extract Gemini Model Name ---
    log_to_file("[get_config.php] Parsing GEMINI_MODEL...");
     if (preg_match('/define\(\s*[\'|"]GEMINI_MODEL[\'|"]\s*,\s*[\'|"](.*?)[\'|"]\s*\);/i', $configContent, $matches)) {
        $responseData['gemini_model_name'] = trim($matches[1]);
         log_to_file("[get_config.php] Found GEMINI_MODEL: " . $responseData['gemini_model_name']);
    } else {
        log_to_file("[get_config.php] GEMINI_MODEL define() not found or pattern mismatch.");
    }

    // --- Extract DeepSeek API URL ---
    log_to_file("[get_config.php] Parsing DEEPSEEK_API_URL...");
     if (preg_match('/define\(\s*[\'|"]DEEPSEEK_API_URL[\'|"]\s*,\s*[\'|"](.*?)[\'|"]\s*\);/i', $configContent, $matches)) {
        $responseData['deepseek_api_url'] = trim($matches[1]);
         log_to_file("[get_config.php] Found DEEPSEEK_API_URL: " . $responseData['deepseek_api_url']);
     } else {
        log_to_file("[get_config.php] DEEPSEEK_API_URL define() not found or pattern mismatch.");
    }

    // --- Extract DeepSeek Model Name ---
    log_to_file("[get_config.php] Parsing DEEPSEEK_MODEL...");
     if (preg_match('/define\(\s*[\'|"]DEEPSEEK_MODEL[\'|"]\s*,\s*[\'|"](.*?)[\'|"]\s*\);/i', $configContent, $matches)) {
        $responseData['deepseek_model_name'] = trim($matches[1]);
         log_to_file("[get_config.php] Found DEEPSEEK_MODEL: " . $responseData['deepseek_model_name']);
     } else {
        log_to_file("[get_config.php] DEEPSEEK_MODEL define() not found or pattern mismatch.");
    }

    log_to_file("[get_config.php] Parsing complete. Attempting JSON encode...");
    echo json_encode(['success' => true, 'data' => $responseData]);
    log_to_file("[get_config.php] JSON encoded and echoed successfully.");

} catch (Exception $e) {
    log_to_file("[get_config.php] Exception caught: " . $e->getMessage()); // Log the exception
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error reading configuration: ' . $e->getMessage()]);
}
?> 