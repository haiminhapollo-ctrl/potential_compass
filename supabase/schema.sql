-- ============================================================================
-- POTENTIAL COMPASS - Supabase / Postgres schema
-- ----------------------------------------------------------------------------
-- Cach dung:
--   1) Tao project moi tren https://supabase.com
--   2) Vao SQL Editor > dan toan bo file nay > Run
--   3) Chay tiep supabase/policies.sql de bat Row Level Security
--   4) (Tuy chon) Chay supabase/seed.sql de nap du lieu mau (8 nhom, cau hoi,
--      hoat dong, tai nguyen) - sinh tu src/lib/content bang `npm run seed:local`
--      hoac tu viet script day len Supabase bang service role key.
-- Doi chieu voi src/lib/types.ts - neu doi field o mot noi, nho doi ca hai.
-- ============================================================================

create extension if not exists "pgcrypto"; -- cho gen_random_uuid()

-- ---------------------------------------------------------------------------
-- TRUONG HOC & LOP
-- ---------------------------------------------------------------------------
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  created_at timestamptz not null default now()
);

create table if not exists teacher_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('teacher', 'admin')),
  -- lien ket toi auth.users cua Supabase Auth (bat buoc khi len Production)
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists class_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  teacher_id uuid references teacher_accounts(id) on delete set null,
  retest_wave text check (retest_wave ~ '^T[0-9]+$'), -- dot khao sat lai dang mo cho lop (T2...), null = khong mo
  riasec_enabled boolean not null default false, -- lop trong MAU CON lam bai doi chieu RIASEC (O*NET Mini-IP)
  -- hoc ky lop dang hoc (src/lib/curriculum.ts): quyet dinh goi cau hoi + hoat dong theo chuong trinh
  curriculum_term text not null default 'G9_HK1' check (curriculum_term in ('G8_HK1', 'G8_HK2', 'G9_HK1', 'G9_HK2')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- HOC SINH
-- Luu y bao mat tre em: KHONG luu email/SDT ca nhan cua hoc sinh. Dang nhap
-- bang ma hoc sinh (student_code) do giao vien cap, khong dung thong tin dinh
-- danh ca nhan nhay cam. Khong thu thap gioi tinh/dan toc.
-- ---------------------------------------------------------------------------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_groups(id) on delete cascade,
  student_code text not null unique,
  display_name text not null,
  parent_consent_confirmed boolean not null default false,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_class on students(class_id);

-- ---------------------------------------------------------------------------
-- 8 NHOM LINH VUC (danh muc tinh, seed tu src/lib/domains.ts)
-- ---------------------------------------------------------------------------
create table if not exists domains (
  code text primary key,
  name text not null,
  short_description text not null,
  why_relevant text not null,
  sample_careers text[] not null default '{}',
  icon text not null,
  color_hex text not null
);

-- ---------------------------------------------------------------------------
-- KHAO SAT BAN DAU
-- ---------------------------------------------------------------------------
create table if not exists survey_questions (
  id text primary key,
  "order" integer not null,
  scenario text not null,
  -- 'ALL' = cau neo (moi hoc ky); con lai chi hien cho lop dang o hoc ky do
  curriculum_term text not null default 'ALL' check (curriculum_term in ('ALL', 'G8_HK1', 'G8_HK2', 'G9_HK1', 'G9_HK2')),
  -- false = cau DA THAY (doi nghia): khong hien, khong cham, nhung giu de cau tra loi cu khong bi xoa day chuyen
  active boolean not null default true
);

create table if not exists survey_options (
  id text primary key,
  question_id text not null references survey_questions(id) on delete cascade,
  text text not null,
  -- vd: {"KY_THUAT_CONG_NGHE": 2, "KHOA_HOC_KHAM_PHA": 1}
  domain_weights jsonb not null default '{}',
  -- thien huong luong: {"vocational": 1} bat tay lam / {"academic": 1} tim hieu ly thuyet / {} trung tinh
  track_weights jsonb not null default '{}'
);

-- Moi lan nop khao sat = 1 lan lam (khong ghi de lan truoc) => ghep T1/T2 de do test-retest.
create table if not exists survey_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  -- T1 = lan dau, T2... = dot khao sat lai giao vien mo (ca hai la form trong);
  -- null = lam lai tu nguyen / bo sung cau moi (dap an cu chon san)
  measurement_wave text check (measurement_wave ~ '^T[0-9]+$'),
  survey_version text,
  -- hoc ky lop luc em lam (null = du lieu truoc 11/2026)
  curriculum_term text check (curriculum_term in ('G8_HK1', 'G8_HK2', 'G9_HK1', 'G9_HK2')),
  started_at timestamptz, -- luc trang khao sat duoc mo (server ghi vao form)
  completed_at timestamptz, -- null = ghi dut giua chung => khong duoc tinh
  created_at timestamptz not null default now()
);
create index if not exists idx_survey_attempts_student on survey_attempts(student_id, completed_at);

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references survey_attempts(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  question_id text not null references survey_questions(id) on delete cascade,
  option_id text not null references survey_options(id) on delete cascade,
  survey_version text, -- contentHash bo cau hoi luc tra loi (scoring.ts computeContentHash)
  display_position smallint check (display_position between 0 and 9), -- vi tri dap an tren man hinh cua em (xao theo hoc sinh)
  question_position smallint check (question_position >= 0), -- vi tri CAU tren trang cua em (thu tu cau xao theo hoc sinh)
  first_answered_ms integer check (first_answered_ms >= 0), -- ms tu luc mo trang toi luc chon cau nay lan dau (bai form trong)
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index if not exists idx_survey_responses_student on survey_responses(student_id);

-- Moi lan em MO bai form trong (T1, T2...): co mo ma chua co lan nop cung dot = dang bo do (de xuat A4).
-- RLS bat, khong policy => chi server (service role) - xem policies.sql.
create table if not exists survey_opens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  measurement_wave text not null check (measurement_wave ~ '^T[0-9]+$'),
  opened_at timestamptz not null default now()
);
create index if not exists idx_survey_opens_student on survey_opens(student_id, opened_at);

-- Bai doi chieu RIASEC (O*NET Mini-IP, de xuat B1) - mau con lop giao vien bat; hoc sinh khong nhan ket qua.
create table if not exists riasec_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  items_version text not null,
  answers jsonb not null, -- {id cau: 1-5}
  started_at timestamptz,
  completed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- HO SO TIEM NANG (ket qua tinh toan - co the tinh lai tu survey_responses +
-- activity_logs bat cu luc nao, bang duoc dung nhu 1 lop cache de doc nhanh)
-- ---------------------------------------------------------------------------
create table if not exists potential_profiles (
  student_id uuid primary key references students(id) on delete cascade,
  scores jsonb not null default '[]', -- DomainScore[]
  top_domains text[] not null default '{}',
  survey_completed boolean not null default false,
  activities_completed_count integer not null default 0,
  last_insight text,
  insight_source text check (insight_source in ('gemini', 'template')),
  insight_model text,
  insight_prompt_version text,
  insight_generated_at timestamptz,
  components jsonb not null default '[]', -- DomainScoreComponents[]: diem tho de tai lap
  -- thien huong luong sau lop 9 (scoring.ts recommendTrack) - CHI giao vien xem; null = ho so truoc v5
  recommended_track text check (recommended_track in ('VOCATIONAL_9PLUS', 'ACADEMIC_HIGH_SCHOOL', 'DUAL_EXPLORATION')),
  vocational_affinity_score numeric(5,2), -- 0-100 phan vi so voi chon ngau nhien
  academic_affinity_score numeric(5,2),
  track_lean numeric(5,2), -- 0-100 phan vi cua (thuc hanh - hoc thuat); <= 10 / >= 90 moi gan nhan
  track_reason text check (track_reason in ('khoa_cung', 'chenh_lech', 'chua_du_can_cu', 'chua_toi_hoc_ky_chot')),
  scoring_version text,
  content_hash text,
  updated_at timestamptz not null default now()
);

create table if not exists profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  week_start_date date not null,
  scores jsonb not null default '[]',
  top_domains text[] not null default '{}',
  components jsonb not null default '[]',
  -- thien huong luong sau lop 9 (scoring.ts recommendTrack) - CHI giao vien xem; null = ho so truoc v5
  recommended_track text check (recommended_track in ('VOCATIONAL_9PLUS', 'ACADEMIC_HIGH_SCHOOL', 'DUAL_EXPLORATION')),
  vocational_affinity_score numeric(5,2), -- 0-100 phan vi so voi chon ngau nhien
  academic_affinity_score numeric(5,2),
  track_lean numeric(5,2), -- 0-100 phan vi cua (thuc hanh - hoc thuat); <= 10 / >= 90 moi gan nhan
  track_reason text check (track_reason in ('khoa_cung', 'chenh_lech', 'chua_du_can_cu', 'chua_toi_hoc_ky_chot')),
  scoring_version text,
  content_hash text,
  reason text check (reason in ('event', 'cron_daily', 'recompute')),
  data_cutoff_at timestamptz,
  n_responses integer,
  n_activity_logs integer,
  created_at timestamptz not null default now(),
  unique (student_id, week_start_date)
);

-- ---------------------------------------------------------------------------
-- HOAT DONG TRAI NGHIEM
-- ---------------------------------------------------------------------------
create table if not exists activities (
  id text primary key,
  domain text not null references domains(code),
  secondary_domain text references domains(code), -- nhom phu (trong so 0.5 khi cham diem)
  title text not null,
  description text not null,
  duration_minutes integer not null,
  instructions text[] not null default '{}',
  reflection_prompt text not null,
  media_url text, -- anh/YouTube minh hoa cach lam (giao vien dan link)
  example text not null default '', -- vi du tham khao do giao vien soan
  active boolean not null default true,
  -- 'ALL' = moi hoc ky; con lai chi goi y cho lop dang o hoc ky do
  curriculum_term text not null default 'ALL' check (curriculum_term in ('ALL', 'G8_HK1', 'G8_HK2', 'G9_HK1', 'G9_HK2')),
  quiz jsonb not null default '[]' -- cau hoi nhan biet nghe sau hoat dong (src/lib/quiz.ts) - [] = khong co
);

-- Bai lam quiz on nhanh: toi da 1 lan / (em, hoat dong, ngay); KHONG tinh vao ho so so thich.
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_id text not null references activities(id) on delete cascade,
  date date not null,
  quiz_version text not null,
  answers jsonb not null default '[]', -- [{questionId, chosen, correct}]
  n_correct smallint not null,
  n_questions smallint not null check (n_questions > 0 and n_correct between 0 and n_questions),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, activity_id, date)
);
create index if not exists idx_quiz_attempts_student on quiz_attempts(student_id, date);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_id text not null references activities(id),
  date date not null,
  interest_rating smallint not null check (interest_rating between 1 and 5),
  reflection_text text not null default '',
  confidence smallint check (confidence between 1 and 3), -- "em thay minh lam duoc khong?"
  difficulty smallint check (difficulty between 1 and 3), -- de / vua / kho
  note text not null default '', -- phan hoc sinh tu viet them (khong bat buoc)
  is_extra boolean not null default false, -- hoat dong kham pha them tu nguyen
  source text not null default 'online' check (source in ('online', 'offline_sync')),
  -- thoi gian lam THAT: lan dau mo trang hoat dong trong ngay -> bam hoan thanh (lib/activity-timing.ts)
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  synced_at timestamptz,
  constraint activity_logs_timing check ((started_at is null) = (finished_at is null) and finished_at >= started_at)
);

-- Lop phong thu THU HAI cho quy tac chong tinh trung diem: mot hoc sinh khong
-- the co HAI ban ghi cho CUNG hoat dong trong CUNG ngay. Quy tac "1 hoat dong/
-- ngay" nam o tang ung dung (src/lib/actions/activity-log.ts) vi day la quy tac
-- san pham co the doi; con rang buoc duoi day la bat bien du lieu.
create unique index if not exists uq_activity_logs_student_activity_date
  on activity_logs(student_id, activity_id, date);

create index if not exists idx_activity_logs_student on activity_logs(student_id, date);

-- Danh sach "de danh lam sau": hoat dong can chuan bi / doi dung thoi diem.
create table if not exists saved_activities (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_id text not null references activities(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (student_id, activity_id)
);

-- ---------------------------------------------------------------------------
-- TAI NGUYEN HOC TAP
-- ---------------------------------------------------------------------------
create table if not exists resources (
  id text primary key,
  domain text not null references domains(code),
  title text not null,
  description text not null,
  type text not null check (type in ('video', 'bai_viet', 'khoa_hoc', 'khac')),
  duration_label text not null default '',
  url text,
  difficulty text not null check (difficulty in ('de', 'trung_binh', 'nang_cao'))
);

-- ---------------------------------------------------------------------------
-- WEEKLY REVIEW
-- ---------------------------------------------------------------------------
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  week_start_date date not null,
  activities_completed integer not null default 0,
  top_domains text[] not null default '{}',
  summary_text text not null default '',
  ai_generated boolean not null default false,
  model text,
  prompt_version text,
  created_at timestamptz not null default now(),
  unique (student_id, week_start_date)
);

-- ---------------------------------------------------------------------------
-- updated_at tu dong cho potential_profiles
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_potential_profiles_updated_at on potential_profiles;
create trigger trg_potential_profiles_updated_at
  before update on potential_profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- DU LIEU DANH GIA (bao cao Data Science 10/2026) - xem docs/data-dictionary.md
-- ---------------------------------------------------------------------------
create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  activity_id text not null references activities(id) on delete cascade,
  event text not null check (event in ('shown', 'shown_extra', 'opened', 'swapped', 'saved', 'completed')), -- opened = mo trang hoat dong
  algo_version text not null,
  propensity real check (propensity > 0 and propensity <= 1), -- xac suat duoc chon (chi 'shown')
  n_candidates integer check (n_candidates > 0),
  created_at timestamptz not null default now(),
  unique (student_id, date, activity_id, event)
);
create index if not exists idx_rec_events_student on recommendation_events(student_id, date);

create table if not exists outcome_labels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  rater text not null check (rater in ('student', 'teacher')),
  rater_id text not null,
  -- pre_result: em tu chon nhom TRUOC khi xem ket qua (chua co agreement); post_result: sau khi xem
  label_phase text not null default 'post_result' check (label_phase in ('pre_result', 'post_result')),
  top_domains text[] not null default '{}',
  scoring_version text,
  agreement smallint check (agreement between 1 and 3),
  preferred_domains text[] not null default '{}', -- theo thu tu uu tien (pre_result: toi da 3)
  preferred_domain text references domains(code), -- cot cu = preferred_domains[1], giu de tuong thich nguoc
  created_at timestamptz not null default now(),
  constraint outcome_labels_phase_agreement check ((label_phase = 'pre_result') = (agreement is null))
);
create index if not exists idx_outcome_labels_student on outcome_labels(student_id);

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

insert into schema_migrations (version) values ('20261005_bao_cao_mentor'), ('20261006_data_science')
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- MAT KHAU GIAO VIEN (tai khoan rieng, scrypt) - RLS bat, KHONG policy => chi service role
-- ---------------------------------------------------------------------------
create table if not exists teacher_credentials (
  teacher_id uuid primary key references teacher_accounts(id) on delete cascade,
  password_hash text,
  must_change_password boolean not null default true,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  session_version integer not null default 0,
  password_updated_at timestamptz
);

insert into schema_migrations (version) values ('20261007_teacher_auth') on conflict (version) do nothing;
insert into schema_migrations (version) values ('20261008_de_xuat_data_science') on conflict (version) do nothing;
insert into schema_migrations (version) values ('20261017_thoi_gian_lam_bai') on conflict (version) do nothing;
insert into schema_migrations (version) values ('20261017b_mo_roi_bo_do') on conflict (version) do nothing;
insert into schema_migrations (version) values ('20261018_xao_thu_tu_cau') on conflict (version) do nothing;
insert into schema_migrations (version) values ('20261018b_quiz_riasec') on conflict (version) do nothing;
