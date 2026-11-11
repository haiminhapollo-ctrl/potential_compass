import type { ReactNode } from "react";

// Huy hieu vien net don 1px (#E2DED5), cham mau hinh thoi (diamond micro-motif) cach dieu.
export function Badge({
  children,
  colorHex,
  className = "",
}: {
  children: ReactNode;
  colorHex?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-clay-sm border border-clay-line bg-clay-surface px-3 py-1.5
                  text-xs font-bold text-ink-800 ${className}`}
    >
      {colorHex ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rotate-45"
          style={{ backgroundColor: colorHex }}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
