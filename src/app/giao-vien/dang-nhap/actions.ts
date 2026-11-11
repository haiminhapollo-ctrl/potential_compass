"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth/session";
import { loginTeacher } from "@/lib/auth/teacher-auth";

export async function teacherLoginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/giao-vien/dang-nhap?error=empty");

  const result = await loginTeacher(email, password);
  if (!result.ok) redirect(`/giao-vien/dang-nhap?error=${result.error}`);

  const { teacher, credentials } = result;
  await createSession({
    role: teacher.role,
    id: teacher.id,
    schoolId: teacher.schoolId,
    sv: credentials.sessionVersion,
    mustChangePassword: credentials.mustChangePassword,
  });
  redirect(credentials.mustChangePassword ? "/giao-vien/doi-mat-khau" : "/giao-vien/dashboard");
}
