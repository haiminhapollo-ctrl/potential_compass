import type { ContentTerm, CurriculumTerm, RecommendedTrack, SurveyQuestion, TrackProfile } from "./types";

// ============================================================================
// HOC KY THEO CHUONG TRINH (GDPT 2018 - Cong nghe 8, Cong nghe 9 dinh huong nghe
// nghiep, KHTN; Thong tu 32/2018/TT-BGDDT). Lop (class_groups.curriculum_term) quyet
// dinh hoc sinh thay goi cau hoi + hoat dong nao: cau/hoat dong "ALL" (bo cau NEO,
// so sanh duoc giua cac ky) + goi rieng cua hoc ky dang hoc. Giao vien doi hoc ky
// cho ca lop o trang Lop hoc khi sang ky moi.
// Logic THUAN - dung chung cho trang, repository va script.
// ============================================================================

export const CURRICULUM_TERMS: CurriculumTerm[] = ["G8_HK1", "G8_HK2", "G9_HK1", "G9_HK2"];

/** Lop tao truoc 11/2026 / chua chon: lop 9 hoc ky 1 (pilot dang chay voi hoc sinh lop 9). */
export const DEFAULT_TERM: CurriculumTerm = "G9_HK1";

/** Hoc ky chot luong: chi tu day he thong moi gan nhan luong khac DUAL_EXPLORATION (tru khoa cung Y/Su pham). */
export const TRACK_DECISION_TERM: CurriculumTerm = "G9_HK2";

export const TERM_INFO: Record<CurriculumTerm, { label: string; focus: string; nextStep: string }> = {
  G8_HK1: {
    label: "Lớp 8 - Học kỳ 1",
    focus: "Bản vẽ kỹ thuật, vật liệu cơ khí, truyền chuyển động",
    nextStep: "Học kỳ này em để ý giờ Công nghệ: thử đọc bản vẽ và tháo lắp một đồ vật nhỏ cùng người lớn.",
  },
  G8_HK2: {
    label: "Lớp 8 - Học kỳ 2",
    focus: "Mạch điện gia đình, an toàn điện, thiết kế kỹ thuật",
    nextStep: "Học kỳ này em học về điện trong nhà: hãy hỏi người lớn cách dùng điện an toàn và quan sát họ sửa đồ điện.",
  },
  G9_HK1: {
    label: "Lớp 9 - Học kỳ 1",
    focus: "Định hướng nghề nghiệp, lắp đặt mạng điện trong nhà, nông - lâm nghiệp",
    nextStep: "Học kỳ này em thử hỏi chuyện một người làm nghề em thích xem mỗi ngày họ làm gì.",
  },
  G9_HK2: {
    label: "Lớp 9 - Học kỳ 2",
    focus: "Chọn hướng đi sau lớp 9: học nghề hay học tiếp THPT",
    nextStep: "Học kỳ này em cùng gia đình và thầy cô bàn hướng đi sau lớp 9, tìm hiểu trường nghề và trường THPT gần nhà.",
  },
};

export function isCurriculumTerm(v: unknown): v is CurriculumTerm {
  return typeof v === "string" && (CURRICULUM_TERMS as string[]).includes(v);
}

/** Noi dung dung cho hoc ky `term`: muc "ALL" + muc cua dung hoc ky do. */
export function forTerm<T extends { curriculumTerm: ContentTerm }>(items: T[], term: CurriculumTerm): T[] {
  return items.filter((x) => x.curriculumTerm === "ALL" || x.curriculumTerm === term);
}

/** Bo cau khao sat cua 1 lop: cau DANG DUNG (active) cua hoc ky. Cau da thay (active=false) chi con trong lich su. */
export function surveyQuestionsFor(questions: SurveyQuestion[], term: CurriculumTerm): SurveyQuestion[] {
  return forTerm(questions.filter((q) => q.active), term);
}

/** Ten nhan luong cho GIAO VIEN (hoc sinh khong thay nhan luong). */
export const TRACK_LABEL: Record<RecommendedTrack, { short: string; long: string }> = {
  VOCATIONAL_9PLUS: { short: "Nghiêng học nghề", long: "Nghiêng về học nghề sau lớp 9 (trung cấp/cao đẳng hệ 9+)" },
  ACADEMIC_HIGH_SCHOOL: { short: "Nghiêng học THPT", long: "Nghiêng về học tiếp THPT rồi cao đẳng/đại học" },
  DUAL_EXPLORATION: { short: "Đang khám phá", long: "Đang khám phá cả hai hướng" },
};

export const TRACK_REASON_TEXT: Record<TrackProfile["reason"], string> = {
  khoa_cung: "Nhóm nổi bật nhất của em là Y tế hoặc Sư phạm: các nghề này bắt buộc học hết THPT rồi học cao đẳng/đại học.",
  chenh_lech: "Câu trả lời của em nghiêng rõ về một phía (thực hành hoặc học thuật), mức mà người chọn bừa hiếm khi đạt.",
  chua_du_can_cu: "Câu trả lời chưa nghiêng rõ về phía nào để gợi ý một luồng.",
  chua_toi_hoc_ky_chot: "Hệ thống chỉ gợi ý luồng từ Lớp 9 - Học kỳ 2; trước đó chỉ theo dõi thiên hướng.",
};
