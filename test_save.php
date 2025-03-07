<?php
// test_save.php
session_start();

// Simulate a logged-in user by setting the user ID
$_SESSION['user_id'] = 12; // You can change this to 14 to test with the second user

// Prepare test data
$testData = [
    'user_id' => 12, // Include user ID directly
    'question' => 'What is the capital of France?',
    'subject' => 'Geography',
    'chapter' => 'European Countries',
    'saveType' => 'Best Response',
    'grade' => '10th Grade',
    'aiResponse' => 'The capital of France is Paris.'
];

// Convert the test data to JSON
$jsonData = json_encode($testData);

// Set up a cURL request to the save_to_database.php file
$ch = curl_init('http://localhost/main/api/saved-answers/save_to_database.php'); // Adjust the URL as needed
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);

// Execute the request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Close the cURL session
curl_close($ch);

// Output the response
echo "HTTP Code: " . $httpCode . "\n";
echo "Response: " . $response;
?>
