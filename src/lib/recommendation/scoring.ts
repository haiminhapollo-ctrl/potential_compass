import { TRACK_DECISION_TERM } from "../curriculum";
import { DOMAINS, getDomain } from "../domains";
import { seededIndex } from "./daily-pick";
import type {
  Activity,
  CurriculumTerm,
  DomainCode,
  DomainScore,
  DomainScoreComponents,
  SurveyOption,
  SurveyQuestion,
  TrackProfile,
} from "../types";

// ============================================================================
// CHAM DIEM HO SO SO THICH - rule-based, KHONG phai mo hinh hoc may
// ----------------------------------------------------------------------------
// Pipeline: du lieu (khao sat + danh gia hoat dong) -> bo cham diem theo QUY
// TAC duoi day -> (tuy chon) LLM chi DIEN GIAI diem thanh loi van (gemini.ts).
// Do SO THICH qua tinh huong doi song, KHONG do nang luc.
//
// 1) DIEM KHAO SAT = phan vi so voi nguoi chon NGAU NHIEN (thang co dinh):
//      surveyScore_d = 100 x [ P(R_d < raw_d) + 0.5 x P(R_d = raw_d) ]
//    R_d = diem tho nhom d cua mot nguoi chon deu ngau nhien 1/n dap an moi cau
//    (phan phoi CHINH XAC bang tich chap qua tung cau da tra loi). Nen:
//      - 50 = ngang nguoi chon bua; > 50 = nghieng ve nhom nay hon muc ngau nhien.
//      - Diem 1 nhom KHONG phu thuoc nhom khac (bao cao DS loi 5) va so sanh
//        duoc giua hoc sinh / giua cac tuan (neo co dinh theo bo cau hoi).
//      - Tu dong bu chenh lech cau truc bo cau hoi (nhom xuat hien 6 hay 16
//        lan, tran 9 hay 23 - loi 6): mo phong 40.000 nguoi chon ngau nhien cho
//        moi nhom dung dau 10,9-14,2% (ly tuong 12,5%); min-max cu: 1-39%.
//
// 2) DIEM HOAT DONG = co (shrinkage) + can giua (loi 2, 7):
//      r~ = rating - mu - alpha_hoat_dong - beta_hoc_sinh
//        mu    : rating trung binh chung (mac dinh 3)
//        alpha : hoat dong nay bi cham cao/thap hon trung binh bao nhieu (chat
//                luong bai), co ve 0 bang ACTIVITY_PRIOR_N lan quan sat ao
//        beta  : phong cach cham cua chinh hoc sinh (luon 4-5 hay luon 2-3) =
//                trung binh CAN BANG THEO NHOM (lay TB tung nhom truoc, roi TB
//                giua cac nhom), co ve 0 bang STUDENT_PRIOR_N nhom ao. Neu tinh
//                tren tung lan cham, em lam nhieu lan 1 nhom yeu thich (vd qua
//                "kham pha them") se bi coi la "hay cham cao" va mat tin hieu.
//      shift_d = SHIFT_MAX x Sum(w x clamp(r~/2)) / (SHIFT_K + Sum w)
//        w = 1 nhom chinh, 0.5 nhom phu cua hoat dong
//      => |shift| < SHIFT_MAX: khong bao gio dinh tran sau vai lan 5 sao; danh
//      gia o muc trung binh cua chinh em khong cong/tru; cang nhieu bang chung
//      cang anh huong nhieu. SHIFT_MAX/SHIFT_K chon bang mo phong do nhay
//      (scripts/analyze-scoring.ts) - hieu chinh lai bang du lieu pilot.
//
// 3) Diem nhom = kep(surveyScore + shift, 0, 100). Xep hang theo gia tri CHUA
//    kep/lam tron; hoa that thi pha bang hash(studentId + nhom).
//
// 4) NHAN "NOI BAT" (de xuat A1): nhom trong top 3 co gia tri CHUA lam tron
//    > notableThreshold(so lan danh gia hoat dong). Nguong cu (diem >= 60) vo
//    nghia: diem la phan vi TUNG nhom, nguoi chon bua co ~40% kha nang >= 60 o
//    moi nhom nen nhom cao nhat trong 8 nhom gan nhu luon >= 60 (mo phong:
//    100% nguoi chon bua co nhan, TB 2,9 nhan; "chua phan biet ro" khong bao gio
//    hien). Nguong moi dat tren nhom CAO NHAT trong 8 nhom cua nguoi tra loi
//    bua (mot nguong chung, kiem soat ty le "it nhat 1 nhan" o muc NOTABLE_ALPHA):
//      - chi khao sat: phan vi 80% cua nhom cao nhat ~ 97,2 (diem lam tron da
//        dinh tran 99 o phan vi 90% => phai so tren gia tri chua lam tron);
//      - co hoat dong: diem cong/tru hoat dong cong them dao dong nen nguong tang
//        dan, tu 8 lan danh gia tro len ~ 100 (mot nguong co dinh 97,2 de nguoi
//        bua + cham sao bua dat nhan 31-33%).
//    Danh doi (mo phong analyze-scoring, gia dinh): voi alpha 20%, em doc hieu
//    kem ma tra loi that chi ~50% co nhan ngay sau khao sat => giao dien noi
//    "ho so ban dau, se ro hon sau vai hoat dong", khong noi "chua ro" kieu loi.
//    Hieu chinh lai (bo cau hoi/SHIFT_* doi): npm run analyze:scoring; kiem tra
//    tu dong ty le nguoi bua co nhan: npm run check:logic.
//
// 5) THIEN HUONG LUONG (v5, 11/2026): moi dap an co trackWeights {vocational, academic}
//    (bat tay lam/sua/van hanh vs tim hieu nguyen ly/tinh toan/nghien cuu) - DOC LAP voi
//    8 nhom. vocationalAffinity / academicAffinity = phan vi so voi nguoi chon ngau nhien,
//    cung cong thuc muc 1 (50 = ngang chon bua). Chi tu khao sat, khong tu hoat dong.
//    Hai diem nay nguoc chieu nhau gan hoan toan (1 dap an thuong chi mang 1 huong): mo phong
//    nguoi chon bua, |voc - acad| >= 30 xay ra o ~67% => KHONG dung hieu de quyet dinh. Thay vao do
//    lean = phan vi cua (tong voc - tong acad) so voi nguoi chon ngau nhien (50 = can bang).
//    Nhan luong (recommendTrack) - CHI giao vien xem:
//      - KHOA CUNG: nhom dung dau CO NHAN "Noi bat" la nhom academicOnly (Y te, Su pham)
//        => ACADEMIC_HIGH_SCHOOL (nghe bat buoc co bang cao dang/dai hoc).
//      - Truoc hoc ky chot luong (G9_HK2) => DUAL_EXPLORATION: 13-14 tuoi con dang doi.
//      - G9_HK2: lean >= 100 - TRACK_CUTOFF => hoc nghe; lean <= TRACK_CUTOFF => THPT; con lai DUAL.
//    TRACK_CUTOFF = 100 x TRACK_ALPHA / 2 => nguoi tra loi BUA bi gan nhan luong ~ TRACK_ALPHA (check:logic).
//
// Doi bat ky dieu gi o tren => TANG SCORING_VERSION (ho so/snapshot luu kem).
// v5 (11/2026): 3 nhom doi nghia (domains.ts), cau thay the, goi cau theo hoc ky, luong.
// Diem v4 va v5 KHONG so sanh truc tiep - phan tich theo tung scoringVersion.
// ============================================================================

export const SCORING_VERSION = "v5-2026-11";

/** Ty le nguoi tra loi BUA bi gan nhan luong (khong phai DUAL) o hoc ky chot - nguong chenh lech dat theo muc nay. */
export const TRACK_ALPHA = 0.2;
/** Nguong 2 dau cua `lean`: <= TRACK_CUTOFF => THPT, >= 100 - TRACK_CUTOFF => hoc nghe. */
export const TRACK_CUTOFF = (100 * TRACK_ALPHA) / 2;

/** Ty le nguoi tra loi BUA (khao sat + cham sao ngau nhien) van co it nhat 1 nhan "Noi bat" - giao vien da duyet 18/10/2026. */
export const NOTABLE_ALPHA = 0.2;
const NOTABLE_SURVEY_ONLY = 97.2; // phan vi (1 - alpha) nhom cao nhat, chi khao sat
const NOTABLE_WITH_ACTIVITIES = 100; // ... khi da co >= NOTABLE_RAMP_RATINGS lan danh gia
const NOTABLE_RAMP_RATINGS = 8;

/** Nguong (tren gia tri CHUA lam tron surveyScore + activityShift) de gan "Noi bat", tang tuyen tinh theo so lan danh gia. */
export function notableThreshold(nRatings: number): number {
  return NOTABLE_SURVEY_ONLY + (NOTABLE_WITH_ACTIVITIES - NOTABLE_SURVEY_ONLY) * Math.min(1, nRatings / NOTABLE_RAMP_RATINGS);
}

/** Cac nhom duoc gan "Noi bat" (theo thu hang). Ho so cong thuc cu (chua co nhan) => []. */
export function notableDomains(scores: DomainScore[]): DomainCode[] {
  return [...scores].sort((a, b) => a.rank - b.rank).filter((s) => s.notable).map((s) => s.domain);
}

export const SHIFT_MAX = 40;
export const SHIFT_K = 3;
const SECONDARY_DOMAIN_WEIGHT = 0.5;
const ACTIVITY_PRIOR_N = 5;
const STUDENT_PRIOR_N = 3; // don vi: so NHOM ao (xem beta o tren)
const NEUTRAL_RATING = 3;

/** Noi dung dung de cham diem - truyen vao tu repository (xem profile-service.ts). */
export interface ScoringContent {
  questions: SurveyQuestion[];
  /** Ca hoat dong da tat (active=false): hoc sinh da lam roi thi van phai tinh. */
  activities: Activity[];
}

/** Thong ke rating cua TAT CA hoc sinh - de can giua theo chat luong tung hoat dong. */
export interface RatingStats {
  globalMean: number;
  byActivity: Map<string, { n: number; sum: number }>;
}

/** Tham so co the doi khi phan tich do nhay (scripts/analyze-scoring.ts); production dung mac dinh. */
export interface ScoringParams {
  shiftMax?: number;
  shiftK?: number;
}

export interface ScoringResponseInput {
  optionId: string;
}

export interface ScoringActivityLogInput {
  activityId: string;
  interestRating: 1 | 2 | 3 | 4 | 5;
}

export type TrackAffinity = Pick<TrackProfile, "vocationalAffinity" | "academicAffinity" | "lean">;

export interface ScoringResult {
  scores: DomainScore[]; // sap xep giam dan theo score, du 8 nhom
  topDomains: DomainCode[]; // top 3
  components: DomainScoreComponents[]; // theo thu tu DOMAINS
  rawTotals: Record<DomainCode, number>; // diem tho khao sat
  /** Thien huong luong tu khao sat (0-100, phan vi so voi chon ngau nhien) - dau vao cho recommendTrack. */
  trackAffinity: TrackAffinity;
  /** Ban ghi bi BO QUA vi tham chieu dap an/hoat dong khong ton tai (khong im lang - xem profile-service). */
  skipped: { responses: number; activityLogs: number };
}

function emptyTotals(): Record<DomainCode, number> {
  const totals = {} as Record<DomainCode, number>;
  for (const d of DOMAINS) totals[d.code] = 0;
  return totals;
}

/** Phan phoi tong `weightOf(dap an)` cua nguoi chon ngau nhien deu tren cac cau `questions`. */
function randomResponderDistribution(questions: SurveyQuestion[], weightOf: (o: SurveyOption) => number): Map<number, number> {
  let dist = new Map<number, number>([[0, 1]]);
  for (const q of questions) {
    if (q.options.length === 0) continue;
    const next = new Map<number, number>();
    const p = 1 / q.options.length;
    for (const [value, prob] of dist) {
      for (const o of q.options) {
        const key = Math.round((value + weightOf(o)) * 1e6) / 1e6;
        next.set(key, (next.get(key) ?? 0) + prob * p);
      }
    }
    dist = next;
  }
  return dist;
}

/** Phan vi giua (mid-rank) cua raw trong phan phoi, thang 0-100. */
function percentileOf(dist: Map<number, number>, raw: number): number {
  let below = 0;
  let equal = 0;
  for (const [value, prob] of dist) {
    if (value < raw - 1e-9) below += prob;
    else if (Math.abs(value - raw) <= 1e-9) equal += prob;
  }
  return 100 * (below + equal / 2);
}

export function computePotentialProfile(
  content: ScoringContent,
  studentId: string,
  responses: ScoringResponseInput[],
  activityLogs: ScoringActivityLogInput[],
  ratingStats?: RatingStats,
  params: ScoringParams = {}
): ScoringResult {
  const shiftMax = params.shiftMax ?? SHIFT_MAX;
  const shiftK = params.shiftK ?? SHIFT_K;
  const optionToQuestion = new Map<string, SurveyQuestion>();
  for (const q of content.questions) for (const o of q.options) optionToQuestion.set(o.id, q);
  const activityById = new Map(content.activities.map((a) => [a.id, a] as const));

  // ---- 1) Khao sat ----
  const surveyTotals = emptyTotals();
  const trackTotals = { vocational: 0, academic: 0 };
  const answered: SurveyQuestion[] = [];
  let skippedResponses = 0;
  for (const r of responses) {
    const q = optionToQuestion.get(r.optionId);
    if (!q) {
      skippedResponses++; // dap an cua cau da bi xoa / id khong hop le
      continue;
    }
    answered.push(q);
    const option = q.options.find((o) => o.id === r.optionId)!;
    for (const [domain, weight] of Object.entries(option.domainWeights) as [DomainCode, number][]) {
      if (domain in surveyTotals) surveyTotals[domain] += weight;
    }
    trackTotals.vocational += option.trackWeights?.vocational ?? 0;
    trackTotals.academic += option.trackWeights?.academic ?? 0;
  }

  // ---- 2) Hoat dong ----
  const mu = ratingStats?.globalMean ?? NEUTRAL_RATING;
  const activityEffect = (id: string) => {
    const s = ratingStats?.byActivity.get(id);
    return s ? (s.sum - s.n * mu) / (s.n + ACTIVITY_PRIOR_N) : 0;
  };
  const valid = activityLogs.filter((l) => activityById.has(l.activityId));
  const skippedLogs = activityLogs.length - valid.length;
  const residuals = valid.map((l) => l.interestRating - mu - activityEffect(l.activityId));
  const byDomain = new Map<DomainCode, { sum: number; n: number }>();
  valid.forEach((l, i) => {
    const d = activityById.get(l.activityId)!.domain;
    const acc = byDomain.get(d) ?? { sum: 0, n: 0 };
    acc.sum += residuals[i]!;
    acc.n++;
    byDomain.set(d, acc);
  });
  const domainMeans = [...byDomain.values()].map((x) => x.sum / x.n);
  const studentEffect = domainMeans.reduce((a, b) => a + b, 0) / (domainMeans.length + STUDENT_PRIOR_N);

  const evidence = emptyTotals();
  const weightSum = emptyTotals();
  valid.forEach((l, i) => {
    const a = activityById.get(l.activityId)!;
    const centered = Math.max(-1, Math.min(1, (residuals[i]! - studentEffect) / 2));
    evidence[a.domain] += centered;
    weightSum[a.domain] += 1;
    if (a.secondaryDomain && a.secondaryDomain !== a.domain) {
      evidence[a.secondaryDomain] += SECONDARY_DOMAIN_WEIGHT * centered;
      weightSum[a.secondaryDomain] += SECONDARY_DOMAIN_WEIGHT;
    }
  });

  // ---- 3) Ket hop ----
  const components: DomainScoreComponents[] = DOMAINS.map((d) => ({
    domain: d.code,
    surveyRaw: surveyTotals[d.code],
    surveyScore: percentileOf(randomResponderDistribution(answered, (o) => o.domainWeights[d.code] ?? 0), surveyTotals[d.code]),
    activityShift: (shiftMax * evidence[d.code]) / (shiftK + weightSum[d.code]),
    ratingEvidence: weightSum[d.code],
  }));

  const tieBreak = (code: DomainCode) => seededIndex(studentId + code, Number.MAX_SAFE_INTEGER);
  const ranked = components
    .map((c) => ({ domain: c.domain, value: c.surveyScore + c.activityShift }))
    .sort((a, b) => b.value - a.value || tieBreak(a.domain) - tieBreak(b.domain));

  const threshold = notableThreshold(valid.length);
  const scores = ranked.map((s, idx) => ({
    domain: s.domain,
    score: Math.round(Math.min(100, Math.max(0, s.value))),
    rank: idx + 1,
    notable: idx < 3 && s.value > threshold, // chi gan cho top 3 (giong topDomains)
  }));

  const round2 = (x: number) => Math.round(x * 100) / 100;
  const trackPercentile = (key: "vocational" | "academic") =>
    round2(percentileOf(randomResponderDistribution(answered, (o) => o.trackWeights?.[key] ?? 0), trackTotals[key]));
  const leanOf = (o: SurveyOption) => (o.trackWeights?.vocational ?? 0) - (o.trackWeights?.academic ?? 0);
  const lean = round2(percentileOf(randomResponderDistribution(answered, leanOf), trackTotals.vocational - trackTotals.academic));

  return {
    scores,
    topDomains: scores.slice(0, 3).map((s) => s.domain),
    components,
    rawTotals: surveyTotals,
    trackAffinity: { vocationalAffinity: trackPercentile("vocational"), academicAffinity: trackPercentile("academic"), lean },
    skipped: { responses: skippedResponses, activityLogs: skippedLogs },
  };
}

/** Nhan luong (CHI giao vien xem) tu diem 8 nhom + thien huong + hoc ky lop - quy tac o muc 5 dau file. */
export function recommendTrack(scores: DomainScore[], affinity: TrackAffinity, term: CurriculumTerm): TrackProfile {
  const top = scores.find((s) => s.rank === 1);
  if (top?.notable && getDomain(top.domain)?.academicOnly) {
    return { ...affinity, recommendedTrack: "ACADEMIC_HIGH_SCHOOL", reason: "khoa_cung" };
  }
  if (term !== TRACK_DECISION_TERM) return { ...affinity, recommendedTrack: "DUAL_EXPLORATION", reason: "chua_toi_hoc_ky_chot" };
  if (affinity.lean >= 100 - TRACK_CUTOFF) return { ...affinity, recommendedTrack: "VOCATIONAL_9PLUS", reason: "chenh_lech" };
  if (affinity.lean <= TRACK_CUTOFF) return { ...affinity, recommendedTrack: "ACADEMIC_HIGH_SCHOOL", reason: "chenh_lech" };
  return { ...affinity, recommendedTrack: "DUAL_EXPLORATION", reason: "chua_du_can_cu" };
}

/** Da tra loi HET cac cau hoi HIEN CO (cau tra loi cho cau da bi xoa khong duoc tinh). */
export function isSurveyComplete(questions: SurveyQuestion[], responses: { questionId: string }[]): boolean {
  const answered = new Set(responses.map((r) => r.questionId));
  return questions.length > 0 && questions.every((q) => answered.has(q.id));
}

/**
 * Dau van tay phien ban noi dung (cau hoi + van ban + trong so + hoat dong & nhom).
 * Luu kem ho so/snapshot/cau tra loi => biet diem duoc tinh tren noi dung nao
 * (bao cao DS loi 10). FNV-1a 32-bit: du de phat hien thay doi, khong phai bao mat.
 */
export function computeContentHash(content: ScoringContent): string {
  const canon = JSON.stringify([
    [...content.questions]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((q) => [
        q.id,
        q.scenario,
        q.active,
        q.curriculumTerm,
        q.options.map((o) => [o.id, o.text, Object.entries(o.domainWeights).sort(), Object.entries(o.trackWeights ?? {}).sort()]),
      ]),
    [...content.activities]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((a) => [a.id, a.domain, a.secondaryDomain, a.curriculumTerm]),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Gom thong ke rating toan bo hoc sinh (dau vao cho can giua theo hoat dong). */
export function buildRatingStats(logs: { activityId: string; interestRating: number }[]): RatingStats {
  const byActivity = new Map<string, { n: number; sum: number }>();
  let total = 0;
  for (const l of logs) {
    const s = byActivity.get(l.activityId) ?? { n: 0, sum: 0 };
    s.n++;
    s.sum += l.interestRating;
    byActivity.set(l.activityId, s);
    total += l.interestRating;
  }
  // Co mu ve 3 bang 10 quan sat ao: vai danh gia dau tien khong keo lech moc trung tinh.
  const globalMean = (total + NEUTRAL_RATING * 10) / (logs.length + 10);
  return { globalMean, byActivity };
}
