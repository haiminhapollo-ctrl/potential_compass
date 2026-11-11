import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "../data";
import { createHmac, timingSafeEqual } from "node:crypto";

// ============================================================================
// SESSION - Cookie ky bang HMAC, KHONG dung mat khau.
// ----------------------------------------------------------------------------
// Hoc sinh vung cao thuong KHONG co email rieng -> dang nhap bang "Ma hoc
// sinh" do giao vien cap (giong nhieu he thong hoc tap cho tre em khac).
// Danh doi: ai co ma la vao duoc, phu hop QUY MO PILOT NHO, tin cay cao (lop
// hoc, giao vien quan ly ma). KHI MO RONG NHIEU TRUONG, nen nang cap len
// Supabase Auth that (OTP qua SDT phu huynh/giao vien, hoac tai khoan do
// truong cap) - xem tai lieu "Trien khai & Van hanh" muc Bao mat.
//
// Giao vien/Admin: cung co the nang cap sang Supabase Auth (email + mat
// khau/magic link) ngay tu dau vi so luong it va can bao mat cao hon.
// ============================================================================

export type SessionRole = "student" | "teacher" | "admin";

export interface SessionData {
  role: SessionRole;
  id: string; // studentId hoac teacherId
  schoolId?: string;
  /** Giao vien: phien ban phien - phai khop teacher_credentials.sessionVersion (doi mat khau => phien cu het han). */
  sv?: number;
  /** Giao vien dang dung mat khau tam => chi duoc vao trang doi mat khau. */
  mustChangePassword?: boolean;
}

const COOKIE_NAME = "pc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 ngay - phu hop hoc sinh dung lai tren cung 1 thiet bi/PWA

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "change-me-in-production") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET chua duoc dat gia tri that trong moi truong production. Xem .env.example.");
    }
    return "dev-only-insecure-secret";
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function createSession(data: SessionData): Promise<void> {
  const payload = JSON.stringify(data);
  const encoded = Buffer.from(payload).toString("base64url");
  const signature = sign(encoded);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${encoded}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(sign(encoded), signature)) return null;

  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(payload) as SessionData;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireStudent(): Promise<SessionData> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    throw new Error("Chua dang nhap voi vai tro hoc sinh.");
  }
  return session;
}

/**
 * Dung o DAU MOI Server Action / trang cua giao vien. Layout (app) chi chan
 * TRANG; Server Action goi truc tiep duoc bang POST nen phai tu kiem tra quyen -
 * truoc day chi kiem tra "co session", tuc session HOC SINH cung goi duoc
 * hanh dong sua noi dung/xoa hoc sinh.
 */
export type TeacherSession = Omit<SessionData, "schoolId"> & { schoolId: string };

export async function requireTeacher(opts: { allowPasswordChange?: boolean } = {}): Promise<TeacherSession> {
  const session = await getSession();
  if (!session || (session.role !== "teacher" && session.role !== "admin") || !session.schoolId) {
    redirect("/giao-vien/dang-nhap");
  }
  // Phien chi hop le neu khop phien ban hien tai (mat khau doi/dat lai => dang nhap lai).
  // Khong xoa cookie o day: ham nay chay ca luc render trang (chi Server Action duoc sua cookie);
  // cookie cu bi ghi de khi dang nhap lai.
  const cred = await getRepository().getTeacherCredentials(session.id);
  if (!cred || cred.sessionVersion !== session.sv) {
    redirect("/giao-vien/dang-nhap?error=expired");
  }
  if (cred.mustChangePassword && !opts.allowPasswordChange) {
    redirect("/giao-vien/doi-mat-khau");
  }
  return { ...session, schoolId: session.schoolId };
}

/** Chi quan tri vien (role admin) - quan ly tai khoan giao vien. */
export async function requireAdmin(): Promise<TeacherSession> {
  const session = await requireTeacher();
  if (session.role !== "admin") redirect("/giao-vien/dashboard");
  return session;
}
