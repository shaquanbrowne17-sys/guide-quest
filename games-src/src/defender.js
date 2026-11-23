/* Body Temple Defender: "Know ye not that your body is the temple of the Holy Ghost?" (1 Corinthians 6:19)
   The Pathfinder guards the temple with a bow. Shoot what harms the body, let the good things in. */
import { THREE, clamp, lerp, damp, rng, hash, today, pick, shuffle, G, P, merge, mesh, MAT, sign, sprite, setSky, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { loadKit, kit } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { PRESSURES } from './themes.js';

Object.assign(BUILD, {
  temple: () => { const p = [P(G.box(12, 0.5, 8), '#E9E2D3', [0, 0.25, 0]), P(G.box(10.6, 0.5, 6.8), '#F1ECE1', [0, 0.75, 0]), P(G.box(9.2, 0.5, 5.6), '#F7F3EA', [0, 1.25, 0])];
    for (let i = 0; i < 6; i++) { const x = -3.9 + i * 1.56; p.push(P(G.cyl(0.32, 0.36, 4.2, 12), '#FFFFFF', [x, 3.6, -2.2]), P(G.box(0.8, 0.22, 0.8), '#E9E2D3', [x, 5.75, -2.2]), P(G.box(0.8, 0.22, 0.8), '#E9E2D3', [x, 1.6, -2.2])); }
    p.push(P(G.box(9.4, 4.2, 0.3), '#EFE8DA', [0, 3.6, 2.3]), P(G.box(9.6, 0.5, 5.4), '#E9E2D3', [0, 6.0, 0]), P(G.cyl(0, 5.6, 2.2, 3), '#F7F3EA', [0, 7.3, 0], [Math.PI / 2, 0, Math.PI / 2], [1, 2.75, 1]),
      P(G.box(9.8, 0.16, 0.2), '#D4A93A', [0, 6.28, -2.75]), P(G.box(2.2, 3.4, 0.2), '#D4A93A', [0, 3.2, 2.1]), P(G.box(1.8, 3.0, 0.22), '#FFE9A8', [0, 3.1, 2.08]));
    return merge(p); },
  // the bow: grip at the origin, limbs bending away toward -z, string toward the archer (+z)
  bow: () => merge([P(G.tor(0.62, 0.035, 5, 16, Math.PI * 0.78), '#6E4424', [-0.62, 0, 0], [0, 0, -Math.PI * 0.39]), P(G.box(0.08, 0.26, 0.08), '#2A1A10', [0, 0, 0]), P(G.box(0.008, 1.17, 0.008), '#F4EFE2', [-0.41, 0, 0])]).rotateY(Math.PI / 2),
  arrow: () => merge([P(G.cyl(0.018, 0.018, 1.0, 5), '#C9A46A', [0, 0, 0], [Math.PI / 2, 0, 0]), P(G.cone(0.05, 0.16, 6), '#9AA3AE', [0, 0, -0.56], [-Math.PI / 2, 0, 0]),
    P(G.box(0.012, 0.09, 0.18), '#D3243A', [0, 0.04, 0.42]), P(G.box(0.09, 0.012, 0.18), '#F2C14E', [0, 0, 0.42])]),
  bible: () => merge([P(G.box(0.62, 0.16, 0.85), '#5A2A1E', [0, 0, 0]), P(G.box(0.58, 0.13, 0.8), '#F4EFE2', [0.03, 0, 0]), P(G.box(0.05, 0.28, 0.2), '#D4A93A', [-0.3, 0.02, 0], null, [1, 0.6, 1])]),
  moon: () => merge([P(G.tor(0.4, 0.14, 6, 14, Math.PI * 1.2), '#F2E2A0', [0, 0, 0], [0, 0, -0.6])]),
  sun: () => merge([P(G.ico(0.42, 1), '#F7C948', [0, 0, 0]), ...Array.from({ length: 8 }, (_, i) => P(G.cone(0.1, 0.28, 4), '#F7A928', [Math.cos(i * Math.PI / 4) * 0.6, Math.sin(i * Math.PI / 4) * 0.6, 0], [0, 0, i * Math.PI / 4 - Math.PI / 2]))]),
  sneaker: () => merge([P(G.box(0.36, 0.22, 0.8), '#2F6DB5', [0, 0.11, 0]), P(G.box(0.38, 0.08, 0.84), '#F4F4F4', [0, 0, 0]), P(G.box(0.3, 0.2, 0.3), '#2F6DB5', [0, 0.28, 0.2])]),
  star: () => merge([P(G.ico(0.42, 0), '#F2C14E', [0, 0, 0], null, [1, 1, 0.45])]),
});

const GOOD = [['water', '💧 Water'], ['mango', '🥭 Fruit'], ['bible', '📖 God’s Word'], ['moon', '🌙 Sleep'], ['sun', '☀️ Sunshine'], ['sneaker', '🏃 Exercise']];
const BAD = ['vape', 'cigarette', 'alcohol', 'hookah', 'energy', 'lean', 'pills', 'junk', 'betting'];

export const DEFENDERS = {
  temple: {
    key: 'temple', gid: 'defend:temple', title: 'Body Temple Defender', topic: 'fitness', icon: '🏹', music: 'run', kind: 'defend',
    blurb: '“Your body is the temple of the Holy Ghost” (1 Corinthians 6:19). Shoot what harms it. Let water, fruit, sleep and God’s Word in.',
    howTo: 'Hold to draw the bow, slide to aim, let go to shoot',
    sky: { top: '#3F6FB4', bottom: '#F4B677', fogNear: 60, fogFar: 160, sun: '#FFD8A8', sunI: 2.2, sunPos: [-8, 9, 6], hemi: 1.45, skyLight: '#E3E8FF', groundLight: '#5E6A3A' },
    modes: { practice: ['🎯', 'Practice', 'Slow, and the temple takes no damage.'], levels: ['🪜', 'Levels', '10 levels. More waves, faster.'], endless: ['♾️', 'Endless', 'Wave after wave. Beat the class.'], daily: ['📅', 'Daily Challenge', 'The same waves for everyone today.'] },
    levels: 10,
  },
};

const MAXH = 5;
export class Defender {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = DEFENDERS[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui; this.noSwipe = true;
    this.seed = mode === 'daily' ? hash(today() + key) : (Math.random() * 1e9) >>> 0; this.r = rng(this.seed);
    this.level = mode === 'levels' ? (this.opt.level || 1) : 0;
  }
  async load(progress) {
    this.eng.zoom(0.8); progress && progress(0.1); await loadKit(['tree_default', 'tree_oak', 'tree_pineTallA_detailed', 'plant_bushLarge', 'rock_largeA', 'flower_yellowA', 'flower_redA']); progress && progress(0.5);
    this.pc = await makeCharacter(myLook()); progress && progress(0.9); this.build(); progress && progress(1);
  }
  build() {
    const { scene } = this.eng; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky);
    const g = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshLambertMaterial({ color: '#6E9E4A' })); g.rotation.x = -Math.PI / 2; scene.add(g);
    const path = mesh(merge([P(G.box(3.2, 0.04, 70), '#C9B28A', [0, 0.02, -32])])); scene.add(path);
    const r = rng(7);
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 22 + r() * 70, x = Math.sin(a) * d, z = -Math.abs(Math.cos(a)) * d - 6; if (Math.abs(x) < 6 && z > -60) continue;
      const t = kit(pick(r, ['tree_default', 'tree_oak', 'tree_pineTallA_detailed', 'plant_bushLarge', 'rock_largeA']), null, 3 + r() * 3); if (t) { t.position.set(x, 0, z); t.rotation.y = r() * 6; scene.add(t); } }
    for (let i = 0; i < 40; i++) { const f = kit(pick(r, ['flower_yellowA', 'flower_redA']), null, 3); if (f) { f.position.set((r() - 0.5) * 30, 0, -r() * 40 - 4); scene.add(f); } }
    for (let i = 0; i < 4; i++) { const h = mesh(prop('hill', 30 + i * 5, i % 2 ? '#5E8F3E' : '#6E9E4A')); h.position.set((i - 1.5) * 60, -4, -150); scene.add(h); }
    this.temple = mesh(prop('temple')); this.temple.position.set(0, 0, 16); scene.add(this.temple);
    const vs = sign(['Your body is the temple', '1 Corinthians 6:19'], 6, 1.1, { bg: '#1F4D3A', fg: '#F2C14E', r: 14 }); vs.position.set(0, 7.1, 11.9); vs.rotation.y = Math.PI; scene.add(vs);
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(10, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7FC4FF', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    this.dome.position.set(0, 0, 8); this.dome.visible = false; scene.add(this.dome);
    scene.add(this.pc.root); this.pc.root.position.set(0, 0, 2.6); this.pc.root.rotation.y = Math.PI; this.pc.play('Idle_Loop');
    this.bow = mesh(prop('bow')); scene.add(this.bow); this.nock = mesh(prop('arrow')); scene.add(this.nock);
    this.reticle = sprite(['◎'], 1.2, 1.2, { bg: null, fg: '#FFE27A', w: 128, h: 128 }); this.reticle.visible = false; scene.add(this.reticle);
    this.arrows = []; this.items = []; this.bits = [];
    this.reset();
  }
  reset() {
    this.items.forEach(o => this.eng.scene.remove(o.obj)); this.arrows.forEach(a => this.eng.scene.remove(a.m)); this.bits.forEach(b => this.eng.scene.remove(b.m));
    this.items = []; this.arrows = []; this.bits = [];
    this.score = 0; this.hearts = this.mode === 'practice' ? Infinity : MAXH; this.wave = 0; this.waveLeft = 0; this.spawnT = 0; this.breakT = 1.5; this.t = 0;
    this.shots = 0; this.hits = 0; this.letIn = 0; this.goodHit = 0; this.facts = []; this.shield = 0; this.triple = 0; this.slow = 0; this.combo = 0;
    this.drawing = false; this.cool = 0; this.aim = new THREE.Vector3(0, 2, -30); this.yaw = 0; this.ended = false; this.state = 'intro'; this.introT = 0;
    this.wavesToWin = this.level ? 2 + Math.floor(this.level / 2) : Infinity;
    this.hud(true);
  }
  waveCfg(i) {
    const d = this.level ? this.level - 1 + i * 0.6 : this.mode === 'practice' ? 0 : i - 1;
    return { n: 8 + Math.round(d * 2.5), every: Math.max(0.5, 1.45 - d * 0.085), speed: this.mode === 'practice' ? 3.5 : Math.min(11.5, 4.5 + d * 0.55), good: 0.26, zig: Math.min(0.5, d * 0.05) };
  }

  /* ---------- aiming and shooting ---------- */
  rayAt(x, y) { const v = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(v, this.eng.camera); return rc.ray; }
  aimAt(x, y) {
    const ray = this.rayAt(x, y); let best = null, bd = 1e9;
    for (const o of this.items) { if (o.dead) continue; const p = o.obj.position, d = ray.distanceToPoint(p), dist = ray.origin.distanceTo(p); const lim = 1.4 + dist * 0.025; if (d < lim && d / lim < bd) { bd = d / lim; best = o; } }
    this.target = best;
    if (best) this.aim.copy(best.obj.position); else ray.at(45, this.aim);
    if (this.aim.y < 0.3) this.aim.y = 0.3;
    this.reticle.visible = true; this.reticle.position.copy(this.aim); this.reticle.material.color.set(best ? '#FF8A7A' : '#FFE27A');
  }
  press(x, y) { if (this.state === 'intro') { this.go(); return; } if (this.state !== 'play') return; this.drawing = true; this.aimAt(x, y); this.pc.play('Pistol_Aim_Neutral', { fade: 0.1 }); }
  drag(x, y) { if (this.drawing) this.aimAt(x, y); }
  release(x, y) { if (!this.drawing) return; this.drawing = false; this.aimAt(x, y); this.fire(); setTimeout(() => { this.reticle.visible = false; }, 250); }
  input(dir) {}
  fire() {
    if (this.cool > 0) return; this.cool = 0.28; this.shots++; SND.shoot();
    const start = this.bowTip(), n = this.triple > 0 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      let tgt = this.aim.clone();
      if (this.target && !this.target.dead) { const tt = start.distanceTo(tgt) / 70; tgt.add(this.target.vel.clone().multiplyScalar(tt)); }
      if (k) { const side = new THREE.Vector3().subVectors(tgt, start).cross(new THREE.Vector3(0, 1, 0)).normalize(); tgt.addScaledVector(side, (k === 1 ? -1 : 1) * 2.2); }
      const dir = tgt.clone().sub(start), t = dir.length() / 70; const v = dir.divideScalar(t); v.y += 0.5 * 9 * t;
      const m = mesh(prop('arrow')); m.position.copy(start); this.eng.scene.add(m); this.arrows.push({ m, v, life: 2.2, prev: start.clone() });
    }
    this.pc.play('Spell_Simple_Shoot', { once: true, fade: 0.05, speed: 1.6 }); clearTimeout(this._idleT); this._idleT = setTimeout(() => { if (this.state === 'play' && !this.drawing) this.pc.play('Idle_Loop', { fade: 0.25 }); }, 600);
  }
  bowTip() { const h = this.pc.bones.hand_l || this.pc.bones.hand_r; const p = new THREE.Vector3(); if (h) h.getWorldPosition(p); else p.set(0, 2.6, 2.6); return p; }
  go() { if (this.state !== 'intro') return; this.state = 'play'; SND.unlock(); SND.startMusic('run'); this.eng.watch = true; this.nextWave(); }
  nextWave() {
    this.wave++; const c = this.cfg = this.waveCfg(this.wave); this.waveLeft = c.n; this.spawnT = 1.2;
    this.ui.banner('Wave ' + this.wave, this.wave === 1 ? 'Shoot the harmful things. Let the good things in.' : this.wave % 3 === 0 ? 'Faster now!' : '', 2000);
  }

  /* ---------- the frame ---------- */
  idleView(dt) { this.pc.update(dt); this.placeBow(); const t = this.eng.time * 0.12, tall = innerHeight > innerWidth, R = tall ? 15 : 12; const c = this.eng.camera; c.position.set(Math.sin(t) * R, tall ? 7 : 6, 8 - Math.cos(t) * R); c.lookAt(0, tall ? -2 : 3, 8); }
  update(dt) {
    const pc = this.pc; pc.update(dt); const cam = this.eng.camera;
    if (this.state === 'intro') { this.introT += dt; const k = clamp((this.introT - 0.9) / 2.4, 0, 1), e = k * k * (3 - 2 * k);
      const V = this.view(0); cam.position.set(lerp(7, V[0], e), lerp(6, V[1], e), lerp(-9, V[2], e)); cam.lookAt(0, lerp(4.5, V[4], e), lerp(14, V[5], e)); this.placeBow(); if (this.opt.autostart && this.introT > 3.3) this.go(); return; }
    if (this.state === 'over' || this.state === 'won') { this.placeBow(); return; }
    const sdt = this.slow > 0 ? dt * 0.45 : dt; this.t += dt; this.cool -= dt;
    for (const k of ['triple', 'slow']) if (this[k] > 0) this[k] -= dt;
    // face the aim
    const ay = Math.atan2(this.aim.x - pc.root.position.x, -(this.aim.z - pc.root.position.z));
    this.yaw = damp(this.yaw, this.drawing || this.cool > 0 ? clamp(ay, -1.1, 1.1) : 0, 10, dt); pc.root.rotation.y = Math.PI - this.yaw;
    this.placeBow();
    // waves
    if (this.waveLeft > 0) { this.spawnT -= sdt; if (this.spawnT <= 0) { this.spawn(); this.waveLeft--; this.spawnT = this.cfg.every * (0.7 + this.r() * 0.6); } }
    else if (!this.items.some(o => !o.dead)) {
      this.breakT -= dt;
      if (this.breakT <= 0) { this.breakT = 2.2; if (this.wave >= this.wavesToWin) { this.end(true); return; } this.score += 200; this.ui.toast('Wave cleared +200', 'good'); this.nextWave(); }
    }
    this.moveItems(sdt); this.moveArrows(sdt); this.moveBits(dt);
    this.dome.visible = this.shield > 0; if (this.dome.visible) this.dome.material.opacity = 0.12 + Math.sin(this.eng.time * 4) * 0.05;
    const V = this.view(this.yaw); cam.position.set(damp(cam.position.x, V[0], 4, dt), V[1], V[2]); cam.lookAt(V[3], V[4], V[5]);
    this.hud();
  }
  /** over-the-shoulder camera: further back on a tall phone screen so the Pathfinder doesn't fill it */
  view(yaw) { return innerHeight > innerWidth ? [1.4 - yaw * 1.2, 4.3, 10.2, -yaw * 9, 1.7, -22] : [1.0 - yaw * 1.2, 3.3, 6.6, -yaw * 9, 2.4, -20]; }
  placeBow() {
    const h = this.pc.bones.hand_l, hr = this.pc.bones.hand_r; if (!h) return;
    h.getWorldPosition(this.bow.position); const dir = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.bow.rotation.set(0, -this.yaw, 0); this.bow.position.addScaledVector(dir, 0.05);
    this.nock.visible = this.state === 'play' && this.cool <= 0.05; if (hr && this.nock.visible) { const a = this.bow.position.clone(), b = new THREE.Vector3(); hr.getWorldPosition(b); this.nock.position.copy(a).lerp(b, 0.5); this.nock.lookAt(a.clone().addScaledVector(dir, 3)); this.nock.rotateY(Math.PI); }
  }
  spawn() {
    const c = this.cfg, good = this.r() < c.good, gold = !good && this.r() < 0.06;
    let id, obj, label, fact = '';
    if (gold) { id = 'star'; label = '⭐ Shoot me!'; obj = new THREE.Group(); obj.add(new THREE.Mesh(prop('star'), MAT.glow)); }
    else if (good) { const g = pick(this.r, GOOD); id = g[0]; label = g[1]; obj = new THREE.Group(); obj.add(mesh(prop(g[0]))); obj.children[0].scale.setScalar(2.0); }
    else { id = pick(this.r, BAD); const d = PRESSURES[id]; label = d.label; fact = d.fact; obj = new THREE.Group(); const m = mesh(prop(d.prop)); m.scale.setScalar(0.8); m.position.y = -0.9; obj.add(m); }
    const sp = sprite([label], 2.7, 0.7, { bg: good ? 'rgba(20,90,50,.85)' : gold ? 'rgba(120,90,10,.85)' : 'rgba(110,20,20,.85)', fg: '#FFFFFF', r: 60 }); sp.position.y = good ? 1.0 : 1.35; obj.add(sp);
    const x = (this.r() - 0.5) * 24, y = 1.2 + this.r() * 4.2, z = -44 - this.r() * 8; obj.position.set(x, y, z); this.eng.scene.add(obj);
    const target = new THREE.Vector3((this.r() - 0.5) * 4, 1.6 + this.r() * 2, 4);
    const vel = target.clone().sub(obj.position).normalize().multiplyScalar(c.speed * (gold ? 1.3 : 1) * (0.85 + this.r() * 0.3));
    this.items.push({ id, obj, vel, good, gold, fact, label, zig: this.r() < c.zig ? 2 + this.r() * 2 : 0, ph: this.r() * 6, r: good ? 0.9 : 1.0 });
  }
  moveItems(dt) {
    for (const o of this.items) {
      if (o.dead) continue;
      o.obj.position.addScaledVector(o.vel, dt);
      if (o.zig) o.obj.position.x += Math.sin(this.t * 2.2 + o.ph) * o.zig * dt;
      o.obj.position.y += Math.sin(this.t * 3 + o.ph) * 0.3 * dt; o.obj.children[0].rotation.y += dt * 1.5;
      if (o.obj.position.z > 3.2) { o.dead = true; this.eng.scene.remove(o.obj); this.reach(o); }
    }
    this.items = this.items.filter(o => !o.dead || o.obj.parent);
  }
  reach(o) {
    if (o.gold) return;
    if (o.good) { this.letIn++; this.score += 30; if (this.hearts !== Infinity && this.hearts < MAXH) { this.hearts++; this.ui.toast(o.label + ' got in: +1 ❤️', 'good'); } else this.ui.toast(o.label + ' got in: +30', 'good'); SND.good(); return; }
    if (this.shield > 0) { this.shield--; SND.pop(); this.ui.toast('🛡️ The armour of God blocked it', 'good'); this.burst(new THREE.Vector3(o.obj.position.x, 2.5, 3), '#7FC4FF'); return; }
    SND.hit(); this.combo = 0; if (this.hearts !== Infinity) this.hearts--; this.ui.fact(o.label, o.fact, this.hearts);
    if (!this.facts.some(f => f[0] === o.label)) this.facts.push([o.label, o.fact]);
    this.burst(new THREE.Vector3(o.obj.position.x, 2.5, 3), '#B5452C');
    if (this.hearts <= 0) this.end(false);
  }
  moveArrows(dt) {
    for (const a of this.arrows) {
      a.prev.copy(a.m.position); a.v.y -= 9 * dt; a.m.position.addScaledVector(a.v, dt); a.life -= dt;
      a.m.lookAt(a.m.position.clone().add(a.v)); a.m.rotateY(Math.PI);
      for (const o of this.items) { if (o.dead) continue; const seg = new THREE.Line3(a.prev, a.m.position), cp = new THREE.Vector3(); seg.closestPointToPoint(o.obj.position, true, cp);
        if (cp.distanceTo(o.obj.position) < o.r) { o.dead = true; a.life = 0; this.eng.scene.remove(o.obj); this.hit(o); break; } }
      if (a.m.position.y < 0) a.life = 0;
    }
    this.arrows = this.arrows.filter(a => { if (a.life <= 0) { this.eng.scene.remove(a.m); return false; } return true; });
  }
  hit(o) {
    const p = o.obj.position.clone();
    if (o.gold) { const k = pick(this.r, ['shield', 'triple', 'slow']); SND.power(); this.burst(p, '#F2C14E');
      if (k === 'shield') { this.shield = 3; this.ui.toast('🛡️ Armour of God: blocks the next 3 hits (Ephesians 6:11)', 'good'); }
      else if (k === 'triple') { this.triple = 12; this.ui.toast('🏹 Three arrows at once!', 'good'); }
      else { this.slow = 8; this.ui.toast('⏳ Patience: everything slows down (Galatians 5:22)', 'good'); }
      this.score += 50; return; }
    if (o.good) { this.goodHit++; this.combo = 0; this.score = Math.max(0, this.score - 40); SND.bad(); this.burst(p, '#5FD08A'); this.ui.toast('Oops! ' + o.label + ' is good for you. Let it in.', 'bad'); return; }
    this.hits++; this.combo++; const pts = 50 + Math.min(this.combo, 10) * 10; this.score += pts; SND.pop(); this.burst(p, '#FFFFFF');
    if (this.combo > 0 && this.combo % 5 === 0) this.ui.toast(this.combo + ' in a row! +' + pts, 'good');
  }
  burst(p, col) { for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(p); this.eng.scene.add(m); this.bits.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8), life: 0.7 }); } }
  moveBits(dt) { this.bits = this.bits.filter(b => { b.life -= dt; b.v.y -= 14 * dt; b.m.position.addScaledVector(b.v, dt); b.m.scale.setScalar(Math.max(0.01, b.life / 0.7)); if (b.life <= 0) { this.eng.scene.remove(b.m); return false; } return true; }); }
  end(won) {
    if (this.ended) return; this.ended = true; this.state = won ? 'won' : 'over'; this.eng.watch = false; SND.stopMusic(); this.reticle.visible = false;
    if (won) { SND.win(); this.pc.play('Dance_Loop', { fade: 0.3 }); } else this.pc.play('Death01', { once: true, fade: 0.2 });
    const lost = this.hearts === Infinity ? 0 : MAXH - Math.max(0, this.hearts);
    const res = { won, score: Math.round(this.score), level: this.level, stars: won ? (lost === 0 ? 3 : lost <= 2 ? 2 : 1) : 0, title: won ? 'Level ' + this.level + ': the temple stands!' : this.mode === 'levels' ? 'The temple fell. Try again!' : 'Wave ' + this.wave + ' reached',
      stats: [[Math.round(this.score), 'points'], [this.wave, 'waves'], [this.hits, 'harmful stopped'], [this.letIn, 'good let in']], list: ['What you learned', this.facts], correct: 0, wrong: 0, dodged: {} };
    if (this.goodHit) res.list[1] = res.list[1].concat([['Remember', 'You shot ' + this.goodHit + ' good thing' + (this.goodHit > 1 ? 's' : '') + '. Water, fruit, sleep, sunshine, exercise and God’s Word build your body up.']]);
    setTimeout(() => this.ui.end(res), 1500);
  }
  hud(force) { this.ui.hud({ score: Math.round(this.score), coins: this.hits, coinIcon: '🏹', hearts: this.hearts, dist: this.wave, unit: '', target: null, shield: this.shield ? this.shield : 0, magnet: 0, double: this.triple > 0 ? this.triple : 0, badges: null, label: this.wave ? 'Wave ' + this.wave : 'Get ready' }, force); }
}
