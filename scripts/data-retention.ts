/**
 * LUU GIU & XOA DU LIEU HOC SINH (bao cao DS loi 21) - thuc thi chinh sach luu
 * giu do NHA TRUONG duyet (de xuat: docs/data-governance.md muc 4).
 *
 *   npm run data:retention -- --class <classId>              # xem truoc (khong xoa)
 *   npm run data:retention -- --inactive-before 2027-06-30   # em khong co hoat dong/tra loi tu ngay do
 *   ... them --apply de XOA THAT (khong hoan tac duoc)
 *
 * Xoa hoc sinh => xoa kem MOI du lieu cua em (cau tra loi, hoat dong, ho so,
 * snapshot, su kien goi y, nhan danh gia). Muon giu so lieu cho nghien cuu thi
 * chay `npm run export:dataset` (an danh) TRUOC khi xoa.
 */
import { loadDataset } from "./lib/dataset";
import { getRepository } from "../src/lib/data";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const classId = arg("--class");
  const before = arg("--inactive-before");
  const apply = process.argv.includes("--apply");
  if (!classId && !before) {
    console.log("Can --class <classId> hoac --inactive-before <YYYY-MM-DD>. Them --apply de xoa that.");
    process.exit(1);
  }
  if (before && !/^\d{4}-\d{2}-\d{2}$/.test(before)) throw new Error("--inactive-before phai dang YYYY-MM-DD");

  const d = await loadDataset();
  const lastSeen = new Map<string, string>();
  for (const r of d.responses) lastSeen.set(r.studentId, [lastSeen.get(r.studentId) ?? "", r.answeredAt.slice(0, 10)].sort().pop()!);
  for (const l of d.logs) lastSeen.set(l.studentId, [lastSeen.get(l.studentId) ?? "", l.date].sort().pop()!);

  const targets = d.students.filter(
    (s) => (!classId || s.classId === classId) && (!before || (lastSeen.get(s.id) ?? s.createdAt.slice(0, 10)) < before)
  );
  console.log(`${apply ? "XOA" : "XEM TRUOC"}: ${targets.length} hoc sinh`);
  for (const s of targets) {
    const n = d.responses.filter((r) => r.studentId === s.id).length + d.logs.filter((l) => l.studentId === s.id).length;
    console.log(`  - ${s.studentCode} (lop ${s.classId.slice(0, 12)}, hoat dong cuoi ${lastSeen.get(s.id) ?? "chua co"}, ${n} ban ghi)`);
  }
  if (!apply) {
    console.log("\nChua xoa gi. Kiem tra danh sach, chay export:dataset neu can giu so lieu an danh, roi them --apply.");
    return;
  }
  const repo = getRepository();
  for (const s of targets) await repo.deleteStudent(s.id);
  console.log(`\nDa xoa ${targets.length} hoc sinh va toan bo du lieu lien quan.`);
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
