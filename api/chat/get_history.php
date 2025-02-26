<?php
header('Content-Type: application/json');
require_once '../../config/database.php';

try {
    $user_id = $_GET['user_id'] ?? null;
    $subject = $_GET['subject'] ?? '';
    $chapter = $_GET['chapter'] ?? '';
    $search = $_GET['search'] ?? '';

    $conn = getConnection();
    
    // Base query
    $sql = "SELECT ch.*, 
            JSON_EXTRACT(conversation, '$[0].message') as first_message 
            FROM chat_history ch 
            WHERE user_id = ?";
    $params = [$user_id];
    $types = "i";

    // Add filters if provided
    if ($subject) {
        $sql .= " AND subject = ?";
        $params[] = $subject;
        $types .= "s";
    }
    if ($chapter) {
        $sql .= " AND chapter = ?";
        $params[] = $chapter;
        $types .= "s";
    }
    if ($search) {
        $sql .= " AND (conversation LIKE ? OR subject LIKE ? OR chapter LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $types .= "sss";
    }

    $sql .= " ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $history = [];
    while ($row = $result->fetch_assoc()) {
        $history[] = [
            'id' => $row['id'],
            'subject' => $row['subject'],
            'chapter' => $row['chapter'],
            'question_identifier' => $row['question_identifier'],
            'preview' => json_decode($row['first_message']),
            'created_at' => $row['created_at']
        ];
    }

    echo json_encode([
        'success' => true,
        'history' => $history
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} 