-- ============================================================================
-- MIGRATION 2026-10-07b: bo khao sat 16 -> 20 cau (them q17-q20, commit ca64307)
-- ----------------------------------------------------------------------------
-- CHI dung cho project Supabase da seed truoc 10/2026 (dang co q01-q16). Chi THEM cau moi,
-- KHONG dung toi cau / hoat dong / tai nguyen da co (seed:supabase se ghi de ban giao vien da sua).
-- Chay truoc khi deploy code moi. An toan chay lai (on conflict do nothing).
-- ============================================================================

insert into survey_questions (id, "order", scenario) values
  ('q17', 17, 'Bản em sắp được lắp hệ thống điện mặt trời. Em muốn làm gì nhất?'),
  ('q18', 18, 'Trạm y tế xã về bản khám sức khỏe miễn phí. Em muốn phụ việc nào?'),
  ('q19', 19, 'Lớp em làm một dự án nhỏ về nước sạch. Em nhận phần nào?'),
  ('q20', 20, 'Sau trận mưa lớn, đường lên nương bị sạt lở một đoạn. Em sẽ...')
on conflict (id) do nothing;

insert into survey_options (id, question_id, text, domain_weights) values
  ('q17a', 'q17', 'Phụ thợ lắp đặt, đấu dây và hỏi cách tấm pin hoạt động', '{"KY_THUAT_CONG_NGHE":2}'::jsonb),
  ('q17b', 'q17', 'Tìm hiểu vì sao ánh nắng lại biến thành điện được', '{"KHOA_HOC_KHAM_PHA":2}'::jsonb),
  ('q17c', 'q17', 'Nghĩ cách dùng điện để bơm nước tưới rau, sưởi ấm chuồng trại', '{"NONG_LAM_NGU_MOI_TRUONG":1,"KY_THUAT_CONG_NGHE":1}'::jsonb),
  ('q17d', 'q17', 'Nhắc mọi người dùng điện an toàn, tránh bị điện giật', '{"SUC_KHOE_CONG_DONG":2}'::jsonb),
  ('q18a', 'q18', 'Phụ y tá đo chiều cao, cân nặng và ghi sổ cho bà con', '{"SUC_KHOE_CONG_DONG":2}'::jsonb),
  ('q18b', 'q18', 'Dựng lều, kê bàn ghế, kiểm tra loa và đèn', '{"KY_THUAT_CONG_NGHE":1,"THE_CHAT_THU_CONG":1}'::jsonb),
  ('q18c', 'q18', 'Hỏi bác sĩ vì sao nhiều người trong bản hay bị cùng một bệnh', '{"KHOA_HOC_KHAM_PHA":1,"SUC_KHOE_CONG_DONG":1}'::jsonb),
  ('q18d', 'q18', 'Hướng dẫn người già, phiên dịch tiếng dân tộc cho bác sĩ', '{"XA_HOI_GIAO_DUC_NHAN_VAN":1,"SUC_KHOE_CONG_DONG":1}'::jsonb),
  ('q19a', 'q19', 'Làm bình lọc nước từ chai nhựa, cát, sỏi và than', '{"KY_THUAT_CONG_NGHE":2}'::jsonb),
  ('q19b', 'q19', 'Lấy nước ở vài con suối, so sánh độ trong và đoán vì sao khác nhau', '{"KHOA_HOC_KHAM_PHA":2}'::jsonb),
  ('q19c', 'q19', 'Trồng cây quanh nguồn nước để giữ nước sạch', '{"NONG_LAM_NGU_MOI_TRUONG":2}'::jsonb),
  ('q19d', 'q19', 'Nói chuyện với bà con về cách đun sôi, giữ nước sạch để tránh bệnh', '{"SUC_KHOE_CONG_DONG":1,"XA_HOI_GIAO_DUC_NHAN_VAN":1}'::jsonb),
  ('q20a', 'q20', 'Quan sát xem vì sao chỗ đó lại sạt, đất đá ở đó thế nào', '{"KHOA_HOC_KHAM_PHA":1,"NONG_LAM_NGU_MOI_TRUONG":1}'::jsonb),
  ('q20b', 'q20', 'Cùng người lớn dọn đá, kê lại đường cho chắc chắn', '{"KY_THUAT_CONG_NGHE":1,"THE_CHAT_THU_CONG":1}'::jsonb),
  ('q20c', 'q20', 'Đề xuất trồng cây giữ đất ở sườn đồi', '{"NONG_LAM_NGU_MOI_TRUONG":2}'::jsonb),
  ('q20d', 'q20', 'Hỏi thăm, giúp nhà bị ảnh hưởng, ai bị thương thì sơ cứu', '{"SUC_KHOE_CONG_DONG":1,"XA_HOI_GIAO_DUC_NHAN_VAN":1}'::jsonb)
on conflict (id) do nothing;

-- Kiem tra: phai ra 20 cau, 80 dap an
select (select count(*) from survey_questions) as so_cau, (select count(*) from survey_options) as so_dap_an;
