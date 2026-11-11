import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { getOrRefreshWeeklyReview, getWeekStartDate } from "@/lib/profile-service";
import { getDomain } from "@/lib/domains";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SunStar } from "@/components/ui/Motifs";

export default async function WeeklyReviewPage() {
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const profile = await repo.getProfile(session.id);
  if (!profile?.surveyCompleted) redirect("/hoc-sinh/khao-sat");

  const weekStartDate = getWeekStartDate();
  // Dem lai so hoat dong trong tuan MOI lan xem; chi viet lai nhan xet khi so lieu doi
  // (truoc day sinh 1 lan roi giu nguyen ca tuan - xem profile-service.ts).
  const currentReview = await getOrRefreshWeeklyReview(session.id);
  const reviews = await repo.listWeeklyReviews(session.id);

  const pastReviews = reviews.filter((r) => r.weekStartDate !== weekStartDate);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Tổng kết tuần này</h1>
        <p className="mt-1 text-sm font-medium text-ink-400">
          Tuần bắt đầu {new Date(weekStartDate).toLocaleDateString("vi-VN")}
        </p>
      </div>

      <Card className="tho-cam-top animate-clay-rise bg-brand-100 p-6 pt-8">
        {/* Cot moc cua tuan: sao mat troi Trong dong mau vang dat (huy hieu), khong chuyen dong. */}
        <div className="flex items-start justify-between gap-4">
          <p className="text-5xl font-extrabold tracking-[-0.04em] text-brand-700">
            {currentReview.activitiesCompleted}
          </p>
          <SunStar className="h-12 w-12 shrink-0 text-ochre-600" />
        </div>
        <p className="mt-1 text-sm font-bold text-brand-800">hoạt động đã hoàn thành tuần này</p>
      </Card>

      <Card>
        <CardTitle>Nhận xét của tuần</CardTitle>
        <p className="pretty mt-2 text-sm font-medium leading-relaxed text-ink-700">{currentReview.summaryText}</p>
        {currentReview.topDomains.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentReview.topDomains.map((code) => {
              const d = getDomain(code);
              if (!d) return null;
              return (
                <Badge key={code} colorHex={d.colorHex}>
                  {d.icon} {d.name}
                </Badge>
              );
            })}
          </div>
        )}
      </Card>

      {pastReviews.length > 0 && (
        <div>
          <h2 className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.06em] text-ink-500">
            Các tuần trước
          </h2>
          <ul className="space-y-2.5">
            {pastReviews.map((r) => (
              <li key={r.id} className="clay px-4 py-3.5">
                <p className="text-xs font-bold text-ink-400">
                  Tuần {new Date(r.weekStartDate).toLocaleDateString("vi-VN")} · {r.activitiesCompleted} hoạt động
                </p>
                <p className="pretty mt-1 text-sm font-medium text-ink-700">{r.summaryText}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
