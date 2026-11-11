import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LacArrow, SunStar } from "@/components/ui/Motifs";
import { teacherLoginAction } from "./actions";

// Thong bao CHUNG cho sai email/mat khau - khong lo email nao co tai khoan.
const ERROR_MESSAGES: Record<string, string> = {
  empty: "Vui lòng nhập đầy đủ email và mật khẩu.",
  invalid: "Email hoặc mật khẩu không đúng.",
  locked: "Tài khoản tạm khóa 15 phút vì nhập sai mật khẩu nhiều lần. Thử lại sau hoặc nhờ quản trị viên đặt lại mật khẩu.",
  no_password: "Tài khoản chưa được cấp mật khẩu. Liên hệ quản trị viên của trường.",
  expired: "Phiên đăng nhập đã hết hạn (mật khẩu vừa được đổi). Vui lòng đăng nhập lại.",
};

export default async function TeacherLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main
      id="noi-dung"
      className="above-grain mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-12"
    >
      <header className="animate-clay-rise text-center">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-clay bg-brand-600 text-ochre-500"
          aria-hidden
        >
          <SunStar className="h-11 w-11" />
        </span>
        <h1 className="balance mt-4 text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
          Đăng nhập Giáo viên / Quản trị
        </h1>
      </header>

      <Card className="animate-clay-rise p-6" style={{ animationDelay: "70ms" }}>
        <form action={teacherLoginAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-ink-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="giaovien@truong.edu.vn"
              className="clay-input text-base"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold text-ink-700">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Mật khẩu của thầy cô"
              className="clay-input text-base"
              aria-describedby={error ? "loi-dang-nhap" : undefined}
              aria-invalid={error ? true : undefined}
              required
            />
            {error && (
              <p id="loi-dang-nhap" role="alert" className="mt-2.5 text-sm font-semibold text-status-error">
                {ERROR_MESSAGES[error] ?? "Có lỗi xảy ra. Vui lòng thử lại."}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Đăng nhập
          </Button>
        </form>
      </Card>

      <p className="clay-sunken pretty px-4 py-3 text-center text-xs font-medium leading-relaxed text-ink-500">
        Mỗi thầy cô có tài khoản riêng do quản trị viên của trường cấp. Lần đầu đăng nhập bằng mật khẩu tạm, hệ
        thống sẽ yêu cầu đặt mật khẩu mới. Quên mật khẩu: nhờ quản trị viên đặt lại.
      </p>

      <p className="text-center text-sm font-medium text-ink-500">
        <Link href="/" className="focus-ring inline-flex items-center gap-1.5 rounded font-bold text-brand-600 hover:underline">
          <LacArrow className="h-2.5 w-4 shrink-0 rotate-180" />
          Quay lại trang chủ
        </Link>
      </p>
    </main>
  );
}
