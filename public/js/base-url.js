// Simple and reliable solution to fix path issues
(function() {
    // Get the root folder name (e.g., "main" in http://localhost/main/)
    var rootFolder = window.location.pathname.split('/')[1];
    var baseUrl = window.location.origin + '/' + rootFolder + '/';
    
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
        
        // Fix service worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(baseUrl + 'public/sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.log('Service Worker registration failed', err));
        }
    });
})();