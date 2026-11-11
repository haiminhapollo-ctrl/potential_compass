import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SunStar } from "@/components/ui/Motifs";
import { studentLoginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  empty: "Vui lòng nhập mã học sinh.",
  notfound: "Không tìm thấy mã học sinh này. Kiểm tra lại hoặc hỏi giáo viên nhé.",
  expired: "Phiên đăng nhập của em đã hết. Các câu em đã chọn vẫn còn trên máy, em đăng nhập lại để làm tiếp nhé.",
};

export default async function StudentLoginPage({
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
        <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-ink-900">Đăng nhập học sinh</h1>
        <p className="pretty mt-1.5 text-sm font-medium text-ink-500">
          Nhập mã học sinh giáo viên đã cấp cho em
        </p>
      </header>

      <Card className="animate-clay-rise p-6" style={{ animationDelay: "70ms" }}>
        <form action={studentLoginAction} className="space-y-4">
          <div>
            <label htmlFor="studentCode" className="mb-2 block text-sm font-bold text-ink-700">
              Mã học sinh
            </label>
            <input
              id="studentCode"
              name="studentCode"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              className="clay-input text-base"
              aria-describedby={error ? "loi-dang-nhap" : undefined}
              aria-invalid={error && error !== "expired" ? true : undefined}
              required
            />
            {error && (
              <p
                id="loi-dang-nhap"
                role="alert"
                className={`mt-2.5 text-sm font-semibold ${error === "expired" ? "text-terracotta-700" : "text-status-error"}`}
              >
                {ERROR_MESSAGES[error] ?? "Có lỗi xảy ra. Em thử lại nhé."}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Vào học
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm font-medium text-ink-500">
        Chưa có mã?{" "}
        <Link href="/" className="focus-ring rounded font-bold text-brand-600 hover:underline">
          Quay lại trang chủ
        </Link>
      </p>
    </main>
  );
}
