/* Guide Quest 3D: the shared engine. Renderer, quality, input, sound, low-poly building blocks. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
export { THREE };

/* ---------- small helpers ---------- */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
export function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function today() { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
export function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
export function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- low-poly geometry with colours baked in (one draw call per prop) ---------- */
const _c = new THREE.Color();
export function paint(geo, color) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  _c.set(color);
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (geo.attributes.uv) geo.deleteAttribute('uv');
  return geo;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
/** A part: geometry, colour, position [x,y,z], rotation [x,y,z], scale [x,y,z] or number. */
export function P(geo, color, pos, rot, scl) {
  geo = paint(geo, color);
  _p.set(...(pos || [0, 0, 0])); _e.set(...(rot || [0, 0, 0])); _q.setFromEuler(_e);
  if (typeof scl === 'number') _s.set(scl, scl, scl); else _s.set(...(scl || [1, 1, 1]));
  _m.compose(_p, _q, _s); geo.applyMatrix4(_m);
  return geo;
}
export function merge(parts) { const g = mergeGeometries(parts.filter(Boolean), false); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }
export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  ball: (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h),
  cap: (r, l, s = 8) => new THREE.CapsuleGeometry(r, l, 3, s),
  tor: (r, t, rs = 6, ts = 12, arc) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  dod: (r) => new THREE.DodecahedronGeometry(r, 0),
  tri: (r, h) => new THREE.CylinderGeometry(r, r, h, 3),
};
export const MAT = {
  flat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
};
export function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat || MAT.flat); m.matrixAutoUpdate = true; return m; }
export function blob(r) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 16), MAT.shadow); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; return m; }

/* ---------- text and emoji signs (canvas textures) ---------- */
const texCache = new Map();
export function signTexture(lines, o = {}) {
  const key = JSON.stringify([lines, o]);
  if (texCache.has(key)) return texCache.get(key);
  const W = o.w || 512, H = o.h || 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  if (o.bg !== null) {
    x.fillStyle = o.bg || '#FFF8E8'; const r = o.r == null ? 36 : o.r;
    x.beginPath(); x.moveTo(r, 0); x.arcTo(W, 0, W, H, r); x.arcTo(W, H, 0, H, r); x.arcTo(0, H, 0, 0, r); x.arcTo(0, 0, W, 0, r); x.fill();
    if (o.border) { x.lineWidth = 14; x.strokeStyle = o.border; x.stroke(); }
  }
  x.fillStyle = o.fg || '#2A1C10'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const L = Array.isArray(lines) ? lines : [lines], sizes = o.sizes || L.map((_, i) => i === 0 && L.length > 1 && o.big ? H * 0.42 : H * (L.length > 2 ? 0.24 : L.length > 1 ? 0.3 : 0.5));
  const total = sizes.reduce((a, b) => a + b * 1.08, 0); let y = H / 2 - total / 2;
  L.forEach((t, i) => {
    let s = sizes[i]; x.font = '800 ' + s + 'px Figtree, system-ui, "Segoe UI", Roboto, sans-serif, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"';
    while (x.measureText(t).width > W * 0.9 && s > 10) { s -= 2; x.font = '800 ' + s + 'px Figtree, system-ui, "Segoe UI", Roboto, sans-serif, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji"'; }
    y += sizes[i] * 0.54; x.fillText(t, W / 2, y); y += sizes[i] * 0.54;
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
export function sign(lines, w, h, o = {}) {
  if (!o.w) o = Object.assign({ w: 512, h: Math.max(64, Math.round(512 * h / w)) }, o);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(lines, o), transparent: true, side: THREE.DoubleSide, fog: o.fog !== false }));
  return m;
}
export function sprite(lines, w, h, o = {}) {
  if (!o.w) o = Object.assign({ w: 512, h: Math.max(64, Math.round(512 * h / w)) }, o);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(lines, o), transparent: true, depthWrite: false, fog: o.fog !== false }));
  s.scale.set(w, h, 1); return s;
}

/* ---------- quality: starts from a guess, drops a step if the phone struggles ---------- */
export const QUALITY = [
  { name: 'low', dpr: 0.75, aa: false, far: 110 },
  { name: 'medium', dpr: 1.25, aa: false, far: 140 },
  { name: 'high', dpr: 2, aa: true, far: 170 },
];
export function guessQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, guess = mem <= 2 || cores <= 4 ? 1 : 2;
  const saved = store('gq3d-q'); /* a phone that was slow last time starts one step higher than where it ended, and drops again if needed */
  return saved != null && QUALITY[saved] ? Math.min(guess, saved + 1) : guess;
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas; this.q = guessQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY[this.q].aa, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__gq3dTest });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, QUALITY[this.q].far);
    this.clock = new THREE.Clock(); this.time = 0; this.running = true; this.update = null;
    this.fps = { n: 0, t: 0, low: 0, checked: 0 };
    this.resize(); addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.frame());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.onHide) this.onHide(); });
  }
  setQuality(q) {
    this.q = clamp(q, 0, 2); store('gq3d-q', this.q);
    this.camera.far = QUALITY[this.q].far; this.camera.updateProjectionMatrix(); this.resize();
  }
  /** a game can narrow (k < 1) or widen the view; play() resets it to 1 */
  zoom(k) { this.fovMul = k; this.resize(); }
  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, QUALITY[this.q].dpr));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    /* phones held upright see less of the sides: widen the view so all three lanes fit */
    this.camera.fov = (w < h ? clamp(60 + (h / w - 1) * 22, 60, 82) : 58) * (this.fovMul || 1);
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }
  frame() {
    let dt = this.clock.getDelta(); if (dt > 0.05) dt = 0.05;
    if (window.__gq3dStep) dt = window.__gq3dStep;
    this.time += dt;
    if (this.update) this.update(dt);
    this.renderer.render(this.scene, this.camera);
    /* watch the frame rate during play and lower the quality once if it is too slow */
    if (this.watch) {
      const f = this.fps; f.n++; f.t += dt;
      if (f.t > 2.5) { const fps = f.n / f.t; f.n = 0; f.t = 0; f.checked++;
        if (fps < 38 && this.q > 0) { f.low++; if (f.low >= 2) { this.setQuality(this.q - 1); f.low = 0; } } else f.low = 0; }
    }
  }
}

/* ---------- input: swipes, taps and keys ---------- */
export class Input {
  constructor(el, on) {
    this.on = on; let sx = 0, sy = 0, st = 0, fired = false, down = false;
    el.addEventListener('pointerdown', e => { down = true; fired = false; sx = e.clientX; sy = e.clientY; st = performance.now(); if (on.press) on.press(e.clientX, e.clientY); });
    el.addEventListener('pointermove', e => {
      if (!down) return; if (on.drag) on.drag(e.clientX, e.clientY, e.clientX - sx, e.clientY - sy);
      if (fired || on.noSwipe) return; const dx = e.clientX - sx, dy = e.clientY - sy, d = Math.hypot(dx, dy);
      if (d > 28) { fired = true; on.swipe && on.swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }
    });
    const up = e => { if (!down) return; down = false; if (on.release) on.release(e.clientX, e.clientY);
      if (!fired && performance.now() - st < 350 && on.tap) on.tap(e.clientX, e.clientY); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { down = false; });
    this.keys = {};
    addEventListener('keydown', e => {
      if (e.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) && e.key === ' ') return;
      const k = e.key; this.keys[k] = true;
      const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up', ArrowDown: 'down', s: 'down', S: 'down' };
      if (map[k] && on.swipe && !e.repeat) { e.preventDefault(); on.swipe(map[k]); }
      if ((k === 'Escape' || k === 'p' || k === 'P') && on.pause) on.pause();
      if (on.key) on.key(k, e);
    });
    addEventListener('keyup', e => { this.keys[e.key] = false; });
  }
}

/* ---------- sound: small synthesised effects and a light music loop ---------- */
export const SND = {
  ctx: null, on: (() => { try { return localStorage.getItem('gq-sound') !== 'off'; } catch (e) { return true; } })(), musicOn: false, _mus: null,
  unlock() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination); } catch (e) { return; } } if (this.ctx.state === 'suspended') this.ctx.resume(); },
  toggle() { this.on = !this.on; try { localStorage.setItem('gq-sound', this.on ? 'on' : 'off'); } catch (e) {} if (!this.on) this.stopMusic(); return this.on; },
  tone(f, d, type = 'sine', v = 0.2, slide = 0, at = 0) {
    if (!this.on || !this.ctx) return; const t = this.ctx.currentTime + at, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, v = 0.15, at = 0, hp = 800) {
    if (!this.on || !this.ctx) return; const t = this.ctx.currentTime + at, n = this.ctx.sampleRate * d, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    s.buffer = b; g.gain.value = v; s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  coin() { this.tone(988, 0.07, 'square', 0.06); this.tone(1319, 0.12, 'square', 0.06, 0, 0.06); },
  jump() { this.tone(330, 0.18, 'triangle', 0.18, 330); },
  slide() { this.noise(0.25, 0.12, 0, 1200); },
  lane() { this.tone(520, 0.05, 'sine', 0.07); },
  hit() { this.tone(140, 0.3, 'sawtooth', 0.22, -80); this.noise(0.2, 0.2, 0, 200); },
  power() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, 0, i * 0.07)); },
  good() { [659, 880].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.18, 0, i * 0.09)); },
  bad() { this.tone(220, 0.35, 'square', 0.1, -60); },
  shoot() { this.tone(700, 0.12, 'triangle', 0.12, -400); this.noise(0.08, 0.06, 0, 2500); },
  pop() { this.tone(420, 0.09, 'sine', 0.16, 500); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.15, 0, i * 0.1)); },
  splash() { this.noise(0.35, 0.1, 0, 500); },
  startMusic(style = 'run') {
    if (!this.on || !this.ctx || this._mus) return; this.musicOn = true;
    const ctx = this.ctx, bpm = style === 'calm' ? 92 : 124, beat = 60 / bpm, g = ctx.createGain(); g.gain.value = style === 'calm' ? 0.12 : 0.1; g.connect(this.master);
    const bass = style === 'calm' ? [57, 57, 52, 52, 53, 53, 55, 55] : [45, 45, 52, 45, 48, 48, 50, 52], mel = style === 'calm' ? [69, 72, 76, 74, 72, 69, 67, 69] : [76, 79, 81, 79, 76, 74, 72, 74];
    let step = 0, next = ctx.currentTime + 0.05; const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const tick = () => {
      if (!this._mus) return;
      while (next < ctx.currentTime + 0.2) {
        const s = step % 16, bar = Math.floor(step / 16) % 8;
        const note = (f, d, type, v) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = type; o.frequency.value = f; e.gain.setValueAtTime(v, next); e.gain.exponentialRampToValueAtTime(0.001, next + d); o.connect(e); e.connect(g); o.start(next); o.stop(next + d + 0.02); };
        if (s % 4 === 0) note(hz(bass[bar]), beat * 0.9, 'triangle', 0.5);
        if (style !== 'calm' && s % 2 === 1) { const n = ctx.sampleRate * 0.03, b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 6000; e.gain.value = 0.25; src.buffer = b; src.connect(f); f.connect(e); e.connect(g); src.start(next); }
        if (s % 8 === 4 || (style === 'calm' && s % 8 === 0)) note(hz(mel[(bar + s) % 8]), beat * 1.2, 'sine', 0.22);
        if (style !== 'calm' && s % 8 === 0) note(60, 0.18, 'sine', 0.6);
        next += beat / 4; step++;
      }
      this._mus.t = setTimeout(tick, 60);
    };
    this._mus = { g }; tick();
  },
  stopMusic() { if (this._mus) { clearTimeout(this._mus.t); try { this._mus.g.disconnect(); } catch (e) {} this._mus = null; } this.musicOn = false; },
};

/* ---------- sky and light ---------- */
export function setSky(scene, o) {
  const top = new THREE.Color(o.top), bottom = new THREE.Color(o.bottom);
  const c = document.createElement('canvas'); c.width = 2; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(0.62, '#' + bottom.getHexString()); gr.addColorStop(1, '#' + bottom.getHexString());
  x.fillStyle = gr; x.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
  scene.fog = new THREE.Fog(bottom, o.fogNear || 45, o.fogFar || 130);
  scene.children.filter(c => c.isLight).forEach(l => scene.remove(l));
  const hemi = new THREE.HemisphereLight(o.skyLight || 0xffffff, o.groundLight || 0x8a7a5a, o.hemi || 1.6);
  const sun = new THREE.DirectionalLight(o.sun || 0xfff1d6, o.sunI || 1.9); sun.position.set(...(o.sunPos || [-6, 12, 8]));
  scene.add(hemi, sun); return { hemi, sun };
}
