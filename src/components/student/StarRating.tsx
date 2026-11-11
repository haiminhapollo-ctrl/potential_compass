"use client";

import { useState } from "react";

const LABELS: Record<number, string> = {
  1: "Không thích",
  2: "Bình thường",
  3: "Khá thích",
  4: "Thích",
  5: "Rất thích!",
};

// Golden Ochre (#F59E0B) theo bang mau cai tien; bo filter drop-shadow de khu GPU-heavy style
const GOLD = "#F59E0B";
const EMPTY = "#C7C2B6";

export function StarRating({ name, defaultValue = 0 }: { name: string; defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div>
      <input type="hidden" name={name} value={value} />

      <div
        className="clay-sunken inline-flex items-center gap-1.5 px-3.5 py-2"
        role="radiogroup"
        aria-label="Mức độ hứng thú"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= shown;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} sao - ${LABELS[star]}`}
              className="focus-ring rounded p-1 text-3xl leading-none transition-transform duration-150 active:scale-95"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setValue(star)}
            >
              <span aria-hidden style={{ color: active ? GOLD : EMPTY }}>
                ★
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 h-5 text-[15px] font-semibold text-ink-500">
        {shown ? LABELS[shown] : "Chọn mức độ hứng thú của em"}
      </p>
    </div>
  );
}
