// ============================================================================
// LINK ANH/VIDEO MINH HOA - dung chung cho trang giao vien (nhap) va hoc sinh (hien).
// Link do giao vien dan vao => van coi la DU LIEU NGOAI: chi nhan http(s), YouTube
// nhung qua youtube-nocookie (khong cookie theo doi tre em).
// ============================================================================

/** Chuan hoa link giao vien nhap: rong -> null, khong phai http(s) -> undefined (tu choi). */
export function normalizeMediaUrl(raw: string): string | null | undefined {
  const url = raw.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Link YouTube (watch / youtu.be / shorts / embed) -> link nhung; khong phai YouTube -> null. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/** Fallback khi chua co link that: tim tren YouTube theo tieu de (KHONG tu bia link cu the). */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Fallback cho tai lieu dang bai viet: Google voi SafeSearch bat. */
export function webSearchUrl(query: string): string {
  return `https://www.google.com/search?safe=active&q=${encodeURIComponent(query)}`;
}
