import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { TERM_INFO } from "@/lib/curriculum";
import { DOMAINS } from "@/lib/domains";
import { getStudentSurvey } from "@/lib/profile-service";
import { optionsInDisplayOrder, pendingRetestWave, questionsInDisplayOrder } from "@/lib/survey";
import { AnswerTimer } from "@/components/student/AnswerTimer";
import { FormDraft } from "@/components/student/FormDraft";
import { Button } from "@/components/ui/Button";
import { submitSurveyAction } from "./actions";

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ "lam-lai"?: string; dot?: string; loi?: string }>;
}) {
  const params = await searchParams;

  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const [{ term, questions }, attempts, profile, student] = await Promise.all([
    getStudentSurvey(session.id, repo),
    repo.listSurveyAttempts([session.id]),
    repo.getProfile(session.id),
    repo.getStudent(session.id),
  ]);

  // 3 che do: (1) KHAO SAT LAI theo dot giao vien mo (?dot=T2) - FORM TRONG, khong thay dap an cu
  // (dap an chon san lam test-retest do "em co luoi doi khong"). (2) LAM LAI tu nguyen (?lam-lai=1) -
  // dap an cu chon san de sua cau chua dung. Can y dinh ro rang de khong vo tinh vao lai bai khi bam
  // Back. (3) Lan dau / tra loi bo sung cau moi.
  const retestWave = params.dot ? pendingRetestWave(student ? await repo.getClass(student.classId) : null, attempts) : null;
  if (params.dot && params.dot !== retestWave) redirect("/hoc-sinh/ho-so"); // dot da dong hoac em da lam
  const isRetest = retestWave !== null;
  const isRetake = !isRetest && params["lam-lai"] === "1";
  if (profile?.surveyCompleted && !isRetake && !isRetest) {
    redirect("/hoc-sinh/ho-so");
  }
  // Bai FORM TRONG (lan dau, khao sat lai) la lan do: hoi them em tu thay minh giong nhom nao TRUOC khi xem ket qua.
  const isMeasurement = attempts.length === 0 || isRetest;
  if (isMeasurement) {
    // Ghi lan MO bai (de xuat A4): mo ma khong co lan nop cung dot = em bo do. Ghi loi khong duoc chan em lam bai.
    await repo.recordSurveyOpen(session.id, retestWave ?? "T1").catch((err) => console.error("[khao-sat] Khong ghi duoc lan mo:", err));
  }

  const existingResponses = isRetest ? [] : (attempts.at(-1)?.responses ?? []);
  const answered = new Map(existingResponses.map((r) => [r.questionId, r.optionId]));
  const unanswered = questions.filter((q) => !answered.has(q.id)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          {isRetest ? `Khảo sát lần ${retestWave!.slice(1)}` : isRetake ? "Làm lại bài khảo sát" : "Khảo sát khám phá bản thân"}
        </h1>
        {!isRetake && !isRetest && existingResponses.length > 0 && unanswered > 0 && (
          <p className="pretty mt-2 rounded-clay-sm bg-brand-100 px-3.5 py-2 text-sm font-semibold text-brand-800">
            {TERM_INFO[term].label} có {unanswered} câu hỏi mới. Các câu em đã làm vẫn giữ nguyên, em chỉ cần trả
            lời thêm các câu chưa chọn nhé.
          </p>
        )}
        {params.loi && (
          <p role="alert" className="mt-2 text-sm font-semibold text-status-error">
            {params.loi === "trong"
              ? "Em chưa chọn câu trả lời nào. Em chọn rồi bấm hoàn thành nhé."
              : "Bài khảo sát vừa được thầy cô cập nhật. Em tải lại trang rồi làm lại nhé."}
          </p>
        )}
        <p className="pretty mt-1.5 text-sm font-medium leading-relaxed text-ink-500">
          {isRetest
            ? `Thầy cô mời cả lớp làm lại bài khảo sát để kiểm tra các câu hỏi có ổn định không. Em chọn theo suy nghĩ hiện tại, không cần nhớ lần trước đã chọn gì. (${questions.length} câu)`
            : isRetake
              ? `Đáp án cũ của em đang được chọn sẵn. Em đổi những câu muốn đổi rồi bấm hoàn thành, hồ sơ sẽ tính lại theo đáp án mới. (${questions.length} câu)`
              : `Không có câu đúng hay sai, em chọn ý gần với mình nhất. (${questions.length} câu, khoảng 7–10 phút)`}
        </p>
      </div>

      <form action={submitSurveyAction} className="space-y-4">
        {/* Thoi diem mo trang (server ghi) -> thoi gian lam bai, de giao vien biet bai nao lam voi (de xuat A4). */}
        <input type="hidden" name="startedAt" value={new Date().toISOString()} />
        {isRetest && <input type="hidden" name="dot" value={retestWave!} />}
        {/* Thoi gian tung cau chi co nghia khi FORM TRONG (dap an cu chon san thi em khong can chon lai). */}
        {existingResponses.length === 0 && <AnswerTimer />}
        {/* Luu nhap tung cau tren may (het phien / mat song giua bai khong mat cau da chon). Khoa theo dot de bai
            khao sat lai (form trong) khong bi dien san dap an lan truoc. */}
        <FormDraft storageKey={`khao-sat:${session.id}:${retestWave ?? (isRetake ? "lam-lai" : "lan-dau")}`} />
        {/* Thu tu CAU va thu tu dap an deu xao theo tung hoc sinh (co dinh moi lan mo) - xem src/lib/survey.ts. */}
        {questionsInDisplayOrder(questions, session.id).map((q, idx) => (
          <fieldset key={q.id} className="clay above-grain p-5">
            <legend className="sr-only">
              Câu {idx + 1}. {q.scenario}
            </legend>

            <p aria-hidden className="mb-4 flex items-start gap-3">
              <span
                className="nums grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600
                           text-xs font-extrabold text-white shadow-clay-brand"
              >
                {idx + 1}
              </span>
              <span className="pretty pt-0.5 text-sm font-bold leading-relaxed text-ink-900">{q.scenario}</span>
            </p>

            <div className="space-y-2.5">
              {/* Thu tu dap an XAO theo tung hoc sinh (co dinh moi lan mo) - xem src/lib/survey.ts. */}
              {optionsInDisplayOrder(q, session.id).map((opt) => (
                /* Moi lua chon la mot phien dat set: binh thuong NOI len, khi
                   duoc chon thi LUN xuong + doi sang sac accent => hoc sinh
                   thay ro minh vua "bam" vao cai nao. */
                <label
                  key={opt.id}
                  className="group flex cursor-pointer items-start gap-3 rounded-clay-sm bg-clay-surface p-3.5
                             text-sm font-medium text-ink-700 shadow-clay-sm
                             transition-colors duration-150
                             hover:bg-clay-sunken
                             has-[:checked]:bg-brand-100 has-[:checked]:font-bold
                             has-[:checked]:text-brand-800 has-[:checked]:shadow-clay-inset
                             has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400
                             has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-clay-bg"
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt.id}
                    required
                    defaultChecked={answered.get(q.id) === opt.id}
                    className="sr-only"
                  />
                  {/* Dau tron tu ve de dong bo voi ngon ngu dat set. */}
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-clay-sunken
                               shadow-clay-inset transition-colors duration-200
                               group-has-[:checked]:bg-brand-600 group-has-[:checked]:shadow-clay-brand"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100" />
                  </span>
                  <span className="pretty leading-relaxed">{opt.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {isMeasurement && (
          <fieldset className="clay above-grain p-5">
            <legend className="sr-only">Câu cuối: theo em, em giống những nhóm nào nhất?</legend>
            <p aria-hidden className="text-sm font-bold leading-relaxed text-ink-900">
              Câu cuối: theo em, em giống những nhóm nào nhất?
            </p>
            <p className="pretty mt-1 text-sm font-medium leading-relaxed text-ink-500">
              Không bắt buộc. Chọn tối đa 3 nhóm, nhóm giống em nhất chọn trước. Câu này giúp thầy cô kiểm tra hệ
              thống có hiểu đúng em không.
            </p>
            <div className="mt-3 space-y-2.5">
              {[1, 2, 3].map((n) => (
                <label key={n} className="block text-sm font-medium text-ink-600">
                  Lựa chọn {n}
                  <select name="selfPick" defaultValue="" className="clay-input mt-1.5">
                    <option value="">— Không chọn —</option>
                    {DOMAINS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.icon} {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Nut nop dat o CUOI form, KHONG dung sticky: moi cau deu bat buoc
            nen hoc sinh chac chan cuon den day; mot nut noi lo lung se che mat
            noi dung cau hoi ben duoi. */}
        <div className="pt-2">
          <Button type="submit" className="w-full">
            {isRetake || isRetest ? "Lưu bài khảo sát mới" : "Hoàn thành khảo sát"}
          </Button>
          <p className="pretty mt-2.5 text-center text-sm font-medium text-ink-500">
            Em cần chọn đủ {questions.length} câu trước khi hoàn thành nhé.
          </p>
        </div>
      </form>
    </div>
  );
}
