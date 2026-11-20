self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }

  const title = typeof payload.title === 'string' && payload.title
    ? payload.title
    : 'MUTIC ERP';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/')
    ? payload.url
    : '/overview';

  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
        body: typeof payload.body === 'string' ? payload.body : 'You have a new update.',
        icon: '/makerere-logo.png',
        badge: '/makerere-logo.png',
        tag: typeof payload.tag === 'string' ? payload.tag : undefined,
        data: { url },
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_NOTIFICATION', notification: { ...payload, url } });
      })),
  ]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url ?? '/overview', self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : new URL('/overview', self.location.origin).href;

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      const client = clients.find((candidate) => new URL(candidate.url).origin === self.location.origin);
      if (client) {
        return client.navigate(targetUrl).then((navigatedClient) => (navigatedClient ?? client).focus());
      }
      return self.clients.openWindow(targetUrl);
    }));
});
