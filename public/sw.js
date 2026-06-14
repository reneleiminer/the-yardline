const APP_NAME = "The Yardline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: APP_NAME,
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || APP_NAME;
  const options = {
    body: data.body || "",
    icon: data.icon || "/yardline-icon-192.png",
    badge: data.badge || "/yardline-icon-180.png",
    image: data.image || undefined,
    tag: data.tag || "yardline-update",
    renotify: data.renotify === true,
    requireInteraction: data.requireInteraction === true,
    timestamp: data.timestamp || Date.now(),
    vibrate: Array.isArray(data.vibrate) ? data.vibrate : [120, 60, 120],
    actions: Array.isArray(data.actions) && data.actions.length > 0
      ? data.actions
      : [{ action: "open", title: "Oeffnen" }],
    data: {
      url: data.url || "/",
      actionUrl: data.actionUrl || data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.action === "open"
    ? event.notification?.data?.actionUrl || event.notification?.data?.url || "/"
    : event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const origin = self.location.origin;
      const absoluteTarget = new URL(targetUrl, origin).href;

      for (const client of clients) {
        if (client.url === absoluteTarget && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteTarget);
      }

      return undefined;
    })
  );
});
