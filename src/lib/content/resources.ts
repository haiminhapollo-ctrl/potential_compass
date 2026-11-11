import type { Resource } from "../types";

// ============================================================================
// KHO TAI NGUYEN HOC TAP (muc tieu 50-100 tai nguyen theo 8 nhom linh vuc)
// ----------------------------------------------------------------------------
// 11/2026: 66 tai nguyen - 5 tai nguyen nhom Xay dung - Co khi viet lai + 8 tai nguyen "Duong hoc len" CHUA CO LINK
// (UI mo trang tim kiem). Giao vien dan link that (uu tien trang tuyen sinh truong trong tinh).
// LINK: 54/56 tai nguyen da co link THAT (10/2026) - moi link duoc mo va kiem
// tra con hoat dong (YouTube qua oEmbed = video cong khai, cho nhung), uu tien
// tieng Viet, kenh/bao chinh thong; da loai link tieng Anh/can tai khoan. Muc
// chua co link (url = null) -> UI mo trang tim kiem theo tieu de. Giao vien van
// nen xem lai truoc Pilot va thay link o trang "Quan ly tai nguyen".
// 56 tai nguyen khoi diem (7/nhom) = nam trong khoang 50-100 theo ke hoach,
// con lai bo sung dan trong qua trinh trien khai.
// ============================================================================

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `res_${prefix}_${String(counter).padStart(3, "0")}`;
}

interface Seed {
  domain: Resource["domain"];
  title: string;
  description: string;
  type: Resource["type"];
  durationLabel: string;
  difficulty: Resource["difficulty"];
  /** Link that da kiem tra con hoat dong (10/2026) - thieu thi UI mo trang tim kiem. */
  url?: string;
}

const SEEDS: Seed[] = [
  // KHOA_HOC_KHAM_PHA
  { domain: "KHOA_HOC_KHAM_PHA", title: "Vì sao bầu trời có màu xanh?", description: "Video giải thích hiện tượng tán xạ ánh sáng bằng hình ảnh dễ hiểu.", type: "video", durationLabel: "6 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=CNPW2AdHJag" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "10 thí nghiệm khoa học vui làm tại nhà", description: "Tổng hợp thí nghiệm an toàn, dùng vật dụng có sẵn trong nhà.", type: "bai_viet", durationLabel: "Đọc 8 phút", difficulty: "de", url: "https://vnexpress.net/6-thi-nghiem-khoa-hoc-tre-de-thuc-hien-tai-nha-4090597.html" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "Hành trình của một giọt nước mưa", description: "Vòng tuần hoàn nước giải thích qua hoạt hình ngắn.", type: "video", durationLabel: "5 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=SCcsIxvyYjA" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "Nhập môn tư duy khoa học", description: "Khóa học ngắn về cách đặt câu hỏi và kiểm chứng giả thuyết.", type: "khoa_hoc", durationLabel: "3 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=redCc-Wxwyg" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "Vũ trụ có bao nhiêu ngôi sao?", description: "Bài viết giới thiệu thiên văn học cơ bản cho học sinh THCS.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "de", url: "https://dantri.com.vn/khoa-hoc/co-bao-nhieu-ngoi-sao-trong-vu-tru-20210923113838585.htm" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "Vì sao có động đất, núi lửa?", description: "Video giải thích kiến tạo mảng bằng mô hình trực quan.", type: "video", durationLabel: "7 phút", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=tP7R24AtkxQ" },
  { domain: "KHOA_HOC_KHAM_PHA", title: "Làm quen với kính hiển vi tự chế", description: "Hướng dẫn tạo kính lúp đơn giản từ giọt nước để quan sát vật nhỏ.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh" },

  // KY_THUAT_CONG_NGHE
  { domain: "KY_THUAT_CONG_NGHE", title: "Mạch điện đơn giản là gì?", description: "Video giải thích nguyên lý mạch điện kín/hở bằng ví dụ đèn pin.", type: "video", durationLabel: "6 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=0AgudISAmA0" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Cách sửa xe đạp cơ bản", description: "Hướng dẫn vá săm, chỉnh phanh, tra dầu xích.", type: "video", durationLabel: "10 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=GwLDGeQHTpc" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Nhập môn lập trình kéo-thả", description: "Khóa học làm quen lập trình bằng khối lệnh trực quan (không cần máy mạnh).", type: "khoa_hoc", durationLabel: "4 buổi", difficulty: "de", url: "https://studio.code.org/courses/express-2025/units/1" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Vì sao đồ điện có dây tiếp đất?", description: "Bài viết giải thích an toàn điện cơ bản trong gia đình.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh", url: "https://vnexpress.net/vi-sao-mot-so-phich-cam-dien-co-ba-chau-4914749.html" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Nguyên lý hoạt động của quạt điện", description: "Video mổ xẻ cấu tạo và nguyên lý động cơ điện đơn giản.", type: "video", durationLabel: "8 phút", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=Y5X-S2exEKk" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Tự làm robot đơn giản từ vật liệu tái chế", description: "Hướng dẫn lắp mô hình robot rung từ mô-tơ nhỏ và pin.", type: "bai_viet", durationLabel: "Đọc 7 phút", difficulty: "nang_cao", url: "https://genk.vn/huong-dan-tu-che-robot-mini-cuc-don-gian-20161001164537777.chn" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Nghề Điện - Điện tử: học gì, làm gì?", description: "Giới thiệu tổng quan ngành nghề và cơ hội việc làm.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "de", url: "https://dantri.com.vn/giao-duc/hoc-nganh-dien-co-de-kiem-viec-lam-20220825061209753.htm" },

  // NONG_LAM_NGU_MOI_TRUONG
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Kỹ thuật trồng rau sạch tại nhà", description: "Hướng dẫn trồng rau trong thùng xốp, không cần đất vườn lớn.", type: "video", durationLabel: "9 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=hASJjPUyGv8" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Vì sao cần luân canh cây trồng?", description: "Bài viết giải thích lợi ích xoay vòng cây trồng cho đất tốt hơn.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh", url: "https://vi.wikipedia.org/wiki/Lu%C3%A2n_canh" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Chăm sóc vật nuôi mùa lạnh", description: "Hướng dẫn giữ ấm, phòng bệnh cho gia súc gia cầm.", type: "video", durationLabel: "7 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=CvUkzbh01Zc" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Rừng đầu nguồn quan trọng thế nào?", description: "Video về vai trò của rừng với nguồn nước và khí hậu địa phương.", type: "video", durationLabel: "6 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=1meuGckusMY" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Nghề Khuyến nông là làm gì?", description: "Giới thiệu công việc hỗ trợ kỹ thuật nông nghiệp cho bà con.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "de", url: "https://nongnghiepmoitruong.vn/co-trang-khuyen-nong-va-hanh-trinh-gieo-niem-tin-d818065.html" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Ủ phân hữu cơ từ rác nhà bếp", description: "Hướng dẫn từng bước làm phân compost đơn giản.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://tuoitre.vn/phunuonline/5-phuong-phap-u-phan-huu-co-bien-rac-nha-bep-thanh-vang-cho-khu-vuon-1101567878.htm" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Giới thiệu ngành Thú y", description: "Khóa học ngắn tổng quan về chăm sóc sức khỏe vật nuôi.", type: "khoa_hoc", durationLabel: "2 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=K8xmJBzW3vY" },

  // KINH_DOANH_DICH_VU
  { domain: "KINH_DOANH_DICH_VU", title: "Cách lập sổ thu chi đơn giản", description: "Hướng dẫn ghi chép thu - chi cá nhân bằng sổ tay hoặc app cơ bản.", type: "video", durationLabel: "6 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=tpPJB-5flYI" },
  { domain: "KINH_DOANH_DICH_VU", title: "Ý tưởng kinh doanh nhỏ cho học sinh", description: "Bài viết gợi ý các mô hình kinh doanh nhỏ phù hợp lứa tuổi.", type: "bai_viet", durationLabel: "Đọc 7 phút", difficulty: "de", url: "https://vov2.vov.vn/doi-song-xa-hoi/khi-teen-tap-tanh-kinh-doanh-57577.vov2" },
  { domain: "KINH_DOANH_DICH_VU", title: "Kỹ năng bán hàng cơ bản", description: "Video hướng dẫn cách chào hàng, xử lý từ chối một cách lịch sự.", type: "video", durationLabel: "8 phút", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=v24lAvLCblk" },
  { domain: "KINH_DOANH_DICH_VU", title: "Hợp tác xã nông nghiệp hoạt động thế nào?", description: "Giới thiệu mô hình HTX giúp nông dân bán hàng hiệu quả hơn.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://vi.wikipedia.org/wiki/H%E1%BB%A3p_t%C3%A1c_x%C3%A3_n%C3%B4ng_nghi%E1%BB%87p" },
  { domain: "KINH_DOANH_DICH_VU", title: "Nhập môn Kế toán cho người mới", description: "Khóa học vỡ lòng về ghi chép sổ sách đơn giản.", type: "khoa_hoc", durationLabel: "3 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=XM0AOPe9Aw8" },
  { domain: "KINH_DOANH_DICH_VU", title: "Nghề Hướng dẫn viên du lịch địa phương", description: "Video phỏng vấn một hướng dẫn viên du lịch cộng đồng.", type: "video", durationLabel: "9 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=dQvNIv-hr04" },
  { domain: "KINH_DOANH_DICH_VU", title: "Vì sao cần đặt giá bán hợp lý?", description: "Bài viết giải thích cách tính giá vốn - giá bán đơn giản.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh", url: "https://vi.wikipedia.org/wiki/%C4%90%E1%BB%8Bnh_gi%C3%A1_d%E1%BB%B1a_tr%C3%AAn_ph%C3%AD_t%E1%BB%95n" },

  // SUC_KHOE_CONG_DONG
  { domain: "SUC_KHOE_CONG_DONG", title: "Sơ cứu vết thương nhẹ đúng cách", description: "Video hướng dẫn các bước sơ cứu cơ bản, an toàn.", type: "video", durationLabel: "7 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=6JnCTc-qFHw" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Dinh dưỡng hợp lý cho tuổi dậy thì", description: "Bài viết về chế độ ăn cân bằng cho học sinh THCS.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "de", url: "https://www.vinmec.com/vie/bai-viet/xay-khau-phan-hop-ly-cho-tuoi-day-thi-vi" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Nghề Điều dưỡng - Y sĩ là làm gì?", description: "Giới thiệu công việc hằng ngày của điều dưỡng, y sĩ tuyến cơ sở.", type: "video", durationLabel: "8 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=PsO2k9w0BXY" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Phòng chống bệnh mùa mưa lũ", description: "Hướng dẫn giữ nước sạch, phòng bệnh khi thiên tai.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh", url: "https://www.vietnamplus.vn/nganh-y-te-huong-dan-nguoi-dan-tu-phong-dich-benh-trong-mua-mua-lu-post670944.vnp" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Y tế thôn bản - cầu nối chăm sóc sức khỏe", description: "Video giới thiệu vai trò của nhân viên y tế thôn bản.", type: "video", durationLabel: "6 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=P48Zv-Tg_GM" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Kỹ năng lắng nghe khi giúp đỡ người khác", description: "Bài viết về công tác xã hội và hỗ trợ cộng đồng.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://www.vinmec.com/vie/bai-viet/cach-de-tro-thanh-mot-nguoi-biet-lang-nghe-vi" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Nhập môn Chăm sóc sức khỏe cộng đồng", description: "Khóa học ngắn giới thiệu ngành y tế công cộng.", type: "khoa_hoc", durationLabel: "2 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=999IkaDQ5Lk" },

  // NGHE_THUAT_SANG_TAO
  { domain: "NGHE_THUAT_SANG_TAO", title: "Vẽ cơ bản cho người mới bắt đầu", description: "Video hướng dẫn các nét vẽ và bố cục cơ bản.", type: "video", durationLabel: "10 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=RGzjZZNf1n4" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Quay video bằng điện thoại đẹp hơn", description: "Mẹo bố cục, ánh sáng khi quay video bằng điện thoại phổ thông.", type: "video", durationLabel: "8 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=NbTI2aLtbjM" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Viết truyện ngắn: bắt đầu từ đâu?", description: "Bài viết gợi ý cách xây dựng nhân vật và cốt truyện đơn giản.", type: "bai_viet", durationLabel: "Đọc 7 phút", difficulty: "trung_binh", url: "https://tuoitre.vn/giaoduc/dac-trung-cua-truyen-ngan-10815734.htm" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Âm nhạc dân tộc trong đời sống", description: "Video giới thiệu nhạc cụ và làn điệu dân gian các vùng miền.", type: "video", durationLabel: "9 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=Q2Q346Hpius" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Thiết kế đơn giản với công cụ miễn phí", description: "Hướng dẫn làm poster, thiệp đơn giản bằng ứng dụng miễn phí.", type: "khoa_hoc", durationLabel: "2 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=xbqIcIctIgM" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Nhiếp ảnh: kể chuyện bằng hình ảnh", description: "Bài viết về cách chụp ảnh truyền tải cảm xúc, câu chuyện.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://lifestyle.zingnews.vn/3-yeu-to-giup-thoi-hon-vao-buc-anh-post414479.html" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Nghề Thiết kế đồ họa - Truyền thông số", description: "Giới thiệu tổng quan ngành và cơ hội nghề nghiệp.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "de", url: "https://vietnamnet.vn/hoc-nganh-thiet-ke-do-hoa-ra-truong-lam-gi-2497754.html" },

  // XA_HOI_GIAO_DUC_NHAN_VAN
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Kỹ năng thuyết trình tự tin", description: "Video hướng dẫn cách nói trước đám đông không run.", type: "video", durationLabel: "8 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=394KQJjN4-A" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Nghề Giáo viên cắm bản", description: "Phóng sự ngắn về công việc và ý nghĩa của giáo viên vùng cao.", type: "video", durationLabel: "10 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=bvcsGYIEe-c" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Kỹ năng làm việc nhóm hiệu quả", description: "Bài viết về cách phân công và giải quyết mâu thuẫn trong nhóm.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://thanhnien.vn/cach-de-teamwork-khong-con-la-tao-work-185230509160916914.htm" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Giữ gìn tiếng nói, chữ viết dân tộc", description: "Video về tầm quan trọng của bảo tồn ngôn ngữ các dân tộc thiểu số.", type: "video", durationLabel: "7 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=Q5PXa6cAA10" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Nghề Công tác xã hội là gì?", description: "Giới thiệu công việc hỗ trợ cộng đồng, giúp đỡ hoàn cảnh khó khăn.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "de", url: "https://voh.com.vn/huong-nghiep/hoc-nganh-cong-tac-xa-hoi-ra-truong-se-lam-cong-viec-gi-469646.html" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Lắng nghe và thấu hiểu người khác", description: "Khóa học ngắn về kỹ năng giao tiếp và đồng cảm.", type: "khoa_hoc", durationLabel: "2 buổi", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=5-Pu5TkJt_k" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Lịch sử bản làng qua lời kể người già", description: "Bài viết gợi ý cách ghi chép lịch sử truyền miệng của cộng đồng.", type: "bai_viet", durationLabel: "Đọc 7 phút", difficulty: "trung_binh" },

  // THE_CHAT_THU_CONG
  // 11/2026: nhom doi nghia (the thao -> xay dung, co khi). 5 tai nguyen the thao / am thuc / du lich duoc THAY NOI DUNG TAI CHO
  // (giu vi tri => giu id); am thuc + du lich cong dong chuyen sang nhom Thuong mai nong san & Du lich (cuoi danh sach).
  { domain: "THE_CHAT_THU_CONG", title: "Một ngày làm việc của thợ xây", description: "Xem người thợ xây trộn vữa, xây tường, kiểm tra tường thẳng bằng dây dọi.", type: "video", durationLabel: "8 phút", difficulty: "de" },
  { domain: "THE_CHAT_THU_CONG", title: "Nghề thủ công mỹ nghệ truyền thống", description: "Phóng sự về nghệ nhân đan lát, dệt thổ cẩm địa phương.", type: "video", durationLabel: "10 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=xcb4fHeC_Fs" },
  { domain: "THE_CHAT_THU_CONG", title: "Đọc bản vẽ một ngôi nhà nhỏ", description: "Cách đọc mặt bằng, kích thước tường, cửa trên bản vẽ nhà đơn giản (gắn bài Công nghệ 8).", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "de" },
  { domain: "THE_CHAT_THU_CONG", title: "An toàn khi hàn và cắt kim loại", description: "Người thợ hàn đeo kính, găng tay, giữ khoảng cách thế nào - chỉ xem, không tự làm.", type: "video", durationLabel: "6 phút", difficulty: "de" },
  { domain: "THE_CHAT_THU_CONG", title: "Nghề hàn - cơ khí: học ở đâu, làm gì", description: "Giới thiệu nghề hàn, cơ khí sửa chữa ở trường trung cấp/cao đẳng và việc làm sau khi học.", type: "bai_viet", durationLabel: "Đọc 5 phút", difficulty: "trung_binh" },
  { domain: "THE_CHAT_THU_CONG", title: "Bảo tồn nghề dệt thổ cẩm", description: "Video về nỗ lực gìn giữ và phát triển nghề dệt truyền thống.", type: "video", durationLabel: "9 phút", difficulty: "trung_binh", url: "https://www.youtube.com/watch?v=_I3FpiZEKjI" },
  { domain: "THE_CHAT_THU_CONG", title: "Nhà, kho kiên cố chống sạt lở ở vùng núi", description: "Vì sao cần móng chắc, rãnh thoát nước và kè đất khi xây nhà trên sườn đồi.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh" },

  // --- Bo sung 11/2026 (THEM O CUOI de id cu khong doi) ---
  // KINH_DOANH_DICH_VU: chuyen tu nhom The chat - Thu cong (giu link that da kiem tra 10/2026)
  { domain: "KINH_DOANH_DICH_VU", title: "Ẩm thực vùng cao: món ngon từ núi rừng", description: "Video giới thiệu cách chế biến món ăn truyền thống địa phương.", type: "video", durationLabel: "8 phút", difficulty: "de", url: "https://www.youtube.com/watch?v=eDJS5shXivc" },
  { domain: "KINH_DOANH_DICH_VU", title: "Du lịch cộng đồng là gì?", description: "Bài viết giới thiệu mô hình du lịch gắn với bản sắc văn hóa địa phương.", type: "bai_viet", durationLabel: "Đọc 6 phút", difficulty: "trung_binh", url: "https://daibieunhandan.vn/van-hoa-ban-dia-hon-cot-cua-du-lich-cong-dong-10397284.html" },
  // DUONG HOC LEN theo tung nhom (nhanh nghe sau lop 9 / nhanh hoc tiep) - chua co link: giao vien dan link trang
  // tuyen sinh cua truong trung cap/cao dang/Trung tam GDNN-GDTX trong tinh o trang "Quan ly tai nguyen".
  { domain: "KHOA_HOC_KHAM_PHA", title: "Đường học lên: kỹ thuật viên kiểm nghiệm, trắc địa", description: "Sau lớp 9 học trung cấp/cao đẳng kiểm nghiệm, trắc địa; hoặc học tiếp THPT rồi đại học khoa học, môi trường.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "KY_THUAT_CONG_NGHE", title: "Đường học lên: thợ điện, điện mặt trời, sửa xe điện", description: "Sau lớp 9 học trung cấp/cao đẳng hệ 9+ (học nghề kèm văn hóa) ngành điện; hoặc học tiếp THPT rồi đại học điện, tự động hóa.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "NONG_LAM_NGU_MOI_TRUONG", title: "Đường học lên: kỹ thuật nông - lâm nghiệp", description: "Sau lớp 9 học trung cấp/cao đẳng nông nghiệp, lâm nghiệp, thú y; hoặc học tiếp THPT rồi đại học nông lâm, môi trường.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "KINH_DOANH_DICH_VU", title: "Đường học lên: bán hàng, du lịch, nấu ăn", description: "Sau lớp 9 học trung cấp/cao đẳng nghiệp vụ bán hàng, du lịch, nấu ăn; hoặc học tiếp THPT rồi kinh tế, du lịch.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "SUC_KHOE_CONG_DONG", title: "Đường học lên: nghề Y, Dược, Điều dưỡng", description: "Nghề y cần học hết THPT (học tốt Toán, Hóa, Sinh) rồi học cao đẳng hoặc đại học Y, Dược, Điều dưỡng.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "NGHE_THUAT_SANG_TAO", title: "Đường học lên: âm thanh ánh sáng, quay dựng", description: "Sau lớp 9 học trung cấp/cao đẳng kỹ thuật âm thanh, ánh sáng, quay dựng; hoặc học tiếp THPT rồi thiết kế, truyền thông.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "XA_HOI_GIAO_DUC_NHAN_VAN", title: "Đường học lên: thầy cô giáo, công tác xã hội", description: "Làm giáo viên cần học hết THPT rồi học cao đẳng sư phạm (mầm non) hoặc đại học sư phạm.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
  { domain: "THE_CHAT_THU_CONG", title: "Đường học lên: xây dựng, hàn, mộc", description: "Sau lớp 9 học trung cấp/cao đẳng kỹ thuật xây dựng, hàn, mộc; hoặc học tiếp THPT rồi đại học xây dựng, cầu đường.", type: "khac", durationLabel: "Đọc 4 phút", difficulty: "de" },
];

export const RESOURCES: Resource[] = SEEDS.map((s) => ({
  id: id(s.domain.slice(0, 3).toLowerCase()),
  domain: s.domain,
  title: s.title,
  description: s.description,
  type: s.type,
  durationLabel: s.durationLabel,
  url: s.url ?? null,
  difficulty: s.difficulty,
}));

export function getResourcesByDomain(domain: string): Resource[] {
  return RESOURCES.filter((r) => r.domain === domain);
}

export function getResourcesMissingUrl(): Resource[] {
  return RESOURCES.filter((r) => !r.url);
}
