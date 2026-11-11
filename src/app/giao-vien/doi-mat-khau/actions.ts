"use server";

import { redirect } from "next/navigation";
import { createSession, requireTeacher } from "@/lib/auth/session";
import { verifyPassword, validateNewPassword } from "@/lib/auth/password";
import { setTeacherPassword } from "@/lib/auth/teacher-auth";
import { getRepository } from "@/lib/data";

export async function changePasswordAction(formData: FormData): Promise<void> {
  const session = await requireTeacher({ allowPasswordChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const repo = getRepository();
  const [teacher, cred] = await Promise.all([repo.getTeacher(session.id), repo.getTeacherCredentials(session.id)]);
  if (!teacher || !cred) redirect("/giao-vien/dang-nhap");

  // Hoi lai mat khau hien tai: phien bi lo (may dung chung) cung khong doi duoc mat khau.
  if (!(await verifyPassword(current, cred.passwordHash))) redirect("/giao-vien/doi-mat-khau?error=current");
  if (next !== confirm) redirect("/giao-vien/doi-mat-khau?error=mismatch");
  if (next === current) redirect("/giao-vien/doi-mat-khau?error=same");
  if (validateNewPassword(next, teacher.email)) redirect("/giao-vien/doi-mat-khau?error=weak");

  const sv = await setTeacherPassword(session.id, next);
  await createSession({ role: session.role, id: session.id, schoolId: session.schoolId, sv, mustChangePassword: false });
  redirect("/giao-vien/dashboard?doi-mat-khau=1");
}
