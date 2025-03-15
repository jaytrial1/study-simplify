// Service Worker for ChatBot Study Assistant
const CACHE_NAME = 'study-assistant-v1';

// The URLs to cache depend on whether we're in local or production environment
// We'll determine this at runtime when the service worker is installed
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        
        // Determine paths at runtime based on scope
        return self.registration.scope.then(scope => {
          const isLocalServer = 
            scope.includes('localhost') || 
            scope.includes('127.0.0.1') || 
            scope.includes('192.168.') || 
            scope.includes('10.0.');
            
          const basePath = isLocalServer ? './public' : '.';
          
          const urlsToCache = [
            `${basePath}/html/chatbot.html`,
            `${basePath}/css/styles.css`,
            `${basePath}/css/response.css`,
            `${basePath}/css/ans_action.css`,
            `${basePath}/css/toast.css`,
            `${basePath}/js/base-url.js`,
            `${basePath}/js/script.js`,
            `${basePath}/js/history-search.js`,
            `${basePath}/js/transitions.js`,
            `${basePath}/js/chat-history.js`,
            `${basePath}/js/answer-action-popup.js`,
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
            'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
          ];
          
          return cache.addAll(urlsToCache);
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