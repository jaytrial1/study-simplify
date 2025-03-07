<?php
header("Content-Type: application/json");
session_start();

require_once '../../config/database.php';

// Debug information
error_log("Session user_id: " . (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'not set'));
error_log("Grade parameter: " . (isset($_GET['grade']) ? $_GET['grade'] : 'not set'));

// Get user ID from session or URL parameter
$userId = isset($_GET['user_id']) ? $_GET['user_id'] : (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null);
$grade = isset($_GET['grade']) ? $_GET['grade'] : '';

if (!$userId || !$grade) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

try {
    $conn = getConnection();
    
    // Fetch all saved answers for the user's grade in one query
    $sql = "SELECT * FROM saved_answers 
            WHERE user_id = ? AND grade = ? 
            ORDER BY subject, chapter, created_at DESC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $userId, $grade);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $savedAnswers = [];
    while ($row = $result->fetch_assoc()) {
        $savedAnswers[] = [
            'id' => $row['id'],
            'subject' => $row['subject'],
            'chapter' => $row['chapter'],
            'question_identifier' => $row['question_identifier'],
            'answer_text' => $row['answer_text'],
            'created_at' => $row['created_at'],
            'save_type' => $row['save_type']
        ];
    }
    
    echo json_encode(['answers' => $savedAnswers]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>
