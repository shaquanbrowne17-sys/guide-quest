/* The train games: no obstacles, just choices. A question comes up with time to read it, the track splits,
   and you send the train left or right. The wrong side's bridge gives way and the train lands in the swamp. */
import { THREE, clamp, lerp, damp, rng, hash, today, pick, shuffle, G, P, merge, mesh, MAT, sign, sprite, setSky, SND } from './core.js';
import { prop } from './props.js';
import { loadKit, kit } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { DATA } from './data.js';

const SPLIT = 5.6, GAUGE = 0.72, AHEAD = 140;
const FLAGS_GREEN = ['Respects your “no”', 'Encourages your walk with God', 'Is kind to your family', 'Keeps their promises', 'Is honest with you', 'Supports your goals', 'Is happy when you see your friends', 'Says sorry when they are wrong', 'Wants you to finish school', 'Is the same person in public and in private'];
const FLAGS_RED = ['Pressures you to keep secrets from your parents', 'Asks you for private pictures', 'Gets angry when you say no', 'Checks your phone without asking', 'Wants you to skip school or church for them', 'Puts you down in front of others', 'Says “If you loved me, you would…”', 'Tries to cut you off from your friends', 'Dares you to try a vape', 'Gives you expensive gifts and then expects something back'];

function two(q, r) {
  /* a Learning Lab question becomes two choices: the right answer and one other */
  const right = q[1][q[2]], wrong = pick(r, q[1].filter((_, i) => i !== q[2]));
  const opts = r() < 0.5 ? [{ text: right, ok: true }, { text: wrong, ok: false }] : [{ text: wrong, ok: false }, { text: right, ok: true }];
  return { text: q[0], opts, why: q[3] || '' };
}
export const TRAINS = {
  flags: {
    key: 'flags', gid: 'train:flags', title: 'Red Flag Express', topic: 'choices', icon: '🚂', music: 'calm', kind: 'train',
    blurb: 'Ride the train through the swamp. Read each one: green flag or red flag? Pick your side. The wrong bridge gives way!',
    sky: { top: '#5B93D1', bottom: '#E9DCB8', fogNear: 55, fogFar: 150, sun: '#FFF0D0', sunI: 2.2, sunPos: [-6, 10, 4], hemi: 1.5, skyLight: '#DDEBFF', groundLight: '#556B3A' },
    questions(r) {
      const f = shuffle(r, [...FLAGS_GREEN.map(t => [t, true]), ...FLAGS_RED.map(t => [t, false])]).map(([t, green]) => {
        const g = { text: 'GREEN flag', flag: 'green', ok: green }, red = { text: 'RED flag', flag: 'red', ok: !green };
        return { text: 'Someone who… ' + t, opts: r() < 0.5 ? [g, red] : [red, g], why: green ? 'Green flag: that’s healthy and safe.' : 'Red flag. Talk to a trusted adult about it.' };
      });
      const q = shuffle(r, DATA.Q.choices).map(x => two(x, r)), out = [];
      f.forEach((x, i) => { out.push(x); if (i % 3 === 2 && q.length) out.push(q.shift()); });
      return out;
    },
  },
  honourline: {
    key: 'honourline', gid: 'train:honour', title: 'Honour Line', topic: 'legion', icon: '🚃', music: 'calm', kind: 'train',
    blurb: 'Everyday choices from the Legion of Honour. Which way honours Christ? Send the train down that side.',
    sky: { top: '#4A7FC0', bottom: '#F2CF95', fogNear: 50, fogFar: 145, sun: '#FFD9A0', sunI: 2.1, sunPos: [9, 8, 3], hemi: 1.45, skyLight: '#E3E8FF', groundLight: '#5E6A3A' },
    questions(r) {
      const sc = shuffle(r, Object.keys(DATA.HONOUR).flatMap(k => DATA.HONOUR[k])).map(x => ({ text: x[0], opts: r() < 0.5 ? [{ text: x[1], ok: true }, { text: x[2], ok: false }] : [{ text: x[2], ok: false }, { text: x[1], ok: true }], why: '“Whatsoever ye do, do all to the glory of God.” (1 Corinthians 10:31)' }));
      const q = shuffle(r, DATA.Q.legion).map(x => two(x, r)), out = [];
      sc.forEach((x, i) => { out.push(x); if (i % 2 === 1 && q.length) out.push(q.shift()); });
      return out;
    },
  },
  healthline: {
    key: 'healthline', gid: 'train:health', title: 'Health Line', topic: 'fitness', icon: '🚆', music: 'calm', kind: 'train',
    blurb: 'Fit & Free and Nutrition questions. Two answers, two tracks. Pick the right one before the bridge.',
    sky: { top: '#5E9BD6', bottom: '#F5D6A6', fogNear: 55, fogFar: 150, sun: '#FFE6B8', sunI: 2.3, sunPos: [-10, 9, 4], hemi: 1.5, skyLight: '#CFE3FF', groundLight: '#6A7A4A' },
    questions(r) { return shuffle(r, [...DATA.Q.fitness, ...DATA.Q.nutrition]).map(x => two(x, r)); },
  },
};
const KIT = ['tree_default', 'tree_oak', 'tree_palmTall', 'tree_palmBend', 'plant_bushLarge', 'grass_large', 'lily_large', 'rock_largeA', 'canoe'];

export function trainPlan(L) { return { n: 5 + L, v: 8.5 + (L - 1) * 0.9, read: Math.max(6, 10 - (L - 1) * 0.45) }; }
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/* x of a branch at track distance s for a junction at j, side c (-1 left, +1 right) */
const branchX = (j, c, s) => c * SPLIT * (ss(j, j + 18, s) - ss(j + 62, j + 82, s));

export class Train {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = TRAINS[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui;
    this.seed = mode === 'daily' ? hash(today() + key) : (Math.random() * 1e9) >>> 0; this.r = rng(this.seed);
    this.level = mode === 'levels' ? (this.opt.level || 1) : 0; this.plan = this.level ? trainPlan(this.level) : null;
  }
  async load(progress) {
    progress && progress(0.1); await loadKit(KIT); progress && progress(0.5);
    this.pc = await makeCharacter(myLook()); progress && progress(0.9); this.build(); progress && progress(1);
  }
  build() {
    const { scene } = this.eng; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky);
    this.world = new THREE.Group(); scene.add(this.world);
    // swamp water that follows the train
    const wg = new THREE.PlaneGeometry(260, 260, 40, 40); wg.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshPhongMaterial({ color: '#3F5A3A', specular: '#E6F0D0', shininess: 110, flatShading: true });
    const u = { uT: { value: 0 } }; wm.onBeforeCompile = sh => { Object.assign(sh.uniforms, u); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp = modelMatrix * vec4(position, 1.0); transformed.y += sin(wp.x * 0.3 + uT) * 0.06 + sin(wp.z * 0.25 + uT * 0.8) * 0.06;'); };
    this.water = new THREE.Mesh(wg, wm); this.water.position.y = -0.55; scene.add(this.water); this.waterU = u;
    // the train: locomotive, then the open wagon with the Pathfinder in it
    this.loco = mesh(prop('loco')); this.wagon = mesh(prop('wagon')); scene.add(this.loco, this.wagon);
    this.wagon.add(this.pc.root); this.pc.root.position.set(0, 1.0, -0.6); this.pc.root.rotation.y = Math.PI; this.pc.shadow.visible = false;
    this.pc.play('Idle_Loop');
    this.smoke = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: '#E6E6E6', transparent: true, opacity: 0.55, flatShading: true, depthWrite: false })); m.visible = false; scene.add(m); this.smoke.push({ m, t: 99 }); }
    this.splash = mesh(prop('splash')); this.splash.visible = false; scene.add(this.splash);
    this.reset();
  }
  reset() {
    (this.pieces || []).forEach(p => this.world.remove(p)); (this.deco || []).forEach(o => this.world.remove(o));
    this.pieces = []; this.deco = []; this.juncs = [];
    this.s = 0; this.v = 0; this.t = 0; this.score = 0; this.hearts = this.mode === 'practice' ? Infinity : 3; this.streak = 0;
    this.correct = 0; this.wrong = 0; this.missed = []; this.state = 'intro'; this.introT = 0; this.ended = false; this.fall = null; this.respawnAt = null;
    this.qs = this.T.questions(this.r); this.qi = 0; this.total = this.plan ? this.plan.n : this.mode === 'daily' ? 10 : Infinity; this.done = 0;
    this.nextJ = 70; this.trackTo = -20; this.nextDeco = -10; this.made = 0; this.finishMade = false; this.finishAt = null;
    this.buildTrackTo(AHEAD + 40); this.placeTrain(0, 0); this.hud(true);
  }
  speedNow() { const base = this.plan ? this.plan.v : this.mode === 'practice' ? 8 : this.mode === 'daily' ? 10 : 9 + 9 * (1 - Math.exp(-this.t / 150)); return base; }
  readTime() { return this.plan ? this.plan.read : this.mode === 'practice' ? 11 : this.mode === 'daily' ? 8.5 : Math.max(6, 10 - this.done * 0.2); }

  /* ---------- the track ---------- */
  buildTrackTo(lim) {
    while (this.trackTo < lim) {
      const s0 = this.trackTo;
      if (this.nextJ != null && s0 >= this.nextJ - 0.5) {
        if (this.made < this.total) {
          if (this.qi >= this.qs.length) this.qs = this.qs.concat(this.T.questions(this.r));
          const j = this.nextJ; this.makeJunction(j); this.made++; this.trackTo = j + 82; this.nextJ = j + 82 + 40 + this.r() * 25; continue;
        }
        if (!this.finishMade) { this.finishMade = true; this.finishAt = s0 + 25; this.makeFinish(this.finishAt); }
        this.nextJ = null;
      }
      const s1 = this.nextJ != null ? Math.min(this.nextJ, s0 + 30) : s0 + 30;
      this.addPiece(this.rail(() => 0, s0, s1, 'straight')); this.trackTo = s1;
    }
    while (this.nextDeco < lim) { this.decorate(this.nextDeco); this.nextDeco += 7 + this.r() * 6; }
  }
  rail(fx, s0, s1, kind, opt = {}) {
    const parts = [], step = 0.75;
    for (let s = s0; s < s1 - 0.01; s += step) {
      const sa = s, sb = Math.min(s + step, s1), xa = fx(sa), xb = fx(sb), dx = xb - xa, ds = sb - sa, L = Math.hypot(dx, ds), yaw = Math.atan2(-dx, ds), mid = [(xa + xb) / 2, 0, -(sa + sb) / 2];
      const onBridge = opt.bridge && sa >= opt.bridge[0] && sa < opt.bridge[1];
      parts.push(P(G.box(2.3, 0.12, 0.26), onBridge ? '#7B5A3A' : '#5A4630', [mid[0], onBridge ? 0.2 : 0.1, mid[2]], [0, yaw, 0]));
      for (const sd of [-1, 1]) { const ox = Math.cos(yaw) * GAUGE * sd, oz = -Math.sin(yaw) * GAUGE * sd; parts.push(P(G.box(0.09, 0.14, L + 0.02), '#8E959E', [mid[0] + ox, onBridge ? 0.33 : 0.23, mid[2] + oz], [0, yaw, 0])); }
      if (!onBridge) parts.push(P(G.box(3.4, 0.7, L + 0.05), '#8C7B62', [mid[0], -0.3, mid[2]], [0, yaw, 0]));
      else { parts.push(P(G.box(2.6, 0.14, L + 0.02), '#8A5A2B', [mid[0], 0.07, mid[2]], [0, yaw, 0])); if (Math.round(sa / step) % 4 === 0) for (const sd of [-1, 1]) parts.push(P(G.box(0.18, 1.6, 0.18), '#6B4426', [mid[0] + Math.cos(yaw) * 1.1 * sd, -0.7, mid[2] - Math.sin(yaw) * 1.1 * sd])); }
    }
    return mesh(merge(parts));
  }
  addPiece(m) { this.world.add(m); this.pieces.push(m); return m; }
  makeJunction(j) {
    const q = this.qs[this.qi++]; const J = { s: j, q, choice: 0, locked: false, shown: false, sides: [-1, 1], parts: {} };
    J.sides.forEach((c, i) => {
      const fx = s => branchX(j, c, s), br = [j + 28, j + 52];
      const a = this.addPiece(this.rail(fx, j, br[0], 'branch')); const b = this.addPiece(this.rail(fx, br[0], br[1], 'branch', { bridge: br })); const d = this.addPiece(this.rail(fx, br[1], j + 82, 'branch'));
      J.parts[c] = { a, b, d, br };
      // sign and flag on each side
      const o = q.opts[i], col = o.flag ? (o.flag === 'green' ? '#2E9E57' : '#D23B3B') : (i ? '#B5452C' : '#2F6DB5');
      const post = new THREE.Group(); post.add(mesh(merge([P(G.box(0.16, 4.2, 0.16), '#5A3A22', [0, 2.1, 0]), P(G.box(0.12, 2.4, 0.12), '#5A3A22', [c * 0.0, 4.9, 0])])));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); flag.position.set(0.72 * -c, 5.6, 0); post.add(flag); J.parts[c].flag = flag;
      const lab = o.flag ? (o.flag === 'green' ? '🟢 GREEN FLAG' : '🔴 RED FLAG') : (i ? 'B' : 'A');
      const sg = sign([lab], o.flag ? 3.2 : 1.4, 0.9, { bg: col, fg: '#FFFFFF', r: 18 }); sg.position.set(0, 3.6, 0.1); post.add(sg);
      post.position.set(c * (SPLIT + 2.3), 0, -(j + 14)); this.world.add(post); this.deco.push(post);
    });
    // a sign before the split
    this.juncs.push(J);
  }
  makeFinish(s) {
    const g = new THREE.Group(); g.add(mesh(prop('finish'))); const b = sign(['🏁 STATION'], 7.4, 1.2, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); b.position.y = 3.7; g.add(b);
    g.position.z = -s; this.world.add(g); this.deco.push(g);
  }
  decorate(s) {
    const r = this.r, put = (o, x, y = -0.55) => { if (!o) return; o.position.set(x, y, -s - r() * 4); o.rotation.y = r() * 6; this.world.add(o); this.deco.push(o); };
    for (const side of [-1, 1]) {
      const x0 = side * (11 + r() * 30);
      const k = r();
      if (k < 0.35) put(mesh(prop('mangrove', 3.5 + r() * 2)), x0, -0.6);
      else if (k < 0.55) put(kit(pick(r, ['tree_default', 'tree_oak', 'tree_palmTall', 'tree_palmBend']), 6 + r() * 4), side * (16 + r() * 30), -0.4);
      else if (k < 0.7) put(mesh(prop('reeds')), side * (9 + r() * 8), -0.6);
      if (r() < 0.45) put(mesh(prop('victoria')), side * (8.5 + r() * 14), -0.48);
      if (r() < 0.25) put(mesh(prop('waterlily')), side * (8.5 + r() * 10), -0.5);
      if (r() < 0.05) put(kit('canoe', null, 4), side * (12 + r() * 10), -0.45);
      if (r() < 0.06) put(mesh(prop('caiman')), side * (9 + r() * 6), -0.5);
    }
    if (r() < 0.08) { const fl = new THREE.Group(); for (let i = 0; i < 5; i++) { const b = mesh(prop('ibis')); b.position.set(i * 1.4, Math.sin(i) * 0.6, i * 1.1); fl.add(b); } fl.position.set((r() - 0.5) * 30, 9 + r() * 6, -s - 40); fl.userData.fly = 3 + r() * 3; this.world.add(fl); this.deco.push(fl); }
  }

  /* ---------- where the train is on the track ---------- */
  xAt(s) {
    for (const J of this.juncs) if (s >= J.s && s <= J.s + 82 && J.choice) return branchX(J.s, J.choice, s);
    return 0;
  }
  placeTrain(s, dt) {
    const place = (m, sc) => { const x = this.xAt(sc), x2 = this.xAt(sc + 0.5); m.position.set(x, 0.12, -sc); m.rotation.y = Math.atan2(-(x2 - x), 0.5); };
    if (!this.fall) { place(this.loco, s + 3.4); place(this.wagon, s - 2.4); }
  }

  /* ---------- input ---------- */
  input(dir) {
    if (this.state === 'intro') { this.go(); return; }
    if (this.state !== 'run') return;
    const J = this.juncs.find(J => !J.locked && J.shown); if (!J) return;
    if (dir === 'left') this.choose(J, -1); else if (dir === 'right') this.choose(J, 1);
  }
  pick(i) { const J = this.juncs.find(J => !J.locked && J.shown); if (J && this.state === 'run') this.choose(J, i ? 1 : -1); }
  choose(J, c) {
    if (J.locked) return; J.choice = c; J.chosenAt = J.s - this.s; SND.lane();
    [-1, 1].forEach(sd => { const p = J.parts[sd]; [p.a, p.b, p.d].forEach(m => { m.material = sd === c ? MAT.glow : MAT.flat; }); });
    this.ui.tquestion(J, this.readDist());
  }
  readDist() { return Math.max(this.v, 8) * this.readTime() + 12; }
  go() { if (this.state !== 'intro') return; this.state = 'run'; this.ui.toast('All aboard!', 'go'); SND.unlock(); SND.startMusic('calm'); this.eng.watch = true; }

  /* ---------- the frame ---------- */
  update(dt) {
    const cam = this.eng.camera; this.pc.update(dt); this.waterU.uT.value = this.eng.time;
    this.water.position.x = this.loco.position.x; this.water.position.z = this.loco.position.z - 60;
    if (this.state === 'intro') {
      this.introT += dt; const k = clamp(this.introT / 2.4, 0, 1), e = k * k * (3 - 2 * k);
      cam.position.set(lerp(6, 0, e), lerp(3, 6.2, e), lerp(-10, 9.5, e)); cam.lookAt(0, 1.6, lerp(-2, -12, e));
      if (this.opt.autostart && this.introT > 2.4) this.go(); return;
    }
    if (this.state === 'over' || this.state === 'won') { cam.lookAt(this.loco.position.x, 1.5, this.loco.position.z); return; }
    this.t += dt;
    this.smokeUpdate(dt); this.decoUpdate(dt);
    if (this.fall) { this.fallUpdate(dt); this.camFollow(dt); return; }
    // the next junction that isn't decided
    const J = this.juncs.find(J => !J.locked);
    let v = this.speedNow();
    if (J) {
      const d = J.s - this.s;
      if (!J.shown && d < this.readDist()) { J.shown = true; J.shownAt = d; this.ui.tquestion(J, this.readDist()); SND.pop(); }
      if (!J.choice && d < 22) v = Math.min(v, Math.max(0, (d - 4) * 0.7)); // brake and wait for a choice
      if (J.choice && d < 1.5) { J.locked = true; J.right = J.q.opts[(J.choice < 0 ? 0 : 1)].ok; this.ui.tquestion(null); this.resolve(J); }
      if (J.shown && !J.locked) this.ui.tprogress(clamp(d / (J.shownAt || 1), 0, 1), !J.choice && d < 10);
    }
    this.v = damp(this.v, v, 2.2, dt); this.s += this.v * dt;
    // the wrong side's bridge gives way
    for (const K of this.juncs) if (K.locked && !K.right && !K.fell && this.s > K.s + 36) { K.fell = true; this.startFall(K); }
    // pass a correct junction: done
    this.juncs = this.juncs.filter(K => { if (K.locked && K.right && this.s > K.s + 84) { this.done++; return false; } return true; });
    if (this.finishAt && this.s >= this.finishAt) { this.end(true); return; }
    this.placeTrain(this.s, dt); this.camFollow(dt);
    this.buildTrackTo(this.s + AHEAD); this.cleanup();
    this.hud();
  }
  camFollow(dt) {
    const cam = this.eng.camera, lx = this.loco.position.x, lz = this.loco.position.z, wx = this.wagon.position.x;
    cam.position.x = damp(cam.position.x, wx * 0.8, 3, dt); cam.position.y = damp(cam.position.y, 6.4, 3, dt); cam.position.z = damp(cam.position.z, this.wagon.position.z + 9.5, 6, dt);
    cam.lookAt(lx * 0.8, 1.4, lz - 14);
  }
  resolve(J) {
    if (J.right) {
      this.correct++; this.streak++; const early = clamp((J.chosenAt || 0) / (J.shownAt || 1), 0, 1), mult = 1 + Math.floor(this.streak / 3) * 0.5;
      const pts = Math.round((100 + early * 50) * mult); this.score += pts; SND.good(); this.ui.tresult(true, '+' + pts + (mult > 1 ? ' (streak ×' + mult + ')' : ''), J.q.why);
      this.pc.play('Yes', { once: true, fade: 0.15 }); setTimeout(() => this.pc && this.state === 'run' && this.pc.play('Idle_Loop', { fade: 0.3 }), 1800);
      J.parts[J.choice].flag.material.emissive = new THREE.Color('#2E9E57');
    } else {
      this.wrong++; this.streak = 0; SND.bad(); const right = J.q.opts.find(o => o.ok);
      this.missed.push([J.q.text, right.flag ? (right.flag === 'green' ? 'Green flag' : 'Red flag') : right.text, J.q.why]);
      this.ui.tresult(false, 'Wrong track!', (right.flag ? '' : 'The answer: ' + right.text + '. ') + (J.q.why || ''));
    }
  }
  startFall(J) {
    const p = J.parts[J.choice]; this.fall = { t: 0, J, piece: p.b, x: this.loco.position.x, z: this.loco.position.z };
    this.pc.play('Hit_Chest', { once: true, fade: 0.1 }); SND.hit();
  }
  fallUpdate(dt) {
    const F = this.fall; F.t += dt; const t = F.t;
    F.piece.position.y = -Math.min(t * t * 4, 3); F.piece.rotation.z = Math.min(t * 0.4, 0.3) * F.J.choice;
    const drop = Math.min(t * t * 5, 4.2); [this.loco, this.wagon].forEach((m, i) => { m.position.y = 0.12 - drop * (i ? 0.85 : 1); m.rotation.x = Math.min(t * 0.5, 0.35); m.position.z -= (1 - Math.min(t, 1)) * this.v * dt; });
    if (t > 0.65 && !F.splashed) { F.splashed = true; SND.splash(); this.splash.visible = true; this.splash.position.set(this.loco.position.x, -0.5, this.loco.position.z); this.splash.scale.setScalar(0.3); }
    if (F.splashed) { const k = clamp((t - 0.65) / 0.8, 0, 1); this.splash.scale.setScalar(0.3 + k * 1.6); this.splash.position.y = -0.5 + Math.sin(k * Math.PI) * 0.8; if (k >= 1) this.splash.visible = false; }
    if (t > 2.4) {
      if (this.mode !== 'practice') this.hearts--;
      F.J.done = true; F.piece.position.y = 0; F.piece.rotation.z = 0; this.juncs = this.juncs.filter(K => K !== F.J); this.done++;
      this.fall = null; this.loco.rotation.x = this.wagon.rotation.x = 0; this.s = F.J.s + 84; this.v = 0;
      if (this.hearts <= 0) { this.end(false); return; }
      if (this.finishAt && this.s >= this.finishAt - 2) { this.end(true); return; }
      this.placeTrain(this.s, 0); this.pc.play('Idle_Loop', { fade: 0.2 }); this.ui.toast('Back on track', 'good');
    }
  }
  smokeUpdate(dt) {
    this.smokeT = (this.smokeT || 0) + dt;
    if (this.smokeT > 0.22) { this.smokeT = 0; const p = this.smoke.find(x => x.t > 1.1) || this.smoke[0]; p.t = 0; p.m.visible = true; const c = new THREE.Vector3(0, 3.45, -2.3); this.loco.localToWorld(c); p.m.position.copy(c); }
    this.smoke.forEach(p => { if (p.t > 1.1) { p.m.visible = false; return; } p.t += dt; p.m.position.y += dt * 2.2; p.m.position.z += dt * (this.v * 0.25); p.m.scale.setScalar(0.6 + p.t * 1.1); p.m.material.opacity = 0.55 * (1 - p.t / 1.1); });
  }
  decoUpdate(dt) { this.deco.forEach(o => { if (o.userData.fly) { o.position.x += dt * o.userData.fly; o.position.z += dt * 0.5; } }); }
  cleanup() {
    const lim = this.s - 30;
    this.pieces = this.pieces.filter(p => { const b = p.geometry.boundingBox; if (b && -b.min.z < lim - 5 && !this.juncs.some(J => Object.values(J.parts).some(q => q.a === p || q.b === p || q.d === p))) { this.world.remove(p); p.geometry.dispose(); return false; } return true; });
    this.deco = this.deco.filter(o => { if (-o.position.z < lim - 10) { this.world.remove(o); return false; } return true; });
  }
  end(won) {
    if (this.ended) return; this.ended = true; this.state = won ? 'won' : 'over'; this.eng.watch = false; SND.stopMusic(); this.ui.tquestion(null);
    if (won) { SND.win(); this.pc.play('Dance_Loop', { fade: 0.3 }); }
    const lost = this.wrong;
    const res = { kind: 'train', won, score: Math.round(this.score), dist: Math.round(this.s), coins: this.correct, correct: this.correct, wrong: this.wrong, dodged: {}, facts: [], missed: this.missed, level: this.level, stars: won ? (lost === 0 ? 3 : lost === 1 ? 2 : 1) : 0 };
    setTimeout(() => this.ui.end(res), 1500);
  }
  hud(force) { this.ui.hud({ score: Math.round(this.score), coins: this.correct, coinIcon: '✓', hearts: this.hearts, dist: this.done, target: this.total === Infinity ? null : this.total, unit: 'stops', shield: 0, magnet: 0, double: 0, badges: null }, force); }
}
