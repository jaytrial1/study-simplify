<?php
header("Content-Type: application/json");
session_start();

require_once '../../config/database.php';

// For debugging
error_log("save_to_database.php called with method: " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Get data from request
    $userId = $_SESSION['user_id'] ?? $input['user_id'] ?? null;
    $subject = $input['subject'] ?? null;
    $chapter = $input['chapter'] ?? null;
    $question = $input['question'] ?? null;
    $aiResponse = $input['aiResponse'] ?? null;
    $saveType = $input['saveType'] ?? null;
    $grade = $input['grade'] ?? null;
    
    // Generate a hash of the answer text to use as part of uniqueness check
    // This allows multiple different answers to the same question
    $answerHash = substr(md5($aiResponse), 0, 10); // Short hash of the answer text
    
    // For debugging
    error_log("Input data: " . json_encode([
        'userId' => $userId,
        'subject' => $subject,
        'chapter' => $chapter,
        'question' => strlen($question) > 50 ? substr($question, 0, 50) . '...' : $question,
        'saveType' => $saveType,
        'grade' => $grade,
        'answerHash' => $answerHash
    ]));
    
    // Validate required parameters
    if (!$userId || !$subject || !$chapter || !$question || !$aiResponse || !$saveType || !$grade) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameters']);
        exit;
    }
    
    try {
        $conn = getConnection();
        
        // Check if this specific answer already exists for this user
        // Now using a hash of the answer content as part of the uniqueness check
        $checkSql = "SELECT id, save_type FROM saved_answers 
                     WHERE user_id = ? AND subject = ? AND chapter = ? AND question_identifier = ? AND grade = ? 
                     AND answer_text = ?";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bind_param("isssss", $userId, $subject, $chapter, $question, $grade, $aiResponse);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult->num_rows > 0) {
            // This exact answer already exists
            $existingAnswer = $checkResult->fetch_assoc();
            $existingSaveType = $existingAnswer['save_type'];
            
            // Return with message that it already exists and include the current save type
            echo json_encode([
                'success' => false,
                'message' => 'This exact answer already exists',
                'save_type' => $existingSaveType
            ]);
            exit;
        }
        
        // Insert new saved answer
        $insertSql = "INSERT INTO saved_answers (user_id, subject, chapter, question_identifier, answer_text, save_type, grade) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)";
        $insertStmt = $conn->prepare($insertSql);
        $insertStmt->bind_param("issssss", $userId, $subject, $chapter, $question, $aiResponse, $saveType, $grade);
        $insertStmt->execute();
        
        if ($insertStmt->affected_rows > 0) {
            echo json_encode([
                'success' => true, 
                'message' => 'Answer saved successfully',
                'save_type' => $saveType
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to save answer']);
        }
        
    } catch (Exception $e) {
        error_log("Database error in save_to_database.php: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    // Method not allowed
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>