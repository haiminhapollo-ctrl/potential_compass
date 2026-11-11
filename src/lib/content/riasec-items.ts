import type { RiasecType } from "../types";

// ============================================================================
// BAI DOI CHIEU RIASEC - O*NET Interest Profiler, ban rut gon Mini-IP (30 cau, 5 cau moi loai)
// ----------------------------------------------------------------------------
// NHOM DU AN DIEN NOI DUNG (chua co trong code):
//   1) Lay 30 cau + khoa cham (cau nao thuoc loai nao) cua Mini-IP tu O*NET:
//      dang ky O*NET Web Services (mien phi) hoac bao cao Mini-IP: https://www.onetcenter.org/dl_files/Mini-IP.pdf
//   2) Dich sang tieng Viet de hieu voi hoc sinh lop 9 (nho giao vien doc thu), dien vao `text`,
//      sua `type` cho DUNG khoa cham chinh thuc, giu thu tu cau nhu ban goc.
//   3) Giay phep O*NET Tools Developer License: giu ghi nguon + thong bao dieu chinh (RIASEC_NOTICE trong
//      src/lib/riasec.ts, hien o trang lam bai) va khong ngu y Bo Lao dong Hoa Ky bao tro.
// Khi CON cau trong `text`, giao vien KHONG bat duoc bai nay (RIASEC_READY = false).
// ============================================================================

export interface RiasecItem {
  id: string;
  type: RiasecType;
  text: string;
}

const CYCLE: RiasecType[] = ["R", "I", "A", "S", "E", "C"];

/** 30 cho trong - `type` tam theo vong R-I-A-S-E-C, PHAI sua theo khoa cham chinh thuc khi dien cau. */
export const RIASEC_ITEMS: RiasecItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: `ip${String(i + 1).padStart(2, "0")}`,
  type: CYCLE[i % 6]!,
  text: "",
}));

/** Thang tra loi 5 muc cua O*NET Interest Profiler (Strongly Dislike ... Strongly Like). */
export const RIASEC_SCALE = ["Rất không thích", "Không thích", "Không chắc", "Thích", "Rất thích"] as const;
