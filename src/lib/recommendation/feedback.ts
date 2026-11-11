import type { ActivityLog, DomainCode } from "../types";

// ============================================================================
// PHAN HOI THEO NGU CANH SAU MOI HOAT DONG (rule-based, KHONG dung AI)
// ----------------------------------------------------------------------------
// Bao cao mentor: "du hoc sinh chon option nao, he thong cung khong dua ra cach
// xu ly - nhan xet chi de do cho nguoi giam sat xem". File nay phan nhanh theo
// cau tra loi cua hoc sinh de dua ra loi dong vien + buoc tiep theo cu the.
// Quy tac thuan, de giai thich, de kiem thu (xem scripts/check-logic.ts).
//
// Cac lua chon dat o day (khong o component) de server & client dung CHUNG mot
// chuoi - quy tac so khop theo dung chuoi nay.
// ============================================================================

export const FEELING_OPTIONS = [
  "Em muốn thử thêm việc giống thế này",
  "Em học được điều mới",
  "Em làm được nhưng thấy bình thường",
  "Hơi khó, em cần người hướng dẫn",
] as const;

export const CONFIDENCE_OPTIONS = [
  { value: 1, label: "Chưa làm được" },
  { value: 2, label: "Làm được một phần" },
  { value: 3, label: "Làm tốt" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Dễ" },
  { value: 2, label: "Vừa sức" },
  { value: 3, label: "Khó" },
] as const;

export type FeedbackKind = "need_help" | "not_for_me" | "want_more" | "learned" | "neutral";

export interface ActivityFeedback {
  kind: FeedbackKind;
  title: string;
  message: string;
  /** Goi y kham pha them uu tien nhom nay (null = rong khap cac nhom it thu). */
  focusDomain: DomainCode | null;
  /** Hien vi du tham khao + tai lieu MUC DE de hoc sinh thu lai. */
  showHelp: boolean;
}

type FeedbackInput = Pick<ActivityLog, "interestRating" | "reflectionText" | "confidence" | "difficulty">;

export function buildActivityFeedback(log: FeedbackInput, domain: { code: DomainCode; name: string }): ActivityFeedback {
  const needHelp =
    log.reflectionText === FEELING_OPTIONS[3] || log.confidence === 1 || (log.difficulty === 3 && log.confidence !== 3);

  // Uu tien 1: hoc sinh dang gap kho -> ho tro truoc, chuyen chu de sau.
  if (needHelp) {
    return {
      kind: "need_help",
      title: "Lần đầu thấy khó là chuyện thường",
      message:
        (log.interestRating >= 4 ? "Có vẻ em thích hoạt động này, chỉ là chưa quen. " : "") +
        "Em xem ví dụ và tài liệu dễ bên dưới rồi thử lại lúc khác. Em cũng có thể nhờ thầy cô hoặc người lớn trong nhà chỉ thêm.",
      focusDomain: null,
      showHelp: true,
    };
  }

  if (log.interestRating <= 2) {
    return {
      kind: "not_for_me",
      title: "Cảm ơn em đã thử",
      message: "Biết mình chưa thích việc gì cũng có ích. Lần sau em thử một hoạt động ở nhóm khác xem sao.",
      focusDomain: null,
      showHelp: false,
    };
  }

  if (log.reflectionText === FEELING_OPTIONS[0] || log.interestRating >= 4) {
    return {
      kind: "want_more",
      title: `Có vẻ em hợp với nhóm "${domain.name}"`,
      message: "Em có thể làm thêm một hoạt động cùng nhóm ngay bây giờ, hoặc xem tài liệu để tìm hiểu sâu hơn.",
      focusDomain: domain.code,
      showHelp: false,
    };
  }

  if (log.reflectionText === FEELING_OPTIONS[1]) {
    return {
      kind: "learned",
      title: "Em vừa biết thêm một điều mới",
      message: "Muốn biết thêm, em xem tài liệu bên dưới hoặc thử một hoạt động khác cùng nhóm.",
      focusDomain: domain.code,
      showHelp: false,
    };
  }

  return {
    kind: "neutral",
    title: "Em đã làm xong hoạt động",
    message: "Mỗi hoạt động giúp hồ sơ của em rõ hơn. Lần sau em thử một nhóm khác xem sao.",
    focusDomain: null,
    showHelp: false,
  };
}

// ============================================================================
// TIN HIEU TRAI CHIEU (bao cao DS loi 13): so sao noi mot dang, phan tra loi noi
// mot neo. Quy tac tu khoa DON GIAN - chua phai mo hinh cam xuc; chi de giao vien
// biet nen hoi them, KHONG dung de cham diem. Can mau gan nhan tay cua giao vien
// truoc khi tin bat ky phan loai tu dong nao.
// ============================================================================
const NEGATIVE_WORDS = ["chán", "không thích", "ghét", "khó chịu", "mệt", "sợ", "buồn", "không muốn"];
const POSITIVE_WORDS = ["thích", "vui", "hay quá", "thú vị", "muốn làm nữa", "muốn thử"];

function hasPhrase(text: string, phrases: string[]): boolean {
  const t = text.toLowerCase();
  return phrases.some((p) => new RegExp(`(?<!\\p{L})${p}(?!\\p{L})`, "u").test(t));
}

/** Phan tu viet co sac thai: "negative" / "positive" / null. Kiem tra cum phu dinh truoc ("không thích" ⊃ "thích"). */
export function noteTone(note: string): "negative" | "positive" | null {
  if (!note.trim()) return null;
  if (hasPhrase(note, NEGATIVE_WORDS)) return "negative";
  if (hasPhrase(note, POSITIVE_WORDS)) return "positive";
  return null;
}

export function isMixedSignal(log: Pick<ActivityLog, "interestRating" | "reflectionText" | "note">): boolean {
  const tone = noteTone(log.note);
  if (log.interestRating >= 4 && (tone === "negative" || log.reflectionText === FEELING_OPTIONS[2])) return true;
  if (log.interestRating <= 2 && (tone === "positive" || log.reflectionText === FEELING_OPTIONS[0])) return true;
  return false;
}
