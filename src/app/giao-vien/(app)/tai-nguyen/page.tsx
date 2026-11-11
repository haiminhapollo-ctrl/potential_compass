import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { DOMAINS } from "@/lib/domains";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createResourceAction, deleteResourceAction, updateResourceUrlAction } from "./actions";

export default async function ResourceManagementPage() {
  const session = await getSession();
  if (!session) redirect("/giao-vien/dang-nhap");

  const repo = getRepository();
  const resources = await repo.listResources();
  const missingUrlCount = resources.filter((r) => !r.url).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">
          Quản lý tài nguyên học tập
        </h1>
        <p className="mt-1 text-sm font-medium text-ink-500">
          {resources.length} tài nguyên theo 8 nhóm lĩnh vực.
        </p>
      </div>

      {missingUrlCount > 0 && (
        <Card className="bg-status-warning-wash">
          <p className="pretty text-sm font-semibold leading-relaxed text-status-warning">
            Còn {missingUrlCount} tài nguyên chưa có đường dẫn, học sinh bấm vào sẽ được chuyển sang trang tìm kiếm.
            Thầy cô nên dán link video hoặc bài viết đã chọn lọc, rõ bản quyền và hợp với học sinh lớp 9.
          </p>
        </Card>
      )}

      {DOMAINS.map((domain) => {
        const domainResources = resources.filter((r) => r.domain === domain.code);
        return (
          <Card key={domain.code}>
            <CardTitle>
              {domain.icon} {domain.name}{" "}
              <span className="nums text-sm font-semibold text-ink-400">({domainResources.length})</span>
            </CardTitle>
            <ul className="mt-3 space-y-3">
              {domainResources.map((r) => (
                <li key={r.id} className="clay-sunken p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-800">{r.title}</p>
                      <p className="pretty text-xs font-medium text-ink-500">{r.description}</p>
                      <p className="mt-1 text-xs font-semibold text-ink-400">
                        {r.durationLabel} ·{" "}
                        {r.type === "video" ? "Video" : r.type === "bai_viet" ? "Bài viết" : r.type === "khoa_hoc" ? "Khóa học" : "Khác"}
                      </p>
                    </div>
                    <form action={deleteResourceAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        aria-label={`Xóa tài nguyên ${r.title}`}
                        className="focus-ring shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-status-error
                                   transition-colors hover:bg-status-error-wash"
                      >
                        Xóa
                      </button>
                    </form>
                  </div>
                  <form action={updateResourceUrlAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="url"
                      type="url"
                      defaultValue={r.url ?? ""}
                      placeholder="Dán đường link (https://...)"
                      aria-label={`Đường dẫn cho ${r.title}`}
                      className={`clay-input flex-1 py-2 text-xs ${
                        r.url ? "bg-clay-surface" : "bg-status-warning-wash"
                      }`}
                    />
                    <Button type="submit" variant="secondary" className="shrink-0 px-4 py-2 text-xs">
                      Lưu
                    </Button>
                  </form>
                </li>
              ))}
              {domainResources.length === 0 && (
                <p className="text-sm font-medium text-ink-400">Chưa có tài nguyên.</p>
              )}
            </ul>
          </Card>
        );
      })}

      <Card>
        <CardTitle>+ Thêm tài nguyên mới</CardTitle>
        <form action={createResourceAction} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="domain" required aria-label="Nhóm lĩnh vực" className="clay-input">
              <option value="">Chọn nhóm lĩnh vực...</option>
              {DOMAINS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
            <select name="type" aria-label="Loại tài nguyên" className="clay-input">
              <option value="video">Video</option>
              <option value="bai_viet">Bài viết</option>
              <option value="khoa_hoc">Khóa học</option>
              <option value="khac">Khác</option>
            </select>
          </div>
          <input
            name="title"
            required
            placeholder="Tiêu đề tài nguyên"
            aria-label="Tiêu đề tài nguyên"
            className="clay-input"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Mô tả ngắn"
            aria-label="Mô tả ngắn"
            className="clay-input resize-y"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="durationLabel"
              placeholder="Thời lượng (vd: 6 phút)"
              aria-label="Thời lượng"
              className="clay-input"
            />
            <input
              name="url"
              type="url"
              placeholder="Link (https://...)"
              aria-label="Đường dẫn"
              className="clay-input"
            />
          </div>
          <Button type="submit">+ Thêm tài nguyên</Button>
        </form>
      </Card>
    </div>
  );
}
