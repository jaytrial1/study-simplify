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
    
    public function getPromptTemplate($type = 'long', $grade = null) {
        // If grade is provided, check for grade-specific template
        if ($grade) {
            // Normalize grade format to match directory naming (remove spaces, dots, convert to lowercase)
            $gradeDir = strtolower(str_replace([' ', '.', '-'], '', $grade));
            
            // Log the normalized grade for debugging
            error_log("Original grade: {$grade}, normalized to: {$gradeDir}");
            
            // Path to grade-specific template
            $gradePath = __DIR__ . "/../api/ai/templates/{$gradeDir}/{$type}.php";
            
            // If grade-specific template exists, use it
            if (file_exists($gradePath)) {
                error_log("Using grade-specific template: {$gradePath}");
                return require $gradePath;
            }
            
            // Log if grade directory exists but specific template doesn't
            $gradeDirPath = __DIR__ . "/../api/ai/templates/{$gradeDir}";
            if (is_dir($gradeDirPath)) {
                error_log("Grade directory exists but {$type}.php not found in {$gradeDirPath}");
            }
        }
        
        // Fall back to default template if grade-specific not found
        error_log("Using default template for type: {$type}");
        return require __DIR__ . "/../api/ai/templates/{$type}.php";
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
                $data['model'] = 'deepseek/deepseek-chat:free';
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