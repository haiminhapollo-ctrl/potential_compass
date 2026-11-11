/**
 * Thong ke dung chung cho cac script phan tich - logic THUAN (khong doc DB), chay
 * duoc ca trong analyze-scoring (khong co env/repository).
 */
import { computePotentialProfile } from "../../src/lib/recommendation/scoring";
import { DOMAINS } from "../../src/lib/domains";
import type { Activity, DomainCode, SurveyAttempt, SurveyOpen, SurveyQuestion } from "../../src/lib/types";

/** RNG co seed (mulberry32) - ket qua phan tich tai lap duoc giua cac lan chay. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hang trung binh (hoa nhau => cung hang trung binh) - diem khao sat roi rac nen hoa rat nhieu. */
function ranks(v: number[]): number[] {
  const idx = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(v.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    for (let k = i; k <= j; k++) r[idx[k]![1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/** Tuong quan Pearson. NaN neu mot ben khong doi. */
export function pearson(a: number[], b: number[]): number {
  const mean = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i]! - ma) * (b[i]! - mb);
    da += (a[i]! - ma) ** 2;
    db += (b[i]! - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;
}

/** Tuong quan thu hang Spearman (Pearson tren hang trung binh, dung khi co hoa). NaN neu mot ben khong doi. */
export function spearman(a: number[], b: number[]): number {
  return pearson(ranks(a), ranks(b));
}

/** KTC 95% cho Spearman: bien doi Fisher, sai so chuan Bonett & Wright (2000) = sqrt((1 + r^2/2) / (n - 3)). */
export function spearmanCI(r: number, n: number): [number, number] | null {
  if (n < 10 || !Number.isFinite(r)) return null;
  const z = Math.atanh(Math.max(-0.9999, Math.min(0.9999, r)));
  const se = Math.sqrt((1 + (r * r) / 2) / (n - 3));
  return [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)];
}

/** |A giao B| / |A hop B| (ca hai rong => 0). */
export function jaccard<T>(a: T[], b: T[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

/**
 * KIEM DINH HOAN VI cho trung binh cua stat(x_i, y_i): xao y GIUA CAC HOC SINH (ghep x cua em nay voi
 * y cua em khac). Muc "trung do may" giu nguyen do pho bien cua tung nhom - khac voi so voi mac chia
 * deu 8 nhom (neu ca lop cung thich 1 nhom thi trung do may cao hon nhieu).
 */
export function permutationTest<X, Y>(xs: X[], ys: Y[], stat: (x: X, y: Y) => number, rounds = 2000, seed = 7) {
  const mean = (perm: Y[]) => xs.reduce((acc, x, i) => acc + stat(x, perm[i]!), 0) / xs.length;
  const observed = mean(ys);
  const rnd = seededRandom(seed);
  const perm = [...ys];
  let atLeast = 0;
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [perm[i], perm[j]] = [perm[j]!, perm[i]!];
    }
    const m = mean(perm);
    total += m;
    if (m >= observed - 1e-12) atLeast++;
  }
  return { observed, nullMean: total / rounds, p: (atLeast + 1) / (rounds + 1) };
}

/** Top 3 chi tu khao sat (khong cong hoat dong) - dung cho test-retest va do anh huong tung cau. */
export function surveyTop3(questions: SurveyQuestion[], activities: Activity[], studentId: string, optionIds: string[]): string[] {
  const r = computePotentialProfile({ questions, activities }, studentId, optionIds.map((optionId) => ({ optionId })), []);
  return [...r.topDomains].sort();
}

/**
 * ANH HUONG TUNG CAU (bo 1 cau): % hoc sinh co top 3 (chi khao sat) doi khi bo cau do. Cao = cau quyet
 * dinh ket qua cua nhieu em (can chac em hieu dung cau nay); gan 0 = cau thua (khong doi gi).
 */
export function itemInfluence(
  questions: SurveyQuestion[],
  activities: Activity[],
  students: { id: string; responses: { questionId: string; optionId: string }[] }[]
): { questionId: string; changed: number }[] {
  const base = students.map((s) => surveyTop3(questions, activities, s.id, s.responses.map((r) => r.optionId)).join());
  return questions.map((q) => {
    const rest = questions.filter((x) => x.id !== q.id);
    const changed = students.filter(
      (s, i) =>
        surveyTop3(rest, activities, s.id, s.responses.filter((r) => r.questionId !== q.id).map((r) => r.optionId)).join() !== base[i]
    ).length;
    return { questionId: q.id, changed: students.length ? changed / students.length : 0 };
  });
}

/**
 * KAPLAN-MEIER (roi rac theo tuan) + sai so Greenwood. Moi em: t = so tuan hoat dong LIEN TIEP tinh tu
 * tuan dau co hoat dong, observed = so tuan da quan sat het. t < observed => su kien (ngung) o tuan t;
 * con lai = censored (van hoat dong toi het thoi gian quan sat - KHONG coi la bo cuoc, KHONG bo khoi mau).
 * S(k) = xac suat con hoat dong lien tuc qua tuan thu k+1 (k = 0 la tuan dau, luon = 1).
 */
export function kaplanMeier(items: { t: number; observed: number }[], maxWeek: number) {
  const out: { week: number; atRisk: number; events: number; s: number; ci: [number, number] | null }[] = [];
  let s = 1;
  let greenwood = 0;
  for (let k = 1; k <= maxWeek; k++) {
    const atRisk = items.filter((x) => x.t >= k && x.observed > k).length;
    const events = items.filter((x) => x.t === k && x.observed > k).length;
    if (atRisk === 0) break;
    s *= 1 - events / atRisk;
    if (atRisk > events) greenwood += events / (atRisk * (atRisk - events));
    const se = s * Math.sqrt(greenwood);
    out.push({ week: k, atRisk, events, s, ci: atRisk >= 10 ? [Math.max(0, s - 1.96 * se), Math.min(1, s + 1.96 * se)] : null });
  }
  return out;
}

/**
 * MO ROI BO DO (de xuat A4): gom cac lan MO bai form trong theo (em, dot). Lan mo cach lan truoc > gapHours =
 * phien moi (tai lai trang trong luc lam khong tinh). completed = da co lan nop cua dot do. Moi dot form trong
 * nop xong thi khong mo lai duoc nua, nen moi lan mo deu xay ra TRUOC lan nop (hoac em chua nop).
 */
export function surveyOpenSessions(
  opens: Pick<SurveyOpen, "studentId" | "measurementWave" | "openedAt">[],
  attempts: Pick<SurveyAttempt, "studentId" | "measurementWave">[],
  gapHours = 6
): { studentId: string; wave: string; sessions: number; completed: boolean }[] {
  const done = new Set(attempts.map((a) => `${a.studentId}|${a.measurementWave}`));
  const byKey = new Map<string, number[]>();
  for (const o of opens) {
    const key = `${o.studentId}|${o.measurementWave}`;
    byKey.set(key, [...(byKey.get(key) ?? []), Date.parse(o.openedAt)]);
  }
  return [...byKey].map(([key, times]) => {
    const [studentId, wave] = key.split("|") as [string, string];
    times.sort((a, b) => a - b);
    const sessions = times.filter((t, i) => i === 0 || t - times[i - 1]! > gapHours * 3_600_000).length;
    return { studentId, wave, sessions, completed: done.has(key) };
  });
}

/**
 * TUONG QUAN CAU - NHOM (B1 muc 5): voi moi cau va moi nhom ma cau do co cham, tuong quan giua diem cau do cho
 * nhom (trong so dap an em chon) va tong diem nhom tren CAC CAU CON LAI (item-rest, khong tu tuong quan voi
 * chinh no). Thap / am = cau khong di cung huong voi phan con lai cua nhom. Khao sat lua chon bat buoc keo
 * moi tuong quan nay xuong (tong co dinh) => chi so sanh TUONG DOI giua cac cau, khong co nguong tuyet doi.
 */
export function itemRestCorrelations(
  questions: SurveyQuestion[],
  students: { responses: { questionId: string; optionId: string }[] }[]
): { questionId: string; byDomain: { domain: DomainCode; r: number }[] }[] {
  const weight = (q: SurveyQuestion, optionId: string | undefined, d: DomainCode) =>
    q.options.find((o) => o.id === optionId)?.domainWeights[d] ?? 0;
  const chosen = students.map((s) => new Map(s.responses.map((r) => [r.questionId, r.optionId] as const)));
  const totals = chosen.map((c) =>
    Object.fromEntries(DOMAINS.map((d) => [d.code, questions.reduce((acc, q) => acc + weight(q, c.get(q.id), d.code), 0)]))
  );
  return questions.map((q) => ({
    questionId: q.id,
    byDomain: DOMAINS.filter((d) => q.options.some((o) => (o.domainWeights[d.code] ?? 0) > 0)).map((d) => {
      const item = chosen.map((c) => weight(q, c.get(q.id), d.code));
      return { domain: d.code, r: pearson(item, item.map((x, i) => totals[i]![d.code]! - x)) };
    }),
  }));
}

/** Tri rieng / vecto rieng cua ma tran DOI XUNG (phuong phap Jacobi) - du cho ma tran 8x8. Sap xep giam dan. */
export function symmetricEigen(matrix: number[][]): { values: number[]; vectors: number[][] } {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2;
    if (off < 1e-20) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p]![q]!) < 1e-300) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!);
        const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const [kp, kq] = [a[k]![p]!, a[k]![q]!];
          a[k]![p] = c * kp - s * kq;
          a[k]![q] = s * kp + c * kq;
        }
        for (let k = 0; k < n; k++) {
          const [pk, qk] = [a[p]![k]!, a[q]![k]!];
          a[p]![k] = c * pk - s * qk;
          a[q]![k] = s * pk + c * qk;
        }
        for (let k = 0; k < n; k++) {
          const [kp, kq] = [v[k]![p]!, v[k]![q]!];
          v[k]![p] = c * kp - s * kq;
          v[k]![q] = s * kp + c * kq;
        }
      }
    }
  }
  const order = a.map((row, i) => [row[i]!, i] as const).sort((x, y) => y[0] - x[0]);
  return { values: order.map(([val]) => val), vectors: order.map(([, i]) => v.map((row) => row[i]!)) };
}

/**
 * PHAN TICH KHAM PHA cho du lieu lua chon bat buoc (B1 muc 4): diem tho 8 nhom -> TY LE (+0,5 moi nhom de
 * tranh log 0) -> CLR (log ty le tru trung binh log) -> PCA. CLR bo rang buoc "tong co dinh" nen PCA khong bi
 * thanh phan gia do tong. Chi la KHAM PHA (nhom nao hay di cung / doi nghich nhau), KHONG thay Thurstonian IRT.
 * explained = ty le phuong sai tung thanh phan (giam dan); loadings[k][d] = trong so nhom d o thanh phan k.
 */
export function clrPca(rawTotals: number[][]): { explained: number[]; loadings: number[][] } {
  const clr = rawTotals.map((row) => {
    const logs = row.map((x) => Math.log(x + 0.5));
    const m = logs.reduce((a, b) => a + b, 0) / logs.length;
    return logs.map((l) => l - m);
  });
  const k = clr[0]?.length ?? 0;
  const means = Array.from({ length: k }, (_, j) => clr.reduce((a, r) => a + r[j]!, 0) / clr.length);
  const cov = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => clr.reduce((a, r) => a + (r[i]! - means[i]!) * (r[j]! - means[j]!), 0) / Math.max(1, clr.length - 1))
  );
  const { values, vectors } = symmetricEigen(cov);
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  return { explained: values.map((x) => (total > 0 ? Math.max(0, x) / total : 0)), loadings: vectors };
}
