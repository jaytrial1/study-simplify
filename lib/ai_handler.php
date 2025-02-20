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
    
    public function callGeminiAPI($prompt) {
        $data = [
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [['text' => $prompt]]
                ]
            ],
            'generationConfig' => [
                'temperature' => 1,
                'topP' => 0.95,
                'topK' => 64,
                'maxOutputTokens' => 8192
            ]
        ];

        $ch = curl_init($this->apiUrl . '?key=' . $this->apiKey);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($data),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        
        $response = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("API Error: " . $error);
        }

        $responseData = json_decode($response, true);
        return $responseData['candidates'][0]['content']['parts'][0]['text'] ?? 
               throw new Exception("Unexpected API response format");
    }
} 