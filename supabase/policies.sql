-- ============================================================================
-- POTENTIAL COMPASS - Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Chay SAU schema.sql. Day la muc bao mat KHOI DIEM cho quy mo pilot nho -
-- truoc khi mo rong nhieu truong, nen nho mot ky su backend/bao mat ra soat
-- lai (theo huong dan trong tai lieu Trien khai & Van hanh, muc "Bao mat").
--
-- Nguyen tac:
--  - Hoc sinh: chi doc/ghi du lieu CUA CHINH MINH (khao sat, hoat dong, ho so).
--  - Giao vien/Admin: doc/ghi du lieu cua hoc sinh THUOC TRUONG cua minh.
--  - Noi dung dung chung (domains, survey_questions/options, activities,
--    resources): moi nguoi da dang nhap deu doc duoc; chi teacher/admin sua.
-- ============================================================================

alter table schools enable row level security;
alter table teacher_accounts enable row level security;
alter table class_groups enable row level security;
alter table students enable row level security;
alter table domains enable row level security;
alter table survey_questions enable row level security;
alter table survey_options enable row level security;
alter table survey_attempts enable row level security;
alter table survey_responses enable row level security;
alter table potential_profiles enable row level security;
alter table profile_snapshots enable row level security;
alter table activities enable row level security;
alter table activity_logs enable row level security;
alter table resources enable row level security;
alter table weekly_reviews enable row level security;
alter table saved_activities enable row level security;
alter table schema_migrations enable row level security;
alter table recommendation_events enable row level security;
alter table outcome_labels enable row level security;
alter table content_audit_log enable row level security;
alter table survey_opens enable row level security; -- khong policy: chi service role
alter table quiz_attempts enable row level security; -- khong policy: chi service role
alter table riasec_attempts enable row level security; -- khong policy: chi service role
alter table teacher_credentials enable row level security; -- co y KHONG co policy: chi service role

-- ---- Helper: truong cua giao vien dang dang nhap --------------------------
create or replace function current_teacher_school_id()
returns uuid
language sql stable
as $$
  select school_id from teacher_accounts where auth_user_id = auth.uid() limit 1;
$$;

create or replace function is_teacher_or_admin()
returns boolean
language sql stable
as $$
  select exists (select 1 from teacher_accounts where auth_user_id = auth.uid());
$$;

create or replace function current_student_id()
returns uuid
language sql stable
as $$
  select id from students where auth_user_id = auth.uid() limit 1;
$$;

-- ---- Noi dung dung chung: doc cong khai cho nguoi da dang nhap, sua boi GV --
create policy "content_read_authenticated" on domains for select using (auth.role() = 'authenticated');
create policy "content_write_teacher" on domains for all using (is_teacher_or_admin()) with check (is_teacher_or_admin());

create policy "questions_read_authenticated" on survey_questions for select using (auth.role() = 'authenticated');
create policy "questions_write_teacher" on survey_questions for all using (is_teacher_or_admin()) with check (is_teacher_or_admin());

create policy "options_read_authenticated" on survey_options for select using (auth.role() = 'authenticated');
create policy "options_write_teacher" on survey_options for all using (is_teacher_or_admin()) with check (is_teacher_or_admin());

create policy "activities_read_authenticated" on activities for select using (auth.role() = 'authenticated');
create policy "activities_write_teacher" on activities for all using (is_teacher_or_admin()) with check (is_teacher_or_admin());

create policy "resources_read_authenticated" on resources for select using (auth.role() = 'authenticated');
create policy "resources_write_teacher" on resources for all using (is_teacher_or_admin()) with check (is_teacher_or_admin());

-- ---- Truong / lop / giao vien: pham vi theo truong -------------------------
create policy "schools_read_own" on schools for select using (id = current_teacher_school_id());

create policy "teachers_read_same_school" on teacher_accounts for select
  using (school_id = current_teacher_school_id());

create policy "classes_read_same_school" on class_groups for select
  using (school_id = current_teacher_school_id());
create policy "classes_write_same_school" on class_groups for all
  using (school_id = current_teacher_school_id()) with check (school_id = current_teacher_school_id());

-- ---- Hoc sinh: giao vien xem hoc sinh truong minh, hoc sinh xem chinh minh -
create policy "students_read_self" on students for select using (id = current_student_id());
create policy "students_read_teacher" on students for select
  using (class_id in (select id from class_groups where school_id = current_teacher_school_id()));
create policy "students_write_teacher" on students for all
  using (class_id in (select id from class_groups where school_id = current_teacher_school_id()))
  with check (class_id in (select id from class_groups where school_id = current_teacher_school_id()));

-- ---- Khao sat, ho so, hoat dong, weekly review: hoc sinh CHI thao tac cua minh
create policy "survey_attempts_self" on survey_attempts for select using (student_id = current_student_id());
create policy "survey_attempts_teacher_read" on survey_attempts for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

create policy "survey_responses_self" on survey_responses for all
  using (student_id = current_student_id()) with check (student_id = current_student_id());
create policy "survey_responses_teacher_read" on survey_responses for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

create policy "profiles_self" on potential_profiles for select using (student_id = current_student_id());
create policy "profiles_teacher_read" on potential_profiles for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));
create policy "profiles_system_write" on potential_profiles for all
  using (student_id = current_student_id() or is_teacher_or_admin())
  with check (student_id = current_student_id() or is_teacher_or_admin());

create policy "snapshots_self" on profile_snapshots for select using (student_id = current_student_id());
create policy "snapshots_teacher_read" on profile_snapshots for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

create policy "activity_logs_self" on activity_logs for all
  using (student_id = current_student_id()) with check (student_id = current_student_id());
create policy "activity_logs_teacher_read" on activity_logs for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

create policy "saved_activities_self" on saved_activities for all
  using (student_id = current_student_id()) with check (student_id = current_student_id());
create policy "saved_activities_teacher_read" on saved_activities for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));

create policy "weekly_reviews_self" on weekly_reviews for select using (student_id = current_student_id());
create policy "weekly_reviews_teacher_read" on weekly_reviews for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));
create policy "weekly_reviews_system_write" on weekly_reviews for all
  using (student_id = current_student_id() or is_teacher_or_admin())
  with check (student_id = current_student_id() or is_teacher_or_admin());

-- LUU Y: cac thao tac tao moi hoc sinh/lop/tai khoan giao vien va cac tac vu
-- quan tri khac nen di qua Server Actions dung SUPABASE_SERVICE_ROLE_KEY (bo
-- qua RLS, chi chay tren server) thay vi goi thang tu client - xem
-- src/lib/data/supabase/repository.ts.

-- Du lieu danh gia (bao cao Data Science 10/2026): hoc sinh chi doc cua minh,
-- giao vien doc hoc sinh truong minh; GHI chi qua server (service role).
create policy "rec_events_self" on recommendation_events for select using (student_id = current_student_id());
create policy "rec_events_teacher_read" on recommendation_events for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));
create policy "outcome_labels_self" on outcome_labels for select using (student_id = current_student_id());
create policy "outcome_labels_teacher_read" on outcome_labels for select
  using (student_id in (select s.id from students s join class_groups c on c.id = s.class_id
                         where c.school_id = current_teacher_school_id()));
create policy "content_audit_teacher_read" on content_audit_log for select using (is_teacher_or_admin());
