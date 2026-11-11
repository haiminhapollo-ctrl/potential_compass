"use server";

import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { parseDomainCodes } from "@/lib/domains";
import { parseAgreement, recordOutcomeLabel } from "@/lib/actions/outcome-label";

export async function submitTeacherReviewAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();
  const studentId = String(formData.get("studentId") ?? "");
  const agreement = parseAgreement(formData.get("agreement"));
  if (!studentId || !agreement) return;

  // Chi danh gia hoc sinh thuoc truong minh.
  const repo = getRepository();
  const student = await repo.getStudent(studentId);
  const classes = await repo.listClasses(session.schoolId);
  if (!student || !classes.some((c) => c.id === student.classId)) return;

  await recordOutcomeLabel({
    studentId,
    rater: "teacher",
    raterId: session.id,
    labelPhase: "post_result",
    agreement,
    preferredDomains: parseDomainCodes(formData.getAll("preferredDomain"), 1),
  });
  redirect(`/giao-vien/lop-hoc/hoc-sinh/${studentId}?da-danh-gia=1`);
}
