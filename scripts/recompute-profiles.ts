/**
 * TINH LAI HO SO SO THICH cho MOI hoc sinh + ghi snapshot tuan hien tai - chay
 * sau khi doi cong thuc cham diem (tang SCORING_VERSION, xem
 * src/lib/recommendation/scoring.ts). Cung logic voi cron hang ngay
 * (src/app/api/cron/snapshot/route.ts).
 *
 * Chay: npm run recompute:profiles   (DATA_BACKEND trong .env.local)
 * Co --conditions=react-server de goi "server-only" resolve ve module rong khi
 * chay ngoai Next.js. An toan chay nhieu lan.
 */
import { recomputeAllProfiles } from "../src/lib/profile-service";

recomputeAllProfiles("recompute")
  .then(({ total, failed }) => {
    console.log(`Da tinh lai ${total} ho so.`);
    if (failed.length) {
      console.error(`❌ ${failed.length} ho so loi: ${failed.join(", ")}`);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ Loi khi tinh lai ho so:", err);
    process.exit(1);
  });
