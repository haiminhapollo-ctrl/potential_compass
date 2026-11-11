import { getDomain } from "@/lib/domains";
import type { DomainScore } from "@/lib/types";
import { SunStar } from "@/components/ui/Motifs";

// ============================================================================
// Bieu do thanh ngang - Ho so tiem nang theo 8 nhom linh vuc.
// Mot chi so / 8 hang muc, ten nhom la nhan truc tiep canh moi thanh => MOT sac
// xanh reu cho moi thanh (bao cao cai tien UI: bo 8 mau neon roi rac), nhom
// "Noi bat" doi sang dat nung (mau "can chu y"). Thanh phang, khong do bong.
// ============================================================================
export function DomainScoreChart({
  scores,
  activityCount,
  title = "Hồ sơ sở thích theo 8 nhóm lĩnh vực",
  subtitle,
}: {
  scores: DomainScore[];
  /** So hoat dong da danh gia: 0 = ho so ban dau (chi co khao sat) -> loi nhan khac. */
  activityCount: number;
  title?: string;
  // Dong mo ta dat NGAY DUOI tieu de trong CUNG mot khoi clay - tranh phai
  // boc bieu do trong mot the khac (the-trong-the => hai vien dat set long nhau).
  subtitle?: string;
}) {
  const sorted = [...scores].sort((a, b) => a.rank - b.rank);
  // Nhan "Noi bat" do scoring.ts gan (nguong hieu chuan theo nguoi tra loi bua, de xuat A1) -
  // khong ep goi 3 nhom dau la "noi bat". Ho so cong thuc cu chua co nhan => khong ket luan gi.
  const labelled = sorted.length > 0 && sorted.every((s) => s.notable !== undefined);
  const anyNotable = sorted.some((s) => s.notable);

  return (
    <div className="clay above-grain p-6">
      <div className="mb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title ? (
            <h3 className="balance text-base font-bold tracking-[-0.01em] text-ink-900">{title}</h3>
          ) : (
            <span />
          )}
          <span className="text-xs font-medium text-ink-400">0–100 · vạch giữa = 50 (ngang mức chọn ngẫu nhiên)</span>
        </div>
        {subtitle && <p className="pretty mt-1 text-sm font-medium text-ink-500">{subtitle}</p>}
        {labelled && !anyNotable && (
          <p className="pretty clay-sunken mt-3 px-3.5 py-2 text-sm font-semibold text-ink-500">
            {activityCount === 0
              ? "Đây là hồ sơ ban đầu nên chưa có nhóm nào nổi bật hẳn, chuyện này bình thường. Em làm thêm vài hoạt động ở nhiều nhóm, hồ sơ sẽ rõ hơn."
              : "Hồ sơ chưa phân biệt rõ: chưa nhóm nào cao hơn hẳn các nhóm khác. Em thử thêm hoạt động ở nhiều nhóm khác nhau để hồ sơ rõ hơn nhé."}
          </p>
        )}
      </div>

      <div className="space-y-3.5">
        {sorted.map((s, idx) => {
          const domain = getDomain(s.domain);
          if (!domain) return null;
          const isTop = s.notable === true;
          return (
            <div key={s.domain} className="animate-clay-rise" style={{ animationDelay: `${idx * 55}ms` }}>
              {/* Ten nhom co the dai (xuong 2 dong tren dien thoai) => nhan "Noi bat"
                  va diem so gom thanh MOT nhom ben phai, khong bao gio bi day
                  xuong dong rieng => chieu cao cac hang deu nhau. */}
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-start gap-1.5 text-sm font-semibold text-ink-800">
                  <span className="shrink-0" aria-hidden>
                    {domain.icon}
                  </span>
                  <span className="pretty min-w-0">{domain.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {isTop && (
                    <span
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-clay-sm border border-terracotta-100
                                 bg-terracotta-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-terracotta-700"
                    >
                      {/* Huy hieu sao mat troi Trong dong (bao cao cai tien UI muc 3). */}
                      <SunStar className="h-3 w-3" />
                      Nổi bật
                    </span>
                  )}
                  <span className="nums text-sm font-extrabold text-ink-900">{s.score}</span>
                </span>
              </div>

              <div
                className="clay-sunken relative h-6 w-full overflow-hidden rounded-full"
                role="img"
                aria-label={`${domain.name}: ${s.score} trên 100${isTop ? ", nổi bật" : ""}`}
                title={`${domain.name}: ${s.score}/100`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-clay ${isTop ? "bg-terracotta-600" : "bg-brand-500"}`}
                  style={{ width: `${Math.max(s.score, 4)}%` }}
                />
                {/* Vach moc 50 = muc cua nguoi chon ngau nhien */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/80" aria-hidden />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
