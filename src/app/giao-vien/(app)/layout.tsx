import Link from "next/link";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { SunStar } from "@/components/ui/Motifs";
import { TeacherLogoutButton } from "./TeacherLogoutButton";
import { TeacherNav } from "./TeacherNav";

export default async function TeacherAppLayout({ children }: { children: React.ReactNode }) {
  // Kiem tra vai tro + phien ban phien + bat buoc doi mat khau tam (xem requireTeacher).
  const session = await requireTeacher();

  const repo = getRepository();
  const school = session.schoolId ? await repo.getSchool(session.schoolId) : null;

  return (
    <div className="min-h-dvh">
      {/* Phan he Giao vien dung CHUNG bang mau sang voi phan he Hoc sinh (khong
          cat mot khoi toi giua trang sang) - phan biet bang sac accent, khong
          phai bang dao nguoc do sang. */}
      <header className="above-grain px-4 pt-4">
        <div className="clay mx-auto max-w-6xl px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-clay-sm bg-brand-600 text-ochre-500"
                aria-hidden
              >
                <SunStar className="h-8 w-8" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-[-0.01em] text-ink-900">
                  Potential Compass
                  <span className="hidden sm:inline"> · </span>
                  <span className="block sm:inline">Giáo viên/Quản trị</span>
                </p>
                {school && <p className="truncate text-xs font-medium text-ink-400">{school.name}</p>}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href="/giao-vien/doi-mat-khau"
                className="focus-ring rounded-full px-3 py-1.5 text-xs font-bold text-ink-500 hover:text-ink-800"
              >
                Đổi mật khẩu
              </Link>
              <TeacherLogoutButton />
            </div>
          </div>

          <div className="mt-3">
            <TeacherNav isAdmin={session.role === "admin"} />
          </div>
        </div>
      </header>

      <main id="noi-dung" className="above-grain mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
