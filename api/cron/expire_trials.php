<?php
/**
 * Trial Expiry Checker
 * 
 * This script checks for users with expired trials and updates their status.
 * It can be:
 * 1. Run manually by visiting this URL in a browser for testing
 * 2. Added to a cron job to run automatically each day
 * 
 * For hosting: Add to cron job to run daily at midnight
 * Cron expression: 0 0 * * * /usr/bin/php /path/to/expire_trials.php
 */

// Set headers for direct browser access
header('Content-Type: text/plain');

// Include database connection
require_once '../../config/database.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Connect to database
try {
    $conn = getConnection();
    echo "Successfully connected to database.\n";
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

// Get current date (server time)
$current_date = date('Y-m-d');
echo "Current date: $current_date\n";

// Find users with expired trials
$find_sql = "SELECT id, email, trial_expiry_date, Progress_status 
             FROM users 
             WHERE Progress_status = 'demo' 
             AND trial_expiry_date IS NOT NULL 
             AND trial_expiry_date < ?";

$find_stmt = $conn->prepare($find_sql);
$find_stmt->bind_param("s", $current_date);
$find_stmt->execute();
$result = $find_stmt->get_result();

// Count how many users will be updated
$expired_count = $result->num_rows;
echo "Found $expired_count users with expired trials.\n";

if ($expired_count > 0) {
    // Display users that will be marked as expired
    echo "\nUsers to be marked as expired:\n";
    echo "--------------------------------\n";
    
    // Store user IDs for batch update
    $expired_users = [];
    
    while ($user = $result->fetch_assoc()) {
        $expired_users[] = $user['id'];
        echo "User ID: {$user['id']}, Email: {$user['email']}, Trial Expiry: {$user['trial_expiry_date']}\n";
    }
    
    // Update all expired trials to 'expired' status
    $update_sql = "UPDATE users 
                  SET Progress_status = 'expired', 
                      is_active_by_owner = 0 
                  WHERE id IN (" . implode(',', $expired_users) . ")";
    
    if ($conn->query($update_sql)) {
        echo "\nSuccessfully updated $expired_count users to 'expired' status.\n";
    } else {
        echo "\nError updating users: " . $conn->error . "\n";
    }
} else {
    echo "No expired trials found.\n";
}

// Close database connection
$conn->close();
echo "\nScript execution completed at " . date('Y-m-d H:i:s') . "\n";
?> 