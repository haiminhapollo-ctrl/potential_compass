import type { Domain } from "./types";

// ============================================================================
// 8 NHOM LINH VUC - ban 11/2026 "phan luong & sat thuc te mien nui"
// ----------------------------------------------------------------------------
// GIU NGUYEN 8 MA (khoa ngoai trong DB, lich su su kien) nhung NOI DUNG doi nghia o
// 3 nhom (THE_CHAT_THU_CONG: the thao -> xay dung/co khi; KINH_DOANH_DICH_VU: bo quan
// tri -> nong san/du lich ban dia; KY_THUAT_CONG_NGHE: chung chung -> dien/dien mat
// troi/xe dien). Vi vay diem truoc SCORING_VERSION v5 KHONG so sanh truc tiep voi diem
// sau v5 (scoring.ts) - cau khao sat doi nghia duoc cho nghi (active=false), khong sua de.
//
// Nguyen tac:
// 1) Nhom nao cung co 2 nhanh: hoc nghe ngay sau lop 9 (trung cap/cao dang he 9+) va
//    hoc tiep THPT -> cao dang/dai hoc. Rieng Y te & Su pham: academicOnly = true (khoa
//    cung - nghe bat buoc co bang cao dang/dai hoc, khong goi y hoc nghe sau lop 9).
// 2) Nghe cu the, hinh dung duoc o vung cao (thieu dien, thieu nuoc mua kho, sat lo, du
//    lich cong dong) thay vi nhan rong kieu "Quan tri kinh doanh".
// 3) Ten trung lap gioi: khong "anh tho", "co giao"; nhom Xay dung - Co khi GIU nghe thu
//    cong truyen thong (det, dan lat, moc) de khong mat nhom ton trong nghe cua dong bao.
//
// MAU SAC (colorHex): 8 tong dat/tho cam tram - chi dung cho cham hinh thoi trong Badge,
// LUON co ten nhom in canh ben => khong dung mau de phan biet nhom.
// ============================================================================

export const DOMAINS: Domain[] = [
  {
    code: "KHOA_HOC_KHAM_PHA",
    name: "Khoa học, Kiểm nghiệm & Quan trắc",
    shortDescription:
      "Thích tìm hiểu vì sao, đo đạc và thử nghiệm: đo độ chua của đất, kiểm tra nước sinh hoạt, theo dõi mưa nắng để báo lũ.",
    whyRelevant:
      "Xã nào cũng cần người biết kiểm tra đất, nước và thời tiết để phòng lũ quét, sạt lở và chọn cây trồng hợp đất.",
    sampleCareers: ["Kỹ thuật viên kiểm nghiệm đất - nước", "Kỹ thuật viên trắc địa", "Quan trắc khí tượng - thủy văn", "Nhà nghiên cứu", "Kỹ sư môi trường"],
    vocationalBranch: "Kỹ thuật viên trắc địa, kiểm nghiệm đất - nước (trung cấp/cao đẳng)",
    academicBranch: "Nghiên cứu khoa học kỹ thuật, khí tượng - thủy văn, môi trường (đại học)",
    academicOnly: false,
    icon: "🔬",
    colorHex: "#2E4A7D", // cham (nhuom cham tho cam)
  },
  {
    code: "KY_THUAT_CONG_NGHE",
    name: "Điện, Điện mặt trời & Xe điện",
    shortDescription:
      "Thích tháo lắp, đấu dây, sửa đồ điện: bóng đèn, quạt, ắc-quy, xe đạp điện, tấm pin mặt trời.",
    whyRelevant:
      "Nhiều bản còn thiếu điện ổn định; người biết lắp điện mặt trời, sửa xe điện có thể mở tiệm ngay tại nhà.",
    sampleCareers: ["Thợ điện dân dụng", "Lắp đặt điện mặt trời", "Sửa chữa xe điện", "Sửa chữa thiết bị điện tử", "Kỹ sư điện - tự động hóa", "Công nghệ thông tin"],
    vocationalBranch: "Thợ điện dân dụng, lắp đặt điện mặt trời, sửa chữa xe điện (trung cấp/cao đẳng)",
    academicBranch: "Kỹ sư điện, tự động hóa, công nghệ thông tin (đại học)",
    academicOnly: false,
    icon: "⚡",
    colorHex: "#5E6B73", // xam sat
  },
  {
    code: "NONG_LAM_NGU_MOI_TRUONG",
    name: "Kỹ thuật Nông - Lâm nghiệp & Môi trường",
    shortDescription:
      "Thích làm vườn, chăm rừng, nuôi con vật và tính toán chuyện nước tưới, sâu bệnh, mùa vụ.",
    whyRelevant:
      "Mùa khô thiếu nước, rừng dễ cháy: người biết chọn máy bơm, phòng cháy rừng, trồng cây chất lượng cao rất cần ở vùng cao.",
    sampleCareers: ["Kỹ thuật viên nông nghiệp công nghệ cao", "Kỹ thuật viên lâm nghiệp", "Thú y", "Khuyến nông", "Kỹ sư nông lâm", "Dự án môi trường"],
    vocationalBranch: "Kỹ thuật viên nông nghiệp chất lượng cao, lâm nghiệp, thú y (trung cấp/cao đẳng)",
    academicBranch: "Kỹ sư nông lâm, dự án môi trường - biến đổi khí hậu (đại học)",
    academicOnly: false,
    icon: "🌱",
    colorHex: "#4D7C0F", // xanh lua
  },
  {
    code: "KINH_DOANH_DICH_VU",
    name: "Thương mại Nông sản & Du lịch Bản địa",
    shortDescription:
      "Thích tính tiền lời lỗ, bán hàng, giới thiệu đặc sản và đón khách du lịch về bản.",
    whyRelevant:
      "Nông sản, đặc sản và homestay của bản cần người biết tính vốn, bán hàng online và đón khách.",
    sampleCareers: ["Bán hàng nông sản online", "Homestay - du lịch cộng đồng", "Hướng dẫn viên địa phương", "Nấu ăn - ẩm thực địa phương", "Kế toán hợp tác xã"],
    vocationalBranch: "Nghiệp vụ bán hàng, du lịch - lễ tân, nấu ăn (trung cấp/cao đẳng)",
    academicBranch: "Kinh tế nông nghiệp, du lịch, kế toán (cao đẳng/đại học)",
    academicOnly: false,
    icon: "🧺",
    colorHex: "#B7791F", // dong thau
  },
  {
    code: "SUC_KHOE_CONG_DONG",
    name: "Y tế, Điều dưỡng & Dược",
    shortDescription:
      "Thích chăm sóc người ốm, tìm hiểu cơ thể, sơ cứu và các cây thuốc quanh bản.",
    whyRelevant:
      "Trạm y tế xã vùng cao luôn thiếu người. Muốn làm nghề y phải học hết THPT rồi học cao đẳng hoặc đại học.",
    sampleCareers: ["Điều dưỡng", "Bác sĩ", "Dược sĩ", "Hộ sinh", "Kỹ thuật viên xét nghiệm"],
    vocationalBranch: null,
    academicBranch: "Học hết THPT, rồi học cao đẳng/đại học Y, Dược, Điều dưỡng",
    academicOnly: true,
    icon: "🩺",
    colorHex: "#B4535A", // hong dat
  },
  {
    code: "NGHE_THUAT_SANG_TAO",
    name: "Sân khấu, Ánh sáng & Đa phương tiện",
    shortDescription:
      "Thích dàn dựng sân khấu, chỉnh âm thanh ánh sáng, quay và dựng video, vẽ, làm nhạc.",
    whyRelevant:
      "Lễ hội, đám cưới, sự kiện của xã và video quảng bá đặc sản đều cần người biết dựng sân khấu, quay dựng.",
    sampleCareers: ["Kỹ thuật âm thanh - ánh sáng", "Dựng sân khấu sự kiện", "Quay dựng video", "Thiết kế đồ họa", "Truyền thông"],
    vocationalBranch: "Kỹ thuật âm thanh - ánh sáng, dựng sân khấu, quay dựng video (trung cấp/cao đẳng)",
    academicBranch: "Thiết kế sáng tạo, truyền thông đa phương tiện (đại học)",
    academicOnly: false,
    icon: "🎬",
    colorHex: "#C2410C", // dat nung
  },
  {
    code: "XA_HOI_GIAO_DUC_NHAN_VAN",
    name: "Sư phạm, Giáo dục & Công tác xã hội",
    shortDescription:
      "Thích giảng lại cho người khác hiểu, kèm em nhỏ học bài, kết nối và giúp đỡ mọi người trong bản.",
    whyRelevant:
      "Vùng cao rất cần thầy cô cắm bản. Muốn làm giáo viên phải học hết THPT rồi học cao đẳng hoặc đại học sư phạm.",
    sampleCareers: ["Giáo viên mầm non", "Giáo viên tiểu học - THCS", "Công tác xã hội", "Phiên dịch tiếng dân tộc", "Thư viện"],
    vocationalBranch: null,
    academicBranch: "Học hết THPT, rồi học cao đẳng/đại học Sư phạm, Công tác xã hội",
    academicOnly: true,
    icon: "📚",
    colorHex: "#6B4E71", // tim than
  },
  {
    code: "THE_CHAT_THU_CONG",
    name: "Xây dựng, Cơ khí & Nghề thủ công",
    shortDescription:
      "Thích đo đạc, đóng, hàn, xây, làm mộc hoặc làm đồ thủ công truyền thống bằng đôi tay khéo léo.",
    whyRelevant:
      "Nhà cửa, kho, chuồng trại kiên cố chống sạt lở và các nghề mộc, hàn, dệt, đan lát luôn có việc ở địa phương.",
    sampleCareers: ["Thợ xây - nề", "Thợ hàn - cơ khí", "Thợ mộc", "Dệt - đan lát truyền thống", "Kỹ sư xây dựng cầu đường"],
    vocationalBranch: "Kỹ thuật xây dựng, hàn - cơ khí, mộc, thủ công mỹ nghệ (trung cấp/cao đẳng)",
    academicBranch: "Kỹ sư xây dựng, cầu đường, cơ khí (đại học)",
    academicOnly: false,
    icon: "🧱",
    colorHex: "#8B5A2B", // nau go
  },
];

export const DOMAIN_BY_CODE = new Map(DOMAINS.map((d) => [d.code, d] as const));

export function getDomain(code: string): Domain | undefined {
  return DOMAIN_BY_CODE.get(code as Domain["code"]);
}

/** Doc danh sach ma nhom tu form (du lieu tu client): bo gia tri rong/la va trung lap, giu thu tu, toi da `max`. */
export function parseDomainCodes(raw: unknown[], max: number): Domain["code"][] {
  const out: Domain["code"][] = [];
  for (const v of raw) {
    const domain = typeof v === "string" ? getDomain(v) : undefined;
    if (domain && !out.includes(domain.code)) out.push(domain.code);
  }
  return out.slice(0, max);
}
