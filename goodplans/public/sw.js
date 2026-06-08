/**
 * Good Plans — Service Worker
 * Place this file at: goodplans/public/sw.js
 *
 * Responsibilities:
 *  - Receive Web Push events and display system notifications
 *  - Handle notification clicks (opens the app on the right event)
 *  - Cache nothing else — all data fetching happens in the app
 */

const APP_NAME = "Good Plans";

// ─── Push received from Apps Script → Vercel push relay ─────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: APP_NAME, body: event.data?.text() || "New event alert" };
  }

  const {
    title = APP_NAME,
    body = "",
    url = "/",
    icon = "/icons/icon-192.png",
    badge = "/icons/badge-72.png",
    tag = "gp-push",
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,        // show even if same tag
      requireInteraction: false,
      data: { url },
    })
  );
});

// ─── Notification tapped — open / focus app on the right event ───────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.postMessage({ type: "PUSH_NAV", url: targetUrl });
            return;
          }
        }
        // Otherwise open a new window
        return clients.openWindow(targetUrl);
      })
  );
});
