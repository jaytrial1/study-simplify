<?php
// Function to load a follow-up prompt template
function loadFollowUpTemplate($promptId, $previousResponse = '') {
    $templatePath = __DIR__ . '/templates/follow up/' . $promptId . '.php';
    
    if (!file_exists($templatePath)) {
        return null;
    }
    
    // Load the template 
    $template = require($templatePath);
    
    // Replace placeholder with actual previous response if it exists
    if (!empty($previousResponse)) {
        $template = str_replace('{previous_response}', $previousResponse, $template);
    }
    
    return $template;
}

// Function to check if a message is a follow-up request
function isFollowUpRequest($message) {
    return preg_match('/^@follow_up:(.+)$/', $message, $matches) === 1 ? $matches[1] : false;
} 