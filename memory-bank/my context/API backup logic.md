# Backup API System Documentation

## Overview
This system implements API redundancy with cost optimization for AI services. It supports two providers (Gemini and OpenRouter) with multiple API keys per provider, prioritizing free tier usage and minimizing paid API costs.

## Architecture

### Provider Configuration
- **Gemini Path**: Configured with specific model (e.g., "gemini-2.0-flash-lite")
- **OpenRouter Path**: Configured with specific model ID (e.g., "deepseek/deepseek-chat-v3-0324:free")

### API Key Management
For each provider:
- **Free Tier Keys**: 4 API keys with free quotas
- **Paid Tier Key**: 1 API key with paid usage
- **Priority**: Always exhaust free options before using paid key

### Failover Logic
1. Request arrives at the system
2. System determines active provider (Gemini or OpenRouter)
3. Tries API Key #1 from active provider
4. If successful, returns response
5. If fails for ANY reason (rate limit, quota, network error):
   - Immediately tries API Key #2 (< 1 second)
   - Then #3, then #4 if needed
6. Only if all free keys fail, system uses paid API Key #5

### Provider Selection
- Administrator can select active provider (Gemini or OpenRouter)
- Selection determines which set of 5 keys will be used
- Each provider has its own independent set of API keys

## Implementation Requirements

### Speed Requirements
- Failover detection and switching must occur in < 1 second
- User should not notice significant delay from failover process

### Error Handling
- Any error (not just rate limits) should trigger failover
- System logs failures but continues to next API key seamlessly

### Cost Optimization
- Free tiers are always tried first (keys #1-4)
- Paid tier (key #5) is only used when all free options are exhausted
- This minimizes operational costs while maintaining reliability

## Configuration Example
```php
// Provider settings
$providers = [
    'gemini' => [
        'model' => 'gemini-2.0-flash-lite',
        'keys' => [
            'free1' => 'key1...',
            'free2' => 'key2...',
            'free3' => 'key3...',
            'free4' => 'key4...',
            'paid' => 'paidkey...'
        ]
    ],
    'openrouter' => [
        'model' => 'deepseek/deepseek-chat-v3-0324:free',
        'keys' => [
            'free1' => 'key1...',
            'free2' => 'key2...',
            'free3' => 'key3...',
            'free4' => 'key4...',
            'paid' => 'paidkey...'
        ]
    ]
];

// Active provider setting
$activeProvider = 'gemini'; // or 'openrouter'
```
```

This documentation captures the complete backup API logic you've described, providing both a conceptual overview and implementation guidance.