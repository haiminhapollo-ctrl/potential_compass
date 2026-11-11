import type {
  Activity,
  ActivityLog,
  ClassGroup,
  ContentAuditEntry,
  CurriculumTerm,
  NewActivityLog,
  NewContentAuditEntry,
  DomainCode,
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
  SurveyQuestion,
  SurveyResponse,
  TeacherAccount,
  TeacherCredentials,
  WeeklyReview,
} from "../../types";
import { DEFAULT_TERM } from "../../curriculum";
import { latestAttempts } from "../../survey";
import { SURVEY_QUESTIONS } from "../../content/survey-questions";
import { ACTIVITIES } from "../../content/activities";
import { RESOURCES } from "../../content/resources";
import { NotFoundError, type ActivityLogPatch, type Repository } from "../repository";
import { generateId, readCollection, writeCollection } from "./store";

// ============================================================================
// LOCAL JSON REPOSITORY - implement Repository bang file JSON (xem store.ts).
// Cac collection "noi dung" (survey_questions/activities/resources) duoc
// khoi tao san tu src/lib/content/* - giao vien co the sua qua UI, luu de
// vao file rieng (khong dung lai file goc trong src/lib/content).
// ============================================================================
export class LocalJsonRepository implements Repository {
  // ---------- Schools ----------
  async getSchool(id: string): Promise<School | null> {
    const schools = await readCollection<School>("schools", []);
    return schools.find((s) => s.id === id) ?? null;
  }

  async listSchools(): Promise<School[]> {
    return readCollection<School>("schools", []);
  }

  async createSchool(input: Omit<School, "id" | "createdAt">): Promise<School> {
    const schools = await readCollection<School>("schools", []);
    const school: School = { ...input, id: generateId("school"), createdAt: new Date().toISOString() };
    schools.push(school);
    await writeCollection("schools", schools);
    return school;
  }

  // ---------- Classes ----------
  async listClasses(schoolId: string): Promise<ClassGroup[]> {
    const classes = await readCollection<ClassGroup>("classes", []);
    return classes.filter((c) => c.schoolId === schoolId).map(withClassDefaults);
  }

  async getClass(id: string): Promise<ClassGroup | null> {
    const found = (await readCollection<ClassGroup>("classes", [])).find((c) => c.id === id);
    return found ? withClassDefaults(found) : null;
  }

  async createClass(input: Omit<ClassGroup, "id" | "createdAt" | "retestWave" | "riasecEnabled" | "curriculumTerm">): Promise<ClassGroup> {
    const classes = await readCollection<ClassGroup>("classes", []);
    const created: ClassGroup = {
      ...input,
      retestWave: null,
      riasecEnabled: false,
      curriculumTerm: DEFAULT_TERM,
      id: generateId("class"),
      createdAt: new Date().toISOString(),
    };
    classes.push(created);
    await writeCollection("classes", classes);
    return created;
  }

  async setClassCurriculumTerm(classId: string, term: CurriculumTerm): Promise<void> {
    const classes = await readCollection<ClassGroup>("classes", []);
    const idx = classes.findIndex((c) => c.id === classId);
    if (idx === -1) throw new NotFoundError("ClassGroup", classId);
    classes[idx] = { ...classes[idx]!, curriculumTerm: term };
    await writeCollection("classes", classes);
  }

  async setClassRiasec(classId: string, enabled: boolean): Promise<void> {
    const classes = await readCollection<ClassGroup>("classes", []);
    const idx = classes.findIndex((c) => c.id === classId);
    if (idx === -1) throw new NotFoundError("ClassGroup", classId);
    classes[idx] = { ...classes[idx]!, riasecEnabled: enabled };
    await writeCollection("classes", classes);
  }

  async setClassRetestWave(classId: string, wave: string | null): Promise<void> {
    const classes = await readCollection<ClassGroup>("classes", []);
    const idx = classes.findIndex((c) => c.id === classId);
    if (idx === -1) throw new NotFoundError("ClassGroup", classId);
    classes[idx] = { ...classes[idx]!, retestWave: wave };
    await writeCollection("classes", classes);
  }

  // ---------- Teachers ----------
  async listTeachers(schoolId: string): Promise<TeacherAccount[]> {
    const teachers = await readCollection<TeacherAccount>("teachers", []);
    return teachers.filter((t) => t.schoolId === schoolId);
  }

  async getTeacherByEmail(email: string): Promise<TeacherAccount | null> {
    const teachers = await readCollection<TeacherAccount>("teachers", []);
    return teachers.find((t) => t.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
  }

  async getTeacher(id: string): Promise<TeacherAccount | null> {
    return (await readCollection<TeacherAccount>("teachers", [])).find((t) => t.id === id) ?? null;
  }

  async createTeacher(input: Omit<TeacherAccount, "id" | "createdAt">): Promise<TeacherAccount> {
    const teachers = await readCollection<TeacherAccount>("teachers", []);
    const email = input.email.trim().toLowerCase();
    if (teachers.some((t) => t.email.toLowerCase() === email)) throw new Error("Email giao vien da ton tai");
    const teacher: TeacherAccount = { ...input, email, id: generateId("teacher"), createdAt: new Date().toISOString() };
    teachers.push(teacher);
    await writeCollection("teachers", teachers);
    return teacher;
  }

  async getTeacherCredentials(teacherId: string): Promise<TeacherCredentials | null> {
    return (await readCollection<TeacherCredentials>("teacher_credentials", [])).find((c) => c.teacherId === teacherId) ?? null;
  }

  async saveTeacherCredentials(credentials: TeacherCredentials): Promise<void> {
    const all = await readCollection<TeacherCredentials>("teacher_credentials", []);
    const idx = all.findIndex((c) => c.teacherId === credentials.teacherId);
    if (idx === -1) all.push(credentials);
    else all[idx] = credentials;
    await writeCollection("teacher_credentials", all);
  }

  // ---------- Students ----------
  async listStudentsByClass(classId: string): Promise<Student[]> {
    const students = await readCollection<Student>("students", []);
    return students.filter((s) => s.classId === classId);
  }

  async listStudentsBySchool(schoolId: string): Promise<Student[]> {
    const classIds = new Set((await this.listClasses(schoolId)).map((c) => c.id));
    const students = await readCollection<Student>("students", []);
    return students.filter((s) => classIds.has(s.classId));
  }

  async getStudent(id: string): Promise<Student | null> {
    const students = await readCollection<Student>("students", []);
    return students.find((s) => s.id === id) ?? null;
  }

  async getStudentByCode(code: string): Promise<Student | null> {
    const students = await readCollection<Student>("students", []);
    return students.find((s) => s.studentCode.toLowerCase() === code.toLowerCase()) ?? null;
  }

  async createStudent(input: NewStudent): Promise<Student> {
    const students = await readCollection<Student>("students", []);
    const student: Student = { ...input, id: generateId("student"), createdAt: new Date().toISOString() };
    students.push(student);
    await writeCollection("students", students);
    return student;
  }

  async updateStudent(id: string, patch: Partial<NewStudent>): Promise<Student> {
    const students = await readCollection<Student>("students", []);
    const idx = students.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundError("Student", id);
    const current = students[idx]!;
    const updated: Student = { ...current, ...patch };
    students[idx] = updated;
    await writeCollection("students", students);
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    const students = await readCollection<Student>("students", []);
    await writeCollection(
      "students",
      students.filter((s) => s.id !== id)
    );
    // Xoa KEM moi du lieu cua hoc sinh (giong "on delete cascade" o Supabase) - truoc day
    // cau tra loi, hoat dong, ho so... con nam lai sau khi xoa hoc sinh.
    for (const c of STUDENT_DATA_COLLECTIONS) {
      const rows = await readCollection<{ studentId: string }>(c, []);
      if (rows.some((r) => r.studentId === id)) await writeCollection(c, rows.filter((r) => r.studentId !== id));
    }
  }

  // ---------- Survey questions ----------
  async listSurveyQuestions(): Promise<SurveyQuestion[]> {
    const questions = await readCollection<SurveyQuestion>("survey_questions", SURVEY_QUESTIONS);
    return questions.map(withQuestionDefaults).sort((a, b) => a.order - b.order);
  }

  async upsertSurveyQuestion(question: SurveyQuestion): Promise<SurveyQuestion> {
    const questions = await readCollection<SurveyQuestion>("survey_questions", SURVEY_QUESTIONS);
    const idx = questions.findIndex((q) => q.id === question.id);
    if (idx === -1) questions.push(question);
    else questions[idx] = question;
    await writeCollection("survey_questions", questions);
    return question;
  }

  async deleteSurveyQuestion(id: string): Promise<void> {
    const questions = await readCollection<SurveyQuestion>("survey_questions", SURVEY_QUESTIONS);
    await writeCollection(
      "survey_questions",
      questions.filter((q) => q.id !== id)
    );
  }

  // ---------- Lan lam khao sat & cau tra loi ----------
  async listResponsesByStudent(studentId: string): Promise<SurveyResponse[]> {
    return this.listResponsesByStudents([studentId]);
  }

  async listResponsesByStudents(studentIds: string[]): Promise<SurveyResponse[]> {
    return [...latestAttempts(await this.listSurveyAttempts(studentIds)).values()].flatMap((a) => a.responses);
  }

  async listSurveyAttempts(studentIds: string[]): Promise<SurveyAttemptWithResponses[]> {
    const ids = new Set(studentIds);
    const [attempts, rows] = await Promise.all([
      readCollection<SurveyAttempt>("survey_attempts", []),
      readCollection<StoredSurveyResponse>("survey_responses", []),
    ]);
    const byAttempt = new Map<string, SurveyResponse[]>();
    const legacy = new Map<string, SurveyAttempt>();
    for (const row of rows) {
      if (!ids.has(row.studentId)) continue;
      // Ban ghi truoc 10/2026 chua thuoc lan lam nao (moi em 1 bo dap an, lam lai thi ghi de) => coi la lan "T1".
      const attemptId = row.attemptId ?? `legacy_${row.studentId}`;
      const r: SurveyResponse = { ...row, attemptId, surveyVersion: row.surveyVersion ?? null, displayPosition: row.displayPosition ?? null, questionPosition: row.questionPosition ?? null, firstAnsweredMs: row.firstAnsweredMs ?? null };
      byAttempt.set(attemptId, [...(byAttempt.get(attemptId) ?? []), r]);
      if (!row.attemptId) {
        const prev = legacy.get(attemptId);
        const completedAt = prev && prev.completedAt > r.answeredAt ? prev.completedAt : r.answeredAt;
        legacy.set(attemptId, { id: attemptId, studentId: row.studentId, measurementWave: "T1", surveyVersion: r.surveyVersion, curriculumTerm: null, startedAt: null, completedAt });
      }
    }
    return [...attempts.filter((a) => ids.has(a.studentId)), ...legacy.values()]
      .map((a) => ({ ...a, curriculumTerm: a.curriculumTerm ?? null, responses: byAttempt.get(a.id) ?? [] }))
      .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  }

  async createSurveyAttempt(input: NewSurveyAttempt): Promise<SurveyAttempt> {
    const now = new Date().toISOString();
    const { answers, ...meta } = input;
    const attempt: SurveyAttempt = { ...meta, id: generateId("attempt"), completedAt: now };
    const responses = await readCollection<SurveyResponse>("survey_responses", []);
    for (const a of answers) {
      responses.push({ ...a, id: generateId("resp"), studentId: input.studentId, attemptId: attempt.id, surveyVersion: input.surveyVersion, answeredAt: now });
    }
    await writeCollection("survey_responses", responses);
    // Ghi lan lam SAU CUNG: dut giua chung thi dap an mo coi khong thuoc lan lam nao va khong duoc doc ra.
    const attempts = await readCollection<SurveyAttempt>("survey_attempts", []);
    attempts.push(attempt);
    await writeCollection("survey_attempts", attempts);
    return attempt;
  }

  // ---------- Potential profile ----------
  async getProfile(studentId: string): Promise<PotentialProfile | null> {
    return (await this.listProfilesByStudents([studentId]))[0] ?? null;
  }

  async listProfilesByStudents(studentIds: string[]): Promise<PotentialProfile[]> {
    const ids = new Set(studentIds);
    const profiles = await readCollection<PotentialProfile>("potential_profiles", []);
    return profiles.filter((p) => ids.has(p.studentId)).map(withProfileDefaults);
  }

  async saveProfile(profile: PotentialProfile): Promise<void> {
    const profiles = await readCollection<PotentialProfile>("potential_profiles", []);
    const idx = profiles.findIndex((p) => p.studentId === profile.studentId);
    if (idx === -1) profiles.push(profile);
    else profiles[idx] = profile;
    await writeCollection("potential_profiles", profiles);
  }

  async listSnapshots(studentId: string): Promise<ProfileSnapshot[]> {
    return this.listSnapshotsByStudents([studentId]);
  }

  async listSnapshotsByStudents(studentIds: string[]): Promise<ProfileSnapshot[]> {
    const ids = new Set(studentIds);
    const snapshots = await readCollection<ProfileSnapshot>("profile_snapshots", []);
    return snapshots
      .filter((s) => ids.has(s.studentId))
      .map(withSnapshotDefaults)
      .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  }

  async saveSnapshot(snapshot: ProfileSnapshot): Promise<void> {
    const snapshots = await readCollection<ProfileSnapshot>("profile_snapshots", []);
    const idx = snapshots.findIndex(
      (s) => s.studentId === snapshot.studentId && s.weekStartDate === snapshot.weekStartDate
    );
    if (idx === -1) snapshots.push(snapshot);
    else snapshots[idx] = snapshot;
    await writeCollection("profile_snapshots", snapshots);
  }

  // ---------- Activities ----------
  async listActivities(): Promise<Activity[]> {
    return (await readCollection<Activity>("activities", ACTIVITIES)).map(withActivityDefaults);
  }

  async upsertActivity(activity: Activity): Promise<Activity> {
    const activities = await readCollection<Activity>("activities", ACTIVITIES);
    const idx = activities.findIndex((a) => a.id === activity.id);
    if (idx === -1) activities.push(activity);
    else activities[idx] = activity;
    await writeCollection("activities", activities);
    return activity;
  }

  async deleteActivity(id: string): Promise<void> {
    const activities = await readCollection<Activity>("activities", ACTIVITIES);
    await writeCollection(
      "activities",
      activities.filter((a) => a.id !== id)
    );
  }

  // ---------- Activity logs ----------
  async listActivityLogsByStudent(studentId: string): Promise<ActivityLog[]> {
    return this.listActivityLogsByStudents([studentId]);
  }

  async listActivityLogsByStudents(studentIds: string[]): Promise<ActivityLog[]> {
    const ids = new Set(studentIds);
    const logs = await readCollection<ActivityLog>("activity_logs", []);
    return logs
      .filter((l) => ids.has(l.studentId))
      .map(withLogDefaults)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async listAllActivityRatings(): Promise<Pick<ActivityLog, "activityId" | "interestRating">[]> {
    const logs = await readCollection<ActivityLog>("activity_logs", []);
    return logs.map((l) => ({ activityId: l.activityId, interestRating: l.interestRating }));
  }

  async createActivityLog(input: NewActivityLog): Promise<ActivityLog> {
    const logs = await readCollection<ActivityLog>("activity_logs", []);
    const log: ActivityLog = {
      ...input,
      id: generateId("alog"),
      createdAt: new Date().toISOString(),
      syncedAt: input.source === "online" ? new Date().toISOString() : null,
    };
    logs.push(log);
    await writeCollection("activity_logs", logs);
    return log;
  }

  async updateActivityLog(id: string, patch: ActivityLogPatch): Promise<ActivityLog> {
    const logs = await readCollection<ActivityLog>("activity_logs", []);
    const idx = logs.findIndex((l) => l.id === id);
    if (idx < 0) throw new NotFoundError("ActivityLog", id);
    const updated: ActivityLog = { ...withLogDefaults(logs[idx]!), ...patch };
    logs[idx] = updated;
    await writeCollection("activity_logs", logs);
    return updated;
  }

  // ---------- Saved activities (de danh lam sau) ----------
  async listSavedActivities(studentId: string): Promise<SavedActivity[]> {
    const saved = await readCollection<SavedActivity>("saved_activities", []);
    return saved.filter((x) => x.studentId === studentId).sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  }

  async saveActivityForLater(studentId: string, activityId: string): Promise<void> {
    const saved = await readCollection<SavedActivity>("saved_activities", []);
    if (saved.some((x) => x.studentId === studentId && x.activityId === activityId)) return;
    saved.push({ id: generateId("saved"), studentId, activityId, savedAt: new Date().toISOString() });
    await writeCollection("saved_activities", saved);
  }

  async removeSavedActivity(studentId: string, activityId: string): Promise<void> {
    const saved = await readCollection<SavedActivity>("saved_activities", []);
    await writeCollection(
      "saved_activities",
      saved.filter((x) => !(x.studentId === studentId && x.activityId === activityId))
    );
  }

  // ---------- Resources ----------
  async listResources(): Promise<Resource[]> {
    return readCollection<Resource>("resources", RESOURCES);
  }

  async upsertResource(resource: Resource): Promise<Resource> {
    const resources = await readCollection<Resource>("resources", RESOURCES);
    const idx = resources.findIndex((r) => r.id === resource.id);
    if (idx === -1) resources.push(resource);
    else resources[idx] = resource;
    await writeCollection("resources", resources);
    return resource;
  }

  async deleteResource(id: string): Promise<void> {
    const resources = await readCollection<Resource>("resources", RESOURCES);
    await writeCollection(
      "resources",
      resources.filter((r) => r.id !== id)
    );
  }

  async createQuizAttempt(input: NewQuizAttempt): Promise<QuizAttempt> {
    const attempts = await readCollection<QuizAttempt>("quiz_attempts", []);
    if (attempts.some((a) => a.studentId === input.studentId && a.activityId === input.activityId && a.date === input.date)) {
      throw new Error("Quiz da lam hom nay (unique student, activity, date)");
    }
    const created: QuizAttempt = { ...input, id: generateId("quiz"), createdAt: new Date().toISOString() };
    attempts.push(created);
    await writeCollection("quiz_attempts", attempts);
    return created;
  }

  async listQuizAttempts(studentIds: string[]): Promise<QuizAttempt[]> {
    const ids = new Set(studentIds);
    return (await readCollection<QuizAttempt>("quiz_attempts", [])).filter((a) => ids.has(a.studentId));
  }

  async createRiasecAttempt(input: Omit<RiasecAttempt, "id">): Promise<RiasecAttempt> {
    const attempts = await readCollection<RiasecAttempt>("riasec_attempts", []);
    if (attempts.some((a) => a.studentId === input.studentId)) throw new Error("Em da lam bai RIASEC (unique student)");
    const created: RiasecAttempt = { ...input, id: generateId("riasec") };
    attempts.push(created);
    await writeCollection("riasec_attempts", attempts);
    return created;
  }

  async listRiasecAttempts(studentIds: string[]): Promise<RiasecAttempt[]> {
    const ids = new Set(studentIds);
    return (await readCollection<RiasecAttempt>("riasec_attempts", [])).filter((a) => ids.has(a.studentId));
  }

  async recordSurveyOpen(studentId: string, measurementWave: string): Promise<void> {
    const opens = await readCollection<SurveyOpen>("survey_opens", []);
    opens.push({ id: generateId("sopen"), studentId, measurementWave, openedAt: new Date().toISOString() });
    await writeCollection("survey_opens", opens);
  }

  async listSurveyOpens(studentIds: string[]): Promise<SurveyOpen[]> {
    const ids = new Set(studentIds);
    return (await readCollection<SurveyOpen>("survey_opens", [])).filter((o) => ids.has(o.studentId));
  }

  // ---------- Du lieu danh gia ----------
  async logRecommendationEvent(event: Omit<RecommendationEvent, "id" | "createdAt">): Promise<void> {
    const events = await readCollection<RecommendationEvent>("recommendation_events", []);
    const dup = events.some(
      (e) =>
        e.studentId === event.studentId && e.date === event.date && e.activityId === event.activityId && e.event === event.event
    );
    if (dup) return;
    events.push({ ...event, id: generateId("rev"), createdAt: new Date().toISOString() });
    await writeCollection("recommendation_events", events);
  }

  async listRecommendationEvents(studentIds: string[]): Promise<RecommendationEvent[]> {
    const ids = new Set(studentIds);
    return (await readCollection<RecommendationEvent>("recommendation_events", []))
      .filter((e) => ids.has(e.studentId))
      .map((e) => ({ ...e, propensity: e.propensity ?? null, nCandidates: e.nCandidates ?? null }));
  }

  async saveOutcomeLabel(label: NewOutcomeLabel): Promise<OutcomeLabel> {
    const labels = await readCollection<OutcomeLabel>("outcome_labels", []);
    const saved: OutcomeLabel = { ...label, id: generateId("label"), createdAt: new Date().toISOString() };
    labels.push(saved);
    await writeCollection("outcome_labels", labels);
    return saved;
  }

  async listOutcomeLabels(studentIds: string[]): Promise<OutcomeLabel[]> {
    const ids = new Set(studentIds);
    return (await readCollection<StoredOutcomeLabel>("outcome_labels", []))
      .filter((l) => ids.has(l.studentId))
      .map(withLabelDefaults)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async appendAuditLog(entry: NewContentAuditEntry): Promise<void> {
    const log = await readCollection<ContentAuditEntry>("content_audit_log", []);
    log.push({ ...entry, id: generateId("audit"), createdAt: new Date().toISOString() });
    await writeCollection("content_audit_log", log);
  }

  async listAuditLog(limit: number): Promise<ContentAuditEntry[]> {
    const log = await readCollection<ContentAuditEntry>("content_audit_log", []);
    return [...log].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  // ---------- Weekly review ----------
  async listWeeklyReviews(studentId: string): Promise<WeeklyReview[]> {
    const reviews = await readCollection<WeeklyReview>("weekly_reviews", []);
    return reviews
      .filter((r) => r.studentId === studentId)
      .map((r) => ({ ...r, model: r.model ?? null, promptVersion: r.promptVersion ?? null }))
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  }

  async saveWeeklyReview(review: WeeklyReview): Promise<void> {
    const reviews = await readCollection<WeeklyReview>("weekly_reviews", []);
    const idx = reviews.findIndex((r) => r.studentId === review.studentId && r.weekStartDate === review.weekStartDate);
    if (idx === -1) reviews.push(review);
    else reviews[idx] = review;
    await writeCollection("weekly_reviews", reviews);
  }
}

const STUDENT_DATA_COLLECTIONS = [
  "quiz_attempts",
  "riasec_attempts",
  "survey_attempts",
  "survey_opens",
  "survey_responses",
  "potential_profiles",
  "profile_snapshots",
  "activity_logs",
  "saved_activities",
  "weekly_reviews",
  "recommendation_events",
  "outcome_labels",
];

// Ban ghi JSON cu (truoc 10/2026) chua co cac truong moi -> dien gia tri mac dinh khi doc.
type StoredSurveyResponse = Omit<SurveyResponse, "attemptId" | "displayPosition" | "questionPosition" | "firstAnsweredMs"> &
  Partial<Pick<SurveyResponse, "attemptId" | "displayPosition" | "questionPosition" | "firstAnsweredMs">>;
type StoredOutcomeLabel = Omit<OutcomeLabel, "labelPhase" | "preferredDomains"> &
  Partial<Pick<OutcomeLabel, "labelPhase" | "preferredDomains">> & { preferredDomain?: DomainCode | null };

function withClassDefaults(c: ClassGroup): ClassGroup {
  return { ...c, retestWave: c.retestWave ?? null, riasecEnabled: c.riasecEnabled ?? false, curriculumTerm: c.curriculumTerm ?? DEFAULT_TERM };
}
// JSON truoc 11/2026: cau chua co hoc ky / trang thai / trong so luong.
function withQuestionDefaults(q: SurveyQuestion): SurveyQuestion {
  return {
    ...q,
    curriculumTerm: q.curriculumTerm ?? "ALL",
    active: q.active ?? true,
    options: q.options.map((o) => ({ ...o, trackWeights: o.trackWeights ?? {} })),
  };
}
function withLabelDefaults({ preferredDomain, ...l }: StoredOutcomeLabel): OutcomeLabel {
  return { ...l, labelPhase: l.labelPhase ?? "post_result", preferredDomains: l.preferredDomains ?? (preferredDomain ? [preferredDomain] : []) };
}
function withLogDefaults(l: ActivityLog): ActivityLog {
  return {
    ...l,
    confidence: l.confidence ?? null,
    difficulty: l.difficulty ?? null,
    note: l.note ?? "",
    isExtra: l.isExtra ?? false,
    startedAt: l.startedAt ?? null,
    finishedAt: l.finishedAt ?? null,
  };
}
function withActivityDefaults(a: Activity): Activity {
  // Du lieu JSON cu chua co quiz => lay quiz soan san cua dung hoat dong (neu co).
  const quiz = a.quiz ?? ACTIVITIES.find((x) => x.id === a.id)?.quiz ?? [];
  return {
    ...a,
    secondaryDomain: a.secondaryDomain ?? null,
    mediaUrl: a.mediaUrl ?? null,
    example: a.example ?? "",
    curriculumTerm: a.curriculumTerm ?? "ALL",
    quiz,
  };
}
function withProfileDefaults(p: PotentialProfile): PotentialProfile {
  return {
    ...p,
    insightProvenance: p.insightProvenance ?? null,
    components: p.components ?? [],
    track: p.track ?? null,
    scoringVersion: p.scoringVersion ?? null,
    contentHash: p.contentHash ?? null,
  };
}
function withSnapshotDefaults(s: ProfileSnapshot): ProfileSnapshot {
  return {
    ...s,
    components: s.components ?? [],
    track: s.track ?? null,
    scoringVersion: s.scoringVersion ?? null,
    contentHash: s.contentHash ?? null,
    reason: s.reason ?? null,
    dataCutoffAt: s.dataCutoffAt ?? null,
    nResponses: s.nResponses ?? null,
    nActivityLogs: s.nActivityLogs ?? null,
  };
}
