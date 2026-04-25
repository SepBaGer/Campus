const OFFLINE_CACHE_NAME = "campus-offline-v1";
const PRECACHE_URLS = [
  "/",
  "/catalogo",
  "/acceso",
  "/portal",
  "/offline",
  "/manifest.webmanifest",
  "/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("campus-offline-") && key !== OFFLINE_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (!response || !response.ok) {
    return response;
  }

  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);

  try {
    const response = await fetch(request);
    return await cacheResponse(request, response);
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return cache.match("/offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => cacheResponse(request, response))
    .catch(() => undefined);

  return cached || networkPromise || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (["script", "style", "worker", "image", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Campus MetodologIA";
  const options = {
    body: payload.body || "Tienes una nueva actualizacion en tu cohorte.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.tag || "campus-notification",
    data: {
      url: payload.ctaUrl || "/portal"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/portal";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
