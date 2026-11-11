"use server";

import { redirect } from "next/navigation";
import { parseOpenedAt } from "@/lib/activity-timing";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { RIASEC_ITEMS } from "@/lib/content/riasec-items";
import { isRiasecPending } from "@/lib/profile-service";
import { RIASEC_ITEMS_VERSION } from "@/lib/riasec";

/** Nop bai doi chieu RIASEC (de xuat B1): du 30 cau, moi cau 1-5; chi khi em dang duoc moi va chua lam. */
export async function submitRiasecAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/hoc-sinh/dang-nhap");
  if (!(await isRiasecPending(session.id))) redirect("/hoc-sinh/ho-so");

  const answers: Record<string, number> = {};
  for (const item of RIASEC_ITEMS) {
    const v = Number(formData.get(`r_${item.id}`));
    if (!Number.isInteger(v) || v < 1 || v > 5) redirect("/hoc-sinh/riasec?loi=1");
    answers[item.id] = v;
  }
  const now = Date.now();
  try {
    await getRepository().createRiasecAttempt({
      studentId: session.id,
      itemsVersion: RIASEC_ITEMS_VERSION,
      answers,
      startedAt: parseOpenedAt(formData.get("startedAt"), now, 6),
      completedAt: new Date(now).toISOString(),
    });
  } catch (err) {
    console.error("[riasec] Khong ghi duoc bai lam (co the bam nop 2 lan):", err);
  }
  redirect("/hoc-sinh/ho-so?riasec=1");
}
