import type { ContentTerm, SurveyQuestion } from "../types";

// ============================================================================
// BO CAU HOI KHAO SAT (ban 11/2026 - phan luong & sat thuc te mien nui)
// ----------------------------------------------------------------------------
// Nguyen tac:
// - Moi cau la MOT TINH HUONG THUC TE gan voi doi song hoc sinh vung cao
//   (gia dinh, mua vu, truong lop, ban be) - KHONG hoi truc dien "em thich...".
// - Moi lua chon cong diem cho 1 nhom linh vuc chinh (weight 2) va doi khi 1
//   nhom phu (weight 1) neu tinh huong ro rang cham 2 nang luc.
// - trackWeights (11/2026): thien huong LUONG cua dap an, doc lap voi nhom:
//   vocational = bat tay lam/sua/van hanh; academic = tim hieu nguyen ly, tinh
//   toan, nghien cuu, giang giai; {} = trung tinh. Moi nhom deu co ca dap an
//   vocational lan academic => thien huong luong khong trung voi nhom.
// - BO CAU NEO (curriculumTerm "ALL") dung cho moi hoc ky => so sanh duoc giua
//   cac ky. Moi hoc ky them 5 cau bam bai Cong nghe 8/9, KHTN (GDPT 2018).
//   Lop chi thay cau "ALL" + cau cua hoc ky lop dang hoc.
// - Dap an q04d, q12d KHONG cham nhom nao: lua chon trung tinh CO CHU DICH.
// - Khong co dap an "dung/sai". KHONG hoi tien bac/hoan canh gia dinh, gioi
//   tinh, dan toc (du lieu nhay cam tre em) - ca o cau chot luong G9_HK2.
// - KHONG sua van ban cau cu (doi van ban = doi nghia cau tra loi da luu):
//   cau doi nghia thi cho nghi (active=false, giu trong DB) va them cau moi.
//
// THAY DOI 11/2026 (nhom doi nghia - xem src/lib/domains.ts):
// - Cho nghi q01, q08, q15 (dap an the thao, nay THE_CHAT_THU_CONG = Xay dung,
//   Co khi & Thu cong). Thay bang q21, q22, q23.
// - Doi trong so (van ban giu nguyen):
//     q10a chang chong nha cua: KY_THUAT 1 + THE_CHAT 1 -> THE_CHAT 2 (xay dung, khong phai dien)
//     q14a dan khach tham quan: XA_HOI 1 + THE_CHAT 1 -> XA_HOI 1 + KINH_DOANH 1 (du lich ban dia)
//     q19a lam binh loc nuoc:  KY_THUAT 2 -> NONG_LAM 1 + THE_CHAT 1 (moi truong + tu tay lam, khong phai dien)
//     q20b don da, ke lai duong: KY_THUAT 1 + THE_CHAT 1 -> THE_CHAT 2 (xay dung)
// Kiem tra do can bang: npm run check:logic, npm run analyze:survey.
// ============================================================================

const V = { vocational: 1 };
const V2 = { vocational: 2 };
const A = { academic: 1 };
const A2 = { academic: 2 };
const N = {};

type RawQuestion = Omit<SurveyQuestion, "curriculumTerm" | "active"> & Partial<Pick<SurveyQuestion, "active">>;

/** Bo cau NEO - dung cho moi hoc ky. */
const CORE: RawQuestion[] = [
  {
    id: "q01",
    order: 1,
    active: false, // 11/2026: thay bang q21 (dap an the thao khong con hop nhom THE_CHAT_THU_CONG)
    scenario: "Chiều Chủ Nhật rảnh rỗi, không phải làm bài tập. Em thích làm gì nhất?",
    options: [
      { id: "q01a", text: "Tháo cái đài/đồ chơi cũ bị hỏng ra xem bên trong thế nào", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: N },
      { id: "q01b", text: "Ra vườn/ruộng phụ gia đình chăm cây, cho vật ăn", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: N },
      { id: "q01c", text: "Vẽ tranh, quay 1 đoạn video ngắn hoặc nghe/hát theo nhạc", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "q01d", text: "Rủ bạn bè chơi thể thao ngoài sân", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: N },
    ],
  },
  {
    id: "q02",
    order: 2,
    scenario: "Lớp được giao chuẩn bị một tiết mục cho lễ hội trường. Em muốn nhận việc gì?",
    options: [
      { id: "q02a", text: "Tính toán kinh phí, phân công ai làm việc gì cho hợp lý", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q02b", text: "Viết lời dẫn, đứng trên sân khấu giới thiệu từng phần", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2, NGHE_THUAT_SANG_TAO: 1 }, trackWeights: A },
      { id: "q02c", text: "Thiết kế phông background, trang trí sân khấu", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "q02d", text: "Kiểm tra loa, dây điện, máy chiếu có hoạt động tốt không", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
    ],
  },
  {
    id: "q03",
    order: 3,
    scenario: "Em nhỏ hàng xóm bị sốt nhẹ, người lớn chưa về kịp. Em sẽ làm gì trước tiên?",
    options: [
      { id: "q03a", text: "Lau mát, đổ nước ấm cho em, theo dõi thân nhiệt cho em nhỏ", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: V },
      { id: "q03b", text: "Chạy sang nhờ người lớn hoặc y tế thôn bản gần nhất", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
      { id: "q03c", text: "Vừa trông em vừa kể chuyện, hát cho em quên để đỡ sợ", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: V },
      { id: "q03d", text: "Ghi lại triệu chứng, tìm hiểu trên sách/mạng xem vì sao bị sốt", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
    ],
  },
  {
    id: "q04",
    order: 4,
    scenario: "Nhà có một máy móc/đồ điện bị hỏng (quạt, bóng đèn, xe đạp). Em thường...",
    options: [
      { id: "q04a", text: "Tự tháo ra xem lỗi ở đâu rồi thử sửa", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "q04b", text: "Hỏi người lớn trong nhà xem làm sao mang đi sửa/mua mới cho tiết kiệm", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q04c", text: "Kể cho bạn nghe chuyện đồ bị hỏng như một kỷ niệm vui", domainWeights: { NGHE_THUAT_SANG_TAO: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
      { id: "q04d", text: "Không quan tâm lắm, chỉ mong có đồ mới thay thế", domainWeights: {}, trackWeights: N },
    ],
  },
  {
    id: "q05",
    order: 5,
    scenario: "Mùa thu hoạch đến, cả nhà bận rộn ngoài ruộng/nương. Em thích phụ việc nào nhất?",
    options: [
      { id: "q05a", text: "Quan sát đất, thời tiết để đoán năm nay mùa màng thế nào", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: A },
      { id: "q05b", text: "Tính xem thu hoạch được bao nhiêu, bán được bao nhiêu tiền", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q05c", text: "Chụp ảnh, quay video cảnh mùa vụ để đăng lên mạng", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "q05d", text: "Phụ khiêng vác, làm việc chân tay cho nhanh xong", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
    ],
  },
  {
    id: "q06",
    order: 6,
    scenario: "Có một bạn trong lớp học yếu môn Toán, nhờ em giúp. Em sẽ...",
    options: [
      { id: "q06a", text: "Kiên nhẫn giảng lại từng bước cho bạn hiểu", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
      { id: "q06b", text: "Vẽ sơ đồ/hình ảnh minh họa để đề bài dễ bắt mắt hơn", domainWeights: { NGHE_THUAT_SANG_TAO: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: N },
      { id: "q06c", text: "Tìm quy tắc chung để làm nhanh nhiều dạng bài tương tự", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "q06d", text: "Rủ thêm vài bạn nữa học nhóm cho vui và hiệu quả hơn", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, KINH_DOANH_DICH_VU: 1 }, trackWeights: N },
    ],
  },
  {
    id: "q07",
    order: 7,
    scenario: "Cuối tuần có phiên chợ vùng cao. Đi chợ cùng gia đình, em thích nhất việc gì?",
    options: [
      { id: "q07a", text: "Phụ bán hàng, mời khách, thối tiền, thách giá", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: V },
      { id: "q07b", text: "Ngắm những món đồ thủ công (thổ cẩm, mây tre đan) và hỏi cách làm", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: A },
      { id: "q07c", text: "Chụp lại không khí phiên chợ, màu sắc trang phục, ẩm thực", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "q07d", text: "Quan sát mọi người, đoán xem ai cần gì để gia đình bán đúng hàng", domainWeights: { KINH_DOANH_DICH_VU: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
    ],
  },
  {
    id: "q08",
    order: 8,
    active: false, // 11/2026: thay bang q22 (ca cau xoay quanh the thao)
    scenario: "Trường tổ chức giải thể thao / hội khỏe. Em muốn tham gia vai trò nào?",
    options: [
      { id: "q08a", text: "Thi đấu trực tiếp, luyện tập để đạt thành tích tốt", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: N },
      { id: "q08b", text: "Làm trọng tài, sắp xếp lịch thi đấu cho công bằng", domainWeights: { KINH_DOANH_DICH_VU: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
      { id: "q08c", text: "Chụp ảnh, đưa tin kết quả lên bảng tin/lớp", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "q08d", text: "Chuẩn bị nước uống, sơ cứu nhỏ nếu có bạn bị thương", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: N },
    ],
  },
  {
    id: "q09",
    order: 9,
    scenario: "Em được tặng một khoản tiền nhỏ (lì xì/thưởng học sinh giỏi). Em sẽ...",
    options: [
      { id: "q09a", text: "Ghi chép lại, tính xem nên tiết kiệm hay mua gì hợp lý", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q09b", text: "Mua vật liệu về làm một đồ thủ công/tác phẩm nhỏ", domainWeights: { NGHE_THUAT_SANG_TAO: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V },
      { id: "q09c", text: "Mua hạt giống/con giống nhỏ để thử tự trồng - nuôi", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "q09d", text: "Dành mua sách hoặc dụng cụ học tập yêu thích", domainWeights: { KHOA_HOC_KHAM_PHA: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
    ],
  },
  {
    id: "q10",
    order: 10,
    scenario: "Trời sắp có bão/lũ, cả xóm cùng chuẩn bị phòng chống. Em muốn giúp việc gì?",
    options: [
      { id: "q10a", text: "Phụ chằng chống nhà cửa, di chuyển đồ đạc chắc chắn", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "q10b", text: "Theo dõi bản tin thời tiết, thông báo lại cho hàng xóm", domainWeights: { KHOA_HOC_KHAM_PHA: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
      { id: "q10c", text: "Chuẩn bị thuốc men, nước sạch cho gia đình và em nhỏ", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: N },
      { id: "q10d", text: "Giúp di dời vật nuôi, cây trồng đến nơi an toàn", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
    ],
  },
  {
    id: "q11",
    order: 11,
    scenario: "Lớp làm báo tường / đặc san cuối kỳ. Em muốn đóng góp phần nào?",
    options: [
      { id: "q11a", text: "Viết bài, sáng tác thơ/truyện ngắn", domainWeights: { NGHE_THUAT_SANG_TAO: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
      { id: "q11b", text: "Trình bày, vẽ minh họa cho đẹp mắt", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "q11c", text: "Tổng hợp, sắp xếp bài vở cho hợp lý, đúng tiến độ", domainWeights: { KINH_DOANH_DICH_VU: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: N },
      { id: "q11d", text: "Phỏng vấn bạn bè, ghi lại ý kiến nhiều người", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
    ],
  },
  {
    id: "q12",
    order: 12,
    scenario: "Nhà nuôi thêm gà/lợn/cá nhưng có con bị ốm. Em phản ứng thế nào?",
    options: [
      { id: "q12a", text: "Quan sát kỹ triệu chứng, tìm hiểu cách chăm sóc/chữa trị", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2, SUC_KHOE_CONG_DONG: 1 }, trackWeights: A },
      { id: "q12b", text: "Tách riêng con ốm, dọn dẹp chuồng trại sạch sẽ", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "q12c", text: "Tính thiệt hại nếu con vật không qua khỏi", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q12d", text: "Buồn, thấy thương nhưng không biết làm sao giúp được", domainWeights: {}, trackWeights: N },
    ],
  },
  {
    id: "q13",
    order: 13,
    scenario: "Được dùng điện thoại/máy tính của trường 30 phút, em sẽ làm gì?",
    options: [
      { id: "q13a", text: "Tìm video hướng dẫn sửa chữa/làm đồ vật gì đó", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "q13b", text: "Xem video về động vật, vũ trụ, hiện tượng lạ", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "q13c", text: "Nghe nhạc, xem/chỉnh sửa ảnh, video", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "q13d", text: "Nhắn tin hỏi thăm, kết nối với bạn bè/người thân ở xa", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: N },
    ],
  },
  {
    id: "q14",
    order: 14,
    scenario: "Có một người khách du lịch ghé bản làng, muốn tìm hiểu văn hóa địa phương. Em muốn...",
    options: [
      { id: "q14a", text: "Dẫn khách đi tham quan, giới thiệu phong tục, món ăn", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, KINH_DOANH_DICH_VU: 1 }, trackWeights: N },
      { id: "q14b", text: "Cho khách xem cách làm một món đồ thủ công truyền thống", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "q14c", text: "Bán/giới thiệu nông sản, đặc sản địa phương cho khách", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: V },
      { id: "q14d", text: "Chụp ảnh kỷ niệm cùng khách, đăng lên mạng xã hội", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
    ],
  },
  {
    id: "q15",
    order: 15,
    active: false, // 11/2026: thay bang q23 (co "CLB The thao")
    scenario: "Nếu được chọn 1 câu lạc bộ ở trường (chỉ được chọn 1), em chọn gì?",
    options: [
      { id: "q15a", text: "CLB Khoa học - Sáng tạo / STEM", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: N },
      { id: "q15b", text: "CLB Thể thao", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: N },
      { id: "q15c", text: "CLB Nghệ thuật - Văn nghệ - Truyền thông", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "q15d", text: "CLB Tình nguyện - Kết nối cộng đồng", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, SUC_KHOE_CONG_DONG: 1 }, trackWeights: N },
    ],
  },
  {
    id: "q16",
    order: 16,
    scenario: "Nghĩ về 5-10 năm nữa, em mong công việc sau này của mình sẽ...",
    options: [
      { id: "q16a", text: "Được làm ra/sửa chữa những thứ cụ thể, cầm nắm được kết quả", domainWeights: { KY_THUAT_CONG_NGHE: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V },
      { id: "q16b", text: "Được giúp đỡ, chăm sóc cho người khác mỗi ngày", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
      { id: "q16c", text: "Được tự do sáng tạo, tạo ra sản phẩm mang dấu ấn riêng", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "q16d", text: "Được làm việc với thiên nhiên, đất đai, cây con", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: N },
    ],
  },
  // --- Bo sung 10/2026 (bao cao DS loi 6): tang nhom it xuat hien.
  {
    id: "q17",
    order: 17,
    scenario: "Bản em sắp được lắp hệ thống điện mặt trời. Em muốn làm gì nhất?",
    options: [
      { id: "q17a", text: "Phụ thợ lắp đặt, đấu dây và hỏi cách tấm pin hoạt động", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "q17b", text: "Tìm hiểu vì sao ánh nắng lại biến thành điện được", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "q17c", text: "Nghĩ cách dùng điện để bơm nước tưới rau, sưởi ấm chuồng trại", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 1, KY_THUAT_CONG_NGHE: 1 }, trackWeights: A },
      { id: "q17d", text: "Nhắc mọi người dùng điện an toàn, tránh bị điện giật", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: N },
    ],
  },
  {
    id: "q18",
    order: 18,
    scenario: "Trạm y tế xã về bản khám sức khỏe miễn phí. Em muốn phụ việc nào?",
    options: [
      { id: "q18a", text: "Phụ y tá đo chiều cao, cân nặng và ghi sổ cho bà con", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: V },
      { id: "q18b", text: "Dựng lều, kê bàn ghế, kiểm tra loa và đèn", domainWeights: { KY_THUAT_CONG_NGHE: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V },
      { id: "q18c", text: "Hỏi bác sĩ vì sao nhiều người trong bản hay bị cùng một bệnh", domainWeights: { KHOA_HOC_KHAM_PHA: 1, SUC_KHOE_CONG_DONG: 1 }, trackWeights: A },
      { id: "q18d", text: "Hướng dẫn người già, phiên dịch tiếng dân tộc cho bác sĩ", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, SUC_KHOE_CONG_DONG: 1 }, trackWeights: N },
    ],
  },
  {
    id: "q19",
    order: 19,
    scenario: "Lớp em làm một dự án nhỏ về nước sạch. Em nhận phần nào?",
    options: [
      { id: "q19a", text: "Làm bình lọc nước từ chai nhựa, cát, sỏi và than", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V },
      { id: "q19b", text: "Lấy nước ở vài con suối, so sánh độ trong và đoán vì sao khác nhau", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: V },
      { id: "q19c", text: "Trồng cây quanh nguồn nước để giữ nước sạch", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "q19d", text: "Nói chuyện với bà con về cách đun sôi, giữ nước sạch để tránh bệnh", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
    ],
  },
  {
    id: "q20",
    order: 20,
    scenario: "Sau trận mưa lớn, đường lên nương bị sạt lở một đoạn. Em sẽ...",
    options: [
      { id: "q20a", text: "Quan sát xem vì sao chỗ đó lại sạt, đất đá ở đó thế nào", domainWeights: { KHOA_HOC_KHAM_PHA: 1, NONG_LAM_NGU_MOI_TRUONG: 1 }, trackWeights: A },
      { id: "q20b", text: "Cùng người lớn dọn đá, kê lại đường cho chắc chắn", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "q20c", text: "Đề xuất trồng cây giữ đất ở sườn đồi", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: A },
      { id: "q20d", text: "Hỏi thăm, giúp nhà bị ảnh hưởng, ai bị thương thì sơ cứu", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
    ],
  },
  // --- Thay the 11/2026 cho q01, q08, q15 (cung tinh than, theo nghia nhom moi).
  {
    id: "q21",
    order: 21,
    scenario: "Chiều Chủ Nhật rảnh rỗi, không phải làm bài tập. Em thích làm gì nhất?",
    options: [
      { id: "q21a", text: "Cùng người lớn sửa lại cái đèn pin hay quạt điện bị hỏng", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "q21b", text: "Đọc sách, xem video về cách trồng cây cho nhiều quả", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: A },
      { id: "q21c", text: "Cùng bố mẹ đóng lại chuồng gà, sửa hàng rào cho chắc", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "q21d", text: "Xem video giải thích vì sao trời có sấm sét, cầu vồng", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
    ],
  },
  {
    id: "q22",
    order: 22,
    scenario: "Trường tổ chức ngày hội văn nghệ - thể thao. Em muốn nhận việc nào?",
    options: [
      { id: "q22a", text: "Dựng sân khấu, lắp đèn và loa cùng thầy cô", domainWeights: { NGHE_THUAT_SANG_TAO: 2, KY_THUAT_CONG_NGHE: 1 }, trackWeights: V },
      { id: "q22b", text: "Tính tiền mua nước, phần thưởng và ghi sổ thu chi", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "q22c", text: "Ngồi ở góc y tế, sơ cứu cho bạn bị trầy xước", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: V },
      { id: "q22d", text: "Giải thích luật chơi, hướng dẫn các em lớp dưới", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
    ],
  },
  {
    id: "q23",
    order: 23,
    scenario: "Nếu được chọn 1 câu lạc bộ ở trường (chỉ được chọn 1), em chọn gì?",
    options: [
      { id: "q23a", text: "CLB Khoa học: đo đất, thử nước, làm thí nghiệm", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: V },
      { id: "q23b", text: "CLB Mộc - Cơ khí: đóng bàn ghế, làm mô hình nhà", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "q23c", text: "CLB Điện: lắp mạch đèn, thử tấm pin mặt trời nhỏ", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "q23d", text: "CLB Tình nguyện: kèm em nhỏ học bài, giúp người già", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, SUC_KHOE_CONG_DONG: 1 }, trackWeights: N },
    ],
  },
];

/** G8_HK1 - Cong nghe 8: ban ve ky thuat, vat lieu co khi, truyen chuyen dong; KHTN co ban. */
const G8_HK1: RawQuestion[] = [
  {
    id: "g8h1_01",
    order: 101,
    scenario: "Giờ Công nghệ, cô phát bản vẽ một cái ghế gỗ đơn giản. Em thích làm gì?",
    options: [
      { id: "g8h1_01a", text: "Đọc bản vẽ rồi tự đóng thử một cái ghế nhỏ bằng gỗ vụn", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "g8h1_01b", text: "Tìm hiểu vì sao bản vẽ phải có nhiều hình chiếu", domainWeights: { KHOA_HOC_KHAM_PHA: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: A },
      { id: "g8h1_01c", text: "Tính xem làm ghế cần bao nhiêu gỗ, đinh, hết bao nhiêu tiền", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "g8h1_01d", text: "Vẽ hoa văn thổ cẩm trang trí lên ghế cho đẹp", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
    ],
  },
  {
    id: "g8h1_02",
    order: 102,
    scenario: "Xe đạp của em bị tuột xích, đạp thấy nặng. Em thích làm gì?",
    options: [
      { id: "g8h1_02a", text: "Lật xe lên, lắp lại xích và tra dầu", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "g8h1_02b", text: "Tìm hiểu vì sao đổi líp to, líp nhỏ làm đạp nhẹ hay nặng", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g8h1_02c", text: "Tìm hiểu xe đạp điện khác xe đạp thường ở chỗ nào", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: A },
      { id: "g8h1_02d", text: "Chỉ cho bạn cùng lớp cách tự lắp xích", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: N },
    ],
  },
  {
    id: "g8h1_03",
    order: 103,
    scenario: "Cây ớt ở vườn nhà bị héo lá dù vẫn được tưới. Em sẽ...",
    options: [
      { id: "g8h1_03a", text: "Đào thử xem đất quanh gốc khô hay bị úng nước", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "g8h1_03b", text: "Mang một ít đất lên lớp nhờ thầy cô thử độ chua", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g8h1_03c", text: "Hỏi người già trong bản xem có cây thuốc nào trị sâu, trị bệnh", domainWeights: { SUC_KHOE_CONG_DONG: 1, NONG_LAM_NGU_MOI_TRUONG: 1 }, trackWeights: A },
      { id: "g8h1_03d", text: "Làm giàn tre che nắng cho luống ớt", domainWeights: { THE_CHAT_THU_CONG: 1, NONG_LAM_NGU_MOI_TRUONG: 1 }, trackWeights: V },
    ],
  },
  {
    id: "g8h1_04",
    order: 104,
    scenario: "Nhà em sửa lại một gian nhà sàn. Em muốn phụ việc nào?",
    options: [
      { id: "g8h1_04a", text: "Thay cột, kèo bị mục và đóng lại sàn cho chắc", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "g8h1_04b", text: "Chọn chỗ đặt đèn, ổ cắm cho an toàn (người lớn đấu điện)", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g8h1_04c", text: "Góp ý mở thêm cửa sổ cho bếp thoáng, đỡ khói", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: N },
      { id: "g8h1_04d", text: "Tính xem sửa xong có thể đón khách ở homestay không", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
    ],
  },
  {
    id: "g8h1_05",
    order: 105,
    scenario: "Lớp làm mô hình cối giã gạo chạy bằng sức nước. Em muốn làm phần nào?",
    options: [
      { id: "g8h1_05a", text: "Tìm hiểu nước chảy làm quay bánh xe và nâng chày thế nào", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g8h1_05b", text: "Cưa, đục, ghép các thanh tre gỗ thành mô hình", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "g8h1_05c", text: "Quay video mô hình chạy để giới thiệu với trường bạn", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
      { id: "g8h1_05d", text: "Thuyết trình cho các lớp dưới hiểu cối hoạt động ra sao", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
    ],
  },
];

/** G8_HK2 - Cong nghe 8: ky thuat dien co ban, mach dien gia dinh, an toan dien, thiet ke ky thuat. */
const G8_HK2: RawQuestion[] = [
  {
    id: "g8h2_01",
    order: 201,
    scenario: "Bóng đèn ở góc học tập nhà em không sáng nữa. Em muốn làm gì?",
    options: [
      { id: "g8h2_01a", text: "Cùng người lớn ngắt cầu dao rồi kiểm tra bóng, đui, công tắc", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g8h2_01b", text: "Xem lại sách Công nghệ: mạch điện gồm những phần nào", domainWeights: { KHOA_HOC_KHAM_PHA: 1, KY_THUAT_CONG_NGHE: 1 }, trackWeights: A },
      { id: "g8h2_01c", text: "Tính xem đổi sang bóng LED thì mỗi tháng đỡ bao nhiêu tiền điện", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "g8h2_01d", text: "Nhắc cả nhà không chạm vào điện khi tay ướt", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: N },
    ],
  },
  {
    id: "g8h2_02",
    order: 202,
    scenario: "Sau buổi học an toàn điện, lớp chia nhau làm một việc. Em chọn việc nào?",
    options: [
      { id: "g8h2_02a", text: "Tập các bước sơ cứu người bị điện giật cùng thầy cô", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: V },
      { id: "g8h2_02b", text: "Đi quanh trường tìm chỗ dây điện hở, báo thầy cô sửa", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g8h2_02c", text: "Vẽ áp phích nhắc các em nhỏ tránh xa cột điện, dây điện", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "g8h2_02d", text: "Giảng lại cho em ở nhà vì sao nước dẫn được điện", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: A },
    ],
  },
  {
    id: "g8h2_03",
    order: 203,
    scenario: "Lớp được giao thiết kế một chiếc đèn học dùng pin sạc. Em nhận phần nào?",
    options: [
      { id: "g8h2_03a", text: "Nối bóng LED, công tắc và pin thành mạch sáng được", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g8h2_03b", text: "Thử nhiều kiểu chụp đèn xem kiểu nào sáng đều nhất", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g8h2_03c", text: "Vẽ bản thiết kế thân đèn, tính kích thước cho đèn đứng vững", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: A },
      { id: "g8h2_03d", text: "Tính giá vật liệu để bán đèn cho các bạn trong bản", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
    ],
  },
  {
    id: "g8h2_04",
    order: 204,
    scenario: "Quạt điện nhà em quay yếu và kêu to. Em thích làm gì?",
    options: [
      { id: "g8h2_04a", text: "Rút phích cắm, cùng người lớn tháo lồng quạt ra lau và tra dầu", domainWeights: { KY_THUAT_CONG_NGHE: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V },
      { id: "g8h2_04b", text: "Tìm hiểu vì sao động cơ điện làm cánh quạt quay được", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g8h2_04c", text: "Nghĩ cách làm mát chuồng gà vào những ngày nắng nóng", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: N },
      { id: "g8h2_04d", text: "Hỏi tiệm sửa quạt ở chợ xem sửa một chiếc lấy bao nhiêu tiền công", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
    ],
  },
  {
    id: "g8h2_05",
    order: 205,
    scenario: "Lớp thiết kế hệ thống tưới rau tự động cho vườn trường. Em muốn làm phần nào?",
    options: [
      { id: "g8h2_05a", text: "Nối máy bơm nhỏ, pin và công tắc hẹn giờ (có thầy cô kèm)", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g8h2_05b", text: "Chọn rau trồng, tính mỗi luống cần bao nhiêu nước", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: A },
      { id: "g8h2_05c", text: "Quay video quá trình làm để báo cáo trước toàn trường", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "g8h2_05d", text: "Hướng dẫn các em lớp 6 cách chăm vườn rau", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
    ],
  },
];

/** G9_HK1 - Cong nghe 9 dinh huong nghe nghiep: lap dat mang dien trong nha, nong - lam nghiep. */
const G9_HK1: RawQuestion[] = [
  {
    id: "g9h1_01",
    order: 301,
    scenario: "Mùa khô, ruộng nương nhà em thiếu nước tưới. Em muốn làm gì?",
    options: [
      { id: "g9h1_01a", text: "Cùng người lớn lắp máy bơm, đi ống dẫn nước từ suối lên", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2, KY_THUAT_CONG_NGHE: 1 }, trackWeights: V },
      { id: "g9h1_01b", text: "So sánh máy bơm to và nhỏ: loại nào đủ nước, đỡ tốn tiền điện", domainWeights: { KY_THUAT_CONG_NGHE: 1, KINH_DOANH_DICH_VU: 1 }, trackWeights: A },
      { id: "g9h1_01c", text: "Đo xem đất khô tới đâu, tính mỗi luống cần bao nhiêu nước", domainWeights: { KHOA_HOC_KHAM_PHA: 1, NONG_LAM_NGU_MOI_TRUONG: 1 }, trackWeights: A },
      { id: "g9h1_01d", text: "Tính cần bao nhiêu đá, xi măng để xây một bể chứa nước", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: A },
    ],
  },
  {
    id: "g9h1_02",
    order: 302,
    scenario: "Rừng thông gần bản dễ cháy vào mùa khô. Em muốn góp sức thế nào?",
    options: [
      { id: "g9h1_02a", text: "Cùng tổ bảo vệ rừng phát đường ranh cản lửa", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "g9h1_02b", text: "Theo dõi nắng, gió, độ ẩm để báo ngày nào dễ cháy", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: V },
      { id: "g9h1_02c", text: "Làm video nhắc bà con không đốt nương gần rừng", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: N },
      { id: "g9h1_02d", text: "Tập cho các em nhỏ cách sơ cứu khi bị bỏng nhẹ", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A },
    ],
  },
  {
    id: "g9h1_03",
    order: 303,
    scenario: "Xe máy điện của chú hàng xóm đi được ít km hơn trước. Em thích làm gì?",
    options: [
      { id: "g9h1_03a", text: "Xem thợ kiểm tra ắc-quy, bộ sạc và phụ một tay", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g9h1_03b", text: "Tìm hiểu ắc-quy chì và pin lithium khác nhau thế nào", domainWeights: { KHOA_HOC_KHAM_PHA: 1, KY_THUAT_CONG_NGHE: 1 }, trackWeights: A },
      { id: "g9h1_03c", text: "Tính xem mở tiệm sửa xe điện tại nhà cần mua dụng cụ gì, hết bao nhiêu", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: A },
      { id: "g9h1_03d", text: "Cùng thợ hàn lại cái giá chở hàng bị gãy", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
    ],
  },
  {
    id: "g9h1_04",
    order: 304,
    scenario: "Gia đình định trồng một quả đồi keo, mấy năm sau mới khai thác. Em muốn làm phần nào?",
    options: [
      { id: "g9h1_04a", text: "Đào hố, trồng và chăm cây con trong năm đầu", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V },
      { id: "g9h1_04b", text: "Tính mấy năm thì cây bán được và lãi được bao nhiêu", domainWeights: { KINH_DOANH_DICH_VU: 2, NONG_LAM_NGU_MOI_TRUONG: 1 }, trackWeights: A },
      { id: "g9h1_04c", text: "Tìm hiểu đất đồi hợp với cây gì, có cần bón vôi không", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A },
      { id: "g9h1_04d", text: "Chụp ảnh, ghi lại cây lớn lên từng năm", domainWeights: { NGHE_THUAT_SANG_TAO: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: A },
    ],
  },
  {
    id: "g9h1_05",
    order: 305,
    scenario: "Môn Công nghệ 9 có bài lắp đặt mạng điện trong nhà. Em thích việc nào nhất?",
    options: [
      { id: "g9h1_05a", text: "Đi dây, lắp ổ cắm, công tắc trên bảng thực hành", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g9h1_05b", text: "Vẽ sơ đồ mạch điện cho một căn nhà nhỏ", domainWeights: { KY_THUAT_CONG_NGHE: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: A },
      { id: "g9h1_05c", text: "Bố trí đèn, loa cho buổi văn nghệ ở hội trường xã", domainWeights: { NGHE_THUAT_SANG_TAO: 2, KY_THUAT_CONG_NGHE: 1 }, trackWeights: V },
      { id: "g9h1_05d", text: "Nhắc cả lớp các quy tắc an toàn khi thực hành điện", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
    ],
  },
];

/** G9_HK2 - giai doan chot luong truoc thi tuyen sinh: muc cam ket lau dai, mong muon sau lop 9. */
const G9_HK2: RawQuestion[] = [
  {
    id: "g9h2_01",
    order: 401,
    scenario: "Sắp hết lớp 9. Nghĩ về năm tới, em mong mình đang...",
    options: [
      { id: "g9h2_01a", text: "Học nghề điện, xe điện để vài năm nữa tự sửa được cho bà con", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V2 },
      { id: "g9h2_01b", text: "Học tiếp THPT để sau này học đại học ngành kỹ thuật, khoa học", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A2 },
      { id: "g9h2_01c", text: "Học nghề trồng trọt, chăn nuôi để làm kinh tế ngay ở bản", domainWeights: { NONG_LAM_NGU_MOI_TRUONG: 2 }, trackWeights: V2 },
      { id: "g9h2_01d", text: "Học tiếp THPT để thi vào trường y hoặc sư phạm", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: A2 },
    ],
  },
  {
    id: "g9h2_02",
    order: 402,
    scenario: "Khi học một điều mới, em thấy mình nhớ lâu nhất khi...",
    options: [
      { id: "g9h2_02a", text: "Được cầm dụng cụ làm thử ngay bằng tay", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V2 },
      { id: "g9h2_02b", text: "Được đọc, nghe giải thích kỹ vì sao rồi mới làm", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A2 },
      { id: "g9h2_02c", text: "Được xem người giỏi làm mẫu rồi làm theo", domainWeights: {}, trackWeights: V },
      { id: "g9h2_02d", text: "Được tự viết lại, giảng lại cho bạn khác", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 2 }, trackWeights: A },
    ],
  },
  {
    id: "g9h2_03",
    order: 403,
    scenario: "Nghĩ tới việc học thêm 3 năm THPT rồi mới học nghề hoặc đại học, em thấy...",
    options: [
      { id: "g9h2_03a", text: "Rất muốn, em thích học các môn văn hóa thêm nhiều năm", domainWeights: { XA_HOI_GIAO_DUC_NHAN_VAN: 1, KHOA_HOC_KHAM_PHA: 1 }, trackWeights: A2 },
      { id: "g9h2_03b", text: "Được, nếu sau đó em học đúng ngành em thích", domainWeights: {}, trackWeights: A },
      { id: "g9h2_03c", text: "Em muốn học nghề trước, vừa học vừa phụ thợ xây, thợ mộc", domainWeights: { THE_CHAT_THU_CONG: 2 }, trackWeights: V },
      { id: "g9h2_03d", text: "Em muốn sớm ra làm, tự mở tiệm hoặc làm homestay nhỏ", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: V2 },
    ],
  },
  {
    id: "g9h2_04",
    order: 404,
    scenario: "Em hình dung ngày làm việc của mình sau này giống cảnh nào nhất?",
    options: [
      { id: "g9h2_04a", text: "Trên mái nhà, cùng đồng đội lắp tấm pin mặt trời", domainWeights: { KY_THUAT_CONG_NGHE: 2 }, trackWeights: V },
      { id: "g9h2_04b", text: "Trong phòng thí nghiệm, kiểm tra mẫu đất, mẫu nước", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: V },
      { id: "g9h2_04c", text: "Ở trạm y tế, khám và chăm sóc bà con", domainWeights: { SUC_KHOE_CONG_DONG: 2 }, trackWeights: A },
      { id: "g9h2_04d", text: "Ở homestay của bản, nấu món địa phương đón khách", domainWeights: { KINH_DOANH_DICH_VU: 2 }, trackWeights: V },
    ],
  },
  {
    id: "g9h2_05",
    order: 405,
    scenario: "Điều gì làm em thấy vui nhất khi làm xong một việc?",
    options: [
      { id: "g9h2_05a", text: "Thấy đồ mình sửa, mình làm chạy được ngay", domainWeights: { KY_THUAT_CONG_NGHE: 1, THE_CHAT_THU_CONG: 1 }, trackWeights: V2 },
      { id: "g9h2_05b", text: "Hiểu ra một điều khó mà trước đó em chưa biết", domainWeights: { KHOA_HOC_KHAM_PHA: 2 }, trackWeights: A2 },
      { id: "g9h2_05c", text: "Thấy người mình chăm sóc, giúp đỡ khỏe hơn, vui hơn", domainWeights: { SUC_KHOE_CONG_DONG: 1, XA_HOI_GIAO_DUC_NHAN_VAN: 1 }, trackWeights: N },
      { id: "g9h2_05d", text: "Thấy sân khấu, video mình làm được mọi người khen", domainWeights: { NGHE_THUAT_SANG_TAO: 2 }, trackWeights: V },
    ],
  },
];

const withTerm = (term: ContentTerm, qs: RawQuestion[]): SurveyQuestion[] =>
  qs.map((q) => ({ ...q, curriculumTerm: term, active: q.active ?? true }));

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  ...withTerm("ALL", CORE),
  ...withTerm("G8_HK1", G8_HK1),
  ...withTerm("G8_HK2", G8_HK2),
  ...withTerm("G9_HK1", G9_HK1),
  ...withTerm("G9_HK2", G9_HK2),
];

/** So cau DANG DUNG (active) trong toan bo ngan hang cau hoi. */
export function getSurveyQuestionCount(): number {
  return SURVEY_QUESTIONS.filter((q) => q.active).length;
}
