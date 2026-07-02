const CACHE_NAME = 'rkey-prod-v2';

// Active service worker and clear old caches (including old rkey-prod-v1 cache)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Clear all caches to purge stale index.html from old service workers
          return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

// We DO NOT intercept fetch requests to avoid caching stale index.html.
// Standard HTTP Cache-Control headers of the web server handle asset caching reliably.

// Handle push notification events
self.addEventListener('push', (event) => {
  let data = { title: "R'Key Prod", body: "Nouvel événement de votre DJ" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "R'Key Prod", body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
