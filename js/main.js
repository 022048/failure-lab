import { Engine } from './engine.js';
import { CaseRunner } from './runner.js';
import { h } from './ui.js';
import { store } from './store.js';
import { createArchiveScene } from './scenes/archive.js';

const stage = document.getElementById('stage');
const labels = document.getElementById('labels');
const ui = document.getElementById('ui');

function fatal(msg) {
  const l = document.getElementById('loading');
  if (l) l.textContent = msg;
}

async function boot() {
  let engine;
  try {
    engine = new Engine(stage, labels);
  } catch (e) {
    fatal('이 브라우저에서 WebGL을 시작할 수 없습니다. 최신 Chrome·Edge·Safari에서 열어 주세요.');
    console.error(e);
    return;
  }
  const qp = new URLSearchParams(location.search).get('q');
  engine.setQuality(qp === 'low' || qp === 'high' ? qp : store.get('quality', 'high'));
  const [lav, hab] = await Promise.all([import('./cases/lavoisier.js'), import('./cases/haberbosch.js')]);
  const cases = [lav.default, hab.default];
  let runner = null;
  window.__cf = { engine, get runner() { return runner; } };   // 디버그/자동 검증용

  function showTitle() {
    runner = null;
    delete document.body.dataset.case;
    ui.innerHTML = '';
    engine.setScene(createArchiveScene(engine, cases));
    const items = cases.map((c) => {
      const rec = store.case(c.id);
      return h('button', { class: 'case-item', style: { '--c': c.accent }, onclick: () => start(c) },
        h('span', { class: 'no' }, `사건 ${c.no} · ${c.year}`),
        h('span', { class: 'nm' }, c.title),
        h('span', { class: 'bl' }, c.blurb),
        h('span', { class: 'meta' }, ...c.tags.map((t) => h('span', { class: 'chip' + (t.on ? ' on' : '') }, t.label))),
        rec.done ? h('span', { class: 'rank-line' }, `완료 · 최고 ${rec.best}점 · ${rec.rank}`) : null);
    });
    ui.appendChild(h('div', { class: 'title-screen' },
      h('div', { class: 'wordmark' },
        h('h1', {}, 'CASE FILES'),
        h('p', {}, '과학과 공학의 전환점이 된 사건을 현장 기록, 실험, 계산으로 다시 조사합니다. 정답을 고르는 대신, 증거로 결론을 세웁니다.')),
      h('div', { class: 'case-list' },
        h('h2', {}, '조사할 사건을 고르세요'),
        ...items,
        h('p', { class: 'title-foot' }, '화면을 끌어 시점을 돌릴 수 있습니다. 기록은 이 브라우저에만 저장됩니다.'))));
  }

  function start(def) {
    runner = new CaseRunner({ engine, root: ui, def, onExit: showTitle });
    runner.start();
  }

  showTitle();
  const l = document.getElementById('loading');
  l?.classList.add('out');
  setTimeout(() => l?.remove(), 700);
  const q = new URLSearchParams(location.search).get('case');
  if (q) { const c = cases.find((x) => x.id === q); if (c) start(c); }
}

boot().catch((e) => { console.error(e); fatal('불러오기에 실패했습니다: ' + e.message); });
