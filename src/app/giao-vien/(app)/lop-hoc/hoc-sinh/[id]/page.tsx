import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { getDomain } from "@/lib/domains";
import { DomainScoreChart } from "@/components/student/DomainScoreChart";
import { Card, CardTitle } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Badge } from "@/components/ui/Badge";
import { LacArrow } from "@/components/ui/Motifs";
import { CONFIDENCE_OPTIONS, DIFFICULTY_OPTIONS, FEELING_OPTIONS, isMixedSignal } from "@/lib/recommendation/feedback";
import { DOMAINS } from "@/lib/domains";
import { TERM_INFO, TRACK_LABEL, TRACK_REASON_TEXT } from "@/lib/curriculum";
import { ProfileHistory } from "@/components/ProfileHistory";
import { InsightSourceNote } from "@/components/InsightSourceNote";
import { Button } from "@/components/ui/Button";
import { requireTeacher } from "@/lib/auth/session";
import { MAX_SAME_POSITION_RUN, MIN_SECONDS_PER_QUESTION, surveyAttemptFlags } from "@/lib/survey";
import { submitTeacherReviewAction } from "./actions";

const STAR_TOTAL = 5;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

const RATING_LABEL: Record<number, string> = {
  1: "Không thích",
  2: "Bình thường",
  3: "Khá thích",
  4: "Thích",
  5: "Rất thích!",
};

// ============================================================================
// CHI TIET MOT HOC SINH (danh cho giao vien)
// ----------------------------------------------------------------------------
// Ly do co trang nay: phan hoi hoc sinh viet sau moi hoat dong
// (activity_logs.reflection_text) truoc day KHONG hien thi o bat ky dau trong
// phan he giao vien - hoc sinh viet ma khong ai doc, va o do cung khong tham
// gia cham diem. Trang nay lam cho viec viet co y nghia: giao vien doc duoc
// hoc sinh dang nghi gi sau tung hoat dong.
//
// BAO MAT DU LIEU TRE EM: bat buoc kiem tra hoc sinh co thuoc TRUONG cua giao
// vien dang dang nhap hay khong. Khong duoc chi dua vao "co session giao vien"
// - nhu vay giao vien truong A go id se doc duoc hoc sinh truong B.
// ============================================================================
export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ "da-danh-gia"?: string }>;
}) {
  const { id } = await params;
  const reviewed = (await searchParams)["da-danh-gia"] === "1";
  const session = await requireTeacher();

  const repo = getRepository();
  const student = await repo.getStudent(id);
  if (!student) notFound();

  // --- Kiem tra quyen: hoc sinh phai thuoc mot lop cua TRUONG nay ---
  const classes = await repo.listClasses(session.schoolId);
  const classGroup = classes.find((c) => c.id === student.classId);
  if (!classGroup) notFound(); // khong thuoc truong nay -> coi nhu khong ton tai

  const [profile, logs, activities, attempts, questions, saved, snapshots, labels, quizAttempts] = await Promise.all([
    repo.getProfile(student.id),
    repo.listActivityLogsByStudent(student.id),
    repo.listActivities(),
    repo.listSurveyAttempts([student.id]),
    repo.listSurveyQuestions(),
    repo.listSavedActivities(student.id),
    repo.listSnapshots(student.id),
    repo.listOutcomeLabels([student.id]),
    repo.listQuizAttempts([student.id]),
  ]);
  const responses = attempts.at(-1)?.responses ?? [];
  const myReview = labels.find(
    (l) => l.rater === "teacher" && l.raterId === session.id && l.topDomains.join() === profile?.topDomains.join()
  );
  // Nhan moi nhat truoc tien (listOutcomeLabels sap xep giam dan theo thoi gian).
  const studentLabel = labels.find((l) => l.rater === "student" && l.labelPhase === "post_result" && l.agreement !== null);
  const selfPick = labels.find((l) => l.rater === "student" && l.labelPhase === "pre_result");

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const extraCount = logs.filter((l) => l.isExtra).length;
  // Tin hieu can giao vien ho tro: chon "Hoi kho, em can nguoi huong dan" hoac tu danh gia "Chua lam duoc".
  const needHelpCount = logs.filter((l) => l.reflectionText === FEELING_OPTIONS[3] || l.confidence === 1).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/giao-vien/lop-hoc?classId=${classGroup.id}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded text-sm font-bold text-brand-600 hover:underline"
        >
          <LacArrow className="h-2.5 w-4 shrink-0 rotate-180" />
          Lớp {classGroup.name}
        </Link>
        <h1 className="balance mt-2 text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          {student.displayName}
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-500">
          Mã đăng nhập <span className="nums font-bold text-ink-700">{student.studentCode}</span> · Lớp{" "}
          {classGroup.name} ·{" "}
          {student.parentConsentConfirmed ? (
            <span className="font-bold text-status-success">đã có xác nhận phụ huynh</span>
          ) : (
            <span className="font-bold text-status-warning">chưa có xác nhận phụ huynh</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Câu khảo sát đã trả lời" value={responses.length} />
        <StatTile label="Hoạt động đã làm" value={logs.length} hint={`${extraCount} lần tự nguyện làm thêm`} />
        <StatTile label="Lần cần hỗ trợ" value={needHelpCount} hint={`${saved.length} hoạt động đang để dành`} />
        <StatTile
          label="Khảo sát"
          value={profile?.surveyCompleted ? "Xong" : "Chưa"}
        />
      </div>

      {profile?.surveyCompleted && profile.scores.length > 0 ? (
        <DomainScoreChart
          scores={profile.scores}
          activityCount={profile.activitiesCompletedCount}
          title="Hồ sơ sở thích của học sinh"
          subtitle={
            profile.updatedAt
              ? `Cập nhật lần cuối: ${new Date(profile.updatedAt).toLocaleString("vi-VN")}`
              : undefined
          }
        />
      ) : (
        <Card className="p-6">
          <CardTitle>Chưa có hồ sơ sở thích</CardTitle>
          <p className="pretty mt-1 text-sm font-medium text-ink-500">
            Học sinh cần hoàn thành bài khảo sát đầu vào trước.
          </p>
        </Card>
      )}

      {profile?.track && (
        <Card>
          <CardTitle>Hướng sau lớp 9 (chỉ thầy cô xem)</CardTitle>
          <p className="mt-1.5 text-sm font-bold text-ink-800">{TRACK_LABEL[profile.track.recommendedTrack].long}</p>
          <p className="pretty mt-1 text-sm font-medium text-ink-600">{TRACK_REASON_TEXT[profile.track.reason]}</p>
          <div className="mt-3 grid grid-cols-3 gap-3.5">
            <StatTile label="Mức nghiêng thực hành" value={Math.round(profile.track.lean)} hint="50 = cân bằng" />
            <StatTile label="Thiên hướng thực hành" value={Math.round(profile.track.vocationalAffinity)} />
            <StatTile label="Thiên hướng học thuật" value={Math.round(profile.track.academicAffinity)} />
          </div>
          <p className="pretty mt-3 text-xs font-medium text-ink-400">
            Thang 0–100 so với người chọn ngẫu nhiên (50 = ngang chọn bừa). Mức nghiêng dưới 10 là nghiêng học thuật, trên 90 là
            nghiêng thực hành. Chỉ tính từ bài khảo sát, học kỳ {TERM_INFO[classGroup.curriculumTerm].label}.
            Hệ thống không biết điều kiện gia đình, sức khỏe hay kết quả học tập của em: đây là gợi ý để thầy cô trao đổi
            với em và gia đình, không phải kết luận. Học sinh không thấy nhãn này.
          </p>
        </Card>
      )}

      {profile?.lastInsight && (
        <Card>
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-600">
            Nhận xét hệ thống đang hiển thị cho học sinh
          </p>
          <p className="pretty text-sm font-medium leading-relaxed text-ink-700">{profile.lastInsight}</p>
          <InsightSourceNote provenance={profile.insightProvenance} />
        </Card>
      )}

      {profile?.surveyCompleted && (
        <Card>
          <CardTitle>Thầy cô đánh giá kết quả</CardTitle>
          <p className="pretty mt-1 text-xs font-medium text-ink-400">
            Dùng để kiểm chứng hệ thống gợi ý có đúng không (so với nhận định của thầy cô và của chính học sinh).
            {studentLabel &&
              ` Học sinh tự đánh giá (sau khi xem kết quả): ${["", "chưa giống", "giống một phần", "giống em"][studentLabel.agreement!]}.`}
            {selfPick &&
              ` Trước khi xem kết quả, em tự chọn: ${selfPick.preferredDomains.map((c) => getDomain(c)?.name).join(", ")}.`}
          </p>
          {myReview || reviewed ? (
            <p className="mt-3 text-sm font-semibold text-ink-600">
              Thầy cô đã đánh giá 3 nhóm đứng đầu hiện tại
              {myReview ? `: ${["", "không phù hợp", "phù hợp một phần", "phù hợp"][myReview.agreement ?? 0]}` : ""}.
            </p>
          ) : (
            <form action={submitTeacherReviewAction} className="mt-3 space-y-3">
              <input type="hidden" name="studentId" value={student.id} />
              <label className="block text-sm font-medium text-ink-600">
                3 nhóm đứng đầu có phù hợp với em này không? Nhóm thầy cô thấy phù hợp nhất (không bắt buộc):
                <select name="preferredDomain" defaultValue="" className="clay-input mt-1.5">
                  <option value="">Chưa rõ</option>
                  {DOMAINS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="submit" name="agreement" value="3" variant="secondary">
                  Phù hợp
                </Button>
                <Button type="submit" name="agreement" value="2" variant="secondary">
                  Phù hợp một phần
                </Button>
                <Button type="submit" name="agreement" value="1" variant="secondary">
                  Không phù hợp
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {quizAttempts.length > 0 && (
        <Card>
          <CardTitle>Câu hỏi ôn nhanh sau hoạt động ({quizAttempts.length} lần)</CardTitle>
          <p className="pretty mt-1 text-xs font-medium text-ink-400">
            Em thấy điểm của mình, nhưng điểm không tính vào hồ sơ sở thích. Làm quá nhanh thì điểm khó nói lên em đã hiểu
            hay chưa.
          </p>
          <ul className="mt-3 space-y-1.5">
            {[...quizAttempts].sort((a, b) => b.date.localeCompare(a.date)).map((q) => {
              const seconds = q.startedAt && q.finishedAt ? (Date.parse(q.finishedAt) - Date.parse(q.startedAt)) / 1000 : null;
              return (
                <li key={q.id} className="clay-sunken px-4 py-2 text-sm">
                  <span className="font-bold text-ink-800">{activities.find((a) => a.id === q.activityId)?.title ?? q.activityId}</span>
                  <span className="nums text-xs font-medium text-ink-500">
                    {" "}
                    · {q.date} · đúng {q.nCorrect}/{q.nQuestions}
                    {seconds !== null && ` · ${formatDuration(seconds)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {attempts.length > 0 && (
        <Card>
          <CardTitle>Các lần làm khảo sát ({attempts.length})</CardTitle>
          <p className="pretty mt-1 text-xs font-medium text-ink-400">
            T1 = lần đầu, T2… = đợt khảo sát lại thầy cô mở cho lớp (cả hai đều là bài trống). Cờ ⚠ chỉ để thầy cô hỏi
            lại em có hiểu câu hỏi không. Bài vẫn được tính và cờ này không phải đánh giá học sinh.
          </p>
          <ul className="mt-3 space-y-2">
            {[...attempts].reverse().map((a) => {
              const f = surveyAttemptFlags(a, questions);
              return (
                <li key={a.id} className="clay-sunken px-4 py-2.5 text-sm">
                  <span className="font-bold text-ink-800">{a.measurementWave ?? "Làm lại (đáp án cũ chọn sẵn)"}</span>
                  <span className="nums text-xs font-medium text-ink-500">
                    {" "}
                    · {new Date(a.completedAt).toLocaleString("vi-VN")}
                    {f.seconds !== null && ` · làm trong ${formatDuration(f.seconds)}`}
                  </span>
                  {(f.tooFast || f.samePosition) && (
                    <p className="mt-1 text-xs font-semibold text-status-warning">
                      {f.tooFast &&
                        `⚠ Làm rất nhanh (dưới ${MIN_SECONDS_PER_QUESTION} giây/câu${
                          f.fastAnswers ? `: ${f.fastAnswers}/${a.responses.length} câu chọn chưa tới ${MIN_SECONDS_PER_QUESTION} giây sau câu trước` : ""
                        }). `}
                      {f.samePosition &&
                        `⚠ ${f.longestSamePositionRun} câu liền chọn cùng một vị trí đáp án (ngưỡng ${MAX_SAME_POSITION_RUN}).`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ProfileHistory snapshots={snapshots} />

      <section>
        <h2 className="mb-1 text-sm font-extrabold uppercase tracking-[0.06em] text-ink-500">
          Phản hồi sau từng hoạt động ({logs.length})
        </h2>
        <p className="pretty mb-2.5 text-xs font-medium text-ink-400">
          Chỉ <strong className="font-bold">số sao</strong> được tính vào hồ sơ. Cảm nhận, mức tự tin, độ khó
          (bấm chọn) và phần tự viết đều <strong className="font-bold">không bắt buộc</strong>. Các phần này dùng để hệ
          thống phản hồi học sinh ngay sau hoạt động và để thầy cô biết em nào cần hỗ trợ.
        </p>

        {sortedLogs.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm font-medium text-ink-400">Học sinh chưa làm hoạt động nào.</p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {sortedLogs.map((log) => {
              const activity = activities.find((a) => a.id === log.activityId);
              const domain = activity ? getDomain(activity.domain) : null;
              return (
                <li key={log.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-800">{activity?.title ?? "Hoạt động"}</p>
                        <p className="nums mt-0.5 text-xs font-medium text-ink-400">
                          {new Date(log.date).toLocaleDateString("vi-VN")}
                          {log.isExtra ? " · tự nguyện làm thêm" : ""}
                          {log.source === "offline_sync" ? " · đồng bộ offline" : ""}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        {domain && <Badge colorHex={domain.colorHex}>{domain.name}</Badge>}
                        <span
                          className="whitespace-nowrap text-sm"
                          aria-label={`${log.interestRating} trên ${STAR_TOTAL} sao - ${RATING_LABEL[log.interestRating]}`}
                        >
                          <span className="text-ochre-500">{"★".repeat(log.interestRating)}</span>
                          <span className="text-ink-300">{"★".repeat(STAR_TOTAL - log.interestRating)}</span>
                        </span>
                      </span>
                    </div>

                    {isMixedSignal(log) && (
                      <p className="mt-3 rounded-clay-sm bg-status-warning-wash px-3 py-2 text-xs font-semibold text-status-warning">
                        ⚠ Số sao và phần trả lời không khớp nhau, nên hỏi thêm em.
                      </p>
                    )}
                    {(log.confidence || log.difficulty) && (
                      <p className="mt-3 text-xs font-semibold text-ink-500">
                        {log.confidence && (
                          <>Tự đánh giá: {CONFIDENCE_OPTIONS.find((o) => o.value === log.confidence)?.label}</>
                        )}
                        {log.confidence && log.difficulty && " · "}
                        {log.difficulty && <>Độ khó: {DIFFICULTY_OPTIONS.find((o) => o.value === log.difficulty)?.label}</>}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-bold text-ink-500">Cảm nhận của em</p>
                    {log.reflectionText.trim() || log.note.trim() ? (
                      <div className="mt-1.5 space-y-1.5">
                        {log.reflectionText.trim() && (
                          <p className="pretty clay-sunken px-4 py-3 text-sm font-medium leading-relaxed text-ink-700">
                            {log.reflectionText}
                          </p>
                        )}
                        {log.note.trim() && (
                          <p className="pretty clay-sunken px-4 py-3 text-sm font-medium leading-relaxed text-ink-700">
                            ✍️ {log.note}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-sm font-medium text-ink-400">Học sinh không viết gì thêm.</p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
