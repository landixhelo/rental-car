/* Auto Rental — Via Egnatia PWA */
const CACHE = "via-egnatia-pwa-v3";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/logo.png",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.pathname.startsWith("/api")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const networkFirst = url.pathname.startsWith("/assets/");
  event.respondWith(
    (networkFirst ? fetch(req) : Promise.resolve(null))
      .then((fresh) => {
        if (fresh && fresh.ok) {
          const copy = fresh.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return fresh;
        }
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          });
        });
      })
      .catch(() => caches.match(req))
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Auto Rental",
    body: "",
    url: "/reservations",
  };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) data.body = text;
    } catch {
      // ignore
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      data: { url: data.url || "/reservations" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path =
    (event.notification.data && event.notification.data.url) || "/reservations";
  const dest = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) client.navigate(dest);
            return;
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(dest);
      })
  );
});
