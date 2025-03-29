# Active User Tracking System

This module provides real-time tracking of active users on your StudySimplify platform.

## Features

- Track how many users are currently active on your site
- Distinguish between logged-in and anonymous users
- See which pages are being viewed
- Works in both local and production environments
- Simple admin dashboard to view statistics
- Minimal performance impact

## Installation

1. **Import the database table**

   Run the SQL in `setup.sql` to create the necessary database table:

   ```sql
   mysql -u your_username -p your_database < setup.sql
   ```

   Or use phpMyAdmin to import the file.

2. **Include the tracking script**

   Add this script to your HTML pages (preferably right before the closing `</body>` tag):

   ```html
   <script src="/active-users/js/tracker.js"></script>
   ```

3. **Set up access to the admin dashboard**

   The default login credentials for the admin dashboard are:
   - Username: `admin`
   - Password: `password`

   **IMPORTANT:** Change these default credentials in both:
   - `active-users/api/get-stats.php`
   - `active-users/admin/dashboard.php`

## Usage

### Viewing Active User Stats

1. Access the admin dashboard at `/active-users/admin/dashboard.php`
2. Log in with your admin credentials
3. View real-time statistics about active users

### Programmatic Access

You can also access the stats via API:

- Basic stats: `/active-users/api/get-stats.php`
- Detailed stats: `/active-users/api/get-stats.php?type=detailed` (requires authentication)

### Using Active User Count in Your Pages

The tracking script dispatches a JavaScript event when it receives updated active user counts. You can use this to display the count on your pages:

```javascript
document.addEventListener('activeUsersUpdated', (event) => {
    const activeUserCount = event.detail.count;
    // Update your UI with the count
    console.log(`There are currently ${activeUserCount} active users`);
});
```

## Configuration

You can modify settings in the JavaScript tracker file (`tracker.js`):

- `pingInterval`: How often to send tracking pings (default: 60000ms/1 minute)
- `debug`: Enable/disable console logging

## How It Works

1. The tracker.js script runs on each page load and periodically sends pings to the server
2. Active sessions are recorded in the database with timestamps
3. Sessions are considered inactive after 15 minutes without activity
4. The system automatically cleans up old sessions

## Troubleshooting

- If tracking doesn't work, check browser console for errors
- Verify that your server can access the database
- Make sure session functionality is working properly

## Security Considerations

- The admin dashboard uses basic authentication
- Stats API has simple protection against unauthorized access
- No sensitive user information is collected

## License

This module is part of the StudySimplify platform and is subject to the same license terms. 