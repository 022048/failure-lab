// 사건 02 · 공기에서 빵을 (카를스루에 1909 → 오파우 1913)
import { h, fmt, slider, choice, tabs, kv, lineChart, legend, toast } from '../ui.js';
import * as C from '../sim/chem.js';
import { runQuiz } from '../quiz.js';
import { createHaberScene } from '../scenes/haber.js';

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const sec = (t) => h('h3', { class: 'sec' }, t);
const callout = (cls, ...c) => h('div', { class: 'callout ' + cls }, ...c);
function paper(title, src, stampText, ...body) {
  return h('div', { class: 'paper' }, stampText ? h('span', { class: 'stamp ' + (stampText === '1차 기록' ? 'primary' : stampText === '2차 자료' ? 'secondary' : 'recon') }, stampText) : null,
    h('h4', {}, title), h('div', { class: 'src' }, src), ...body.map((b) => (typeof b === 'string' ? h('p', {}, b) : b)));
}
const hab = (ctx) => (ctx.run.hab ||= { rules: true, points: [], vessel: null, vFails: 0, P: 200, Tgas: 500, hint: false, attempts: 0, d: null });
const nbadd = (ctx, tag, label, value, unit, digits, note, flag) => ctx.notebook.add({ tag, label, value, unit, digits, note, flag });
const CATS = [
  { value: 'os', label: '오스뮴 (하버, 1909)', desc: '활성이 매우 높지만 구할 수 있는 양이 극히 적다' },
  { value: 'fe', label: '무촉진 철', desc: '값싸지만 활성이 낮고 쉽게 열화한다' },
  { value: 'feK', label: '철 + Al₂O₃·K₂O (미타슈, 1910~)', desc: '촉진제를 넣어 활성과 수명을 크게 높인 촉매' },
];

/* ================= 1. 사건 기록 ================= */
function stepDossier(ctx) {
  const docs = [
    ['사건 개요', paper('식량이 질소에 달려 있다', '1898–1913 · 조사 의뢰서', '재구성',
      '1898년 윌리엄 크룩스는 영국학술협회 회장 연설에서, 밀 수확을 늘릴 질소 비료를 칠레 초석만으로는 감당할 수 없는 때가 온다고 경고했다. 공기의 78%가 질소지만 N≡N 삼중결합(결합 에너지 약 945 kJ/mol)이 너무 단단해서, 식물이 쓸 수 있는 형태로 바꾸기 어려웠다.',
      '질소와 수소로 암모니아를 만드는 반응은 종이 위에서는 단순하다. 문제는 이것을 하루 수십 톤 규모로, 매일 같은 품질로, 터지지 않게 돌리는 일이다. 이 조사에서 당신은 1909년의 탁상 실험에서 출발해 1913년의 공장 설계까지 간다.')],
    ['반응', paper('평형과 속도의 충돌', '화학 요약', '2차 자료',
      h('div', { class: 'formula' }, 'N₂ + 3 H₂ ⇌ 2 NH₃    ΔH° ≈ −92 kJ (발열), 기체 4몰 → 2몰'),
      '발열 반응이므로 온도를 낮출수록 평형에서 암모니아가 많아진다. 기체 몰수가 줄어드는 반응이므로 압력을 높일수록 평형이 생성물 쪽으로 간다. 그런데 낮은 온도에서는 반응이 너무 느려서 평형에 닿을 수 없다. 촉매는 속도를 올릴 뿐 평형 위치를 바꾸지 못한다.',
      callout('warn', h('b', {}, '그래서 설계가 타협이다. '), '충분히 빠르려면 온도를 올려야 하고, 올리면 평형이 불리해진다. 압력으로 그 손실을 메우면 장비가 버텨야 한다.'))],
    ['하버의 시연', paper('실험실에서 증명된 연속 합성', '1905–1909 · 요약', '2차 자료',
      h('p', {}, '프리츠 하버는 1900년대 초 암모니아 평형을 측정했고, 네른스트가 낸 수치와 어긋나 한동안 논쟁이 있었다. 이 논쟁은 고압에서의 재측정으로 정리되었고, 하버는 높은 압력이 필요하다는 결론으로 향했다.'),
      h('p', {}, '1909년 하버는 카를스루에에서 약 200기압 부근의 압력, 오스뮴 촉매, 그리고 반응하지 않은 가스를 암모니아를 빼낸 뒤 다시 보내는 순환을 갖춘 탁상 장치를 시연했다. BASF가 이를 평가했다. 한 번 지나갈 때의 전환율은 낮지만, 순환하면 총 전환이 높아진다는 것이 요점이었다.'))],
    ['스케일업', paper('실험대에서 공장으로', '1910–1913 · 요약', '2차 자료',
      h('p', {}, h('b', {}, '촉매. '), '오스뮴은 공급량이 너무 적었다. BASF의 알빈 미타슈 팀은 수많은 물질을 체계적으로 시험했고, 알루미나·칼륨 산화물 같은 촉진제를 넣은 철 촉매에 이르렀다. 이후에도 촉매가 독에 약하다는 점이 문제로 남아, 원료 가스의 정제가 필요했다.'),
      h('p', {}, h('b', {}, '용기. '), 'BASF의 카를 보슈가 맞닥뜨린 문제는 압력만이 아니었다. 뜨거운 고압 수소가 강철의 탄소와 반응해 강철을 약하게 만들었고, 탄소강 반응기가 파손됐다. 보슈는 탄소가 거의 없는 연철 라이너를 안에 넣고, 압력을 지탱하는 강철 외피는 낮은 온도로 유지하며, 라이너를 투과한 수소를 외피의 작은 구멍으로 빼는 이중 구조로 풀었다.'),
      h('p', {}, '1913년 오파우에서 최초의 상업 공장이 가동됐다.'))],
    ['모델의 한계', paper('이 시뮬레이션이 하는 일과 하지 않는 일', '가정 목록', '재구성',
      h('p', {}, '이상기체, 평형 상수의 문헌식 근사, 문헌 값에 맞춰 조정한 단순 속도식, 단열 촉매층, 층간 냉각을 사용한다. 열 회수와 정확한 동력은 단순화했다. 따라서 숫자는 교육용이며, 실제 오파우 설비의 값이 아니다. "하루 30톤 이상"이라는 목표도 이 게임이 정한 값이다.'),
      h('p', {}, '다만 방향과 트레이드오프는 실제와 같은 구조다. 압력·온도·촉매량·순환·퍼지·용기 재료가 서로 얽혀 있다는 점이 이 사건의 본질이다.'))],
  ];
  const view = h('div');
  const tb = tabs(docs.map((d) => d[0]), (i) => { view.innerHTML = ''; view.appendChild(docs[i][1]); check(); });
  const check = () => { if (ctx.state.read || tb.api.seen().size >= docs.length) { ctx.state.read = true; ctx.ready(true); } else ctx.ready(false, `자료 ${docs.length - tb.api.seen().size}개를 더 읽어 주세요`); };
  view.appendChild(docs[0][1]);
  ctx.el.append(tb, view);
  check();
}

/* ================= 2. 예측 ================= */
const PRED = [
  { id: 'p1', q: '온도를 올리면 평형에서의 NH₃ 농도는?', opts: ['올라간다', '내려간다', '변화 없다'], a: '내려간다', why: '발열 반응이라 고온은 역반응 쪽으로 평형을 민다.' },
  { id: 'p2', q: '압력을 올리면 평형에서의 NH₃ 농도는?', opts: ['올라간다', '내려간다', '변화 없다'], a: '올라간다', why: '기체 몰수가 4에서 2로 줄므로 고압이 생성물 쪽을 유리하게 한다.' },
  { id: 'p3', q: '촉매를 쓰면 평형에서의 NH₃ 농도는?', opts: ['올라간다', '내려간다', '변화 없다'], a: '변화 없다', why: '촉매는 정반응과 역반응을 같은 비율로 빠르게 할 뿐이다. 평형 위치는 그대로다.' },
  { id: 'p4', q: '만든 NH₃를 중간중간 빼내며 가스를 되돌리면, 전체 전환은?', opts: ['올라간다', '내려간다', '변화 없다'], a: '올라간다', why: '생성물이 계속 빠지면 반응물이 평형에 닿지 못하고 계속 반응한다. 한 번 통과 전환이 낮아도 순환으로 총 전환이 높아진다.' },
];
function stepPredict(ctx) {
  const st = ctx.state; st.p ||= {}; st.done ||= false;
  const root = h('div', { class: 'stack' });
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '실험하기 전에 르샤틀리에 원리로 예측해 두세요. 이 예측이 뒤의 실험 설계의 방향이 됩니다.'));
    PRED.forEach((q) => {
      const pick = st.p[q.id];
      const box = h('div', { class: 'callout ' + (st.done ? (pick === q.a ? 'good' : 'bad') : '') });
      box.appendChild(h('div', { style: { marginBottom: '8px' } }, q.q));
      const row = h('div', { class: 'row' });
      q.opts.forEach((o) => row.appendChild(h('button', { class: 'btn sm' + (pick === o ? ' primary' : ''), disabled: st.done, onclick: () => { st.p[q.id] = o; render(); } }, o)));
      box.appendChild(row);
      if (st.done) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, (pick === q.a ? '맞음. ' : `정답: ${q.a}. `) + q.why));
      root.appendChild(box);
    });
    if (!st.done) {
      const n = Object.keys(st.p).length;
      root.appendChild(h('button', { class: 'btn primary', disabled: n < PRED.length, onclick: () => {
        st.done = true; ctx.score('predict', PRED.filter((q) => st.p[q.id] === q.a).length / PRED.length, 10, '평형 예측'); ctx.ready(true); render();
      } }, '예측 확정'));
      ctx.ready(false, '네 문항을 모두 고르세요');
    } else {
      root.appendChild(callout('warn', h('b', {}, '충돌이 보입니다. '), '평형만 보면 낮은 온도·높은 압력이 최선이지만, 낮은 온도에서는 속도가 문제가 됩니다. 다음 단계에서 1909년 실험대로 이 타협점을 직접 찾습니다.'));
      ctx.ready(true);
    }
  };
  render();
  ctx.el.appendChild(root);
}

/* ================= 3. 1909 실험대 ================= */
const niceMax = (v) => [1, 2, 5, 10, 20, 40, 60, 80, 100].find((x) => x >= v) || 100;
function stepBench(ctx) {
  const H = hab(ctx), api = ctx.scene.api, st = ctx.state;
  st.T ??= 450; st.P ??= 200; st.SV ??= 10000; st.cat ??= 'os';
  const root = h('div', { class: 'stack' });
  const out = h('div', { class: 'stack' });
  const gate = () => {
    const Ts = new Set(H.points.map((p) => p.T)), hiP = H.points.some((p) => p.P >= 150), loP = H.points.some((p) => p.P <= 50);
    const ok = H.points.length >= 5 && Ts.size >= 3 && hiP && loP;
    if (ok) { ctx.score('bench', Math.min(1, Ts.size / 5), 5, '1909 실험'); ctx.ready(true, '측정 충분'); }
    else ctx.ready(false, `측정 ${H.points.length}/5 · 온도 ${Ts.size}/3종 · ${hiP ? '' : '150 bar 이상 필요 '}${loP ? '' : '50 bar 이하 필요'}`);
  };
  const update = () => {
    const r = C.labTube(st.T, st.P, st.cat, st.SV);
    const eqPts = [], acPts = [];
    let maxEq = 0;
    for (let T = 300; T <= 700; T += 10) {
      const eq = C.eqNH3Fraction(T + 273.15, st.P) * 100, ac = C.labTube(T, st.P, st.cat, st.SV).y * 100;
      eqPts.push([T, eq]); acPts.push([T, ac]); maxEq = Math.max(maxEq, eq);
    }
    const ymax = niceMax(Math.max(maxEq * 1.03, 1));
    out.innerHTML = '';
    out.append(
      kv('출구 NH₃', `${fmt(r.y * 100, 2)} %`), kv('평형 NH₃', `${fmt(r.yEq * 100, 2)} %`), kv('평형 도달', `${fmt((r.y / r.yEq) * 100, 0)} %`),
      lineChart({ w: 400, h: 220, x: { min: 300, max: 700, ticks: 8, label: '온도 (°C)' }, y: { min: 0, max: ymax, ticks: 5, fmt: (v) => (ymax <= 5 ? v.toFixed(1) : v.toFixed(0)), label: '출구 NH₃ (%)' },
        series: [{ pts: eqPts, color: '#8a98a6', dash: '5 4', width: 1.5 }, { pts: acPts, color: 'var(--accent)', width: 2.4 }],
        marks: [{ x: st.T, y: Math.min(r.y * 100, ymax), color: '#fff', fill: 'var(--accent)', r: 5 }],
        title: '온도별 출구 암모니아 농도' }),
      legend([{ color: '#8a98a6', label: '평형 (이론 한계)' }, { color: 'var(--accent)', label: '이 촉매·접촉 시간에서 실제' }]));
    api.setBench(clamp((st.T - 300) / 300, 0, 1)); api.setPressure(st.P);
    out.api = { r };
  };
  const sT = slider({ label: '온도', unit: '°C', min: 300, max: 700, step: 10, value: st.T, onInput: (v) => { st.T = v; update(); } });
  const sP = slider({ label: '압력', unit: 'bar', min: 1, max: 400, step: 1, value: st.P, onInput: (v) => { st.P = v; update(); } });
  const sV = slider({ label: '공간 속도 (클수록 접촉 시간이 짧다)', unit: 'h⁻¹', min: 2000, max: 30000, step: 1000, value: st.SV, onInput: (v) => { st.SV = v; update(); } });
  const cat = choice({ options: CATS, value: st.cat, name: '촉매', onChange: (v) => { st.cat = v; update(); } });
  const tbl = h('div');
  const paintTbl = () => {
    tbl.innerHTML = '';
    if (!H.points.length) return;
    const t = h('table', { class: 'data' }, h('tr', {}, ...['T', 'P', '촉매', 'SV', 'NH₃ %'].map((x) => h('th', {}, x))));
    H.points.slice(-8).forEach((p) => t.appendChild(h('tr', {}, h('td', {}, p.T), h('td', {}, p.P), h('td', {}, p.cat), h('td', {}, p.SV), h('td', { class: 'n' }, fmt(p.y * 100, 2)))));
    tbl.appendChild(t);
  };
  const rec = h('button', { class: 'btn primary', onclick: () => {
    const r = C.labTube(st.T, st.P, st.cat, st.SV);
    H.points.push({ T: st.T, P: st.P, cat: st.cat, SV: st.SV, y: r.y, yEq: r.yEq });
    nbadd(ctx, 'm' + H.points.length, `측정 ${H.points.length}: ${st.T} °C, ${st.P} bar, ${st.cat}`, r.y * 100, '% NH₃', 2);
    paintTbl(); gate();
  } }, '이 조건에서 측정 기록');
  root.append(
    callout('', h('b', {}, '1909년 카를스루에 탁상 장치. '), '촉매 관 하나로 가스를 한 번 통과시켜 출구의 암모니아 농도를 잽니다. 조건을 바꿔 가며 최소 다섯 번 측정하세요. 압력이 높은 조건과 낮은 조건을 모두 포함해야 합니다.'),
    sT, sP, sV, cat, out, rec, tbl);
  ctx.el.appendChild(root);
  ctx.fly('bench'); update(); paintTbl(); gate();
}

/* ================= 4. 해석 ================= */
function stepAnalysis(ctx) {
  const H = hab(ctx);
  const hi = H.points.filter((p) => p.P >= 150).sort((a, b) => b.y - a.y)[0] || H.points[0];
  const xi = (4 * hi.y) / (2 + 2 * hi.y);        // 1:3 공급 기준, N2·H2 한 번 통과 전환율
  let Topt = 0, ymax = 0;
  for (let T = 300; T <= 700; T += 10) { const y = C.labTube(T, 200, 'os', 10000).y; if (y > ymax) { ymax = y; Topt = T; } }
  const qs = [
    { k: 'a1', type: 'num', title: '1. 한 번 통과 전환율', body: '당신의 측정 중 150 bar 이상에서 가장 높았던 점입니다. 공급이 N₂ 1 : H₂ 3이고 출구 NH₃ 몰분율이 y일 때, 한 번 통과한 N₂(= H₂)의 전환율을 구하세요. (힌트: 반응 진행도 ξ에서 y = 2ξ / (4 − 2ξ))',
      data: [['조건', `${hi.T} °C, ${hi.P} bar, ${hi.cat}`], ['출구 NH₃ y', `${fmt(hi.y * 100, 2)} %`]], unit: '%', exp: xi * 100, tol: 1.0,
      sol: `ξ = 4y/(2+2y) = ${fmt(xi * 100, 1)} %. 한 번 지나갈 때 반응물의 대부분은 그대로 나옵니다.` },
    { k: 'a2', type: 'num', title: '2. 필요한 순환비', body: '위 전환율로 NH₃를 빼낸 뒤 나머지를 전부 되돌리면, 새로 넣는 가스 1 kmol당 반응기로는 몇 kmol이 돌아야 합니까. 순환 가스량(재순환/신규 공급)을 구하세요. 퍼지는 무시합니다. (힌트: 정상상태에서 반응기에 들어가는 총량 G에 대해 소비량 = 신규 공급량)',
      data: [['한 번 통과 전환율', `${fmt(xi * 100, 1)} %`]], unit: 'kmol/kmol', exp: 1 / xi - 1, tol: 0.04, rel: true,
      sol: `반응기 입구 G = F/ξ 이므로 재순환/F = 1/ξ − 1 = ${fmt(1 / xi - 1, 2)}. 전환율이 낮을수록 순환비가 급격히 커지고, 압축 동력이 그만큼 든다.` },
    { k: 'a3', type: 'num', title: '3. 오스뮴 촉매의 최적 온도', body: '200 bar, 공간 속도 10000 h⁻¹, 오스뮴 촉매에서 출구 암모니아가 가장 높은 온도를 ±30 °C 안으로 찾으세요. 같은 조건으로 온도를 훑어 보면 됩니다.',
      data: [], unit: '°C', exp: Topt, tol: 30,
      sol: `이 조건의 최댓값은 약 ${Topt} °C(${fmt(ymax * 100, 1)} %)에서 나옵니다. 이보다 낮으면 반응이 느려 평형에 못 닿고, 높으면 평형 한계 자체가 내려갑니다.` },
    { k: 'a4', type: 'mc', title: '4. 왜 평형이 가장 높은 가장 낮은 온도에서 돌리지 않는가', body: '가장 알맞은 이유를 고르세요.',
      opts: [['a', '낮은 온도에서는 촉매 위의 반응이 너무 느려서, 실제 출구가 평형에 한참 못 미친다'], ['b', '낮은 온도에서는 평형 NH₃ 농도가 더 낮아지기 때문이다'], ['c', '낮은 온도에서는 암모니아가 분해되기 때문이다']], ans: 'a',
      sol: '평형 농도는 저온일수록 높지만, 속도는 지수적으로 느려진다. 실제 출구는 "평형 한계"와 "속도 한계" 중 작은 쪽을 따른다.' },
    { k: 'a5', type: 'mc', title: '5. 왜 NH₃를 만든 즉시 가스에서 빼는가', body: '순환 루프에서 반응기 뒤에 냉각 분리기를 두는 이유로 가장 알맞은 것은?',
      opts: [['a', 'NH₃가 가스 속에 많이 남아 있으면 평형 한계에 가까워져 정반응이 느려지고 전환이 막히기 때문이다'], ['b', 'NH₃는 촉매를 영구히 파괴하기 때문이다'], ['c', '냉각하면 N₂가 응축되기 때문이다']], ans: 'a',
      sol: '액화하기 쉬운 NH₃는 냉각(고압이면 비교적 높은 온도에서도 가능)으로 빼내고, 나머지 가스는 NH₃가 거의 없는 상태로 반응기에 돌려보낸다. 이것이 순환 합성의 핵심이다.' },
  ];
  ctx.el.appendChild(runQuiz(ctx, qs, { scoreKey: 'analysis', weight: 25, label: '정량 해석', intro: '당신의 측정과 모델로 계산합니다. 정답은 기록에 따라 달라집니다.' }));
  ctx.fly('bench');
}

/* ================= 5. 용기 재료 ================= */
function stepVessel(ctx) {
  const H = hab(ctx), api = ctx.scene.api, st = ctx.state;
  st.sel ??= 'carbon';
  const root = h('div', { class: 'stack' }), out = h('div', { class: 'stack' }), chartBox = h('div');
  const pH2 = () => (H.P * 0.6) / 10;                                         // MPa, 반응기 입구 H₂ 약 60%로 가정
  const paintChart = () => {
    chartBox.innerHTML = '';
    const mk = (id, c) => { const v = C.vesselCheck(id, { P: H.P, pH2Bar: pH2() * 10, Tgas: H.Tgas }); return { x: pH2(), y: v.Twall, color: c, label: id === st.sel ? '벽' : '', fill: id === st.sel ? c : 'none', r: id === st.sel ? 6 : 3 }; };
    const sel = C.vesselCheck(st.sel, { P: H.P, pH2Bar: pH2() * 10, Tgas: H.Tgas });
    const curve = (f) => { const p = []; for (let x = 0.5; x <= 20; x += 0.5) p.push([x, f(x)]); return p; };
    chartBox.append(lineChart({ w: 400, h: 220, x: { min: 0, max: 20, ticks: 5, label: '수소 분압 (MPa)' }, y: { min: 100, max: 550, ticks: 5, label: '온도 (°C)' },
      series: [{ pts: curve(C.nelsonCS), color: '#d4624a', width: 2.2 }, { pts: curve(C.nelsonCrMo), color: '#7b8b99', dash: '5 4', width: 1.6 }],
      marks: [{ x: pH2(), y: sel.Twall, color: sel.ok ? '#6fbf8b' : '#e0715c', fill: sel.ok ? '#6fbf8b' : '#e0715c', label: '벽 온도' }], title: '수소 침해 한계 곡선' }),
      legend([{ color: '#d4624a', label: '탄소강의 수소 침해 한계' }, { color: '#7b8b99', label: 'Cr–Mo 강 (1930년대~)' }]));
  };
  const render = () => {
    out.innerHTML = '';
    const opts = Object.values(C.VESSELS).map((v) => ({ value: v.id, label: `${v.name}`, desc: `${v.year} · 정격 ${v.rating} bar. ${v.desc}`, disabled: H.rules && v.id === 'crmo' }));
    if (!opts.find((o) => o.value === st.sel && !o.disabled)) st.sel = 'carbon';
    const ch = choice({ options: opts, value: st.sel, name: '용기 구조', onChange: (v) => { st.sel = v; paintChart(); } });
    const rules = h('button', { class: 'btn sm' + (H.rules ? ' primary' : ''), onclick: () => { H.rules = !H.rules; render(); } }, H.rules ? '1913년 규칙: 켜짐' : '1913년 규칙: 꺼짐 (후대 기술 허용)');
    const sP = slider({ label: '설계 압력', unit: 'bar', min: 100, max: 350, step: 10, value: H.P, onInput: (v) => { H.P = v; paintChart(); } });
    const sT = slider({ label: '촉매층 최고 가스 온도', unit: '°C', min: 400, max: 560, step: 10, value: H.Tgas, onInput: (v) => { H.Tgas = v; paintChart(); } });
    const run = h('button', { class: 'btn primary', onclick: () => {
      const v = C.vesselCheck(st.sel, { P: H.P, pH2Bar: pH2() * 10, Tgas: H.Tgas });
      if (v.ok) {
        H.vessel = st.sel; api.setAlert(false); toast('이 구조는 이 조건을 견딥니다'); nbadd(ctx, 'vessel', '채택한 용기', C.VESSELS[st.sel].name, '', 0);
        ctx.score('vessel', Math.max(0, 1 - 0.2 * H.vFails), 10, '용기 재료'); ctx.ready(true);
        res.innerHTML = ''; res.appendChild(callout('good', h('b', {}, '통과. '), `벽 온도 ${fmt(v.Twall, 0)} °C ≤ 한계 ${fmt(v.Tlim, 0)} °C, 설계압 ${H.P} bar ≤ 정격 ${C.VESSELS[st.sel].rating} bar. 라이너 구조는 압력을 맡는 외피를 식혀 두는 방식으로 이 문제를 피합니다.`));
      } else {
        H.vFails++; api.setAlert(true); setTimeout(() => api.setAlert(false), 2400); toast('용기 파손');
        res.innerHTML = ''; res.appendChild(callout('bad', h('b', {}, `약 ${v.hoursToFail === Infinity ? '—' : fmt(v.hoursToFail, 0)}시간 뒤 파손. `), v.reasons.join(' · '), h('br'), h('span', { class: 'sub' }, '고압 수소가 강철 속 탄소와 반응해 취성이 생기는 수소 침해입니다. 벽 온도가 한계 곡선 위로 올라가면 진행됩니다.')));
        ctx.ready(!!H.vessel);
      }
      paintChart();
    } }, '이 조건으로 시험 가동');
    const res = h('div');
    out.append(h('div', { class: 'row' }, rules), sP, sT, ch, run, res, chartBox);
    paintChart();
    if (!H.vessel) ctx.ready(false, '조건을 견디는 구조를 찾으세요');
    else ctx.ready(true);
  };
  root.append(callout('', h('b', {}, '보슈의 문제. '), '반응기의 벽이 수소에 상하면 공장이 서지 않을 뿐 아니라 고압 가스가 새어 사람이 다칩니다. 압력과 온도를 정한 뒤 어떤 구조가 견디는지 시험합니다. 벽 온도는 구조에 따라 가스 온도와 크게 다를 수 있습니다.'), out);
  ctx.el.appendChild(root);
  ctx.fly('reactor'); api.setBeds([440, 500, 470]); api.setPressure(H.P); api.setFlow(0.6);
  render();
}

/* ================= 6. 루프 설계 ================= */
const SHAPES = { even: ['균등', (n) => Array(n).fill(1)], grow: ['뒤로 갈수록 크게', (n) => Array.from({ length: n }, (_, i) => i + 1)], small: ['첫 층만 작게', (n) => Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 3))] };
const BASELINE = { n: 3, Tin: [380, 400, 380, 360], shape: 'small', P: 250, V: 6, F: 190, purge: 3, Tsep: -10, cat: 'feK', purif: 'wash' };
function stepLoop(ctx) {
  const H = hab(ctx), api = ctx.scene.api, st = ctx.state;
  H.d ||= { n: 3, Tin: [400, 420, 400, 380], shape: 'even', P: H.P || 200, V: 4, F: 150, purge: 2, Tsep: 10, cat: 'fe', purif: 'none' };
  const d = H.d;
  const root = h('div', { class: 'stack' }), ctl = h('div', { class: 'stack' }), out = h('div', { class: 'stack' });

  const solve = () => C.solveLoop({ P: d.P, Tin: d.Tin.slice(0, d.n), V: d.V, F: d.F, yI: 0.015, purge: d.purge / 100, TsepC: d.Tsep, cat: d.cat, purif: d.purif, split: SHAPES[d.shape][1](d.n) });
  const judge = (r) => {
    const cat = C.CATALYSTS[d.cat], Tmax = r.Tmax - 273.15;
    const v = H.vessel ? C.vesselCheck(H.vessel, { P: d.P, pH2Bar: d.P * r.yIn.H2, Tgas: Tmax }) : { ok: false, reasons: ['용기를 먼저 고르세요'] };
    return [
      { id: 'tpd', w: 3, ok: r.tpd >= 30, label: '생산량 ≥ 30 t/d', val: `${fmt(r.tpd, 1)} t/d`, hint: r.act < 0.2 ? '촉매 활성이 지나치게 낮습니다. 원료 가스의 CO·황 화합물이 촉매를 독화시킵니다. 정제를 고려하세요.' : '신규 공급량·촉매량·압력을 키우거나, 층 입구 온도를 조정해 보세요.' },
      { id: 'T', w: 3, ok: Tmax <= cat.Tmax, label: `촉매 최고온도 ≤ ${cat.Tmax} °C`, val: `${fmt(Tmax, 0)} °C`, hint: '층 입구 온도를 낮추거나 단 수를 늘려 발열을 나누세요. 앞 층에 촉매를 적게 두면 온도 상승이 줄어듭니다.' },
      { id: 'v', w: 3, ok: v.ok, label: '용기 안전', val: v.ok ? '통과' : v.reasons[0], hint: '설계압이 용기 정격을 넘거나 벽 온도가 한계를 넘었습니다. 압력을 낮추거나 이전 단계에서 다른 구조를 고르세요.' },
      { id: 'I', w: 1, ok: r.inertIn <= 0.14, label: '순환 가스 불활성 ≤ 14 %', val: `${fmt(r.inertIn * 100, 1)} %`, hint: '불활성 기체(Ar, CH₄)가 쌓여 분압을 깎고 있습니다. 퍼지율을 높이세요. 대신 반응물도 같이 버려집니다.' },
    ];
  };
  const energyScore = (r) => clamp((4.6 - r.GJperT) / 1.4, 0, 1);

  const paintOut = () => {
    const r = solve();
    if (!r.converged) { out.innerHTML = ''; out.appendChild(callout('bad', '순환 계산이 수렴하지 않았습니다. 조건을 조금 바꿔 보세요.')); return; }
    const J = judge(r);
    out.innerHTML = '';
    J.forEach((j) => out.appendChild(kv(j.label, j.val, '', j.ok ? 'good' : 'bad')));
    out.appendChild(h('div', {}, kv('루프 동력 (압축·냉동)', fmt(r.GJperT, 2), 'GJ/t NH₃'), kv('한 번 통과 N₂ 전환', fmt(r.perPassN2 * 100, 1), '%'), kv('순환비 (재순환/신규)', fmt(r.recycleRatio, 1)), kv('반응기 입구 NH₃', fmt(r.yIn.NH3 * 100, 2), '%')));
    // x–T 선도
    const eq = [];
    for (let T = 340; T <= 620; T += 5) { const y = C.eqNH3Fraction(T + 273.15, d.P) * 100; if (y <= 40) eq.push([y, T]); }
    const path = [];
    r.rx.beds.forEach((b) => b.profile.forEach((p, i) => { if (i % 3 === 0 || i === b.profile.length - 1) path.push([p.y * 100, p.T - 273.15]); }));
    const lim = C.CATALYSTS[d.cat].Tmax;
    out.appendChild(lineChart({ w: 400, h: 230, x: { min: 0, max: 40, ticks: 8, label: 'NH₃ 몰분율 (%)' }, y: { min: 340, max: 620, ticks: 7, label: '온도 (°C)' },
      series: [{ pts: eq, color: '#8a98a6', dash: '5 4', width: 1.5 }, { pts: path, color: 'var(--accent)', width: 2.2 }],
      hlines: [{ y: lim, color: '#e0715c', label: '촉매 한계' }], title: '온도–NH₃ 농도 선도' }),
      legend([{ color: '#8a98a6', label: '평형 곡선' }, { color: 'var(--accent)', label: '가스 상태의 경로 (층마다 오르고, 층 사이에서 식음)' }]));
    const bad = J.filter((j) => !j.ok);
    if (bad.length) out.appendChild(callout('warn', h('b', {}, '고칠 곳. '), bad.map((j) => j.hint).join(' ')));
    const allOk = J.every((j) => j.ok);
    out.appendChild(h('button', { class: 'btn primary', disabled: !allOk, onclick: () => submit(r, J) }, allOk ? '설계 확정' : '모든 조건을 만족해야 확정할 수 있습니다'));
    // 장면 반영
    api.setBeds(r.rx.beds.map((b) => b.Tout - 273.15)); api.setPressure(d.P); api.setFlare(clamp(d.purge / 6, 0, 1)); api.setSeparator({ frost: clamp((10 - d.Tsep) / 30, 0, 1), liquid: clamp(r.tpd / 50, 0.1, 1) }); api.setFlow(clamp(0.3 + d.F / 300, 0.3, 1)); api.setAlert(!allOk && !J[2].ok);
    H.last = { r, J };
  };
  const submit = (r, J) => {
    H.attempts++;
    const base = J.reduce((a, j) => a + (j.ok ? j.w : 0), 0) / J.reduce((a, j) => a + j.w, 0);
    const score = clamp(base * (0.7 + 0.3 * energyScore(r)) - (H.hint ? 0.15 : 0), 0, 1);
    ctx.score('loop', score, 35, '합성 루프 설계');
    nbadd(ctx, 'design', '확정 설계', `${d.P} bar · ${fmt(r.tpd, 1)} t/d · ${fmt(r.GJperT, 2)} GJ/t`, '', 0);
    ctx.state.submitted = true; ctx.ready(true, '설계가 확정되었습니다'); toast('설계 확정');
  };

  const buildCtl = () => {
    ctl.innerHTML = '';
    const lastCat = d.cat;
    const bump = () => paintOut();
    const sP = slider({ label: '운전 압력', unit: 'bar', min: 100, max: 350, step: 10, value: d.P, onInput: (v) => { d.P = v; bump(); } });
    const sV = slider({ label: '촉매 총량', unit: 'm³', min: 2, max: 12, step: 0.5, value: d.V, digits: 1, onInput: (v) => { d.V = v; bump(); } });
    const sF = slider({ label: '신규 공급 가스', unit: 'kmol/h', min: 100, max: 260, step: 5, value: d.F, onInput: (v) => { d.F = v; bump(); } });
    const sG = slider({ label: '퍼지 (순환 가스 중 버리는 비율)', unit: '%', min: 0.5, max: 8, step: 0.5, value: d.purge, digits: 1, onInput: (v) => { d.purge = v; bump(); }, note: '신규 공급 가스에는 불활성 기체가 1.5% 섞여 있다.' });
    const sS = slider({ label: '분리기 온도', unit: '°C', min: -20, max: 30, step: 5, value: d.Tsep, onInput: (v) => { d.Tsep = v; bump(); }, note: '낮을수록 NH₃가 더 많이 액화하지만 냉동 동력이 든다.' });
    const nCh = choice({ options: [2, 3, 4].map((n) => ({ value: n, label: `촉매층 ${n}단` })), value: d.n, name: '단 수', onChange: (v) => { d.n = v; buildCtl(); bump(); } });
    const shCh = choice({ options: Object.entries(SHAPES).map(([k, v]) => ({ value: k, label: `촉매 분배: ${v[0]}`, desc: v[1](d.n).join(' : ') })), value: d.shape, name: '촉매 분배', onChange: (v) => { d.shape = v; bump(); } });
    const tins = Array.from({ length: d.n }, (_, i) => slider({ label: `${i + 1}단 입구 온도`, unit: '°C', min: 300, max: 480, step: 5, value: d.Tin[i], onInput: (v) => { d.Tin[i] = v; bump(); } }));
    const catCh = choice({ options: CATS.map((c) => (c.value === 'os' ? { ...c, disabled: true, desc: '공장 규모에서 필요한 양을 구할 수 없다 (실험대에서만 가능)' } : c)), value: d.cat, name: '촉매', onChange: (v) => { d.cat = v; bump(); } });
    const purOpts = Object.values(C.PURIFICATION).map((p) => ({ value: p.id, label: p.name, desc: p.note, disabled: H.rules && p.id === 'meth' }));
    const purCh = choice({ options: purOpts, value: d.purif, name: '원료 가스 정제', onChange: (v) => { d.purif = v; bump(); } });
    const rules = h('button', { class: 'btn sm' + (H.rules ? ' primary' : ''), onclick: () => { H.rules = !H.rules; if (H.rules && d.purif === 'meth') d.purif = 'wash'; buildCtl(); paintOut(); } }, H.rules ? '1913년 규칙: 켜짐' : '1913년 규칙: 꺼짐 (후대 기술 허용)');
    const base = h('button', { class: 'btn sm ghost', onclick: () => {
      Object.assign(d, JSON.parse(JSON.stringify(BASELINE))); H.hint = true; toast('추천 출발점을 불러왔습니다 (점수 15% 감점)'); buildCtl(); paintOut();
    } }, '추천 출발점 불러오기 (감점)');
    ctl.append(
      h('div', { class: 'row' }, rules, base),
      h('p', { class: 'sub' }, `채택한 용기: ${H.vessel ? C.VESSELS[H.vessel].name : '없음'}`),
      sec('반응기'), sP, sV, nCh, shCh, ...tins, catCh, purCh,
      sec('순환 루프'), sF, sG, sS);
  };
  root.append(callout('', h('b', {}, '합성 루프 설계. '), '모든 제약을 동시에 만족하는 조건을 찾습니다. 한 값을 바꾸면 다른 값이 움직입니다. 오른쪽 장면의 촉매층 색은 층의 최고 온도를 보여 줍니다.'), ctl, out);
  ctx.el.appendChild(root);
  ctx.fly('overview');
  buildCtl(); paintOut();
  if (ctx.state.submitted) ctx.ready(true); else ctx.ready(false, '모든 조건을 만족하고 확정하세요');
}

/* ================= 7. 근거 ================= */
function stepWhy(ctx) {
  const qs = [
    { k: 'w1', type: 'mc', title: '1. 촉매층 사이에서 가스를 식히는 이유', body: '단열 촉매층에서는 반응열로 온도가 오릅니다. 층 사이에서 냉각하는 가장 알맞은 이유는?',
      opts: [['a', '온도가 올라 평형에 닿으면 더는 전환할 수 없으므로, 식혀서 평형에서 다시 멀어지게 해 반응을 이어 가기 위해'], ['b', '압력을 낮추기 위해'], ['c', '촉매를 재생하기 위해']], ans: 'a', sol: 'x–T 선도에서 반응 경로가 평형 곡선에 닿으면 그 층은 끝난다. 식히면 같은 농도에서 평형이 더 위에 있게 되어 다음 층이 다시 진행할 수 있다.' },
    { k: 'w2', type: 'mc', title: '2. 퍼지를 두는 이유', body: '퍼지는 암모니아와 반응물을 일부 버리는 일입니다. 그래도 하는 이유는?',
      opts: [['a', '반응하지 않는 불활성 기체가 루프에 쌓여 분압을 깎고 속도를 떨어뜨리므로, 일부를 내보내 농도를 일정하게 유지하기 위해'], ['b', 'NH₃를 안전하게 태우기 위해'], ['c', '압력이 너무 오르는 것을 막기 위해']], ans: 'a', sol: '순환 루프에서 반응하지 않는 물질은 나가는 길이 퍼지뿐이다. 정상상태에서 불활성 기체의 유입량과 퍼지 유출량이 같아야 한다. 퍼지를 늘리면 반응물 손실이 늘고, 줄이면 불활성 농도가 오른다.' },
    { k: 'w3', type: 'mc', title: '3. 압력을 더 올리면 안 되는가', body: '압력을 올리면 평형이 유리해집니다. 그런데도 무한정 올리지 않는 이유로 가장 알맞은 것은?',
      opts: [['a', '압축 동력과 용기 비용이 급격히 늘고, 수소 분압이 올라 수소 침해 조건도 나빠지기 때문이다'], ['b', '압력이 높을수록 평형 NH₃가 줄기 때문이다'], ['c', '압력은 반응 속도에 영향을 주지 않기 때문이다']], ans: 'a', sol: '고압은 평형과 속도 모두를 돕지만, 압축 에너지와 장비 두께·정격, 수소 분압에 의한 재료 한계가 함께 올라간다. 최적 압력은 이 비용들의 합이 가장 작은 곳이다.' },
  ];
  ctx.el.appendChild(runQuiz(ctx, qs, { scoreKey: 'why', weight: 15, label: '설계 근거', intro: '확정한 설계가 왜 그렇게 타협되어야 했는지를 정리합니다.' }));
  const d = hab(ctx).last;
  if (d) ctx.el.appendChild(h('div', { style: { marginTop: '12px' } }, kv('확정한 설계의 생산량', fmt(d.r.tpd, 1), 't/d'), kv('최고 온도', fmt(d.r.Tmax - 273.15, 0), '°C')));
  ctx.fly('loop');
}

/* ================= 8. 사건 해설 ================= */
function stepDebrief(ctx) {
  const res = (ctx.state.res ||= ctx.finish());
  const wrap = h('div', { class: 'stack' });
  wrap.appendChild(h('div', { class: 'score-ring' }, h('div', { class: 'ring', style: { '--p': res.total } }, h('b', {}, res.total)), h('div', {}, h('div', { style: { fontFamily: 'var(--serif)', fontSize: '20px' } }, res.rank), h('div', { class: 'sub' }, '단계별 점수의 가중 평균'))));
  res.items.forEach((s) => wrap.appendChild(h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, s.label), h('span', { class: 'sub' }, Math.round(s.value * 100) + '점')), h('div', { class: 'bar' }, h('i', { style: { width: s.value * 100 + '%' } })))));
  const H = hab(ctx);
  if (!H.rules) wrap.appendChild(callout('warn', '1913년 규칙을 끄고 후대 기술을 허용했습니다. 이 설계는 당시에는 만들 수 없었습니다.'));
  wrap.appendChild(sec('실제 역사는 어떻게 흘렀나'));
  wrap.appendChild(h('ul', { class: 'timeline' },
    ...[['1898', '크룩스: 고정 질소 부족이 곧 닥칠 식량 문제라고 경고한다.'],
      ['1905–07', '하버와 네른스트의 평형 수치 논쟁. 고압의 필요성이 분명해진다.'],
      ['1909', '하버: 고압 순환 탁상 장치 시연. BASF가 사업화를 추진한다.'],
      ['1910–12', '미타슈 팀의 촉매 탐색, 보슈의 고압 반응기와 라이너 구조.'],
      ['1913', '오파우 공장 가동.'],
      ['1918 · 1931', '하버가 노벨 화학상(1918), 보슈와 베르기우스가 노벨 화학상(1931)을 받는다.'],
      ['1921', '오파우의 비료 저장 설비에서 폭발이 일어나 수백 명이 죽는다.']].map(([y, t]) => h('li', {}, h('b', {}, y), t))));
  wrap.appendChild(sec('화학공학과 이어지는 곳'));
  wrap.appendChild(callout('', h('b', {}, '순환, 퍼지, 평형 한계, 재료. '), '한 번 통과 전환율이 낮은 반응도 분리와 순환으로 총 전환을 높일 수 있고, 그 대가로 순환 동력과 불활성 축적이 생깁니다. 이 구조는 오늘날 화학 공정 설계의 기본 문제와 같습니다. 라부아지에 사건에서 배운 질량수지가 이 루프의 장부가 됩니다.'));
  wrap.appendChild(sec('빠뜨리면 안 되는 이야기'));
  wrap.appendChild(h('ul', { class: 'sub', style: { paddingLeft: '18px', margin: 0 } },
    h('li', {}, '이 공정으로 만든 질소 비료는 오늘날 인류 식량의 상당 부분을 떠받친다는 추정이 널리 인용된다. 같은 기술은 폭약 원료이기도 했고, 1차 세계대전 때 독일의 화약 공급에 쓰였다.'),
    h('li', {}, '하버는 같은 전쟁에서 독가스 개발을 이끌었다. 노벨상 수상 자체를 두고도 당시부터 논란이 있었다.'),
    h('li', {}, '이 게임의 모델은 이상기체와 조정한 속도식에 기반한 교육용이며, 수치(30 t/d 등)는 실제 오파우의 값이 아니다.')));
  wrap.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', onclick: () => ctx.exit() }, '사건 목록으로'), h('button', { class: 'btn', onclick: () => ctx.restart() }, '다시 조사하기')));
  ctx.el.appendChild(wrap);
  ctx.fly('overview');
}

export default {
  id: 'haber', no: '02', year: '1913', title: '공기에서 빵을',
  blurb: '평형은 저온을, 속도는 고온을 원한다. 1909년 탁상 실험에서 출발해 촉매, 고압 용기, 순환 루프를 설계해 하루 30톤의 암모니아를 만든다.',
  tags: [{ label: '반응공학', on: true }, { label: '화학평형', on: true }, { label: '재료', on: false }],
  accent: '#6cc0dd',
  viewButtons: [{ id: 'overview', label: '전체' }, { id: 'reactor', label: '반응기' }, { id: 'loop', label: '순환 루프' }, { id: 'bench', label: '1909 실험대' }],
  createScene(e) { return createHaberScene(e); },
  steps: [
    { id: 'file', label: '사건 기록', title: '사건 기록', sub: '자료를 모두 읽으세요', gate: '자료를 모두 읽으세요', view: 'overview', mount: stepDossier },
    { id: 'predict', label: '예측', title: '평형 예측', sub: '르샤틀리에 원리로 먼저 예상합니다', gate: '네 문항을 고르세요', view: 'overview', mount: stepPredict },
    { id: 'bench', label: '1909 실험', title: '1909년 실험대', sub: '조건을 바꿔 측정합니다', gate: '측정을 더 하세요', view: 'bench', mount: stepBench },
    { id: 'analysis', label: '해석', title: '정량 해석', sub: '내 측정으로 계산합니다', gate: '문항을 풀어 주세요', view: 'bench', mount: stepAnalysis },
    { id: 'vessel', label: '용기', title: '용기 재료', sub: '고압 수소를 견디는 구조', gate: '조건을 견디는 구조를 찾으세요', view: 'reactor', mount: stepVessel },
    { id: 'loop', label: '루프 설계', title: '합성 루프 설계', sub: '제약을 모두 만족하는 조건', gate: '모든 조건을 만족하고 확정하세요', view: 'overview', mount: stepLoop },
    { id: 'why', label: '근거', title: '설계 근거', sub: '타협의 이유를 정리합니다', gate: '문항을 풀어 주세요', view: 'loop', mount: stepWhy },
    { id: 'debrief', label: '사건 해설', title: '사건 해설', sub: '결과와 실제 역사', view: 'overview', mount: stepDebrief },
  ],
};
