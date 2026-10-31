// node tests/chem.test.mjs  — 시뮬레이션 코어 검증 (외부 의존성 없음)
import * as C from '../js/sim/chem.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.error('  FAIL:', msg)); if (cond) console.log('  ok  :', msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('[열역학]');
// 문헌 표값(N2+3H2⇌2NH3, atm⁻²): 300°C≈4.3e-3, 400°C≈1.6e-4, 500°C≈1.45e-5, 600°C≈2.25e-6 — 상관식은 10% 안팎 오차 허용
for (const [tc, ref] of [[300, 4.3e-3], [400, 1.6e-4], [500, 1.45e-5], [600, 2.25e-6]]) {
  const k = C.Kp(tc + 273.15);
  ok(Math.abs(Math.log(k / ref)) < 0.17, `Kp(${tc}°C) = ${k.toExponential(2)} (표 ${ref})`);
}
ok(C.eqNH3Fraction(773.15, 1) < 0.003, '1 bar, 500°C 평형 NH3 < 0.3 %');
const y200 = C.eqNH3Fraction(773.15, 200);
ok(y200 > 0.14 && y200 < 0.20, `200 bar, 500°C 평형 NH3 = ${(y200 * 100).toFixed(1)} % (이상기체; 실측 약 17–18 %)`);
ok(C.eqNH3Fraction(773.15, 300) > C.eqNH3Fraction(773.15, 200), '압력↑ → 평형 NH3↑ (Le Chatelier)');
ok(C.eqNH3Fraction(873.15, 200) < C.eqNH3Fraction(773.15, 200), '온도↑ → 평형 NH3↓ (발열 반응)');
ok(near(C.psatNH3(293.15), 8.5, 0.4), `NH3 포화증기압 20°C = ${C.psatNH3(293.15).toFixed(2)} bar (문헌 ≈ 8.6)`);
ok(near(C.psatNH3(239.82), 1.013, 0.05), `NH3 정상 끓는점 −33.3°C에서 ≈1 atm`);

console.log('[속도론 · 반응기]');
const peak = (P) => {
  let best = -1, bt = 0;
  for (let tc = 300; tc <= 700; tc += 10) { const y = C.isothermalOutlet(tc + 273.15, P, 10000, 1).y; if (y > best) { best = y; bt = tc; } }
  return bt;
};
const t200 = peak(200);
ok(t200 > 400 && t200 < 520, `200 bar 최적 온도(속도·평형 타협) = ${t200}°C`);
ok(peak(300) <= peak(100), '압력이 높을수록 최적 온도는 같거나 낮아짐');
const lowT = C.isothermalOutlet(623.15, 200, 10000, 1).y, eqLow = C.eqNH3Fraction(623.15, 200);
ok(lowT < 0.6 * eqLow, '350°C: 속도 제한 (출구 < 평형의 60 %)');
const hiT = C.isothermalOutlet(973.15, 200, 10000, 1).y, eqHi = C.eqNH3Fraction(973.15, 200);
ok(near(hiT, eqHi, 1e-3), '700°C: 평형 제한 (출구 ≈ 평형)');
const bed = C.integrateBed({ N2: 25, H2: 75, NH3: 3, I: 1 }, 673.15, 200, 3, 1);
ok(bed.Tout > 673.15 + 30, `단열 층: 온도 상승 ${(bed.Tout - 673.15).toFixed(0)} K`);
const xeq = C.eqNH3Fraction(bed.Tout, 200, { N2: 25, H2: 75, NH3: 3, I: 1 });
ok(bed.profile.every((p, i, a) => i === 0 || p.xi >= a[i - 1].xi - 1e-12), '진행도는 단조 증가');
ok(bed.profile.at(-1).y <= 1, '몰분율 ≤ 1');

console.log('[합성 루프]');
const base = { P: 250, Tin: [380, 400, 420], V: 5, F: 170, yI: 0.01, purge: 0.03, TsepC: 0, cat: 'feK', purif: 'wash', split: [1, 2, 3] };
const L = C.solveLoop(base);
ok(L.converged, `루프 수렴 (반복 ${L.iters})`);
ok(L.balance.err < 1e-4, `질소 원자 수지 오차 ${L.balance.err.toExponential(1)}`);
ok(L.tpd > 20 && L.tpd < 40, `생산량 ${L.tpd.toFixed(1)} t/d`);
const maxPossible = (base.F * (1 - base.yI) * 0.25 * 2 * 17.0305 * 24) / 1000;
ok(L.tpd <= maxPossible + 1e-6, `생산량 ≤ 화학양론 상한 ${maxPossible.toFixed(1)} t/d`);
const lowP = C.solveLoop({ ...base, P: 100, TsepC: 20 });
ok(lowP.tpd < 1, '100 bar·20°C: 출구 NH3가 포화농도 이하 → 응축 불가 → 생산 ≈ 0');
const noPur = C.solveLoop({ ...base, purif: 'none' });
ok(noPur.tpd < L.tpd * 0.7, '정제 없음: 촉매 피독으로 생산 급감');
const smallPurge = C.solveLoop({ ...base, purge: 0.005 });
ok(smallPurge.inertIn > L.inertIn, '퍼지 감소 → 불활성 기체 축적');

console.log('[재료]');
const v1 = C.vesselCheck('carbon', { P: 200, pH2Bar: 150, Tgas: 500 });
const v2 = C.vesselCheck('liner', { P: 200, pH2Bar: 150, Tgas: 500 });
ok(!v1.ok && Number.isFinite(v1.hoursToFail), `탄소강 단일 벽: 수소 침해로 불합격 (모델 추정 ${v1.hoursToFail.toFixed(0)} h)`);
ok(v2.ok, '연철 라이너 + 냉각 외피: 합격');
ok(!C.vesselCheck('liner', { P: 400, pH2Bar: 300, Tgas: 500 }).ok, '정격 초과 압력은 불합격');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
