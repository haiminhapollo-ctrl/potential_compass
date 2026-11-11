import type { InsightProvenance } from "@/lib/types";

/**
 * Noi ro nguon goc doan nhan xet (bao cao DS loi 1): diem do bo cham diem THEO
 * QUY TAC tinh; AI (neu co) chi viet lai diem thanh loi van, khong du doan gi.
 */
export function InsightSourceNote({ provenance }: { provenance: InsightProvenance | null }) {
  const by =
    provenance?.source === "gemini"
      ? `do AI (${provenance.model ?? "Gemini"}) viết lại từ điểm`
      : "viết theo mẫu có sẵn từ điểm";
  return (
    <p className="pretty mt-3 text-sm font-medium text-ink-500">
      Cách có kết quả: câu trả lời khảo sát + đánh giá hoạt động → điểm tính theo quy tắc cố định → nhận xét {by}.
      Đây là hồ sơ <strong className="font-bold">sở thích</strong> để khám phá, không phải bài kiểm tra năng lực hay
      kết luận nghề nghiệp.
    </p>
  );
}
