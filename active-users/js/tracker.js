/**
 * StudySimplify Active User Tracker
 * This script periodically pings the server to track active users
 */
(function() {
    // Configuration
    const config = {
        pingInterval: 15000, // 15 seconds (in milliseconds) - more frequent pings
        trackingEndpoint: '../active-users/api/track.php',
        debug: true, // Enable debug by default for troubleshooting
        mobileBackgroundTracking: false, // Disable tracking when mobile app is in background
        localStorageKey: 'studySimplifyDeviceId', // Key for storing device ID in localStorage
        connectionCheckInterval: 5000 // Check connection every 5 seconds
    };

    // Initialize environment-specific settings
    const isProduction = (() => {
        const hostname = window.location.hostname;
        return !(
            hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.startsWith('192.168.') ||
            hostname.includes('.local')
        );
    })();

    // Get base path (accounts for installation in subdirectories like /main/)
    const getBasePath = () => {
        // Extract pathname components
        const pathParts = window.location.pathname.split('/');
        
        // For simple root installation
        if (pathParts.length <= 2) {
            return '';
        }
        
        // Check if we're in a subdirectory like /main/
        if (pathParts[1] === 'main') {
            return '/main';
        }
        
        return '';
    };

    // Detect if user is on a mobile device
    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Get stored device ID or null if not found
    const getDeviceId = () => {
        try {
            return localStorage.getItem(config.localStorageKey);
        } catch (e) {
            log('Error accessing localStorage: ' + e.message);
            return null;
        }
    };
    
    // Store device ID in localStorage
    const storeDeviceId = (deviceId) => {
        try {
            localStorage.setItem(config.localStorageKey, deviceId);
            log('Device ID stored: ' + deviceId);
            return true;
        } catch (e) {
            log('Error storing device ID: ' + e.message);
            return false;
        }
    };

    // Adjust tracking endpoint based on environment
    if (isProduction) {
        // Use absolute path in production
        config.trackingEndpoint = '/active-users/api/track.php';
    } else {
        // For local development, account for possible /main/ subdirectory
        const basePath = getBasePath();
        config.trackingEndpoint = `${basePath}/active-users/api/track.php`;
        config.debug = true; // Enable debug in development
    }

    // Debug logger
    const log = (message) => {
        if (config.debug) {
            // console.log(`[UserTracker] ${message}`);
        }
    };

    // Check if the tracking system is fully set up
    const checkSetup = () => {
        const testEndpoint = config.trackingEndpoint.replace('track.php', 'get-stats.php');
        
        return fetch(testEndpoint, {
            method: 'GET',
            credentials: 'same-origin'
        })
        .then(response => {
            // If we can reach the API, assume things are set up
            return response.ok;
        })
        .catch(() => {
            // If there's an error, the tracking system might not be set up
            return false;
        });
    };

    // Track error count to prevent console spam
    let errorCount = 0;
    
    // Track if the page is currently visible
    let isPageVisible = true;
    
    // Track if user is active (mouse movement, typing, etc.)
    let isUserActive = true;
    
    // When was the last interaction
    let lastInteractionTime = Date.now();
    
    // Track ping interval ID so we can stop/start it
    let pingIntervalId = null;
    
    // Track connection check interval
    let connectionCheckIntervalId = null;
    
    // Track network status
    let isOnline = navigator.onLine;

    // Function to ping the server
    const pingServer = () => {
        // Don't ping if page is not visible and it's a mobile device
        if (!isPageVisible && isMobileDevice() && !config.mobileBackgroundTracking) {
            log('Page is in background on mobile device, skipping ping');
            return;
        }
        
        // Don't ping if offline
        if (!isOnline) {
            log('Device is offline, skipping ping');
            return;
        }
        
        // Check if user has been inactive for more than 2 minutes
        if (Date.now() - lastInteractionTime > 120000) {
            log('User inactive for more than 2 minutes, marking as inactive');
            isUserActive = false;
            sendInactiveSignal();
            return;
        }
        
        // Get current page info
        const currentPage = window.location.pathname;
        
        // Create form data
        const formData = new FormData();
        formData.append('page', currentPage);
        
        // Add device ID if available
        const deviceId = getDeviceId();
        if (deviceId) {
            formData.append('device_id', deviceId);
            log('Using stored device ID: ' + deviceId);
        } else {
            log('No device ID available, server will generate one');
        }
        
        log(`Sending ping to: ${config.trackingEndpoint}`);
        
        // Send ping
        fetch(config.trackingEndpoint, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin' // Include cookies
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                log(`Ping successful. Active users: ${data.active_users}`);
                
                // Store device ID from server if provided
                if (data.device_id && (!deviceId || deviceId !== data.device_id)) {
                    storeDeviceId(data.device_id);
                }
                
                // Optional: Dispatch event for other scripts to use
                const event = new CustomEvent('activeUsersUpdated', { 
                    detail: { count: data.active_users } 
                });
                document.dispatchEvent(event);
            } else if (data.status === 'error') {
                log(`Error from server: ${data.message || 'Unknown error'}`);
            }
        })
        .catch(error => {
            // Only log the first few errors to avoid console spam if the server is down
            if (errorCount < 3) {
                log(`Error pinging server: ${error}`);
                errorCount++;
            } else if (errorCount === 3) {
                log(`Error pinging server: ${error}. Further errors will be suppressed.`);
                errorCount++;
            }
            
            // After 1 hour, reset the error count to allow logging again
            setTimeout(() => { errorCount = 0; }, 3600000);
        });
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
        const wasVisible = isPageVisible;
        isPageVisible = document.visibilityState === 'visible';
        
        log(`Visibility changed: ${wasVisible ? 'visible' : 'hidden'} -> ${isPageVisible ? 'visible' : 'hidden'}`);
        
        if (isPageVisible) {
            // Just became visible
            log('Page became visible, sending immediate ping');
            lastInteractionTime = Date.now(); // Reset interaction time
            isUserActive = true;
            pingServer(); // Send an immediate ping when page becomes visible
            
            // If ping interval was stopped, restart it
            if (!pingIntervalId) {
                log('Restarting ping interval');
                pingIntervalId = setInterval(pingServer, config.pingInterval);
            }
        } else if (wasVisible) { // Only send inactive signal if page was previously visible
            // Just became hidden
            log('Page became invisible, sending inactive signal immediately');
            sendInactiveSignal();
            
            // Clear ping interval to stop pings when hidden
            if (pingIntervalId) {
                log('Stopping ping interval due to page hidden');
                clearInterval(pingIntervalId);
                pingIntervalId = null;
            }
        }
    };
    
    // Function to explicitly mark user as inactive
    const sendInactiveSignal = () => {
        // Don't send if offline
        if (!isOnline) {
            log('Device is offline, skipping inactive signal');
            return;
        }
        
        // Get current page info
        const currentPage = window.location.pathname;
        
        // Create form data
        const formData = new FormData();
        formData.append('page', currentPage);
        formData.append('status', 'inactive');
        
        // Add device ID if available
        const deviceId = getDeviceId();
        if (deviceId) {
            formData.append('device_id', deviceId);
        }
        
        log('Sending inactive signal to server');
        
        // Use sendBeacon if available for more reliable delivery when page is unloading
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(config.trackingEndpoint, formData);
            log('Inactive signal sent via sendBeacon API: ' + (success ? 'success' : 'failed'));
        } else {
            // Fallback to fetch with keepalive
            fetch(config.trackingEndpoint, {
                method: 'POST',
                body: formData,
                keepalive: true,
                credentials: 'same-origin'
            }).catch(e => {
                log('Error sending inactive signal: ' + e.message);
            });
        }
    };
    
    // Update user activity timestamp
    const updateActivity = () => {
        lastInteractionTime = Date.now();
        
        // If user was previously inactive but now active
        if (!isUserActive) {
            isUserActive = true;
            log('User became active, sending ping');
            pingServer();
        }
    };
    
    // Check if network status has changed
    const checkConnection = () => {
        const wasOnline = isOnline;
        isOnline = navigator.onLine;
        
        if (isOnline && !wasOnline) {
            // Just came online
            log('Device came online, sending immediate ping');
            pingServer();
        } else if (!isOnline && wasOnline) {
            // Just went offline
            log('Device went offline');
        }
    };

    // Initialize tracking
    const initTracking = () => {
        log('Initializing user tracking');
        log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
        log(`Device type: ${isMobileDevice() ? 'Mobile' : 'Desktop'}`);
        log(`Tracking endpoint: ${config.trackingEndpoint}`);
        
        // Check stored device ID
        const deviceId = getDeviceId();
        if (deviceId) {
            log(`Using stored device ID: ${deviceId}`);
        } else {
            log('No device ID found, will be assigned by server');
        }
        
        // Initialize network status
        isOnline = navigator.onLine;
        log(`Initial network status: ${isOnline ? 'Online' : 'Offline'}`);
        
        // Check if the tracking system is set up before starting
        checkSetup().then(isSetup => {
            if (!isSetup) {
                log('Warning: The active user tracking system might not be fully set up');
            }
            
            // Set initial page visibility state
            isPageVisible = document.visibilityState === 'visible';
            
            // Only start pinging if page is visible
            if (isPageVisible) {
                pingServer();
                
                // Set up interval for regular pings
                pingIntervalId = setInterval(pingServer, config.pingInterval);
            }
            
            // Set up interval for connection checks
            connectionCheckIntervalId = setInterval(checkConnection, config.connectionCheckInterval);
            
            // Track page visibility changes
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Track network status changes
            window.addEventListener('online', () => {
                log('Online event triggered');
                isOnline = true;
                pingServer(); // Send ping immediately when we come online
            });
            
            window.addEventListener('offline', () => {
                log('Offline event triggered');
                isOnline = false;
            });
            
            // Track user activity events
            const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
            activityEvents.forEach(eventType => {
                document.addEventListener(eventType, updateActivity, { passive: true });
            });
            
            // Additional events for mobile devices
            if (isMobileDevice()) {
                // Handle page going to background in other ways
                window.addEventListener('pagehide', () => {
                    log('Page hide event triggered');
                    isPageVisible = false;
                    sendInactiveSignal();
                    
                    if (pingIntervalId) {
                        clearInterval(pingIntervalId);
                        pingIntervalId = null;
                    }
                });
                
                window.addEventListener('pageshow', () => {
                    log('Page show event triggered');
                    isPageVisible = true;
                    lastInteractionTime = Date.now(); // Reset interaction time
                    pingServer(); // Immediate ping
                    
                    // Restart interval if it was stopped
                    if (!pingIntervalId) {
                        pingIntervalId = setInterval(pingServer, config.pingInterval);
                    }
                });
                
                // For iOS Safari and other mobile browsers
                window.addEventListener('blur', () => {
                    log('Window blur event triggered');
                    sendInactiveSignal();
                    
                    if (pingIntervalId) {
                        clearInterval(pingIntervalId);
                        pingIntervalId = null;
                    }
                });
                
                window.addEventListener('focus', () => {
                    log('Window focus event triggered');
                    isPageVisible = true;
                    lastInteractionTime = Date.now(); // Reset interaction time
                    pingServer(); // Immediate ping
                    
                    // Restart interval if it was stopped
                    if (!pingIntervalId) {
                        pingIntervalId = setInterval(pingServer, config.pingInterval);
                    }
                });
            }
        });
    };

    // Add window unload handler to mark user as inactive when leaving the page
    window.addEventListener('beforeunload', () => {
        log('Page unloading, sending inactive signal');
        sendInactiveSignal();
        
        // Also clear intervals
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        
        if (connectionCheckIntervalId) {
            clearInterval(connectionCheckIntervalId);
            connectionCheckIntervalId = null;
        }
    });
    
    // Add window unload handler for mobile
    window.addEventListener('pagehide', () => {
        log('Page hide event triggered');
        isPageVisible = false;
        sendInactiveSignal();
        
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        
        if (connectionCheckIntervalId) {
            clearInterval(connectionCheckIntervalId);
            connectionCheckIntervalId = null;
        }
    });

    // Start tracking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTracking);
    } else {
        initTracking();
    }
})(); 