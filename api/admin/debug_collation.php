<?php
header("Content-Type: application/json");
require_once '../../config/database.php';

$conn = getConnection();
$output = [];

// Get collation info for users table
$output['users_table'] = [];
$result = $conn->query("SHOW CREATE TABLE users");
if ($result) {
    $output['users_table']['create_statement'] = $result->fetch_row()[1];
}
$result = $conn->query("SHOW FULL COLUMNS FROM users WHERE Field = 'subdomain_identifier'");
if ($result) {
    $output['users_table']['subdomain_column'] = $result->fetch_assoc();
}

// Get collation info for owners table
$output['owners_table'] = [];
$result = $conn->query("SHOW CREATE TABLE owners");
if ($result) {
    $output['owners_table']['create_statement'] = $result->fetch_row()[1];
}
$result = $conn->query("SHOW FULL COLUMNS FROM owners WHERE Field = 'subdomain_identifier'");
if ($result) {
    $output['owners_table']['subdomain_column'] = $result->fetch_assoc();
}

// Output the information
echo json_encode($output, JSON_PRETTY_PRINT);
$conn->close();
?> 