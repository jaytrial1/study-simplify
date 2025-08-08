<?php
// AI Configuration
define('AI_MODEL', 'gemini'); // Options: 'gemini' or 'deepseek'
define('ENABLE_API_LOGGING', false); // Set to false to disable API key usage logging

// Gemini API Configuration
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
define('GEMINI_MODEL', 'gemini-2.5-flash');
define('GEMINI_KEYS', [
        // Free tier keys
        'AIzaSyCU4DtGal-p_x3aTG46Ro3qkncMPnMPo4Q',
        'AIzaSyC3ytLD5xZlCa70kYajN2RjW4ehdoX6IUjsdhvj',
        'AIzaSyCuqAj_Xdw192Is4tfH0uo6Rqbr3bJ4QWs',
        'AIzaSyBT3kJRHPts81wpwYHFQLuJ0NSeqt_kd4E',
        // Paid tier key (last resort)
        'AIzaSyC3ytLD5xZlCa70pkYajN2RjW4ehdoX6IU'
    ]);

// DeepSeek/OpenRouter API Configuration
define('DEEPSEEK_API_URL', 'https://openrouter.ai/api/v1/chat/completions');
define('DEEPSEEK_MODEL', 'deepseek/deepseek-chat-v3-0324:free');
define('DEEPSEEK_KEYS', [
        // Free tier keys - Ensure the format is correct (should start with sk-or-v1-)
        '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',
        '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',
        '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',
        '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',
        // Paid tier key (last resort)
        'sk-or-v1-paid-685ea31c14a73de5fa1b9f8dc81b9cfedba4c28ff69f22ef1f06a7a0a240ab2e'
    ]);

// File Repository Configuration
define('PDF_ROOT', 'E:/jay/Xampp/htdocs/Main/public/pdf_repository/');

// API Response Codes
define('API_SUCCESS', 200);
define('API_BAD_REQUEST', 400);
define('API_ERROR', 500);
