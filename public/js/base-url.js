/**
 * Base URL configuration for all API paths and resources
 * This file should be included first before any other JavaScript files
 */

// Detect server environment
const isLocalServer = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname.includes('192.168.') || 
                       window.location.hostname.includes('10.0.');

console.log("Server detection in base-url.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");

// Check if we're in the /main/ directory (more reliable path detection)
const isInMainDirectory = window.location.pathname.includes('/main/');
console.log("Path check - in /main/ directory:", isInMainDirectory);

// Set API base path based on environment
const apiBasePath = isLocalServer && isInMainDirectory ? '/main' : '';
console.log("API base path in base-url.js:", apiBasePath);

// Log full page URL data for debugging
console.log("DEBUG URL info:", {
    fullURL: window.location.href,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash
});

// Make these available globally
window.isLocalServer = isLocalServer;
window.apiBasePath = apiBasePath;

// Add unique version/timestamp to prevent caching issues
window.appVersion = Date.now();

// Configure service worker path based on environment
const swPath = isLocalServer ? '/main/public/sw.js' : '/public/sw.js';
// Set the correct scope that matches the service worker location
const swScope = isLocalServer ? '/main/public/' : '/public/';
console.log("Service Worker path:", swPath);
console.log("Service Worker scope:", swScope);

// Register service worker if supported
if ('serviceWorker' in navigator) {
    // Function to refresh content when needed
    function refreshContent() {
        // Add a timestamp/version parameter to force refresh
        const cacheBuster = `?v=${window.appVersion}`;
        
        console.log('Content refresh requested with version:', window.appVersion);
        
        // Don't immediately refresh - wait for next user navigation/action
        // This prevents the flash of unstyled content
        return; // Early return to disable automatic refreshing
        
        // Refresh key assets
        const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
        cssLinks.forEach(link => {
            const url = new URL(link.href, window.location.href);
            url.searchParams.set('v', window.appVersion);
            link.href = url.toString();
        });
        
        // Refresh scripts (except this file)
        const scripts = document.querySelectorAll('script[src]:not([src*="base-url.js"])');
        scripts.forEach(script => {
            const url = new URL(script.src, window.location.href);
            url.searchParams.set('v', window.appVersion);
            script.src = url.toString();
        });
        
        console.log('Content refreshed with version:', window.appVersion);
    }
    
    // Check if there's an update available and refresh the page
    function updateServiceWorker(registration) {
        if (registration.waiting) {
            // There's an update ready!
            console.log('New service worker waiting to activate');
            registration.waiting.postMessage({ action: 'skipWaiting' });
        }
        
        // Handle new service workers that are waiting
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('New service worker being installed');
            
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New service worker installed and waiting');
                    newWorker.postMessage({ action: 'skipWaiting' });
                }
            });
        });
    }
    
    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
        // Don't automatically refresh content - this causes the flash of unstyled content
        // Instead, let the user refresh the page manually to get the new version
        // refreshContent();
    });
    
    // Register service worker
    window.addEventListener('load', () => {
        // Add cache-busting query parameter
        const swUrl = `${swPath}?v=${window.appVersion}`;
        
        navigator.serviceWorker.register(swUrl, {
            scope: swScope
        }).then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
            
            // Store registration globally for later use
            window.swRegistration = registration;
            
            // Check for updates only when the page is refreshed
            // This is the recommended way to get updates without causing flashes
            let isPageRefresh = false;
            
            // Modern method (supports modern browsers)
            if (performance.getEntriesByType && performance.getEntriesByType('navigation').length > 0) {
                const navEntry = performance.getEntriesByType('navigation')[0];
                isPageRefresh = navEntry.type === 'reload';
            } 
            // Legacy method (for older browsers)
            else if (performance.navigation && performance.navigation.type === 1) {
                isPageRefresh = true;
            }
            
            if (isPageRefresh) {
                // This is a page refresh
                console.log('Page was refreshed - checking for updates');
                registration.update()
                    .then(() => {
                        console.log('Checked for updates on page refresh');
                    })
                    .catch(err => console.error('Error checking for updates:', err));
            }
            
            // Check for updates only when explicitly requested
            // This prevents automatic reloads
            window.checkForUpdates = () => {
                registration.update()
                    .then(() => {
                        console.log('Checked for service worker updates');
                        // Only refresh if there's a new version
                        if (registration.waiting) {
                            if (confirm('A new version is available. Would you like to update now?')) {
                                registration.waiting.postMessage({ action: 'skipWaiting' });
                            }
                        }
                    })
                    .catch(err => console.error('Error checking for updates:', err));
            };
            
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
} else {
    console.log('Service Worker is not supported in this browser.');
}

// Create a no-cache meta tag to prevent browser caching
function addNoCacheMetaTags() {
    // Create and append meta tags to head
    const head = document.head || document.getElementsByTagName('head')[0];
    
    const metaTags = [
        { name: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
        { name: 'Pragma', content: 'no-cache' },
        { name: 'Expires', content: '0' }
    ];
    
    metaTags.forEach(meta => {
        const metaElement = document.createElement('meta');
        metaElement.setAttribute('http-equiv', meta.name);
        metaElement.setAttribute('content', meta.content);
        head.appendChild(metaElement);
    });
}

// Add no-cache meta tags
addNoCacheMetaTags();

/**
 * Utility function to join base path with API endpoints
 * @param {string} endpoint - The API endpoint path
 * @returns {string} The complete API URL
 */
function getApiUrl(endpoint) {
    // Make sure endpoint starts with a slash if not already
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    
    // Add version parameter to prevent caching
    let url = apiBasePath + endpoint;
    if (endpoint.includes('.php')) {
        url += (url.includes('?') ? '&' : '?') + `_v=${window.appVersion}`;
    }
    
    return url;
}

// Path helper functions
const AppPaths = {
    // API endpoints
    api: {
        chat: {
            history: () => getApiUrl('/api/chat/history.php'),
            save: () => getApiUrl('/api/chat/save.php')
        },
        navigation: {
            subjects: (grade) => getApiUrl(`/api/navigation/subjects.php?grade=${encodeURIComponent(grade)}`),
            chapters: (grade, subject) => getApiUrl(`/api/navigation/chapters.php?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`),
            questions: (grade, subject, chapter) => getApiUrl(`/api/navigation/questions.php?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`)
        },
        user: {
            profile: (userId) => getApiUrl(`/api/user/profile.php?id=${userId}`),
            session: () => getApiUrl('/api/user/session.php')
        },
        auth: {
            login: () => getApiUrl('/api/auth/login.php'),
            logout: () => getApiUrl('/api/auth/logout.php'),
            changePassword: () => getApiUrl('/api/auth/change-password.php')
        },
        savedAnswers: {
            get: () => getApiUrl('/api/saved-answers/saved_answers.php'),
            save: () => getApiUrl('/api/saved-answers/save_to_database.php'),
            updateSaveType: () => getApiUrl('/api/saved-answers/update_save_type.php')
        }
    },
    
    // Page URLs
    pages: {
        chatbot: () => `${apiBasePath}/public/html/chatbot.html?v=${window.appVersion}`,
        login: () => `${apiBasePath}/public/html/login.html?v=${window.appVersion}`,
        settings: () => `${apiBasePath}/public/html/settings.html?v=${window.appVersion}`,
        savedAnswers: () => `${apiBasePath}/public/html/saved_answers.html?v=${window.appVersion}`
    },
    
    // Asset paths
    assets: {
        css: (file) => `${apiBasePath}/public/css/${file}?v=${window.appVersion}`,
        js: (file) => `${apiBasePath}/public/js/${file}?v=${window.appVersion}`,
        img: (file) => `${apiBasePath}/public/img/${file}`
    }
};

// Make AppPaths globally available
window.AppPaths = AppPaths;