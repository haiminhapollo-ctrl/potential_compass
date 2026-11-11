// ============================================================================
// KIEU DU LIEU DUNG CHUNG - Potential Compass
// File nay la "nguon su that" duy nhat cho hinh dang du liệu: schema Supabase
// (supabase/schema.sql), local JSON store, va toan bo UI deu bam theo cac
// interface o day. Sua du lieu o dau thi nho doi ca 3 noi cho khop.
// ============================================================================

/** Ma 8 nhom linh vuc - xem chi tiet noi dung tai src/lib/domains.ts */
export type DomainCode =
  | "KHOA_HOC_KHAM_PHA"
  | "KY_THUAT_CONG_NGHE"
  | "NONG_LAM_NGU_MOI_TRUONG"
  | "KINH_DOANH_DICH_VU"
  | "SUC_KHOE_CONG_DONG"
  | "NGHE_THUAT_SANG_TAO"
  | "XA_HOI_GIAO_DUC_NHAN_VAN"
  | "THE_CHAT_THU_CONG";

export interface Domain {
  code: DomainCode;
  name: string;
  shortDescription: string;
  whyRelevant: string;
  sampleCareers: string[];
  /** Nghe hoc duoc ngay sau lop 9 (trung cap/cao dang he 9+). null = nhom KHONG co nhanh nghe sau lop 9 (academicOnly). */
  vocationalBranch: string | null;
  /** Huong hoc tiep THPT roi cao dang/dai hoc. */
  academicBranch: string;
  /** Rang buoc cung: nghe cua nhom bat buoc hoc tiep THPT + cao dang/dai hoc (Y - Duoc, Su pham). */
  academicOnly: boolean;
  icon: string; // emoji hien canh ten nhom
  colorHex: string; // dung cho bieu do ho so (WCAG AA tren nen trang)
}

/** Hoc ky theo Chuong trinh GDPT 2018 (Cong nghe 8, Cong nghe 9 dinh huong nghe nghiep). */
export type CurriculumTerm = "G8_HK1" | "G8_HK2" | "G9_HK1" | "G9_HK2";
/** Cau hoi / hoat dong dung cho moi hoc ky ("ALL" = bo cau NEO dung chung, so sanh duoc giua cac ky). */
export type ContentTerm = CurriculumTerm | "ALL";

/**
 * Luong goi y sau lop 9. DUAL_EXPLORATION = chua du can cu / chua toi hoc ky chot luong (G9_HK2).
 * CHI hien cho GIAO VIEN - nhan luong la goi y de trao doi voi gia dinh, khong phai ket luan cho hoc sinh.
 */
export type RecommendedTrack = "VOCATIONAL_9PLUS" | "ACADEMIC_HIGH_SCHOOL" | "DUAL_EXPLORATION";

/** Trong so thien huong cua 1 dap an: thuc hanh/lam nghe (vocational) hay tim hieu ly thuyet/hoc thuat (academic). */
export interface TrackWeights {
  vocational?: number;
  academic?: number;
}

/** Thien huong luong cua 1 hoc sinh - tinh cung luc voi diem 8 nhom (scoring.ts), luu kem ho so + snapshot. */
export interface TrackProfile {
  recommendedTrack: RecommendedTrack;
  /** 0-100, phan vi so voi nguoi chon ngau nhien (50 = ngang chon bua). */
  vocationalAffinity: number;
  academicAffinity: number;
  /**
   * 0-100: phan vi cua (tong thuc hanh - tong hoc thuat) so voi nguoi chon ngau nhien. 50 = can bang, > 50 nghieng
   * thuc hanh. Hai diem rieng o tren nguoc chieu nhau gan hoan toan (1 dap an thuong chi mang 1 huong) nen hieu cua
   * chung KHONG dung de quyet dinh; nhan luong dua tren `lean` (scoring.ts).
   */
  lean: number;
  /** Ly do nhan khong phai DUAL: "khoa_cung" = nhom dung dau la Y/Su pham; "chenh_lech" = hai diem cach nhau du xa. */
  reason: "khoa_cung" | "chenh_lech" | "chua_du_can_cu" | "chua_toi_hoc_ky_chot";
}

export type UserRole = "student" | "teacher" | "admin";

export interface School {
  id: string;
  name: string;
  province: string;
  createdAt: string;
}

export interface ClassGroup {
  id: string;
  schoolId: string;
  name: string; // vd: "9A1"
  teacherId: string | null;
  /** Dot khao sat lai giao vien dang mo cho ca lop ("T2", "T3"...) - null = khong mo (bao cao B1). */
  retestWave: string | null;
  /** Lop nam trong MAU CON lam them bai doi chieu RIASEC (O*NET Mini-IP) - giao vien bat (B1 hieu luc hoi tu). */
  riasecEnabled: boolean;
  /** Hoc ky lop dang hoc - quyet dinh goi cau hoi + hoat dong theo chuong trinh. Giao vien doi o trang Lop hoc. */
  curriculumTerm: CurriculumTerm;
  createdAt: string;
}

export interface TeacherAccount {
  id: string;
  schoolId: string;
  fullName: string;
  email: string; // luu chu thuong
  role: Extract<UserRole, "teacher" | "admin">;
  createdAt: string;
}

/**
 * Thong tin dang nhap giao vien - BANG RIENG (teacher_credentials), khong bao gio
 * tra ve giao dien. sessionVersion tang khi doi/dat lai mat khau => moi phien cu het hieu luc.
 */
export interface TeacherCredentials {
  teacherId: string;
  passwordHash: string | null; // null = chua dat mat khau, khong dang nhap duoc
  mustChangePassword: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
  sessionVersion: number;
  passwordUpdatedAt: string | null;
}

export interface Student {
  id: string;
  classId: string;
  studentCode: string; // ma dang nhap rieng, KHONG dung email/SDT ca nhan
  displayName: string;
  parentConsentConfirmed: boolean; // xac nhan phu huynh - bat buoc truoc Pilot (muc VI)
  createdAt: string;
}

export interface SurveyOption {
  id: string;
  text: string;
  /** Trong so cong vao tung nhom linh vuc khi hoc sinh chon dap an nay (thuong 1-2 nhom, 1-3 diem) */
  domainWeights: Partial<Record<DomainCode, number>>;
  /** Thien huong luong cua dap an ({} = trung tinh). Tinh diem vocational/academic (scoring.ts). */
  trackWeights: TrackWeights;
}

export interface SurveyQuestion {
  id: string;
  order: number;
  scenario: string; // tinh huong thuc te, khong hoi truc dien "em co thich..."
  options: SurveyOption[];
  /** "ALL" = cau neo (moi hoc ky); con lai chi hien cho lop dang o hoc ky do. */
  curriculumTerm: ContentTerm;
  /**
   * false = cau DA THAY (noi dung doi nghia, vd 11/2026 "choi the thao" khi nhom doi thanh Xay dung - Co khi).
   * Khong hien, khong cham, nhung GIU trong DB de cau tra loi cu khong bi xoa day chuyen.
   */
  active: boolean;
}

/**
 * MOT LAN LAM khao sat (bao cao B1): moi lan nop la 1 attempt rieng, KHONG ghi de lan truoc
 * => ghep duoc T1/T2 cua cung hoc sinh de kiem tra do on dinh (test-retest).
 */
export interface SurveyAttempt {
  id: string;
  studentId: string;
  /**
   * "T1" = lan lam dau tien, "T2"/"T3"... = dot khao sat lai giao vien mo cho lop: ca hai deu la FORM TRONG.
   * null = lam lai tu nguyen / tra loi bo sung cau moi (dap an cu duoc chon san) - KHONG dung cho test-retest.
   */
  measurementWave: string | null;
  surveyVersion: string | null; // contentHash bo cau hoi luc lam
  /** Hoc ky cua lop luc em lam (gom bai theo ky khi phan tich). null = du lieu truoc 11/2026. */
  curriculumTerm: CurriculumTerm | null;
  /** Luc trang khao sat duoc mo (server ghi vao form). null = khong hop le / du lieu cu. */
  startedAt: string | null;
  completedAt: string;
}

export interface SurveyResponse {
  id: string;
  studentId: string;
  attemptId: string;
  questionId: string;
  optionId: string;
  /** contentHash cua bo cau hoi LUC tra loi - biet hoc sinh da thay phien ban van ban nao (null = du lieu cu) */
  surveyVersion: string | null;
  /** Vi tri (0 = tren cung) cua dap an tren man hinh cua em - thu tu dap an xao theo tung hoc sinh. null = du lieu cu (thu tu co dinh). */
  displayPosition: number | null;
  /** Vi tri (0 = cau dau tien) cua CAU HOI tren trang cua em - thu tu cau xao theo tung hoc sinh. null = du lieu truoc 18/10/2026 (thu tu co dinh theo `order`). */
  questionPosition: number | null;
  /** So ms tu luc mo trang toi luc em chon cau nay LAN DAU (bai form trong, client ghi). null = khong do duoc / du lieu cu. */
  firstAnsweredMs: number | null;
  answeredAt: string;
}

/** Moi lan em MO bai khao sat form trong (T1, T2...) - mo ma chua co lan nop cung dot = dang bo do (de xuat A4). */
export interface SurveyOpen {
  id: string;
  studentId: string;
  measurementWave: string;
  openedAt: string;
}

export interface SurveyAttemptWithResponses extends SurveyAttempt {
  responses: SurveyResponse[];
}

export interface NewSurveyAttempt {
  studentId: string;
  measurementWave: string | null;
  surveyVersion: string;
  curriculumTerm: CurriculumTerm | null;
  startedAt: string | null;
  answers: { questionId: string; optionId: string; displayPosition: number | null; questionPosition: number | null; firstAnsweredMs: number | null }[];
}

export interface DomainScore {
  domain: DomainCode;
  /** 0-100. 50 = ngang muc cua nguoi chon NGAU NHIEN (xem scoring.ts), cao hon = nghieng ve nhom nay */
  score: number;
  rank: number; // 1 = cao nhat
  /**
   * Nhan "Noi bat": cao hon han muc ma nguoi tra loi BUA co the dat (nguong hieu chuan theo ca 8 nhom,
   * xem notableThreshold trong scoring.ts). undefined = ho so tinh bang cong thuc cu (truoc v4).
   */
  notable?: boolean;
}

/**
 * Thanh phan THO tao nen diem moi nhom - luu cung ho so/snapshot de tai lap
 * va phan tich lai sau nay (diem 0-100 thoi khong khoi phuc duoc diem tho).
 */
export interface DomainScoreComponents {
  domain: DomainCode;
  surveyRaw: number; // tong trong so dap an da chon
  surveyScore: number; // 0-100, phan vi so voi nguoi chon ngau nhien (chua lam tron)
  activityShift: number; // diem cong/tru tu danh gia hoat dong (da co co, co can)
  ratingEvidence: number; // tong trong so cac lan danh gia thuoc nhom nay
}

/** Nguon goc doan nhan xet sinh ra (bao cao DS loi 1, 15) */
export interface InsightProvenance {
  source: "gemini" | "template";
  model: string | null; // vd "gemini-3.5-flash-lite"; null voi template
  promptVersion: string;
  generatedAt: string;
}

export interface PotentialProfile {
  studentId: string;
  scores: DomainScore[];
  topDomains: DomainCode[]; // top 3, sap xep giam dan
  surveyCompleted: boolean;
  activitiesCompletedCount: number;
  lastInsight: string | null; // nhan xet AI (hoac template) gan nhat
  insightProvenance: InsightProvenance | null;
  components: DomainScoreComponents[]; // [] voi du lieu cu
  /** Thien huong luong (CHI giao vien xem). null = chua tinh (ho so truoc v5 / chua lam khao sat). */
  track: TrackProfile | null;
  scoringVersion: string | null; // null = tinh bang cong thuc cu, chua tinh lai
  contentHash: string | null; // phien ban noi dung (cau hoi + trong so + hoat dong) dung de tinh
  updatedAt: string;
}

export type SnapshotReason = "event" | "cron_daily" | "recompute";

/**
 * Snapshot ho so theo tuan: MOI tuan 1 ban ghi/hoc sinh, ghi de bang trang
 * thai moi nhat trong tuan => tuan da qua giu trang thai cuoi tuan. Duoc ghi
 * sau moi su kien VA boi cron hang ngay (khong phu thuoc hoc sinh mo trang).
 */
export interface ProfileSnapshot {
  id: string;
  studentId: string;
  weekStartDate: string; // ISO date, thu 2 dau tuan
  scores: DomainScore[];
  topDomains: DomainCode[];
  components: DomainScoreComponents[];
  track: TrackProfile | null;
  scoringVersion: string | null;
  contentHash: string | null;
  reason: SnapshotReason | null;
  dataCutoffAt: string | null; // thoi diem lay du lieu
  nResponses: number | null;
  nActivityLogs: number | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  domain: DomainCode;
  /** Nhom PHU (neu hoat dong cham ca 2 nhom) - danh gia tinh vao day voi trong so 0.5 */
  secondaryDomain: DomainCode | null;
  title: string;
  description: string;
  durationMinutes: number; // 3-5 theo ke hoach
  instructions: string[];
  reflectionPrompt: string; // cau hoi goi y cho o "ke them" (tu luan, khong bat buoc) sau hoat dong
  /** Anh (.jpg/.png/...) hoac link YouTube minh hoa cach lam - giao vien dan vao, de trong neu chua co */
  mediaUrl: string | null;
  /** Vi du tham khao cach lam (giao vien soan) - KHONG lay bai lam that cua hoc sinh khac (du lieu tre em) */
  example: string;
  active: boolean;
  /** "ALL" = moi hoc ky; con lai chi goi y cho lop dang o hoc ky do (bam bai Cong nghe/KHTN tren lop). */
  curriculumTerm: ContentTerm;
  /** Cau hoi NHAN BIET NGHE sau hoat dong (11/2026: thay cau hoi kien thuc) - [] = khong co. KHONG tinh vao ho so so thich. */
  quiz: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  /** 2-4 dap an theo thu tu SOAN; hien thi xao theo tung hoc sinh (src/lib/quiz.ts). */
  options: string[];
  /** Chi so dap an dung trong options. */
  correct: number;
  explanation: string;
}

/** Mot lan em lam quiz cua 1 hoat dong (toi da 1 lan / hoat dong / ngay). */
export interface QuizAttempt {
  id: string;
  studentId: string;
  activityId: string;
  date: string;
  /** Dau van tay noi dung quiz luc lam - giao vien sua cau hoi thi biet diem cu cham tren ban nao. */
  quizVersion: string;
  answers: { questionId: string; chosen: number; correct: boolean }[];
  nCorrect: number;
  nQuestions: number;
  /** Mo quiz -> bam nop (gio may em, neo gio server - lib/activity-timing.ts). */
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export type ActivityLogSource = "online" | "offline_sync";

export interface ActivityLog {
  id: string;
  studentId: string;
  activityId: string;
  date: string; // ISO date (ngay thuc hien, khong phai luc dong bo)
  interestRating: 1 | 2 | 3 | 4 | 5;
  reflectionText: string; // cam nhan BAM CHON (xem FEELING_OPTIONS) hoac phan tu viet cua du lieu cu
  /** "Em thay minh lam duoc khong?" 1 = chua lam duoc, 2 = duoc mot phan, 3 = lam tot. null = khong tra loi */
  confidence: 1 | 2 | 3 | null;
  /** Do kho hoc sinh cam nhan: 1 = de, 2 = vua, 3 = kho. null = khong tra loi */
  difficulty: 1 | 2 | 3 | null;
  /** Phan hoc sinh tu viet them (tu luan, khong bat buoc) */
  note: string;
  /** true = hoat dong KHAM PHA THEM tu nguyen, sau khi da xong hoat dong chinh trong ngay */
  isExtra: boolean;
  source: ActivityLogSource;
  /** Lan dau em mo trang hoat dong trong ngay (tren may nay) -> luc bam hoan thanh (de xuat A5). null = khong do duoc / du lieu cu. */
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  syncedAt: string | null;
}

/** Hoat dong hoc sinh "de danh lam sau" (can chuan bi/thoi diem phu hop) - danh sach cho */
export interface SavedActivity {
  id: string;
  studentId: string;
  activityId: string;
  savedAt: string;
}

export type ResourceType = "video" | "bai_viet" | "khoa_hoc" | "khac";

export interface Resource {
  id: string;
  domain: DomainCode;
  title: string;
  description: string;
  type: ResourceType;
  durationLabel: string; // vd: "8 phut", "Doc 5 phut"
  /** Duong dan that - de trong thi hoc sinh duoc chuyen sang trang tim kiem; giao vien bo sung qua trang Quan ly tai nguyen */
  url: string | null;
  difficulty: "de" | "trung_binh" | "nang_cao";
}

export interface WeeklyReview {
  id: string;
  studentId: string;
  weekStartDate: string;
  activitiesCompleted: number;
  topDomains: DomainCode[];
  summaryText: string;
  aiGenerated: boolean;
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
}

// ---- Du lieu phuc vu danh gia (bao cao Data Science loi 4, 10, 12) ---------

/** Su kien goi y hoat dong - ghi CA hoat dong duoc goi y nhung khong lam (tranh thien lech nguoi song sot). */
/** opened = em mo trang hoat dong (form phan hoi con trong) - opened ma khong completed cung ngay = bo do (de xuat A5). */
export type RecommendationEventType = "shown" | "shown_extra" | "opened" | "swapped" | "saved" | "completed";

export interface RecommendationEvent {
  id: string;
  studentId: string;
  date: string; // ISO date gio VN
  activityId: string;
  event: RecommendationEventType;
  algoVersion: string;
  /**
   * Xac suat hoat dong nay duoc chon theo co che boc tham cua daily-pick (bao cao A3) - chi ghi
   * cho su kien "shown" (hoat dong chinh). null = su kien khac / du lieu cu.
   */
  propensity: number | null;
  /** So hoat dong co the duoc chon hom do (xac suat > 0). */
  nCandidates: number | null;
  createdAt: string;
}

/**
 * NHAN DANH GIA (ground truth) cho ho so: hoc sinh tu nhan xet "ket qua co giong
 * em khong", hoac giao vien danh gia top 3 co phu hop khong.
 *
 * labelPhase (bao cao A2): "pre_result" = hoc sinh tu chon nhom giong minh TRUOC khi xem ket qua
 * (cuoi bai khao sat, chua co agreement); "post_result" = danh gia sau khi da xem ket qua - de bi
 * neo vao dieu he thong vua noi nen phan tich RIENG.
 */
export interface OutcomeLabel {
  id: string;
  studentId: string;
  rater: "student" | "teacher";
  raterId: string;
  labelPhase: "pre_result" | "post_result";
  topDomains: DomainCode[]; // top 3 tai thoi diem danh gia
  scoringVersion: string | null;
  agreement: 1 | 2 | 3 | null; // 1 = chua dung, 2 = dung mot phan, 3 = dung. null chi voi pre_result
  /** Nhom nguoi danh gia thay phu hop nhat, theo thu tu uu tien (pre_result: toi da 3; con lai: toi da 1). */
  preferredDomains: DomainCode[];
  createdAt: string;
}

/** Nhat ky thay doi noi dung (cau hoi, hoat dong, tai nguyen) - ai sua, sua gi, khi nao. */
export interface ContentAuditEntry {
  id: string;
  entityType: "survey_question" | "activity" | "resource";
  entityId: string;
  action: "create" | "update" | "delete";
  actorId: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

// ---- Payload dung khi tao moi (khong co id/createdAt) ----------------------
export type NewStudent = Omit<Student, "id" | "createdAt">;
export type NewActivityLog = Omit<ActivityLog, "id" | "createdAt" | "syncedAt">;
export type NewQuizAttempt = Omit<QuizAttempt, "id" | "createdAt">;

/** 6 nhom so thich Holland (RIASEC). */
export type RiasecType = "R" | "I" | "A" | "S" | "E" | "C";

/** Bai doi chieu RIASEC cua 1 em (toi da 1 lan). answers: id cau -> 1 (rat khong thich) ... 5 (rat thich). */
export interface RiasecAttempt {
  id: string;
  studentId: string;
  /** Dau van tay bo cau hoi (ban dich) luc lam. */
  itemsVersion: string;
  answers: Record<string, number>;
  startedAt: string | null;
  completedAt: string;
}
export type NewOutcomeLabel = Omit<OutcomeLabel, "id" | "createdAt">;
export type NewContentAuditEntry = Omit<ContentAuditEntry, "id" | "createdAt">;
