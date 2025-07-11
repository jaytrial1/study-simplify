<?php
// Start session for potential admin authentication
session_start();

// Include database connection
require_once '../../config/database.php';

// Simple admin authentication - in a real app, you'd use your existing auth system
$isAuthenticated = false;

if (isset($_POST['username']) && isset($_POST['password'])) {
    // Very basic authentication (for demo purposes only)
    if ($_POST['username'] === 'admin' && $_POST['password'] === 'password') {
        $_SESSION['admin_authenticated'] = true;
    }
}

if (isset($_SESSION['admin_authenticated']) && $_SESSION['admin_authenticated'] === true) {
    $isAuthenticated = true;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Users Dashboard - StudySimplify</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            padding-top: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
        }
        .card {
            margin-bottom: 20px;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .card-header {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .stats-number {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .refresh-btn {
            cursor: pointer;
        }
        #lastUpdated {
            font-style: italic;
            font-size: 0.9rem;
        }
        .login-form {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
        }
        .table th, .table td {
            white-space: nowrap;
            vertical-align: middle;
        }
    </style>
</head>
<body>
<?php if (!$isAuthenticated): ?>
    <!-- Login Form -->
    <div class="container">
        <div class="card login-form">
            <div class="card-header text-center">
                Admin Login
            </div>
            <div class="card-body">
                <form method="post" action="">
                    <div class="mb-3">
                        <label for="username" class="form-label">Username</label>
                        <input type="text" class="form-control" id="username" name="username" required>
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary">Login</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
<?php else: ?>
    <!-- Dashboard Content -->
    <div class="container">
        <header class="pb-3 mb-4 border-bottom">
            <div class="d-flex justify-content-between align-items-center">
                <h1>Active Users Dashboard</h1>
                <div class="text-muted" id="lastUpdated">Last updated: -</div>
            </div>
        </header>

        <div class="row">
            <!-- Summary Stats -->
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-header">
                        Total Active Users
                        <i class="refresh-btn float-end bi bi-arrow-clockwise" onclick="refreshStats()"></i>
                    </div>
                    <div class="card-body">
                        <div class="stats-number" id="totalActive">-</div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-header">Logged In Users</div>
                    <div class="card-body">
                        <div class="stats-number" id="loggedInUsers">-</div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-header">Anonymous Users</div>
                    <div class="card-body">
                        <div class="stats-number" id="anonymousUsers">-</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <!-- Page Distribution -->
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        Pages Being Viewed
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Page</th>
                                        <th>Users</th>
                                    </tr>
                                </thead>
                                <tbody id="pageStats">
                                    <!-- Will be populated by JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Users -->
            <div class="col-md-12 mt-4">
                <div class="card">
                    <div class="card-header">
                        Most Recent Activity
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>User ID</th>
                                        <th>Email</th>
                                        <th>Subdomain</th>
                                        <th>Status</th>
                                        <th>Phone</th>
                                        <th>Page</th>
                                        <th>Last Active</th>
                                    </tr>
                                </thead>
                                <tbody id="recentUsers">
                                    <!-- Will be populated by JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Determine if we're in a local development environment
        const isLocalDev = () => {
            return (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.startsWith('192.168.')
            );
        };
        
        // Get base path for API calls
        const getBasePath = () => {
            const pathParts = window.location.pathname.split('/');
            if (pathParts.length > 1 && pathParts[1] === 'main') {
                return '/main';
            }
            return '';
        };
        
        // Function to format date/time
        function formatDateTime(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString();
        }
        
        // Function to refresh stats
        function refreshStats() {
            // Build the API URL
            const basePath = getBasePath();
            let apiUrl = `${basePath}/active-users/api/get-stats-fixed.php?type=detailed`;
            
            // For local development, add bypass parameter
            if (isLocalDev()) {
                apiUrl += '&bypass=local';
            }
            
            // Basic auth credentials for the fetch request
            const credentials = {
                username: 'admin',
                password: 'password'
            };
            
            // Convert credentials to base64
            const authHeader = 'Basic ' + btoa(credentials.username + ':' + credentials.password);
            
            // Show loading state
            document.getElementById('totalActive').innerHTML = '<small>Loading...</small>';
            document.getElementById('loggedInUsers').innerHTML = '<small>Loading...</small>';
            document.getElementById('anonymousUsers').innerHTML = '<small>Loading...</small>';
            
            fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || `Status: ${response.status}`);
                    }).catch(e => {
                        // If response isn't valid JSON
                        throw new Error(`Status: ${response.status}, not valid JSON`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    // Update summary stats
                    document.getElementById('totalActive').textContent = data.stats.total_active;
                    document.getElementById('loggedInUsers').textContent = data.stats.logged_in_users;
                    document.getElementById('anonymousUsers').textContent = data.stats.anonymous_users;
                    document.getElementById('lastUpdated').textContent = 'Last updated: ' + formatDateTime(data.timestamp);
                    
                    // Update page stats
                    const pageStatsTable = document.getElementById('pageStats');
                    pageStatsTable.innerHTML = '';
                    
                    if (data.stats.pages && data.stats.pages.length > 0) {
                        data.stats.pages.forEach(page => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${page.page}</td>
                                <td>${page.count}</td>
                            `;
                            pageStatsTable.appendChild(row);
                        });
                    } else {
                        pageStatsTable.innerHTML = '<tr><td colspan="2" class="text-center">No active pages</td></tr>';
                    }
                    
                    // Update recent users
                    const recentUsersTable = document.getElementById('recentUsers');
                    recentUsersTable.innerHTML = '';
                    
                    if (data.stats.recent_users && data.stats.recent_users.length > 0) {
                        data.stats.recent_users.forEach(user => {
                            const row = document.createElement('tr');
                            const displayName = user.user_name 
                                ? user.user_name 
                                : (user.user_id ? 'User #' + user.user_id : 'Anonymous');
                            
                            row.innerHTML = `
                                <td>${displayName}</td>
                                <td>${user.user_id || '-'}</td>
                                <td>${user.email || '-'}</td>
                                <td>${user.subdomain_identifier || 'N/A'}</td>
                                <td>${user.Progress_status || '-'}</td>
                                <td>${user.phone_number || '-'}</td>
                                <td>${user.page}</td>
                                <td>${formatDateTime(user.last_activity)}</td>
                            `;
                            recentUsersTable.appendChild(row);
                        });
                    } else {
                        recentUsersTable.innerHTML = '<tr><td colspan="3" class="text-center">No recent activity</td></tr>';
                    }
                } else if (data.status === 'error') {
                    console.error('API error:', data.message);
                    showError(data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching stats:', error);
                showError(error.message);
            });
        }
        
        // Function to show errors in the UI
        function showError(message) {
            const errorMsg = `<div class="text-danger">Error: ${message}</div>`;
            document.getElementById('totalActive').innerHTML = errorMsg;
            document.getElementById('loggedInUsers').innerHTML = '-';
            document.getElementById('anonymousUsers').innerHTML = '-';
            
            // Show error in tables
            document.getElementById('pageStats').innerHTML = '<tr><td colspan="2" class="text-center text-danger">Failed to load data</td></tr>';
            document.getElementById('recentUsers').innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load data</td></tr>';
            
            // Show a special message if the table doesn't exist
            if (message.includes('does not exist')) {
                const setupMessage = `
                <div class="alert alert-warning mt-3">
                    <h4>Database Setup Required</h4>
                    <p>The active_users table hasn't been created yet. Please run the setup.sql script to set up the tracking database.</p>
                    <p>You can do this by:</p>
                    <ol>
                        <li>Go to phpMyAdmin</li>
                        <li>Select your database</li>
                        <li>Go to the SQL tab</li>
                        <li>Import the file at <code>${getBasePath()}/active-users/setup.sql</code></li>
                    </ol>
                </div>
                `;
                document.querySelector('.container').insertAdjacentHTML('beforeend', setupMessage);
            }
        }
        
        // Initial load
        document.addEventListener('DOMContentLoaded', () => {
            refreshStats();
            // Auto-refresh every 30 seconds
            setInterval(refreshStats, 30000);
        });
    </script>
<?php endif; ?>

<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css">
</body>
</html> 