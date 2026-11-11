/**
 * CHI SO DANH GIA HE THONG GOI Y (bao cao DS loi 4, 12) - chay dinh ky trong pilot.
 *
 * Chay: npm run analyze:metrics   (nen chay check:data truoc)
 *
 *  - Ty le hoan thanh hoat dong DUOC GOI Y (shown -> completed cung ngay), doi, de danh; thoi gian lam
 *    that so voi du kien, mo trang roi bo do (de xuat A5).
 *  - Retention: % hoc sinh con hoat dong o tuan thu 2 va thu 5 ke tu lan dau; Kaplan-Meier theo
 *    lop (de xuat B2 - xu ly dung em con dang hoat dong); danh gia luat "Nen hoi tham" 7 ngay.
 *  - Do phu linh vuc: entropy chuan hoa (1 = trai deu 8 nhom) - do dung muc tieu kham pha.
 *  - Dong thuan top 3 voi danh gia cua hoc sinh / giao vien (nhan ground truth), TACH nhan truoc /
 *    sau khi xem ket qua + kiem dinh hoan vi giua cac em (de xuat A2).
 *  - Co mau can cho thu nghiem A/B (power analysis) + hieu ung nho nhat phat hien duoc.
 *
 * Gioi han: chua co nhom doi chung => KHONG ket luan quan he nhan qua tu cac chi so nay.
 * Mo hinh Cox / du doan ngung tuong tac / IPS: npm run analyze:models (can du su kien - thu bang npm run analyze:sim).
 */
import { loadDataset, normalizedEntropy, pct } from "./lib/dataset";
import { jaccard, kaplanMeier, permutationTest, spearman } from "./lib/stats";
import { quantile } from "../src/lib/recommendation/aggregate";
import { addDaysISO, daysBetweenISO, todayISOVN, weekStartISOVN } from "../src/lib/date";
import { DOMAINS } from "../src/lib/domains";
import type { OutcomeLabel } from "../src/lib/types";

/** Co mau MOI NHOM de phat hien p1 -> p2 (kiem dinh 2 ty le, alpha 0.05 hai phia, power 0.8). */
export function sampleSizePerGroup(p1: number, p2: number, zAlpha = 1.96, zBeta = 0.8416): number {
  const pBar = (p1 + p2) / 2;
  const num = zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((num * num) / (p1 - p2) ** 2);
}

async function main() {
  const d = await loadDataset();
  const domainOf = new Map(d.activities.map((a) => [a.id, a.domain] as const));
  const done = new Set(d.logs.map((l) => `${l.studentId}|${l.activityId}|${l.date}`));
  const line = (k: string, v: string) => console.log(`  ${k.padEnd(52)} ${v}`);

  console.log(`\nCHI SO DANH GIA - ${d.students.length} hoc sinh, ${d.logs.length} hoat dong, ${d.events.length} su kien\n`);

  console.log("1) Goi y hoat dong");
  const shown = d.events.filter((e) => e.event === "shown");
  const shownExtra = d.events.filter((e) => e.event === "shown_extra");
  const accepted = shown.filter((e) => done.has(`${e.studentId}|${e.activityId}|${e.date}`));
  line("Ty le hoan thanh hoat dong chinh duoc goi y", `${pct(accepted.length, shown.length)} (${accepted.length}/${shown.length})`);
  line("Ty le doi hoat dong (swapped/shown)", pct(d.events.filter((e) => e.event === "swapped").length, shown.length));
  line("Ty le de danh (saved/shown)", pct(d.events.filter((e) => e.event === "saved").length, shown.length));
  line(
    "Ty le lam goi y 'kham pha them'",
    pct(shownExtra.filter((e) => done.has(`${e.studentId}|${e.activityId}|${e.date}`)).length, shownExtra.length)
  );
  line("Hoat dong tu nguyen lam them / tong hoat dong", pct(d.logs.filter((l) => l.isExtra).length, d.logs.length));

  // Mo trang hoat dong (form phan hoi con trong) ma khong lam trong ngay = bo do (de xuat A5). Hom nay chua het => bo qua.
  const opened = d.events.filter((e) => e.event === "opened" && e.date < todayISOVN());
  const abandoned = opened.filter((e) => !done.has(`${e.studentId}|${e.activityId}|${e.date}`)).length;
  line("Mo trang hoat dong nhung khong lam trong ngay (bo do)", `${pct(abandoned, opened.length)} (${abandoned}/${opened.length})`);

  // Thoi gian lam THAT so voi du kien (de xuat A5) = phut (started_at -> finished_at) / durationMinutes. Moc bat dau
  // la lan dau em mo trang trong ngay => ty le lon co the chi la mo trang buoi sang, lam buoi chieu (khong phai lam cham).
  const expectedMinutes = new Map(d.activities.map((a) => [a.id, a.durationMinutes] as const));
  const ratios = d.logs
    .filter((l) => l.startedAt && l.finishedAt && expectedMinutes.get(l.activityId))
    .map((l) => (Date.parse(l.finishedAt!) - Date.parse(l.startedAt!)) / 60_000 / expectedMinutes.get(l.activityId)!)
    .sort((a, b) => a - b);
  line("Hoat dong co thoi gian lam that", `${ratios.length}/${d.logs.length}`);
  if (ratios.length) {
    line("  that / du kien: phan vi 10% / 50% / 90%", [0.1, 0.5, 0.9].map((q) => `${quantile(ratios, q).toFixed(2)}x`).join(" / "));
    line("  nhanh bat thuong (< 1/4 thoi gian du kien)", pct(ratios.filter((r) => r < 0.25).length, ratios.length));
  }

  console.log("\n2) Duy tri (retention) - tinh tren hoc sinh du thoi gian quan sat");
  const today = todayISOVN();
  for (const [label, from, to] of [["Tuan thu 2 (ngay 7-13)", 7, 13], ["Tuan thu 5 (ngay 28-34)", 28, 34]] as const) {
    let eligible = 0;
    let retained = 0;
    for (const s of d.students) {
      const mine = d.logs.filter((l) => l.studentId === s.id).map((l) => l.date).sort();
      if (mine.length === 0 || daysBetweenISO(mine[0]!, today) < to) continue;
      eligible++;
      const lo = addDaysISO(mine[0]!, from);
      const hi = addDaysISO(mine[0]!, to);
      if (mine.some((x) => x >= lo && x <= hi)) retained++;
    }
    line(label, `${pct(retained, eligible)} (${retained}/${eligible})`);
  }

  // Kaplan-Meier theo TUAN, tach lop: "con hoat dong lien tuc" tu tuan dau; em van hoat dong toi tuan quan
  // sat cuoi la censored (khong coi la bo cuoc, khong bo khoi mau). Tuan hien tai chua het => khong tinh.
  const weekOf = (date: string) => weekStartISOVN(new Date(`${date}T12:00:00+07:00`));
  const lastFullWeek = addDaysISO(weekStartISOVN(), -7);
  const kmItems = (ids: Set<string>) =>
    d.students
      .filter((s) => ids.has(s.id))
      .map((s) => {
        const weeks = new Set(d.logs.filter((l) => l.studentId === s.id).map((l) => weekOf(l.date)));
        const first = [...weeks].sort()[0];
        if (!first || first > lastFullWeek) return null;
        const observed = daysBetweenISO(first, lastFullWeek) / 7 + 1;
        let t = 0;
        while (t < observed && weeks.has(addDaysISO(first, 7 * t))) t++;
        return { t, observed };
      })
      .filter((x): x is { t: number; observed: number } => x !== null);
  const fmtKM = (x: ReturnType<typeof kaplanMeier>[number] | undefined) =>
    x ? `${(x.s * 100).toFixed(0)}%${x.ci ? ` [${(x.ci[0] * 100).toFixed(0)}-${(x.ci[1] * 100).toFixed(0)}]` : ""} (n=${x.atRisk})` : "—";
  for (const [label, ids] of [
    ["toan bo", new Set(d.students.map((s) => s.id))] as const,
    ...d.classes.map((c) => [`lop ${c.name}`, new Set(d.students.filter((s) => s.classId === c.id).map((s) => s.id))] as const),
  ]) {
    const km = kaplanMeier(kmItems(ids), 8);
    line(`Kaplan-Meier ${label}: lien tuc toi tuan 2 | tuan 5`, `${fmtKM(km.find((x) => x.week === 1))} | ${fmtKM(km.find((x) => x.week === 4))}`);
  }

  // Luat "Nen hoi tham" dang chay tren dashboard (>= 7 ngay khong hoat dong): moi khoang trong >= 7 ngay = 1
  // lan bat co. Danh gia LUAT DANG DUNG truoc khi nghi toi mo hinh du doan.
  const classSize = new Map<string, number>();
  for (const s of d.students) classSize.set(s.classId, (classSize.get(s.classId) ?? 0) + 1);
  let flagCount = 0, back = 0, stillOut = 0, open = 0;
  const flagsByClassWeek = new Map<string, number>();
  for (const s of d.students) {
    const days = [...new Set(d.logs.filter((l) => l.studentId === s.id).map((l) => l.date))].sort();
    days.forEach((day, i) => {
      const next = days[i + 1];
      const gap = daysBetweenISO(day, next ?? today);
      if (gap < 7) return;
      flagCount++;
      if (gap >= 14) stillOut++;
      else if (next) back++;
      else open++;
      const key = `${s.classId}|${weekOf(addDaysISO(day, 7))}`;
      flagsByClassWeek.set(key, (flagsByClassWeek.get(key) ?? 0) + 1);
    });
  }
  line("Luat 'Nen hoi tham' (>= 7 ngay): so lan bat co", String(flagCount));
  line("  - quay lai trong 7 ngay sau khi bat co", pct(back, flagCount));
  line("  - chua quay lai sau 14 ngay", pct(stillOut, flagCount));
  line("  - chua du thoi gian theo doi", String(open));
  for (const [key, n] of flagsByClassWeek) {
    const [classId, week] = key.split("|");
    const size = classSize.get(classId!) ?? 0;
    if (n >= Math.max(3, size / 2)) {
      const name = d.classes.find((c) => c.id === classId)?.name ?? classId;
      console.log(`  ⚠️ Lop ${name}, tuan ${week}: ${n}/${size} em cung bi bat co - co the do lich lop (thi, nghi le, mat mang): xu ly o muc lop`);
    }
  }
  console.log(
    "  Ghi chu: giao vien co the da hoi tham => ty le quay lai mot phan nho hoi tham, KHONG phai do chinh xac du doan.\n" +
      "  Mo hinh du doan chi dang lam neu bao SOM hon 7 ngay va dung hon luat nay (so voi baseline 'tuan sau giong tuan truoc',\n" +
      "  chi tren cac tuan em CON hoat dong - xem cot active_this_week trong export)."
  );

  console.log("\n3) Kham pha rong (muc tieu cua daily-pick)");
  const ent = d.students
    .map((s) => DOMAINS.map((dm) => d.logs.filter((l) => l.studentId === s.id && domainOf.get(l.activityId) === dm.code).length))
    .filter((c) => c.reduce((a, b) => a + b, 0) >= 3)
    .map((c) => normalizedEntropy(c, DOMAINS.length));
  line("Entropy do phu linh vuc TB (hoc sinh >= 3 hoat dong)", ent.length ? (ent.reduce((a, b) => a + b, 0) / ent.length).toFixed(2) : "—");
  const weekly = new Map<string, number[]>();
  for (const l of d.logs) {
    const w = l.date.slice(0, 7);
    weekly.set(w, [...(weekly.get(w) ?? []), l.interestRating]);
  }
  for (const [m, r] of [...weekly].sort()) line(`So sao TB thang ${m}`, `${(r.reduce((a, b) => a + b, 0) / r.length).toFixed(2)} (n=${r.length})`);

  console.log("\n4) Dong thuan voi danh gia cua nguoi (ground truth)");
  const onePerStudent = (labels: OutcomeLabel[], pick: "first" | "last") => {
    const out = new Map<string, OutcomeLabel>();
    for (const l of labels) {
      const prev = out.get(l.studentId);
      if (!prev || (pick === "last" ? l.createdAt > prev.createdAt : l.createdAt < prev.createdAt)) out.set(l.studentId, l);
    }
    return [...out.values()];
  };
  const firstPickInTop3 = (picks: string[], top3: string[]) => (top3.includes(picks[0]!) ? 1 : 0);
  // 4a) TRUOC khi xem ket qua (cuoi bai khao sat form trong, lan som nhat = T1): khong bi neo vao ket qua.
  // So voi "ghep ngau nhien giua cac em" (hoan vi), khong phai voi chia deu 8 nhom.
  const pre = onePerStudent(d.labels.filter((l) => l.rater === "student" && l.labelPhase === "pre_result"), "first");
  if (pre.length) {
    const picks = pre.map((l) => l.preferredDomains as string[]);
    const tops = pre.map((l) => l.topDomains as string[]);
    const j = permutationTest(picks, tops, jaccard);
    const hit = permutationTest(picks, tops, firstPickInTop3);
    line("Hoc sinh TRUOC khi xem: Jaccard(em chon, top 3)", `${j.observed.toFixed(2)} | ghep ngau nhien ${j.nullMean.toFixed(2)} (p = ${j.p.toFixed(3)}, n=${pre.length})`);
    line("  nhom em chon DAU TIEN nam trong top 3", `${(hit.observed * 100).toFixed(1)}% | ghep ngau nhien ${(hit.nullMean * 100).toFixed(1)}% (p = ${hit.p.toFixed(3)})`);
  } else {
    line("Hoc sinh TRUOC khi xem ket qua", "chua co (hoi o cuoi bai khao sat T1/T2)");
  }
  // 4b) SAU khi xem: de bi neo vao dieu he thong vua noi - chenh lech so voi 4a = muc do neo.
  for (const rater of ["student", "teacher"] as const) {
    const ls = onePerStudent(d.labels.filter((x) => x.rater === rater && x.labelPhase === "post_result"), "last");
    const who = rater === "student" ? "Hoc sinh (sau khi xem)" : "Giao vien";
    line(`${who}: 'dung/phu hop' | 'mot phan' | 'chua'`, `${ls.filter((l) => l.agreement === 3).length} | ${ls.filter((l) => l.agreement === 2).length} | ${ls.filter((l) => l.agreement === 1).length} (n=${ls.length})`);
    const withPref = ls.filter((l) => l.preferredDomains.length > 0);
    line(`${who}: nhom ho chon nam trong top 3`, `${pct(withPref.filter((l) => firstPickInTop3(l.preferredDomains, l.topDomains)).length, withPref.length)} (n=${withPref.length})`);
  }

  // 5) CAU HOI ON NHANH (de xuat A5 buoc 2) - diem chi co nghia khi biet em lam trong bao lau.
  console.log("\n5) Cau hoi on nhanh sau hoat dong");
  const qa = d.quizAttempts;
  if (qa.length === 0) console.log("  Chua co bai lam quiz nao.");
  else {
    const withQuiz = new Set(d.activities.filter((a) => a.quiz.length).map((a) => a.id));
    const eligible = d.logs.filter((l) => withQuiz.has(l.activityId)).length;
    const secPerQ = (q: (typeof qa)[number]) => (q.startedAt && q.finishedAt ? (Date.parse(q.finishedAt) - Date.parse(q.startedAt)) / 1000 / q.nQuestions : null);
    const rushed = qa.filter((q) => (secPerQ(q) ?? Infinity) < 3);
    const score = (xs: typeof qa) => xs.reduce((s, q) => s + q.nCorrect / q.nQuestions, 0) / (xs.length || 1);
    line("Lam quiz / hoat dong co quiz da lam xong", `${pct(qa.length, eligible)} (${qa.length}/${eligible})`);
    line("Diem TB (ty le cau dung)", `${(score(qa) * 100).toFixed(1)}% | ${new Set(qa.map((q) => q.studentId)).size} em`);
    line("Lam voi (< 3 giay/cau): so bai | diem TB", `${pct(rushed.length, qa.length)} | ${(score(rushed) * 100).toFixed(1)}% (con lai ${(score(qa.filter((q) => !rushed.includes(q))) * 100).toFixed(1)}%)`);
    // Cau it em lam dung nhat (>= 10 luot): co the cau hoi kho hieu hoac dap an can ra lai.
    const perQ = new Map<string, { n: number; ok: number }>();
    for (const q of qa) for (const a of q.answers) perQ.set(a.questionId, { n: (perQ.get(a.questionId)?.n ?? 0) + 1, ok: (perQ.get(a.questionId)?.ok ?? 0) + (a.correct ? 1 : 0) });
    const hardest = [...perQ].filter(([, v]) => v.n >= 10).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).slice(0, 5);
    if (hardest.length) console.log(`  It em lam dung nhat (ra lai cau hoi/dap an): ${hardest.map(([id, v]) => `${id} ${pct(v.ok, v.n)}`).join(" | ")}`);
    // Lam hoat dong lau hon so voi du kien thi nho nhieu hon? (lien he, khong phai nhan qua)
    const pairs = qa.flatMap((q) => {
      const log = d.logs.find((l) => l.studentId === q.studentId && l.activityId === q.activityId && l.date === q.date && l.startedAt && l.finishedAt);
      const exp = d.activities.find((a) => a.id === q.activityId)?.durationMinutes;
      return log && exp ? [[(Date.parse(log.finishedAt!) - Date.parse(log.startedAt!)) / 60_000 / exp, q.nCorrect / q.nQuestions] as const] : [];
    });
    if (pairs.length >= 30) line("Spearman(thoi gian lam that / du kien, diem quiz)", `${spearman(pairs.map((p) => p[0]), pairs.map((p) => p[1])).toFixed(2)} (n=${pairs.length})`);
    console.log("  Diem quiz KHONG tinh vao ho so so thich; chi de em nho lai va de ra lai cau hoi.");
  }

  console.log("\n6) Thu nghiem A/B - co mau can (moi nhom, alpha 0.05, power 0.8)");
  const base = shown.length >= 30 ? accepted.length / shown.length : 0.5;
  for (const lift of [0.05, 0.1, 0.15]) {
    const p2 = Math.min(0.99, base + lift);
    line(`Ty le hoan thanh ${(base * 100).toFixed(0)}% -> ${(p2 * 100).toFixed(0)}%`, `${sampleSizePerGroup(base, p2)} luot goi y/nhom`);
  }
  console.log(
    "  Ghi chu: chia ngau nhien THEO LOP (tranh lay nhiem cheo) hoac doi thuat toan theo tuan (crossover) khi mau nho;\n" +
      "  can dong y cua nha truong & phu huynh truoc khi bot tinh nang cua nhom doi chung. Mau nho => chi so sanh\n" +
      "  truoc/sau va ghi ro gioi han, khong tuyen bo quan he nhan qua."
  );
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
