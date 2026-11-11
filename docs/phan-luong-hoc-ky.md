# Phân luồng sau lớp 9 & nội dung theo học kỳ (11/2026)

Thực hiện nhận xét của người hướng dẫn ngày 04/11/2026 ("Bảng tổng hợp 5 thay đổi cốt lõi"). Nhánh `phan-luong-hoc-ky`.

## Đối chiếu 5 hạng mục

| # | Yêu cầu | Đã làm | Khác tài liệu gốc, vì sao |
|---|---|---|---|
| 1 | Tách 2 luồng: học nghề 9+ / học tiếp THPT | Mỗi đáp án có `trackWeights` (thực hành / học thuật). Hồ sơ có `recommended_track`, `vocational_affinity_score`, `academic_affinity_score` và thêm `track_lean`, `track_reason`. Khóa cứng Y tế và Sư phạm → THPT. Thẻ "Hướng sau lớp 9" ở trang học sinh phía giáo viên, cột "Hướng sau lớp 9" ở danh sách lớp | **Chỉ giáo viên thấy nhãn luồng.** Học sinh chỉ thấy hai nhánh học lên của nhóm nổi bật. Trước Lớp 9 – HK2 nhãn luôn là "Đang khám phá". Quyết định luồng dựa trên `track_lean`, không lấy hiệu hai điểm, vì hai điểm này ngược chiều nhau gần như hoàn toàn: với người chọn bừa, hiệu ≥ 30 xảy ra ở 67%. Ngưỡng 10/90 khiến người chọn bừa chỉ bị gán nhãn khoảng 20% |
| 2 | Mô phỏng hàng nghìn điểm dữ liệu | `SIM_STUDENTS`, `SIM_WEEKS`, `SIM_TERM`, `SIM_HERD` (hiệu ứng đám đông) và thiên hướng ẩn `handsOn`. 1.000 em × 16 tuần → khoảng 42 nghìn câu trả lời, 18 nghìn hoạt động, 105 nghìn sự kiện, chạy khoảng 1 phút | **Không** làm `job-market-priors.ts` và **không** đưa học sinh ảo vào DB thật (`is_synthetic`). Thống kê việc làm không cho biết em trả lời câu hỏi thế nào, nên neo mô phỏng vào đó không làm kết quả "thật" hơn. Học sinh ảo trong DB thật thì sẽ lọt vào dashboard, tính lại hồ sơ và file xuất. Mô phỏng vẫn chạy riêng trong `sim-pilot/` |
| 3 | Câu hỏi & hoạt động theo học kỳ lớp 8/9 | `class_groups.curriculum_term`. Bộ câu = 20 câu neo `ALL` + 5 câu của học kỳ. Hoạt động `ALL` + 4 hoạt động/kỳ. `survey_attempts.curriculum_term`. Giáo viên đổi học kỳ ở trang Lớp học | Học kỳ đặt **theo lớp** chứ không theo từng học sinh (cả lớp sang kỳ cùng lúc). `measurement_wave` giữ nguyên T1/T2, vì các script đo lặp đang dựa vào đó. **Câu neo** dùng chung mọi kỳ để so sánh được giữa các kỳ |
| 4 | Danh mục nghề sát miền núi | 8 nhóm đổi tên, có nghề ví dụ, nhánh học nghề sau lớp 9 và nhánh học tiếp. Nhóm Thể chất – Thủ công đổi thành **Xây dựng, Cơ khí & Nghề thủ công**, vẫn giữ dệt và đan lát | Giữ mã nhóm nhưng **tăng `SCORING_VERSION` lên v5**: điểm v4 và v5 không so sánh trực tiếp. Câu đổi nghĩa (q01, q08, q15) **cho nghỉ** (`active=false`) chứ không sửa chữ; 9 hoạt động đổi nghĩa cũng cho nghỉ |
| 5 | Mức Elementary, trực quan DIY | 29 hoạt động mới, mỗi bước ≤ 15 từ, 2–6 bước. Toàn bộ 136 câu quiz viết lại theo kiểu **nhận biết nghề**. Nhận xét có thêm nhánh nghề và bước tiếp theo theo học kỳ | **Không** thêm `difficulty_tier`, vì mọi hoạt động đều cùng một mức. **Không** thêm `visual_guide`, vì chưa có ảnh/video quay thật: `instructions` đã là các bước, `media_url` là video. **Không dùng ảnh/video do AI tạo** |

Thêm ngoài 5 mục (từ ghi chú của người hướng dẫn):
- Trang chủ nói rõ trang làm gì trong 3 bước ("đọc trang web không biết em làm cái gì").
- 8 tài nguyên "Đường học lên", mỗi nhóm một: học trường nghề nào, hay học tiếp THPT.

## Sửa lỗi có sẵn (quan trọng)

`upsertSurveyQuestion` (Supabase) trước đây **xóa hết đáp án rồi chèn lại**. Vì `survey_responses.option_id` có `ON DELETE CASCADE`, mỗi lần giáo viên sửa chữ một câu hỏi thì **mọi câu trả lời của học sinh cho câu đó bị xóa**. Nay đáp án được upsert theo id, chỉ xóa đáp án thật sự bị bỏ.

## Triển khai (ngoài giờ học)

1. Chạy `supabase/migrations/20261104_phan_luong_hoc_ky.sql` trên Supabase. Đã thử trên Postgres 16: chạy 2 lần liên tiếp vẫn đúng, câu trả lời cũ còn nguyên, quiz và tài nguyên giáo viên đã sửa không bị ghi đè.
2. Deploy code.
3. `npm run recompute:profiles`.
4. Học sinh lớp 9 HK1 sẽ được mời trả lời thêm 8 câu: 3 câu thay thế + 5 câu của HK1. Đáp án cũ được chọn sẵn.
5. Máy dev: xóa `data/` rồi `npm run seed:local`, vì `data/*.json` còn nội dung cũ.

## Việc con người cần làm

- **Giáo viên duyệt lại:** 136 câu quiz mới, 23 câu khảo sát mới, 29 hoạt động mới (`activity-quiz.ts`, `survey-questions.ts`, `activities.ts`).
- **Video quay thật** cho 29 hoạt động mới (`media_url` đang trống) và **link trang tuyển sinh** trường trung cấp/cao đẳng trong tỉnh cho 8 tài nguyên "Đường học lên".
- **Kiểm chứng số liệu** người hướng dẫn nêu (thất nghiệp thanh niên 7,83–7,96%, 1,6 triệu NEET, 85–90% có việc sau học nghề) trước khi đưa vào bất kỳ nội dung nào cho học sinh. Con số 85–90% là **mục tiêu**, không phải kết quả đo được.
- **Lớp 8:** có nội dung, nhưng theo dõi từ lớp 8 sang lớp 9 cần 2 năm. Pilot hiện tại không kiểm chứng kịp.

## Giới hạn đã biết

- **Thiên hướng luồng chưa hoàn toàn độc lập với nhóm:** nhóm Sư phạm gần như toàn đáp án học thuật, nhóm Xây dựng gần như toàn đáp án thực hành.
- **Mô phỏng cho tương quan 0,76** giữa mức nghiêng và thiên hướng thật. Nhưng mô phỏng được dựng sao cho em trả lời đúng theo `trackWeights`, nên đây chỉ chứng minh **phép tính đúng**, không chứng minh câu hỏi đo đúng ở học sinh thật.
- **Nhãn luồng không biết hoàn cảnh gia đình, sức khỏe, học lực:** đây là gợi ý để giáo viên trao đổi với em và gia đình. App cố ý không hỏi về tiền bạc hay hoàn cảnh (dữ liệu trẻ em).
- **IPS chỉ biết học kỳ hiện tại của lớp:** lớp đã đổi kỳ thì các quyết định ở kỳ cũ bị loại khỏi ước lượng.
