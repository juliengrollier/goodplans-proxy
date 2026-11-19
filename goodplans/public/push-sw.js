// Good Plans — push handlers, loaded into the generated service worker (workbox importScripts)
self.addEventListener("push", (event) => {
  let p = {};
  try { p = event.data ? event.data.json() : {}; } catch { p = { title: "Good Plans", body: event.data ? event.data.text() : "" }; }
  const url = new URL(p.url || "/", self.location.origin).href;
  event.waitUntil(self.registration.showNotification(p.title || "Good Plans", {
    body: p.body || "", icon: "/icon-192.png", badge: "/badge-96.png", tag: p.tag || "gp", renotify: !!p.tag, data: { url },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin + "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.location.origin)) return c.focus().then((w) => w.postMessage({ type: "PUSH_NAV", url }));
    return clients.openWindow(url);
  }));
});
