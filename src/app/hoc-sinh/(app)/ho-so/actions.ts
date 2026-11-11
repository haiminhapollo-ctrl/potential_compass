"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { parseDomainCodes } from "@/lib/domains";
import { parseAgreement, recordOutcomeLabel } from "@/lib/actions/outcome-label";

export async function submitProfileFeedbackAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/hoc-sinh/dang-nhap");

  const agreement = parseAgreement(formData.get("agreement"));
  if (!agreement) return;
  await recordOutcomeLabel({
    studentId: session.id,
    rater: "student",
    raterId: session.id,
    labelPhase: "post_result",
    agreement,
    preferredDomains: parseDomainCodes(formData.getAll("preferredDomain"), 1),
  });
  redirect("/hoc-sinh/ho-so?da-danh-gia=1");
}
