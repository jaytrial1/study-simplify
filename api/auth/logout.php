<?php
header("Content-Type: application/json");

// Since we're using JWT, we don't need server-side logout
// Just return success and let the frontend clear the token
echo json_encode(['message' => 'Logout successful']);
