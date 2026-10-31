/* ------------------------------------------------------------------
 * chem.js — 암모니아 합성 공정 시뮬레이션 코어 (순수 함수, DOM/Three 비의존)
 *
 * 모델 범위와 한계 (교육용)
 *  - 평형: 문헌에서 널리 쓰이는 Haber 평형 상관식(Gillespie–Beattie 형)의 Kp(T). 이상기체 가정.
 *    → 고압에서 실제 평형 NH3 농도는 이 값보다 높다(비이상성). 이 한계는 UI에도 표시한다.
 *  - 속도: Temkin–Pyzhev 형 속도식(α = 0.5). 상수는 "게임 균형"을 위해 조정한 값이며
 *    특정 상용 촉매의 실측 상수가 아니다.
 *  - 촉매층: 단열 플러그흐름(1-D), 층간 냉각은 이상적 열교환(목표 입구온도까지).
 *  - 루프: 신규 합성가스 + 재순환 → 반응기 → 분리기(암모니아 포화증기압 기준) → 퍼지/재순환.
 * ------------------------------------------------------------------ */

export const R = 8.314462618;            // J/(mol·K)
export const ATM_PER_BAR = 0.986923;
export const MW = { N2: 28.0134, H2: 2.01588, NH3: 17.0305, I: 30.0 };
const CP = { N2: 31.2, H2: 29.4, NH3: 49.0, I: 30.0 };   // J/(mol·K), 약 700 K 부근 평균

/* ---------- 열역학 ---------- */

/** ½N2 + 3/2H2 → NH3 의 Kp (atm^-1). T[K] */
export function KpHalf(T) {
  const l =
    -2.691122 * Math.log10(T) - 5.519265e-5 * T + 1.848863e-7 * T * T + 2001.6 / T + 2.6899;
  return Math.pow(10, l);
}
/** N2 + 3H2 → 2NH3 의 Kp (atm^-2) */
export const Kp = (T) => KpHalf(T) ** 2;

/** 반응열 (J/mol-반응, 2NH3 기준). 발열이므로 음수. 온도 의존성은 선형 근사 */
export const dHr = (T) => -(92.4e3 + 34 * (T - 298.15));

/** NH3 포화증기압 (bar). Antoine 식 (NIST, 239.6–371.5 K) */
export function psatNH3(T) {
  return Math.pow(10, 4.86886 - 1113.928 / (T - 10.409));
}

const sum = (n) => n.N2 + n.H2 + n.NH3 + n.I;
export const yOf = (n) => {
  const t = sum(n);
  return { N2: n.N2 / t, H2: n.H2 / t, NH3: n.NH3 / t, I: n.I / t };
};
const adv = (n, xi) => ({ N2: n.N2 - xi, H2: n.H2 - 3 * xi, NH3: n.NH3 + 2 * xi, I: n.I });
const cpSum = (n) => n.N2 * CP.N2 + n.H2 * CP.H2 + n.NH3 * CP.NH3 + n.I * CP.I;

/** 현재 조성 n에서 평형까지의 반응 진행도 ξ (n과 같은 단위). T[K], P[bar] */
export function eqExtent(n, T, Pbar) {
  const P = Pbar * ATM_PER_BAR;
  const K = Kp(T);
  let lo = -n.NH3 / 2;
  let hi = Math.min(n.N2, n.H2 / 3) * (1 - 1e-12);
  const f = (xi) => {
    const m = adv(n, xi);
    const t = sum(m);
    const yN = m.N2 / t, yH = m.H2 / t, yA = m.NH3 / t;
    return yA * yA - K * P * P * yN * yH * yH * yH;
  };
  for (let i = 0; i < 70; i++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) > 0) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}

/** 1:3 화학양론 공급 시 평형 NH3 몰분율 */
export function eqNH3Fraction(T, Pbar, feed = { N2: 1, H2: 3, NH3: 0, I: 0 }) {
  const xi = eqExtent(feed, T, Pbar);
  return yOf(adv(feed, xi)).NH3;
}

/* ---------- 속도론 ---------- */

const ALPHA = 0.5;
const EA = 190e3;          // J/mol (역반응 활성화 에너지; 정반응 실효값 ≈ 100 kJ/mol, 조정값)
const T_REF = 750;         // K
const K_REF = 200;         // kmol 진행도/(m³ 촉매·h) 단위로 정규화한 상수 (조정값)

export const CATALYSTS = {
  os:   { id: 'os',   name: '오스뮴 (Haber 1909)',          act: 5.0, Tmax: 600, maxVol: 0.02 },
  fe:   { id: 'fe',   name: '철 (무촉진)',                  act: 0.45, Tmax: 480, maxVol: 8 },
  feK:  { id: 'feK',  name: '철 + Al₂O₃·K₂O (Mittasch)',    act: 1.0, Tmax: 530, maxVol: 8 },
};

/** 촉매 부피당 진행도 속도 (kmol/(m³·h)). n: 몰 유량(임의 단위, 조성만 사용), T[K], P[bar] */
export function rateExtent(n, T, Pbar, act = 1) {
  const t = sum(n);
  const P = Pbar * ATM_PER_BAR;
  const pN = (n.N2 / t) * P;
  const pH = (n.H2 / t) * P;
  const pA = Math.max((n.NH3 / t) * P, 2e-4 * P);        // 0 나눗셈 방지 하한
  const X = (pA * pA) / (pH * pH * pH);
  const k = K_REF * Math.exp((-EA / R) * (1 / T - 1 / T_REF));
  return act * k * (Kp(T) * pN * Math.pow(X, -ALPHA) - Math.pow(X, 1 - ALPHA));
}

/**
 * 등온 플러그흐름 관(단일 통과, 1:3 공급)의 출구 NH3 몰분율.
 * "열역학(평형) vs 속도론" 타협을 보여주는 지표: 낮은 T는 느려서, 높은 T는 평형이 낮아서 손해 → 중간 T에서 최대.
 * SV: 공간속도 (Nm³/(m³촉매·h))
 */
export function isothermalOutlet(T, Pbar, SV = 10000, act = 1) {
  const feed = { N2: 1, H2: 3, NH3: 0, I: 0 };        // 1 kmol N2 기준
  const Vtotal = (4 * 22.414) / SV;                    // m³ 촉매 per (4 kmol/h 총유량)
  const steps = 160, dV = Vtotal / steps;
  let n = { ...feed };
  for (let i = 0; i < steps; i++) {
    let d = Math.max(rateExtent(n, T, Pbar, act) * dV, 0);
    const xe = Math.max(eqExtent(n, T, Pbar), 0);
    if (d > xe) d = xe;
    n = adv(n, d);
  }
  return { y: yOf(n).NH3, yEq: eqNH3Fraction(T, Pbar) };
}

/* ---------- 단열 촉매층 / 다단 반응기 ---------- */

/**
 * 한 개의 단열 촉매층을 적분한다.
 * @param nIn  입구 유량 {N2,H2,NH3,I} (kmol/h)
 * @param T0   입구 온도 (K)
 * @param V    촉매 부피 (m³)
 */
export function integrateBed(nIn, T0, Pbar, V, act, steps = 120) {
  let n = { ...nIn };
  let T = T0;
  const dV = V / steps;
  const prof = [{ v: 0, T, y: yOf(n).NH3, xi: 0 }];
  let xiTot = 0;
  for (let i = 0; i < steps; i++) {
    const r1 = rateExtent(n, T, Pbar, act);
    let d1 = Math.max(r1 * dV, 0);
    const nm = adv(n, 0.5 * d1);
    const Tm = T + (-dHr(T) * 0.5 * d1) / cpSum(n);
    let d = Math.max(rateExtent(nm, Tm, Pbar, act) * dV, 0);
    // 평형 초과 방지 (한 번의 보정으로 충분: dξ를 줄이면 T가 내려가 평형이 올라간다)
    let Tn = T + (-dHr(T) * d) / cpSum(n);
    const xe = Math.max(eqExtent(n, Tn, Pbar), 0);
    if (d > xe) { d = xe; Tn = T + (-dHr(T) * d) / cpSum(n); }
    n = adv(n, d);
    T = Tn;
    xiTot += d;
    prof.push({ v: (i + 1) * dV, T, y: yOf(n).NH3, xi: xiTot });
  }
  return { out: n, Tout: T, xi: xiTot, profile: prof };
}

/**
 * 다단 반응기. design.Tin: 각 층 입구온도 (°C 배열), design.V: 총 촉매 부피(균등 분할)
 */
export function reactor(feed, design) {
  const beds = [];
  let n = { ...feed };
  let TprevOut = null;
  const N = design.Tin.length;
  let Tmax = 0;
  const act = design.act;
  for (let i = 0; i < N; i++) {
    let Tin = design.Tin[i] + 273.15;
    if (TprevOut !== null) Tin = Math.min(Tin, TprevOut - 1);   // 층간은 냉각만 가능
    const share = design.split ? design.split[i] / design.split.reduce((a, b) => a + b, 0) : 1 / N;
    const r = integrateBed(n, Tin, design.P, design.V * share, act, design.steps || 90);
    beds.push({ Tin, Tout: r.Tout, profile: r.profile, xi: r.xi, V: design.V * share, yIn: yOf(n).NH3, yOut: yOf(r.out).NH3 });
    Tmax = Math.max(Tmax, r.Tout, ...r.profile.map((p) => p.T));
    n = r.out;
    TprevOut = r.Tout;
  }
  return { out: n, beds, Tmax };
}

/* ---------- 합성 루프 ---------- */

export const PURIFICATION = {
  none:  { id: 'none',  name: '정제 없음',                         poison: 0.12, kWperKmol: 0.0,  note: 'CO·황화합물이 그대로 촉매에 도달' },
  wash:  { id: 'wash',  name: '구리액 세정 + 수성가스 전환',        poison: 0.92, kWperKmol: 1.1,  note: 'CO를 수십 ppm까지 낮춤. 세정 에너지 필요' },
  meth:  { id: 'meth',  name: '메탄화 정제 (후대 기술)',            poison: 1.00, kWperKmol: 0.6,  note: 'CO를 메탄으로 전환. 1913년에는 없던 방식' },
};

const T_AMB = 303.15;   // K, 냉각수 온도
const ETA = 0.65;

/**
 * 합성 루프 정상상태 해.
 * d = { P, Tin:[°C…], V, F, yI, purge, TsepC, cat, purif }
 */
export function solveLoop(d) {
  const cat = CATALYSTS[d.cat];
  const pur = PURIFICATION[d.purif];
  const act = cat.act * pur.poison;
  const Fn = { N2: d.F * (1 - d.yI) * 0.25, H2: d.F * (1 - d.yI) * 0.75, NH3: 0, I: d.F * d.yI };
  const Tsep = d.TsepC + 273.15;
  const ySat = Math.min(psatNH3(Tsep) / d.P, 0.5);
  const pg = Math.max(d.purge, 0.001);
  const Irec = ((1 - pg) * Fn.I) / pg;          // 불활성 기체는 반응하지 않으므로 정상상태 재순환량을 해석적으로 결정
  let Rn = { N2: Fn.N2 * 2.5, H2: Fn.H2 * 2.5, NH3: Fn.N2 * 0.1, I: Irec };
  let rx = null, sep = null, liquid = 0, feed = null, iters = 0, resid = 1;
  const keys = ['N2', 'H2', 'NH3'];
  // g(R): 재순환 유량 → 반응기 → 분리기 → 퍼지 후 재순환 유량
  const g = (R0) => {
    feed = { N2: Fn.N2 + R0.N2, H2: Fn.H2 + R0.H2, NH3: R0.NH3, I: Fn.I + R0.I };
    rx = reactor(feed, { P: d.P, Tin: d.Tin, V: d.V, act, split: d.split });
    const o = rx.out;
    const gas = o.N2 + o.H2 + o.I;
    const nh3Res = Math.min(o.NH3, (ySat / (1 - ySat)) * gas);
    liquid = o.NH3 - nh3Res;
    sep = { N2: o.N2, H2: o.H2, NH3: nh3Res, I: o.I };
    const k = 1 - pg;
    return { N2: sep.N2 * k, H2: sep.H2 * k, NH3: sep.NH3 * k, I: Irec };
  };
  // Wegstein 가속 고정점 반복 (퍼지가 작을수록 단순 반복은 매우 느려진다)
  let xPrev = null, gPrev = null;
  for (let it = 0; it < 120; it++) {
    iters = it + 1;
    const gx = g(Rn);
    resid = 0;
    for (const kk of keys) resid += Math.abs(gx[kk] - Rn[kk]);
    gx.I = Irec;
    if (resid < 1e-7 * d.F) { Rn = gx; break; }
    const nx = { I: Irec };
    for (const kk of keys) {
      let q = 0;
      if (xPrev) {
        const dx = Rn[kk] - xPrev[kk];
        if (Math.abs(dx) > 1e-14) {
          const sl = (gx[kk] - gPrev[kk]) / dx;
          q = Math.min(Math.max(sl / (sl - 1), -5), 0);
        }
      }
      nx[kk] = Math.max(q * Rn[kk] + (1 - q) * gx[kk], 0);
    }
    xPrev = { ...Rn }; gPrev = { ...gx };
    Rn = nx;
  }
  // 수렴 후 최종 상태 재계산(feed/rx/sep/liquid를 Rn과 일치시킴)
  { const gx = g(Rn); resid = keys.reduce((a, kk) => a + Math.abs(gx[kk] - Rn[kk]), 0); }
  const purgeFlow = {
    N2: sep.N2 * pg, H2: sep.H2 * pg, NH3: sep.NH3 * pg, I: sep.I * pg,
  };
  const tpd = (liquid * MW.NH3 * 24) / 1000;                 // t/day
  const yIn = yOf(feed), yOut = yOf(rx.out);
  const nFeed = sum(feed);
  const nRec = sum(Rn);
  const SV = (nFeed * 22.414) / d.V;                        // Nm³/(m³·h)
  const dPloop = 3 + 0.0008 * SV;                           // bar (조정 모델)
  // 동력 (kW)
  const Wfresh = ((d.F * 1000 * R * T_AMB * Math.log(d.P / 1.0)) / ETA) / 3.6e6;
  const Wrec = ((nRec * 1000 * R * T_AMB * Math.log(1 + dPloop / d.P)) / ETA) / 3.6e6;
  let Wref = 0, Qref = 0;
  if (Tsep < T_AMB) {
    const y30 = Math.min(psatNH3(T_AMB) / d.P, 0.5);
    const gOut = rx.out.N2 + rx.out.H2 + rx.out.I;
    const liq30 = rx.out.NH3 - Math.min(rx.out.NH3, (y30 / (1 - y30)) * gOut);
    const extra = Math.max(liquid - liq30, 0);
    Qref = (sum(rx.out) * 1000 * 29.5 * (T_AMB - Tsep) + extra * 1000 * 23.3e3) / 3.6e6;   // kW(열)
    const cop = Math.min(Math.max(0.5 * Tsep / (T_AMB - Tsep), 1.0), 8);
    Wref = Qref / cop;
  }
  const Wpur = pur.kWperKmol * d.F;
  const Wtot = Wfresh + Wrec + Wref + Wpur;
  const tph = tpd / 24;
  const GJperT = tph > 1e-9 ? (Wtot * 3.6e-3) / tph : Infinity;
  // 물질수지 검증 (질소 원자)
  const Nin = 2 * Fn.N2;
  const Nout = liquid + 2 * purgeFlow.N2 + purgeFlow.NH3;
  return {
    converged: resid < 1e-3 * d.F, iters, resid,
    ySat, feed, yIn, yOut, rx, sep, purgeFlow, liquid,
    tpd, nFeed, nRec, recycleRatio: nRec / d.F, SV, dPloop,
    power: { fresh: Wfresh, recycle: Wrec, refrig: Wref, purif: Wpur, total: Wtot, Qref },
    GJperT,
    Tmax: rx.Tmax,
    h2n2: yIn.H2 / yIn.N2,
    inertIn: yIn.I,
    perPassN2: rx.beds.reduce((a, b) => a + b.xi, 0) / feed.N2,         // 한 번 통과 시 N2 전환율
    balance: { Nin, Nout, err: Math.abs(Nin - Nout) / Nin },
    act,
  };
}

/* ---------- 재료: 수소 침해(Nelson 곡선 경향의 단순화) ---------- */

/** 탄소강의 수소 침해 한계온도 (°C), pH2 (MPa). 교육용 단순화 — API RP 941 곡선의 경향을 따름 */
export const nelsonCS = (pH2MPa) => 265 - 16 * Math.log(Math.max(pH2MPa, 0.3) / 0.7);
/** 2¼Cr-1Mo 계열(후대 합금강)의 한계온도 (°C) */
export const nelsonCrMo = (pH2MPa) => 520 - 12 * Math.log(Math.max(pH2MPa, 0.3) / 0.7);

export const VESSELS = {
  carbon: {
    id: 'carbon', name: '탄소강 단일 벽', year: '≤1910',
    desc: '가장 단순한 구조. 벽 온도가 내부 가스 온도에 가깝다.',
    rating: 250,
  },
  thick: {
    id: 'thick', name: '탄소강 두꺼운 벽 + 외부 단열', year: '≤1910',
    desc: '벽을 두껍게 해 응력을 낮추지만 벽은 여전히 뜨겁다.',
    rating: 300,
  },
  liner: {
    id: 'liner', name: '연철 라이너 + 냉각 외피 + 수소 배출구', year: '1910~',
    desc: '탄소가 거의 없는 연철 라이너가 열을 받고, 압력을 지탱하는 외피는 유입 가스로 냉각한다. 라이너를 투과한 수소는 외피의 작은 구멍으로 빠져나간다.',
    rating: 300,
  },
  crmo: {
    id: 'crmo', name: 'Cr–Mo 합금강 (후대 기술)', year: '1930s~',
    desc: '합금 원소가 탄화물을 안정화해 수소 침해 온도를 높인다. 1913년에는 쓸 수 없었다.',
    rating: 350,
  },
};

/**
 * 용기 판정. pH2Bar: 수소 분압(bar), Tgas: 촉매층 최고 가스 온도(°C), P: 설계압(bar)
 * 반환: {ok, Twall, Tlim, hoursToFail, reasons[]}
 */
export function vesselCheck(kind, { P, pH2Bar, Tgas }) {
  const v = VESSELS[kind];
  const pH2 = pH2Bar / 10;   // MPa
  const out = { kind, Twall: 0, Tlim: 0, ok: true, hoursToFail: Infinity, reasons: [] };
  if (kind === 'carbon') { out.Twall = Tgas - 30; out.Tlim = nelsonCS(pH2); }
  else if (kind === 'thick') { out.Twall = Tgas - 60; out.Tlim = nelsonCS(pH2); }
  else if (kind === 'liner') { out.Twall = 140; out.Tlim = nelsonCS(pH2); }
  else { out.Twall = Tgas - 40; out.Tlim = nelsonCrMo(pH2); }
  if (out.Twall > out.Tlim) {
    out.ok = false;
    const over = out.Twall - out.Tlim;
    out.hoursToFail = Math.max(12, 400 * Math.exp(-over / 35));
    out.reasons.push(`벽 온도 ${out.Twall.toFixed(0)}°C > 수소 침해 한계 ${out.Tlim.toFixed(0)}°C`);
  }
  if (P > v.rating) {
    out.ok = false;
    out.reasons.push(`설계압 ${P} bar > 용기 정격 ${v.rating} bar`);
  }
  return out;
}

/** 1909년 탁상 장치: 단일 통과 등온 관. 출구 NH3 몰분율과 평형값 */
export function labTube(TC, Pbar, cat = 'os', SV = 10000) {
  const T = TC + 273.15;
  const r = isothermalOutlet(T, Pbar, SV, CATALYSTS[cat].act);
  return { y: r.y, yEq: r.yEq, T };
}
