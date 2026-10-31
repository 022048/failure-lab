// 렌더 엔진: PBR 렌더러 + 후처리(블룸·비네트·그레인) + 카메라 이동 + 3D 라벨 + 오브젝트 선택
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.42 }, grain: { value: 0.025 }, warm: { value: 0.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, vig, grain, warm; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      float ca = 0.0016 * dot(c,c) * 4.0;                      // 가장자리 색수차(아주 약하게)
      vec3 col = vec3(texture2D(tDiffuse, uv + c*ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c*ca).b);
      float v = smoothstep(0.85, 0.2, length(c) * (1.0 + vig));
      col *= mix(1.0 - vig, 1.0, v);
      col += (rnd(uv * 1400.0 + time) - 0.5) * grain;
      col = mix(col, col * vec3(1.05, 1.0, 0.93), warm);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Engine {
  constructor(host, labelHost) {
    this.host = host;
    this.labelHost = labelHost;
    this.quality = 'high';
    this.inset = { left: 0, right: 0, top: 0, bottom: 0 };
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    const r = this.renderer;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.localClippingEnabled = true;
    host.appendChild(r.domElement);
    this.clock = new THREE.Clock();
    this.time = 0;
    this.ctrl = null;
    this.tween = null;
    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hover = null;
    this.down = null;
    this.pmrem = new THREE.PMREMGenerator(r);
    this.envTex = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    r.domElement.addEventListener('pointermove', (e) => this._move(e));
    r.domElement.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY }; });
    r.domElement.addEventListener('pointerup', (e) => this._up(e));
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  get env() { return this.envTex; }
  /** 자동 검증용: 렌더 루프를 멈추고 n프레임만 진행 */
  step(n = 1) { this.paused = true; for (let i = 0; i < n; i++) { this._once = true; this._loop(); } }

  /** UI 패널이 가리는 영역을 빼고 장면을 가운데 놓는다 (px) */
  setInset(i) { this.inset = { left: 0, right: 0, top: 0, bottom: 0, ...i }; this.resize(true); }

  setQuality(q) {
    this.quality = q;
    this.resize(true);
    if (this.ctrl) this._buildComposer();
  }

  /** 장면 컨트롤러: {scene, camera, views, limits, update(dt,t), pickables, labels, bloom, exposure, dispose} */
  setScene(ctrl, viewName = null) {
    if (this.ctrl?.dispose) this.ctrl.dispose();
    this.clearLabels();
    this.ctrl = ctrl;
    ctrl.labels = [];
    ctrl.scene.environment = ctrl.scene.environment || this.envTex;
    if (!this.controls) {
      this.controls = new OrbitControls(ctrl.camera, this.renderer.domElement);
    } else {
      this.controls.object = ctrl.camera;
    }
    const c = this.controls;
    c.enableDamping = true; c.dampingFactor = 0.07; c.rotateSpeed = 0.55; c.zoomSpeed = 0.7; c.panSpeed = 0.6;
    const L = ctrl.limits || {};
    c.minDistance = L.minDist ?? 0.4; c.maxDistance = L.maxDist ?? 30;
    c.minPolarAngle = L.minPolar ?? 0.15; c.maxPolarAngle = L.maxPolar ?? Math.PI / 2 - 0.02;
    c.minAzimuthAngle = L.minAz ?? -Infinity; c.maxAzimuthAngle = L.maxAz ?? Infinity;
    c.autoRotate = !!ctrl.autoRotate; c.autoRotateSpeed = ctrl.autoRotateSpeed ?? 0.5;
    c.enablePan = L.pan ?? true;
    this.renderer.toneMappingExposure = ctrl.exposure ?? 1.0;
    this.resize(true);
    this._buildComposer();
    const v = ctrl.views?.[viewName || ctrl.startView || 'overview'];
    if (v) this.snapTo(v);
    c.update();
    this.currentView = viewName || ctrl.startView || 'overview';
    ctrl.attachLabels?.();
  }

  _buildComposer() {
    const r = this.renderer, ctrl = this.ctrl;
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
      type: THREE.HalfFloatType, samples: this.quality === 'high' ? 4 : 0,
    });
    this.composer?.dispose();
    const comp = new EffectComposer(r, rt);
    comp.setPixelRatio(pr);
    comp.setSize(size.x, size.y);
    comp.addPass(new RenderPass(ctrl.scene, ctrl.camera));
    this.bloom = new UnrealBloomPass(size, ctrl.bloom ?? 0.5, 0.65, ctrl.bloomThreshold ?? 0.85);
    this.bloom.enabled = this.quality === 'high';
    comp.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.grade.uniforms.vig.value = ctrl.vignette ?? 0.42;
    this.grade.uniforms.warm.value = ctrl.warm ?? 0;
    comp.addPass(this.grade);
    comp.addPass(new OutputPass());
    this.composer = comp;
  }

  resize(force) {
    const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
    const pr = this.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    if (this.ctrl) {
      const cam = this.ctrl.camera, I = this.inset;
      cam.aspect = w / h;
      const dx = (I.left - I.right) / 2, dy = (I.top - I.bottom) / 2;
      if (dx || dy) cam.setViewOffset(w, h, -dx, -dy, w, h); else cam.clearViewOffset();
      cam.updateProjectionMatrix();
      if (!force && this.composer) { this.composer.setPixelRatio(pr); this.composer.setSize(w, h); }
    }
  }

  /* ----- 카메라 ----- */
  snapTo(v) {
    this.ctrl.camera.position.set(...v.pos);
    this.controls.target.set(...v.target);
    this.controls.update();
  }
  flyTo(name, dur = 1.5) {
    const v = typeof name === 'string' ? this.ctrl.views?.[name] : name;
    if (!v) return;
    this.currentView = typeof name === 'string' ? name : null;
    const cam = this.ctrl.camera;
    this.tween = {
      t: 0, dur,
      p0: cam.position.clone(), p1: new THREE.Vector3(...v.pos),
      t0: this.controls.target.clone(), t1: new THREE.Vector3(...v.target),
    };
    this.onView?.(this.currentView);
  }

  /* ----- 3D 라벨 ----- */
  addLabel(html, position, cls = '') {
    const el = document.createElement('div');
    el.className = 'tag3d ' + cls;
    el.innerHTML = html;
    this.labelHost.appendChild(el);
    const rec = { el, pos: position, visible: true };
    (this.ctrl.labels ||= []).push(rec);
    return rec;
  }
  clearLabels() { this.labelHost.innerHTML = ''; if (this.ctrl) this.ctrl.labels = []; }

  /* ----- 오브젝트 선택 ----- */
  _ndc(e) {
    const rc = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
  }
  _pick() {
    if (!this.ctrl?.pickables?.length) return null;
    this.ray.setFromCamera(this.pointer, this.ctrl.camera);
    const hit = this.ray.intersectObjects(this.ctrl.pickables, true)[0];
    if (!hit) return null;
    let o = hit.object;
    while (o && !o.userData.pick) o = o.parent;
    return o || null;
  }
  _move(e) {
    this._ndc(e);
    const o = this._pick();
    if (o !== this.hover) { this.hover = o; this.renderer.domElement.style.cursor = o ? 'pointer' : ''; this.onHover?.(o?.userData.pick || null); }
  }
  _up(e) {
    if (!this.down) return;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
    this.down = null;
    if (moved > 5) return;
    this._ndc(e);
    const o = this._pick();
    if (o) o.userData.pick.onClick?.();
  }

  /* ----- 루프 ----- */
  _loop() {
    requestAnimationFrame(this._loop);
    const ctrl = this.ctrl;
    if (!ctrl || !this.composer || (this.paused && !this._once)) return;
    this._once = false;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt / tw.dur;
      const k = ease(Math.min(tw.t, 1));
      ctrl.camera.position.lerpVectors(tw.p0, tw.p1, k);
      this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    ctrl.update?.(dt, this.time);
    this.grade.uniforms.time.value = this.time % 10;
    this.composer.render(dt);
    // 라벨 투영
    const w = this.renderer.domElement.clientWidth, h = this.renderer.domElement.clientHeight;
    const v = new THREE.Vector3();
    for (const l of ctrl.labels || []) {
      v.copy(l.pos.isVector3 ? l.pos : l.pos.getWorldPosition(new THREE.Vector3())).project(ctrl.camera);
      const vis = l.visible !== false && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      l.el.style.display = vis ? '' : 'none';
      if (vis) l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }
}
