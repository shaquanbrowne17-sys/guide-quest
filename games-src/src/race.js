/* Racing: one game, three vehicles. A kart through town, a bike on a forest trail, a canoe on the river.
   Three laps against three rivals. Before each checkpoint a question comes up; steer through the gate
   with the right answer for a speed boost. Questions come from every explorer and the Memory Gems. */
import { THREE, clamp, lerp, damp, rng, shuffle, G, P, merge, mesh, MAT, sprite, sign, setSky, SND, today, hash } from './core.js';
import { prop, BUILD } from './props.js';
import { loadKit, kit } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { DATA } from './data.js';

const PI = Math.PI;
Object.assign(BUILD, {
  rkart: (c = '#D3243A') => merge([P(G.box(1.25, 0.22, 2.1), c, [0, 0.32, 0]), P(G.box(1.0, 0.28, 0.5), c, [0, 0.5, -0.85]), P(G.box(1.35, 0.08, 0.5), '#1E1F22', [0, 0.32, 1.12]), P(G.box(0.62, 0.42, 0.12), '#2A2D33', [0, 0.62, 0.42]),
    P(G.box(0.62, 0.1, 0.5), '#2A2D33', [0, 0.46, 0.22]), P(G.cyl(0.04, 0.04, 0.4, 6), '#9AA3AE', [0, 0.62, -0.22], [0.9, 0, 0]), P(G.tor(0.14, 0.03, 5, 12), '#1E1F22', [0, 0.78, -0.36], [0.6, 0, 0]),
    ...[[-0.68, -0.72], [0.68, -0.72], [-0.68, 0.72], [0.68, 0.72]].map(([x, z]) => P(G.cyl(0.24, 0.24, 0.2, 10), '#1E1F22', [x, 0.24, z], [0, 0, PI / 2]))]),
  rbike: (c = '#2F6DB5') => merge([P(G.tor(0.34, 0.04, 5, 16), '#1E1F22', [0, 0.36, -0.55], [0, PI / 2, 0]), P(G.tor(0.34, 0.04, 5, 16), '#1E1F22', [0, 0.36, 0.55], [0, PI / 2, 0]),
    P(G.box(0.05, 0.05, 0.95), c, [0, 0.62, 0], [0.25, 0, 0]), P(G.box(0.05, 0.5, 0.05), c, [0, 0.55, 0.22], [-0.25, 0, 0]), P(G.box(0.05, 0.55, 0.05), c, [0, 0.62, -0.45], [0.3, 0, 0]),
    P(G.box(0.18, 0.06, 0.28), '#1E1F22', [0, 0.86, 0.25]), P(G.box(0.56, 0.04, 0.04), '#9AA3AE', [0, 0.95, -0.52])]),
  rgate: (w = 3.6, c = '#2F6DB5', h = 4.6) => merge([P(G.box(0.18, h, 0.18), '#F4F1EA', [-w / 2, h / 2, 0]), P(G.box(0.18, h, 0.18), '#F4F1EA', [w / 2, h / 2, 0]), P(G.box(w, 0.5, 0.16), c, [0, h - 0.1, 0])]),
  startline: (w = 10) => { const p = []; for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) p.push(P(G.box(w / 12, 0.02, 0.6), (i + j) % 2 ? '#FFFFFF' : '#1E1F22', [-w / 2 + (i + 0.5) * w / 12, 0.03, (j - 0.5) * 0.6])); return merge(p); },
});

const LANE_COL = ['#2F6DB5', '#E9B649', '#D3243A'], LANE_TAG = ['A', 'B', 'C'];
const VEH = {
  kart: { key: 'racekart', title: 'Town Kart Race', icon: '🏎️', gid: 'race:kart', vmax: 18, accel: 7, S: 1.0, W: 11, road: '#4A4D52', edge: '#E9E2D3', grass: '#6FA04A', ride: 'Driving_Loop', place: 'through town',
    sky: { top: '#5A97D6', bottom: '#F4E2B8', fogNear: 80, fogFar: 220, sun: '#FFE8C0', sunI: 2.3, sunPos: [-8, 12, 6], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#5E6A3A' } },
  bike: { key: 'racebike', title: 'Forest Bike Race', icon: '🚲', gid: 'race:bike', vmax: 12, accel: 5, S: 0.76, W: 7.5, road: '#9C7A52', edge: '#7A5C3A', grass: '#5E8F3E', ride: 'Driving_Loop', place: 'on the forest trail',
    sky: { top: '#6FA4D8', bottom: '#E8E6C0', fogNear: 40, fogFar: 140, sun: '#FFF1D0', sunI: 2.0, sunPos: [6, 12, -4], hemi: 1.6, skyLight: '#E3F0E8', groundLight: '#4E6A3A' } },
  canoe: { key: 'racecanoe', title: 'River Canoe Race', icon: '🛶', gid: 'race:canoe', vmax: 9, accel: 3.5, S: 0.62, W: 12, road: '#3E4A3C', edge: '#B59A6A', grass: '#5E8F3E', ride: 'Sitting_Idle_Loop', place: 'on the river',
    sky: { top: '#5E9BD6', bottom: '#F2DDB0', fogNear: 60, fogFar: 170, sun: '#FFE8C0', sunI: 2.2, sunPos: [-10, 12, 5], hemi: 1.55, skyLight: '#DDEBFF', groundLight: '#556B3A' } },
};
const RIVALS = [{ name: 'Ann', look: { body: 'f', skin: 2, hair: 'buns', bottom: 'skirt' }, c: '#2E7D4F', skill: 0.97 }, { name: 'Ravi', look: { body: 'm', skin: 3, hair: 'parted' }, c: '#8E5BB5', skill: 0.94 }, { name: 'Keisha', look: { body: 'f', skin: 1, hair: 'long', bottom: 'skirt' }, c: '#E8641E', skill: 0.91 }];
const LAPS = 3, GATES = [0.3, 0.8];

export const RACES = {};
Object.values(VEH).forEach(v => { RACES[v.key] = { key: v.key, gid: v.gid, title: v.title, icon: v.icon, kind: 'race', veh: v, music: 'run', sky: v.sky,
  blurb: 'Race ' + v.place + ': three laps against Ann, Ravi and Keisha. Before each checkpoint a question comes up from the explorers or the Memory Gems. Steer through the right gate for a boost.',
  howTo: 'Slide left and right to steer (or swipe). Steer through the gate with the right answer.',
  modes: { endless: ['🏁', 'Race', 'Three laps, four racers.'], daily: ['📅', 'Daily race', 'The same questions for everyone today.'], practice: ['⏱', 'Time trial', 'No rivals. Just you and the questions.'] }, board: 'endless', levels: 1 }; });

export class Race {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = RACES[key]; this.V = this.T.veh; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui; this.level = 1; this.noSwipe = true;
    this.seed = mode === 'daily' ? hash(today() + key) : (Math.random() * 1e9) >>> 0; this.r = rng(this.seed);
  }
  async load(progress) {
    const V = this.V; progress && progress(0.1);
    await loadKit(V.key === 'racekart' ? ['tree_palmTall', 'tree_palmBend', 'tree_oak', 'plant_bushLarge'] : V.key === 'racebike' ? ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_pineTallA_detailed', 'plant_bushLarge', 'rock_largeA', 'stump_round', 'mushroom_redGroup'] : ['canoe', 'tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'plant_bushLarge', 'lily_large']);
    progress && progress(0.35);
    this.pc = await makeCharacter(myLook()); progress && progress(0.55);
    const rivals = this.mode === 'practice' || this.opt.idle ? [] : RIVALS;
    this.rv = await Promise.all(rivals.map(r => makeCharacter(r.look, 'pathfinder')));
    progress && progress(0.9); this.build(); progress && progress(1);
  }
  /* ---------- the track: a wobbly loop, sampled by arc length ---------- */
  track() {
    const V = this.V, N = 720, pts = [];
    for (let i = 0; i <= N; i++) { const th = (i / N) * PI * 2; pts.push(new THREE.Vector3(V.S * (62 + 12 * Math.sin(3 * th + 0.4)) * Math.cos(th), 0, V.S * (42 + 9 * Math.cos(2 * th)) * Math.sin(th))); }
    const s = [0]; for (let i = 1; i <= N; i++) s.push(s[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.pts = pts; this.sa = s; this.lap = s[N];
  }
  at(s, u = 0, y = 0, out = new THREE.Vector3()) {
    const L = this.lap; s = ((s % L) + L) % L; let lo = 0, hi = this.sa.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.sa[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[hi], k = (s - this.sa[lo]) / (this.sa[hi] - this.sa[lo] || 1), tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    return out.set(a.x + tx * k + (-tz / l) * u, y, a.z + tz * k + (tx / l) * u);
  }
  yawAt(s) { const a = this.at(s - 0.5), b = this.at(s + 0.5); return Math.atan2(b.x - a.x, b.z - a.z); }
  build() {
    const { scene } = this.eng, V = this.V; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, V.sky); this.world = new THREE.Group(); scene.add(this.world); this.track();
    const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: V.grass })); g.rotation.x = -PI / 2; g.position.y = -0.03; this.world.add(g);
    // the road / trail / river as a ribbon with edges
    const W = V.W, parts = [], water = [], step = 2, river = V.key === 'racecanoe';
    for (let s = 0; s < this.lap; s += step) {
      const q = (u0, u1, y, col, to = parts) => { const a = this.at(s, u0), b = this.at(s + step + 0.05, u0), c = this.at(s + step + 0.05, u1), d = this.at(s, u1); to.push(quad(a, b, c, d, y, col)); };
      if (river) { q(-W / 2, 0, 0.01, V.road, water); q(0, W / 2, 0.01, V.road, water); } else q(-W / 2, W / 2, 0.01, V.road);
      const cb = (Math.floor(s / 4) % 2) ? V.edge : (V.key === 'racekart' ? '#D3243A' : V.edge);
      q(-W / 2 - 0.9, -W / 2, 0.03, cb); q(W / 2, W / 2 + 0.9, 0.03, cb);
    }
    this.world.add(new THREE.Mesh(merge(parts), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    if (river) this.world.add(new THREE.Mesh(merge(water), new THREE.MeshPhongMaterial({ vertexColors: true, specular: '#B8C8B0', shininess: 45, side: THREE.DoubleSide })));
    const sl = mesh(prop('startline', W)); sl.position.copy(this.at(0)); sl.rotation.y = this.yawAt(0); this.world.add(sl);
    const banner = mesh(prop('rgate', W + 1.2, '#1F4D3A')); banner.position.copy(this.at(0)); banner.rotation.y = this.yawAt(0); this.world.add(banner);
    const fs = sign(['🏁 ' + V.title], Math.min(W, 8), 0.85, { bg: '#1F4D3A', fg: '#F2C14E', r: 14 }); fs.position.copy(this.at(0.15, 0, 4.0)); fs.rotation.y = this.yawAt(0) + PI; this.world.add(fs);
    // checkpoints: three gates side by side, A B C
    this.gates = [];
    for (let lp = 0; lp < LAPS; lp++) GATES.forEach((f, gi) => { this.gates.push({ s: lp * this.lap + f * this.lap, n: lp * GATES.length + gi }); });
    const gw = W / 3;
    GATES.forEach(f => { const s = f * this.lap, yaw = this.yawAt(s);
      for (let k = 0; k < 3; k++) { const gm = mesh(prop('rgate', gw - 0.15, LANE_COL[k])); gm.position.copy(this.at(s, (k - 1) * gw)); gm.rotation.y = yaw; this.world.add(gm);
        const t = sprite([LANE_TAG[k]], 1.1, 1.1, { bg: LANE_COL[k], fg: '#FFFFFF', w: 128, h: 128, r: 64 }); t.position.copy(this.at(s, (k - 1) * gw, 5.3)); this.world.add(t); } });
    this.scenery();
    // the racers
    const mk = (ch, c) => { const g = new THREE.Group(); let v;
      if (V.key === 'racekart') { v = mesh(prop('rkart', c)); ch.root.position.set(0, 0.12, 0.25); }
      else if (V.key === 'racebike') { v = mesh(prop('rbike', c)); ch.root.position.set(0, 0.32, 0.18); }
      else { v = kit('canoe', null, 3.6) || mesh(prop('rkart', c)); if (v.geometry && v.geometry.attributes.color) { v.geometry = v.geometry.clone(); const cc = v.geometry.attributes.color; for (let i = 0; i < cc.count; i++) cc.setXYZ(i, cc.getX(i) * 0.72, cc.getY(i) * 0.6, cc.getZ(i) * 0.5); } ch.root.position.set(0, -0.05, 0.35); const pd = mesh(prop('paddle')); pd.position.set(0.55, 1.0, 0.2); pd.rotation.set(-0.25, 0, 0.5); g.add(pd); g.paddle = pd; }
      g.add(v); g.add(ch.root); ch.root.rotation.y = PI; if (ch.shadow) ch.shadow.visible = false; ch.play(V.ride); this.world.add(g); return g; };
    this.me = { ch: this.pc, g: mk(this.pc, '#D3243A'), s: -2, u: 0, uT: 0, v: 0, boost: 0, lap: 0, done: false, name: 'You' };
    this.racers = [this.me];
    this.rv.forEach((ch, i) => { const R = RIVALS[i]; this.racers.push({ ch, g: mk(ch, R.c), s: [3, 3, 7.5][i], u: [-1, 1, 0][i] * gw, uT: [-1, 1, 0][i] * gw, v: 0, boost: 0, lap: 0, done: false, name: R.name, skill: R.skill, ai: true }); });
    this.me.u = this.me.uT = 0; this.me.s = -2;
    this.questions = this.pickQuestions(this.gates.length);
    this.reset();
  }
  scenery() {
    const V = this.V, r = this.r, W = V.W;
    for (let s = 0; s < this.lap; s += V.key === 'racebike' ? 5 : 9) for (const sd of [-1, 1]) {
      if (Math.abs(((s / this.lap) % 1) - 0) < 0.02) continue;
      const off = sd * (W / 2 + 3 + r() * (V.key === 'racekart' ? 6 : 10)), p = this.at(s, off), yaw = this.yawAt(s);
      let m = null;
      if (V.key === 'racekart') {
        const roll = r();
        if (roll < 0.35) { m = mesh(prop('house', ['#F2EBDD', '#9ED3E8', '#F2D16B', '#F2B8A8', '#C9E8B0'][Math.floor(r() * 5)], ['#2E7D4F', '#24578F', '#B5452C'][Math.floor(r() * 3)], 5, 5)); m.rotation.y = yaw + (sd > 0 ? -PI / 2 : PI / 2); p.copy(this.at(s, sd * (W / 2 + 7))); }
        else if (roll < 0.45) { m = mesh(prop('shop', ['#E9B649', '#9ED3E8', '#F2B8A8'][Math.floor(r() * 3)], '#B5452C', 5)); m.rotation.y = yaw + (sd > 0 ? -PI / 2 : PI / 2); p.copy(this.at(s, sd * (W / 2 + 7))); }
        else if (roll < 0.6) { m = mesh(prop('lamp')); p.copy(this.at(s, sd * (W / 2 + 1.4))); m.rotation.y = yaw; }
        else { const n = ['tree_palmTall', 'tree_palmBend', 'tree_oak', 'plant_bushLarge'][Math.floor(r() * 4)]; m = kit(n, n === 'plant_bushLarge' ? 1.4 : 5 + r() * 4); }
      } else if (V.key === 'racebike') { const n = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_pineTallA_detailed', 'plant_bushLarge', 'rock_largeA', 'stump_round', 'mushroom_redGroup'][Math.floor(r() * 9)]; m = kit(n, { plant_bushLarge: 1.4, rock_largeA: 1.2, stump_round: 0.5, mushroom_redGroup: 0.45 }[n] || 5 + r() * 6); }
      else { const n = ['tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'plant_bushLarge'][Math.floor(r() * 4)]; m = r() < 0.75 ? kit(n, n === 'plant_bushLarge' ? 1.4 : 5 + r() * 5) : mesh(prop('mangrove', r() < 0.5 ? 4 : 5));
        if (r() < 0.35) { const ll = kit('lily_large', null, 4); if (ll) { ll.position.copy(this.at(s + 3, sd * (W / 2 - 1.2), -0.02)); this.world.add(ll); } } }
      if (m) { m.position.copy(p); if (!m.rotation.y) m.rotation.y = r() * 6; this.world.add(m); }
    }
  }
  pickQuestions(n) {
    const r = this.r, pool = [];
    Object.keys(DATA.ALL).forEach(k => DATA.ALL[k].forEach(q => pool.push({ topic: DATA.TNAMES[k] || k, q: q[0], opts: q[1], right: q[2], why: q[3] || '' })));
    DATA.GEMS.forEach((g, i) => { const words = g[1].split(' '); const start = words.slice(0, Math.min(9, words.length - 2)).join(' ');
      const others = shuffle(r, DATA.GEMS.filter((_, j) => j !== i)).slice(0, 2).map(x => x[0]); pool.push({ topic: 'Memory Gem', q: 'Which text begins: “' + start + '…”?', opts: [g[0], ...others], right: 0, why: g[0] + ': “' + g[1] + '”' }); });
    return shuffle(r, pool).slice(0, n).map(q => { const wrong = shuffle(r, q.opts.filter((_, i) => i !== q.right)).slice(0, 2), opts = shuffle(r, [q.opts[q.right], ...wrong]); return { topic: q.topic, q: q.q, opts, right: opts.indexOf(q.opts[q.right]), why: q.why }; });
  }
  reset() {
    this.state = 'intro'; this.introT = 0; this.t = 0; this.count = -1; this.right = 0; this.wrong = 0; this.missed = []; this.ended = false; this.finishOrder = [];
    this.racers.forEach(R => this.place(R)); this.hud(true); this.showQ(null);
  }
  place(R) { const p = this.at(R.s, R.u); R.g.position.set(p.x, this.V.key === 'racecanoe' ? -0.14 : 0.02, p.z); R.g.rotation.y = this.yawAt(R.s) + (R.uT - R.u) * 0.12; }
  /* ---------- input ---------- */
  input(dir) { if (this.state !== 'run') return; const gw = this.V.W / 3; if (dir === 'left') this.me.uT = clamp(this.me.uT - gw, -gw, gw); if (dir === 'right') this.me.uT = clamp(this.me.uT + gw, -gw, gw); }
  press(x) { this.dragX = x; this.dragU = this.me.uT; }
  drag(x, y, dx) { if (this.state !== 'run') return; const lim = this.V.W / 2 - 0.9; this.me.uT = clamp(this.dragU + dx / Math.min(innerWidth, 500) * this.V.W * 1.15, -lim, lim); }
  release() {}
  go() { if (this.state !== 'intro') return; this.state = 'count'; this.count = 3.2; SND.unlock(); this.eng.watch = true; }
  /* ---------- each frame ---------- */
  idleView(dt) { this.racers.forEach(R => R.ch.update(dt)); this.place(this.me); const t = this.eng.time * 0.15, c = this.eng.camera, p = this.me.g.position, tall = innerHeight > innerWidth, Rr = tall ? 9 : 7;
    c.position.set(p.x + Math.sin(t) * Rr, tall ? 5 : 3.5, p.z + Math.cos(t) * Rr); c.lookAt(p.x, tall ? -1 : 0.8, p.z); }
  camera(dt, snap) {
    const R = this.me, cam = this.eng.camera, tall = innerHeight > innerWidth, back = this.V.key === 'racekart' ? 7.2 : 6, up = tall ? 3.6 : 3.0;
    const want = this.at(R.s - back, R.u * 0.75, up), look = this.at(R.s + 9, R.u * 0.5, tall ? 0.2 : 0.8);
    if (snap) cam.position.copy(want); else cam.position.lerp(want, 1 - Math.exp(-5 * dt)); cam.lookAt(look);
  }
  update(dt) {
    const V = this.V; this.racers.forEach(R => R.ch.update(dt));
    if (this.state === 'intro') { this.introT += dt; const k = clamp(this.introT / 2.5, 0, 1), e = k * k * (3 - 2 * k), cam = this.eng.camera, p = this.me.g.position;
      this.camera(dt, true); const goal = cam.position.clone(); cam.position.set(lerp(p.x + 12, goal.x, e), lerp(18, goal.y, e), lerp(p.z + 12, goal.z, e)); cam.lookAt(this.at(this.me.s + 9, 0, 0.8)); if (this.opt.autostart && this.introT > 2.6) this.go(); return; }
    if (this.state === 'count') { const before = Math.ceil(this.count); this.count -= dt; const now = Math.ceil(this.count); this.camera(dt);
      if (now !== before) { if (now > 0) { this.ui.banner(String(now), '', 700); SND.lane(); } else { this.ui.banner('GO!', '', 800); SND.power(); SND.startMusic('run'); this.state = 'run'; } } return; }
    if (this.state !== 'run') { this.camera(dt); return; }
    this.t += dt;
    this.racers.forEach(R => {
      if (R.done) { R.v = damp(R.v, V.vmax * 0.45, 2, dt); }
      else {
        let vt = V.vmax * (R.ai ? R.skill : 1) * (R.boost > 0 ? 1.45 : 1);
        if (R.ai) { const gap = this.me.s - R.s; vt *= gap > 35 ? 1.1 : gap < -35 ? 0.92 : 1; }
        R.v = R.v < vt ? Math.min(vt, R.v + V.accel * dt) : damp(R.v, vt, 1.5, dt); R.boost = Math.max(0, R.boost - dt);
      }
      R.s += R.v * dt; R.u = damp(R.u, R.uT, R.ai ? 2.5 : 6, dt);
      // gates
      const g = this.gates.find(x => !R['g' + x.n] && R.s >= x.s);
      if (g) { R['g' + g.n] = true; this.gatePass(R, g); }
      // AI picks a lane before each gate
      if (R.ai && !R.done) { const ng = this.gates.find(x => !R['g' + x.n]); if (ng && ng.s - R.s < 45 && R.pick !== ng.n) { R.pick = ng.n; const q = this.questions[ng.n]; const ok = this.r() < 0.72; const lane = ok ? q.right : (q.right + 1 + Math.floor(this.r() * 2)) % 3; R.uT = (lane - 1) * V.W / 3; } }
      if (!R.done && R.s >= LAPS * this.lap) { R.done = true; this.finishOrder.push(R); if (R === this.me) this.finish(); }
      R.lap = Math.min(LAPS, Math.floor(Math.max(0, R.s) / this.lap) + 1);
      this.place(R);
      if (R.g.paddle) { const ph = (this.eng.time * (1.2 + R.v * 0.15)) % 1; R.g.paddle.rotation.x = -0.6 + Math.sin(ph * PI * 2) * 0.7; R.g.paddle.position.x = (Math.floor(this.eng.time * (1.2 + R.v * 0.15)) % 2 ? 1 : -1) * 0.55; }
    });
    // bumping
    this.racers.forEach(R => { if (R === this.me) return; if (Math.abs(R.s - this.me.s) < 1.8 && Math.abs(R.u - this.me.u) < 1.2) { if (!this.bumpT) { this.bumpT = 0.8; this.me.v *= 0.75; SND.hit(); } } });
    this.bumpT = Math.max(0, (this.bumpT || 0) - dt);
    // the next question
    const ng = this.gates.find(x => !this.me['g' + x.n]); this.showQ(ng && !this.me.done ? ng : null);
    this.camera(dt); this.hud();
  }
  gatePass(R, g) {
    const q = this.questions[g.n], lane = R.u < -this.V.W / 6 ? 0 : R.u > this.V.W / 6 ? 2 : 1, ok = lane === q.right;
    if (ok) { R.boost = 2.6; R.v = Math.max(R.v, this.V.vmax * 1.15); } else R.v *= 0.5;
    if (R !== this.me) return;
    if (ok) { this.right++; SND.power(); this.ui.toast('✓ Right! Boost!', 'good'); }
    else { this.wrong++; SND.bad(); this.ui.toast('✗ ' + q.opts[q.right], 'bad'); this.missed.push([q.q, q.opts[q.right]]); }
  }
  showQ(g) {
    let el = document.getElementById('h-rq'); if (!el) { el = document.createElement('div'); el.id = 'h-rq'; el.className = 'panel'; document.getElementById('s-hud').appendChild(el); }
    if (!g || this.state !== 'run') { el.hidden = true; this.qShown = null; return; }
    if (this.qShown === g.n) { const d = Math.max(0, Math.round(g.s - this.me.s)); el.querySelector('small').textContent = d + ' m to the gate'; return; }
    this.qShown = g.n; const q = this.questions[g.n]; el.hidden = false;
    el.innerHTML = '<span class="rq-tag">' + q.topic + ' · checkpoint ' + (g.n + 1) + ' of ' + this.gates.length + '</span><b>' + escH(q.q) + '</b><div class="rq-opts">' + q.opts.map((o, k) => '<button data-lane="' + k + '" style="--c:' + LANE_COL[k] + '"><i>' + LANE_TAG[k] + '</i>' + escH(o) + '</button>').join('') + '</div><small></small>';
    el.querySelectorAll('[data-lane]').forEach(b => { b.onclick = e => { e.stopPropagation(); this.me.uT = (+b.dataset.lane - 1) * this.V.W / 3; SND.lane(); }; b.onpointerdown = e => e.stopPropagation(); });
  }
  rank() { return [...this.racers].sort((a, b) => { const ia = this.finishOrder.indexOf(a), ib = this.finishOrder.indexOf(b); if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); return b.s - a.s; }); }
  finish() {
    if (this.ended) return; this.ended = true; this.state = 'won'; SND.stopMusic(); this.showQ(null);
    const pos = this.rank().indexOf(this.me) + 1, solo = this.racers.length === 1, secs = this.t;
    if (pos === 1 || solo) SND.win(); else SND.good();
    this.me.ch.play('Yes', { once: true, fade: 0.2 });
    const score = Math.max(0, Math.round((solo ? 600 : (5 - pos) * 300) + this.right * 150 + Math.max(0, 1200 - secs * 8)));
    const ord = ['1st', '2nd', '3rd', '4th'][pos - 1];
    const res = { won: true, score, level: 1, stars: this.wrong === 0 ? 3 : this.wrong <= 2 ? 2 : 1, title: solo ? 'Time trial: ' + fmt(secs) : ord + ' place!',
      stats: [[solo ? fmt(secs) : ord, solo ? 'time' : 'place'], [this.right + '/' + this.gates.length, 'right'], [fmt(secs), 'time'], [score, 'points']],
      list: this.missed.length ? ['Look at these again', this.missed.map(m => [m[0], '→ ' + m[1]])] : null,
      save: this.mode === 'practice' ? '' : this.mode === 'daily' ? 'daily' : 'endless', correct: this.right, wrong: this.wrong, dodged: {} };
    setTimeout(() => this.ui.end(res), 1600);
  }
  hud(force) {
    const pos = this.rank().indexOf(this.me) + 1, solo = this.racers.length === 1;
    this.ui.hud({ score: this.right * 150, coins: this.right, coinIcon: '✅', hearts: null, dist: 0, label: this.state === 'intro' ? this.T.title : 'Lap ' + Math.max(1, this.me.lap) + '/' + LAPS + (solo ? ' · ' + fmt(this.t) : ' · ' + ['1st', '2nd', '3rd', '4th'][pos - 1]), shield: 0, magnet: 0, double: 0, badges: null }, force);
  }
}
function quad(a, b, c, d, y, col) {
  const g = new THREE.BufferGeometry(), v = [a.x, y, a.z, b.x, y, b.z, c.x, y, c.z, a.x, y, a.z, c.x, y, c.z, d.x, y, d.z];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const cl = new THREE.Color(col), cols = []; for (let i = 0; i < 6; i++) cols.push(cl.r, cl.g, cl.b); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return g;
}
const fmt = s => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
