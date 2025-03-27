<?php
// Function to load a follow-up prompt template
function loadFollowUpTemplate($promptId) {
    $templatePath = __DIR__ . '/templates/follow up/' . $promptId . '.php';
    
    if (!file_exists($templatePath)) {
        return null;
    }
    
    // Load the template without modifying it
    $template = require($templatePath);
    
    return $template;
}

// Function to check if a message is a follow-up request
function isFollowUpRequest($message) {
    return preg_match('/^@follow_up:(.+)$/', $message, $matches) === 1 ? $matches[1] : false;
} 