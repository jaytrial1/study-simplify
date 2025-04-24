<?php
function getConnection() {
    // Ensure maximum error reporting for debugging
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    
    // Detect environment: Check if running on localhost or production server
    $isLocalEnvironment = false;
    
    // Common ways to detect localhost
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $serverAddr = $_SERVER['SERVER_ADDR'] ?? '';
    $serverName = $_SERVER['SERVER_NAME'] ?? '';
    
    // Log host information for debugging
    error_log("Database connection - HTTP_HOST: " . $host);
    error_log("Database connection - SERVER_ADDR: " . $serverAddr);
    error_log("Database connection - SERVER_NAME: " . $serverName);
    error_log("Database connection - REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown'));
    
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
    
    // Handle subdomains - always treat them as production environment
    if (strpos($host, '.studysimplify.in') !== false) {
        $isLocalEnvironment = false;
        error_log("Database connection - Subdomain detected: " . $host . " - Using production settings");
    }
    
    // If we're on studysimplify.in (main domain), ensure we use production settings
    if ($host === 'studysimplify.in') {
        $isLocalEnvironment = false;
        error_log("Database connection - Main domain detected - Using production settings");
    }
    
    // Set database credentials based on environment
    if ($isLocalEnvironment) {
        // Local server credentials
        $servername = "localhost";
        $username = "root";
        $password = "";
        $dbname = "studysimplify_new";
        
        // Log for debugging
        error_log("Using local database connection: $servername, $username, $dbname");
    } else {
        // Production server credentials
        $servername = "localhost";
        $username = "u891961505_Admin";
        $password = "1@yS@hil";
        $dbname = "u891961505_studysimplify";
        
        // Log for debugging
        error_log("Using production database connection: $servername, $username, $dbname");
    }

    // Create connection with error handling
    try {
        // Set a higher timeout for slow connections
        ini_set('default_socket_timeout', 60);
        
        // Try to establish the connection
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Check connection
    if ($conn->connect_error) {
            error_log("Database connection failed: " . $conn->connect_error);
            error_log("Connection error number: " . $conn->connect_errno);
            throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Set charset to UTF-8 to support Gujarati and other Unicode characters
        $result = $conn->set_charset("utf8mb4");
        if (!$result) {
            error_log("Failed to set charset: " . $conn->error);
        }
    
    // Force UTF-8 connection for all operations
    $conn->query("SET NAMES utf8mb4");
    $conn->query("SET CHARACTER SET utf8mb4");
    $conn->query("SET COLLATION_CONNECTION=utf8mb4_unicode_ci");
    
        error_log("Database connection successful");
        return $conn;
    } catch (Exception $e) {
        error_log("Database connection error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        // Try alternative approach as last resort if in production
        if (!$isLocalEnvironment) {
            error_log("Trying alternative connection method for production");
            try {
                // Try PDO as fallback
                $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                error_log("PDO connection successful as fallback");
                
                // Convert PDO to mysqli (simplified)
                $conn = new mysqli($servername, $username, $password, $dbname);
    return $conn;
            } catch (PDOException $pdoEx) {
                error_log("PDO fallback also failed: " . $pdoEx->getMessage());
            }
        }
        
        throw $e; // Re-throw to be caught by calling code
    }
}
?>
