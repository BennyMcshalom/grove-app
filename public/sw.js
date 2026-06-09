/* Grove – Service Worker: handles Web Push notifications */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Grove', body: event.data.text() }; }

  const { title = 'Grove', body = '', tag, data = {} } = payload;
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon:  '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data:  { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if one is open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
