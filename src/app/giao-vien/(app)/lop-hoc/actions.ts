"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { isCurriculumTerm } from "@/lib/curriculum";
import { recomputeAndSaveProfile } from "@/lib/profile-service";
import { RIASEC_READY } from "@/lib/riasec";
import { nextRetestWave } from "@/lib/survey";

/** Lop co thuoc truong cua giao vien dang dang nhap khong (chong sua/xoa cheo truong). */
async function ownsClass(schoolId: string, classId: string): Promise<boolean> {
  return (await getRepository().listClasses(schoolId)).some((c) => c.id === classId);
}

export async function createClassAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const repo = getRepository();
  await repo.createClass({ schoolId: session.schoolId, name, teacherId: session.id });
  revalidatePath("/giao-vien/lop-hoc");
}

export async function createStudentAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const classId = String(formData.get("classId") ?? "");
  const studentCode = String(formData.get("studentCode") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const parentConsentConfirmed = formData.get("parentConsentConfirmed") === "on";

  if (!classId || !studentCode || !displayName) return;
  if (!(await ownsClass(session.schoolId, classId))) return;

  const repo = getRepository();

  const existing = await repo.getStudentByCode(studentCode);
  if (existing) {
    redirect(`/giao-vien/lop-hoc?classId=${classId}&error=duplicate_code`);
  }

  await repo.createStudent({ classId, studentCode, displayName, parentConsentConfirmed });
  revalidatePath("/giao-vien/lop-hoc");
}

export async function deleteStudentAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const studentId = String(formData.get("studentId") ?? "");
  if (!studentId) return;

  const repo = getRepository();
  const student = await repo.getStudent(studentId);
  if (!student || !(await ownsClass(session.schoolId, student.classId))) return;

  await repo.deleteStudent(studentId);
  revalidatePath("/giao-vien/lop-hoc");
}

// ============================================================================
// DOT KHAO SAT LAI (de xuat B1, test-retest): giao vien mo cho CA LOP khoang 2
// tuan sau lan dau; hoc sinh da lam lan dau thay loi moi, lam bai FORM TRONG
// (khong thay dap an cu). Dong dot khi xong (em vang mat co the lam truoc khi dong).
// ============================================================================
export async function openRetestAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  if (!classId || !(await ownsClass(session.schoolId, classId))) return;

  const repo = getRepository();
  const students = await repo.listStudentsByClass(classId);
  const attempts = await repo.listSurveyAttempts(students.map((s) => s.id));
  await repo.setClassRetestWave(classId, nextRetestWave(attempts));
  revalidatePath("/giao-vien/lop-hoc");
}

export async function closeRetestAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  if (!classId || !(await ownsClass(session.schoolId, classId))) return;

  await getRepository().setClassRetestWave(classId, null);
  revalidatePath("/giao-vien/lop-hoc");
}

// ============================================================================
// HOC KY CUA LOP: doi bo cau hoi + hoat dong theo chuong trinh (curriculum.ts). Sang ky moi, em duoc moi tra loi
// them goi cau cua ky do (cau neo giu nguyen dap an). Tinh lai ho so ca lop ngay: luong chi gan tu G9_HK2.
// ============================================================================
export async function setCurriculumTermAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  const term = formData.get("curriculumTerm");
  if (!classId || !isCurriculumTerm(term) || !(await ownsClass(session.schoolId, classId))) return;

  const repo = getRepository();
  await repo.setClassCurriculumTerm(classId, term);
  for (const s of await repo.listStudentsByClass(classId)) {
    await recomputeAndSaveProfile(s.id, "event", undefined, term).catch((err) =>
      console.error(`[lop-hoc] Khong tinh lai duoc ho so ${s.id} sau khi doi hoc ky:`, err)
    );
  }
  revalidatePath("/giao-vien/lop-hoc");
}

// ============================================================================
// BAI DOI CHIEU RIASEC (de xuat B1 - hieu luc hoi tu): giao vien bat cho vai lop lam MAU CON; hoc sinh da lam
// khao sat lan dau thay loi moi o trang Ho so. Chua co du 30 cau ban dich (RIASEC_READY) thi khong bat duoc.
// ============================================================================
export async function setRiasecAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();
  const classId = String(formData.get("classId") ?? "");
  const enabled = formData.get("enabled") === "1";
  if (!classId || !(await ownsClass(session.schoolId, classId)) || (enabled && !RIASEC_READY)) return;

  await getRepository().setClassRiasec(classId, enabled);
  revalidatePath("/giao-vien/lop-hoc");
}
