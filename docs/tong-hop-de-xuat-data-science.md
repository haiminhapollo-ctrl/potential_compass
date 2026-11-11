# Tổng hợp chức năng bổ sung theo đề xuất Data Science (10/2026)

Tài liệu này tóm tắt những gì đã thêm vào Potential Compass để thực hiện **"Đề xuất của Hai Minh"** (các mục A1–A5, B1–B2 và ghi chú buổi họp). Chi tiết kỹ thuật nằm ở `docs/data-governance.md` (phương pháp, quyết định) và `docs/data-dictionary.md` (từng bảng/cột).

**Trạng thái (18/10/2026):** mọi thay đổi đã lên production (`main`, commit cuối `5f64488`), mọi migration đã chạy trên Supabase. Bài đối chiếu RIASEC **tạm dừng** (xem mục 6).

## 1. Đối chiếu nhanh với đề xuất

| Mục đề xuất | Đã làm | Ai dùng / thấy ở đâu |
|---|---|---|
| A1 Ngưỡng "Nổi bật", "chưa phân biệt rõ" | Ngưỡng hiệu chuẩn theo người trả lời bừa (20% người bừa có nhãn), so trên điểm chưa làm tròn; danh sách "Hồ sơ chưa phân biệt rõ" | Học sinh: hồ sơ. Giáo viên: Tổng quan, trang học sinh |
| A2 Nhãn mù | Học sinh chọn tối đa 3 nhóm **trước** khi xem kết quả (`label_phase`); kiểm định hoán vị | Câu cuối bài khảo sát; `analyze:metrics` |
| A3 Ghi propensity | Ghi xác suất được chọn + số ứng viên cho gợi ý hằng ngày; đánh giá IPS | `analyze:models` mục 3 |
| A4 Cờ trả lời cẩu thả | Xáo thứ tự **đáp án** và **câu hỏi** theo từng em; ghi thời gian từng câu, vị trí đáp án; cờ "làm rất nhanh", "chọn cùng vị trí"; phát hiện mở bài rồi bỏ dở | Giáo viên: trang học sinh; `analyze:survey` |
| A5 bước 1 Thời gian làm hoạt động | Ghi lúc mở hoạt động → lúc hoàn thành; so với thời lượng dự kiến; phát hiện mở rồi bỏ dở | `analyze:metrics` |
| A5 bước 2 Quiz | Câu hỏi ôn nhanh sau mỗi hoạt động, **cho học sinh, có hiện điểm, không tính vào hồ sơ** | Học sinh: trang hoạt động. Giáo viên: soạn ở trang Hoạt động, xem ở trang học sinh |
| B1 Kiểm định bộ khảo sát | Lưu mọi lần làm (không ghi đè), đợt khảo sát lại T2; test–retest (Spearman + KTC, Jaccard, giữ top 1); phân tích câu (tần suất, entropy, ảnh hưởng, tương quan câu–nhóm); CLR → PCA; mô hình lựa chọn bắt buộc kiểu Thurstonian | Giáo viên: mở đợt T2 ở trang Lớp học; `analyze:survey`, `analyze:models` mục 4 |
| B1 Đối chiếu RIASEC | Đã xây xong, bảng ánh xạ đã duyệt — **tạm dừng** vì chưa có bản dịch 30 câu | Xem mục 6 |
| B2 Phân tích duy trì | Bảng đặc trưng (em, tuần); Kaplan–Meier theo lớp; Cox biến thay đổi theo thời gian; dự đoán ngừng (logistic) so với baseline | `analyze:metrics`, `analyze:models` mục 1–2 |
| Ghi chú họp: mô phỏng 300 em, K-means, random forest, "7/10 thì chắc hơn" | Notebook thực hành (Phần 3b: độ chắc chắn theo 10 em giống nhất) | `docs/notebooks/Thuc_hanh_DS_Hai_Minh.ipynb` |
| Dữ liệu pilot cho mô hình | Bộ dữ liệu pilot **giả lập** 140 em / 10 tuần chạy qua logic thật của app | `npm run analyze:sim` |

## 2. Thay đổi với học sinh

- **Bài khảo sát:** thứ tự câu hỏi và thứ tự đáp án xáo riêng cho từng em (cố định với em đó: lần đầu, khảo sát lại và trang xem lại cùng thứ tự). Bộ khảo sát 20 câu.
- **Câu cuối bài (không bắt buộc):** "Theo em, em giống những nhóm nào nhất?", chọn tối đa 3 nhóm, trước khi xem kết quả.
- **Hồ sơ:** nhóm chỉ được gắn "Nổi bật" khi vượt ngưỡng đã hiệu chuẩn; chưa nhóm nào vượt thì hồ sơ ghi "chưa phân biệt rõ" (không ngầm "đây là nhóm của em").
- **Khảo sát lại:** khi giáo viên mở đợt T2, em thấy lời mời ở trang Hồ sơ và Hoạt động; bài làm là form trống.
- **Câu hỏi ôn nhanh:** làm xong hoạt động thì có 2 câu trắc nghiệm; nộp xong thấy "Em đúng X/Y câu", đáp án đúng và giải thích. Trang ghi rõ không phải bài kiểm tra và không tính vào hồ sơ.

## 3. Thay đổi với giáo viên

- **Đăng nhập bằng tài khoản riêng** (thay mã truy cập dùng chung); quản trị viên tạo tài khoản / đặt lại mật khẩu ở trang "Giáo viên".
- **Tổng quan:** danh sách "Hồ sơ chưa phân biệt rõ" để trò chuyện 1-1 (không phải đánh giá học sinh).
- **Lớp học:** mở/đóng đợt khảo sát lại (T2…) cho cả lớp.
- **Trang học sinh:** các lần làm khảo sát kèm thời gian và cờ ⚠ (làm rất nhanh, nhiều câu liền chọn cùng vị trí — chỉ để hỏi lại em, không loại bài); nhóm em tự chọn trước khi xem kết quả; kết quả câu hỏi ôn nhanh (điểm, thời gian).
- **Hoạt động:** ô soạn câu hỏi ôn nhanh dạng văn bản (`*` đáp án đúng, `-` đáp án sai, `Giải thích:`); sai định dạng thì báo lỗi tại chỗ và không mất phần đang gõ. 96 câu soạn sẵn đã được giáo viên rà soát (18/10/2026).

## 4. Phân tích và dữ liệu

| Lệnh | Nội dung chính |
|---|---|
| `npm run analyze:survey` | Cấu trúc bộ câu hỏi; tần suất đáp án, entropy, thiên lệch vị trí; test–retest T1→T2; ảnh hưởng từng câu; tương quan câu–nhóm; CLR → PCA; thời gian làm bài và thời gian từng câu; mở bài rồi bỏ dở; đối chiếu RIASEC (khi có dữ liệu) |
| `npm run analyze:metrics` | Tỷ lệ làm gợi ý, đổi, để dành; mở rồi bỏ dở; thời gian làm thật so với dự kiến; retention + Kaplan–Meier theo lớp; đánh giá luật "Nên hỏi thăm" 7 ngày; đồng thuận nhãn trước/sau khi xem; câu hỏi ôn nhanh (điểm, làm vội, câu ít em đúng nhất); cỡ mẫu A/B |
| `npm run analyze:models` | Cox (hòa Efron, sai số gom theo học sinh); dự đoán ngừng (logistic, GroupKFold + chia theo thời gian, AUC/Brier/calibration so với baseline — chỉ giữ khi hơn rõ ở cả hai cách chia); IPS; mô hình lựa chọn bắt buộc kiểu Thurstonian (bản xấp xỉ) |
| `npm run analyze:scoring` | Hiệu chuẩn ngưỡng "Nổi bật" và độ nhạy công thức bằng mô phỏng |
| `npm run export:dataset` | CSV ẩn danh (chỉ em có xác nhận phụ huynh): lần làm khảo sát, câu trả lời (vị trí, thời gian), lần mở bài, hoạt động (thời gian thật), sự kiện gợi ý (propensity), nhãn, quiz, bảng đặc trưng (em, tuần) |
| `npm run analyze:sim` | Sinh dữ liệu pilot giả lập vào `sim-pilot/` (không đụng `data/` hay Supabase) rồi chạy cả ba phân tích; có "sự thật" để kiểm tra mô hình |

**Dữ liệu mới ghi lại:** `survey_attempts`, `survey_responses` (`display_position`, `question_position`, `first_answered_ms`), `survey_opens`, `outcome_labels.label_phase`, `recommendation_events` (`propensity`, `n_candidates`, sự kiện `opened`), `activity_logs` (`started_at`, `finished_at`), `activities.quiz`, `quiz_attempts`, `class_groups.retest_wave`, `class_groups.riasec_enabled`, `riasec_attempts`.

**Kết quả trên dữ liệu giả lập (để kiểm tra công cụ, không phải kết quả về học sinh):** IPS ước lượng 50,9% so với thật 50,0%; Cox tìm đúng chiều các yếu tố nhưng HR bị kéo về 1 (tuần nghỉ ngẫu nhiên cũng bị tính là "ngừng"); mô hình dự đoán chưa hơn baseline khi chia theo thời gian nên chưa được giữ; điểm kiểu Thurstonian gần sở thích thật hơn điểm hiện tại.

## 5. Quyết định và phê duyệt

| Nội dung | Quyết định |
|---|---|
| Ngưỡng "Nổi bật" `NOTABLE_ALPHA = 0,2` và câu chữ hiển thị | Giáo viên duyệt 18/10/2026 |
| "Mỗi nhóm một ngưỡng riêng" (A1) | Không thêm: điểm đã là phân vị theo từng nhóm; chênh lệch còn lại do điểm thô là số nguyên, ngưỡng hiện tại đã gần mức đều nhất có thể (chi tiết ở data-governance) |
| "Đảo thứ tự câu hỏi" (A4) | Hiểu là thứ tự **câu**; đã làm cùng với xáo đáp án |
| Quiz | Dành cho học sinh, có hiện điểm, không tính vào hồ sơ; 96 câu soạn sẵn đã được giáo viên rà soát 18/10/2026 |
| Bảng ánh xạ 8 nhóm → RIASEC | Chuyên gia Bùi Văn Trung duyệt 18/10/2026, giữ nguyên bản đề xuất (hash `bda22d54`, khóa trong `check:logic`) |
| RIASEC | Dùng O\*NET Mini-IP 30 câu, mẫu con theo lớp giáo viên bật — **tạm dừng 18/10/2026** |

## 6. Tạm dừng và chưa làm

- **Đối chiếu RIASEC — tạm dừng.** Mã nguồn, bảng dữ liệu, trang làm bài, nút bật theo lớp và phân tích đã có; bảng ánh xạ đã duyệt. Thiếu bản dịch 30 câu O\*NET Mini-IP (lấy qua O\*NET Web Services `mpp/interestprofiler/questions_30`), nên nút bật bị khóa và học sinh không thấy gì. Muốn tiếp tục: điền bản dịch + loại R/I/A/S/E/C vào `src/lib/content/riasec-items.ts`, giữ ghi nguồn theo O\*NET Tools Developer License (đã có trong trang làm bài và README).
- **Cần dữ liệu pilot thật:** mọi con số của `analyze:models`, test–retest, Kaplan–Meier… hiện chỉ chạy trên dữ liệu giả lập.
- **Chưa làm:** Thurstonian IRT chuẩn (probit, ước lượng tải trọng — nên đối chiếu bằng gói R `thurstonianIRT` trước khi dùng điểm chuẩn để tư vấn); collaborative filtering / bandit (cần nhiều dữ liệu hơn); phân tích văn bản tự viết bằng mô hình ngôn ngữ.

## 7. Triển khai

Migration đã chạy trên Supabase production theo thứ tự: `20261007_teacher_auth` → `20261007b_khao_sat_20_cau` → `20261008_de_xuat_data_science` → `20261017_thoi_gian_lam_bai` → `20261017b_mo_roi_bo_do` → `20261018_xao_thu_tu_cau` → `20261018b_quiz_riasec`. Project Supabase mới: chạy `schema.sql` + `policies.sql` (đã gồm mọi thay đổi) rồi `npm run seed:supabase`.

Các commit chính trên `main`: `ca64307` tài khoản giáo viên, bộ 20 câu · `b2e7808` gói A1–A4, B1 · `2013f26` thời gian từng câu, thời gian làm hoạt động · `e9fd193` mở rồi bỏ dở, tương quan câu–nhóm, CLR → PCA · `332e6c0` xáo thứ tự câu · `d37856e` mô hình sau pilot + dữ liệu giả lập · `d478a30` quiz + RIASEC · `5f64488` ghi nhận phê duyệt.
