/* Walk and talk: a small 3D place to walk around as your Pathfinder.
   Tap where to go (or hold and drag to walk, arrow keys on a computer), tap a person or a thing to go to it.
   The story of each place lives in its own file (grace.js, school.js); this file is the walking, talking and carrying. */
import { THREE, clamp, lerp, damp, MAT, sprite, setSky, SND } from './core.js';
import { prop } from './props.js';
import { loadKit, kit, kitScene } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { GRACE } from './grace.js';
import { SCHOOL } from './school.js';

export const WALKS = { grace: GRACE, school: SCHOOL };

const R = 0.32;   // the player's radius for bumping into things
const $ = s => document.querySelector(s);
function uiEl(id, cls, html) {
  let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; e.className = 'walk-ui ' + (cls || ''); if (html) e.innerHTML = html; $('#s-hud').appendChild(e); }
  return e;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export class Walk {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = WALKS[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui; this.noSwipe = true; this.level = 1;
  }
  async load(progress) {
    progress && progress(0.1); if (this.T.kit) await loadKit(this.T.kit); progress && progress(0.35);
    this.pc = await makeCharacter(myLook(), this.T.outfit || 'pathfinder'); progress && progress(0.55);
    const { scene } = this.eng; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky); this.world = new THREE.Group(); scene.add(this.world);
    this.cols = []; this.things = []; this.npcs = {}; this.fades = []; this.followers = []; this.quests = []; this.hooks = [];
    const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: this.T.ground || '#6E9E4A' })); g.rotation.x = -Math.PI / 2; g.position.y = -0.02; this.world.add(g); this.groundMesh = g;
    await this.T.build(this, p => progress && progress(0.55 + p * 0.4));
    this.world.add(this.pc.root); this.pc.root.position.set(...this.T.start); this.pc.root.rotation.y = this.T.startRy || Math.PI; this.pc.play('Idle_Loop');
    this.reset(); progress && progress(1);
  }
  reset() {
    this.state = 'intro'; this.introT = 0; this.points = 0; this.right = 0; this.wrong = 0; this.t = 0; this.busy = false; this.target = null; this.pending = null; this.joy = null; this.carryObj = null; this.carrying = null; this.tool = null;
    this.learn = []; this.ended = false; this.vel = new THREE.Vector3(); this.camP = null; this.hud(true);
  }

  /* ---------- building helpers used by the story files ---------- */
  add(obj, x = 0, y = 0, z = 0, ry = 0, s) { obj.position.set(x, y, z); obj.rotation.y = ry; if (s) obj.scale.setScalar(s); this.world.add(obj); return obj; }
  put(name, args, x, z, ry = 0, col) { const m = new THREE.Mesh(prop(name, ...(args || [])), MAT.flat); this.add(m, x, 0, z, ry); if (col) this.solid(m, col); return m; }
  kit(name, h, x, z, ry = 0, col) { const m = kit(name, h); if (!m) return null; this.add(m, x, 0, z, ry); if (col) this.circle(x, z, col); return m; }
  car(name, len, x, z, ry = 0) { const m = kitScene(name, len); if (!m) return null; this.add(m, x, 0, z, ry); this.solid(m, 0.1); return m; }
  box(x0, z0, x1, z1) { this.cols.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
  circle(x, z, r) { this.cols.push({ x, z, r }); }
  /** a solid box around a mesh's footprint (shrunk by pad) */
  solid(m, pad = 0) { m.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(m); this.box(b.min.x + pad, b.min.z + pad, b.max.x - pad, b.max.z - pad); return m; }
  /** buildings that hide the player turn see-through while you're behind them */
  fadeable(m) { m.material = m.material.clone(); m.material.transparent = true; m.updateMatrixWorld(true); this.fades.push({ m, b: new THREE.Box3().setFromObject(m) }); return m; }
  async npc(id, look, outfit, x, z, ry = 0, anim = 'Idle_Loop', y = 0) {
    const c = await makeCharacter(look, outfit); c.id = id; this.npcs[id] = c; this.world.add(c.root); c.root.position.set(x, y, z); c.root.rotation.y = ry; c.play(anim); c.anim = anim; this.circle(x, z, 0.35); c.col = this.cols[this.cols.length - 1]; return c;
  }
  /** something you can tap or walk up to: { id, x, z, r, h, icon, verb, stand:[x,z], when(), use() } */
  thing(o) {
    o = Object.assign({ r: 1.7, h: 1.8, icon: '❗' }, o);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.6, o.hitR || 0.8), Math.max(0.6, o.hitR || 0.8), o.h + 0.6, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(o.x, (o.h + 0.6) / 2, o.z); hit.userData.thing = o; this.world.add(hit); o.hit = hit;
    o.mark = sprite([o.icon], 0.8, 0.8, { bg: 'rgba(242,193,78,.95)', fg: '#2A1C00', w: 128, h: 128, r: 64 }); o.mark.position.set(o.x, o.h + 0.9, o.z); this.world.add(o.mark);
    this.things.push(o); return o;
  }
  active(o) { return !o.off && (!o.when || o.when(this)); }
  setQuests(list) { this.quests = list.map(q => Object.assign({ done: false }, q)); this.drawQuests(); }
  addQuest(q) { if (!this.quests.some(z => z.id === q.id)) { this.quests.push(Object.assign({ done: false }, q)); this.drawQuests(); SND.lane(); } }
  done(id, pts = 150) { const q = this.quests.find(z => z.id === id); if (!q || q.done) return; q.done = true; this.points += pts; SND.power(); this.ui.toast('✓ ' + q.text, 'good'); this.drawQuests(); this.hud(); }
  isDone(id) { const q = this.quests.find(z => z.id === id); return !!(q && q.done); }
  drawQuests() {
    const el = uiEl('h-quest', 'panel'); el.hidden = this.state === 'intro' || !this.quests.length;
    const open = this.quests.filter(q => !q.done);
    el.innerHTML = '<b>' + (this.T.questTitle || 'To do') + ' · ' + this.quests.filter(q => q.done).length + '/' + this.quests.length + '</b>' +
      open.slice(0, 4).map((q, i) => '<span class="' + (i ? '' : 'now') + '">○ ' + q.text + '</span>').join('') + (open.length > 4 ? '<span class="more">+' + (open.length - 4) + ' more</span>' : '') + (!open.length ? '<span class="now">✓ All done</span>' : '');
  }

  /* ---------- talking ---------- */
  async say(who, text, o = {}) {
    this.busy = true; const c = await this.ui.card({ tag: o.tag || this.T.title, icon: o.icon || '', who: o.place || '', title: who, text, html: o.html, opts: [o.next || 'Next ▶'], primary: 0 }); this.busy = !!o.keep; return c;
  }
  /** a choice with one best answer: { who, icon, q, opts, right, why, wrong } → true when right */
  async ask(o) {
    this.busy = true; const order = o.keepOrder ? o.opts.map((t, i) => i) : shuffleIdx(o.opts.length);
    this.askRight = o.opts[o.right]; const c = await this.ui.card({ tag: o.tag || '💬 What do you do?', icon: o.icon || '', who: o.who || '', title: o.q, text: o.text, opts: order.map(i => o.opts[i]) }); this.askRight = null;
    const ok = order[c] === o.right;
    if (ok) { this.right++; this.points += 100; SND.good(); this.ui.cardFeedback(true, o.why || 'Good choice!'); }
    else { this.wrong++; SND.bad(); this.ui.cardFeedback(false, (o.wrong && o.wrong[order[c]]) || ('Better: ' + o.opts[o.right] + '. ' + (o.why || ''))); this.learn.push([o.q, o.opts[o.right]]); }
    await wait(ok ? 2300 : 3600); this.ui.closeCard(); if (!o.keep) this.busy = false; return ok;
  }
  /** a choice where any answer is fine (a verse, a hymn): returns the index picked */
  async choose(o) { this.busy = true; const c = await this.ui.card({ tag: o.tag || this.T.title, icon: o.icon || '', who: o.who || '', title: o.q, text: o.text, opts: o.opts }); if (!o.keep) { this.ui.closeCard(); this.busy = false; } return c; }
  face(c, x, z) { const p = c.root.position; c.root.rotation.y = Math.atan2(x - p.x, z - p.z); }
  faceEach(npc) { const a = this.pc.root.position, b = npc.root.position; this.face(this.pc, b.x, b.z); this.face(npc, a.x, a.z); }

  /* ---------- carrying and tools ---------- */
  carry(id, obj, y = 1.02, z = 0.34) { this.drop(); this.carrying = id; this.carryObj = obj; this.pc.root.add(obj); obj.position.set(0, y, z); obj.rotation.set(0, 0, 0); SND.coin(); }
  drop() { if (this.carryObj) this.pc.root.remove(this.carryObj); const id = this.carrying; this.carrying = null; this.carryObj = null; return id; }
  hold(id, obj) { this.putDown(); this.tool = id; this.toolObj = obj; this.pc.root.add(obj); SND.coin(); }
  putDown() { if (this.toolObj) this.pc.root.remove(this.toolObj); this.tool = null; this.toolObj = null; }
  follow(npc, on = true) { npc.following = on; if (on && !this.followers.includes(npc)) { this.followers.push(npc); this.cols = this.cols.filter(c => c !== npc.col); } if (!on) this.followers = this.followers.filter(f => f !== npc); }
  /** an NPC walks through the points [[x,z],…], then runs then() */
  walkNpc(npc, pts, then) { this.cols = this.cols.filter(c => c !== npc.col); npc.path = pts.map(p => new THREE.Vector3(p[0], 0, p[1])); npc.then = then; npc.play('Walk_Loop', { fade: 0.2 }); if (!this.walkers) this.walkers = []; if (!this.walkers.includes(npc)) this.walkers.push(npc); }
  async anim(name, ms = 1200) { this.pc.play(name, { once: true, fade: 0.15 }); this.animT = ms / 1000; await wait(ms); }

  /* ---------- input ---------- */
  input() {}
  press(x, y) { this.px = x; this.py = y; this.dragged = false; }
  drag(x, y, dx, dy) {
    if (this.state !== 'play' || this.busy) return; const d = Math.hypot(dx, dy); if (d < 16 && !this.dragged) return;
    this.dragged = true; this.target = null; this.path = null; this.pending = null; const k = Math.min(1, d / 70);
    this.joy = { x: dx / d * k, z: dy / d * k }; const j = uiEl('h-joy'); j.hidden = false; j.style.left = this.px + 'px'; j.style.top = this.py + 'px';
    j.firstChild || (j.innerHTML = '<i></i>'); j.firstChild.style.transform = 'translate(' + (dx / d * Math.min(d, 46)) + 'px,' + (dy / d * Math.min(d, 46)) + 'px)';
  }
  release() { this.joy = null; const j = document.getElementById('h-joy'); if (j) j.hidden = true; }
  tapAt(x, y) {
    if (this.state !== 'play' || this.busy || this.dragged) return;
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), this.eng.camera);
    const hits = rc.intersectObjects(this.things.filter(t => this.active(t)).map(t => t.hit), false);
    if (hits.length) { const t = hits[0].object.userData.thing; this.goTo(t); return; }
    const g = rc.intersectObject(this.groundMesh, false)[0]; if (g) { this.pending = null; this.walkPath(new THREE.Vector3(g.point.x, 0, g.point.z)); this.tapMark(g.point); }
  }
  goTo(t) {
    const p = this.pc.root.position, st = t.stand ? new THREE.Vector3(t.stand[0], 0, t.stand[1]) : (() => { const d = new THREE.Vector3(p.x - t.x, 0, p.z - t.z); const l = d.length() || 1; return new THREE.Vector3(t.x + d.x / l * Math.min(1.2, l), 0, t.z + d.z / l * Math.min(1.2, l)); })();
    if (Math.hypot(p.x - t.x, p.z - t.z) < t.r) { this.use(t); return; }
    this.walkPath(st); this.pending = t; this.stuckT = 0;
  }
  /** walk along a path round the fences and houses */
  walkPath(to) { const pts = this.findPath(this.pc.root.position, to); this.path = pts && pts.length ? pts : [to.clone()]; this.target = this.path.shift(); }
  blockedAt(x, z, r) { for (const c of this.cols) { if (c.r != null) { if ((x - c.x) * (x - c.x) + (z - c.z) * (z - c.z) < (c.r + r) * (c.r + r)) return true; } else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true; } return false; }
  clearLine(a, b) { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.25); for (let i = 1; i < n; i++) { const t = i / n; if (this.blockedAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, R)) return false; } return true; }
  findPath(from, to) {
    if (this.clearLine(from, to)) return [to.clone()];
    const b = this.T.bounds || [-40, -40, 40, 40], cs = 0.5, nx = Math.floor((b[2] - b[0]) / cs) + 1, nz = Math.floor((b[3] - b[1]) / cs) + 1, N = nx * nz;
    const bl = new Uint8Array(N); for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) bl[iz * nx + ix] = this.blockedAt(b[0] + ix * cs, b[1] + iz * cs, R + 0.04) ? 1 : 0;
    const cell = p => [clamp(Math.round((p.x - b[0]) / cs), 0, nx - 1), clamp(Math.round((p.z - b[1]) / cs), 0, nz - 1)];
    const free = ([x, z]) => { if (!bl[z * nx + x]) return z * nx + x; for (let r = 1; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < nx && Z < nz && !bl[Z * nx + X]) return Z * nx + X; } return -1; };
    const s = free(cell(from)), e = free(cell(to)); if (s < 0 || e < 0) return null;
    const g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), shut = new Uint8Array(N), heap = [[0, s]]; g[s] = 0;
    const ex = e % nx, ez = (e / nx) | 0, H = i => Math.hypot(i % nx - ex, ((i / nx) | 0) - ez);
    const push = it => { heap.push(it); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    let found = false;
    while (heap.length) { const [, i] = pop(); if (shut[i]) continue; shut[i] = 1; if (i === e) { found = true; break; } const x = i % nx, z = (i / nx) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= nx || Z >= nz) continue; const j = Z * nx + X; if (bl[j] || shut[j]) continue;
        if (dx && dz && (bl[z * nx + X] || bl[Z * nx + x])) continue; const ng = g[i] + (dx && dz ? 1.414 : 1); if (ng < g[j]) { g[j] = ng; came[j] = i; push([ng + H(j), j]); } } }
    if (!found) return null;
    const raw = []; for (let i = e; i >= 0; i = came[i]) { raw.push(new THREE.Vector3(b[0] + (i % nx) * cs, 0, b[1] + ((i / nx) | 0) * cs)); if (i === s) break; } raw.reverse(); raw.push(to.clone());
    const out = []; let a = from.clone(); let k = 0; while (k < raw.length) { let far = k; for (let j = raw.length - 1; j > k; j--) if (this.clearLine(a, raw[j])) { far = j; break; } out.push(raw[far]); a = raw[far]; k = far + 1; }
    return out;
  }
  tapMark(p) { if (!this.ring) { this.ring = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.36, 20), new THREE.MeshBasicMaterial({ color: '#FFE27A', transparent: true, depthWrite: false })); this.ring.rotation.x = -Math.PI / 2; this.world.add(this.ring); } this.ring.position.set(p.x, 0.03, p.z); this.ring.material.opacity = 1; this.ring.visible = true; }
  async use(t) {
    if (this.busy || !this.active(t)) return; this.target = null; this.pending = null; this.joy = null;
    const p = this.pc.root.position; this.face(this.pc, t.x, t.z); this.pc.play(this.carrying ? 'Walk_Carry_Loop' : 'Idle_Loop', { fade: 0.15, speed: this.carrying ? 0.001 : 1 }); this.busy = true;
    try { await t.use(this, t); } catch (e) { console.error(e); }
    this.busy = false; this.ui.closeCard(); this.hud(); this.drawQuests();
  }
  go() { if (this.state !== 'intro') return; this.state = 'play'; SND.unlock(); SND.startMusic('calm'); this.eng.watch = true; this.drawQuests(); if (this.T.begin) this.T.begin(this); }

  /* ---------- each frame ---------- */
  idleView(dt) { this.pc.update(dt); Object.values(this.npcs).forEach(n => n.update(dt)); const t = this.eng.time * 0.12, c = this.eng.camera, p = this.pc.root.position, tall = innerHeight > innerWidth, Rr = tall ? 13 : 10;
    c.position.set(p.x + Math.sin(t) * Rr, tall ? 8 : 6, p.z + Math.cos(t) * Rr); c.lookAt(p.x, tall ? -1 : 1, p.z); }
  /** the camera flies to a shot, flashes and keeps a small photo of what it sees */
  async snap(at, look) {
    this.camOverride = { pos: new THREE.Vector3(...at), look: new THREE.Vector3(...look) }; this.pc.play('Idle_Loop', { fade: 0.2 }); await wait(1300);
    const fl = uiEl('h-flash'); fl.hidden = false; fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); SND.noise(0.05, 0.25, 0, 3000); SND.pop();
    const r = this.eng.renderer, src = r.domElement; r.render(this.eng.scene, this.eng.camera);
    const c = document.createElement('canvas'); c.width = 360; c.height = 240; const sw = Math.min(src.width, src.height * 1.5), sh = sw / 1.5; c.getContext('2d').drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, 360, 240);
    let url = ''; try { url = c.toDataURL('image/jpeg', 0.82); } catch (e) { url = ''; } await wait(350); return url;
  }
  camGoal() { if (this.camOverride) return this.camOverride; const p = this.pc.root.position, tall = innerHeight > innerWidth; return { pos: new THREE.Vector3(p.x, tall ? 10.5 : 7.6, p.z + (tall ? 9.5 : 8.2)), look: new THREE.Vector3(p.x, tall ? -0.3 : 0.8, p.z - (tall ? 2.2 : 1.2)) }; }
  update(dt) {
    const pc = this.pc, cam = this.eng.camera; pc.update(dt); Object.values(this.npcs).forEach(n => n.update(dt));
    const goal = this.camGoal();
    if (this.state === 'intro') {
      this.introT += dt; const k = clamp(this.introT / 3, 0, 1), e = k * k * (3 - 2 * k), s = this.T.intro || [0, 40, 40];
      cam.position.set(lerp(goal.pos.x + s[0], goal.pos.x, e), lerp(s[1], goal.pos.y, e), lerp(goal.pos.z + s[2], goal.pos.z, e)); cam.lookAt(goal.look);
      if (this.opt.autostart && this.introT > 3) this.go(); return;
    }
    if (this.state === 'won') { cam.position.lerp(goal.pos, 1 - Math.exp(-3 * dt)); cam.lookAt(goal.look); return; }
    this.t += dt; if (this.animT > 0) this.animT -= dt;
    // where to walk
    let mv = null; const keys = this.eng.keys || {};
    if (!this.busy) {
      const kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0), kz = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
      if (kx || kz) { const l = Math.hypot(kx, kz); mv = new THREE.Vector3(kx / l, 0, kz / l); this.target = null; this.path = null; this.pending = null; }
      else if (this.joy) mv = new THREE.Vector3(this.joy.x, 0, this.joy.z);
      else if (this.target) { const d = this.target.clone().sub(pc.root.position); d.y = 0; const l = d.length();
        if (l < (this.path && this.path.length ? 0.35 : 0.12)) { this.target = this.path && this.path.length ? this.path.shift() : null; if (!this.target && this.pending) { const t = this.pending; this.pending = null; this.use(t); } }
        else mv = d.divideScalar(l).multiplyScalar(Math.min(1, l / 0.4 + 0.25)); }
      const ek = keys.Enter || keys.e || keys.E || keys[' ']; if (ek && !this.keyHeld && this.near) { this.keyHeld = true; this.use(this.near); } if (!ek) this.keyHeld = false;
    }
    const speed = (this.T.speed || 3.4) * (this.carrying ? 0.8 : 1), pos = pc.root.position, before = pos.clone();
    if (mv && mv.lengthSq() > 0.0004) {
      const want = mv.clone().multiplyScalar(speed); this.vel.lerp(want, 1 - Math.exp(-12 * dt));
      pos.addScaledVector(this.vel, dt); this.collide(pos);
      const ry = Math.atan2(this.vel.x, this.vel.z); let dr = ry - pc.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); pc.root.rotation.y += dr * Math.min(1, dt * 14);
      if (this.target) { const moved = pos.distanceTo(before); this.stuckT = moved < speed * dt * 0.2 ? (this.stuckT || 0) + dt : 0;
        if (this.stuckT > 0.5) { const t = this.pending; this.target = null; this.path = null; this.pending = null; this.stuckT = 0; if (t && Math.hypot(pos.x - t.x, pos.z - t.z) < t.r + 0.8) this.use(t); } }
    } else this.vel.multiplyScalar(Math.exp(-14 * dt));
    const sp = this.vel.length();
    if (!(this.animT > 0) && !this.busy) {
      if (sp > 0.25) { const a = this.carrying ? 'Walk_Carry_Loop' : this.tool && this.T.toolAnim && this.T.toolAnim[this.tool] ? this.T.toolAnim[this.tool] : 'Walk_Loop'; pc.play(a, { fade: 0.15, speed: clamp(sp / 2.6, 0.6, 1.4) }); }
      else if (this.carrying) pc.play('Walk_Carry_Loop', { fade: 0.2, speed: 0.001 }); else pc.play('Idle_Loop', { fade: 0.25 });
    }
    // followers walk behind you
    this.followers.forEach((f, i) => { const fp = f.root.position, back = new THREE.Vector3(-Math.sin(pc.root.rotation.y), 0, -Math.cos(pc.root.rotation.y)).multiplyScalar(1.4 + i * 1.1); const goalP = pos.clone().add(back).add(new THREE.Vector3(0.7 * (i % 2 ? -1 : 1), 0, 0));
      const d = goalP.sub(fp); d.y = 0; const l = d.length(); if (l > 0.3) { fp.addScaledVector(d.normalize(), Math.min(l, speed * 1.05 * dt)); this.face(f, fp.x + d.x, fp.z + d.z); f.play('Walk_Loop', { fade: 0.2 }); } else { f.play(f.anim || 'Idle_Loop', { fade: 0.3 }); } });
    // the nearest thing you can use
    let near = null, nd = 1e9; for (const t of this.things) { if (t.npc) { const q = t.npc.root.position; t.x = q.x; t.z = q.z; t.hit.position.x = q.x; t.hit.position.z = q.z; t.mark.position.x = q.x; t.mark.position.z = q.z; } const on = this.active(t); t.mark.visible = on; t.hit.visible = false; if (!on) continue; t.mark.position.y = t.h + 0.9 + Math.sin(this.eng.time * 3 + t.x) * 0.12; const d = Math.hypot(pos.x - t.x, pos.z - t.z); if (d < t.r && d < nd) { nd = d; near = t; } }
    this.near = near; const ab = uiEl('h-act', '', ''); ab.hidden = !near || this.busy;
    if (near && !this.busy && ab.dataset.id !== near.id) { ab.dataset.id = near.id; ab.innerHTML = '<button>' + (near.icon || '✋') + ' ' + (near.verb || 'Go') + '</button>'; ab.firstChild.onclick = e => { e.stopPropagation(); this.use(near); }; }
    if (!near) ab.dataset.id = '';
    if (this.ring && this.ring.visible) { this.ring.material.opacity -= dt * 1.5; if (this.ring.material.opacity <= 0) this.ring.visible = false; }
    this.hooks.forEach(h => h(this, dt));
    (this.walkers || []).forEach(n => { if (!n.path || !n.path.length) return; const fp = n.root.position, d = n.path[0].clone().sub(fp); d.y = 0; const l = d.length();
      if (l < 0.1) { n.path.shift(); if (!n.path.length) { n.play(n.anim || 'Idle_Loop', { fade: 0.3 }); this.circle(fp.x, fp.z, 0.35); n.col = this.cols[this.cols.length - 1]; const f = n.then; n.then = null; f && f(n); } return; }
      fp.addScaledVector(d.normalize(), Math.min(l, 2.4 * dt)); this.face(n, fp.x + d.x, fp.z + d.z); });
    // see-through buildings between the camera and you
    const c0 = cam.position, ray = new THREE.Ray(c0, pos.clone().setY(1).sub(c0).normalize()), dist = c0.distanceTo(pos), hitP = new THREE.Vector3();
    for (const f of this.fades) { const h = ray.intersectBox(f.b, hitP); const block = h && c0.distanceTo(hitP) < dist - 0.6; f.m.material.opacity = damp(f.m.material.opacity, block ? 0.28 : 1, 8, dt); f.m.material.depthWrite = f.m.material.opacity > 0.9; }
    cam.position.lerp(goal.pos, 1 - Math.exp(-4 * dt)); this.camLook = (this.camLook || goal.look.clone()).lerp(goal.look, 1 - Math.exp(-6 * dt)); cam.lookAt(this.camLook);
    this.hud();
  }
  collide(p) {
    const b = this.T.bounds; if (b) { p.x = clamp(p.x, b[0], b[2]); p.z = clamp(p.z, b[1], b[3]); }
    for (let it = 0; it < 2; it++) for (const c of this.cols) {
      if (c.r != null) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + R; if (d < m && d > 1e-6) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } }
      else if (p.x > c.x0 - R && p.x < c.x1 + R && p.z > c.z0 - R && p.z < c.z1 + R) {
        const l = p.x - (c.x0 - R), r = (c.x1 + R) - p.x, u = p.z - (c.z0 - R), d = (c.z1 + R) - p.z, m = Math.min(l, r, u, d);
        if (m === l) p.x = c.x0 - R; else if (m === r) p.x = c.x1 + R; else if (m === u) p.z = c.z0 - R; else p.z = c.z1 + R;
      }
    }
  }
  /** the end of the story: score, stars and what to look at again */
  finish(o = {}) {
    if (this.ended) return; this.ended = true; this.state = 'won'; this.eng.watch = false; SND.stopMusic(); SND.win(); this.pc.play('Yes', { fade: 0.2 });
    ['h-act', 'h-joy', 'h-quest'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; });
    const secs = Math.round(this.t), score = Math.max(0, Math.round(this.points + Math.max(0, 900 - secs * 2)));
    const res = { won: true, score, level: 1, stars: this.wrong === 0 ? 3 : this.wrong <= 2 ? 2 : 1, title: o.title || this.T.title,
      stats: [[this.right + '/' + (this.right + this.wrong), 'best choices'], [this.quests.filter(q => q.done).length + '/' + this.quests.length, 'done'], [Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2), 'time'], [score, 'points']].concat(o.stats || []),
      list: this.learn.length ? ['Look at these again', this.learn.map(l => [l[0], '→ ' + l[1]])] : (o.list || null), save: 'endless', correct: this.right, wrong: this.wrong, dodged: {} };
    setTimeout(() => this.ui.end(res), o.delay || 1800);
  }
  hud(force) { const q = this.quests.find(z => !z.done); this.ui.hud({ score: this.points, coins: this.right, coinIcon: this.T.coinIcon || '💛', hearts: null, dist: 0, label: this.state === 'intro' ? this.T.title : q ? '➜ ' + q.text : '✓ All done', shield: 0, magnet: 0, double: 0, badges: null }, force); }
}
function shuffleIdx(n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
