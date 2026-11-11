import "server-only";
import { getRepository } from "../data";
import { generateTempPassword, hashPassword, isLocked, nextLoginState, verifyPassword } from "./password";
import type { TeacherAccount, TeacherCredentials } from "../types";

// ============================================================================
// DANG NHAP GIAO VIEN BANG TAI KHOAN RIENG (thay ma truy cap dung chung).
// - Mat khau scrypt luu o bang rieng teacher_credentials (RLS bat, khong policy:
//   chi server/service role doc duoc).
// - Sai MAX_FAILED_LOGINS lan lien tiep => khoa tam LOCK_MINUTES phut.
// - Tai khoan moi / dat lai: mat khau tam + bat buoc doi o lan dang nhap dau.
// - Doi/dat lai mat khau => tang sessionVersion => moi phien dang nhap cu het hieu luc.
// ============================================================================

export type TeacherLoginError = "invalid" | "locked" | "no_password";

const EMPTY: Omit<TeacherCredentials, "teacherId"> = {
  passwordHash: null,
  mustChangePassword: true,
  failedLoginCount: 0,
  lockedUntil: null,
  sessionVersion: 0,
  passwordUpdatedAt: null,
};

export async function loginTeacher(
  email: string,
  password: string
): Promise<{ ok: true; teacher: TeacherAccount; credentials: TeacherCredentials } | { ok: false; error: TeacherLoginError }> {
  const repo = getRepository();
  const teacher = await repo.getTeacherByEmail(email);
  if (!teacher) {
    await verifyPassword(password, null); // giu thoi gian phan hoi tuong duong, khong lo email co ton tai hay khong
    return { ok: false, error: "invalid" };
  }
  const cred = (await repo.getTeacherCredentials(teacher.id)) ?? { teacherId: teacher.id, ...EMPTY };
  if (isLocked(cred)) return { ok: false, error: "locked" };
  if (!cred.passwordHash) return { ok: false, error: "no_password" };

  const ok = await verifyPassword(password, cred.passwordHash);
  const next = { ...cred, ...nextLoginState(cred, ok) };
  await repo.saveTeacherCredentials(next);
  if (!ok) return { ok: false, error: isLocked(next) ? "locked" : "invalid" };
  return { ok: true, teacher, credentials: next };
}

/** Dat mat khau moi (giao vien tu doi). Tra ve sessionVersion moi de tao lai phien. */
export async function setTeacherPassword(teacherId: string, newPassword: string): Promise<number> {
  const repo = getRepository();
  const cred = (await repo.getTeacherCredentials(teacherId)) ?? { teacherId, ...EMPTY };
  const next: TeacherCredentials = {
    ...cred,
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
    failedLoginCount: 0,
    lockedUntil: null,
    sessionVersion: cred.sessionVersion + 1,
    passwordUpdatedAt: new Date().toISOString(),
  };
  await repo.saveTeacherCredentials(next);
  return next.sessionVersion;
}

/** Cap mat khau TAM (tao tai khoan / quen mat khau). Chi hien 1 lan cho nguoi cap. */
export async function issueTempPassword(teacherId: string): Promise<string> {
  const repo = getRepository();
  const temp = generateTempPassword();
  const cred = (await repo.getTeacherCredentials(teacherId)) ?? { teacherId, ...EMPTY };
  await repo.saveTeacherCredentials({
    ...cred,
    passwordHash: await hashPassword(temp),
    mustChangePassword: true,
    failedLoginCount: 0,
    lockedUntil: null,
    sessionVersion: cred.sessionVersion + 1,
    passwordUpdatedAt: new Date().toISOString(),
  });
  return temp;
}
