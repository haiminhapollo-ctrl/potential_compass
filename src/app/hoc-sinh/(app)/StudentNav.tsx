"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/hoc-sinh/hoat-dong", label: "Hoạt động", icon: "🎯" },
  { href: "/hoc-sinh/ho-so", label: "Hồ sơ", icon: "🧭" },
  { href: "/hoc-sinh/tong-ket-tuan", label: "Tuần này", icon: "📅" },
];

// ============================================================================
// THANH DIEU HUONG PHAN HE HOC SINH
// ----------------------------------------------------------------------------
// Dien thoai (mac dinh): thanh NOI dan o DAY man hinh - trong tam ngon tay.
// Laptop (lg+): thanh dan day la thoi quen cua app dien thoai, tren man hinh
// rong no vua la o xa vua trong la. Nen tu lg tro len thanh nay tro thanh
// TINH va duoc day len ngay duoi header bang `order` (xem layout.tsx) - KHONG
// doi vi tri DOM, vi o mobile no phai nam sau <main> de ve dung lop.
//
// Muc dang xem: vien LOM + chu mau accent + aria-current="page".
// ============================================================================
export function StudentNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-1
                 lg:static lg:order-2 lg:px-4 lg:pb-0 lg:pt-1"
    >
      <div
        className="clay mx-auto flex max-w-lg items-stretch justify-around gap-1 p-1.5
                   md:max-w-2xl lg:max-w-3xl lg:justify-start lg:gap-2 lg:px-2 lg:py-2"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring flex flex-1 flex-col items-center gap-0.5 rounded-clay-sm px-2 py-2
                          text-xs font-bold transition-colors duration-150
                          lg:flex-none lg:flex-row lg:gap-2 lg:px-4 lg:py-2 lg:text-sm
                          ${
                            active
                              ? "bg-brand-100 text-brand-700 shadow-clay-inset"
                              : "text-ink-500 hover:bg-clay-sunken hover:text-ink-700 active:shadow-clay-pressed"
                          }`}
            >
              <span
                className={`text-lg transition-transform duration-200 ease-clay lg:text-base ${
                  active ? "scale-110 lg:scale-100" : ""
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
