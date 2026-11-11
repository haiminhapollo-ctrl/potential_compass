-- ============================================================================
-- MIGRATION 2026-10-06: "Bao cao ra soat Data Science" (21 muc)
-- ----------------------------------------------------------------------------
-- Chay 1 LAN trong Supabase SQL Editor, TRUOC khi deploy code moi.
-- An toan chay lai nhieu lan (if not exists / on conflict do nothing).
-- Doi chieu: docs/data-dictionary.md
-- ============================================================================

-- 0) Phien ban schema (loi 14) -----------------------------------------------
create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
alter table schema_migrations enable row level security; -- chi service role doc/ghi

-- 1) Phien ban noi dung & cong thuc (loi 3, 10) ------------------------------
alter table survey_responses add column if not exists survey_version text;

alter table potential_profiles add column if not exists components jsonb not null default '[]';
alter table potential_profiles add column if not exists scoring_version text;
alter table potential_profiles add column if not exists content_hash text;
alter table potential_profiles add column if not exists insight_source text check (insight_source in ('gemini', 'template'));
alter table potential_profiles add column if not exists insight_model text;
alter table potential_profiles add column if not exists insight_prompt_version text;
alter table potential_profiles add column if not exists insight_generated_at timestamptz;

alter table profile_snapshots add column if not exists components jsonb not null default '[]';
alter table profile_snapshots add column if not exists scoring_version text;
alter table profile_snapshots add column if not exists content_hash text;
alter table profile_snapshots add column if not exists reason text check (reason in ('event', 'cron_daily', 'recompute'));
alter table profile_snapshots add column if not exists data_cutoff_at timestamptz;
alter table profile_snapshots add column if not exists n_responses integer;
alter table profile_snapshots add column if not exists n_activity_logs integer;

alter table weekly_reviews add column if not exists model text;
alter table weekly_reviews add column if not exists prompt_version text;

-- 2) Hoat dong gan 2 nhom (loi 18) --------------------------------------------
alter table activities add column if not exists secondary_domain text references domains(code);

-- 3) Su kien goi y (loi 4) -----------------------------------------------------
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  activity_id text not null references activities(id) on delete cascade,
  event text not null check (event in ('shown', 'shown_extra', 'swapped', 'saved', 'completed')),
  algo_version text not null,
  created_at timestamptz not null default now(),
  unique (student_id, date, activity_id, event)
);
create index if not exists idx_rec_events_student on recommendation_events(student_id, date);
alter table recommendation_events enable row level security;
drop policy if exists "rec_events_self" on recommendation_events;
create policy "rec_events_self" on recommendation_events for select using (student_id = current_student_id());
drop policy if exists "rec_events_teacher_read" on recommendation_events;
create policy "rec_events_teacher_read" on recommendation_events for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

-- 4) Nhan danh gia / ground truth (loi 12) -------------------------------------
create table if not exists outcome_labels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  rater text not null check (rater in ('student', 'teacher')),
  rater_id text not null,
  top_domains text[] not null default '{}',
  scoring_version text,
  agreement smallint not null check (agreement between 1 and 3),
  preferred_domain text references domains(code),
  created_at timestamptz not null default now()
);
create index if not exists idx_outcome_labels_student on outcome_labels(student_id);
alter table outcome_labels enable row level security;
drop policy if exists "outcome_labels_self" on outcome_labels;
create policy "outcome_labels_self" on outcome_labels for select using (student_id = current_student_id());
drop policy if exists "outcome_labels_teacher_read" on outcome_labels;
create policy "outcome_labels_teacher_read" on outcome_labels for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

-- 5) Nhat ky thay doi noi dung (loi 10) ----------------------------------------
create table if not exists content_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('survey_question', 'activity', 'resource')),
  entity_id text not null,
  action text not null check (action in ('create', 'update', 'delete')),
  actor_id text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_content_audit_created on content_audit_log(created_at desc);
alter table content_audit_log enable row level security;
drop policy if exists "content_audit_teacher_read" on content_audit_log;
create policy "content_audit_teacher_read" on content_audit_log for select using (is_teacher_or_admin());

-- 6) Mo rong kho hoat dong 32 -> 48 + nhom phu (loi 18) -------------------------
insert into activities (id, domain, secondary_domain, title, description, duration_minutes, instructions, reflection_prompt, media_url, example, active) values
  ('act_kh_05', 'KHOA_HOC_KHAM_PHA', null, 'Vật nào nổi, vật nào chìm?', 'Thả vài đồ vật nhỏ vào chậu nước, đoán trước rồi thử xem vật nào nổi.', 4, array['Lấy 1 chậu/bát nước và 5 đồ vật nhỏ (lá, hòn sỏi, nắp chai, đũa, quả).', 'Đoán trước vật nào nổi, vật nào chìm, rồi thả từng vật.', 'So sánh với dự đoán của em và thử giải thích vì sao.']::text[], 'Có vật nào làm em bất ngờ không? Em giải thích thế nào?', null, 'Ví dụ: Em đoán quả chanh sẽ chìm nhưng nó lại nổi; hòn sỏi nhỏ thì chìm ngay. Có thể quả chanh có nhiều không khí bên trong.', true),
  ('act_kh_06', 'KHOA_HOC_KHAM_PHA', 'NONG_LAM_NGU_MOI_TRUONG', 'Quan sát một đàn kiến', 'Quan sát đàn kiến 3 phút xem chúng đi lại, mang đồ ăn và "nói chuyện" với nhau thế nào.', 4, array['Tìm một đường kiến đi quanh nhà hoặc sân.', 'Quan sát 3 phút: chúng đi theo hàng thế nào, mang gì, gặp nhau thì làm gì.', 'Ghi 1 điều em thấy lạ.']::text[], 'Em phát hiện điều gì thú vị về cách đàn kiến làm việc?', null, 'Ví dụ: Hai con kiến gặp nhau thì chạm râu vào nhau rồi mới đi tiếp. Một con kiến kéo được mẩu cơm to gấp mấy lần người nó.', true),
  ('act_kt_05', 'KY_THUAT_CONG_NGHE', null, 'Cái kéo hoạt động thế nào?', 'Quan sát một dụng cụ có điểm xoay (kéo, bấm móng tay, kìm) và tìm hiểu vì sao nó giúp ta đỡ tốn sức.', 4, array['Lấy 1 dụng cụ có điểm xoay: kéo, bấm móng tay hoặc kìm.', 'Tìm điểm xoay (chốt giữa) và chỗ tay cầm, chỗ cắt/kẹp.', 'Thử cầm xa và gần điểm xoay rồi cắt 1 tờ giấy, xem cách nào nhẹ tay hơn.']::text[], 'Cầm ở đâu thì đỡ tốn sức hơn? Em đoán vì sao?', null, 'Ví dụ: Cầm ở cuối cán kéo thì cắt bìa nhẹ hơn cầm sát chốt. Cán càng dài thì càng đỡ tốn sức, giống đòn bẩy.', true),
  ('act_kt_06', 'KY_THUAT_CONG_NGHE', 'KHOA_HOC_KHAM_PHA', 'Cải tiến máy bay giấy', 'Gấp một chiếc máy bay giấy, phóng thử, rồi sửa một chỗ để nó bay xa hơn.', 5, array['Gấp 1 máy bay giấy từ giấy nháp.', 'Phóng 3 lần, nhớ xem bay xa khoảng bao nhiêu bước chân.', 'Sửa 1 chỗ (gập mép cánh, thêm kẹp giấy ở mũi) rồi phóng lại để so sánh.']::text[], 'Em đã sửa chỗ nào và máy bay bay xa hơn hay gần hơn?', null, 'Ví dụ: Lần đầu bay khoảng 5 bước. Em gập nhẹ hai mép sau của cánh lên thì bay thẳng hơn, được 8 bước.', true),
  ('act_nl_05', 'NONG_LAM_NGU_MOI_TRUONG', null, 'Gieo thử một hạt giống', 'Gieo 1–2 hạt (đậu, ngô, bí) vào cốc đất hoặc bông ẩm và theo dõi nó nảy mầm.', 4, array['Lấy 1 cốc/vỏ chai cắt đôi, cho đất hoặc bông ẩm vào.', 'Gieo 1–2 hạt, tưới ít nước, đặt chỗ có ánh sáng.', 'Dán giấy ghi ngày gieo để những hôm sau xem lại.']::text[], 'Em gieo hạt gì? Em đoán mấy ngày nữa hạt sẽ nảy mầm?', null, 'Ví dụ: Em gieo 2 hạt đậu xanh vào bông ẩm trong nắp chai, để ở cửa sổ. Em đoán 2–3 ngày là thấy mầm trắng nhú ra.', true),
  ('act_nl_06', 'NONG_LAM_NGU_MOI_TRUONG', 'KHOA_HOC_KHAM_PHA', 'Đoán thời tiết ngày mai', 'Nhìn mây, gió và các dấu hiệu quanh nhà để đoán mai nắng hay mưa, rồi kiểm tra lại.', 3, array['Ra ngoài nhìn bầu trời: mây nhiều hay ít, màu gì, gió mạnh hay nhẹ.', 'Để ý thêm dấu hiệu khác (kiến tha mồi, chuồn chuồn bay thấp...).', 'Ghi lại dự đoán của em để mai xem có đúng không.']::text[], 'Em dựa vào dấu hiệu nào để đoán? Người lớn trong nhà có kinh nghiệm gì không?', null, 'Ví dụ: Chiều nay mây đen kéo về từ phía núi, chuồn chuồn bay thấp, bà bảo "chuồn chuồn bay thấp thì mưa". Em đoán mai có mưa.', true),
  ('act_kd_05', 'KINH_DOANH_DICH_VU', null, 'So sánh giá ở hai nơi bán', 'Tìm giá của cùng một món đồ ở hai cửa hàng và tính xem mua ở đâu lợi hơn.', 4, array['Chọn 1 món quen thuộc: gói mì, quyển vở, bánh xà phòng.', 'Nhớ lại hoặc hỏi người lớn giá ở 2 cửa hàng khác nhau.', 'Tính chênh lệch nếu mua 10 cái.']::text[], 'Mua ở đâu lợi hơn? Ngoài giá, còn điều gì khiến em chọn một cửa hàng?', null, 'Ví dụ: Quyển vở ở tạp hóa gần nhà giá 8.000đ, ở chợ phiên 6.500đ. Mua 10 quyển ở chợ tiết kiệm 15.000đ, nhưng phải đi xa hơn.', true),
  ('act_kd_06', 'KINH_DOANH_DICH_VU', 'NGHE_THUAT_SANG_TAO', 'Viết lời mời chào một đặc sản', 'Viết 2–3 câu giới thiệu một đặc sản quê em để mời khách du lịch mua.', 4, array['Chọn 1 đặc sản quê em (chè, mật ong, thổ cẩm, rau rừng...).', 'Viết 2–3 câu: món này có gì ngon/đẹp, khác nơi khác ở điểm nào.', 'Đọc to cho một người nghe xem họ có muốn mua không.']::text[], 'Em chọn đặc sản nào? Người nghe thấy lời giới thiệu thế nào?', null, 'Ví dụ: "Chè shan tuyết nhà em hái trên núi cao, búp phủ lớp lông trắng như tuyết. Nước chè vàng sánh, uống ngọt hậu. Cô chú mua về làm quà nhé!"', true),
  ('act_sk_04', 'SUC_KHOE_CONG_DONG', null, 'Rửa tay đúng 6 bước', 'Rửa tay đủ 6 bước trong khoảng 30 giây và dạy lại cho một em nhỏ.', 3, array['Làm ướt tay, xoa xà phòng.', 'Lần lượt chà: lòng bàn tay, mu bàn tay, kẽ ngón, mu ngón, ngón cái, đầu ngón tay (khoảng 30 giây).', 'Xả sạch và lau khô; thử dạy lại cho một em nhỏ.']::text[], 'Có bước nào em hay bỏ quên trước đây không?', null, 'Ví dụ: Trước đây em chỉ xoa lòng bàn tay. Hôm nay em đếm đến 30 và chà cả kẽ ngón, đầu ngón tay. Em dạy em gái hát một bài để đủ thời gian.', true),
  ('act_sk_05', 'SUC_KHOE_CONG_DONG', null, 'Cùng người lớn xem tủ thuốc gia đình', 'Cùng người lớn xem tủ thuốc trong nhà có những gì và thuốc nào đã hết hạn.', 4, array['Nhờ bố mẹ hoặc ông bà cùng xem hộp/tủ thuốc trong nhà.', 'Đọc nhãn: tên thuốc, hạn sử dụng, dùng để chữa gì.', 'Để riêng thuốc hết hạn để người lớn xử lý. Tuyệt đối không tự uống thuốc.']::text[], 'Nhà em có những loại thuốc nào? Em học được điều gì khi đọc nhãn thuốc?', null, 'Ví dụ: Nhà em có thuốc hạ sốt, dầu gió, băng dán. Một vỉ thuốc đã hết hạn từ năm ngoái, em đưa mẹ để bỏ đi.', true),
  ('act_nt_05', 'NGHE_THUAT_SANG_TAO', null, 'Truyện tranh 4 ô', 'Kể lại một chuyện vui trong ngày bằng 4 ô hình vẽ đơn giản.', 5, array['Chia 1 tờ giấy thành 4 ô.', 'Vẽ 4 cảnh: mở đầu, diễn biến, cao trào, kết thúc. Vẽ người que là được.', 'Viết 1 câu ngắn dưới mỗi ô.']::text[], 'Em kể chuyện gì? Ô nào em thích nhất?', null, 'Ví dụ: Ô 1: con gà nhà em xổng chuồng. Ô 2: cả nhà đuổi theo. Ô 3: gà chạy vào bếp. Ô 4: gà đậu lên nồi cơm, cả nhà cười.', true),
  ('act_nt_06', 'NGHE_THUAT_SANG_TAO', null, 'Săn âm thanh quanh nhà', 'Lắng nghe 2 phút, ghi lại các âm thanh quanh em rồi thử tạo lại một âm thanh bằng đồ vật.', 4, array['Ngồi yên, nhắm mắt nghe 2 phút.', 'Ghi lại 5 âm thanh em nghe được.', 'Chọn 1 âm thanh và thử tạo lại bằng đồ vật trong nhà.']::text[], 'Em nghe được những âm thanh gì? Em tạo lại âm thanh nào, bằng cách nào?', null, 'Ví dụ: Tiếng gà gáy, tiếng suối, tiếng gió thổi lá, tiếng xe máy, tiếng mẹ thái rau. Em gõ đũa lên thớt để giả tiếng thái rau.', true),
  ('act_xh_05', 'XA_HOI_GIAO_DUC_NHAN_VAN', null, 'Phỏng vấn một người về nghề của họ', 'Hỏi một người lớn trong nhà 3 câu về công việc họ đang làm.', 5, array['Chọn 1 người lớn (bố, mẹ, ông bà, anh chị) đang ở nhà.', 'Hỏi 3 câu: Công việc hằng ngày là gì? Điều gì vui nhất? Điều gì khó nhất?', 'Ghi lại 1 điều em chưa biết trước đó.']::text[], 'Em đã phỏng vấn ai? Em biết thêm điều gì về công việc của họ?', null, 'Ví dụ: Em hỏi mẹ về việc làm nương. Mẹ bảo vui nhất là lúc thu hoạch, khó nhất là khi trời hạn không có nước tưới.', true),
  ('act_xh_06', 'XA_HOI_GIAO_DUC_NHAN_VAN', null, 'Lắng nghe và nhắc lại', 'Nghe một người kể chuyện 2 phút rồi nhắc lại ý chính xem em đã nghe đúng chưa.', 4, array['Nhờ một người kể cho em nghe một chuyện ngắn trong ngày của họ.', 'Nghe chăm chú, không ngắt lời.', 'Nhắc lại ý chính bằng lời của em và hỏi họ: "Em hiểu đúng chưa ạ?"']::text[], 'Em nhắc lại có đúng không? Lắng nghe không ngắt lời có khó không?', null, 'Ví dụ: Bố kể chuyện sửa xe cho bác hàng xóm. Em nhắc lại: "Xe bác bị tuột xích, bố lắp lại và tra dầu." Bố bảo đúng, còn thiếu chuyện bác cho bố quả bưởi.', true),
  ('act_tc_05', 'THE_CHAT_THU_CONG', 'SUC_KHOE_CONG_DONG', 'Thử thách giữ thăng bằng', 'Đứng một chân lâu nhất có thể, đổi chân, rồi thử nhắm mắt.', 3, array['Đứng thẳng, co 1 chân lên, đếm xem giữ được bao lâu.', 'Đổi chân và đếm lại.', 'Thử lại khi nhắm mắt (đứng gần tường để an toàn).']::text[], 'Chân nào em đứng vững hơn? Nhắm mắt thì khác thế nào?', null, 'Ví dụ: Chân phải em đứng được 40 giây, chân trái 25 giây. Nhắm mắt thì chỉ được 8 giây là phải chạm chân xuống.', true),
  ('act_tc_06', 'THE_CHAT_THU_CONG', 'NGHE_THUAT_SANG_TAO', 'Bện một sợi dây từ 3 sợi', 'Dùng 3 sợi chỉ, dây hoặc lá để bện thành một sợi dây chắc hơn.', 5, array['Lấy 3 sợi chỉ/dây/lá dài bằng nhau, buộc chặt một đầu.', 'Bện lần lượt: sợi trái vào giữa, sợi phải vào giữa, lặp lại.', 'Buộc đầu còn lại và thử kéo xem sợi bện chắc hơn 1 sợi đơn không.']::text[], 'Em bện bằng gì? Sợi bện có chắc hơn sợi đơn không?', null, 'Ví dụ: Em bện 3 sợi len thành một sợi dây buộc tóc. Kéo thử thì sợi bện chắc hơn hẳn 1 sợi len.', true)
on conflict (id) do nothing;

update activities set secondary_domain = 'KHOA_HOC_KHAM_PHA' where id = 'act_kt_03' and secondary_domain is null;
update activities set secondary_domain = 'NGHE_THUAT_SANG_TAO' where id = 'act_kd_02' and secondary_domain is null;
update activities set secondary_domain = 'THE_CHAT_THU_CONG' where id = 'act_sk_03' and secondary_domain is null;
update activities set secondary_domain = 'KY_THUAT_CONG_NGHE' where id = 'act_nt_04' and secondary_domain is null;
update activities set secondary_domain = 'KHOA_HOC_KHAM_PHA' where id = 'act_xh_01' and secondary_domain is null;
update activities set secondary_domain = 'SUC_KHOE_CONG_DONG' where id = 'act_tc_01' and secondary_domain is null;
update activities set secondary_domain = 'NGHE_THUAT_SANG_TAO' where id = 'act_tc_02' and secondary_domain is null;
update activities set secondary_domain = 'SUC_KHOE_CONG_DONG' where id = 'act_tc_03' and secondary_domain is null;

insert into schema_migrations (version) values ('20261005_bao_cao_mentor'), ('20261006_data_science')
on conflict (version) do nothing;
