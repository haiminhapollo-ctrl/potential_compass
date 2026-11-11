import "server-only";
import type { Repository } from "./repository";

// ============================================================================
// FACTORY - chon backend theo bien moi truong DATA_BACKEND (xem .env.example)
// UI/Server Actions luon import tu day: `import { getRepository } from "@/lib/data"`
// KHONG BAO GIO import truc tiep LocalJsonRepository/SupabaseRepository o noi khac.
// ============================================================================

let cached: Repository | null = null;

export function getRepository(): Repository {
  if (cached) return cached;

  const backend = process.env.DATA_BACKEND ?? "local";

  if (backend === "supabase") {
    // Import dong de tranh keo @supabase/supabase-js vao khi khong dung toi.
    const { SupabaseRepository } = require("./supabase/repository") as typeof import("./supabase/repository");
    cached = new SupabaseRepository();
  } else {
    const { LocalJsonRepository } = require("./local/repository") as typeof import("./local/repository");
    cached = new LocalJsonRepository();
  }

  return cached;
}

export type { Repository, ActivityLogPatch } from "./repository";
export { NotFoundError } from "./repository";
