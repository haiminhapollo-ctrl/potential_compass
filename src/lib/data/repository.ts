import type {
  Activity,
  ActivityLog,
  ClassGroup,
  ContentAuditEntry,
  CurriculumTerm,
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
  SurveyQuestion,
  SurveyResponse,
  TeacherAccount,
  TeacherCredentials,
  WeeklyReview,
} from "../types";

// ============================================================================
// REPOSITORY INTERFACE - "cong tac" duy nhat giua UI (Server Components/
// Server Actions) va tang du lieu.
// ----------------------------------------------------------------------------
// UI KHONG DUOC goi thang fs hay supabase-js - luon di qua interface nay
// (xem src/lib/data/index.ts). Nho vay:
//  - Chay tren may dev khong can Supabase that (LocalJsonRepository).
//  - Khi trien khai that, chi doi 1 dong DATA_BACKEND=supabase trong .env,
//    logic UI khong doi gi ca (SupabaseRepository).
// ============================================================================
export interface Repository {
  // --- Schools / Classes / Teachers ---
  getSchool(id: string): Promise<School | null>;
  listSchools(): Promise<School[]>;
  createSchool(input: Omit<School, "id" | "createdAt">): Promise<School>;

  listClasses(schoolId: string): Promise<ClassGroup[]>;
  getClass(id: string): Promise<ClassGroup | null>;
  createClass(input: Omit<ClassGroup, "id" | "createdAt" | "retestWave" | "riasecEnabled" | "curriculumTerm">): Promise<ClassGroup>;
  /** Mo (vd "T2") / dong (null) dot khao sat lai cho ca lop. */
  setClassRetestWave(classId: string, wave: string | null): Promise<void>;
  /** Doi hoc ky lop dang hoc (G8_HK1...G9_HK2) - doi bo cau hoi + hoat dong cua ca lop. */
  setClassCurriculumTerm(classId: string, term: CurriculumTerm): Promise<void>;
  /** Bat / tat bai doi chieu RIASEC cho ca lop (mau con - de xuat B1). */
  setClassRiasec(classId: string, enabled: boolean): Promise<void>;

  listTeachers(schoolId: string): Promise<TeacherAccount[]>;
  getTeacherByEmail(email: string): Promise<TeacherAccount | null>;
  getTeacher(id: string): Promise<TeacherAccount | null>;
  createTeacher(input: Omit<TeacherAccount, "id" | "createdAt">): Promise<TeacherAccount>;
  /** Chi dung o server cho dang nhap - KHONG truyen ra giao dien. */
  getTeacherCredentials(teacherId: string): Promise<TeacherCredentials | null>;
  saveTeacherCredentials(credentials: TeacherCredentials): Promise<void>;

  // --- Students ---
  listStudentsByClass(classId: string): Promise<Student[]>;
  /** Moi hoc sinh cua 1 truong trong 1 lan doc (tranh N+1 truy van o dashboard). */
  listStudentsBySchool(schoolId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | null>;
  getStudentByCode(code: string): Promise<Student | null>;
  createStudent(input: NewStudent): Promise<Student>;
  updateStudent(id: string, patch: Partial<NewStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // --- Survey content (co the tuy chinh boi giao vien) ---
  listSurveyQuestions(): Promise<SurveyQuestion[]>;
  upsertSurveyQuestion(question: SurveyQuestion): Promise<SurveyQuestion>;
  deleteSurveyQuestion(id: string): Promise<void>;

  // --- Lan lam khao sat & cau tra loi (de xuat B1: moi lan nop la 1 lan lam rieng, KHONG ghi de) ---
  /** Dap an cua lan lam DA HOAN THANH moi nhat (cham diem, xem lai, lam tiep cau moi). */
  listResponsesByStudent(studentId: string): Promise<SurveyResponse[]>;
  listResponsesByStudents(studentIds: string[]): Promise<SurveyResponse[]>;
  /** MOI lan lam da hoan thanh kem dap an, cu -> moi (test-retest, trang giao vien). */
  listSurveyAttempts(studentIds: string[]): Promise<SurveyAttemptWithResponses[]>;
  /**
   * Ghi 1 lan lam: tao lan lam -> ghi dap an -> danh dau hoan thanh. Dut giua chung thi lan lam
   * khong co completedAt va KHONG duoc doc ra (khong de lai bo dap an thieu lam ho so hien tai).
   */
  createSurveyAttempt(input: NewSurveyAttempt): Promise<SurveyAttempt>;
  /** Ghi 1 lan em MO bai form trong cua dot (T1, T2...) - doi chieu voi lan nop de biet em bo do (SurveyOpen). */
  recordSurveyOpen(studentId: string, measurementWave: string): Promise<void>;
  listSurveyOpens(studentIds: string[]): Promise<SurveyOpen[]>;

  // --- Quiz on nhanh sau hoat dong (A5 buoc 2) + bai doi chieu RIASEC (B1) ---
  /** Toi da 1 lan / (em, hoat dong, ngay) - lan thu hai nem loi (rang buoc unique). */
  createQuizAttempt(input: NewQuizAttempt): Promise<QuizAttempt>;
  listQuizAttempts(studentIds: string[]): Promise<QuizAttempt[]>;
  /** Toi da 1 lan / em. */
  createRiasecAttempt(input: Omit<RiasecAttempt, "id">): Promise<RiasecAttempt>;
  listRiasecAttempts(studentIds: string[]): Promise<RiasecAttempt[]>;

  // --- Potential profile ---
  getProfile(studentId: string): Promise<PotentialProfile | null>;
  listProfilesByStudents(studentIds: string[]): Promise<PotentialProfile[]>;
  saveProfile(profile: PotentialProfile): Promise<void>;
  listSnapshots(studentId: string): Promise<ProfileSnapshot[]>;
  listSnapshotsByStudents(studentIds: string[]): Promise<ProfileSnapshot[]>;
  saveSnapshot(snapshot: ProfileSnapshot): Promise<void>;

  // --- Activities (co the tuy chinh boi giao vien) ---
  listActivities(): Promise<Activity[]>;
  upsertActivity(activity: Activity): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;

  // --- Activity logs ---
  listActivityLogsByStudent(studentId: string): Promise<ActivityLog[]>;
  listActivityLogsByStudents(studentIds: string[]): Promise<ActivityLog[]>;
  /** (hoat dong, so sao) cua TAT CA hoc sinh - can giua rating theo chat luong hoat dong (scoring.ts). */
  listAllActivityRatings(): Promise<Pick<ActivityLog, "activityId" | "interestRating">[]>;
  createActivityLog(input: NewActivityLog): Promise<ActivityLog>;
  /**
   * Cap nhat mot ban ghi hoat dong DA CO (hoc sinh sua lai danh gia/phan hoi
   * trong CUNG NGAY). Dung de KHONG tao ban ghi moi -> diem khong bi tinh trung.
   */
  updateActivityLog(id: string, patch: ActivityLogPatch): Promise<ActivityLog>;

  // --- Danh sach "de danh lam sau" (hoat dong can chuan bi / doi thoi diem) ---
  listSavedActivities(studentId: string): Promise<SavedActivity[]>;
  /** Idempotent: da co trong danh sach thi khong tao ban trung. */
  saveActivityForLater(studentId: string, activityId: string): Promise<void>;
  removeSavedActivity(studentId: string, activityId: string): Promise<void>;

  // --- Resources (co the tuy chinh boi giao vien) ---
  listResources(): Promise<Resource[]>;
  upsertResource(resource: Resource): Promise<Resource>;
  deleteResource(id: string): Promise<void>;

  // --- Du lieu danh gia (bao cao Data Science loi 4, 10, 12) ---
  /** Idempotent theo (hoc sinh, ngay, hoat dong, su kien): render lai trang khong ghi trung. */
  logRecommendationEvent(event: Omit<RecommendationEvent, "id" | "createdAt">): Promise<void>;
  listRecommendationEvents(studentIds: string[]): Promise<RecommendationEvent[]>;
  saveOutcomeLabel(label: NewOutcomeLabel): Promise<OutcomeLabel>;
  listOutcomeLabels(studentIds: string[]): Promise<OutcomeLabel[]>;
  appendAuditLog(entry: NewContentAuditEntry): Promise<void>;
  listAuditLog(limit: number): Promise<ContentAuditEntry[]>;

  // --- Weekly review ---
  listWeeklyReviews(studentId: string): Promise<WeeklyReview[]>;
  saveWeeklyReview(review: WeeklyReview): Promise<void>;
}

/** Cac truong hoc sinh duoc SUA trong ngay (khong doi ngay/hoat dong/isExtra). */
export type ActivityLogPatch = Pick<NewActivityLog, "interestRating" | "reflectionText" | "confidence" | "difficulty" | "note">;

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} khong ton tai: ${id}`);
    this.name = "NotFoundError";
  }
}
