import type { ClassGroup, SurveyAttempt, SurveyAttemptWithResponses, SurveyOption, SurveyQuestion } from "./types";

// ============================================================================
// KHAO SAT: thu tu hien thi cau hoi + dap an, cac lan lam (attempt), thoi gian tung cau, co tra loi voi.
// Logic THUAN (khong "server-only") - dung chung cho trang khao sat, repository,
// trang giao vien va cac script phan tich / kiem thu.
// ============================================================================

/** FNV-1a 32-bit + tron bit (murmur3 fmix32): hai chuoi chi khac 1 ky tu cuoi van ra so rat khac nhau. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * THU TU DAP AN XAO THEO TUNG HOC SINH (de xuat A4). Voi thu tu co dinh, vi tri dap an
 * gan chat voi nhom: Ky thuat co 12/17 diem trong so o vi tri A, Nghe thuat 17/25 o vi
 * tri C => em hay chon phuong an dau (doc hieu kem, lam voi) bi day len nhom Ky thuat mot
 * cach co he thong, va em bam "toan A" van ra ho so rat ro (Ky thuat 100). Xao thi vi tri
 * khong con mang nghia nhom: bam cung vi tri tro thanh gan nhu ngau nhien va bi nguong
 * "Noi bat" (scoring.ts) chan lai.
 *
 * Co dinh theo (hoc sinh, dap an): tai lai trang, khao sat lai (T2), trang xem lai deu
 * CUNG thu tu (test-retest can giu nguyen cach hien thi giua hai lan). Vi tri em thay
 * duoc luu luc nop (survey_responses.display_position) nen phan tich khong phu thuoc ham nay.
 */
export function optionsInDisplayOrder(question: SurveyQuestion, studentId: string): SurveyOption[] {
  const key = (o: SurveyOption) => hash32(`${studentId}|${o.id}`);
  return [...question.options].sort((a, b) => key(a) - key(b));
}

/**
 * THU TU CAU HOI XAO THEO TUNG HOC SINH (de xuat A4): cau dung dau / cuoi bai khong con luon la mot cau co dinh
 * (em met dan ve cuoi bai, lam voi cac cau sau), va ca lop khong cung chep "cau 5 chon gi". Co dinh theo
 * (hoc sinh, cau) nhu thu tu dap an: tai lai trang, khao sat lai T2, trang xem lai deu CUNG thu tu (B1 giu
 * nguyen thu tu giua T1 va T2). Vi tri em thay luu luc nop (survey_responses.question_position).
 */
export function questionsInDisplayOrder<T extends Pick<SurveyQuestion, "id">>(questions: T[], studentId: string): T[] {
  const key = (q: T) => hash32(`${studentId}|cau|${q.id}`);
  return [...questions].sort((a, b) => key(a) - key(b));
}

/** Lan lam DA HOAN THANH moi nhat cua tung hoc sinh = dap an "hien tai" (cham diem, xem lai, lam tiep). */
export function latestAttempts<T extends Pick<SurveyAttempt, "studentId" | "completedAt">>(attempts: T[]): Map<string, T> {
  const out = new Map<string, T>();
  for (const a of attempts) {
    const prev = out.get(a.studentId);
    if (!prev || a.completedAt > prev.completedAt) out.set(a.studentId, a);
  }
  return out;
}

/** Dot khao sat lai lop dang mo ma em CHUA lam. Em chua lam lan nao thi lam khao sat binh thuong (T1) truoc. */
export function pendingRetestWave(
  classGroup: Pick<ClassGroup, "retestWave"> | null,
  attempts: Pick<SurveyAttempt, "measurementWave">[]
): string | null {
  const wave = classGroup?.retestWave ?? null;
  if (!wave || attempts.length === 0) return null;
  return attempts.some((a) => a.measurementWave === wave) ? null : wave;
}

/** Nhan dot ke tiep cho lop: T2 neu moi co T1, T3 neu da co T2... */
export function nextRetestWave(attempts: Pick<SurveyAttempt, "measurementWave">[]): string {
  const max = Math.max(1, ...attempts.map((a) => Number(/^T(\d+)$/.exec(a.measurementWave ?? "")?.[1] ?? 0)));
  return `T${max + 1}`;
}

// ============================================================================
// CO "TRA LOI VOI" (de xuat A4) - CHI de giao vien hoi lai em co hieu cau hoi
// khong; KHONG tu loai bai, khong phai danh gia hoc sinh. Chi xet bai FORM TRONG
// (T1, T2...): lam lai tu nguyen co dap an cu chon san, bam nop ngay la binh thuong.
// Nguong la gia dinh ban dau - hieu chinh bang phan bo thoi gian that cua pilot
// (npm run analyze:survey in phan vi thoi gian lam bai).
// ============================================================================

/** Duoi muc nay khong kip doc tinh huong + 4 dap an (doc cham ~ 30-45 giay/cau). */
export const MIN_SECONDS_PER_QUESTION = 5;
/** Chon cung vi tri bay nhieu cau LIEN NHAU. Tra loi ngau nhien 20 cau x 4 dap an: xac suat < 0,1%. */
export const MAX_SAME_POSITION_RUN = 8;

/**
 * Thoi diem em chon LAN DAU tung cau (ms tu luc mo trang) - client gui JSON {questionId: ms} trong input an
 * "answerTimes" (components/student/AnswerTimer.tsx). Payload tu client: gia tri sai kieu / am / qua maxMs bi bo,
 * JSON hong => rong. Khong bao gio lam hong bai nop - thoi gian chi la du lieu phu.
 */
export function parseAnswerTimes(raw: unknown, maxMs: number): Map<string, number> {
  const out = new Map<string, number>();
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 20_000) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return out;
  for (const [questionId, ms] of Object.entries(parsed)) {
    if (Number.isInteger(ms) && ms >= 0 && ms <= maxMs) out.set(questionId, ms);
  }
  return out;
}

export interface SurveyAttemptFlags {
  seconds: number | null;
  /** So cau em chon chi chua toi MIN_SECONDS_PER_QUESTION giay sau cau chon truoc do. null = khong co thoi gian tung cau. */
  fastAnswers: number | null;
  tooFast: boolean;
  longestSamePositionRun: number;
  samePosition: boolean;
}

export function surveyAttemptFlags(attempt: SurveyAttemptWithResponses, questions: SurveyQuestion[]): SurveyAttemptFlags {
  const seconds = attempt.startedAt ? (Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt)) / 1000 : null;
  const blankForm = attempt.measurementWave !== null;
  // "Lien nhau" theo thu tu cau EM THAY: question_position (tu 18/10/2026 cau xao theo em), du lieu cu theo `order`.
  const order = new Map(questions.map((q) => [q.id, q.order] as const));
  const shownAt = (r: SurveyAttemptWithResponses["responses"][number]) => r.questionPosition ?? order.get(r.questionId)!;
  const positions = attempt.responses
    .filter((r) => r.displayPosition !== null && order.has(r.questionId))
    .sort((a, b) => shownAt(a) - shownAt(b))
    .map((r) => r.displayPosition);
  let longest = 0;
  for (let i = 0, run = 0; i < positions.length; i++) {
    run = i > 0 && positions[i] === positions[i - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  // Thoi gian TUNG cau (de xuat A4): khoang cach giua cac lan chon dau tien, xep theo thoi diem chon. Bat duoc ca
  // em lam cham vai cau roi bam vo phan con lai - tong thoi gian ca bai van trong binh thuong.
  const times = attempt.responses
    .map((r) => r.firstAnsweredMs)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  const fastAnswers = times.length
    ? times.filter((t, i) => t - (times[i - 1] ?? 0) < MIN_SECONDS_PER_QUESTION * 1000).length
    : null;
  return {
    seconds,
    fastAnswers,
    tooFast:
      blankForm &&
      ((seconds !== null && seconds < MIN_SECONDS_PER_QUESTION * attempt.responses.length) ||
        (fastAnswers !== null && fastAnswers * 2 >= attempt.responses.length)),
    longestSamePositionRun: longest,
    samePosition: blankForm && longest >= MAX_SAME_POSITION_RUN,
  };
}
