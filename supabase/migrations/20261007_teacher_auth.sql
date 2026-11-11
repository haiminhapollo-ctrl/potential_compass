-- ============================================================================
-- MIGRATION 2026-10-07: dang nhap giao vien bang TAI KHOAN RIENG
-- (thay ma truy cap dung chung TEACHER_DEMO_PASSCODE).
-- ----------------------------------------------------------------------------
-- Chay 1 LAN trong Supabase SQL Editor, TRUOC khi deploy code moi.
-- An toan chay lai nhieu lan.
-- ============================================================================

-- Mat khau (scrypt) o BANG RIENG: bat RLS va KHONG tao policy nao => chi
-- server (service role) doc/ghi duoc, khong lo qua anon key hay policy
-- "teachers_read_same_school" cua bang teacher_accounts.
create table if not exists teacher_credentials (
  teacher_id uuid primary key references teacher_accounts(id) on delete cascade,
  password_hash text,
  must_change_password boolean not null default true,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  session_version integer not null default 0,
  password_updated_at timestamptz
);
alter table teacher_credentials enable row level security;

-- Email so khop CHINH XAC (chu thuong) thay vi ilike: "%" trong o nhap tung la ky tu dai dien.
update teacher_accounts set email = lower(trim(email)) where email <> lower(trim(email));

insert into schema_migrations (version) values ('20261007_teacher_auth')
on conflict (version) do nothing;
