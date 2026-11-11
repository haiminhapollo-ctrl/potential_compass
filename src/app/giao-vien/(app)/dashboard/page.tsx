import Link from "next/link";
import { requireTeacher } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { DOMAINS } from "@/lib/domains";
import { daysAgoISOVN, todayISOVN } from "@/lib/date";
import { daysSinceLastActivity } from "@/lib/profile-service";
import { MIN_N_FOR_STATS, summarizeDomainScores, weeklyDomainMedians } from "@/lib/recommendation/aggregate";
import { notableDomains, SCORING_VERSION } from "@/lib/recommendation/scoring";
import { DomainDistributionChart } from "@/components/teacher/DomainDistributionChart";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardTitle } from "@/components/ui/Card";

/** Khong co hoat dong nao trong chung nay ngay => goi y giao vien hoi tham (KHONG phai nhan "bo cuoc"). */
const INACTIVE_DAYS = 7;

// ============================================================================
// TONG QUAN (bao cao DS loi 8, 20): thong ke CAT NGANG + chuoi theo tuan tu
// snapshot, tach theo lop, kem n & nguong "chua du du lieu", va thong ke thieu
// du lieu. Doc theo lo (5 truy van co dinh) thay vi N+1 truy van theo hoc sinh.
// ============================================================================
export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const session = await requireTeacher();

  const repo = getRepository();
  const [classes, allStudents] = await Promise.all([
    repo.listClasses(session.schoolId),
    repo.listStudentsBySchool(session.schoolId),
  ]);
  const activeClass = classes.find((c) => c.id === classId) ?? null;
  const students = activeClass ? allStudents.filter((s) => s.classId === activeClass.id) : allStudents;
  const ids = students.map((s) => s.id);

  const [profiles, logs, snapshots] = await Promise.all([
    repo.listProfilesByStudents(ids),
    repo.listActivityLogsByStudents(ids),
    repo.listSnapshotsByStudents(ids),
  ]);

  const today = todayISOVN();
  const weekAgo = daysAgoISOVN(INACTIVE_DAYS - 1);
  const profileOf = new Map(profiles.map((p) => [p.studentId, p]));
  const logsOf = new Map<string, typeof logs>();
  for (const l of logs) logsOf.set(l.studentId, [...(logsOf.get(l.studentId) ?? []), l]);

  const surveyDone = students.filter((s) => profileOf.get(s.id)?.surveyCompleted);
  const notSurveyed = students.filter((s) => !profileOf.get(s.id)?.surveyCompleted);
  const activeLast7 = new Set(logs.filter((l) => l.date >= weekAgo).map((l) => l.studentId));
  const needCheckIn = surveyDone
    .map((s) => ({ student: s, days: daysSinceLastActivity(logsOf.get(s.id) ?? [], today) }))
    .filter((x) => x.days === null || x.days >= INACTIVE_DAYS)
    .sort((a, b) => (b.days ?? 999) - (a.days ?? 999));
  // Ho so chua co nhom nao "Noi bat" (nguong hieu chuan theo nguoi tra loi bua - de xuat A1): em co the
  // chua hieu cau hoi, lam voi, hoac so thich con rong => goi y trao doi 1-1, khong phai danh gia.
  const unclear = surveyDone.filter((s) => {
    const p = profileOf.get(s.id)!;
    return p.scoringVersion === SCORING_VERSION && notableDomains(p.scores).length === 0;
  });

  const summaries = summarizeDomainScores(profiles, SCORING_VERSION);
  const nCurrent = profiles.filter((p) => p.surveyCompleted && p.scoringVersion === SCORING_VERSION).length;
  const weekly = weeklyDomainMedians(snapshots, SCORING_VERSION).slice(-6);
  const scopeLabel = activeClass ? `lớp ${activeClass.name}` : "toàn trường";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="balance text-2xl font-extrabold tracking-[-0.025em] text-ink-900">Tổng quan</h1>
        <p className="mt-1 text-sm font-medium text-ink-500">Tiến độ của học sinh {scopeLabel}.</p>
        {classes.length > 1 && (
          <nav aria-label="Chọn lớp" className="mt-3 flex flex-wrap gap-2">
            <ClassChip href="/giao-vien/dashboard" active={!activeClass} label="Toàn trường" />
            {classes.map((c) => (
              <ClassChip key={c.id} href={`/giao-vien/dashboard?classId=${c.id}`} active={activeClass?.id === c.id} label={c.name} />
            ))}
          </nav>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <StatTile label="Học sinh" value={students.length} />
        <StatTile
          label="Đã hoàn thành khảo sát"
          value={`${surveyDone.length}/${students.length}`}
          hint={students.length > 0 ? `${Math.round((surveyDone.length / students.length) * 100)}%` : undefined}
        />
        <StatTile label={`Có hoạt động ${INACTIVE_DAYS} ngày qua`} value={`${activeLast7.size}/${students.length}`} />
        <StatTile label="Hoạt động hôm nay" value={logs.filter((l) => l.date === today).length} hint={`Tổng ${logs.length}`} />
      </div>

      <Card>
        <CardTitle>Điểm sở thích hiện tại theo nhóm</CardTitle>
        <p className="pretty mt-1 mb-4 text-sm font-medium text-ink-500">
          Hồ sơ hiện tại của các em đã làm xong khảo sát, <strong className="font-bold">không phải</strong>{" "}
          xu hướng theo thời gian (xem bảng theo tuần bên dưới). Điểm đo mức hứng thú, không đo năng lực.
        </p>
        {summaries ? (
          <DomainDistributionChart summaries={summaries} n={nCurrent} />
        ) : (
          <NotEnoughData n={nCurrent} />
        )}
      </Card>

      <Card>
        <CardTitle>Trung vị theo tuần</CardTitle>
        <p className="pretty mt-1 text-sm font-medium text-ink-500">
          Lấy từ bản lưu hồ sơ tự động mỗi ngày, chốt tuần vào Chủ Nhật. Số học sinh mỗi tuần có thể khác nhau nên cần
          đọc kèm cột n.
        </p>
        {weekly.length === 0 ? (
          <p className="mt-3 text-sm font-medium text-ink-400">Chưa có dữ liệu theo tuần.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-clay-line text-xs font-extrabold uppercase tracking-[0.06em] text-ink-400">
                  <th className="py-2 pr-3">Nhóm</th>
                  {weekly.map((w) => (
                    <th key={w.weekStartDate} className="nums px-2 py-2 text-right">
                      {new Date(w.weekStartDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map((d) => (
                  <tr key={d.code} className="border-b border-clay-line">
                    <td className="py-2 pr-3 font-semibold text-ink-700">
                      {d.icon} {d.name}
                    </td>
                    {weekly.map((w, i) => {
                      const v = w.medians?.[d.code];
                      const prev = i > 0 ? weekly[i - 1]!.medians?.[d.code] : undefined;
                      const delta = v !== undefined && prev !== undefined ? Math.round(v - prev) : null;
                      return (
                        <td key={w.weekStartDate} className="nums px-2 py-2 text-right font-semibold text-ink-800">
                          {v === undefined ? "—" : Math.round(v)}
                          {delta !== null && delta !== 0 && (
                            <span className="ml-1 text-xs font-medium text-ink-400">
                              {delta > 0 ? "▲" : "▼"}
                              {Math.abs(delta)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="text-xs font-bold text-ink-500">
                  <td className="py-2 pr-3">n (học sinh)</td>
                  {weekly.map((w) => (
                    <td key={w.weekStartDate} className="nums px-2 py-2 text-right">
                      {w.n}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            {weekly.some((w) => !w.medians) && (
              <p className="mt-2 text-xs font-medium text-ink-400">
                — = tuần có dưới {MIN_N_FOR_STATS} học sinh, chưa đủ dữ liệu để diễn giải.
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>Chưa làm khảo sát ({notSurveyed.length})</CardTitle>
          <StudentList items={notSurveyed.map((s) => ({ id: s.id, name: s.displayName, note: s.studentCode }))} empty="Tất cả đã làm khảo sát." />
        </Card>
        <Card>
          <CardTitle>Nên hỏi thăm ({needCheckIn.length})</CardTitle>
          <p className="pretty mt-1 text-xs font-medium text-ink-400">
            Đã làm khảo sát nhưng không có hoạt động nào trong {INACTIVE_DAYS} ngày qua. Đây là gợi ý để thầy cô hỏi
            thăm, không phải đánh giá học sinh.
          </p>
          <StudentList
            items={needCheckIn.map(({ student, days }) => ({
              id: student.id,
              name: student.displayName,
              note: days === null ? "chưa làm hoạt động nào" : `${days} ngày chưa làm`,
            }))}
            empty="Không có em nào cần hỏi thăm."
          />
        </Card>
        <Card>
          <CardTitle>Hồ sơ chưa phân biệt rõ ({unclear.length})</CardTitle>
          <p className="pretty mt-1 text-xs font-medium text-ink-400">
            Chưa nhóm nào cao hơn hẳn mức của người chọn ngẫu nhiên. Có thể em chưa hiểu câu hỏi, làm vội, hoặc sở thích
            còn rộng, nên trò chuyện riêng với em. Mới làm khảo sát mà chưa rõ thì cũng bình thường.
          </p>
          <StudentList
            items={unclear.map((s) => ({
              id: s.id,
              name: s.displayName,
              note: `${profileOf.get(s.id)!.activitiesCompletedCount} hoạt động`,
            }))}
            empty="Hồ sơ của các em đều đã có nhóm nổi bật."
          />
        </Card>
      </div>
    </div>
  );
}

function ClassChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors duration-150 ${
        active ? "bg-brand-100 text-brand-700 shadow-clay-inset" : "bg-clay-surface text-ink-500 shadow-clay-sm hover:bg-clay-sunken hover:text-ink-800"
      }`}
    >
      {label}
    </Link>
  );
}

function NotEnoughData({ n }: { n: number }) {
  return (
    <p className="clay-sunken px-4 py-3 text-sm font-medium text-ink-500">
      Chưa đủ dữ liệu để diễn giải: mới có {n} học sinh hoàn thành khảo sát theo công thức hiện tại (cần ít nhất{" "}
      {MIN_N_FOR_STATS}).
    </p>
  );
}

function StudentList({ items, empty }: { items: { id: string; name: string; note: string }[]; empty: string }) {
  if (items.length === 0) return <p className="mt-3 text-sm font-medium text-ink-400">{empty}</p>;
  return (
    <ul className="mt-3 space-y-1.5">
      {items.slice(0, 12).map((it) => (
        <li key={it.id}>
          <Link
            href={`/giao-vien/lop-hoc/hoc-sinh/${it.id}`}
            className="focus-ring flex items-center justify-between gap-3 rounded-clay-sm px-3 py-2 text-sm hover:bg-clay-surface"
          >
            <span className="truncate font-bold text-ink-800">{it.name}</span>
            <span className="shrink-0 text-xs font-medium text-ink-400">{it.note}</span>
          </Link>
        </li>
      ))}
      {items.length > 12 && <li className="px-3 text-xs font-medium text-ink-400">… và {items.length - 12} em khác</li>}
    </ul>
  );
}
