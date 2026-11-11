import "server-only";
import { getRepository } from "./data";
import type { Repository } from "./data";
import { DEFAULT_TERM, surveyQuestionsFor } from "./curriculum";
import { daysBetweenISO, isInRange, todayISOVN, weekRangeVN } from "./date";
import {
  buildRatingStats,
  computeContentHash,
  computePotentialProfile,
  isSurveyComplete,
  notableDomains,
  recommendTrack,
  SCORING_VERSION,
  type RatingStats,
  type ScoringContent,
} from "./recommendation/scoring";
import { generateInsightText, generateWeeklyReviewText, PROMPT_VERSION } from "./recommendation/gemini";
import { RIASEC_READY } from "./riasec";
import { pendingRetestWave } from "./survey";
import type { CurriculumTerm, PotentialProfile, SnapshotReason, SurveyQuestion, WeeklyReview } from "./types";

// ============================================================================
// PROFILE SERVICE - noi DUY NHAT tinh lai & luu Ho so so thich + snapshot tuan.
// Goi sau MOI su kien anh huong ho so (nop khao sat, nop/sua hoat dong) va boi
// cron hang ngay (src/app/api/cron/snapshot) cho MOI hoc sinh - snapshot khong
// con phu thuoc hoc sinh co mo trang tong ket hay khong (bao cao DS loi 9).
// ============================================================================

/** Noi dung + thong ke dung chung khi tinh nhieu ho so (cron) - doc 1 lan. */
export interface ScoringContext {
  content: ScoringContent;
  contentHash: string;
  ratingStats: RatingStats;
}

export async function loadScoringContext(repo: Repository = getRepository()): Promise<ScoringContext> {
  const [questions, activities, ratings] = await Promise.all([
    repo.listSurveyQuestions(),
    repo.listActivities(),
    repo.listAllActivityRatings(),
  ]);
  const content = { questions, activities };
  return { content, contentHash: computeContentHash(content), ratingStats: buildRatingStats(ratings) };
}

/** Bo cau khao sat cua em = cau dang dung cua hoc ky lop (curriculum.ts). `all` = moi cau (tinh dau van tay noi dung). */
export async function getStudentSurvey(
  studentId: string,
  repo: Repository = getRepository()
): Promise<{ term: CurriculumTerm; questions: SurveyQuestion[]; all: SurveyQuestion[] }> {
  const [term, all] = await Promise.all([getStudentTerm(studentId, repo), repo.listSurveyQuestions()]);
  return { term, questions: surveyQuestionsFor(all, term), all };
}

/** Hoc ky lop cua em dang hoc (quyet dinh bo cau hoi + hoat dong). Em khong thuoc lop nao => mac dinh. */
export async function getStudentTerm(studentId: string, repo: Repository = getRepository()): Promise<CurriculumTerm> {
  const student = await repo.getStudent(studentId);
  const classGroup = student ? await repo.getClass(student.classId) : null;
  return classGroup?.curriculumTerm ?? DEFAULT_TERM;
}

export async function recomputeAndSaveProfile(
  studentId: string,
  reason: SnapshotReason = "event",
  ctx?: ScoringContext,
  /** Hoc ky lop (recomputeAllProfiles doc san theo lop); khong truyen => tu doc. */
  knownTerm?: CurriculumTerm
): Promise<PotentialProfile> {
  const repo = getRepository();
  const [context, allResponses, activityLogs, previous, term] = await Promise.all([
    ctx ?? loadScoringContext(repo),
    repo.listResponsesByStudent(studentId),
    repo.listActivityLogsByStudent(studentId),
    repo.getProfile(studentId),
    knownTerm ?? getStudentTerm(studentId, repo),
  ]);

  // Chi cham cau DANG DUNG cua hoc ky lop: cau da thay (doi nghia) hoac cua hoc ky khac khong tinh vao ho so hien tai
  // (van con trong lich su lan lam). Em chua tra loi cau moi cua ky => surveyCompleted = false => duoc moi tra loi bo sung.
  const questions = surveyQuestionsFor(context.content.questions, term);
  const questionIds = new Set(questions.map((q) => q.id));
  const responses = allResponses.filter((r) => questionIds.has(r.questionId));
  const result = computePotentialProfile(
    { questions, activities: context.content.activities },
    studentId,
    responses,
    activityLogs,
    context.ratingStats
  );
  // Khong bo qua IM LANG du lieu khong hop le (bao cao DS loi 17): ghi log de soat; scripts/data-quality.ts liet ke chi tiet.
  if (result.skipped.responses || result.skipped.activityLogs) {
    console.warn(
      `[profile-service] ${studentId}: bo qua ${result.skipped.responses} cau tra loi, ${result.skipped.activityLogs} hoat dong khong con ton tai`
    );
  }

  const surveyCompleted = isSurveyComplete(questions, responses);
  const track = surveyCompleted ? recommendTrack(result.scores, result.trackAffinity, term) : null;

  // Chi goi Gemini khi KET QUA doi (top 3 / nhan Noi bat / cong thuc) - truoc day goi lai sau moi su kien (loi 15).
  let lastInsight = previous?.lastInsight ?? null;
  let insightProvenance = previous?.insightProvenance ?? null;
  const resultChanged =
    !lastInsight ||
    previous?.scoringVersion !== SCORING_VERSION ||
    insightProvenance?.promptVersion !== PROMPT_VERSION ||
    previous?.topDomains.join() !== result.topDomains.join() ||
    notableDomains(previous?.scores ?? []).join() !== notableDomains(result.scores).join();
  if (!surveyCompleted) {
    lastInsight = null;
    insightProvenance = null;
  } else if (resultChanged) {
    const insight = await generateInsightText({ studentId, scores: result.scores, topDomains: result.topDomains, term });
    lastInsight = insight.text;
    insightProvenance = {
      source: insight.source,
      model: insight.model,
      promptVersion: insight.promptVersion,
      generatedAt: new Date().toISOString(),
    };
  }

  const now = new Date().toISOString();
  const profile: PotentialProfile = {
    studentId,
    scores: result.scores,
    topDomains: result.topDomains,
    surveyCompleted,
    activitiesCompletedCount: activityLogs.length,
    lastInsight,
    insightProvenance,
    components: result.components,
    track,
    scoringVersion: SCORING_VERSION,
    contentHash: context.contentHash,
    updatedAt: now,
  };
  await repo.saveProfile(profile);

  // Snapshot tuan hien tai = trang thai moi nhat trong tuan (tuan da qua giu trang thai cuoi tuan).
  if (surveyCompleted) {
    await repo.saveSnapshot({
      id: `snap_${studentId}_${weekRangeVN().start}`,
      studentId,
      weekStartDate: weekRangeVN().start,
      scores: result.scores,
      topDomains: result.topDomains,
      components: result.components,
      track,
      scoringVersion: SCORING_VERSION,
      contentHash: context.contentHash,
      reason,
      dataCutoffAt: now,
      nResponses: responses.length,
      nActivityLogs: activityLogs.length,
      createdAt: now,
    });
  }
  return profile;
}

/**
 * Tinh lai MOI ho so + ghi snapshot tuan - chay boi cron hang ngay (va script
 * recompute-profiles). Ca hoc sinh khong mo app cung co snapshot => chuoi thoi
 * gian khong bi thieu theo kieu "chi nguoi hay vao moi co du lieu".
 */
export async function recomputeAllProfiles(reason: SnapshotReason): Promise<{ total: number; failed: string[] }> {
  const repo = getRepository();
  const ctx = await loadScoringContext(repo);
  let total = 0;
  const failed: string[] = [];
  for (const school of await repo.listSchools()) {
    const termOf = new Map((await repo.listClasses(school.id)).map((c) => [c.id, c.curriculumTerm] as const));
    for (const student of await repo.listStudentsBySchool(school.id)) {
      try {
        await recomputeAndSaveProfile(student.id, reason, ctx, termOf.get(student.classId) ?? DEFAULT_TERM);
        total++;
      } catch (err) {
        console.error(`[profile-service] Loi tinh lai ho so ${student.id}:`, err);
        failed.push(student.id);
      }
    }
  }
  return { total, failed };
}

/**
 * Tong ket tuan LUON khop du lieu hien tai: dem lai hoat dong trong tuan (co can
 * tren) moi lan xem; chi sinh lai van ban khi so hoat dong hoac top 3 doi.
 * Truoc day sinh 1 lan roi "dong bang" ca tuan (vd "0 hoat dong" tu thu Hai).
 */
export async function getOrRefreshWeeklyReview(studentId: string): Promise<WeeklyReview> {
  const repo = getRepository();
  const range = weekRangeVN();
  const [profile, activityLogs, reviews] = await Promise.all([
    repo.getProfile(studentId),
    repo.listActivityLogsByStudent(studentId),
    repo.listWeeklyReviews(studentId),
  ]);
  const activitiesCompleted = activityLogs.filter((l) => isInRange(l.date, range)).length;
  const scores = profile?.scores ?? [];
  // Tong ket tuan chi neu nhom CO NHAN "Noi bat" (giong bieu do) - nhan doi ma top 3 khong doi cung phai viet lai.
  const topDomains = notableDomains(scores);

  const existing = reviews.find((r) => r.weekStartDate === range.start);
  if (
    existing &&
    existing.activitiesCompleted === activitiesCompleted &&
    existing.topDomains.join() === topDomains.join() &&
    existing.promptVersion === PROMPT_VERSION
  ) {
    return existing;
  }

  const { text, source, model, promptVersion } = await generateWeeklyReviewText({
    studentId,
    scores,
    topDomains,
    activitiesCompleted,
    term: await getStudentTerm(studentId, repo),
  });
  const review: WeeklyReview = {
    id: `wr_${studentId}_${range.start}`,
    studentId,
    weekStartDate: range.start,
    activitiesCompleted,
    topDomains,
    summaryText: text,
    aiGenerated: source === "gemini",
    model,
    promptVersion,
    createdAt: new Date().toISOString(),
  };
  await repo.saveWeeklyReview(review);
  return review;
}

/** Dot khao sat lai (T2...) lop cua em dang mo ma em chua lam - de moi em lam (de xuat B1). */
/** Em duoc moi lam bai doi chieu RIASEC: lop dang bat, du ban dich, da lam khao sat lan dau, chua lam RIASEC. */
export async function isRiasecPending(studentId: string): Promise<boolean> {
  if (!RIASEC_READY) return false;
  const repo = getRepository();
  const [student, attempts, riasec] = await Promise.all([repo.getStudent(studentId), repo.listSurveyAttempts([studentId]), repo.listRiasecAttempts([studentId])]);
  const classGroup = student ? await repo.getClass(student.classId) : null;
  return !!classGroup?.riasecEnabled && attempts.length > 0 && riasec.length === 0;
}

export async function getPendingRetestWave(studentId: string): Promise<string | null> {
  const repo = getRepository();
  const [student, attempts] = await Promise.all([repo.getStudent(studentId), repo.listSurveyAttempts([studentId])]);
  const classGroup = student ? await repo.getClass(student.classId) : null;
  return pendingRetestWave(classGroup, attempts);
}

/** Ngay Thu Hai dau tuan hien tai (gio VN) - xem src/lib/date.ts. */
export function getWeekStartDate(): string {
  return weekRangeVN().start;
}

/** Hoc sinh can "hoi tham": khong co hoat dong nao trong `days` ngay qua (tin hieu cho GIAO VIEN xem, khong dan nhan). */
export function daysSinceLastActivity(logs: { date: string }[], today = todayISOVN()): number | null {
  if (logs.length === 0) return null;
  const last = logs.reduce((m, l) => (l.date > m ? l.date : m), logs[0]!.date);
  return daysBetweenISO(last, today);
}
