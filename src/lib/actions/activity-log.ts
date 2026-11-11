"use server";

import { getSession } from "../auth/session";
import { getRepository } from "../data";
import { recomputeAndSaveProfile } from "../profile-service";
import { activityTiming } from "../activity-timing";
import { daysBetweenISO, todayISOVN } from "../date";
import { MAX_EXTRA_PER_DAY } from "../recommendation/daily-pick";
import { logRecommendationEvents } from "../recommendation/events";
import type { ActivityLogSource } from "../types";

// ============================================================================
// Server Action DUNG CHUNG cho viec nop phan hoi hoat dong - dat trong
// src/lib/actions (khong nam trong 1 route cu the) vi duoc goi tu CA form
// nop bai binh thuong LAN component dong bo offline (khac thu muc route).
//
// QUY TAC NGHIEP VU - kiem tra o SERVER, khong chi "an nut" o giao dien.
// Truoc day cac quy tac nay chi ton tai o UI, nen chi can go truc tiep URL
// /hoc-sinh/hoat-dong/<id> roi nop la tao them ban ghi -> diem bi tinh trung.
//
//   1) Ngay gui len phai la HOM NAY khi source = "online". Rieng
//      "offline_sync" duoc phep gui ngay CU (hoat dong lam luc mat mang, dong
//      bo sau) nhung khong qua MAX_OFFLINE_BACKDATE_DAYS va khong o tuong lai.
//   2) Cung hoat dong + cung ngay -> SUA ban ghi da co (update), khong tao moi.
//      Day la co che "sua lai trong ngay".
//   3) Ban ghi DAU TIEN trong ngay la hoat dong chinh. Sau do duoc lam them
//      toi da MAX_EXTRA_PER_DAY hoat dong "kham pha them" (isExtra = true) -
//      bao cao mentor: 1 hoat dong/ngay khong du de duy tri hung thu. Qua gioi
//      han -> tu choi (chan bam lien tuc de doi diem).
//   4) Lam xong mot hoat dong dang "de danh lam sau" -> tu xoa khoi danh sach.
//
// LUU Y: KHONG chan truong hop "hoat dong nay da lam o ngay khac".
// pickDailyActivity CO Y de xuat lai hoat dong cu khi hoc sinh da trai nghiem
// het - chan lai se lam tac luong hang ngay cua nguoi dung lau dai.
// ============================================================================

const MAX_OFFLINE_BACKDATE_DAYS = 7;

const MAX_NOTE_CHARS = 1000;
const MAX_REFLECTION_CHARS = 500;

export interface SubmitActivityLogInput {
  activityId: string;
  date: string;
  interestRating: 1 | 2 | 3 | 4 | 5;
  reflectionText: string;
  /** Tuy chon: ban ghi offline cu (truoc 10/2026) trong IndexedDB khong co cac truong nay. */
  confidence?: 1 | 2 | 3 | null;
  difficulty?: 1 | 2 | 3 | null;
  note?: string;
  /** Gio MAY EM (ISO): mo trang hoat dong lan dau trong ngay / bam hoan thanh - xem lib/activity-timing.ts. */
  startedAt?: string | null;
  finishedAt?: string | null;
  source: ActivityLogSource;
}

export type SubmitActivityLogError =
  | "unauthorized"
  | "invalid_date"
  | "invalid_input"
  | "daily_limit_reached"
  | "server_error";

export interface SubmitActivityLogResult {
  ok: boolean;
  error?: SubmitActivityLogError;
  /** true = da SUA ban ghi cu, false = tao ban ghi moi. */
  updated?: boolean;
}

/** Ngay gui len co hop le khong (chong sua nguoc ve qua khu bang cach doi payload). */
function isAcceptableDate(date: string, source: ActivityLogSource, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (date > today) return false; // khong nhan ngay o tuong lai
  if (source === "online") return date === today;
  return daysBetweenISO(date, today) <= MAX_OFFLINE_BACKDATE_DAYS;
}

/** Thang 1-3 hoac null - payload den tu client nen KHONG tin kieu TypeScript. */
function scale3(v: unknown): 1 | 2 | 3 | null | undefined {
  if (v === undefined || v === null) return null;
  return v === 1 || v === 2 || v === 3 ? v : undefined;
}

export async function submitActivityLogAction(input: SubmitActivityLogInput): Promise<SubmitActivityLogResult> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { ok: false, error: "unauthorized" };
  }

  const today = todayISOVN();
  if (!isAcceptableDate(input.date, input.source, today)) {
    return { ok: false, error: "invalid_date" };
  }

  const confidence = scale3(input.confidence);
  const difficulty = scale3(input.difficulty);
  const note = typeof input.note === "string" ? input.note.trim() : "";
  const reflectionText = typeof input.reflectionText === "string" ? input.reflectionText.trim() : "";
  if (
    ![1, 2, 3, 4, 5].includes(input.interestRating) ||
    confidence === undefined ||
    difficulty === undefined ||
    note.length > MAX_NOTE_CHARS ||
    reflectionText.length > MAX_REFLECTION_CHARS
  ) {
    return { ok: false, error: "invalid_input" };
  }
  const feedback = { interestRating: input.interestRating, reflectionText, confidence, difficulty, note };

  try {
    const repo = getRepository();
    const [logs, activities] = await Promise.all([repo.listActivityLogsByStudent(session.id), repo.listActivities()]);
    if (!activities.some((a) => a.id === input.activityId)) {
      return { ok: false, error: "invalid_input" };
    }

    // (2) Cung hoat dong + cung ngay -> sua lai, khong tao ban ghi moi. Thoi gian lam giu nguyen lan dau.
    const existing = logs.find((l) => l.date === input.date && l.activityId === input.activityId);
    if (existing) {
      await repo.updateActivityLog(existing.id, feedback);
      await recomputeAndSaveProfile(session.id);
      return { ok: true, updated: true };
    }

    // (3) Ban ghi dau tien trong ngay = hoat dong chinh; sau do toi da MAX_EXTRA_PER_DAY hoat dong them.
    const logsThatDay = logs.filter((l) => l.date === input.date);
    if (logsThatDay.length > MAX_EXTRA_PER_DAY) {
      return { ok: false, error: "daily_limit_reached" };
    }

    await repo.createActivityLog({
      studentId: session.id,
      activityId: input.activityId,
      date: input.date,
      ...feedback,
      isExtra: logsThatDay.length > 0,
      source: input.source,
      ...activityTiming(input, input.source, Date.now()),
    });
    await repo.removeSavedActivity(session.id, input.activityId); // (4)
    await logRecommendationEvents(session.id, [{ activityId: input.activityId, event: "completed" }]);
    await recomputeAndSaveProfile(session.id);
    return { ok: true, updated: false };
  } catch (err) {
    console.error("[submitActivityLogAction] loi:", err);
    return { ok: false, error: "server_error" };
  }
}
