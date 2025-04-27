# Backup API System Documentation

## Overview

The Backup API System implements an intelligent failover mechanism that automatically switches between multiple API keys when calling external AI services. This system ensures high availability and cost optimization by prioritizing free API keys before falling back to paid ones.

## Key Features

- **Multiple API Keys**: Support for 5 API keys for each AI provider (Gemini and OpenRouter)
- **Intelligent Failover**: Automatically tries the next key if the current one fails
- **Cost Optimization**: Prioritizes free tier keys (1-4) before using paid key (5)
- **Quick Recovery**: Sub-second failover detection and switching
- **Provider Selection**: Choose between Gemini or OpenRouter paths
- **Model Flexibility**: Configure which specific model to use with each provider
- **Persistent Selection**: Remembers the last working key to optimize future requests

## Architecture

### Provider Configuration

The system supports two main AI providers:

1. **Gemini**
   - Google's AI platform 
   - Default model: `gemini-2.0-flash-lite`
   - API endpoint: `generativelanguage.googleapis.com`

2. **OpenRouter**
   - Gateway to multiple AI models
   - Default model: `deepseek/deepseek-chat-v3-0324:free`
   - API endpoint: `openrouter.ai/api/v1/chat/completions`
   - Supports changing the model by updating the model string in the configuration

### API Key Structure

For each provider, the system maintains 5 API keys:

- **Free Tier Keys (1-4)**: API keys with free quotas or rate limits
- **Paid Tier Key (5)**: Premium API key that involves costs per request

The system is configured to always try the free keys first, in sequence, before using the paid key as a last resort.

### Failover Logic

1. When a request is received:
   - The system starts with the last successfully used API key
   - If the last key was the paid key (index 4), it resets to start with free keys

2. For each request, the system:
   - Tries API key #1 (or the last working key if it was a free one)
   - If successful, returns the response and remembers the key index
   - If fails for ANY reason (rate limit, network error, etc.):
     - Immediately tries the next key (within milliseconds)
     - Continues through all free keys before trying the paid key

3. The system prioritizes:
   - Quick detection of failures (5-second timeout)
   - Comprehensive error logging
   - Seamless user experience (sub-second fallback)

## Implementation Details

### Modified Files

1. **lib/config.php**
   - Added arrays of API keys for both providers
   - Separated model configuration from API endpoints
   - Structured keys with the paid key as the last element

2. **lib/ai_handler.php**
   - Updated the constructor to handle arrays of API keys
   - Implemented failover logic in callGemini and callDeepSeek methods
   - Added key index tracking for optimization
   - Added detailed error logging for troubleshooting

### Testing

A test script is available at `api/ai/test-backup.php` to verify the backup system functionality. It performs two API calls:
- A simple prompt to test basic functionality
- A complex prompt that might trigger rate limits or other failures

## Configuration Example

The system is configured in `lib/config.php`:

```php
// AI Configuration
define('AI_MODEL', 'deepseek'); // Options: 'gemini' or 'deepseek'

// Gemini API Configuration
define('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent');
define('GEMINI_MODEL', 'gemini-2.0-flash-lite');
define('GEMINI_KEYS', [
    // Free tier keys
    'AIzaSyC3ytLD5xZlCa70pkYajN2RjW4ehdoX6IU',
    'AIzaSyBZcYiuwJ_7pzPMh2JNfTdhDWnupW7JVO8',
    'AIzaSyCwEZhCGO8BSn7mXls7T4X--MLcQQJxRKc',
    'AIzaSyDKe_0-XRjH0Ci-3UQaFACMZYRFM12Ol2w',
    // Paid tier key (last resort)
    'AIzaSyCThTEsWFkjBRXZvlOzUXgY9ADoPg66cNU'
]);

// DeepSeek/OpenRouter API Configuration
define('DEEPSEEK_API_URL', 'https://openrouter.ai/api/v1/chat/completions');
define('DEEPSEEK_MODEL', 'deepseek/deepseek-chat-v3-0324:free');
define('DEEPSEEK_KEYS', [
    // Free tier keys
    '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',
    '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',
    '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',
    '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',
    // Paid tier key (last resort)
    'sk-or-v1-paid-685ea31c14a73de5fa1b9f8dc81b9cfedba4c28ff69f22ef1f06a7a0a240ab2e'
]);
```

## Changing Models

To change the specific model used by OpenRouter:

1. Update the `DEEPSEEK_MODEL` constant in `lib/config.php`
2. Use any model identifier supported by OpenRouter (e.g., `claude/claude-3-haiku`, `anthropic/claude-3-opus`, etc.)

## Troubleshooting

The system logs detailed information about API key attempts and failures to the PHP error log. Look for entries like:

- "Trying Gemini API key index: 0 (FREE)"
- "Gemini API request successful with key index: 2"
- "Error with key index 1: API request failed with HTTP 429" (rate limit exceeded)
- "All OpenRouter API keys failed. Errors: ..." (when all keys fail)

## Maintenance

When adding new API keys:

1. Update the appropriate array in `lib/config.php`
2. Remember to keep free keys at indexes 0-3 and paid key at index 4
3. Ensure keys are valid and have proper permissions

## Security Considerations

- API keys are stored in the PHP configuration file
- Consider using environment variables or a secure key management system in production
- The system is designed to minimize exposure of paid API keys by using them only as a last resort 