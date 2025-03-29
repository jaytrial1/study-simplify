<?php
// AI Configuration
define('AI_MODEL', 'deepseek'); // Options: 'gemini' or 'deepseek'
define('GEMINI_API_KEY', 'AIzaSyDdKHmIzLbGBKIX_j2DWm8Lg4Jqy4CihYo');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent');
define('DEEPSEEK_API_KEY', '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');
define('DEEPSEEK_API_URL', 'https://openrouter.ai/api/v1/chat/completions');

// File Repository Configuration
define('PDF_ROOT', 'E:/jay/Xampp/htdocs/Main/public/pdf_repository/');

// API Response Codes
define('API_SUCCESS', 200);
define('API_BAD_REQUEST', 400);
define('API_ERROR', 500);
