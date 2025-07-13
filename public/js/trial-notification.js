/**
 * 7-Day Trial Notification for Students
 * This script shows trial notifications for students
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add debugging
    console.log("*** DEBUG: Trial notification script loaded ***");
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        console.log("DEBUG: No token found, user not logged in");
        return;
    }
    
    // Check if user has trial status from login response
    const progressStatus = localStorage.getItem('progressStatus');
    const trialExpiryDate = localStorage.getItem('trialExpiryDate');
    
    // Debug trial status values
    console.log("DEBUG: Trial status check - progressStatus:", progressStatus);
    console.log("DEBUG: Trial status check - trialExpiryDate:", trialExpiryDate);
    
    // Show notification based on user status
    if (progressStatus === 'demo' && trialExpiryDate) {
        console.log("DEBUG: User is on trial. Showing notification banner.");
        showTrialNotification(trialExpiryDate);
    } else if (progressStatus === 'expired') {
        console.log("DEBUG: User's trial has expired. Showing renewal notification.");
        showExpiredTrialNotification();
    } else {
        console.log("DEBUG: User is NOT on trial or missing expiry date. No notification shown.");
    }
});

/**
 * Shows a notification banner for trial users
 * This function is defined in the global scope so it can be called from other scripts
 */
function showTrialNotification(expiryDate) {
    // --- START: Do not show banner on specific pages ---
    const currentPage = window.location.pathname.split('/').pop();
    const noBannerPages = ['chatbot.html', 'saved_answers.html', 'settings.html'];
    
    if (noBannerPages.includes(currentPage)) {
        console.log(`DEBUG: On a page (${currentPage}) where the banner should not be shown.`);
        // On these pages, we want the toast, which is handled by trial-status-checker.js
        // We just need to prevent the banner from showing.
        return; 
    }
    // --- END: Do not show banner on specific pages ---

    // Check if notification already exists
    if (document.getElementById('trialNotificationBanner')) {
        console.log("DEBUG: Trial notification banner already exists");
        return;
    }
    
    console.log("DEBUG: Creating trial notification banner");
    
    // Create the banner element
    const banner = document.createElement('div');
    banner.id = 'trialNotificationBanner';
    banner.className = 'trial-notification-banner';
    
    // Calculate days remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log("DEBUG: Trial days remaining:", diffDays);
    
    // Format expiry date
    const formattedDate = expiry.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Set appropriate message based on days remaining
    let daysMessage = '';
    let statusClass = '';
    
    if (diffDays > 1) {
        daysMessage = `${diffDays} days remaining`;
        statusClass = 'status-active';
    } else if (diffDays === 1) {
        daysMessage = '1 day remaining';
        statusClass = 'status-warning';
    } else if (diffDays === 0) {
        daysMessage = 'Expires today';
        statusClass = 'status-warning';
    } else {
        daysMessage = 'Trial expired';
        statusClass = 'status-expired';
    }
    
    // Set banner content
    banner.innerHTML = `
        <div class="trial-notification-content">
            <div class="trial-icon">
                <i class="fas fa-clock"></i>
            </div>
            <div class="trial-details">
                <div class="trial-status ${statusClass}">Trial Active</div>
                <div class="trial-message">
                    You are currently on a 7-day trial. <strong>${daysMessage}</strong> until ${formattedDate}.
                    After expiry, you will need tuition owner approval to continue.
                </div>
            </div>
            <button id="closeTrialNotification" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add banner to the body (at the top)
    document.body.insertBefore(banner, document.body.firstChild);
    console.log("DEBUG: Trial notification banner added to DOM");
    
    // Add event listener to close button
    document.getElementById('closeTrialNotification').addEventListener('click', function() {
        banner.style.display = 'none';
        // Save that user has closed the notification (only hide for the session)
        sessionStorage.setItem('trialNotificationClosed', 'true');
        
        // Remove body padding when banner is closed
        document.body.style.paddingTop = '0';
        console.log("DEBUG: Trial notification closed by user");
    });
    
    // Add CSS
    addNotificationStyles();
}

/**
 * Shows a notification banner for users with expired trials
 * This includes a button to redirect to the settings page for renewal
 */
function showExpiredTrialNotification() {
    // Check if notification already exists
    if (document.getElementById('trialNotificationBanner')) {
        console.log("DEBUG: Trial notification banner already exists");
        return;
    }
    
    console.log("DEBUG: Creating expired trial notification banner");
    
    // Create the banner element
    const banner = document.createElement('div');
    banner.id = 'trialNotificationBanner';
    banner.className = 'trial-notification-banner expired-trial';
    
    // Set banner content with renewal button
    banner.innerHTML = `
        <div class="trial-notification-content">
            <div class="trial-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="trial-details">
                <div class="trial-status status-expired">Trial Expired</div>
                <div class="trial-message">
                    Your 7-day trial period has ended. Please renew your subscription to continue using all features.
                </div>
            </div>
            <button id="renewSubscriptionBtn" class="renew-button">
                Renew Now
            </button>
        </div>
    `;
    
    // Add banner to the body (at the top)
    document.body.insertBefore(banner, document.body.firstChild);
    console.log("DEBUG: Expired trial notification banner added to DOM");
    
    // Add event listener to renew button
    document.getElementById('renewSubscriptionBtn').addEventListener('click', function() {
        // Redirect to settings page
        window.location.href = 'settings.html';
        console.log("DEBUG: User redirected to settings page for renewal");
    });
    
    // Add CSS
    addNotificationStyles();
    
    // Add additional styles specific to expired notification
    const expiredStyle = document.createElement('style');
    expiredStyle.textContent = `
        .expired-trial {
            background-color: #6b1b19;
            border-bottom: 1px solid rgba(255,100,100,0.3);
        }
        
        .renew-button {
            background-color: #4caf50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .renew-button:hover {
            background-color: #45a049;
        }
        
        /* Make the expired notification more noticeable */
        body {
            padding-top: 70px !important;
        }
        
        .expired-trial .trial-icon {
            background-color: rgba(244, 67, 54, 0.2);
        }
        
        .expired-trial .trial-icon i {
            color: #f44336;
        }
    `;
    document.head.appendChild(expiredStyle);
}

/**
 * Adds the common notification styles to the document
 */
function addNotificationStyles() {
    // Check if styles are already added
    if (document.getElementById('trialNotificationStyles')) {
        return;
    }
    
    // Add CSS
    const style = document.createElement('style');
    style.id = 'trialNotificationStyles';
    style.textContent = `
        .trial-notification-banner {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background-color: #222639;
            color: #f8f9fa;
            z-index: 1001; /* Ensure banner is above header */
            padding: 12px 20px;
            text-align: left;
            font-size: 0.9rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .trial-notification-content {
            display: flex;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            gap: 15px;
        }
        
        .trial-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background-color: rgba(65, 105, 225, 0.2);
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .trial-icon i {
            color: #4169e1;
            font-size: 1rem;
        }
        
        .trial-details {
            flex: 1;
        }
        
        .trial-status {
            font-weight: 600;
            font-size: 0.85rem;
            margin-bottom: 3px;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }
        
        .status-active {
            color: #4caf50;
        }
        
        .status-warning {
            color: #ff9800;
        }
        
        .status-expired {
            color: #f44336;
        }
        
        .trial-message {
            line-height: 1.4;
            color: #e0e0e0;
        }
        
        .trial-message strong {
            color: #4169e1;
            font-weight: 600;
        }
        
        #closeTrialNotification {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #f8f9fa;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        
        #closeTrialNotification:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        /* Adjust for the notification bar */
        body {
            padding-top: 60px;
            transition: padding-top 0.3s ease;
        }
        
        @media (max-width: 768px) {
            .trial-notification-banner {
                padding: 10px 15px;
            }
            
            .trial-details {
                font-size: 0.85rem;
            }
            
            .trial-message {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            body {
                padding-top: 80px;
            }
            
            .trial-icon {
                width: 30px;
                height: 30px;
            }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Shows a popup toast notification for trial information
 * Can be called from any script
 */
function showTrialToast(message) {
    const toastElement = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toastElement || !toastMessage) {
        console.error('Toast notification elements not found');
        return;
    }
    
    // Set message
    toastMessage.textContent = message || "Your trial period is active. Check your settings for more information.";
    
    // Show the toast
    toastElement.classList.add('show');
    
    // Auto-hide after 5 seconds
    let autoHideTimeout = setTimeout(() => {
        if (toastElement.classList.contains('show')) { // Check if still visible
            toastElement.classList.remove('show');
        }
    }, 5000);

    // Find close button and attach event listener
    let closeButton = toastElement.querySelector('.toast-close-btn');
    if (closeButton) {
        closeButton.onclick = function() { 
            toastElement.classList.remove('show');
            clearTimeout(autoHideTimeout); // Clear the auto-hide timeout
        };
    }
}

// Add function to force show trial toast on page load
function forceShowTrialToast() {
    const progressStatus = localStorage.getItem('progressStatus');
    const trialExpiryDate = localStorage.getItem('trialExpiryDate');
    
    if (progressStatus === 'demo' && trialExpiryDate) {
        // Calculate days remaining
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(trialExpiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format date
        const formattedDate = expiry.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        let message = "";
        if (diffDays > 1) {
            message = `7-day trial active: ${diffDays} days remaining until ${formattedDate}`;
        } else if (diffDays === 1) {
            message = `Trial ends tomorrow (${formattedDate})`;
        } else if (diffDays === 0) {
            message = `Your trial expires today`;
        }
        
        // Show toast with specific message
        showTrialToast(message);
    }
}

// Force show trial toast on page load after a short delay,
// but not on chatbot.html
