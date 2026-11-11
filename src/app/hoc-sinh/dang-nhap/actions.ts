"use server";

import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { createSession } from "@/lib/auth/session";

export async function studentLoginAction(formData: FormData): Promise<void> {
  const code = String(formData.get("studentCode") ?? "").trim();
  if (!code) {
    redirect("/hoc-sinh/dang-nhap?error=empty");
  }

  const repo = getRepository();
  const student = await repo.getStudentByCode(code);
  if (!student) {
    redirect("/hoc-sinh/dang-nhap?error=notfound");
  }

  await createSession({ role: "student", id: student.id });

  const profile = await repo.getProfile(student.id);
  redirect(profile?.surveyCompleted ? "/hoc-sinh/ho-so" : "/hoc-sinh/khao-sat");
}
