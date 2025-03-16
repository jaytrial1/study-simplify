// Service Worker for ChatBot Study Assistant
const CACHE_VERSION = Date.now(); // Dynamic cache version based on timestamp
const CACHE_NAME = `study-assistant-v1-${CACHE_VERSION}`;
const USER_DATA_CACHE_NAME = 'study-assistant-user-data'; // Separate cache for user data

// The URLs to cache depend on whether we're in local or production environment
// We'll determine this at runtime when the service worker is installed
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        
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
        
        // Skip waiting to activate new service worker immediately
        self.skipWaiting();
        
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

// Helper function to determine if a request is for user data
function isUserDataRequest(url) {
  // Add patterns that identify user data requests
  return url.includes('/api/user/') || 
         url.includes('/api/auth/') || 
         url.includes('session') ||
         url.includes('login');
}

// Helper to check if the resource should use network-first strategy
function shouldUseNetworkFirst(url) {
  // These resources should always get the latest version
  return url.includes('.php') || 
         url.includes('.html') || 
         url.includes('.js') || 
         url.includes('.css') ||
         url.includes('/api/');
}

// Function to add cache-busting parameter to URLs
function addCacheBustingParam(url) {
  try {
    const urlObj = new URL(url);
    // Skip for cross-origin requests or non-GET requests
    if (urlObj.origin !== location.origin) {
      return url;
    }
    // Add cache-busting for HTML, JS, CSS, and PHP files
    if (urlObj.pathname.match(/\.(html|js|css|php)$/)) {
      urlObj.searchParams.set('_v', CACHE_VERSION);
      return urlObj.href;
    }
    return url;
  } catch (e) {
    // If URL parsing fails, return the original URL
    return url;
  }
}

// Fetch event - network-first strategy for most resources
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For user data, use a separate cache
  if (isUserDataRequest(url)) {
    event.respondWith(
      caches.open(USER_DATA_CACHE_NAME).then(cache => {
        return fetch(event.request)
          .then(response => {
            // Cache the response
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            // If fetch fails, try from cache
            return cache.match(event.request);
          });
      })
    );
    return;
  }
  
  // For resources that should use network-first
  if (shouldUseNetworkFirst(url)) {
    event.respondWith(
      fetch(addCacheBustingParam(event.request.url))
        .then(response => {
          // Cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try from cache
          return caches.match(event.request);
        })
    );
  } else {
    // For other resources, use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          
          // If not in cache, fetch from network
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
                  // Don't cache API responses that aren't user data
                  if (!event.request.url.includes('/api/') || isUserDataRequest(url)) {
                    cache.put(event.request, responseToCache);
                  }
                });

              return response;
            }
          );
        })
    );
  }
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    // Clean up old caches except user data
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Keep the user data cache and current version
          if (cacheName !== USER_DATA_CACHE_NAME && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Claim any clients immediately, so the new service worker takes over
      return self.clients.claim();
    })
  );
}); 

// Add a message event listener to handle manual updates
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 