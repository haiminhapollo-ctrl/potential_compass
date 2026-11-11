/**
 * MO HINH SAU PILOT (de xuat B2, A3, B1) - chay khi da co du lieu pilot. Thu truoc bang du lieu gia lap: npm run analyze:sim
 *
 * Chay: npm run analyze:models
 *  1) Cox voi bien thay doi theo thoi gian (B2 muc 3): bien tuan t -> nguy co ngung o tuan t+1; sai so chuan gom theo
 *     hoc sinh (nhieu tuan cua cung mot em khong doc lap). HR + KTC 95%, so em / so dong / so su kien.
 *  2) Du doan ngung tuong tac (B2 muc 4-5): logistic L2 tren cac tuan em CON hoat dong; GroupKFold theo hoc sinh va
 *     chia theo thoi gian; AUC, Brier, calibration so voi baseline "tuan sau giong tuan truoc". Chi giu neu hon RO.
 *  3) IPS (A3): uoc luong ty le lam xong NEU doi sang chinh sach "uu tien hoat dong duoc cham cao", chi tu nhat ky.
 *  4) Lua chon bat buoc kieu Thurstonian (B1 muc 4, ban xap xi logit): diem chuan tung nhom + do tin cay.
 * Thu muc du lieu co sim_truth.json (du lieu gia lap) => in them SU THAT de kiem tra mo hinh co tim lai dung khong.
 *
 * Rang buoc su dung (B2 muc 7): ket qua CHI de giao vien chu dong hoi tham. Khong hien cho hoc sinh, khong gan nhan
 * "co nguy co bo cuoc", khong dung de xep loai hay ky luat.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { DOMAINS } from "../src/lib/domains";
import { candidatePools } from "../src/lib/recommendation/daily-pick";
import { DEFAULT_TERM, forTerm, surveyQuestionsFor } from "../src/lib/curriculum";
import type { CurriculumTerm } from "../src/lib/types";
import { computePotentialProfile } from "../src/lib/recommendation/scoring";
import type { ActivityLog, SurveyAttemptWithResponses } from "../src/lib/types";
import { loadDataset, studentWeekFeatures, type StudentWeek } from "./lib/dataset";
import {
  auc,
  brier,
  calibrationBins,
  clusterBootstrap,
  fitCox,
  fitForcedChoice,
  fitLogistic,
  groupFolds,
  highestRatedCandidate,
  ipsEstimate,
  standardizer,
} from "./lib/models";
import { pearson } from "./lib/stats";

interface Truth {
  hazard: Record<string, number>;
  ips: { decisions: number; logging: number; target: number };
  students: { id: string; pref: Record<string, number> }[];
}

/** Bien du doan - tinh tu dong (em, tuan); `first` = so sao TB tuan dau cua em (co dinh theo thoi gian). */
const VARS: { key: string; label: string; unit: number; unitLabel: string; get: (r: StudentWeek, first: number) => number }[] = [
  { key: "swap_rate", label: "Ty le doi goi y (swapped/shown)", unit: 0.1, unitLabel: "+10 diem %", get: (r) => (r.n_shown ? r.n_swapped / r.n_shown : 0) },
  { key: "n_need_help", label: "So lan 'can huong dan'", unit: 1, unitLabel: "+1 lan", get: (r) => r.n_need_help },
  { key: "first_week_rating", label: "So sao TB tuan dau", unit: 1, unitLabel: "+1 sao", get: (_, first) => first },
  { key: "offline_ratio", label: "Ty le nop offline", unit: 0.1, unitLabel: "+10 diem %", get: (r) => r.offline_ratio ?? 0 },
  { key: "n_activities", label: "So hoat dong trong tuan", unit: 1, unitLabel: "+1 hoat dong", get: (r) => r.n_activities },
];
const EXTRA_VARS: typeof VARS = [
  { key: "max_streak_days", label: "Chuoi ngay lien tiep", unit: 1, unitLabel: "", get: (r) => r.max_streak_days },
  { key: "n_opened_not_done", label: "Mo roi bo do", unit: 1, unitLabel: "", get: (r) => r.n_opened_not_done },
  { key: "n_extra", label: "Hoat dong kham pha them", unit: 1, unitLabel: "", get: (r) => r.n_extra },
];

const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "—");
const pctS = (x: number) => `${(x * 100).toFixed(1)}%`;

async function main() {
  const d = await loadDataset();
  const dir = process.env.LOCAL_DATA_DIR ? path.resolve(process.env.LOCAL_DATA_DIR) : path.join(process.cwd(), "data");
  const truthFile = path.join(dir, "sim_truth.json");
  const truth: Truth | null = process.env.DATA_BACKEND !== "supabase" && existsSync(truthFile) ? JSON.parse(readFileSync(truthFile, "utf8"))[0] : null;
  console.log(`\nMO HINH SAU PILOT - ${d.students.length} hoc sinh${truth ? " (DU LIEU GIA LAP - co su that de doi chieu)" : ""}`);

  const features = studentWeekFeatures(d, d.students.map((s) => s.id));
  const byStudent = new Map<string, StudentWeek[]>();
  for (const r of features) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) ?? []), r]);
  const firstRating = (sid: string) => byStudent.get(sid)?.[0]?.mean_rating ?? 3;

  // ---- 1) COX ----
  console.log("\n1) COX - bien tuan t -> nguy co NGUNG o tuan t+1 (sai so chuan gom theo hoc sinh)");
  const coxRows: { cluster: string; time: number; x: number[]; event: 0 | 1 }[] = [];
  for (const [sid, rows] of byStudent) {
    for (let t = 0; t < rows.length; t++) {
      const r = rows[t]!;
      if (!r.active_this_week || r.active_next_week === null) break; // ngung roi / tuan sau chua ket thuc (censored)
      const event = r.active_next_week === 0 ? 1 : 0;
      coxRows.push({ cluster: sid, time: t, x: VARS.map((v) => v.get(r, firstRating(sid))), event });
      if (event) break; // chi su kien DAU TIEN
    }
  }
  const nEvents = coxRows.filter((r) => r.event).length;
  console.log(`  ${byStudent.size} em, ${coxRows.length} dong em-tuan, ${nEvents} su kien ngung`);
  if (nEvents < VARS.length + 5) console.log("  Chua du su kien de uoc luong.");
  else {
    if (nEvents < 10 * VARS.length) console.log(`  ⚠️ Duoi ~10 su kien / bien (${VARS.length} bien): he so con dao dong manh.`);
    const st = standardizer(coxRows.map((r) => r.x));
    const fit = fitCox(st.apply(coxRows.map((r) => r.x)).map((x, i) => ({ ...coxRows[i]!, x })));
    VARS.forEach((v, j) => {
      const b = (fit.beta[j]! / st.sd[j]!) * v.unit;
      const se = (fit.se[j]! / st.sd[j]!) * v.unit;
      const lo = Math.exp(b - 1.96 * se);
      const hi = Math.exp(b + 1.96 * se);
      const sig = lo > 1 || hi < 1 ? (b > 0 ? " ↑ nguy co" : " ↓ nguy co") : "";
      const t = truth ? ` | su that ${f2(Math.exp((truth.hazard[v.key] ?? 0) * v.unit))}` : "";
      console.log(`  ${`${v.label} (${v.unitLabel})`.padEnd(46)} HR ${f2(Math.exp(b))} [${f2(lo)}; ${f2(hi)}]${sig}${t}`);
    });
    console.log("  HR > 1 = nguy co ngung cao hon; KTC chua 1 = chua du bang chung. Lien he, KHONG phai nhan qua. Hoa: Efron.");
    if (truth) console.log("  (Su that = he so logit theo tuan cua mo phong, ~ log HR khi nguy co nho.)");
  }

  // ---- 2) DU DOAN NGUNG TUONG TAC ----
  console.log("\n2) DU DOAN ngung o tuan sau (logistic L2) - chi tren cac tuan em CON hoat dong");
  const allVars = [...VARS, ...EXTRA_VARS];
  const items = features
    .filter((r) => r.active_this_week === 1 && r.active_next_week !== null)
    .map((r) => ({ cluster: r.studentId, week: r.week, x: allVars.map((v) => v.get(r, firstRating(r.studentId))), y: 1 - r.active_next_week! }));
  const stops = items.filter((r) => r.y === 1).length;
  console.log(`  ${new Set(items.map((r) => r.cluster)).size} em, ${items.length} dong, ${stops} lan ngung | ${allVars.length} bien`);
  if (stops < 20 || items.length - stops < 20) console.log("  Chua du du lieu (can >= 20 lan ngung va >= 20 lan tiep tuc).");
  else {
    const fitPredict = (train: typeof items, test: typeof items) => {
      const st = standardizer(train.map((r) => r.x));
      const model = fitLogistic(st.apply(train.map((r) => r.x)), train.map((r) => r.y), 1);
      const base = train.reduce((s, r) => s + r.y, 0) / train.length; // "tuan sau giong tuan truoc": dang hoat dong => tiep tuc
      return { p: model.predict(st.apply(test.map((r) => r.x))), base: test.map(() => base) };
    };
    const folds = groupFolds(items.map((r) => r.cluster), 5);
    const oof: { cluster: string; p: number; base: number; y: number }[] = [];
    const foldAuc: number[] = [];
    for (let k = 0; k < 5; k++) {
      const test = items.filter((r) => folds.get(r.cluster) === k);
      const { p, base } = fitPredict(items.filter((r) => folds.get(r.cluster) !== k), test);
      test.forEach((r, i) => oof.push({ cluster: r.cluster, p: p[i]!, base: base[i]!, y: r.y }));
      foldAuc.push(auc(p, test.map((r) => r.y)));
    }
    const y = oof.map((r) => r.y);
    const aucModel = auc(oof.map((r) => r.p), y);
    const ci = clusterBootstrap(oof, (r) => r.cluster, (s) => auc(s.map((r) => r.p), s.map((r) => r.y)));
    const bModel = brier(oof.map((r) => r.p), y);
    const bBase = brier(oof.map((r) => r.base), y);
    const sd = Math.sqrt(foldAuc.reduce((s, a) => s + (a - aucModel) ** 2, 0) / foldAuc.length);
    console.log(`  GroupKFold 5 (em khong o ca train va test): AUC ${f2(aucModel)} [KTC 95% ${f2(ci[0])}; ${f2(ci[1])}] (tung fold ${f2(Math.min(...foldAuc))}-${f2(Math.max(...foldAuc))}, sd ${f2(sd)})`);
    console.log(`  Baseline "tuan sau giong tuan truoc": AUC 0.50 (doan moi em dang hoat dong deu tiep tuc)`);
    console.log(`  Brier: mo hinh ${bModel.toFixed(4)} | baseline ${bBase.toFixed(4)} (thap hon = tot hon)`);
    console.log("  Calibration (5 nhom theo nguy co du doan): " + calibrationBins(oof.map((r) => r.p), y).map((b) => `${pctS(b.predicted)}→${pctS(b.observed)}`).join("  "));
    const weeks = [...new Set(items.map((r) => r.week))].sort();
    const cutoff = weeks[Math.floor(weeks.length * 0.6)]!;
    const half = groupFolds(items.map((r) => r.cluster), 2, 7);
    const trainT = items.filter((r) => half.get(r.cluster) === 0 && r.week < cutoff);
    const testT = items.filter((r) => half.get(r.cluster) === 1 && r.week >= cutoff);
    const tt = fitPredict(trainT, testT);
    const yT = testT.map((r) => r.y);
    const [bT, bTBase] = [brier(tt.p, yT), brier(tt.base, yT)];
    console.log(
      `  Chia theo thoi gian (hoc tuan < ${cutoff} tren 1/2 so em, thu tuan >= ${cutoff} tren 1/2 con lai): AUC ${f2(auc(tt.p, yT))}, Brier ${bT.toFixed(4)} vs baseline ${bTBase.toFixed(4)}`
    );
    // Giu mo hinh chi khi hon baseline RO o CA HAI cach chia (B2 muc 4-6): can duoi KTC AUC > 0,55, Brier thap hon.
    const keep = ci[0] > 0.55 && bModel < bBase && bT < bTBase;
    console.log(
      keep
        ? "  => Mo hinh HON baseline ro o ca hai cach chia: co the dung de GOI Y giao vien hoi tham som hon luat 7 ngay."
        : "  => Chua hon baseline ro o ca hai cach chia (can duoi KTC AUC > 0,55 va Brier thap hon ca khi chia theo thoi gian):\n     giu luat 'Nen hoi tham' 7 ngay, thu them du lieu."
    );
  }

  // ---- 3) IPS ----
  console.log("\n3) IPS - neu doi sang 'uu tien hoat dong duoc cham cao' (trong cung tap ung vien), ty le lam xong bao nhieu?");
  const done = new Set(d.logs.map((l) => `${l.studentId}|${l.activityId}|${l.date}`));
  const logsOf = new Map<string, ActivityLog[]>();
  const termOfClass = new Map(d.classes.map((c) => [c.id, c.curriculumTerm] as const));
  const termOfStudent = new Map(d.students.map((st) => [st.id, termOfClass.get(st.classId) ?? DEFAULT_TERM] as const));
  const byTerm = new Map<CurriculumTerm, typeof d.activities>();
  const activitiesOf = (studentId: string) => {
    const term = termOfStudent.get(studentId) ?? DEFAULT_TERM;
    if (!byTerm.has(term)) byTerm.set(term, forTerm(d.activities, term));
    return byTerm.get(term)!;
  };
  for (const l of d.logs) logsOf.set(l.studentId, [...(logsOf.get(l.studentId) ?? []), l]);
  // Quyet dinh DAU TIEN moi ngay (chua doi lan nao): tap ung vien dung lai duoc tu lich su truoc ngay do.
  const first = new Map<string, (typeof d.events)[number]>();
  for (const e of d.events) {
    if (e.event !== "shown" || e.propensity === null) continue;
    const key = `${e.studentId}|${e.date}`;
    if (!first.has(key) || e.createdAt < first.get(key)!.createdAt) first.set(key, e);
  }
  const decisions = [...first.values()].sort((a, b) => a.date.localeCompare(b.date));
  const sortedLogs = [...d.logs].sort((a, b) => a.date.localeCompare(b.date));
  const ratings = new Map<string, { n: number; sum: number }>();
  let li = 0;
  let mismatch = 0;
  let same = 0;
  const ipsItems: { cluster: string; p: number; q: number; r: number }[] = [];
  for (const e of decisions) {
    for (; li < sortedLogs.length && sortedLogs[li]!.date < e.date; li++) {
      const l = sortedLogs[li]!;
      ratings.set(l.activityId, { n: (ratings.get(l.activityId)?.n ?? 0) + 1, sum: (ratings.get(l.activityId)?.sum ?? 0) + l.interestRating });
    }
    // App chi boc tham trong hoat dong cua HOC KY lop (curriculum.ts). Dataset chi biet hoc ky HIEN TAI cua lop:
    // lop da doi ky giua chung thi cac quyet dinh ky cu se lech propensity va bi bo qua (dem o "khong khop").
    const pools = candidatePools(activitiesOf(e.studentId), (logsOf.get(e.studentId) ?? []).filter((l) => l.date < e.date));
    const pool = pools.find((p) => p.pool.some((a) => a.id === e.activityId));
    if (!pool || Math.abs(1 / (pools.length * pool.pool.length) - e.propensity!) > 1e-9) {
      mismatch++; // hoat dong da bi sua/tat, ban ghi offline den muon... => khong dung lai duoc tap ung vien
      continue;
    }
    const target = highestRatedCandidate(pools.flatMap((p) => p.pool.map((a) => a.id)), ratings);
    if (target === e.activityId) same++;
    ipsItems.push({ cluster: e.studentId, p: e.propensity!, q: target === e.activityId ? 1 : 0, r: done.has(`${e.studentId}|${e.activityId}|${e.date}`) ? 1 : 0 });
  }
  console.log(`  ${ipsItems.length} quyet dinh dung lai duoc tap ung vien (${mismatch} khong khop propensity da ghi - bo qua)`);
  if (ipsItems.length < 100 || same < 20) console.log("  Chua du quyet dinh trung voi chinh sach moi de uoc luong.");
  else {
    const est = ipsEstimate(ipsItems);
    const ci = clusterBootstrap(ipsItems, (x) => x.cluster, (s) => ipsEstimate(s).snips);
    const logging = ipsItems.reduce((s, x) => s + x.r, 0) / ipsItems.length;
    console.log(`  Chinh sach dang chay (boc tham deu): lam xong ${pctS(logging)}`);
    console.log(`  'Uu tien duoc cham cao' (SNIPS): ${pctS(est.snips)} [KTC 95% ${pctS(ci[0])}; ${pctS(ci[1])}] | IPS ${pctS(est.ips)}`);
    console.log(`  Dua tren ${same} quyet dinh trung nhau, co mau hieu dung ${est.ess.toFixed(0)} (nho = uoc luong it chac chan)`);
    if (truth) console.log(`  Su that mo phong: dang chay ${pctS(truth.ips.logging)} | chinh sach moi ${pctS(truth.ips.target)}`);
    console.log("  Chi danh gia duoc chinh sach CHON TRONG tap ung vien hien tai (positivity). Chinh sach 'uu tien nhom em thich'");
    console.log("  can them ngau nhien co chu dich vao goi y truoc - xem docs/data-governance.md.");
  }

  // ---- 4) LUA CHON BAT BUOC (Thurstonian, xap xi logit) ----
  console.log("\n4) LUA CHON BAT BUOC kieu Thurstonian (xap xi logit, tai trong = trong so thiet ke) - bai T1");
  const t1 = new Map<string, SurveyAttemptWithResponses>();
  // Bo cau cua hoc ky co nhieu bai T1 nhat (cac em cung ky moi cung bo cau - mo hinh can cung tap cau).
  const termCount = new Map<CurriculumTerm, number>();
  for (const a of d.attempts) if (a.measurementWave === "T1" && a.curriculumTerm) termCount.set(a.curriculumTerm, (termCount.get(a.curriculumTerm) ?? 0) + 1);
  const t1Term = [...termCount].sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_TERM;
  const t1Qs = surveyQuestionsFor(d.questions, t1Term);
  const t1Ids = new Set(t1Qs.map((q) => q.id));
  for (const a of d.attempts) {
    if (a.measurementWave !== "T1" || t1.has(a.studentId) || (a.curriculumTerm ?? DEFAULT_TERM) !== t1Term) continue;
    if (t1Qs.every((q) => a.responses.some((r) => r.questionId === q.id))) t1.set(a.studentId, { ...a, responses: a.responses.filter((r) => t1Ids.has(r.questionId)) });
  }
  const sample = [...t1.values()];
  if (sample.length < 50) console.log(`  Can it nhat 50 bai T1 day du (hien ${sample.length}).`);
  else {
    const questions = t1Qs.map((q) => ({ id: q.id, options: q.options.map((o) => ({ id: o.id, weights: DOMAINS.map((dm) => o.domainWeights[dm.code] ?? 0) })) }));
    const fit = fitForcedChoice(questions, sample.map((a) => ({ chosen: new Map(a.responses.map((r) => [r.questionId, r.optionId] as const)) })));
    const content = { questions: t1Qs, activities: d.activities };
    const ipsative = sample.map((a) => {
      const c = computePotentialProfile(content, a.studentId, a.responses, []).components;
      return DOMAINS.map((dm) => c.find((x) => x.domain === dm.code)!.surveyScore);
    });
    const truePref = truth ? new Map(truth.students.map((s) => [s.id, s.pref] as const)) : null;
    console.log(`  ${sample.length} em | do tin cay thuc nghiem tung nhom (>= 0,7 kha; < 0,5 yeu)${truePref ? " | tuong quan voi so thich THAT: diem chuan vs diem hien tai" : ""}`);
    const rTrue: [number, number][] = [];
    DOMAINS.forEach((dm, j) => {
      const eta = fit.eta.map((e) => e[j]!);
      let line = `  ${dm.code.padEnd(26)} tin cay ${f2(fit.reliability[j]!)} | tuong quan voi diem hien tai ${f2(pearson(eta, ipsative.map((v) => v[j]!)))}`;
      if (truePref) {
        const tp = sample.map((a) => truePref.get(a.studentId)![dm.code]!);
        const pair: [number, number] = [pearson(eta, tp), pearson(ipsative.map((v) => v[j]!), tp)];
        rTrue.push(pair);
        line += ` | that: ${f2(pair[0])} vs ${f2(pair[1])}`;
      }
      console.log(line);
    });
    if (truePref) {
      const argmax = (v: number[]) => v.indexOf(Math.max(...v));
      const fav = sample.map((a) => argmax(DOMAINS.map((dm) => truePref.get(a.studentId)![dm.code]!)));
      const hitEta = fit.eta.filter((e, i) => argmax(e) === fav[i]).length / sample.length;
      const hitIps = ipsative.filter((v, i) => argmax(v) === fav[i]).length / sample.length;
      const mean = (k: 0 | 1) => rTrue.reduce((s, p) => s + p[k], 0) / rTrue.length;
      console.log(`  TB tuong quan voi so thich that: diem chuan ${f2(mean(0))} vs diem hien tai ${f2(mean(1))} | dung nhom thich nhat: ${pctS(hitEta)} vs ${pctS(hitIps)}`);
    }
    console.log("  Diem chuan so sanh duoc GIUA cac em (diem hien tai la phan vi tung nhom, lien quan nhau do tong co dinh).");
    console.log("  Ban xap xi: Luce/logit thay probit, khong uoc luong tai trong & tuong quan giua nhom; can doi chieu R thurstonianIRT.");
  }
  console.log("\nKet qua chi de giao vien chu dong ho tro - khong hien cho hoc sinh, khong gan nhan 'nguy co bo cuoc'.");
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
