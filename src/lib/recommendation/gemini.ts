import "server-only"; // GEMINI_API_KEY khong duoc phep lo ra client duoi bat ky hinh thuc nao
import { TERM_INFO } from "../curriculum";
import { getDomain } from "../domains";
import {
  buildTemplateInsight,
  buildWeeklyReviewTemplate,
  checkInsightText,
  PROMPT_VERSION,
  type InsightContext,
} from "./insight-templates";

export { PROMPT_VERSION };

// ============================================================================
// TICH HOP GOOGLE GEMINI API - sinh nhan xet de hieu + giai thich ly do goi y
// ----------------------------------------------------------------------------
// - Neu KHONG co GEMINI_API_KEY: tu dong dung template (insight-templates.ts)
//   => ung dung KHONG BAO GIO crash hay trang trong vi thieu AI key.
// - Neu co key nhung goi API loi (mang, het quota...): catch va fallback ve
//   template, log loi ra console de debug, KHONG lam vo trai nghiem hoc sinh.
// - Package dung: "@google/genai" (SDK chinh thuc, hop nhat, cua Google).
//   Luu y: API cua Google Gen AI SDK cap nhat kha thuong xuyen. Doan code duoi
//   day dung phuong thuc `ai.models.generateContent(...)` la cach on dinh,
//   duoc ho tro lau dai tinh den thoi diem viet code (dau nam 2025). Neu SDK
//   sau nay doi API, CHI can sua trong file nay (moi noi khac goi qua
//   generateInsightText/generateWeeklyReviewText nen khong bi anh huong).
//   Xem tai lieu moi nhat: https://ai.google.dev/gemini-api/docs
// ============================================================================

/** Model mac dinh: dong Flash-Lite on dinh, re, nhanh (xem ai.google.dev/gemini-api/docs/models). Doi bang GEMINI_MODEL. */
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export interface GenerateResult {
  text: string;
  source: "gemini" | "template";
  model: string | null;
  promptVersion: string;
}

function geminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    // Import dong de tranh loi build neu package chua duoc cai dat trong moi
    // truong nao do (vi du script chay logic thuan khong can Gemini).
    const { GoogleGenAI, HarmBlockThreshold, HarmCategory } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const model = geminiModel();

    // Nguoi doc la tre em: chan noi dung nhay cam o muc NGHIEM nhat.
    const safetySettings = [
      HarmCategory.HARM_CATEGORY_HARASSMENT,
      HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    ].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }));

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { safetySettings, maxOutputTokens: 400, temperature: 0.6 },
    });

    // SDK co the tra text qua property hoac method tuy phien ban - xu ly ca hai.
    const maybeText = (response as unknown as { text?: string | (() => string) }).text;
    const text = typeof maybeText === "function" ? maybeText() : maybeText;

    if (typeof text !== "string" || !text.trim()) return null;
    const rejected = checkInsightText(text.trim());
    if (rejected) {
      console.warn(`[gemini] Cau tra loi bi loai (${rejected}), dung fallback template.`);
      return null;
    }
    return text.trim();
  } catch (err) {
    console.error("[gemini] Loi khi goi Gemini API, dung fallback template:", err);
    return null;
  }
}

function buildInsightPrompt(ctx: InsightContext): string {
  const domainLines = ctx.scores
    .slice(0, 8)
    .map((s) => {
      const d = getDomain(s.domain);
      const branch = d?.academicOnly ? "nghe can hoc het THPT roi cao dang/dai hoc" : `hoc nghe sau lop 9: ${d?.vocationalBranch}; hoc tiep: ${d?.academicBranch}`;
      return `- ${d?.name ?? s.domain}: ${s.score}/100${s.notable ? ` (NOI BAT; ${branch})` : ""}`;
    })
    .join("\n");
  const term = TERM_INFO[ctx.term];

  return [
    `Ban la mot chuyen gia huong nghiep than thien, dang noi chuyen voi MOT HOC SINH THCS (${term.label}) o vung cao Viet Nam.`,
    "Duoi day la diem HO SO SO THICH theo 8 nhom linh vuc. Diem do MUC DO HUNG THU (khong phai nang luc hay kha nang), do mot bo cham diem theo quy tac tinh tu cau tra loi khao sat va danh gia hoat dong; 50 = ngang muc cua nguoi chon ngau nhien.",
    "Nhom co danh dau (NOI BAT) la nhom cao hon han muc ma nguoi tra loi bua co the dat. Nhom khong danh dau thi KHONG duoc goi la noi bat, ke ca khi diem cao.",
    "Ban CHI dien giai cac diem nay thanh loi van, khong tu suy doan them. Viet 1 doan nhan xet ngan (4-5 cau, tieng Viet, giong am ap, de hieu, KHONG dung tu chuyen mon).",
    "YEU CAU BAT BUOC:",
    "- KHONG ket luan tuyet doi ve nghe nghiep tuong lai cua hoc sinh, KHONG noi em 'gioi' hay 'co nang luc' o nhom nao (day la so thich).",
    "- Khuyen khich hoc sinh tiep tuc thu nghiem, kham pha them.",
    "- Neu co nhom (NOI BAT): nhac ten cac nhom do mot cach tu nhien, giai thich ngan vi sao viec em thich (thao lap, cham cay, tinh toan...) hop voi nghe cua nhom, va noi ro nghe do hoc duoc ngay sau lop 9 hay can hoc het THPT (dung thong tin trong ngoac).",
    `- Ket thuc bang MOT buoc tiep theo hop voi hoc ky em dang hoc (${term.label}: ${term.focus}). Goi y: "${term.nextStep}"`,
    "- KHONG noi em nen hoc nghe hay nen hoc THPT: viec chon luong do em cung gia dinh va thay co quyet dinh.",
    "- Neu KHONG co nhom nao (NOI BAT): noi nhe nhang rang ho so chua co nhom nao noi bat han (binh thuong o giai doan dau) va moi em thu hoat dong o nhieu nhom; KHONG noi em thich nhat hay hop nhat voi nhom nao.",
    "- Giong dieu tich cuc, khong tao ap luc, khong so sanh voi ban khac.",
    "- Muc doc hieu cua hoc sinh lop 6: moi cau duoi 20 tu, tong cong KHONG qua 90 tu, tu ngu doi thuong.",
    "- KHONG chen duong link, KHONG nhac gioi tinh, dan toc, hoan canh gia dinh, KHONG che bai hay dung tu tieu cuc.",
    "- Viet tu nhien nhu thay co noi chuyen voi hoc sinh. KHONG dung cau sao rong hay khen qua muc (vi du: 'tuyet voi', 'hanh trinh', 'kham pha ban than', 'dung ngai', 'the gioi'), KHONG dung emoji, KHONG dung dau gach ngang dai.",
    "- Chi tra ve doan nhan xet, khong tieu de, khong gach dau dong.",
    "",
    "Diem ho so:",
    domainLines,
  ].join("\n");
}

export async function generateInsightText(ctx: InsightContext): Promise<GenerateResult> {
  const geminiText = await callGemini(buildInsightPrompt(ctx));
  if (geminiText) return { text: geminiText, source: "gemini", model: geminiModel(), promptVersion: PROMPT_VERSION };
  return { text: buildTemplateInsight(ctx), source: "template", model: null, promptVersion: PROMPT_VERSION };
}

export async function generateWeeklyReviewText(
  ctx: InsightContext & { activitiesCompleted: number }
): Promise<GenerateResult> {
  const prompt = [
    buildInsightPrompt(ctx),
    "",
    `Hoc sinh nay da hoan thanh ${ctx.activitiesCompleted} hoat dong trai nghiem trong tuan qua.`,
    "Hay viet mot doan TONG KET TUAN (3-4 cau) dong vien hoc sinh, nhac lai nhom (NOI BAT) neu co, va goi y huong thu nghiem tuan toi.",
  ].join("\n");

  const geminiText = await callGemini(prompt);
  if (geminiText) return { text: geminiText, source: "gemini", model: geminiModel(), promptVersion: PROMPT_VERSION };
  return { text: buildWeeklyReviewTemplate(ctx), source: "template", model: null, promptVersion: PROMPT_VERSION };
}
