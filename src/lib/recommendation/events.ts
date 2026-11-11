import "server-only";
import { getRepository } from "../data";
import { todayISOVN } from "../date";
import { ALGO_VERSION } from "./daily-pick";
import type { RecommendationEventType } from "../types";

// ============================================================================
// GHI SU KIEN GOI Y (bao cao DS loi 4): truoc day chi co activity_logs (hoat dong
// DA LAM) => moi chi so bi thien lech "nguoi song sot", khong tinh duoc ty le
// chap nhan goi y. Nay ghi ca shown / shown_extra / opened / swapped / saved / completed,
// kem algo_version de so sanh thuat toan sau nay. "skipped" = shown ma khong
// completed trong ngay -> SUY RA khi phan tich (scripts/analyze-metrics.ts).
//
// Ghi loi KHONG duoc lam hong trang cua hoc sinh -> nuot loi, chi log.
// Idempotent theo (hoc sinh, ngay, hoat dong, su kien): render lai khong trung.
// ============================================================================
export async function logRecommendationEvents(
  studentId: string,
  events: { activityId: string; event: RecommendationEventType; propensity?: number; nCandidates?: number }[]
): Promise<void> {
  const repo = getRepository();
  const date = todayISOVN();
  for (const { propensity = null, nCandidates = null, ...e } of events) {
    try {
      await repo.logRecommendationEvent({ studentId, date, algoVersion: ALGO_VERSION, propensity, nCandidates, ...e });
    } catch (err) {
      console.error("[events] Khong ghi duoc su kien goi y:", err);
    }
  }
}
