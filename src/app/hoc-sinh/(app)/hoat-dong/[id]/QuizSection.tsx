import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { quizOptionOrder, quizVersion } from "@/lib/quiz";
import type { Activity, QuizAttempt } from "@/lib/types";
import { submitQuizAction } from "../actions";

// ============================================================================
// CAU HOI ON NHANH sau hoat dong (de xuat A5 buoc 2): danh cho hoc sinh, CO hien
// diem, nhung noi ro KHONG phai bai kiem tra va khong tinh vao ho so so thich.
// ============================================================================

export function QuizSection({
  activity,
  studentId,
  attempt,
  openedAt,
  invalid,
}: {
  activity: Activity;
  studentId: string;
  attempt: QuizAttempt | null;
  openedAt: string;
  invalid: boolean;
}) {
  const quiz = activity.quiz;
  return (
    <Card className="p-6" id="quiz">
      <CardTitle>Câu hỏi ôn nhanh ({quiz.length} câu)</CardTitle>
      <p className="pretty mt-1 text-sm font-medium text-ink-500">
        Đây không phải bài kiểm tra. Điểm không tính vào hồ sơ sở thích, chỉ để em nhớ lại điều vừa làm.
      </p>

      {attempt ? (
        <QuizResult activity={activity} studentId={studentId} attempt={attempt} />
      ) : (
        <form action={submitQuizAction} className="mt-4 space-y-4">
          <input type="hidden" name="activityId" value={activity.id} />
          <input type="hidden" name="startedAt" value={openedAt} />
          {quiz.map((q, qi) => (
            <fieldset key={q.id} className="clay-sunken p-4">
              <legend className="pretty mb-2.5 text-sm font-bold text-ink-900">
                {qi + 1}. {q.prompt}
              </legend>
              <div className="space-y-2">
                {quizOptionOrder(q, studentId).map((oi) => (
                  <label
                    key={oi}
                    className="group flex cursor-pointer items-start gap-3 rounded-clay-sm bg-clay-surface p-3 text-sm font-medium
                               text-ink-700 shadow-clay-sm has-[:checked]:bg-brand-100 has-[:checked]:font-bold
                               has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"
                  >
                    <input type="radio" name={`q_${q.id}`} value={oi} required className="mt-1 accent-brand-600" />
                    <span className="pretty leading-relaxed">{q.options[oi]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {invalid && (
            <p role="alert" className="text-sm font-semibold text-status-error">
              Em chọn đủ một đáp án cho mỗi câu rồi bấm nộp nhé.
            </p>
          )}
          <Button type="submit" className="w-full">
            Nộp câu trả lời
          </Button>
        </form>
      )}
    </Card>
  );
}

function QuizResult({ activity, studentId, attempt }: { activity: Activity; studentId: string; attempt: QuizAttempt }) {
  const { nCorrect, nQuestions } = attempt;
  const message =
    nCorrect === nQuestions
      ? "Giỏi lắm! Em nhớ hết rồi."
      : nCorrect > 0
        ? "Em đã nhớ được một phần. Xem lại câu chưa đúng bên dưới nhé."
        : "Không sao, em đọc giải thích bên dưới để hiểu thêm nhé.";
  // Giao vien da sua cau hoi sau khi em lam => khong ghep dap an cu voi cau hoi moi.
  const sameVersion = attempt.quizVersion === quizVersion(activity.quiz);
  const chosenOf = new Map(attempt.answers.map((a) => [a.questionId, a.chosen] as const));
  return (
    <div className="mt-4">
      <p className="nums text-lg font-extrabold text-brand-700">
        Em đúng {nCorrect}/{nQuestions} câu
      </p>
      <p className="pretty mt-0.5 text-sm font-semibold text-ink-600">{message}</p>
      {sameVersion ? (
        <ol className="mt-4 space-y-3">
          {activity.quiz.map((q, qi) => {
            const chosen = chosenOf.get(q.id);
            return (
              <li key={q.id} className="clay-sunken p-4">
                <p className="pretty text-sm font-bold text-ink-900">
                  {qi + 1}. {q.prompt}
                </p>
                <ul className="mt-2 space-y-1">
                  {quizOptionOrder(q, studentId).map((oi) => (
                    <li
                      key={oi}
                      className={`pretty text-sm ${oi === q.correct ? "font-bold text-status-success" : oi === chosen ? "font-semibold text-status-error" : "text-ink-500"}`}
                    >
                      {oi === q.correct ? "✅ " : oi === chosen ? "✗ " : "• "}
                      {q.options[oi]}
                      {oi === chosen && " (em chọn)"}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="pretty mt-2 text-sm font-medium leading-relaxed text-ink-600">💡 {q.explanation}</p>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="pretty mt-3 text-sm font-medium text-ink-500">Thầy cô đã sửa câu hỏi sau khi em làm nên không hiện lại từng câu.</p>
      )}
    </div>
  );
}
