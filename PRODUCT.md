# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: học sinh lớp 9 ở trường vùng cao**, sắp đến lúc chọn hướng sau lớp 9 (THPT, trung cấp, học nghề). Đa số là người Kinh, tiếng Việt là ngôn ngữ chính. Các em đăng nhập bằng **mã học sinh** do giáo viên cấp, vì nhiều em không có email. Các em dùng app trên hai loại thiết bị:

- **Điện thoại riêng**, thường là máy giá rẻ, màn hình nhỏ, sóng di động chập chờn, hay dùng ngoài trời.
- **Máy tính phòng tin học của trường.** Máy dùng chung, nhiều học sinh lần lượt đăng nhập trên cùng một máy.

Việc các em cần làm: làm khảo sát tình huống một lần, rồi mỗi ngày thử một hoạt động ngắn 3–5 phút, chấm mức hứng thú và bấm chọn cảm nhận. Sau đó các em xem hồ sơ sở thích của mình thay đổi theo thời gian.

**Secondary: giáo viên / quản trị viên của trường.** Họ tạo lớp, cấp mã, xác nhận đồng ý của phụ huynh, sửa nội dung khảo sát / hoạt động / tài nguyên, mở đợt khảo sát lại, xem phân bố điểm của lớp và danh sách học sinh "Nên hỏi thăm".

**Evaluators: giám khảo cuộc thi KHKT.** Đây là dự án nghiên cứu của học sinh (Hai Minh), có mentor hướng dẫn. Giám khảo đánh giá sản phẩm và phương pháp đứng sau nó.

## Product Purpose

Giúp học sinh lớp 9 vùng cao **khám phá sở thích** qua trải nghiệm thật và liên tục, thay vì một bài trắc nghiệm làm một lần rồi thôi. Hồ sơ sở thích theo 8 nhóm lĩnh vực được cập nhật sau mỗi hoạt động. Nhận xét luôn khuyến khích em thử thêm, không bao giờ kết luận em "phải làm nghề gì".

Thành công, với học sinh: các em quay lại làm hoạt động đều đặn, thử nhiều nhóm khác nhau, và thấy hồ sơ phản ánh đúng mình. Với dự án KHKT: một sản phẩm chạy được thật, cộng với phương pháp bảo vệ được bằng số liệu và phân tích tái lập được.

## Positioning

- **Hồ sơ sống, không phải kết quả một lần:** điểm thay đổi theo từng hoạt động 3–5 phút mỗi ngày. Hệ thống ưu tiên giao hoạt động ở nhóm em còn ít trải nghiệm.
- **Chấm điểm minh bạch, có phiên bản:** dùng quy tắc cố định, không có mô hình học máy. Điểm khảo sát được hiệu chuẩn so với người chọn ngẫu nhiên (50 = ngang chọn bừa). Nhãn "Nổi bật" có ngưỡng hiệu chuẩn. AI (Gemini) chỉ diễn giải điểm thành lời, và có mẫu câu dự phòng khi không có khóa API.
- **8 nhóm lĩnh vực hợp bối cảnh vùng cao:** có nhóm Nông - Lâm - Ngư và nhóm Thủ công truyền thống. Tên nhóm trung lập về giới, nhóm nào cũng ngang hàng nhau.
- **Kiểm chứng được:** có test-retest T1→T2, đo thời gian trả lời, xáo thứ tự câu và đáp án, cùng các script phân tích chạy được trên dữ liệu pilot giả lập.

## Operating Context

- Mạng yếu hoặc mất mạng: phản hồi hoạt động vào hàng đợi IndexedDB, tự đồng bộ khi có sóng. Bài đang làm được lưu nháp trên máy.
- Phòng tin học: nhiều học sinh lần lượt dùng chung một máy, nên việc đăng xuất và tách dữ liệu giữa các em trên cùng máy là chuyện thực tế hằng ngày.
- Giáo viên cấp mã học sinh và mở đợt khảo sát lại (T2) theo lớp. Cron hằng đêm (23:17 giờ VN) tính lại hồ sơ và ghi snapshot tuần.
- Phát triển trên máy: chế độ `DATA_BACKEND=local` có dữ liệu mẫu (`npm run seed:local`), cùng bộ pilot giả lập (`npm run analyze:sim`).
- Production: https://potential-compass.vercel.app (Vercel + Supabase). Mọi thay đổi lên `main` đều **tự deploy lên production**.

## Capabilities and Constraints

- **Học sinh:**
  - Khảo sát 20 câu tình huống, mỗi câu 4 lựa chọn, thứ tự câu và đáp án được xáo theo từng em.
  - Hồ sơ sở thích 0–100 theo 8 nhóm, kèm nhận xét và tài nguyên gợi ý.
  - Hoạt động hằng ngày: chấm sao (bắt buộc) và bấm chọn cảm nhận / tự tin / độ khó (không bắt buộc), sau đó có phản hồi ngay theo câu trả lời.
  - Quiz ôn nhanh: có điểm, nhưng không tính vào hồ sơ.
  - Để dành làm sau (tối đa 5), đổi hoạt động (tối đa 2 lần/ngày), khám phá thêm (tối đa 2 hoạt động/ngày).
  - Tổng kết tuần, lịch sử hồ sơ qua các tuần.
- **Giáo viên:** dashboard; lớp và học sinh; sửa câu hỏi khảo sát (giữ nguyên trọng số); bật/tắt và thêm hoạt động; kho tài nguyên; tài khoản giáo viên (mật khẩu tạm, đổi mật khẩu bắt buộc).
- **Kỹ thuật:**
  - Next.js 15, React 19, Tailwind, Supabase. Là PWA, không có app native.
  - Chế độ `local` không chạy được trên Vercel.
  - Migration Supabase phải chạy **trước** khi deploy code mới.
- **Phiên đăng nhập học sinh:** cookie ký HMAC, hạn cố định 30 ngày, không tự gia hạn, không có mật khẩu. Ai có mã là vào được, chấp nhận được ở quy mô pilot nhỏ.
- **Rủi ro còn mở trên máy dùng chung:**
  - Hàng đợi offline gửi bài theo phiên đăng nhập *hiện tại*, không gắn mã học sinh. Nếu em khác đăng nhập trước khi kịp đồng bộ, bài có thể bị ghi cho nhầm em.
  - Bản nháp form đã được khóa theo mã học sinh.
- **RIASEC (O*NET Mini-IP):** tạm dừng, đang khóa. Bản dịch 30 câu chưa có và **không được tự viết hay sao chép**.
- **Thuật ngữ cố định:** "Hồ sơ sở thích" (không gọi là năng lực), "Nổi bật", "Hoạt động hôm nay", "Khám phá thêm", "Để dành làm sau", "Tổng kết tuần", "Nên hỏi thăm", và tên 8 nhóm trong `src/lib/domains.ts`.

## Brand Commitments

- Tên sản phẩm: **Potential Compass**.
- **Giọng văn với học sinh:** xưng "em", gọi "thầy cô". Nhẹ nhàng, động viên, không dùng từ kỹ thuật. Thông báo lỗi nói em cần làm gì tiếp. Luôn nhắc rằng đây là gợi ý để khám phá, không phải kết luận nghề nghiệp, và không nhóm nào "tốt hơn" nhóm nào.
- **Bản sắc văn hóa vùng cao là cam kết đã chốt:** dùng hoa văn Trống đồng Đông Sơn, thổ cẩm, chim Lạc ở dạng chi tiết nhỏ, cùng định hướng "Tự nhiên – Đất – Giấy mộc" cho máy cấu hình thấp. Nguồn: `../Bao Cao Cai Tien UI-UX Potential Compass.pdf` (báo cáo cải tiến UI/UX 10/2026, đã triển khai lên production). Chi tiết hình ảnh thuộc DESIGN.md.

## Evidence on Hand

- **Tài liệu:**
  - `docs/`: mô tả tính năng, hướng dẫn học sinh, hướng dẫn giáo viên/quản trị, triển khai & vận hành (.docx).
  - `docs/data-governance.md`, `docs/data-dictionary.md`.
  - `docs/tong-hop-de-xuat-data-science.md`, notebook thực hành trong `docs/notebooks/`.
- **Nội dung:** 8 nhóm lĩnh vực, 20 câu khảo sát, kho hoạt động, 56 tài nguyên khởi điểm, 96 câu quiz (giáo viên đã rà soát).
- **Phê duyệt:** giáo viên duyệt ngưỡng `NOTABLE_ALPHA = 0.2`. Chuyên gia Bùi Văn Trung duyệt bảng ánh xạ 8 nhóm → RIASEC (tính năng RIASEC đang tạm dừng).
- **Phân tích:** `npm run analyze:*` cùng pilot giả lập 140 học sinh / 10 tuần (`sim-pilot/`, không commit, có `sim_truth.json` để đối chiếu).
- **Chưa có, không được bịa:** dữ liệu pilot thật, số liệu sử dụng thật, lời chứng thực của học sinh hay giáo viên, giải thưởng, báo chí.

## Product Principles

1. **Khám phá, không phán xét:** hồ sơ là sở thích đang thay đổi, không phải điểm năng lực hay lời phán nghề nghiệp.
2. **Minh bạch và kiểm chứng được:** mọi con số đến từ quy tắc có phiên bản và phân tích tái lập được, AI chỉ diễn đạt. Không đưa ra tuyên bố nào chưa có bằng chứng.
3. **Không bao giờ làm mất bài của em:** máy yếu, mạng yếu, hết phiên đăng nhập hay máy dùng chung đều không được làm mất câu trả lời, cũng không được để lộ bài của em này sang em khác.
4. **Nỗ lực tối thiểu, đều đặn mỗi ngày:** chỉ vài phút, bấm chọn thay vì gõ chữ, phần viết thêm luôn không bắt buộc.
5. **Công bằng và gần gũi:** không khuôn mẫu giới, không thứ bậc giữa các nhóm, có nội dung gắn với đời sống vùng cao.

## Accessibility & Inclusion

- Đọc được ngoài trời trên màn hình rẻ, kể cả màn bị nứt. Chữ nội dung tối thiểu 15px trên mobile, tương phản cao.
- Dùng được trên cả điện thoại nhỏ lẫn màn hình máy tính phòng tin học: thao tác chạm và bàn phím, focus phải hiện rõ.
- Học sinh gõ chữ chậm: ưu tiên bấm chọn.
- Tôn trọng `prefers-reduced-motion`. Không dùng hiệu ứng chuyển động liên tục gây hao pin.
- Quyền riêng tư của trẻ vị thành niên: cần xác nhận đồng ý của phụ huynh. Dữ liệu không được để lộ giữa các học sinh dùng chung máy.
