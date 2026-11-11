// ============================================================================
// SERVICE WORKER don gian cho Potential Compass PWA
// ----------------------------------------------------------------------------
// Chien luoc: "network first, fallback to cache" cho trang & tai nguyen tinh -
// phu hop app co du lieu hay doi (khong nen cache API/server action). Muc
// tieu la cho phep hoc sinh MO LAI app va xem duoc noi dung hoat dong hom
// nay ngay ca khi mat mang - VIEC LUU PHAN HOI KHI OFFLINE dung IndexedDB
// (xem src/lib/offline/queue.ts), KHONG lien quan file nay.
// ============================================================================

const CACHE_NAME = "potential-compass-v2"; // v2: icon sao mat troi + bang mau giay moc (10/2026)
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = ["/", OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Chi xu ly GET - khong dong cache POST (Server Actions).
  if (request.method !== "GET") return;

  // Bo qua request sang domain khac (vd Supabase, Gemini) - luon di thang mang.
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        return new Response("Ban dang offline va trang nay chua duoc luu cache.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});
