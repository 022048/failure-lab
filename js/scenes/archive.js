// 타이틀 배경: 어두운 보관실, 사건별 상징 오브젝트를 받침대 위에 전시
import * as THREE from 'three';
import { materials, buildRetort } from './lavoisier.js';
import { buildReactorProp } from './haber.js';
import { concreteMaps, softDot } from './textures.js';

export function createArchiveScene(engine, cases) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a0e);
  scene.fog = new THREE.FogExp2(0x070a0e, 0.06);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  const M = materials(engine.env);
  const { map, rough } = concreteMaps('#3a4047', [10, 10], 30, 0.7);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0, envMapIntensity: 0.08, color: 0x6e7379 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const ped = (x, color) => {
    const g = new THREE.Group(); g.position.set(x, 0, 0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.5, 64), new THREE.MeshStandardMaterial({ color: 0x151a20, metalness: 0.7, roughness: 0.35 }));
    base.position.y = 0.25; base.castShadow = base.receiveShadow = true; g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.5; g.add(ring);
    scene.add(g); return g;
  };
  const p1 = ped(-2.6, 0xd3a355), p2 = ped(2.6, 0x6cc0dd);
  const rt = buildRetort(M, { sealed: true }); rt.group.scale.setScalar(3.4); rt.group.position.set(-3.0, 1.35, 0); p1.add(new THREE.Group());
  scene.add(rt.group); rt.solidMat.color.set(0xcfc9bb);
  const reactor = buildReactorProp(); reactor.position.set(2.6, 0.5, 0); scene.add(reactor);

  scene.add(new THREE.HemisphereLight(0x8aa4c8, 0x1a1410, 0.5));
  const l1 = new THREE.SpotLight(0xffd7a0, 220, 14, 0.5, 0.8, 2); l1.position.set(-4.4, 5.5, 3.5); l1.target.position.set(-2.8, 1.2, 0); l1.castShadow = false; l1.shadow.mapSize.set(1024, 1024); l1.shadow.bias = -0.0004;
  const l2 = new THREE.SpotLight(0xcfe6f0, 150, 14, 0.5, 0.8, 2); l2.position.set(4.6, 5.5, 3.5); l2.target.position.set(2.6, 2.4, 0); l2.castShadow = false; l2.shadow.mapSize.set(1024, 1024); l2.shadow.bias = -0.0004;
  scene.add(l1, l1.target, l2, l2.target);
  const rim = new THREE.DirectionalLight(0x6a86b0, 1.2); rim.position.set(0, 4, -6); scene.add(rim);

  const N = 300, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.03, map: softDot(), color: 0xaecbe8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })));

  const ctrl = {
    scene, camera, bloom: 0.5, bloomThreshold: 0.8, exposure: 1.35, vignette: 0.55,
    limits: { minDist: 4, maxDist: 14, minPolar: 0.9, maxPolar: 1.5, pan: false },
    views: { overview: { pos: [0, 2.3, 8.6], target: [0, 1.5, 0] } }, startView: 'overview',
    autoRotate: false,
    update(dt, t) {
      rt.group.rotation.y = t * 0.25; reactor.rotation.y = -t * 0.18;
      const a = Math.sin(t * 0.12) * 0.12; camera.position.x = Math.sin(a) * 8.6; camera.position.z = Math.cos(a) * 8.6;
      for (let i = 0; i < N; i++) { pos[i * 3 + 1] += dt * 0.03; if (pos[i * 3 + 1] > 6) pos[i * 3 + 1] = 0; }
      pg.attributes.position.needsUpdate = true;
    },
    dispose() {},
  };
  return ctrl;
}
