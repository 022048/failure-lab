// 사건 01 — 18세기 파리 실험실 (절차적 3D)
import * as THREE from 'three';
import { woodMap, plasterMap, brickMap, metalRoughness, softDot } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TOP = 0.94;                     // 작업대 상판 높이(m)

export function materials(env) {
  const wood = woodMap('#5c3e25', [3, 1], 3, 5);
  return {
    wood: new THREE.MeshStandardMaterial({ map: wood, bumpMap: wood, bumpScale: 1.2, roughness: 0.7 }),
    woodDark: new THREE.MeshStandardMaterial({ map: woodMap('#35210f', [2, 2], 8, 4), roughness: 0.62 }),
    floor: new THREE.MeshStandardMaterial({ map: woodMap('#4a3220', [7, 5], 12, 6), roughness: 0.58, metalness: 0 }),
    plaster: new THREE.MeshStandardMaterial({ map: plasterMap('#8c897d', [3, 1.4], 4), roughness: 0.95 }),
    brick: new THREE.MeshStandardMaterial({ map: brickMap([1, 1]), roughness: 0.92 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xcaa24f, metalness: 1, roughness: 0.3, roughnessMap: metalRoughness([2, 2], 4, 80), envMapIntensity: 1.3 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2c2e33, metalness: 0.9, roughness: 0.52, envMapIntensity: 0.8 }),
    tin: new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 1, roughness: 0.32, envMapIntensity: 1.2 }),
    hg: new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 1, roughness: 0.04, envMapIntensity: 1.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xe8f4f6, transparent: true, opacity: 0.075, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a2a1c, roughness: 0.6 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: 0.95 }),
    wax: new THREE.MeshStandardMaterial({ color: 0xf0e6c8, roughness: 0.5 }),
  };
}

function lathe(pts, seg = 40) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); }
function mesh(geo, mat, parent, pos = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.castShadow = shadow; m.receiveShadow = true;
  parent?.add(m); return m;
}
function strut(a, b, r, mat, parent) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  parent.add(m); return m;
}
function bottle(M, h, r, tint, mat) {
  const g = new THREE.Group();
  const body = lathe([[0.0, 0], [r, 0.004], [r * 1.02, h * 0.15], [r, h * 0.55], [r * 0.55, h * 0.78], [r * 0.3, h * 0.86], [r * 0.3, h]], 20);
  const glass = M.glass.clone(); glass.color = new THREE.Color(tint); glass.opacity = 0.42;
  mesh(body, glass, g, [0, 0, 0], false);
  const liq = lathe([[0, 0.006], [r * 0.93, 0.01], [r * 0.95, h * 0.15], [r * 0.9, h * 0.42], [0, h * 0.42]], 20);
  mesh(liq, new THREE.MeshStandardMaterial({ color: tint, roughness: 0.3, transparent: true, opacity: 0.75 }), g, [0, 0, 0], false);
  mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.3, h * 0.12, 12), mat || M.woodDark, g, [0, h + h * 0.02, 0]);
  return g;
}

/** 유리 레토르트(구 + 휜 목) + 내용물. 장면과 타이틀 장식에서 공통으로 사용 */
export function buildRetort(M, { sealed = true } = {}) {
  const g = new THREE.Group();
  const R = 0.115;
  const bulb = mesh(new THREE.SphereGeometry(R, 48, 32), M.glass, g, [0, 0, 0], false);
  const path = new THREE.CatmullRomCurve3([V(0.09, 0.07, 0), V(0.22, 0.135, 0), V(0.4, 0.1, 0), V(0.58, -0.02, 0), V(0.64, -0.13, 0)]);
  const neck = mesh(new THREE.TubeGeometry(path, 40, 0.021, 14, false), M.glass, g, [0, 0, 0], false);
  const tip = mesh(new THREE.SphereGeometry(0.024, 16, 12), M.glass, g, [0.64, -0.13, 0], false);
  const solidMat = M.tin.clone();
  const solid = new THREE.Group(); g.add(solid);
  const seedR = (i) => { const s = Math.sin(i * 91.7) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.016 + seedR(i) * 0.012, 0), solidMat);
    p.position.set((seedR(i + 20) - 0.5) * 0.12, -R * 0.78 + seedR(i + 40) * 0.025, (seedR(i + 60) - 0.5) * 0.09);
    p.scale.set(1.3, 0.55 + seedR(i + 80) * 0.3, 1.0); p.rotation.set(seedR(i) * 3, seedR(i + 3) * 3, 0);
    p.castShadow = true; solid.add(p);
  }
  tip.visible = sealed;
  return { group: g, bulb, neck, tip, solidMat, solid };
}

export function createLavoisierScene(engine) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0907);
  scene.fog = new THREE.FogExp2(0x120d09, 0.1);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 60);
  const M = materials(engine.env);
  const pickables = [];

  /* ----- 방 ----- */
  const floor = mesh(new THREE.PlaneGeometry(14, 10), M.floor, scene, [0, 0, -0.5]); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const back = mesh(new THREE.PlaneGeometry(14, 5.2), M.plaster, scene, [0, 2.6, -3.2], false); back.receiveShadow = true;
  const left = mesh(new THREE.PlaneGeometry(8, 5.2), M.plaster, scene, [-5.5, 2.6, -0.5], false); left.rotation.y = Math.PI / 2;
  const right = mesh(new THREE.PlaneGeometry(8, 5.2), M.plaster, scene, [5.5, 2.6, -0.5], false); right.rotation.y = -Math.PI / 2;
  const ceil = mesh(new THREE.PlaneGeometry(14, 10), M.woodDark, scene, [0, 4.7, -0.5], false); ceil.rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(14, 0.35, 0.1), M.woodDark, scene, [0, 0.17, -3.14], false);   // 걸레받이
  for (const bx of [-3.4, 3.4]) mesh(new THREE.BoxGeometry(0.28, 4.7, 0.3), M.woodDark, scene, [bx, 2.35, -3.1]);   // 기둥
  mesh(new THREE.BoxGeometry(14, 0.3, 0.4), M.woodDark, scene, [0, 4.55, -3.0]);                                  // 들보

  // 아치 창
  const shp = new THREE.Shape(); const ww = 0.95;
  shp.moveTo(-ww, 0); shp.lineTo(ww, 0); shp.lineTo(ww, 1.9); shp.absarc(0, 1.9, ww, 0, Math.PI, false); shp.lineTo(-ww, 0);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xfff0cf, toneMapped: false });
  const win = mesh(new THREE.ShapeGeometry(shp, 24), winMat, scene, [0, 1.15, -3.17], false);
  for (const [w_, h_, x, y] of [[0.05, 2.9, 0, 1.2 + 1.45], [1.95, 0.05, 0, 2.2], [1.95, 0.05, 0, 3.2], [0.05, 2.9, -0.48, 2.65], [0.05, 2.9, 0.48, 2.65]]) mesh(new THREE.BoxGeometry(w_, h_, 0.07), M.woodDark, scene, [x, y, -3.12], false);
  mesh(new THREE.BoxGeometry(2.3, 0.1, 0.3), M.woodDark, scene, [0, 1.12, -3.05]);        // 창턱

  // 선반 + 병
  const shelfItems = [];
  for (const sx of [-1, 1]) for (const [sy, nb] of [[1.5, 6], [2.25, 6], [3.0, 5]]) {
    const cx = sx * 4.4;
    mesh(new THREE.BoxGeometry(2.3, 0.05, 0.36), M.woodDark, scene, [cx, sy, -3.0]);
    mesh(new THREE.BoxGeometry(0.05, 0.14, 0.3), M.woodDark, scene, [cx - 1.1, sy - 0.1, -3.0], false);
    mesh(new THREE.BoxGeometry(0.05, 0.14, 0.3), M.woodDark, scene, [cx + 1.1, sy - 0.1, -3.0], false);
    for (let i = 0; i < nb; i++) {
      const t = (i + Math.sin(sy * 7 + i * 3 + sx) * 0.25) / nb - 0.5;
      const tints = [0xc58a3a, 0x6d9c6a, 0xd6e0e4, 0x9d6b3a, 0x7a8fb5, 0xb85c3a];
      const b = bottle(M, 0.15 + ((i * 37 + sy * 13) % 10) * 0.016, 0.045 + ((i * 11) % 4) * 0.008, tints[(i + Math.floor(sy * 3) + (sx > 0 ? 2 : 0)) % tints.length]);
      b.position.set(cx + t * 2.0, sy + 0.025, -3.0); scene.add(b); shelfItems.push(b);
    }
  }

  /* ----- 작업대 ----- */
  mesh(new THREE.BoxGeometry(3.9, 0.08, 1.05), M.wood, scene, [0.25, TOP - 0.04, 0]);
  mesh(new THREE.BoxGeometry(3.7, 0.12, 0.95), M.woodDark, scene, [0.25, TOP - 0.14, 0], false);
  for (const lx of [-1.55, 1.95]) for (const lz of [-0.42, 0.42]) mesh(new THREE.BoxGeometry(0.1, TOP - 0.2, 0.1), M.woodDark, scene, [lx, (TOP - 0.2) / 2, lz]);
  mesh(new THREE.BoxGeometry(3.6, 0.04, 0.8), M.wood, scene, [0.25, 0.28, 0]);

  /* ----- 천칭 ----- */
  const BX = -1.15, BZ = 0.02;
  const balance = new THREE.Group(); balance.position.set(BX, TOP, BZ); scene.add(balance);
  mesh(new THREE.BoxGeometry(0.4, 0.035, 0.24), M.woodDark, balance, [0, 0.0175, 0]);
  mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.03, 24), M.brass, balance, [0, 0.05, 0]);
  mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.46, 16), M.brass, balance, [0, 0.28, 0]);
  mesh(new THREE.SphereGeometry(0.03, 16, 12), M.brass, balance, [0, 0.52, 0]);
  const beam = new THREE.Group(); beam.position.set(0, 0.5, 0); balance.add(beam);
  const bs = new THREE.Shape(); const half = 0.37;
  bs.moveTo(-half, 0); bs.lineTo(-0.1, 0.028); bs.lineTo(0, 0.05); bs.lineTo(0.1, 0.028); bs.lineTo(half, 0); bs.lineTo(0.1, -0.02); bs.lineTo(0, -0.034); bs.lineTo(-0.1, -0.02); bs.closePath();
  const beamMesh = mesh(new THREE.ExtrudeGeometry(bs, { depth: 0.012, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 }), M.brass, beam, [0, 0, -0.006]);
  mesh(new THREE.ConeGeometry(0.006, 0.13, 8), M.iron, beam, [0, -0.1, 0]).rotation.x = Math.PI;      // 지침
  // 지시눈금(지주에 부착)
  mesh(new THREE.BoxGeometry(0.1, 0.006, 0.006), M.brass, balance, [0, 0.4, 0.02], false);
  const pans = [];
  for (const sx of [-1, 1]) {
    const hook = new THREE.Group(); hook.position.set(sx * half, -0.004, 0); beam.add(hook);
    const rim = 0.115, L = 0.3;
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; strut(V(0, 0, 0), V(Math.cos(a) * rim, -L, Math.sin(a) * rim), 0.0018, M.brass, hook); }
    const bowl = mesh(lathe([[0, -0.012], [rim * 0.9, -0.008], [rim, 0.012], [rim * 1.04, 0.016], [rim * 0.98, 0.02], [rim * 0.9, 0.006], [0, -0.006]], 40), M.brass, hook, [0, -L, 0]);
    bowl.material = M.brass;
    pans.push({ hook, bowl });
  }
  // 왼쪽 접시 위: 시료 용기(작은 유리병) / 오른쪽: 분동
  const panLoad = new THREE.Group(); pans[0].hook.add(panLoad); panLoad.position.set(0, -0.3, 0);
  mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.075, 24, 1, true), M.glass, panLoad, [0, 0.04, 0], false);
  mesh(new THREE.SphereGeometry(0.025, 12, 8), M.tin, panLoad, [0, 0.02, 0]).scale.y = 0.5;
  for (let i = 0; i < 5; i++) {
    const wgt = new THREE.Group(); pans[1].hook.add(wgt); wgt.position.set((i - 2) * 0.035, -0.3 + (i % 2) * 0.0, (i % 3 - 1) * 0.03);
    mesh(new THREE.CylinderGeometry(0.014 + i * 0.002, 0.016 + i * 0.002, 0.02 + i * 0.004, 18), M.brass, wgt, [0, 0.02, 0]);
  }
  const balanceLabelPos = V(BX, TOP + 0.75, BZ);

  /* ----- 가열로 + 레토르트 ----- */
  const FX = 0.15, FZ = 0.0;
  const furnace = new THREE.Group(); furnace.position.set(FX, TOP, FZ); scene.add(furnace);
  mesh(new THREE.BoxGeometry(0.72, 0.1, 0.6), M.brick, furnace, [0, 0.05, 0]);
  for (const [w_, d_, x, z] of [[0.72, 0.1, 0, 0.25], [0.72, 0.1, 0, -0.25], [0.1, 0.5, 0.31, 0], [0.1, 0.5, -0.31, 0]]) mesh(new THREE.BoxGeometry(w_, 0.3, d_), M.brick, furnace, [x, 0.25, z]);
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x140b07, emissive: 0xff4a0e, emissiveIntensity: 0, roughness: 0.9 });
  const coals = [];
  for (let i = 0; i < 70; i++) {
    const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.03 + (i % 5) * 0.006, 0), coalMat.clone());
    c.position.set((((i * 37) % 100) / 100 - 0.5) * 0.48, 0.14 + ((i * 13) % 7) * 0.012, (((i * 53) % 100) / 100 - 0.5) * 0.36);
    c.rotation.set(i, i * 2, i * 3); c.scale.set(1, 0.7, 1); c.userData.ph = i * 1.7; furnace.add(c); coals.push(c);
  }
  for (let i = -2; i <= 2; i++) mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 8), M.iron, furnace, [i * 0.1, 0.36, 0]).rotation.x = Math.PI / 2;   // 석쇠 막대
  const furnaceLight = new THREE.PointLight(0xff6a22, 0, 3.4, 2); furnaceLight.position.set(0, 0.3, 0.05); furnace.add(furnaceLight);
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,150,60,1)', 'rgba(255,90,20,0)'), color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glowSprite.scale.set(1.0, 0.6, 1); glowSprite.position.set(0, 0.28, 0); furnace.add(glowSprite);

  const rt = buildRetort(M, { sealed: true });
  rt.group.position.set(FX - 0.02, TOP + 0.53, FZ); scene.add(rt.group);
  const retortInner = new THREE.PointLight(0xff7a30, 0, 0.7, 2); retortInner.position.set(0, -0.05, 0); rt.group.add(retortInner);
  // 스탠드
  const standX = FX + 0.5, standZ = -0.3;
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.025, 24), M.iron, scene, [standX, TOP + 0.0125, standZ]);
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.78, 10), M.iron, scene, [standX, TOP + 0.4, standZ]);
  strut(V(standX, TOP + 0.62, standZ), V(standX - 0.1, TOP + 0.58, standZ + 0.26), 0.007, M.iron, scene);
  const clamp = mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16), M.iron, scene, [standX - 0.1, TOP + 0.575, standZ + 0.27]); clamp.rotation.y = Math.PI / 2;
  rt.group.userData.pick = { id: 'retort', label: '레토르트' };
  pickables.push(rt.group);

  /* ----- 수은 조 + 종 ----- */
  const TX = 1.28, TZ = 0.0;
  const trough = new THREE.Group(); trough.position.set(TX, TOP, TZ); scene.add(trough);
  mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.085, 48), M.woodDark, trough, [0, 0.0425, 0]);
  const hgSurf = mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.012, 48), M.hg, trough, [0, 0.078, 0], false);
  const BR = 0.088, BH = 0.3;
  const jarPts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; jarPts.push([BR * Math.cos(a), BH - 0.07 + BR * 0.8 * Math.sin(a)]); }
  const jar = mesh(lathe([[BR, 0], [BR, BH - 0.07], ...jarPts.slice(1)], 40), M.glass, trough, [0, 0.0, 0], false);
  jar.position.y = 0.07;
  const gas = mesh(new THREE.CylinderGeometry(BR * 0.97, BR * 0.97, BH - 0.07, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd0e8, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }), trough, [0, 0, 0], false);
  const hgIn = mesh(new THREE.CylinderGeometry(BR * 0.97, BR * 0.97, 1, 32), M.hg, trough, [0, 0, 0], false);
  const crust = mesh(new THREE.CylinderGeometry(BR * 0.9, BR * 0.9, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0xa8301c, roughness: 0.75, transparent: true, opacity: 0 }), trough, [0, 0.09, 0], false);
  const jarState = { level: 0 };
  // 알코올 램프
  const lampG = new THREE.Group(); lampG.position.set(TX - 0.52, TOP, TZ + 0.18); scene.add(lampG);
  mesh(lathe([[0, 0], [0.05, 0.004], [0.062, 0.03], [0.05, 0.065], [0.014, 0.085], [0.012, 0.1]], 24), M.glass, lampG, [0, 0, 0], false);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 10), M.brass, lampG, [0, 0.11, 0]);
  const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 10), new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.0, toneMapped: false }));
  lampFlame.position.set(0, 0.16, 0); lampG.add(lampFlame);
  const lampLight = new THREE.PointLight(0xffa860, 0, 1.2, 2); lampLight.position.set(0, 0.2, 0); lampG.add(lampLight);
  trough.userData.pick = { id: 'belljar', label: '수은 조' }; pickables.push(trough);

  /* ----- 촛불 시험대 ----- */
  const CX = 1.88, CZ = 0.05;
  const candleG = new THREE.Group(); candleG.position.set(CX, TOP, CZ); scene.add(candleG);
  mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.014, 24), M.brass, candleG, [0, 0.007, 0]);
  mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.1, 16), M.wax, candleG, [0, 0.064, 0]);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.95, toneMapped: false });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), flameMat); flame.scale.set(1, 2.4, 1); flame.position.set(0, 0.134, 0); candleG.add(flame);
  const flameGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,200,120,1)', 'rgba(255,140,40,0)'), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  flameGlow.scale.set(0.16, 0.16, 1); flameGlow.position.set(0, 0.134, 0); candleG.add(flameGlow);
  const candleLight = new THREE.PointLight(0xffb870, 0.6, 1.6, 2); candleLight.position.set(0, 0.16, 0); candleG.add(candleLight);
  mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 32, 1, true), M.glass, candleG, [0, 0.12, 0], false);
  candleG.userData.pick = { id: 'candle', label: '촛불' }; pickables.push(candleG);

  /* ----- 소품: 책, 노트, 잉크병 ----- */
  const books = new THREE.Group(); books.position.set(-1.62, TOP, -0.2); scene.add(books);
  [[0.3, 0.05, 0.2, 0x3b2a1e, 0], [0.27, 0.04, 0.18, 0x5a3a24, 0.15], [0.24, 0.045, 0.17, 0x2c3a3a, -0.1]].forEach(([w_, h_, d_, c, r], i) => {
    const b = mesh(new THREE.BoxGeometry(w_, h_, d_), new THREE.MeshStandardMaterial({ color: c, roughness: 0.62 }), books, [0, 0.025 + i * 0.047 + (i ? 0 : 0), 0]); b.rotation.y = r;
    mesh(new THREE.BoxGeometry(w_ + 0.002, h_ - 0.012, d_ - 0.02), M.paper, books, [0.008, 0.025 + i * 0.047, 0]).rotation.y = r;
  });
  const nb = document.createElement('canvas'); nb.width = 512; nb.height = 360;
  { const g = nb.getContext('2d'); g.fillStyle = '#e8dec1'; g.fillRect(0, 0, 512, 360); g.strokeStyle = 'rgba(70,45,20,.55)'; g.lineWidth = 1.4;
    for (let y = 34; y < 340; y += 17) { g.beginPath(); let x = 24; g.moveTo(x, y); while (x < 230) { x += 3; g.lineTo(x, y + Math.sin(x * 0.9 + y) * 2.2); } g.stroke(); }
    for (let y = 34; y < 340; y += 17) { g.beginPath(); let x = 282; g.moveTo(x, y); while (x < 280 + Math.random() * 0 + 190) { x += 3; g.lineTo(x, y + Math.sin(x * 0.7 + y) * 2.2); } g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(250, 0, 12, 360); }
  const nbTex = new THREE.CanvasTexture(nb); nbTex.colorSpace = THREE.SRGBColorSpace;
  const noteb = mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ map: nbTex, roughness: 0.95 }), scene, [-0.55, TOP + 0.003, 0.3]); noteb.rotation.set(-Math.PI / 2, 0, 0.12);
  const ink = mesh(lathe([[0, 0], [0.03, 0.002], [0.033, 0.03], [0.02, 0.05], [0.016, 0.06]], 20), M.glass, scene, [-0.9, TOP, 0.34], false);
  mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.025, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.2 }), scene, [-0.9, TOP + 0.014, 0.34], false);
  const quill = mesh(new THREE.CylinderGeometry(0.0015, 0.004, 0.26, 6), M.paper, scene, [-0.8, TOP + 0.09, 0.36]); quill.rotation.set(0.2, 0.3, -0.9);

  /* ----- 조명 ----- */
  scene.add(new THREE.HemisphereLight(0xb8c9e8, 0x3a2916, 0.55));
  const sun = new THREE.DirectionalLight(0xffe2b4, 3.0); sun.position.set(1.8, 4.2, -2.6); sun.target.position.set(0.2, 0.9, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3, bottom: -3, near: 0.5, far: 12 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.025; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const key = new THREE.SpotLight(0xffd6a0, 22, 9, 0.8, 1, 1.6); key.position.set(0.2, 3.2, 1.8); key.target.position.set(0.2, 0.95, 0); scene.add(key, key.target);
  const fill = new THREE.PointLight(0x7a93c8, 3.0, 8, 2); fill.position.set(-2.8, 2.2, 1.6); scene.add(fill);

  /* ----- 먼지 입자 ----- */
  const N = 220, dpos = new Float32Array(N * 3), dph = new Float32Array(N);
  for (let i = 0; i < N; i++) { dpos[i * 3] = (Math.random() - 0.5) * 4.4; dpos[i * 3 + 1] = 1 + Math.random() * 2.6; dpos[i * 3 + 2] = -2.6 + Math.random() * 3.6; dph[i] = Math.random() * 6.28; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.022, map: softDot(), color: 0xffe9c4, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(dust);
  // 불씨
  const NE = 40, epos = new Float32Array(NE * 3), eage = new Float32Array(NE);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.014, map: softDot('rgba(255,170,80,1)', 'rgba(255,90,0,0)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(embers);

  /* ----- 상태 & 애니메이션 ----- */
  const S = { furnace: 0, furnaceT: 0, calx: 0, calxT: 0, lamp: 0, lampT: 0, bell: 0, bellT: 0, crust: 0, crustT: 0, cand: 'air', candBright: 1, candT: 1, osc: 0, oscT: 0, tilt: 0, hot: 0, hotT: 0 };
  const tmpC1 = new THREE.Color(), tmpC2 = new THREE.Color(0xc9ced4), calxCol = new THREE.Color(0xcfc9bb);

  const api = {
    setFurnace(p) { S.furnaceT = p; },
    setRetort({ calx, tipBroken, hot } = {}) {
      if (calx !== undefined) S.calxT = calx;
      if (tipBroken !== undefined) rt.tip.visible = !tipBroken;
      if (hot !== undefined) S.hotT = hot;
    },
    setBell({ level, calx, lamp } = {}) {
      if (level !== undefined) S.bellT = level;
      if (calx !== undefined) S.crustT = calx;
      if (lamp !== undefined) S.lampT = lamp ? 1 : 0;
    },
    setCandle(mode) { S.cand = mode; S.candT = mode === 'o2' ? 2.4 : mode === 'n2' ? 0 : 1; },
    weigh() { S.osc = 1; },
    setTilt(a) { S.tilt = a; },
    isSettled() { return S.osc < 0.03; },
    reset() { S.furnaceT = 0; S.calxT = 0; S.lampT = 0; S.bellT = 0; S.crustT = 0; S.hotT = 0; S.cand = 'air'; S.candT = 1; rt.tip.visible = true; },
  };

  const labels = [];
  const ctrl = {
    scene, camera, pickables, api, labels,
    bloom: 0.55, bloomThreshold: 0.8, exposure: 1.05, vignette: 0.5, warm: 0.5,
    limits: { minDist: 0.5, maxDist: 4.6, minPolar: 0.55, maxPolar: 1.52, minAz: -1.1, maxAz: 1.1, pan: true },
    views: {
      overview: { pos: [0.55, 1.85, 3.25], target: [0.35, 1.05, 0] },
      balance: { pos: [-0.75, 1.6, 1.35], target: [-1.15, 1.32, 0.02] },
      furnace: { pos: [0.7, 1.7, 1.45], target: [0.3, 1.3, 0] },
      belljar: { pos: [1.7, 1.6, 1.3], target: [1.3, 1.2, 0] },
      candle: { pos: [2.35, 1.4, 1.1], target: [1.88, 1.1, 0.05] },
    },
    startView: 'overview',
    update(dt, t) {
      const k = (cur, tar, r) => cur + (tar - cur) * (1 - Math.exp(-r * dt));
      S.furnace = k(S.furnace, S.furnaceT, 1.8); S.calx = k(S.calx, S.calxT, 0.9); S.hot = k(S.hot, S.hotT, 1.2);
      S.lamp = k(S.lamp, S.lampT, 2); S.bell = k(S.bell, S.bellT, 0.8); S.crust = k(S.crust, S.crustT, 0.8);
      S.candBright = k(S.candBright, S.candT, 3);
      // 가열로
      const fl = 0.85 + 0.15 * Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1);
      coals.forEach((c) => { c.material.emissiveIntensity = S.furnace * (1.2 + 1.4 * (0.5 + 0.5 * Math.sin(t * 2.6 + c.userData.ph))); });
      furnaceLight.intensity = S.furnace * 11 * fl;
      glowSprite.material.opacity = S.furnace * 0.55 * fl;
      retortInner.intensity = S.hot * 1.2;
      // 레토르트 내용물: 주석 → 금속회(회백색)
      tmpC1.copy(tmpC2).lerp(calxCol, S.calx); rt.solidMat.color.copy(tmpC1);
      rt.solidMat.metalness = 1 - 0.85 * S.calx; rt.solidMat.roughness = 0.32 + 0.6 * S.calx;
      rt.solidMat.emissive.setRGB(1, 0.35, 0.08); rt.solidMat.emissiveIntensity = S.hot * 0.5;
      // 불씨
      embers.material.opacity = S.furnace * 0.9;
      for (let i = 0; i < NE; i++) {
        eage[i] += dt * (0.3 + (i % 5) * 0.12); if (eage[i] > 1 || eage[i] === 0) { eage[i] = Math.random() * 0.2; epos[i * 3] = FX + (Math.random() - 0.5) * 0.4; epos[i * 3 + 1] = TOP + 0.35; epos[i * 3 + 2] = FZ + (Math.random() - 0.5) * 0.3; }
        epos[i * 3 + 1] += dt * (0.18 + (i % 4) * 0.05); epos[i * 3] += Math.sin(t * 2 + i) * dt * 0.03;
      }
      eg.attributes.position.needsUpdate = true;
      // 수은 종: 소모량 → 종 안 수은 기둥 상승, 가스 부피 감소
      const rise = S.bell * 0.085, lvl0 = 0.078, H = BH - 0.07;
      hgIn.scale.y = 0.001 + rise + 0.012; hgIn.position.y = 0.07 + (rise + 0.012) / 2 - 0.0;
      hgIn.position.y = 0.072 + (rise) / 2;
      gas.scale.y = Math.max(1 - rise / H, 0.2); gas.position.y = 0.07 + rise + (H - rise) / 2;
      crust.position.y = 0.072 + rise + 0.003; crust.material.opacity = S.crust * 0.92;
      lampFlame.material.opacity = S.lamp * 0.85; lampFlame.scale.y = 1 + 0.25 * Math.sin(t * 14); lampLight.intensity = S.lamp * 0.7;
      // 촛불
      const cb = S.candBright, flick = 1 + 0.08 * Math.sin(t * 17) + 0.05 * Math.sin(t * 29);
      flame.scale.set(1 + (cb - 1) * 0.35, 2.4 * Math.max(cb, 0.001) * flick, 1 + (cb - 1) * 0.35);
      flame.visible = cb > 0.05; flameGlow.visible = cb > 0.05;
      flameMat.color.setRGB(1, 0.82 + 0.1 * (cb > 1.3 ? 1 : 0), 0.54 + 0.35 * (cb > 1.3 ? 1 : 0));
      flameGlow.material.opacity = Math.min(cb * 0.45, 1); flameGlow.scale.setScalar(0.12 + 0.07 * cb);
      candleLight.intensity = cb * 0.55 * flick;
      // 천칭: 측정 시 진동 후 수평
      S.osc = Math.max(S.osc - dt / 3.0, 0);
      const a = S.tilt + 0.11 * S.osc * S.osc * Math.cos(t * 7.5);
      beam.rotation.z = a;
      for (const p of pans) p.hook.rotation.z = -a;
      // 먼지
      for (let i = 0; i < N; i++) { dpos[i * 3] += Math.sin(t * 0.3 + dph[i]) * dt * 0.015; dpos[i * 3 + 1] += Math.cos(t * 0.2 + dph[i]) * dt * 0.01 - dt * 0.004; if (dpos[i * 3 + 1] < 0.95) dpos[i * 3 + 1] = 3.4; }
      dg.attributes.position.needsUpdate = true;
    },
    reset() { api.reset(); },
    dispose() {},
  };
  ctrl.attachLabels = () => {
    engine.addLabel('<b>저울</b>정밀 천칭', balanceLabelPos);
    engine.addLabel('<b>레토르트</b>밀폐 유리 용기', V(FX + 0.35, TOP + 0.78, 0));
    engine.addLabel('<b>수은 조</b>종 아래 공기', V(TX, TOP + 0.5, 0));
    engine.addLabel('<b>촛불</b>기체 시험', V(CX, TOP + 0.4, CZ));
  };
  return ctrl;
}
