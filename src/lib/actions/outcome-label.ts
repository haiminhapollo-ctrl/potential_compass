import "server-only";
import { getRepository } from "../data";
import { todayISOVN } from "../date";
import type { DomainCode, OutcomeLabel } from "../types";

// ============================================================================
// THU NHAN DANH GIA (ground truth) - bao cao DS loi 12: truoc day khong co bien
// muc tieu nao de kiem chung goi y. Nay thu cac loai nhan, gan kem top 3 va
// phien ban cong thuc TAI THOI DIEM danh gia:
//   - hoc sinh, TRUOC khi xem ket qua (de xuat A2): cuoi bai khao sat form trong,
//     "em thay minh giong nhom nao?" (toi da 3) - khong bi neo vao ket qua.
//   - hoc sinh, SAU khi xem: "ket qua nay co giong em khong?" - de bi neo vao dieu
//     he thong vua noi, nen KHONG tron chung voi nhan truoc khi xem.
//   - giao vien: "3 nhom dung dau co phu hop voi em nay khong?"
// Chi so dong thuan + kiem dinh hoan vi tinh trong scripts/analyze-metrics.ts.
// ============================================================================

export function parseAgreement(raw: FormDataEntryValue | null): 1 | 2 | 3 | null {
  const n = Number(raw);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

/** Luu nhan; bam lai cung cau tra loi trong cung ngay thi khong ghi trung. */
export async function recordOutcomeLabel(input: {
  studentId: string;
  rater: OutcomeLabel["rater"];
  raterId: string;
  /** pre_result: agreement = null (chua xem ket qua). post_result: bat buoc co agreement. */
  labelPhase: OutcomeLabel["labelPhase"];
  agreement: 1 | 2 | 3 | null;
  preferredDomains: DomainCode[];
}): Promise<void> {
  if ((input.labelPhase === "pre_result") !== (input.agreement === null)) return;
  const repo = getRepository();
  const [profile, labels] = await Promise.all([repo.getProfile(input.studentId), repo.listOutcomeLabels([input.studentId])]);
  if (!profile?.surveyCompleted) return;

  const today = todayISOVN();
  const dup = labels.some(
    (l) =>
      l.rater === input.rater &&
      l.raterId === input.raterId &&
      l.labelPhase === input.labelPhase &&
      todayISOVN(new Date(l.createdAt)) === today &&
      l.agreement === input.agreement &&
      l.preferredDomains.join() === input.preferredDomains.join() &&
      l.topDomains.join() === profile.topDomains.join()
  );
  if (dup) return;

  await repo.saveOutcomeLabel({
    ...input,
    topDomains: profile.topDomains,
    scoringVersion: profile.scoringVersion,
  });
}
