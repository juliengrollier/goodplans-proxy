/**
 * Good Plans — Service Worker
 * Place this file at: goodplans/public/sw.js
 */

const APP_ORIGIN = self.location.origin;

// ─── Push received from Apps Script → Vercel push relay ─────────────────────
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Good Plans", body: event.data?.text() || "New event alert" };
  }

  const {
    title = "Good Plans",
    body = "",
    url = "/",
    icon = "/icon-192.png",
    badge = "/icon-192.png",
    tag = "gp-push",
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction: false,
      data: { url: url.startsWith("http") ? url : APP_ORIGIN + url },
    })
  );
});

// ─── Notification tapped — open / focus app on the right event ───────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || APP_ORIGIN + "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open, focus it and tell it which event to show
        for (const client of windowClients) {
          if (client.url.startsWith(APP_ORIGIN)) {
            return client.focus().then(c => {
              c.postMessage({ type: "PUSH_NAV", url: targetUrl });
            });
          }
        }
        // App is closed — open it with the event URL
        return clients.openWindow(targetUrl);
      })
  );
});
