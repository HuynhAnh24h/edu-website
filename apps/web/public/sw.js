// Owlie Edu Service Worker — App Shell nhẹ + Hỗ trợ Thông báo Đẩy (Push Notification)
const CACHE_NAME = "owlie-app-shell-v2";
const PRECACHE = ["/", "/tai-app/", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
  );
});

// Nhận sự kiện Push từ máy chủ hoặc từ WebSocket real-time của trang
self.addEventListener("push", (event) => {
  let payload = {
    title: "Owlie Edu — Thông báo mới",
    body: "Bạn có một cập nhật học tập mới trên Owlie Edu!",
    link: "/",
  };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [120, 60, 120],
      data: { url: payload.link || "/" },
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(data.title || "Owlie Edu", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.link || "/" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
