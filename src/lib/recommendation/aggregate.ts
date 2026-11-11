import { DOMAINS } from "../domains";
import type { DomainCode, ProfileSnapshot, PotentialProfile } from "../types";

// ============================================================================
// THONG KE NHOM (dashboard giao vien) - bao cao DS loi 8, 16
// ----------------------------------------------------------------------------
// - Day la thong ke CAT NGANG (anh chup hien tai), KHONG phai "xu huong". Xu
//   huong theo thoi gian lay tu snapshot hang tuan (weeklyDomainMedians).
// - Bao cao trung vi + khoang tu phan vi (IQR) thay vi chi trung binh: trung
//   binh che mat viec lop tach thanh hai cuc.
// - n nho hon MIN_N => tra ve null ("chua du du lieu"), KHONG tra so gia (truoc
//   day tra 50 roi 0 deu cho ca 8 nhom khi chua co ai).
// - Giu thu tu nhom CO DINH (DOMAINS) - khong xep hang tren trung binh nhom,
//   nen khong can pha hoa (truoc day pha hoa theo bang chu cai).
// - Diem dau vao la thang co dinh (phan vi so voi nguoi chon ngau nhien, xem
//   scoring.ts) nen lay thong ke giua cac hoc sinh moi co nghia.
// ============================================================================

/** Duoi nguong nay khong dien giai thong ke nhom (qua it hoc sinh). */
export const MIN_N_FOR_STATS = 5;
/** Tu nguong nay moi tinh khoang tin cay bootstrap (mau qua nho thi bootstrap khong dang tin). */
export const MIN_N_FOR_CI = 20;
const BOOTSTRAP_ROUNDS = 1000;

export interface DomainSummary {
  domain: DomainCode;
  n: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  /** Khoang tin cay 95% cua trung vi (bootstrap); null khi n < MIN_N_FOR_CI. */
  medianCI: [number, number] | null;
}

/**
 * Khoang tin cay 95% cua trung vi bang bootstrap (lay mau lai co hoan lai).
 * Seed co dinh => tai lai trang khong nhay so.
 */
export function bootstrapMedianCI(values: number[], rounds = BOOTSTRAP_ROUNDS, seed = 1): [number, number] {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const medians: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const sample = Array.from({ length: values.length }, () => values[Math.floor(rnd() * values.length)]!).sort((a, b) => a - b);
    medians.push(quantile(sample, 0.5));
  }
  medians.sort((a, b) => a - b);
  return [quantile(medians, 0.025), quantile(medians, 0.975)];
}

/** Phan vi theo noi suy tuyen tinh (giong numpy "linear"); `sorted` tang dan, khac rong. */
export function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

function summarize(domain: DomainCode, values: number[]): DomainSummary {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    domain,
    n: sorted.length,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    median: quantile(sorted, 0.5),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    medianCI: sorted.length >= MIN_N_FOR_CI ? bootstrapMedianCI(sorted) : null,
  };
}

/**
 * Thong ke tung nhom tren cac ho so DA hoan thanh khao sat VA tinh bang cong
 * thuc hien hanh (scoringVersion) - khong tron diem cua hai thang do khac nhau.
 * Tra ve null neu chua du MIN_N_FOR_STATS hoc sinh.
 */
export function summarizeDomainScores(profiles: PotentialProfile[], scoringVersion: string): DomainSummary[] | null {
  const usable = profiles.filter((p) => p.surveyCompleted && p.scoringVersion === scoringVersion);
  if (usable.length < MIN_N_FOR_STATS) return null;
  return DOMAINS.map((d) =>
    summarize(
      d.code,
      usable.map((p) => p.scores.find((s) => s.domain === d.code)?.score ?? 0)
    )
  );
}

export interface WeeklyPoint {
  weekStartDate: string;
  n: number; // so hoc sinh co snapshot tuan do
  medians: Record<DomainCode, number> | null; // null khi n < MIN_N_FOR_STATS
}

/**
 * Chuoi thoi gian trung vi theo tuan tu snapshot (cung scoringVersion). Thanh
 * phan hoc sinh co the doi giua cac tuan => luon hien kem n moi tuan.
 */
export function weeklyDomainMedians(snapshots: ProfileSnapshot[], scoringVersion: string): WeeklyPoint[] {
  const byWeek = new Map<string, ProfileSnapshot[]>();
  for (const s of snapshots) {
    if (s.scoringVersion !== scoringVersion) continue;
    byWeek.set(s.weekStartDate, [...(byWeek.get(s.weekStartDate) ?? []), s]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartDate, list]) => {
      if (list.length < MIN_N_FOR_STATS) return { weekStartDate, n: list.length, medians: null };
      const medians = {} as Record<DomainCode, number>;
      for (const d of DOMAINS) {
        const vals = list.map((s) => s.scores.find((x) => x.domain === d.code)?.score ?? 0).sort((a, b) => a - b);
        medians[d.code] = quantile(vals, 0.5);
      }
      return { weekStartDate, n: list.length, medians };
    });
}
