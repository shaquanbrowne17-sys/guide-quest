/* The runner: three lanes, swipe to dodge, jump and slide. Modes: practice, levels, endless, daily. */
import { THREE, clamp, lerp, damp, rng, hash, today, pick, shuffle, MAT, mesh, sign, sprite, setSky, SND, store } from './core.js';
import { prop } from './props.js';
import { loadKit } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { THEMES, PRESSURES, TILE, groundTile, decor, backdrop, sea } from './themes.js';

const LANE = 2.1, LANES = [-LANE, 0, LANE], AHEAD = 122, BEHIND = 14;
const GRAV = -34, JUMP_V = 11.8;

export const LEVELS = 10;
export function levelPlan(L) { return { target: 380 + (L - 1) * 130, v0: 8.5 + (L - 1) * 0.6, v1: 11 + (L - 1) * 1.3, gates: 1 + Math.floor((L - 1) / 3), d0: Math.min(0.15 + (L - 1) * 0.085, 0.9) }; }

export class Runner {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = THEMES[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui;
    const seed = mode === 'daily' ? hash(today() + key) : (Math.random() * 1e9) >>> 0;
    this.r = rng(seed); this.seed = seed;
    this.level = mode === 'levels' ? (this.opt.level || 1) : 0; this.plan = this.level ? levelPlan(this.level) : null;
  }
  async load(progress) {
    const T = this.T; progress && progress(0.1);
    await loadKit(T.kit); progress && progress(0.5);
    this.pc = await makeCharacter(myLook()); progress && progress(0.9);
    this.build(); progress && progress(1);
  }
  build() {
    const { scene } = this.eng; const T = this.T;
    while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, T.sky);
    this.world = new THREE.Group(); scene.add(this.world);
    this.tiles = []; for (let i = 0; i < Math.ceil((AHEAD + BEHIND) / TILE) + 1; i++) { const t = groundTile(this.key); t.position.z = -(i * TILE) + TILE / 2; this.world.add(t); this.tiles.push(t); }
    this.back = backdrop(this.key, scene);
    this.sea = this.key === 'seawall' ? sea(scene) : null;
    scene.add(this.pc.root); this.pc.root.rotation.y = Math.PI;
    this.pc.play('Idle_Loop');
    // coins: one instanced mesh
    this.coinMesh = new THREE.InstancedMesh(prop('coin'), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#6B4A00', emissiveIntensity: 0.55 }), 220);
    this.coinMesh.count = 0; this.coinMesh.frustumCulled = false; this.world.add(this.coinMesh);
    this.shieldFx = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14), new THREE.MeshBasicMaterial({ color: '#7FC4FF', transparent: true, opacity: 0.22, depthWrite: false }));
    this.shieldFx.visible = false; this.pc.root.add(this.shieldFx); this.shieldFx.position.y = 1.0;
    this.reset();
  }
  reset() {
    (this.items || []).forEach(o => this.world.remove(o.obj)); (this.deco || []).forEach(o => this.world.remove(o));
    this.items = []; this.deco = []; this.coins = [];
    this.dist = 0; this.t = 0; this.v = 0; this.score = 0; this.coinN = 0; this.hearts = this.mode === 'practice' ? Infinity : 3;
    this.lane = 1; this.px = 0; this.y = 0; this.vy = 0; this.slide = 0; this.queueSlide = false; this.inv = 0; this.shake = 0; this.slow = 0;
    this.power = { shield: 0, magnet: 0, double: 0 }; this.shieldOn = false;
    this.nextRow = 32; this.nextSide = [6, 9]; this.nextBadge = 140; this.badges = []; this.badgeSets = 0;
    this.dodged = {}; this.hitFacts = []; this.correct = 0; this.wrong = 0; this.state = 'intro'; this.introT = 0; this.ended = false; this.hint = null;
    this.gq = this.T.gates(this.r); this.gi = 0;
    if (this.plan) { const n = this.plan.gates; this.gateAt = Array.from({ length: n }, (_, i) => Math.round(this.plan.target * (0.25 + 0.6 * (n === 1 ? 0.5 : i / (n - 1))))); }
    else this.gateAt = [];
    this.nextGate = this.plan ? this.gateAt.shift() : this.mode === 'practice' ? 240 : 260;
    this.tutorial = this.mode === 'practice' || (this.mode === 'levels' && this.level === 1) ? [{ s: 40, pat: 'tutLane', text: 'Swipe ← or → to change lanes' }, { s: 75, pat: 'tutJump', text: 'Swipe ↑ to jump' }, { s: 110, pat: 'tutSlide', text: 'Swipe ↓ to slide' }, { s: 140, pat: 'tutCoins', text: 'Collect the Pathfinder triangles' }] : [];
    if (this.tutorial.length) this.nextRow = 175;
    this.finishAt = this.plan ? this.plan.target : null; this.finishSpawned = false;
    this.pc.root.position.set(0, 0, 0); this.pc.root.visible = true; this.coinMesh.count = 0;
    this.spawnAhead(); this.hud(true);
  }

  /* ---------- speed and difficulty ---------- */
  speedNow() {
    if (this.mode === 'practice') return 8;
    if (this.plan) return lerp(this.plan.v0, this.plan.v1, clamp(this.dist / this.plan.target, 0, 1));
    return 9 + 16 * (1 - Math.exp(-this.t / 120));
  }
  diff() { return this.plan ? clamp(this.plan.d0 + this.dist / this.plan.target * 0.25, 0, 1) : this.mode === 'practice' ? 0.15 : clamp(this.t / 150, 0, 1); }

  /* ---------- spawning ---------- */
  spawnAhead() {
    const lim = this.dist + AHEAD;
    while (this.tutorial.length && this.tutorial[0].s < lim) { const t = this.tutorial.shift(); this.row(t.s, t.pat, t.text); }
    if (this.finishAt && !this.finishSpawned && this.finishAt < lim) { this.finishSpawned = true; this.spawnFinish(this.finishAt); }
    while (this.nextGate != null && this.nextGate < lim) {
      this.spawnGate(this.nextGate);
      this.nextGate = this.plan ? (this.gateAt.length ? this.gateAt.shift() : null) : this.nextGate + (this.mode === 'practice' ? 190 : this.key === 'choices' ? 230 : 300);
    }
    while (this.nextRow < lim) {
      if (this.finishAt && this.nextRow > this.finishAt - 8) { this.nextRow = Infinity; break; }
      const nearGate = this.items.some(o => o.type === 'gate' && this.nextRow > o.s - 22 && this.nextRow < o.s + 9);
      this.row(this.nextRow, nearGate ? 'coins' : null);
      const v = Math.max(this.speedNow(), 9), gap = clamp(1.3 - this.diff() * 0.42, 0.85, 1.3) * v;
      this.nextRow += Math.max(11, gap) * (0.9 + this.r() * 0.3);
    }
    for (let s = 0; s < 2; s++) while (this.nextSide[s] < lim) {
      decor(this.key, this.r, s ? 1 : -1).forEach(o => { o.position.z = -(this.nextSide[s] + (o.userData.dz || 0)); this.world.add(o); this.deco.push(o); });
      this.nextSide[s] += this.key === 'honour' ? 6 + this.r() * 5 : 8 + this.r() * 7;
    }
    if (this.T.badges && this.nextBadge < lim) { const nb = this.badges.length; this.pickup(this.nextBadge, LANES[Math.floor(this.r() * 3)], 1.3, 'badge', nb); this.nextBadge += 260 + this.r() * 120; }
  }
  row(s, pat, text) {
    const r = this.r, d = this.diff(), lanes = shuffle(r, [0, 1, 2]);
    if (!pat) {
      const w = [['coins', 0.16], ['one', 0.34 - d * 0.12], ['two', 0.18 + d * 0.08], ['lowAll', 0.07 + d * 0.06], ['highAll', 0.07 + d * 0.06], ['mix', 0.06 + d * 0.12], ['two2', 0.04 + d * 0.06]];
      let x = r() * w.reduce((a, b) => a + b[1], 0); pat = w.find(e => (x -= e[1]) <= 0)[0];
    }
    const ob = (lane, kind) => this.obstacle(s, lane, kind), coinsIn = (lane, n = 6, arc) => this.coinLine(s - (arc ? 4.5 : 8), LANES[lane], n, arc);
    if (pat === 'tutLane') { ob(1, 'block'); coinsIn(0, 5); }
    else if (pat === 'tutJump') { [0, 1, 2].forEach(l => ob(l, 'low')); coinsIn(1, 5, true); }
    else if (pat === 'tutSlide') { [0, 1, 2].forEach(l => ob(l, 'high')); }
    else if (pat === 'tutCoins') { coinsIn(1, 8); this.pickup(s + 10, 0, 1.1, 'shield'); }
    else if (pat === 'coins') { coinsIn(lanes[0], 6 + Math.floor(r() * 4)); }
    else if (pat === 'one') { ob(lanes[0], pick(r, ['block', 'block', 'low', 'high'])); coinsIn(lanes[1], 6); }
    else if (pat === 'two' || pat === 'two2') { ob(lanes[0], 'block'); ob(lanes[1], pat === 'two2' ? pick(r, ['low', 'high']) : 'block'); coinsIn(lanes[2], 6); }
    else if (pat === 'lowAll') { lanes.forEach(l => ob(l, 'low')); coinsIn(lanes[0], 5, true); }
    else if (pat === 'highAll') { lanes.forEach(l => ob(l, 'high')); }
    else if (pat === 'mix') { ob(lanes[0], 'block'); ob(lanes[1], 'low'); ob(lanes[2], 'high'); }
    if (text) this.items.push({ type: 'hint', s: s - 26, text, obj: new THREE.Object3D() });
    // extras in a free lane
    const free = [0, 1, 2].filter(l => !this.items.some(o => o.type === 'ob' && o.s === s && o.lane === l));
    if (free.length && !pat.startsWith('tut')) {
      const x = r();
      if (x < 0.07 && !this.power.shield && !this.shieldOn) this.pickup(s + 6, LANES[pick(r, free)], 1.1, pick(r, ['shield', 'magnet', 'double']));
      else if (x < 0.2 && this.T.pickups.length && this.T.pickups[0][1]) { const p = pick(r, this.T.pickups); this.pickup(s + 5, LANES[pick(r, free)], 0.9, p[0], p[1]); }
    }
  }
  obstacle(s, lane, kind) {
    const ids = this.T.obstacles.filter(k => PRESSURES[k].kind === kind);
    const id = ids.length ? pick(this.r, ids) : null; if (!id) return;
    const def = PRESSURES[id], g = new THREE.Group(); g.add(mesh(prop(def.prop)));
    if (def.board) { const b = sign(def.board, 1.85, 0.85, { bg: '#FFFFFF', fg: '#1B1D22', r: 20 }); b.position.set(0, 2.16, 0.12); g.add(b); }
    if (def.screen) { const b = sign(def.screen, def.prop === 'phone' ? 1.12 : 1.62, def.prop === 'phone' ? 1.95 : 1.08, { bg: '#16181C', fg: '#F2C14E', r: 14 }); b.position.set(0, def.prop === 'phone' ? 1.26 : 1.4, 0.11); g.add(b); }
    if (def.label) { const sp = sprite([def.label], 2.3, 0.62, { bg: 'rgba(20,20,24,0.78)', fg: '#FFFFFF', r: 60 }); sp.position.y = kind === 'low' ? 1.55 : kind === 'high' ? 3.25 : 3.25; g.add(sp); }
    g.position.set(LANES[lane], 0, -s); this.world.add(g);
    this.items.push({ type: 'ob', s, lane, x: LANES[lane], kind, id, def, obj: g });
  }
  coinLine(s0, x, n, arc) {
    for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0; this.coins.push({ s: s0 + i * 2.2, x, y: arc ? 0.8 + Math.sin(t * Math.PI) * 1.75 : 0.85, taken: false, fly: 0 }); }
  }
  pickup(s, x, y, type, info) {
    let obj;
    if (type === 'badge') {
      const b = this.T.badges[info % this.T.badges.length]; obj = new THREE.Group(); obj.add(mesh(prop('badge'))); const sp = sprite([b[0]], 0.8, 0.8, { bg: null, h: 256, w: 256 }); sp.position.z = 0.1; obj.add(sp);
      const lab = sprite([b[1]], 1.7, 0.45, { bg: 'rgba(31,77,58,0.9)', fg: '#F2C14E', r: 60 }); lab.position.y = 0.95; obj.add(lab);
    } else obj = mesh(prop(type === 'shieldmini' ? 'shield' : type));
    obj.position.set(x, y, -s); this.world.add(obj); if (['shield', 'magnet', 'double'].includes(type)) obj.scale.setScalar(1.25);
    this.items.push({ type: 'pick', kind: type, s, x, y, info, obj });
  }
  spawnGate(s) {
    const q = this.gq[this.gi++ % this.gq.length]; if (!q) return;
    const g = new THREE.Group(), opts = [];
    const lanesFor = q.two ? [0, 2] : [0, 1, 2], cols = q.two ? (q.opts[0].flag ? q.opts.map(o => o.flag === 'green' ? '#2E9E57' : '#D23B3B') : ['#2F6DB5', '#B5452C']) : ['#2F6DB5', '#B5452C', '#7B3FB8'];
    q.opts.forEach((o, i) => {
      const lane = lanesFor[i], a = mesh(prop('arch', cols[i])); a.position.x = LANES[lane]; g.add(a);
      const letter = q.two && q.opts[0].flag ? (o.flag === 'green' ? '🟢' : '🔴') : String.fromCharCode(65 + i);
      const sg = sign([letter], 1.5, 0.75, { bg: cols[i], fg: '#FFFFFF', r: 18 }); sg.position.set(LANES[lane], 3.55, 0.2); g.add(sg);
      opts.push(Object.assign({ lane, letter, color: cols[i] }, o));
    });
    if (q.two) { const p = mesh(prop('pillar')); p.position.x = 0; g.add(p); this.items.push({ type: 'ob', s, lane: 1, x: 0, kind: 'block', id: 'pillar', def: { label: null }, obj: new THREE.Object3D() }); }
    g.position.z = -s; this.world.add(g);
    this.items.push({ type: 'gate', s, q, opts, obj: g, shown: false });
  }
  spawnFinish(s) {
    const g = new THREE.Group(); g.add(mesh(prop('finish'))); const b = sign(['🏁 FINISH'], 7.4, 1.2, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); b.position.y = 3.7; g.add(b);
    g.position.z = -s; this.world.add(g); this.items.push({ type: 'finish', s, obj: g });
  }

  /* ---------- input ---------- */
  input(dir) {
    if (this.state === 'intro') { this.go(); return; }
    if (this.state !== 'run') return;
    if (dir === 'left' && this.lane > 0) { this.lane--; SND.lane(); }
    else if (dir === 'right' && this.lane < 2) { this.lane++; SND.lane(); }
    else if (dir === 'up') {
      if (this.y <= 0.001 || this.slide > 0) { this.slide = 0; this.vy = JUMP_V; this.y = Math.max(this.y, 0.001); SND.jump(); this.pc.play('Jump_Start', { once: true, fade: 0.08, speed: 1.4 }); this.anim = 'jump'; }
    } else if (dir === 'down') {
      if (this.y > 0.05) { this.vy = -24; this.queueSlide = true; }
      else this.startSlide();
    }
  }
  startSlide() { this.slide = 0.72; SND.slide(); this.pc.play('Slide_Start', { once: true, fade: 0.06, speed: 1.5 }); this.anim = 'slide'; }
  go() { if (this.state !== 'intro') return; this.state = 'run'; this.ui.toast('GO!', 'go'); SND.unlock(); SND.startMusic(this.T.music); this.eng.watch = true; }

  /* ---------- the frame ---------- */
  update(dt) {
    const pc = this.pc; pc.update(dt);
    const cam = this.eng.camera;
    if (this.sea) this.sea.update(this.eng.time, this.dist);
    if (this.state === 'intro') {
      this.introT += dt; const k = clamp(this.introT / 2.2, 0, 1), e = k * k * (3 - 2 * k);
      cam.position.set(lerp(1.6, 0, e), lerp(1.7, 3.4, e), lerp(-4.2, 6.6, e)); cam.lookAt(0, lerp(1.2, 1.3, e), lerp(0, -8, e));
      if (this.introT > 0.4 && this.anim !== 'wave') { pc.play('Yes', { fade: 0.3 }); this.anim = 'wave'; }
      if (this.opt.autostart && this.introT > 2.2) this.go();
      return;
    }
    if (this.state === 'over') { cam.position.y = damp(cam.position.y, 4.2, 2, dt); cam.lookAt(this.px, 0.8, -2); return; }
    if (this.state === 'won') { this.t += dt; cam.position.set(lerp(cam.position.x, this.px + 2.2, dt * 2), lerp(cam.position.y, 1.9, dt * 2), lerp(cam.position.z, -3.4, dt * 1.6)); cam.lookAt(this.px, 1.2, 0); return; }
    this.t += dt;
    // speed
    let v = this.speedNow(); if (this.items.some(o => o.type === 'gate' && !o.done && o.s - this.dist < 75)) v = Math.min(v, 15.5);
    if (this.slow > 0) { this.slow -= dt; v *= 0.6; }
    this.v = damp(this.v, v, 3, dt); this.dist += this.v * dt; this.world.position.z = this.dist;
    this.score += this.v * dt * (this.power.double > 0 ? 2 : 1);
    // player
    this.px = damp(this.px, LANES[this.lane], 16, dt);
    if (this.y > 0 || this.vy > 0) { this.vy += GRAV * dt; this.y += this.vy * dt; if (this.y <= 0) { this.y = 0; this.vy = 0; if (this.queueSlide) { this.queueSlide = false; this.startSlide(); } else { pc.play('Sprint_Loop', { fade: 0.12 }); this.anim = 'run'; } } else if (this.anim === 'jump' && this.vy < 4) { pc.play('Jump_Loop', { fade: 0.2 }); this.anim = 'air'; } }
    if (this.slide > 0) { this.slide -= dt; if (this.slide <= 0.22 && this.anim === 'slide') { pc.play('Slide_Exit', { once: true, fade: 0.1, speed: 1.6 }); this.anim = 'slideExit'; } if (this.slide <= 0) { pc.play('Sprint_Loop', { fade: 0.15 }); this.anim = 'run'; } }
    else if (this.anim === 'slide' && pc) { /* waiting */ }
    if (this.anim === 'slide' && this.slide < 0.62 && this.slide > 0.22) pc.play('Slide_Loop', { fade: 0.08 });
    if (!this.anim || this.anim === 'wave' || this.anim === 'hit' && this.inv < 1.2) { if (this.y <= 0 && this.slide <= 0) { pc.play('Sprint_Loop', { fade: 0.2 }); this.anim = 'run'; } }
    if (this.anim === 'run') { const a = pc.play('Sprint_Loop'); if (a) a.timeScale = clamp(this.v / 13, 0.75, 1.5); }
    pc.root.position.set(this.px, this.y, 0); pc.model.rotation.z = damp(pc.model.rotation.z, (LANES[this.lane] - this.px) * 0.1, 10, dt);
    pc.shadow.position.y = 0.012 - this.y; pc.shadow.scale.setScalar(clamp(1 - this.y * 0.25, 0.4, 1));
    if (this.inv > 0) { this.inv -= dt; pc.model.visible = Math.floor(this.inv * 14) % 2 === 0 || this.inv <= 0; } else pc.model.visible = true;
    // powers
    for (const k in this.power) if (this.power[k] > 0) { this.power[k] -= dt; if (this.power[k] <= 0) { this.power[k] = 0; if (k === 'shield') this.shieldOn = false; } }
    this.shieldFx.visible = this.shieldOn; if (this.shieldOn) this.shieldFx.material.opacity = 0.16 + Math.sin(this.eng.time * 6) * 0.06;
    // world
    this.spawnAhead(); this.recycle(dt); this.collide(dt); this.coinsUpdate(dt);
    // camera
    this.shake = Math.max(0, this.shake - dt * 2.5); const sh = this.shake * 0.35;
    cam.position.set(this.px * 0.55 + (Math.random() - 0.5) * sh, 3.35 + this.y * 0.35 + (Math.random() - 0.5) * sh, 6.6);
    cam.lookAt(this.px * 0.72, 1.25 + this.y * 0.25, -8);
    this.hud();
  }
  recycle(dt) {
    const d = this.dist;
    this.tiles.forEach(t => { if (t.position.z + d - TILE / 2 > BEHIND) t.position.z -= this.tiles.length * TILE; });
    this.deco = this.deco.filter(o => { if (-o.position.z < d - BEHIND - 10) { this.world.remove(o); return false; } if (o.userData.flame) o.scale.y = 0.85 + Math.sin(this.eng.time * 12 + o.position.z) * 0.15; return true; });
    this.items = this.items.filter(o => {
      if (o.s < d - BEHIND) { this.world.remove(o.obj); if (o.type === 'ob' && !o.hit && o.def.label) { const L = o.def.label; this.dodged[L] = (this.dodged[L] || 0) + 1; } return false; }
      if (o.fly > 0) { o.fly -= dt; o.obj.position.x += o.flyDir * dt * 9; o.obj.position.y += dt * 7; o.obj.rotation.z += o.flyDir * dt * 5; o.obj.scale.multiplyScalar(Math.pow(0.08, dt)); if (o.fly <= 0) o.obj.visible = false; }
      if (o.type === 'pick') { o.obj.rotation.y += 0.05; o.obj.position.y = o.y + Math.sin(this.eng.time * 3 + o.s) * 0.12; }
      if (o.type === 'hint' && !o.done && d >= o.s) { o.done = true; this.ui.hint(o.text); }
      return true;
    });
  }
  collide() {
    const d = this.dist, px = this.px, standing = this.slide <= 0;
    for (const o of this.items) {
      const dz = o.s - d;
      if (o.type === 'ob' && !o.hit && Math.abs(dz) < (o.kind === 'high' ? 0.45 : 0.6) && Math.abs(px - o.x) < 1.0) {
        let hit = o.kind === 'block' || (o.kind === 'low' && this.y < 0.9) || (o.kind === 'high' && (standing || this.y > 0.3));
        if (hit) { o.hit = true; this.onHit(o); }
      } else if (o.type === 'pick' && !o.got && Math.abs(dz) < 1.0 && Math.abs(px - o.x) < 1.1 && Math.abs((this.y + (standing ? 1 : 0.5)) - o.y) < 1.4) {
        o.got = true; this.world.remove(o.obj); this.onPick(o);
      } else if (o.type === 'gate' && !o.done) {
        if (!o.shown && dz < Math.min(AHEAD - 5, Math.max(this.v, 8) * 7 + 12)) { o.shown = true; this.ui.question(o); }
        if (dz <= 0) { o.done = true; this.onGate(o); }
      } else if (o.type === 'finish' && !o.done && dz <= 0) { o.done = true; this.end(true); }
    }
  }
  coinsUpdate(dt) {
    const d = this.dist, M = this.coinMesh, m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.eng.time * 3), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const magnet = this.power.magnet > 0; let n = 0;
    this.coins = this.coins.filter(c => c.s > d - BEHIND && !c.taken);
    for (const c of this.coins) {
      const dz = c.s - d;
      if (magnet && dz < 16 && dz > -1) { c.fly += dt * 4; c.x = lerp(c.x, this.px, clamp(c.fly, 0, 1)); c.y = lerp(c.y, this.y + 1, clamp(c.fly, 0, 1)); c.s = lerp(c.s, d, clamp(c.fly * 0.6, 0, 1)); }
      if (Math.abs(c.s - d) < 0.9 && Math.abs(c.x - this.px) < 0.9 && Math.abs(c.y - (this.y + (this.slide > 0 ? 0.45 : 0.9))) < 1.1) { c.taken = true; this.coinN++; this.score += 10 * (this.power.double > 0 ? 2 : 1); SND.coin(); continue; }
      if (dz > AHEAD || n >= 220) continue;
      p.set(c.x, c.y, -c.s); m.compose(p, q, sc); M.setMatrixAt(n++, m);
    }
    M.count = n; M.instanceMatrix.needsUpdate = true;
  }
  onHit(o) {
    if (this.inv > 0) return;
    const fact = o.def.fact, label = o.def.label;
    if (this.shieldOn) { o.fly = 0.7; o.flyDir = o.x >= this.px ? 1 : -1; this.shieldOn = false; this.power.shield = 0; SND.pop(); this.ui.toast('🛡️ The armour of God kept you safe', 'good'); this.inv = 0.8; return; }
    SND.hit(); this.shake = 1; this.slow = 0.5; this.inv = 1.7; o.fly = 0.7; o.flyDir = o.x > this.px ? 1 : o.x < this.px ? -1 : (Math.random() < 0.5 ? -1 : 1);
    this.pc.play('Hit_Chest', { once: true, fade: 0.05, speed: 1.4 }); this.anim = 'hit';
    if (label && fact && !this.hitFacts.some(h => h[0] === label)) this.hitFacts.push([label, fact]);
    if (this.mode !== 'practice') this.hearts--;
    if (label) this.ui.fact(label, fact, this.hearts);
    if (this.hearts <= 0) this.end(false);
  }
  onPick(o) {
    const k = o.kind;
    if (k === 'shield' || k === 'shieldmini') { this.shieldOn = true; this.power.shield = 12; SND.power(); this.ui.toast('🛡️ Shield: “Put on the whole armour of God” (Ephesians 6:11)', 'good'); }
    else if (k === 'magnet') { this.power.magnet = 10; SND.power(); this.ui.toast('🧲 Magnet: triangles come to you', 'good'); }
    else if (k === 'double') { this.power.double = 12; SND.power(); this.ui.toast('✨ Double points', 'good'); }
    else if (k === 'badge') {
      const b = this.T.badges[o.info % this.T.badges.length]; this.badges.push(b[1]); this.score += 100; SND.power();
      this.ui.toast(b[0] + ' ' + b[1] + ': ' + b[2], 'good');
      if (this.badges.length >= this.T.badges.length) { this.badgeSets++; this.badges = []; this.score += 1000; SND.win(); this.ui.toast('🏅 All six! Legion of Honour +1000', 'go'); this.shieldOn = true; this.power.shield = 12; }
    } else { this.score += 25; SND.good(); if (o.info && this.r() < 0.5) this.ui.toast(o.info, 'good'); }
  }
  onGate(g) {
    this.ui.question(null);
    const lane = LANES.reduce((b, x, i) => Math.abs(this.px - x) < Math.abs(this.px - LANES[b]) ? i : b, 0);
    const pickd = g.opts.find(o => o.lane === lane); if (!pickd) return;
    const right = g.opts.find(o => o.ok);
    if (pickd.ok) { this.correct++; this.score += 300; SND.good(); this.ui.answer(true, g.q.why || ''); if (this.correct % 3 === 0) { this.shieldOn = true; this.power.shield = 10; } }
    else { this.wrong++; SND.bad(); this.ui.answer(false, (g.q.two && g.q.opts[0].flag ? '' : 'Answer: ' + right.text + '. ') + (g.q.why || '')); if (this.mode !== 'practice') { this.hearts--; this.shake = 0.6; if (this.hearts <= 0) this.end(false); } }
  }
  end(won) {
    if (this.ended) return; this.ended = true; this.state = won ? 'won' : 'over'; this.eng.watch = false; SND.stopMusic();
    if (won) { SND.win(); this.pc.play('Dance_Loop', { fade: 0.3 }); this.pc.root.rotation.y = 0; } else { this.pc.play('Death01', { once: true, fade: 0.1 }); }
    this.ui.question(null);
    const lost = 3 - (this.hearts === Infinity ? 3 : Math.max(0, this.hearts));
    const res = { won, score: Math.round(this.score), dist: Math.round(this.dist), coins: this.coinN, correct: this.correct, wrong: this.wrong, dodged: this.dodged, facts: this.hitFacts, level: this.level, stars: won ? (lost === 0 ? 3 : lost === 1 ? 2 : 1) : 0, sets: this.badgeSets };
    setTimeout(() => this.ui.end(res), won ? 1600 : 1400);
  }
  hud(force) {
    const p = this.power;
    this.ui.hud({ score: Math.round(this.score), coins: this.coinN, hearts: this.hearts, dist: Math.round(this.dist), target: this.finishAt, shield: this.shieldOn ? p.shield : 0, magnet: p.magnet, double: p.double, badges: this.T.badges ? this.badges.length : null, badgeList: this.T.badges, got: this.badges }, force);
  }
}
