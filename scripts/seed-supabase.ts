/**
 * Nap du lieu vao mot project Supabase THAT (DATA_BACKEND=supabase).
 *
 * Chay: npm run seed:supabase
 * Yeu cau trong .env.local (hoac bien moi truong):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (vuot RLS - CHI dung o server/script)
 *
 * Chay TRUOC do: supabase/schema.sql roi supabase/policies.sql trong SQL Editor.
 *
 * Vi sao can script nay: o che do local, cac bang noi dung (8 nhom linh vuc,
 * cau hoi khao sat, hoat dong, tai nguyen) duoc lay tu src/lib/content lam gia
 * tri mac dinh. SupabaseRepository thi doc THUAN tu DB, va schema.sql chi TAO
 * BANG chu khong chen du lieu - nen neu khong seed, khao sat co 0 cau.
 *
 * Script CHI nap bang noi dung, khong tao truong/giao vien/hoc sinh nao. Tao
 * truong va quan tri vien dau tien bang `npm run teacher:account` (xem README).
 *
 * An toan chay nhieu lan: dung upsert theo khoa chinh.
 *
 * LUU Y KY THUAT (giong scripts/seed-local.ts): script chi import cac module
 * logic THUAN. Khong dung src/lib/data/supabase/client.ts vi file do import
 * "server-only" (chi chay trong Next.js runtime), nen o day tu tao client.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DOMAINS } from "../src/lib/domains";
import { SURVEY_QUESTIONS } from "../src/lib/content/survey-questions";
import { ACTIVITIES } from "../src/lib/content/activities";
import { RESOURCES } from "../src/lib/content/resources";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Thieu bien moi truong ${name}. Dat trong .env.local (xem .env.example) ` +
        `roi chay lai. Can ca NEXT_PUBLIC_SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY.`
    );
  }
  return v;
}

// Khoi tao LAZY: neu thieu bien moi truong, loi se do main().catch() bat va in
// ra mot dong thong bao gon, thay vi stack trace o top-level module.
let cached: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!cached) {
    cached = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

function check(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`[Supabase] Loi ${context}: ${error.message}`);
}

async function seedContentTables(): Promise<void> {
  // ---- 8 nhom linh vuc (phai co TRUOC activities/resources vi la khoa ngoai) ----
  const { error: eDomains } = await db().from("domains").upsert(
    DOMAINS.map((d) => ({
      code: d.code,
      name: d.name,
      short_description: d.shortDescription,
      why_relevant: d.whyRelevant,
      sample_careers: d.sampleCareers,
      icon: d.icon,
      color_hex: d.colorHex,
    })),
    { onConflict: "code" }
  );
  check("upsert domains", eDomains);
  console.log(`✅ ${DOMAINS.length} nhom linh vuc`);

  // ---- Cau hoi khao sat + lua chon ----
  const { error: eQ } = await db().from("survey_questions").upsert(
    SURVEY_QUESTIONS.map((q) => ({ id: q.id, order: q.order, scenario: q.scenario, curriculum_term: q.curriculumTerm, active: q.active })),
    { onConflict: "id" }
  );
  check("upsert survey_questions", eQ);

  const options = SURVEY_QUESTIONS.flatMap((q) =>
    q.options.map((o) => ({
      id: o.id,
      question_id: q.id,
      text: o.text,
      domain_weights: o.domainWeights,
      track_weights: o.trackWeights,
    }))
  );
  const { error: eO } = await db().from("survey_options").upsert(options, { onConflict: "id" });
  check("upsert survey_options", eO);
  console.log(`✅ ${SURVEY_QUESTIONS.length} cau hoi khao sat (${options.length} lua chon)`);

  // ---- Hoat dong trai nghiem ----
  const { error: eA } = await db().from("activities").upsert(
    ACTIVITIES.map((a) => ({
      id: a.id,
      domain: a.domain,
      secondary_domain: a.secondaryDomain,
      title: a.title,
      description: a.description,
      duration_minutes: a.durationMinutes,
      instructions: a.instructions,
      reflection_prompt: a.reflectionPrompt,
      media_url: a.mediaUrl,
      example: a.example,
      active: a.active,
      curriculum_term: a.curriculumTerm,
      quiz: a.quiz,
    })),
    { onConflict: "id" }
  );
  check("upsert activities", eA);
  console.log(`✅ ${ACTIVITIES.length} hoat dong trai nghiem`);

  // ---- Tai nguyen hoc tap ----
  const { error: eR } = await db().from("resources").upsert(
    RESOURCES.map((r) => ({
      id: r.id,
      domain: r.domain,
      title: r.title,
      description: r.description,
      type: r.type,
      duration_label: r.durationLabel,
      url: r.url,
      difficulty: r.difficulty,
    })),
    { onConflict: "id" }
  );
  check("upsert resources", eR);
  console.log(`✅ ${RESOURCES.length} tai nguyen hoc tap`);
}

async function main(): Promise<void> {
  console.log("== Nap noi dung cho Potential Compass (Supabase backend) ==\n");
  await seedContentTables();
  console.log("\n== Xong. ==");
  console.log('Chua co truong/quan tri vien? Chay: npm run teacher:account -- school "<Ten truong>" "<Tinh>"');
}

main().catch((err) => {
  console.error("\n❌ Loi khi seed Supabase:", err instanceof Error ? err.message : err);
  process.exit(1);
});
