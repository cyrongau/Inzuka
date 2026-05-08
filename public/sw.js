const CACHE_NAME = 'fam-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', event => {
  let pushData = {};
  if (event.data) {
    pushData = event.data.json();
  } else {
    pushData = { title: 'New Notification', body: 'You have a new update in Sisi.' };
  }

  const options = {
    body: pushData.body || 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    data: pushData.data,
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title || 'Sisi', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
