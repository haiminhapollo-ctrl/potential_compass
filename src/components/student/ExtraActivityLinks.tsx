import Link from "next/link";
import { getDomain } from "@/lib/domains";
import { LacArrow } from "@/components/ui/Motifs";
import type { Activity } from "@/lib/types";

/** Danh sach goi y "kham pha them" (xem pickExtraActivities trong daily-pick.ts). */
export function ExtraActivityLinks({ activities }: { activities: Activity[] }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {activities.map((a) => {
        const d = getDomain(a.domain);
        return (
          <li key={a.id}>
            <Link
              href={`/hoc-sinh/hoat-dong/${a.id}`}
              className="clay clay-press focus-ring flex items-center justify-between gap-3 px-4 py-3 hover:border-brand-400"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ink-800">{a.title}</span>
                <span className="block truncate text-xs font-medium text-ink-400">
                  {d?.icon} {d?.name}
                </span>
              </span>
              <LacArrow className="h-3 w-5 shrink-0 text-brand-600" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
