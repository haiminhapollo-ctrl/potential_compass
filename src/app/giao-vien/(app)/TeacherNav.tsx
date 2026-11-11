"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/giao-vien/dashboard", label: "Tổng quan" },
  { href: "/giao-vien/lop-hoc", label: "Lớp học" },
  { href: "/giao-vien/cau-hoi", label: "Câu hỏi khảo sát" },
  { href: "/giao-vien/hoat-dong", label: "Hoạt động" },
  { href: "/giao-vien/tai-nguyen", label: "Tài nguyên" },
];

// Tab dieu huong phang: muc dang xem do nen suong rung, muc khac doi nen khi hover (khong noi khoi).
// Dien thoai: 6 muc cuon ngang -> tu cuon muc dang xem vao khung nhin, khong de no khuat ben phai.
export function TeacherNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, { href: "/giao-vien/giao-vien", label: "Giáo viên" }] : NAV_ITEMS;
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <nav className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
      <div className="flex gap-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              ref={active ? activeRef : undefined}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring whitespace-nowrap rounded-clay-sm px-4 py-2 text-sm font-bold
                          transition-colors duration-150
                          ${
                            active
                              ? "bg-brand-100 text-brand-700 shadow-clay-inset"
                              : "text-ink-500 hover:bg-clay-sunken hover:text-ink-800"
                          }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
