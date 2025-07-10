/**
 * Session Manager
 * Handles client-side session management and session expiration
 */

// Global variable to hold the session polling timer
let sessionPollInterval = null;

// Initialize session management when the script loads
(function() {
    // Set up global AJAX error handler for session expiration
    setupSessionExpirationHandler();
    
    // Check if we're on a login or signup page (don't redirect from these)
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('signup.html') ||
                       window.location.pathname.includes('register.html');
    
    // Verify session is valid on page load and start polling (except for auth pages)
    if (!isAuthPage) {
        verifySession().then(isValid => {
            if (isValid) {
                startSessionPolling();
            }
        });
    }
})();

/**
 * Sets up a global AJAX error handler to catch session expiration errors
 */
function setupSessionExpirationHandler() {
    // Store the original fetch function
    const originalFetch = window.fetch;
    
    // Override the fetch function to handle session expiration
    window.fetch = async function() {
        try {
            const response = await originalFetch.apply(this, arguments);
            
            // Check if response indicates session expiration
            if (response.status === 401) {
                const responseData = await response.clone().json().catch(() => ({}));
                
                if (responseData.session_expired) {
                    console.warn('Session expired. Redirecting to login...');
                    handleSessionExpiration();
                    return response; // Still return the original response
                }
            }
            
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };
}

/**
 * Verifies if the current session is valid
 * @returns {Promise<boolean>} True if the session is valid, false otherwise
 */
async function verifySession() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.warn('No session token found. Redirecting to login...');
        handleSessionExpiration();
        return false;
    }
    
    try {
        // Make a lightweight API call to verify the session
        const response = await fetch(`${window.apiBasePath}/api/auth/verify_session.php`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.warn('Session verification failed. Redirecting to login...');
            handleSessionExpiration();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session verification error:', error);
        // Don't redirect on network errors, as this might be temporary
        return true; // Assume session is still valid during network issues
    }
}

/**
 * Starts polling the server to check for session validity
 */
function startSessionPolling() {
    // Clear any existing polling interval to prevent duplicates
    if (sessionPollInterval) {
        clearInterval(sessionPollInterval);
    }
    
    console.log('Starting session validity polling (every 10 seconds).');
    sessionPollInterval = setInterval(verifySession, 10000); // Check every 10 seconds
}

/**
 * Stops the session polling
 */
function stopSessionPolling() {
    if (sessionPollInterval) {
        console.log('Stopping session validity polling.');
        clearInterval(sessionPollInterval);
        sessionPollInterval = null;
    }
}

/**
 * Handles session expiration by cleaning up and redirecting
 */
function handleSessionExpiration() {
    // Stop polling when the session expires
    stopSessionPolling();

    // Check if a modal is already displayed to prevent duplicates
    if (document.getElementById('session-expired-modal')) {
        return;
    }

    // Don't redirect if we're already on a login or signup page
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('signup.html') ||
                       window.location.pathname.includes('register.html');
    
    if (isAuthPage) {
        return;
    }
    
    // Clean up session data
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('tuitionClass');
    localStorage.removeItem('userName');
    localStorage.removeItem('progressStatus');
    localStorage.removeItem('trialExpiryDate');
    
    // Save the current URL to redirect back after login
    localStorage.setItem('redirectAfterLogin', window.location.href);
    
    // --- Create and show a custom modal dialog ---

    // 1. Inject CSS for the modal
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .session-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .session-modal-content {
            background-color: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
            width: 90%;
            color: #333;
        }
        .session-modal-content h3 {
            margin-top: 0;
            color: #d9534f;
        }
        .session-modal-content p {
            margin-bottom: 20px;
        }
        .session-modal-content button {
            background-color: #4166d5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
    `;
    document.head.appendChild(modalStyle);

    // 2. Create the modal HTML
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'session-expired-modal';
    modalOverlay.className = 'session-modal-overlay';
    
    modalOverlay.innerHTML = `
        <div class="session-modal-content">
            <h3>Session Terminated</h3>
            <p>You have recently logged in from another device. Only one session is allowed at a time.</p>
            <button id="session-expired-ok-btn">OK</button>
        </div>
    `;

    // 3. Append modal to the body
    document.body.appendChild(modalOverlay);

    // 4. Add event listener for the "OK" button
    document.getElementById('session-expired-ok-btn').addEventListener('click', () => {
        window.location.href = `${window.location.origin}${window.apiBasePath}/public/html/login.html`;
    });
}

/**
 * Logs the user out by invalidating their session
 */
async function logout() {
    // Stop polling before logging out
    stopSessionPolling();
    
    try {
        const token = localStorage.getItem('token');
        
        if (token) {
            await fetch(`${window.apiBasePath}/api/auth/logout.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
        
        // Clean up session data
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('userGrade');
        localStorage.removeItem('tuitionClass');
        localStorage.removeItem('userName');
        localStorage.removeItem('progressStatus');
        localStorage.removeItem('trialExpiryDate');
        
        // Redirect to login page
        window.location.href = `${window.location.origin}${window.apiBasePath}/public/html/login.html`;
    } catch (error) {
        console.error('Logout error:', error);
        
        // Force logout even if the API call fails
        localStorage.clear();
        window.location.href = `${window.location.origin}${window.apiBasePath}/public/html/login.html`;
    }
} 