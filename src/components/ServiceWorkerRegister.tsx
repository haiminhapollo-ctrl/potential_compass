"use client";

import { useEffect } from "react";

/**
 * Dang ky Service Worker (public/sw.js) ngay khi app tai xong o phia client.
 * Tach rieng thanh Client Component de Root Layout (Server Component) khong
 * bi keo theo "use client" toan bo cay.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Chi dang ky o production build de tranh cache lam kho debug luc `next dev`.
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[SW] Dang ky service worker that bai:", err);
    });
  }, []);

  return null;
}
