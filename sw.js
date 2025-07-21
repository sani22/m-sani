const CACHE_NAME = 'mobile-app-v1.0.0';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
];

// Files that should always be fetched from network
const NETWORK_FIRST = [
    '/api/',
    '/auth/'
];

// Maximum number of items in dynamic cache
const DYNAMIC_CACHE_LIMIT = 50;

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('SW: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('SW: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .catch(error => {
                console.error('SW: Error caching static files:', error);
            })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('SW: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('SW: Claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle different caching strategies based on request
    if (isNetworkFirst(request.url)) {
        event.respondWith(networkFirst(request));
    } else if (isStaticFile(request.url)) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

// Cache first strategy (for static files)
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('SW: Cache first failed:', error);
        return getOfflineFallback(request);
    }
}

// Network first strategy (for API calls)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
        }
        return networkResponse;
    } catch (error) {
        console.log('SW: Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        return cachedResponse || getOfflineFallback(request);
    }
}

// Stale while revalidate strategy (for dynamic content)
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then(networkResponse => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
                limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
            }
            return networkResponse;
        })
        .catch(error => {
            console.log('SW: Network failed:', error);
            return cachedResponse;
        });
    
    return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file)) || 
           url.includes('.css') || 
           url.includes('.js') || 
           url.includes('.png') || 
           url.includes('.jpg') || 
           url.includes('.svg') ||
           url.includes('fonts.googleapis.com');
}

function isNetworkFirst(url) {
    return NETWORK_FIRST.some(path => url.includes(path));
}

async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxItems) {
        const keysToDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

function getOfflineFallback(request) {
    if (request.destination === 'document') {
        return caches.match('/index.html');
    }
    
    if (request.destination === 'image') {
        return caches.match('/icons/icon-192x192.png');
    }
    
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
            'Content-Type': 'text/plain'
        })
    });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('SW: Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Handle any queued actions when back online
        const queuedActions = await getQueuedActions();
        
        for (const action of queuedActions) {
            try {
                await fetch(action.url, action.options);
                await removeQueuedAction(action.id);
            } catch (error) {
                console.error('SW: Failed to sync action:', error);
            }
        }
    } catch (error) {
        console.error('SW: Background sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', (event) => {
    console.log('SW: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/icon-192x192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Mobile App', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('SW: Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    console.log('SW: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(clearAllCaches());
    }
});

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
}

// IndexedDB helpers for background sync
async function getQueuedActions() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mobile-app-db', 1);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sync-queue'], 'readonly');
            const store = transaction.objectStore('sync-queue');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sync-queue')) {
                db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

async function removeQueuedAction(id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('mobile-app-db', 1);
        
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['sync-queue'], 'readwrite');
            const store = transaction.objectStore('sync-queue');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('SW: Periodic sync:', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

async function syncContent() {
    try {
        // Sync any content that needs regular updates
        console.log('SW: Syncing content...');
    } catch (error) {
        console.error('SW: Content sync failed:', error);
    }
}

console.log('SW: Service Worker loaded');