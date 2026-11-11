import { requireAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Card, CardTitle } from "@/components/ui/Card";
import { CreateTeacherForm, ResetPasswordButton } from "./TeacherAccountForms";

// Quan ly tai khoan giao vien - chi quan tri vien (role admin) cua truong.
export default async function TeacherAccountsPage() {
  const session = await requireAdmin();
  const repo = getRepository();
  const teachers = await repo.listTeachers(session.schoolId);
  const creds = await Promise.all(teachers.map((t) => repo.getTeacherCredentials(t.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Tài khoản giáo viên</h1>
        <p className="pretty mt-1 max-w-[75ch] text-sm font-medium leading-relaxed text-ink-500">
          Mỗi thầy cô một tài khoản riêng. Khi tạo hoặc đặt lại, hệ thống cấp mật khẩu tạm (chỉ hiện một lần); lần
          đầu đăng nhập thầy cô phải đặt mật khẩu mới. Sai mật khẩu 5 lần liên tiếp, tài khoản tạm khóa 15 phút.
        </p>
      </div>

      <Card>
        <CardTitle>Danh sách ({teachers.length})</CardTitle>
        <ul className="mt-3 space-y-2">
          {teachers.map((t, i) => {
            const c = creds[i];
            const status = !c?.passwordHash
              ? "Chưa có mật khẩu"
              : c.mustChangePassword
                ? "Đang dùng mật khẩu tạm"
                : c.lockedUntil && new Date(c.lockedUntil) > new Date()
                  ? "Đang tạm khóa"
                  : "Đang hoạt động";
            return (
              <li key={t.id} className="clay-sunken flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-800">
                    {t.fullName} {t.role === "admin" && <span className="text-xs font-semibold text-brand-600">· quản trị</span>}
                    {t.id === session.id && <span className="text-xs font-semibold text-ink-400"> · tài khoản của thầy cô</span>}
                  </p>
                  <p className="text-xs font-medium text-ink-500">
                    {t.email} · {status}
                  </p>
                </div>
                {t.id !== session.id && <ResetPasswordButton teacherId={t.id} name={t.fullName} />}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>+ Tạo tài khoản giáo viên</CardTitle>
        <CreateTeacherForm />
      </Card>
    </div>
  );
}
