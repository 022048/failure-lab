// 절차적 텍스처 (외부 이미지 없이 GitHub 저장소만으로 완결). 시드 고정 난수로 항상 같은 결과.
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvas(w, h, draw, { color = true, repeat = [1, 1] } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function woodMap(base = '#6a4a2c', repeat = [2, 1], seed = 3, planks = 6) {
  const r = rng(seed);
  return canvas(1024, 1024, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const pw = w / planks;
    for (let p = 0; p < planks; p++) {
      const tone = (r() - 0.5) * 40;
      g.fillStyle = `rgba(${tone > 0 ? 255 : 0},${tone > 0 ? 220 : 0},${tone > 0 ? 160 : 0},${Math.abs(tone) / 260})`;
      g.fillRect(p * pw, 0, pw, h);
      for (let i = 0; i < 90; i++) {
        const x = p * pw + r() * pw, y0 = r() * h, len = 80 + r() * 380;
        g.strokeStyle = `rgba(${r() < 0.5 ? '30,16,6' : '200,160,110'},${0.05 + r() * 0.12})`;
        g.lineWidth = 0.6 + r() * 1.8;
        g.beginPath(); g.moveTo(x, y0);
        g.bezierCurveTo(x + (r() - 0.5) * 6, y0 + len * 0.3, x + (r() - 0.5) * 6, y0 + len * 0.7, x + (r() - 0.5) * 4, y0 + len);
        g.stroke();
      }
      if (r() < 0.7) { // 옹이
        const kx = p * pw + pw * (0.25 + r() * 0.5), ky = r() * h;
        for (let k = 5; k > 0; k--) { g.strokeStyle = `rgba(25,12,4,${0.1 + k * 0.05})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(kx, ky, 4 + k * 3.5, 9 + k * 7, 0, 0, 7); g.stroke(); }
      }
      g.fillStyle = 'rgba(10,5,2,.7)'; g.fillRect(p * pw, 0, 2.5, h);
    }
  }, { repeat });
}

export function plasterMap(base = '#8d8a80', repeat = [3, 2], seed = 11, streak = 0.06) {
  const r = rng(seed);
  return canvas(1024, 1024, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, rad = 4 + r() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const v = r() < 0.5 ? '255,255,255' : '0,0,0';
      gr.addColorStop(0, `rgba(${v},${0.018 + r() * 0.03})`); gr.addColorStop(1, `rgba(${v},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 140; i++) { // 습기 자국/줄무늬
      const x = r() * w; g.strokeStyle = `rgba(20,25,20,${r() * streak})`; g.lineWidth = 1 + r() * 7;
      g.beginPath(); g.moveTo(x, r() * h * 0.4); g.lineTo(x + (r() - 0.5) * 20, h * (0.4 + r() * 0.6)); g.stroke();
    }
  }, { repeat });
}

export function concreteMaps(base = '#6f7378', repeat = [6, 6], seed = 21, wet = 0.5) {
  const r = rng(seed);
  const map = canvas(1024, 1024, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    for (let i = 0; i < 40; i++) { const x = r() * w, y = r() * h, rad = 40 + r() * 140; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(0,0,0,${0.05 + r() * 0.12})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); // 슬래브 줄눈
  }, { repeat });
  const rough = canvas(512, 512, (g, w, h) => {
    g.fillStyle = `rgb(${255 * (1 - wet * 0.55)},${255 * (1 - wet * 0.55)},${255 * (1 - wet * 0.55)})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, rad = 30 + r() * 110; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(40,40,40,.85)'); gr.addColorStop(1, 'rgba(40,40,40,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  }, { color: false, repeat });
  return { map, rough };
}

export function brickMap(repeat = [2, 1.4], seed = 5) {
  const r = rng(seed);
  return canvas(1024, 768, (g, w, h) => {
    g.fillStyle = '#2a211b'; g.fillRect(0, 0, w, h);
    const bh = 48, bw = 118;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        const l = 24 + r() * 12, sat = 18 + r() * 14;
        g.fillStyle = `hsl(${14 + r() * 12},${sat}%,${l}%)`;
        g.fillRect(x + off + 3, row * bh + 3, bw - 6, bh - 6);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(x + off + 3 + r() * bw, row * bh + 3 + r() * bh, 2 + r() * 4, 2 + r() * 3); }
      }
    }
  }, { repeat });
}

export function metalRoughness(repeat = [1, 1], seed = 9, base = 90) {
  const r = rng(seed);
  return canvas(512, 512, (g, w, h) => {
    g.fillStyle = `rgb(${base},${base},${base})`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() * 0.1})`; g.lineWidth = 0.5 + r(); g.beginPath(); const y = r() * h; g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 3); g.stroke(); }
  }, { color: false, repeat });
}

/** 부드러운 원형 그라디언트 스프라이트(불꽃·먼지·후광용) */
export function softDot(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvas(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
}

/** 하늘 그라디언트 (세로) */
export function skyGradient(stops) {
  return canvas(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => gr.addColorStop(p, c)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, {});
}

/** 눈금판(압력계·다이얼 면) */
export function dialFace(max = 300, color = '#e9e2d0', ink = '#1b1710', unit = 'bar') {
  return canvas(512, 512, (g, w, h) => {
    g.fillStyle = color; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, 7); g.fill();
    g.strokeStyle = ink; g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    for (let i = 0; i <= 50; i++) {
      const a = a0 + ((a1 - a0) * i) / 50, major = i % 5 === 0;
      const r1 = w / 2 - 28, r2 = r1 - (major ? 30 : 15);
      g.lineWidth = major ? 4 : 2; g.beginPath();
      g.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1); g.lineTo(w / 2 + Math.cos(a) * r2, h / 2 + Math.sin(a) * r2); g.stroke();
      if (major) { g.font = '600 30px Georgia'; g.fillText(String(Math.round((max * i) / 50)), w / 2 + Math.cos(a) * (r2 - 28), h / 2 + Math.sin(a) * (r2 - 28)); }
    }
    g.font = 'italic 34px Georgia'; g.fillText(unit, w / 2, h / 2 + 100);
  });
}
