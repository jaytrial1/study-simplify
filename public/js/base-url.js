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

// Set API base path based on environment
const apiBasePath = isLocalServer ? '/main' : '';
console.log("API base path in base-url.js:", apiBasePath);

// Make these available globally
window.isLocalServer = isLocalServer;
window.apiBasePath = apiBasePath;

// Configure service worker path based on environment
const swPath = isLocalServer ? '/main/public/sw.js' : '/public/sw.js';
// Set the correct scope that matches the service worker location
const swScope = isLocalServer ? '/main/public/' : '/public/';
console.log("Service Worker path:", swPath);
console.log("Service Worker scope:", swScope);

// Register service worker if supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(swPath, {
            scope: swScope // Fixed scope to match the SW location
        }).then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
        }).catch(error => {
            console.error('Service Worker registration failed:', error);
        });
    });
} else {
    console.log('Service Worker is not supported in this browser.');
}

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
    return apiBasePath + endpoint;
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
        chatbot: () => `${apiBasePath}/public/html/chatbot.html`,
        login: () => `${apiBasePath}/public/html/login.html`,
        settings: () => `${apiBasePath}/public/html/settings.html`,
        savedAnswers: () => `${apiBasePath}/public/html/saved_answers.html`
    },
    
    // Asset paths
    assets: {
        css: (file) => `${apiBasePath}/public/css/${file}`,
        js: (file) => `${apiBasePath}/public/js/${file}`,
        img: (file) => `${apiBasePath}/public/img/${file}`
    }
};

// Make AppPaths globally available
window.AppPaths = AppPaths;