// 케이스 러너: 단계 진행, 도크 패널, 노트북, 시점 바, 점수 집계
import { h, toast, modal, kv } from './ui.js';
import { store } from './store.js';

export class Notebook {
  constructor() { this.items = []; this.listeners = []; }
  add(e) {
    const i = this.items.findIndex((x) => x.tag === e.tag);
    const rec = { time: this.items.length + 1, ...e };
    if (i >= 0) this.items[i] = rec; else this.items.push(rec);
    this.listeners.forEach((f) => f());
    return rec;
  }
  get(tag) { return this.items.find((x) => x.tag === tag); }
  val(tag) { return this.get(tag)?.value; }
  on(f) { this.listeners.push(f); }
  clear() { this.items = []; }
}

export class CaseRunner {
  constructor({ engine, root, def, onExit }) {
    this.engine = engine; this.root = root; this.def = def; this.onExit = onExit;
    this.i = 0; this.maxReached = 0;
    this.notebook = new Notebook();
    this.scores = {};
    this.run = { seed: (Math.random() * 2 ** 31) >>> 0, step: {} };
    this.readyFlags = {};
    this.cleanup = null;
  }

  start() {
    document.body.dataset.case = this.def.id;
    this.scene = this.def.createScene(this.engine);
    this.engine.setScene(this.scene);
    this._inset();
    this._rz = () => this._inset(); window.addEventListener('resize', this._rz);
    this.engine.onView = (v) => this._markView(v);
    this._build();
    this.go(0);
  }

  _build() {
    const r = this.root;
    r.innerHTML = '';
    this.stepsEl = h('div', { class: 'steps', role: 'tablist', 'aria-label': '조사 단계' });
    this.nbBtn = h('button', { class: 'tb-btn', onclick: () => this.toggleNotebook() }, '실험 노트');
    this.qBtn = h('button', { class: 'tb-btn', onclick: () => this.toggleQuality(), title: '그래픽 품질' }, '화질 ' + (this.engine.quality === 'high' ? '높음' : '낮음'));
    this.top = h('div', { class: 'topbar' },
      h('button', { class: 'brand', onclick: () => this.exit() }, 'CASE ', h('span', {}, 'FILES')),
      this.stepsEl, this.nbBtn, this.qBtn);
    this.headT = h('h2'); this.headS = h('p');
    this.collapseBtn = h('button', { class: 'collapse', 'aria-label': '패널 접기', onclick: () => { this.dock.classList.toggle('min'); this.collapseBtn.textContent = this.dock.classList.contains('min') ? '+' : '–'; } }, '–');
    this.body = h('div', { class: 'dock-body' });
    this.hint = h('span', { class: 'hint' });
    this.prevBtn = h('button', { class: 'btn', onclick: () => this.go(this.i - 1) }, '이전');
    this.nextBtn = h('button', { class: 'btn primary', onclick: () => this.go(this.i + 1) }, '다음 단계');
    this.dock = h('section', { class: 'dock' },
      h('div', { class: 'dock-head' }, this.headT, this.headS, this.collapseBtn),
      this.body,
      h('div', { class: 'dock-foot' }, this.prevBtn, this.hint, this.nextBtn));
    this.viewbar = h('div', { class: 'viewbar', role: 'group', 'aria-label': '시점' });
    (this.def.viewButtons || []).forEach((v) => this.viewbar.appendChild(h('button', { dataset: { v: v.id }, onclick: () => { this.engine.flyTo(v.id); } }, v.label)));
    this.hudEl = h('div', { class: 'hud-right' });
    this.drawer = null;
    r.append(this.top, this.dock, this.viewbar, this.hudEl);
    this._markView(this.engine.currentView);
    this._steps();
  }

  _inset() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w > 860) this.engine.setInset({ left: 462, right: 0, top: 50, bottom: 56 });
    else this.engine.setInset({ bottom: Math.min(h * 0.54, 420), top: 40 });
  }

  _markView(v) { [...(this.viewbar?.children || [])].forEach((b) => b.classList.toggle('on', b.dataset.v === v)); }

  _steps() {
    this.stepsEl.innerHTML = '';
    this.def.steps.forEach((s, i) => {
      const done = i < this.maxReached || (i === this.maxReached && this.readyFlags[s.id] && i < this.i);
      const b = h('button', {
        class: 'step ' + (i === this.i ? 'cur' : i < this.i || i < this.maxReached ? 'done' : ''), role: 'tab',
        'aria-selected': i === this.i, disabled: i > this.maxReached,
        onclick: () => this.go(i),
      }, h('i', {}, done || i < this.maxReached ? '✓' : String(i + 1)), s.label);
      this.stepsEl.appendChild(b);
    });
    this.stepsEl.querySelector('.cur')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }

  ready(flag = true, hint = '') {
    const s = this.def.steps[this.i];
    this.readyFlags[s.id] = flag;
    this.nextBtn.disabled = !flag && this.i < this.def.steps.length - 1;
    if (flag) this.maxReached = Math.max(this.maxReached, this.i + 1);
    this.hint.textContent = flag ? (hint || '') : (hint || this.def.steps[this.i].gate || '');
    this._steps();
  }

  go(i) {
    if (i < 0 || i >= this.def.steps.length) return;
    if (i > this.maxReached) return;
    this.cleanup?.(); this.cleanup = null;
    this.i = i;
    const s = this.def.steps[i];
    this.headT.textContent = s.title;
    this.headS.textContent = s.sub || '';
    this.body.innerHTML = '';
    this.body.scrollTop = 0;
    this.hudEl.innerHTML = '';
    this.prevBtn.disabled = i === 0;
    const last = i === this.def.steps.length - 1;
    this.nextBtn.style.display = last ? 'none' : '';
    this.nextBtn.disabled = !(this.readyFlags[s.id] || i < this.maxReached);
    this.hint.textContent = this.readyFlags[s.id] || i < this.maxReached ? '' : s.gate || '';
    this._steps();
    const ctx = this._ctx(s);
    this.cleanup = s.mount(ctx) || null;
    if (s.view) this.engine.flyTo(s.view, 1.6);
    this.body.querySelector('button, input')?.blur?.();
  }

  _ctx(step) {
    const self = this;
    return {
      el: this.body, engine: this.engine, scene: this.scene, run: this.run, notebook: this.notebook,
      state: (this.run.step[step.id] ||= {}),
      ready: (f = true, hint) => self.ready(f, hint),
      next: () => self.go(self.i + 1),
      fly: (v, d) => self.engine.flyTo(v, d),
      hud: (...els) => { self.hudEl.innerHTML = ''; els.forEach((e) => e && self.hudEl.appendChild(e)); },
      score: (key, value, weight, label) => { self.scores[key] = { value: Math.max(0, Math.min(1, value)), weight, label }; },
      scores: () => self.scores,
      toast, modal, openNotebook: () => self.toggleNotebook(true),
      finish: (extra) => self.finish(extra),
      restart: () => self.restart(),
      exit: () => self.exit(),
    };
  }

  toggleNotebook(force) {
    if (this.drawer && force !== true) { this.drawer.remove(); this.drawer = null; return; }
    if (this.drawer) return;
    const body = h('div', { class: 'body' });
    const paint = () => {
      body.innerHTML = '';
      if (!this.notebook.items.length) { body.appendChild(h('p', { class: 'sub' }, '아직 기록이 없습니다. 실험에서 측정한 값이 여기에 자동으로 쌓입니다.')); return; }
      const t = h('table', { class: 'data' }, h('tr', {}, h('th', {}, '항목'), h('th', { style: { textAlign: 'right' } }, '값')));
      this.notebook.items.forEach((e) => {
        t.appendChild(h('tr', { class: e.flag ? 'flag' : '' },
          h('td', {}, e.label, e.note ? h('div', { class: 'sub', style: { fontSize: '11.5px' } }, e.note) : null),
          h('td', { class: 'n' }, typeof e.value === 'number' ? e.value.toFixed(e.digits ?? 3) : e.value, e.unit ? ' ' + e.unit : '')));
      });
      body.appendChild(t);
    };
    paint();
    this.notebook.on(paint);
    this.drawer = h('aside', { class: 'drawer', 'aria-label': '실험 노트' },
      h('header', {}, h('h3', {}, '실험 노트'), h('button', { class: 'btn sm ghost', onclick: () => this.toggleNotebook() }, '닫기')), body);
    this.root.appendChild(this.drawer);
  }

  toggleQuality() {
    const q = this.engine.quality === 'high' ? 'low' : 'high';
    this.engine.setQuality(q); store.set('quality', q);
    this.qBtn.textContent = '화질 ' + (q === 'high' ? '높음' : '낮음');
  }

  /** 최종 점수 집계 → 등급 */
  finish(extra = {}) {
    const sc = Object.values(this.scores);
    const wsum = sc.reduce((a, s) => a + s.weight, 0) || 1;
    const total = Math.round((sc.reduce((a, s) => a + s.value * s.weight, 0) / wsum) * 100);
    const rank = total >= 90 ? '수석 조사관' : total >= 75 ? '선임 조사관' : total >= 55 ? '조사관' : '수습 조사관';
    const prev = store.case(this.def.id);
    store.saveCase(this.def.id, { best: Math.max(prev.best || 0, total), rank: total >= (prev.best || 0) ? rank : prev.rank, done: true, runs: (prev.runs || 0) + 1 });
    return { total, rank, items: sc, ...extra };
  }

  restart() { this.cleanup?.(); this.notebook.clear(); this.scores = {}; this.run = { seed: (Math.random() * 2 ** 31) >>> 0, step: {} }; this.readyFlags = {}; this.maxReached = 0; this.i = 0; this.scene.reset?.(); this._build(); this.go(0); }

  exit() { this.cleanup?.(); this.cleanup = null; window.removeEventListener('resize', this._rz); this.engine.setInset({}); delete document.body.dataset.case; this.onExit(); }
}
