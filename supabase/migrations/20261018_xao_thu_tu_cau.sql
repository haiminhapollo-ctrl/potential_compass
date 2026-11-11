-- ============================================================================
-- MIGRATION 2026-10-18: thu tu CAU HOI xao theo tung hoc sinh (de xuat A4)
-- ----------------------------------------------------------------------------
-- PHAI chay TRUOC khi deploy code moi: code moi ghi cot question_position luc nop khao sat - thieu cot thi
-- hoc sinh KHONG nop duoc bai. Chi them cot cho phep null => an toan chay lai nhieu lan, code cu bo qua cot.
-- Khong doi cong thuc cham diem => KHONG can recompute:profiles.
-- Doi chieu: docs/data-dictionary.md
-- ============================================================================

-- vi tri (0 = cau dau tien) cua cau hoi tren trang cua em; null = du lieu cu (thu tu co dinh theo "order")
alter table survey_responses add column if not exists question_position smallint check (question_position >= 0);

insert into schema_migrations (version) values ('20261018_xao_thu_tu_cau')
on conflict (version) do nothing;

-- QUAY LAI CODE CU: khong can lam gi. Muon xoa han: alter table survey_responses drop column if exists question_position;
