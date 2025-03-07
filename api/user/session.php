<?php
header('Content-Type: application/json');
session_start();

require_once '../../config/database.php';

// If the user is logged in, return their data
if (isset($_SESSION['user_id'])) {
    try {
        $conn = getConnection();
        $stmt = $conn->prepare("SELECT id, name, email, grade_level FROM users WHERE id = ?");
        $stmt->bind_param("i", $_SESSION['user_id']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'grade' => $row['grade_level']
                ]
            ]);
        } else {
            // User ID in session doesn't exist in database
            session_destroy();
            echo json_encode([
                'success' => false,
                'error' => 'Invalid user session'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Database error'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Not logged in'
    ]);
}
?> 