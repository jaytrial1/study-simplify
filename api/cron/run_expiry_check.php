<?php
// Simple script to run expiry check via cron job
// Can be called daily from cPanel or hosting provider's cron job manager

// No output unless error occurs
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Allow running from CLI
if (php_sapi_name() === 'cli') {
    // Path adjustment when run from command line
    $base_path = dirname(dirname(__DIR__));
    require_once $base_path . '/config/database.php';
} else {
    // Regular web path
    require_once '../../config/database.php';
}

try {
    // Get database connection
    $conn = getConnection();
    
    // Run the expiry check directly
    $update_query = "UPDATE owner_plans 
                     SET payment_status = 'expired',
                         updated_at = NOW()
                     WHERE expiry_date IS NOT NULL 
                       AND expiry_date < CURDATE()
                       AND payment_status != 'expired'";
    
    $result = $conn->query($update_query);
    
    if ($result === false) {
        throw new Exception("Failed to update expired plans: " . $conn->error);
    }
    
    $affected_rows = $conn->affected_rows;
    
    // Log execution to database for monitoring
    $log_message = "Plan expiry check completed successfully";
    $log_query = "INSERT INTO system_logs (log_type, message, affected_rows, execution_time) 
                  VALUES ('EXPIRY_CHECK', ?, ?, NOW())";
    
    $stmt = $conn->prepare($log_query);
    $stmt->bind_param("si", $log_message, $affected_rows);
    $stmt->execute();
    
    // Only output in CLI mode
    if (php_sapi_name() === 'cli') {
        echo "Expiry check completed: " . $affected_rows . " plans marked as expired.\n";
    }
    
    // Log the action to error log as well
    error_log("Plan expiry check completed: " . $affected_rows . " plans marked as expired.");
    
    // Close connection
    $conn->close();
    
    // Output only if web request
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'message' => 'Expiry check completed successfully',
            'updated_plans' => $affected_rows
        ]);
    }
    
} catch (Exception $e) {
    error_log("ERROR in expiry check: " . $e->getMessage());
    
    // Try to log error to database if possible
    if (isset($conn) && $conn) {
        try {
            $error_message = "Error in expiry check: " . $e->getMessage();
            $log_query = "INSERT INTO system_logs (log_type, message, execution_time) 
                         VALUES ('EXPIRY_ERROR', ?, NOW())";
            
            $stmt = $conn->prepare($log_query);
            $stmt->bind_param("s", $error_message);
            $stmt->execute();
        } catch (Exception $logEx) {
            // Silently fail if logging error fails
            error_log("Could not log error to database: " . $logEx->getMessage());
        }
    }
    
    if (php_sapi_name() === 'cli') {
        echo "ERROR: " . $e->getMessage() . "\n";
    } else {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Error running expiry check: ' . $e->getMessage()
        ]);
    }
} 