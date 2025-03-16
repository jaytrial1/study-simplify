<?php
require_once __DIR__ . '/config.php';

class AIHandler {
    private $apiKey;
    private $apiUrl;
    private $generalInstructions;
    
    public function __construct() {
        $this->apiKey = GEMINI_API_KEY;
        $this->apiUrl = GEMINI_API_URL;
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
    }
    
    public function callGeminiAPI($promptData) {
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
            error_log("Error in callGeminiAPI: " . $e->getMessage());
            throw $e;
        }
    }
} 