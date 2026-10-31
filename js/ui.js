// DOM 도우미, 폼 컴포넌트, SVG 차트 (프레임워크 없이)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  children.forEach(add);
  return el;
}

export const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '—');
export const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

export function modal({ title, body, actions = [] }) {
  const back = h('div', { class: 'modal-back' });
  const close = () => back.remove();
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
    h('h3', {}, title), body,
    h('div', { class: 'row', style: { marginTop: '18px', justifyContent: 'flex-end' } },
      ...actions.map((a) => h('button', { class: 'btn ' + (a.primary ? 'primary' : ''), onclick: () => { close(); a.onClick?.(); } }, a.label))));
  back.appendChild(box);
  back.addEventListener('click', (e) => { if (e.target === back && !actions.length) close(); });
  document.body.appendChild(back);
  return { close };
}

/** 슬라이더: 값 표시 + 단위. 반환 요소의 .api = {get, set} */
export function slider({ label, unit = '', min, max, step = 1, value, digits = 0, onInput, note }) {
  const out = h('span', { class: 'val' });
  const input = h('input', { type: 'range', min, max, step, value });
  const show = () => { out.textContent = `${Number(input.value).toFixed(digits)} ${unit}`.trim(); };
  show();
  input.addEventListener('input', () => { show(); onInput?.(Number(input.value)); });
  const el = h('div', { class: 'field' }, h('label', {}, h('span', {}, label), out), input, note ? h('span', { class: 'sub' }, note) : null);
  el.api = { get: () => Number(input.value), set: (v) => { input.value = v; show(); }, input };
  return el;
}

export function choice({ options, value, onChange, multi = false, max = Infinity, name }) {
  let sel = multi ? new Set(value || []) : value;
  const wrap = h('div', { class: 'stack', role: multi ? 'group' : 'radiogroup', 'aria-label': name });
  const paint = () => {
    [...wrap.children].forEach((b, i) => {
      const v = options[i].value;
      b.classList.toggle('on', multi ? sel.has(v) : sel === v);
      b.setAttribute('aria-pressed', multi ? sel.has(v) : sel === v);
    });
  };
  options.forEach((o) => {
    const b = h('button', { class: 'opt' + (multi ? ' sq' : ''), type: 'button', disabled: o.disabled,
      onclick: () => {
        if (multi) { if (sel.has(o.value)) sel.delete(o.value); else if (sel.size < max) sel.add(o.value); onChange?.([...sel]); }
        else { sel = o.value; onChange?.(sel); }
        paint();
      } },
      h('span', { class: 'dot' }), h('span', {}, o.label, o.desc ? h('small', {}, o.desc) : null));
    wrap.appendChild(b);
  });
  paint();
  wrap.api = { get: () => (multi ? [...sel] : sel), buttons: () => [...wrap.children] };
  return wrap;
}

export function tabs(items, onSelect, selected = 0) {
  const bar = h('div', { class: 'tabs', role: 'tablist' });
  const seen = new Set([selected]);
  const paint = (i) => [...bar.children].forEach((b, j) => { b.classList.toggle('on', i === j); b.classList.toggle('seen', seen.has(j)); b.setAttribute('aria-selected', i === j); });
  items.forEach((t, i) => bar.appendChild(h('button', { role: 'tab', onclick: () => { seen.add(i); paint(i); onSelect(i); } }, t)));
  paint(selected);
  bar.api = { seen: () => seen };
  return bar;
}

/* ---------- SVG 차트 ---------- */
const NS = 'http://www.w3.org/2000/svg';
export function lineChart(o) {
  const W = o.w || 420, H = o.h || 250, m = { l: 46, r: 14, t: 12, b: 38, ...(o.margin || {}) };
  const px = (x) => m.l + ((x - o.x.min) / (o.x.max - o.x.min)) * (W - m.l - m.r);
  const py = (y) => H - m.b - ((y - o.y.min) / (o.y.max - o.y.min)) * (H - m.t - m.b);
  const ticks = (a) => { const n = a.ticks || 5; return Array.from({ length: n + 1 }, (_, i) => a.min + ((a.max - a.min) * i) / n); };
  let s = '';
  (o.bands || []).forEach((b) => { s += `<rect x="${px(b.x0 ?? o.x.min)}" y="${py(b.y1 ?? o.y.max)}" width="${px(b.x1 ?? o.x.max) - px(b.x0 ?? o.x.min)}" height="${py(b.y0 ?? o.y.min) - py(b.y1 ?? o.y.max)}" fill="${b.color}"/>`; });
  ticks(o.x).forEach((v) => { s += `<line class="grid" x1="${px(v)}" x2="${px(v)}" y1="${m.t}" y2="${H - m.b}"/><text x="${px(v)}" y="${H - m.b + 14}" text-anchor="middle">${(o.x.fmt || ((q) => q.toFixed(0)))(v)}</text>`; });
  ticks(o.y).forEach((v) => { s += `<line class="grid" y1="${py(v)}" y2="${py(v)}" x1="${m.l}" x2="${W - m.r}"/><text x="${m.l - 6}" y="${py(v) + 3.5}" text-anchor="end">${(o.y.fmt || ((q) => q.toFixed(0)))(v)}</text>`; });
  s += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/><line class="axis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${H - m.b}"/>`;
  s += `<text x="${(m.l + W - m.r) / 2}" y="${H - 5}" text-anchor="middle">${o.x.label || ''}</text>`;
  s += `<text transform="translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle">${o.y.label || ''}</text>`;
  (o.hlines || []).forEach((l) => { s += `<line x1="${m.l}" x2="${W - m.r}" y1="${py(l.y)}" y2="${py(l.y)}" stroke="${l.color}" stroke-dasharray="${l.dash || '5 4'}" stroke-width="1.2"/><text x="${W - m.r - 3}" y="${py(l.y) - 4}" text-anchor="end" style="fill:${l.color}">${l.label || ''}</text>`; });
  (o.vlines || []).forEach((l) => { s += `<line y1="${m.t}" y2="${H - m.b}" x1="${px(l.x)}" x2="${px(l.x)}" stroke="${l.color}" stroke-dasharray="${l.dash || '5 4'}" stroke-width="1.2"/>`; });
  (o.series || []).forEach((se) => {
    const pts = se.pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (!pts.length) return;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)} ${py(clampY(p[1], o)).toFixed(1)}`).join('');
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="${se.width || 2}" ${se.dash ? `stroke-dasharray="${se.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (se.dots) pts.forEach((p) => { s += `<circle cx="${px(p[0])}" cy="${py(clampY(p[1], o))}" r="${se.dots}" fill="${se.color}"/>`; });
  });
  (o.marks || []).forEach((k) => {
    s += `<circle cx="${px(k.x)}" cy="${py(k.y)}" r="${k.r || 5}" fill="${k.fill || 'none'}" stroke="${k.color}" stroke-width="2"/>`;
    if (k.label) s += `<text x="${px(k.x) + 8}" y="${py(k.y) - 7}" style="fill:${k.color}">${k.label}</text>`;
  });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart');
  svg.setAttribute('role', 'img');
  if (o.title) svg.setAttribute('aria-label', o.title);
  svg.innerHTML = s;
  return svg;
}
const clampY = (y, o) => Math.min(Math.max(y, o.y.min), o.y.max);

export function legend(items) {
  return h('div', { class: 'legend' }, ...items.map((i) => h('span', {}, h('i', { style: { background: i.color } }), i.label)));
}

export function kv(label, value, unit, cls = '') {
  return h('div', { class: 'kv ' + cls }, h('span', {}, label), h('b', {}, value, unit ? h('small', {}, unit) : null));
}
