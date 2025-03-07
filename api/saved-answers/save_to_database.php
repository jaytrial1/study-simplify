<?php
require_once '../../config/database.php'; // Include database connection
header('Content-Type: application/json');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Ensure logging is on
ini_set('log_errors', 1);
ini_set('error_log', '../../error/errors.log'); // Adjust path as needed

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get and validate incoming data
$data = json_decode(file_get_contents("php://input"), true);
$required_fields = ['question', 'subject', 'chapter', 'saveType', 'grade', 'aiResponse'];

foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        echo json_encode(["success" => false, "message" => "Missing required field: " . $field]);
        exit;
    }
}

// Sanitize and prepare data
$question_identifier = htmlspecialchars(strip_tags($data['question']));
$subject = htmlspecialchars(strip_tags($data['subject']));
$chapter = htmlspecialchars(strip_tags($data['chapter']));
$grade = htmlspecialchars(strip_tags($data['grade']));
$answer_text = htmlspecialchars($data['aiResponse']);

// Modify this line to handle "Best Response"
$save_type = strtolower($data['saveType']) === 'question related' ? 'question_related' : 
             (strtolower($data['saveType']) === 'best response' ? 'Best Response' : 'normal');

// Validate user authentication
$user_id = $data['user_id'] ?? $_SESSION['user_id'] ?? null; // Use user ID from request if available
if (!$user_id) {
    echo json_encode(["success" => false, "message" => "User not authenticated. Please log in."]);
    exit;
}

error_log("Session data: " . print_r($_SESSION, true));

try {
    $conn = getConnection();

    // Check if the answer already exists
    $check_stmt = $conn->prepare("SELECT save_type FROM saved_answers WHERE user_id = ? AND subject = ? AND question_identifier = ? AND chapter = ? AND answer_text LIKE ?");
    $check_answer_text = substr($answer_text, 0, 255); // Truncate to 255 characters to match the unique key
    $check_stmt->bind_param("issss", $user_id, $subject, $question_identifier, $chapter, $check_answer_text);
    $check_stmt->execute();
    $check_stmt->store_result();

    if ($check_stmt->num_rows > 0) {
        $check_stmt->bind_result($existing_save_type_db);
        $check_stmt->fetch();
        $existing_save_type_display = ($existing_save_type_db === 'question_related') ? 'Question Related' : 'Best Response';
        
        // Log the existing save type for debugging
        error_log("Existing save type from database: " . $existing_save_type_db);
        
        // Update the message to reflect the existing save type
        echo json_encode(["success" => false, "message" => "This answer already exists as \"" . $existing_save_type_display . "\".", "save_type" => $existing_save_type_display]);
        exit;
    }

    // Insert the new answer
    $stmt = $conn->prepare("INSERT INTO saved_answers (user_id, question_identifier, subject, chapter, grade, answer_text, save_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssss", $user_id, $question_identifier, $subject, $chapter, $grade, $answer_text, $save_type);
    error_log("save_type value before insert: " . $save_type); // Add this line for logging
    $stmt->execute();

    echo json_encode(["success" => true, "message" => "Answer saved successfully"]);

    // Check if this is an update request
    // if (isset($data['updateType']) && $data['updateType'] === true) {
    //     try {
    //         $stmt = $conn->prepare("UPDATE saved_answers SET save_type = ? WHERE id = ?");
    //         $stmt->bind_param("si", $data['saveType'], $data['id']);
    //         $stmt->execute();
    //         echo json_encode(["success" => true]);
    //         exit;
    //     } catch (Exception $e) {
    //         echo json_encode(["success" => false, "message" => "Failed to update save type"]);
    //         exit;
    //     }
    // }

} catch (mysqli_sql_exception $e) {
    // Catch database errors, including duplicate entry errors
    if ($e->getCode() === 1062) { // Error code for duplicate entry
        echo json_encode(["success" => false, "message" => "This answer already exists."]);
    } else {
        error_log("Database error: " . $e->getMessage()); // Log other database errors
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage()); // Log other errors
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
}
?>