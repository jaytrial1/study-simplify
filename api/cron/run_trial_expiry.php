<?php
/**
 * Manual Trial Expiry Runner
 * 
 * Use this file to manually test the trial expiry process.
 * Just open this file in your browser to run it.
 */

// Set execution time to unlimited for large databases
set_time_limit(0);

// Set content type for browser output
header('Content-Type: text/html; charset=utf-8');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo '<html><head><title>Manual Trial Expiry Check</title>';
echo '<style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1 { color: #333; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    .success { color: green; }
    .error { color: red; }
    .warning { color: orange; }
</style>';
echo '</head><body>';
echo '<h1>Manual Trial Expiry Check</h1>';
echo '<p>This tool allows you to check and update expired trials manually.</p>';

// Start output buffering to capture console output
ob_start();

// Include and run the expire_trials.php script
echo '<h2>Running Trial Expiry Check:</h2>';
echo '<pre>';
include_once('expire_trials.php');
echo '</pre>';

// Get the output and display it
$output = ob_get_clean();
echo $output;

echo '<h2>What This Tool Does:</h2>';
echo '<ul>';
echo '<li>Checks all users with <code>Progress_status = "demo"</code></li>';
echo '<li>Compares their trial expiry date with today\'s date</li>';
echo '<li>Updates their status to <code>expired</code> if their trial has ended</li>';
echo '</ul>';

echo '<h2>Next Steps:</h2>';
echo '<ul>';
echo '<li>For real deployment, set up a daily cron job to run <code>expire_trials.php</code></li>';
echo '<li>Cron expression: <code>0 0 * * * /usr/bin/php /path/to/expire_trials.php</code></li>';
echo '</ul>';

// Add a button to refresh the page
echo '<p><a href="' . $_SERVER['PHP_SELF'] . '" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">Run Again</a></p>';

echo '</body></html>';
?> 