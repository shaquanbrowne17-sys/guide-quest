/* The Canoe Journey (Our Church's Story, G 4): paddle down the river of time, dock at each stop,
   walk in and meet the people, answer one question, and get your passport stamped.
   Facts come from the Our Church's Story explorer (Encyclopedia of Seventh-day Adventists,
   Davis Memorial Hospital, Adventist Mission). People on the wall are drawn plaques, not photos. */
import { THREE, clamp, lerp, damp, rng, pick, shuffle, G, P, merge, mesh, MAT, sign, setSky, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { loadKit, kit } from './kit.js';
import { makeCharacter, myLook } from './character.js';
import { DATA } from './data.js';

Object.assign(BUILD, {
  dock: (len = 7) => { const p = [P(G.box(3.2, 0.2, len), '#8A5A2B', [0, 0.5, 0])]; for (let i = 0; i < len / 0.5; i++) p.push(P(G.box(3.22, 0.03, 0.05), '#6E4424', [0, 0.61, -len / 2 + 0.25 + i * 0.5]));
    for (let z = -len / 2 + 0.3; z <= len / 2; z += 2.2) for (const x of [-1.5, 1.5]) p.push(P(G.cyl(0.12, 0.12, 2.0, 6), '#5A3A22', [x, -0.3, z])); return merge(p); },
  warehouse: (c = '#B9A27A') => merge([P(G.box(7, 4, 6), c, [0, 2, 0]), P(G.cyl(0, 5, 2, 4), '#7A3B2E', [0, 5, 0], [0, Math.PI / 4, 0], [1, 1, 0.86]), P(G.box(2.2, 2.6, 0.1), '#5A3A22', [0, 1.3, 3.05])]),
  ship: () => merge([P(G.box(3.2, 1.6, 12), '#3A2A1E', [0, 0.6, 0]), P(G.box(2.8, 0.2, 11), '#A8743F', [0, 1.45, 0]), P(G.cone(1.6, 2.4, 4), '#3A2A1E', [0, 0.6, -7], [-Math.PI / 2, Math.PI / 4, 0], [1, 1, 0.5]),
    P(G.cyl(0.14, 0.18, 10, 6), '#6E4424', [0, 6.4, -1.5]), P(G.cyl(0.12, 0.16, 8, 6), '#6E4424', [0, 5.4, 3]), P(G.box(0.06, 5, 4.2), '#F4EFE2', [0, 7, -1.5]), P(G.box(0.06, 4, 3.4), '#F4EFE2', [0, 5.6, 3])]),
  crates: () => merge([P(G.box(0.9, 0.9, 0.9), '#A8743F', [0, 0.45, 0]), P(G.box(0.9, 0.9, 0.9), '#8E5F33', [0.95, 0.45, 0.2]), P(G.box(0.8, 0.8, 0.8), '#B98A4F', [0.4, 1.3, 0.1])]),
  grave: () => merge([P(G.box(1.0, 0.25, 2.0), '#8D8A84', [0, 0.12, 0]), P(G.box(0.14, 1.4, 0.14), '#F4F1EA', [0, 0.95, -0.8]), P(G.box(0.8, 0.14, 0.14), '#F4F1EA', [0, 1.25, -0.8]), ...[-0.3, 0, 0.3].map((x, i) => P(G.ball(0.08, 6, 4), ['#F2C14E', '#D3243A', '#F4F1EA'][i], [x, 0.3, 0.4]))]),
  hut: () => merge([P(G.box(4, 2.2, 4), '#C9A46A', [0, 1.1, 0]), P(G.cone(3.6, 3, 8), '#B8A050', [0, 3.6, 0]), P(G.box(1.1, 1.7, 0.08), '#4A3220', [0, 0.85, 2.02])]),
  hospital: () => merge([P(G.box(12, 6, 7), '#F4F4F2', [0, 3, 0]), P(G.box(12.4, 0.4, 7.4), '#2F6DB5', [0, 6.2, 0]), ...[-4, -1.5, 1, 3.5].flatMap(x => [P(G.box(1.4, 1.2, 0.05), '#9ED3E8', [x, 4.2, 3.52]), P(G.box(1.4, 1.2, 0.05), '#9ED3E8', [x, 1.8, 3.52])]),
    P(G.box(2.2, 2.6, 0.08), '#2F6DB5', [0, 1.3, 3.55]), P(G.box(1.6, 0.45, 0.06), '#D3243A', [5.2, 4.9, 3.56]), P(G.box(0.45, 1.6, 0.06), '#D3243A', [5.2, 4.9, 3.56])]),
  office: () => merge([P(G.box(10, 4.5, 7), '#EADBB8', [0, 2.25, 0]), P(G.cyl(0, 7.2, 2.2, 4), '#2E7D4F', [0, 5.6, 0], [0, Math.PI / 4, 0], [1, 1, 0.72]), P(G.box(2, 2.6, 0.08), '#5A3A22', [0, 1.3, 3.55]),
    ...[-3.2, 3.2].map(x => P(G.box(1.6, 1.3, 0.05), '#9ED3E8', [x, 2.4, 3.52]))]),
  paddle: () => merge([P(G.cyl(0.035, 0.035, 2.0, 6), '#8A5A2B', [0, 0, 0]), P(G.box(0.24, 0.55, 0.04), '#A8743F', [0, -1.15, 0]), P(G.box(0.14, 0.06, 0.06), '#6E4424', [0, 1.0, 0])]),
  tract: () => merge([P(G.box(0.5, 0.06, 0.65), '#F4EFE2', [0, 0, 0]), P(G.box(0.45, 0.02, 0.6), '#FFFFFF', [0.02, 0.05, 0.02], [0, 0.2, 0]), P(G.box(0.3, 0.01, 0.06), '#1F4D3A', [0.02, 0.065, -0.15], [0, 0.2, 0])]),
  frame: () => merge([P(G.box(1.5, 1.9, 0.08), '#B8892A', [0, 0, 0])]),
});

/* the five stops, in order down the river */
const STOPS = [
  { s: 230, side: 1, year: '1880s', place: 'The Georgetown wharf', icon: '⚓', who: 'The wharf captain', scene: 'wharf', q: 0,
    look: { outfit: 'captain', body: 'm', skin: 1, hair: 'buzzed' },
    lines: ['Welcome to the Georgetown wharf! In the 1880s, Adventist tracts were reportedly left on a wharf like this one.', 'The tracts reached a woman named Alberta Alleyne, and she began keeping the Sabbath.', 'By 1885 more than 20 Sabbath keepers in British Guiana had asked the church in Battle Creek, USA, to send help. In 1886 Thomas E. Amsterdam organised a tract society.'] },
  { s: 500, side: -1, year: '1887–1895', place: 'The first church', icon: '⛪', who: 'Pastor W. G. Kneeland', scene: 'church', q: 2,
    look: { outfit: 'pastor', body: 'm', skin: 3, hair: 'parted' },
    lines: ['The General Conference sent G. G. Rupert. He reached Georgetown on 31 January 1887.', 'My wife and I served here from 1893 to 1896. In July 1895 I baptised six members of the Fleming family and organised a church.', 'Philip Giddings, a British Guianese believer, graduated from Battle Creek College in 1895 and led the building of a church in New Amsterdam.'] },
  { s: 770, side: 1, year: '1910–1927', place: 'Mount Roraima', icon: '⛰️', who: 'Chief Jeremiah', scene: 'roraima', q: 4,
    look: { outfit: 'village', body: 'm', skin: 2, hair: 'short' },
    lines: ['Far inland, near Mount Roraima, my people asked to be taught about God.', 'Elder Ovid E. Davis came to us in 1910 and again in 1911. He taught us from the Bible, and many chose to follow Jesus.', 'He died here of blackwater fever on 31 July 1911, and I buried him. For years we met at his grave on Sabbath. In 1922 I walked to Georgetown to ask for a teacher.', 'In 1927 A. W. and Elizabeth Cott began the Mount Roraima mission. People still remember Elder Davis here.'] },
  { s: 1040, side: -1, year: '1954–1967', place: 'Davis Memorial Hospital', icon: '🏥', who: 'A nurse', scene: 'hospital', q: 5,
    look: { outfit: 'nurse', body: 'f', skin: 2, hair: 'buns', bottom: 'skirt' },
    lines: ['In 1954 Dr E. C. Duerksen took charge of the new medical work in Georgetown.', 'In 1955 the hospital was named after Elder Davis, and it opened at Bel Air.', 'In 1967 it moved to its present home on D’Urban Street, Georgetown. Today it is linked with Loma Linda University.'] },
  { s: 1300, side: 1, year: '1971–today', place: 'The conference office', icon: '🏛️', who: 'The conference secretary', scene: 'office', q: 6,
    look: { outfit: 'casual', body: 'f', skin: 0, hair: 'long', bottom: 'skirt' },
    lines: ['Come in and see our wall of pioneers and presidents.', 'In 1971 Wallace W. Weithers became the first Guyanese president of the Guyana Mission.', 'In 1976 the mission became a self-supporting conference, with Roy I. McGarrell as president.', 'Our church belongs to the Caribbean Union Conference, part of the Inter-American Division. In 2019 there were 170 churches and 65,160 members in Guyana.'] },
];
const PLAQUES = [
  ['G. G. Rupert', '1887', 'First minister sent by the General Conference'],
  ['W. G. Kneeland', '1895', 'Organised a church in Georgetown'],
  ['W. W. Weithers', '1971', 'First Guyanese mission president'],
  ['Roy I. McGarrell', '1976', 'President of the new conference'],
];

export const CANOES = {
  canoe: {
    key: 'canoe', gid: 'canoe:journey', title: 'Canoe Journey', topic: 'story', icon: '🛶', music: 'calm', kind: 'canoe',
    blurb: 'Paddle down the river of our church’s story. Stop at the wharf, the first church, Mount Roraima, the hospital and the conference office, and meet the people.',
    howTo: 'Tap to paddle · swipe ← → to steer round logs',
    sky: { top: '#5E9BD6', bottom: '#F2DDB0', fogNear: 70, fogFar: 190, sun: '#FFE8C0', sunI: 2.2, sunPos: [-10, 12, 5], hemi: 1.55, skyLight: '#DDEBFF', groundLight: '#556B3A' },
    modes: { endless: ['🛶', 'The journey', 'Five stops. Collect every stamp in your passport.'], practice: ['🌊', 'Free paddle', 'Just the river. No stops.'] },
    board: 'endless', levels: 1,
  },
};

const W = 15, LAND = 40;
const X = s => 14 * Math.sin(s / 60) + 5 * Math.sin(s / 23);
const DX = s => 14 / 60 * Math.cos(s / 60) + 5 / 23 * Math.cos(s / 23);
/** world point at distance s down the river, u metres across (+ is the right bank), height y */
function at(s, u, y = 0, out = new THREE.Vector3()) { const dx = DX(s), n = Math.hypot(1, dx); return out.set(X(s) + u / n, y, -s + u * dx / n); }
const yawAt = s => -Math.atan2(DX(s), 1);   // rotation.y that points local -z downstream
const LAND_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
const TREES = ['tree_default', 'tree_oak', 'tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'tree_tall', 'tree_fat', 'plant_bushLarge'];

export class Canoe {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = CANOES[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui;
    this.seed = (Math.random() * 1e9) >>> 0; this.r = rng(this.seed); this.level = 1;
  }
  async load(progress) {
    progress && progress(0.1); await loadKit(TREES.concat(['canoe', 'log_large', 'lily_large', 'rock_largeA', 'grass_large'])); progress && progress(0.45);
    this.pc = await makeCharacter(myLook()); progress && progress(0.65);
    this.story = this.mode !== 'practice' && !this.opt.idle;
    this.npcs = this.story ? await Promise.all(STOPS.map(st => makeCharacter(Object.assign({ bottom: 'trousers' }, st.look), st.look.outfit))) : [];
    progress && progress(0.95); this.build(); progress && progress(1);
  }
  build() {
    const { scene } = this.eng; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky); this.world = new THREE.Group(); scene.add(this.world);
    // dark, tea-coloured river water (like Guyana's blackwater creeks)
    const wg = new THREE.PlaneGeometry(230, 230, 92, 92); wg.rotateX(-Math.PI / 2);
    const wm = new THREE.MeshPhongMaterial({ color: '#56412A', specular: '#9C8E74', shininess: 36, flatShading: true });
    const u = { uT: { value: 0 } }; wm.onBeforeCompile = sh => { Object.assign(sh.uniforms, u); sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp = modelMatrix * vec4(position, 1.0); transformed.y += sin(wp.x * 0.9 + uT * 1.6) * 0.07 + sin(wp.z * 0.7 + uT * 1.1) * 0.08 + sin((wp.x + wp.z) * 1.7 + uT * 2.3) * 0.03;'); };
    this.water = new THREE.Mesh(wg, wm); this.water.position.y = -0.1; scene.add(this.water); this.waterU = u;
    const back = new THREE.Group(); [[-120, 70, 28, '#7D7A86'], [140, 50, 22, '#8A8794'], [20, 90, 30, '#768070']].forEach(([x, w, h, c]) => { const m = mesh(prop('tepui', w, h, c)); m.position.set(x, -3, -250); back.add(m); }); scene.add(back); this.back = back;
    this.canoe = new THREE.Group(); const hull = kit('canoe', null, 4.2); if (hull) { hull.geometry = hull.geometry.clone(); const c = hull.geometry.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 0.72, c.getY(i) * 0.6, c.getZ(i) * 0.5); this.canoe.add(hull); } scene.add(this.canoe);
    this.seat(); this.paddle = mesh(prop('paddle')); this.canoe.add(this.paddle);
    this.chunks = []; this.built = -60; this.items = [];
    this.stops = this.story ? STOPS.map((st, i) => Object.assign({ i, done: false, npc: this.npcs[i] }, st)) : [];
    this.stops.forEach(st => this.buildStop(st));
    this.reset();
  }
  seat() { this.canoe.add(this.pc.root); this.pc.root.position.set(0, -0.05, 0.5); this.pc.root.rotation.set(0, Math.PI, 0); if (this.pc.shadow) this.pc.shadow.visible = false; this.pc.play('Sitting_Idle_Loop', { fade: 0.2 }); }
  reset() {
    this.s = 0; this.u = 0; this.uT = 0; this.v = 0; this.boost = 0; this.t = 0; this.tracts = 0; this.stamps = 0; this.wrong = 0; this.bumps = 0; this.missed = [];
    this.state = 'intro'; this.introT = 0; this.ended = false; this.stroke = 0; this.side = 1; this.cur = null;
    this.buildTo(220); this.placeCanoe(); this.hud(true);
  }
  /* ---------- the river ---------- */
  buildTo(lim) {
    while (this.built < lim) {
      const s0 = this.built, s1 = s0 + 60, parts = [], deco = [];
      for (let s = s0; s < s1; s += 3) for (const sd of [-1, 1]) {
        const a = at(s, sd * W / 2), b = at(s + 3, sd * W / 2), e = at(s, sd * (W / 2 + 2.5)), f = at(s + 3, sd * (W / 2 + 2.5)), c = at(s, sd * (W / 2 + LAND)), d = at(s + 3, sd * (W / 2 + LAND));
        parts.push(quad(a, b, f, e, '#B59A6A', -0.25, 0.35), quad(e, f, d, c, '#5E8F3E', 0.35, 0.4));
      }
      const m = new THREE.Mesh(merge(parts), LAND_MAT); this.world.add(m);
      const near = s => this.stops.some(st => Math.abs(st.s - s) < 26);
      for (let s = s0; s < s1; s += 5) for (const sd of [-1, 1]) {
        if (this.r() < 0.75 && !near(s)) { const tr = kit(pick(this.r, TREES), 5 + this.r() * 6); if (tr) { tr.position.copy(at(s, sd * (W / 2 + 3.5 + this.r() * 28), 0.35)); tr.rotation.y = this.r() * 6; this.world.add(tr); deco.push(tr); } }
        if (this.r() < 0.22) { const ll = kit('lily_large', null, 4); if (ll) { ll.position.copy(at(s, sd * (W / 2 - 0.8 - this.r() * 1.4), -0.08)); ll.rotation.y = this.r() * 6; this.world.add(ll); deco.push(ll); } }
      }
      // logs to steer round, tracts to collect
      for (let s = Math.max(s0, 45); s < s1; s += 16 + this.r() * 14) {
        if (near(s + 10) || near(s - 10)) continue;
        const lane = pick(this.r, [-3.5, 0, 3.5]);
        if (this.mode !== 'practice' || this.r() < 0.6) { const lg = kit('log_large', null, 3); if (lg) { lg.position.copy(at(s, lane, -0.45)); lg.rotation.y = yawAt(s) + Math.PI / 2 + (this.r() - 0.5) * 0.4; this.world.add(lg); this.items.push({ kind: 'log', s, u: lane, obj: lg }); } }
        const u2 = pick(this.r, [-3.5, 0, 3.5].filter(x => x !== lane));
        for (let k = 0; k < 3; k++) { const tr = mesh(prop('tract')); tr.scale.setScalar(1.8); tr.position.copy(at(s - 4 + k * 2.5, u2, 0.35)); this.world.add(tr); this.items.push({ kind: 'tract', s: s - 4 + k * 2.5, u: u2, obj: tr }); }
      }
      this.chunks.push({ m, s1, deco }); this.built = s1;
    }
  }
  buildStop(st) {
    const g = new THREE.Group(); this.world.add(g); st.g = g;
    g.position.copy(at(st.s, st.side * (W / 2 + 6), 0.35)); g.rotation.y = yawAt(st.s) + (st.side > 0 ? -Math.PI / 2 : Math.PI / 2);  // local +z faces the river
    const dock = mesh(prop('dock', 7)); dock.position.set(0, -0.5, 5.5); g.add(dock);
    // the canoe ties up on one side of the dock: the sign goes on that side, the camera looks from the other
    g.updateMatrixWorld(true); st.cside = g.worldToLocal(at(st.s - 2.6, st.side * 5)).x > 0 ? 1 : -1;
    const sx = st.cside * 3.6, sg = sign([st.icon + ' ' + st.year, st.place], 4.4, 1.5, { bg: '#1F4D3A', fg: '#F2C14E', r: 14, big: true }); sg.position.set(sx, 3.0, 3.2); g.add(sg);
    g.add(mesh(merge([P(G.box(0.16, 2.5, 0.16), '#5A3A22', [sx, 1.1, 3.1])])));
    const add = (n, x, y, z, ry = 0, sc) => { const m = mesh(typeof n === 'string' ? prop(n) : n); m.position.set(x, y, z); m.rotation.y = ry; if (sc) m.scale.setScalar(sc); g.add(m); return m; };
    if (st.scene === 'wharf') { add('warehouse', -5.5, 0, -5); add(prop('warehouse', '#C9B69A'), 5.5, 0, -6); add('crates', 2.6, 0, 1.2); add('ship', -9, -0.9, 10.5, Math.PI / 2 + 0.15); }
    if (st.scene === 'church') { add('church', 0, 0, -7, Math.PI); }
    if (st.scene === 'roraima') { add(prop('tepui', 60, 30, '#7D7A86'), 0, -2, -48); add('hut', -5, 0, -5, 0.4); add('hut', 5.5, 0, -7, -0.3);
      add('grave', 3.2, 0, -0.6); const gs = sign(['Elder O. E. Davis', 'died 31 July 1911'], 2.0, 0.65, { bg: '#F4F1EA', fg: '#2A1C10', r: 10 }); gs.position.set(3.2, 1.8, -1.45); g.add(gs); }
    if (st.scene === 'hospital') { add('hospital', 0, 0, -7); const hs = sign(['Davis Memorial Hospital'], 6, 0.8, { bg: '#2F6DB5', fg: '#FFFFFF', r: 8 }); hs.position.set(0, 6.9, -3.4); g.add(hs); }
    if (st.scene === 'office') { st.building = add('office', 0, 0, -7); const os = sign(['Guyana Conference', 'of Seventh-day Adventists'], 6, 1.0, { bg: '#2E7D4F', fg: '#FFFFFF', r: 8 }); os.position.set(0, 4.9, -3.4); g.add(os); }
    if (st.npc) { g.add(st.npc.root); st.npc.root.position.set(0.9, 0, 1.0); st.npc.root.rotation.y = 0; st.npc.play('Idle_Loop'); }
    st.dockLocal = new THREE.Vector3(0, 0.1, 8.0); st.meetLocal = new THREE.Vector3(0.9, 0, 2.5);
  }
  placeCanoe() {
    const p = at(this.s, this.u, 0), t = this.eng.time || 0;
    this.canoe.position.set(p.x, -0.2 + Math.sin(t * 2) * 0.03, p.z); this.canoe.rotation.set(0, yawAt(this.s) - (this.uT - this.u) * 0.08, Math.sin(t * 1.7) * 0.03);
    this.water.position.x = p.x; this.water.position.z = p.z - 70; this.back.position.set(p.x * 0.6, 0, p.z);
  }
  /* ---------- input ---------- */
  input(dir) { if (this.state !== 'run') return; if (dir === 'left') this.uT = Math.max(-3.5, this.uT - 3.5); else if (dir === 'right') this.uT = Math.min(3.5, this.uT + 3.5); else if (dir === 'up') this.tapAt(); }
  tapAt() { if (this.state !== 'run') return; this.boost = Math.min(this.boost + 2.4, 9); this.stroke = 0.5; this.side *= -1; SND.splash(); }
  go() { if (this.state !== 'intro') return; this.state = 'run'; SND.unlock(); SND.startMusic('calm'); this.eng.watch = true; this.ui.banner('Tap to paddle', this.stops.length ? 'Five stops. Five stamps.' : 'Enjoy the river', 2400); }

  /* ---------- each frame ---------- */
  idleView(dt) { this.pc.update(dt); this.waterU.uT.value = this.eng.time; this.placeCanoe(); this.paddlePose(-1); const t = this.eng.time * 0.1, c = this.eng.camera, tall = innerHeight > innerWidth, p = this.canoe.position, R = tall ? 12 : 9;
    c.position.set(p.x + Math.sin(t) * R, tall ? 6 : 4.5, p.z + Math.cos(t) * R); c.lookAt(p.x, tall ? -1.5 : 0.8, p.z); }
  update(dt) {
    const cam = this.eng.camera; this.pc.update(dt); this.stops.forEach(st => st.npc && st.npc.update(dt)); this.waterU.uT.value = this.eng.time;
    if (this.state === 'intro') {   // swoop down from high above the river
      this.introT += dt; const k = clamp(this.introT / 3.6, 0, 1), e = k * k * (3 - 2 * k), p = this.canoe.position, b = at(this.s - 6.8, 0, 3.0);
      cam.position.set(lerp(p.x + 12, b.x, e), lerp(90, b.y, e), lerp(p.z - 30, b.z, e)); cam.lookAt(at(this.s + lerp(40, 11, e), 0, 0.7));
      this.placeCanoe(); this.paddlePose(-1); if (this.opt.autostart && this.introT > 3.6) this.go(); return;
    }
    if (this.state === 'over' || this.state === 'won') return;
    this.t += dt;
    if (this.state === 'run') {
      this.boost = Math.max(0, this.boost - dt * 2.2); this.v = damp(this.v, 3.2 + this.boost, 3, dt);
      const next = this.stops.find(st => !st.done), stopAt = next ? next.s - 2.6 : Infinity;
      if (next && this.s > stopAt - 30) { this.uT = next.side * 5; this.v = Math.min(this.v, Math.max(1.2, (stopAt - this.s) * 0.3)); if (this.s >= stopAt - 0.4) { this.arrive(next); return; } }
      this.s += this.v * dt; this.u = damp(this.u, this.uT, 5, dt);
      this.collide(); this.buildTo(this.s + 200); this.recycle();
      if (!next && this.stops.length && this.s > this.stops[this.stops.length - 1].s + 40) { this.end(); return; }
      if (!this.stops.length && this.s > 1500) { this.end(); return; }
      this.stroke = Math.max(0, this.stroke - dt); this.paddlePose(this.stroke > 0 ? 1 - this.stroke / 0.5 : -1);
      this.placeCanoe();
      cam.position.lerp(at(this.s - 6.8, this.u * 0.75, 3.0), 1 - Math.exp(-4 * dt)); cam.lookAt(at(this.s + 11, this.u * 0.55, 0.7));
    }
    if (this.state === 'visit') this.visitUpdate(dt);
    this.hud();
  }
  paddlePose(ph) {   // ph: 0..1 through a stroke, -1 resting
    const pd = this.paddle, sd = this.side;
    if (ph < 0) { pd.position.set(sd * 0.62, 1.05, 0.3); pd.rotation.set(-0.25, 0, sd * 0.5); return; }
    const sw = Math.sin(ph * Math.PI); pd.position.set(sd * 0.68, 1.1 - sw * 0.35, 0.3 - (ph - 0.5) * 1.4); pd.rotation.set(-0.6 + ph * 1.2, 0, sd * 0.3);
  }
  collide() {
    for (const o of this.items) { if (o.got || o.hit) continue;
      if (Math.abs(o.s - this.s) < 1.7 && Math.abs(o.u - this.u) < 1.6) {
        if (o.kind === 'tract') { o.got = true; this.world.remove(o.obj); this.tracts++; SND.coin(); }
        else { o.hit = true; this.bumps++; this.boost = 0; this.v *= 0.25; SND.hit(); this.ui.toast('Bump! Swipe to steer round the logs', 'bad'); }
      } }
  }
  recycle() {
    this.items = this.items.filter(o => { if (o.s < this.s - 20) { this.world.remove(o.obj); return false; } if (o.kind === 'tract' && !o.got) o.obj.rotation.y += 0.04; return true; });
    this.chunks = this.chunks.filter(c => { if (c.s1 < this.s - 45) { this.world.remove(c.m); c.deco.forEach(d => this.world.remove(d)); c.m.geometry.dispose(); return false; } return true; });
  }
  /* ---------- stops: dock, walk in, meet, answer, stamp ---------- */
  arrive(st) {
    this.state = 'visit'; this.cur = st; st.done = true; this.v = 0; this.boost = 0; SND.good(); this.paddlePose(-1);
    this.ui.banner(st.icon + ' ' + st.place, st.year, 2200);
    const g = st.g; g.updateMatrixWorld(true);
    this.canoe.remove(this.pc.root); this.eng.scene.add(this.pc.root);
    this.pc.root.position.copy(st.dockLocal.clone().applyMatrix4(g.matrixWorld)); this.pc.root.rotation.y = g.rotation.y + Math.PI;
    this.walk = { to: st.meetLocal.clone().applyMatrix4(g.matrixWorld), then: () => this.meet(st) }; this.pc.play('Walk_Loop', { fade: 0.2 });
    this.camTo = { pos: new THREE.Vector3(-st.cside * 5.2, 3.0, 9.0).applyMatrix4(g.matrixWorld), look: new THREE.Vector3(0.4, 1.3, 2.0).applyMatrix4(g.matrixWorld) }; this.camLook = null;
  }
  visitUpdate(dt) {
    const cam = this.eng.camera; if (this.camTo) { cam.position.lerp(this.camTo.pos, 1 - Math.exp(-2.5 * dt)); this.camLook = (this.camLook || this.camTo.look.clone()).lerp(this.camTo.look, 1 - Math.exp(-3 * dt)); cam.lookAt(this.camLook); }
    if (this.walk) { const w = this.walk, pos = this.pc.root.position, d = w.to.clone().sub(pos); d.y = 0; const dist = d.length();
      if (dist > 0.08) { pos.addScaledVector(d.normalize(), Math.min(dist, 1.8 * dt)); pos.y = damp(pos.y, w.to.y, 3, dt); this.pc.root.rotation.y = Math.atan2(d.x, d.z); }
      else { const f = w.then; this.walk = null; pos.y = w.to.y; this.pc.play('Idle_Loop', { fade: 0.2 }); f && f(); } }
    this.placeCanoe();
  }
  async meet(st) {
    const face = (who, target) => { const a = who.root.getWorldPosition(new THREE.Vector3()), b = target.getWorldPosition(new THREE.Vector3()); return Math.atan2(b.x - a.x, b.z - a.z); };
    if (st.npc) { this.pc.root.rotation.y = face(this.pc, st.npc.root); st.npc.root.rotation.y = face(st.npc, this.pc.root) - st.g.rotation.y; st.npc.play('Idle_Talking_Loop', { fade: 0.3 }); }
    if (st.scene === 'office') await this.officeTour(st);
    else for (let i = 0; i < st.lines.length; i++) await this.say(st, i);
    if (st.npc) st.npc.play('Idle_Loop', { fade: 0.3 });
    const q = DATA.Q.story[st.q], right = q[1][q[2]], opts = shuffle(this.r, [right, ...shuffle(this.r, q[1].filter((_, i) => i !== q[2])).slice(0, 2)]);
    const c = await this.ui.card({ tag: '🛂 Passport stamp ' + (st.i + 1) + ' of ' + STOPS.length, icon: st.icon, who: st.place, title: q[0], opts });
    if (opts[c] === right) { this.stamps++; SND.win(); this.ui.cardFeedback(true, 'Stamped! ' + (q[3] || '')); this.pc.play('Yes', { once: true, fade: 0.2 }); }
    else { this.wrong++; SND.bad(); this.ui.cardFeedback(false, 'The answer: ' + right + '. ' + (q[3] || '')); this.missed.push([q[0], right]); }
    await wait(2600); this.ui.closeCard(); if (this.ended) return;
    // back into the canoe and on down the river
    this.eng.scene.remove(this.pc.root); this.seat();
    if (this.inside) { this.eng.scene.remove(this.inside); this.inside = null; } if (st.building) st.building.visible = true;
    this.u = this.uT = st.side * 3.5; this.camTo = null; this.camLook = null; this.cur = null; this.s += 3; this.state = 'run';
    const left = this.stops.filter(x => !x.done).length; this.ui.toast(left ? left + ' stop' + (left > 1 ? 's' : '') + ' to go' : 'Last stretch of the river!', 'go');
  }
  say(st, i) { return this.ui.card({ tag: st.icon + ' ' + st.year + ' · ' + st.place, who: 'Stop ' + (st.i + 1) + ' of ' + STOPS.length, title: st.who, text: st.lines[i], opts: [i < st.lines.length - 1 ? 'Next ▶' : 'Question ▶'], primary: 0 }); }
  /* the wall of pioneers and presidents: a room of drawn plaques; the camera moves along the wall */
  async officeTour(st) {
    const room = new THREE.Group(); this.inside = room; st.g.updateMatrixWorld(true);
    room.position.copy(new THREE.Vector3(0, 0.02, -7).applyMatrix4(st.g.matrixWorld)); room.rotation.y = st.g.rotation.y; this.eng.scene.add(room); if (st.building) st.building.visible = false;
    room.add(mesh(merge([P(G.box(9.4, 0.1, 6.4), '#C9A46A', [0, 0, 0]), P(G.box(9.4, 4, 0.2), '#F2E6C8', [0, 2, -3.1]), P(G.box(0.2, 4, 6.4), '#EADBB8', [-4.6, 2, 0]), P(G.box(0.2, 4, 6.4), '#EADBB8', [4.6, 2, 0]), P(G.box(6, 0.04, 1.6), '#2E7D4F', [0, 0.07, 0.6]),
      P(G.box(2.4, 0.9, 0.9), '#7A5230', [2.8, 0.45, -0.6]), P(G.box(0.5, 0.06, 0.4), '#3A3F47', [2.6, 0.93, -0.6])])));
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 6.4), new THREE.MeshBasicMaterial({ color: '#EFE8D8', side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 4.0; room.add(ceil);
    const title = sign(['Pioneers and Presidents'], 4.6, 0.6, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); title.position.set(0, 3.55, -2.98); room.add(title);
    PLAQUES.forEach((pl, i) => { const x = -3.3 + i * 2.2, fr = mesh(prop('frame')); fr.position.set(x, 2.1, -2.96); room.add(fr);
      const pic = sign(['👤', pl[0], pl[1]], 1.3, 1.7, { bg: '#F7F1E1', fg: '#2A1C10', r: 6, sizes: [150, 46, 54] }); pic.position.set(x, 2.1, -2.91); room.add(pic);
      const fact = sign(pl[2].split(' ').reduce((a, w) => { const l = a[a.length - 1]; if (l && (l + ' ' + w).length <= 18) a[a.length - 1] = l + ' ' + w; else a.push(w); return a; }, []), 1.9, 0.62, { bg: '#FFFFFF', fg: '#1D1B2B', r: 8 }); fact.position.set(x, 0.78, -2.98); room.add(fact); });
    room.updateMatrixWorld(true); const L = v => room.localToWorld(v);
    this.pc.root.position.copy(L(new THREE.Vector3(-1.6, 0.05, 1.4))); this.pc.root.rotation.y = room.rotation.y + Math.PI;
    if (st.npc) { room.add(st.npc.root); st.npc.root.position.set(2.0, 0.05, 1.0); st.npc.root.rotation.y = -0.9; st.npc.play('Idle_Talking_Loop', { fade: 0.2 }); }
    const wide = { pos: L(new THREE.Vector3(0, 2.3, 3.6)), look: L(new THREE.Vector3(0, 1.9, -3)) };
    this.camTo = wide; this.camLook = wide.look.clone(); this.eng.camera.position.copy(wide.pos); this.eng.camera.lookAt(wide.look);
    for (let i = 0; i < st.lines.length; i++) {
      if (i === 1 || i === 2) { const x = -3.3 + (i + 1) * 2.2; this.camTo = { pos: L(new THREE.Vector3(x * 0.7, 2.1, 0.6)), look: L(new THREE.Vector3(x, 1.8, -3)) }; }
      else this.camTo = wide;
      await this.say(st, i);
    }
    this.camTo = wide;
  }
  end() {
    if (this.ended) return; this.ended = true; this.state = 'won'; SND.stopMusic(); SND.win(); this.pc.play('Yes', { fade: 0.2 });
    const score = Math.max(0, this.stamps * 300 + this.tracts * 10 + Math.max(0, 600 - Math.round(this.t) * 2) - this.bumps * 20);
    const res = { won: true, score, level: 1, stars: this.stamps === STOPS.length ? 3 : this.stamps >= 3 ? 2 : 1,
      title: this.stops.length ? 'Journey complete: ' + this.stamps + ' of ' + STOPS.length + ' stamps' : 'End of the river',
      stats: [[this.stamps + '/' + this.stops.length, 'stamps'], [this.tracts, 'tracts'], [this.bumps, 'bumps'], [Math.round(this.t) + 's', 'time']],
      list: this.missed.length ? ['Look at these again', this.missed.map(m => [m[0], '→ ' + m[1]])] : null,
      save: this.mode === 'practice' ? '' : 'endless', correct: this.stamps, wrong: this.wrong, dodged: {} };
    setTimeout(() => this.ui.end(res), 1200);
  }
  hud(force) { this.ui.hud({ score: this.stamps, coins: this.tracts, coinIcon: '📄', hearts: null, dist: 0, label: this.stops.length ? '🛂 ' + this.stamps + '/' + this.stops.length + ' · ' + Math.round(Math.max(0, this.s)) + ' m' : Math.round(Math.max(0, this.s)) + ' m', shield: 0, magnet: 0, double: 0, badges: null }, force); }
}
function quad(a, b, c, d, col, ya, yb) {
  const g = new THREE.BufferGeometry(), v = [a.x, ya, a.z, b.x, ya, b.z, c.x, yb, c.z, a.x, ya, a.z, c.x, yb, c.z, d.x, yb, d.z];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const cl = new THREE.Color(col), cols = []; for (let i = 0; i < 6; i++) cols.push(cl.r, cl.g, cl.b); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); return g;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
