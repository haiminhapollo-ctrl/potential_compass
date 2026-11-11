import { getDomain } from "@/lib/domains";
import { SCORING_VERSION } from "@/lib/recommendation/scoring";
import type { ProfileSnapshot } from "@/lib/types";

// ============================================================================
// LICH SU HO SO THEO TUAN (bao cao DS loi 9): snapshot truoc day duoc ghi nhung
// khong man hinh nao doc. Bang nho: tuan -> top 3 + diem nhom dung dau. Chi so
// sanh cac tuan cung cong thuc (scoringVersion) - tuan tinh theo cong thuc cu
// duoc danh dau, khong tron chung.
// ============================================================================
export function ProfileHistory({ snapshots, title = "Hồ sơ qua các tuần" }: { snapshots: ProfileSnapshot[]; title?: string }) {
  const rows = [...snapshots].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <div className="clay above-grain p-6">
      <h3 className="text-base font-bold tracking-[-0.01em] text-ink-900">{title}</h3>
      <p className="mt-1 text-sm font-medium text-ink-500">Mỗi tuần lưu 1 lần, chốt vào Chủ Nhật.</p>
      <ul className="mt-4 space-y-2">
        {rows.map((s) => {
          const top = s.scores.find((x) => x.rank === 1);
          // Tuan tinh bang cong thuc co nhan "Noi bat" (v4+) ma chua nhom nao co nhan => khong goi ten nhom dau.
          const unclear = s.scores.length > 0 && s.scores.every((x) => x.notable !== undefined) && !top?.notable;
          return (
            <li key={s.id} className="clay-sunken flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <span className="nums text-xs font-bold text-ink-500">
                Tuần {new Date(s.weekStartDate).toLocaleDateString("vi-VN")}
                {s.scoringVersion !== SCORING_VERSION && " · công thức cũ"}
              </span>
              <span className="text-sm font-semibold text-ink-800">
                {s.topDomains.map((c) => getDomain(c)?.icon).join(" ")}{" "}
                {unclear ? "chưa phân biệt rõ" : (getDomain(s.topDomains[0]!)?.name ?? "—")}
                {top && <span className="nums ml-1.5 text-xs font-bold text-ink-500">({top.score})</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
