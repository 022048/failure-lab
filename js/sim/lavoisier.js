// 사건 01 시뮬레이션: 밀폐 레토르트(주석), 수은 종(부피법), 수은회 환원.
// 18세기 장비를 현대 측정 정밀도로 "재구성"한 모델이다. 이상기체와 단순 속도식만 사용한다.
export const R = 0.082057;               // L·atm/(mol·K)
export const MMHG = 760;
export const MW = { O2: 31.998, air: 28.964, Sn: 118.71, SnO2: 150.71, Hg: 200.59, HgO: 216.59 };
export const Y_O2 = 0.2095;              // 건조 공기의 산소 몰분율
export const BURST_ATM = 2.2;            // 이 압력을 넘으면 유리 레토르트가 깨진다고 본다
export const FURNACE = [
  { id: 1, label: '약한 불', C: 250, power: 0.45 },
  { id: 2, label: '보통 불', C: 350, power: 0.75 },
  { id: 3, label: '센 불', C: 450, power: 1.0 },
];

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export function gauss(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/** 한 번의 플레이에서 고정되는 조건과 숨은 값 */
export function makeRun(seed) {
  const r = rng(seed ^ 0x9e3779b9);
  const pick = (a, b, step) => round(a + Math.floor(r() * ((b - a) / step + 1)) * step, 3);
  const T0 = pick(286, 296, 0.5), P0mm = pick(742, 768, 1);
  return {
    seed, r,
    T0, P0mm, P0: P0mm / MMHG,
    retort: { V: pick(2.0, 4.0, 0.5), mSn: pick(36, 58, 1), vessel: round(410 + r() * 60, 2) },
    bell: { V0: pick(780, 860, 5), A: 30, h0: pick(30, 46, 1), tau: 6.5, dT: round(-4 + r() * 9, 1), dP: round(-12 + r() * 22, 0) },
    hgo: { m: pick(3.0, 6.0, 0.25), tau: 11 },
    noise: { m: 0.01, P: 1.5, V: 0.4 },
  };
}

/* ---------------- 1. 밀폐 레토르트 ---------------- */
export const kSn = (C) => 0.0665 * Math.exp(-(60000 / 8.314) * (1 / (C + 273.15) - 1 / 623.15));   // 1/h, 350 °C에서 12 h에 55%
export const peakAtm = (run, C) => run.P0 * (C + 273.15) / run.T0;                                // 밀폐·정적 가열 시 최고 압력
export const o2Avail = (run) => Y_O2 * run.P0 * run.retort.V / (R * run.T0);                       // mol
export const convSn = (C, hours) => 1 - Math.exp(-kSn(C) * hours);

/** 가열 결과(밀폐 후). 참값. */
export function retortHeat(run, furnaceId, hours) {
  const F = FURNACE.find((f) => f.id === furnaceId);
  const peak = peakAtm(run, F.C);
  const burst = peak > BURST_ATM;
  const f = convSn(F.C, hours);
  const n = f * o2Avail(run);                       // 소비된 O2 (mol) = 생성된 SnO2 (mol)
  return { F, peak, burst, f, n, gainMetal: n * MW.O2, gainAir: n * MW.air, dP_atm: n * R * run.T0 / run.retort.V };
}

export function readBalance(run, m, sigma = run.noise.m) { return round(m + gauss(run.r) * sigma, 2); }
/** 뜨거울 때 달면 대류(상승기류) 때문에 가볍게 읽힌다. */
export function hotShift(run, C) { return 0.0042 * (0.35 * C - 20) * (0.85 + 0.3 * run.r()); }

/* ---------------- 2. 수은 종 (부피법) ---------------- */
function solveBell(n, T, P, V0, A, h0) {
  // 종 안 기체: n R T = (P - h) * (Vtop - A h/10)/1000 / 760 ... 단위는 L·atm. h: mmHg(=mm), A: cm²
  const Vtop = V0 + A * h0 / 10;                     // cm³ (수은면 기준 위쪽 전체 부피)
  const f = (h) => (P - h) / MMHG * (Vtop - A * h / 10) / 1000 - n * R * T;
  let lo = 0, hi = 400;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  const h = (lo + hi) / 2;
  return { h, V: Vtop - A * h / 10 };
}
export function bellState(run, days) {
  const b = run.bell;
  const p0 = run.P0mm - b.h0;
  const n0 = (p0 / MMHG) * (b.V0 / 1000) / (R * run.T0);
  const nc = n0 * Y_O2 * (1 - Math.exp(-days / b.tau));
  const ramp = Math.min(days / 12, 1);
  const T = run.T0 + b.dT * ramp, P = run.P0mm + b.dP * ramp;
  const s = solveBell(n0 - nc, T, P, b.V0, b.A, b.h0);
  return { days, T, P, h: s.h, V: s.V, n0, nc, fTrue: nc / n0 };
}
export function bellRead(run, days) {
  const s = bellState(run, days), N = run.noise;
  return {
    days, T: round(s.T + gauss(run.r) * 0.2, 1), P: round(s.P + gauss(run.r) * 0.5, 1),
    h: round(s.h + gauss(run.r) * 0.5, 1), V: round(s.V + gauss(run.r) * N.V, 1), truth: s,
  };
}
/** 처음 상태(T0, p0)로 환산한 부피 */
export const bellCorrect = (run, rd) => rd.V * ((rd.P - rd.h) / (run.P0mm - run.bell.h0)) * (run.T0 / rd.T);

/* ---------------- 3. 수은회(HgO) 가열 ---------------- */
export function hgoState(run, minutes) {
  const g = run.hgo, f = 1 - Math.exp(-minutes / g.tau);
  const dec = g.m * f;                               // 분해된 HgO (g)
  const nO2 = dec / MW.HgO / 2;
  const Hg = dec * MW.Hg / MW.HgO * 0.994;           // 일부 증발·튐 손실
  const T = run.T0 + 1, P = run.P0mm;
  return { minutes, f, dec, residue: g.m - dec, Hg, nO2, V: nO2 * R * T / (P / MMHG) * 1000, T, P };
}
export function hgoRead(run, minutes) {
  const s = hgoState(run, minutes);
  return {
    minutes, T: round(s.T + gauss(run.r) * 0.2, 1), P: round(s.P + gauss(run.r) * 0.5, 1),
    V: round(s.V + gauss(run.r) * 0.6, 1), Hg: readBalance(run, s.Hg), residue: readBalance(run, s.residue), truth: s,
  };
}
