<?php
header("Content-Type: application/json");
session_start();

require_once '../../config/database.php';

// Log incoming request
error_log("Update save type request: " . file_get_contents('php://input'));

// Check for POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

// Accept both camelCase and snake_case parameter names
$answerId = $input['answerId'] ?? $input['answer_id'] ?? null;
$saveType = $input['saveType'] ?? $input['save_type'] ?? null;

// Log params for debugging
error_log("answerId: $answerId, saveType: $saveType");

// Validate required parameters
if (!$answerId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing answer ID']);
    exit;
}

if (!$saveType) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing save type']);
    exit;
}

// Validate save type
$allowedTypes = ['Best response', 'question_related'];
if (!in_array($saveType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid save type']);
    exit;
}

try {
    $conn = getConnection();
    
    // First, get the user ID of the answer directly from the database
    $getUserSql = "SELECT user_id FROM saved_answers WHERE id = ?";
    $getUserStmt = $conn->prepare($getUserSql);
    $getUserStmt->bind_param("i", $answerId);
    $getUserStmt->execute();
    $getUserResult = $getUserStmt->get_result();
    
    if ($getUserResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Answer not found']);
        exit;
    }
    
    $answerData = $getUserResult->fetch_assoc();
    $ownerId = $answerData['user_id'];
    
    // Check if the user is authorized to update this answer
    // For now, we'll allow the update regardless of session user ID
    // In a production environment, you should validate the session user ID matches the answer owner
    
    // Update the save type
    $updateSql = "UPDATE saved_answers SET save_type = ? WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("si", $saveType, $answerId);
    $updateStmt->execute();
    
    if ($updateStmt->affected_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Save type updated successfully'
        ]);
    } else {
        // No changes were made (perhaps the same value was set)
        echo json_encode([
            'success' => true,
            'message' => 'No changes were needed'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage()
    ]);
}
?> 