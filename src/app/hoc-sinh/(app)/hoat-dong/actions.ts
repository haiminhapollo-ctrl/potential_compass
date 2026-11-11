"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseOpenedAt } from "@/lib/activity-timing";
import { quizVersion, scoreQuiz } from "@/lib/quiz";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { todayISOVN } from "@/lib/date";
import { MAX_SAVED_ACTIVITIES, MAX_SWAPS_PER_DAY } from "@/lib/recommendation/daily-pick";
import { logRecommendationEvents } from "@/lib/recommendation/events";

// ============================================================================
// "DOI HOAT DONG KHAC" - hoat dong hang ngay doi khi can 1 TINH HUONG cu the
// hoc sinh chua gap hom do (vd "Hoa giai mot bat dong nho" can co 2 nguoi
// dang cai nhau) -> hoc sinh bi ket, khong lam duoc ma cung khong doi sang
// bai khac duoc. Cho doi TAM THOI trong ngay, khong dung DB/schema moi: chi
// 1 cookie nho ghi lai cac activityId da doi qua hom nay, daily-pick.ts doc
// lai de loai ra khoi lua chon. Gioi han MAX_SWAPS_PER_DAY lan/ngay de tranh
// hoc sinh bam doi lien tuc de "chon bai de nhat trong 32 bai".
// ============================================================================

const COOKIE_NAME = "pc_swap";

interface SwapCookie {
  date: string;
  excludedIds: string[];
}

function parseSwapCookie(raw: string | undefined, today: string): SwapCookie {
  if (!raw) return { date: today, excludedIds: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<SwapCookie>;
    if (parsed.date !== today || !Array.isArray(parsed.excludedIds)) return { date: today, excludedIds: [] };
    return { date: today, excludedIds: parsed.excludedIds.filter((id): id is string => typeof id === "string") };
  } catch {
    return { date: today, excludedIds: [] };
  }
}

/** Doc trong Server Component (trang hoat-dong) de truyen vao pickDailyActivity. */
export async function getSwappedOutActivityIds(): Promise<Set<string>> {
  const cookieStore = await cookies();
  const { excludedIds } = parseSwapCookie(cookieStore.get(COOKIE_NAME)?.value, todayISOVN());
  return new Set(excludedIds);
}

export async function swapDailyActivityAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") return;

  const currentActivityId = String(formData.get("currentActivityId") ?? "");
  if (!currentActivityId) return;

  const today = todayISOVN();

  // Da lam mot hoat dong hom nay roi thi doi khong con y nghia gi nua.
  const repo = getRepository();
  const logs = await repo.listActivityLogsByStudent(session.id);
  if (logs.some((l) => l.date === today)) return;

  const cookieStore = await cookies();
  const current = parseSwapCookie(cookieStore.get(COOKIE_NAME)?.value, today);
  if (current.excludedIds.length >= MAX_SWAPS_PER_DAY || current.excludedIds.includes(currentActivityId)) {
    return;
  }

  const next: SwapCookie = { date: today, excludedIds: [...current.excludedIds, currentActivityId] };
  cookieStore.set(COOKIE_NAME, JSON.stringify(next), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 ngay - qua ngay la parseSwapCookie tu bo qua (date khac hom nay)
  });
  await logRecommendationEvents(session.id, [{ activityId: currentActivityId, event: "swapped" }]);

  revalidatePath("/hoc-sinh/hoat-dong");
}

// ============================================================================
// "DE DANH LAM SAU" - bao cao mentor: co hoat dong can chuan bi/doi dung thoi
// diem (hoi ong ba, dem sao buoi toi...), ep lam ngay thi luong hoc bi dut va
// hoc sinh de quen. Luu vao danh sach cho (toi da MAX_SAVED_ACTIVITIES) - trang
// hoat dong hien lai de nhac; hoat dong da de danh khong bi chon lam "hom nay";
// lam xong thi tu xoa khoi danh sach (submitActivityLogAction).
// ============================================================================
export async function saveForLaterAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") return;

  const activityId = String(formData.get("activityId") ?? "");
  const repo = getRepository();
  const [activities, saved] = await Promise.all([repo.listActivities(), repo.listSavedActivities(session.id)]);
  if (!activities.some((a) => a.id === activityId && a.active)) return;
  if (saved.length >= MAX_SAVED_ACTIVITIES) return;

  await repo.saveActivityForLater(session.id, activityId);
  await logRecommendationEvents(session.id, [{ activityId, event: "saved" }]);
  revalidatePath("/hoc-sinh/hoat-dong");
  revalidatePath(`/hoc-sinh/hoat-dong/${activityId}`);
}

export async function removeSavedAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") return;

  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) return;
  await getRepository().removeSavedActivity(session.id, activityId);
  revalidatePath("/hoc-sinh/hoat-dong");
  revalidatePath(`/hoc-sinh/hoat-dong/${activityId}`);
}

// ============================================================================
// CAU HOI ON NHANH (de xuat A5 buoc 2): chi sau khi em DA lam xong hoat dong hom nay, moi hoat dong 1 lan / ngay.
// Ghi kem thoi gian lam (mo quiz -> nop) va phien ban noi dung quiz. KHONG tinh vao ho so so thich.
// ============================================================================
export async function submitQuizAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/hoc-sinh/dang-nhap");

  const activityId = String(formData.get("activityId") ?? "");
  const back = `/hoc-sinh/hoat-dong/${encodeURIComponent(activityId)}`;
  const repo = getRepository();
  const today = todayISOVN();
  const [activities, logs, attempts] = await Promise.all([
    repo.listActivities(),
    repo.listActivityLogsByStudent(session.id),
    repo.listQuizAttempts([session.id]),
  ]);
  const activity = activities.find((a) => a.id === activityId);
  if (!activity || activity.quiz.length === 0) redirect("/hoc-sinh/hoat-dong");
  const doneToday = logs.some((l) => l.activityId === activityId && l.date === today);
  if (!doneToday || attempts.some((a) => a.activityId === activityId && a.date === today)) redirect(`${back}#quiz`);

  const chosen = new Map<string, number>();
  for (const q of activity.quiz) {
    const raw = formData.get(`q_${q.id}`);
    if (typeof raw === "string" && /^\d+$/.test(raw)) chosen.set(q.id, Number(raw));
  }
  const scored = scoreQuiz(activity.quiz, chosen);
  if (!scored) redirect(`${back}?loi-quiz=1#quiz`);

  const now = Date.now();
  try {
    await repo.createQuizAttempt({
      studentId: session.id,
      activityId,
      date: today,
      quizVersion: quizVersion(activity.quiz),
      ...scored,
      startedAt: parseOpenedAt(formData.get("startedAt"), now, 6),
      finishedAt: new Date(now).toISOString(),
    });
  } catch (err) {
    console.error("[quiz] Khong ghi duoc bai lam (co the bam nop 2 lan):", err); // lan dau da luu => van hien ket qua
  }
  redirect(`${back}#quiz`);
}
