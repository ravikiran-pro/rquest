/**
 * Service Worker Push Notification Handler for Rquest
 * Handles background push messages and click interactions
 */

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Rquest Notification',
        body: event.data.text(),
      };
    }
  }

  const title = data.title || 'Rquest Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/app-icon.png',
    badge: '/images/app-icon.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: (data.data && data.data.orderNumber) ? `order-${data.data.orderNumber}` : 'rquest-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  if (data.url) {
    targetUrl = data.url;
  } else if (data.type === 'order_status_change' || data.type === 'order_placed') {
    targetUrl = '/orders';
  } else if (data.type === 'account_register') {
    targetUrl = data.role_id === 'a5e858d8-636c-4fc3-8c3a-0a76131c95e5' ? '/client' : '/app';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing open tab matches the URL
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

