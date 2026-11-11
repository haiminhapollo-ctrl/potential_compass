# Từ điển dữ liệu — Potential Compass

Phiên bản schema: xem bảng `schema_migrations` (mới nhất: `20261018b_quiz_riasec`).
Phiên bản công thức chấm điểm: `SCORING_VERSION` trong `src/lib/recommendation/scoring.ts` (hiện `v4-2026-10`).
Kiểu TypeScript tương ứng: `src/lib/types.ts`. Định nghĩa bảng: `supabase/schema.sql`.

**Vai trò biến:** `input` (người dùng nhập), `derived` (hệ thống tính ra, tính lại được), `label` (nhãn đánh giá dùng để kiểm chứng), `meta` (phiên bản, thời điểm, nguồn gốc).

## Quy trình dữ liệu (data lineage)

```
Học sinh trả lời khảo sát ──► survey_attempts ─► survey_responses ─┐  (mỗi lần nộp = 1 lần làm; chấm điểm dùng lần mới nhất)
Học sinh đánh giá hoạt động ─► activity_logs ────┤
                                                 ├─► scoring.ts (quy tắc cố định, có phiên bản)
Nội dung (giáo viên sửa) ──► survey_questions,   │        │
   có nhật ký content_audit_log  activities ─────┘        ▼
                                      potential_profiles (hiện tại) + profile_snapshots (mỗi tuần)
                                                           │
                                                           ▼
                                      gemini.ts / template: CHỈ diễn giải điểm thành lời văn
Hệ thống gợi ý (daily-pick.ts) ──► recommendation_events (đã gợi ý / đổi / để dành / hoàn thành)
Học sinh & giáo viên đánh giá kết quả ──► outcome_labels (ground truth)
```

Không có mô hình học máy nào trong pipeline. Điểm số đến từ quy tắc; Gemini không chấm điểm, không dự đoán.

## Bảng nội dung

| Bảng.cột | Vai trò | Kiểu / miền giá trị | Ý nghĩa | Ai sửa |
|---|---|---|---|---|
| `survey_questions.scenario` | input | text | Tình huống của câu hỏi | Giáo viên (có nhật ký) |
| `survey_questions.curriculum_term` | input | `ALL` · `G8_HK1` · `G8_HK2` · `G9_HK1` · `G9_HK2` | `ALL` = câu neo dùng mọi học kỳ (so sánh được giữa các kỳ); còn lại chỉ hiện cho lớp đang ở học kỳ đó (từ 11/2026) | Người soạn nội dung |
| `survey_questions.active` | input | boolean | `false` = câu đã thay vì đổi nghĩa (vd q01/q08/q15 có đáp án thể thao, 11/2026). Không hiện, không chấm; giữ lại để câu trả lời cũ không bị xóa dây chuyền | Người soạn nội dung |
| `survey_options.track_weights` | input | jsonb `{vocational?: số, academic?: số}` | Thiên hướng của đáp án: bắt tay làm / tìm hiểu lý thuyết. `{}` = trung tính. Dùng tính thiên hướng luồng sau lớp 9 | Người soạn nội dung |
| `survey_options.domain_weights` | input | jsonb `{nhóm: số}`, thường tổng = 2 | Đáp án cộng bao nhiêu điểm thô cho nhóm nào | Chỉ người soạn nội dung (mã nguồn + seed), giáo viên không sửa trên giao diện |
| `activities.domain` | input | 1 trong 8 mã nhóm | Nhóm chính của hoạt động | Giáo viên khi tạo |
| `activities.secondary_domain` | input | mã nhóm hoặc `null` | Nhóm phụ; đánh giá tính thêm trọng số 0,5 | Giáo viên |
| `activities.curriculum_term` | input | như `survey_questions.curriculum_term` | Học kỳ gợi ý hoạt động (bám bài Công nghệ/KHTN trên lớp) | Giáo viên |
| `activities.media_url` | input | URL http(s) hoặc `null` | Ảnh/YouTube minh họa. `null` = chưa có, giao diện hiện nút tìm kiếm | Giáo viên |
| `activities.example` | input | text, có thể rỗng | Ví dụ tham khảo do người lớn soạn (không phải bài làm của học sinh khác) | Giáo viên |
| `activities.quiz` | input | jsonb `[{id, prompt, options[2–4], correct, explanation}]`, tối đa 5 câu | Câu hỏi ôn nhanh sau hoạt động (`src/lib/quiz.ts`). `[]` = không có quiz. Bản soạn sẵn đã được giáo viên rà soát (18/10/2026); sửa ở trang "Hoạt động" | Giáo viên (có nhật ký) |
| `resources.url` | input | URL http(s) hoặc `null` | Link tài nguyên; `null` = giao diện mở trang tìm kiếm | Giáo viên |

## Bảng dữ liệu học sinh

| Bảng.cột | Vai trò | Kiểu / miền giá trị | Ý nghĩa · Ý nghĩa của `null` |
|---|---|---|---|
| `students.parent_consent_confirmed` | input | boolean | Đã có xác nhận phụ huynh. `false` → loại khỏi mọi dữ liệu xuất phân tích |
| `class_groups.riasec_enabled` | input | boolean | Lớp nằm trong mẫu con làm bài đối chiếu RIASEC. Chỉ bật được khi đủ 30 câu bản dịch |
| `quiz_attempts` | input | 1 dòng / (em, hoạt động, ngày) | Bài quiz ôn nhanh: `answers` `[{questionId, chosen, correct}]` (`chosen` = chỉ số đáp án theo thứ tự soạn), `n_correct`/`n_questions`, `quiz_version` (phiên bản câu hỏi lúc làm), `started_at`/`finished_at` (mở quiz → nộp). **Không tính vào hồ sơ sở thích** |
| `riasec_attempts` | input | ≤ 1 dòng / em | Bài O\*NET Mini-IP: `answers` `{id câu: 1–5}` (rất không thích → rất thích), `items_version` (phiên bản bản dịch). Điểm mỗi loại = tổng 5 câu (5–25), `riasecScores` |
| `class_groups.curriculum_term` | input | `G8_HK1` … `G9_HK2`, mặc định `G9_HK1` | Học kỳ lớp đang học → bộ câu hỏi (câu neo + gói của kỳ) và hoạt động em thấy. Giáo viên đổi ở trang Lớp học; đổi xong hồ sơ cả lớp tính lại và các em được mời trả lời thêm câu mới |
| `survey_attempts.curriculum_term` | meta | như trên hoặc `null` | Học kỳ của lớp lúc em làm bài. `null` = dữ liệu trước 11/2026 |
| `class_groups.retest_wave` | input | `T2`, `T3`… hoặc `null` | Đợt khảo sát lại giáo viên đang mở cho lớp. `null` = không mở |
| `survey_attempts` | input | 1 dòng / lần nộp | Một lần làm khảo sát. Làm lại **không ghi đè** lần trước; hồ sơ tính từ lần **mới nhất đã hoàn thành** |
| `survey_attempts.measurement_wave` | meta | `T1` · `T2`… · `null` | `T1` = lần đầu, `T2`… = đợt khảo sát lại (cả hai là bài **trống**). `null` = làm lại tự nguyện / trả lời bổ sung câu mới, đáp án cũ được chọn sẵn → **không dùng cho test-retest** |
| `survey_opens` | meta | 1 dòng / lần mở trang | Mỗi lần em **mở** bài khảo sát form trống (`measurement_wave` T1, T2…, `opened_at`), kể cả tải lại trang. Có lần mở mà chưa có `survey_attempts` cùng (em, đợt) = **đang bỏ dở**. Các lần mở cách nhau > 6 giờ tính là phiên mới (`analyze:survey`). Chỉ server đọc/ghi (RLS không policy) |
| `survey_attempts.started_at` / `completed_at` | meta | thời điểm | Mở trang (server ghi vào form; `null` nếu không hợp lệ hoặc là dữ liệu cũ) / nộp xong. `completed_at = null` = ghi đứt giữa chừng, không được tính |
| `survey_responses.attempt_id` | meta | id lần làm | Mỗi lần làm có đúng 1 đáp án cho mỗi câu (unique `attempt_id, question_id`) |
| `survey_responses.option_id` | input | id đáp án thuộc đúng `question_id` (server kiểm tra) | Đáp án đã chọn. Mỗi lần nộp phải đủ mọi câu hiện có |
| `survey_responses.display_position` | meta | 0–3 hoặc `null` | Vị trí đáp án trên màn hình của em (thứ tự xáo theo từng học sinh). `null` = dữ liệu trước 10/2026, thứ tự cố định |
| `survey_responses.question_position` | meta | 0 trở lên hoặc `null` | Vị trí câu hỏi trên trang của em (0 = câu đầu). Thứ tự câu xáo theo từng học sinh, cố định với mỗi em (T1, T2 và trang xem lại cùng thứ tự). `null` = dữ liệu trước 18/10/2026, câu hiện theo `survey_questions.order` |
| `survey_responses.first_answered_ms` | meta | ms ≥ 0 hoặc `null` | Từ lúc mở trang khảo sát tới lúc em chọn câu này **lần đầu** (đổi đáp án sau đó không tính lại; trình duyệt ghi). Chỉ có ở bài form trống; `null` = làm lại có đáp án cũ chọn sẵn, tắt JavaScript, hoặc dữ liệu trước 17/10/2026. Khoảng cách giữa các lần chọn (xếp theo thời điểm) = thời gian từng câu |
| `survey_responses.survey_version` | meta | contentHash 8 ký tự hex | Phiên bản bộ câu hỏi lúc trả lời. `null` = dữ liệu trước 10/2026 |
| `activity_logs.date` | input | ngày (giờ VN) | Ngày làm, không phải ngày đồng bộ. Không ở tương lai; offline lùi tối đa 7 ngày |
| `activity_logs.interest_rating` | input | 1–5 | Mức hứng thú. **Thành phần duy nhất của hoạt động được tính vào điểm** |
| `activity_logs.reflection_text` | input | 1 trong 4 câu cảm nhận, hoặc văn bản cũ | Cảm nhận bấm chọn. Rỗng = không chọn |
| `activity_logs.confidence` | input | 1 chưa làm được · 2 một phần · 3 làm tốt · `null` | Tự đánh giá; dùng cho phản hồi và cho giáo viên, không tính điểm |
| `activity_logs.difficulty` | input | 1 dễ · 2 vừa · 3 khó · `null` | Độ khó cảm nhận; như trên |
| `activity_logs.note` | input | text ≤ 1000 ký tự | Phần tự viết. Dữ liệu định tính cho giáo viên đọc, **không xuất ra file phân tích** (có thể chứa thông tin cá nhân) |
| `activity_logs.is_extra` | derived | boolean | Hoạt động tự nguyện làm thêm sau hoạt động chính (server tự quyết, client không gửi được) |
| `activity_logs.source` | meta | `online` / `offline_sync` | Nộp trực tuyến hay đồng bộ sau khi mất mạng |
| `activity_logs.started_at` / `finished_at` | meta | thời điểm, cả hai cùng có hoặc cùng `null` | Lần đầu em mở trang hoạt động trong ngày (trên máy đó) → lúc bấm hoàn thành. Thời lượng đo bằng đồng hồ máy em; mốc kết thúc neo vào giờ server khi nộp trực tuyến, giữ giờ máy khi đồng bộ offline. Quá 24 giờ / ngược chiều / lệch giờ quá xa → `null`. So với `activities.duration_minutes` (dự kiến). Sửa phản hồi trong ngày không đổi thời gian |
| `saved_activities` | input | (học sinh, hoạt động) duy nhất | Danh sách để dành làm sau (tối đa 5) |

## Bảng kết quả (tính lại được)

| Bảng.cột | Vai trò | Kiểu / miền | Ý nghĩa |
|---|---|---|---|
| `potential_profiles.scores` | derived | 8 × `{domain, score 0–100, rank, notable}` | Điểm sở thích. **50 = ngang người chọn ngẫu nhiên**; so sánh được giữa học sinh và giữa các tuần. `notable` = nhãn "Nổi bật" (ngưỡng hiệu chuẩn theo người trả lời bừa, xem data-governance mục 2); không có trường này = công thức trước v4 |
| `potential_profiles.recommended_track` | derived | `VOCATIONAL_9PLUS` · `ACADEMIC_HIGH_SCHOOL` · `DUAL_EXPLORATION` · `null` | Gợi ý luồng sau lớp 9, **chỉ giáo viên xem**. Chỉ khác `DUAL_EXPLORATION` khi: nhóm đứng đầu có nhãn Nổi bật là Y tế / Sư phạm (khóa cứng → THPT), hoặc lớp ở `G9_HK2` và `track_lean` ≤ 10 / ≥ 90. `null` = hồ sơ trước v5 hoặc chưa làm đủ khảo sát |
| `potential_profiles.vocational_affinity_score` / `academic_affinity_score` | derived | 0–100 | Phân vị tổng trọng số thực hành / học thuật so với người chọn ngẫu nhiên (50 = ngang chọn bừa). Hai điểm gần như ngược chiều nhau nên **không dùng hiệu của chúng** để quyết định |
| `potential_profiles.track_lean` | derived | 0–100 | Phân vị của (thực hành − học thuật) so với người chọn ngẫu nhiên; 50 = cân bằng. Ngưỡng 10/90 làm người trả lời bừa bị gán nhãn ~20% (`TRACK_ALPHA`, check:logic) |
| `potential_profiles.track_reason` | derived | `khoa_cung` · `chenh_lech` · `chua_du_can_cu` · `chua_toi_hoc_ky_chot` | Vì sao có nhãn luồng đó. `profile_snapshots` có cùng 5 cột luồng |
| `potential_profiles.components` | derived | 8 × `{surveyRaw, surveyScore, activityShift, ratingEvidence}` | Thành phần thô để tái lập và phân tích lại |
| `potential_profiles.scoring_version` | meta | ví dụ `v3-2026-10` | Công thức đã dùng. `null` = công thức cũ, chưa tính lại |
| `potential_profiles.content_hash` | meta | 8 hex | Phiên bản nội dung đã dùng để tính |
| `potential_profiles.last_insight` | derived | text | Nhận xét bằng lời. Chỉ sinh lại khi top 3 / công thức / prompt đổi |
| `potential_profiles.insight_source` / `insight_model` / `insight_prompt_version` / `insight_generated_at` | meta | `gemini`/`template`, tên model, phiên bản prompt, thời điểm | Nguồn gốc đoạn nhận xét |
| `profile_snapshots` | derived | 1 dòng / học sinh / tuần | Trạng thái hồ sơ, ghi đè bằng trạng thái mới nhất trong tuần → tuần đã qua giữ trạng thái cuối tuần |
| `profile_snapshots.reason` | meta | `event` / `cron_daily` / `recompute` | Vì sao ghi: sau sự kiện, cron hằng ngày (23:17 giờ VN), hay tính lại thủ công |
| `profile_snapshots.data_cutoff_at`, `n_responses`, `n_activity_logs` | meta | | Mốc cắt dữ liệu và lượng dữ liệu đằng sau snapshot |
| `weekly_reviews.activities_completed` | derived | số | Đếm lại theo tuần [Thứ Hai, Thứ Hai tuần sau) mỗi lần xem |
| `weekly_reviews.top_domains` | derived | mã nhóm | Từ 10/2026: các nhóm **có nhãn Nổi bật** lúc viết tổng kết (có thể rỗng) |

## Bảng phục vụ đánh giá

| Bảng.cột | Vai trò | Miền giá trị | Ý nghĩa |
|---|---|---|---|
| `recommendation_events.event` | meta | `shown` (gợi ý hoạt động chính) · `shown_extra` (gợi ý khám phá thêm) · `opened` (em mở trang hoạt động khi form phản hồi còn trống) · `swapped` · `saved` · `completed` | Nhật ký gợi ý, gồm cả gợi ý không được làm. "Bỏ qua" = `shown` mà không `completed` cùng ngày; **"bỏ dở"** = `opened` mà không `completed` cùng ngày (suy ra khi phân tích). Duy nhất theo (học sinh, ngày, hoạt động, sự kiện) |
| `recommendation_events.algo_version` | meta | ví dụ `dp-v3-2026-10` | Phiên bản thuật toán gợi ý |
| `recommendation_events.propensity` / `n_candidates` | meta | (0, 1] / số nguyên, hoặc `null` | Chỉ với `shown`: xác suất hoạt động được chọn theo cơ chế bốc thăm (hash mã học sinh + ngày) và số hoạt động có thể được chọn hôm đó. `null` = sự kiện khác / dữ liệu trước `dp-v3` |
| `outcome_labels.rater` | label | `student` / `teacher` | Ai đánh giá |
| `outcome_labels.label_phase` | meta | `pre_result` / `post_result` | `pre_result` = em tự chọn ở cuối bài khảo sát trống (T1/T2), **trước khi xem kết quả**. `post_result` = sau khi xem (dễ bị neo vào kết quả). Phân tích riêng hai loại |
| `outcome_labels.agreement` | label | 1 chưa đúng · 2 một phần · 3 đúng · `null` | Kết quả top 3 có đúng/phù hợp không. `null` đúng khi và chỉ khi `pre_result` (ràng buộc DB) |
| `outcome_labels.preferred_domains` | label | mảng mã nhóm, theo thứ tự ưu tiên | Nhóm người đánh giá thấy phù hợp nhất (`pre_result`: tối đa 3; còn lại tối đa 1). Cột cũ `preferred_domain` = phần tử đầu, giữ để tương thích ngược |
| `outcome_labels.top_domains`, `scoring_version` | meta | | Top 3 và công thức **tại thời điểm** đánh giá |
| `content_audit_log` | meta | `before` / `after` jsonb | Ai sửa nội dung gì, khi nào, bản trước khi sửa |

## Bảng tài khoản giáo viên

| Bảng.cột | Vai trò | Kiểu / miền | Ý nghĩa |
|---|---|---|---|
| `teacher_accounts.email` | input | chữ thường, duy nhất | So khớp chính xác khi đăng nhập |
| `teacher_credentials.password_hash` | meta (bí mật) | `scrypt$N$r$p$salt$hash` hoặc `null` | `null` = chưa cấp mật khẩu, không đăng nhập được. RLS bật, không policy: chỉ server đọc |
| `teacher_credentials.must_change_password` | meta | boolean | `true` = đang dùng mật khẩu tạm, chỉ vào được trang đổi mật khẩu |
| `teacher_credentials.failed_login_count`, `locked_until` | meta | số / thời điểm | Sai 5 lần liên tiếp → khóa 15 phút |
| `teacher_credentials.session_version` | meta | số tăng dần | Đổi/đặt lại mật khẩu → tăng → mọi phiên đăng nhập cũ hết hiệu lực |

## Kiểm tra chất lượng

- Tại lúc nhập (ingest): server kiểm tra đáp án thuộc đúng câu hỏi, số sao 1–5, thang 1–3, độ dài văn bản, ngày hợp lệ, hoạt động tồn tại, giới hạn số hoạt động/ngày, link http(s).
- Trước mỗi lần phân tích: `npm run check:data` — báo thiếu, trùng (kể cả 2 đáp án cho 1 câu trong cùng lần làm), ngoài miền, tham chiếu hỏng, dữ liệu chưa có đồng ý, hồ sơ chưa tính lại, snapshot thiếu, bài khảo sát trống có dấu hiệu trả lời vội (dưới 5 giây/câu, hoặc từ 8 câu liền chọn cùng vị trí — ngưỡng trong `src/lib/survey.ts`, hiệu chỉnh bằng phân vị thời gian thật ở `analyze:survey`).
- Kiểm thử tự động (CI): `npm run check:logic` — gồm các kiểm thử tính chất (bất biến, mô phỏng người chọn ngẫu nhiên, độ nhạy, tái lập).
