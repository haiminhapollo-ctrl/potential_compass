"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { parseDomainCodes } from "@/lib/domains";
import { recordOutcomeLabel } from "@/lib/actions/outcome-label";
import { getStudentSurvey, recomputeAndSaveProfile } from "@/lib/profile-service";
import { parseOpenedAt } from "@/lib/activity-timing";
import { computeContentHash } from "@/lib/recommendation/scoring";
import { optionsInDisplayOrder, parseAnswerTimes, pendingRetestWave, questionsInDisplayOrder } from "@/lib/survey";

/** Trang mo qua lau (de qua dem) => khong dung lam thoi gian lam bai. */
const MAX_SURVEY_HOURS = 6;

export async function submitSurveyAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/hoc-sinh/dang-nhap?error=expired");
  }

  const repo = getRepository();
  // Bo cau cua HOC KY lop em dang hoc (cau neo + goi cua ky) - cau da thay / ky khac khong nhan.
  const [{ term, questions, all }, activities, attempts, student] = await Promise.all([
    getStudentSurvey(session.id, repo),
    repo.listActivities(),
    repo.listSurveyAttempts([session.id]),
    repo.getStudent(session.id),
  ]);

  // DOT DO (de xuat B1): lan dau = "T1"; dot khao sat lai chi nhan khi lop DANG mo dung dot do va em
  // chua lam; con lai (lam lai tu nguyen / bo sung cau moi, dap an cu chon san) = null.
  const requestedWave = String(formData.get("dot") ?? "") || null;
  if (requestedWave && requestedWave !== pendingRetestWave(student ? await repo.getClass(student.classId) : null, attempts)) {
    redirect("/hoc-sinh/ho-so"); // dot da dong hoac em da lam roi
  }
  const wave = attempts.length === 0 ? "T1" : requestedWave;
  const modeParam = requestedWave ? `&dot=${requestedWave}` : attempts.length > 0 ? "&lam-lai=1" : "";

  // KIEM TRA DAU VAO (bao cao DS loi 17): moi cau HIEN CO phai co dung 1 dap an thuoc cau do. Lan lam
  // la mot bo dap an DAY DU (khong ghep voi lan truoc), nen thieu cau => tu choi ca form.
  let anyAnswer = false;
  const answerTimes = parseAnswerTimes(formData.get("answerTimes"), MAX_SURVEY_HOURS * 3_600_000);
  const questionPosition = new Map(questionsInDisplayOrder(questions, session.id).map((q, i) => [q.id, i] as const));
  const answers: { questionId: string; optionId: string; displayPosition: number | null; questionPosition: number | null; firstAnsweredMs: number | null }[] = [];
  for (const q of questions) {
    const optionId = String(formData.get(`q_${q.id}`) ?? "");
    anyAnswer ||= optionId !== "";
    // Vi tri em THAY tren man hinh (de xuat A4) - tinh lai bang cung ham xao voi trang khao sat.
    const displayPosition = optionsInDisplayOrder(q, session.id).findIndex((o) => o.id === optionId);
    if (displayPosition >= 0) {
      answers.push({ questionId: q.id, optionId, displayPosition, questionPosition: questionPosition.get(q.id)!, firstAnsweredMs: answerTimes.get(q.id) ?? null });
    }
  }
  if (!anyAnswer) redirect(`/hoc-sinh/khao-sat?loi=trong${modeParam}`);
  if (answers.length !== questions.length) redirect(`/hoc-sinh/khao-sat?loi=khong-hop-le${modeParam}`);

  // Ghi kem phien ban noi dung LUC tra loi (loi 10): neu sau nay giao vien sua
  // van ban dap an, van biet hoc sinh da tra loi theo phien ban nao.
  await repo.createSurveyAttempt({
    studentId: session.id,
    measurementWave: wave,
    surveyVersion: computeContentHash({ questions: all, activities }),
    curriculumTerm: term,
    startedAt: parseOpenedAt(formData.get("startedAt"), Date.now(), MAX_SURVEY_HOURS),
    answers,
  });
  await recomputeAndSaveProfile(session.id);

  // NHAN TRUOC KHI XEM KET QUA (de xuat A2): chi o bai form trong, em chua thay ket qua lan nay.
  const selfPick = parseDomainCodes(formData.getAll("selfPick"), 3);
  if (wave && selfPick.length > 0) {
    await recordOutcomeLabel({
      studentId: session.id,
      rater: "student",
      raterId: session.id,
      labelPhase: "pre_result",
      agreement: null,
      preferredDomains: selfPick,
    });
  }
  redirect(`/hoc-sinh/ho-so?${wave === "T1" ? "first=1" : wave ? "dot-lai=1" : "lam-lai=1"}`);
}
