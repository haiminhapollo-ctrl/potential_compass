import { TERM_INFO } from "../curriculum";
import { getDomain } from "../domains";
import { notableDomains } from "./scoring";
import type { CurriculumTerm, Domain, DomainCode, DomainScore } from "../types";

// ============================================================================
// TEMPLATE NHAN XET (fallback khi CHUA cau hinh GEMINI_API_KEY)
// ----------------------------------------------------------------------------
// He thong PHAI hoat dong day du ngay ca khi chua co API key AI (chua cau
// hinh key, hoac Gemini API loi/qua han muc). Nhan xet template van bam sat
// tinh than ke hoach: "khong dua ra ket luan tuyet doi ve nghe nghiep".
// ============================================================================

// Cau NGAN (<= 30 tu/cau, xem checkInsightText) - nguoi doc la hoc sinh lop 9 vung cao.
/** Tang khi doi noi dung prompt (gemini.ts) hoac template o day - luu kem moi doan van sinh ra (bao cao DS loi 1, 15). */
export const PROMPT_VERSION = "p6-2026-11";

const OPENERS = [
  "Cảm ơn em đã làm khảo sát và các hoạt động.",
  "Dựa trên bài khảo sát và các hoạt động em đã làm, đây là vài nhận xét.",
  "Hệ thống đã xem câu trả lời khảo sát và các hoạt động của em.",
];

const CLOSERS = [
  "Đây mới là gợi ý ban đầu. Em làm thêm nhiều hoạt động khác nhau thì hồ sơ sẽ sát với em hơn.",
  "Kết quả sẽ còn thay đổi khi em thử thêm, kể cả ở những nhóm em chưa nghĩ tới.",
  "Kết quả này để em hiểu thêm về mình, không dùng để quyết định em sẽ làm nghề gì.",
];

function pick<T>(arr: T[], seed: number): T {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx] as T;
}

function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export interface InsightContext {
  studentId: string;
  topDomains: DomainCode[];
  scores: DomainScore[];
  /** Hoc ky lop dang hoc - nhan xet chi buoc tiep theo dung hoc ky (curriculum.ts). */
  term: CurriculumTerm;
}

/** 1 cau: nghe cua nhom hoc duoc ngay sau lop 9 hay bat buoc hoc tiep (khoa cung Y te / Su pham). */
export function branchSentence(domain: Domain): string {
  return domain.academicOnly
    ? `Nghề của nhóm này cần học hết THPT rồi học cao đẳng hoặc đại học.`
    : `Nhóm này có cả nghề học được ngay sau lớp 9, như ${(domain.vocationalBranch ?? "").split(" (")[0]!.toLowerCase()}.`;
}

export function buildTemplateInsight(ctx: InsightContext): string {
  const seed = seedFromString(ctx.studentId + ctx.topDomains.join(","));
  const opener = pick(OPENERS, seed);
  const closer = pick(CLOSERS, seed + 1);

  const top = ctx.topDomains
    .map((code) => getDomain(code))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  if (top.length === 0) {
    return "Em chưa làm đủ khảo sát và hoạt động nên chưa có nhận xét. Em làm bài khảo sát ban đầu trước nhé.";
  }

  // Chi goi "noi bat" nhom CO NHAN (nguong hieu chuan, scoring.ts) - truoc day top 3 luon duoc goi
  // la noi bat, ke ca voi ho so cua nguoi tra loi bua (de xuat A1).
  const notable = notableDomains(ctx.scores);
  const [first, second] = notable.map((c) => getDomain(c)!);
  if (!first) {
    return (
      `${opener} Hiện chưa có nhóm nào cao hơn hẳn các nhóm khác, lúc mới bắt đầu thường là vậy. ` +
      `Tuần này em thử hoạt động ở vài nhóm khác nhau để hồ sơ rõ hơn nhé. ${TERM_INFO[ctx.term].nextStep}`
    );
  }
  let body = `Em đang hứng thú nhất với nhóm "${first.name}". ${branchSentence(first)}`;
  if (second) body += ` Nhóm "${second.name}" cũng nổi bật.`;

  return `${opener} ${body} ${TERM_INFO[ctx.term].nextStep} ${closer}`;
}

export function buildWeeklyReviewTemplate(ctx: InsightContext & { activitiesCompleted: number }): string {
  const notable = notableDomains(ctx.scores).map((c) => getDomain(c)?.name).filter(Boolean);
  return (
    `Tuần này em đã làm ${ctx.activitiesCompleted} hoạt động. ` +
    (notable.length > 0
      ? `Nhóm nổi bật hiện tại: ${notable.join(", ")}. `
      : "Hồ sơ của em chưa có nhóm nào nổi bật hẳn. ") +
    `Tuần tới em thử thêm vài hoạt động ở những nhóm em còn ít làm nhé. ${TERM_INFO[ctx.term].nextStep}`
  );
}

// ============================================================================
// KIEM DUYET CAU TRA LOI CUA GEMINI truoc khi hien cho hoc sinh (bao cao mentor:
// "co gioi han muc doc hieu va loc noi dung"). Diem so do QUY TAC tinh (scoring.ts),
// Gemini chi dien giai - neu cau tra loi khong dat, dung template o tren.
// ============================================================================
const MAX_WORDS = 110;
const MAX_SENTENCE_WORDS = 30;

/** Tu/cum tu dang tu (lookaround \p{L}: \b cua JS khong hieu chu co dau - "ngu" se khop ca "nguồn"). */
function phrase(p: string): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${p})(?!\\p{L})`, "iu");
}

const BLOCKED: { re: RegExp; reason: string }[] = [
  { re: /https?:\/\/|www\./i, reason: "co duong link" },
  { re: phrase("ngu|dốt|kém cỏi|vô dụng|thất bại|lười biếng"), reason: "tu ngu che bai" },
  { re: phrase("chắc chắn sẽ|nhất định sẽ trở thành|không hợp với nghề|không thể làm được"), reason: "ket luan tuyet doi" },
  { re: phrase("con gái|con trai|dân tộc|nghèo"), reason: "nhac gioi tinh/dan toc/hoan canh" },
];

/** null = dat; nguoc lai tra ve ly do bi loai (de log). */
export function checkInsightText(text: string): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 15) return "qua ngan";
  if (words.length > MAX_WORDS) return `qua dai (${words.length} tu)`;
  const longest = Math.max(...text.split(/[.!?…]+/).map((x) => x.split(/\s+/).filter(Boolean).length));
  if (longest > MAX_SENTENCE_WORDS) return `cau qua dai (${longest} tu)`;
  if ((text.match(/[\u00C0-\u1EF9]/g) ?? []).length < 10) return "khong phai tieng Viet co dau";
  return BLOCKED.find((b) => b.re.test(text))?.reason ?? null;
}
