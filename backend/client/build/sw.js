self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Tasklytics',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Tasklytics';
  const options = {
    body: data.body || 'You have a notification',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data && event.notification.data.url 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // If a window client is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.indexOf(urlToOpen) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// A basic fetch handler to satisfy PWA installation criteria
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache for all /api requests
  if (url.pathname.startsWith('/api')) {
    return; // Fetch normally
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
