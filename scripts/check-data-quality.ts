/**
 * BAO CAO CHAT LUONG DU LIEU (bao cao DS loi 14, 17, 21) - chay TRUOC moi lan
 * phan tich/bao cao. Liet ke ban ghi thieu, trung, ngoai mien, tham chieu hong,
 * du lieu cua hoc sinh CHUA co xac nhan phu huynh, ho so tinh bang cong thuc cu.
 *
 * Chay: npm run check:data   (DATA_BACKEND trong .env.local)
 * Thoat ma 1 neu co loi muc "LOI" (dung duoc trong CI / truoc khi xuat du lieu).
 */
import { loadDataset } from "./lib/dataset";
import { computeContentHash, SCORING_VERSION } from "../src/lib/recommendation/scoring";
import { MAX_EXTRA_PER_DAY } from "../src/lib/recommendation/daily-pick";
import { todayISOVN, weekRangeVN } from "../src/lib/date";
import { surveyAttemptFlags } from "../src/lib/survey";

type Level = "LOI" | "CANH BAO" | "THONG TIN";
const findings: { level: Level; check: string; count: number; total: number; sample: string[] }[] = [];
function report(level: Level, check: string, bad: string[], total: number) {
  findings.push({ level, check, count: bad.length, total, sample: bad.slice(0, 3) });
}

async function main() {
  const d = await loadDataset();
  const today = todayISOVN();
  const optionToQuestion = new Map(d.questions.flatMap((q) => q.options.map((o) => [o.id, q.id] as const)));
  const activityIds = new Set(d.activities.map((a) => a.id));
  const studentIds = new Set(d.students.map((s) => s.id));
  const contentHash = computeContentHash({ questions: d.questions, activities: d.activities });

  // --- Cau tra loi khao sat ---
  report("LOI", "Cau tra loi tro toi dap an khong ton tai", d.responses.filter((r) => !optionToQuestion.has(r.optionId)).map((r) => r.id), d.responses.length);
  report(
    "LOI",
    "Dap an khong thuoc dung cau hoi",
    d.responses.filter((r) => optionToQuestion.has(r.optionId) && optionToQuestion.get(r.optionId) !== r.questionId).map((r) => r.id),
    d.responses.length
  );
  report("CANH BAO", "Cau tra loi khong ghi phien ban khao sat (du lieu truoc 10/2026)", d.responses.filter((r) => !r.surveyVersion).map((r) => r.id), d.responses.length);
  report(
    "THONG TIN",
    "Cau tra loi theo phien ban noi dung KHAC hien tai (giao vien da sua cau hoi sau khi em tra loi)",
    d.responses.filter((r) => r.surveyVersion && r.surveyVersion !== contentHash).map((r) => r.id),
    d.responses.length
  );

  // --- Lan lam khao sat (de xuat A4, B1) ---
  const perAttempt = new Map<string, number>();
  for (const a of d.attempts) for (const r of a.responses) perAttempt.set(`${a.id}|${r.questionId}`, (perAttempt.get(`${a.id}|${r.questionId}`) ?? 0) + 1);
  report("LOI", "Mot lan lam co 2 dap an cho cung 1 cau", [...perAttempt.entries()].filter(([, n]) => n > 1).map(([k]) => k), perAttempt.size);
  const blank = d.attempts.filter((a) => a.measurementWave);
  report(
    "CANH BAO",
    "Bai khao sat form trong co dau hieu tra loi voi (qua nhanh / cung vi tri lien tiep) - giao vien nen hoi lai em",
    blank.filter((a) => { const f = surveyAttemptFlags(a, d.questions); return f.tooFast || f.samePosition; }).map((a) => `${a.studentId}:${a.measurementWave}`),
    blank.length
  );
  report("THONG TIN", "Bai form trong khong co thoi diem bat dau (du lieu cu) - khong tinh duoc thoi gian lam", blank.filter((a) => !a.startedAt).map((a) => a.id), blank.length);

  // --- Nhat ky hoat dong ---
  report("LOI", "So sao ngoai mien 1-5", d.logs.filter((l) => ![1, 2, 3, 4, 5].includes(l.interestRating)).map((l) => l.id), d.logs.length);
  report("LOI", "Ngay hoat dong o tuong lai", d.logs.filter((l) => l.date > today).map((l) => l.id), d.logs.length);
  report("CANH BAO", "Hoat dong khong con ton tai (bi xoa)", d.logs.filter((l) => !activityIds.has(l.activityId)).map((l) => l.id), d.logs.length);
  const seen = new Map<string, number>();
  for (const l of d.logs) seen.set(`${l.studentId}|${l.activityId}|${l.date}`, (seen.get(`${l.studentId}|${l.activityId}|${l.date}`) ?? 0) + 1);
  report("LOI", "Trung (cung hoc sinh, hoat dong, ngay)", [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k), d.logs.length);
  const perDay = new Map<string, number>();
  for (const l of d.logs) perDay.set(`${l.studentId}|${l.date}`, (perDay.get(`${l.studentId}|${l.date}`) ?? 0) + 1);
  report("CANH BAO", `Qua ${MAX_EXTRA_PER_DAY + 1} hoat dong/ngay`, [...perDay.entries()].filter(([, n]) => n > MAX_EXTRA_PER_DAY + 1).map(([k]) => k), perDay.size);
  report(
    "THONG TIN",
    "Ty le dong bo offline",
    d.logs.filter((l) => l.source === "offline_sync").map((l) => l.id),
    d.logs.length
  );

  // --- Quyen rieng tu / dong y ---
  const withData = new Set([...d.responses.map((r) => r.studentId), ...d.logs.map((l) => l.studentId)]);
  report(
    "CANH BAO",
    "Hoc sinh CO du lieu nhung CHUA co xac nhan phu huynh (bi loai khoi xuat du lieu)",
    d.students.filter((s) => withData.has(s.id) && !s.parentConsentConfirmed).map((s) => s.studentCode),
    withData.size
  );
  report("LOI", "Ban ghi cua hoc sinh khong ton tai", [...withData].filter((id) => !studentIds.has(id)), withData.size);

  // --- Ho so & snapshot ---
  const surveyed = d.profiles.filter((p) => p.surveyCompleted);
  report("CANH BAO", `Ho so chua tinh lai bang cong thuc ${SCORING_VERSION}`, surveyed.filter((p) => p.scoringVersion !== SCORING_VERSION).map((p) => p.studentId), surveyed.length);
  report("THONG TIN", "Ho so tinh tren noi dung cu (chay recompute:profiles)", surveyed.filter((p) => p.contentHash !== contentHash).map((p) => p.studentId), surveyed.length);
  const week = weekRangeVN().start;
  const snapThisWeek = new Set(d.snapshots.filter((s) => s.weekStartDate === week).map((s) => s.studentId));
  report("CANH BAO", "Hoc sinh da lam khao sat nhung chua co snapshot tuan nay (cron chua chay?)", surveyed.filter((p) => !snapThisWeek.has(p.studentId)).map((p) => p.studentId), surveyed.length);
  report("THONG TIN", "Nhan xet chua ghi nguon goc (du lieu cu)", surveyed.filter((p) => p.lastInsight && !p.insightProvenance).map((p) => p.studentId), surveyed.length);

  console.log(`\nBAO CAO CHAT LUONG DU LIEU - ${new Date().toISOString()}`);
  console.log(`Hoc sinh ${d.students.length} | lan lam khao sat ${d.attempts.length} | cau tra loi hien tai ${d.responses.length} | hoat dong ${d.logs.length} | su kien goi y ${d.events.length} | nhan danh gia ${d.labels.length}\n`);
  for (const f of findings) {
    const mark = f.count === 0 ? "✅" : f.level === "LOI" ? "❌" : f.level === "CANH BAO" ? "⚠️ " : "ℹ️ ";
    const rate = f.total ? ` (${((f.count / f.total) * 100).toFixed(1)}% / ${f.total})` : "";
    console.log(`${mark} [${f.level}] ${f.check}: ${f.count}${rate}${f.count ? ` - vd: ${f.sample.join(", ")}` : ""}`);
  }
  const errors = findings.filter((f) => f.level === "LOI" && f.count > 0).length;
  console.log(errors ? `\n❌ Co ${errors} loai loi can xu ly truoc khi phan tich.` : "\n✅ Khong co loi chan.");
  process.exit(errors ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
