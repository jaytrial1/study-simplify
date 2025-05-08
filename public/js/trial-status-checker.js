/**
 * Trial Status Checker
 * Checks if a user's trial has expired and logs them out if needed.
 * Used on protected pages (chatbot, settings, saved_answers)
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("*** DEBUG: Trial Status Checker loaded ***");
    
    // Always check with server first when page loads
    refreshTrialStatus();
    
    // Then check periodically every 5 minutes
    setInterval(checkLocalStatus, 5 * 60 * 1000);
});

/**
 * Checks if the user's trial has expired based on local storage data
 * This is only used for periodic checks between server refreshes
 */
function checkLocalStatus() {
    console.log("Performing periodic trial status check...");
    
    // Get trial information from localStorage
    const progressStatus = localStorage.getItem('progressStatus');
    const trialExpiryDate = localStorage.getItem('trialExpiryDate');
    
    // If we don't have status info, make an API call to refresh it
    if (!progressStatus || !trialExpiryDate) {
        refreshTrialStatus();
        return;
    }
    
    // Check if trial has expired
    if (progressStatus === 'demo') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(trialExpiryDate);
        expiry.setHours(0, 0, 0, 0);
        
        if (today > expiry) {
            console.log("Trial has expired according to localStorage. Verifying with server...");
            refreshTrialStatus(); // Double-check with server before logging out
        } else {
            // Trial is still valid, show notification if function exists
            if (typeof showTrialToast === 'function') {
                // Calculate days remaining
                const diffTime = expiry - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Format the date
                const formattedDate = expiry.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                });
                
                // Construct message based on days remaining
                let message = "";
                if (diffDays > 1) {
                    message = `Trial active: ${diffDays} days remaining until ${formattedDate}`;
                } else if (diffDays === 1) {
                    message = `Your trial expires tomorrow (${formattedDate})`;
                } else if (diffDays === 0) {
                    message = `Your trial expires today`;
                }
                
                // Show toast if there's a message
                if (message && Math.random() < 0.5) { // Only show 50% of the time on periodic checks
                    showTrialToast(message);
                }
            }
        }
    } else if (progressStatus === 'expired') {
        console.log("User status is expired. Logging out...");
        showExpiryMessage();
    }
}

/**
 * Makes an API call to refresh the trial status directly from the database
 * This is the primary function that actually checks current trial status
 */
function refreshTrialStatus() {
    console.log("Checking trial status directly from database...");
    
    const userId = localStorage.getItem('user_id');
    const token = localStorage.getItem('token');
    
    if (!userId || !token) {
        // If no user ID or token, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    // Make API call to check user status
    fetch(`${window.apiBasePath}/api/user/check_trial_status.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId })
    })
    .then(response => response.json())
    .then(data => {
        // Update localStorage with fresh status from database
        if (data.success) {
            // Log the data received from the API
            console.log("DEBUG: Trial status data from API:", data);
            
            // Update localStorage with latest values from database
            localStorage.setItem('progressStatus', data.progressStatus);
            localStorage.setItem('trialExpiryDate', data.trialExpiryDate);
            
            // Also update other user properties if available
            if (data.is_active_by_owner !== undefined) {
                localStorage.setItem('is_active_by_owner', data.is_active_by_owner);
            }
            if (data.is_approved_by_owner !== undefined) {
                localStorage.setItem('is_approved_by_owner', data.is_approved_by_owner);
            }
            if (data.is_active_by_admin !== undefined) {
                localStorage.setItem('is_active_by_admin', data.is_active_by_admin);
            }
            
            console.log("Status refreshed from database:", data.progressStatus);
            
            // Check if expired based on fresh data from database
            if (data.progressStatus === 'expired') {
                console.log("Trial is expired according to database. Logging out...");
                showExpiryMessage();
            } else if (data.progressStatus === 'demo') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expiry = new Date(data.trialExpiryDate);
                expiry.setHours(0, 0, 0, 0);
                
                if (today > expiry) {
                    console.log("Trial expiry date has passed according to database. Logging out...");
                    showExpiryMessage();
                } else {
                    // Still valid - update trial notification if it exists
                    if (typeof showTrialNotification === 'function') {
                        showTrialNotification(data.trialExpiryDate);
                    }
                    
                    // Also show toast notification for trial status
                    if (typeof showTrialToast === 'function') {
                        // Calculate days remaining
                        const diffTime = expiry - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // Format the date
                        const formattedDate = expiry.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        });
                        
                        // Show toast on page load
                        if (diffDays > 1) {
                            showTrialToast(`7-day Trial: ${diffDays} days left (ends ${formattedDate})`);
                        } else if (diffDays === 1) {
                            showTrialToast(`Trial expires tomorrow (${formattedDate})`);
                        } else if (diffDays === 0) {
                            showTrialToast(`Your trial expires today`);
                        }
                    }
                    
                    // Update trial section in settings page if we're on that page
                    if (typeof displayTrialStatus === 'function') {
                        displayTrialStatus();
                    }
                }
            }
        } else if (data.error && data.error.includes('expired')) {
            // If API explicitly says trial expired
            console.log("Trial expired according to API error message. Logging out...");
            showExpiryMessage();
        }
    })
    .catch(error => {
        console.error("Error checking trial status:", error);
    });
}

/**
 * Shows trial expiry message and logs user out
 */
function showExpiryMessage() {
    // Try to show a toast notification if available
    const toastElement = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toastElement && toastMessage) {
        toastMessage.textContent = "Your trial period has expired. Please contact your tuition owner for access.";
        toastElement.classList.add('show');
        
        // Logout after a short delay so user sees the message
        setTimeout(() => {
            performLogout();
        }, 3000);
    } else {
        // If no toast element, use alert and immediate logout
        alert("Your trial period has expired. Please contact your tuition owner for access.");
        performLogout();
    }
}

/**
 * Performs logout actions
 */
function performLogout() {
    // Try to call logout API
    const token = localStorage.getItem('token');
    
    // API call to logout
    fetch(`${window.apiBasePath}/api/auth/logout.php`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }).finally(() => {
        // Clear localStorage regardless of API success
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('userGrade');
        localStorage.removeItem('tuitionClass');
        localStorage.removeItem('progressStatus');
        localStorage.removeItem('trialExpiryDate');
        localStorage.removeItem('is_approved_by_owner');
        localStorage.removeItem('is_active_by_owner');
        localStorage.removeItem('is_active_by_admin');
        
        // Redirect to login page
        window.location.href = 'login.html';
    });
} 