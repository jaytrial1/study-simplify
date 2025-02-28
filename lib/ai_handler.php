<?php
require_once __DIR__ . '/config.php';

class AIHandler {
    private $apiKey;
    private $apiUrl;
    
    public function __construct() {
        $this->apiKey = GEMINI_API_KEY;
        $this->apiUrl = GEMINI_API_URL;
    }
    
    public function getPromptTemplate($type = 'long') {
        return require __DIR__ . "/../api/ai/templates/{$type}.php";
    }
    
    public function createPrompt($template, $data) {
        return str_replace(
            ['{extracted_text}', '{user_prompt}', '{question_name}'],
            [$data['extracted_text'], $data['user_prompt'], $data['question_name']],
            $template
        );
    }
    
    public function createContinuationPrompt($previousMessages, $userPrompt) {
        $formattedMessages = [];
        
        foreach ($previousMessages as $msg) {
            // Include system messages as user messages
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
                // Validate single prompt
                if (empty($promptData)) {
                    throw new Exception("Empty prompt provided");
                }

                $data = [
                    'contents' => [
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