/**
 * PHAN TICH BO KHAO SAT (bao cao DS loi 6, 11; de xuat A4, B1) - cho nguoi soan noi dung.
 *
 * Chay: npm run analyze:survey
 *  A) Cau truc (khong can du lieu): moi nhom xuat hien may lan, tong trong so, tran,
 *     ky vong khi chon ngau nhien; dap an rong; dap an tong trong so khac 2.
 *  B) Du lieu that (khi co): tan suat chon tung dap an, dap an gan nhu khong ai chon,
 *     entropy tung cau (cau co phan biet duoc hoc sinh khong); thien lech VI TRI dap an.
 *  C) Do on dinh (test-retest) T1 -> T2: Spearman tung nhom (+ KTC), ho so trong tung em,
 *     Jaccard top 3 so voi muc ngau nhien va kiem dinh hoan vi.
 *  D) Anh huong tung cau: % em doi top 3 khi bo cau do.
 *     D2) tuong quan cau - nhom (item-rest); D3) kham pha CLR -> PCA.
 *  E) Thoi gian lam bai + co tra loi voi (de hieu chinh nguong trong src/lib/survey.ts); thoi gian
 *     TUNG cau (cau cham bat thuong = co the kho doc); mo bai form trong roi bo do.
 *  F) Doi chieu RIASEC (O*NET Mini-IP) o mau con: tuong quan diem 8 nhom voi loai du kien (bang anh xa chot truoc).
 *
 * Gioi han: day la khao sat LUA CHON BAT BUOC (ipsative) - Cronbach's alpha tren diem
 * tho bi sai lech do rang buoc tong; tuong quan GIUA cac em tung nhom cung bi meo, nen
 * bao cao them tuong quan ho so TRONG tung em. Thurstonian IRT can hang tram em tro len
 * va thiet ke chon-1-trong-4 co dap an cham 2 nhom/trung tinh khong khop TIRT chuan -
 * chua lam (docs/data-governance.md).
 */
import { loadDataset, pct } from "./lib/dataset";
import {
  clrPca,
  itemInfluence,
  itemRestCorrelations,
  jaccard,
  permutationTest,
  spearman,
  spearmanCI,
  surveyOpenSessions,
  surveyTop3,
} from "./lib/stats";
import { DOMAINS } from "../src/lib/domains";
import { quantile } from "../src/lib/recommendation/aggregate";
import { computePotentialProfile } from "../src/lib/recommendation/scoring";
import { DOMAIN_TO_RIASEC, MAPPING_APPROVAL, MAPPING_HASH, RIASEC_TYPES, riasecScores } from "../src/lib/riasec";
import { latestAttempts, MIN_SECONDS_PER_QUESTION, surveyAttemptFlags } from "../src/lib/survey";
import type { SurveyAttemptWithResponses } from "../src/lib/types";
import { CURRICULUM_TERMS, DEFAULT_TERM, surveyQuestionsFor, TERM_INFO } from "../src/lib/curriculum";
import type { CurriculumTerm } from "../src/lib/types";

async function main() {
  const d = await loadDataset();
  // Tu 11/2026 moi lop thay bo cau RIENG theo hoc ky (cau neo + goi cua ky, bo cau da thay) => cau truc tinh TUNG ky.
  // Phan B tro di van doc moi cau co du lieu (ke ca cau da thay - lich su).
  const qs = d.questions;
  /** Lan lam tra loi DU bo cau cua hoc ky luc lam (du lieu truoc 11/2026 khong ghi hoc ky => bo cau dang dung cua ky mac dinh). */
  const isFull = (a: SurveyAttemptWithResponses) =>
    surveyQuestionsFor(qs, a.curriculumTerm ?? DEFAULT_TERM).every((q) => a.responses.some((r) => r.questionId === q.id));
  const nRetired = qs.filter((q) => !q.active).length;
  console.log(`\nA) CAU TRUC BO KHAO SAT (${qs.length} cau trong ngan hang, ${nRetired} cau da thay)\n`);
  for (const term of CURRICULUM_TERMS) {
    const set = surveyQuestionsFor(qs, term);
    const opts = set.flatMap((q) => q.options);
    const voc = opts.filter((o) => o.trackWeights.vocational).length;
    const acad = opts.filter((o) => o.trackWeights.academic).length;
    console.log(`  ${TERM_INFO[term].label}: ${set.length} cau | dap an thuc hanh ${voc}, hoc thuat ${acad}, trung tinh ${opts.length - voc - acad}`);
    console.log("    Nhom".padEnd(30), "Lan xh", "Tong TS", "Tran", "Ky vong (ngau nhien)");
    for (const dm of DOMAINS) {
      let appear = 0, total = 0, max = 0, exp = 0;
      for (const q of set) {
        const w = q.options.map((o) => o.domainWeights[dm.code] ?? 0);
        appear += w.filter((x) => x > 0).length;
        total += w.reduce((a, b) => a + b, 0);
        max += Math.max(0, ...w);
        exp += w.reduce((a, b) => a + b, 0) / Math.max(1, w.length);
      }
      console.log("    " + dm.code.padEnd(28), String(appear).padStart(6), String(total).padStart(7), String(max).padStart(5), exp.toFixed(2).padStart(10));
    }
  }
  const empty = qs.filter((q) => q.active).flatMap((q) => q.options.filter((o) => Object.keys(o.domainWeights).length === 0).map((o) => o.id));
  const odd = qs.filter((q) => q.active).flatMap((q) => q.options.filter((o) => Object.values(o.domainWeights).reduce((a, b) => a + b, 0) !== 2 && Object.keys(o.domainWeights).length).map((o) => o.id));
  console.log(`\n  Dap an KHONG cham nhom nao (lua chon trung tinh co chu dich): ${empty.join(", ") || "khong co"}`);
  console.log(`  Dap an tong trong so khac 2: ${odd.join(", ") || "khong co"}`);
  console.log("  -> Diem hien thi da bu chenh lech nay (phan vi so voi nguoi chon ngau nhien, scoring.ts).");
  console.log("     Muon cong thuc don gian hon (% diem toi da) thi can CAN BANG LAI noi dung: moi nhom ~8 lan, tong TS bang nhau.");

  const n = new Set(d.responses.map((r) => r.studentId)).size;
  console.log(`\nB) DU LIEU THAT - ${n} hoc sinh da tra loi`);
  if (n < 30) console.log("  ⚠️  Duoi 30 hoc sinh: chi de tham khao, CHUA du de ket luan ve chat luong cau hoi.");
  for (const q of qs) {
    const rs = d.responses.filter((r) => r.questionId === q.id);
    if (rs.length === 0) continue;
    const freq = q.options.map((o) => rs.filter((r) => r.optionId === o.id).length);
    const ent = -freq.filter((f) => f > 0).reduce((a, f) => a + (f / rs.length) * Math.log(f / rs.length), 0) / Math.log(q.options.length);
    const rare = q.options.filter((_, i) => rs.length >= 20 && freq[i]! / rs.length < 0.05).map((o) => o.id);
    console.log(
      `  ${q.id}: ${q.options.map((o, i) => `${o.id.slice(-1)}=${pct(freq[i]!, rs.length)}`).join(" ")} | entropy ${ent.toFixed(2)}` +
        (ent < 0.5 && rs.length >= 20 ? " ⚠️ it phan biet" : "") +
        (rare.length ? ` | ⚠️ gan nhu khong ai chon: ${rare.join(", ")}` : "")
    );
  }

  // B2) THIEN LECH VI TRI (de xuat A4): da xao dap an theo tung em => neu chon theo NOI DUNG thi moi vi tri
  // ~25%. Vi tri tren cung > 25% ro rang = em hay chon phuong an dau (doc chua het / lam voi).
  const positioned = d.attempts.filter((a) => a.measurementWave).flatMap((a) => a.responses).filter((r) => r.displayPosition !== null);
  if (positioned.length > 0) {
    const k = 4;
    const counts = Array.from({ length: k }, (_, i) => positioned.filter((r) => r.displayPosition === i).length);
    const expected = positioned.length / k;
    const chi2 = counts.reduce((a, c) => a + (c - expected) ** 2 / expected, 0);
    console.log(`\n  Vi tri dap an duoc chon (bai form trong, ${positioned.length} cau tra loi): ${counts.map((c, i) => `vi tri ${i + 1}=${pct(c, positioned.length)}`).join(" ")}`);
    console.log(`  Chi-binh-phuong = ${chi2.toFixed(1)} (nguong 5% voi 3 bac tu do: 7,81)${chi2 > 7.81 ? " ⚠️ co thien lech vi tri" : " - khong thay thien lech vi tri"}`);
  }

  // C) TEST-RETEST
  const content = { questions: qs, activities: d.activities };
  const surveyScores = (a: SurveyAttemptWithResponses) => {
    const r = computePotentialProfile(content, a.studentId, a.responses, []);
    return DOMAINS.map((dm) => r.components.find((c) => c.domain === dm.code)!.surveyScore);
  };
  const firstOfWave = new Map<string, SurveyAttemptWithResponses>(); // "hoc sinh|dot" -> lan lam SOM NHAT cua dot
  for (const a of d.attempts) if (a.measurementWave && !firstOfWave.has(`${a.studentId}|${a.measurementWave}`)) firstOfWave.set(`${a.studentId}|${a.measurementWave}`, a);
  const waves = [...new Set(d.attempts.map((a) => a.measurementWave).filter((w): w is string => !!w && w !== "T1"))].sort();
  console.log(`\nC) DO ON DINH (test-retest)${waves.length ? "" : " - chua co dot khao sat lai nao (giao vien mo o trang Lop hoc)"}`);
  for (const wave of waves) {
    const pairs = [...firstOfWave.values()]
      .filter((a) => a.measurementWave === "T1")
      .map((t1) => ({ t1, t2: firstOfWave.get(`${t1.studentId}|${wave}`) }))
      .filter((p): p is { t1: SurveyAttemptWithResponses; t2: SurveyAttemptWithResponses } => !!p.t2);
    report(`T1 -> ${wave}`, pairs);
    const careful = pairs.filter(({ t1, t2 }) => [t1, t2].every((a) => { const f = surveyAttemptFlags(a, qs); return !f.tooFast && !f.samePosition; }));
    if (careful.length < pairs.length) report(`T1 -> ${wave}, BO ${pairs.length - careful.length} cap co co tra loi voi`, careful);
  }

  function report(label: string, pairs: { t1: SurveyAttemptWithResponses; t2: SurveyAttemptWithResponses }[]) {
    console.log(`\n  ${label}: ${pairs.length} em co ca hai lan${pairs.length < 30 ? " ⚠️ duoi 30 em: chi de tham khao" : ""}`);
    if (pairs.length < 2) return;
    const days = pairs.map(({ t1, t2 }) => (Date.parse(t2.completedAt) - Date.parse(t1.completedAt)) / 86_400_000).sort((a, b) => a - b);
    console.log(`  Khoang cach: trung vi ${quantile(days, 0.5).toFixed(0)} ngay (${days[0]!.toFixed(0)}-${days.at(-1)!.toFixed(0)})`);
    const sameVersion = pairs.filter(({ t1, t2 }) => t1.surveyVersion === t2.surveyVersion).length;
    if (sameVersion < pairs.length) console.log(`  ⚠️ ${pairs.length - sameVersion} cap lam tren phien ban cau hoi KHAC nhau (giao vien da sua cau hoi giua hai lan)`);
    // B1: khong doi thu tu cau giua hai lan. T1 truoc 18/10/2026 (thu tu goc) + T2 sau do (thu tu xao) => khac thu tu.
    const shownOrder = (a: SurveyAttemptWithResponses) => new Map(a.responses.map((r) => [r.questionId, r.questionPosition] as const));
    const reordered = pairs.filter((p) => {
      const o1 = shownOrder(p.t1);
      return p.t2.responses.some((r) => o1.has(r.questionId) && o1.get(r.questionId) !== r.questionPosition);
    }).length;
    if (reordered) console.log(`  ⚠️ ${reordered} cap co thu tu cau KHAC nhau giua hai lan (T1 lam truoc khi xao thu tu cau) - tach rieng khi ket luan`);
    const s1 = pairs.map((p) => surveyScores(p.t1));
    const s2 = pairs.map((p) => surveyScores(p.t2));
    console.log("  Tung nhom (Spearman giua cac em, KTC 95%; ~0,7 kha on dinh, < 0,5 can xem lai):");
    DOMAINS.forEach((dm, i) => {
      const r = spearman(s1.map((x) => x[i]!), s2.map((x) => x[i]!));
      const ci = spearmanCI(r, pairs.length);
      console.log(`    ${dm.code.padEnd(26)} r = ${Number.isFinite(r) ? r.toFixed(2) : "—"}${ci ? ` [${ci[0].toFixed(2)}; ${ci[1].toFixed(2)}]` : " (n < 10: chua tinh KTC)"}`);
    });
    const within = pairs.map((_, j) => spearman(s1[j]!, s2[j]!)).filter(Number.isFinite).sort((a, b) => a - b);
    if (within.length) console.log(`  Ho so trong tung em (Spearman 8 nhom T1 vs T2): trung vi ${quantile(within, 0.5).toFixed(2)} (IQR ${quantile(within, 0.25).toFixed(2)}-${quantile(within, 0.75).toFixed(2)})`);
    const top1 = pairs.map((p) => surveyTop3(qs, d.activities, p.t1.studentId, p.t1.responses.map((r) => r.optionId)));
    const top2 = pairs.map((p) => surveyTop3(qs, d.activities, p.t2.studentId, p.t2.responses.map((r) => r.optionId)));
    const perm = permutationTest(top1, top2, jaccard);
    console.log(
      `  Top 3 (Jaccard): TB ${perm.observed.toFixed(2)} | 2 bo 3 nhom ngau nhien: 0,26 | ghep ngau nhien giua cac em: ${perm.nullMean.toFixed(2)} (p = ${perm.p.toFixed(3)})`
    );
    const first = (a: SurveyAttemptWithResponses) => computePotentialProfile(content, a.studentId, a.responses, []).topDomains[0];
    const keepTop1 = pairs.filter((p) => first(p.t1) === first(p.t2)).length;
    console.log(`  Giu nguyen nhom dung dau: ${pct(keepTop1, pairs.length)} (ngau nhien 12,5%)`);
  }
  console.log(
    "  Luu y: chi dung diem KHAO SAT (khong cong hoat dong). Giua hai lan em lam hoat dong trai nghiem - vi du\n" +
      "  so thich doi that => r o day la CAN DUOI cua do on dinh. Em da xem ket qua lan 1 truoc khi lam lan 2."
  );

  // D) ANH HUONG TUNG CAU (bo 1 cau) - tren bo cau cua HOC KY co nhieu bai nhat (cac em cung ky moi cung bo cau).
  const latest = [...latestAttempts(d.attempts).values()];
  const termCount = new Map<CurriculumTerm, number>();
  for (const a of latest) if (a.curriculumTerm) termCount.set(a.curriculumTerm, (termCount.get(a.curriculumTerm) ?? 0) + 1);
  const mainTerm = [...termCount].sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_TERM;
  const dQs = surveyQuestionsFor(qs, mainTerm);
  const dIds = new Set(dQs.map((q) => q.id));
  const complete = latest
    .filter((a) => a.curriculumTerm === mainTerm && isFull(a))
    .map((a) => ({ ...a, responses: a.responses.filter((r) => dIds.has(r.questionId)) }));
  console.log(`\nD) ANH HUONG TUNG CAU (${TERM_INFO[mainTerm].label}: ${complete.length} em co du ${dQs.length} cau)`);
  if (complete.length < 20) console.log("  Can it nhat 20 em - truoc pilot xem ban mo phong: npm run analyze:scoring");
  else {
    const inf = itemInfluence(dQs, d.activities, complete.map((a) => ({ id: a.studentId, responses: a.responses })));
    const mean = inf.reduce((a, x) => a + x.changed, 0) / inf.length;
    for (const x of [...inf].sort((a, b) => b.changed - a.changed)) {
      console.log(`  ${x.questionId}: ${(x.changed * 100).toFixed(1)}% em doi top 3 khi bo cau nay${x.changed > 2 * mean ? " ⚠️ anh huong rat lon - kiem tra em hieu dung cau nay" : x.changed < 0.02 ? " (gan nhu khong doi gi - cau thua?)" : ""}`);
    }
  }

  // D2) TUONG QUAN CAU - NHOM (item-rest): cau co di cung huong voi cac cau con lai cua nhom no cham khong
  console.log(`\nD2) TUONG QUAN CAU - NHOM (item-rest, ${complete.length} em)`);
  if (complete.length < 30) console.log("  Can it nhat 30 em (tuong quan voi vai chuc em dao dong rat manh)");
  else {
    const irc = itemRestCorrelations(dQs, complete);
    const all = irc.flatMap((x) => x.byDomain.map((b) => b.r)).filter(Number.isFinite).sort((a, b) => a - b);
    const low = quantile(all, 0.1);
    for (const x of irc) {
      console.log(
        `  ${x.questionId}: ` +
          x.byDomain.map((b) => `${b.domain.split("_")[0]} ${Number.isFinite(b.r) ? b.r.toFixed(2) : "—"}${b.r < 0 ? " ⚠️ am" : b.r <= low ? " ⚠️ thap" : ""}`).join(" | ")
      );
    }
    console.log("  Lua chon bat buoc keo tuong quan xuong (tong co dinh): so TUONG DOI giua cac cau; 'thap' = 10% thap nhat.");
  }

  // D3) KHAM PHA: ty le -> CLR -> PCA (B1 muc 4) - KHONG thay Thurstonian IRT
  console.log(`\nD3) KHAM PHA CLR -> PCA (${complete.length} em)`);
  if (complete.length < 30) console.log("  Can it nhat 30 em");
  else {
    const raw = complete.map((a) => {
      const r = computePotentialProfile(content, a.studentId, a.responses, []);
      return DOMAINS.map((dm) => r.rawTotals[dm.code]);
    });
    const pca = clrPca(raw);
    for (let k = 0; k < 3; k++) {
      const top = DOMAINS.map((dm, j) => ({ code: dm.code.split("_")[0], w: pca.loadings[k]![j]! }))
        .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))
        .slice(0, 4);
      console.log(`  PC${k + 1} ${(pca.explained[k]! * 100).toFixed(0)}% phuong sai: ${top.map((t) => `${t.code} ${t.w >= 0 ? "+" : ""}${t.w.toFixed(2)}`).join(", ")}`);
    }
    console.log("  Cung dau = hay di cung nhau o mot em; trai dau = doi nghich (chon nhom nay thi it chon nhom kia). Chi de kham pha.");
  }

  // E) THOI GIAN LAM BAI (bai form trong) - de hieu chinh nguong "lam qua nhanh"
  const blank = d.attempts.filter((a) => a.measurementWave);
  const flags = blank.map((a) => surveyAttemptFlags(a, qs));
  const secs = flags.map((f) => f.seconds).filter((x): x is number => x !== null).sort((a, b) => a - b);
  console.log(`\nE) THOI GIAN LAM BAI (${secs.length}/${blank.length} bai form trong co thoi gian)`);
  if (secs.length) {
    console.log(`  Phan vi 10% / 50% / 90%: ${[0.1, 0.5, 0.9].map((q) => `${Math.round(quantile(secs, q))} giay`).join(" / ")}`);
    console.log(`  Co "lam qua nhanh" (< ${MIN_SECONDS_PER_QUESTION} giay/cau): ${flags.filter((f) => f.tooFast).length} bai | "cung vi tri lien tiep": ${flags.filter((f) => f.samePosition).length} bai`);
  }

  // E2) THOI GIAN TUNG CAU (de xuat A4): khoang cach tu lan chon truoc (xep theo thoi diem chon). Cau cham bat
  // thuong o moi em = co the kho doc / kho hieu -> dua vao danh sach phong van (B1 muc 5).
  const gapsByQuestion = new Map<string, number[]>();
  for (const a of blank) {
    const timed = a.responses.filter((r) => r.firstAnsweredMs !== null).sort((x, y) => x.firstAnsweredMs! - y.firstAnsweredMs!);
    timed.forEach((r, i) => {
      const gap = (r.firstAnsweredMs! - (timed[i - 1]?.firstAnsweredMs ?? 0)) / 1000;
      gapsByQuestion.set(r.questionId, [...(gapsByQuestion.get(r.questionId) ?? []), gap]);
    });
  }
  const allGaps = [...gapsByQuestion.values()].flat().sort((a, b) => a - b);
  console.log(`\nE2) THOI GIAN TUNG CAU (${allGaps.length} cau tra loi co thoi gian)`);
  if (allGaps.length) {
    console.log(`  Phan vi 10% / 50% / 90%: ${[0.1, 0.5, 0.9].map((q) => `${quantile(allGaps, q).toFixed(1)} giay`).join(" / ")} | duoi ${MIN_SECONDS_PER_QUESTION} giay: ${pct(allGaps.filter((g) => g < MIN_SECONDS_PER_QUESTION).length, allGaps.length)}`);
    const medians = [...gapsByQuestion].map(([questionId, g]) => ({ questionId, median: quantile([...g].sort((a, b) => a - b), 0.5) })).sort((a, b) => b.median - a.median);
    console.log(`  Cham nhat (trung vi): ${medians.slice(0, 3).map((x) => `${x.questionId} ${x.median.toFixed(0)} giay`).join(" | ")}`);
    console.log(`  Nhanh nhat (trung vi): ${medians.slice(-3).map((x) => `${x.questionId} ${x.median.toFixed(0)} giay`).join(" | ")}`);
  }

  // E3) MO ROI BO DO (de xuat A4): moi (em, dot form trong) da mo bai - da nop chua, mo may phien
  const sessions = surveyOpenSessions(d.surveyOpens, d.attempts.filter((a) => a.measurementWave));
  console.log(`\nE3) MO BAI FORM TRONG (${sessions.length} luot em - dot co ghi lan mo)`);
  if (sessions.length) {
    const open = sessions.filter((x) => !x.completed);
    console.log(`  Da nop: ${pct(sessions.length - open.length, sessions.length)} | mo nhung CHUA nop: ${pct(open.length, sessions.length)}`);
    console.log(`  Phai mo lai sau > 6 gio moi nop xong: ${sessions.filter((x) => x.completed && x.sessions > 1).length} luot`);
    for (const wave of [...new Set(open.map((x) => x.wave))].sort()) {
      console.log(`  ${wave}: ${open.filter((x) => x.wave === wave).length} em dang bo do`);
    }
  }

  // F) HIEU LUC HOI TU - doi chieu O*NET Mini-IP (RIASEC) o mau con (B1 muc 3)
  console.log(`\nF) DOI CHIEU RIASEC (hieu luc hoi tu) - bang anh xa ${MAPPING_HASH} ${MAPPING_APPROVAL ? `duyet boi ${MAPPING_APPROVAL.by} ngay ${MAPPING_APPROVAL.date}` : "⚠️ CHUA DUOC DUYET (chot truoc khi xem du lieu)"}`);
  const t1ByStudent = new Map<string, SurveyAttemptWithResponses>();
  for (const a of d.attempts) if (a.measurementWave === "T1" && isFull(a) && !t1ByStudent.has(a.studentId)) t1ByStudent.set(a.studentId, a);
  const paired = d.riasecAttempts
    .map((r) => ({ r, t1: t1ByStudent.get(r.studentId), s: riasecScores(r.answers) }))
    .filter((x): x is { r: typeof x.r; t1: SurveyAttemptWithResponses; s: typeof x.s } => !!x.t1 && RIASEC_TYPES.every((t) => x.s[t.code] !== null));
  if (new Set(d.riasecAttempts.map((r) => r.itemsVersion)).size > 1) console.log("  ⚠️ Bai RIASEC lam tren nhieu ban dich khac nhau - tach rieng khi ket luan");
  console.log(`  ${paired.length} em co ca bai RIASEC day du va khao sat T1 day du`);
  if (paired.length < 30) console.log("  Can it nhat 30 em (mau con ~40-60 em)");
  else {
    const pc = paired.map((x) => surveyScores(x.t1));
    const rs = (t: (typeof RIASEC_TYPES)[number]["code"]) => paired.map((x) => x.s[t]!);
    const conv: number[] = [];
    const disc: number[] = [];
    DOMAINS.forEach((dm, j) => {
      const mapped = DOMAIN_TO_RIASEC[dm.code];
      const col = pc.map((v) => v[j]!);
      const r = spearman(col, rs(mapped));
      const ci = spearmanCI(r, paired.length);
      const others = RIASEC_TYPES.filter((t) => t.code !== mapped).map((t) => ({ t: t.code, r: spearman(col, rs(t.code)) }));
      const best = others.reduce((b, o) => (o.r > b.r ? o : b));
      conv.push(r);
      disc.push(...others.map((o) => o.r));
      const ok = ci && ci[0] > 0 && r > best.r;
      console.log(`  ${dm.code.padEnd(26)} -> ${mapped}: r = ${r.toFixed(2)}${ci ? ` [${ci[0].toFixed(2)}; ${ci[1].toFixed(2)}]` : ""} | cao nhat o loai khac: ${best.t} ${best.r.toFixed(2)} ${ok ? "✓ hoi tu" : "⚠️ chua ro"}`);
    });
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    console.log(`  TB tuong quan voi loai DU KIEN ${mean(conv).toFixed(2)} vs voi loai KHAC ${mean(disc).toFixed(2)} (hoi tu tot: du kien cao ro hon)`);
    console.log("  Diem nhom = phan vi khao sat (ipsative) => tuong quan bi keo xuong; KHONG sua bang anh xa sau khi xem ket qua nay.");
  }
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
