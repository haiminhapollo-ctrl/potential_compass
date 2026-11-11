import { RIASEC_ITEMS, type RiasecItem } from "./content/riasec-items";
import { hash32 } from "./survey";
import type { DomainCode, RiasecType } from "./types";

// ============================================================================
// DOI CHIEU RIASEC (de xuat B1 - hieu luc hoi tu): mot MAU CON (lop giao vien bat) lam them O*NET Mini-IP;
// scripts/analyze-survey.ts muc F tinh tuong quan giua diem 8 nhom cua Potential Compass va 6 diem RIASEC.
// Hoc sinh KHONG xem ket qua RIASEC (chi de kiem dinh bo khao sat).
// ============================================================================

export const RIASEC_TYPES: { code: RiasecType; name: string }[] = [
  { code: "R", name: "Thực tế (Realistic)" },
  { code: "I", name: "Nghiên cứu (Investigative)" },
  { code: "A", name: "Nghệ thuật (Artistic)" },
  { code: "S", name: "Xã hội (Social)" },
  { code: "E", name: "Quản lý (Enterprising)" },
  { code: "C", name: "Nghiệp vụ (Conventional)" },
];

/**
 * BANG ANH XA 8 nhom -> loai RIASEC du kien tuong quan manh nhat. B1: CHOT TRUOC va chuyen gia huong nghiep / giao vien
 * DUYET TRUOC KHI XEM DU LIEU; KHONG duoc sua sau khi xem du lieu de tang tuong quan. Da duyet 18/10/2026 (chua co
 * du lieu RIASEC nao) - hash luc duyet ghi o docs/data-governance.md; sua bang => hash doi, phai duyet lai TRUOC khi xem.
 * Analyze in kem MAPPING_HASH: sau khi duyet, ghi hash vao docs; hash doi = bang da bi sua.
 */
export const DOMAIN_TO_RIASEC: Record<DomainCode, RiasecType> = {
  KHOA_HOC_KHAM_PHA: "I",
  KY_THUAT_CONG_NGHE: "R",
  NONG_LAM_NGU_MOI_TRUONG: "R",
  KINH_DOANH_DICH_VU: "E",
  SUC_KHOE_CONG_DONG: "S",
  NGHE_THUAT_SANG_TAO: "A",
  XA_HOI_GIAO_DUC_NHAN_VAN: "S",
  THE_CHAT_THU_CONG: "R",
};
/** Ai duyet bang anh xa, ngay nao (TRUOC khi xem du lieu RIASEC). null = chua duyet => analyze canh bao. */
export const MAPPING_APPROVAL: { by: string; date: string } | null = { by: "chuyên gia Bùi Văn Trung", date: "2026-10-18" };
export const MAPPING_HASH = hash32(JSON.stringify(DOMAIN_TO_RIASEC)).toString(16).padStart(8, "0");

/** Du 30 cau da co ban dich => giao vien moi bat duoc bai RIASEC cho lop. */
export const RIASEC_READY = RIASEC_ITEMS.length === 30 && RIASEC_ITEMS.every((i) => i.text.trim().length > 0);
export const RIASEC_ITEMS_VERSION = hash32(JSON.stringify(RIASEC_ITEMS)).toString(16).padStart(8, "0");

/** Diem tung loai = tong 5 cau (moi cau 1-5) => 5-25. Thieu cau => null cho loai do. */
export function riasecScores(answers: Record<string, number>, items: RiasecItem[] = RIASEC_ITEMS): Record<RiasecType, number | null> {
  const out = {} as Record<RiasecType, number | null>;
  for (const t of RIASEC_TYPES) {
    const mine = items.filter((i) => i.type === t.code);
    const vals = mine.map((i) => answers[i.id]).filter((v): v is number => Number.isInteger(v) && v! >= 1 && v! <= 5);
    out[t.code] = vals.length === mine.length && mine.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
  }
  return out;
}

/**
 * Ghi nguon + thong bao dieu chinh theo O*NET Tools Developer License (hien o trang lam bai, README).
 * Cau tieng Anh la thong bao bat buoc; khong ngu y Bo Lao dong Hoa Ky bao tro Potential Compass.
 */
export const RIASEC_NOTICE = {
  vi: "Bài này dựa trên O*NET Interest Profiler (bản rút gọn Mini-IP) của Bộ Lao động Hoa Kỳ (USDOL/ETA), dùng theo giấy phép O*NET Tools Developer License. Potential Compass đã dịch sang tiếng Việt và điều chỉnh cách trình bày cho học sinh. USDOL/ETA chưa duyệt, chưa kiểm định và không bảo trợ bản điều chỉnh này.",
  en: "Potential Compass has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.",
  modifications:
    "Điều chỉnh: dịch 30 câu và thang trả lời sang tiếng Việt; hiển thị trên web trong ứng dụng; chỉ dùng để kiểm định bộ khảo sát của Potential Compass (học sinh không nhận kết quả RIASEC). Miễn trừ: nội dung được cung cấp nguyên trạng, không có bảo đảm.",
  licenseUrl: "https://www.onetcenter.org/license_toolsdev.html",
};
