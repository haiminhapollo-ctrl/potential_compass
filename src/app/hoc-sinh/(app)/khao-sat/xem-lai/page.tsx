import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { LacArrow } from "@/components/ui/Motifs";
import { optionsInDisplayOrder, questionsInDisplayOrder } from "@/lib/survey";
import { getStudentSurvey } from "@/lib/profile-service";

// ============================================================================
// XEM LAI BAI KHAO SAT - CHI DOC: dap an cua lan lam GAN NHAT, cung thu tu dap
// an em da thay khi lam (xao theo tung hoc sinh, src/lib/survey.ts). Muon sua
// thi "Lam lai" (tao lan lam moi, lan cu van duoc giu de phan tich).
// ============================================================================
export default async function SurveyReviewPage() {
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");

  const repo = getRepository();
  const [{ questions }, responses, profile] = await Promise.all([
    getStudentSurvey(session.id, repo),
    repo.listResponsesByStudent(session.id),
    repo.getProfile(session.id),
  ]);

  // Chua lam xong khao sat thi khong co gi de xem lai -> dua ve trang lam bai.
  if (!profile?.surveyCompleted) {
    redirect("/hoc-sinh/khao-sat");
  }

  const chosen = new Map(responses.map((r) => [r.questionId, r.optionId]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Bài khảo sát của em
        </h1>
        <p className="pretty mt-1.5 text-sm font-medium leading-relaxed text-ink-500">
          Đây là những gì em đã chọn ở bài khảo sát. Nếu thấy có câu chưa đúng với mình, em có thể làm lại ở
          cuối trang. Hồ sơ sở thích cũng sẽ tiếp tục thay đổi qua các hoạt động hằng ngày.
        </p>
      </div>

      {questionsInDisplayOrder(questions, session.id).map((q, idx) => {
        const picked = chosen.get(q.id);
        return (
          <Card key={q.id} className="p-5">
            <p className="mb-4 flex items-start gap-3">
              <span
                className="nums grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600
                           text-xs font-extrabold text-white shadow-clay-brand"
              >
                {idx + 1}
              </span>
              <span className="pretty pt-0.5 text-sm font-bold leading-relaxed text-ink-900">{q.scenario}</span>
            </p>

            <ul className="space-y-2.5">
              {optionsInDisplayOrder(q, session.id).map((opt) => {
                const isPicked = opt.id === picked;
                return (
                  <li
                    key={opt.id}
                    className={`flex items-start gap-3 rounded-clay-sm p-3.5 text-sm leading-relaxed ${
                      isPicked
                        ? "bg-brand-100 font-bold text-brand-800 shadow-clay-inset"
                        : "bg-clay-bg font-medium text-ink-500"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        isPicked ? "bg-brand-600 shadow-clay-brand" : "bg-clay-sunken shadow-clay-inset"
                      }`}
                    >
                      {isPicked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="pretty">{opt.text}</span>
                    {isPicked && <span className="sr-only">(đáp án em đã chọn)</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}

      <LinkButton href="/hoc-sinh/khao-sat?lam-lai=1" className="w-full">
        ↻ Làm lại bài khảo sát
      </LinkButton>

      <LinkButton href="/hoc-sinh/ho-so" variant="secondary" className="w-full">
        <LacArrow className="h-3 w-5 shrink-0 rotate-180" />
        Về hồ sơ của em
      </LinkButton>
    </div>
  );
}
