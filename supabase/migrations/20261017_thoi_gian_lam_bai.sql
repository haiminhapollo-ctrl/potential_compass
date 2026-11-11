-- ============================================================================
-- MIGRATION 2026-10-17: thoi gian tra loi tung cau (de xuat A4) + thoi gian lam hoat dong that (A5 buoc 1)
-- ----------------------------------------------------------------------------
-- Chay SAU 20261008_de_xuat_data_science.sql va TRUOC khi deploy code moi (code moi ghi cac cot nay;
-- code cu bo qua chung). Chi THEM cot cho phep null => khong khoa bang lau, an toan chay lai nhieu lan.
-- Khong doi cong thuc cham diem => KHONG can recompute:profiles vi migration nay.
-- Doi chieu: docs/data-dictionary.md
-- ============================================================================

-- ms tu luc mo trang khao sat toi luc em chon cau nay LAN DAU (chi bai form trong; client ghi)
alter table survey_responses add column if not exists first_answered_ms integer check (first_answered_ms >= 0);

-- lan dau em mo trang hoat dong trong ngay (tren may do) -> luc bam hoan thanh
alter table activity_logs add column if not exists started_at timestamptz;
alter table activity_logs add column if not exists finished_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'activity_logs_timing') then
    alter table activity_logs add constraint activity_logs_timing
      check ((started_at is null) = (finished_at is null) and finished_at >= started_at);
  end if;
end $$;

insert into schema_migrations (version) values ('20261017_thoi_gian_lam_bai')
on conflict (version) do nothing;

-- QUAY LAI CODE CU: khong can lam gi (code cu khong doc cac cot nay). Muon xoa han (mat du lieu thoi gian):
-- alter table activity_logs drop constraint if exists activity_logs_timing;
-- alter table activity_logs drop column if exists started_at, drop column if exists finished_at;
-- alter table survey_responses drop column if exists first_answered_ms;
