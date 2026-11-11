// ============================================================================
// HOA VAN BAN DIA TINH GON (bao cao cai tien UI 10/2026, muc 3): SVG noi tuyen
// vai tram byte, mau theo currentColor, KHONG animation, KHONG anh bitmap.
// Chi dung o diem nho (logo, mui ten dieu huong) - khong phu len nen trang.
// ============================================================================

// Ngoi sao mat troi 14 canh o tam mat trong dong Ngoc Lu (ban tinh gian).
const RAYS = 14;
const STAR_POINTS = Array.from({ length: RAYS * 2 }, (_, i) => {
  const r = i % 2 ? 4.4 : 10.6;
  const a = (Math.PI * i) / RAYS - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

export function SunStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11.4" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <polygon points={STAR_POINTS} />
    </svg>
  );
}

// Mui ten chuyen huong: dau nhon dai nhu mo chim Lac, hai vet long duoi vuot ve sau.
export function LacArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 6h10M1.5 2.5 4 6M4.5 2.5 7 6" />
      <path d="M11 2.5 18.5 6 11 9.5l2-3.5z" fill="currentColor" />
    </svg>
  );
}
