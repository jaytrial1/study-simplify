<?php
header("Content-Type: text/html");
?>
<!DOCTYPE html>
<html>
<head>
    <title>Test Plan Expiry</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        .button { 
            padding: 10px 15px; 
            background: #4CAF50; 
            color: white; 
            border: none; 
            cursor: pointer; 
            border-radius: 4px;
        }
        pre { 
            background: #f5f5f5; 
            padding: 15px; 
            border-radius: 5px; 
            white-space: pre-wrap;
        }
        .status-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .status-table th, .status-table td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .status-table th {
            background-color: #f2f2f2;
        }
        .status-expired {
            color: red;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Test Plan Expiry Checker</h1>
    
    <div>
        <h2>Current Plans Status</h2>
        <?php
        require_once '../../config/database.php';
        $conn = getConnection();
        
        // Get all plans with their expiry status
        $query = "SELECT p.plan_id, o.full_name, p.payment_status, p.expiry_date, 
                         (CASE WHEN p.expiry_date < CURDATE() THEN 'Yes' ELSE 'No' END) as should_be_expired
                  FROM owner_plans p
                  JOIN owners o ON p.owner_id = o.owner_id
                  WHERE p.expiry_date IS NOT NULL
                  ORDER BY p.expiry_date";
                  
        $result = $conn->query($query);
        
        if ($result->num_rows > 0) {
            echo '<table class="status-table">';
            echo '<tr><th>Plan ID</th><th>Owner</th><th>Status</th><th>Expiry Date</th><th>Should Be Expired?</th></tr>';
            
            while ($row = $result->fetch_assoc()) {
                $statusClass = ($row['payment_status'] == 'expired') ? 'status-expired' : '';
                
                echo '<tr>';
                echo '<td>' . $row['plan_id'] . '</td>';
                echo '<td>' . htmlspecialchars($row['full_name']) . '</td>';
                echo '<td class="' . $statusClass . '">' . $row['payment_status'] . '</td>';
                echo '<td>' . $row['expiry_date'] . '</td>';
                echo '<td>' . $row['should_be_expired'] . '</td>';
                echo '</tr>';
            }
            
            echo '</table>';
        } else {
            echo '<p>No plans found with expiry dates set.</p>';
        }
        ?>
    </div>
    
    <div style="margin-top: 30px;">
        <form method="post" action="">
            <input type="hidden" name="run_check" value="1">
            <button type="submit" class="button">Run Expiry Check Now</button>
        </form>
    </div>
    
    <?php
    // Process the check if requested
    if (isset($_POST['run_check'])) {
        echo '<h2>Check Results:</h2>';
        echo '<pre>';
        
        // Include the check script
        ob_start();
        include('../cron/check_plan_expiry.php');
        $output = ob_get_clean();
        
        echo htmlspecialchars($output);
        echo '</pre>';
        
        echo '<p><a href="test_plan_expiry.php">Refresh Page</a> to see updated plan statuses.</p>';
    }
    ?>
</body>
</html>
<?php
$conn->close();
?> 