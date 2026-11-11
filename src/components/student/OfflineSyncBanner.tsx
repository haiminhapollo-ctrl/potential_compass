"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushQueue, getQueuedLogs } from "@/lib/offline/queue";
import { submitActivityLogAction } from "@/lib/actions/activity-log";

/**
 * Component "vo hinh" (khong render UI khi khong co gi de dong bo) - lang
 * nghe su kien 'online' cua trinh duyet va tu dong gui cac phan hoi hoat dong
 * dang cho trong IndexedDB (xem src/lib/offline/queue.ts) len server.
 * Dat trong layout cua Phan he Hoc sinh de chay o moi trang.
 */
export function OfflineSyncBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "syncing" | "done">("idle");
  const [syncedCount, setSyncedCount] = useState(0);

  useEffect(() => {
    async function trySync() {
      const pending = await getQueuedLogs();
      if (pending.length === 0) return;
      setStatus("syncing");
      const result = await flushQueue(async (log) => submitActivityLogAction({ ...log, source: "offline_sync" }));
      if (result.synced > 0) {
        setSyncedCount(result.synced);
        setStatus("done");
        router.refresh();
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("idle");
      }
    }

    // Thu dong bo ngay khi mount (phong truong hop da online tu truoc) va moi
    // khi trinh duyet bao co mang tro lai.
    void trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, [router]);

  if (status === "idle") return null;

  return (
    <div
      className="animate-clay-rise fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full
                 border border-brand-800 bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
    >
      {status === "syncing" ? "Đang gửi các bài em làm lúc mất mạng..." : `Đã gửi ${syncedCount} hoạt động em làm lúc mất mạng`}
    </div>
  );
}
