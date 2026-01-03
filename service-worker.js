// service-worker.js
const CACHE_NAME = 'ca-final-tracker-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Notification scheduling
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Schedule daily notifications
const scheduleNotifications = () => {
  // Morning notification at 6:00 AM
  const morningTime = new Date();
  morningTime.setHours(6, 0, 0, 0);
  if (morningTime < new Date()) {
    morningTime.setDate(morningTime.getDate() + 1);
  }
  
  // Evening notification at 8:00 PM
  const eveningTime = new Date();
  eveningTime.setHours(20, 0, 0, 0);
  if (eveningTime < new Date()) {
    eveningTime.setDate(eveningTime.getDate() + 1);
  }
  
  // Schedule morning notification
  setTimeout(() => {
    self.registration.showNotification('CA Final Tracker', {
      body: 'Good morning! Plan your study targets for today.',
      icon: 'https://img.icons8.com/color/96/000000/book-and-pencil.png',
      tag: 'morning-reminder'
    });
  }, morningTime.getTime() - Date.now());
  
  // Schedule evening notification
  setTimeout(() => {
    self.registration.showNotification('CA Final Tracker', {
      body: 'Evening check: Update your study hours and track progress!',
      icon: 'https://img.icons8.com/color/96/000000/book-and-pencil.png',
      tag: 'evening-reminder'
    });
  }, eveningTime.getTime() - Date.now());
};

// Run when service worker is activated
self.addEventListener('activate', event => {
  event.waitUntil(scheduleNotifications());
});
