import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { getDomain } from "@/lib/domains";
import { ResourceList } from "@/components/student/ResourceList";
import { DomainScoreChart } from "@/components/student/DomainScoreChart";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LacArrow } from "@/components/ui/Motifs";
import { Button, LinkButton } from "@/components/ui/Button";
import { ProfileHistory } from "@/components/ProfileHistory";
import { InsightSourceNote } from "@/components/InsightSourceNote";
import { RetestInvite } from "@/components/student/RetestInvite";
import { DOMAINS } from "@/lib/domains";
import { todayISOVN } from "@/lib/date";
import { getPendingRetestWave, isRiasecPending } from "@/lib/profile-service";
import { submitProfileFeedbackAction } from "./actions";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ first?: string; "lam-lai"?: string; "dot-lai"?: string; "da-danh-gia"?: string; riasec?: string }>;
}) {
  const params = await searchParams;
  const { first } = params;
  const retaken = params["lam-lai"] === "1";
  const retested = params["dot-lai"] === "1";
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const [profile, resources, snapshots, allLabels, retestWave, riasecPending] = await Promise.all([
    repo.getProfile(session.id),
    repo.listResources(),
    repo.listSnapshots(session.id),
    repo.listOutcomeLabels([session.id]),
    getPendingRetestWave(session.id),
    isRiasecPending(session.id),
  ]);
  // Chi nhan danh gia SAU khi xem ket qua (lua chon cuoi bai khao sat la nhan "truoc khi xem", khong tinh o day).
  const labels = allLabels.filter((l) => l.labelPhase === "post_result");

  if (!profile || !profile.surveyCompleted) {
    redirect("/hoc-sinh/khao-sat");
  }

  // Goi y nghe nghiep/tai nguyen chi cho nhom dung dau CO NHAN "Noi bat" (ho so cong thuc cu: chua co nhan => giu nhu cu).
  // Ho so chua phan biet ro thi khong ngam "day la nhom cua em" (de xuat A1).
  const labelled = profile.scores.every((s) => s.notable !== undefined);
  const topDomain =
    profile.topDomains[0] && (!labelled || profile.scores.find((s) => s.rank === 1)?.notable) ? getDomain(profile.topDomains[0]) : null;
  const topResources = topDomain ? resources.filter((r) => r.domain === topDomain.code).slice(0, 3) : [];
  // Hoi lai khi top 3 doi; da tra loi cho top 3 hien tai thi chi cam on.
  const answeredCurrent = labels.some(
    (l) => l.rater === "student" && l.topDomains.join() === profile.topDomains.join()
  );
  const justAnswered = params["da-danh-gia"] === "1" && labels.some((l) => todayISOVN(new Date(l.createdAt)) === todayISOVN());

  return (
    <div className="space-y-5">
      {first === "1" && (
        <Card className="animate-clay-rise bg-brand-100">
          <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
            Em đã làm xong bài khảo sát. Đây là hồ sơ sở thích ban đầu của em, hồ sơ sẽ còn thay đổi khi em
            làm thêm hoạt động mỗi ngày.
          </p>
        </Card>
      )}

      {(retaken || retested) && (
        <Card className="animate-clay-rise bg-brand-100">
          <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
            Đã lưu bài khảo sát mới. Hồ sơ bên dưới đã tính lại theo đáp án em vừa chọn.
          </p>
        </Card>
      )}

      {retestWave && <RetestInvite wave={retestWave} />}

      {params.riasec === "1" && (
        <Card className="animate-clay-rise bg-brand-100">
          <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">Cảm ơn em đã làm thêm bài này. Thầy cô dùng nó để kiểm tra lại bộ câu hỏi.</p>
        </Card>
      )}
      {riasecPending && !retestWave && (
        <Card className="animate-clay-rise bg-brand-100">
          <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
            Thầy cô mời em làm thêm một bài 30 câu (khoảng 5 phút) về những công việc em thích hoặc không thích. Không
            có đúng sai, bài này giúp thầy cô kiểm tra bộ câu hỏi của ứng dụng.
          </p>
          <LinkButton href="/hoc-sinh/riasec" className="mt-3 w-full">
            Làm bài 30 câu
          </LinkButton>
        </Card>
      )}

      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Hồ sơ sở thích của em
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-400">
          Cập nhật lần cuối: {new Date(profile.updatedAt).toLocaleString("vi-VN")}
        </p>
      </div>

      {profile.lastInsight && (
        <Card>
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-600">
            Nhận xét dành cho em
          </p>
          <p className="pretty text-sm font-medium leading-relaxed text-ink-700">{profile.lastInsight}</p>
          <InsightSourceNote provenance={profile.insightProvenance} />
        </Card>
      )}

      <DomainScoreChart scores={profile.scores} activityCount={profile.activitiesCompletedCount} />

      {/* Nhan danh gia cua hoc sinh (ground truth - bao cao DS loi 12) */}
      <Card>
        {answeredCurrent ? (
          <p className="pretty text-sm font-semibold text-ink-600">
            {justAnswered ? "Cảm ơn em! " : ""}Em đã cho biết cảm nhận về kết quả này. Khi hồ sơ thay đổi,
            em sẽ được hỏi lại.
          </p>
        ) : (
          <form action={submitProfileFeedbackAction} className="space-y-3">
            <CardTitle>Kết quả này có giống em không?</CardTitle>
            <label className="block text-sm font-medium text-ink-600">
              Nhóm em thấy hợp với mình nhất (không bắt buộc)
              <select name="preferredDomain" defaultValue="" className="clay-input mt-1.5">
                <option value="">Em chưa chắc</option>
                {DOMAINS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.icon} {d.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="submit" name="agreement" value="3" variant="secondary">
                Giống em
              </Button>
              <Button type="submit" name="agreement" value="2" variant="secondary">
                Giống một phần
              </Button>
              <Button type="submit" name="agreement" value="1" variant="secondary">
                Chưa giống
              </Button>
            </div>
          </form>
        )}
      </Card>

      <ProfileHistory snapshots={snapshots} title="Hồ sơ của em qua các tuần" />

      {topDomain && (
        <Card>
          <CardTitle>Một số hướng liên quan đến &quot;{topDomain.name}&quot;</CardTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {topDomain.sampleCareers.map((c) => (
              <Badge key={c} colorHex={topDomain.colorHex}>
                {c}
              </Badge>
            ))}
          </div>
          {/* Hai nhanh hoc len (11/2026): hoc nghe ngay sau lop 9 / hoc tiep THPT. Nhom Y te, Su pham: chi nhanh hoc tiep. */}
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="clay-sunken px-3.5 py-2.5">
              <dt className="text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400">Học nghề ngay sau lớp 9</dt>
              <dd className="pretty mt-0.5 font-medium text-ink-700">
                {topDomain.vocationalBranch ?? "Nhóm này không có nghề học ngay sau lớp 9: em cần học hết THPT trước."}
              </dd>
            </div>
            <div className="clay-sunken px-3.5 py-2.5">
              <dt className="text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400">Học tiếp THPT rồi lên cao</dt>
              <dd className="pretty mt-0.5 font-medium text-ink-700">{topDomain.academicBranch}</dd>
            </div>
          </dl>
          <p className="pretty mt-4 text-sm font-medium text-ink-500">
            Đây chỉ là vài ví dụ để em tham khảo, không phải kết luận em nên làm nghề gì. Chọn hướng nào em hãy bàn
            cùng gia đình và thầy cô.
          </p>
        </Card>
      )}

      {topResources.length > 0 && (
        <Card>
          <CardTitle>Tài nguyên gợi ý</CardTitle>
          <ResourceList resources={topResources} />
        </Card>
      )}

      <LinkButton href="/hoc-sinh/hoat-dong" className="w-full">
        Làm hoạt động hôm nay
      </LinkButton>

      {/* Bai khao sat: XEM LAI (chi doc) va LAM LAI (ghi de dap an cu, tinh lai
          ho so). De o trang Ho so vi ho so chinh la ket qua cua bai khao sat. */}
      <div className="space-y-2.5">
        <Link
          href="/hoc-sinh/khao-sat/xem-lai"
          className="focus-ring clay-press clay flex items-center justify-between gap-3 px-5 py-4
                     hover:border-brand-400"
        >
          <span>
            <span className="block text-sm font-bold text-ink-800">Xem lại bài khảo sát của em</span>
            <span className="block text-sm font-medium text-ink-500">
              Đọc lại các câu và đáp án em đã chọn
            </span>
          </span>
          <LacArrow className="h-3.5 w-6 shrink-0 text-brand-600" />
        </Link>

        <Link
          href="/hoc-sinh/khao-sat?lam-lai=1"
          className="focus-ring clay-press clay flex items-center justify-between gap-3 px-5 py-4
                     hover:border-brand-400"
        >
          <span>
            <span className="block text-sm font-bold text-ink-800">Làm lại bài khảo sát</span>
            <span className="block text-sm font-medium text-ink-500">
              Đổi những câu chưa đúng với em, hồ sơ sẽ được tính lại
            </span>
          </span>
          <span aria-hidden className="text-lg font-bold text-brand-600">
            ↻
          </span>
        </Link>
      </div>
    </div>
  );
}
