import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { LacArrow, SunStar } from "@/components/ui/Motifs";

export default function HomePage() {
  return (
    <main
      id="noi-dung"
      className="above-grain mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-5 py-12"
    >
      {/* Khoi mo dau: huy hieu la ban va tieu de - can LE TRAI de trang khong
          bi doi xung hoan toan tu tren xuong duoi. */}
      <header className="animate-clay-rise">
        <span
          className="grid h-20 w-20 place-items-center rounded-clay bg-brand-600 text-ochre-500"
          aria-hidden
        >
          <SunStar className="h-14 w-14" />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.03em] text-ink-900">Potential Compass</h1>
        <p className="pretty mt-2 max-w-[38ch] text-sm font-medium leading-relaxed text-ink-500">
          Giúp học sinh lớp 8, lớp 9 vùng cao biết mình hợp với nhóm nghề nào, và nghề đó học được ngay sau lớp 9
          hay cần học tiếp THPT.
        </p>
        {/* Noi ro trang lam gi (nhan xet mentor 11/2026: "doc trang web khong biet em lam cai gi"). */}
        <ol className="mt-4 space-y-1.5 text-sm font-medium text-ink-600">
          <li>
            <span className="nums font-extrabold text-brand-600">1.</span> Mỗi học kỳ trả lời vài câu hỏi tình huống
            theo bài Công nghệ trên lớp.
          </li>
          <li>
            <span className="nums font-extrabold text-brand-600">2.</span> Mỗi ngày làm một việc nhỏ 3–5 phút: xem video,
            thử tay như thợ điện, kỹ thuật viên nông nghiệp, thợ xây...
          </li>
          <li>
            <span className="nums font-extrabold text-brand-600">3.</span> Xem nhóm nghề em hứng thú và đường học lên
            nghề đó. Thầy cô dùng kết quả để trao đổi cùng gia đình.
          </li>
        </ol>
      </header>

      <div className="space-y-4">
        {/* Loi vao CHINH (hoc sinh) - khoi lon hon, co sac accent. */}
        <section
          className="clay animate-clay-rise p-6"
          style={{ animationDelay: "70ms" }}
        >
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-brand-600">Dành cho học sinh</p>
          <h2 className="balance mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink-900">
            Mỗi ngày 3–5 phút, hiểu thêm về chính em
          </h2>
          <p className="pretty mt-1.5 text-sm font-medium text-ink-500">
            Làm khảo sát một lần, rồi thử các hoạt động ngắn hằng ngày.
          </p>
          <LinkButton href="/hoc-sinh/dang-nhap" className="mt-5 w-full">
            Vào học
          </LinkButton>
        </section>

        {/* Loi vao PHU (giao vien) - hang mong hon, khong canh tranh thi giac. */}
        <Link
          href="/giao-vien/dang-nhap"
          className="clay-press focus-ring clay animate-clay-rise flex items-center justify-between
                     gap-3 px-5 py-4 hover:border-brand-400"
          style={{ animationDelay: "140ms" }}
        >
          <span>
            <span className="block text-sm font-bold text-ink-800">Tôi là giáo viên</span>
            <span className="block text-sm font-medium text-ink-500">Quản lý lớp, theo dõi học sinh</span>
          </span>
          <LacArrow className="h-3.5 w-6 shrink-0 text-brand-600" />
        </Link>
      </div>

    </main>
  );
}
