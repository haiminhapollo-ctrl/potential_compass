import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { getDomain } from "@/lib/domains";
import {
  MAX_EXTRA_PER_DAY,
  MAX_SAVED_ACTIVITIES,
  MAX_SWAPS_PER_DAY,
  pickDailyActivity,
  pickExtraActivities,
} from "@/lib/recommendation/daily-pick";
import { buildActivityFeedback } from "@/lib/recommendation/feedback";
import { logRecommendationEvents } from "@/lib/recommendation/events";
import { daysBetweenISO, isInRange, todayISOVN, weekRangeVN } from "@/lib/date";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LacArrow } from "@/components/ui/Motifs";
import { StatTile } from "@/components/ui/StatTile";
import { ExtraActivityLinks } from "@/components/student/ExtraActivityLinks";
import { RetestInvite } from "@/components/student/RetestInvite";
import { forTerm } from "@/lib/curriculum";
import { getPendingRetestWave, getStudentTerm } from "@/lib/profile-service";
import { getSwappedOutActivityIds, removeSavedAction, saveForLaterAction, swapDailyActivityAction } from "./actions";

const TYPE_STARS = 5;

export default async function TodayActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; queued?: string; updated?: string }>;
}) {
  const { done, queued, updated } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const [allActivities, logs, swappedOutIds, saved, retestWave, term] = await Promise.all([
    repo.listActivities(),
    repo.listActivityLogsByStudent(session.id),
    getSwappedOutActivityIds(),
    repo.listSavedActivities(session.id),
    getPendingRetestWave(session.id),
    getStudentTerm(session.id, repo),
  ]);
  // Chi goi y hoat dong dung chung + hoat dong cua hoc ky lop dang hoc (curriculum.ts).
  const activities = forTerm(allActivities, term);

  const today = todayISOVN();
  // Hoat dong da "de danh" khong bi chon lam hoat dong hom nay (hoc sinh da noi la can chuan bi).
  const excluded = new Set([...swappedOutIds, ...saved.map((x) => x.activityId)]);
  const pick = pickDailyActivity(activities, logs, session.id, today, excluded);
  const todaysActivity = pick?.activity ?? null;
  const logsToday = logs.filter((l) => l.date === today);
  const mainLogToday = logsToday.find((l) => !l.isExtra) ?? logsToday[0] ?? null;
  const alreadyDoneToday = logsToday.length > 0;
  const domain = todaysActivity ? getDomain(todaysActivity.domain) : null;
  const canSwap = !alreadyDoneToday && !!todaysActivity && swappedOutIds.size < MAX_SWAPS_PER_DAY;
  const canSave = !alreadyDoneToday && !!todaysActivity && saved.length < MAX_SAVED_ACTIVITIES;

  // Kham pha them sau hoat dong chinh - uu tien nhom em vua to ra hung thu (feedback.ts).
  const mainDomain = mainLogToday ? getDomain(allActivities.find((a) => a.id === mainLogToday.activityId)?.domain ?? "") : null;
  const focusDomain = mainLogToday && mainDomain ? buildActivityFeedback(mainLogToday, mainDomain).focusDomain : null;
  const extrasLeft = MAX_EXTRA_PER_DAY + 1 - logsToday.length;
  const extras = alreadyDoneToday && extrasLeft > 0 ? pickExtraActivities(activities, logs, session.id, today, focusDomain) : [];

  // Ghi "da goi y" (ca khi hoc sinh khong lam) kem xac suat duoc chon - tinh duoc ty le chap nhan goi y.
  await logRecommendationEvents(session.id, [
    ...(pick && !alreadyDoneToday
      ? [{ activityId: pick.activity.id, event: "shown" as const, propensity: pick.propensity, nCandidates: pick.nCandidates }]
      : []),
    ...extras.map((a) => ({ activityId: a.id, event: "shown_extra" as const })),
  ]);

  // Theo doi tien do tuan nay (bao cao mentor: "Progress Tracking").
  const weekLogs = logs.filter((l) => isInRange(l.date, weekRangeVN()));
  const activeDaysThisWeek = new Set(weekLogs.map((l) => l.date)).size;
  const savedActivities = saved
    .map((x) => ({ saved: x, activity: activities.find((a) => a.id === x.activityId) }))
    .filter((x): x is { saved: typeof x.saved; activity: NonNullable<typeof x.activity> } => !!x.activity);

  return (
    <div className="space-y-5">
      {done === "1" && (
        <Card className="animate-clay-rise bg-status-success-wash">
          <p className="text-sm font-semibold text-status-success">Cảm ơn em, hoạt động hôm nay đã được lưu.</p>
        </Card>
      )}
      {updated === "1" && (
        <Card className="animate-clay-rise bg-brand-100">
          <p className="text-sm font-semibold text-brand-800">
            Đã lưu thay đổi cho hoạt động hôm nay.
          </p>
        </Card>
      )}
      {queued === "1" && (
        <Card className="animate-clay-rise bg-status-warning-wash">
          <p className="pretty text-sm font-semibold leading-relaxed text-status-warning">
            Máy đang mất mạng. Phản hồi của em đã lưu trên máy và sẽ tự gửi khi có mạng lại.
          </p>
        </Card>
      )}

      {retestWave && <RetestInvite wave={retestWave} />}

      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Hoạt động hôm nay</h1>
        <p className="mt-1 text-sm font-medium text-ink-400">Mỗi hoạt động chỉ mất 3–5 phút.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Ngày đã làm tuần này" value={`${activeDaysThisWeek}/7`} />
        <StatTile label="Hoạt động tuần này" value={weekLogs.length} />
        <StatTile label="Đang để dành" value={saved.length} />
      </div>

      {todaysActivity && domain ? (
        <Card className="animate-clay-rise p-6">
          {/* Ten nhom co the dai -> cho nhan tu xuong dong BEN TRONG, con thoi
              luong luon ghim goc phai tren (khong bi day xuong dong duoi). */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <span className="min-w-0">
              <Badge colorHex={domain.colorHex}>
                {domain.icon} {domain.name}
              </Badge>
            </span>
            <span className="nums shrink-0 pt-1.5 text-xs font-bold text-ink-400">
              {todaysActivity.durationMinutes} phút
            </span>
          </div>
          <CardTitle>{todaysActivity.title}</CardTitle>
          <p className="pretty mt-1.5 text-sm font-medium leading-relaxed text-ink-600">
            {todaysActivity.description}
          </p>

          {alreadyDoneToday ? (
            /* Da xong hom nay -> KHONG dung link "#" (link chet). Hien mot vien
               LOM khong bam duoc de bao trang thai da hoan thanh. */
            <p
              className="clay-sunken mt-5 px-5 py-3 text-center text-sm font-bold text-ink-500"
              aria-live="polite"
            >
              Đã hoàn thành hôm nay ✓
            </p>
          ) : (
            <div className="mt-5 space-y-2.5">
              <LinkButton href={`/hoc-sinh/hoat-dong/${todaysActivity.id}`} className="w-full">
                Bắt đầu
              </LinkButton>
              {canSave && (
                <form action={saveForLaterAction}>
                  <input type="hidden" name="activityId" value={todaysActivity.id} />
                  <Button type="submit" variant="ghost" className="w-full">
                    📌 Cần chuẩn bị? Để dành làm sau
                  </Button>
                </form>
              )}
              {canSwap && (
                <form action={swapDailyActivityAction}>
                  <input type="hidden" name="currentActivityId" value={todaysActivity.id} />
                  <Button type="submit" variant="ghost" className="w-full">
                    Không hợp với em, đổi hoạt động khác
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🌤
          </p>
          <CardTitle className="mt-2">Chưa có hoạt động nào</CardTitle>
          <p className="pretty mt-1 text-sm font-medium text-ink-500">
            Em hỏi giáo viên để được mở thêm hoạt động nhé.
          </p>
        </Card>
      )}

      {alreadyDoneToday && (
        <Card className="p-6">
          <CardTitle>Khám phá thêm</CardTitle>
          {extras.length > 0 ? (
            <>
              <p className="pretty mt-1 text-sm font-medium text-ink-500">
                Hôm nay em còn {extrasLeft} lượt khám phá thêm. Không bắt buộc, em thích thì làm.
              </p>
              <ExtraActivityLinks activities={extras} />
            </>
          ) : (
            <p className="pretty mt-1.5 text-sm font-medium text-ink-500">
              Hôm nay em đã làm đủ {MAX_EXTRA_PER_DAY + 1} hoạt động rồi. Mai quay lại khám phá tiếp nhé!
            </p>
          )}
        </Card>
      )}

      {savedActivities.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-extrabold uppercase tracking-[0.06em] text-ink-500">
            📌 Đang để dành ({savedActivities.length}/{MAX_SAVED_ACTIVITIES})
          </h2>
          <p className="pretty mb-2.5 text-sm font-medium text-ink-500">
            Những hoạt động em cần chuẩn bị trước. Chuẩn bị xong thì bấm vào để làm, làm xong hoạt động sẽ tự rời danh sách.
          </p>
          <ul className="space-y-2.5">
            {savedActivities.map(({ saved: x, activity: a }) => {
              // savedAt la UTC -> doi sang NGAY GIO VIET NAM truoc khi so (xem src/lib/date.ts).
              const daysWaiting = daysBetweenISO(todayISOVN(new Date(x.savedAt)), today);
              return (
                <li key={x.id} className="clay flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/hoc-sinh/hoat-dong/${a.id}`} className="focus-ring min-w-0 rounded">
                    <p className="truncate text-sm font-bold text-ink-800">{a.title}</p>
                    <p className="truncate text-xs font-medium text-ink-400">
                      {getDomain(a.domain)?.name} ·{" "}
                      {daysWaiting <= 0 ? "để dành hôm nay" : `để dành ${daysWaiting} ngày trước`}
                      {daysWaiting >= 3 ? " · đừng quên nhé!" : ""}
                    </p>
                  </Link>
                  <form action={removeSavedAction} className="shrink-0">
                    <input type="hidden" name="activityId" value={a.id} />
                    <button
                      type="submit"
                      aria-label={`Bỏ ${a.title} khỏi danh sách để dành`}
                      className="focus-ring rounded-full px-3 py-1.5 text-xs font-bold text-ink-500 hover:text-ink-800"
                    >
                      Bỏ
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2.5 text-sm font-extrabold uppercase tracking-[0.06em] text-ink-500">
          Hoạt động đã hoàn thành ({logs.length})
        </h2>
        <p className="mb-2.5 -mt-1 text-sm font-medium text-ink-500">
          Bấm vào một hoạt động để xem lại phần em đã viết.
        </p>

        {logs.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-3xl" aria-hidden>
              🌱
            </p>
            <p className="pretty mt-2 text-sm font-medium text-ink-500">
              Em chưa hoàn thành hoạt động nào. Làm hoạt động đầu tiên ở trên nhé!
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {logs.slice(0, 10).map((log) => {
              const activity = activities.find((a) => a.id === log.activityId);
              const logDomain = activity ? getDomain(activity.domain) : null;
              const isToday = log.date === today;
              return (
                <li key={log.id}>
                  {/* Bam vao de XEM LAI chi tiet (de bai + sao + phan da viet).
                      Ban ghi cua HOM NAY con sua duoc; ngay cu chi xem. */}
                  <Link
                    href={`/hoc-sinh/hoat-dong/${log.activityId}`}
                    className="clay clay-press focus-ring flex items-center justify-between gap-3 px-4 py-3.5
                               hover:border-brand-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink-800">{activity?.title ?? "Hoạt động"}</p>
                      <p className="truncate text-xs font-medium text-ink-400">
                        {logDomain?.name} · {new Date(log.date).toLocaleDateString("vi-VN")}
                        {log.isExtra ? " · khám phá thêm" : ""}
                        {log.source === "offline_sync" ? " · đồng bộ offline" : ""}
                        {isToday ? " · sửa được" : ""}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span aria-label={`${log.interestRating} trên 5 sao`} className="text-sm">
                        <span className="text-ochre-500">{"★".repeat(log.interestRating)}</span>
                        <span className="text-ink-300">{"★".repeat(TYPE_STARS - log.interestRating)}</span>
                      </span>
                      <LacArrow className="h-3 w-5 text-brand-600" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
