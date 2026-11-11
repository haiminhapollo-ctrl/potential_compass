// ============================================================================
// CAU HOI "NHAN BIET NGHE NGHIEP" SAU HOAT DONG (Awareness Check) - ban 11/2026
// ----------------------------------------------------------------------------
// 11/2026: VIET LAI TOAN BO quiz cua hoat dong dang dung - bo kieu hoi kien thuc/do meo
// (vd "Bac Dau co may sao"), thay bang cau hoi nhan biet: viec em vua lam giong cong viec
// cua ai, nguoi lam nghe do lam gi moi ngay, buoc an toan nao quan trong nhat.
// => CAN GIAO VIEN DUYET LAI truoc khi dung (ban 18/10/2026 da duyet la ban cu).
// Moi hoat dong 2 cau, 3 dap an; cau hoi <= 25 tu, dap an <= 12 tu, giai thich <= 25 tu.
// Giao vien sua / tat o trang "Hoat dong" (du lieu that luu o cot activities.quiz).
// Dinh dang moi cau:
//   [cau hoi, DAP AN DUNG, dap an sai, dap an sai, giai thich]
// Dap an dung viet DAU TIEN cho de doc - thu tu hien thi duoc XAO theo tung hoc sinh
// (src/lib/quiz.ts) nen khong lo "dap an dung luon o vi tri A".
// Quiz KHONG tinh vao ho so so thich - chi giup em biet them ve nghe.
// Cuoi file: quiz cua hoat dong DA NGHI (active=false) giu nguyen de doi chieu lich su.
// ============================================================================

export type RawQuizQuestion = [prompt: string, correct: string, wrong1: string, wrong2: string, explanation: string];

export const ACTIVITY_QUIZ: Record<string, RawQuizQuestion[]> = {
  // --- KHOA_HOC_KHAM_PHA (Khoa hoc, Kiem nghiem & Quan trac) ---
  act_kh_01: [
    ["So sánh giọt nước trên nhiều loại lá giống công việc của ai nhất?", "Người làm thí nghiệm, kiểm nghiệm", "Người bán hàng", "Thợ xây", "Người làm kiểm nghiệm cũng so sánh nhiều mẫu, giữ mọi thứ giống nhau, rồi ghi kết quả."],
    ["Muốn so sánh công bằng giữa các lá, người làm thí nghiệm phải làm gì?", "Nhỏ giọt nước giống nhau lên mỗi lá", "Chỉ xem một lá", "Mỗi lá nhỏ lượng nước khác", "Chỉ thay đổi một thứ (loại lá), giữ nguyên các thứ khác thì kết quả mới đáng tin."],
  ],
  act_kh_02: [
    ["Ai làm công việc theo dõi bầu trời, mây, mưa nắng mỗi ngày?", "Người quan trắc khí tượng", "Thợ điện", "Người bán hàng", "Trạm khí tượng có người ghi lại mây, mưa, nắng mỗi ngày để dự báo thời tiết."],
    ["Khi quan sát bầu trời ban đêm, việc quan trọng nhất là gì?", "Ghi hoặc vẽ lại điều mình thấy", "Nhìn qua rồi quên", "Đoán bừa không cần nhìn", "Người làm khoa học luôn ghi chép lại để so sánh các lần quan sát."],
  ],
  act_kh_03: [
    ["Quan sát nồi nước rồi giải thích bằng lời giống việc của ai?", "Người nghiên cứu, giáo viên khoa học", "Thợ may", "Người bán rau", "Nhà nghiên cứu và giáo viên khoa học quan sát hiện tượng rồi giải thích vì sao."],
    ["Khi quan sát nồi nước đang đun, điều an toàn nhất là gì?", "Đứng xa vừa đủ, có người lớn ở gần", "Ghé sát mặt vào nồi", "Thò tay thử độ nóng", "Hơi nước sôi gây bỏng rất nhanh, quan sát từ xa là đủ."],
  ],
  act_kh_04: [
    ["Đặt câu hỏi \"vì sao\" rồi đi tìm câu trả lời là việc chính của ai?", "Nhà nghiên cứu khoa học", "Thợ hàn", "Người lái xe", "Nhà nghiên cứu bắt đầu từ một câu hỏi, rồi tìm cách kiểm chứng câu trả lời."],
    ["Tìm được câu trả lời, người làm khoa học kiểm tra lại bằng cách nào?", "Hỏi thầy cô, tra sách đáng tin", "Tự đoán rồi coi là đúng", "Tin ngay tin đồn", "Câu trả lời cần được kiểm tra bằng nguồn đáng tin hoặc thí nghiệm."],
  ],
  act_kh_05: [
    ["Đoán trước rồi thử xem vật nổi hay chìm giống việc của ai?", "Người làm thí nghiệm, kiểm nghiệm", "Người bán hàng", "Thợ cắt tóc", "Đoán trước (giả thuyết) rồi thử để kiểm tra là cách làm việc của người làm khoa học."],
    ["Thử xong thấy kết quả khác điều mình đoán, nên làm gì?", "Ghi lại và tìm hiểu vì sao", "Xóa kết quả đi", "Bỏ qua, coi như chưa thử", "Kết quả bất ngờ giúp người làm khoa học học được điều mới."],
  ],
  act_kh_06: [
    ["Quan sát và ghi lại cách con vật sống là việc của ai?", "Nhà sinh học, người quan trắc tự nhiên", "Thợ điện", "Kế toán", "Nhà sinh học dành nhiều giờ quan sát con vật trong tự nhiên và ghi chép."],
    ["Khi quan sát đàn kiến, em nên làm gì?", "Ngồi yên, nhìn và ghi lại", "Phá tổ kiến cho nhanh", "Đổ nước vào tổ", "Quan sát không làm phiền con vật thì mới thấy chúng sống thật ra sao."],
  ],

  // --- KY_THUAT_CONG_NGHE (Dien, Dien mat troi & Xe dien) ---
  act_kt_01: [
    ["Tháo một vật ra xem bên trong rồi lắp lại giống việc của ai?", "Thợ sửa chữa thiết bị, xe điện", "Giáo viên dạy văn", "Người bán rau", "Thợ sửa chữa phải biết từng bộ phận nằm ở đâu, tháo ra rồi lắp lại đúng."],
    ["Khi tháo một đồ vật, thợ sửa chữa thường làm gì để lắp lại được?", "Xếp linh kiện theo thứ tự tháo", "Để linh kiện lẫn lộn", "Vứt bớt ốc nhỏ", "Xếp theo thứ tự hoặc chụp ảnh từng bước thì lắp lại không bị thiếu."],
  ],
  act_kt_02: [
    ["Tìm đúng chỗ hỏng rồi sửa là việc hằng ngày của ai?", "Thợ sửa chữa", "Người dẫn chương trình", "Người trồng rau", "Thợ sửa chữa luôn tìm nguyên nhân hỏng trước, rồi mới sửa."],
    ["Trước khi sửa một đồ dùng điện, việc đầu tiên phải làm là gì?", "Rút phích cắm, ngắt điện", "Sửa luôn khi đang cắm điện", "Dùng tay ướt cho mát", "Thợ điện luôn ngắt điện trước khi sửa để không bị điện giật."],
  ],
  act_kt_03: [
    ["Vẽ sơ đồ đường điện trong phòng giống việc của ai?", "Thợ điện, kỹ sư điện", "Người bán hàng", "Thợ cắt tóc", "Thợ điện và kỹ sư điện vẽ sơ đồ trước khi lắp điện cho một ngôi nhà."],
    ["Vì sao thợ điện cần sơ đồ trước khi lắp điện?", "Biết đặt dây, ổ cắm đúng chỗ", "Để trang trí tường", "Không cần, lắp bừa được", "Có sơ đồ thì lắp đúng, an toàn, sau này sửa cũng dễ tìm dây."],
  ],
  act_kt_07: [
    ["Ở cầu dao nhà em, thợ điện dân dụng làm việc chính gì?", "Ngắt điện trước khi sửa chữa", "Sơn lại cầu dao", "Đếm tiền điện", "Thợ điện luôn ngắt cầu dao trước khi sửa ổ cắm hay dây điện."],
    ["Khi tìm cầu dao cùng người lớn, em không được làm gì?", "Chạm tay ướt hoặc tự bật tắt", "Nhìn và hỏi", "Ghi lại vị trí", "Cầu dao là chỗ có điện, chỉ người lớn hoặc thợ điện mới thao tác."],
  ],
  act_kt_08: [
    ["Người sửa xe điện hay dặn khách điều gì khi sạc xe?", "Sạc chỗ khô, thoáng, xa đồ dễ cháy", "Sạc cạnh đống củi", "Sạc dưới mưa", "Sạc lâu sinh nóng, đặt sai chỗ dễ gây cháy, nên thợ luôn dặn kỹ."],
    ["Việc kiểm tra ắc-quy và bộ sạc xe điện là công việc của ai?", "Thợ sửa chữa xe điện", "Giáo viên", "Người bán quần áo", "Thợ sửa xe điện kiểm tra ắc-quy, bộ sạc, động cơ cho xe chạy an toàn."],
  ],
  act_kt_09: [
    ["Đọc số W trên nhãn đồ điện giúp người thợ điện biết gì?", "Đồ đó dùng nhiều hay ít điện", "Đồ đó màu gì", "Đồ đó mua ở đâu", "Số W cho biết công suất; thợ điện dựa vào đó để chọn dây, ổ cắm phù hợp."],
    ["Ai thường tư vấn gia đình cách dùng điện tiết kiệm, an toàn?", "Thợ điện, kỹ sư điện", "Người bán hoa", "Thợ may", "Thợ điện và kỹ sư điện biết đồ nào tốn điện và cách dùng cho hợp lý."],
  ],

  // --- NONG_LAM_NGU_MOI_TRUONG (Ky thuat Nong - Lam nghiep & Moi truong) ---
  act_nl_01: [
    ["Nhìn lá, thân, đất để đoán cây khỏe không là việc của ai?", "Kỹ thuật viên nông nghiệp, khuyến nông", "Thợ điện", "Người lái xe", "Kỹ thuật viên nông nghiệp đi thăm vườn, nhìn lá và đất để phát hiện cây bệnh sớm."],
    ["Thấy lá cây vàng, đốm lạ, kỹ thuật viên nông nghiệp làm gì trước?", "Quan sát kỹ, tìm nguyên nhân", "Phun thuốc ngay thật nhiều", "Chặt bỏ cả cây", "Phải biết cây thiếu nước, thiếu phân hay bị sâu thì mới chữa đúng."],
  ],
  act_nl_02: [
    ["Xem màu, độ ẩm của đất để chọn cây trồng là việc của ai?", "Kỹ thuật viên nông nghiệp, kiểm nghiệm đất", "Thợ cắt tóc", "Người bán điện thoại", "Biết đất thế nào thì chọn được cây hợp đất, năng suất cao hơn."],
    ["Lấy mẫu đất xong, em nên làm gì?", "Rửa tay sạch", "Đưa tay lên miệng", "Không cần rửa tay", "Đất có thể có vi khuẩn, người làm nông luôn rửa tay sau khi làm việc với đất."],
  ],
  act_nl_03: [
    ["Theo dõi con vật ăn uống, phát hiện con ốm là việc của ai?", "Thú y, người chăn nuôi", "Thợ xây", "Người dẫn chương trình", "Người làm thú y và chăn nuôi quan sát con vật mỗi ngày để phát hiện bệnh sớm."],
    ["Dọn chuồng trại xong, việc quan trọng là gì?", "Rửa tay sạch bằng xà phòng", "Đi ăn luôn", "Lau tay vào quần áo", "Chuồng trại có nhiều vi khuẩn, rửa tay giúp không mang bệnh vào người."],
  ],
  act_nl_04: [
    ["Phân loại rác để tái sử dụng giống việc của ai?", "Người làm môi trường", "Thợ điện", "Người bán vé", "Người làm môi trường thu gom, phân loại rác để bản làng sạch và tái chế được."],
    ["Nhặt rác có mảnh vỡ, cần làm gì để an toàn?", "Đeo găng tay hoặc dùng que gắp", "Nhặt bằng tay không", "Giẫm cho vỡ nhỏ", "Mảnh chai, kim loại sắc dễ làm đứt tay."],
  ],
  act_nl_05: [
    ["Gieo hạt và theo dõi cây nảy mầm giống việc của ai?", "Người làm vườn ươm, kỹ thuật viên nông nghiệp", "Thợ hàn", "Kế toán", "Vườn ươm gieo hạt, theo dõi từng ngày để có cây giống khỏe."],
    ["Muốn biết hạt nảy mầm tốt không, người làm vườn ươm làm gì?", "Ghi lại mỗi ngày hạt thay đổi ra sao", "Đào hạt lên xem mỗi giờ", "Không tưới nước", "Ghi chép đều đặn giúp biết hạt cần bao nhiêu nước, bao nhiêu ngày."],
  ],
  act_nl_06: [
    ["Đoán thời tiết để quyết định gieo trồng, tưới nước là việc của ai?", "Người làm nông, kỹ thuật viên khuyến nông", "Thợ sửa xe", "Người bán quần áo", "Người làm nông theo dõi thời tiết để gieo trồng, tưới nước đúng lúc."],
    ["Đoán xong thời tiết ngày mai, em nên làm gì?", "Hôm sau kiểm tra lại xem đúng chưa", "Không cần xem lại", "Chỉ tin lời đoán của mình", "So lời đoán với thực tế giúp em đoán ngày càng đúng hơn."],
  ],
  act_nl_07: [
    ["Tính lượng nước tưới cho cả mùa khô là việc của ai?", "Kỹ thuật viên nông nghiệp chất lượng cao", "Thợ may", "Người dẫn chương trình", "Kỹ thuật viên tính nước tưới để cây đủ nước mà không lãng phí khi mùa khô thiếu nước."],
    ["Mùa khô thiếu nước, người làm vườn thường làm gì để giữ ẩm cho luống rau?", "Phủ rơm, lá khô lên mặt luống", "Tưới thật nhiều giữa trưa nắng", "Bỏ không tưới", "Phủ rơm giảm nước bốc hơi, tưới sáng sớm hoặc chiều mát đỡ phí nước."],
  ],

  // --- KINH_DOANH_DICH_VU (Thuong mai Nong san & Du lich Ban dia) ---
  act_kd_01: [
    ["Tính tổng tiền các món trong bữa ăn giống việc của ai?", "Người bán hàng, kế toán hợp tác xã", "Thợ điện", "Người trồng rừng", "Người bán hàng và kế toán ngày nào cũng cộng chi phí để biết lời hay lỗ."],
    ["Chủ quán ăn ở bản tính chi phí để làm gì?", "Đặt giá bán có lời", "Để khoe với khách", "Không để làm gì", "Biết chi phí thì mới đặt được giá bán không bị lỗ."],
  ],
  act_kd_02: [
    ["Nghĩ ra sản phẩm rồi tính xem ai sẽ mua giống việc của ai?", "Người buôn bán, mở cửa hàng", "Thợ xây", "Bác sĩ", "Người buôn bán phải biết khách cần gì trước khi làm sản phẩm."],
    ["Trước khi bán thật, người bán nên làm gì?", "Hỏi thử vài người có muốn mua không", "Làm thật nhiều rồi mới hỏi", "Đặt giá thật cao", "Hỏi trước giúp biết sản phẩm có người cần, đỡ làm ra rồi không bán được."],
  ],
  act_kd_03: [
    ["Người bán hàng ở chợ làm những việc gì mỗi ngày?", "Mời khách, tính tiền, nhập hàng", "Chỉ ngồi chờ khách", "Sửa xe cho khách", "Người bán hàng mời khách, tính tiền nhanh, nhớ giá và nhập hàng mới."],
    ["Điều gì giúp người bán hàng giữ được khách quen?", "Vui vẻ, bán đúng giá, hàng tốt", "Nói dối về hàng", "Cân thiếu cho có lời", "Khách quay lại khi người bán thật thà và hàng tốt."],
  ],
  act_kd_04: [
    ["Ghi chép thu chi, tiết kiệm từng khoản là việc chính của ai?", "Kế toán hợp tác xã", "Thợ mộc", "Người quay video", "Kế toán ghi lại mọi khoản thu chi để hợp tác xã biết còn bao nhiêu tiền."],
    ["Muốn tiết kiệm được, việc đầu tiên nên làm là gì?", "Đặt mục tiêu và ghi lại khoản chi", "Tiêu hết rồi tính sau", "Không cần ghi chép", "Có mục tiêu và sổ ghi chép thì biết mình đã tiêu vào đâu."],
  ],
  act_kd_05: [
    ["So sánh giá ở hai nơi để mua lợi hơn giống việc của ai?", "Người thu mua, buôn nông sản", "Giáo viên mầm non", "Thợ điện", "Người buôn nông sản so giá nhiều nơi để mua rẻ, bán có lời."],
    ["Ngoài giá, người mua hàng giỏi còn xem gì?", "Chất lượng và hạn dùng", "Màu túi đựng", "Tên người bán", "Hàng rẻ mà kém chất lượng thì vẫn thiệt."],
  ],
  act_kd_06: [
    ["Viết lời giới thiệu đặc sản cho khách du lịch là việc của ai?", "Người bán hàng online, làm du lịch", "Thợ hàn", "Người trồng rừng", "Người bán online và làm du lịch viết lời giới thiệu để khách muốn mua, muốn đến."],
    ["Lời mời chào đặc sản tốt nhất là gì?", "Nói thật, ngắn, nêu điểm đặc biệt", "Nói quá sự thật", "Viết thật dài", "Khách tin lời nói thật và nhớ được điểm đặc biệt của sản phẩm."],
  ],
  act_kd_07: [
    ["Tính giá nguyên liệu để đặt giá bán món ăn là việc của ai?", "Chủ quán ăn, homestay", "Thợ điện", "Y tá", "Chủ quán và homestay phải tính chi phí để giá bán có lời mà khách vẫn chấp nhận."],
    ["Nấu ăn để bán cho khách, điều quan trọng nhất là gì?", "Sạch sẽ, an toàn thực phẩm", "Nấu thật nhanh, không rửa", "Dùng đồ ăn ôi cho rẻ", "Khách du lịch chỉ quay lại khi đồ ăn sạch, an toàn."],
  ],

  // --- SUC_KHOE_CONG_DONG (Y te, Dieu duong & Duoc) ---
  act_sk_01: [
    ["Kiểm tra ánh sáng, tư thế ngồi học để bảo vệ mắt, lưng là việc của ai?", "Nhân viên y tế trường học", "Thợ xây", "Người bán hàng", "Nhân viên y tế trường học nhắc học sinh ngồi đúng, đủ sáng để bảo vệ mắt và lưng."],
    ["Muốn làm nhân viên y tế, em cần học tới đâu?", "Hết THPT rồi học cao đẳng, đại học y", "Chỉ cần hết lớp 9", "Không cần học", "Nghề y bắt buộc học hết THPT rồi học trường cao đẳng hoặc đại học y."],
  ],
  act_sk_02: [
    ["Ai thường xử lý vết đứt tay, bỏng nhẹ cho người dân ở xã?", "Y sĩ, điều dưỡng ở trạm y tế", "Thợ điện", "Người bán rau", "Y sĩ và điều dưỡng ở trạm y tế xã sơ cứu và hướng dẫn người dân."],
    ["Bị bỏng nhẹ, việc đầu tiên nên làm là gì?", "Xả nước mát sạch vào chỗ bỏng", "Bôi kem đánh răng", "Chọc vỡ chỗ phồng", "Nước mát làm dịu và giảm tổn thương; không bôi các thứ lạ lên vết bỏng."],
  ],
  act_sk_02b: [
    ["Hỏi thăm, chăm sóc người ốm mỗi ngày là việc chính của ai?", "Điều dưỡng", "Thợ hàn", "Người quay video", "Điều dưỡng theo dõi, chăm sóc người bệnh hằng ngày ở trạm y tế, bệnh viện."],
    ["Khi người thân mệt, em nên làm gì?", "Hỏi han, giúp việc nhỏ, báo người lớn", "Không để ý", "Tự đưa thuốc bất kỳ", "Hỏi han và báo người lớn là đủ; không tự cho uống thuốc."],
  ],
  act_sk_04: [
    ["Ai hay dạy bà con rửa tay đúng cách để phòng bệnh?", "Nhân viên y tế thôn bản, điều dưỡng", "Thợ mộc", "Người bán hàng", "Y tế xã và thôn bản tuyên truyền rửa tay để phòng bệnh cho cả cộng đồng."],
    ["Vì sao nhân viên y tế rửa tay trước và sau khi khám bệnh?", "Để không truyền bệnh cho người khác", "Để tay thơm", "Vì thích nước", "Tay sạch giúp không mang vi khuẩn từ người này sang người khác."],
  ],
  act_sk_05: [
    ["Người làm việc chính với thuốc, hạn dùng và cách dùng thuốc là ai?", "Dược sĩ", "Thợ điện", "Người bán vải", "Dược sĩ kiểm tra thuốc, hạn dùng và hướng dẫn mọi người uống thuốc đúng."],
    ["Thấy thuốc đã hết hạn trong tủ, nên làm gì?", "Báo người lớn để bỏ đi", "Uống cho hết", "Cho em nhỏ uống", "Thuốc hết hạn có thể không còn tác dụng hoặc gây hại."],
  ],
  act_sk_06: [
    ["Ai nghiên cứu cây thuốc và chế biến thành thuốc an toàn?", "Dược sĩ, người làm y học cổ truyền", "Thợ xây", "Người bán vé", "Dược sĩ và y học cổ truyền biết cây nào làm thuốc, dùng liều bao nhiêu cho an toàn."],
    ["Thấy một cây được bảo là cây thuốc, em có nên tự hái uống không?", "Không, phải hỏi y sĩ, dược sĩ", "Có, uống càng nhiều càng tốt", "Có, nếu lá đẹp", "Nhiều cây giống nhau, có cây độc; phải hỏi người có chuyên môn."],
  ],

  // --- NGHE_THUAT_SANG_TAO (San khau, Anh sang & Da phuong tien) ---
  act_nt_01: [
    ["Vẽ nhanh lại một cảnh bằng vài nét giống việc của ai?", "Họa sĩ, người thiết kế đồ họa", "Thợ điện", "Y tá", "Người thiết kế phác thảo nhanh ý tưởng trước khi làm sản phẩm thật."],
    ["Người thiết kế làm gì trước khi vẽ bản đẹp?", "Phác thảo nhiều bản nháp", "Vẽ ngay bản cuối", "Không cần ý tưởng", "Phác thảo nhanh giúp thử nhiều ý tưởng rồi chọn cái hay nhất."],
  ],
  act_nt_02: [
    ["Viết lời ngắn, có vần cho một tiết mục văn nghệ là việc của ai?", "Người viết kịch bản, làm truyền thông", "Thợ hàn", "Kế toán", "Người viết kịch bản và truyền thông viết lời dẫn, lời bài để tiết mục hấp dẫn."],
    ["Viết xong, người viết thường làm gì để hay hơn?", "Đọc to, sửa chỗ chưa hay", "Không đọc lại", "Xóa hết", "Đọc to giúp nghe ra vần, nhịp; sửa vài lần thì bài hay hơn."],
  ],
  act_nt_03: [
    ["Chọn góc chụp lạ cho một đồ vật quen là việc của ai?", "Người chụp ảnh, quay phim", "Thợ xây", "Người bán thuốc", "Người chụp ảnh chọn góc, ánh sáng để vật quen trông mới lạ, hấp dẫn."],
    ["Muốn chụp người khác, người chụp ảnh phải làm gì trước?", "Xin phép người đó", "Chụp lén", "Đăng lên mạng ngay", "Tôn trọng người được chụp: luôn hỏi ý trước khi chụp và đăng ảnh."],
  ],
  act_nt_05: [
    ["Kể chuyện bằng các khung hình nối nhau giống việc của ai?", "Người làm phim, vẽ truyện tranh", "Thợ điện", "Người trồng rau", "Người làm phim cũng vẽ từng khung (kịch bản hình) trước khi quay."],
    ["Bốn ô truyện tranh cần có điều gì để người xem hiểu?", "Mở đầu, diễn biến, kết thúc rõ ràng", "Bốn hình không liên quan", "Thật nhiều chữ", "Câu chuyện có đầu, có cuối thì người xem dễ hiểu."],
  ],
  act_nt_06: [
    ["Ghi lại và tạo ra âm thanh cho một tiết mục là việc của ai?", "Kỹ thuật viên âm thanh", "Y tá", "Thợ xây", "Kỹ thuật viên âm thanh thu, chỉnh và tạo hiệu ứng tiếng cho sân khấu, video."],
    ["Ở một buổi văn nghệ, kỹ thuật viên âm thanh làm gì?", "Chỉnh loa, micro cho rõ, không rè", "Đứng hát chính", "Bán vé", "Họ kiểm tra loa, micro trước và chỉnh âm lượng trong suốt buổi diễn."],
  ],
  act_nt_07: [
    ["Chiếu đèn từ nhiều hướng cho đẹp là việc của ai?", "Kỹ thuật viên ánh sáng sân khấu", "Kế toán", "Người trồng rừng", "Kỹ thuật viên ánh sáng chọn hướng, màu đèn để sân khấu đẹp và rõ người diễn."],
    ["Dựng đèn sân khấu thật, điều an toàn quan trọng nhất là gì?", "Dây điện gọn, chắc, có thợ điện kiểm tra", "Để dây lộn xộn dưới chân", "Treo đèn bằng dây buộc tạm", "Sân khấu đông người, dây điện và đèn phải chắc chắn, an toàn."],
  ],
  act_nt_08: [
    ["Quay video giới thiệu đặc sản của bản là công việc của ai?", "Người quay dựng video, làm truyền thông", "Thợ hàn", "Y tá", "Người quay dựng video làm phim ngắn quảng bá sản phẩm, du lịch địa phương."],
    ["Quay video, đứng thế nào thì hình sáng, rõ?", "Lưng quay về phía ánh sáng", "Quay thẳng vào mặt trời", "Quay trong chỗ tối", "Ánh sáng chiếu vào vật cần quay thì hình rõ; ngược sáng thì vật bị tối."],
  ],

  // --- XA_HOI_GIAO_DUC_NHAN_VAN (Su pham, Giao duc & Cong tac xa hoi) ---
  act_xh_01: [
    ["Giảng lại một điều cho em nhỏ hiểu giống việc chính của ai?", "Giáo viên", "Thợ xây", "Người bán hàng", "Giáo viên mỗi ngày tìm cách giảng sao cho học sinh hiểu."],
    ["Muốn làm giáo viên, em cần học tới đâu?", "Hết THPT rồi học sư phạm", "Chỉ cần hết lớp 9", "Không cần học", "Giáo viên bắt buộc học hết THPT rồi học cao đẳng hoặc đại học sư phạm."],
  ],
  act_xh_02: [
    ["Ghi lại chuyện ngày xưa của ông bà giống việc của ai?", "Người làm văn hóa, bảo tàng, phóng viên", "Thợ điện", "Dược sĩ", "Người làm văn hóa ghi lại chuyện xưa để giữ gìn cho con cháu sau này."],
    ["Khi hỏi chuyện người lớn tuổi, em nên làm gì?", "Lắng nghe, hỏi thêm, ghi lại", "Ngắt lời liên tục", "Vừa nghe vừa xem điện thoại", "Lắng nghe chăm chú thể hiện sự tôn trọng và giúp em nhớ đúng chuyện."],
  ],
  act_xh_03: [
    ["Giúp hai bên đang bất đồng hiểu nhau là việc của ai?", "Người làm công tác xã hội", "Thợ hàn", "Người bán rau", "Người làm công tác xã hội lắng nghe cả hai bên rồi giúp họ tìm cách giải quyết."],
    ["Người hòa giải giỏi thường làm gì trước?", "Nghe hết ý của cả hai bên", "Bênh ngay một bên", "Bỏ đi chỗ khác", "Nghe đủ cả hai bên thì mới hiểu vì sao họ bất đồng."],
  ],
  act_xh_04: [
    ["Viết thư thăm hỏi, kết nối mọi người giống việc của ai?", "Người làm công tác xã hội, truyền thông", "Thợ xây", "Kỹ thuật viên đất", "Công tác xã hội và truyền thông dùng lời viết để kết nối, động viên mọi người."],
    ["Thư thăm hỏi nên viết thế nào?", "Ngắn, chân thành, hỏi thăm cụ thể", "Thật dài, không rõ ý", "Chỉ kể chuyện của mình", "Hỏi thăm cụ thể cho người nhận thấy em thật sự quan tâm."],
  ],
  act_xh_05: [
    ["Hỏi người khác về nghề của họ giúp em điều gì?", "Biết nghề đó làm gì, học ở đâu", "Không giúp gì", "Để so ai giàu hơn", "Hỏi trực tiếp người làm nghề là cách tốt nhất để hình dung công việc thật."],
    ["Người làm việc phỏng vấn, ghi lại lời kể là ai?", "Phóng viên, người làm truyền thông", "Thợ điện", "Người trồng rau", "Phóng viên chuẩn bị câu hỏi, lắng nghe và ghi lại chính xác lời người được hỏi."],
  ],
  act_xh_06: [
    ["Lắng nghe rồi nhắc lại ý chính là kỹ năng quan trọng của ai?", "Giáo viên, người làm công tác xã hội", "Thợ hàn", "Người lái máy cày", "Giáo viên và công tác xã hội cần nghe đúng ý người khác trước khi giúp đỡ."],
    ["Nhắc lại ý chính bằng lời của mình giúp gì?", "Kiểm tra mình hiểu đúng chưa", "Làm người kể khó chịu", "Không giúp gì", "Nếu nhắc lại sai, người kể sẽ giải thích lại cho em."],
  ],

  // --- THE_CHAT_THU_CONG (Xay dung, Co khi & Nghe thu cong) ---
  act_tc_02: [
    ["Người làm dệt thổ cẩm, đan lát giỏi cần nhất điều gì?", "Khéo tay, kiên nhẫn, làm tỉ mỉ", "Nói thật nhiều", "Chạy thật nhanh", "Nghề thủ công cần đôi tay khéo và sự kiên nhẫn qua nhiều năm luyện tập."],
    ["Học nghề thủ công truyền thống ở bản thường học từ ai?", "Người lớn, nghệ nhân trong bản", "Chỉ học qua sách", "Không ai dạy được", "Nghề thủ công thường được truyền từ nghệ nhân, người lớn trong gia đình, bản làng."],
  ],
  act_tc_06: [
    ["Bện nhiều sợi cho chắc giống cách làm của ai?", "Người làm dây thừng, đan lát", "Y tá", "Kế toán", "Thợ đan lát, làm dây thừng bện nhiều sợi để dây chịu được sức nặng."],
    ["Thợ thủ công làm gì trước khi bán một sợi dây bện?", "Kéo thử xem có chắc không", "Không kiểm tra", "Cắt ngắn bớt", "Kiểm tra độ chắc trước khi dùng hoặc bán là việc của người thợ cẩn thận."],
  ],
  act_tc_07: [
    ["Đo phòng rồi vẽ sơ đồ nhìn từ trên xuống giống việc của ai?", "Thợ xây, kỹ sư xây dựng", "Người bán hàng", "Y tá", "Thợ xây và kỹ sư đo đạc, vẽ mặt bằng trước khi xây hoặc sửa nhà."],
    ["Vì sao thợ xây cần bản vẽ có kích thước?", "Để tính vật liệu và xây đúng", "Để treo cho đẹp", "Không cần, xây bừa được", "Có kích thước thì biết cần bao nhiêu gạch, xi măng và xây đúng chỗ."],
  ],
  act_tc_08: [
    ["Ai thiết kế cầu cho chắc, chịu được xe đi qua?", "Kỹ sư cầu đường", "Người bán rau", "Giáo viên mầm non", "Kỹ sư cầu đường tính toán hình dạng, vật liệu để cầu chịu được sức nặng."],
    ["Vì sao thợ xây hay dùng thanh chéo hình tam giác?", "Tam giác giữ khung không bị xô lệch", "Cho đẹp mắt", "Để tốn thêm vật liệu", "Khung tam giác cứng, không bị méo như hình vuông khi có lực đè."],
  ],
  act_tc_09: [
    ["Kiểm tra tường, bờ kè có nứt sau mưa là việc của ai?", "Thợ xây, kỹ thuật viên xây dựng", "Người quay video", "Người bán hàng", "Họ kiểm tra công trình sau mưa lũ để gia cố kịp thời, tránh sạt lở."],
    ["Khi đi kiểm tra bờ đất sau mưa, em phải chú ý gì?", "Đi cùng người lớn, tránh xa mép taluy", "Đứng sát mép nhìn xuống", "Đi một mình ban đêm", "Đất sau mưa dễ sụt; người làm xây dựng cũng không đứng sát mép."],
  ],
  act_tc_10: [
    ["Đóng đinh, bắt vít vào gỗ là việc hằng ngày của ai?", "Thợ mộc", "Dược sĩ", "Người bán vé", "Thợ mộc đóng đinh, bắt vít để làm bàn ghế, cửa, kèo nhà."],
    ["Khi đóng đinh, cách giữ đinh an toàn là gì?", "Giữ đinh bằng kẹp hoặc giấy gấp", "Giữ bằng ngón tay sát đầu búa", "Nhắm mắt khi đóng", "Kẹp hoặc giấy gấp giúp ngón tay ở xa búa, không bị đập vào tay."],
  ],
  act_tc_11: [
    ["Thử độ chắc của gạch, vữa trước khi xây là việc của ai?", "Thợ xây, kỹ thuật viên vật liệu", "Người bán quần áo", "Y tá", "Họ thử vật liệu trước để nhà xây chắc, không nứt."],
    ["Trộn rơm vào đất làm gạch có tác dụng gì?", "Giúp gạch ít nứt, chắc hơn", "Cho gạch thơm", "Không có tác dụng", "Sợi rơm giữ đất lại với nhau, gạch khô ít nứt hơn."],
  ],

  // --- THEO HOC KY: G8_HK1 ---
  act_g8h1_01: [
    ["Vẽ hình chiếu có kích thước để người khác làm theo là việc của ai?", "Người vẽ kỹ thuật, kỹ sư", "Người bán hàng", "Y tá", "Người vẽ kỹ thuật làm bản vẽ để thợ đọc và làm ra đúng vật."],
    ["Thợ mộc, thợ cơ khí dùng bản vẽ kỹ thuật để làm gì?", "Làm ra vật đúng hình, đúng cỡ", "Để trang trí xưởng", "Không dùng đến", "Đọc bản vẽ, thợ biết vật dài, rộng, cao bao nhiêu để cắt, ghép đúng."],
  ],
  act_g8h1_02: [
    ["Chọn đúng vật liệu thép, gỗ, nhựa cho từng bộ phận là việc của ai?", "Thợ cơ khí, thợ mộc", "Người bán hàng", "Giáo viên", "Thợ cơ khí và thợ mộc chọn vật liệu hợp với việc: chịu lực, chống nóng, nhẹ."],
    ["Vì sao cán dao, cán nồi thường làm bằng gỗ hoặc nhựa?", "Đỡ nóng tay, cầm chắc", "Cho nặng hơn", "Vì rẻ nhất", "Gỗ và nhựa dẫn nhiệt kém nên cầm không bị bỏng tay."],
  ],
  act_g8h1_03: [
    ["Ai kiểm tra xích, líp, động cơ cho xe đạp điện, xe máy điện?", "Thợ sửa chữa xe điện", "Y tá", "Người bán vải", "Thợ sửa xe điện kiểm tra cả bộ truyền động xích và động cơ điện."],
    ["Khi quay bàn đạp xe đạp để quan sát, điều an toàn là gì?", "Dựng xe chắc, không để tay vào xích", "Thò ngón tay vào xích", "Quay thật nhanh", "Xích và líp đang quay dễ kẹp tay."],
  ],
  act_g8h1_04: [
    ["Kiểm tra đất chua hay không để chọn cây là việc của ai?", "Kỹ thuật viên kiểm nghiệm đất", "Thợ điện", "Người dẫn chương trình", "Kỹ thuật viên kiểm nghiệm đo độ chua của đất để khuyên trồng cây hợp đất."],
    ["Làm thí nghiệm với giấm và đất xong, em nên làm gì?", "Rửa tay, dọn dẹp sạch", "Nếm thử đất", "Đổ giấm vào mắt", "Người làm kiểm nghiệm luôn dọn sạch và rửa tay sau thí nghiệm."],
  ],

  // --- THEO HOC KY: G8_HK2 ---
  act_g8h2_01: [
    ["Vẽ sơ đồ mạch điện để tìm chỗ hỏng là việc của ai?", "Thợ điện, thợ sửa thiết bị điện tử", "Người bán hàng", "Thợ may", "Thợ điện dựa vào sơ đồ mạch để biết dòng điện đi đâu, đứt ở đâu."],
    ["Thợ điện tập với mạch nào trước khi làm điện trong nhà?", "Mạch pin nhỏ, điện áp thấp", "Ổ điện đang có dòng", "Dây điện ngoài cột", "Mạch pin nhỏ an toàn để tập; điện trong nhà rất nguy hiểm."],
  ],
  act_g8h2_02: [
    ["Ai sửa dây điện hở, ổ cắm lỏng trong nhà?", "Thợ điện dân dụng", "Người bán rau", "Giáo viên", "Thợ điện dân dụng ngắt điện rồi thay dây, siết ổ cắm cho an toàn."],
    ["Thấy dây điện bị hở, em nên làm gì?", "Không chạm, báo người lớn", "Lấy tay giữ lại", "Quấn bằng lá cây", "Dây hở có thể làm điện giật; chỉ người lớn hoặc thợ điện xử lý."],
  ],
  act_g8h2_03: [
    ["Phác thảo đồ vật, ghi kích thước, vật liệu là việc của ai?", "Người thiết kế kỹ thuật, thợ mộc", "Y tá", "Người bán hàng", "Người thiết kế tính trước kích thước, vật liệu để làm ra đồ dùng hợp nhu cầu."],
    ["Trước khi thiết kế, người thiết kế cần biết gì?", "Ai dùng và dùng để làm gì", "Màu sơn đẹp nhất", "Không cần biết gì", "Biết người dùng cần gì thì đồ làm ra mới vừa và tiện."],
  ],
  act_g8h2_04: [
    ["Ai được học kỹ cách cứu người bị điện giật?", "Thợ điện, nhân viên y tế", "Người bán hàng", "Người quay video", "Thợ điện và nhân viên y tế đều phải biết sơ cứu tai nạn điện."],
    ["Thấy người bị điện giật, việc đầu tiên là gì?", "Ngắt nguồn điện", "Kéo người đó bằng tay", "Đổ nước vào người đó", "Phải ngắt điện trước; chạm vào người đang bị giật thì mình cũng bị giật."],
  ],

  // --- THEO HOC KY: G9_HK1 ---
  act_g9h1_01: [
    ["Lắp đường dây từ công tơ đến ổ cắm, bóng đèn là việc của ai?", "Thợ điện dân dụng", "Thợ may", "Người bán hàng", "Thợ điện dân dụng lắp mạng điện trong nhà theo sơ đồ, đúng an toàn."],
    ["Khi quan sát đường điện trong nhà, em không được làm gì?", "Chạm vào dây, mở ổ cắm", "Nhìn và vẽ lại", "Hỏi người lớn", "Chỉ quan sát và vẽ; mở hay chạm dây điện là việc của thợ điện."],
  ],
  act_g9h1_02: [
    ["Tư vấn chọn máy bơm hợp với vườn và nguồn nước là việc của ai?", "Kỹ thuật viên nông nghiệp, thợ điện", "Giáo viên văn", "Người quay video", "Họ tính diện tích vườn, độ cao nguồn nước để chọn bơm vừa đủ, đỡ tốn điện."],
    ["Mua máy bơm quá to so với vườn thì sao?", "Tốn tiền, tốn điện vô ích", "Cây lớn nhanh hơn", "Không sao cả", "Bơm vừa đủ là tiết kiệm nhất; quá to thì phí tiền mua và tiền điện."],
  ],
  act_g9h1_03: [
    ["Theo dõi, phòng chống cháy rừng mùa khô là việc của ai?", "Kiểm lâm, kỹ thuật viên lâm nghiệp", "Người bán hàng", "Thợ may", "Kiểm lâm và kỹ thuật viên lâm nghiệp tuần tra, làm đường băng cản lửa mùa khô."],
    ["Đường băng cản lửa trong rừng có tác dụng gì?", "Ngăn lửa lan sang chỗ khác", "Làm đường cho xe chạy", "Trang trí rừng", "Dải đất trống không có lá khô nên lửa không cháy lan qua được."],
  ],
  act_g9h1_04: [
    ["Lắp tấm pin mặt trời cho nhà dân là công việc của ai?", "Thợ lắp đặt điện mặt trời", "Y tá", "Người bán quần áo", "Thợ lắp điện mặt trời chọn hướng đặt pin, đấu dây và lắp bình lưu điện."],
    ["Tấm pin mặt trời cần gì để cho nhiều điện?", "Đủ nắng, mặt pin sạch bụi", "Đặt trong bóng râm", "Phủ bạt kín", "Pin nhận ánh nắng càng nhiều, mặt pin càng sạch thì càng ra nhiều điện."],
  ],

  // --- THEO HOC KY: G9_HK2 ---
  act_g9h2_01: [
    ["Nghề sửa xe điện, thợ điện có thể học ngay sau lớp 9 không?", "Có, ở trường trung cấp, cao đẳng nghề", "Không, phải học đại học", "Không ai dạy nghề này", "Trường trung cấp, cao đẳng nghề trong tỉnh nhận học sinh hết lớp 9 học nghề điện."],
    ["Muốn hiểu thật một nghề, cách tốt nhất là gì?", "Hỏi trực tiếp người đang làm nghề", "Đoán theo tin đồn", "Chọn nghề bạn thân chọn", "Người làm nghề kể rõ công việc hằng ngày, đường học và cái khó của nghề."],
  ],
  act_g9h2_02: [
    ["Muốn làm điều dưỡng, y sĩ thì phải học thế nào?", "Hết THPT rồi học cao đẳng, đại học y", "Học nghề 3 tháng sau lớp 9", "Không cần học", "Nghề y bắt buộc học hết THPT rồi học trường y."],
    ["Học sinh muốn theo nghề y nên chú ý học tốt môn nào?", "Sinh học, Hóa học", "Chỉ Thể dục", "Không môn nào", "Kiến thức Sinh và Hóa là nền để học về cơ thể và thuốc."],
  ],
  act_g9h2_03: [
    ["Cán bộ khuyến nông làm công việc chính gì?", "Hướng dẫn bà con kỹ thuật trồng trọt, chăn nuôi", "Bán điện thoại", "Sửa xe máy", "Cán bộ khuyến nông đến từng bản dạy cách trồng, nuôi cho năng suất cao."],
    ["Trồng cây lấy gỗ, cây quế thì bao lâu mới bán được?", "Nhiều năm, phải tính trước", "Ngay tháng sau", "Một tuần", "Cây lâu năm cần nhiều năm mới thu hoạch, nên phải tính vốn và thời gian trước."],
  ],
  act_g9h2_04: [
    ["Thợ hàn, thợ xây có chứng chỉ nghề thường được lợi gì?", "Dễ nhận việc lớn, lương cao hơn", "Không có lợi gì", "Không phải làm việc", "Chứng chỉ chứng minh tay nghề, giúp nhận việc ở công trình lớn, thu nhập cao hơn."],
    ["Muốn thành thợ có tay nghề cao, cần gì?", "Học bài bản và luyện tập nhiều năm", "Chỉ cần sức khỏe", "Chỉ học vài ngày", "Tay nghề cao đến từ học có hệ thống và làm thật nhiều."],
  ],

  // ==========================================================================
  // HOAT DONG DA NGHI (active=false, 11/2026) - GIU NGUYEN quiz cu (ban giao vien duyet 18/10/2026)
  // ==========================================================================
  act_tc_01: [
    ["Vận động xong nên làm gì?", "Nghỉ ngơi và uống nước", "Ăn thật no ngay", "Chạy tiếp thật nhanh", "Cơ thể mất nước khi vận động, cần nghỉ và uống nước."],
    ["Vận động \"trong khả năng của em\" nghĩa là gì?", "Tập vừa sức, thấy đau thì dừng lại", "Cố quá sức dù bị đau", "Không cần tập", "Tập vừa sức giúp khỏe mà không bị chấn thương."],
  ],
  act_tc_03: [
    ["Khi luộc rau trên bếp, cần lưu ý gì?", "Có người lớn ở gần, cẩn thận nước sôi", "Bật bếp rồi đi chơi", "Đổ nước lạnh vào chảo dầu đang nóng", "Bếp lửa và nước sôi dễ gây bỏng, cháy."],
    ["Trước khi nấu ăn nên làm gì?", "Rửa tay và rửa sạch nguyên liệu", "Nếm thử nguyên liệu sống", "Không cần chuẩn bị gì", "Tay và nguyên liệu sạch giúp tránh đau bụng."],
  ],
  act_tc_04: [
    ["Trò \"ô ăn quan\" thường chơi bằng gì?", "Sỏi hoặc hạt", "Quả bóng", "Điện thoại", "Ô ăn quan chơi bằng sỏi, hạt trên các ô kẻ dưới đất."],
    ["Dạy trò chơi cho người chưa biết, em làm gì trước?", "Giải thích luật chơi rõ ràng", "Bắt đầu chơi luôn, không nói gì", "Chỉ chơi với người đã biết", "Biết luật thì người mới chơi mới thấy vui và công bằng."],
  ],
  act_tc_05: [
    ["Vì sao nhắm mắt thì khó giữ thăng bằng hơn?", "Mắt giúp cơ thể biết mình đang nghiêng thế nào", "Nhắm mắt làm chân yếu đi", "Không có lý do", "Não dùng cả mắt và tai trong để giữ thăng bằng."],
    ["Thử đứng một chân nhắm mắt, nên đứng ở đâu cho an toàn?", "Gần tường để vịn khi cần", "Trên bậc thang", "Giữa đường đi", "Đứng gần chỗ vịn để không bị ngã."],
  ],
  act_kt_04: [
    ["Cách nào giúp mô hình cây cầu đứng vững hơn?", "Buộc chặt các mối nối, làm chân đế rộng", "Dùng càng ít que càng tốt", "Để các que lỏng lẻo", "Mối nối chắc và chân đế rộng giúp mô hình không bị đổ."],
    ["Vì sao nên đặt thử một vật nhẹ lên mô hình?", "Để kiểm tra mô hình chịu lực được không", "Để trang trí cho đẹp", "Để mô hình nặng hơn khi mang đi", "Thử chịu lực là cách kỹ sư kiểm tra công trình."],
  ],
  act_kt_05: [
    ["Cầm ở cuối cán kéo thì cắt bìa thế nào so với cầm sát chốt?", "Nhẹ tay hơn", "Nặng tay hơn", "Không khác gì", "Cầm càng xa điểm xoay thì càng đỡ tốn sức."],
    ["Cái kéo hoạt động giống dụng cụ nào?", "Đòn bẩy", "Cái phễu", "Cái bánh xe", "Kéo là hai đòn bẩy nối với nhau ở chốt giữa."],
  ],
  act_kt_06: [
    ["Muốn biết sửa cánh có giúp máy bay bay xa hơn không, em làm gì?", "Phóng vài lần trước và sau khi sửa rồi so sánh", "Chỉ phóng một lần", "Không cần thử", "Thử nhiều lần rồi so sánh mới chắc chắn."],
    ["Vì sao mỗi lần chỉ nên sửa MỘT chỗ?", "Để biết chính chỗ sửa đó có tác dụng", "Vì giấy sẽ bị rách", "Vì sửa nhiều chỗ máy bay sẽ nặng", "Sửa nhiều chỗ cùng lúc thì không biết chỗ nào làm máy bay bay xa hơn."],
  ],
  act_sk_03: [
    ["Ngồi học lâu, vì sao nên đứng dậy vận động nhẹ?", "Để mắt đỡ mỏi, người bớt mệt", "Để được nghỉ học sớm", "Không có tác dụng gì", "Vận động nhẹ giúp máu lưu thông, mắt và lưng được nghỉ."],
    ["Bao lâu thì nên đứng dậy vận động một lần?", "Sau khoảng 45 phút đến 1 giờ ngồi học", "Cứ 2 phút một lần", "Học xong cả ngày mới nghỉ", "Nghỉ ngắn sau mỗi tiết học là vừa, không làm đứt mạch học."],
  ],
  act_nt_04: [
    ["Căng dây chun quanh hộp bìa rồi gảy. Âm thanh phát ra nhờ đâu?", "Dây chun rung lên", "Hộp bìa bị ướt", "Gió thổi vào hộp", "Âm thanh sinh ra khi vật rung; hộp bìa làm tiếng to hơn."],
    ["Dây chun căng hơn thì tiếng gảy thường thế nào?", "Cao (thanh) hơn", "Trầm hơn", "Không thay đổi", "Dây càng căng, rung càng nhanh, tiếng càng cao."],
  ],
};
