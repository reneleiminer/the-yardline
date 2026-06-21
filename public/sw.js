const APP_NAME = "The Yardline";

function getNotificationUrl(data = {}) {
  return (
    data.actionUrl ||
    data.url ||
    data.data?.actionUrl ||
    data.data?.url ||
    "/"
  );
}

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
      : [{ action: "open", title: "Öffnen" }],
    data: {
      ...data.data,
      url: getNotificationUrl(data),
      actionUrl: data.actionUrl || data.data?.actionUrl || getNotificationUrl(data),
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
      const targetOrigin = new URL(absoluteTarget).origin;

      for (const client of clients) {
        if (client.url === absoluteTarget && "focus" in client) {
          return client.focus();
        }
      }

      for (const client of clients) {
        if (new URL(client.url).origin === targetOrigin && "focus" in client) {
          return client.focus().then((focusedClient) => {
            if ("navigate" in focusedClient) {
              return focusedClient.navigate(absoluteTarget);
            }

            return focusedClient;
          });
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteTarget);
      }

      return undefined;
    })
  );
});
