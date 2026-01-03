const CACHE_NAME = 'ca-final-tracker-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/license-generator.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://js.puter.com/v2/',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Font Awesome icons to cache
const fontAwesomeIcons = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Notification icons
const notificationIcons = [
  'https://img.icons8.com/color/96/000000/book-and-pencil.png',
  'https://img.icons8.com/color/192/000000/book-and-pencil.png'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll([
          ...urlsToCache,
          ...fontAwesomeIcons,
          ...notificationIcons
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Puter AI requests (they need network)
  if (event.request.url.includes('puter.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the new resource
            caches.open(CACHE_NAME)
              .then(cache => {
                // Skip caching Puter AI responses
                if (!event.request.url.includes('puter.com')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(error => {
            console.log('Fetch failed; returning offline page:', error);
            
            // If it's a document request, return cached index.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // For other requests, return a fallback
            if (event.request.url.includes('font-awesome')) {
              return caches.match('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2');
            }
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification event
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let data = {
    title: 'CA Final Tracker',
    body: 'Time to study!',
    icon: 'https://img.icons8.com/color/96/000000/book-and-pencil.png',
    badge: 'https://img.icons8.com/color/96/000000/book-and-pencil.png',
    tag: 'ca-study-reminder'
  };
  
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Handle the notification click
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-study-data') {
    event.waitUntil(syncStudyData());
  }
});

// Sync study data function
async function syncStudyData() {
  try {
    // Get study data from IndexedDB or localStorage
    const syncData = await getSyncData();
    
    if (syncData && syncData.length > 0) {
      console.log('Syncing study data:', syncData.length, 'items');
      // In a real app, you would send this to your server
      // await fetch('/api/sync', { method: 'POST', body: JSON.stringify(syncData) });
      
      // Clear synced data
      await clearSyncData();
    }
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// Helper functions for background sync
async function getSyncData() {
  return new Promise((resolve) => {
    // Get data from localStorage for sync
    const unsyncedData = localStorage.getItem('unsynced_study_data');
    resolve(unsyncedData ? JSON.parse(unsyncedData) : []);
  });
}

async function clearSyncData() {
  localStorage.removeItem('unsynced_study_data');
}

// Periodic sync (for newer browsers)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'daily-study-sync') {
      event.waitUntil(syncStudyData());
    }
  });
}

// Handle message events from main thread
self.addEventListener('message', event => {
  console.log('Message from main thread:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SYNC_NOW') {
    syncStudyData();
  }
});
