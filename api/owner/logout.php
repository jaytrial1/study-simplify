<?php
header("Content-Type: application/json");

// No actual server-side session invalidation needed as we're using token-based auth
// The actual logout will be handled by the client by removing the token from localStorage
 
// Return success response
echo json_encode([
    'message' => 'Logged out successfully'
]);
?> 