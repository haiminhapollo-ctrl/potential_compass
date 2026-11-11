import { getDomain } from "@/lib/domains";
import { MIN_N_FOR_CI, type DomainSummary } from "@/lib/recommendation/aggregate";

// ============================================================================
// PHAN BO DIEM CA LOP theo 8 nhom (thay cho "xu huong" = 1 con so trung binh).
// Moi hang: vung mau = khoang giua 50% hoc sinh (Q1-Q3), cham = trung vi, vach
// doc = 50 (muc cua nguoi chon ngau nhien). Thu tu nhom CO DINH (khong xep hang),
// MOT sac xanh reu cho moi hang (nhan chu & so lieu canh moi hang da noi nhom nao). Tooltip (title) cho tung hang; so lieu day du
// nam ngay trong hang nen khong can bang rieng.
// ============================================================================
export function DomainDistributionChart({ summaries, n }: { summaries: DomainSummary[]; n: number }) {
  return (
    <div>
      <p className="mb-4 text-xs font-medium text-ink-400">
        Vùng màu = khoảng giữa 50% học sinh (Q1–Q3) · chấm = trung vị · vạch dọc = 50 (ngang mức chọn ngẫu nhiên) ·{" "}
        {n} học sinh{n >= MIN_N_FOR_CI ? " · KTC95 = khoảng tin cậy 95% của trung vị" : ""}
      </p>
      <div className="space-y-3">
        {summaries.map((s) => {
          const d = getDomain(s.domain);
          if (!d) return null;
          const ci = s.medianCI ? `, khoảng tin cậy 95% của trung vị ${Math.round(s.medianCI[0])}–${Math.round(s.medianCI[1])}` : "";
          const label = `${d.name}: trung vị ${Math.round(s.median)}, Q1–Q3 ${Math.round(s.q1)}–${Math.round(s.q3)}${ci}, trung bình ${Math.round(s.mean)} (n = ${s.n})`;
          return (
            <div key={s.domain} title={label}>
              <div className="mb-1 flex items-start justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-start gap-1.5 font-semibold text-ink-800">
                  <span aria-hidden>{d.icon}</span>
                  <span className="pretty min-w-0">{d.name}</span>
                </span>
                <span className="nums shrink-0 text-xs font-semibold text-ink-500">
                  <span className="text-sm font-extrabold text-ink-900">{Math.round(s.median)}</span> ({Math.round(s.q1)}–
                  {Math.round(s.q3)})
                  {s.medianCI && (
                    <span className="ml-1 text-ink-400">
                      · KTC95 {Math.round(s.medianCI[0])}–{Math.round(s.medianCI[1])}
                    </span>
                  )}
                </span>
              </div>
              <div className="clay-sunken relative h-5 w-full rounded-full" role="img" aria-label={label}>
                <div className="absolute inset-y-0 w-px bg-ink-300" style={{ left: "50%" }} aria-hidden />
                <div
                  className="absolute inset-y-1 rounded-full bg-brand-300"
                  style={{
                    left: `${s.q1}%`,
                    width: `${Math.max(s.q3 - s.q1, 1.5)}%`,
                  }}
                  aria-hidden
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-2 ring-clay-surface"
                  style={{ left: `${s.median}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
