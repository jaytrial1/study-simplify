<?php
/**
 * Check Plan Expiry Script
 * 
 * This script checks for plans that have expired and updates their status.
 * It should be run daily via cron job.
 * 
 * Example cron job (runs daily at midnight):
 * 0 0 * * * php /path/to/htdocs/main/api/cron/check_plan_expiry.php
 */

// Set to error reporting only
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log function for debugging
function log_message($message) {
    $date = date('Y-m-d H:i:s');
    $log = "[$date] $message" . PHP_EOL;
    file_put_contents(__DIR__ . '/plan_expiry.log', $log, FILE_APPEND);
}

// Load database configuration
require_once '../../config/database.php';
$conn = getConnection();

try {
    // Start transaction
    $conn->begin_transaction();
    
    // Get current date for comparison
    $today = date('Y-m-d');
    log_message("Starting plan expiry check for date: $today");
    
    // Find plans that have expiry_date before today but are not yet marked as expired
    $stmt = $conn->prepare("SELECT plan_id, owner_id, payment_status, expiry_date 
                           FROM owner_plans 
                           WHERE expiry_date < ? 
                           AND payment_status != 'expired'
                           AND expiry_date IS NOT NULL");
    
    $stmt->bind_param("s", $today);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expired_count = 0;
    
    if ($result->num_rows > 0) {
        // Update each plan to expired status
        $update_stmt = $conn->prepare("UPDATE owner_plans SET payment_status = 'expired' WHERE plan_id = ?");
        
        while ($plan = $result->fetch_assoc()) {
            $update_stmt->bind_param("i", $plan['plan_id']);
            $update_stmt->execute();
            
            if ($update_stmt->affected_rows > 0) {
                $expired_count++;
                log_message("Plan ID {$plan['plan_id']} for Owner ID {$plan['owner_id']} marked as expired. Previous status: {$plan['payment_status']}, Expiry date: {$plan['expiry_date']}");
            }
        }
    }
    
    // Commit the transaction
    $conn->commit();
    
    log_message("Plan expiry check complete. $expired_count plans marked as expired.");
    
    // Output for cron job logging
    echo "Plan expiry check complete. $expired_count plans marked as expired." . PHP_EOL;
    
} catch (Exception $e) {
    // Roll back the transaction on error
    $conn->rollback();
    
    $error_message = "Error checking plan expiry: " . $e->getMessage();
    log_message($error_message);
    
    // Output for cron job logging
    echo $error_message . PHP_EOL;
    
} finally {
    // Close connection
    $conn->close();
}
?> 