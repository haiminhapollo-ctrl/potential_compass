import "server-only";
import type {
  Activity,
  ActivityLog,
  ClassGroup,
  ContentAuditEntry,
  DomainScore,
  NewActivityLog,
  NewContentAuditEntry,
  NewOutcomeLabel,
  NewStudent,
  NewSurveyAttempt,
  OutcomeLabel,
  PotentialProfile,
  ProfileSnapshot,
  RecommendationEvent,
  Resource,
  SavedActivity,
  School,
  Student,
  SurveyAttempt,
  SurveyAttemptWithResponses,
  SurveyOpen,
  NewQuizAttempt,
  QuizAttempt,
  RiasecAttempt,
  SurveyOption,
  SurveyQuestion,
  SurveyResponse,
  TeacherAccount,
  TeacherCredentials,
  TrackProfile,
  WeeklyReview,
  CurriculumTerm,
} from "../../types";
import { DEFAULT_TERM } from "../../curriculum";
import { latestAttempts } from "../../survey";
import { NotFoundError, type ActivityLogPatch, type Repository } from "../repository";
import { getSupabaseClient } from "./client";

// ============================================================================
// SUPABASE REPOSITORY - implement Repository bang @supabase/supabase-js.
// Doi chieu voi supabase/schema.sql. Cot DB dung snake_case, TS dung
// camelCase - cac ham rowToX() lam nhiem vu chuyen doi 2 chieu.
//
// LUU Y KIEM THU: file nay duoc viet can than theo dung schema.sql va API
// on dinh cua @supabase/supabase-js v2, nhung CHUA duoc chay thu voi mot
// Supabase project that (moi truong phat trien hien tai khong the cai dat
// package qua npm). Truoc khi dung cho Pilot that: chay `npm run typecheck`
// va thu tung thao tac CRUD tren 1 project Supabase that (mien phi) it nhat
// 1 lan. Xem tai lieu "Trien khai & Van hanh".
// ============================================================================

/**
 * Doc HET ket qua theo trang: PostgREST/Supabase mac dinh tra toi da 1000 dong
 * moi request - doc mot lan se cat cut im lang khi du lieu pilot lon.
 */
const PAGE = 1000;
async function fetchAll<T>(
  context: string,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`[Supabase] Loi ${context}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Chia mang id thanh tung lo cho filter `in` (tranh URL qua dai). */
function chunks<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function rowToResponse(r: any): SurveyResponse {
  return {
    id: r.id,
    studentId: r.student_id,
    attemptId: r.attempt_id,
    questionId: r.question_id,
    optionId: r.option_id,
    surveyVersion: r.survey_version ?? null,
    displayPosition: r.display_position ?? null,
    questionPosition: r.question_position ?? null,
    firstAnsweredMs: r.first_answered_ms ?? null,
    answeredAt: r.answered_at,
  };
}
function rowToAttempt(r: any): SurveyAttempt {
  return {
    id: r.id,
    studentId: r.student_id,
    measurementWave: r.measurement_wave ?? null,
    surveyVersion: r.survey_version ?? null,
    curriculumTerm: r.curriculum_term ?? null,
    startedAt: r.started_at ?? null,
    completedAt: r.completed_at,
  };
}
/** Cot luong (recommended_track, *_affinity_score, track_reason) <-> TrackProfile. null = ho so truoc v5. */
function rowToTrack(r: any): TrackProfile | null {
  if (!r.recommended_track) return null;
  return {
    recommendedTrack: r.recommended_track,
    vocationalAffinity: Number(r.vocational_affinity_score),
    academicAffinity: Number(r.academic_affinity_score),
    lean: Number(r.track_lean),
    reason: r.track_reason,
  };
}
function trackToRow(t: TrackProfile | null) {
  return {
    recommended_track: t?.recommendedTrack ?? null,
    vocational_affinity_score: t?.vocationalAffinity ?? null,
    academic_affinity_score: t?.academicAffinity ?? null,
    track_lean: t?.lean ?? null,
    track_reason: t?.reason ?? null,
  };
}

function throwIfError<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) throw new Error(`[Supabase] Loi ${context}: ${error.message}`);
  if (data === null) throw new Error(`[Supabase] Khong co du lieu tra ve: ${context}`);
  return data;
}

// ---- Row <-> Domain type mappers -------------------------------------------
function rowToSchool(row: any): School {
  return { id: row.id, name: row.name, province: row.province, createdAt: row.created_at };
}
function rowToClassGroup(row: any): ClassGroup {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    teacherId: row.teacher_id,
    retestWave: row.retest_wave ?? null,
    riasecEnabled: row.riasec_enabled ?? false,
    curriculumTerm: row.curriculum_term ?? DEFAULT_TERM,
    createdAt: row.created_at,
  };
}
function rowToQuizAttempt(r: any): QuizAttempt {
  return {
    id: r.id,
    studentId: r.student_id,
    activityId: r.activity_id,
    date: r.date,
    quizVersion: r.quiz_version,
    answers: r.answers ?? [],
    nCorrect: r.n_correct,
    nQuestions: r.n_questions,
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
    createdAt: r.created_at,
  };
}
function rowToRiasecAttempt(r: any): RiasecAttempt {
  return { id: r.id, studentId: r.student_id, itemsVersion: r.items_version, answers: r.answers ?? {}, startedAt: r.started_at ?? null, completedAt: r.completed_at };
}
function rowToTeacher(row: any): TeacherAccount {
  return {
    id: row.id,
    schoolId: row.school_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}
function rowToStudent(row: any): Student {
  return {
    id: row.id,
    classId: row.class_id,
    studentCode: row.student_code,
    displayName: row.display_name,
    parentConsentConfirmed: row.parent_consent_confirmed,
    createdAt: row.created_at,
  };
}
function rowToActivity(row: any): Activity {
  return {
    id: row.id,
    domain: row.domain,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    instructions: row.instructions ?? [],
    reflectionPrompt: row.reflection_prompt,
    secondaryDomain: row.secondary_domain ?? null,
    mediaUrl: row.media_url ?? null,
    example: row.example ?? "",
    active: row.active,
    curriculumTerm: row.curriculum_term ?? "ALL",
    quiz: row.quiz ?? [],
  };
}
function activityToRow(a: Activity) {
  return {
    id: a.id,
    domain: a.domain,
    title: a.title,
    description: a.description,
    duration_minutes: a.durationMinutes,
    instructions: a.instructions,
    reflection_prompt: a.reflectionPrompt,
    secondary_domain: a.secondaryDomain,
    media_url: a.mediaUrl,
    example: a.example,
    active: a.active,
    curriculum_term: a.curriculumTerm,
    quiz: a.quiz,
  };
}
function rowToResource(row: any): Resource {
  return {
    id: row.id,
    domain: row.domain,
    title: row.title,
    description: row.description,
    type: row.type,
    durationLabel: row.duration_label,
    url: row.url,
    difficulty: row.difficulty,
  };
}
function resourceToRow(r: Resource) {
  return {
    id: r.id,
    domain: r.domain,
    title: r.title,
    description: r.description,
    type: r.type,
    duration_label: r.durationLabel,
    url: r.url,
    difficulty: r.difficulty,
  };
}
function rowToActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    studentId: row.student_id,
    activityId: row.activity_id,
    date: row.date,
    interestRating: row.interest_rating,
    reflectionText: row.reflection_text,
    confidence: row.confidence ?? null,
    difficulty: row.difficulty ?? null,
    note: row.note ?? "",
    isExtra: row.is_extra ?? false,
    source: row.source,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  };
}
function rowToOutcomeLabel(r: any): OutcomeLabel {
  const domains: string[] = r.preferred_domains?.length ? r.preferred_domains : r.preferred_domain ? [r.preferred_domain] : [];
  return {
    id: r.id,
    studentId: r.student_id,
    rater: r.rater,
    raterId: r.rater_id,
    labelPhase: r.label_phase ?? "post_result",
    topDomains: r.top_domains ?? [],
    scoringVersion: r.scoring_version ?? null,
    agreement: r.agreement ?? null,
    preferredDomains: domains as OutcomeLabel["preferredDomains"],
    createdAt: r.created_at,
  };
}

function rowToProfile(row: any): PotentialProfile {
  return {
    studentId: row.student_id,
    scores: (row.scores ?? []) as DomainScore[],
    topDomains: row.top_domains ?? [],
    surveyCompleted: row.survey_completed,
    activitiesCompletedCount: row.activities_completed_count,
    lastInsight: row.last_insight,
    insightProvenance: row.insight_source
      ? {
          source: row.insight_source,
          model: row.insight_model ?? null,
          promptVersion: row.insight_prompt_version ?? "",
          generatedAt: row.insight_generated_at ?? row.updated_at,
        }
      : null,
    components: row.components ?? [],
    track: rowToTrack(row),
    scoringVersion: row.scoring_version ?? null,
    contentHash: row.content_hash ?? null,
    updatedAt: row.updated_at,
  };
}
function rowToSnapshot(row: any): ProfileSnapshot {
  return {
    id: row.id,
    studentId: row.student_id,
    weekStartDate: row.week_start_date,
    scores: (row.scores ?? []) as DomainScore[],
    topDomains: row.top_domains ?? [],
    components: row.components ?? [],
    track: rowToTrack(row),
    scoringVersion: row.scoring_version ?? null,
    contentHash: row.content_hash ?? null,
    reason: row.reason ?? null,
    dataCutoffAt: row.data_cutoff_at ?? null,
    nResponses: row.n_responses ?? null,
    nActivityLogs: row.n_activity_logs ?? null,
    createdAt: row.created_at,
  };
}
function rowToWeeklyReview(row: any): WeeklyReview {
  return {
    id: row.id,
    studentId: row.student_id,
    weekStartDate: row.week_start_date,
    activitiesCompleted: row.activities_completed,
    topDomains: row.top_domains ?? [],
    summaryText: row.summary_text,
    aiGenerated: row.ai_generated,
    model: row.model ?? null,
    promptVersion: row.prompt_version ?? null,
    createdAt: row.created_at,
  };
}

export class SupabaseRepository implements Repository {
  private get db() {
    return getSupabaseClient();
  }

  // ---------- Schools ----------
  async getSchool(id: string): Promise<School | null> {
    const { data, error } = await this.db.from("schools").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[Supabase] getSchool: ${error.message}`);
    return data ? rowToSchool(data) : null;
  }

  async listSchools(): Promise<School[]> {
    const { data, error } = await this.db.from("schools").select("*").order("name");
    return throwIfError(data, error, "listSchools").map(rowToSchool);
  }

  async createSchool(input: Omit<School, "id" | "createdAt">): Promise<School> {
    const { data, error } = await this.db
      .from("schools")
      .insert({ name: input.name, province: input.province })
      .select("*")
      .single();
    return rowToSchool(throwIfError(data, error, "createSchool"));
  }

  // ---------- Classes ----------
  async listClasses(schoolId: string): Promise<ClassGroup[]> {
    const { data, error } = await this.db.from("class_groups").select("*").eq("school_id", schoolId).order("name");
    return throwIfError(data, error, "listClasses").map(rowToClassGroup);
  }

  async getClass(id: string): Promise<ClassGroup | null> {
    const { data, error } = await this.db.from("class_groups").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[Supabase] getClass: ${error.message}`);
    return data ? rowToClassGroup(data) : null;
  }

  async setClassRetestWave(classId: string, wave: string | null): Promise<void> {
    const { error } = await this.db.from("class_groups").update({ retest_wave: wave }).eq("id", classId);
    if (error) throw new Error(`[Supabase] setClassRetestWave: ${error.message}`);
  }

  async setClassCurriculumTerm(classId: string, term: CurriculumTerm): Promise<void> {
    const { error } = await this.db.from("class_groups").update({ curriculum_term: term }).eq("id", classId);
    if (error) throw new Error(`[Supabase] setClassCurriculumTerm: ${error.message}`);
  }

  async setClassRiasec(classId: string, enabled: boolean): Promise<void> {
    const { error } = await this.db.from("class_groups").update({ riasec_enabled: enabled }).eq("id", classId);
    if (error) throw new Error(`[Supabase] setClassRiasec: ${error.message}`);
  }

  async createClass(input: Omit<ClassGroup, "id" | "createdAt" | "retestWave" | "riasecEnabled" | "curriculumTerm">): Promise<ClassGroup> {
    const { data, error } = await this.db
      .from("class_groups")
      .insert({ school_id: input.schoolId, name: input.name, teacher_id: input.teacherId })
      .select("*")
      .single();
    return rowToClassGroup(throwIfError(data, error, "createClass"));
  }

  // ---------- Teachers ----------
  async listTeachers(schoolId: string): Promise<TeacherAccount[]> {
    const { data, error } = await this.db.from("teacher_accounts").select("*").eq("school_id", schoolId);
    return throwIfError(data, error, "listTeachers").map(rowToTeacher);
  }

  async getTeacherByEmail(email: string): Promise<TeacherAccount | null> {
    // eq tren email chu thuong - KHONG dung ilike: "%" / "_" trong o nhap la ky tu
    // dai dien, nhap "%" se khop tai khoan cua nguoi khac.
    const { data, error } = await this.db
      .from("teacher_accounts")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`[Supabase] getTeacherByEmail: ${error.message}`);
    return data ? rowToTeacher(data) : null;
  }

  async getTeacher(id: string): Promise<TeacherAccount | null> {
    const { data, error } = await this.db.from("teacher_accounts").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[Supabase] getTeacher: ${error.message}`);
    return data ? rowToTeacher(data) : null;
  }

  async createTeacher(input: Omit<TeacherAccount, "id" | "createdAt">): Promise<TeacherAccount> {
    const { data, error } = await this.db
      .from("teacher_accounts")
      .insert({ school_id: input.schoolId, full_name: input.fullName, email: input.email.trim().toLowerCase(), role: input.role })
      .select("*")
      .single();
    return rowToTeacher(throwIfError(data, error, "createTeacher"));
  }

  async getTeacherCredentials(teacherId: string): Promise<TeacherCredentials | null> {
    const { data, error } = await this.db.from("teacher_credentials").select("*").eq("teacher_id", teacherId).maybeSingle();
    if (error) throw new Error(`[Supabase] getTeacherCredentials: ${error.message}`);
    return data
      ? {
          teacherId: data.teacher_id,
          passwordHash: data.password_hash,
          mustChangePassword: data.must_change_password,
          failedLoginCount: data.failed_login_count,
          lockedUntil: data.locked_until,
          sessionVersion: data.session_version,
          passwordUpdatedAt: data.password_updated_at,
        }
      : null;
  }

  async saveTeacherCredentials(c: TeacherCredentials): Promise<void> {
    const { error } = await this.db.from("teacher_credentials").upsert({
      teacher_id: c.teacherId,
      password_hash: c.passwordHash,
      must_change_password: c.mustChangePassword,
      failed_login_count: c.failedLoginCount,
      locked_until: c.lockedUntil,
      session_version: c.sessionVersion,
      password_updated_at: c.passwordUpdatedAt,
    });
    if (error) throw new Error(`[Supabase] saveTeacherCredentials: ${error.message}`);
  }

  // ---------- Students ----------
  async listStudentsByClass(classId: string): Promise<Student[]> {
    const { data, error } = await this.db
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .order("display_name");
    return throwIfError(data, error, "listStudentsByClass").map(rowToStudent);
  }

  async listStudentsBySchool(schoolId: string): Promise<Student[]> {
    const rows = await fetchAll<any>("listStudentsBySchool", (from, to) =>
      this.db
        .from("students")
        .select("*, class_groups!inner(school_id)")
        .eq("class_groups.school_id", schoolId)
        .order("display_name")
        .range(from, to)
    );
    return rows.map(rowToStudent);
  }

  async getStudent(id: string): Promise<Student | null> {
    const { data, error } = await this.db.from("students").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`[Supabase] getStudent: ${error.message}`);
    return data ? rowToStudent(data) : null;
  }

  async getStudentByCode(code: string): Promise<Student | null> {
    const { data, error } = await this.db
      .from("students")
      .select("*")
      .ilike("student_code", code)
      .maybeSingle();
    if (error) throw new Error(`[Supabase] getStudentByCode: ${error.message}`);
    return data ? rowToStudent(data) : null;
  }

  async createStudent(input: NewStudent): Promise<Student> {
    const { data, error } = await this.db
      .from("students")
      .insert({
        class_id: input.classId,
        student_code: input.studentCode,
        display_name: input.displayName,
        parent_consent_confirmed: input.parentConsentConfirmed,
      })
      .select("*")
      .single();
    return rowToStudent(throwIfError(data, error, "createStudent"));
  }

  async updateStudent(id: string, patch: Partial<NewStudent>): Promise<Student> {
    const row: Record<string, unknown> = {};
    if (patch.classId !== undefined) row.class_id = patch.classId;
    if (patch.studentCode !== undefined) row.student_code = patch.studentCode;
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.parentConsentConfirmed !== undefined) row.parent_consent_confirmed = patch.parentConsentConfirmed;

    const { data, error } = await this.db.from("students").update(row).eq("id", id).select("*").maybeSingle();
    if (error) throw new Error(`[Supabase] updateStudent: ${error.message}`);
    if (!data) throw new NotFoundError("Student", id);
    return rowToStudent(data);
  }

  async deleteStudent(id: string): Promise<void> {
    const { error } = await this.db.from("students").delete().eq("id", id);
    if (error) throw new Error(`[Supabase] deleteStudent: ${error.message}`);
  }

  // ---------- Survey questions (bang cha survey_questions + con survey_options) ----------
  async listSurveyQuestions(): Promise<SurveyQuestion[]> {
    const { data: questions, error: qErr } = await this.db
      .from("survey_questions")
      .select("*")
      .order("order", { ascending: true });
    if (qErr) throw new Error(`[Supabase] listSurveyQuestions: ${qErr.message}`);

    const { data: options, error: oErr } = await this.db.from("survey_options").select("*");
    if (oErr) throw new Error(`[Supabase] listSurveyQuestions(options): ${oErr.message}`);

    return (questions ?? []).map((q: any) => ({
      id: q.id,
      order: q.order,
      scenario: q.scenario,
      curriculumTerm: q.curriculum_term ?? "ALL",
      active: q.active ?? true,
      options: (options ?? [])
        .filter((o: any) => o.question_id === q.id)
        .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))
        .map((o: any): SurveyOption => ({
          id: o.id,
          text: o.text,
          domainWeights: o.domain_weights ?? {},
          trackWeights: o.track_weights ?? {},
        })),
    }));
  }

  async upsertSurveyQuestion(question: SurveyQuestion): Promise<SurveyQuestion> {
    const { error: qErr } = await this.db.from("survey_questions").upsert({
      id: question.id,
      order: question.order,
      scenario: question.scenario,
      curriculum_term: question.curriculumTerm,
      active: question.active,
    });
    if (qErr) throw new Error(`[Supabase] upsertSurveyQuestion: ${qErr.message}`);

    // UPSERT dap an theo id - KHONG xoa roi chen lai: survey_responses.option_id la khoa ngoai ON DELETE CASCADE,
    // xoa dap an (ke ca de chen lai cung id) se xoa DAY CHUYEN moi cau tra loi cua hoc sinh cho cau nay
    // (loi truoc 11/2026: giao vien sua chu 1 cau => mat het cau tra loi cau do). Chi xoa dap an that su bi bo.
    if (question.options.length > 0) {
      const { error: upErr } = await this.db.from("survey_options").upsert(
        question.options.map((o) => ({
          id: o.id,
          question_id: question.id,
          text: o.text,
          domain_weights: o.domainWeights,
          track_weights: o.trackWeights,
        }))
      );
      if (upErr) throw new Error(`[Supabase] upsertSurveyQuestion(upsert options): ${upErr.message}`);
    }
    const keep = question.options.map((o) => o.id);
    let removed = this.db.from("survey_options").delete().eq("question_id", question.id);
    if (keep.length > 0) removed = removed.not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
    const { error: delErr } = await removed;
    if (delErr) throw new Error(`[Supabase] upsertSurveyQuestion(delete removed options): ${delErr.message}`);

    return question;
  }

  async deleteSurveyQuestion(id: string): Promise<void> {
    const { error } = await this.db.from("survey_questions").delete().eq("id", id);
    if (error) throw new Error(`[Supabase] deleteSurveyQuestion: ${error.message}`);
  }

  // ---------- Lan lam khao sat & cau tra loi ----------
  async listResponsesByStudent(studentId: string): Promise<SurveyResponse[]> {
    return this.listResponsesByStudents([studentId]);
  }

  async listResponsesByStudents(studentIds: string[]): Promise<SurveyResponse[]> {
    return [...latestAttempts(await this.listSurveyAttempts(studentIds)).values()].flatMap((a) => a.responses);
  }

  async listSurveyAttempts(studentIds: string[]): Promise<SurveyAttemptWithResponses[]> {
    const [attemptRows, responseRows] = await Promise.all([
      this.byStudents<any>("survey_attempts", studentIds, "listSurveyAttempts", "created_at"),
      this.byStudents<any>("survey_responses", studentIds, "listSurveyAttempts(responses)", "answered_at"),
    ]);
    const byAttempt = new Map<string, SurveyResponse[]>();
    for (const r of responseRows.map(rowToResponse)) byAttempt.set(r.attemptId, [...(byAttempt.get(r.attemptId) ?? []), r]);
    return attemptRows
      .filter((a) => a.completed_at) // lan lam ghi dut giua chung (khong co completed_at) khong duoc tinh
      .map((a) => ({ ...rowToAttempt(a), responses: byAttempt.get(a.id) ?? [] }))
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  }

  async createSurveyAttempt(input: NewSurveyAttempt): Promise<SurveyAttempt> {
    // Khong co transaction qua supabase-js: tao lan lam (chua hoan thanh) -> ghi dap an -> danh dau
    // hoan thanh. Dut o giua thi lan lam khong co completed_at va bi bo qua khi doc.
    const { data: attempt, error } = await this.db
      .from("survey_attempts")
      .insert({
        student_id: input.studentId,
        measurement_wave: input.measurementWave,
        survey_version: input.surveyVersion,
        curriculum_term: input.curriculumTerm,
        started_at: input.startedAt,
      })
      .select("id")
      .single();
    const attemptId = throwIfError(attempt, error, "createSurveyAttempt").id as string;

    const { error: rErr } = await this.db.from("survey_responses").insert(
      input.answers.map((a) => ({
        attempt_id: attemptId,
        student_id: input.studentId,
        question_id: a.questionId,
        option_id: a.optionId,
        survey_version: input.surveyVersion,
        display_position: a.displayPosition,
        question_position: a.questionPosition,
        first_answered_ms: a.firstAnsweredMs,
      }))
    );
    if (rErr) {
      await this.db.from("survey_attempts").delete().eq("id", attemptId); // dap an da ghi bi xoa theo (cascade)
      throw new Error(`[Supabase] createSurveyAttempt(responses): ${rErr.message}`);
    }

    const { data, error: cErr } = await this.db
      .from("survey_attempts")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", attemptId)
      .select("*")
      .single();
    return rowToAttempt(throwIfError(data, cErr, "createSurveyAttempt(complete)"));
  }

  /** Doc 1 bang loc theo danh sach hoc sinh (theo lo + theo trang). */
  async createQuizAttempt(input: NewQuizAttempt): Promise<QuizAttempt> {
    const { data, error } = await this.db
      .from("quiz_attempts")
      .insert({
        student_id: input.studentId,
        activity_id: input.activityId,
        date: input.date,
        quiz_version: input.quizVersion,
        answers: input.answers,
        n_correct: input.nCorrect,
        n_questions: input.nQuestions,
        started_at: input.startedAt,
        finished_at: input.finishedAt,
      })
      .select("*")
      .single();
    return rowToQuizAttempt(throwIfError(data, error, "createQuizAttempt"));
  }

  async listQuizAttempts(studentIds: string[]): Promise<QuizAttempt[]> {
    return (await this.byStudents<any>("quiz_attempts", studentIds, "listQuizAttempts")).map(rowToQuizAttempt);
  }

  async createRiasecAttempt(input: Omit<RiasecAttempt, "id">): Promise<RiasecAttempt> {
    const { data, error } = await this.db
      .from("riasec_attempts")
      .insert({ student_id: input.studentId, items_version: input.itemsVersion, answers: input.answers, started_at: input.startedAt, completed_at: input.completedAt })
      .select("*")
      .single();
    return rowToRiasecAttempt(throwIfError(data, error, "createRiasecAttempt"));
  }

  async listRiasecAttempts(studentIds: string[]): Promise<RiasecAttempt[]> {
    return (await this.byStudents<any>("riasec_attempts", studentIds, "listRiasecAttempts", "completed_at")).map(rowToRiasecAttempt);
  }

  async recordSurveyOpen(studentId: string, measurementWave: string): Promise<void> {
    const { error } = await this.db.from("survey_opens").insert({ student_id: studentId, measurement_wave: measurementWave });
    if (error) throw new Error(`[Supabase] recordSurveyOpen: ${error.message}`);
  }

  async listSurveyOpens(studentIds: string[]): Promise<SurveyOpen[]> {
    return (await this.byStudents<any>("survey_opens", studentIds, "listSurveyOpens", "opened_at")).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      measurementWave: r.measurement_wave,
      openedAt: r.opened_at,
    }));
  }

  private async byStudents<T>(table: string, studentIds: string[], context: string, order = "created_at"): Promise<T[]> {
    const out: T[] = [];
    for (const ids of chunks(studentIds)) {
      out.push(
        ...(await fetchAll<T>(context, (from, to) =>
          this.db.from(table).select("*").in("student_id", ids).order(order).range(from, to)
        ))
      );
    }
    return out;
  }

  // ---------- Potential profile ----------
  async getProfile(studentId: string): Promise<PotentialProfile | null> {
    const { data, error } = await this.db
      .from("potential_profiles")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw new Error(`[Supabase] getProfile: ${error.message}`);
    return data ? rowToProfile(data) : null;
  }

  async listProfilesByStudents(studentIds: string[]): Promise<PotentialProfile[]> {
    return (await this.byStudents<any>("potential_profiles", studentIds, "listProfilesByStudents", "student_id")).map(
      rowToProfile
    );
  }

  async saveProfile(profile: PotentialProfile): Promise<void> {
    const { error } = await this.db.from("potential_profiles").upsert({
      student_id: profile.studentId,
      scores: profile.scores,
      top_domains: profile.topDomains,
      survey_completed: profile.surveyCompleted,
      activities_completed_count: profile.activitiesCompletedCount,
      last_insight: profile.lastInsight,
      insight_source: profile.insightProvenance?.source ?? null,
      insight_model: profile.insightProvenance?.model ?? null,
      insight_prompt_version: profile.insightProvenance?.promptVersion ?? null,
      insight_generated_at: profile.insightProvenance?.generatedAt ?? null,
      components: profile.components,
      ...trackToRow(profile.track),
      scoring_version: profile.scoringVersion,
      content_hash: profile.contentHash,
    });
    if (error) throw new Error(`[Supabase] saveProfile: ${error.message}`);
  }

  async listSnapshots(studentId: string): Promise<ProfileSnapshot[]> {
    const { data, error } = await this.db
      .from("profile_snapshots")
      .select("*")
      .eq("student_id", studentId)
      .order("week_start_date");
    return throwIfError(data, error, "listSnapshots").map(rowToSnapshot);
  }

  async listSnapshotsByStudents(studentIds: string[]): Promise<ProfileSnapshot[]> {
    return (await this.byStudents<any>("profile_snapshots", studentIds, "listSnapshotsByStudents", "week_start_date")).map(
      rowToSnapshot
    );
  }

  async saveSnapshot(snapshot: ProfileSnapshot): Promise<void> {
    const { error } = await this.db.from("profile_snapshots").upsert(
      {
        student_id: snapshot.studentId,
        week_start_date: snapshot.weekStartDate,
        scores: snapshot.scores,
        top_domains: snapshot.topDomains,
        components: snapshot.components,
        ...trackToRow(snapshot.track),
        scoring_version: snapshot.scoringVersion,
        content_hash: snapshot.contentHash,
        reason: snapshot.reason,
        data_cutoff_at: snapshot.dataCutoffAt,
        n_responses: snapshot.nResponses,
        n_activity_logs: snapshot.nActivityLogs,
      },
      { onConflict: "student_id,week_start_date" }
    );
    if (error) throw new Error(`[Supabase] saveSnapshot: ${error.message}`);
  }

  // ---------- Activities ----------
  async listActivities(): Promise<Activity[]> {
    const { data, error } = await this.db.from("activities").select("*");
    return throwIfError(data, error, "listActivities").map(rowToActivity);
  }

  async upsertActivity(activity: Activity): Promise<Activity> {
    const { error } = await this.db.from("activities").upsert(activityToRow(activity));
    if (error) throw new Error(`[Supabase] upsertActivity: ${error.message}`);
    return activity;
  }

  async deleteActivity(id: string): Promise<void> {
    const { error } = await this.db.from("activities").delete().eq("id", id);
    if (error) throw new Error(`[Supabase] deleteActivity: ${error.message}`);
  }

  // ---------- Activity logs ----------
  async listActivityLogsByStudent(studentId: string): Promise<ActivityLog[]> {
    const { data, error } = await this.db
      .from("activity_logs")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false });
    return throwIfError(data, error, "listActivityLogsByStudent").map(rowToActivityLog);
  }

  async listActivityLogsByStudents(studentIds: string[]): Promise<ActivityLog[]> {
    return (await this.byStudents<any>("activity_logs", studentIds, "listActivityLogsByStudents", "date"))
      .map(rowToActivityLog)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async listAllActivityRatings(): Promise<Pick<ActivityLog, "activityId" | "interestRating">[]> {
    const rows = await fetchAll<any>("listAllActivityRatings", (from, to) =>
      this.db.from("activity_logs").select("activity_id, interest_rating").order("id").range(from, to)
    );
    return rows.map((r) => ({ activityId: r.activity_id, interestRating: r.interest_rating }));
  }

  async createActivityLog(input: NewActivityLog): Promise<ActivityLog> {
    const { data, error } = await this.db
      .from("activity_logs")
      .insert({
        student_id: input.studentId,
        activity_id: input.activityId,
        date: input.date,
        interest_rating: input.interestRating,
        reflection_text: input.reflectionText,
        confidence: input.confidence,
        difficulty: input.difficulty,
        note: input.note,
        is_extra: input.isExtra,
        source: input.source,
        started_at: input.startedAt,
        finished_at: input.finishedAt,
        synced_at: input.source === "online" ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    return rowToActivityLog(throwIfError(data, error, "createActivityLog"));
  }

  async updateActivityLog(id: string, patch: ActivityLogPatch): Promise<ActivityLog> {
    const { data, error } = await this.db
      .from("activity_logs")
      .update({
        interest_rating: patch.interestRating,
        reflection_text: patch.reflectionText,
        confidence: patch.confidence,
        difficulty: patch.difficulty,
        note: patch.note,
      })
      .eq("id", id)
      .select("*")
      .single();
    return rowToActivityLog(throwIfError(data, error, "updateActivityLog"));
  }

  // ---------- Saved activities (de danh lam sau) ----------
  async listSavedActivities(studentId: string): Promise<SavedActivity[]> {
    const { data, error } = await this.db
      .from("saved_activities")
      .select("*")
      .eq("student_id", studentId)
      .order("saved_at", { ascending: true });
    return throwIfError(data, error, "listSavedActivities").map(
      (row: any): SavedActivity => ({
        id: row.id,
        studentId: row.student_id,
        activityId: row.activity_id,
        savedAt: row.saved_at,
      })
    );
  }

  async saveActivityForLater(studentId: string, activityId: string): Promise<void> {
    const { error } = await this.db
      .from("saved_activities")
      .upsert(
        { student_id: studentId, activity_id: activityId },
        { onConflict: "student_id,activity_id", ignoreDuplicates: true }
      );
    if (error) throw new Error(`[Supabase] saveActivityForLater: ${error.message}`);
  }

  async removeSavedActivity(studentId: string, activityId: string): Promise<void> {
    const { error } = await this.db
      .from("saved_activities")
      .delete()
      .eq("student_id", studentId)
      .eq("activity_id", activityId);
    if (error) throw new Error(`[Supabase] removeSavedActivity: ${error.message}`);
  }

  // ---------- Resources ----------
  async listResources(): Promise<Resource[]> {
    const { data, error } = await this.db.from("resources").select("*");
    return throwIfError(data, error, "listResources").map(rowToResource);
  }

  async upsertResource(resource: Resource): Promise<Resource> {
    const { error } = await this.db.from("resources").upsert(resourceToRow(resource));
    if (error) throw new Error(`[Supabase] upsertResource: ${error.message}`);
    return resource;
  }

  async deleteResource(id: string): Promise<void> {
    const { error } = await this.db.from("resources").delete().eq("id", id);
    if (error) throw new Error(`[Supabase] deleteResource: ${error.message}`);
  }

  // ---------- Weekly review ----------
  // ---------- Du lieu danh gia ----------
  async logRecommendationEvent(event: Omit<RecommendationEvent, "id" | "createdAt">): Promise<void> {
    const { error } = await this.db.from("recommendation_events").upsert(
      {
        student_id: event.studentId,
        date: event.date,
        activity_id: event.activityId,
        event: event.event,
        algo_version: event.algoVersion,
        propensity: event.propensity,
        n_candidates: event.nCandidates,
      },
      { onConflict: "student_id,date,activity_id,event", ignoreDuplicates: true }
    );
    if (error) throw new Error(`[Supabase] logRecommendationEvent: ${error.message}`);
  }

  async listRecommendationEvents(studentIds: string[]): Promise<RecommendationEvent[]> {
    return (await this.byStudents<any>("recommendation_events", studentIds, "listRecommendationEvents")).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      date: r.date,
      activityId: r.activity_id,
      event: r.event,
      algoVersion: r.algo_version,
      propensity: r.propensity ?? null,
      nCandidates: r.n_candidates ?? null,
      createdAt: r.created_at,
    }));
  }

  async saveOutcomeLabel(label: NewOutcomeLabel): Promise<OutcomeLabel> {
    const { data, error } = await this.db
      .from("outcome_labels")
      .insert({
        student_id: label.studentId,
        rater: label.rater,
        rater_id: label.raterId,
        top_domains: label.topDomains,
        scoring_version: label.scoringVersion,
        label_phase: label.labelPhase,
        agreement: label.agreement,
        preferred_domains: label.preferredDomains,
        preferred_domain: label.preferredDomains[0] ?? null, // cot cu, giu de tuong thich nguoc
      })
      .select("*")
      .single();
    return rowToOutcomeLabel(throwIfError(data, error, "saveOutcomeLabel"));
  }

  async listOutcomeLabels(studentIds: string[]): Promise<OutcomeLabel[]> {
    return (await this.byStudents<any>("outcome_labels", studentIds, "listOutcomeLabels"))
      .map(rowToOutcomeLabel)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async appendAuditLog(entry: NewContentAuditEntry): Promise<void> {
    const { error } = await this.db.from("content_audit_log").insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      actor_id: entry.actorId,
      before: entry.before ?? null,
      after: entry.after ?? null,
    });
    if (error) throw new Error(`[Supabase] appendAuditLog: ${error.message}`);
  }

  async listAuditLog(limit: number): Promise<ContentAuditEntry[]> {
    const { data, error } = await this.db
      .from("content_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return throwIfError(data, error, "listAuditLog").map((r: any) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      actorId: r.actor_id,
      before: r.before,
      after: r.after,
      createdAt: r.created_at,
    }));
  }

  async listWeeklyReviews(studentId: string): Promise<WeeklyReview[]> {
    const { data, error } = await this.db
      .from("weekly_reviews")
      .select("*")
      .eq("student_id", studentId)
      .order("week_start_date", { ascending: false });
    return throwIfError(data, error, "listWeeklyReviews").map(rowToWeeklyReview);
  }

  async saveWeeklyReview(review: WeeklyReview): Promise<void> {
    const { error } = await this.db.from("weekly_reviews").upsert(
      {
        student_id: review.studentId,
        week_start_date: review.weekStartDate,
        activities_completed: review.activitiesCompleted,
        top_domains: review.topDomains,
        summary_text: review.summaryText,
        ai_generated: review.aiGenerated,
        model: review.model,
        prompt_version: review.promptVersion,
      },
      { onConflict: "student_id,week_start_date" }
    );
    if (error) throw new Error(`[Supabase] saveWeeklyReview: ${error.message}`);
  }
}
