import { webSearchUrl, youtubeSearchUrl } from "@/lib/media";
import type { Resource } from "@/lib/types";

const TYPE_LABEL: Record<Resource["type"], string> = {
  video: "Video",
  bai_viet: "Bài viết",
  khoa_hoc: "Khóa học",
  khac: "Khác",
};

// Tai nguyen CHUA co link that (url = null, xem src/lib/content/resources.ts) van
// bam duoc: mo trang tim kiem theo tieu de thay vi mot dong chu "chet". Link that
// do giao vien dan o trang Quan ly tai nguyen luon duoc uu tien.
export function ResourceList({ resources }: { resources: Resource[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {resources.map((r) => {
        const href = r.url ?? (r.type === "video" ? youtubeSearchUrl(r.title) : webSearchUrl(r.title));
        return (
          <li key={r.id}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="clay-sunken focus-ring block px-4 py-3 transition-colors duration-150 hover:border-brand-400"
            >
              <p className="text-sm font-bold text-ink-800">{r.title}</p>
              <p className="pretty mt-0.5 text-sm font-medium text-ink-500">{r.description}</p>
              <p className="mt-1.5 text-sm font-semibold text-ink-500">
                {r.durationLabel} · {TYPE_LABEL[r.type]} ·{" "}
                <span className="font-bold text-brand-600">
                  {r.url ? "Mở tài liệu ↗" : r.type === "video" ? "Tìm trên YouTube ↗" : "Tìm trên Google ↗"}
                </span>
              </p>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
