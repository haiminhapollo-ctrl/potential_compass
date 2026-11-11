import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RIASEC_ITEMS, RIASEC_SCALE } from "@/lib/content/riasec-items";
import { isRiasecPending } from "@/lib/profile-service";
import { RIASEC_NOTICE } from "@/lib/riasec";
import { Button } from "@/components/ui/Button";
import { submitRiasecAction } from "./actions";

// Bai doi chieu RIASEC (O*NET Mini-IP, de xuat B1) - hoc sinh KHONG nhan ket qua; chi de kiem dinh bo khao sat.
export default async function RiasecPage({ searchParams }: { searchParams: Promise<{ loi?: string }> }) {
  const { loi } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/hoc-sinh/dang-nhap");
  if (!(await isRiasecPending(session.id))) redirect("/hoc-sinh/ho-so");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Em thích những công việc nào?</h1>
        <p className="pretty mt-1.5 text-sm font-medium leading-relaxed text-ink-500">
          Với mỗi việc, chọn mức em thích. Không cần nghĩ em có làm giỏi hay không, cũng không cần nghĩ đến tiền lương
          hay học bao lâu. Không có đúng sai. (30 câu, khoảng 5 phút)
        </p>
      </div>
      <form action={submitRiasecAction} className="space-y-3">
        <input type="hidden" name="startedAt" value={new Date().toISOString()} />
        {RIASEC_ITEMS.map((item, idx) => (
          <fieldset key={item.id} className="clay above-grain p-4">
            <legend className="pretty mb-2.5 text-sm font-bold text-ink-900">
              {idx + 1}. {item.text}
            </legend>
            <div className="flex flex-wrap gap-2">
              {RIASEC_SCALE.map((label, i) => (
                <label
                  key={label}
                  className="flex cursor-pointer items-center gap-1.5 rounded-clay-sm bg-clay-surface px-3 py-2 text-xs font-semibold text-ink-700
                             shadow-clay-sm has-[:checked]:bg-brand-100 has-[:checked]:text-brand-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400"
                >
                  <input type="radio" name={`r_${item.id}`} value={i + 1} required className="accent-brand-600" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        {loi && (
          <p role="alert" className="text-sm font-semibold text-status-error">
            Em chọn đủ 30 câu rồi bấm nộp nhé.
          </p>
        )}
        <Button type="submit" className="w-full">
          Nộp bài
        </Button>
      </form>
      <footer className="pretty space-y-1.5 text-xs font-medium leading-relaxed text-ink-400">
        <p>{RIASEC_NOTICE.vi}</p>
        <p lang="en">{RIASEC_NOTICE.en}</p>
        <details>
          <summary className="cursor-pointer font-bold">Điều chỉnh và miễn trừ (modifications and disclaimers)</summary>
          <p className="mt-1">{RIASEC_NOTICE.modifications}</p>
          <a href={RIASEC_NOTICE.licenseUrl} className="underline" target="_blank" rel="noreferrer">
            O*NET Tools Developer License
          </a>
        </details>
      </footer>
    </div>
  );
}
