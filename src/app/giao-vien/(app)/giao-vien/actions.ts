"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { issueTempPassword } from "@/lib/auth/teacher-auth";
import { getRepository } from "@/lib/data";

export interface TempPasswordState {
  ok: boolean;
  message: string;
  /** Mat khau tam - CHI tra ve dung 1 lan trong ket qua action, khong luu/hien lai o dau khac. */
  tempPassword?: string;
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createTeacherAction(_prev: TempPasswordState | null, formData: FormData): Promise<TempPasswordState> {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = formData.get("role") === "admin" ? "admin" : "teacher";
  if (!EMAIL_RE.test(email) || !fullName) return { ok: false, message: "Nhập đúng email và họ tên." };

  const repo = getRepository();
  if (await repo.getTeacherByEmail(email)) return { ok: false, message: "Email này đã có tài khoản." };
  const teacher = await repo.createTeacher({ schoolId: session.schoolId, fullName, email, role });
  const tempPassword = await issueTempPassword(teacher.id);
  revalidatePath("/giao-vien/giao-vien");
  return { ok: true, message: `Đã tạo tài khoản cho ${fullName}.`, tempPassword, email };
}

export async function resetTeacherPasswordAction(_prev: TempPasswordState | null, formData: FormData): Promise<TempPasswordState> {
  const session = await requireAdmin();
  const teacherId = String(formData.get("teacherId") ?? "");
  const teacher = await getRepository().getTeacher(teacherId);
  if (!teacher || teacher.schoolId !== session.schoolId) return { ok: false, message: "Không tìm thấy giáo viên." };
  const tempPassword = await issueTempPassword(teacher.id);
  return { ok: true, message: `Đã đặt lại mật khẩu cho ${teacher.fullName}. Mọi phiên đăng nhập cũ của tài khoản này đã bị đăng xuất.`, tempPassword, email: teacher.email };
}
