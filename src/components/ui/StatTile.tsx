// Stat tile theo dataviz skill: label (sentence case, khong dau hai cham),
// value lon dung so proportional (KHONG tabular-nums vi day la 1 con so don
// dung mot minh, khong phai cot can can chinh).
export function StatTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="clay above-grain p-5">
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-[-0.03em] text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-ink-400">{hint}</p>}
    </div>
  );
}
