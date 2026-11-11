// ============================================================================
// NGAY THEO GIO VIET NAM
// ----------------------------------------------------------------------------
// Truoc day moi noi dung `new Date().toISOString().slice(0, 10)` - tuc la ngay
// theo UTC. Viet Nam la UTC+7, nen tu 00:00 den 07:00 gio Viet Nam, UTC VAN
// dang o NGAY HOM TRUOC. Hau qua that:
//   - "Hoat dong hom nay" khong doi sang bai moi cho den 7h sang.
//   - Hoc sinh lam bai luc 20h toi hom truoc, sang 6h hom sau vao lam tiep se
//     bi chan vi he thong tuong van la cung mot ngay.
//   - Moc dau tuan cua tong ket tuan cung bi lech 1 ngay.
//
// Cac ham duoi day tinh theo offset CO DINH +07:00 (Viet Nam khong co DST) va
// KHONG phu thuoc timezone cua may chay - nen cho ket qua giong nhau tren may
// dev (UTC+7) va tren Vercel (UTC).
//
// File nay la logic THUAN (khong "server-only") de client component cung import
// duoc: client va server BAT BUOC phai tinh ra cung mot ngay, neu khong server
// se tu choi payload cua client vi "invalid_date".
// ============================================================================

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

/** Doi mot thoi diem sang moc thoi gian "nhu the dang o mui gio Viet Nam". */
function shiftToVN(now: Date): Date {
  return new Date(now.getTime() + VN_OFFSET_MS);
}

/** Ngay hom nay theo gio Viet Nam, dinh dang YYYY-MM-DD. */
export function todayISOVN(now: Date = new Date()): string {
  return shiftToVN(now).toISOString().slice(0, 10);
}

/** Ngay cach hom nay `n` ngay ve truoc, theo gio Viet Nam. */
export function daysAgoISOVN(n: number, now: Date = new Date()): string {
  return todayISOVN(new Date(now.getTime() - n * DAY_MS));
}

/** Ngay Thu Hai dau tuan (theo gio Viet Nam) - dung lam khoa cho tong ket tuan. */
export function weekStartISOVN(now: Date = new Date()): string {
  const d = shiftToVN(now);
  const day = d.getUTCDay(); // 0 = Chu Nhat (dung getUTC* vi d da duoc dich sang VN)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

/** So ngay giua hai moc ISO date (toISO - fromISO). */
export function daysBetweenISO(fromISO: string, toISO: string): number {
  const ms = Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`);
  return Math.round(ms / DAY_MS);
}

/** Cong `n` ngay vao mot ISO date (YYYY-MM-DD). */
export function addDaysISO(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Khoang ngay [start, end) cua tuan chua `now` theo gio VN - CO CAN TREN.
 * Loc "trong tuan" chi bang `date >= start` se lot ca ban ghi tuong lai/tuan sau
 * khi tinh lai cho tuan cu (bao cao DS loi 19).
 */
export function weekRangeVN(now: Date = new Date()): { start: string; end: string } {
  const start = weekStartISOVN(now);
  return { start, end: addDaysISO(start, 7) };
}

export function isInRange(dateISO: string, range: { start: string; end: string }): boolean {
  return dateISO >= range.start && dateISO < range.end;
}
