/**
 * Doc TOAN BO du lieu (moi truong, theo lo) qua repository - dung chung cho cac
 * script phan tich/xuat du lieu. Chay voi --conditions=react-server (xem package.json).
 */
import { getRepository } from "../../src/lib/data";
import { addDaysISO, weekStartISOVN } from "../../src/lib/date";
import { DOMAINS } from "../../src/lib/domains";
import { FEELING_OPTIONS } from "../../src/lib/recommendation/feedback";
import type {
  Activity,
  ActivityLog,
  ClassGroup,
  OutcomeLabel,
  PotentialProfile,
  ProfileSnapshot,
  QuizAttempt,
  RecommendationEvent,
  RiasecAttempt,
  Student,
  SurveyAttemptWithResponses,
  SurveyOpen,
  SurveyQuestion,
  SurveyResponse,
} from "../../src/lib/types";

export interface Dataset {
  questions: SurveyQuestion[];
  activities: Activity[];
  classes: ClassGroup[];
  students: Student[];
  /** Dap an HIEN TAI (lan lam moi nhat cua moi em). Moi lan lam (T1, T2...): attempts. */
  responses: SurveyResponse[];
  attempts: SurveyAttemptWithResponses[];
  /** Moi lan MO bai form trong - doi chieu voi attempts de biet em bo do. */
  surveyOpens: SurveyOpen[];
  logs: ActivityLog[];
  profiles: PotentialProfile[];
  snapshots: ProfileSnapshot[];
  events: RecommendationEvent[];
  labels: OutcomeLabel[];
  quizAttempts: QuizAttempt[];
  riasecAttempts: RiasecAttempt[];
}

export async function loadDataset(): Promise<Dataset> {
  const repo = getRepository();
  const students: Student[] = [];
  const classes: ClassGroup[] = [];
  for (const school of await repo.listSchools()) {
    students.push(...(await repo.listStudentsBySchool(school.id)));
    classes.push(...(await repo.listClasses(school.id)));
  }
  const ids = students.map((s) => s.id);
  const [questions, activities, responses, attempts, surveyOpens, logs, profiles, snapshots, events, labels, quizAttempts, riasecAttempts] = await Promise.all([
    repo.listSurveyQuestions(),
    repo.listActivities(),
    repo.listResponsesByStudents(ids),
    repo.listSurveyAttempts(ids),
    repo.listSurveyOpens(ids),
    repo.listActivityLogsByStudents(ids),
    repo.listProfilesByStudents(ids),
    repo.listSnapshotsByStudents(ids),
    repo.listRecommendationEvents(ids),
    repo.listOutcomeLabels(ids),
    repo.listQuizAttempts(ids),
    repo.listRiasecAttempts(ids),
  ]);
  return { questions, activities, classes, students, responses, attempts, surveyOpens, logs, profiles, snapshots, events, labels, quizAttempts, riasecAttempts };
}

export function pct(num: number, den: number): string {
  return den === 0 ? "—" : `${((num / den) * 100).toFixed(1)}%`;
}

/** Entropy chuan hoa [0,1] cua phan bo dem (1 = trai deu khap cac nhom). */
export function normalizedEntropy(counts: number[], k: number): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0 || k <= 1) return 0;
  const h = counts.filter((c) => c > 0).reduce((acc, c) => acc - (c / total) * Math.log(c / total), 0);
  return h / Math.log(k);
}

/** Mot dong (hoc sinh, tuan) - dau vao cho mo hinh ngung tuong tac (analyze:models) va features_student_week.csv. */
export interface StudentWeek {
  studentId: string;
  classId: string;
  week: string; // thu Hai dau tuan (gio VN)
  active_this_week: 0 | 1;
  n_activities: number;
  mean_rating: number | null;
  n_domains: number;
  domain_entropy: number;
  max_streak_days: number;
  offline_ratio: number | null;
  mean_note_length: number | null;
  n_need_help: number;
  n_extra: number;
  n_shown: number;
  n_shown_completed: number;
  n_swapped: number;
  n_saved: number;
  /** Mo trang hoat dong ma khong lam trong ngay (bo do). */
  n_opened_not_done: number;
  /** Nhan: tuan sau co hoat dong khong. null = tuan sau chua ket thuc (chua biet). */
  active_next_week: 0 | 1 | null;
}

export const weekOfISO = (date: string) => weekStartISOVN(new Date(`${date}T12:00:00+07:00`));

/** Bang (hoc sinh, tuan) tu tuan dau em co hoat dong toi tuan hien tai - CA cac tuan sau khi em da ngung. */
export function studentWeekFeatures(d: Dataset, studentIds: Iterable<string>, currentWeek = weekStartISOVN()): StudentWeek[] {
  const domainOf = new Map(d.activities.map((a) => [a.id, a.domain] as const));
  const classOf = new Map(d.students.map((s) => [s.id, s.classId] as const));
  const active = new Set(d.logs.map((l) => `${l.studentId}|${weekOfISO(l.date)}`));
  const rows: StudentWeek[] = [];
  for (const sid of studentIds) {
    const mine = d.logs.filter((l) => l.studentId === sid);
    if (mine.length === 0) continue;
    const myEvents = d.events.filter((e) => e.studentId === sid);
    const firstWeek = weekOfISO(mine.reduce((m, l) => (l.date < m ? l.date : m), mine[0]!.date));
    for (let w = firstWeek; w <= currentWeek; w = addDaysISO(w, 7)) {
      const wl = mine.filter((l) => weekOfISO(l.date) === w);
      const we = myEvents.filter((e) => weekOfISO(e.date) === w);
      const doneThatDay = (e: { activityId: string; date: string }) => wl.some((l) => l.activityId === e.activityId && l.date === e.date);
      const days = [...new Set(wl.map((l) => l.date))].sort();
      let streak = days.length ? 1 : 0;
      for (let i = 1, run = 1; i < days.length; i++) {
        run = addDaysISO(days[i - 1]!, 1) === days[i] ? run + 1 : 1;
        streak = Math.max(streak, run);
      }
      const counts = DOMAINS.map((dm) => wl.filter((l) => domainOf.get(l.activityId) === dm.code).length);
      const shown = we.filter((e) => e.event === "shown");
      const nextWeek = addDaysISO(w, 7);
      rows.push({
        studentId: sid,
        classId: classOf.get(sid)!,
        week: w,
        active_this_week: wl.length > 0 ? 1 : 0,
        n_activities: wl.length,
        mean_rating: wl.length ? wl.reduce((a, l) => a + l.interestRating, 0) / wl.length : null,
        n_domains: counts.filter((c) => c > 0).length,
        domain_entropy: normalizedEntropy(counts, DOMAINS.length),
        max_streak_days: streak,
        offline_ratio: wl.length ? wl.filter((l) => l.source === "offline_sync").length / wl.length : null,
        mean_note_length: wl.length ? wl.reduce((a, l) => a + l.note.length, 0) / wl.length : null,
        n_need_help: wl.filter((l) => l.reflectionText === FEELING_OPTIONS[3] || l.confidence === 1).length,
        n_extra: wl.filter((l) => l.isExtra).length,
        n_shown: shown.length,
        n_shown_completed: shown.filter(doneThatDay).length,
        n_swapped: we.filter((e) => e.event === "swapped").length,
        n_saved: we.filter((e) => e.event === "saved").length,
        n_opened_not_done: we.filter((e) => e.event === "opened" && !doneThatDay(e)).length,
        active_next_week: nextWeek < currentWeek ? (active.has(`${sid}|${nextWeek}`) ? 1 : 0) : null,
      });
    }
  }
  return rows;
}
