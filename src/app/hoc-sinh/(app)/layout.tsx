import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { SunStar } from "@/components/ui/Motifs";
import { LogoutButton } from "./LogoutButton";
import { StudentNav } from "./StudentNav";
import { OfflineSyncBanner } from "@/components/student/OfflineSyncBanner";

// ============================================================================
// KHUNG PHAN HE HOC SINH
// ----------------------------------------------------------------------------
// Thiet ke uu tien DIEN THOAI (day la PWA hoc sinh dung hang ngay tren may
// ca nhan), nhung phai dung duoc ca tren may tinh phong tin hoc cua truong.
// Vi vay:
//   - Be ngang: max-w-lg tren dien thoai -> rong dan len max-w-3xl tu lg.
//     KHONG de dan het man hinh (dong van dai qua se kho doc).
//   - Dieu huong: dan DAY man hinh tren dien thoai, chuyen len DAU trang tu
//     lg (thanh dan day la thoi quen app dien thoai, tren laptop thi vua xa
//     vua trong la). Xem StudentNav.tsx.
//
// LUU Y XEP LOP: <StudentNav /> phai nam SAU <main> trong DOM. Neu long no vao
// trong <header>, utility .above-grain (z-index: 1) ghi de class z-10 cua
// header -> header va main cung z-index 1, main o sau nen ve TREN, va thanh
// dieu huong `fixed` bi noi dung phu kin. Tren desktop dung `order` de doi vi
// tri hien thi, khong doi vi tri DOM.
// ============================================================================

const SHELL = "mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-3xl";

export default async function StudentAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/hoc-sinh/dang-nhap");
  }

  const repo = getRepository();
  const student = await repo.getStudent(session.id);
  if (!student) {
    redirect("/hoc-sinh/dang-nhap?error=notfound");
  }

  return (
    // pb-28 chua cho thanh dieu huong dan day (dien thoai); tu lg thanh do len
    // dau trang nen khong can chua nua.
    <div className="flex min-h-dvh flex-col pb-28 lg:pb-10">
      <OfflineSyncBanner />

      <header className="above-grain sticky top-0 z-10 px-4 pb-1 pt-3 lg:static lg:order-1 lg:pt-5">
        <div className={`clay ${SHELL} px-4 py-3 lg:px-6 lg:py-5`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-clay-sm bg-brand-600 text-ochre-500 lg:h-12 lg:w-12"
                aria-hidden
              >
                <SunStar className="h-7 w-7 lg:h-8 lg:w-8" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-[-0.01em] text-ink-900 lg:text-base">
                  Xin chào, {student.displayName}!
                </p>
                <p className="text-xs font-medium text-ink-400">Potential Compass</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main id="noi-dung" className={`above-grain ${SHELL} flex-1 px-4 py-4 lg:order-3 lg:py-6`}>
        {children}
      </main>

      {/* Dat SAU <main> trong DOM: o dien thoai thanh nay `fixed` o day man hinh
          va phai ve TREN noi dung. Tren desktop dung `order` de day no len giua
          header va main thay vi doi vi tri DOM (lam vay se pha xep lop o mobile). */}
      <StudentNav />
    </div>
  );
}
