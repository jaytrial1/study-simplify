<?php
// AI Configuration
define('AI_MODEL', 'deepseek'); // Options: 'gemini' or 'deepseek'
define('GEMINI_API_KEY', 'AIzaSyDdKHmIzLbGBKIX_j2DWm8Lg4Jqy4CihYo');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent');
define('DEEPSEEK_API_KEY', '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');
define('DEEPSEEK_API_URL', 'https://openrouter.ai/api/v1/chat/completions');

// File Repository Configuration - Use relative path for cross-platform compatibility
define('PDF_ROOT', __DIR__ . '/../public/pdf_repository/');

// API Response Codes
define('API_SUCCESS', 200);
define('API_BAD_REQUEST', 400);
define('API_ERROR', 500);
