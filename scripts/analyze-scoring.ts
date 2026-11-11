/**
 * PHAN TICH DO NHAY CUA CONG THUC CHAM DIEM (bao cao DS loi 2, 7).
 *
 * Chay: npm run analyze:scoring
 *
 * Mo phong hoc sinh co SO THICH AN biet truoc (ground truth) -> tra loi khao sat
 * (chon dap an hop so thich nhat + nhieu) -> lam hoat dong theo daily-pick (kham pha)
 * + tu nguyen lam them o nhom thich nhat -> cham sao = so thich + phong cach cham ca
 * nhan + chat luong bai + nhieu. Roi do cong thuc voi nhieu tham so khoi phuc so
 * thich an tot den dau. Day la co so chon SHIFT_MAX/SHIFT_K - phai HIEU CHINH LAI
 * bang du lieu pilot that (gia dinh mo phong chi la gia dinh).
 *
 * Them (10/2026): hieu chuan nguong nhan "Noi bat" (de xuat A1) bang nguoi tra loi BUA, va
 * anh huong tung cau (bo 1 cau) tren hoc sinh mo phong - chay lai khi sua bo cau hoi.
 */
import { ACTIVITIES } from "../src/lib/content/activities";
import { SURVEY_QUESTIONS } from "../src/lib/content/survey-questions";
import { DOMAINS } from "../src/lib/domains";
import {
  buildRatingStats,
  computePotentialProfile,
  NOTABLE_ALPHA,
  notableThreshold,
  SHIFT_K,
  SHIFT_MAX,
  type RatingStats,
} from "../src/lib/recommendation/scoring";
import { itemInfluence } from "./lib/stats";
import type { DomainCode } from "../src/lib/types";

let seed = 20261006;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
const gumbel = () => -Math.log(-Math.log(rnd() + 1e-12) + 1e-12);

const N = 1200;
const DAYS = 21;
const codes = DOMAINS.map((d) => d.code);
const quality = new Map(ACTIVITIES.map((a) => [a.id, 0.4 * normal()]));

interface Sim {
  id: string;
  pref: Record<DomainCode, number>;
  responses: { optionId: string }[];
  logs: { activityId: string; interestRating: 1 | 2 | 3 | 4 | 5 }[];
}

const sims: Sim[] = [];
for (let i = 0; i < N; i++) {
  const pref = Object.fromEntries(codes.map((c) => [c, normal()])) as Record<DomainCode, number>;
  const style = 0.6 * normal();
  const responses = SURVEY_QUESTIONS.map((q) => {
    const best = q.options
      .map((o) => ({ o, u: Object.entries(o.domainWeights).reduce((a, [d, w]) => a + w * pref[d as DomainCode], 0) + 1.5 * gumbel() }))
      .sort((a, b) => b.u - a.u)[0]!.o;
    return { optionId: best.id };
  });
  const fav = codes.reduce((b, c) => (pref[c] > pref[b] ? c : b), codes[0]!);
  const count = Object.fromEntries(codes.map((c) => [c, 0])) as Record<DomainCode, number>;
  const logs: Sim["logs"] = [];
  const rate = (aId: string, d: DomainCode) =>
    Math.max(1, Math.min(5, Math.round(3 + style + 0.9 * pref[d] + quality.get(aId)! + 0.7 * normal()))) as 1 | 2 | 3 | 4 | 5;
  for (let day = 0; day < DAYS; day++) {
    const min = Math.min(...codes.map((c) => count[c]));
    const pool = codes.filter((c) => count[c] === min);
    const d = pool[Math.floor(rnd() * pool.length)]!;
    const acts = ACTIVITIES.filter((a) => a.domain === d);
    const a = acts[Math.floor(rnd() * acts.length)]!;
    logs.push({ activityId: a.id, interestRating: rate(a.id, d) });
    count[d]++;
    if (rnd() < 0.3) {
      const fa = ACTIVITIES.filter((x) => x.domain === fav);
      const x = fa[Math.floor(rnd() * fa.length)]!;
      logs.push({ activityId: x.id, interestRating: rate(x.id, fav) });
    }
  }
  sims.push({ id: `sim${i}`, pref, responses, logs });
}
const stats = buildRatingStats(sims.flatMap((s) => s.logs));

function spearman(a: number[], b: number[]): number {
  const rank = (v: number[]) => {
    const idx = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(v.length);
    idx.forEach(([, i], k) => (r[i] = k));
    return r;
  };
  const ra = rank(a), rb = rank(b), n = a.length;
  const d2 = ra.reduce((acc, x, i) => acc + (x - rb[i]!) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

function evaluate(label: string, shiftMax: number, shiftK: number, ratingStats: RatingStats | undefined, base?: string[][]) {
  let top1 = 0, top3hit = 0, rho = 0, changed = 0;
  const tops: string[][] = [];
  for (const [i, s] of sims.entries()) {
    const r = computePotentialProfile({ questions: SURVEY_QUESTIONS, activities: ACTIVITIES }, s.id, s.responses, s.logs, ratingStats, { shiftMax, shiftK });
    const truth = codes.reduce((b, c) => (s.pref[c] > s.pref[b] ? c : b), codes[0]!);
    if (r.topDomains[0] === truth) top1++;
    if (r.topDomains.includes(truth)) top3hit++;
    const vals = r.components.map((c) => c.surveyScore + c.activityShift);
    rho += spearman(vals, codes.map((c) => s.pref[c]));
    tops.push(r.topDomains);
    if (base && base[i]!.join() !== r.topDomains.join()) changed++;
  }
  const f = (x: number) => `${((x / N) * 100).toFixed(1)}%`.padStart(7);
  console.log(`  ${label.padEnd(34)} ${f(top1)} ${f(top3hit)} ${(rho / N).toFixed(3).padStart(8)} ${base ? f(changed) : "      —"}`);
  return tops;
}

console.log(`\nDO NHAY - ${N} hoc sinh mo phong, ${DAYS} ngay (ngau nhien = top1 12,5%, top3 37,5%)\n`);
console.log("  Cau hinh".padEnd(36), "Top1", "  Top3", "Spearman", "Doi top3");
const surveyOnly = evaluate("Chi khao sat (SHIFT_MAX=0)", 0, SHIFT_K, stats);
for (const m of [10, 20, 40, 80]) evaluate(`SHIFT_MAX=${m}, K=${SHIFT_K}${m === SHIFT_MAX ? "  <- dang dung" : ""}`, m, SHIFT_K, stats, surveyOnly);
for (const k of [1, 6]) evaluate(`SHIFT_MAX=${SHIFT_MAX}, K=${k}`, SHIFT_MAX, k, stats, surveyOnly);
evaluate(`Khong can giua theo hoat dong`, SHIFT_MAX, SHIFT_K, undefined, surveyOnly);
console.log(
  "\n  Top1/Top3 = % khoi phuc dung nhom thich nhat (an). Spearman = tuong quan thu hang 8 nhom voi so thich an.\n" +
    "  Doi top3 = % hoc sinh co top 3 khac so voi chi dung khao sat."
);

// ---- HIEU CHUAN NHAN "NOI BAT" (de xuat A1) ----------------------------------
// Nguoi tra loi BUA: khao sat chon deu ngau nhien + n lan cham sao ngau nhien 1-5 (hoat dong theo kieu
// daily-pick: nhom it kham pha nhat). Gia tri dem so voi nguong = nhom CAO NHAT trong 8 nhom (chua lam tron).
const CONTENT = { questions: SURVEY_QUESTIONS, activities: ACTIVITIES };
function randomLogs(n: number): Sim["logs"] {
  const count = Object.fromEntries(codes.map((c) => [c, 0])) as Record<DomainCode, number>;
  const logs: Sim["logs"] = [];
  for (let i = 0; i < n; i++) {
    const min = Math.min(...codes.map((c) => count[c]));
    const pool = codes.filter((c) => count[c] === min);
    const d = pool[Math.floor(rnd() * pool.length)]!;
    const acts = ACTIVITIES.filter((a) => a.domain === d);
    logs.push({ activityId: acts[Math.floor(rnd() * acts.length)]!.id, interestRating: (1 + Math.floor(rnd() * 5)) as 1 | 2 | 3 | 4 | 5 });
    count[d]++;
  }
  return logs;
}
const topValue = (r: ReturnType<typeof computePotentialProfile>) => Math.max(...r.components.map((c) => c.surveyScore + c.activityShift));
console.log(`\nNHAN "NOI BAT" - nguoi tra loi BUA, muc tieu ${(NOTABLE_ALPHA * 100).toFixed(0)}% co it nhat 1 nhan\n`);
console.log("  So lan cham sao".padEnd(20), "Phan vi muc tieu", "Nguong dang dung", "Nguoi bua co nhan");
for (const n of [0, 2, 5, 8, 15, 30]) {
  const nulls = Array.from({ length: 3000 }, () => ({
    responses: SURVEY_QUESTIONS.map((q) => ({ optionId: q.options[Math.floor(rnd() * q.options.length)]!.id })),
    logs: randomLogs(n),
  }));
  const st = buildRatingStats(nulls.flatMap((x) => x.logs));
  const vals = nulls.map((x, i) => topValue(computePotentialProfile(CONTENT, `bua${i}`, x.responses, x.logs, st))).sort((a, b) => a - b);
  const fpr = vals.filter((v) => v > notableThreshold(n)).length / vals.length;
  console.log(
    `  ${String(n).padEnd(18)} ${vals[Math.floor((1 - NOTABLE_ALPHA) * (vals.length - 1))]!.toFixed(2).padStart(16)} ${notableThreshold(n).toFixed(2).padStart(16)} ${`${(fpr * 100).toFixed(1)}%`.padStart(17)}`
  );
}
{
  const anyNotable = (logs: Sim["logs"], st: RatingStats | undefined, s: Sim, i: number) =>
    computePotentialProfile(CONTENT, s.id + i, s.responses, logs, st).scores.some((x) => x.notable);
  const afterSurvey = sims.filter((s, i) => anyNotable([], stats, s, i)).length;
  const afterDays = sims.filter((s, i) => anyNotable(s.logs, stats, s, i)).length;
  console.log(
    `\n  Hoc sinh mo phong (tra loi that, nhieu 1.5): co nhan ngay sau khao sat ${((afterSurvey / N) * 100).toFixed(1)}%, sau ${DAYS} ngay ${((afterDays / N) * 100).toFixed(1)}%.\n` +
      "  Doi nguong: sua NOTABLE_* trong scoring.ts theo cot 'Phan vi muc tieu', tang SCORING_VERSION, chay check:logic."
  );
}

// ---- ANH HUONG TUNG CAU (bo 1 cau) tren hoc sinh mo phong - uoc luong truoc pilot ----
{
  const sample = sims.slice(0, 400).map((s) => ({ id: s.id, responses: s.responses.map((r, i) => ({ questionId: SURVEY_QUESTIONS[i]!.id, optionId: r.optionId })) }));
  const inf = itemInfluence(SURVEY_QUESTIONS, ACTIVITIES, sample).sort((a, b) => b.changed - a.changed);
  console.log(`\nANH HUONG TUNG CAU (${sample.length} hoc sinh mo phong): % doi top 3 khi bo cau`);
  console.log("  " + inf.map((x) => `${x.questionId} ${(x.changed * 100).toFixed(0)}%`).join(" | "));
}
