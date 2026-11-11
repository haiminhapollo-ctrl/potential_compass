import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CLIENT (server-only)
// ----------------------------------------------------------------------------
// Kien truc nay CHI goi Supabase tu server (Server Components / Server
// Actions / Route Handlers) - trinh duyet KHONG BAO GIO goi thang Supabase.
// Vi vay repository dung SERVICE ROLE KEY (vuot qua RLS) va tu kiem soat
// quyen truy cap o tang ung dung (xem src/lib/auth/session.ts kiem tra
// session TRUOC khi goi bat ky ham repository nao).
//
// RLS (supabase/policies.sql) van nen duoc bat nhu 1 lop phong thu thu 2
// (defense in depth) phong truong hop sau nay co client-side query truc tiep.
//
// "server-only" bao dam file nay KHONG BAO GIO bi bundle nham vao code chay
// tren trinh duyet (se bao loi build ngay neu vo tinh import tu Client
// Component).
// ============================================================================
import "server-only";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Thieu NEXT_PUBLIC_SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY. " +
        "Kiem tra file .env.local (xem .env.example) hoac dat DATA_BACKEND=local de chay tren may dev khong can Supabase."
    );
  }

  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
