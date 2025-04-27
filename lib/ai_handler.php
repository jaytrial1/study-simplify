<?php
require_once __DIR__ . '/config.php';

class AIHandler {
    private $apiKey;
    private $apiUrl;
    private $generalInstructions;
    public $model;
    
    public function __construct() {
        $this->model = AI_MODEL;
        $this->apiKey = $this->model === 'gemini' ? GEMINI_API_KEY : DEEPSEEK_API_KEY;
        $this->apiUrl = $this->model === 'gemini' ? GEMINI_API_URL : DEEPSEEK_API_URL;
        $this->generalInstructions = require __DIR__ . "/../api/ai/templates/general_instructions.php";
    }
    
    public function getPromptTemplate($type = 'long', $grade = null, $subject = null) {
        // Super detailed debugging - start with printing the exact parameters received
        error_log("=================== TEMPLATE SELECTION START ===================");
        error_log("PARAMS - Type: '$type', Grade: '$grade', Subject: '$subject'");
        
        // Check if this is a practical subject
        $isPractical = $subject && stripos($subject, '(practical)') !== false;
        error_log("Is practical subject: " . ($isPractical ? "YES" : "NO"));
        
        // If it's a practical subject and we have specific templates for it
        if ($isPractical) {
            // Normalize grade format to match directory naming
            $gradeDir = $grade ? strtolower(str_replace([' ', '.', '-'], '', $grade)) : null;
            error_log("Grade directory: '$gradeDir'");
            
            // Keep the exact subject name for directory lookup
            $exactSubjectFolder = $subject;
            
            // Also have a normalized version
            $normalizedSubject = strtolower(trim(str_replace('(practical)', '', $subject)));
            $normalizedSubject = str_replace([' ', '.', '-'], '', $normalizedSubject);
            
            error_log("Subject variations - Exact: '$exactSubjectFolder', Normalized: '$normalizedSubject'");
            
            // SUPER DETAILED PATH CHECKING
            // Check practical template directory existence first
            $baseDir = __DIR__ . "/../api/ai/practical subject template";
            error_log("Base practical template directory: '$baseDir'");
            error_log("Base directory exists? " . (is_dir($baseDir) ? "YES" : "NO"));
            
            if ($gradeDir) {
                // First check if grade directory exists
                $gradeFullPath = $baseDir . "/{$gradeDir}";
                error_log("Grade directory full path: '$gradeFullPath'");
                error_log("Grade directory exists? " . (is_dir($gradeFullPath) ? "YES" : "NO"));
                
                if (is_dir($gradeFullPath)) {
                    // List all directories in the grade folder to see what's available
                    error_log("LISTING DIRECTORIES IN GRADE FOLDER:");
                    if ($handle = opendir($gradeFullPath)) {
                        while (false !== ($entry = readdir($handle))) {
                            if ($entry != "." && $entry != "..") {
                                error_log("  - '$entry'");
                            }
                        }
                        closedir($handle);
                    }
                    
                    // Try the exact subject folder name first
                    $exactSubjectPath = $gradeFullPath . "/{$exactSubjectFolder}";
                    error_log("Exact subject path: '$exactSubjectPath'");
                    error_log("Exact subject directory exists? " . (is_dir($exactSubjectPath) ? "YES" : "NO"));
                    
                    // If exact directory doesn't exist, try to find a case-insensitive match
                    if (!is_dir($exactSubjectPath)) {
                        error_log("Exact directory not found. Trying case-insensitive search...");
                        $foundDir = false;
                        
                        if ($handle = opendir($gradeFullPath)) {
                            while (false !== ($entry = readdir($handle))) {
                                if ($entry != "." && $entry != ".." && is_dir($gradeFullPath . "/" . $entry)) {
                                    error_log("Comparing: '" . strtolower($entry) . "' with '" . strtolower($exactSubjectFolder) . "'");
                                    if (strtolower($entry) === strtolower($exactSubjectFolder)) {
                                        error_log("FOUND case-insensitive match: '$entry'");
                                        $exactSubjectPath = $gradeFullPath . "/{$entry}";
                                        $foundDir = true;
                                        break;
                                    }
                                }
                            }
                            closedir($handle);
                        }
                        
                        if ($foundDir) {
                            error_log("Using case-insensitive matched directory: '$exactSubjectPath'");
                        } else {
                            error_log("No case-insensitive match found");
                        }
                    }
                    
                    if (is_dir($exactSubjectPath)) {
                        $exactTemplatePath = $exactSubjectPath . "/{$type}.php";
                        error_log("Exact template path: '$exactTemplatePath'");
                        error_log("Exact template file exists? " . (file_exists($exactTemplatePath) ? "YES" : "NO"));
                        
                        // If the template file doesn't exist exactly, try case-insensitive file search
                        if (!file_exists($exactTemplatePath)) {
                            error_log("Exact template file not found. Trying case-insensitive search...");
                            $foundFile = false;
                            
                            if ($handle = opendir($exactSubjectPath)) {
                                while (false !== ($entry = readdir($handle))) {
                                    if ($entry != "." && $entry != ".." && is_file($exactSubjectPath . "/" . $entry)) {
                                        error_log("Comparing file: '" . strtolower($entry) . "' with '" . strtolower($type . ".php") . "'");
                                        if (strtolower($entry) === strtolower($type . ".php")) {
                                            error_log("FOUND case-insensitive file match: '$entry'");
                                            $exactTemplatePath = $exactSubjectPath . "/{$entry}";
                                            $foundFile = true;
                                            break;
                                        }
                                    }
                                }
                                closedir($handle);
                            }
                            
                            if ($foundFile) {
                                error_log("Using case-insensitive matched file: '$exactTemplatePath'");
                            } else {
                                error_log("No case-insensitive file match found");
                            }
                        }
                        
                        if (file_exists($exactTemplatePath)) {
                            error_log("FOUND AND USING exact practical subject template: {$exactTemplatePath}");
                            error_log("=================== TEMPLATE SELECTION END ===================");
                            return require $exactTemplatePath;
                        }
                    }
                    
                    // Fall back to the normalized path
                    $normalizedSubjectPath = $gradeFullPath . "/{$normalizedSubject}";
                    error_log("Normalized subject path: '$normalizedSubjectPath'");
                    error_log("Normalized subject directory exists? " . (is_dir($normalizedSubjectPath) ? "YES" : "NO"));
                    
                    if (is_dir($normalizedSubjectPath)) {
                        $normalizedTemplatePath = $normalizedSubjectPath . "/{$type}.php";
                        error_log("Normalized template path: '$normalizedTemplatePath'");
                        error_log("Normalized template file exists? " . (file_exists($normalizedTemplatePath) ? "YES" : "NO"));
                        
                        if (file_exists($normalizedTemplatePath)) {
                            error_log("FOUND AND USING normalized practical subject template: {$normalizedTemplatePath}");
                            error_log("=================== TEMPLATE SELECTION END ===================");
                            return require $normalizedTemplatePath;
                        }
                    }
                }
                
                // Fall back to grade-only practical template
                $gradeTemplatePath = $gradeFullPath . "/{$type}.php";
                error_log("Grade template path: '$gradeTemplatePath'");
                error_log("Grade template file exists? " . (file_exists($gradeTemplatePath) ? "YES" : "NO"));
                
                if (file_exists($gradeTemplatePath)) {
                    error_log("FOUND AND USING grade-level practical template: {$gradeTemplatePath}");
                    error_log("=================== TEMPLATE SELECTION END ===================");
                    return require $gradeTemplatePath;
                }
            }
            
            // Fall back to default practical template for this type
            $defaultTemplatePath = $baseDir . "/{$type}.php";
            error_log("Default template path: '$defaultTemplatePath'");
            error_log("Default template file exists? " . (file_exists($defaultTemplatePath) ? "YES" : "NO"));
            
            if (file_exists($defaultTemplatePath)) {
                error_log("FOUND AND USING default practical template: {$defaultTemplatePath}");
                error_log("=================== TEMPLATE SELECTION END ===================");
                return require $defaultTemplatePath;
            }
            
            error_log("NO practical templates found, falling back to regular templates");
        }
        
        // If not practical or no practical template found, continue with regular template logic
        
        // If grade is provided, check for grade-specific template
        if ($grade) {
            $gradeDir = strtolower(str_replace([' ', '.', '-'], '', $grade));
            error_log("Regular template - Grade dir: '$gradeDir'");
            
            $gradePath = __DIR__ . "/../api/ai/templates/{$gradeDir}/{$type}.php";
            error_log("Regular grade template path: '$gradePath'");
            error_log("Regular grade template exists? " . (file_exists($gradePath) ? "YES" : "NO"));
            
            if (file_exists($gradePath)) {
                error_log("FOUND AND USING grade-specific regular template: {$gradePath}");
                error_log("=================== TEMPLATE SELECTION END ===================");
                return require $gradePath;
            }
            
            $gradeDirPath = __DIR__ . "/../api/ai/templates/{$gradeDir}";
            if (is_dir($gradeDirPath)) {
                error_log("Grade directory exists but {$type}.php not found in {$gradeDirPath}");
            }
        }
        
        // Fall back to default template if grade-specific not found
        $defaultPath = __DIR__ . "/../api/ai/templates/{$type}.php";
        error_log("Default regular template path: '$defaultPath'");
        error_log("Default regular template exists? " . (file_exists($defaultPath) ? "YES" : "NO"));
        
        error_log("FOUND AND USING default regular template: {$defaultPath}");
        error_log("=================== TEMPLATE SELECTION END ===================");
        return require $defaultPath;
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
                'model' => 'deepseek/deepseek-chat:free',
                'messages' => $formattedMessages
            ];
        }
    }
    
    public function callGeminiAPI($promptData) {
        try {
            if ($this->model === 'gemini') {
                return $this->callGemini($promptData);
            } else {
                return $this->callDeepSeek($promptData);
            }
        } catch (Exception $e) {
            error_log("Error in API call: " . $e->getMessage());
            throw $e;
        }
    }

    private function callGemini($promptData) {
        try {
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

            error_log("Sending to Gemini: " . json_encode($data));
            
            $ch = curl_init($this->apiUrl . '?key=' . $this->apiKey);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => ['Content-Type: application/json']
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            error_log("Gemini Response (HTTP $httpCode): " . $response);
            
            if ($error = curl_error($ch)) {
                throw new Exception("CURL Error: " . $error);
            }
            
            curl_close($ch);

            if ($httpCode !== 200) {
                $responseData = json_decode($response, true);
                $errorMessage = isset($responseData['error']['message']) 
                    ? $responseData['error']['message'] 
                    : "API request failed with HTTP $httpCode";
                throw new Exception($errorMessage);
            }

            $responseData = json_decode($response, true);
            if (!isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
                error_log("Invalid API response: " . json_encode($responseData));
                throw new Exception("API returned unexpected format");
            }
            
            return $responseData['candidates'][0]['content']['parts'][0]['text'];
        } catch (Exception $e) {
            error_log("Error in callGemini: " . $e->getMessage());
            throw $e;
        }
    }

    private function callDeepSeek($promptData) {
        try {
            $data = [];
            
            if (is_array($promptData) && isset($promptData['messages'])) {
                // If it's already in DeepSeek format (from createContinuationPrompt)
                $data = $promptData;
                error_log("Using pre-formatted DeepSeek messages format");
            } else {
                // For single prompts - this is the path for initial prompts with PDF context
                error_log("Creating new DeepSeek messages format for single prompt");
                error_log("General instructions length: " . strlen($this->generalInstructions));
                
                // Get first 100 chars of general instructions for debug
                $instructionsPreview = substr($this->generalInstructions, 0, 100) . '...';
                error_log("General instructions preview: " . $instructionsPreview);
                
                $data = [
                    'model' => 'deepseek/deepseek-chat-v3-0324:free',
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
                
                // Log first 100 chars of prompt for debug
                $promptPreview = substr($promptData, 0, 100) . '...';
                error_log("Prompt preview: " . $promptPreview);
            }

            // Ensure model is specified for OpenRouter
            if (!isset($data['model'])) {
                $data['model'] = 'deepseek/deepseek-chat-v3-0324:free';
            }
            
            // Format the data JSON for logging with better readability
            $formattedJson = json_encode($data, JSON_PRETTY_PRINT);
            error_log("Sending to DeepSeek: " . $formattedJson);
            
            $ch = curl_init($this->apiUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $this->apiKey,
                    'HTTP-Referer: http://localhost:3000',
                    'X-Title: StudySimplify'
                ]
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            error_log("DeepSeek Response (HTTP $httpCode): " . $response);
            
            if ($error = curl_error($ch)) {
                throw new Exception("CURL Error: " . $error);
            }
            
            curl_close($ch);

            if ($httpCode !== 200) {
                $responseData = json_decode($response, true);
                $errorMessage = isset($responseData['error']['message']) 
                    ? $responseData['error']['message'] 
                    : "API request failed with HTTP $httpCode";
                throw new Exception($errorMessage);
            }

            $responseData = json_decode($response, true);
            if (!isset($responseData['choices'][0]['message']['content'])) {
                error_log("Invalid API response: " . json_encode($responseData));
                throw new Exception("API returned unexpected format");
            }
            
            error_log("Successfully received DeepSeek response");
            return $responseData['choices'][0]['message']['content'];
        } catch (Exception $e) {
            error_log("Error in callDeepSeek: " . $e->getMessage());
            throw $e;
        }
    }
} 