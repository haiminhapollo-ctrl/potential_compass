/**
 * MO HINH SAU PILOT (scripts/analyze-models.ts) - logic THUAN, khong doc DB, khong thu vien ngoai.
 * Ma tran nho (<= 10 bien) nen dung Newton-Raphson + nghich dao Gauss-Jordan la du.
 */
import { seededRandom } from "./stats";

// ---------------------------------------------------------------------------
// Dai so tuyen tinh nho
// ---------------------------------------------------------------------------

/** Nghich dao ma tran vuong (Gauss-Jordan, chon phan tu troi). Nem loi neu suy bien. */
export function invert(m: number[][]): number[][] {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r;
    if (Math.abs(a[p]![c]!) < 1e-12) throw new Error("Ma tran suy bien (bien trung lap hoac khong doi?)");
    [a[c], a[p]] = [a[p]!, a[c]!];
    const piv = a[c]![c]!;
    for (let j = 0; j < 2 * n; j++) a[c]![j]! /= piv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r]![c]!;
      if (f !== 0) for (let j = 0; j < 2 * n; j++) a[r]![j]! -= f * a[c]![j]!;
    }
  }
  return a.map((row) => row.slice(n));
}

const matVec = (m: number[][], v: number[]) => m.map((row) => row.reduce((s, x, j) => s + x * v[j]!, 0));
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const zeroMat = (n: number) => Array.from({ length: n }, () => zeros(n));
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Chuan hoa cot (trung binh 0, do lech 1) theo du lieu `fit` - ap dung cung tham so cho du lieu khac (tranh ro ri). */
export function standardizer(fit: number[][]) {
  const k = fit[0]?.length ?? 0;
  const mean = Array.from({ length: k }, (_, j) => fit.reduce((s, r) => s + r[j]!, 0) / fit.length);
  const sd = Array.from({ length: k }, (_, j) => Math.sqrt(fit.reduce((s, r) => s + (r[j]! - mean[j]!) ** 2, 0) / Math.max(1, fit.length - 1)) || 1);
  return { mean, sd, apply: (rows: number[][]) => rows.map((r) => r.map((x, j) => (x - mean[j]!) / sd[j]!)) };
}

// ---------------------------------------------------------------------------
// COX co bien thay doi theo thoi gian (dang dem quy trinh, thoi gian roi rac theo tuan)
// ---------------------------------------------------------------------------

export interface CoxRow {
  /** Cum (hoc sinh) - sai so chuan gom theo cum vi nhieu dong cua cung mot em khong doc lap. */
  cluster: string;
  /** Moc thoi gian (tuan thu k ke tu tuan dau): tap nguy co tai k = moi dong co cung k. */
  time: number;
  x: number[];
  event: 0 | 1;
}

/**
 * Cox PH, Newton-Raphson, xu ly HOA kieu EFRON (du lieu theo tuan: rat nhieu em ngung cung mot tuan - Breslow keo he
 * so ve 0 khi hoa nhieu). Moi em toi da 1 dong moi moc (dong tuan k: bien o tuan k, su kien = ngung o tuan k+1) nen
 * moi dong nam trong DUNG MOT tap nguy co. Sai so chuan ROBUST (sandwich gom theo cum, phan du diem Efron) thay cho sai
 * so mo hinh (gia dinh cac dong doc lap).
 */
export function fitCox(rows: CoxRow[], iterations = 30) {
  const k = rows[0]?.x.length ?? 0;
  const byTime = new Map<number, CoxRow[]>();
  for (const r of rows) byTime.set(r.time, [...(byTime.get(r.time) ?? []), r]);
  /** Tung moc: trong so w, va voi moi l < d (so su kien): S0_l, xbar_l theo Efron (tru dan l/d phan cua nhom su kien). */
  const efron = (risk: CoxRow[], beta: number[]) => {
    const w = risk.map((r) => Math.exp(dot(beta, r.x)));
    const ev = risk.map((r, i) => [r, i] as const).filter(([r]) => r.event).map(([, i]) => i);
    const d = ev.length;
    const s0 = w.reduce((a, b) => a + b, 0);
    const e0 = ev.reduce((a, i) => a + w[i]!, 0);
    const steps = Array.from({ length: d }, (_, l) => {
      const f = l / d;
      const a = risk.map((r, i) => w[i]! * (r.event ? 1 - f : 1)); // trong so cua tung dong o buoc l
      const s0l = s0 - f * e0;
      const xbar = zeros(k).map((_, j) => risk.reduce((acc, r, i) => acc + a[i]! * r.x[j]!, 0) / s0l);
      return { a, s0l, xbar };
    });
    return { w, d, steps };
  };
  let beta = zeros(k);
  let info = zeroMat(k);
  for (let it = 0; it < iterations; it++) {
    const grad = zeros(k);
    info = zeroMat(k);
    for (const risk of byTime.values()) {
      const { d, steps } = efron(risk, beta);
      if (d === 0) continue;
      for (const r of risk) if (r.event) for (let j = 0; j < k; j++) grad[j]! += r.x[j]!;
      for (const { a, s0l, xbar } of steps) {
        for (let j = 0; j < k; j++) grad[j]! -= xbar[j]!;
        for (let p = 0; p < k; p++)
          for (let q = 0; q < k; q++) info[p]![q]! += risk.reduce((acc, r, i) => acc + a[i]! * (r.x[p]! - xbar[p]!) * (r.x[q]! - xbar[q]!), 0) / s0l;
      }
    }
    const step = matVec(invert(info), grad);
    beta = beta.map((b, j) => b + step[j]!);
    if (Math.max(...step.map(Math.abs)) < 1e-9) break;
  }
  // Phan du diem Efron tung dong: delta (x - TB_l xbar_l) - sum_l a_l / S0_l (x - xbar_l); cong theo cum -> I^-1 B I^-1
  const perCluster = new Map<string, number[]>();
  for (const risk of byTime.values()) {
    const { d, steps } = efron(risk, beta);
    risk.forEach((r, i) => {
      const u = perCluster.get(r.cluster) ?? zeros(k);
      for (let j = 0; j < k; j++) {
        if (r.event) u[j]! += r.x[j]! - steps.reduce((acc, st) => acc + st.xbar[j]!, 0) / d;
        for (const st of steps) u[j]! -= (st.a[i]! / st.s0l) * (r.x[j]! - st.xbar[j]!);
      }
      perCluster.set(r.cluster, u);
    });
  }
  const meat = zeroMat(k);
  for (const u of perCluster.values()) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) meat[a]![b]! += u[a]! * u[b]!;
  const inv = invert(info);
  const robust = inv.map((row) => matVec(meat, row)).map((row) => matVec(inv, row)); // I^-1 B I^-1 (doi xung)
  return {
    beta,
    se: robust.map((row, j) => Math.sqrt(Math.max(0, row[j]!))),
    seModel: inv.map((row, j) => Math.sqrt(Math.max(0, row[j]!))),
    nEvents: rows.filter((r) => r.event).length,
    nClusters: perCluster.size,
  };
}

// ---------------------------------------------------------------------------
// HOI QUY LOGISTIC co chinh quy hoa L2 (khong phat he so chan) - Newton / IRLS
// ---------------------------------------------------------------------------

export function fitLogistic(x: number[][], y: number[], lambda = 1, iterations = 50) {
  const k = (x[0]?.length ?? 0) + 1;
  const rows = x.map((r) => [1, ...r]);
  let beta = zeros(k);
  for (let it = 0; it < iterations; it++) {
    const grad = beta.map((b, j) => (j === 0 ? 0 : -lambda * b));
    const hess = zeroMat(k).map((row, j) => row.map((_, l) => (j === l && j > 0 ? lambda : 0)));
    rows.forEach((r, i) => {
      const p = sigmoid(dot(beta, r));
      for (let a = 0; a < k; a++) {
        grad[a]! += (y[i]! - p) * r[a]!;
        for (let b = 0; b < k; b++) hess[a]![b]! += p * (1 - p) * r[a]! * r[b]!;
      }
    });
    const step = matVec(invert(hess), grad);
    beta = beta.map((b, j) => b + step[j]!);
    if (Math.max(...step.map(Math.abs)) < 1e-9) break;
  }
  return { beta, predict: (xs: number[][]) => xs.map((r) => sigmoid(dot(beta, [1, ...r]))) };
}

/** AUC = P(diem nguoi co su kien > nguoi khong), hoa tinh 1/2 (Mann-Whitney). NaN neu thieu mot lop. */
export function auc(score: number[], y: number[]): number {
  const idx = score.map((s, i) => [s, y[i]!] as const).sort((a, b) => a[0] - b[0]);
  let rankSum = 0;
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    const r = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) if (idx[t]![1] === 1) rankSum += r;
    i = j + 1;
  }
  const pos = y.filter((v) => v === 1).length;
  const neg = y.length - pos;
  return pos && neg ? (rankSum - (pos * (pos + 1)) / 2) / (pos * neg) : NaN;
}

export const brier = (p: number[], y: number[]) => p.reduce((s, x, i) => s + (x - y[i]!) ** 2, 0) / p.length;

/** Calibration: chia `bins` nhom theo xac suat du doan, so TB du doan voi ty le that. */
export function calibrationBins(p: number[], y: number[], bins = 5) {
  const order = p.map((x, i) => [x, y[i]!] as const).sort((a, b) => a[0] - b[0]);
  return Array.from({ length: bins }, (_, b) => {
    const part = order.slice(Math.floor((b * order.length) / bins), Math.floor(((b + 1) * order.length) / bins));
    return { n: part.length, predicted: part.reduce((s, x) => s + x[0], 0) / (part.length || 1), observed: part.reduce((s, x) => s + x[1], 0) / (part.length || 1) };
  });
}

/** Chia nhom theo cum (GroupKFold): moi em chi nam o 1 fold => khong co em vua o train vua o test. */
export function groupFolds(clusters: string[], k: number, seed = 1): Map<string, number> {
  const ids = [...new Set(clusters)].sort();
  const rnd = seededRandom(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return new Map(ids.map((id, i) => [id, i % k] as const));
}

/** Bootstrap theo cum: khoang 95% cua stat tren cac cum boc lai co hoan lai. */
export function clusterBootstrap<T>(items: T[], clusterOf: (t: T) => string, stat: (sample: T[]) => number, rounds = 500, seed = 3): [number, number] {
  const groups = new Map<string, T[]>();
  for (const t of items) groups.set(clusterOf(t), [...(groups.get(clusterOf(t)) ?? []), t]);
  const keys = [...groups.keys()];
  const rnd = seededRandom(seed);
  const vals: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const sample = Array.from({ length: keys.length }, () => groups.get(keys[Math.floor(rnd() * keys.length)]!)!).flat();
    const v = stat(sample);
    if (Number.isFinite(v)) vals.push(v);
  }
  vals.sort((a, b) => a - b);
  return [vals[Math.floor(0.025 * (vals.length - 1))]!, vals[Math.floor(0.975 * (vals.length - 1))]!];
}

// ---------------------------------------------------------------------------
// IPS - danh gia offline mot chinh sach goi y khac bang nhat ky cua chinh sach dang chay
// ---------------------------------------------------------------------------

/**
 * Moi quyet dinh da ghi: hanh dong a (xac suat p theo chinh sach dang chay), phan thuong r (vd lam xong trong ngay),
 * xac suat q chinh sach MOI chon dung a. IPS = TB(r q / p); SNIPS chuan hoa theo tong trong so (it dao dong hon).
 * Chi dung khi chinh sach moi chi chon trong tap ung vien chinh sach cu co the chon (p > 0 - positivity).
 */
export function ipsEstimate(items: { p: number; q: number; r: number }[]) {
  const w = items.map((x) => x.q / x.p);
  const sw = w.reduce((a, b) => a + b, 0);
  return {
    ips: items.reduce((s, x, i) => s + x.r * w[i]!, 0) / items.length,
    snips: sw > 0 ? items.reduce((s, x, i) => s + x.r * w[i]!, 0) / sw : NaN,
    /** Co mau hieu dung (sum w)^2 / sum w^2 - nho = uoc luong dua vao rat it quyet dinh. */
    ess: sw > 0 ? sw ** 2 / w.reduce((s, x) => s + x * x, 0) : 0,
  };
}

// ---------------------------------------------------------------------------
// MO HINH LUA CHON BAT BUOC kieu Thurstonian (B1) - ban xap xi LOGIT
// ---------------------------------------------------------------------------

/**
 * Moi cau chon 1 trong n dap an. Do thoa dung cua dap an o voi em s: u = mu_o + sum_d w_od * eta_sd + nhieu.
 *   - w_od = trong so thiet ke (CO DINH, xac nhan theo thiet ke - khong uoc luong tai trong);
 *   - nhieu Gumbel => P(chon o) = softmax (Luce / logit) thay vi probit cua Thurstonian IRT chuan;
 *   - eta_s ~ N(0, I): uoc luong MAP tung em (Newton), mu_o tung cau (dap an dau = 0 de dinh danh).
 * Khac diem khao sat hien tai (phan vi tung nhom, ipsative), eta la thang CHUAN (so sanh duoc giua cac em) va co sai
 * so chuan tung em. Gioi han: moi dap an deu cham DUONG nen muc tuyet doi chi dinh danh mot phan (da biet o TIRT).
 */
export function fitForcedChoice(
  questions: { id: string; options: { id: string; weights: number[] }[] }[],
  people: { chosen: Map<string, string> }[],
  outer = 25
) {
  const k = questions[0]?.options[0]?.weights.length ?? 0;
  const mu = new Map<string, number>(questions.flatMap((q) => q.options.map((o) => [o.id, 0] as const)));
  const eta = people.map(() => zeros(k));
  const probs = (q: (typeof questions)[number], e: number[]) => {
    const u = q.options.map((o) => mu.get(o.id)! + dot(o.weights, e));
    const m = Math.max(...u);
    const ex = u.map((v) => Math.exp(v - m));
    const s = ex.reduce((a, b) => a + b, 0);
    return ex.map((v) => v / s);
  };
  let hessians: number[][][] = [];
  for (let it = 0; it < outer; it++) {
    hessians = people.map((person, s) => {
      let h = zeroMat(k);
      for (let step = 0; step < 4; step++) {
        const g = eta[s]!.map((v) => -v);
        h = zeroMat(k).map((row, j) => row.map((_, l) => (j === l ? 1 : 0)));
        for (const q of questions) {
          const c = person.chosen.get(q.id);
          if (!c) continue;
          const p = probs(q, eta[s]!);
          const wbar = zeros(k).map((_, j) => q.options.reduce((acc, o, i) => acc + p[i]! * o.weights[j]!, 0));
          const wc = q.options.find((o) => o.id === c)!.weights;
          for (let j = 0; j < k; j++) g[j]! += wc[j]! - wbar[j]!;
          q.options.forEach((o, i) => {
            for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) h[a]![b]! += p[i]! * (o.weights[a]! - wbar[a]!) * (o.weights[b]! - wbar[b]!);
          });
        }
        const st = matVec(invert(h), g);
        eta[s] = eta[s]!.map((v, j) => v + st[j]!);
      }
      return h;
    });
    for (const q of questions) {
      const free = q.options.slice(1);
      for (let step = 0; step < 3; step++) {
        const g = free.map((o) => -0.01 * mu.get(o.id)!); // phat rat nhe de dap an khong ai chon khong troi ve -vo cung
        const h: number[][] = free.map((_, a) => free.map((__, b) => (a === b ? 0.01 : 0)));
        people.forEach((person, s) => {
          const c = person.chosen.get(q.id);
          if (!c) return;
          const p = probs(q, eta[s]!).slice(1);
          free.forEach((o, a) => {
            g[a]! += (o.id === c ? 1 : 0) - p[a]!;
            free.forEach((__, b) => (h[a]![b]! += (a === b ? p[a]! : 0) - p[a]! * p[b]!));
          });
        });
        const st = matVec(invert(h), g);
        free.forEach((o, a) => mu.set(o.id, mu.get(o.id)! + st[a]!));
      }
    }
  }
  const se = hessians.map((h) => invert(h).map((row, j) => Math.sqrt(Math.max(0, row[j]!))));
  /** Do tin cay thuc nghiem tung chieu = var(eta^) / (var(eta^) + TB sai so^2). */
  const reliability = zeros(k).map((_, j) => {
    const v = eta.map((e) => e[j]!);
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    const varHat = v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1);
    const err = se.reduce((a, s) => a + s[j]! ** 2, 0) / se.length;
    return varHat / (varHat + err);
  });
  return { eta, se, mu, reliability };
}

// ---------------------------------------------------------------------------
// Chinh sach goi y THAY THE de danh gia bang IPS (dung chung cho analyze-models va simulate-pilot)
// ---------------------------------------------------------------------------

/** So sao trung binh co ve 3 (5 lan quan sat ao) cua tung hoat dong - tu nhat ky TRUOC ngay quyet dinh (khong ro ri). */
export const RATING_PRIOR_N = 5;

/**
 * "Uu tien hoat dong duoc cham cao": trong cac ung vien chinh sach hien tai co the chon hom do, chon hoat dong co
 * so sao trung binh (co ve 3) cao nhat; hoa thi id nho nhat. Tat dinh => q = 1 cho dung hoat dong do, 0 cho con lai.
 */
export function highestRatedCandidate(candidateIds: string[], ratings: Map<string, { n: number; sum: number }>): string {
  const score = (id: string) => {
    const s = ratings.get(id);
    return ((s?.sum ?? 0) + 3 * RATING_PRIOR_N) / ((s?.n ?? 0) + RATING_PRIOR_N);
  };
  return [...candidateIds].sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0]!;
}
