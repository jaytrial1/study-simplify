<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config/database.php'; // Adjusted path to go up one level then into config

$response = ['status' => 'error', 'message' => 'An unexpected error occurred.', 'exists' => false];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $buyer_email = isset($_POST['buyer_email']) ? trim($_POST['buyer_email']) : null;

    if (empty($buyer_email)) {
        $response['message'] = 'Buyer email is required.';
        echo json_encode($response);
        exit;
    }

    if (!filter_var($buyer_email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = 'Invalid buyer email format.';
        echo json_encode($response);
        exit;
    }

    $conn = null;
    try {
        $conn = getConnection();
        if (!$conn) {
            throw new Exception("Database connection failed.");
        }

        $stmt = $conn->prepare("SELECT 1 FROM users WHERE email = ? LIMIT 1");
        if (!$stmt) {
            throw new Exception("Failed to prepare statement: " . $conn->error);
        }
        
        $stmt->bind_param("s", $buyer_email);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $response['status'] = 'success';
            $response['exists'] = true;
            $response['message'] = 'Buyer email exists.';
        } else {
            $response['status'] = 'success';
            $response['exists'] = false;
            $response['message'] = 'Buyer email does not exist.';
        }
        
        $stmt->close();
        $conn->close();

    } catch (Exception $e) {
        error_log("Error in check_buyer_email.php: " . $e->getMessage());
        $response['message'] = "Server error: " . $e->getMessage(); // Keep it generic for client
        if ($conn && $conn->ping()) {
            $conn->close();
        }
    }
} else {
    $response['message'] = 'Invalid request method.';
}

echo json_encode($response);
?> 