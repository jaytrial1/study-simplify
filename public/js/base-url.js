// Simple and reliable solution to fix path issues
(function() {
    // Detect server environment
    const isLocalServer = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.includes('192.168.') || 
                        window.location.hostname.includes('10.0.');
    
    console.log("Server detection in base-url.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
    
    // Set the base URL according to the environment
    var baseUrl;
    
    if (isLocalServer) {
        // Local development - Get the root folder name (e.g., "main" in http://localhost/main/)
        var rootFolder = window.location.pathname.split('/')[1];
        baseUrl = window.location.origin + '/' + rootFolder + '/';
    } else {
        // Production - Hostinger
        // Just use the hostname with path up to public/
        // This avoids double "public" in paths
        baseUrl = window.location.origin + '/';
    }
    
    // Make it available globally
    window.baseUrl = baseUrl;
    console.log('Root base URL set to:', baseUrl);
    
    // API URL helper function
    window.getApiUrl = function(path) {
        if (path.startsWith('/')) path = path.substring(1);
        return baseUrl + path;
    };
    
    // Fix paths in the document (runs after DOM loads)
    document.addEventListener('DOMContentLoaded', function() {
        // Fix relative paths in script tags
        document.querySelectorAll('script[src^="../"]').forEach(function(el) {
            var newSrc = el.getAttribute('src').replace('../', baseUrl + 'public/');
            el.setAttribute('src', newSrc);
        });
        
        // Fix relative paths in CSS links
        document.querySelectorAll('link[rel="stylesheet"][href^="../"]').forEach(function(el) {
            var newHref = el.getAttribute('href').replace('../', baseUrl + 'public/');
            el.setAttribute('href', newHref);
        });
        
        // Fix relative paths in other links
        document.querySelectorAll('link:not([rel="stylesheet"])[href^="../"]').forEach(function(el) {
            var newHref = el.getAttribute('href').replace('../', baseUrl + 'public/');
            el.setAttribute('href', newHref);
        });
        
        // Service worker registration
        if ('serviceWorker' in navigator) {
            const swPath = isLocalServer ? 
                baseUrl + 'public/sw.js' : 
                baseUrl + 'sw.js';
            
            navigator.serviceWorker.register(swPath)
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.log('Service Worker registration failed', err));
        }
    });
})();