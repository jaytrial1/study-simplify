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
        if (is_array($promptData) && isset($promptData['messages'])) {
            // For chat history, format according to Gemini's chat model
            $data = [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [['text' => 'You are a helpful AI assistant. Please maintain context of our conversation.']]
                    ],
                    [
                        'role' => 'model',
                        'parts' => [['text' => 'I understand and will maintain context of our conversation.']]
                    ]
                ]
            ];
            
            // Add previous messages
            foreach ($promptData['messages'] as $message) {
                $data['contents'][] = [
                    'role' => $message['role'],
                    'parts' => [['text' => $message['parts'][0]['text']]]
                ];
            }
        } else {
            // For first message
            $data = [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [['text' => $promptData]]
                    ]
                ]
            ];
        }

        $ch = curl_init($this->apiUrl . '?key=' . $this->apiKey);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json']
        ]);
        
        error_log("Sending to Gemini: " . json_encode($data)); // Debug log
        $response = curl_exec($ch);
        error_log("Gemini Response: " . $response); // Debug log
        
        if ($error = curl_error($ch)) {
            throw new Exception("API Error: " . $error);
        }
        curl_close($ch);

        $responseData = json_decode($response, true);
        return $responseData['candidates'][0]['content']['parts'][0]['text'] ?? 
               throw new Exception("Unexpected API response format");
    }
} 