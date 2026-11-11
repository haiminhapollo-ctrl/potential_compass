"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function updateQuestionAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const questionId = String(formData.get("questionId") ?? "");
  const scenario = String(formData.get("scenario") ?? "").trim();
  if (!questionId || !scenario) return;

  const repo = getRepository();
  const questions = await repo.listSurveyQuestions();
  const question = questions.find((q) => q.id === questionId);
  if (!question) return;

  const updatedOptions = question.options.map((opt) => {
    const text = formData.get(`option_${opt.id}`);
    return text ? { ...opt, text: String(text).trim() } : opt;
  });

  const updated = { ...question, scenario, options: updatedOptions };
  if (JSON.stringify(updated) === JSON.stringify(question)) return;
  // Nhat ky thay doi (bao cao DS loi 10): giu nguyen ban TRUOC khi sua. Cau tra loi
  // cua hoc sinh luu kem survey_version => biet em da tra loi theo van ban nao.
  await repo.appendAuditLog({
    entityType: "survey_question",
    entityId: question.id,
    action: "update",
    actorId: session.id,
    before: question,
    after: updated,
  });
  await repo.upsertSurveyQuestion(updated);
  revalidatePath("/giao-vien/cau-hoi");
}
