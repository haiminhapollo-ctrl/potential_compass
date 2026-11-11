/**
 * Khoi tao du lieu mau cho DATA_BACKEND=local (chay tren may dev, khong can
 * Supabase that). Tao 1 truong, 1 lop, 1 giao vien, 3 hoc sinh mau.
 *
 * Chay: npm run seed:local  (= tsx scripts/seed-local.ts)
 *
 * An toan chay nhieu lan: script kiem tra du lieu mau da ton tai chua truoc
 * khi tao moi (dua vao ten/ma co dinh de nhan biet).
 *
 * LUU Y KY THUAT: script nay CHI import cac module logic thuan (khong dung
 * "server-only"/Next.js/Supabase) de co the chay bang `tsx` ngay ca truoc khi
 * `npm install` - vi vay ho so tiem nang duoc tinh THU CONG bang
 * computePotentialProfile() + buildTemplateInsight() thay vi goi
 * src/lib/profile-service.ts (file do import "server-only", chi chay dung
 * trong Next.js server runtime that su). Khi app da `npm install` va chay
 * that, moi cap nhat ho so deu di qua profile-service.ts nhu binh thuong.
 */
import { LocalJsonRepository } from "../src/lib/data/local/repository";
import {
  buildRatingStats,
  computeContentHash,
  computePotentialProfile,
  isSurveyComplete,
  recommendTrack,
  SCORING_VERSION,
} from "../src/lib/recommendation/scoring";
import { surveyQuestionsFor } from "../src/lib/curriculum";
import { PROMPT_VERSION } from "../src/lib/recommendation/insight-templates";
import { buildTemplateInsight } from "../src/lib/recommendation/insight-templates";
import { daysAgoISOVN } from "../src/lib/date";
import { generateTempPassword, hashPassword } from "../src/lib/auth/password";
import { optionsInDisplayOrder } from "../src/lib/survey";

const SAMPLE_SCHOOL_NAME = "Truong THCS (du lieu may dev)";
const SAMPLE_STUDENT_CODES = ["hs001", "hs002", "hs003"];
const SAMPLE_TEACHER_EMAIL = "quantri@truong.local";

async function main() {
  const repo = new LocalJsonRepository();

  console.log("== Seed du lieu mau cho Potential Compass (local backend) ==\n");

  // ---- School ----
  let school = (await repo.listSchools()).find((s) => s.name === SAMPLE_SCHOOL_NAME) ?? null;
  if (!school) {
    school = await repo.createSchool({ name: SAMPLE_SCHOOL_NAME, province: "Ha Giang" });
    console.log(`✅ Tao truong: ${school.name} (${school.id})`);
  } else {
    console.log(`↺ Truong da ton tai: ${school.name} (${school.id})`);
  }

  // ---- Teacher ----
  let teacher = await repo.getTeacherByEmail(SAMPLE_TEACHER_EMAIL);
  if (!teacher) {
    teacher = await repo.createTeacher({
      schoolId: school.id,
      fullName: "Cô Nguyễn Thị Lan",
      email: SAMPLE_TEACHER_EMAIL,
      role: "admin",
    });
    console.log(`✅ Tao giao vien/admin: ${teacher.fullName} <${teacher.email}>`);
  } else {
    console.log(`↺ Giao vien da ton tai: ${teacher.fullName} <${teacher.email}>`);
  }
  // Mat khau TAM cho tai khoan mau (chua co mat khau thi moi cap) - lan dau dang nhap bat doi.
  let sampleTempPassword: string | null = null;
  if (!(await repo.getTeacherCredentials(teacher.id))?.passwordHash) {
    sampleTempPassword = generateTempPassword();
    await repo.saveTeacherCredentials({
      teacherId: teacher.id,
      passwordHash: await hashPassword(sampleTempPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
      sessionVersion: 1,
      passwordUpdatedAt: new Date().toISOString(),
    });
  }

  // ---- Class ----
  let classes = await repo.listClasses(school.id);
  let classGroup = classes.find((c) => c.name === "9A1") ?? null;
  if (!classGroup) {
    classGroup = await repo.createClass({ schoolId: school.id, name: "9A1", teacherId: null });
    console.log(`✅ Tao lop: ${classGroup.name} (${classGroup.id})`);
  } else {
    console.log(`↺ Lop da ton tai: ${classGroup.name} (${classGroup.id})`);
  }

  // ---- Students ----
  const names = ["Giàng A Sử", "Lò Thị Mai", "Vàng Seo Chứ"];
  const students = [];
  for (let i = 0; i < SAMPLE_STUDENT_CODES.length; i++) {
    const code = SAMPLE_STUDENT_CODES[i]!;
    let student = await repo.getStudentByCode(code);
    if (!student) {
      student = await repo.createStudent({
        classId: classGroup.id,
        studentCode: code,
        displayName: names[i]!,
        parentConsentConfirmed: i < 2, // mo phong 1 hoc sinh CHUA co xac nhan phu huynh
      });
      console.log(`✅ Tao hoc sinh: ${student.displayName} - ma dang nhap: ${student.studentCode}`);
    } else {
      console.log(`↺ Hoc sinh da ton tai: ${student.displayName} - ma dang nhap: ${student.studentCode}`);
    }
    students.push(student);
  }

  // ---- Mo phong 2 hoc sinh dau lam khao sat + hoat dong, tinh ho so tiem nang ----
  const allQuestions = await repo.listSurveyQuestions();
  const activities = await repo.listActivities();
  // Bo cau cua hoc ky lop (cau neo + goi cua ky) - giong trang khao sat (src/lib/curriculum.ts).
  const term = classGroup.curriculumTerm;
  const questions = surveyQuestionsFor(allQuestions, term);
  const contentHash = computeContentHash({ questions: allQuestions, activities });

  for (const student of students.slice(0, 2)) {
    const existingResponses = await repo.listResponsesByStudent(student.id);
    if (existingResponses.length === 0) {
      await repo.createSurveyAttempt({
        studentId: student.id,
        measurementWave: "T1",
        surveyVersion: contentHash,
        curriculumTerm: term,
        startedAt: null,
        answers: questions.map((q) => {
          const shown = optionsInDisplayOrder(q, student.id); // giong thu tu em thay tren trang khao sat
          const displayPosition = Math.floor(Math.random() * shown.length);
          return { questionId: q.id, optionId: shown[displayPosition]!.id, displayPosition, questionPosition: null, firstAnsweredMs: null };
        }),
      });
      console.log(`✅ Mo phong ${student.displayName} tra loi ${questions.length} cau khao sat.`);
    }

    const existingLogs = await repo.listActivityLogsByStudent(student.id);
    if (existingLogs.length === 0) {
      const sample = activities.slice(0, 3);
      // Moi hoat dong mot NGAY KHAC NHAU - dung quy tac 1 hoat dong/ngay o
      // src/lib/actions/activity-log.ts (neu don het vao cung mot ngay thi du
      // lieu mau tu mau thuan voi quy tac do).
      for (const [i, act] of sample.entries()) {
        await repo.createActivityLog({
          studentId: student.id,
          activityId: act.id,
          date: daysAgoISOVN(i),
          interestRating: (3 + Math.floor(Math.random() * 3)) as 3 | 4 | 5,
          reflectionText: "Em muốn thử thêm việc giống thế này",
          confidence: null,
          difficulty: null,
          note: "",
          isExtra: false,
          source: "online",
          startedAt: null,
          finishedAt: null,
        });
      }
      console.log(`✅ Mo phong ${student.displayName} hoan thanh ${sample.length} hoat dong trai nghiem.`);
    }

    // Tinh va luu ho so tiem nang (thu cong - xem ghi chu dau file)
    const responses = await repo.listResponsesByStudent(student.id);
    const logs = await repo.listActivityLogsByStudent(student.id);
    const result = computePotentialProfile(
      { questions, activities },
      student.id,
      responses,
      logs,
      buildRatingStats(await repo.listAllActivityRatings())
    );
    const surveyCompleted = isSurveyComplete(questions, responses);
    const insight = surveyCompleted
      ? buildTemplateInsight({ studentId: student.id, scores: result.scores, topDomains: result.topDomains, term })
      : null;

    await repo.saveProfile({
      studentId: student.id,
      scores: result.scores,
      topDomains: result.topDomains,
      surveyCompleted,
      activitiesCompletedCount: logs.length,
      lastInsight: insight,
      insightProvenance: insight
        ? { source: "template", model: null, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString() }
        : null,
      components: result.components,
      track: surveyCompleted ? recommendTrack(result.scores, result.trackAffinity, term) : null,
      scoringVersion: SCORING_VERSION,
      contentHash,
      updatedAt: new Date().toISOString(),
    });
    console.log(`✅ Tinh ho so so thich cho ${student.displayName}: top domain = ${result.topDomains[0]}`);
  }

  console.log("\n== Hoan tat seed. Du lieu mau nam trong thu muc /data (JSON). ==");
  console.log(`\nDang nhap Hoc sinh bang ma: ${SAMPLE_STUDENT_CODES.join(", ")}`);
  console.log(
    `Dang nhap Giao vien/Admin: ${SAMPLE_TEACHER_EMAIL} - ` +
      (sampleTempPassword
        ? `mat khau tam: ${sampleTempPassword} (lan dau se bat doi)`
        : "da co mat khau; quen thi chay: npm run teacher:account -- reset " + SAMPLE_TEACHER_EMAIL)
  );
}

main().catch((err) => {
  console.error("❌ Loi khi seed du lieu:", err);
  process.exit(1);
});
