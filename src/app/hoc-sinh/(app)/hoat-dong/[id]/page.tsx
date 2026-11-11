import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { forTerm } from "@/lib/curriculum";
import { getDomain } from "@/lib/domains";
import { getStudentTerm } from "@/lib/profile-service";
import { todayISOVN } from "@/lib/date";
import { youtubeEmbedUrl, youtubeSearchUrl } from "@/lib/media";
import { MAX_EXTRA_PER_DAY, MAX_SAVED_ACTIVITIES, pickExtraActivities } from "@/lib/recommendation/daily-pick";
import { buildActivityFeedback, CONFIDENCE_OPTIONS, DIFFICULTY_OPTIONS } from "@/lib/recommendation/feedback";
import { logRecommendationEvents } from "@/lib/recommendation/events";
import type { ActivityLog, Resource } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { LacArrow } from "@/components/ui/Motifs";
import { ResourceList } from "@/components/student/ResourceList";
import { ExtraActivityLinks } from "@/components/student/ExtraActivityLinks";
import { ActivityFeedbackForm } from "./ActivityFeedbackForm";
import { QuizSection } from "./QuizSection";
import { removeSavedAction, saveForLaterAction } from "../actions";

const STAR_TOTAL = 5;

const RATING_LABEL: Record<number, string> = {
  1: "Không thích",
  2: "Bình thường",
  3: "Khá thích",
  4: "Thích",
  5: "Rất thích!",
};

const DIFFICULTY_ORDER: Record<Resource["difficulty"], number> = { de: 0, trung_binh: 1, nang_cao: 2 };

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; updated?: string; "loi-quiz"?: string }>;
}) {
  const { id } = await params;
  const { done, updated, "loi-quiz": quizError } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const [activities, logs, saved, resources, quizAttempts] = await Promise.all([
    repo.listActivities(),
    repo.listActivityLogsByStudent(session.id),
    repo.listSavedActivities(session.id),
    repo.listResources(),
    repo.listQuizAttempts([session.id]),
  ]);
  const activity = activities.find((a) => a.id === id);
  if (!activity) notFound();

  const domain = getDomain(activity.domain);
  const today = todayISOVN();

  // Doi chieu quy tac trong src/lib/actions/activity-log.ts: ban ghi dau tien
  // trong ngay la hoat dong chinh, sau do toi da MAX_EXTRA_PER_DAY hoat dong them.
  const logToday = logs.find((l) => l.date === today && l.activityId === id) ?? null;
  const logsToday = logs.filter((l) => l.date === today);
  const dailyLimitReached = logsToday.length > MAX_EXTRA_PER_DAY;
  const extrasLeft = MAX_EXTRA_PER_DAY + 1 - logsToday.length;
  const lastPastLog =
    [...logs].filter((l) => l.activityId === id && l.date !== today).sort((a, b) => b.date.localeCompare(a.date))[0] ??
    null;

  const isSaved = saved.some((x) => x.activityId === id);
  const canSave = !logToday && !isSaved && saved.length < MAX_SAVED_ACTIVITIES && activity.active;

  // Phan hoi theo ngu canh (feedback.ts) - suy ra tu CHINH ban ghi da luu, nen
  // quay lai trang bao nhieu lan cung thay dung loi phan hoi do.
  const feedback = logToday && domain ? buildActivityFeedback(logToday, domain) : null;
  const extras = feedback
    ? pickExtraActivities(forTerm(activities, await getStudentTerm(session.id, repo)), logs, session.id, today, feedback.focusDomain)
    : [];
  if (!dailyLimitReached) {
    await logRecommendationEvents(session.id, [
      ...extras.map((a) => ({ activityId: a.id, event: "shown_extra" as const })),
      // Em mo trang ma form phan hoi con trong (de xuat A5): opened ma khong completed trong ngay = bo do.
      ...(logToday ? [] : [{ activityId: activity.id, event: "opened" as const }]),
    ]);
  }
  const domainResources = resources
    .filter((r) => r.domain === activity.domain)
    .sort((a, b) => (feedback?.showHelp ? DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] : 0))
    .slice(0, 2);

  return (
    <div className="space-y-5">
      {feedback && (
        <Card className="animate-clay-rise bg-status-success-wash p-6">
          {(done === "1" || updated === "1") && (
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-status-success">
              {done === "1" ? "Đã lưu hoạt động" : "Đã lưu thay đổi"}
            </p>
          )}
          <h2 className="balance text-lg font-extrabold text-status-success-deep">{feedback.title}</h2>
          <p className="pretty mt-1.5 text-sm font-semibold leading-relaxed text-status-success">{feedback.message}</p>

          {domainResources.length > 0 && (
            <>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.06em] text-status-success">
                {feedback.showHelp ? "Tài liệu dễ để thử lại" : "Tìm hiểu thêm"}
              </p>
              <ResourceList resources={domainResources} />
            </>
          )}
        </Card>
      )}

      {/* Cau hoi on nhanh chi hien SAU khi em da lam xong hoat dong hom nay (de xuat A5 buoc 2). */}
      {feedback && activity.quiz.length > 0 && (
        <QuizSection
          activity={activity}
          studentId={session.id}
          attempt={quizAttempts.find((a) => a.activityId === activity.id && a.date === today) ?? null}
          openedAt={new Date().toISOString()}
          invalid={quizError === "1"}
        />
      )}

      {feedback && (
        <Card className="p-6">
          <CardTitle>Khám phá thêm hôm nay</CardTitle>
          {dailyLimitReached || extras.length === 0 ? (
            <p className="pretty mt-1.5 text-sm font-medium text-ink-500">
              Hôm nay em đã làm đủ số hoạt động rồi. Mai quay lại khám phá tiếp nhé!
            </p>
          ) : (
            <>
              <p className="pretty mt-1 text-sm font-medium text-ink-500">
                Hôm nay em còn {extrasLeft} lượt khám phá thêm, không bắt buộc.
              </p>
              <ExtraActivityLinks activities={extras} />
            </>
          )}
        </Card>
      )}

      <Card className="animate-clay-rise p-6">
        {domain && (
          <Badge colorHex={domain.colorHex} className="mb-3">
            {domain.icon} {domain.name}
          </Badge>
        )}
        <h1 className="balance text-xl font-extrabold tracking-[-0.02em] text-ink-900">{activity.title}</h1>
        <p className="pretty mt-1.5 text-sm font-medium leading-relaxed text-ink-600">{activity.description}</p>

        <ol className="mt-5 space-y-3">
          {activity.instructions.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm font-medium leading-relaxed text-ink-700">
              <span
                className="nums grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100
                           text-xs font-extrabold text-brand-700 shadow-clay-sm"
              >
                {idx + 1}
              </span>
              <span className="pretty pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {activity.example && (
          <div className="clay-sunken mt-5 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.06em] text-brand-600">💡 Ví dụ tham khảo</p>
            <p className="pretty mt-1 text-sm font-medium leading-relaxed text-ink-700">
              {activity.example.replace(/^Ví dụ:\s*/, "")}
            </p>
          </div>
        )}

        {activity.mediaUrl ? (
          <ActivityMedia url={activity.mediaUrl} title={activity.title} />
        ) : (
          <a
            href={youtubeSearchUrl(activity.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring mt-4 inline-block rounded text-sm font-bold text-brand-600 hover:underline"
          >
            🎬 Xem video hướng dẫn cách làm trên YouTube ↗
          </a>
        )}

        <p className="clay-sunken mt-5 block w-fit px-3.5 py-2 text-xs font-bold text-ink-500">
          ⏱ Khoảng {activity.durationMinutes} phút
        </p>
      </Card>

      {!logToday && (isSaved || canSave) && (
        <form action={isSaved ? removeSavedAction : saveForLaterAction}>
          <input type="hidden" name="activityId" value={activity.id} />
          {isSaved ? (
            <div className="clay flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm font-semibold text-ink-700">📌 Em đã để dành hoạt động này để làm sau.</p>
              <Button type="submit" variant="ghost">
                Bỏ khỏi danh sách
              </Button>
            </div>
          ) : (
            <Button type="submit" variant="ghost" className="w-full">
              📌 Cần chuẩn bị? Để dành làm sau
            </Button>
          )}
        </form>
      )}

      {logToday ? (
        <>
          <Card className="bg-brand-100">
            <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
              Em đã làm hoạt động này hôm nay. Em có thể sửa phần trả lời, bài cũ sẽ được cập nhật chứ không
              tính thành lần làm mới.
            </p>
          </Card>
          <ActivityFeedbackForm
            studentId={session.id}
            activityId={activity.id}
            reflectionPrompt={activity.reflectionPrompt}
            defaultRating={logToday.interestRating}
            defaultReflection={logToday.reflectionText}
            defaultConfidence={logToday.confidence}
            defaultDifficulty={logToday.difficulty}
            defaultNote={logToday.note}
            mode="edit"
          />
        </>
      ) : dailyLimitReached ? (
        <>
          <Card className="bg-status-warning-wash">
            <p className="pretty text-sm font-semibold leading-relaxed text-status-warning">
              Hôm nay em đã làm đủ {MAX_EXTRA_PER_DAY + 1} hoạt động rồi. Em có thể để dành hoạt động này, mai quay
              lại làm nhé.
            </p>
          </Card>
          {lastPastLog && <PastRecord log={lastPastLog} />}
        </>
      ) : (
        <>
          {lastPastLog && <PastRecord log={lastPastLog} />}
          {logsToday.length > 0 && (
            <Card className="bg-brand-100">
              <p className="pretty text-sm font-semibold leading-relaxed text-brand-800">
                Đây là hoạt động <strong className="font-extrabold">khám phá thêm</strong> của em hôm nay (còn{" "}
                {extrasLeft} lượt).
              </p>
            </Card>
          )}
          {lastPastLog && (
            <h2 className="pt-1 text-sm font-extrabold uppercase tracking-[0.06em] text-ink-500">
              Làm lại hoạt động này hôm nay
            </h2>
          )}
          <ActivityFeedbackForm studentId={session.id} activityId={activity.id} reflectionPrompt={activity.reflectionPrompt} />
        </>
      )}

      <LinkButton href="/hoc-sinh/hoat-dong" variant="secondary" className="w-full">
        <LacArrow className="h-3 w-5 shrink-0 rotate-180" />
        Về danh sách hoạt động
      </LinkButton>
    </div>
  );
}

/** Anh hoac video YouTube giao vien dan vao (src/lib/media.ts da kiem tra http(s)). */
function ActivityMedia({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <div className="mt-5 aspect-video overflow-hidden rounded-clay-sm shadow-clay-sm">
        <iframe
          src={embed}
          title={`Video hướng dẫn: ${title}`}
          className="h-full w-full"
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  return (
    // Anh tu domain bat ky do giao vien dan -> khong dung next/image (can khai bao remotePatterns truoc).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Hình minh họa: ${title}`} loading="lazy" className="mt-5 w-full rounded-clay-sm shadow-clay-sm" />
  );
}

/** Ban ghi cua NGAY DA QUA - chi doc, khong sua duoc. */
function PastRecord({ log }: { log: ActivityLog }) {
  const confidence = CONFIDENCE_OPTIONS.find((o) => o.value === log.confidence)?.label;
  const difficulty = DIFFICULTY_OPTIONS.find((o) => o.value === log.difficulty)?.label;
  return (
    <Card className="p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-ink-400">
        Lần trước em đã làm · {new Date(log.date).toLocaleDateString("vi-VN")}
      </p>

      <div className="clay-sunken mt-3 inline-flex items-center gap-2 px-3.5 py-2">
        <span aria-label={`${log.interestRating} trên ${STAR_TOTAL} sao`} className="text-base">
          <span className="text-ochre-500">{"★".repeat(log.interestRating)}</span>
          <span className="text-ink-300">{"★".repeat(STAR_TOTAL - log.interestRating)}</span>
        </span>
        <span className="text-xs font-bold text-ink-500">{RATING_LABEL[log.interestRating]}</span>
      </div>

      {(confidence || difficulty) && (
        <p className="mt-3 text-sm font-semibold text-ink-500">
          {confidence && <>Tự đánh giá: {confidence}</>}
          {confidence && difficulty && " · "}
          {difficulty && <>Độ khó: {difficulty}</>}
        </p>
      )}

      {log.reflectionText.trim() || log.note.trim() ? (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-bold text-ink-500">Cảm nhận của em</p>
          {log.reflectionText.trim() && (
            <p className="pretty clay-sunken px-4 py-3 text-sm font-medium leading-relaxed text-ink-700">
              {log.reflectionText}
            </p>
          )}
          {log.note.trim() && (
            <p className="pretty clay-sunken px-4 py-3 text-sm font-medium leading-relaxed text-ink-700">{log.note}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm font-medium text-ink-400">Lần đó em không viết gì thêm.</p>
      )}

      <p className="mt-4 text-sm font-medium text-ink-500">
        Bản ghi của ngày đã qua chỉ để xem lại, không sửa được nữa.
      </p>
    </Card>
  );
}
