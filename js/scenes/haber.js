// 사건 02 — 하버–보슈 합성 설비 (절차적 3D). 1913년 오파우 공장 풍의 합성 루프와 1909년 실험대.
import * as THREE from 'three';
import { concreteMaps, brickMap, metalRoughness, softDot, dialFace, woodMap } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(geo, mat, parent, pos = [0, 0, 0], shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.castShadow = shadow; m.receiveShadow = true; parent?.add(m); return m;
}
const HOT = [[0, 0x1c2733], [0.35, 0x6e1608], [0.65, 0xe0560c], [1, 0xffcf6a]].map(([p, c]) => [p, new THREE.Color(c)]);
export function tempColor(T, out = new THREE.Color()) {
  const t = Math.min(Math.max((T - 300) / 260, 0), 1);
  for (let i = 1; i < HOT.length; i++) if (t <= HOT[i][0]) { const a = HOT[i - 1], b = HOT[i]; return out.copy(a[1]).lerp(b[1], (t - a[0]) / (b[0] - a[0])); }
  return out.copy(HOT[HOT.length - 1][1]);
}

export function materials() {
  const conc = concreteMaps('#6d7176', [8, 6], 21, 0.4);
  return {
    floor: new THREE.MeshStandardMaterial({ map: conc.map, roughnessMap: conc.rough, roughness: 1, metalness: 0, envMapIntensity: 0.6 }),
    brick: new THREE.MeshStandardMaterial({ map: brickMap([5, 1.6], 9), roughness: 0.95, envMapIntensity: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.9, roughness: 0.38, roughnessMap: metalRoughness([2, 2], 6, 105), envMapIntensity: 1.5, side: THREE.DoubleSide }),
    steelDark: new THREE.MeshStandardMaterial({ color: 0x4a5058, metalness: 0.8, roughness: 0.5, envMapIntensity: 1.0 }),
    pipe: new THREE.MeshStandardMaterial({ color: 0x7a828c, metalness: 0.85, roughness: 0.4, envMapIntensity: 1.2 }),
    paintGreen: new THREE.MeshStandardMaterial({ color: 0x35504a, metalness: 0.4, roughness: 0.55, envMapIntensity: 0.5 }),
    paintRed: new THREE.MeshStandardMaterial({ color: 0x8c2a1c, metalness: 0.3, roughness: 0.6, envMapIntensity: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xcaa24f, metalness: 1, roughness: 0.32, envMapIntensity: 1.1 }),
    wood: new THREE.MeshStandardMaterial({ map: woodMap('#5c3e25', [2, 1], 3, 4), roughness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xe8f4f6, transparent: true, opacity: 0.08, roughness: 0.02, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1 }),
  };
}

/** 다단 단열 반응기. cut 평면으로 앞쪽 절반을 잘라 내부 촉매층을 보여 준다. */
export function buildReactor(M, plane = null) {
  const g = new THREE.Group();
  const clip = plane ? [plane] : [];
  const shell = M.steel.clone(); shell.clippingPlanes = clip; shell.clipShadows = true;
  const R = 0.5, H = 3.9, y0 = 0.45;
  mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), shell, g, [0, y0 + H / 2, 0]);
  for (const s of [1, -1]) {
    const dome = new THREE.SphereGeometry(R, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const d = mesh(dome, shell, g, [0, y0 + (s > 0 ? H : 0), 0]); d.scale.y = 0.55; if (s < 0) d.rotation.x = Math.PI;
  }
  for (let i = 0; i < 7; i++) { const f = mesh(new THREE.TorusGeometry(R + 0.02, 0.035, 10, 48), M.steelDark, g, [0, y0 + 0.1 + (H - 0.2) * (i / 6), 0]); f.rotation.x = Math.PI / 2; }
  mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.42, 32), M.steelDark, g, [0, 0.21, 0]);                       // 스커트
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16), M.pipe, g, [0, y0 + H + 0.32, 0]);                    // 상부 노즐
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 16), M.pipe, g, [0, y0 - 0.22, 0]);
  // 촉매층 (최대 4단)
  const beds = [];
  const slotH = 0.52, gap = 0.28, top = y0 + H - 0.55;
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.85, metalness: 0.1, emissive: 0x000000 });
    const bed = new THREE.Group();
    mesh(new THREE.CylinderGeometry(R - 0.09, R - 0.09, slotH, 40), mat, bed, [0, 0, 0], false);
    const grid = mesh(new THREE.CylinderGeometry(R - 0.085, R - 0.085, 0.03, 40), M.steelDark, bed, [0, slotH / 2 + 0.015, 0], false);
    for (let k = 0; k < 26; k++) { const a = (k / 26) * Math.PI * 2; mesh(new THREE.SphereGeometry(0.03, 6, 5), mat, bed, [Math.cos(a) * 0.3 * Math.random(), slotH / 2 + 0.02, Math.sin(a) * 0.3 * Math.random()], false); }
    bed.position.y = top - i * (slotH + gap) - slotH / 2;
    g.add(bed); beds.push({ g: bed, mat });
  }
  return { group: g, beds, shell };
}

export function createHaberScene(engine) {
  const M = materials();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f14);
  scene.fog = new THREE.FogExp2(0x0b1015, 0.028);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const pickables = [], labels = [];

  /* ---- 건물 ---- */
  const floor = mesh(new THREE.PlaneGeometry(40, 28), M.floor, scene, [0, 0, 0], false); floor.rotation.x = -Math.PI / 2;
  const back = mesh(new THREE.BoxGeometry(40, 9, 0.5), M.brick, scene, [0, 4.5, -7.5], false);
  const winGlow = new THREE.MeshBasicMaterial({ color: 0xaecbe0, transparent: true, opacity: 0.85 });
  for (const x of [-9, -3, 3, 9]) { mesh(new THREE.PlaneGeometry(2.2, 5), winGlow, scene, [x, 5, -7.22], false); for (let k = 1; k < 4; k++) mesh(new THREE.BoxGeometry(2.2, 0.05, 0.08), M.steelDark, scene, [x, 2.5 + k * 1.25, -7.2], false); mesh(new THREE.BoxGeometry(0.05, 5, 0.08), M.steelDark, scene, [x, 5, -7.2], false); }
  for (let i = -3; i <= 3; i++) { mesh(new THREE.BoxGeometry(0.4, 9, 0.4), M.steelDark, scene, [i * 5.2, 4.5, -6.9]); mesh(new THREE.BoxGeometry(0.28, 0.28, 14), M.steelDark, scene, [i * 5.2, 8.6, 0], false); }
  mesh(new THREE.BoxGeometry(40, 0.3, 0.3), M.steelDark, scene, [0, 8.6, -4], false);

  /* ---- 반응기 ---- */
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const reactor = buildReactor(M, plane);
  reactor.group.position.set(0, 0, 0); scene.add(reactor.group);
  reactor.group.userData.pick = { id: 'reactor', label: '합성 반응기', onClick: () => engine.flyTo('reactor') };
  pickables.push(reactor.group);
  const glowReactor = new THREE.PointLight(0xff7a30, 0, 7, 2); glowReactor.position.set(0, 2.6, 0.2); scene.add(glowReactor);

  /* ---- 열교환기 · 분리기 · 압축기 · 플레어 ---- */
  const hx = new THREE.Group(); scene.add(hx); hx.position.set(3.4, 1.0, -0.2);
  const hxBody = mesh(new THREE.CylinderGeometry(0.36, 0.36, 3.0, 36), M.paintGreen, hx); hxBody.rotation.z = Math.PI / 2;
  for (const x of [-1.5, 1.5]) { const c = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 36), M.steelDark, hx, [x, 0, 0]); c.rotation.z = Math.PI / 2; }
  for (const x of [-1.0, 1.0]) mesh(new THREE.BoxGeometry(0.2, 0.5, 0.8), M.steelDark, hx, [x, -0.5, 0]);
  const sep = new THREE.Group(); scene.add(sep); sep.position.set(6.3, 0, -0.4);
  const sepMat = M.steel.clone(); sepMat.color = new THREE.Color(0x8fa6b6);
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 36), sepMat, sep, [0, 1.35, 0]);
  const sd = mesh(new THREE.SphereGeometry(0.42, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2), sepMat, sep, [0, 2.45, 0]); sd.scale.y = 0.55;
  const frost = mesh(new THREE.CylinderGeometry(0.44, 0.44, 2.2, 36), new THREE.MeshStandardMaterial({ color: 0xe9f4fb, transparent: true, opacity: 0, roughness: 0.9 }), sep, [0, 1.35, 0], false);
  const liq = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 24), new THREE.MeshStandardMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.55, roughness: 0.2 }), sep, [0, 0.55, 0], false);
  for (const a of [0, 2.1, 4.2]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), M.steelDark, sep, [Math.cos(a) * 0.36, 0.25, Math.sin(a) * 0.36]);
  sep.userData.pick = { id: 'sep', label: '냉각 분리기', onClick: () => engine.flyTo('loop') }; pickables.push(sep);

  const comp = new THREE.Group(); scene.add(comp); comp.position.set(-4.4, 0, 0.6);
  mesh(new THREE.BoxGeometry(3.2, 0.5, 1.5), M.steelDark, comp, [0, 0.25, 0]);
  const cyl = (x) => { const c = mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 28), M.paintRed, comp, [x, 0.95, 0]); mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), M.brass, comp, [x, 1.9, 0]); return c; };
  cyl(-0.9); cyl(0.0); cyl(0.9);
  const fly = new THREE.Group(); fly.position.set(1.75, 0.95, 0); comp.add(fly);
  const disc = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.16, 48), M.steelDark, fly); disc.rotation.z = Math.PI / 2;
  for (let k = 0; k < 6; k++) { const sp = mesh(new THREE.BoxGeometry(0.07, 1.6, 0.07), M.steel, fly, [0.1, 0, 0]); sp.rotation.x = (k / 6) * Math.PI; }
  const motor = mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 28), M.paintGreen, comp, [-2.7, 0.8, 0]); motor.rotation.z = Math.PI / 2;
  comp.userData.pick = { id: 'comp', label: '순환·압축기', onClick: () => engine.flyTo('loop') }; pickables.push(comp);

  const flare = new THREE.Group(); scene.add(flare); flare.position.set(9.3, 0, -3.5);
  mesh(new THREE.CylinderGeometry(0.1, 0.16, 6, 12), M.steelDark, flare, [0, 3, 0]);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(255,235,170,1)', 'rgba(255,90,10,0)'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  flame.position.set(0, 6.5, 0); flame.scale.set(0.9, 1.6, 1); flare.add(flame);
  const flareLight = new THREE.PointLight(0xff7a30, 0, 10, 2); flareLight.position.set(0, 6.4, 0.3); flare.add(flareLight);

  /* ---- 배관과 유동 입자 ---- */
  const path = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'catmullrom', 0.02);
  const pipes = [
    { c: path([[-3.0, 1.9, 0.6], [-1.6, 2.6, 0.5], [0.0, 5.3, 0.3], [0, 5.0, 0]]), col: 0x9fd0ff },
    { c: path([[0, 0.1, 0], [0.0, -0.05, 0.9], [1.8, 0.35, 0.9], [3.4, 1.0, 0.2]]), col: 0xffb15e },
    { c: path([[3.4, 1.0, -0.8], [5.2, 1.1, -0.8], [6.3, 2.4, -0.4], [6.3, 2.9, -0.4]]), col: 0xffe0a8 },
    { c: path([[6.3, 0.5, -0.4], [6.3, 0.2, 1.4], [-1.0, 0.2, 1.5], [-3.0, 0.8, 1.2]]), col: 0x9fd0ff },
    { c: path([[6.3, 2.9, -0.4], [7.6, 3.4, -1.5], [9.3, 5.0, -3.5]]), col: 0xffa04a },
  ];
  const packets = [];
  pipes.forEach((p, i) => {
    mesh(new THREE.TubeGeometry(p.c, 80, 0.07, 10, false), M.pipe, scene, [0, 0, 0]);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: p.col, transparent: true, opacity: 0.9 }), 16);
    scene.add(im); packets.push({ im, c: p.c, off: i * 0.13 });
  });
  const dm = new THREE.Object3D();

  /* ---- 압력계·경고등 ---- */
  const gauge = new THREE.Group(); gauge.position.set(1.6, 1.7, 1.4); scene.add(gauge);
  mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 10), M.steelDark, gauge, [0, -0.85, 0]);
  mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 40), M.brass, gauge, [0, 0, 0]).rotation.x = Math.PI / 2;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), new THREE.MeshStandardMaterial({ map: dialFace(300, '#e9e2d0', '#1b1710', 'bar'), roughness: 0.6 })); face.position.z = 0.056; gauge.add(face);
  const needle = new THREE.Group(); needle.position.z = 0.07; gauge.add(needle);
  mesh(new THREE.BoxGeometry(0.02, 0.24, 0.01), new THREE.MeshBasicMaterial({ color: 0xb02a1a }), needle, [0, 0.1, 0], false);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x3a0e0a, emissive: 0xff2a10, emissiveIntensity: 0 });
  mesh(new THREE.SphereGeometry(0.1, 16, 12), lampMat, gauge, [0.55, 0.15, 0], false);
  const lampLight = new THREE.PointLight(0xff3010, 0, 5, 2); lampLight.position.set(1.6, 1.9, 1.6); scene.add(lampLight);

  /* ---- 1909년 실험대 ---- */
  const bench = new THREE.Group(); bench.position.set(-10.5, 0, 2.2); scene.add(bench);
  mesh(new THREE.BoxGeometry(3.0, 0.1, 1.3), M.wood, bench, [0, 0.92, 0]);
  for (const [x, z] of [[-1.35, -0.55], [1.35, -0.55], [-1.35, 0.55], [1.35, 0.55]]) mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), M.wood, bench, [x, 0.45, z]);
  const furnaceMat = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.7, metalness: 0.5, emissive: 0xff5a10, emissiveIntensity: 0 });
  const tube = mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.5, 24), furnaceMat, bench, [0, 1.25, 0]); tube.rotation.z = Math.PI / 2;
  for (let k = 0; k < 6; k++) { const r = mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 24), M.brass, bench, [-0.6 + k * 0.24, 1.25, 0]); r.rotation.y = Math.PI / 2; }
  mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), M.steelDark, bench, [-0.7, 1.12, 0]); mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), M.steelDark, bench, [0.7, 1.12, 0]);
  const bg = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), M.paintRed, bench, [-1.2, 1.42, 0.2]);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 20), M.paintGreen, bench, [1.2, 1.42, 0.2]);
  const bGauge = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ map: dialFace(300, '#e9e2d0', '#1b1710', 'atm') })); bGauge.position.set(0.0, 1.55, -0.3); bench.add(bGauge);
  const benchLight = new THREE.PointLight(0xff7a30, 0, 3, 2); benchLight.position.set(0, 1.4, 0.4); bench.add(benchLight);
  bench.userData.pick = { id: 'bench', label: '1909년 실험대', onClick: () => engine.flyTo('bench') }; pickables.push(bench);

  /* ---- 조명 ---- */
  scene.add(new THREE.HemisphereLight(0x9bb2c8, 0x2a2620, 1.0));
  const sun = new THREE.DirectionalLight(0xcfe0ee, 1.35); sun.position.set(-4, 9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 9, bottom: -4, near: 1, far: 30 }); sun.shadow.bias = -0.0004; scene.add(sun);
  const key = new THREE.SpotLight(0xffe7c4, 60, 16, 0.55, 0.6, 1.4); key.position.set(-1.5, 7.5, 4.2); key.target.position.set(0, 2, 0); scene.add(key, key.target);
  const benchSpot = new THREE.SpotLight(0xffd9a8, 24, 10, 0.7, 0.6, 1.5); benchSpot.position.set(-9.3, 4, 5); benchSpot.target.position.set(-10.5, 1, 2.2); scene.add(benchSpot, benchSpot.target);

  /* ---- 상태·애니메이션 ---- */
  const S = { beds: [], bedT: [0, 0, 0, 0], bedN: 3, flow: 0, flowT: 0.6, P: 0, PT: 0, alert: 0, alertOn: 0, cut: 1, cutT: 1, flare: 0, flareT: 0, frost: 0, frostT: 0, liquid: 0.3, bench: 0, benchT: 0 };
  const tmp = new THREE.Color();
  const api = {
    setBeds(temps) { S.bedN = temps.length; S.bedT = temps.concat([0, 0, 0, 0]).slice(0, 4); reactor.beds.forEach((b, i) => { b.g.visible = i < S.bedN; }); },
    setFlow(v) { S.flowT = v; },
    setPressure(bar) { S.PT = bar; },
    setAlert(on) { S.alertOn = on ? 1 : 0; },
    setCut(on) { S.cutT = on ? 1 : 0; },
    setFlare(v) { S.flareT = v; },
    setSeparator({ frost, liquid } = {}) { if (frost !== undefined) S.frostT = frost; if (liquid !== undefined) S.liquid = liquid; },
    setBench(glow) { S.benchT = glow; },
    reset() { api.setBeds([0, 0, 0]); S.flowT = 0.6; S.PT = 0; S.alertOn = 0; S.flareT = 0; S.frostT = 0; S.benchT = 0; S.cutT = 1; },
  };
  const k = (a, b, r, dt) => a + (b - a) * (1 - Math.exp(-r * dt));
  let angle = 0, tt = 0;
  const update = (dt, t) => {
    tt += dt * (0.3 + S.flow);
    S.flow = k(S.flow, S.flowT, 2, dt); S.P = k(S.P, S.PT, 1.4, dt); S.cut = k(S.cut, S.cutT, 3, dt);
    S.flare = k(S.flare, S.flareT, 2, dt); S.frost = k(S.frost, S.frostT, 1, dt); S.bench = k(S.bench, S.benchT, 1.2, dt);
    plane.constant = S.cut > 0.5 ? 0 : 50;
    let glow = 0;
    reactor.beds.forEach((b, i) => {
      const T = S.bedT[i]; tempColor(T, tmp); const e = Math.min(Math.max((T - 300) / 260, 0), 1);
      b.mat.color.lerp(tmp, 1 - Math.exp(-4 * dt)); b.mat.emissive.copy(tmp).multiplyScalar(0.9 * e); b.mat.emissiveIntensity = 1.3 * e; glow = Math.max(glow, e);
    });
    glowReactor.intensity = 7 * glow * (S.cut > 0.5 ? 1 : 0.3);
    angle += dt * (0.4 + S.flow * 3.4); fly.rotation.x = angle;
    needle.rotation.z = -(Math.PI * 0.75 + (Math.PI * 1.5 * Math.min(S.P / 300, 1))) + Math.PI * 1.5 * 0 + Math.PI * 0.0;
    needle.rotation.z = Math.PI * 0.75 - Math.PI * 1.5 * Math.min(S.P / 300, 1);
    const blink = S.alertOn ? 0.5 + 0.5 * Math.sin(t * 9) : 0;
    lampMat.emissiveIntensity = blink * 2.4; lampLight.intensity = blink * 6;
    flame.material.opacity = Math.min(S.flare * 1.2, 0.95); flame.scale.set(0.55 + S.flare * 0.7 + 0.1 * Math.sin(t * 17), 1.0 + S.flare * 1.3 + 0.2 * Math.sin(t * 13 + 1), 1); flareLight.intensity = S.flare * 9 * (0.8 + 0.2 * Math.sin(t * 21));
    frost.material.opacity = S.frost * 0.6; liq.scale.y = 0.4 + S.liquid * 1.6; liq.position.y = 0.25 + 0.3 * liq.scale.y;
    furnaceMat.emissiveIntensity = S.bench * 1.8; benchLight.intensity = S.bench * 2.5;
    packets.forEach((p) => { for (let i = 0; i < 16; i++) { const u = (tt * 0.22 + p.off + i / 16) % 1; const pt = p.c.getPoint(u); dm.position.copy(pt); dm.scale.setScalar(0.55 + S.flow * 0.6); dm.updateMatrix(); p.im.setMatrixAt(i, dm.matrix); } p.im.instanceMatrix.needsUpdate = true; });
  };

  const addLabels = () => {
    const L = (h, x, y, z) => engine.addLabel(h, V(x, y, z));
    L('<b>합성 반응기</b> 촉매층 3~4단', 0, 5.2, 0); L('<b>열교환기</b> 나가는 가스로 들어오는 가스를 예열', 3.4, 1.6, -0.2);
    L('<b>냉각 분리기</b> 암모니아를 액화', 6.3, 3.2, -0.4); L('<b>순환·압축기</b>', -4.4, 2.2, 0.6);
    L('<b>퍼지·플레어</b> 불활성 기체 배출', 9.3, 6.8, -3.5); L('<b>1909년 실험대</b> 오스뮴 촉매 관', -10.5, 2.0, 2.2);
  };

  return {
    scene, camera, pickables, api, labels, update,
    bloom: 0.6, bloomThreshold: 0.85, exposure: 1.35, vignette: 0.45, warm: 0.12,
    limits: { minDist: 1.2, maxDist: 32, minPolar: 0.35, maxPolar: 1.5, pan: true },
    views: {
      overview: { pos: [-0.5, 6.2, 23], target: [-0.6, 2.2, 0] },
      reactor: { pos: [2.6, 3.4, 6.6], target: [-0.6, 2.4, 0] },
      loop: { pos: [1.4, 3.6, 13.5], target: [0.8, 1.4, 0.2] },
      bench: { pos: [-8.4, 2.3, 6.2], target: [-10.8, 1.2, 2.2] },
    },
    startView: 'overview',
    attachLabels: addLabels,
    reset() { api.reset(); },
  };
}

/** 타이틀 장식용 소형 반응기 (절단 없음) */
export function buildReactorProp() {
  const M = materials();
  const r = buildReactor(M, null);
  r.beds.forEach((b, i) => { if (i < 3) { b.mat.color.set(0x8a2a10); b.mat.emissive.set(0xff6a10); b.mat.emissiveIntensity = 0.8 - i * 0.2; } });
  r.group.scale.setScalar(0.62);
  return r.group;
}
