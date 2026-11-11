import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { getDomain } from "@/lib/domains";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TERM_INFO } from "@/lib/curriculum";
import { updateQuestionAction } from "./actions";

export default async function SurveyQuestionsPage() {
  const session = await requireTeacher();

  const repo = getRepository();
  const [allQuestions, audit, teachers] = await Promise.all([
    repo.listSurveyQuestions(),
    repo.listAuditLog(20),
    repo.listTeachers(session.schoolId),
  ]);
  const teacherName = new Map(teachers.map((t) => [t.id, t.fullName]));
  // Cau da thay (doi nghia, 11/2026) khong con hien cho hoc sinh - chi giu de doc lai cau tra loi cu.
  const questions = allQuestions.filter((q) => q.active);
  const nRetired = allQuestions.length - questions.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Quản lý câu hỏi khảo sát
        </h1>
        <p className="pretty mt-1 max-w-[75ch] text-sm font-medium leading-relaxed text-ink-500">
          Toàn bộ khảo sát là <strong className="font-bold text-ink-700">câu hỏi trắc nghiệm</strong>: mỗi câu có
          4 phương án, học sinh chỉ chọn 1 và không phải viết gì. Trang này dùng để{" "}
          <strong className="font-bold text-ink-700">sửa chữ</strong> cho hợp với trường mình. Các ô bên dưới là
          nơi thầy cô gõ lại nội dung, không phải câu tự luận của học sinh.
        </p>
        <p className="pretty mt-2 max-w-[75ch] text-sm font-medium leading-relaxed text-ink-500">
          Trọng số nhóm lĩnh vực bên phải mỗi phương án không sửa ở đây, để cách tính điểm giữ nguyên cho mọi
          học sinh.
        </p>
        <p className="pretty mt-2 max-w-[75ch] text-sm font-medium leading-relaxed text-ink-500">
          Câu ghi <strong className="font-bold text-ink-700">Mọi học kỳ</strong> là bộ câu chung; câu ghi tên học kỳ
          chỉ hiện cho lớp đang ở học kỳ đó (đổi học kỳ ở trang Lớp học). Chỉ sửa chữ cho dễ hiểu, không đổi ý của
          phương án: câu trả lời cũ của học sinh vẫn tính theo phương án đó.
          {nRetired > 0 && ` Có ${nRetired} câu cũ đã được thay (không còn hiện cho học sinh).`}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <form action={updateQuestionAction} className="space-y-3">
              <input type="hidden" name="questionId" value={q.id} />
              <CardTitle>
                Câu {idx + 1} · {q.curriculumTerm === "ALL" ? "Mọi học kỳ" : TERM_INFO[q.curriculumTerm].label}
              </CardTitle>
              <label
                htmlFor={`scenario-${q.id}`}
                className="block text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400"
              >
                Tình huống
              </label>
              <textarea
                id={`scenario-${q.id}`}
                name="scenario"
                defaultValue={q.scenario}
                rows={2}
                aria-label={`Nội dung tình huống câu ${idx + 1}`}
                className="clay-input resize-y font-semibold"
              />
              <p className="pt-1 text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400">
                {q.options.length} phương án, học sinh chọn 1
              </p>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  const domainBadges = Object.entries(opt.domainWeights);
                  const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                  return (
                    <div
                      key={opt.id}
                      className="flex flex-col gap-2 rounded-clay-sm bg-clay-bg p-2.5 sm:flex-row sm:items-center"
                    >
                      {/* Chu cai A/B/C/D cho thay ngay day la 4 phuong an cua MOT
                          cau trac nghiem, khong phai 4 cau tu luan roi rac. */}
                      <span
                        aria-hidden
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100
                                   text-xs font-extrabold text-brand-700 shadow-clay-sm"
                      >
                        {letter}
                      </span>
                      <input
                        name={`option_${opt.id}`}
                        defaultValue={opt.text}
                        aria-label={`Nội dung phương án ${letter} của câu ${idx + 1}`}
                        className="clay-input flex-1 py-2.5"
                      />
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {domainBadges.map(([code, weight]) => {
                          const d = getDomain(code);
                          return (
                            <Badge key={code} colorHex={d?.colorHex}>
                              {d?.name ?? code} (+{weight})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button type="submit" variant="secondary">
                Lưu thay đổi
              </Button>
            </form>
          </Card>
        ))}
      </div>

      <Card>
        <CardDescription>
          Muốn thêm, bớt câu hỏi hoặc đổi trọng số nhóm lĩnh vực, thầy cô báo nhóm phát triển. Thay đổi này ảnh
          hưởng tới cách tính điểm của mọi học sinh nên cần kiểm tra trước khi áp dụng.
        </CardDescription>
      </Card>
      <Card>
        <CardTitle>Lịch sử chỉnh sửa nội dung</CardTitle>
        <CardDescription className="mt-1">
          Mọi thay đổi câu hỏi, hoạt động, tài nguyên đều được ghi lại (ai sửa, sửa gì, khi nào) kèm bản trước khi
          sửa. Câu trả lời của học sinh lưu kèm phiên bản bộ câu hỏi lúc trả lời, nên sửa chữ không làm mất dấu dữ
          liệu cũ.
        </CardDescription>
        {audit.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-ink-400">Chưa có thay đổi nào.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {audit.map((e) => (
              <li key={e.id} className="clay-sunken flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                <span className="font-semibold text-ink-700">
                  {{ create: "Thêm", update: "Sửa", delete: "Xóa" }[e.action]}{" "}
                  {{ survey_question: "câu hỏi", activity: "hoạt động", resource: "tài nguyên" }[e.entityType]}{" "}
                  <span className="nums">{e.entityId}</span>
                </span>
                <span className="nums font-medium text-ink-400">
                  {new Date(e.createdAt).toLocaleString("vi-VN")} · {teacherName.get(e.actorId) ?? "giáo viên đã xóa"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
