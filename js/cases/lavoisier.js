// 사건 01 · 연소의 저울 (파리, 1772–1777)
import { h, fmt, slider, choice, tabs, kv, lineChart, legend, modal, toast } from '../ui.js';
import * as L from '../sim/lavoisier.js';
import { createLavoisierScene } from '../scenes/lavoisier.js';

const sim = (ctx) => (ctx.run.sim ||= L.makeRun(ctx.run.seed));
const K = (c) => c + 273.15;
const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

function paper(title, src, stampText, ...body) {
  return h('div', { class: 'paper' }, stampText ? h('span', { class: 'stamp ' + (stampText === '1차 기록' ? 'primary' : stampText === '2차 자료' ? 'secondary' : 'recon') }, stampText) : null,
    h('h4', {}, title), h('div', { class: 'src' }, src), ...body.map((b) => (typeof b === 'string' ? h('p', {}, b) : b)));
}
const sec = (t) => h('h3', { class: 'sec' }, t);
const callout = (cls, ...c) => h('div', { class: 'callout ' + cls }, ...c);

/* ================= 1. 사건 기록 ================= */
function stepDossier(ctx) {
  const docs = [
    ['사건 개요', paper('타는 것은 무엇을 잃는가', '파리 · 1772–1777 · 조사 의뢰서', '재구성',
      '18세기 화학자들에게 연소는 풀리지 않는 문제였다. 나무는 타고 나면 가벼워진다. 그런데 금속을 달구면 광택을 잃고 부서지기 쉬운 재(칼크스)가 되는데, 이 재는 처음의 금속보다 무겁다. 같은 불인데 저울은 정반대를 가리킨다.',
      '1772년 11월 앙투안 라부아지에(1743–1794)는 인과 황을 태웠을 때도 무게가 늘어난다는 결과를 얻고, 이를 봉인한 메모로 아카데미에 맡겼다. 이 메모는 가설이었을 뿐 증명이 아니었다. 증명은 이후 몇 해에 걸친 정량 실험으로 이루어졌다.',
      '당신의 임무는 같은 질문에 자료로 답하는 것이다. 늘어난 무게는 어디서 왔는가. 이 질문에 답하려면 용기를 열고 닫는 순서, 저울 읽는 시점, 기체 부피의 보정까지 하나하나 따져야 한다.')],
    ['두 가설', paper('같은 현상, 두 설명', '당시 학계의 두 입장 요약', '2차 자료',
      h('p', {}, h('b', {}, '플로지스톤설'), ' (슈탈 등, 17세기 말~). 타는 물질은 플로지스톤이라는 성분을 품고 있고, 탈 때 이것이 빠져나간다. 금속은 칼크스에 플로지스톤이 합쳐진 것이다. 숯은 거의 재를 남기지 않으므로 플로지스톤이 많은 물질이다. 칼크스를 숯과 함께 달구면 플로지스톤이 되돌아와 금속이 된다. 무게가 늘어나는 문제에는 플로지스톤이 가볍거나 음의 무게를 갖는다는 식의 보조가설이 붙었다.'),
      h('p', {}, h('b', {}, '공기결합설'), ' (레이 1630, 이후 라부아지에). 금속이 달궈질 때 공기의 한 부분과 결합해 칼크스가 된다. 그렇다면 늘어난 무게는 결합한 기체의 무게여야 한다.'),
      callout('warn', h('b', {}, '가설을 가르는 법. '), '두 설명은 같은 현상을 설명할 수 있다. 한쪽만 틀리게 만드는 측정, 즉 두 가설의 예측이 갈리는 측정을 찾아야 한다.'))],
    ['이전 관찰', paper('라부아지에 이전의 기록', '요약 · 원문의 문장이 아님', '2차 자료',
      h('p', {}, h('b', {}, '레이 (1630). '), '주석과 납을 가열하면 무게가 늘어난다고 기록했다. 공기가 가열로 무겁고 끈적해져 금속에 달라붙은 것이라고 설명했다.'),
      h('p', {}, h('b', {}, '보일 (1673). '), '금속을 밀폐한 유리 용기에서 가열한 뒤 목을 열어 무게를 쟀고, 증가한 무게는 불의 입자가 유리를 뚫고 들어와 붙은 것이라고 해석했다. 라부아지에는 훗날 이 비교가 용기를 연 뒤에 이루어졌다는 점을 짚었다.'),
      h('p', {}, h('b', {}, '라부아지에 (1772). '), '인과 황이 연소할 때 무게가 늘어나며, 이때 많은 양의 공기가 고정된다고 보았다.'))],
    ['도구와 한계', paper('실험대 위의 도구', '이 시뮬레이션의 가정', '재구성',
      h('p', {}, h('b', {}, '천칭. '), '라부아지에의 정밀 천칭은 당대 최고 수준이었다. 이 시뮬레이션에서는 읽기 오차를 0.01 g으로 둔다. 뜨거운 물체를 달면 위로 오르는 기류와 부력 때문에 실제보다 가볍게 읽힌다.'),
      h('p', {}, h('b', {}, '수은 트로프와 종. '), '기체를 수은 위에 가둬 부피를 읽는다. 기체의 부피는 온도와 압력에 따라 변하므로, 두 시점을 비교하려면 같은 조건으로 환산해야 한다. 종 안의 수은면이 바깥보다 높으면 안쪽 기체 압력은 그만큼 낮다.'),
      h('p', {}, h('b', {}, '안전. '), '수은과 수은 화합물은 독성이 있다. 이 실험은 오늘날의 실험실에서 하지 않는다. 여기서는 수치와 절차만 재구성했다.'))],
  ];
  const wrap = h('div'), view = h('div');
  const tb = tabs(docs.map((d) => d[0]), (i) => { view.innerHTML = ''; view.appendChild(docs[i][1]); check(); });
  const check = () => { if (ctx.state.read || tb.api.seen().size >= docs.length) { ctx.state.read = true; ctx.ready(true); } else ctx.ready(false, `자료 ${docs.length - tb.api.seen().size}개를 더 읽어 주세요`); };
  view.appendChild(docs[0][1]);
  wrap.append(tb, view);
  ctx.el.appendChild(wrap);
  check();
}

/* ================= 2. 증거 분류 ================= */
const CARDS = [
  { id: 'A', t: '열린 용기에서 금속을 달군 칼크스는 처음 금속보다 무겁다.', a: 'none',
    why: '사건의 출발점이다. 플로지스톤설도 "플로지스톤은 가볍다"는 보조가설을 붙여 받아들일 수 있어서, 이 사실만으로는 가설이 갈리지 않는다.' },
  { id: 'B', t: '밀폐한 용기를 가열한 뒤 식혀 용기째 달면 가열 전과 무게가 같다.', a: 'none',
    why: '물질이 용기 밖으로 드나들지 않는 한 어느 가설에서도 총량은 그대로다. 보존의 확인일 뿐 가설을 가르지 못한다.' },
  { id: 'C', t: '밀폐 용기의 목을 깨뜨리면 공기가 들어오고, 그만큼 용기가 무거워진다.', a: 'air',
    why: '밀폐 안의 기체가 줄어 있었다는 직접 증거다. 금속이 공기의 일부를 붙잡았다는 공기결합설만 이것을 예측한다.' },
  { id: 'D', t: '밀폐 용기 안에서는 금속이 어느 정도까지만 칼크스가 되고 더 진행되지 않는다.', a: 'none',
    why: '플로지스톤설은 "공기가 플로지스톤으로 포화됐다"고, 공기결합설은 "반응할 성분이 소진됐다"고 설명한다. 둘 다 같은 예측을 한다.' },
  { id: 'E', t: '칼크스를 숯과 함께 가열하면 금속이 되돌아온다.', a: 'none',
    why: '플로지스톤설이 가장 자연스럽게 설명하던 사례다. 하지만 공기결합설도 숯이 칼크스에서 결합한 성분을 빼앗는 것으로 설명한다. 이때 생기는 기체를 추적하는 일이 관건이었다.' },
  { id: 'F', t: '수은의 붉은 재(HgO)는 숯 없이 가열만 해도 수은과 기체로 갈라진다.', a: 'air',
    why: '플로지스톤을 대 줄 물질이 없는데 금속이 돌아온다. 플로지스톤설은 "불이 공급한다"는 가정이 필요하다. 공기결합설은 결합했던 기체가 풀려난 것으로 곧바로 설명한다.' },
  { id: 'G', t: '인과 황을 태우면 생성물이 처음 물질보다 무겁다.', a: 'air',
    why: '탈 때 무언가가 빠져나간다면 가벼워져야 한다. 늘어난 무게는 공기와의 결합 쪽이 자연스럽다.' },
  { id: 'H', t: '숯은 타고 나면 재가 거의 남지 않는다.', a: 'phlo',
    why: '플로지스톤설 쪽이 더 자연스럽게 설명했다. 다만 이는 기체 생성물(이산화탄소)을 달지 못했기 때문이다. 열린 계에서는 나간 질량이 장부에서 사라진다. 닫힌 계로 재면 이 논거는 힘을 잃는다.' },
];
const CLS = [{ value: 'phlo', label: '플로지스톤설 쪽' }, { value: 'air', label: '공기결합설 쪽' }, { value: 'none', label: '가르지 못함' }];

function stepClassify(ctx) {
  const st = ctx.state; st.pick ||= {}; st.done ||= false;
  const root = h('div', { class: 'stack' });
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '관찰마다 어느 가설이 더 잘 예측했는지 고르세요. 두 가설이 똑같이 설명하면 "가르지 못함"입니다.'));
    CARDS.forEach((c) => {
      const pick = st.pick[c.id];
      const ok = st.done && pick === c.a;
      const box = h('div', { class: 'callout ' + (st.done ? (ok ? 'good' : 'bad') : '') });
      box.appendChild(h('div', { style: { marginBottom: '8px' } }, h('b', {}, c.id + '. '), c.t));
      const row = h('div', { class: 'row' });
      CLS.forEach((o) => row.appendChild(h('button', {
        class: 'btn sm' + (pick === o.value ? ' primary' : ''), disabled: st.done,
        onclick: () => { st.pick[c.id] = o.value; render(); },
      }, o.label)));
      box.appendChild(row);
      if (st.done) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, (ok ? '맞음. ' : `정답은 "${CLS.find((o) => o.value === c.a).label}". `) + c.why));
      root.appendChild(box);
    });
    const n = Object.keys(st.pick).length;
    if (!st.done) {
      root.appendChild(h('button', { class: 'btn primary', disabled: n < CARDS.length, onclick: () => {
        st.done = true;
        const right = CARDS.filter((c) => st.pick[c.id] === c.a).length;
        ctx.score('classify', right / CARDS.length, 15, '증거 분류');
        ctx.notebook.add({ tag: 'classify', label: '증거 분류 정답', value: `${right} / ${CARDS.length}` });
        ctx.ready(true); render();
      } }, n < CARDS.length ? `분류 확인 (${n}/${CARDS.length})` : '분류 확인'));
      ctx.ready(false, '모든 관찰을 분류하세요');
    } else {
      const right = CARDS.filter((c) => st.pick[c.id] === c.a).length;
      root.appendChild(callout('', h('b', {}, `${right}/${CARDS.length}개 일치. `), '가설을 가르는 관찰은 C, F, G뿐이었다. 대부분의 "그럴듯한 증거"는 두 가설이 똑같이 설명한다. 다음 단계에서 이 구분을 실험 설계에 쓴다.'));
      ctx.ready(true);
    }
  };
  render();
  ctx.el.appendChild(root);
}

/* ================= 3. 예측 ================= */
const EXPS = [
  { id: 'x1', q: '밀폐한 레토르트에서 주석을 가열하고 식힌 뒤, 용기째 단 무게는 가열 전과 비교해?', opts: ['늘어난다', '같다', '줄어든다'], phlo: '같다', air: '같다' },
  { id: 'x2', q: '그 식은 레토르트의 목을 깨뜨리는 순간 무엇이 일어나?', opts: ['공기가 들어온다', '변화 없다', '기체가 빠져나간다'], phlo: '변화 없다', air: '공기가 들어온다' },
  { id: 'x3', q: '목을 깨뜨린 직후 다시 달면, 깨뜨리기 전과 비교해?', opts: ['늘어난다', '같다', '줄어든다'], phlo: '같다', air: '늘어난다' },
];
function stepPredict(ctx) {
  const st = ctx.state; st.p ||= {}; st.done ||= false;
  const root = h('div', { class: 'stack' });
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '실험하기 전에 각 가설이 무엇을 예측하는지 적어 두세요. 두 가설 모두의 입장에서 답해야 합니다.'));
    const t = h('table', { class: 'data' }, h('tr', {}, h('th', {}, '측정'), h('th', {}, '플로지스톤설'), h('th', {}, '공기결합설')));
    EXPS.forEach((e) => {
      const cell = (k) => {
        const sel = h('select', { disabled: st.done, 'aria-label': `${e.q} (${k === 'phlo' ? '플로지스톤설' : '공기결합설'})`, onchange: (ev) => { st.p[e.id + k] = ev.target.value; render(); } },
          h('option', { value: '' }, '선택'), ...e.opts.map((o) => h('option', { value: o, selected: st.p[e.id + k] === o }, o)));
        const mark = st.done ? h('div', { class: 'sub', style: { color: st.p[e.id + k] === e[k] ? 'var(--good)' : 'var(--bad)' } }, st.p[e.id + k] === e[k] ? '일치' : `정답: ${e[k]}`) : null;
        return h('td', {}, sel, mark);
      };
      t.appendChild(h('tr', {}, h('td', { style: { width: '40%' } }, e.q), cell('phlo'), cell('air')));
    });
    root.appendChild(t);
    const n = Object.keys(st.p).filter((k) => st.p[k]).length;
    if (!st.done) {
      root.appendChild(h('button', { class: 'btn primary', disabled: n < EXPS.length * 2, onclick: () => {
        st.done = true;
        const right = EXPS.reduce((a, e) => a + (st.p[e.id + 'phlo'] === e.phlo) + (st.p[e.id + 'air'] === e.air), 0);
        ctx.score('predict', right / (EXPS.length * 2), 10, '가설별 예측');
        ctx.ready(true); render();
      } }, '예측 확정'));
      ctx.ready(false, '여섯 칸을 모두 채우세요');
    } else {
      root.appendChild(callout('good', h('b', {}, '갈리는 곳. '), '밀폐 상태의 총 무게(첫째 줄)는 두 가설 모두 "같다"고 예측한다. 목을 깨뜨릴 때의 반응(둘째, 셋째 줄)만 다르다. 그래서 이 실험의 핵심은 "열기 전에 먼저 단다"이다. 보일은 연 뒤의 무게로 비교했다.'));
      root.appendChild(callout('warn', h('b', {}, '수치 예측. '), '공기결합설이 맞다면 "들어온 공기의 무게"와 "금속이 늘어난 무게"가 같아야 할까. 실험대에서 재 보고 분석 단계에서 따져 봅니다.'));
      ctx.ready(true);
    }
  };
  render();
  ctx.el.appendChild(root);
}

/* ================= 4. 실험대 ================= */
const nb = (ctx, tag, label, value, unit, digits, note, flag) => ctx.notebook.add({ tag, label, value, unit, digits, note, flag });

function stepLab(ctx) {
  const S = sim(ctx), api = ctx.scene.api;
  const lab = (ctx.run.lab ||= {
    tab: 0, r: { stage: 0, bursts: 0, furnace: 2, hours: 12, hot: null },
    b: { readings: [], sel: 8 }, g: { minutes: 0, readings: [], done: false, m0: null },
  });
  if (!ctx.notebook.get('V')) {
    nb(ctx, 'V', '레토르트 부피', S.retort.V, 'L', 1);
    nb(ctx, 'T0', '실온', S.T0 - 273.15, '°C', 1);
    nb(ctx, 'P0', '대기압', S.P0mm, 'mmHg', 0);
  }
  const M0true = () => S.retort.vessel + S.retort.mSn + (S.P0 * S.retort.V / (L.R * S.T0)) * L.MW.air;
  const tilt = (m) => api.setTilt(clamp((m - lab.r.M0) * 0.35, -0.12, 0.12));
  const root = h('div', { class: 'stack' }), body = h('div', { class: 'stack' });
  const tb = tabs(['① 밀폐 레토르트', '② 수은 종', '③ 수은회'], (i) => { lab.tab = i; render(); }, lab.tab);
  root.append(tb, body);

  const gate = () => {
    const okR = lab.r.stage >= 8, okB = lab.b.readings.some((x) => x.days >= 6), okG = lab.g.done;
    const miss = [!okR && '①', !okB && '②', !okG && '③'].filter(Boolean);
    if (!miss.length) { ctx.score('lab', 1 - 0.25 * lab.r.bursts, 10, '실험 수행'); ctx.ready(true, '세 실험을 모두 마쳤습니다'); }
    else ctx.ready(false, `남은 실험: ${miss.join(' ')}`);
  };

  /* ---- ① ---- */
  function retort() {
    const r = lab.r, el = body;
    const act = (label, fn, cls = 'primary') => h('button', { class: 'btn ' + cls, onclick: () => { fn(); r.stage++; render(); } }, label);
    const log = [];
    if (r.mSn != null) log.push(['주석 질량', `${fmt(r.mSn, 2)} g`]);
    if (r.M0 != null) log.push(['봉인 후 전체 M0', `${fmt(r.M0, 2)} g`]);
    if (r.hot != null) log.push(['뜨거울 때 M', `${fmt(r.hot, 2)} g`]);
    if (r.M1 != null) log.push(['식은 뒤 M1', `${fmt(r.M1, 2)} g`]);
    if (r.dP != null) log.push(['내부 압력 감소', `${fmt(r.dP, 1)} mmHg`]);
    if (r.M2 != null) log.push(['개봉 후 M2', `${fmt(r.M2, 2)} g`]);
    if (r.mc != null) log.push(['내용물(주석+재)', `${fmt(r.mc, 2)} g`]);
    el.appendChild(callout('', h('b', {}, '밀폐 레토르트 실험. '), `부피 ${fmt(S.retort.V, 1)} L의 유리 레토르트에 주석을 넣고 목을 녹여 막은 채 가열한다. 중요한 것은 무엇을 어느 순서로 다는가이다.`));
    const stages = [
      ['주석 질량을 잰다', '저울에 올려 처음 질량을 기록합니다.', () => act('저울에 올리기', () => {
        r.mSn = L.readBalance(S, S.retort.mSn); nb(ctx, 'mSn', '주석 처음 질량', r.mSn, 'g', 2); ctx.fly('balance'); api.weigh(); api.setRetort({ calx: 0, tipBroken: false, hot: 0 }); api.setFurnace(0);
      })],
      ['봉인하고 용기째 단다', '주석을 넣고 목을 녹여 막은 뒤 용기째 달아 M0로 기록합니다.', () => act('봉인하고 달기', () => {
        r.M0true = M0true(); r.M0 = L.readBalance(S, r.M0true); nb(ctx, 'M0', '봉인 직후 전체 M0', r.M0, 'g', 2); api.weigh(); api.setTilt(0); api.setRetort({ tipBroken: false });
      })],
      ['가열한다', null, () => heatPanel()],
      ['식힌다', null, () => coolPanel()],
      ['식은 뒤 용기째 단다', '실온으로 돌아온 밀폐 레토르트의 무게 M1을 잰다. 목은 아직 막혀 있습니다.', () => act('M1 달기', () => {
        r.M1 = L.readBalance(S, r.M0true); nb(ctx, 'M1', '식은 뒤 전체 M1', r.M1, 'g', 2); ctx.fly('balance'); api.weigh(); tilt(r.M1);
      })],
      ['내부 압력을 본다', '수은 마노미터를 목에 연결해 안쪽 압력이 바깥보다 얼마나 낮아졌는지 읽습니다.', () => act('마노미터 읽기', () => {
        const h2 = L.retortHeat(S, r.furnace, r.hours); r.dP = Math.max(0, h2.dP_atm * L.MMHG + L.gauss(S.r) * S.noise.P); nb(ctx, 'dP', '내부 압력 감소 ΔP', r.dP, 'mmHg', 1, '용기를 열기 전');
      })],
      ['목을 깨뜨리고 단다', '목을 깨뜨리면 무슨 일이 일어나는지 보고, 곧바로 다시 달아 M2를 기록합니다.', () => act('깨뜨리고 달기', () => {
        const h2 = L.retortHeat(S, r.furnace, r.hours); r.M2 = L.readBalance(S, r.M0true + h2.gainAir); api.setRetort({ tipBroken: true }); toast('쉬익, 바깥 공기가 들어옵니다'); nb(ctx, 'M2', '개봉 직후 전체 M2', r.M2, 'g', 2); api.weigh(); tilt(r.M2);
      })],
      ['내용물을 단다', '주석과 재를 모두 꺼내 달아, 금속 쪽 질량이 얼마나 늘었는지 봅니다.', () => act('내용물 달기', () => {
        const h2 = L.retortHeat(S, r.furnace, r.hours); r.mc = L.readBalance(S, S.retort.mSn + h2.gainMetal); nb(ctx, 'mc', '내용물(주석+재) 질량', r.mc, 'g', 2); api.weigh();
      })],
    ];
    const cur = Math.min(r.stage, stages.length);
    if (r.stage >= stages.length) el.appendChild(callout('good', '실험 ①을 마쳤습니다. 분석 단계에서 이 기록들을 비교합니다.'));
    else {
      const [title, desc, mk] = stages[cur];
      el.appendChild(h('div', {}, h('b', {}, `${cur + 1}/${stages.length} · ${title}`), desc ? h('p', { class: 'sub', style: { margin: '4px 0 10px' } }, desc) : null));
      const node = mk(); el.appendChild(node);
    }
    if (log.length) el.appendChild(h('div', { style: { marginTop: '10px' } }, ...log.map(([a, b]) => kv(a, b))));
    if (r.bursts) el.appendChild(h('p', { class: 'sub', style: { color: 'var(--warn)' } }, `레토르트가 ${r.bursts}번 깨졌습니다.`));

    function stageNext() { r.stage++; gate(); }
    // 단계 진행: act()가 호출될 때마다 다음 단계로 (가열·식힘 제외, 해당 패널에서 처리)
    function heatPanel() {
      const wrap = h('div', { class: 'stack' });
      const F = L.FURNACE;
      const peakOf = (id) => L.peakAtm(S, F.find((f) => f.id === id).C);
      const pk = h('div'), hr = slider({ label: '가열 시간', unit: '시간', min: 2, max: 24, step: 1, value: r.hours, onInput: (v) => { r.hours = v; upd(); } });
      const ch = choice({ options: F.map((f) => ({ value: f.id, label: `${f.label} (${f.C} °C)`, desc: `밀폐 시 최고 압력 약 ${fmt(peakOf(f.id), 2)} atm` })), value: r.furnace, onChange: (v) => { r.furnace = v; upd(); }, name: '불의 세기' });
      function upd() {
        const hh = L.retortHeat(S, r.furnace, r.hours);
        pk.innerHTML = '';
        pk.append(kv('최고 압력', `${fmt(hh.peak, 2)} atm`, `(유리 한계 ${L.BURST_ATM} atm)`, hh.burst ? 'bad' : ''), h('p', { class: 'sub', style: { margin: '4px 0 0' } }, hh.burst ? '압력이 유리 한계를 넘습니다. 이 조건에서는 레토르트가 깨집니다.' : '한계 안입니다. 시간이 길수록 더 많이 반응합니다.'));
      }
      upd();
      wrap.append(ch, hr, pk, h('button', { class: 'btn primary', onclick: () => {
        const hh = L.retortHeat(S, r.furnace, r.hours);
        if (hh.burst) { r.bursts++; toast('레토르트가 깨졌습니다. 새 레토르트로 다시 봉인하세요'); r.stage = 1; api.setFurnace(0); api.setRetort({ calx: 0, hot: 0 }); render(); return; }
        api.setFurnace(hh.F.power); api.setRetort({ calx: clamp(hh.f / 0.6, 0, 1), hot: 1 }); ctx.fly('furnace', 1.6);
        nb(ctx, 'fire', '불 / 가열 시간', `${hh.F.C} °C · ${r.hours} h`, '', 0);
        stageNext(); render();
      } }, '가열 시작'));
      return wrap;
    }
    function coolPanel() {
      const wrap = h('div', { class: 'stack' });
      wrap.append(
        callout('warn', '레토르트가 아직 뜨겁습니다. 지금 달면 어떻게 읽힐까요. 해 봐도 됩니다. 잰 값은 실험 노트에 "뜨거운 상태"로 표시됩니다.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn', disabled: r.hot != null, onclick: () => {
            r.hot = L.readBalance(S, r.M0true - L.hotShift(S, L.FURNACE.find((f) => f.id === r.furnace).C));
            nb(ctx, 'Mhot', '뜨거운 상태에서 단 값', r.hot, 'g', 2, '뜨거운 상태의 측정 · 기류 영향', true); ctx.fly('balance'); api.weigh(); tilt(r.hot); render();
          } }, '뜨거운 채로 달기'),
          h('button', { class: 'btn primary', onclick: () => { api.setFurnace(0); api.setRetort({ hot: 0 }); toast('실온까지 식힙니다'); stageNext(); render(); } }, '불을 끄고 식히기')));
      return wrap;
    }
  }

  /* ---- ② ---- */
  function bell() {
    const b = lab.b, el = body, rd = b.readings;
    el.appendChild(callout('', h('b', {}, '수은 종 실험. '), '플라스크의 수은을 오래 가열하면 표면에 붉은 껍질이 생깁니다. 종 안에 갇힌 공기의 부피가 어떻게 변하는지 읽습니다. 매번 온도, 기압, 종 안의 수은면 높이도 함께 적습니다.'));
    if (!rd.length) {
      el.appendChild(h('button', { class: 'btn primary', onclick: () => {
        const x = L.bellRead(S, 0); rd.push(x); api.setBell({ level: 0, calx: 0, lamp: true }); ctx.fly('belljar');
        nb(ctx, 'b0', '0일 부피 V0', x.V, 'cm³', 1); render();
      } }, '처음 상태 읽기 (0일)'));
      return;
    }
    const sl = slider({ label: '가열 일수', unit: '일', min: 1, max: 14, step: 1, value: b.sel, onInput: (v) => { b.sel = v; btn.textContent = `${v}일째에 읽기`; } });
    const btn = h('button', { class: 'btn primary', onclick: () => {
      const d = b.sel; if (rd.some((x) => x.days === d)) { toast('이미 읽은 날입니다'); return; }
      const x = L.bellRead(S, d); rd.push(x); rd.sort((p, q) => p.days - q.days);
      api.setBell({ level: clamp(x.truth.fTrue / L.Y_O2, 0, 1), calx: clamp(d / 12, 0, 1), lamp: true }); ctx.fly('belljar');
      const last = rd[rd.length - 1];
      nb(ctx, 'bV', '종 안 부피 (가장 긴 일수)', last.V, 'cm³', 1, `${last.days}일째`);
      render();
    } }, `${b.sel}일째에 읽기`);
    el.append(sl, btn);
    const t = h('table', { class: 'data' }, h('tr', {}, ...['일', 'V (cm³)', 'h (mm)', 'T (°C)', 'P (mmHg)'].map((x) => h('th', {}, x))));
    rd.forEach((x) => t.appendChild(h('tr', {}, h('td', {}, x.days), h('td', { class: 'n' }, fmt(x.V, 1)), h('td', { class: 'n' }, fmt(x.h, 1)), h('td', { class: 'n' }, fmt(x.T, 1)), h('td', { class: 'n' }, fmt(x.P, 1)))));
    el.appendChild(t);
    if (rd.length > 1) {
      el.appendChild(lineChart({ w: 400, h: 190, x: { min: 0, max: 14, ticks: 7, label: '가열 일수' }, y: { min: 0.7, max: 1.02, ticks: 4, fmt: (v) => v.toFixed(2), label: 'V / V0 (보정 전)' },
        series: [{ pts: rd.map((x) => [x.days, x.V / rd[0].V]), color: 'var(--accent)', dots: 3.5 }], title: '보정하지 않은 부피비' }));
      el.appendChild(h('p', { class: 'sub' }, '이 그래프는 온도·기압·수은면 높이를 보정하지 않은 값입니다. 곡선이 더 내려가지 않을 때까지 읽어야 반응이 끝났다고 말할 수 있습니다.'));
    }
    el.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => {
      api.setCandle('n2'); ctx.fly('candle'); nb(ctx, 'obsN2', '종 속 남은 기체', '촛불이 곧 꺼짐', '', 0); toast('촛불이 꺼집니다'); render();
    } }, '남은 기체로 촛불 시험')));
    if (!rd.some((x) => x.days >= 6)) el.appendChild(h('p', { class: 'sub' }, '6일 이상 지난 값을 한 번은 읽어야 분석할 수 있습니다.'));
    ctx.run.lab.b.sel = b.sel;
  }

  /* ---- ③ ---- */
  function hgo() {
    const g = lab.g, el = body;
    el.appendChild(callout('', h('b', {}, '수은회의 환원. '), '붉은 가루(HgO)를 숯 없이 가열만 합니다. 나오는 기체의 부피를 수은 위에서 읽고, 남은 가루와 수은 방울을 답니다.'));
    if (g.m0 == null) {
      el.appendChild(h('button', { class: 'btn primary', onclick: () => {
        g.m0 = L.readBalance(S, S.hgo.m); nb(ctx, 'hm0', '붉은 가루 처음 질량', g.m0, 'g', 2); ctx.fly('balance'); api.weigh(); render();
      } }, '붉은 가루 달기'));
      return;
    }
    el.appendChild(kv('붉은 가루', `${fmt(g.m0, 2)} g`));
    if (!g.done) {
      el.appendChild(h('div', { class: 'row' },
        h('button', { class: 'btn primary', onclick: () => {
          g.minutes += 10; const x = L.hgoRead(S, g.minutes); g.readings.push(x); api.setFurnace(0.85); api.setRetort({ hot: 0.6 }); ctx.fly('furnace');
          nb(ctx, 'hV', '모은 기체 부피 (누적)', x.V, 'cm³', 1, `${g.minutes}분 · ${x.T.toFixed(1)} °C, ${x.P.toFixed(0)} mmHg`); render();
        } }, '10분 더 가열'),
        h('button', { class: 'btn', disabled: !g.readings.length, onclick: () => {
          const x = g.readings[g.readings.length - 1]; g.final = x; g.done = true; api.setFurnace(0); api.setRetort({ hot: 0 });
          nb(ctx, 'hHg', '모은 수은', x.Hg, 'g', 2); nb(ctx, 'hRes', '남은 붉은 가루', x.residue, 'g', 2); nb(ctx, 'hT', '기체 읽을 때 온도', x.T, '°C', 1); nb(ctx, 'hP', '기체 읽을 때 기압', x.P, 'mmHg', 0);
          toast('수은 방울과 남은 가루를 달았습니다'); gate(); render();
        } }, '가열 끝, 달기')));
    }
    if (g.readings.length) {
      const t = h('table', { class: 'data' }, h('tr', {}, h('th', {}, '가열(분)'), h('th', {}, '기체 V (cm³)'), h('th', {}, '추가분')));
      g.readings.forEach((x, i) => t.appendChild(h('tr', {}, h('td', {}, x.minutes), h('td', { class: 'n' }, fmt(x.V, 1)), h('td', { class: 'n' }, i ? '+' + fmt(x.V - g.readings[i - 1].V, 1) : '—'))));
      el.appendChild(t);
      if (!g.done) el.appendChild(h('p', { class: 'sub' }, '추가분이 읽기 오차(약 ±1 cm³) 안으로 줄면 분해가 끝난 것입니다.'));
    }
    if (g.done) {
      el.append(kv('모은 수은', `${fmt(g.final.Hg, 2)} g`), kv('남은 붉은 가루', `${fmt(g.final.residue, 2)} g`), kv('기체 부피', `${fmt(g.final.V, 1)} cm³`));
      el.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => {
        api.setCandle('o2'); ctx.fly('candle'); nb(ctx, 'obsO2', '붉은 가루에서 나온 기체', '촛불이 훨씬 밝게 탐', '', 0); toast('촛불이 눈부시게 탑니다'); render();
      } }, '얻은 기체로 촛불 시험')));
    }
  }

  function render() {
    body.innerHTML = '';
    [retort, bell, hgo][lab.tab]();
    gate();
  }
  ctx.fly('overview');
  render();
  ctx.el.appendChild(root);
  ctx.hud(h('div', { class: 'gauge-panel' }, h('h4', {}, '실험 노트에 자동 기록'), h('p', { class: 'sub', style: { margin: 0 } }, '오른쪽 위 "실험 노트"에서 모든 측정값을 볼 수 있습니다.')));
}

/* ================= 5. 분석 ================= */
function stepAnalysis(ctx) {
  const S = sim(ctx), nbv = (t) => ctx.notebook.val(t), lab = ctx.run.lab;
  const st = ctx.state; st.q ||= {};
  const r0 = lab.b.readings[0], rb = lab.b.readings.reduce((a, x) => (x.days > a.days ? x : a), lab.b.readings[0]);
  const g = lab.g.final;
  const qs = [];
  const nMmol = (nbv('dP') / L.MMHG) * S.retort.V / (L.R * S.T0) * 1000;
  const dClosed = nbv('M1') - nbv('M0');
  const ratio = (nbv('M2') - nbv('M1')) / (nbv('mc') - nbv('mSn'));
  const Vc = rb.V * ((rb.P - rb.h) / (r0.P - r0.h)) * (K(r0.T) / K(rb.T));
  const fBell = (1 - Vc / r0.V) * 100;
  const fRaw = (1 - rb.V / r0.V) * 100;
  const o2gas = ((g.P / L.MMHG) * (g.V / 1000)) / (L.R * K(g.T)) * L.MW.O2;
  const o2diff = (lab.g.m0 - g.residue) - g.Hg;

  qs.push({ k: 'q1', type: 'num', title: '1. 사라진 기체의 양', body: `밀폐 레토르트를 열기 직전의 압력 감소 ΔP, 부피 V, 실온 T로 줄어든 기체의 몰수를 구하세요. (이상기체, R = 0.08206 L·atm/(mol·K))`,
    data: [['ΔP', `${fmt(nbv('dP'), 1)} mmHg`], ['V', `${fmt(S.retort.V, 1)} L`], ['T', `${fmt(S.T0, 1)} K`]], unit: 'mmol', exp: nMmol, tol: 0.04, rel: true,
    sol: `n = (ΔP/760)·V / (R·T) = ${fmt(nMmol, 1)} mmol` });
  qs.push({ k: 'q2', type: 'num', title: '2. 밀폐 상태의 총 무게 변화', body: '식은 뒤 단 M1에서 봉인 직후 M0를 뺀 값은 얼마입니까.', data: [['M0', `${fmt(nbv('M0'), 2)} g`], ['M1', `${fmt(nbv('M1'), 2)} g`]], unit: 'g', exp: dClosed, tol: 0.006,
    sol: `M1 − M0 = ${fmt(dClosed, 2)} g. 저울 오차(약 0.01 g) 안에서 0입니다. 물질이 용기를 드나들지 않으면 무게는 변하지 않습니다.` });
  qs.push({ k: 'q3', type: 'num', title: '3. 두 증가분의 비', body: '열었을 때 늘어난 무게(M2 − M1)를 금속 쪽에서 늘어난 무게(내용물 − 처음 주석)로 나눈 값을 구하세요.', data: [['M2 − M1', `${fmt(nbv('M2') - nbv('M1'), 2)} g`], ['금속 쪽 증가', `${fmt(nbv('mc') - nbv('mSn'), 2)} g`]], unit: '', exp: ratio, tol: 0.03,
    sol: `비 = ${fmt(ratio, 3)}. 두 값은 서로 비슷하지만 정확히 같지는 않습니다.` });
  qs.push({ k: 'q4', type: 'mc', title: '4. 왜 정확히 1이 아닌가', body: `예상 비는 ${fmt(L.MW.air / L.MW.O2, 3)}에 가깝습니다. 가장 알맞은 이유를 고르세요.`,
    opts: [['a', '저울이 언제나 10% 낮게 읽기 때문이다'], ['b', '없어진 기체는 산소(몰질량 약 32)이고, 들어온 기체는 공기(평균 몰질량 약 29)라서, 같은 몰수라도 질량이 다르다'], ['c', '들어온 공기의 일부가 응결해 버리기 때문이다']], ans: 'b',
    sol: '반응에 쓰인 것은 산소만이다. 용기에 되돌아오는 것은 산소와 질소가 섞인 공기이므로, 같은 몰수가 들어와도 무게는 29/32 배가 된다. "같은 무게"가 아니라 "같은 몰수"로 맞춰야 한다. 화학공학의 몰수지가 여기서 출발한다.' });
  qs.push({ k: 'q5', type: 'num', title: '5. 수은 종에서 줄어든 부피', body: '처음(0일)과 가장 오래 가열한 읽기를 같은 조건으로 환산해 소비된 공기의 부피 비율을 구하세요. 환산식: V0\' = V · (p/p0) · (T0/T), 기체 압력 p = 기압 − 종 안 수은면 높이.',
    data: [['처음 V0 · h · T · P', `${fmt(r0.V, 1)} · ${fmt(r0.h, 1)} · ${fmt(r0.T, 1)} °C · ${fmt(r0.P, 1)}`], [`${rb.days}일 V · h · T · P`, `${fmt(rb.V, 1)} · ${fmt(rb.h, 1)} · ${fmt(rb.T, 1)} °C · ${fmt(rb.P, 1)}`]], unit: '%', exp: fBell, tol: 0.5,
    sol: `환산 부피 ${fmt(Vc, 1)} cm³ → 감소 ${fmt(fBell, 1)} %. 보정하지 않으면 ${fmt(fRaw, 1)} %로, ${fmt(Math.abs(fBell - fRaw), 1)} 퍼센트포인트 어긋납니다. 라부아지에는 이 결과를 "공기의 약 6분의 1"로 보고했습니다. 현재 값은 약 5분의 1(20.9%)입니다.` });
  qs.push({ k: 'q6', type: 'num', title: '6. 기체로 구한 산소 질량', body: '붉은 가루에서 나온 기체의 부피, 온도, 기압으로 기체의 질량을 구하세요. 이 기체를 산소(O₂, 32.0 g/mol)로 봅니다.', data: [['V', `${fmt(g.V, 1)} cm³`], ['T · P', `${fmt(g.T, 1)} °C · ${fmt(g.P, 0)} mmHg`]], unit: 'g', exp: o2gas, tol: 0.03, rel: true,
    sol: `m = PV/(RT)·32.0 = ${fmt(o2gas, 3)} g` });
  qs.push({ k: 'q7', type: 'num', title: '7. 질량의 차로 구한 산소', body: '분해된 붉은 가루의 질량(처음 − 남은 가루)에서 모은 수은 질량을 뺀 값은 얼마입니까.', data: [['처음', `${fmt(lab.g.m0, 2)} g`], ['남은 가루', `${fmt(g.residue, 2)} g`], ['수은', `${fmt(g.Hg, 2)} g`]], unit: 'g', exp: o2diff, tol: 0.012,
    sol: `${fmt(lab.g.m0, 2)} − ${fmt(g.residue, 2)} − ${fmt(g.Hg, 2)} = ${fmt(o2diff, 3)} g` });
  qs.push({ k: 'q8', type: 'mc', title: '8. 두 방법의 차이', body: `기체로 구한 값(${fmt(o2gas, 3)} g)과 질량의 차로 구한 값(${fmt(o2diff, 3)} g)이 완전히 같지는 않습니다. 가장 그럴듯한 원인은 무엇입니까.`,
    opts: [['a', '수은이 일부 증발하거나 튀어서 모은 양이 모자란다'], ['b', '산소는 질량이 없어서 저울로 잴 수 없다'], ['c', '이상기체 법칙은 기체에 쓸 수 없다']], ans: 'a',
    sol: '차이로 구하는 방법은 큰 두 수를 빼므로, 수은의 작은 손실이 산소 쪽 값에서 크게 드러난다. 어느 방법이 더 믿을 만한지는 오차가 어디에 실리는지로 따진다.' });
  if (nbv('Mhot') != null) qs.push({ k: 'q9', type: 'mc', title: '9. 뜨거울 때 단 값', body: `뜨거운 채로 단 값(${fmt(nbv('Mhot'), 2)} g)은 봉인 직후 값(${fmt(nbv('M0'), 2)} g)보다 낮았습니다. 용기에서 물질이 빠져나가지 않았는데 왜 그럴까요.`,
    opts: [['a', '가열된 공기의 상승기류와 부력이 용기를 위로 밀어 가볍게 읽히기 때문이다'], ['b', '금속이 플로지스톤을 잃었기 때문이다'], ['c', '유리가 팽창하면 질량이 줄어들기 때문이다']], ans: 'a',
    sol: '식은 뒤에 달아야 하는 이유다. 비교는 같은 조건(실온)의 값끼리 한다.' });

  const root = h('div', { class: 'stack' }), done = () => qs.every((q) => st.q[q.k]?.ok);
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '당신의 측정값으로 계산합니다. 정답은 당신의 기록에서 나오므로 사람마다 다릅니다.'));
    qs.forEach((q) => {
      const s = (st.q[q.k] ||= { tries: 0, ok: false, shown: false });
      const box = h('div', { class: 'callout ' + (s.ok ? 'good' : s.shown ? 'bad' : '') });
      box.appendChild(h('div', {}, h('b', {}, q.title)));
      box.appendChild(h('p', { class: 'sub', style: { margin: '4px 0 8px' } }, q.body));
      if (q.data) box.appendChild(h('div', { style: { marginBottom: '8px' } }, ...q.data.map(([a, b]) => kv(a, b))));
      if (q.type === 'num') {
        const inp = h('input', { type: 'number', step: 'any', inputmode: 'decimal', disabled: s.ok || s.shown, 'aria-label': q.title, value: s.val ?? '' });
        const row = h('div', { class: 'num-row' + (s.ok ? ' ok' : s.tries && !s.shown ? ' no' : '') }, inp, h('button', { class: 'btn sm', disabled: s.ok || s.shown, onclick: () => {
          const v = parseFloat(inp.value); if (!Number.isFinite(v)) return;
          s.val = inp.value; s.tries++;
          const err = q.rel ? Math.abs(v - q.exp) / Math.abs(q.exp) : Math.abs(v - q.exp);
          if (err <= q.tol) s.ok = true; else toast('값이 맞지 않습니다. 단위와 식을 다시 확인하세요');
          render(); upd();
        } }, '확인'), h('span', { class: 'unit' }, q.unit));
        box.appendChild(row);
      } else {
        const ch = choice({ options: q.opts.map(([v, l]) => ({ value: v, label: l })), value: s.val, name: q.title, onChange: (v) => { if (s.ok || s.shown) return; s.val = v; s.tries++; if (v === q.ans) s.ok = true; else toast('다시 생각해 보세요'); render(); upd(); } });
        ch.api.buttons().forEach((b, i) => { if (s.ok && q.opts[i][0] === q.ans) b.classList.add('right'); if (s.val === q.opts[i][0] && !s.ok) b.classList.add('wrong'); if (s.ok || s.shown) b.disabled = true; });
        box.appendChild(ch);
      }
      if (!s.ok && !s.shown && s.tries >= 2) box.appendChild(h('button', { class: 'btn sm ghost', style: { marginTop: '8px' }, onclick: () => { s.shown = true; render(); upd(); } }, '풀이 보기'));
      if (s.ok || s.shown) box.appendChild(h('p', { class: 'sub', style: { margin: '8px 0 0' } }, q.sol));
      root.appendChild(box);
    });
  };
  const upd = () => {
    const all = qs.every((q) => st.q[q.k]?.ok || st.q[q.k]?.shown);
    if (all) {
      const v = qs.map((q) => { const s = st.q[q.k]; return s.ok ? [1, 0.6, 0.3][Math.min(s.tries - 1, 2)] : 0; });
      ctx.score('analysis', v.reduce((a, b) => a + b, 0) / v.length, 40, '정량 분석');
      ctx.ready(true);
    } else ctx.ready(false, '모든 문항을 풀거나 풀이를 확인하세요');
  };
  render(); upd();
  ctx.el.appendChild(root);
  ctx.fly('overview');
}

/* ================= 6. 보고서 ================= */
function stepReport(ctx) {
  const S = sim(ctx), nbv = (t) => ctx.notebook.val(t), lab = ctx.run.lab, st = ctx.state;
  const r0 = lab.b.readings[0], rb = lab.b.readings.reduce((a, x) => (x.days > a.days ? x : a), lab.b.readings[0]);
  const fBell = (1 - rb.V * ((rb.P - rb.h) / (r0.P - r0.h)) * (K(r0.T) / K(rb.T)) / r0.V) * 100;
  const ratio = (nbv('M2') - nbv('M1')) / (nbv('mc') - nbv('mSn'));
  const g = lab.g.final;
  const evs = [
    { v: 'e1', ok: true, t: `개봉하자 공기가 들어왔고, 늘어난 무게와 금속의 증가분의 비는 ${fmt(ratio, 2)}였다` },
    { v: 'e2', ok: true, t: `수은 종 안 공기의 부피가 보정 후 약 ${fmt(fBell, 1)}% 줄었다` },
    { v: 'e3', ok: true, t: `붉은 가루가 가열만으로 수은 ${fmt(g.Hg, 2)} g과 기체 ${fmt(g.V, 0)} cm³로 갈라졌다` },
    { v: 'e4', ok: false, t: `밀폐 용기의 총 무게는 변하지 않았다 (M1 − M0 = ${fmt(nbv('M1') - nbv('M0'), 2)} g)` },
    { v: 'e5', ok: false, t: '촛불이 종 안의 남은 기체에서 곧 꺼졌다' },
    { v: 'e6', ok: false, t: '칼크스를 숯과 달구면 금속이 되돌아온다' },
    { v: 'e7', ok: false, t: nbv('Mhot') != null ? `뜨거울 때 단 레토르트는 더 가벼웠다 (${fmt(nbv('Mhot'), 2)} g)` : '뜨거운 물체는 가볍게 읽힌다' },
  ];
  const claims = [['a', '금속은 타면서 플로지스톤을 잃고, 대신 불의 입자가 붙어서 무거워진다'], ['b', '금속이 타면 공기의 한 성분과 결합하고, 늘어난 무게는 그 성분의 무게다'], ['c', '무게가 늘어난 것은 부력 때문에 생긴 측정 착오다']];
  const reasons = [['a', '밀폐 용기의 무게가 변하지 않았으므로 공기결합설이 맞다'], ['b', '질량이 닫힌 계에서 보존된다는 전제 아래, 기체가 줄어든 만큼 고체가 늘어났고 그 크기가 서로 비슷하므로, 금속이 기체와 결합했다고 결론짓는 것이 가장 단순하다'], ['c', '실험을 많이 반복했으므로 결론이 틀릴 수 없다']];
  const lims = [
    { v: 'l1', ok: true, t: '질량 보존은 전제이고 이 실험만으로 증명되지 않는다' },
    { v: 'l2', ok: true, t: '공기를 "한 성분"으로만 다루었다. 남은 기체가 무엇인지는 이 실험이 말해 주지 못한다' },
    { v: 'l3', ok: true, t: '저울 오차, 온도·기압 보정이 결과에 몇 퍼센트 영향을 준다' },
    { v: 'l4', ok: false, t: '라부아지에의 저울은 완벽해서 오차를 따질 필요가 없다' },
    { v: 'l5', ok: false, t: '수은회 실험 하나만으로 모든 금속에 대해 증명된다' },
  ];
  st.claim ||= null; st.ev ||= []; st.reason ||= null; st.lim ||= []; st.done ||= false;
  const root = h('div', { class: 'stack' });
  const render = () => {
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'lead' }, '결론을 주장·증거·추론·한계로 정리합니다. 증거는 당신의 실험 기록에서 고릅니다.'));
    const lock = st.done;
    root.appendChild(sec('주장'));
    const c = choice({ options: claims.map(([v, l]) => ({ value: v, label: l })), value: st.claim, name: '주장', onChange: (v) => { if (!lock) { st.claim = v; chk(); } } });
    if (lock) c.api.buttons().forEach((b, i) => { b.disabled = true; if (claims[i][0] === 'b') b.classList.add('right'); else if (st.claim === claims[i][0]) b.classList.add('wrong'); });
    root.appendChild(c);
    root.appendChild(sec('증거 (세 개 고르기)'));
    const e = choice({ options: evs.map((x) => ({ value: x.v, label: x.t })), value: st.ev, multi: true, max: 3, name: '증거', onChange: (v) => { if (!lock) { st.ev = v; chk(); } } });
    if (lock) e.api.buttons().forEach((b, i) => { b.disabled = true; if (evs[i].ok) b.classList.add('right'); else if (st.ev.includes(evs[i].v)) b.classList.add('wrong'); });
    root.appendChild(e);
    root.appendChild(sec('추론'));
    const rs = choice({ options: reasons.map(([v, l]) => ({ value: v, label: l })), value: st.reason, name: '추론', onChange: (v) => { if (!lock) { st.reason = v; chk(); } } });
    if (lock) rs.api.buttons().forEach((b, i) => { b.disabled = true; if (reasons[i][0] === 'b') b.classList.add('right'); else if (st.reason === reasons[i][0]) b.classList.add('wrong'); });
    root.appendChild(rs);
    root.appendChild(sec('한계 (두 개 고르기)'));
    const l = choice({ options: lims.map((x) => ({ value: x.v, label: x.t })), value: st.lim, multi: true, max: 2, name: '한계', onChange: (v) => { if (!lock) { st.lim = v; chk(); } } });
    if (lock) l.api.buttons().forEach((b, i) => { b.disabled = true; if (lims[i].ok) b.classList.add('right'); else if (st.lim.includes(lims[i].v)) b.classList.add('wrong'); });
    root.appendChild(l);
    if (!lock) {
      const btn = h('button', { class: 'btn primary', id: 'submit-report', disabled: !full(), onclick: () => submit() }, '보고서 제출');
      root.appendChild(btn);
      ctx.ready(false, '네 항목을 모두 고르세요');
    } else {
      root.appendChild(feedback());
      ctx.ready(true);
    }
  };
  const full = () => st.claim && st.ev.length === 3 && st.reason && st.lim.length === 2;
  const chk = () => { const b = root.querySelector('#submit-report'); if (b) b.disabled = !full(); };
  const result = () => {
    const evOk = st.ev.filter((v) => evs.find((x) => x.v === v).ok).length;
    const limOk = st.lim.filter((v) => lims.find((x) => x.v === v).ok).length;
    return { claim: st.claim === 'b' ? 1 : 0, ev: evOk / 3, reason: st.reason === 'b' ? 1 : 0, lim: limOk / 2 };
  };
  const submit = () => {
    st.done = true;
    const r = result();
    ctx.score('report', 0.3 * r.claim + 0.35 * r.ev + 0.2 * r.reason + 0.15 * r.lim, 25, '결론 보고서');
    render();
  };
  const feedback = () => {
    const r = result();
    return h('div', { class: 'stack' },
      callout(r.claim ? 'good' : 'bad', h('b', {}, '주장. '), r.claim ? '관찰 전체와 수치가 맞는 가장 단순한 설명입니다.' : '이 주장은 개봉 시 공기 유입과 수은회의 분해를 설명하지 못합니다.'),
      callout(r.ev === 1 ? 'good' : 'warn', h('b', {}, `증거 ${Math.round(r.ev * 3)}/3. `), '결정적인 증거는 가설의 예측이 갈리는 것들입니다. 밀폐 총 무게 불변, 촛불 소등, 숯 환원은 플로지스톤설도 설명하므로 가설을 가르지 못하고, 뜨거울 때의 값은 오히려 측정 함정입니다.'),
      callout(r.reason ? 'good' : 'bad', h('b', {}, '추론. '), '무게가 변하지 않았다는 사실 하나가 아니라, 기체가 줄어든 양과 고체가 늘어난 양이 대응한다는 점이 논증의 중심입니다. 전제(질량 보존)를 밝혀야 합니다.'),
      callout(r.lim === 1 ? 'good' : 'warn', h('b', {}, '한계. '), '질량 보존은 증명된 결론이 아니라 이 논증의 전제입니다. 라부아지에는 저울을 믿고 그 전제를 실행에 옮긴 사람이었습니다.'));
  };
  render();
  ctx.el.appendChild(root);
}

/* ================= 7. 사건 해설 ================= */
function stepDebrief(ctx) {
  const res = (ctx.state.res ||= ctx.finish());
  const wrap = h('div', { class: 'stack' });
  wrap.appendChild(h('div', { class: 'score-ring' }, h('div', { class: 'ring', style: { '--p': res.total } }, h('b', {}, res.total)), h('div', {}, h('div', { style: { fontFamily: 'var(--serif)', fontSize: '20px' } }, res.rank), h('div', { class: 'sub' }, '단계별 점수의 가중 평균'))));
  res.items.forEach((s) => wrap.appendChild(h('div', {}, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'sub' }, s.label), h('span', { class: 'sub' }, Math.round(s.value * 100) + '점')), h('div', { class: 'bar' }, h('i', { style: { width: s.value * 100 + '%' } })))));
  wrap.appendChild(sec('실제 역사는 어떻게 흘렀나'));
  wrap.appendChild(h('ul', { class: 'timeline' },
    ...[['1630', '장 레이: 주석·납이 가열 후 무거워진다고 기록하고 공기가 붙은 것이라 해석한다.'],
      ['1673', '보일: 밀폐 용기 실험. 증가를 불의 입자 탓으로 돌린다.'],
      ['1772', '라부아지에: 인·황 연소에서 무게 증가를 확인하고 봉인 메모를 제출한다.'],
      ['1774', '라부아지에: 밀폐 레토르트 실험으로 열기 전 총 무게가 같음을 확인한다. 같은 해 프리스틀리가 붉은 수은회에서 기체를 얻고, 가을 파리에서 라부아지에와 이야기를 나눈다.'],
      ['1777', '라부아지에: 수은을 12일 가열하는 부피 실험. 공기의 약 6분의 1이 줄었다고 보고한다. 이후 그 기체를 oxygène(산소)라 부른다.'],
      ['1789', '《화학 원론》: 반응의 앞뒤 질량이 같다는 원리를 체계의 바탕에 둔다.'],
      ['1794', '혁명 정부에 의해 처형된다.']].map(([y, t]) => h('li', {}, h('b', {}, y), t))));
  wrap.appendChild(sec('화학공학과 이어지는 곳'));
  wrap.appendChild(callout('', h('b', {}, '질량수지. '), '들어온 것 − 나간 것 + 생성된 것 = 쌓인 것. 이 장부는 오늘날 모든 공정 설계의 첫 계산입니다. 이 사건의 요점은 "나간 것을 놓치면 장부가 맞지 않는다"는 것입니다. 열린 계에서 연소 생성물(기체)을 달지 못하면 타는 물질이 가벼워지는 것처럼 보입니다. 다음 사건(하버-보슈)에서는 같은 장부를 순환하는 반응기에 적용합니다.'));
  wrap.appendChild(sec('빠뜨리면 안 되는 이야기'));
  wrap.appendChild(h('ul', { class: 'sub', style: { paddingLeft: '18px', margin: 0 } },
    h('li', {}, '마리안 폴즈(라부아지에 부인)는 실험 기록과 도판, 번역을 맡았고 연구의 공동 작업자였다.'),
    h('li', {}, '프리스틀리와 셸레도 산소를 독립적으로 얻었다. 우선권과 해석 모두 단순하지 않았다.'),
    h('li', {}, '라부아지에도 틀렸다. 산소가 모든 산의 필수 성분이라 믿었고(염산에는 산소가 없다), 열을 "칼로릭"이라는 물질로 다뤘다.'),
    h('li', {}, '이 게임의 장비, 수치, 시간은 현대의 정밀도로 재구성한 것이다. 실제 실험의 수치를 그대로 옮긴 것이 아니다.')));
  wrap.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn primary', onclick: () => ctx.exit() }, '사건 목록으로'), h('button', { class: 'btn', onclick: () => ctx.restart() }, '다시 조사하기')));
  ctx.el.appendChild(wrap);
  ctx.fly('overview');
}

export default {
  id: 'lavoisier', no: '01', year: '1774', title: '연소의 저울',
  blurb: '금속을 태우면 왜 무거워질까. 밀폐 레토르트, 수은 종, 수은회 환원으로 플로지스톤설과 공기결합설을 가르는 정량 실험을 재구성한다.',
  tags: [{ label: '화학사', on: false }, { label: '질량수지', on: true }, { label: '기체 보정', on: false }],
  accent: '#d3a355',
  viewButtons: [{ id: 'overview', label: '전체' }, { id: 'balance', label: '저울' }, { id: 'furnace', label: '가열로' }, { id: 'belljar', label: '수은 종' }, { id: 'candle', label: '촛불' }],
  createScene(e) { return createLavoisierScene(e); },
  steps: [
    { id: 'file', label: '사건 기록', title: '사건 기록', sub: '자료를 모두 읽으세요', gate: '자료를 모두 읽으세요', view: 'overview', mount: stepDossier },
    { id: 'classify', label: '증거 분류', title: '증거 분류', sub: '무엇이 가설을 가르는가', gate: '모든 관찰을 분류하세요', view: 'overview', mount: stepClassify },
    { id: 'predict', label: '예측', title: '가설별 예측', sub: '실험 전에 적어 둡니다', gate: '여섯 칸을 모두 채우세요', view: 'balance', mount: stepPredict },
    { id: 'lab', label: '실험대', title: '실험대', sub: '세 가지 실험을 직접 수행합니다', gate: '세 실험을 모두 마치세요', view: 'overview', mount: stepLab },
    { id: 'analysis', label: '분석', title: '정량 분석', sub: '내 기록으로 계산합니다', gate: '문항을 풀어 주세요', view: 'overview', mount: stepAnalysis },
    { id: 'report', label: '보고서', title: '결론 보고서', sub: '주장 · 증거 · 추론 · 한계', gate: '네 항목을 고르세요', view: 'overview', mount: stepReport },
    { id: 'debrief', label: '사건 해설', title: '사건 해설', sub: '결과와 실제 역사', view: 'overview', mount: stepDebrief },
  ],
};
