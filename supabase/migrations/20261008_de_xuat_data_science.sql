-- ============================================================================
-- MIGRATION 2026-10-08: de xuat tang Data Science truoc pilot (A1-A4, B1)
-- ----------------------------------------------------------------------------
-- Chay 1 LAN trong Supabase SQL Editor NGAY TRUOC khi deploy code moi, ngoai gio
-- hoc: tu luc chay toi luc deploy xong (vai phut), code cu khong nop duoc khao sat
-- (no can rang buoc unique (student_id, question_id) da bo o buoc 2).
-- An toan chay lai nhieu lan. Sau khi deploy: npm run recompute:profiles (cong thuc v4).
-- Doi chieu: docs/data-dictionary.md
-- ============================================================================

-- 1) Lan lam khao sat (B1): moi lan nop la 1 lan lam, KHONG ghi de lan truoc -----
create table if not exists survey_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  measurement_wave text check (measurement_wave ~ '^T[0-9]+$'),
  survey_version text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_survey_attempts_student on survey_attempts(student_id, completed_at);
alter table survey_attempts enable row level security;
drop policy if exists "survey_attempts_self" on survey_attempts;
create policy "survey_attempts_self" on survey_attempts for select using (student_id = current_student_id());
drop policy if exists "survey_attempts_teacher_read" on survey_attempts;
create policy "survey_attempts_teacher_read" on survey_attempts for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

-- 2) Cau tra loi thuoc 1 lan lam + vi tri dap an em da thay (A4) ------------------
alter table survey_responses add column if not exists attempt_id uuid references survey_attempts(id) on delete cascade;
alter table survey_responses add column if not exists display_position smallint check (display_position between 0 and 9);

-- Du lieu cu: moi em 1 bo dap an (unique cu) => gom thanh 1 lan lam "T1". Mot cau lenh (CTE) nen
-- chay lai khong tao trung: lan sau khong con cau tra loi nao thieu attempt_id.
with legacy as (
  select student_id, max(survey_version) as survey_version, min(answered_at) as first_at, max(answered_at) as last_at
  from survey_responses
  where attempt_id is null
  group by student_id
), created as (
  insert into survey_attempts (student_id, measurement_wave, survey_version, completed_at, created_at)
  select student_id, 'T1', survey_version, last_at, first_at from legacy
  returning id, student_id
)
update survey_responses r set attempt_id = c.id
from created c
where r.student_id = c.student_id and r.attempt_id is null;

alter table survey_responses alter column attempt_id set not null;
alter table survey_responses drop constraint if exists survey_responses_student_id_question_id_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'survey_responses_attempt_id_question_id_key') then
    alter table survey_responses add constraint survey_responses_attempt_id_question_id_key unique (attempt_id, question_id);
  end if;
end $$;
-- unique cu (student_id, question_id) tung la chi muc cho truy van theo hoc sinh
create index if not exists idx_survey_responses_student on survey_responses(student_id);

-- 3) Dot khao sat lai giao vien mo cho lop (B1) -------------------------------------
alter table class_groups add column if not exists retest_wave text check (retest_wave ~ '^T[0-9]+$');

-- 4) Nhan danh gia truoc / sau khi xem ket qua, chon toi da 3 nhom (A2) -------------
alter table outcome_labels add column if not exists label_phase text not null default 'post_result'
  check (label_phase in ('pre_result', 'post_result'));
alter table outcome_labels add column if not exists preferred_domains text[] not null default '{}';
update outcome_labels set preferred_domains = array[preferred_domain]
where preferred_domain is not null and preferred_domains = '{}';
alter table outcome_labels alter column agreement drop not null; -- pre_result: em chua xem ket qua
alter table outcome_labels drop constraint if exists outcome_labels_phase_agreement;
alter table outcome_labels add constraint outcome_labels_phase_agreement
  check ((label_phase = 'pre_result') = (agreement is null));
-- preferred_domain giu lai (= lua chon dau tien) de tuong thich nguoc; code moi doc preferred_domains.

-- 5) Xac suat duoc chon cua goi y hang ngay (A3) -------------------------------------
alter table recommendation_events add column if not exists propensity real check (propensity > 0 and propensity <= 1);
alter table recommendation_events add column if not exists n_candidates integer check (n_candidates > 0);

insert into schema_migrations (version) values ('20261008_de_xuat_data_science')
on conflict (version) do nothing;

-- QUAY LAI CODE CU (neu buoc phai): code cu can unique (student_id, question_id) nen chi
-- khoi phuc duoc khi moi em con DUNG 1 lan lam - xoa cac lan lam cu hon (mat du lieu T1/T2),
-- roi: alter table survey_responses add constraint survey_responses_student_id_question_id_key
-- unique (student_id, question_id); Cac cot/bang moi khac de nguyen khong anh huong code cu.
