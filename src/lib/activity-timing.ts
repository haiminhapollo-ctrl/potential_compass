import type { ActivityLogSource } from "./types";

// ============================================================================
// THOI GIAN LAM HOAT DONG THAT (de xuat A5 buoc 1) - thay vi chi co durationMinutes
// du kien. Client gui gio may em: luc mo trang hoat dong lan dau trong ngay va luc
// bam hoan thanh (ActivityFeedbackForm). Dong ho dien thoai co the lech, nhung
// HIEU hai moc tren cung mot may van dung => giu thoi luong, neo moc ket thuc:
//   - online: vao gio server luc nhan (em vua bam hoan thanh);
//   - offline_sync: gio may em luc bam (dong bo sau) - lech qua xa thi bo.
// Gia tri hong => ca hai null, KHONG tu choi phan hoi (thoi gian chi la du lieu phu).
// ============================================================================

/** Mo trang tu sang, chieu moi lam van hop le; qua 1 ngay la du lieu hong. */
export const MAX_ACTIVITY_HOURS = 24;
/** Ban ghi offline duoc gui ngay cu toi 7 ngay (activity-log.ts) + 1 ngay du phong. */
const MAX_OFFLINE_AGE_MS = 8 * 86_400_000;
const CLOCK_SKEW_MS = 5 * 60_000;

export function activityTiming(
  input: { startedAt?: unknown; finishedAt?: unknown },
  source: ActivityLogSource,
  nowMs: number
): { startedAt: string | null; finishedAt: string | null } {
  const none = { startedAt: null, finishedAt: null };
  const start = typeof input.startedAt === "string" ? Date.parse(input.startedAt) : NaN;
  const end = typeof input.finishedAt === "string" ? Date.parse(input.finishedAt) : NaN;
  const ms = end - start;
  if (!Number.isFinite(ms) || ms < 0 || ms > MAX_ACTIVITY_HOURS * 3_600_000) return none;
  const finished = source === "online" ? nowMs : end;
  if (finished > nowMs + CLOCK_SKEW_MS || nowMs - finished > MAX_OFFLINE_AGE_MS) return none;
  return { startedAt: new Date(finished - ms).toISOString(), finishedAt: new Date(finished).toISOString() };
}

/**
 * Thoi diem mo trang do SERVER ghi vao form an (khao sat, quiz, RIASEC) - di qua client nen kiem tra lai:
 * khong hop le / o tuong lai / mo qua maxHours (de qua dem) => null (khong dung lam thoi gian lam bai).
 */
export function parseOpenedAt(raw: unknown, nowMs: number, maxHours: number): string | null {
  const t = Date.parse(String(raw ?? ""));
  if (!Number.isFinite(t) || t > nowMs || nowMs - t > maxHours * 3_600_000) return null;
  return new Date(t).toISOString();
}
