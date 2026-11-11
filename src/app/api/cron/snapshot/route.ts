import { timingSafeEqual } from "node:crypto";
import { recomputeAllProfiles } from "@/lib/profile-service";

// ============================================================================
// CRON HANG NGAY (vercel.json): tinh lai MOI ho so + ghi snapshot tuan hien tai.
// - Snapshot co cho MOI hoc sinh moi tuan, ke ca em khong mo app (truoc day chi
//   co khi em mo trang tong ket => thieu du lieu dung nhom can quan tam nhat).
// - Moc cat du lieu thong nhat: lan chay cuoi cung cua Chu Nhat chot tuan.
// - Cap nhat can giua theo chat luong hoat dong khi hoc sinh khac danh gia them.
// Vercel tu gui "Authorization: Bearer <CRON_SECRET>" khi bien CRON_SECRET duoc dat.
// ============================================================================

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const startedAt = Date.now();
  const { total, failed } = await recomputeAllProfiles("cron_daily");
  return Response.json(
    { ok: failed.length === 0, recomputed: total, failed: failed.length, ms: Date.now() - startedAt },
    { status: failed.length ? 500 : 200 }
  );
}
