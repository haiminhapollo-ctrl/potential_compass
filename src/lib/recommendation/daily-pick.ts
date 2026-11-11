import { DOMAINS } from "../domains";
import type { Activity, ActivityLog, DomainCode } from "../types";

// ============================================================================
// CHON HOAT DONG "HOM NAY" CHO HOC SINH
// ----------------------------------------------------------------------------
// Nguyen tac: uu tien nhom linh vuc hoc sinh CON IT TRAI NGHIEM NHAT (khuyen
// khich kham pha rong khap 8 nhom thay vi chi lam di lam lai nhom quen thuoc -
// dung tinh than "tiep tuc thu nghiem va kham pha" cua ke hoach). Trong nhom
// duoc chon, uu tien hoat dong CHUA LAM hoac lau nhat chua lam.
// Chon deterministic theo (studentId + ngay) de F5 lai trang khong doi hoat
// dong khac trong cung 1 ngay.
// ============================================================================

/**
 * Phien ban thuat toan goi y - ghi kem moi su kien goi y (events.ts). Doi logic
 * chon hoat dong => tang phien ban de so sanh truoc/sau.
 *
 * CAN BANG KHAM PHA / KHAI THAC (bao cao DS loi 2): hoat dong CHINH moi ngay
 * thuan kham pha (nhom it trai nghiem nhat); goi y KHAM PHA THEM khai thac (2
 * goi y dau thuoc nhom em vua thich) - hoc sinh tu chon co lam them hay khong.
 * Chua dung bandit (epsilon-greedy/Thompson) vi chua co du lieu de dinh nghia
 * phan thuong; ha tang su kien da san sang cho buoc do.
 *
 * v3: tra kem PROPENSITY (de xuat A3) va bo qua nhom khong con hoat dong dang mo
 * (truoc day nhom bi tat het hoat dong luon "it kham pha nhat" => co ngay khong
 * chon duoc gi).
 */
export const ALGO_VERSION = "dp-v3-2026-10";

/**
 * Hoat dong duoc chon + xac suat no duoc chon. Hash (ma hoc sinh + ngay) dong vai tro
 * phep boc tham: chon deu 1 trong cac nhom it kham pha nhat, roi deu 1 trong cac hoat
 * dong chua lam cua nhom; "da lam het" thi tat dinh (lau nhat chua lam lai). Ghi kem su
 * kien "shown" => sau nay danh gia lai duoc ma khong phai doan xac suat. Luu y: chinh
 * sach nay KHONG BAO GIO goi y nhom da kham pha nhieu, nen propensity khong du de danh gia
 * mot chinh sach "uu tien nhom em thich" (xac suat 0) - can them ngau nhien co chu dich.
 */
export interface DailyPick {
  activity: Activity;
  propensity: number;
  /** So hoat dong co the duoc chon hom nay (xac suat > 0). */
  nCandidates: number;
}

/** So lan toi da hoc sinh duoc "Doi hoat dong khac" trong 1 ngay - xem swapDailyActivityAction. */
export const MAX_SWAPS_PER_DAY = 2;

/** Ngoai hoat dong chinh, moi ngay duoc lam them toi da bay nhieu hoat dong "kham pha them". */
export const MAX_EXTRA_PER_DAY = 2;

/** Toi da bay nhieu hoat dong trong danh sach "de danh lam sau". */
export const MAX_SAVED_ACTIVITIES = 5;

export function seededIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % length;
}

export function pickDailyActivity(
  activities: Activity[],
  logs: ActivityLog[],
  studentId: string,
  dateISO: string,
  /** Hoat dong hoc sinh vua bam "Doi hoat dong khac" hom nay - xem swapDailyActivityAction.
   *  Chi loai o buoc chon cuoi cung (candidates), KHONG loai khoi thong ke lich su ben duoi,
   *  neu khong se lam sai lech "nhom nao con it duoc kham pha nhat". */
  excludeIds: ReadonlySet<string> = new Set()
): DailyPick | null {
  const activeActivities = activities.filter((a) => a.active);
  if (activeActivities.length === 0) return null;

  // Neu hom nay da lam hoat dong CHINH roi thi tra ve dung hoat dong do (on dinh trong ngay).
  // Hoat dong kham pha them (isExtra) khong thay the hoat dong chinh.
  const todayLog = logs.find((l) => l.date === dateISO && !l.isExtra);
  if (todayLog) {
    const done = activeActivities.find((a) => a.id === todayLog.activityId);
    if (done) return { activity: done, propensity: 1, nCandidates: 1 };
  }

  const pools = candidatePools(activeActivities, logs, excludeIds);
  const { domain, pool } = pools[seededIndex(studentId + dateISO, pools.length)]!;
  return {
    activity: pool[seededIndex(studentId + dateISO + domain, pool.length)]!,
    propensity: 1 / (pools.length * pool.length),
    nCandidates: pools.reduce((n, p) => n + p.pool.length, 0),
  };
}

/**
 * CO CHE BOC THAM cua hoat dong chinh: cac nhom IT KHAM PHA NHAT (con hoat dong dang mo) va cac hoat dong co the
 * duoc chon trong tung nhom. Chon deu 1 nhom roi deu 1 hoat dong => xac suat 1 / (so nhom x so hoat dong cua nhom).
 * Dung chung cho pickDailyActivity va danh gia offline (IPS, scripts/analyze-models.ts dung lai tap ung vien).
 */
export function candidatePools(
  activities: Activity[],
  logs: ActivityLog[],
  /** Hoat dong vua bi "Doi hoat dong khac" hom nay: chi loai o buoc chon cuoi cung, KHONG loai khoi thong ke lich su. */
  excludeIds: ReadonlySet<string> = new Set()
): { domain: DomainCode; pool: Activity[] }[] {
  const activeActivities = activities.filter((a) => a.active);
  const completedCountByDomain = new Map<DomainCode, number>();
  const lastDoneAt = new Map<string, string>(); // activityId -> ngay gan nhat da lam
  for (const log of logs) {
    const activity = activeActivities.find((a) => a.id === log.activityId);
    if (!activity) continue;
    completedCountByDomain.set(activity.domain, (completedCountByDomain.get(activity.domain) ?? 0) + 1);
    const prev = lastDoneAt.get(activity.id);
    if (!prev || log.date > prev) lastDoneAt.set(activity.id, log.date);
  }

  // Chi xet nhom CON hoat dong dang mo (nhom bi tat het co 0 lan nen truoc day luon bi chon roi tra ve null).
  const domainsWithActivities = DOMAINS.filter((d) => activeActivities.some((a) => a.domain === d.code));
  const countOf = (code: DomainCode) => completedCountByDomain.get(code) ?? 0;
  const minCount = Math.min(...domainsWithActivities.map((d) => countOf(d.code)));

  const poolOf = (code: DomainCode): Activity[] => {
    const domainActivities = activeActivities.filter((a) => a.domain === code);
    // Loai cac hoat dong vua bi "doi" hom nay, tru khi lam vay het sach ca nhom
    // (fallback ve nguyen nhom, con hon khong co gi de chon).
    const excludable = domainActivities.filter((a) => !excludeIds.has(a.id));
    const candidates = excludable.length > 0 ? excludable : domainActivities;
    // Uu tien hoat dong CHUA TUNG lam trong nhom nay
    const neverDone = candidates.filter((a) => !lastDoneAt.has(a.id));
    if (neverDone.length > 0) return neverDone;
    // Neu tat ca da tung lam, chon TAT DINH hoat dong lau nhat chua lam lai
    const oldestFirst = [...candidates].sort((a, b) => (lastDoneAt.get(a.id) ?? "").localeCompare(lastDoneAt.get(b.id) ?? ""));
    return oldestFirst.slice(0, 1);
  };

  return domainsWithActivities.filter((d) => countOf(d.code) === minCount).map((d) => ({ domain: d.code, pool: poolOf(d.code) }));
}

/**
 * Goi y "KHAM PHA THEM" sau khi xong hoat dong chinh (bao cao mentor: lam xong
 * la het viec, khong con gi de kham pha). Chua lam hom nay, uu tien hoat dong
 * CHUA TUNG lam va nhom IT trai nghiem; neu hoc sinh vua to ra hung thu
 * (focusDomain) thi 2 goi y dau thuoc nhom do. Cac goi y con lai moi cai mot
 * nhom de van rong khap 8 nhom.
 */
export function pickExtraActivities(
  activities: Activity[],
  logs: ActivityLog[],
  studentId: string,
  dateISO: string,
  focusDomain: DomainCode | null,
  count = 3
): Activity[] {
  const doneToday = new Set(logs.filter((l) => l.date === dateISO).map((l) => l.activityId));
  const doneEver = new Set(logs.map((l) => l.activityId));
  const domainOf = new Map(activities.map((a) => [a.id, a.domain] as const));
  const countByDomain = new Map<DomainCode, number>();
  for (const l of logs) {
    const d = domainOf.get(l.activityId);
    if (d) countByDomain.set(d, (countByDomain.get(d) ?? 0) + 1);
  }
  const tieBreak = (id: string) => seededIndex(studentId + dateISO + id, Number.MAX_SAFE_INTEGER);

  const pool = activities
    .filter((a) => a.active && !doneToday.has(a.id))
    .sort(
      (a, b) =>
        Number(doneEver.has(a.id)) - Number(doneEver.has(b.id)) ||
        (countByDomain.get(a.domain) ?? 0) - (countByDomain.get(b.domain) ?? 0) ||
        tieBreak(a.id) - tieBreak(b.id)
    );

  const picked = focusDomain ? pool.filter((a) => a.domain === focusDomain).slice(0, 2) : [];
  for (const a of pool) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.domain === a.domain)) picked.push(a);
  }
  return picked.slice(0, count);
}
