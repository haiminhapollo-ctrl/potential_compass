"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/session";
import { normalizeMediaUrl } from "@/lib/media";
import { DOMAINS } from "@/lib/domains";
import { getRepository } from "@/lib/data";
import type { DomainCode, ResourceType } from "@/lib/types";

export async function updateResourceUrlAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const id = String(formData.get("id") ?? "");
  // Link hien cho hoc sinh bam -> chi nhan http(s) (chan "javascript:..." va link rac).
  const url = normalizeMediaUrl(String(formData.get("url") ?? ""));
  if (!id || url === undefined) return;

  const repo = getRepository();
  const resources = await repo.listResources();
  const resource = resources.find((r) => r.id === id);
  if (!resource || resource.url === url) return;

  const updated = { ...resource, url };
  await repo.appendAuditLog({ entityType: "resource", entityId: id, action: "update", actorId: session.id, before: resource, after: updated });
  await repo.upsertResource(updated);
  revalidatePath("/giao-vien/tai-nguyen");
}

export async function createResourceAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const domain = String(formData.get("domain") ?? "") as DomainCode;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "bai_viet") as ResourceType;
  const url = normalizeMediaUrl(String(formData.get("url") ?? ""));
  const durationLabel = String(formData.get("durationLabel") ?? "").trim();

  if (!DOMAINS.some((d) => d.code === domain) || !title || url === undefined) return;
  if (!["video", "bai_viet", "khoa_hoc", "khac"].includes(type)) return;

  const repo = getRepository();
  const id = `res_custom_${Date.now().toString(36)}`;

  const created = { id, domain, title, description, type, durationLabel, url, difficulty: "trung_binh" as const };
  await repo.appendAuditLog({ entityType: "resource", entityId: id, action: "create", actorId: session.id, before: null, after: created });
  await repo.upsertResource(created);
  revalidatePath("/giao-vien/tai-nguyen");
}

export async function deleteResourceAction(formData: FormData): Promise<void> {
  const session = await requireTeacher();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const repo = getRepository();
  const resource = (await repo.listResources()).find((r) => r.id === id);
  if (!resource) return;
  await repo.appendAuditLog({ entityType: "resource", entityId: id, action: "delete", actorId: session.id, before: resource, after: null });
  await repo.deleteResource(id);
  revalidatePath("/giao-vien/tai-nguyen");
}
