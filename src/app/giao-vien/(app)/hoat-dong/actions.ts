"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { normalizeMediaUrl } from "@/lib/media";
import { DOMAINS } from "@/lib/domains";
import { parseQuizText } from "@/lib/quiz";
import { isCurriculumTerm } from "@/lib/curriculum";
import type { ContentTerm, DomainCode } from "@/lib/types";

/** Hoc ky goi y (form) - gia tri la/rong => "ALL" (moi hoc ky). */
function parseContentTerm(raw: FormDataEntryValue | null): ContentTerm {
  return isCurriculumTerm(raw) ? raw : "ALL";
}

/** Nhom phu (tuy chon) phai la 1 trong 8 nhom va khac nhom chinh; doi nhom phu doi cach cham diem nen ghi nhat ky. */
function parseSecondaryDomain(raw: FormDataEntryValue | null, primary: DomainCode): DomainCode | null {
  const v = String(raw ?? "");
  return DOMAINS.some((d) => d.code === v) && v !== primary ? (v as DomainCode) : null;
}

function parseInstructions(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function toggleActivityActiveAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const repo = getRepository();
  const activities = await repo.listActivities();
  const activity = activities.find((a) => a.id === id);
  if (!activity) return;

  const updated = { ...activity, active: !activity.active };
  await repo.appendAuditLog({ entityType: "activity", entityId: id, action: "update", actorId: session.id, before: activity, after: updated });
  await repo.upsertActivity(updated);
  revalidatePath("/giao-vien/hoat-dong");
}

export async function createActivityAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const domain = String(formData.get("domain") ?? "") as DomainCode;
  if (!DOMAINS.some((d) => d.code === domain)) return;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") ?? 5);
  const instructionsRaw = formData.get("instructions");
  // Cau goi y cho o "Em muon ke them" (tu luan, KHONG bat buoc) sau hoat dong.
  const reflectionPrompt = String(formData.get("reflectionPrompt") ?? "").trim();

  const mediaUrl = normalizeMediaUrl(String(formData.get("mediaUrl") ?? ""));
  const example = String(formData.get("example") ?? "").trim();

  if (!domain || !title || !description || mediaUrl === undefined) return;

  const repo = getRepository();
  const id = `act_custom_${Date.now().toString(36)}`;

  const created = {
    id,
    domain,
    secondaryDomain: parseSecondaryDomain(formData.get("secondaryDomain"), domain),
    title,
    description,
    durationMinutes: Number.isFinite(durationMinutes) ? Math.min(5, Math.max(3, durationMinutes)) : 5,
    instructions: parseInstructions(instructionsRaw),
    reflectionPrompt,
    mediaUrl,
    example,
    active: true,
    curriculumTerm: parseContentTerm(formData.get("curriculumTerm")),
    quiz: [],
  };
  await repo.appendAuditLog({ entityType: "activity", entityId: id, action: "create", actorId: session.id, before: null, after: created });
  await repo.upsertActivity(created);
  revalidatePath("/giao-vien/hoat-dong");
}

/** Sua noi dung 1 hoat dong: anh/video minh hoa, vi du tham khao, cac buoc, goi y ke them. */
export async function updateActivityContentAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const mediaUrl = normalizeMediaUrl(String(formData.get("mediaUrl") ?? ""));
  if (!id || !title || !description || mediaUrl === undefined) return; // link khong phai http(s) -> bo qua

  const repo = getRepository();
  const activity = (await repo.listActivities()).find((a) => a.id === id);
  if (!activity) return;

  const updated = {
    ...activity,
    title,
    description,
    secondaryDomain: parseSecondaryDomain(formData.get("secondaryDomain"), activity.domain),
    instructions: parseInstructions(formData.get("instructions")),
    reflectionPrompt: String(formData.get("reflectionPrompt") ?? "").trim(),
    mediaUrl,
    example: String(formData.get("example") ?? "").trim(),
    curriculumTerm: parseContentTerm(formData.get("curriculumTerm")),
  };
  if (JSON.stringify(updated) === JSON.stringify(activity)) return;
  await repo.appendAuditLog({ entityType: "activity", entityId: id, action: "update", actorId: session.id, before: activity, after: updated });
  await repo.upsertActivity(updated);
  revalidatePath("/giao-vien/hoat-dong");
}

/**
 * Sua cau hoi on nhanh (quiz) cua 1 hoat dong - van ban theo dinh dang trong src/lib/quiz.ts (QuizEditor). Sai dinh dang
 * thi KHONG luu va tra loi cu the; ban nhap giao vien dang go van giu nguyen trong o soan. De trong = bo quiz.
 */
export async function updateActivityQuizAction(
  _prev: { error: string | null; saved: boolean },
  formData: FormData
): Promise<{ error: string | null; saved: boolean }> {
  const session = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  const repo = getRepository();
  const activity = (await repo.listActivities()).find((a) => a.id === id);
  if (!activity) return { error: "Không tìm thấy hoạt động.", saved: false };

  const parsed = parseQuizText(id, String(formData.get("quizText") ?? ""));
  if (!parsed.ok) return { error: parsed.error, saved: false };
  if (JSON.stringify(parsed.quiz) !== JSON.stringify(activity.quiz)) {
    const updated = { ...activity, quiz: parsed.quiz };
    await repo.appendAuditLog({ entityType: "activity", entityId: id, action: "update", actorId: session.id, before: activity, after: updated });
    await repo.upsertActivity(updated);
    revalidatePath("/giao-vien/hoat-dong");
  }
  return { error: null, saved: true };
}
