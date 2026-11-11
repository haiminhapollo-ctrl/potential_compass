"use client";

import { get, set } from "idb-keyval";
import type { SubmitActivityLogInput } from "../actions/activity-log";

// Payload hang doi = DUNG du lieu hoc sinh nhap: KHONG co studentId (server lay
// tu session) va KHONG co isExtra (server tu quyet dinh theo so ban ghi trong ngay)
// - client khong duoc tu khai bao minh la ai hay day la hoat dong chinh/phu.
type QueuedActivityLogPayload = SubmitActivityLogInput;

// ============================================================================
// HANG DOI OFFLINE (client-only) - luu phan hoi hoat dong vao IndexedDB khi
// khong co mang, dong bo len server khi co mang tro lai. Dung idb-keyval
// (thu vien rat nho, khong phu thuoc gi them) thay vi tu viet IndexedDB API
// thap cap - giam rui ro loi.
//
// KHONG dung localStorage (de bi mat khi dung private/incognito lau, gioi
// han dung luong thap hon, chan luong chinh) - dung IndexedDB qua idb-keyval.
// ============================================================================

const QUEUE_KEY = "pc_offline_activity_logs";

export interface QueuedActivityLog extends QueuedActivityLogPayload {
  tempId: string;
  queuedAt: string;
}

export async function getQueuedLogs(): Promise<QueuedActivityLog[]> {
  const data = await get<QueuedActivityLog[]>(QUEUE_KEY);
  return data ?? [];
}

export async function enqueueActivityLog(log: QueuedActivityLogPayload): Promise<QueuedActivityLog> {
  const queue = await getQueuedLogs();
  const item: QueuedActivityLog = {
    ...log,
    tempId: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: new Date().toISOString(),
  };
  queue.push(item);
  await set(QUEUE_KEY, queue);
  return item;
}

export async function removeQueuedLog(tempId: string): Promise<void> {
  const queue = await getQueuedLogs();
  await set(
    QUEUE_KEY,
    queue.filter((q) => q.tempId !== tempId)
  );
}

/**
 * Goi khi co mang tro lai: lan luot gui tung log dang cho len server bang
 * server action `syncOfflineActivityLog`, xoa khoi hang doi neu thanh cong.
 * Loi 1 item KHONG lam dung ca hang doi (tiep tuc voi cac item con lai).
 */
export async function flushQueue(
  syncFn: (log: QueuedActivityLogPayload) => Promise<{ ok: boolean }>
): Promise<{ synced: number; failed: number }> {
  const queue = await getQueuedLogs();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const { tempId, queuedAt, ...log } = item;
      const result = await syncFn(log);
      if (result.ok) {
        await removeQueuedLog(tempId);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
