<?php
// Script to check for expired plans and update their status
// This script is meant to be run as a cron job or manually via the admin interface

// Set error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include database configuration
require_once '../../config/database.php';

// Log function for output
function log_message($message) {
    echo date('Y-m-d H:i:s') . " - $message\n";
}

try {
    log_message("Starting plan expiry check...");

    // Get database connection
    $conn = getConnection();
    
    // Get plans that have expired but not yet marked as expired
    $query = "SELECT p.plan_id, o.full_name, o.class_name, p.expiry_date, p.payment_status
              FROM owner_plans p
              JOIN owners o ON p.owner_id = o.owner_id
              WHERE p.expiry_date IS NOT NULL 
              AND p.expiry_date < CURDATE()
              AND p.payment_status != 'expired'
              ORDER BY p.plan_id";
    
    $result = $conn->query($query);
    
    // Check if query was successful
    if ($result === false) {
        throw new Exception("Database query failed: " . $conn->error);
    }
    
    // Count of plans that were updated
    $updatedCount = 0;
    
    // Process each expired plan
    while ($plan = $result->fetch_assoc()) {
        log_message("Found expired plan #{$plan['plan_id']} for {$plan['full_name']} - {$plan['class_name']} (Expired on: {$plan['expiry_date']}, Current status: {$plan['payment_status']})");
        
        // Update plan status to expired
        $update_sql = "UPDATE owner_plans SET payment_status = 'expired' WHERE plan_id = ?";
        $stmt = $conn->prepare($update_sql);
        $stmt->bind_param("i", $plan['plan_id']);
        
        if ($stmt->execute()) {
            log_message("Plan #{$plan['plan_id']} successfully marked as expired.");
            $updatedCount++;
        } else {
            log_message("Error updating plan #{$plan['plan_id']}: " . $stmt->error);
        }
        
        $stmt->close();
    }
    
    // Summary message
    if ($updatedCount > 0) {
        log_message("Updated $updatedCount plan(s) to expired status.");
    } else {
        log_message("No plans needed to be updated to expired status.");
    }
    
    // Close database connection
    $conn->close();
    
    log_message("Plan expiry check completed.");
    
} catch (Exception $e) {
    log_message("ERROR: " . $e->getMessage());
    log_message("Stack trace: " . $e->getTraceAsString());
} 