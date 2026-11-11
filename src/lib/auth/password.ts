import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

// ============================================================================
// MAT KHAU GIAO VIEN (thay ma truy cap dung chung) - scrypt cua node:crypto,
// khong them thu vien. Logic THUAN (khong "server-only") de scripts/check-logic
// kiem thu duoc; chi duoc goi tu server.
// Dinh dang luu: scrypt$N$r$p$<salt base64>$<hash base64>
// ============================================================================

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

/** Sai qua so lan nay lien tiep => khoa tai khoan LOCK_MINUTES phut (chong do mat khau). */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 10;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = stored?.split("$");
  if (!parts || parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64!, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64!, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Mat khau tam de giao vien dang nhap lan dau (bat buoc doi ngay). Bo ky tu de nham: 0/O, 1/l/I. */
export function generateTempPassword(length = 12): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

/** null = hop le; nguoc lai tra ve thong bao loi tieng Viet. */
export function validateNewPassword(password: string, email: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;
  if (password.toLowerCase().includes(email.split("@")[0]!.toLowerCase())) return "Mật khẩu không được chứa email.";
  if (/^(.)\1+$/.test(password)) return "Mật khẩu quá đơn giản.";
  return null;
}

export interface LoginState {
  failedLoginCount: number;
  lockedUntil: string | null;
}

export function isLocked(state: LoginState, now = new Date()): boolean {
  return Boolean(state.lockedUntil && new Date(state.lockedUntil) > now);
}

/** Trang thai moi sau 1 lan dang nhap: dung => xoa dem; sai => tang dem, du nguong thi khoa. */
export function nextLoginState(state: LoginState, ok: boolean, now = new Date()): LoginState {
  if (ok) return { failedLoginCount: 0, lockedUntil: null };
  const failed = state.failedLoginCount + 1;
  return failed >= MAX_FAILED_LOGINS
    ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() }
    : { failedLoginCount: failed, lockedUntil: state.lockedUntil };
}
