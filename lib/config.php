<?php
// AI Configuration
define('AI_MODEL', 'deepseek'); // Options: 'gemini' or 'deepseek'
define('GEMINI_API_KEY', 'AIzaSyC3ytLD5xZlCa70pkYajN2RjW4ehdoX6IU');
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent');
define('DEEPSEEK_API_KEY', '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');
define('DEEPSEEK_API_URL', 'https://openrouter.ai/api/v1/chat/completions');

// File Repository Configuration
define('PDF_ROOT', 'E:/jay/Xampp/htdocs/Main/public/pdf_repository/');

// API Response Codes
define('API_SUCCESS', 200);
define('API_BAD_REQUEST', 400);
define('API_ERROR', 500);
