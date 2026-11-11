/**
 * SINH DU LIEU PILOT GIA LAP - de chay thu toan bo phan tich sau pilot khi chua co du lieu that.
 *
 * Chay: npm run simulate:pilot  -> sim-pilot/data/*.json (gitignore). KHONG dung toi data/ hay Supabase.
 * Roi:  npm run analyze:sim      -> sinh lai + analyze:survey + analyze:metrics + analyze:models tren du lieu nay.
 *
 * Mac dinh 140 em / 4 lop / 10 tuan (de xuat B1: ~140 em de con ~100 sau khi rot). Co mau doi bang bien moi truong:
 *   SIM_STUDENTS=1000 SIM_WEEKS=16 npm run simulate:pilot   (lop 35 em; 1000 em x 16 tuan ~ vai chuc nghin ban ghi)
 *   SIM_HERD=0.3  : 30% em o lan khao sat dau (T1) bi "hieu ung dam dong" nghieng ve nhom "dang hot" (Dien - Xe dien),
 *                   lan sau (T2) tra loi theo so thich that - kiem tra test-retest bat duoc nhieu nay. Mac dinh 0 (tat).
 * Lop mo phong o hoc ky SIM_TERM (mac dinh G9_HK1): cau neo + goi cau/hoat dong cua ky (src/lib/curriculum.ts).
 * Moi em co them thien huong an handsOn (thich bat tay lam vs tim hieu ly thuyet) - di vao trackWeights cua dap an. Moi em ao co SU THAT AN (so thich 8 nhom,
 * doc hieu, gan bo...). Hanh vi di qua LOGIC THAT cua app: xao thu tu cau + dap an, cham diem, chon hoat dong hang
 * ngay kem propensity, doi hoat dong, kham pha them, khao sat lai T2. Em bo cuoc theo tuan voi nguy co phu thuoc
 * cac bien da biet (TRUE_HAZARD) => analyze:models phai uoc luong lai duoc: sim-pilot/data/sim_truth.json.
 */
import { rmSync } from "node:fs";
import { ACTIVITIES } from "../src/lib/content/activities";
import { SURVEY_QUESTIONS } from "../src/lib/content/survey-questions";
import { generateId, writeCollection } from "../src/lib/data/local/store";
import { addDaysISO, weekStartISOVN } from "../src/lib/date";
import { DOMAINS } from "../src/lib/domains";
import { DEFAULT_TERM, forTerm, isCurriculumTerm, surveyQuestionsFor } from "../src/lib/curriculum";
import { recomputeAllProfiles } from "../src/lib/profile-service";
import { ALGO_VERSION, candidatePools, MAX_SWAPS_PER_DAY, pickDailyActivity, pickExtraActivities } from "../src/lib/recommendation/daily-pick";
import { FEELING_OPTIONS } from "../src/lib/recommendation/feedback";
import { computeContentHash, computePotentialProfile, SCORING_VERSION } from "../src/lib/recommendation/scoring";
import { RIASEC_ITEMS } from "../src/lib/content/riasec-items";
import { quizVersion } from "../src/lib/quiz";
import { DOMAIN_TO_RIASEC, RIASEC_ITEMS_VERSION } from "../src/lib/riasec";
import { optionsInDisplayOrder, questionsInDisplayOrder } from "../src/lib/survey";
import type {
  ActivityLog,
  ClassGroup,
  DomainCode,
  OutcomeLabel,
  QuizAttempt,
  RecommendationEvent,
  RecommendationEventType,
  RiasecAttempt,
  RiasecType,
  School,
  Student,
  SurveyAttempt,
  SurveyOpen,
  SurveyResponse,
} from "../src/lib/types";
import { highestRatedCandidate } from "./lib/models";
import { seededRandom } from "./lib/stats";

if (process.env.DATA_BACKEND !== "local" || !process.env.LOCAL_DATA_DIR) {
  console.error("❌ Chi chay voi DATA_BACKEND=local va LOCAL_DATA_DIR (dung: npm run simulate:pilot) - khong ghi vao DB that.");
  process.exit(1);
}

function intEnv(name: string, fallback: number, min: number, max: number): number {
  const v = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(v) || v < min || v > max) {
    console.error(`❌ ${name} phai la so nguyen ${min}-${max} (nhan: ${process.env[name]})`);
    process.exit(1);
  }
  return v;
}
const N_STUDENTS = intEnv("SIM_STUDENTS", 140, 10, 20_000);
const WEEKS = intEnv("SIM_WEEKS", 10, 3, 40);
const HERD_SHARE = Number(process.env.SIM_HERD ?? 0);
if (!(HERD_SHARE >= 0 && HERD_SHARE <= 1)) {
  console.error("❌ SIM_HERD phai trong khoang 0-1");
  process.exit(1);
}
const HERD_DOMAIN: DomainCode = "KY_THUAT_CONG_NGHE";
const TERM = isCurriculumTerm(process.env.SIM_TERM) ? process.env.SIM_TERM : DEFAULT_TERM;
/** Noi dung lop mo phong thay (giong app: cau dang dung cua hoc ky + hoat dong "ALL" + hoat dong cua ky). */
const SIM_QUESTIONS = surveyQuestionsFor(SURVEY_QUESTIONS, TERM);
const SIM_ACTIVITIES = forTerm(ACTIVITIES, TERM);
/** 10 tuan KET THUC o tuan truoc => em chua bo cuoc la censored (dang theo doi), khong bi tinh la "ngung". */
const START = addDaysISO(weekStartISOVN(), -7 * WEEKS);
const CLASS_OFFLINE = [0.05, 0.1, 0.15, 0.55]; // lop thu 4 (moi 4 lop) hay mat mang
const PER_CLASS = 35;
const N_CLASSES = Math.ceil(N_STUDENTS / PER_CLASS);

/**
 * Nguy co NGUNG sau tuan dang hoat dong: logit theo tuan (~ log HR khi nguy co nho) tren bien THO cung dinh nghia voi
 * features_student_week (first_week_rating = so sao TB tuan dau, khong tru 3). n_activities = 0: bien nhieu, khong
 * anh huong - mo hinh khong duoc "tim ra" tac dong. Trung binh ~10%/tuan.
 */
const TRUE_HAZARD = { intercept: -0.9, swap_rate: 1.5, n_need_help: 0.4, first_week_rating: -0.6, offline_ratio: 0.8, n_activities: 0 };

const rnd = seededRandom(20261018);
const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const gumbel = () => -Math.log(-Math.log(rnd() + 1e-12) + 1e-12);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const at = (date: string, minutes: number) => new Date(Date.parse(`${date}T07:00:00+07:00`) + minutes * 60_000).toISOString();
const codes = DOMAINS.map((d) => d.code);
const contentHash = computeContentHash({ questions: SURVEY_QUESTIONS, activities: ACTIVITIES });
const quality = new Map(ACTIVITIES.map((a) => [a.id, 0.5 * normal()] as const));

interface Sim {
  student: Student;
  pref: Record<DomainCode, number>;
  drift: Record<DomainCode, number>; // so thich doi chut giua T1 va T2
  reading: number; // 0-1
  handsOn: number; // thien huong an: > 0 thich bat tay lam (vocational), < 0 thich tim hieu ly thuyet (academic)
  herd: boolean; // T1 bi hieu ung dam dong (SIM_HERD)
  careless: boolean;
  engagement: number;
  swapper: number;
  style: number;
  offline: number;
  dropped: boolean;
  droppedAfterWeek: number | null;
  firstWeekRating: number | null;
  waves: Set<string>;
  pendingOpen: Set<string>; // dot da mo ma chua nop (bo do lan dau)
  neverSubmits: boolean;
}

const school: School = { id: generateId("school"), name: "Trường mô phỏng pilot", province: "Mô phỏng", createdAt: at(START, -10000) };
const classes: ClassGroup[] = Array.from({ length: N_CLASSES }, (_, i) => ({
  id: generateId("class"),
  schoolId: school.id,
  name: `9A${i + 1}`,
  teacherId: null,
  retestWave: "T2",
  riasecEnabled: i < 2, // 2 lop dau lam them bai doi chieu RIASEC (mau con)
  curriculumTerm: TERM,
  createdAt: school.createdAt,
}));
const sims: Sim[] = classes.flatMap((c, ci) =>
  Array.from({ length: Math.min(PER_CLASS, N_STUDENTS - ci * PER_CLASS) }, (_, i) => {
    const n = ci * PER_CLASS + i + 1;
    return {
      student: { id: generateId("st"), classId: c.id, studentCode: `sim${String(n).padStart(3, "0")}`, displayName: `Học sinh ${n}`, parentConsentConfirmed: true, createdAt: school.createdAt },
      pref: Object.fromEntries(codes.map((d) => [d, normal()])) as Record<DomainCode, number>,
      drift: Object.fromEntries(codes.map((d) => [d, 0.3 * normal()])) as Record<DomainCode, number>,
      reading: rnd(),
      handsOn: normal(),
      herd: rnd() < HERD_SHARE,
      careless: rnd() < 0.08,
      engagement: normal(),
      swapper: 0.7 * normal(),
      style: 0.5 * normal(),
      offline: CLASS_OFFLINE[ci % CLASS_OFFLINE.length]!,
      dropped: false,
      droppedAfterWeek: null,
      firstWeekRating: null,
      waves: new Set<string>(),
      pendingOpen: new Set<string>(),
      neverSubmits: rnd() < 0.02,
    };
  })
);

const attempts: SurveyAttempt[] = [];
const responses: SurveyResponse[] = [];
const opens: SurveyOpen[] = [];
const logs: ActivityLog[] = [];
const events: RecommendationEvent[] = [];
const labels: OutcomeLabel[] = [];
const quizAttempts: QuizAttempt[] = [];
const riasecAttempts: RiasecAttempt[] = [];
/** Do de tung cau quiz (an) - cau "kho" la cau analyze:metrics phai chi ra de giao vien ra lai. */
const quizEase = new Map(ACTIVITIES.flatMap((a) => a.quiz.map((q) => [q.id, 0.7 * normal()] as const)));
const eventKeys = new Set<string>();
// Chi muc theo em: loc mang toan bo moi lan se la O(N^2) - 1000 em x 16 tuan chay khong noi.
const logsOf = new Map<string, ActivityLog[]>(sims.map((s) => [s.student.id, []]));
const eventsOf = new Map<string, RecommendationEvent[]>(sims.map((s) => [s.student.id, []]));
const latestResponsesOf = new Map<string, SurveyResponse[]>();
/** Gia tri THAT (ky vong lam xong) cua chinh sach dang chay va chinh sach "uu tien hoat dong duoc cham cao" - de doi chieu IPS. */
const ipsTruth = { decisions: 0, logging: 0, target: 0 };

function logEvent(s: Sim, date: string, activityId: string, event: RecommendationEventType, minute: number, propensity: number | null = null, nCandidates: number | null = null) {
  const key = `${s.student.id}|${date}|${activityId}|${event}`;
  if (eventKeys.has(key)) return; // duy nhat theo (em, ngay, hoat dong, su kien) nhu DB
  eventKeys.add(key);
  const e: RecommendationEvent = { id: generateId("rev"), studentId: s.student.id, date, activityId, event, algoVersion: ALGO_VERSION, propensity, nCandidates, createdAt: at(date, minute) };
  events.push(e);
  eventsOf.get(s.student.id)!.push(e);
}

const topDomainsNow = (s: Sim) =>
  computePotentialProfile({ questions: SIM_QUESTIONS, activities: ACTIVITIES }, s.student.id, latestResponsesOf.get(s.student.id) ?? [], logsOf.get(s.student.id)!)
    .topDomains;

function takeSurvey(s: Sim, wave: string, date: string) {
  const openedMin = 60 + Math.floor(rnd() * 120);
  opens.push({ id: generateId("sopen"), studentId: s.student.id, measurementWave: wave, openedAt: at(date, openedMin) });
  if (s.neverSubmits) return;
  if (!s.pendingOpen.has(wave) && rnd() < (wave === "T1" ? 0.08 : 0.05)) {
    s.pendingOpen.add(wave); // mo roi bo do, lan dang nhap sau moi lam
    return;
  }
  const pref = wave === "T1" ? { ...s.pref } : (Object.fromEntries(codes.map((d) => [d, s.pref[d] + s.drift[d]])) as Record<DomainCode, number>);
  if (wave === "T1" && s.herd) pref[HERD_DOMAIN] += 1.5; // nghe ban be noi nghe "hot" - lan sau tra loi theo so thich that
  const attemptId = generateId("attempt");
  let ms = 0;
  const rs = questionsInDisplayOrder(SIM_QUESTIONS, s.student.id).map((q, questionPosition) => {
    const shown = optionsInDisplayOrder(q, s.student.id);
    let pick: number;
    if (s.careless) {
      pick = rnd() < 0.6 ? 0 : Math.floor(rnd() * shown.length);
      ms += 1000 + Math.floor(rnd() * 2500);
    } else {
      const noise = 0.8 + 1.5 * (1 - s.reading);
      const track = (o: (typeof shown)[number]) => 0.8 * s.handsOn * ((o.trackWeights.vocational ?? 0) - (o.trackWeights.academic ?? 0));
      const u = shown.map((o) => Object.entries(o.domainWeights).reduce((acc, [d, w]) => acc + w * pref[d as DomainCode], 0) + track(o) + noise * gumbel());
      pick = u.indexOf(Math.max(...u));
      ms += 8000 + Math.floor(rnd() * 30000 * (1.3 - s.reading));
    }
    return { questionId: q.id, optionId: shown[pick]!.id, displayPosition: pick, questionPosition, firstAnsweredMs: ms };
  });
  const startedAt = at(date, openedMin + (s.pendingOpen.has(wave) ? 30 : 0));
  const completedAt = new Date(Date.parse(startedAt) + ms + 15_000).toISOString();
  attempts.push({ id: attemptId, studentId: s.student.id, measurementWave: wave, surveyVersion: contentHash, curriculumTerm: TERM, startedAt, completedAt });
  const mine: SurveyResponse[] = rs.map((r) => ({ id: generateId("resp"), studentId: s.student.id, attemptId, surveyVersion: contentHash, answeredAt: completedAt, ...r }));
  responses.push(...mine);
  latestResponsesOf.set(s.student.id, mine);
  s.waves.add(wave);
  s.pendingOpen.delete(wave);

  const top3 = topDomainsNow(s);
  const label = (o: Partial<OutcomeLabel>): OutcomeLabel => ({
    id: generateId("label"), studentId: s.student.id, rater: "student", raterId: s.student.id, labelPhase: "pre_result", topDomains: top3,
    scoringVersion: SCORING_VERSION, agreement: null, preferredDomains: [], createdAt: completedAt, ...o,
  });
  if (rnd() < 0.7) {
    const picks = [...codes].sort((a, b) => pref[b] + 0.8 * normal() - (pref[a] + 0.8 * normal())).slice(0, 1 + Math.floor(rnd() * 3));
    labels.push(label({ preferredDomains: picks }));
  }
  if (wave === "T1" && rnd() < 0.5) {
    const fav = codes.reduce((b, d) => (s.pref[d] > s.pref[b] ? d : b), codes[0]!);
    const agreement = (top3.includes(fav) ? (rnd() < 0.75 ? 3 : 2) : rnd() < 0.4 ? 2 : 1) as 1 | 2 | 3; // 0.4: bi "neo" vao ket qua
    labels.push(label({ labelPhase: "post_result", agreement, createdAt: new Date(Date.parse(completedAt) + 60_000).toISOString() }));
  }
}

function doActivities(s: Sim, date: string, ratings: Map<string, { n: number; sum: number }>) {
  const mine = logsOf.get(s.student.id)!;
  const excluded = new Set<string>();
  let minute = 420; // 14:00
  let pick = pickDailyActivity(SIM_ACTIVITIES, mine, s.student.id, date, excluded)!;
  // Su that cho IPS: gia tri ky vong cua quyet dinh dau tien trong ngay theo 2 chinh sach (khong phu thuoc may rui).
  const expected = (id: string) => {
    const a = ACTIVITIES.find((x) => x.id === id)!;
    const pSwap = sigmoid(-1.6 - 1.0 * s.pref[a.domain] + s.swapper);
    return (1 - pSwap) * 0.92 * sigmoid(1.0 + 0.9 * s.pref[a.domain] + 1.2 * quality.get(id)! + 0.4 * s.engagement);
  };
  const pools = candidatePools(SIM_ACTIVITIES, mine, excluded);
  const target = highestRatedCandidate(pools.flatMap((p) => p.pool.map((a) => a.id)), ratings);
  ipsTruth.decisions++;
  ipsTruth.logging += pools.reduce((acc, p) => acc + p.pool.reduce((t, a) => t + expected(a.id) / (pools.length * p.pool.length), 0), 0);
  ipsTruth.target += expected(target);

  logEvent(s, date, pick.activity.id, "shown", minute++, pick.propensity, pick.nCandidates);
  for (let swaps = 0; swaps < MAX_SWAPS_PER_DAY && rnd() < sigmoid(-1.6 - 1.0 * s.pref[pick.activity.domain] + s.swapper); swaps++) {
    logEvent(s, date, pick.activity.id, "swapped", minute++);
    excluded.add(pick.activity.id);
    pick = pickDailyActivity(SIM_ACTIVITIES, mine, s.student.id, date, excluded)!;
    logEvent(s, date, pick.activity.id, "shown", minute++, pick.propensity, pick.nCandidates);
  }
  const done = tryActivity(s, date, pick.activity.id, false, minute);
  if (done && rnd() < sigmoid(-1.4 + 0.5 * s.engagement)) {
    const extras = pickExtraActivities(SIM_ACTIVITIES, mine, s.student.id, date, done.interestRating >= 4 ? pick.activity.domain : null, 3);
    for (const a of extras) logEvent(s, date, a.id, "shown_extra", minute + 40);
    if (extras[0] && rnd() < 0.5) tryActivity(s, date, extras[0].id, true, minute + 41);
  }
}

function tryActivity(s: Sim, date: string, activityId: string, isExtra: boolean, minute: number): ActivityLog | null {
  if (rnd() >= 0.92) return null; // khong mo trang
  logEvent(s, date, activityId, "opened", minute);
  const a = ACTIVITIES.find((x) => x.id === activityId)!;
  const q = quality.get(activityId)!;
  if (rnd() >= sigmoid(1.0 + 0.9 * s.pref[a.domain] + 1.2 * q + 0.4 * s.engagement)) return null; // mo roi bo do
  const difficulty = (rnd() < 0.15 + 0.35 * (1 - s.reading) ? 3 : rnd() < 0.5 ? 2 : 1) as 1 | 2 | 3;
  const confidence = (difficulty === 3 && rnd() < 0.6 ? 1 : rnd() < 0.5 ? 2 : 3) as 1 | 2 | 3;
  const rating = Math.max(1, Math.min(5, Math.round(3 + s.style + 0.9 * s.pref[a.domain] + q + 0.7 * normal()))) as 1 | 2 | 3 | 4 | 5;
  const reflectionText =
    difficulty === 3 && rnd() < 0.5 + 0.3 * (1 - s.reading) ? FEELING_OPTIONS[3] : rating >= 4 ? FEELING_OPTIONS[rnd() < 0.5 ? 0 : 1] : FEELING_OPTIONS[2];
  const minutesSpent = a.durationMinutes * Math.exp(0.4 * normal()) * (s.careless ? 0.25 : 1);
  const startedAt = at(date, minute + 1);
  const finishedAt = new Date(Date.parse(startedAt) + minutesSpent * 60_000).toISOString();
  const source = rnd() < s.offline ? "offline_sync" : "online";
  const log: ActivityLog = {
    id: generateId("alog"), studentId: s.student.id, activityId, date, interestRating: rating, reflectionText, confidence, difficulty,
    note: rnd() < 0.2 ? "Em thấy vui." : "", isExtra, source, startedAt, finishedAt, createdAt: finishedAt, syncedAt: source === "online" ? finishedAt : null,
  };
  logs.push(log);
  logsOf.get(s.student.id)!.push(log);
  logEvent(s, date, activityId, "completed", minute + 2 + Math.ceil(minutesSpent));
  if (a.quiz.length && rnd() < 0.7) takeQuiz(s, date, activityId, finishedAt);
  return log;
}

/** Quiz on nhanh sau hoat dong: em doc hieu tot / gan bo lam dung nhieu hon; em lam bua lam nhanh va hay sai. */
function takeQuiz(s: Sim, date: string, activityId: string, afterIso: string) {
  const a = ACTIVITIES.find((x) => x.id === activityId)!;
  const answers = a.quiz.map((q) => {
    const pOk = s.careless ? 0.4 : sigmoid(0.8 + 2.4 * (s.reading - 0.5) + 0.3 * s.engagement + quizEase.get(q.id)!);
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
    const chosen = rnd() < pOk ? q.correct : wrong[Math.floor(rnd() * wrong.length)]!;
    return { questionId: q.id, chosen, correct: chosen === q.correct };
  });
  const startedAt = new Date(Date.parse(afterIso) + 30_000).toISOString();
  const seconds = a.quiz.length * (s.careless ? 2 + 2 * rnd() : 10 + 30 * rnd());
  quizAttempts.push({
    id: generateId("quiz"), studentId: s.student.id, activityId, date, quizVersion: quizVersion(a.quiz), answers,
    nCorrect: answers.filter((x) => x.correct).length, nQuestions: answers.length, startedAt,
    finishedAt: new Date(Date.parse(startedAt) + seconds * 1000).toISOString(), createdAt: startedAt,
  });
}

/** Bai RIASEC (lop duoc bat): so thich RIASEC an = TB so thich cac nhom anh xa vao loai do + nhieu (C: khong nhom nao). */
function takeRiasec(s: Sim, date: string) {
  const latent = Object.fromEntries(
    (["R", "I", "A", "S", "E", "C"] as RiasecType[]).map((t) => {
      const ds = codes.filter((d) => DOMAIN_TO_RIASEC[d] === t);
      const base = ds.length ? ds.reduce((acc, d) => acc + s.pref[d], 0) / ds.length : 0.5 * s.pref.KINH_DOANH_DICH_VU;
      return [t, base + 0.6 * normal()];
    })
  ) as Record<RiasecType, number>;
  const answers = Object.fromEntries(RIASEC_ITEMS.map((i) => [i.id, Math.max(1, Math.min(5, Math.round(3 + 1.1 * latent[i.type] + 0.8 * normal())))]));
  const startedAt = at(date, 300);
  riasecAttempts.push({ id: generateId("riasec"), studentId: s.student.id, itemsVersion: RIASEC_ITEMS_VERSION, answers, startedAt, completedAt: new Date(Date.parse(startedAt) + 300_000).toISOString() });
}

/** Cuoi tuan: em CON hoat dong tuan nay ngung voi nguy co theo TRUE_HAZARD (bien tinh nhu features_student_week). */
function maybeDrop(s: Sim, week: number) {
  const start = addDaysISO(START, 7 * week);
  const end = addDaysISO(start, 6);
  const wl = logsOf.get(s.student.id)!.filter((l) => l.date >= start && l.date <= end);
  if (wl.length === 0) return;
  const we = eventsOf.get(s.student.id)!.filter((e) => e.date >= start && e.date <= end);
  const shown = we.filter((e) => e.event === "shown").length;
  const x = {
    swap_rate: shown ? we.filter((e) => e.event === "swapped").length / shown : 0,
    n_need_help: wl.filter((l) => l.reflectionText === FEELING_OPTIONS[3] || l.confidence === 1).length,
    first_week_rating: (s.firstWeekRating ??= wl.reduce((acc, l) => acc + l.interestRating, 0) / wl.length),
    offline_ratio: wl.filter((l) => l.source === "offline_sync").length / wl.length,
    n_activities: wl.length,
  };
  const logit = TRUE_HAZARD.intercept + (Object.keys(x) as (keyof typeof x)[]).reduce((acc, k) => acc + TRUE_HAZARD[k] * x[k], 0);
  if (rnd() < sigmoid(logit)) {
    s.dropped = true;
    s.droppedAfterWeek = week;
  }
}

async function main() {
  rmSync(process.env.LOCAL_DATA_DIR!, { recursive: true, force: true });
  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < 5; day++) {
      const date = addDaysISO(START, 7 * week + day);
      // Thong ke so sao TRUOC hom nay (toan truong) - chinh sach thay the trong IPS chi duoc dung du lieu qua khu.
      const ratings = new Map<string, { n: number; sum: number }>();
      for (const l of logs) ratings.set(l.activityId, { n: (ratings.get(l.activityId)?.n ?? 0) + 1, sum: (ratings.get(l.activityId)?.sum ?? 0) + l.interestRating });
      for (const s of sims) {
        if (s.dropped) continue;
        const firstDay = week === 0 && day === 0;
        if (!firstDay && rnd() >= sigmoid(1.5 + 0.6 * s.engagement)) continue; // hom nay khong vao app
        if (!s.waves.has("T1")) {
          takeSurvey(s, "T1", date);
          if (!s.waves.has("T1")) continue;
        }
        if (week >= 2 && !s.waves.has("T2")) takeSurvey(s, "T2", date); // giao vien mo dot khao sat lai tu tuan 3
        const cls = classes.find((c) => c.id === s.student.classId)!;
        if (cls.riasecEnabled && !riasecAttempts.some((r) => r.studentId === s.student.id) && rnd() < 0.6) takeRiasec(s, date);
        doActivities(s, date, ratings);
      }
    }
    for (const s of sims) if (!s.dropped && s.waves.has("T1")) maybeDrop(s, week);
    if (week === 3) {
      for (const s of sims.filter((x) => !x.dropped && x.waves.has("T1") && rnd() < 0.4)) {
        const fav = codes.reduce((b, d) => (s.pref[d] > s.pref[b] ? d : b), codes[0]!);
        const top3 = topDomainsNow(s);
        labels.push({
          id: generateId("label"), studentId: s.student.id, rater: "teacher", raterId: "gv-mo-phong", labelPhase: "post_result", topDomains: top3,
          scoringVersion: SCORING_VERSION, agreement: (top3.includes(fav) ? 3 : rnd() < 0.5 ? 2 : 1) as 1 | 2 | 3,
          preferredDomains: rnd() < 0.6 ? [fav] : [], createdAt: at(addDaysISO(START, 7 * week + 4), 600),
        });
      }
    }
  }

  await writeCollection("schools", [school]);
  await writeCollection("classes", classes);
  await writeCollection("students", sims.map((s) => s.student));
  await writeCollection("survey_attempts", attempts);
  await writeCollection("survey_responses", responses);
  await writeCollection("survey_opens", opens);
  await writeCollection("activity_logs", logs);
  await writeCollection("recommendation_events", events);
  await writeCollection("outcome_labels", labels);
  await writeCollection("quiz_attempts", quizAttempts);
  await writeCollection("riasec_attempts", riasecAttempts);
  await writeCollection("sim_truth", [
    {
      note: "SU THAT cua du lieu gia lap (scripts/simulate-pilot.ts) - analyze:models doi chieu khi co file nay",
      hazard: TRUE_HAZARD,
      ips: { decisions: ipsTruth.decisions, logging: ipsTruth.logging / ipsTruth.decisions, target: ipsTruth.target / ipsTruth.decisions },
      term: TERM,
      herdShare: HERD_SHARE,
      herdDomain: HERD_DOMAIN,
      students: sims.map((s) => ({
        id: s.student.id, pref: s.pref, reading: s.reading, handsOn: s.handsOn, herd: s.herd, careless: s.careless, droppedAfterWeek: s.droppedAfterWeek,
      })),
    },
  ]);
  const { total, failed } = await recomputeAllProfiles("recompute");

  const dropped = sims.filter((s) => s.dropped).length;
  console.log(`✅ Du lieu pilot gia lap -> ${process.env.LOCAL_DATA_DIR}`);
  console.log(`   Hoc ky ${TERM} (${SIM_QUESTIONS.length} cau, ${SIM_ACTIVITIES.filter((a) => a.active).length} hoat dong) | hieu ung dam dong: ${Math.round(HERD_SHARE * 100)}% em o T1`);
  console.log(`   ${sims.length} em, ${classes.length} lop, ${WEEKS} tuan tu ${START} | ${attempts.length} lan lam khao sat (T2: ${attempts.filter((a) => a.measurementWave === "T2").length})`);
  console.log(`   ${logs.length} hoat dong, ${events.length} su kien goi y, ${labels.length} nhan | ${dropped} em bo cuoc trong ${WEEKS} tuan`);
  console.log(`   ${quizAttempts.length} bai quiz | ${riasecAttempts.length} bai RIASEC (lop ${classes.filter((c) => c.riasecEnabled).map((c) => c.name).join(", ")})`);
  console.log(`   Ho so tinh lai: ${total}${failed.length ? ` (loi ${failed.length})` : ""}`);
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
