// Service Worker for ChatBot Study Assistant
const CACHE_NAME = 'study-assistant-v1';

// The URLs to cache depend on whether we're in local or production environment
// We'll determine this at runtime when the service worker is installed
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        
        // Get the scope directly - it's a string property, not a Promise
        const scope = self.registration.scope;
        
        // Determine environment based on scope URL
        const isLocalServer = 
          scope.includes('localhost') || 
          scope.includes('127.0.0.1') || 
          scope.includes('192.168.') || 
          scope.includes('10.0.');
          
        // Use absolute paths based on the scope
        const rootPath = isLocalServer ? '/main/public' : '/public';
        
        console.log('Service Worker caching for environment:', isLocalServer ? 'local' : 'production');
        console.log('Service Worker scope:', scope);
        console.log('Service Worker root path:', rootPath);
        
        // Don't try to cache everything immediately - just the essentials
        // This reduces the chance of installation failures
        const essentialUrls = [
          `${rootPath}/html/chatbot.html`,
          `${rootPath}/css/styles.css`, 
          `${rootPath}/js/base-url.js`
        ];
        
        // Try to cache essential files only
        console.log('Caching essential files:', essentialUrls);
        return cache.addAll(essentialUrls)
          .catch(error => {
            console.error('Error caching essential files:', error);
            // Continue installation even if caching fails
            return Promise.resolve();
          });
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache API responses
                if (!event.request.url.includes('/api/')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheAllowlist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheAllowlist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 