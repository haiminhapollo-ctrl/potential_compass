import Link from "next/link";
import { requireTeacher } from "@/lib/auth/session";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LacArrow } from "@/components/ui/Motifs";
import { changePasswordAction } from "./actions";

const ERRORS: Record<string, string> = {
  current: "Mật khẩu hiện tại không đúng.",
  mismatch: "Hai lần nhập mật khẩu mới không khớp.",
  same: "Mật khẩu mới phải khác mật khẩu hiện tại.",
  weak: `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự, không chứa phần tên email và không lặp một ký tự.`,
};

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await requireTeacher({ allowPasswordChange: true });
  const forced = Boolean(session.mustChangePassword);
  const message = error ? ERRORS[error] : null;

  return (
    <main id="noi-dung" className="above-grain mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-12">
      <header className="text-center">
        <h1 className="balance text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
          {forced ? "Đặt mật khẩu của thầy cô" : "Đổi mật khẩu"}
        </h1>
        {forced && (
          <p className="pretty mt-2 text-sm font-medium text-ink-500">
            Thầy cô đang dùng mật khẩu tạm. Thầy cô đặt mật khẩu riêng để tiếp tục, mật khẩu này chỉ thầy cô biết.
          </p>
        )}
      </header>
      <Card className="p-6">
        <form action={changePasswordAction} className="space-y-4">
          {[
            { id: "current", label: forced ? "Mật khẩu tạm" : "Mật khẩu hiện tại", auto: "current-password" },
            { id: "next", label: `Mật khẩu mới (ít nhất ${MIN_PASSWORD_LENGTH} ký tự)`, auto: "new-password" },
            { id: "confirm", label: "Nhập lại mật khẩu mới", auto: "new-password" },
          ].map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="mb-2 block text-sm font-bold text-ink-700">
                {f.label}
              </label>
              <input
                id={f.id}
                name={f.id}
                type="password"
                required
                minLength={f.id === "current" ? 1 : MIN_PASSWORD_LENGTH}
                autoComplete={f.auto}
                className="clay-input text-base"
              />
            </div>
          ))}
          {message && (
            <p role="alert" className="text-sm font-semibold text-status-error">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full">
            Lưu mật khẩu
          </Button>
        </form>
      </Card>
      {!forced && (
        <p className="text-center text-sm font-medium">
          <Link href="/giao-vien/dashboard" className="focus-ring inline-flex items-center gap-1.5 rounded font-bold text-brand-600 hover:underline">
            <LacArrow className="h-2.5 w-4 shrink-0 rotate-180" />
            Quay lại
          </Link>
        </p>
      )}
    </main>
  );
}
