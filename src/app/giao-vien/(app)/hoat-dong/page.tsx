import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { DOMAINS } from "@/lib/domains";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { quizToText } from "@/lib/quiz";
import { CURRICULUM_TERMS, TERM_INFO } from "@/lib/curriculum";
import type { ContentTerm } from "@/lib/types";
import { createActivityAction, toggleActivityActiveAction, updateActivityContentAction } from "./actions";
import { QuizEditor } from "./QuizEditor";

/** Hoc ky goi y hoat dong ("ALL" = moi hoc ky) - bam bai Cong nghe/KHTN tren lop (curriculum.ts). */
function TermSelect({ value }: { value: ContentTerm }) {
  return (
    <select name="curriculumTerm" defaultValue={value} aria-label="Học kỳ gợi ý" className="clay-input">
      <option value="ALL">Mọi học kỳ</option>
      {CURRICULUM_TERMS.map((t) => (
        <option key={t} value={t}>
          Chỉ {TERM_INFO[t].label}
        </option>
      ))}
    </select>
  );
}

export default async function ActivityManagementPage() {
  const session = await getSession();
  if (!session) redirect("/giao-vien/dang-nhap");

  const repo = getRepository();
  const activities = await repo.listActivities();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Quản lý hoạt động trải nghiệm
        </h1>
        <p className="pretty mt-1 max-w-[75ch] text-sm font-medium leading-relaxed text-ink-500">
          Bật/tắt, sửa nội dung hoặc thêm hoạt động mới cho từng nhóm lĩnh vực (nên giữ 3–5 phút/hoạt động
          và <strong className="font-bold">làm được ngay</strong>, không phụ thuộc tình huống ngẫu nhiên). Mỗi
          hoạt động nên có <strong className="font-bold">ví dụ tham khảo</strong> và, nếu có thể, 1 link ảnh hoặc
          video YouTube minh họa cách làm. Học sinh sẽ thấy ngay dưới phần hướng dẫn.
        </p>
      </div>

      {DOMAINS.map((domain) => {
        const domainActivities = activities.filter((a) => a.domain === domain.code);
        return (
          <Card key={domain.code}>
            <CardTitle>
              {domain.icon} {domain.name}{" "}
              <span className="nums text-sm font-semibold text-ink-400">({domainActivities.length})</span>
            </CardTitle>
            {domainActivities.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-ink-400">Chưa có hoạt động.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {domainActivities.map((a) => (
                  <li key={a.id} id={`act-${a.id}`} className="clay-sunken px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-800">{a.title}</p>
                      <p className="pretty text-xs font-medium text-ink-500">{a.description}</p>
                      <p className="mt-1 text-xs font-semibold text-ink-400">
                        {a.curriculumTerm !== "ALL" ? `${TERM_INFO[a.curriculumTerm].label} · ` : ""}
                        {a.secondaryDomain ? `Nhóm phụ: ${DOMAINS.find((d) => d.code === a.secondaryDomain)?.name} · ` : ""}
                        {a.mediaUrl ? "🎬 Có ảnh/video" : "Chưa có ảnh/video"} ·{" "}
                        {a.example ? "Có ví dụ" : "Chưa có ví dụ"}
                      </p>
                    </div>
                    <form action={toggleActivityActiveAction} className="shrink-0">
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        aria-label={`${a.active ? "Tắt" : "Bật"} hoạt động ${a.title}`}
                        className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-extrabold
                          transition-colors duration-150 hover:shadow-clay-pressed
                          active:translate-y-px active:shadow-clay-pressed ${
                            a.active
                              ? "bg-status-success-wash text-status-success shadow-clay-sm"
                              : "bg-clay-surface text-ink-400 shadow-clay-sm"
                          }`}
                      >
                        {a.active ? "Đang bật" : "Đã tắt"}
                      </button>
                    </form>
                    </div>
                    <details className="mt-2">
                      <summary className="focus-ring cursor-pointer rounded text-xs font-bold text-brand-600">
                        Sửa nội dung, ảnh/video, ví dụ
                      </summary>
                      <form action={updateActivityContentAction} className="mt-3 space-y-2.5">
                        <input type="hidden" name="id" value={a.id} />
                        <input name="title" required defaultValue={a.title} aria-label="Tên hoạt động" className="clay-input" />
                        <textarea name="description" required rows={2} defaultValue={a.description} aria-label="Mô tả ngắn" className="clay-input resize-y" />
                        <textarea name="instructions" rows={3} defaultValue={a.instructions.join("\n")} aria-label="Các bước, mỗi dòng 1 bước" className="clay-input resize-y" />
                        <select name="secondaryDomain" defaultValue={a.secondaryDomain ?? ""} aria-label="Nhóm phụ" className="clay-input">
                          <option value="">Không có nhóm phụ</option>
                          {DOMAINS.filter((d) => d.code !== a.domain).map((d) => (
                            <option key={d.code} value={d.code}>
                              Nhóm phụ: {d.icon} {d.name}
                            </option>
                          ))}
                        </select>
                        <TermSelect value={a.curriculumTerm} />
                        <input name="mediaUrl" type="url" defaultValue={a.mediaUrl ?? ""} placeholder="Link ảnh hoặc video YouTube minh họa (https://...)" aria-label="Link ảnh hoặc video minh họa" className="clay-input" />
                        <textarea name="example" rows={2} defaultValue={a.example} placeholder="Ví dụ tham khảo cách làm" aria-label="Ví dụ tham khảo" className="clay-input resize-y" />
                        <input name="reflectionPrompt" defaultValue={a.reflectionPrompt} placeholder="Câu gợi ý cho ô 'kể thêm' (không bắt buộc)" aria-label="Câu gợi ý kể thêm" className="clay-input" />
                        <Button type="submit">Lưu thay đổi</Button>
                      </form>
                    </details>
                    <details className="mt-2">
                      <summary className="focus-ring cursor-pointer rounded text-xs font-bold text-brand-600">
                        Câu hỏi ôn nhanh sau hoạt động ({a.quiz.length ? `${a.quiz.length} câu` : "chưa có"})
                      </summary>
                      <QuizEditor activityId={a.id} title={a.title} initialText={quizToText(a.quiz)} />
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      <Card>
        <CardTitle>+ Thêm hoạt động mới</CardTitle>
        <form action={createActivityAction} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="domain" required aria-label="Nhóm lĩnh vực" className="clay-input">
              <option value="">Chọn nhóm lĩnh vực...</option>
              {DOMAINS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
            <input
              name="durationMinutes"
              type="number"
              min={3}
              max={5}
              defaultValue={4}
              required
              aria-label="Số phút"
              className="clay-input"
              placeholder="Số phút (3-5)"
            />
          </div>
          <input
            name="title"
            required
            placeholder="Tên hoạt động"
            aria-label="Tên hoạt động"
            className="clay-input"
          />
          <textarea
            name="description"
            required
            rows={2}
            placeholder="Mô tả ngắn"
            aria-label="Mô tả ngắn"
            className="clay-input resize-y"
          />
          <textarea
            name="instructions"
            rows={3}
            placeholder={"Các bước thực hiện, mỗi dòng 1 bước"}
            aria-label="Các bước thực hiện"
            className="clay-input resize-y"
          />
          <select name="secondaryDomain" defaultValue="" aria-label="Nhóm phụ" className="clay-input">
            <option value="">Không có nhóm phụ (hoạt động chỉ thuộc 1 nhóm)</option>
            {DOMAINS.map((d) => (
              <option key={d.code} value={d.code}>
                Nhóm phụ: {d.icon} {d.name}
              </option>
            ))}
          </select>
          <TermSelect value="ALL" />
          <input
            name="mediaUrl"
            type="url"
            placeholder="Link ảnh hoặc video YouTube minh họa (không bắt buộc)"
            aria-label="Link ảnh hoặc video minh họa"
            className="clay-input"
          />
          <textarea
            name="example"
            rows={2}
            placeholder="Ví dụ tham khảo cách làm (nên có)"
            aria-label="Ví dụ tham khảo"
            className="clay-input resize-y"
          />
          <input
            name="reflectionPrompt"
            placeholder="Câu gợi ý cho ô 'kể thêm' sau hoạt động (không bắt buộc)"
            aria-label="Câu gợi ý kể thêm"
            className="clay-input"
          />
          <Button type="submit">+ Thêm hoạt động</Button>
        </form>
      </Card>
    </div>
  );
}
