import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RIASEC_READY } from "@/lib/riasec";
import { nextRetestWave } from "@/lib/survey";
import { CURRICULUM_TERMS, TERM_INFO, TRACK_LABEL } from "@/lib/curriculum";
import {
  closeRetestAction,
  createClassAction,
  createStudentAction,
  deleteStudentAction,
  openRetestAction,
  setCurriculumTermAction,
  setRiasecAction,
} from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  duplicate_code: "Mã học sinh này đã được dùng - hãy chọn mã khác.",
};

export default async function ClassManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; error?: string }>;
}) {
  const { classId, error } = await searchParams;
  const session = await getSession();
  if (!session || !session.schoolId) redirect("/giao-vien/dang-nhap");

  const repo = getRepository();
  const classes = await repo.listClasses(session.schoolId);
  const activeClass = classes.find((c) => c.id === classId) ?? classes[0] ?? null;
  const students = activeClass ? await repo.listStudentsByClass(activeClass.id) : [];
  // 1 truy van cho ca lop (truoc day: 1 truy van / hoc sinh - N+1).
  const [profileList, attempts, riasecAttempts] = await Promise.all([
    repo.listProfilesByStudents(students.map((s) => s.id)),
    repo.listSurveyAttempts(students.map((s) => s.id)),
    repo.listRiasecAttempts(students.map((s) => s.id)),
  ]);
  const profiles = students.map((s) => profileList.find((p) => p.studentId === s.id) ?? null);
  const openWave = activeClass?.retestWave ?? null;
  const doneOpenWave = new Set(attempts.filter((a) => openWave && a.measurementWave === openWave).map((a) => a.studentId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Lớp học &amp; Học sinh</h1>
        <p className="mt-1 text-sm font-medium text-ink-500">Quản lý danh sách lớp và học sinh trong trường.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <Card>
            <CardTitle>Danh sách lớp</CardTitle>
            <ul className="mt-3 space-y-1">
              {classes.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/giao-vien/lop-hoc?classId=${c.id}`}
                    className={`focus-ring block rounded-clay-sm px-4 py-2.5 text-sm font-bold
                      transition-colors duration-150 ${
                        activeClass?.id === c.id
                          ? "bg-brand-100 text-brand-700 shadow-clay-inset"
                          : "text-ink-600 hover:bg-clay-sunken hover:text-ink-900"
                      }`}
                  >
                    {c.name}
                  </a>
                </li>
              ))}
              {classes.length === 0 && (
                <p className="text-sm font-medium text-ink-400">Chưa có lớp nào.</p>
              )}
            </ul>
          </Card>

          <Card>
            <CardTitle>Tạo lớp mới</CardTitle>
            <form action={createClassAction} className="mt-3 space-y-3">
              <input
                name="name"
                placeholder="Ví dụ: 9A2"
                required
                className="clay-input"
              />
              <Button type="submit" variant="secondary" className="w-full">
                + Thêm lớp
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4 md:col-span-2">
          {activeClass ? (
            <>
              <Card>
                <CardTitle>Thêm học sinh vào lớp {activeClass.name}</CardTitle>
                {error && (
                  <p role="alert" className="mt-2.5 text-sm font-semibold text-status-error">
                    {ERROR_MESSAGES[error] ?? "Có lỗi xảy ra. Vui lòng thử lại."}
                  </p>
                )}
                <form action={createStudentAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="classId" value={activeClass.id} />
                  <input
                    name="studentCode"
                    placeholder="Mã học sinh"
                    required
                    className="clay-input"
                  />
                  <input
                    name="displayName"
                    placeholder="Họ và tên"
                    required
                    className="clay-input"
                  />
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-600 sm:col-span-2">
                    <input type="checkbox" name="parentConsentConfirmed" className="focus-ring h-4 w-4 accent-brand-600" />
                    Đã có xác nhận đồng ý tham gia từ phụ huynh
                  </label>
                  <Button type="submit" className="sm:col-span-2">
                    + Thêm học sinh
                  </Button>
                </form>
              </Card>

              <Card>
                <CardTitle>Học kỳ của lớp</CardTitle>
                <p className="pretty mt-1.5 text-sm font-medium text-ink-600">
                  Đang học <strong className="font-bold">{TERM_INFO[activeClass.curriculumTerm].label}</strong> (
                  {TERM_INFO[activeClass.curriculumTerm].focus}). Học sinh thấy bộ câu hỏi chung cộng thêm các câu và
                  hoạt động của học kỳ này. Sang học kỳ mới, đổi ở đây: các em sẽ được mời trả lời thêm vài câu mới.
                </p>
                {/* key: dung lai form sau khi luu - React 19 reset form ve defaultValue CU sau server action. */}
                <form
                  key={activeClass.curriculumTerm}
                  action={setCurriculumTermAction}
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                >
                  <input type="hidden" name="classId" value={activeClass.id} />
                  <select
                    name="curriculumTerm"
                    defaultValue={activeClass.curriculumTerm}
                    aria-label="Học kỳ của lớp"
                    className="clay-input"
                  >
                    {CURRICULUM_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {TERM_INFO[t].label}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="secondary" className="shrink-0">
                    Đổi học kỳ
                  </Button>
                </form>
              </Card>

              <Card>
                <CardTitle>Khảo sát lại (kiểm tra độ ổn định)</CardTitle>
                {openWave ? (
                  <>
                    <p className="pretty mt-1.5 text-sm font-medium text-ink-600">
                      Đang mở đợt <strong className="font-bold">{openWave}</strong>:{" "}
                      <span className="nums font-bold">{doneOpenWave.size}</span>/{students.length} em đã làm. Các em
                      đã làm khảo sát lần đầu sẽ thấy lời mời ở trang Hồ sơ và Hoạt động.
                    </p>
                    <form action={closeRetestAction} className="mt-3">
                      <input type="hidden" name="classId" value={activeClass.id} />
                      <Button type="submit" variant="secondary" className="w-full">
                        Đóng đợt {openWave}
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="pretty mt-1.5 text-sm font-medium text-ink-600">
                      Khoảng 2 tuần sau khi cả lớp làm khảo sát lần đầu, mở một đợt để các em làm lại bài trống (không
                      thấy đáp án cũ). So sánh hai lần cho biết bộ câu hỏi có cho kết quả ổn định không.
                    </p>
                    <form action={openRetestAction} className="mt-3">
                      <input type="hidden" name="classId" value={activeClass.id} />
                      <Button type="submit" variant="secondary" className="w-full">
                        Mở đợt khảo sát lại ({nextRetestWave(attempts)})
                      </Button>
                    </form>
                  </>
                )}
              </Card>

              <Card>
                <CardTitle>Bài đối chiếu RIASEC (O*NET)</CardTitle>
                <p className="pretty mt-1.5 text-sm font-medium text-ink-600">
                  Vài lớp (khoảng 40–60 em) làm thêm 30 câu của O*NET Interest Profiler (Mini-IP) để kiểm tra bộ khảo sát
                  có đo đúng sở thích không. Học sinh không nhận kết quả bài này.
                </p>
                {!RIASEC_READY ? (
                  <p className="pretty mt-2 text-xs font-semibold text-status-warning">
                    Chưa bật được vì bản dịch 30 câu chưa hoàn thành.
                  </p>
                ) : (
                  <form action={setRiasecAction} className="mt-3">
                    <input type="hidden" name="classId" value={activeClass.id} />
                    <input type="hidden" name="enabled" value={activeClass.riasecEnabled ? "0" : "1"} />
                    <p className="mb-2 text-xs font-semibold text-ink-500">
                      {activeClass.riasecEnabled ? (
                        <>
                          Đang bật: <span className="nums font-bold">{riasecAttempts.length}</span>/{students.length} em đã làm.
                        </>
                      ) : (
                        "Đang tắt cho lớp này."
                      )}
                    </p>
                    <Button type="submit" variant="secondary" className="w-full">
                      {activeClass.riasecEnabled ? "Tắt bài RIASEC" : "Bật bài RIASEC cho lớp"}
                    </Button>
                  </form>
                )}
              </Card>

              <Card>
                <CardTitle>Danh sách học sinh ({students.length})</CardTitle>
                <p className="mt-1 text-xs font-medium text-ink-400">
                  Bấm vào tên học sinh để xem hồ sơ và phần các em tự viết sau mỗi hoạt động.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm [&_tbody_tr]:border-b [&_tbody_tr]:border-clay-line [&_thead_tr]:border-b [&_thead_tr]:border-clay-line">
                    <thead>
                      <tr className="text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400">
                        <th className="py-2 pr-2">Họ tên</th>
                        <th className="py-2 pr-2">Mã</th>
                        <th className="py-2 pr-2">Khảo sát</th>
                        <th className="py-2 pr-2">Hoạt động</th>
                        <th className="py-2 pr-2">Hướng sau lớp 9</th>
                        <th className="py-2 pr-2">Phụ huynh</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => {
                        const profile = profiles[idx];
                        return (
                          <tr key={s.id}>
                            <td className="py-2.5 pr-2">
                              {/* Bam vao ten de xem ho so + phan hoi hoc sinh
                                  tu viet sau tung hoat dong. */}
                              <Link
                                href={`/giao-vien/lop-hoc/hoc-sinh/${s.id}`}
                                className="focus-ring rounded font-bold text-ink-800 hover:text-brand-700 hover:underline"
                              >
                                {s.displayName}
                              </Link>
                            </td>
                            <td className="nums py-2.5 pr-2 text-xs font-semibold text-ink-500">{s.studentCode}</td>
                            <td className="py-2.5 pr-2">
                              {profile?.surveyCompleted ? (
                                <span className="font-bold text-status-success">✓ Xong</span>
                              ) : (
                                <span className="font-medium text-ink-400">Chưa</span>
                              )}
                            </td>
                            <td className="nums py-2.5 pr-2 font-semibold text-ink-600">
                              {profile?.activitiesCompletedCount ?? 0}
                            </td>
                            <td className="py-2.5 pr-2 text-xs font-semibold text-ink-600">
                              {profile?.track ? TRACK_LABEL[profile.track.recommendedTrack].short : "—"}
                            </td>
                            <td className="py-2.5 pr-2">
                              {s.parentConsentConfirmed ? (
                                <span className="font-bold text-status-success">✓</span>
                              ) : (
                                <span className="font-bold text-status-warning">Chưa</span>
                              )}
                            </td>
                            <td className="py-2.5 text-right">
                              <form action={deleteStudentAction}>
                                <input type="hidden" name="studentId" value={s.id} />
                                <button
                                  type="submit"
                                  className="focus-ring rounded-full px-2.5 py-1 text-xs font-bold text-status-error
                                             transition-colors hover:bg-status-error-wash"
                                >
                                  Xóa
                                </button>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                      {students.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-5 text-center text-sm font-medium text-ink-400">
                            Chưa có học sinh trong lớp này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-sm font-medium text-ink-500">Hãy tạo một lớp học trước.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
