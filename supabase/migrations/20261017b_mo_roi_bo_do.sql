-- ============================================================================
-- MIGRATION 2026-10-17b: phat hien "mo roi bo do" (de xuat A4, A5)
-- ----------------------------------------------------------------------------
-- Chay SAU 20261017_thoi_gian_lam_bai.sql va TRUOC khi deploy code moi (code moi ghi bang/su kien moi;
-- code cu khong dung toi). Chi them bang + noi rong rang buoc => an toan chay lai nhieu lan.
-- Khong doi cong thuc cham diem => KHONG can recompute:profiles.
-- Doi chieu: docs/data-dictionary.md
-- ============================================================================

-- 1) Moi lan em MO bai khao sat FORM TRONG (T1, T2...). Doi chieu voi survey_attempts cung (em, dot):
--    co mo ma chua co lan nop = dang bo do. RLS bat, KHONG policy => chi server (service role) doc/ghi.
create table if not exists survey_opens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  measurement_wave text not null check (measurement_wave ~ '^T[0-9]+$'),
  opened_at timestamptz not null default now()
);
create index if not exists idx_survey_opens_student on survey_opens(student_id, opened_at);
alter table survey_opens enable row level security;

-- 2) Su kien 'opened' = em mo trang hoat dong (form phan hoi dang trong). opened ma khong completed cung ngay = bo do.
alter table recommendation_events drop constraint if exists recommendation_events_event_check;
alter table recommendation_events add constraint recommendation_events_event_check
  check (event in ('shown', 'shown_extra', 'opened', 'swapped', 'saved', 'completed'));

insert into schema_migrations (version) values ('20261017b_mo_roi_bo_do')
on conflict (version) do nothing;

-- QUAY LAI CODE CU: khong can lam gi (code cu khong ghi 'opened', khong doc survey_opens). Muon xoa han:
-- drop table if exists survey_opens;
-- delete from recommendation_events where event = 'opened';  -- roi them lai rang buoc 5 gia tri cu
