import type { RawQuizQuestion } from "./content/activity-quiz";
import { hash32 } from "./survey";
import type { QuizQuestion } from "./types";

// ============================================================================
// QUIZ ON NHANH SAU HOAT DONG (de xuat A5 buoc 2) - logic THUAN.
// Danh cho HOC SINH, CO hien diem, nhung KHONG tinh vao ho so so thich va khong
// phai bai kiem tra nang luc: chi giup em nho lai dieu vua lam (giu thong diep
// giam ap luc cua du an). Giao vien soan / sua o trang "Hoat dong" bang van ban:
//
//   Cau hoi?
//   * Dap an dung
//   - Dap an sai
//   - Dap an sai
//   Giai thich: ...
//
// Cac cau cach nhau 1 dong trong. Thu tu dap an hien thi XAO theo tung hoc sinh.
// ============================================================================

export const MAX_QUIZ_QUESTIONS = 5;
const MAX_PROMPT = 300;
const MAX_OPTION = 200;
const MAX_EXPLANATION = 400;

const questionId = (activityId: string, i: number) => `${activityId}_q${i + 1}`;

/** Noi dung soan san (content/activity-quiz.ts: dap an dung viet dau tien) -> QuizQuestion. */
export function buildQuiz(activityId: string, raw: RawQuizQuestion[] = []): QuizQuestion[] {
  return raw.map(([prompt, correct, wrong1, wrong2, explanation], i) => ({
    id: questionId(activityId, i),
    prompt,
    options: [correct, wrong1, wrong2],
    correct: 0,
    explanation,
  }));
}

/** Thu tu hien thi dap an (chi so trong options), co dinh theo (hoc sinh, cau) - dap an dung khong dung yen 1 vi tri. */
export function quizOptionOrder(q: QuizQuestion, studentId: string): number[] {
  const key = (i: number) => hash32(`${studentId}|${q.id}|${i}`);
  return q.options.map((_, i) => i).sort((a, b) => key(a) - key(b));
}

/** Dau van tay noi dung quiz (luu kem lan lam). */
export function quizVersion(quiz: QuizQuestion[]): string {
  return hash32(JSON.stringify(quiz)).toString(16).padStart(8, "0");
}

/** Cham bai: moi cau phai chon dung 1 dap an hop le, thieu cau => null (tu choi). */
export function scoreQuiz(quiz: QuizQuestion[], chosen: Map<string, number>) {
  const answers: { questionId: string; chosen: number; correct: boolean }[] = [];
  for (const q of quiz) {
    const c = chosen.get(q.id);
    if (c === undefined || !Number.isInteger(c) || c < 0 || c >= q.options.length) return null;
    answers.push({ questionId: q.id, chosen: c, correct: c === q.correct });
  }
  return { answers, nCorrect: answers.filter((a) => a.correct).length, nQuestions: quiz.length };
}

export function quizToText(quiz: QuizQuestion[]): string {
  return quiz
    .map((q) =>
      [q.prompt, ...q.options.map((o, i) => `${i === q.correct ? "*" : "-"} ${o}`), ...(q.explanation ? [`Giải thích: ${q.explanation}`] : [])].join("\n")
    )
    .join("\n\n");
}

/** Van ban giao vien soan -> quiz. Sai dinh dang => bao loi cu the, KHONG luu nua voi (giao vien sua lai). */
export function parseQuizText(activityId: string, text: string): { ok: true; quiz: QuizQuestion[] } | { ok: false; error: string } {
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length > 0);
  if (blocks.length > MAX_QUIZ_QUESTIONS) return { ok: false, error: `Tối đa ${MAX_QUIZ_QUESTIONS} câu hỏi cho mỗi hoạt động.` };
  const quiz: QuizQuestion[] = [];
  for (const [i, lines] of blocks.entries()) {
    const label = `Câu ${i + 1}`;
    const [prompt, ...rest] = lines as [string, ...string[]];
    if (/^[*-]/.test(prompt)) return { ok: false, error: `${label}: dòng đầu phải là câu hỏi (không bắt đầu bằng * hoặc -).` };
    const options: string[] = [];
    let correct = -1;
    let explanation = "";
    for (const line of rest) {
      const exp = /^gi[aả]i th[ií]ch\s*:\s*(.*)$/i.exec(line);
      if (exp) explanation = exp[1]!.trim();
      else if (/^[*-]\s*/.test(line)) {
        if (line.startsWith("*")) {
          if (correct >= 0) return { ok: false, error: `${label}: chỉ đánh dấu * cho MỘT đáp án đúng.` };
          correct = options.length;
        }
        options.push(line.replace(/^[*-]\s*/, ""));
      } else return { ok: false, error: `${label}: dòng "${line.slice(0, 40)}" phải bắt đầu bằng * (đúng), - (sai) hoặc "Giải thích:".` };
    }
    if (options.length < 2 || options.length > 4) return { ok: false, error: `${label}: cần 2–4 đáp án.` };
    if (correct < 0) return { ok: false, error: `${label}: đánh dấu đáp án đúng bằng * ở đầu dòng.` };
    if (options.some((o) => !o)) return { ok: false, error: `${label}: có đáp án bị trống.` };
    if (prompt.length > MAX_PROMPT || options.some((o) => o.length > MAX_OPTION) || explanation.length > MAX_EXPLANATION) {
      return { ok: false, error: `${label}: câu hỏi / đáp án / giải thích quá dài.` };
    }
    quiz.push({ id: questionId(activityId, i), prompt, options, correct, explanation });
  }
  return { ok: true, quiz };
}
