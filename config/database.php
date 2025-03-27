<?php
function getConnection() {
    // Detect environment: Check if running on localhost or production server
    $isLocalEnvironment = false;
    
    // Common ways to detect localhost
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $serverAddr = $_SERVER['SERVER_ADDR'] ?? '';
    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    
    // Check various conditions that indicate a local environment
    if (
        $host == 'localhost' || 
        $host == '127.0.0.1' || 
        substr($host, 0, 8) == '192.168.' || 
        $serverAddr == '127.0.0.1' || 
        $serverAddr == '::1' || 
        $serverName == 'localhost'
    ) {
        $isLocalEnvironment = true;
    }
    
    // Set database credentials based on environment
    if ($isLocalEnvironment) {
        // Local server credentials
        $servername = "localhost";
        $username = "root";
        $password = "";
        $dbname = "studysimplify_new";
        
        // Log for debugging (optional)
        error_log("Using local database connection");
    } else {
        // Production server credentials
        $servername = "localhost";
        $username = "u891961505_Admin";
        $password = "1@yS@hil";
        $dbname = "u891961505_studysimplify";
        
        // Log for debugging (optional)
        error_log("Using production database connection");
    }

    // Create connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    
    // Set charset to UTF-8 to support Gujarati and other Unicode characters
    $conn->set_charset("utf8mb4");
    
    // Force UTF-8 connection for all operations
    $conn->query("SET NAMES utf8mb4");
    $conn->query("SET CHARACTER SET utf8mb4");
    $conn->query("SET COLLATION_CONNECTION=utf8mb4_unicode_ci");
    
    return $conn;
}
?>
