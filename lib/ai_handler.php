<?php
require_once __DIR__ . '/config.php';

class AIHandler {
    private $apiKeys;
    private $apiUrl;
    private $generalInstructions;
    public $model;
    private $modelName;
    private $lastWorkingKeyIndex = 0;
    private $enableLogging = false;
    
    public function __construct() {
        $this->model = AI_MODEL;
        $this->apiUrl = $this->model === 'gemini' ? GEMINI_API_URL : DEEPSEEK_API_URL;
        $this->apiKeys = $this->model === 'gemini' ? GEMINI_KEYS : DEEPSEEK_KEYS;
        $this->modelName = $this->model === 'gemini' ? GEMINI_MODEL : DEEPSEEK_MODEL;
        $this->generalInstructions = require __DIR__ . "/../api/ai/templates/general_instructions.php";
        $this->enableLogging = defined('ENABLE_API_LOGGING') ? ENABLE_API_LOGGING : false;
    }
    
    public function getPromptTemplate($type = 'long', $grade = null, $subject = null) {
        error_log("=================== TEMPLATE SELECTION START ===================");
        error_log("PARAMS - Type: '$type', Grade: '$grade', Subject: '$subject'");

        $isPractical = $subject && stripos($subject, '(practical)') !== false;
        $gradeDir = $grade ? strtolower(str_replace([' ', '.', '-'], '', $grade)) : null;

        $theoryBaseDir = __DIR__ . "/../api/ai/templates";
        $practicalBaseDir = __DIR__ . "/../api/ai/practical subject template";
        
        $potentialPaths = [];

        // Level 1: Subject-Specific Prompt
        if ($gradeDir && $subject) {
            $baseDir = $isPractical ? $practicalBaseDir : $theoryBaseDir;
            $subjectDir = "{$baseDir}/{$gradeDir}";
            error_log("[DEBUG] Checking subject-level directory: {$subjectDir}");

            if (is_dir($subjectDir)) {
                error_log("[DEBUG] Directory exists. Scanning for subject folder...");
                $dirs = scandir($subjectDir);
                foreach ($dirs as $dir) {
                    if ($dir[0] === '.') continue;
                    // Trim both strings to remove any hidden whitespace
                    $trimmedDir = trim($dir);
                    $trimmedSubject = trim($subject);
                    error_log("[DEBUG] Comparing folder: '{$trimmedDir}' WITH subject: '{$trimmedSubject}'");
                    
                    if (is_dir("{$subjectDir}/{$dir}") && strcasecmp($trimmedDir, $trimmedSubject) === 0) {
                        error_log("[DEBUG] MATCH FOUND! Building path...");
                        $potentialPaths[] = "{$subjectDir}/{$dir}/{$type}.php";
                        break; 
                    }
                }
            } else {
                error_log("[DEBUG] Subject-level directory NOT FOUND: {$subjectDir}");
            }
        }

        // Level 2: Grade-Level Prompt
        if ($gradeDir) {
            $baseDir = $isPractical ? $practicalBaseDir : $theoryBaseDir;
            $potentialPaths[] = "{$baseDir}/{$gradeDir}/{$type}.php";
        }

        // Level 3: Global Default Prompt (uses practical as the ultimate fallback)
        $potentialPaths[] = "{$practicalBaseDir}/{$type}.php";
        $potentialPaths[] = "{$theoryBaseDir}/{$type}.php"; // Final fallback

        // Iterate and use the first valid template
        foreach ($potentialPaths as $path) {
            error_log("Checking for template at: {$path}");
            if (file_exists($path)) {
                error_log("FOUND AND USING template: {$path}");
                error_log("=================== TEMPLATE SELECTION END ===================");
                return require $path;
            }
        }
        
        error_log("FATAL ERROR: No suitable prompt template found for type '{$type}'.");
        error_log("=================== TEMPLATE SELECTION END ===================");
        throw new Exception("No suitable prompt template found for type '{$type}'. Please check the template configuration.");
    }
    
    public function createPrompt($template, $data) {
        // Combine general instructions with specific template
        $fullPrompt = $this->generalInstructions . "\n\nFor this specific response:\n" . $template;
        
        return str_replace(
            ['{extracted_text}', '{user_prompt}', '{question_name}'],
            [$data['extracted_text'], $data['user_prompt'], $data['question_name']],
            $fullPrompt
        );
    }
    
    public function createContinuationPrompt($previousMessages, $userPrompt) {
        if ($this->model === 'gemini') {
            $formattedMessages = [];
            
            // Add general instructions as a user message instead of system
            $formattedMessages[] = [
                'role' => 'user',
                'parts' => [['text' => "[Instructions]\n" . $this->generalInstructions]]
            ];
            
            foreach ($previousMessages as $msg) {
                $role = ($msg['sender'] === 'ai') ? 'model' : 'user';
                
                $formattedMessages[] = [
                    'role' => $role,
                    'parts' => [['text' => $msg['message']]]
                ];
            }
            
            // Add new user prompt
            $formattedMessages[] = [
                'role' => 'user',
                'parts' => [['text' => $userPrompt]]
            ];
            
            return ['messages' => $formattedMessages];
        } else {
            // DeepSeek format
            $formattedMessages = [];
            
            // Add general instructions as system message
            $formattedMessages[] = [
                'role' => 'system',
                'content' => $this->generalInstructions
            ];
            
            foreach ($previousMessages as $msg) {
                $role = ($msg['sender'] === 'ai') ? 'assistant' : 'user';
                
                $formattedMessages[] = [
                    'role' => $role,
                    'content' => $msg['message']
                ];
            }
            
            // Add new user prompt
            $formattedMessages[] = [
                'role' => 'user',
                'content' => $userPrompt
            ];
            
            return [
                'model' => $this->modelName,
                'messages' => $formattedMessages
            ];
        }
    }
    
    public function callGeminiAPI($promptData) {
        $debugLog = []; // Initialize debug log array here
        try {
            // Initialize debug log
            $debugLog[] = "Starting API call process...";
            $debugLog[] = "Selected AI Model: " . $this->model;

            $overallStartTime = microtime(true); // Start overall timer

            // Get response from appropriate API, passing $debugLog by reference
            $responseData = $this->model === 'gemini' ? 
                $this->callGemini($promptData, $debugLog) : 
                $this->callDeepSeek($promptData, $debugLog);
            
            $overallEndTime = microtime(true); // End overall timer
            $totalDuration = $overallEndTime - $overallStartTime;

            // Add total duration to the debug log (which was modified by reference)
            $debugLog[] = sprintf("--- Total API processing time: %.2f seconds ---", $totalDuration);

            // If logging is enabled and the response is successful, add the debug info to the client-side console
            if ($this->enableLogging && isset($responseData['success']) && $responseData['success'] === true) {
                $logInfo = "API KEY USAGE: ";
                foreach ($debugLog as $logLine) {
                    if (strpos($logLine, 'API_KEY_USAGE_LOG:') !== false) {
                        $logInfo .= str_replace('API_KEY_USAGE_LOG:', '', $logLine) . " | ";
                    }
                }
                // Add a special header that JavaScript can read
                header('X-API-Key-Log: ' . $logInfo);
            }
            
            // Now, add the completed debug log to the response if logging is enabled
            if ($this->enableLogging) {
                $responseData['debug_log'] = $debugLog;
            }

            return $responseData;
        } catch (Exception $e) {
            // Log the final exception if something unexpected happens outside the specific model calls
            error_log("Unhandled error in callGeminiAPI: " . $e->getMessage());
            // Return a failure structure including any logs gathered so far
            // Ensure $debugLog is initialized even if the try block fails early
            if (!isset($debugLog)) {
                $debugLog = ["Error occurred before model selection."];
            }
            $debugLog[] = "Unhandled Exception: " . $e->getMessage();
            
            // Create response - only include debug_log if logging is enabled
            $response = [
                'success' => false,
                'error' => "An unexpected error occurred: " . $e->getMessage(),
            ];
            
            // Ensure debugLog is part of the response even on exception
            if ($this->enableLogging) {
                 $response['debug_log'] = isset($debugLog) ? $debugLog : ["Debug log unavailable due to early exception."];
                 $response['debug_log'][] = "Exception prevented total time calculation."; // Add note
            }
            
            return $response;
        }
    }

    private function callGemini($promptData, array &$debugLog) {
        // Start with the last working key index, but don't start with paid key (index 4)
        $startIndex = ($this->lastWorkingKeyIndex >= 4) ? 0 : $this->lastWorkingKeyIndex;
        $errorMessages = [];
        $debugLog[] = "Attempting Gemini API call...";
        $debugLog[] = "Starting key index: " . $startIndex;

        // Try each API key until one works or we've tried them all
        for ($i = 0; $i < count($this->apiKeys); $i++) {
            // Calculate the current key index, cycling through free keys (0-3) first
            $currentIndex = ($i < 4) ? (($startIndex + $i) % 4) : 4;
            $apiKey = $this->apiKeys[$currentIndex];
            $keyType = ($currentIndex === 4) ? "(PAID)" : "(FREE)";
            
            // Skip the paid key (index 4) until we've tried all free keys
            if ($currentIndex === 4 && $i < 4) {
                 $debugLog[] = "Skipping paid key index {$currentIndex} on initial pass.";
                continue;
            }
            
            try {
                $debugLog[] = "Trying Gemini key index: {$currentIndex} {$keyType}";
                error_log("Trying Gemini API key index: " . $currentIndex . " " . $keyType);
                
                // Log API key usage for debugging (server-side only)
                if ($this->enableLogging) {
                    // Log to server error log instead of echoing script tags
                    error_log("API_KEY_USAGE_LOG: Using Gemini key index " . $currentIndex . " " . $keyType);
                    // Add to debug log that will be returned with the response
                    $debugLog[] = "Key " . $currentIndex . " " . $keyType . ": Attempting API call";
                    // Set header for client-side logging
                    header('X-API-Key-Log: Using Gemini key index ' . $currentIndex . ' ' . $keyType);
                }
                
                // Format the prompt data for Gemini
            if (is_array($promptData) && isset($promptData['messages'])) {
                // Filter out any empty messages and format for Gemini
                $messages = array_filter($promptData['messages'], function($message) {
                    return !empty($message['parts'][0]['text']);
                });
                
                if (empty($messages)) {
                    throw new Exception("No valid messages found in chat history");
                }

                $data = ['contents' => array_values($messages)];
            } else {
                // For single prompts, include general instructions as user message
                if (empty($promptData)) {
                    throw new Exception("Empty prompt provided");
                }

                $data = [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => "[Instructions]\n" . $this->generalInstructions]]
                        ],
                        [
                            'role' => 'user',
                            'parts' => [['text' => $promptData]]
                        ]
                    ]
                ];
            }

                // Make the API request
                $ch = curl_init($this->apiUrl . '?key=' . $apiKey);
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($data),
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_TIMEOUT => 100 // Increased timeout to 100 seconds
                ]);
            
                $startTime = microtime(true); // Record start time
                $response = curl_exec($ch);
                $endTime = microtime(true);   // Record end time
                $duration = $endTime - $startTime; // Calculate duration
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Get HTTP Code *before* closing
                $curlError = curl_error($ch); // Get potential CURL error *before* closing
                curl_close($ch); // Now close the handle
            
                // Log the duration immediately after the call
                $duration_log = sprintf("Key %d %s attempt took: %.2f seconds", $currentIndex, $keyType, $duration);
                $debugLog[] = $duration_log;
                error_log("DEBUG: " . $duration_log); 

                // Check for CURL errors first
                if (!empty($curlError)) {
                    $debugLog[] = "Key {$currentIndex} {$keyType} failed: CURL Error - {$curlError}";
                    error_log("DEBUG: CURL Error: " . $curlError);
                    throw new Exception("CURL Error: " . $curlError);
                }

                if ($httpCode !== 200) {
                    $responseData = json_decode($response, true);
                    $errorMsg = isset($responseData['error']['message'])
                    ? $responseData['error']['message'] 
                        : "API request failed with HTTP {$httpCode}";
                    $debugLog[] = "Key {$currentIndex} {$keyType} failed: HTTP {$httpCode} - {$errorMsg}";
                    throw new Exception($errorMsg);
                }

                $responseData = json_decode($response, true);
                if (!isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
                    $errorMsg = "API returned unexpected format";
                    $debugLog[] = "Key {$currentIndex} {$keyType} failed: {$errorMsg}";
                    error_log("DEBUG: Unexpected response format: " . json_encode($responseData));
                    throw new Exception($errorMsg);
                }
                
                // Success!
                $this->lastWorkingKeyIndex = $currentIndex;
                $debugLog[] = "Key {$currentIndex} {$keyType} successful.";
                error_log("Gemini API request successful with key index: " . $currentIndex);
                
                // Return success structure
                return [
                    'success' => true,
                    'result' => $responseData['candidates'][0]['content']['parts'][0]['text']
                ];
            } catch (Exception $e) {
                // Log the error message to the debug log (already done inside the catch block above)
                $errorMsg = "Error with key index " . $currentIndex . ": " . $e->getMessage();
                $errorMessages[] = $errorMsg; // Keep track for final error summary
                error_log($errorMsg); // Keep logging to server logs too
                continue; // Try the next key
            }
        }
        
        // If we get here, all API keys failed
        $errorSummary = "All Gemini API keys failed. Errors: " . implode("; ", $errorMessages);
        error_log($errorSummary);
        $debugLog[] = "All Gemini keys failed.";
        // Return failure structure
        return [
            'success' => false,
            'error' => $errorSummary,
        ];
    }

    private function callDeepSeek($promptData, array &$debugLog) {
        // Start with the last working key index, but don't start with paid key (index 4)
        $startIndex = ($this->lastWorkingKeyIndex >= 4) ? 0 : $this->lastWorkingKeyIndex;
        $errorMessages = [];
        $debugLog[] = "Attempting DeepSeek (OpenRouter) API call...";
        $debugLog[] = "Starting key index: " . $startIndex;
        
        // Try each API key until one works or we've tried them all
        for ($i = 0; $i < count($this->apiKeys); $i++) {
            // Calculate the current key index, cycling through free keys (0-3) first
            $currentIndex = ($i < 4) ? (($startIndex + $i) % 4) : 4;
            $apiKey = $this->apiKeys[$currentIndex];
            $keyType = ($currentIndex === 4) ? "(PAID)" : "(FREE)";
            
            // Skip the paid key (index 4) until we've tried all free keys
            if ($currentIndex === 4 && $i < 4) {
                 $debugLog[] = "Skipping paid key index {$currentIndex} on initial pass.";
                continue;
            }
            
            // Validate API key format for OpenRouter
            if (strpos($apiKey, 'sk-or-v1-') !== 0) {
                $errorMsg = "Invalid OpenRouter API key format at index $currentIndex. Keys should start with 'sk-or-v1-'";
                 $debugLog[] = "Key {$currentIndex} {$keyType} failed: Invalid Format - {$errorMsg}";
                error_log("DEBUG: " . $errorMsg);
                $errorMessages[] = "Error with key index " . $currentIndex . ": Invalid API key format";
                continue; // Try the next key
            }
            
            try {
                $debugLog[] = "Trying OpenRouter key index: {$currentIndex} {$keyType} - Key prefix: " . substr($apiKey, 0, 15) . "...";
                error_log("DEBUG: Trying OpenRouter API key index: " . $currentIndex . " - Key prefix: " . substr($apiKey, 0, 15) . "...");
                
                // Log API key usage for debugging (server-side only)
                if ($this->enableLogging) {
                    // Log to server error log instead of echoing script tags
                    error_log("API_KEY_USAGE_LOG: Using DeepSeek key index " . $currentIndex . " " . $keyType . " - Key prefix: " . substr($apiKey, 0, 10) . "...");
                    // Add to debug log that will be returned with the response
                    $debugLog[] = "Key " . $currentIndex . " " . $keyType . ": Attempting API call";
                    // Set header for client-side logging
                    header('X-API-Key-Log: Using DeepSeek key index ' . $currentIndex . ' ' . $keyType . ' - Key prefix: ' . substr($apiKey, 0, 10) . '...');
                }
                
                // Prepare data for DeepSeek/OpenRouter
                $data = [];
            
                if (is_array($promptData) && isset($promptData['messages'])) {
                    // If it's already in DeepSeek format (from createContinuationPrompt)
                    $data = $promptData;
                } else {
                    // For single prompts - this is the path for initial prompts with PDF context
                    $data = [
                            'model' => $this->modelName,
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => $this->generalInstructions
                            ],
                            [
                                'role' => 'user',
                                'content' => $promptData
                            ]
                        ]
                    ];
                }

                // Ensure model is specified for OpenRouter
                if (!isset($data['model'])) {
                     $data['model'] = $this->modelName;
                     $debugLog[] = "Model not set in prompt data, using default: " . $this->modelName;
                }
            
                // Add additional parameters required by OpenRouter
                $data['stream'] = false;
                
                // Log the exact request data and headers (Optional for debug log, keep in server log)
                error_log("DEBUG: OpenRouter Request to URL: " . $this->apiUrl);
                error_log("DEBUG: OpenRouter Request Model: " . $data['model']);
                error_log("DEBUG: OpenRouter Request Auth Header: Bearer " . substr($apiKey, 0, 10) . "...");
            
                // Create a URL that includes the API key as a query parameter (alternative authentication method)
                $apiUrlWithKey = $this->apiUrl . "?api_key=" . urlencode($apiKey);
                error_log("DEBUG: Trying with URL-based authentication as fallback");
                
                // Make the API request
                $ch = curl_init($apiUrlWithKey);
                
                // Create headers array for better debugging - include multiple auth methods
                $headers = [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                    'X-Authorization: Bearer ' . $apiKey, // Alternative header that might not be stripped
                    'HTTP-Referer: https://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost'), 
                    'X-Title: StudySimplify',
                    'X-API-KEY: ' . $apiKey // Another alternative that some servers don't strip
                ];
                
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => json_encode($data),
                    CURLOPT_HTTPHEADER => $headers,
                    CURLOPT_TIMEOUT => 100, // Keep existing timeout
                    CURLOPT_VERBOSE => false,
                    CURLOPT_HEADER => false,
                    // Make sure we're passing the full authorization value including in cookies
                    CURLOPT_COOKIE => 'authorization=Bearer ' . $apiKey,
                    // Make CURL follow redirects if the host service does that
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_MAXREDIRS => 3
                ]);
            
                $startTime = microtime(true); // Record start time
                $response = curl_exec($ch);
                $endTime = microtime(true); // End timer immediately after
                $duration = $endTime - $startTime; // Calculate duration
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Get HTTP Code *before* closing
                $responseBody = $response; // Keep this for potential decoding later
                $curlError = curl_error($ch); // Get curl error *before* closing
                curl_close($ch); // Now close the handle
            
                // Log the duration immediately after the call completes
                $duration_log = sprintf("Key %d %s attempt took: %.2f seconds", $currentIndex, $keyType, $duration);
                $debugLog[] = $duration_log;
                error_log("DEBUG: " . $duration_log); 
                
                // Log complete response data (Keep in server log if needed)
                error_log("DEBUG: OpenRouter Response HTTP Code: " . $httpCode);
                error_log("DEBUG: OpenRouter Response Body (first 300 chars): " . substr($responseBody, 0, 300));
                
                // Check for CURL errors first
                if (!empty($curlError)) {
                    $debugLog[] = "Key {$currentIndex} {$keyType} failed: CURL Error - {$curlError}";
                    error_log("DEBUG: CURL Error: " . $curlError);
                    throw new Exception("CURL Error: " . $curlError);
                }

                if ($httpCode !== 200) {
                    $responseData = json_decode($responseBody, true);
                    $errorMsg = isset($responseData['error']['message'])
                    ? $responseData['error']['message'] 
                        : (isset($responseData['message']) ? $responseData['message'] : "API request failed with HTTP $httpCode");
                     $debugLog[] = "Key {$currentIndex} {$keyType} failed: HTTP {$httpCode} - {$errorMsg}";
                    throw new Exception($errorMsg);
                }

                $responseData = json_decode($responseBody, true);
                
                // Enhanced response format handling
                $responseContent = null;
                
                // Try multiple possible response formats
                if (isset($responseData['choices'][0]['message']['content'])) {
                    $responseContent = $responseData['choices'][0]['message']['content'];
                } else if (isset($responseData['choices'][0]['text'])) {
                    $responseContent = $responseData['choices'][0]['text'];
                } else if (isset($responseData['text'])) {
                    $responseContent = $responseData['text'];
                } else if (isset($responseData['content'])) {
                    $responseContent = $responseData['content'];
                } else if (isset($responseData['response'])) {
                    $responseContent = $responseData['response'];
                } else if (isset($responseData['output'])) {
                    $responseContent = $responseData['output'];
                }
                
                if ($responseContent === null) {
                    $errorMsg = "API returned unexpected format";
                     $debugLog[] = "Key {$currentIndex} {$keyType} failed: {$errorMsg}";
                    error_log("DEBUG: Unexpected response format: " . json_encode($responseData));
                    throw new Exception($errorMsg);
                }
            
                // Success!
                $this->lastWorkingKeyIndex = $currentIndex;
                 $debugLog[] = "Key {$currentIndex} {$keyType} successful.";
                error_log("DEBUG: OpenRouter API request successful with key index: " . $currentIndex);
                
                 // Return success structure
                 return [
                     'success' => true,
                     'result' => $responseContent
                 ];
            } catch (Exception $e) {
                 // Log the error message to the debug log (already done inside the catch block above)
                $errorMsg = "Error with key index " . $currentIndex . ": " . $e->getMessage();
                $errorMessages[] = $errorMsg; // Keep track for final error summary
                error_log("DEBUG: OpenRouter Error with key " . $currentIndex . ": " . $e->getMessage());
                continue; // Try the next key
            }
        }
        
        // If we get here, all API keys failed
        $errorSummary = "All OpenRouter API keys failed. Errors: " . implode("; ", $errorMessages);
        error_log("DEBUG: Fatal error - " . $errorSummary);
        $debugLog[] = "All OpenRouter keys failed.";
        // Return failure structure
        return [
            'success' => false,
            'error' => $errorSummary,
        ];
    }
} 