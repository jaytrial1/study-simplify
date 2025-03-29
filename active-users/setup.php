<?php
// Simple script to set up the active_users database table

// Set a success flag
$success = false;
$message = '';

// Check if setup was requested
if (isset($_POST['setup']) && $_POST['setup'] === 'yes') {
    // Include database connection
    require_once '../config/database.php';
    
    try {
        // Connect to database
        $conn = getConnection();
        
        // Check if active_users table already exists
        $tableExists = false;
        $result = $conn->query("SHOW TABLES LIKE 'active_users'");
        if ($result) {
            $tableExists = ($result->num_rows > 0);
        }
        
        if ($tableExists) {
            $message = "The active_users table already exists. No action taken.";
        } else {
            // Create the active_users table
            $sql = file_get_contents('setup.sql');
            
            // Execute the SQL
            if ($conn->multi_query($sql)) {
                $success = true;
                $message = "Database setup completed successfully!";
                
                // Process all result sets (required for multi_query)
                do {
                    if ($result = $conn->store_result()) {
                        $result->free();
                    }
                } while ($conn->more_results() && $conn->next_result());
            } else {
                $message = "Error setting up database: " . $conn->error;
            }
        }
        
        $conn->close();
    } catch (Exception $e) {
        $message = "Error: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Users Tracking Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 40px;
            background-color: #f8f9fa;
        }
        .setup-container {
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .setup-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .setup-steps {
            margin-bottom: 30px;
        }
        .setup-success {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .setup-error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <div class="setup-header">
            <h1>Active Users Tracking Setup</h1>
            <p class="text-muted">This script will set up the necessary database table for tracking active users</p>
        </div>
        
        <?php if ($message): ?>
            <div class="<?php echo $success ? 'setup-success' : 'setup-error'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>
        
        <div class="setup-steps">
            <h3>Setup Process</h3>
            <p>This will create the following database table:</p>
            <pre>active_users</pre>
            
            <p>The table will store:</p>
            <ul>
                <li>User sessions</li>
                <li>Pages being viewed</li>
                <li>Last activity time</li>
                <li>Anonymous and logged-in user data</li>
            </ul>
            
            <p>The setup will also create:</p>
            <ul>
                <li>A cleanup procedure for removing inactive sessions</li>
                <li>Indexes for optimizing queries</li>
            </ul>
        </div>
        
        <?php if (!$success): ?>
            <form method="post" action="" class="mb-4">
                <div class="d-grid">
                    <input type="hidden" name="setup" value="yes">
                    <button type="submit" class="btn btn-primary btn-lg">Run Database Setup</button>
                </div>
            </form>
            
            <div class="alert alert-info">
                <strong>Note:</strong> This will only create the table if it doesn't already exist. It's safe to run this script multiple times.
            </div>
        <?php else: ?>
            <div class="d-grid gap-2">
                <a href="admin/dashboard.php" class="btn btn-success">Go to Admin Dashboard</a>
                <a href="integration-example.html" class="btn btn-outline-secondary">View Integration Example</a>
            </div>
        <?php endif; ?>
        
        <hr>
        
        <div class="setup-sql mt-4">
            <h4>SQL that will be executed:</h4>
            <pre><?php echo htmlspecialchars(file_get_contents('setup.sql')); ?></pre>
        </div>
    </div>
</body>
</html> 