import assert from 'node:assert/strict';
import * as L from '../js/sim/lavoisier.js';
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok', n); };
const run = L.makeRun(12345);
t('mass: closed vessel conserved, open in-rush 28.96n, metal 32n', () => {
  const h = L.retortHeat(run, 2, 12);
  assert.ok(!h.burst);
  assert.ok(Math.abs(h.gainAir / h.gainMetal - L.MW.air / L.MW.O2) < 1e-9);
  assert.ok(h.gainMetal > 0.15 && h.gainMetal < 1.2, 'gain ' + h.gainMetal);
});
t('burst at strong fire', () => assert.ok(L.retortHeat(run, 3, 4).burst && !L.retortHeat(run, 1, 4).burst));
t('hot shift comparable with gain', () => { const s = L.hotShift(run, 350); assert.ok(s > 0.2 && s < 0.8, s); });
t('bell: corrected fraction ≈ truth', () => {
  for (const d of [2, 6, 12]) { const rd = L.bellRead(run, d); const f = 1 - L.bellCorrect(run, rd) / run.bell.V0; assert.ok(Math.abs(f - rd.truth.fTrue) < 0.006, `${d} ${f} ${rd.truth.fTrue}`); }
  const rd = L.bellRead(run, 12); const raw = 1 - rd.V / run.bell.V0; const cor = 1 - L.bellCorrect(run, rd) / run.bell.V0;
  console.log('   12d raw', raw.toFixed(4), 'corrected', cor.toFixed(4), 'truth', rd.truth.fTrue.toFixed(4), 'dT', run.bell.dT, 'dP', run.bell.dP);
});
t('hgo: mass balance', () => {
  const s = L.hgoState(run, 60);
  const o2mass = s.dec - s.Hg / 0.994;
  assert.ok(Math.abs(o2mass - s.nO2 * L.MW.O2) < 2e-3);
});
console.log(ok, 'passed');
