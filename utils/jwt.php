<?php
require_once __DIR__ . '/../config/config.php';

function generateJWTToken($userId) {
    $header = base64_encode(json_encode([
        'typ' => 'JWT',
        'alg' => 'HS256'
    ]));
    
    $payload = base64_encode(json_encode([
        'user_id' => $userId,
        'exp' => time() + (60 * 60 * 24) // 24 hours expiry
    ]));
    
    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = base64_encode($signature);
    
    return "$header.$payload.$signature";
}

function validateJWTToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    $payload = json_decode(base64_decode($parts[1]), true);
    if (!$payload || $payload['exp'] < time()) {
        return false;
    }
    
    return $payload['user_id'];
} 