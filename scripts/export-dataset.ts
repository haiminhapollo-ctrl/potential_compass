/**
 * XUAT DU LIEU AN DANH phuc vu phan tich (bao cao DS loi 3, 21).
 *
 * Chay: npm run export:dataset   -> exports/<ngay>/*.csv (thu muc da gitignore)
 * Yeu cau EXPORT_SALT trong .env.local (giu co dinh giua cac lan xuat).
 *
 * Quy tac an danh / dao duc:
 *   - KHONG xuat ten, ma dang nhap; id hoc sinh = HMAC-SHA256(id, EXPORT_SALT) cat 16 ky tu.
 *   - LOAI hoc sinh chua co xac nhan phu huynh (parentConsentConfirmed = false).
 *   - KHONG xuat van ban tu viet (co the chua ten nguoi, dia danh) - chi xuat do dai.
 *   - File xuat chi dung noi bo nhom phan tich; khong dang cong khai.
 *
 * features_student_week.csv = BANG DAC TRUNG theo (hoc sinh, tuan) - dau vao cho mo
 * hinh sau pilot (vd du doan ngung tuong tac: cot label active_next_week). Khi co mo
 * hinh: fit bo chuan hoa CHI tren tap train (chia theo thoi gian) de tranh ro ri du lieu.
 * Bang co CA cac tuan sau khi em da ngung => du doan "ngung tuong tac" chi dung dong
 * active_this_week = 1 (neu khong, baseline "tuan sau giong tuan truoc" doan dung hang
 * loat dong "da nghi -> van nghi" va AUC cao gia). Chia train/test THEO HOC SINH va theo
 * thoi gian; cot class de phan tang (ngung hoat dong hay do lich ca lop).
 *
 * survey_attempts.csv + survey_responses.csv: MOI lan lam (T1, T2...) de tinh test-retest;
 * first_answered_ms = ms tu luc mo trang toi luc chon cau do lan dau (chi bai form trong).
 * activity_logs.csv: actual_minutes (started_at -> finished_at, gio may em) so voi expected_minutes.
 * survey_opens.csv: moi lan mo bai form trong - (em, dot) co mo ma khong co lan nop = bo do.
 * quiz_attempts.csv: quiz on nhanh sau hoat dong (diem + thoi gian); riasec_attempts.csv: diem 6 loai + tung cau.
 */
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadDataset, studentWeekFeatures } from "./lib/dataset";
import { addDaysISO, todayISOVN, weekStartISOVN } from "../src/lib/date";
import { DOMAINS } from "../src/lib/domains";
import { FEELING_OPTIONS } from "../src/lib/recommendation/feedback";
import { RIASEC_ITEMS } from "../src/lib/content/riasec-items";
import { riasecScores } from "../src/lib/riasec";
import { surveyAttemptFlags } from "../src/lib/survey";

function csv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

async function main() {
  const salt = process.env.EXPORT_SALT;
  if (!salt) throw new Error("Thieu EXPORT_SALT trong .env.local (xem .env.example).");
  const pid = (id: string) => createHmac("sha256", salt).update(id).digest("hex").slice(0, 16);

  const d = await loadDataset();
  const consented = new Set(d.students.filter((s) => s.parentConsentConfirmed).map((s) => s.id));
  const keep = <T extends { studentId: string }>(rows: T[]) => rows.filter((r) => consented.has(r.studentId));
  const domainOf = new Map(d.activities.map((a) => [a.id, a.domain] as const));
  const durationOf = new Map(d.activities.map((a) => [a.id, a.durationMinutes] as const));

  const out = join(process.cwd(), "exports", todayISOVN());
  mkdirSync(out, { recursive: true });
  const write = (name: string, rows: Record<string, unknown>[]) => {
    writeFileSync(join(out, name), csv(rows));
    console.log(`✅ ${name}: ${rows.length} dong`);
  };

  write("students.csv", d.students.filter((s) => consented.has(s.id)).map((s) => ({ student: pid(s.id), class: pid(s.classId) })));
  const attempts = keep(d.attempts);
  write(
    "survey_attempts.csv",
    attempts.map((a) => {
      const f = surveyAttemptFlags(a, d.questions);
      return {
        attempt: pid(a.id),
        student: pid(a.studentId),
        wave: a.measurementWave ?? "", // trong = lam lai tu nguyen (dap an cu chon san) - khong dung cho test-retest
        term: a.curriculumTerm ?? "", // hoc ky lop luc lam (trong = truoc 11/2026) - moi ky mot bo cau rieng
        survey_version: a.surveyVersion,
        started_at: a.startedAt,
        completed_at: a.completedAt,
        seconds: f.seconds === null ? "" : Math.round(f.seconds),
        n_answers: a.responses.length,
        fast_answers: f.fastAnswers ?? "",
        too_fast: f.tooFast ? 1 : 0,
        longest_same_position_run: f.longestSamePositionRun,
      };
    })
  );
  write(
    "quiz_attempts.csv",
    keep(d.quizAttempts).map((q) => ({
      student: pid(q.studentId),
      activity_id: q.activityId,
      date: q.date,
      quiz_version: q.quizVersion,
      n_correct: q.nCorrect,
      n_questions: q.nQuestions,
      seconds: q.startedAt && q.finishedAt ? Math.round((Date.parse(q.finishedAt) - Date.parse(q.startedAt)) / 1000) : "",
      answers: q.answers.map((a) => `${a.questionId}:${a.chosen}:${a.correct ? 1 : 0}`).join("|"),
    }))
  );
  write(
    "riasec_attempts.csv",
    keep(d.riasecAttempts).map((r) => ({
      student: pid(r.studentId),
      items_version: r.itemsVersion,
      ...Object.fromEntries(Object.entries(riasecScores(r.answers)).map(([t, v]) => [`score_${t}`, v ?? ""])),
      ...Object.fromEntries(RIASEC_ITEMS.map((i) => [i.id, r.answers[i.id] ?? ""])),
    }))
  );
  write(
    "survey_opens.csv",
    keep(d.surveyOpens).map((o) => ({ student: pid(o.studentId), wave: o.measurementWave, opened_at: o.openedAt }))
  );
  write(
    "survey_responses.csv",
    attempts.flatMap((a) =>
      a.responses.map((r) => ({
        attempt: pid(a.id),
        student: pid(r.studentId),
        question_id: r.questionId,
        option_id: r.optionId,
        display_position: r.displayPosition,
        question_position: r.questionPosition,
        first_answered_ms: r.firstAnsweredMs,
        survey_version: r.surveyVersion,
        answered_at: r.answeredAt,
      }))
    )
  );
  write(
    "activity_logs.csv",
    keep(d.logs).map((l) => ({
      student: pid(l.studentId),
      activity_id: l.activityId,
      domain: domainOf.get(l.activityId) ?? "",
      date: l.date,
      rating: l.interestRating,
      feeling: l.reflectionText && FEELING_OPTIONS.includes(l.reflectionText as (typeof FEELING_OPTIONS)[number]) ? l.reflectionText : l.reflectionText ? "(tu viet)" : "",
      confidence: l.confidence,
      difficulty: l.difficulty,
      note_length: l.note.length,
      is_extra: l.isExtra,
      source: l.source,
      started_at: l.startedAt,
      finished_at: l.finishedAt,
      actual_minutes: l.startedAt && l.finishedAt ? ((Date.parse(l.finishedAt) - Date.parse(l.startedAt)) / 60_000).toFixed(1) : "",
      expected_minutes: durationOf.get(l.activityId) ?? "",
    }))
  );
  write(
    "recommendation_events.csv",
    keep(d.events).map((e) => ({
      student: pid(e.studentId),
      date: e.date,
      activity_id: e.activityId,
      event: e.event,
      algo_version: e.algoVersion,
      propensity: e.propensity,
      n_candidates: e.nCandidates,
    }))
  );
  write(
    "profile_snapshots.csv",
    keep(d.snapshots).map((s) => ({
      student: pid(s.studentId),
      week: s.weekStartDate,
      scoring_version: s.scoringVersion,
      content_hash: s.contentHash,
      reason: s.reason,
      top3: s.topDomains.join("|"),
      // Thien huong luong (v5) - trong = ho so truoc v5 / chua lam du khao sat
      track: s.track?.recommendedTrack ?? "",
      track_reason: s.track?.reason ?? "",
      track_lean: s.track?.lean ?? "",
      vocational_affinity: s.track?.vocationalAffinity ?? "",
      academic_affinity: s.track?.academicAffinity ?? "",
      ...Object.fromEntries(DOMAINS.map((dm) => [`score_${dm.code}`, s.scores.find((x) => x.domain === dm.code)?.score ?? ""])),
      ...Object.fromEntries(DOMAINS.map((dm) => [`raw_${dm.code}`, s.components.find((x) => x.domain === dm.code)?.surveyRaw ?? ""])),
    }))
  );
  write(
    "outcome_labels.csv",
    keep(d.labels).map((l) => ({
      student: pid(l.studentId),
      rater: l.rater,
      label_phase: l.labelPhase, // pre_result = em tu chon TRUOC khi xem ket qua; phan tich rieng voi post_result
      top3: l.topDomains.join("|"),
      scoring_version: l.scoringVersion,
      agreement: l.agreement,
      preferred_domains: l.preferredDomains.join("|"),
      created_at: l.createdAt,
    }))
  );

  // ---- Bang dac trung (hoc sinh, tuan) - dinh nghia dung chung voi analyze:models (lib/dataset.ts) ----
  const fixed = (x: number | null, digits: number) => (x === null ? "" : x.toFixed(digits));
  const features = studentWeekFeatures(d, consented).map((r) => ({
    student: pid(r.studentId),
    class: pid(r.classId),
    week: r.week,
    active_this_week: r.active_this_week,
    n_activities: r.n_activities,
    mean_rating: fixed(r.mean_rating, 2),
    n_domains: r.n_domains,
    domain_entropy: r.domain_entropy.toFixed(3),
    max_streak_days: r.max_streak_days,
    offline_ratio: fixed(r.offline_ratio, 2),
    mean_note_length: r.mean_note_length === null ? "" : Math.round(r.mean_note_length),
    n_need_help: r.n_need_help,
    n_extra: r.n_extra,
    n_shown: r.n_shown,
    n_shown_completed: r.n_shown_completed,
    n_swapped: r.n_swapped,
    n_saved: r.n_saved,
    n_opened_not_done: r.n_opened_not_done, // mo trang hoat dong ma khong lam trong ngay (bo do)
    active_next_week: r.active_next_week ?? "", // nhan du doan ngung tuong tac (chi co khi tuan sau DA ket thuc)
  }));
  write("features_student_week.csv", features);
  console.log(`\nDa xuat vao ${out} (loai ${d.students.length - consented.size} hoc sinh chua co xac nhan phu huynh).`);
}

main().catch((err) => {
  console.error("❌ Loi:", err);
  process.exit(1);
});
