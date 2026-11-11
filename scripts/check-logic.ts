/**
 * KIEM TRA LOGIC THUAN (khong phu thuoc Next.js/React/Supabase) bang tsx.
 * Chay: npx tsx scripts/check-logic.ts
 *
 * Muc dich: xac minh phan "nao" cua he thong (tinh diem ho so, sinh nhan xet
 * template, du lieu noi dung) hoat dong DUNG truoc khi can toi ca bo may
 * Next.js/Supabase (thu tot cho moi truong sandbox khong the `npm install`
 * cac package UI/backend).
 */
import { DOMAINS } from "../src/lib/domains";
import { SURVEY_QUESTIONS as ALL_SURVEY_QUESTIONS } from "../src/lib/content/survey-questions";
import { CURRICULUM_TERMS, forTerm, surveyQuestionsFor, TERM_INFO } from "../src/lib/curriculum";
import { ACTIVITIES } from "../src/lib/content/activities";
import { RESOURCES } from "../src/lib/content/resources";
import {
  buildRatingStats,
  computeContentHash,
  computePotentialProfile,
  isSurveyComplete,
  NOTABLE_ALPHA,
  recommendTrack,
  TRACK_ALPHA,
  TRACK_CUTOFF,
  notableDomains,
  notableThreshold,
  SCORING_VERSION,
  SHIFT_MAX,
} from "../src/lib/recommendation/scoring";
import {
  latestAttempts,
  MAX_SAME_POSITION_RUN,
  nextRetestWave,
  optionsInDisplayOrder,
  parseAnswerTimes,
  pendingRetestWave,
  questionsInDisplayOrder,
  surveyAttemptFlags,
} from "../src/lib/survey";
import { activityTiming } from "../src/lib/activity-timing";
import { clrPca, itemRestCorrelations, pearson, seededRandom, spearman, surveyOpenSessions, symmetricEigen } from "./lib/stats";
import { auc, fitCox, fitForcedChoice, fitLogistic, highestRatedCandidate, invert, ipsEstimate } from "./lib/models";
import { candidatePools } from "../src/lib/recommendation/daily-pick";
import { parseQuizText, quizOptionOrder, quizToText, quizVersion, scoreQuiz } from "../src/lib/quiz";
import { DOMAIN_TO_RIASEC, MAPPING_APPROVAL, MAPPING_HASH, RIASEC_READY, RIASEC_TYPES, riasecScores } from "../src/lib/riasec";
import { RIASEC_ITEMS } from "../src/lib/content/riasec-items";
import { parseDomainCodes } from "../src/lib/domains";
import { buildTemplateInsight, buildWeeklyReviewTemplate, checkInsightText } from "../src/lib/recommendation/insight-templates";
import { pickDailyActivity, pickExtraActivities } from "../src/lib/recommendation/daily-pick";
import { buildActivityFeedback, FEELING_OPTIONS, isMixedSignal, noteTone } from "../src/lib/recommendation/feedback";
import { normalizeMediaUrl, youtubeEmbedUrl } from "../src/lib/media";
import {
  generateTempPassword,
  hashPassword,
  isLocked,
  MAX_FAILED_LOGINS,
  nextLoginState,
  validateNewPassword,
  verifyPassword,
} from "../src/lib/auth/password";
import { bootstrapMedianCI, MIN_N_FOR_CI, MIN_N_FOR_STATS, summarizeDomainScores, weeklyDomainMedians } from "../src/lib/recommendation/aggregate";
import { isInRange, weekRangeVN } from "../src/lib/date";
import type { ActivityLog, DomainCode, PotentialProfile, ProfileSnapshot, SurveyAttemptWithResponses } from "../src/lib/types";

/** Bo cau mot em lop 9 HK1 thay (cau neo + goi G9_HK1, bo cau da thay) - cac kiem thu cham diem dung bo nay. */
const TERM = "G9_HK1" as const;
const SURVEY_QUESTIONS = surveyQuestionsFor(ALL_SURVEY_QUESTIONS, TERM);
/** Noi dung mac dinh (giong local repo khi chua co data/) - production lay tu repository. */
const CONTENT = { questions: SURVEY_QUESTIONS, activities: ACTIVITIES };

/** Hoat dong duoc chon (bo qua propensity) - cho cac kiem thu chi quan tam hoat dong nao. */
const pickActivity = (...args: Parameters<typeof pickDailyActivity>) => pickDailyActivity(...args)?.activity ?? null;

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`❌ FAIL: ${msg}`);
  } else {
    console.log(`✅ ${msg}`);
  }
}

console.log("\n=== 1) Kiem tra du lieu noi dung ===");
assert(DOMAINS.length === 8, `co dung 8 nhom linh vuc (thuc te: ${DOMAINS.length})`);
assert(new Set(DOMAINS.map((d) => d.code)).size === 8, "8 ma nhom linh vuc khong trung nhau");

assert(SURVEY_QUESTIONS.length >= 12, `du >=12 cau khao sat (thuc te: ${SURVEY_QUESTIONS.length})`);
assert(new Set(ALL_SURVEY_QUESTIONS.map((q) => q.id)).size === ALL_SURVEY_QUESTIONS.length, "id cau hoi khong trung (ke ca cau da thay)");
const allOptionIds = new Set<string>();
let optionCount = 0;
for (const q of ALL_SURVEY_QUESTIONS) {
  assert(q.options.length >= 3, `cau ${q.id} co >=3 lua chon`);
  for (const opt of q.options) {
    optionCount++;
    assert(!allOptionIds.has(opt.id), `optionId ${opt.id} khong bi trung`);
    allOptionIds.add(opt.id);
    for (const domain of Object.keys(opt.domainWeights)) {
      assert(
        DOMAINS.some((d) => d.code === domain),
        `domain "${domain}" trong cau ${q.id} phai ton tai trong DOMAINS`
      );
    }
  }
}
console.log(`   -> tong ${optionCount} lua chon tren ${SURVEY_QUESTIONS.length} cau hoi`);

// Bao cao DS loi 6: moi nhom phai co du cau de do. Tu 11/2026 moi lop thay bo cau RIENG theo hoc ky
// (cau neo + goi cua ky) => kiem tra TUNG hoc ky. Chenh lech con lai do scoring.ts bu (muc 2).
for (const term of CURRICULUM_TERMS) {
  const domainAppearance = new Map<string, number>();
  for (const q of surveyQuestionsFor(ALL_SURVEY_QUESTIONS, term)) {
    for (const opt of q.options) {
      for (const domain of Object.keys(opt.domainWeights)) domainAppearance.set(domain, (domainAppearance.get(domain) ?? 0) + 1);
    }
  }
  console.log(`   ${term}: ` + DOMAINS.map((d) => `${d.code.slice(0, 8)}=${domainAppearance.get(d.code) ?? 0}`).join(", "));
  for (const d of DOMAINS) {
    assert((domainAppearance.get(d.code) ?? 0) >= 10, `${term}: nhom ${d.name} xuat hien >=10 lan (do duoc dang tin)`);
  }
}

assert(ACTIVITIES.length >= 24, `du >=24 hoat dong trai nghiem (thuc te: ${ACTIVITIES.length})`);
for (const d of DOMAINS) {
  // Hoat dong DANG DUNG cho moi hoc ky: moi nhom van du bai de goi y du lop dang o ky nao.
  const count = ACTIVITIES.filter((a) => a.domain === d.code && a.active && a.curriculumTerm === "ALL").length;
  assert(count >= 6, `nhom ${d.name} co >=6 hoat dong dang dung cho moi hoc ky (thuc te: ${count})`);
  assert(
    ACTIVITIES.filter((a) => a.domain === d.code).every((a) => a.durationMinutes >= 3 && a.durationMinutes <= 5),
    `hoat dong nhom ${d.name} deu trong khoang 3-5 phut`
  );
}

assert(new Set(ACTIVITIES.map((a) => a.id)).size === ACTIVITIES.length, "id hoat dong khong trung nhau");
assert(ACTIVITIES.every((a) => a.example.trim().length > 0), "moi hoat dong deu co vi du tham khao");
assert(
  ACTIVITIES.every((a) => a.secondaryDomain === null || (a.secondaryDomain !== a.domain && DOMAINS.some((d) => d.code === a.secondaryDomain))),
  "nhom phu (neu co) hop le va khac nhom chinh"
)
assert(RESOURCES.length >= 50, `du >=50 tai nguyen hoc tap theo ke hoach (thuc te: ${RESOURCES.length})`);
assert(new Set(RESOURCES.map((r) => r.id)).size === RESOURCES.length, "id tai nguyen khong trung nhau");
for (const d of DOMAINS) {
  const count = RESOURCES.filter((r) => r.domain === d.code).length;
  assert(count >= 5, `nhom ${d.name} co >=5 tai nguyen (thuc te: ${count})`);
}

console.log("\n=== 2) Kiem tra scoring engine (v3: phan vi so voi nguoi chon ngau nhien + co/can giua) ===");
const scoreOf = (r: ReturnType<typeof computePotentialProfile>, d: DomainCode) => r.scores.find((s) => s.domain === d)!.score;
const valueOf = (r: ReturnType<typeof computePotentialProfile>, d: DomainCode) => {
  const c = r.components.find((x) => x.domain === d)!;
  return c.surveyScore + c.activityShift;
};
const ALL_A = SURVEY_QUESTIONS.map((q) => ({ questionId: q.id, optionId: q.options[0]!.id }));
const logsOf = (activityId: string, rating: 1 | 2 | 3 | 4 | 5, n: number) =>
  Array.from({ length: n }, () => ({ activityId, interestRating: rating }));

// 1) Chua co du lieu: 8 nhom deu 50 (= "khong co tin hieu", ngang nguoi chon ngau nhien)
{
  const r = computePotentialProfile(CONTENT, "hs-test", [], []);
  assert(r.scores.length === 8 && r.scores.every((s) => s.score === 50), "chua co du lieu: du 8 nhom, deu 50 (trung tinh)");
  assert(!isSurveyComplete(SURVEY_QUESTIONS, []), "0 cau tra loi => khao sat CHUA hoan thanh");
}
// 2) Tra loi du => hoan thanh, co top 3
{
  const r = computePotentialProfile(CONTENT, "hs-test", ALL_A, []);
  assert(isSurveyComplete(SURVEY_QUESTIONS, ALL_A), "tra loi du so cau => khao sat hoan thanh");
  assert(r.topDomains.length === 3, "co du 3 top domain");
  console.log(`   -> "chon toan dap an A": ${r.scores.map((s) => `${s.domain.slice(0, 8)}=${s.score}`).join(", ")}`);
}
// 3) BAT BIEN (bao cao DS loi 5): doi dap an chi anh huong nhom khac KHONG doi diem Suc khoe
{
  // Cau khong cham nhom Suc khoe, va dap an A / C cham Ky thuat khac nhau.
  const kt = (o: (typeof SURVEY_QUESTIONS)[number]["options"][number]) => o.domainWeights.KY_THUAT_CONG_NGHE ?? 0;
  const q01 = SURVEY_QUESTIONS.find((q) => q.options.every((o) => !o.domainWeights.SUC_KHOE_CONG_DONG) && kt(q.options[0]!) !== kt(q.options[2]!))!;
  assert(!!q01, "co cau khong cham nhom Suc khoe ma A/C cham Ky thuat khac nhau (tien de kiem thu)");
  const alt = ALL_A.map((x, i) => (i === SURVEY_QUESTIONS.indexOf(q01) ? { ...x, optionId: q01.options[2]!.id } : x));
  const a = computePotentialProfile(CONTENT, "hs-test", ALL_A, []);
  const b = computePotentialProfile(CONTENT, "hs-test", alt, []);
  assert(scoreOf(a, "SUC_KHOE_CONG_DONG") === scoreOf(b, "SUC_KHOE_CONG_DONG"), "doi diem nhom khac KHONG lam doi diem Suc khoe (het bap benh min-max)");
  assert(scoreOf(a, "KY_THUAT_CONG_NGHE") !== scoreOf(b, "KY_THUAT_CONG_NGHE"), "...nhung co doi diem nhom bi anh huong (Ky thuat)");
}
// 4) SO SANH DUOC GIUA HOC SINH: cung diem tho 1 nhom => cung diem, du cac nhom khac khac nhau
{
  const x = computePotentialProfile(CONTENT, "hs-x", ALL_A, []);
  const alt = ALL_A.map((r, i) => (i === 0 ? { ...r, optionId: SURVEY_QUESTIONS[0]!.options[3]!.id } : r));
  const y = computePotentialProfile(CONTENT, "hs-y", alt, []);
  assert(
    x.rawTotals.SUC_KHOE_CONG_DONG === y.rawTotals.SUC_KHOE_CONG_DONG && scoreOf(x, "SUC_KHOE_CONG_DONG") === scoreOf(y, "SUC_KHOE_CONG_DONG"),
    "2 hoc sinh cung diem tho nhom Suc khoe => cung diem hien thi (thang co dinh)"
  );
}
// 5) CONG BANG (bao cao DS loi 6): 4000 nguoi chon ngau nhien => moi nhom dung dau gan 12,5%
{
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const top = new Map<string, number>();
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const resp = SURVEY_QUESTIONS.map((q) => ({ optionId: q.options[Math.floor(rnd() * q.options.length)]!.id }));
    const t = computePotentialProfile(CONTENT, `rand${i}`, resp, []).topDomains[0]!;
    top.set(t, (top.get(t) ?? 0) + 1);
  }
  const pct = DOMAINS.map((d) => ((top.get(d.code) ?? 0) / N) * 100);
  console.log(`   -> % dung dau khi chon ngau nhien: ${pct.map((p) => p.toFixed(1)).join(" | ")}`);
  assert(pct.every((p) => p >= 8.5 && p <= 17), "moi nhom dung dau 8,5%-17% khi chon ngau nhien (min-max cu: 1%-39%)");
}
// 6) Dat diem tho toi da cua 1 nhom => ~100
{
  const best = SURVEY_QUESTIONS.map((q) => ({
    optionId: q.options.reduce((b, o) => ((o.domainWeights.SUC_KHOE_CONG_DONG ?? 0) > (b.domainWeights.SUC_KHOE_CONG_DONG ?? 0) ? o : b)).id,
  }));
  assert(scoreOf(computePotentialProfile(CONTENT, "hs-test", best, []), "SUC_KHOE_CONG_DONG") >= 99, "dat diem khao sat toi da nhom Suc khoe => ~100");
}
// 7) Hoat dong: 5 sao tang, 1 sao giam, nhom khac khong doi
{
  const before = computePotentialProfile(CONTENT, "hs-test", ALL_A, []);
  const high = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 5, 6));
  const low = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 1, 6));
  assert(valueOf(high, "SUC_KHOE_CONG_DONG") > valueOf(before, "SUC_KHOE_CONG_DONG"), "6 lan 5 sao nhom Suc khoe => diem tang");
  assert(valueOf(low, "SUC_KHOE_CONG_DONG") < valueOf(before, "SUC_KHOE_CONG_DONG"), "6 lan 1 sao => diem giam");
  assert(
    DOMAINS.filter((d) => d.code !== "SUC_KHOE_CONG_DONG").every((d) => scoreOf(before, d.code) === scoreOf(high, d.code)),
    "hoat dong nhom Suc khoe KHONG doi diem cac nhom khac"
  );
}
// 8) CO (shrinkage, loi 7): bao nhieu lan 5 sao cung khong vuot SHIFT_MAX, cang nhieu bang chung cang tang
{
  const shift = (n: number) =>
    computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 5, n)).components.find((c) => c.domain === "SUC_KHOE_CONG_DONG")!.activityShift;
  const s1 = shift(1), s4 = shift(4), s30 = shift(30);
  console.log(`   -> diem cong khi 5 sao lien tiep: 1 lan +${s1.toFixed(1)}, 4 lan +${s4.toFixed(1)}, 30 lan +${s30.toFixed(1)} (tran ${SHIFT_MAX})`);
  assert(s1 > 0 && s4 > s1 && s30 > s4 && s30 < SHIFT_MAX, `diem cong tang dan theo bang chung nhung luon < ${SHIFT_MAX}`);
}
// 9) CAN GIUA THEO HOC SINH (loi 7): em cham deu 5 sao moi nhom => khong nhom nao duoc day; em cham 5 sao 1 nhom, 2 sao nhom khac => nhom do noi len
{
  const domainsActs = ["act_kh_01", "act_kt_01", "act_nl_01", "act_kd_01", "act_sk_01", "act_nt_01", "act_xh_01", "act_tc_01"];
  const allFive = computePotentialProfile(CONTENT, "hs-test", ALL_A, domainsActs.map((a) => ({ activityId: a, interestRating: 5 as const })));
  const maxAbs = Math.max(...allFive.components.map((c) => Math.abs(c.activityShift)));
  assert(maxAbs < 5, `em luon cham 5 sao => do lech giua cac nhom nho (max |shift| = ${maxAbs.toFixed(1)} < 5)`);
  const picky = computePotentialProfile(
    CONTENT,
    "hs-test",
    ALL_A,
    domainsActs.map((a, i) => ({ activityId: a, interestRating: (i === 4 ? 5 : 2) as 2 | 5 }))
  );
  const sk = picky.components.find((c) => c.domain === "SUC_KHOE_CONG_DONG")!.activityShift;
  const kh = picky.components.find((c) => c.domain === "KHOA_HOC_KHAM_PHA")!.activityShift;
  assert(sk > 0 && kh < 0, "cham 5 sao 1 nhom, 2 sao cac nhom khac => nhom do duong, nhom khac am");
}
// 10) CAN GIUA THEO HOAT DONG: bai ai cung thich (TB 4,8) duoc 5 sao => cong it hon bai binh thuong (TB 3)
{
  const stats = buildRatingStats([
    ...Array.from({ length: 30 }, () => ({ activityId: "act_sk_01", interestRating: 5 })),
    ...Array.from({ length: 30 }, () => ({ activityId: "act_sk_02", interestRating: 3 })),
  ]);
  const popular = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 5, 1), stats);
  const normal = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_02", 5, 1), stats);
  assert(
    valueOf(popular, "SUC_KHOE_CONG_DONG") < valueOf(normal, "SUC_KHOE_CONG_DONG"),
    "5 sao cho bai ai cung thich cong it hon 5 sao cho bai binh thuong (tach chat luong bai khoi so thich)"
  );
}
// 11) NHOM PHU: hoat dong co nhom phu tinh them cho nhom phu, nhung it hon nhom chinh
{
  const act = ACTIVITIES.find((a) => a.secondaryDomain)!;
  const r = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf(act.id, 5, 3));
  const prim = r.components.find((c) => c.domain === act.domain)!.activityShift;
  const sec = r.components.find((c) => c.domain === act.secondaryDomain)!.activityShift;
  assert(sec > 0 && sec < prim, `hoat dong ${act.id}: nhom phu duoc cong (${sec.toFixed(1)}) nhung it hon nhom chinh (${prim.toFixed(1)})`);
}
// 12) DO NHAY (loi 2, 7): tham so SHIFT_MAX doi duoc khi phan tich; lon hon => anh huong lon hon
{
  const at = (m: number) =>
    computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 5, 3), undefined, { shiftMax: m }).components.find(
      (c) => c.domain === "SUC_KHOE_CONG_DONG"
    )!.activityShift;
  assert(at(10) < at(20) && at(20) < at(40) && at(40) < at(80), "do nhay: SHIFT_MAX 10 < 20 < 40 < 80 => diem cong tang dan");
}
// 13) KHONG BO QUA IM LANG (loi 17): ban ghi khong hop le duoc dem
{
  const r = computePotentialProfile(CONTENT, "hs-test", [...ALL_A, { optionId: "khong_ton_tai" }], [{ activityId: "act_da_xoa", interestRating: 5 }]);
  assert(r.skipped.responses === 1 && r.skipped.activityLogs === 1, "dap an / hoat dong khong ton tai duoc DEM (skipped), khong im lang");
}
// 14) PHIEN BAN NOI DUNG (loi 10): doi trong so hoac van ban => contentHash doi; khong doi => giu nguyen
{
  const h0 = computeContentHash(CONTENT);
  assert(h0 === computeContentHash({ questions: [...SURVEY_QUESTIONS], activities: [...ACTIVITIES].reverse() }), "contentHash khong phu thuoc thu tu");
  const qs = structuredClone(SURVEY_QUESTIONS);
  qs[0]!.options[0]!.text += " (sua)";
  assert(computeContentHash({ questions: qs, activities: ACTIVITIES }) !== h0, "sua van ban dap an => contentHash doi");
  const qw = structuredClone(SURVEY_QUESTIONS);
  qw[0]!.options[0]!.domainWeights = { KHOA_HOC_KHAM_PHA: 2 };
  assert(computeContentHash({ questions: qw, activities: ACTIVITIES }) !== h0, "sua trong so => contentHash doi");
}
// 15) Hoat dong giao vien tu tao (khong co trong code) van duoc cham diem
{
  const custom = { ...ACTIVITIES[0]!, id: "act_custom_test", domain: "SUC_KHOE_CONG_DONG" as const, secondaryDomain: null };
  const content = { questions: SURVEY_QUESTIONS, activities: [...ACTIVITIES, custom] };
  const before = computePotentialProfile(content, "hs-test", ALL_A, []);
  const after = computePotentialProfile(content, "hs-test", ALL_A, [{ activityId: custom.id, interestRating: 5 }]);
  assert(valueOf(after, "SUC_KHOE_CONG_DONG") > valueOf(before, "SUC_KHOE_CONG_DONG"), "hoat dong tu tao 5 sao lam tang diem nhom");
}
// 16) "Hoan thanh khao sat" theo bo cau hoi HIEN CO
{
  const all = SURVEY_QUESTIONS.map((q) => ({ questionId: q.id }));
  assert(!isSurveyComplete(SURVEY_QUESTIONS, all.slice(1)), "thieu 1 cau => CHUA hoan thanh");
  assert(!isSurveyComplete(SURVEY_QUESTIONS, [...all.slice(1), { questionId: "cau_da_bi_xoa" }]), "tra loi cau DA BI XOA khong bu cho cau con thieu");
  assert(isSurveyComplete(SURVEY_QUESTIONS.slice(1), all.slice(1)), "bo cau hoi bot 1 cau => tra loi het phan con lai la hoan thanh");
  assert(!isSurveyComplete([], []), "bo cau hoi rong => khong coi la hoan thanh");
}
// 17) Hoa diem KHONG xep theo A-Z; co dinh voi 1 hoc sinh
{
  const winners = new Set<string>();
  for (let i = 0; i < 200; i++) winners.add(computePotentialProfile(CONTENT, `hs${i}`, [], []).topDomains[0]!);
  assert(winners.size === DOMAINS.length, `8 nhom hoa nhau => moi nhom deu co luc dung dau (thuc te: ${winners.size}/8)`);
  const a = computePotentialProfile(CONTENT, "hs-on-dinh", [], []).topDomains.join();
  assert(a === computePotentialProfile(CONTENT, "hs-on-dinh", [], []).topDomains.join(), "cung 1 hoc sinh => thu tu pha hoa co dinh (F5 khong doi)");
}
// 18) TAI LAP: cung du lieu + cung phien ban => cung ket qua (snapshot tinh lai duoc)
{
  const a = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 4, 2));
  const b = computePotentialProfile(CONTENT, "hs-test", ALL_A, logsOf("act_sk_01", 4, 2));
  assert(JSON.stringify(a) === JSON.stringify(b), "cung dau vao => ket qua giong het (tai lap duoc)");
}

console.log("\n=== 3) Kiem tra sinh nhan xet template (fallback khong AI key) ===");
{
  const result = computePotentialProfile(CONTENT, "hs-test",
    SURVEY_QUESTIONS.map((q) => ({ optionId: q.options[0]!.id })),
    []
  );
  const insight = buildTemplateInsight({ studentId: "test-student-1", ...result, term: TERM });
  assert(insight.length > 20, "nhan xet template co noi dung (khong rong)");
  assert(!insight.includes("undefined"), "nhan xet template khong bi loi 'undefined'");
  console.log(`   -> Nhan xet mau: "${insight}"`);

  const weekly = buildWeeklyReviewTemplate({ studentId: "test-student-1", ...result, activitiesCompleted: 5, term: TERM });
  assert(weekly.includes("5"), "tong ket tuan nhac dung so hoat dong da hoan thanh");
  console.log(`   -> Tong ket tuan mau: "${weekly}"`);
}

console.log("\n=== 4) Kiem tra chon hoat dong hang ngay (daily-pick) ===");
{
  const studentId = "student-daily-pick-test";
  const day1 = "2026-08-17";
  const day2 = "2026-08-18";

  const pick1 = pickActivity(ACTIVITIES, [], studentId, day1);
  assert(pick1 !== null, "co hoat dong duoc chon khi chua co lich su");

  const pick1Again = pickActivity(ACTIVITIES, [], studentId, day1);
  assert(pick1?.id === pick1Again?.id, "chon lai cung 1 ngay -> tra ve CUNG 1 hoat dong (deterministic)");

  // Neu hoc sinh da hoan thanh hoat dong hom nay, phai tra ve DUNG hoat dong da lam (khong doi random khac)
  const logToday: ActivityLog = {
    id: "log1",
    studentId,
    activityId: pick1!.id,
    date: day1,
    interestRating: 5,
    reflectionText: "",
    confidence: null,
    difficulty: null,
    note: "",
    isExtra: false,
    source: "online",
    startedAt: null,
    finishedAt: null,
    createdAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  };
  const pickAfterDone = pickActivity(ACTIVITIES, [logToday], studentId, day1);
  assert(pickAfterDone?.id === pick1!.id, "da lam hoat dong hom nay -> tra ve dung hoat dong do khi xem lai trang");

  // Danh het 1 nhom -> nhom do khong con duoc uu tien chon nua (uu tien nhom it duoc kham pha)
  const logsAllInOneDomain: ActivityLog[] = ACTIVITIES.filter((a) => a.domain === pick1!.domain).map((a, idx) => ({
    id: `log_${idx}`,
    studentId,
    activityId: a.id,
    date: `2026-08-0${(idx % 9) + 1}`,
    interestRating: 5,
    reflectionText: "",
    confidence: null,
    difficulty: null,
    note: "",
    isExtra: false,
    source: "online",
    startedAt: null,
    finishedAt: null,
    createdAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
  }));
  const pickAfterExhaustingDomain = pickActivity(ACTIVITIES, logsAllInOneDomain, studentId, day2);
  assert(
    pickAfterExhaustingDomain?.domain !== pick1!.domain,
    `sau khi lam het nhom "${pick1!.domain}", ngay hom sau uu tien nhom KHAC (thuc te chon: ${pickAfterExhaustingDomain?.domain})`
  );

  // "Doi hoat dong khac": loai hoat dong vua bi doi -> phai tra ve hoat dong KHAC, cung deterministic.
  const pickBeforeSwap = pickActivity(ACTIVITIES, [], studentId, day1);
  const pickAfterSwap = pickActivity(ACTIVITIES, [], studentId, day1, new Set([pickBeforeSwap!.id]));
  assert(pickAfterSwap !== null, "doi hoat dong van tra ve 1 hoat dong khac (khong bi null)");
  assert(pickAfterSwap?.id !== pickBeforeSwap!.id, "doi hoat dong -> khac hoat dong ban dau");
  const pickAfterSwapAgain = pickActivity(ACTIVITIES, [], studentId, day1, new Set([pickBeforeSwap!.id]));
  assert(pickAfterSwap?.id === pickAfterSwapAgain?.id, "doi hoat dong van deterministic (F5 lai khong doi tiep)");

  // Loai het toan bo hoat dong (truong hop cuc doan) -> fallback, khong duoc tra ve null.
  const pickAllExcluded = pickActivity(ACTIVITIES, [], studentId, day1, new Set(ACTIVITIES.map((a) => a.id)));
  assert(pickAllExcluded !== null, "loai het toan bo hoat dong -> fallback ve co hoat dong, khong crash/null");
}

console.log("\n=== 5) Thong ke ca lop & theo tuan (aggregate) ===");
{
  const mkProfile = (id: string, score: number, opts: Partial<PotentialProfile> = {}): PotentialProfile => ({
    studentId: id,
    scores: DOMAINS.map((d, idx) => ({ domain: d.code, score: idx === 0 ? score : 50, rank: idx + 1 })),
    topDomains: [],
    surveyCompleted: true,
    activitiesCompletedCount: 0,
    lastInsight: null,
    insightProvenance: null,
    components: [],
    track: null,
    scoringVersion: SCORING_VERSION,
    contentHash: null,
    updatedAt: "",
    ...opts,
  });
  assert(summarizeDomainScores([], SCORING_VERSION) === null, "khong co ho so => null ('chua du du lieu'), KHONG tra so gia");
  const four = [10, 20, 30, 40].map((s, i) => mkProfile(`p${i}`, s));
  assert(summarizeDomainScores(four, SCORING_VERSION) === null, `duoi ${MIN_N_FOR_STATS} hoc sinh => null`);
  const five = [10, 20, 30, 40, 100].map((s, i) => mkProfile(`p${i}`, s));
  const noise = [
    mkProfile("cu", 999, { scoringVersion: "v1-cu" }),
    mkProfile("chua-xong", 999, { surveyCompleted: false }),
  ];
  const sum = summarizeDomainScores([...five, ...noise], SCORING_VERSION)!;
  const first = sum.find((s) => s.domain === DOMAINS[0]!.code)!;
  assert(first.n === 5, "chi tinh ho so DA hoan thanh + DUNG phien ban cong thuc (bo ho so cu/chua xong)");
  assert(first.median === 30 && first.q1 === 20 && first.q3 === 40, `trung vi 30, Q1 20, Q3 40 (thuc te ${first.median}, ${first.q1}, ${first.q3})`);
  assert(first.mean === 40, "trung binh 40 - lech khoi trung vi vi 1 em 100 (ly do hien trung vi + IQR)");
  assert(sum.map((s) => s.domain).join() === DOMAINS.map((d) => d.code).join(), "thu tu nhom co dinh (khong xep hang, khong can pha hoa)");
  assert(first.medianCI === null, `n < ${MIN_N_FOR_CI} => chua tinh khoang tin cay (mau qua nho)`);
  const vals = Array.from({ length: 40 }, (_, i) => 30 + (i % 21));
  const ci = bootstrapMedianCI(vals);
  const med = [...vals].sort((a, b) => a - b)[19]!;
  assert(ci[0] <= med && med <= ci[1] + 1 && ci[1] - ci[0] < 15, `KTC95 bootstrap bao trung vi va hep vua phai (${ci.map((x) => x.toFixed(1)).join("-")})`);
  assert(JSON.stringify(ci) === JSON.stringify(bootstrapMedianCI(vals)), "bootstrap seed co dinh => tai lap duoc");

  const snap = (id: string, week: string, score: number, v = SCORING_VERSION): ProfileSnapshot => ({
    id: `${id}_${week}`, studentId: id, weekStartDate: week,
    scores: DOMAINS.map((d) => ({ domain: d.code, score, rank: 1 })), topDomains: [], components: [], track: null,
    scoringVersion: v, contentHash: null, reason: "cron_daily", dataCutoffAt: null, nResponses: null, nActivityLogs: null, createdAt: "",
  });
  const series = weeklyDomainMedians(
    [
      ...[1, 2, 3, 4, 5].map((i) => snap(`s${i}`, "2026-09-28", i * 10)),
      ...[1, 2].map((i) => snap(`s${i}`, "2026-10-05", 50)),
      snap("cu", "2026-09-28", 999, "v1-cu"),
    ],
    SCORING_VERSION
  );
  assert(series.length === 2 && series[0]!.weekStartDate === "2026-09-28", "chuoi theo tuan sap xep tang dan");
  assert(series[0]!.n === 5 && series[0]!.medians![DOMAINS[0]!.code] === 30, "tuan du 5 em => co trung vi; bo snapshot cong thuc cu");
  assert(series[1]!.medians === null && series[1]!.n === 2, "tuan chi 2 em => null nhung van bao n");
}
{
  // Loi 19: loc "trong tuan" phai co can tren
  const r = weekRangeVN(new Date("2026-10-07T03:00:00Z")); // Thu Tu
  assert(r.start === "2026-10-05" && r.end === "2026-10-12", `tuan [2026-10-05, 2026-10-12) (thuc te [${r.start}, ${r.end}))`);
  assert(isInRange("2026-10-11", r) && !isInRange("2026-10-12", r) && !isInRange("2026-10-04", r), "isInRange co ca can duoi lan can tren");
}

console.log("\n=== 6) Phan hoi theo ngu canh, kham pha them, kiem duyet Gemini, link minh hoa ===");
{
  const sk = { code: "SUC_KHOE_CONG_DONG" as const, name: "Sức khỏe" };
  const fb = (o: Partial<Parameters<typeof buildActivityFeedback>[0]>) =>
    buildActivityFeedback({ interestRating: 3, reflectionText: "", confidence: null, difficulty: null, ...o }, sk);
  assert(fb({ reflectionText: FEELING_OPTIONS[3] }).kind === "need_help", 'chon "Hoi kho, can huong dan" => need_help');
  assert(fb({ confidence: 1, interestRating: 5 }).kind === "need_help", "tu danh gia chua lam duoc => need_help (uu tien hon 5 sao)");
  assert(fb({ difficulty: 3, confidence: 2 }).kind === "need_help", "thay kho + chua tu tin => need_help");
  assert(fb({ difficulty: 3, confidence: 3, interestRating: 4 }).kind === "want_more", "thay kho nhung lam tot + thich => want_more");
  assert(fb({ interestRating: 2 }).kind === "not_for_me", "2 sao => goi y thu nhom khac");
  const more = fb({ reflectionText: FEELING_OPTIONS[0] });
  assert(more.kind === "want_more" && more.focusDomain === sk.code, "muon thu them => goi y CUNG nhom");
  assert(fb({ reflectionText: FEELING_OPTIONS[1] }).kind === "learned", "hoc duoc dieu moi => learned");
  assert(fb({}).kind === "neutral", "khong chon gi, 3 sao => neutral");
}
{
  const day = "2026-10-05";
  const mk = (activityId: string, isExtra: boolean): ActivityLog => ({
    id: activityId, studentId: "hs-x", activityId, date: day, interestRating: 4, reflectionText: "",
    confidence: null, difficulty: null, note: "", isExtra, source: "online", startedAt: null, finishedAt: null, createdAt: day, syncedAt: day,
  });
  const main = ACTIVITIES[0]!;
  const logs = [mk(main.id, false), mk(ACTIVITIES[10]!.id, true)];
  assert(pickActivity(ACTIVITIES, logs, "hs-x", day)?.id === main.id, "co hoat dong kham pha them => hoat dong hom nay van la hoat dong CHINH");
  const extras = pickExtraActivities(ACTIVITIES, logs, "hs-x", day, "SUC_KHOE_CONG_DONG");
  assert(extras.length === 3, `goi y du 3 hoat dong kham pha them (thuc te ${extras.length})`);
  assert(extras.every((a) => !logs.some((l) => l.activityId === a.id)), "goi y KHONG lap lai hoat dong da lam hom nay");
  assert(extras[0]!.domain === "SUC_KHOE_CONG_DONG" && extras[1]!.domain === "SUC_KHOE_CONG_DONG", "2 goi y dau thuoc nhom hoc sinh vua thich");
  const spread = pickExtraActivities(ACTIVITIES, logs, "hs-x", day, null);
  assert(new Set(spread.map((a) => a.domain)).size === spread.length, "khong co nhom uu tien => moi goi y mot nhom khac nhau");
  const off = ACTIVITIES.map((a) => ({ ...a, active: a.domain !== "SUC_KHOE_CONG_DONG" }));
  assert(pickExtraActivities(off, logs, "hs-x", day, "SUC_KHOE_CONG_DONG").every((a) => a.active), "khong goi y hoat dong da bi tat");
}
{
  const ids = ["hs001", "hs002", "test-student-1", "abc"];
  const templates = ids.map((id) =>
    buildTemplateInsight({ studentId: id, term: TERM, ...computePotentialProfile(CONTENT, id, SURVEY_QUESTIONS.map((q) => ({ optionId: q.options[1]!.id })), []) })
  );
  assert(templates.every((t) => checkInsightText(t) === null), `nhan xet template luon qua kiem duyet (${templates.map(checkInsightText).join(",")})`);
  const ok = "Em rất thích các hoạt động về nguồn nước và giúp đỡ người khác. Em hãy thử thêm vài hoạt động ở nhóm Sức khỏe để hiểu mình hơn nhé.";
  assert(checkInsightText(ok) === null, 'cau binh thuong co "nguồn", "người" KHONG bi chan nham');
  assert(checkInsightText(ok + " Xem thêm tại https://abc.vn") !== null, "chen duong link => bi chan");
  assert(checkInsightText(ok.replace("Em rất thích", "Em hơi ngu nhưng thích")) !== null, "tu che bai => bi chan");
  assert(checkInsightText(ok.replace("Em rất thích", "Là con gái, em thích")) !== null, "nhac gioi tinh => bi chan");
  assert(checkInsightText(Array(130).fill("học").join(" ") + ".") !== null, "qua 110 tu => bi chan");
  assert(checkInsightText("You should explore more science activities and keep trying every single day okay.") !== null, "khong phai tieng Viet => bi chan");
}
{
  assert(youtubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ") === "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "link youtube watch => link nhung nocookie");
  assert(youtubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ?t=5")?.endsWith("/dQw4w9WgXcQ") === true, "link youtu.be => link nhung");
  assert(youtubeEmbedUrl("https://example.com/anh.jpg") === null, "link anh => khong nhung nhu video");
  assert(normalizeMediaUrl("javascript:alert(1)") === undefined, "link javascript: bi tu choi");
  assert(normalizeMediaUrl("  ") === null, "bo trong link => null");
}

{
  // Link that do nguoi chon (10/2026): phai la https; video hoat dong phai nhung duoc.
  assert(RESOURCES.every((r) => r.url === null || r.url.startsWith("https://")), "moi link tai nguyen deu la https (hoac de trong)");
  assert(RESOURCES.filter((r) => r.url).length >= 45, `da co link that cho phan lon tai nguyen (${RESOURCES.filter((r) => r.url).length}/56)`);
  assert(
    ACTIVITIES.every((a) => a.mediaUrl === null || youtubeEmbedUrl(a.mediaUrl) !== null),
    "moi video hoat dong deu la link YouTube nhung duoc"
  );
}

{
  // Loi 13: co "tin hieu trai chieu" de giao vien hoi them (quy tac tu khoa, khong cham diem)
  assert(noteTone("Em không thích lắm") === "negative", '"không thích" la tieu cuc (khong bi nham thanh "thích")');
  assert(noteTone("Em thấy rất vui") === "positive", '"vui" la tich cuc');
  assert(noteTone("Em làm xong rồi") === null, "cau trung tinh => null");
  assert(isMixedSignal({ interestRating: 5, reflectionText: "", note: "Chán quá" }), "5 sao + viet 'chán' => trai chieu");
  assert(isMixedSignal({ interestRating: 1, reflectionText: FEELING_OPTIONS[0], note: "" }), "1 sao + 'muon thu them' => trai chieu");
  assert(!isMixedSignal({ interestRating: 5, reflectionText: FEELING_OPTIONS[0], note: "Vui lắm" }), "5 sao + tich cuc => khong trai chieu");
}

console.log("\n=== 8) De xuat Data Science 10/2026 (A1-A4, B1) ===");
{
  // RNG rieng cho muc nay (khong anh huong cac kiem thu o tren).
  let seed = 2026;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const randomSurvey = () => SURVEY_QUESTIONS.map((q) => ({ optionId: q.options[Math.floor(rnd() * q.options.length)]!.id }));
  const randomLogs = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const acts = ACTIVITIES.filter((a) => a.domain === DOMAINS[i % 8]!.code); // rai deu 8 nhom nhu daily-pick
      return { activityId: acts[Math.floor(rnd() * acts.length)]!.id, interestRating: (1 + Math.floor(rnd() * 5)) as 1 | 2 | 3 | 4 | 5 };
    });
  const notableRate = (n: number, N: number) => {
    const people = Array.from({ length: N }, () => ({ responses: randomSurvey(), logs: randomLogs(n) }));
    const stats = buildRatingStats(people.flatMap((x) => x.logs));
    return people.filter((x, i) => computePotentialProfile(CONTENT, `bua${i}`, x.responses, x.logs, stats).scores.some((s) => s.notable)).length / N;
  };

  // A1: nguong theo NHOM CAO NHAT cua nguoi tra loi bua (truoc day >= 60: 100% nguoi bua co nhan)
  assert(notableThreshold(0) < notableThreshold(4) && notableThreshold(4) < notableThreshold(8) && notableThreshold(8) === notableThreshold(50), "nguong Noi bat tang theo so lan cham sao roi giu nguyen tu 8 lan");
  const r0 = notableRate(0, 3000);
  console.log(`   -> nguoi chon bua (chi khao sat) co nhan Noi bat: ${(r0 * 100).toFixed(1)}% (muc tieu ${(NOTABLE_ALPHA * 100).toFixed(0)}%; nguong cu 60: 100%)`);
  assert(Math.abs(r0 - NOTABLE_ALPHA) <= 0.05, "chi khao sat: ty le nguoi bua co nhan ~ NOTABLE_ALPHA (+-5 diem %) - bo cau hoi doi => chay analyze:scoring");
  for (const n of [5, 20]) {
    const r = notableRate(n, 1500);
    console.log(`   -> bua khao sat + ${n} lan cham sao bua: ${(r * 100).toFixed(1)}%`);
    assert(r <= NOTABLE_ALPHA + 0.06, `bua + ${n} lan cham sao: ty le co nhan khong vuot NOTABLE_ALPHA + 6 diem % (nguong co dinh 97,2 cho 31-33%)`);
  }
  {
    const r = computePotentialProfile(CONTENT, "hs-test", randomSurvey(), randomLogs(10));
    const thr = notableThreshold(10);
    assert(
      r.scores.every((s) => !s.notable || (s.rank <= 3 && r.components.find((c) => c.domain === s.domain)!.surveyScore + r.components.find((c) => c.domain === s.domain)!.activityShift > thr)),
      "nhan Noi bat chi gan cho top 3 co gia tri vuot nguong"
    );
    assert(notableDomains(r.scores).length === r.scores.filter((s) => s.notable).length, "notableDomains tra dung cac nhom co nhan");
    assert(notableDomains([{ domain: "KHOA_HOC_KHAM_PHA", score: 99, rank: 1 }]).length === 0, "ho so cong thuc cu (chua co nhan) => khong co nhom Noi bat");
  }

  // A4: thu tu dap an xao theo hoc sinh - co dinh, la hoan vi, vi tri gan nhu deu
  const q = SURVEY_QUESTIONS[0]!;
  const ids = (studentId: string) => optionsInDisplayOrder(q, studentId).map((o) => o.id).join();
  assert(ids("hs-a") === ids("hs-a"), "cung hoc sinh => cung thu tu dap an (F5, lam lai, trang xem lai)");
  assert([...optionsInDisplayOrder(q, "hs-a").map((o) => o.id)].sort().join() === q.options.map((o) => o.id).sort().join(), "thu tu xao la hoan vi cua dung 4 dap an");
  assert(new Set(Array.from({ length: 50 }, (_, i) => ids(`hs${i}`))).size >= 10, "hoc sinh khac nhau thay thu tu khac nhau");
  const atTop = Array.from({ length: 4000 }, (_, i) => optionsInDisplayOrder(q, `hs${i}`)[0]!.id).filter((id) => id === q.options[0]!.id).length / 4000;
  assert(atTop > 0.22 && atTop < 0.28, `dap an A nam tren cung ~25% so hoc sinh (thuc te ${(atTop * 100).toFixed(1)}%)`);
  {
    const ALL_TOP = (studentId: string) => SURVEY_QUESTIONS.map((x) => ({ optionId: optionsInDisplayOrder(x, studentId)[0]!.id }));
    const fixed = computePotentialProfile(CONTENT, "hs-test", SURVEY_QUESTIONS.map((x) => ({ optionId: x.options[0]!.id })), []);
    assert(fixed.scores.some((s) => s.notable), 'thu tu CO DINH: bam "toan A" van ra nhom Noi bat (ly do phai xao)');
    const n = 2000;
    const straight = Array.from({ length: n }, (_, i) => computePotentialProfile(CONTENT, `sl${i}`, ALL_TOP(`sl${i}`), []).scores.some((s) => s.notable)).filter(Boolean).length / n;
    console.log(`   -> da xao: em bam toan dap an tren cung co nhan Noi bat ${(straight * 100).toFixed(1)}%`);
    assert(straight <= NOTABLE_ALPHA + 0.06, "da xao: bam cung vi tri ~ ngau nhien, bi nguong Noi bat chan nhu nguoi bua");
  }

  // A4: co tra loi voi (chi xet bai form trong)
  const mkAttempt = (wave: string | null, seconds: number | null, positions: (number | null)[]): SurveyAttemptWithResponses => ({
    id: "att", studentId: "hs-x", measurementWave: wave, surveyVersion: null, curriculumTerm: null,
    startedAt: seconds === null ? null : "2026-10-08T03:00:00.000Z",
    completedAt: new Date(Date.parse("2026-10-08T03:00:00.000Z") + (seconds ?? 0) * 1000).toISOString(),
    responses: SURVEY_QUESTIONS.map((x, i) => ({ id: `r${i}`, studentId: "hs-x", attemptId: "att", questionId: x.id, optionId: x.options[0]!.id, surveyVersion: null, displayPosition: positions[i] ?? null, questionPosition: null, firstAnsweredMs: null, answeredAt: "" })),
  });
  const fast = surveyAttemptFlags(mkAttempt("T1", 40, SURVEY_QUESTIONS.map(() => 0)), SURVEY_QUESTIONS);
  assert(fast.tooFast && fast.samePosition && fast.longestSamePositionRun === SURVEY_QUESTIONS.length, "T1 lam 40 giay, toan vi tri 1 => co ca 2 co");
  const varied = surveyAttemptFlags(mkAttempt("T1", 600, SURVEY_QUESTIONS.map((_, i) => i % 4)), SURVEY_QUESTIONS);
  assert(!varied.tooFast && !varied.samePosition && varied.seconds === 600, "T1 lam 10 phut, vi tri doi deu => khong co co");
  const prefilled = surveyAttemptFlags(mkAttempt(null, 5, SURVEY_QUESTIONS.map(() => 0)), SURVEY_QUESTIONS);
  assert(!prefilled.tooFast && !prefilled.samePosition, "lam lai tu nguyen (dap an cu chon san) => khong gan co du bam nop ngay");
  const run = surveyAttemptFlags(mkAttempt("T2", 600, SURVEY_QUESTIONS.map((_, i) => (i < MAX_SAME_POSITION_RUN ? 2 : i % 4))), SURVEY_QUESTIONS);
  assert(run.samePosition && run.longestSamePositionRun >= MAX_SAME_POSITION_RUN, `${MAX_SAME_POSITION_RUN} cau lien cung vi tri => co "cung vi tri"`);
  assert(surveyAttemptFlags(mkAttempt("T1", null, []), SURVEY_QUESTIONS).longestSamePositionRun === 0, "du lieu cu (khong co vi tri, khong co thoi gian) => khong co, khong loi");

  // A4: thu tu CAU xao theo hoc sinh
  const qids = (sid: string) => questionsInDisplayOrder(SURVEY_QUESTIONS, sid).map((x) => x.id).join();
  assert(qids("hs-a") === qids("hs-a") && qids("hs-a") !== qids("hs-b"), "cung hoc sinh => cung thu tu cau (T1, T2, trang xem lai); hoc sinh khac => thu tu khac");
  assert(questionsInDisplayOrder(SURVEY_QUESTIONS, "hs-a").map((x) => x.id).sort().join() === SURVEY_QUESTIONS.map((x) => x.id).sort().join(), "thu tu cau la hoan vi cua du bo cau hoi");
  const firstQ = Array.from({ length: 4000 }, (_, i) => questionsInDisplayOrder(SURVEY_QUESTIONS, `hs${i}`)[0]!.id).filter((id) => id === SURVEY_QUESTIONS[0]!.id).length / 4000;
  assert(firstQ > 0.035 && firstQ < 0.065, `cau q01 dung dau trang ~1/${SURVEY_QUESTIONS.length} so hoc sinh (thuc te ${(firstQ * 100).toFixed(1)}%)`);
  {
    // cau thu i (thu tu goc) nam o vi tri interleaved[i] tren trang: cau chan truoc, cau le sau
    const interleaved = SURVEY_QUESTIONS.map((_, i) => (i % 2 === 0 ? i / 2 : SURVEY_QUESTIONS.length / 2 + (i - 1) / 2));
    const a = mkAttempt("T1", 900, SURVEY_QUESTIONS.map((_, i) => (interleaved[i]! < MAX_SAME_POSITION_RUN ? 2 : i % 2)));
    a.responses = a.responses.map((r, i) => ({ ...r, questionPosition: interleaved[i]! }));
    const asCanonical = { ...a, responses: a.responses.map((r) => ({ ...r, questionPosition: null })) };
    assert(
      surveyAttemptFlags(a, SURVEY_QUESTIONS).samePosition && !surveyAttemptFlags(asCanonical, SURVEY_QUESTIONS).samePosition,
      "co 'cung vi tri' xet theo thu tu cau EM THAY (question_position), du lieu cu theo thu tu goc"
    );
  }

  // A4: thoi gian tung cau
  const times = parseAnswerTimes(JSON.stringify({ q01: 30_000, q02: -5, q03: 1.5, q04: "7", q05: 99_000_000, q06: 0 }), 3_600_000);
  assert(times.get("q01") === 30_000 && times.get("q06") === 0 && times.size === 2, "answerTimes: chi nhan so nguyen 0..maxMs, bo gia tri am/le/chuoi/qua lon");
  assert(parseAnswerTimes("{hong", 1).size === 0 && parseAnswerTimes("[1,2]", 1).size === 0 && parseAnswerTimes(null, 1).size === 0, "answerTimes hong / mang / thieu => rong, khong loi");
  const withTimes = (msPerQuestion: (i: number) => number) => {
    const a = mkAttempt("T1", 900, SURVEY_QUESTIONS.map((_, i) => i % 4));
    let t = 0;
    a.responses = a.responses.map((r, i) => ({ ...r, firstAnsweredMs: (t += msPerQuestion(i)) }));
    return surveyAttemptFlags(a, SURVEY_QUESTIONS);
  };
  const steady = withTimes(() => 30_000);
  assert(steady.fastAnswers === 0 && !steady.tooFast, "30 giay/cau => 0 cau nhanh, khong co co");
  const slowHalf = Math.floor(SURVEY_QUESTIONS.length / 2); // bo cau co the le (25 cau tu 11/2026)
  const rushedHalf = withTimes((i) => (i < slowHalf ? 80_000 : 1_000));
  assert(
    rushedHalf.fastAnswers === SURVEY_QUESTIONS.length - slowHalf && rushedHalf.tooFast,
    "tong thoi gian binh thuong nhung nua bai bam 1 giay/cau => co 'lam rat nhanh'"
  );
  assert(varied.fastAnswers === null, "khong co thoi gian tung cau => fastAnswers null, co theo tong thoi gian nhu cu");

  // A5: thoi gian lam hoat dong (gio may em)
  const now = Date.parse("2026-10-17T05:00:00.000Z");
  const online = activityTiming({ startedAt: "2026-10-17T09:00:00.000Z", finishedAt: "2026-10-17T09:20:00.000Z" }, "online", now);
  assert(online.finishedAt === "2026-10-17T05:00:00.000Z" && online.startedAt === "2026-10-17T04:40:00.000Z", "online: giu thoi luong 20 phut, neo ket thuc vao gio server (dong ho may lech 4 tieng)");
  const offline = activityTiming({ startedAt: "2026-10-15T02:00:00.000Z", finishedAt: "2026-10-15T02:15:00.000Z" }, "offline_sync", now);
  assert(offline.startedAt === "2026-10-15T02:00:00.000Z" && offline.finishedAt === "2026-10-15T02:15:00.000Z", "offline: giu gio may em luc bam hoan thanh");
  const bad = [
    activityTiming({}, "online", now),
    activityTiming({ startedAt: "2026-10-17T05:00:00.000Z", finishedAt: "2026-10-17T04:00:00.000Z" }, "online", now),
    activityTiming({ startedAt: "2026-10-15T00:00:00.000Z", finishedAt: "2026-10-17T00:00:00.000Z" }, "online", now),
    activityTiming({ startedAt: "2026-10-18T05:00:00.000Z", finishedAt: "2026-10-18T05:10:00.000Z" }, "offline_sync", now),
    activityTiming({ startedAt: "2026-09-01T05:00:00.000Z", finishedAt: "2026-09-01T05:10:00.000Z" }, "offline_sync", now),
    activityTiming({ startedAt: 123, finishedAt: "x" }, "online", now),
  ];
  assert(bad.every((x) => x.startedAt === null && x.finishedAt === null), "thieu / nguoc chieu / qua 24h / offline o tuong lai hoac qua cu / sai kieu => ca hai null");

  // B1: lan lam & dot khao sat lai
  const att = (studentId: string, completedAt: string, measurementWave: string | null) => ({ studentId, completedAt, measurementWave });
  const latest = latestAttempts([att("a", "2026-10-01", "T1"), att("a", "2026-10-15", "T2"), att("b", "2026-10-02", "T1")]);
  assert(latest.get("a")!.measurementWave === "T2" && latest.get("b")!.measurementWave === "T1", "lan lam moi nhat cua tung em = dap an hien tai");
  assert(pendingRetestWave({ retestWave: "T2" }, [att("a", "2026-10-01", "T1")]) === "T2", "lop mo T2, em moi lam T1 => moi em lam T2");
  assert(pendingRetestWave({ retestWave: "T2" }, [att("a", "x", "T1"), att("a", "y", "T2")]) === null, "em da lam T2 => khong moi nua");
  assert(pendingRetestWave({ retestWave: "T2" }, []) === null, "em chua lam lan nao => lam khao sat binh thuong (T1) truoc");
  assert(pendingRetestWave({ retestWave: null }, [att("a", "x", "T1")]) === null, "lop khong mo dot nao => khong moi");
  assert(nextRetestWave([]) === "T2" && nextRetestWave([att("a", "x", "T1"), att("b", "y", "T2"), att("c", "z", null)]) === "T3", "dot ke tiep: T2, roi T3...");

  // A2: doc lua chon nhom tu form (du lieu client)
  assert(
    parseDomainCodes(["NGHE_THUAT_SANG_TAO", "", "khong-co", "NGHE_THUAT_SANG_TAO", "KHOA_HOC_KHAM_PHA", "SUC_KHOE_CONG_DONG", "KY_THUAT_CONG_NGHE"], 3).join() ===
      "NGHE_THUAT_SANG_TAO,KHOA_HOC_KHAM_PHA,SUC_KHOE_CONG_DONG",
    "tu chon nhom: bo rong/la/trung, giu thu tu, toi da 3"
  );

  // A3: propensity cua goi y hang ngay
  const fresh = pickDailyActivity(ACTIVITIES, [], "hs-p", "2026-10-08")!;
  const nLive = ACTIVITIES.filter((a) => a.active).length; // hoat dong da cho nghi khong duoc boc tham
  // Chon deu 1 nhom roi deu 1 hoat dong trong nhom: so hoat dong moi nhom khac nhau (11/2026) nen propensity theo nhom.
  const nInDomain = ACTIVITIES.filter((a) => a.active && a.domain === fresh.activity.domain).length;
  assert(
    fresh.nCandidates === nLive && Math.abs(fresh.propensity - 1 / (DOMAINS.length * nInDomain)) < 1e-12,
    `chua lam gi: ${nLive} hoat dong dang dung deu la ung vien, propensity = 1/(8 nhom x ${nInDomain} bai cua nhom)`
  );
  const doneToday = pickDailyActivity(ACTIVITIES, [{ ...mkLog(fresh.activity.id, "2026-10-08"), isExtra: false }], "hs-p", "2026-10-08")!;
  assert(doneToday.propensity === 1 && doneToday.activity.id === fresh.activity.id, "da lam hom nay => tra lai dung hoat dong do, propensity 1");
  // Nhom bi tat het hoat dong: truoc day luon "it kham pha nhat" (0 lan) => tra ve null
  const off = ACTIVITIES.map((a) => ({ ...a, active: a.domain !== "SUC_KHOE_CONG_DONG" }));
  const onePerOtherDomain = DOMAINS.filter((d) => d.code !== "SUC_KHOE_CONG_DONG").map((d, i) => mkLog(ACTIVITIES.find((a) => a.domain === d.code)!.id, `2026-09-0${i + 1}`));
  const pickOff = pickDailyActivity(off, onePerOtherDomain, "hs-p", "2026-10-08");
  assert(pickOff !== null && pickOff.activity.domain !== "SUC_KHOE_CONG_DONG", "nhom bi tat het hoat dong khong lam hoat dong hom nay bi trong");

  // Nhan xet template khi chua co nhom Noi bat
  const flat = computePotentialProfile(CONTENT, "hs-flat", [], []);
  const unclear = buildTemplateInsight({ studentId: "hs-flat", ...flat, term: TERM });
  assert(checkInsightText(unclear) === null && !unclear.includes("hứng thú nhất"), "chua co nhom Noi bat => nhan xet KHONG noi em thich nhat nhom nao, van qua kiem duyet");

  // A4/A5: mo roi bo do
  const opens = [
    { studentId: "a", measurementWave: "T1", openedAt: "2026-10-17T01:00:00.000Z" },
    { studentId: "a", measurementWave: "T1", openedAt: "2026-10-17T01:05:00.000Z" }, // tai lai trang
    { studentId: "a", measurementWave: "T1", openedAt: "2026-10-18T01:00:00.000Z" }, // hom sau mo lai
    { studentId: "b", measurementWave: "T1", openedAt: "2026-10-17T01:00:00.000Z" },
    { studentId: "b", measurementWave: "T2", openedAt: "2026-10-30T01:00:00.000Z" },
  ];
  const sess = surveyOpenSessions(opens, [{ studentId: "a", measurementWave: "T1" }, { studentId: "b", measurementWave: "T1" }]);
  const find = (sid: string, w: string) => sess.find((x) => x.studentId === sid && x.wave === w)!;
  assert(find("a", "T1").sessions === 2 && find("a", "T1").completed, "tai lai trang trong 6 gio khong tinh phien moi; mo lai hom sau = 2 phien, da nop");
  assert(!find("b", "T2").completed && find("b", "T1").completed && sess.length === 3, "mo T2 ma chua nop => dang bo do");
}

console.log("\n=== 9) Thong ke phan tich (scripts/lib/stats.ts) ===");
{
  assert(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-12 && Math.abs(spearman([1, 2, 3, 4], [10, 20, 25, 100]) - 1) < 1e-12, "pearson / spearman co ban");
  const eig = symmetricEigen([[2, 1, 0], [1, 2, 0], [0, 0, 5]]);
  assert(eig.values.map((x) => x.toFixed(9)).join() === ["5", "3", "1"].map((x) => Number(x).toFixed(9)).join(), "tri rieng [[2,1,0],[1,2,0],[0,0,5]] = 5, 3, 1");
  const rnd = seededRandom(3);
  const m = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => rnd() - 0.5));
  const sym = m.map((row, i) => row.map((x, j) => x + m[j]![i]!));
  const e = symmetricEigen(sym);
  const resid = e.vectors.map((vec, k) => Math.max(...sym.map((row, i) => Math.abs(row.reduce((a, x, j) => a + x * vec[j]!, 0) - e.values[k]! * vec[i]!))));
  assert(Math.max(...resid) < 1e-9 && e.values.every((x, i) => i === 0 || x <= e.values[i - 1]!), "ma tran doi xung ngau nhien 6x6: A v = lambda v, tri rieng giam dan");
  const pca = clrPca(Array.from({ length: 50 }, (_, i) => [i % 5, 4 - (i % 5), 2, 3 + (i % 3), 1, 2, (i * 7) % 4, 5]));
  assert(Math.abs(pca.explained.reduce((a, b) => a + b, 0) - 1) < 1e-9 && pca.explained[7]! < 1e-9, "CLR -> PCA: ty le phuong sai cong lai = 1, thanh phan cuoi = 0 (rang buoc CLR tong = 0)");

  // Item-rest: em thich Ky thuat chon dap an Ky thuat o MOI cau => cau co cham Ky thuat tuong quan duong voi phan con lai
  const tech = SURVEY_QUESTIONS.map((x) => x.options.reduce((b, o) => ((o.domainWeights.KY_THUAT_CONG_NGHE ?? 0) > (b.domainWeights.KY_THUAT_CONG_NGHE ?? 0) ? o : b)));
  const people = Array.from({ length: 200 }, (_, i) => ({
    responses: SURVEY_QUESTIONS.map((x, j) => ({
      questionId: x.id,
      optionId: (i % 2 === 0 && rnd() < 0.8 ? tech[j]! : x.options[Math.floor(rnd() * x.options.length)]!).id,
    })),
  }));
  const irc = itemRestCorrelations(SURVEY_QUESTIONS, people).flatMap((x) => x.byDomain.filter((b) => b.domain === "KY_THUAT_CONG_NGHE").map((b) => b.r));
  assert(irc.length > 5 && irc.every((r) => r > 0.2), `nhom em thich Ky thuat => moi cau cham Ky thuat co item-rest duong (thap nhat ${Math.min(...irc).toFixed(2)})`);
}

function mkLog(activityId: string, date: string): ActivityLog {
  return { id: `${activityId}_${date}`, studentId: "hs-p", activityId, date, interestRating: 4, reflectionText: "", confidence: null, difficulty: null, note: "", isExtra: false, source: "online", startedAt: null, finishedAt: null, createdAt: date, syncedAt: date };
}

console.log("\n=== 10) Mo hinh sau pilot (scripts/lib/models.ts) ===");
{
  const rnd = seededRandom(11);
  const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const m = [[4, 1, 0], [1, 3, 1], [0, 1, 2]];
  const prod = m.map((row) => invert(m)[0]!.map((_, j) => row.reduce((acc, x, l) => acc + x * invert(m)[l]![j]!, 0)));
  assert(prod.every((row, i) => row.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-12)), "invert: A x A^-1 = I");
  assert(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]) === 0.75 && auc([1, 1], [0, 1]) === 0.5, "AUC: vi du sach giao khoa 0,75; diem bang nhau = 0,5");

  // Logistic: tim lai he so da biet
  const xs = Array.from({ length: 3000 }, () => [normal(), normal()]);
  const ys = xs.map(([a, b]) => (rnd() < 1 / (1 + Math.exp(-(-0.5 + 1.2 * a! - 0.8 * b!))) ? 1 : 0));
  const lr = fitLogistic(xs, ys, 0.01).beta;
  assert(Math.abs(lr[0]! + 0.5) < 0.15 && Math.abs(lr[1]! - 1.2) < 0.15 && Math.abs(lr[2]! + 0.8) < 0.15, `logistic tim lai he so (-0,5; 1,2; -0,8): ${lr.map((x) => x.toFixed(2)).join("; ")}`);

  // Cox: nguy co theo tuan 5% x exp(0,7 x) - tim lai log HR ~ 0,7 (nguy co nho => logit ~ log HR)
  const coxRows: { cluster: string; time: number; x: number[]; event: 0 | 1 }[] = [];
  for (let i = 0; i < 800; i++) {
    const x = normal();
    for (let t = 0; t < 15; t++) {
      const event = rnd() < 0.05 * Math.exp(0.7 * x) ? 1 : 0;
      coxRows.push({ cluster: `s${i}`, time: t, x: [x], event });
      if (event) break;
    }
  }
  const cox = fitCox(coxRows);
  assert(Math.abs(cox.beta[0]! - 0.7) < 0.15 && cox.se[0]! > 0, `Cox (Efron) tim lai log HR 0,7: ${cox.beta[0]!.toFixed(2)} (SE robust ${cox.se[0]!.toFixed(3)})`);

  // IPS: chinh sach moi = chinh sach cu (q = p) => uoc luong = ty le that; candidatePools khop propensity da ghi
  const items = Array.from({ length: 500 }, (_, i) => ({ p: 0.25, q: 0.25, r: i % 3 === 0 ? 1 : 0 }));
  assert(Math.abs(ipsEstimate(items).snips - 167 / 500) < 1e-12 && Math.abs(ipsEstimate(items).ips - 167 / 500) < 1e-12, "IPS/SNIPS: chinh sach moi trung chinh sach cu => bang ty le quan sat");
  const pick = pickDailyActivity(ACTIVITIES, [], "hs-ips", "2026-10-18")!;
  const pools = candidatePools(ACTIVITIES, []);
  const pool = pools.find((p) => p.pool.some((a) => a.id === pick.activity.id))!;
  assert(Math.abs(1 / (pools.length * pool.pool.length) - pick.propensity) < 1e-12, "candidatePools dung lai dung propensity cua pickDailyActivity (dung cho IPS)");
  assert(highestRatedCandidate(["b", "a", "c"], new Map([["c", { n: 10, sum: 50 }], ["b", { n: 1, sum: 5 }]])) === "c", "chinh sach thay the: chon hoat dong co so sao (co ve 3) cao nhat");

  // Lua chon bat buoc: 2 nhom, moi cau 2 dap an cham 2 nhom khac nhau => diem chuan tuong quan voi so thich that
  const qs = Array.from({ length: 16 }, (_, i) => ({ id: `fq${i}`, options: [{ id: `fq${i}a`, weights: [1, 0] }, { id: `fq${i}b`, weights: [0, 1] }] }));
  const truthPref = Array.from({ length: 300 }, () => [normal(), normal()]);
  const people = truthPref.map((t) => ({ chosen: new Map(qs.map((q) => [q.id, rnd() < 1 / (1 + Math.exp(-(t[0]! - t[1]!))) ? q.options[0]!.id : q.options[1]!.id] as const)) }));
  const fc = fitForcedChoice(qs, people);
  const r = pearson(fc.eta.map((e) => e[0]! - e[1]!), truthPref.map((t) => t[0]! - t[1]!));
  assert(r > 0.8 && fc.reliability.every((x) => x > 0 && x < 1), `lua chon bat buoc: hieu diem chuan tuong quan voi hieu so thich that (r = ${r.toFixed(2)})`);
}

console.log("\n=== 11) Quiz on nhanh (A5 buoc 2) + doi chieu RIASEC (B1) ===");
{
  // Noi dung soan san: du 48 hoat dong, moi cau 3 dap an khac nhau, co giai thich, dap an dung hop le
  assert(ACTIVITIES.every((a) => a.quiz.length === 2), `moi hoat dong co 2 cau quiz soan san (${ACTIVITIES.filter((a) => a.quiz.length !== 2).map((a) => a.id).join(", ") || "ok"})`);
  const allQ = ACTIVITIES.flatMap((a) => a.quiz);
  assert(
    allQ.every((q) => q.options.length === 3 && new Set(q.options).size === 3 && q.correct === 0 && q.prompt && q.explanation && q.options.every(Boolean)),
    "moi cau quiz: 3 dap an khac nhau, khong trong, co giai thich"
  );
  assert(new Set(allQ.map((q) => q.id)).size === allQ.length, "id cau quiz khong trung");

  // Van ban giao vien <-> quiz: quay vong khong mat gi; loi dinh dang bao ro, khong luu nua voi
  const quiz = ACTIVITIES[0]!.quiz;
  const round = parseQuizText(ACTIVITIES[0]!.id, quizToText(quiz));
  assert(round.ok && JSON.stringify(round.quiz) === JSON.stringify(quiz), "quizToText -> parseQuizText giu nguyen quiz");
  const edited = parseQuizText("act_x", "Hỏi gì?\n- sai\n* đúng\n- sai 2\nGiải thích: vì vậy\n\n\nCâu 2?\n* a\n- b");
  assert(edited.ok && edited.quiz.length === 2 && edited.quiz[0]!.correct === 1 && edited.quiz[0]!.explanation === "vì vậy" && edited.quiz[1]!.id === "act_x_q2", "dap an dung o giua, giai thich, dong trong thua");
  const bad = ["Hỏi?\n- a\n- b", "Hỏi?\n* a\n* b", "Hỏi?\n* a", "Hỏi?\n* a\nlinh tinh", "* a\n- b", Array.from({ length: 6 }, (_, i) => `Q${i}?\n* a\n- b`).join("\n\n")];
  assert(bad.every((t) => !parseQuizText("x", t).ok), "thieu dap an dung / 2 dap an dung / 1 dap an / dong la / thieu cau hoi / qua 5 cau => bao loi");
  assert(parseQuizText("x", "  \n ").ok && (parseQuizText("x", "") as { quiz: unknown[] }).quiz.length === 0, "de trong = bo quiz");

  // Cham diem + xao dap an theo hoc sinh
  const full = new Map(quiz.map((q) => [q.id, q.correct] as const));
  const wrong = new Map(quiz.map((q) => [q.id, (q.correct + 1) % q.options.length] as const));
  assert(scoreQuiz(quiz, full)!.nCorrect === quiz.length && scoreQuiz(quiz, wrong)!.nCorrect === 0, "cham dung / sai");
  assert(scoreQuiz(quiz, new Map([[quiz[0]!.id, 0]])) === null && scoreQuiz(quiz, new Map(quiz.map((q) => [q.id, 9] as const))) === null, "thieu cau / chi so ngoai pham vi => tu choi");
  const firstPos = Array.from({ length: 3000 }, (_, i) => quizOptionOrder(allQ[0]!, `hs${i}`)[0]).filter((x) => x === allQ[0]!.correct).length / 3000;
  assert(firstPos > 0.29 && firstPos < 0.38, `dap an dung dung dau ~1/3 so hoc sinh (thuc te ${(firstPos * 100).toFixed(1)}%)`);
  assert(quizVersion(quiz) === quizVersion(quiz) && quizVersion(quiz) !== quizVersion(ACTIVITIES[1]!.quiz), "phien ban quiz doi khi noi dung doi");

  // RIASEC: cham diem, anh xa du 8 nhom, chua co ban dich => giao vien chua bat duoc
  const items = [...["R", "R", "I", "I"]].map((t, i) => ({ id: `t${i}`, type: t as "R" | "I", text: "x" }));
  const sc = riasecScores({ t0: 5, t1: 4, t2: 1, t3: 2 }, items);
  assert(sc.R === 9 && sc.I === 3 && sc.A === null, "RIASEC: tong diem tung loai; loai khong co cau => null");
  assert(riasecScores({ t0: 5, t1: 7, t2: 1, t3: 2 }, items).R === null, "RIASEC: gia tri ngoai 1-5 => loai do null");
  assert(DOMAINS.every((d) => RIASEC_TYPES.some((t) => t.code === DOMAIN_TO_RIASEC[d.code])), "bang anh xa phu du 8 nhom");
  assert(
    MAPPING_HASH === "bda22d54" && MAPPING_APPROVAL?.date === "2026-10-18",
    "bang anh xa = DUNG ban chuyen gia duyet 18/10/2026 (sua bang => phai duyet lai TRUOC khi xem du lieu, roi cap nhat hash o day + docs)"
  );
  assert(RIASEC_READY === RIASEC_ITEMS.every((i) => i.text.trim() !== ""), "RIASEC_READY chi khi du 30 cau co ban dich");
}

console.log("\n=== 12) Phan luong sau lop 9 & noi dung theo hoc ky (11/2026) ===");
{
  // --- Noi dung: khoa cung, nhanh nghe, trong so luong ---
  const locked = DOMAINS.filter((d) => d.academicOnly).map((d) => d.code).sort().join();
  assert(locked === "SUC_KHOE_CONG_DONG,XA_HOI_GIAO_DUC_NHAN_VAN", `khoa cung chi Y te + Su pham (thuc te: ${locked})`);
  assert(
    DOMAINS.every((d) => (d.vocationalBranch === null) === d.academicOnly && d.academicBranch.trim() !== ""),
    "nhom khoa cung KHONG co nhanh hoc nghe sau lop 9; nhom khac co du 2 nhanh"
  );
  assert(
    ALL_SURVEY_QUESTIONS.every((q) => q.options.every((o) => Object.keys(o.trackWeights).every((k) => k === "vocational" || k === "academic"))),
    "trackWeights chi gom vocational/academic"
  );
  for (const d of DOMAINS) {
    const opts = surveyQuestionsFor(ALL_SURVEY_QUESTIONS, TERM).flatMap((q) => q.options).filter((o) => o.domainWeights[d.code]);
    assert(
      opts.some((o) => o.trackWeights.vocational) && opts.some((o) => o.trackWeights.academic),
      `nhom ${d.name} co ca dap an thuc hanh lan hoc thuat (luong khong trung voi nhom)`
    );
  }

  // --- Bo cau / hoat dong theo hoc ky ---
  const nCore = ALL_SURVEY_QUESTIONS.filter((q) => q.active && q.curriculumTerm === "ALL").length;
  for (const t of CURRICULUM_TERMS) {
    const qs = surveyQuestionsFor(ALL_SURVEY_QUESTIONS, t);
    assert(qs.every((q) => q.active && (q.curriculumTerm === "ALL" || q.curriculumTerm === t)), `${t}: chi cau dang dung, cau neo + goi cua ky`);
    assert(qs.length > nCore, `${t}: co goi cau rieng (${qs.length - nCore} cau) ngoai ${nCore} cau neo`);
    const acts = forTerm(ACTIVITIES, t);
    assert(acts.every((a) => a.curriculumTerm === "ALL" || a.curriculumTerm === t), `${t}: khong lot hoat dong cua ky khac`);
    assert(ACTIVITIES.some((a) => a.active && a.curriculumTerm === t), `${t}: co hoat dong rieng bam bai tren lop`);
    assert(!!TERM_INFO[t].nextStep, `${t}: co buoc tiep theo cho nhan xet`);
  }
  const retired = ALL_SURVEY_QUESTIONS.filter((q) => !q.active);
  assert(retired.length > 0 && retired.every((q) => !SURVEY_QUESTIONS.includes(q)), "cau da thay (doi nghia) KHONG con trong bo cau cua em - van giu trong ngan hang");
  const answeredOld = ALL_SURVEY_QUESTIONS.filter((q) => q.active || q.id === retired[0]!.id).map((q) => ({ questionId: q.id }));
  assert(
    !isSurveyComplete(SURVEY_QUESTIONS, answeredOld.filter((r) => r.questionId !== SURVEY_QUESTIONS[0]!.id)),
    "tra loi cau da thay KHONG bu cho cau dang dung con thieu"
  );

  // --- Muc Elementary: hoat dong ngan, quiz nhan biet nghe ---
  const words = (x: string) => x.split(/\s+/).filter(Boolean).length;
  const live = ACTIVITIES.filter((a) => a.active);
  assert(live.every((a) => a.instructions.length >= 2 && a.instructions.length <= 6), "hoat dong dang dung: 2-6 buoc");
  const longStep = live.flatMap((a) => a.instructions.filter((x) => words(x) > 15).map(() => a.id));
  assert(longStep.length === 0, `moi buoc <= 15 tu (vuot: ${longStep.join(", ")})`);
  const badQuiz = live.filter((a) => a.quiz.length !== 2 || a.quiz.some((q) => words(q.prompt) > 25 || q.options.some((o) => words(o) > 12)));
  assert(badQuiz.length === 0, `moi hoat dong dang dung co 2 cau nhan biet nghe ngan gon (sai: ${badQuiz.map((a) => a.id).join(", ")})`);

  // --- Nhan luong ---
  const HK2 = surveyQuestionsFor(ALL_SURVEY_QUESTIONS, "G9_HK2");
  const content2 = { questions: HK2, activities: ACTIVITIES };
  const leanOf = (o: (typeof HK2)[number]["options"][number]) => (o.trackWeights.vocational ?? 0) - (o.trackWeights.academic ?? 0);
  const answering = (sign: 1 | -1) =>
    HK2.map((q) => ({ optionId: [...q.options].sort((a, b) => sign * (leanOf(b) - leanOf(a)))[0]!.id }));
  const handsOn = computePotentialProfile(content2, "hs-tay", answering(1), []);
  const bookish = computePotentialProfile(content2, "hs-sach", answering(-1), []);
  console.log(`   -> em luon chon thuc hanh: lean ${handsOn.trackAffinity.lean}; luon chon hoc thuat: lean ${bookish.trackAffinity.lean}`);
  const plainScores = handsOn.scores.map((x) => ({ ...x, notable: false }));
  assert(recommendTrack(plainScores, handsOn.trackAffinity, "G9_HK2").recommendedTrack === "VOCATIONAL_9PLUS", "G9_HK2: luon chon bat tay lam => nghieng hoc nghe");
  assert(
    recommendTrack(bookish.scores.map((x) => ({ ...x, notable: false })), bookish.trackAffinity, "G9_HK2").recommendedTrack === "ACADEMIC_HIGH_SCHOOL",
    "G9_HK2: luon chon tim hieu ly thuyet => nghieng THPT"
  );
  const early = recommendTrack(plainScores, handsOn.trackAffinity, "G9_HK1");
  assert(early.recommendedTrack === "DUAL_EXPLORATION" && early.reason === "chua_toi_hoc_ky_chot", "truoc G9_HK2: luon DUAL (13-14 tuoi chua chot luong)");
  const empty = computePotentialProfile(content2, "hs-0", [], []).trackAffinity;
  assert(empty.lean === 50 && empty.vocationalAffinity === 50, "chua tra loi => thien huong 50 (trung tinh)");
  assert(recommendTrack(plainScores, empty, "G9_HK2").recommendedTrack === "DUAL_EXPLORATION", "thien huong trung tinh => DUAL");

  // Khoa cung: nhom dung dau CO NHAN la Y te / Su pham => THPT du em nghieng thuc hanh, ke ca truoc G9_HK2.
  const healthTop = DOMAINS.map((d, i) => ({ domain: d.code, score: 50, rank: i + 2, notable: false }));
  const sk = healthTop.find((x) => x.domain === "SUC_KHOE_CONG_DONG")!;
  sk.rank = 1;
  sk.notable = true;
  const lockedTrack = recommendTrack(healthTop, handsOn.trackAffinity, "G8_HK1");
  assert(lockedTrack.recommendedTrack === "ACADEMIC_HIGH_SCHOOL" && lockedTrack.reason === "khoa_cung", "khoa cung: Y te noi bat => THPT, ke ca nghieng thuc hanh");
  sk.notable = false;
  assert(recommendTrack(healthTop, handsOn.trackAffinity, "G9_HK2").reason !== "khoa_cung", "Y te dung dau nhung CHUA noi bat => khong khoa cung");

  // Nguoi tra loi bua bi gan nhan luong ~ TRACK_ALPHA (nguong hieu chuan, giong nhan Noi bat).
  const rnd = seededRandom(20261104);
  const n = 3000;
  let labelled = 0;
  for (let i = 0; i < n; i++) {
    const rs = HK2.map((q) => ({ optionId: q.options[Math.floor(rnd() * q.options.length)]!.id }));
    const r = computePotentialProfile(content2, `bua${i}`, rs, []);
    const t = recommendTrack(r.scores.map((x) => ({ ...x, notable: false })), r.trackAffinity, "G9_HK2");
    if (t.recommendedTrack !== "DUAL_EXPLORATION") labelled++;
  }
  console.log(`   -> nguoi tra loi bua bi gan nhan luong: ${((labelled / n) * 100).toFixed(1)}% (muc tieu ~${TRACK_ALPHA * 100}%, nguong ${TRACK_CUTOFF}/${100 - TRACK_CUTOFF})`);
  assert(labelled / n <= TRACK_ALPHA + 0.04, "nguoi tra loi bua hiem khi bi gan nhan luong");

  // Doi hoc ky cua 1 cau => dau van tay noi dung doi (ho so biet duoc tinh tren bo cau nao).
  const moved = ALL_SURVEY_QUESTIONS.map((q, i) => (i === 0 ? { ...q, curriculumTerm: "G8_HK1" as const } : q));
  assert(
    computeContentHash({ questions: moved, activities: ACTIVITIES }) !== computeContentHash({ questions: ALL_SURVEY_QUESTIONS, activities: ACTIVITIES }),
    "doi hoc ky cua cau hoi => contentHash doi"
  );
  const tpl = buildTemplateInsight({ studentId: "hs-tpl", term: "G9_HK2", ...handsOn });
  assert(checkInsightText(tpl) === null, `nhan xet template (co nhanh nghe + buoc theo hoc ky) qua kiem duyet: ${checkInsightText(tpl)}`);
}

console.log("\n=== 7) Dang nhap giao vien bang tai khoan rieng ===");
async function authChecks() {
  const h = await hashPassword("matkhau-rieng-123");
  assert(h.startsWith("scrypt$") && !h.includes("matkhau"), "mat khau duoc bam scrypt, khong luu dang ro");
  assert(await verifyPassword("matkhau-rieng-123", h), "dung mat khau => dang nhap duoc");
  assert(!(await verifyPassword("matkhau-rieng-124", h)), "sai 1 ky tu => tu choi");
  assert(!(await verifyPassword("bat-ky", null)) && !(await verifyPassword("x", "rac$rac")), "chua co mat khau / chuoi hong => tu choi, khong crash");
  assert((await hashPassword("a1b2c3d4e5f6")) !== (await hashPassword("a1b2c3d4e5f6")), "moi lan bam co salt rieng");
  const temp = generateTempPassword();
  assert(temp.length === 12 && !/[0O1lI]/.test(temp), "mat khau tam 12 ky tu, khong co ky tu de nham");
  assert(validateNewPassword("ngan", "co.an@truong.edu.vn") !== null, "mat khau qua ngan bi tu choi");
  assert(validateNewPassword("co.an-2026-xyz", "co.an@truong.edu.vn") !== null, "mat khau chua ten email bi tu choi");
  assert(validateNewPassword("Hoa-ban-trang-2026", "co.an@truong.edu.vn") === null, "mat khau hop le duoc chap nhan");
  let st = { failedLoginCount: 0, lockedUntil: null as string | null };
  const now = new Date("2026-10-06T10:00:00Z");
  for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) st = nextLoginState(st, false, now);
  assert(!isLocked(st, now) && st.failedLoginCount === MAX_FAILED_LOGINS - 1, `sai ${MAX_FAILED_LOGINS - 1} lan => chua khoa`);
  st = nextLoginState(st, false, now);
  assert(isLocked(st, now), `sai ${MAX_FAILED_LOGINS} lan => khoa tam`);
  assert(!isLocked(st, new Date(now.getTime() + 16 * 60_000)), "sau 15 phut => het khoa");
  assert(nextLoginState({ failedLoginCount: 3, lockedUntil: null }, true, now).failedLoginCount === 0, "dang nhap dung => xoa dem sai");
}
// tsx chay file nay dang CommonJS (khong co top-level await) -> chay phan async roi moi tong ket.
authChecks()
  .catch((err) => {
    failures++;
    console.error("❌ FAIL: loi khi kiem thu dang nhap:", err);
  })
  .finally(() => {
    console.log("\n=== KET QUA ===");
    if (failures > 0) {
      console.error(`\n❌ CO ${failures} LOI - xem chi tiet o tren.`);
      process.exit(1);
    } else {
      console.log("\n✅ TAT CA KIEM TRA LOGIC DEU PASS.");
    }
  });
