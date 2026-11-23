/* Compass Hunt (Orienteering, OD 4): a real orienteering course in a 3D forest.
   Read the map, take the bearing to the next control, count your distance, and find the orange-and-white flag.
   The map uses the standard orienteering colours: white forest, yellow open land, green thick bush (slow),
   blue water, brown contour lines, black paths and boulders, purple course. North is up on the map and on the screen. */
import { THREE, G, P, merge, MAT, sprite, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { DATA } from './data.js';

const PI = Math.PI;
/* the world: north is -z, east is +x (1 unit = 1 metre) */
const LAKE = { x: 28, z: -6, r: 8 };
const HILL = { x: -6, z: -24, r: 11, h: 3.2 };
const THICK = [{ x: -19, z: 17, r: 5.5 }, { x: 14, z: -28, r: 6 }, { x: 33, z: 22, r: 5 }];
const MEADOW = [{ x: 4, z: 34, r: 9 }, { x: -30, z: -26, r: 7 }];
const PATH = [[0, 44], [0, 30], [-8, 18], [-20, 4], [-30, -5], [-38, -20]];
const PATH2 = [[-30, -5], [-14, -10], [6, -12], [18, -16]];
const STREAM = [[44, 6], [30, 4], [16, 6], [6, 9], [-4, 4], [-14, -2]];
const BOULDERS = [[18, 22], [-36, 10], [38, -26], [-12, 30]];
const START = [0, 38];
const CONTROLS = [
  { n: 1, code: 'K31', x: 18, z: 22, clue: 'Boulder', side: 'on its south side', icon: '🪨' },
  { n: 2, code: 'K47', x: 28, z: -15.5, clue: 'Lake shore', side: 'on the north side of the lake', icon: '💧' },
  { n: 3, code: 'K52', x: -6, z: -24, clue: 'Hilltop', side: 'on the top of the hill', icon: '⛰️' },
  { n: 4, code: 'K60', x: -30, z: -5, clue: 'Path junction', side: 'where the two paths meet', icon: '➕' },
  { n: 5, code: 'K38', x: -25.5, z: 17, clue: 'Thicket', side: 'on its west edge', icon: '🌿' },
  { n: 6, code: 'K44', x: 6, z: 9, clue: 'Stream bend', side: 'on the inside of the bend', icon: '〰️' },
];
const FINISH = [0, 30];
const bearing = (a, b) => { const d = Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / PI; return (d + 360) % 360; };
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const round5 = v => (Math.round(v / 5) * 5) % 360;
const dirName = b => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(b / 45) % 8];
const hillY = (x, z) => { const d = Math.hypot(x - HILL.x, z - HILL.z); return d >= HILL.r ? 0 : HILL.h * (0.5 + 0.5 * Math.cos(PI * d / HILL.r)); };
const inThick = (x, z) => THICK.some(t => Math.hypot(x - t.x, z - t.z) < t.r);

/* the orienteering control: a three-sided flag, each face split corner to corner into white and orange */
function controlFlag() {
  const pos = [], col = [], s = 0.32, w = new THREE.Color('#FFFFFF'), o = new THREE.Color('#F26B1D'), y0 = 0.9, y1 = y0 + s;
  const pts = [0, 1, 2].map(i => [Math.cos(i * 2 * PI / 3) * s * 0.58, Math.sin(i * 2 * PI / 3) * s * 0.58]);
  for (let i = 0; i < 3; i++) {
    const a = pts[i], b = pts[(i + 1) % 3], A = [a[0], y0, a[1]], B = [b[0], y0, b[1]], C = [b[0], y1, b[1]], D = [a[0], y1, a[1]];
    [[A, C, D, w], [A, B, C, o]].forEach(([p, q, r, c]) => { [p, q, r].forEach(v => { pos.push(...v); col.push(c.r, c.g, c.b); }); [p, r, q].forEach(v => { pos.push(...v); col.push(c.r, c.g, c.b); }); });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, MAT.flat));
  grp.add(new THREE.Mesh(merge([P(G.cyl(0.025, 0.025, 1.25, 5), '#8A6A3A', [0, 0.62, 0]), P(G.box(0.1, 0.14, 0.06), '#2A2A2A', [0.1, 0.95, 0.12])]), MAT.flat));
  return grp;
}
Object.assign(BUILD, {
  ohill: () => { const p = []; for (let i = 0; i < 7; i++) { const k = i / 7, r = HILL.r * (1 - k), h = HILL.h * (0.5 + 0.5 * Math.cos(PI * (1 - k))) ; p.push(P(G.cyl(r, r, 0.12, 24), i % 2 ? '#7FA653' : '#76A04C', [0, h - 0.06, 0])); } return merge(p); },
  ostream: () => { const p = []; for (let i = 0; i < STREAM.length - 1; i++) { const [a, b] = [STREAM[i], STREAM[i + 1]], l = dist(a, b); p.push(P(G.box(1.4, 0.03, l + 0.6), '#3E7FB0', [(a[0] + b[0]) / 2, 0.02, (a[1] + b[1]) / 2], [0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0])); } return merge(p); },
  opath: (pts) => { const p = []; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], l = dist(a, b); p.push(P(G.box(1.3, 0.025, l + 1.2), '#BFA77A', [(a[0] + b[0]) / 2, 0.012, (a[1] + b[1]) / 2], [0, Math.atan2(b[0] - a[0], b[1] - a[1]), 0])); } return merge(p); },
  olake: () => merge([P(G.cyl(LAKE.r, LAKE.r, 0.04, 30), '#3E7FB0', [0, 0.0, 0]), P(G.tor(LAKE.r + 0.1, 0.2, 4, 30), '#9C8A6A', [0, 0.01, 0], [PI / 2, 0, 0])]),
  omeadow: (r) => merge([P(G.cyl(r, r, 0.02, 24), '#C9C25A', [0, 0.005, 0])]),
  otriangle: () => merge([P(G.tri(0.9, 0.06), '#A2307F', [0, 0.03, 0]), P(G.tri(0.65, 0.08), '#F4EFE2', [0, 0.04, 0])]),
  ofinish: () => merge([P(G.tor(1.1, 0.07, 4, 24), '#A2307F', [0, 0.04, 0], [PI / 2, 0, 0]), P(G.tor(0.75, 0.07, 4, 24), '#A2307F', [0, 0.04, 0], [PI / 2, 0, 0]), P(G.box(0.08, 2.4, 0.08), '#A2307F', [-1.6, 1.2, 0]), P(G.box(0.08, 2.4, 0.08), '#A2307F', [1.6, 1.2, 0]), P(G.box(3.3, 0.5, 0.05), '#F26B1D', [0, 2.2, 0])]),
});

/* the orienteering map, drawn the way a real one looks (north up) */
function mapSVG(w, showMe) {
  const X0 = -46, Z0 = -42, W = 92, H = 90, sx = x => (x - X0).toFixed(1), sz = z => (z - Z0).toFixed(1);
  const poly = pts => pts.map(p => sx(p[0]) + ',' + sz(p[1])).join(' ');
  let s = '<svg class="om-map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Orienteering map"><rect width="' + W + '" height="' + H + '" fill="#FFFFFF"/>';
  MEADOW.forEach(m => { s += '<circle cx="' + sx(m.x) + '" cy="' + sz(m.z) + '" r="' + m.r + '" fill="#F5D33F"/>'; });
  THICK.forEach(t => { s += '<circle cx="' + sx(t.x) + '" cy="' + sz(t.z) + '" r="' + t.r + '" fill="#4FAE57"/>'; });
  for (let i = 1; i <= 3; i++) s += '<circle cx="' + sx(HILL.x) + '" cy="' + sz(HILL.z) + '" r="' + (HILL.r * (1 - (i - 1) / 3.2)).toFixed(1) + '" fill="none" stroke="#B5651D" stroke-width="' + (i === 1 ? 0.7 : 0.45) + '"/>';
  s += '<circle cx="' + sx(LAKE.x) + '" cy="' + sz(LAKE.z) + '" r="' + LAKE.r + '" fill="#59B7E8" stroke="#1F1F1F" stroke-width="0.4"/>';
  s += '<polyline points="' + poly(STREAM) + '" fill="none" stroke="#1E88C8" stroke-width="0.8"/>';
  s += '<polyline points="' + poly(PATH) + '" fill="none" stroke="#1F1F1F" stroke-width="0.6" stroke-dasharray="2 1"/><polyline points="' + poly(PATH2) + '" fill="none" stroke="#1F1F1F" stroke-width="0.6" stroke-dasharray="2 1"/>';
  BOULDERS.forEach(b => { s += '<circle cx="' + sx(b[0]) + '" cy="' + sz(b[1]) + '" r="0.9" fill="#1F1F1F"/>'; });
  for (let x = X0 + 8; x < X0 + W; x += 18) s += '<line x1="' + (x - X0) + '" y1="0" x2="' + (x - X0) + '" y2="' + H + '" stroke="#2C6FB7" stroke-width="0.25"/>';
  // the course in purple
  const pts = [START, ...CONTROLS.map(c => [c.x, c.z]), FINISH];
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], d = dist(a, b), ux = (b[0] - a[0]) / d, uz = (b[1] - a[1]) / d, ra = i ? 2.6 : 2.4, rb = i === pts.length - 2 ? 2.6 : 2.6;
    s += '<line x1="' + sx(a[0] + ux * ra) + '" y1="' + sz(a[1] + uz * ra) + '" x2="' + sx(b[0] - ux * rb) + '" y2="' + sz(b[1] - uz * rb) + '" stroke="#A2307F" stroke-width="0.45"/>'; }
  const tri = [[0, -3], [2.6, 1.5], [-2.6, 1.5]].map(p => (START[0] + p[0] - X0).toFixed(1) + ',' + (START[1] + p[1] - Z0).toFixed(1)).join(' ');
  s += '<polygon points="' + tri + '" fill="none" stroke="#A2307F" stroke-width="0.5"/>';
  CONTROLS.forEach(c => { const got = w.got && w.got.includes(c.n); s += '<circle cx="' + sx(c.x) + '" cy="' + sz(c.z) + '" r="2.4" fill="none" stroke="#A2307F" stroke-width="0.5"/>' + (got ? '<circle cx="' + sx(c.x) + '" cy="' + sz(c.z) + '" r="1" fill="#A2307F"/>' : '') + '<text x="' + (c.x - X0 + 2.6) + '" y="' + (c.z - Z0 - 2.2) + '" font-size="3.6" font-weight="700" fill="#A2307F">' + c.n + '</text>'; });
  s += '<circle cx="' + sx(FINISH[0]) + '" cy="' + sz(FINISH[1]) + '" r="2.4" fill="none" stroke="#A2307F" stroke-width="0.45"/><circle cx="' + sx(FINISH[0]) + '" cy="' + sz(FINISH[1]) + '" r="1.6" fill="none" stroke="#A2307F" stroke-width="0.45"/>';
  s += '<g transform="translate(' + (W - 6) + ',7)"><polygon points="0,-5 2,1 0,0 -2,1" fill="#1F1F1F"/><text y="5" font-size="3" text-anchor="middle" font-weight="700">N</text></g>';
  if (showMe) { const p = w.pc.root.position; s += '<circle cx="' + sx(p.x) + '" cy="' + sz(p.z) + '" r="1.5" fill="#2B4C8C" stroke="#FFF" stroke-width="0.5"/>'; }
  return s + '</svg>';
}
const KEY = '<div class="om-key"><span><i style="background:#FFFFFF;border:1px solid #CCC"></i>Forest, easy to run</span><span><i style="background:#F5D33F"></i>Open land</span><span><i style="background:#4FAE57"></i>Thick bush, slow</span><span><i style="background:#59B7E8"></i>Water</span><span><i style="background:#B5651D;height:3px"></i>Contour line (hill)</span><span><i style="background:#1F1F1F;height:3px"></i>Path, boulder</span><span><i style="background:#A2307F;height:3px"></i>Your course</span><span><i style="background:#2C6FB7;height:2px"></i>North lines</span></div>';

export const COMPASS = {
  key: 'compass', gid: 'hunt:compass', title: 'Compass Hunt', topic: 'orienteering', icon: '🧭', kind: 'walk', music: 'calm',
  blurb: 'A real orienteering course in the forest. Read the map, follow the bearing, count your metres, and find all six controls.',
  howTo: 'Tap where to go, or hold and drag to walk. 🗺️ opens the map. Follow the bearing on the compass, and watch the metres.',
  sky: { top: '#6FA6D8', bottom: '#EADDB8', fogNear: 30, fogFar: 85, sun: '#FFE8C0', sunI: 2.2, sunPos: [-8, 14, 6], hemi: 1.5, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#5E8F3E', modes: { endless: ['🧭', 'The course', 'Six controls, no “you are here” on the map, like a real event. About 10 minutes.'], practice: ['🗺️', 'Practice', 'The map shows where you are, and the flags show from farther away.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_pineDefaultA', 'tree_detailed', 'plant_bushLarge', 'plant_bush', 'plant_bushDetailed', 'rock_largeA', 'rock_largeC', 'rock_tallB', 'grass_large', 'stump_round', 'log', 'flower_yellowA'],
  start: [START[0], 0, START[1] + 2], startRy: PI, bounds: [-45, -41, 45, 45], intro: [10, 46, 28], questTitle: 'Controls', coinIcon: '🧭', camK: 0.9,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    w.add(B('olake'), LAKE.x, 0, LAKE.z); w.circle(LAKE.x, LAKE.z, LAKE.r - 0.3);
    w.add(B('ohill'), HILL.x, 0, HILL.z); w.add(B('ostream')); w.add(B('opath', PATH)); w.add(B('opath', PATH2));
    MEADOW.forEach(m => w.add(B('omeadow', m.r), m.x, 0, m.z));
    BOULDERS.forEach(([x, z], i) => { w.kit(i % 2 ? 'rock_largeC' : 'rock_largeA', 1.6, x, z + (i === 0 ? -1.6 : 0), i, 0.7); });
    w.add(B('otriangle'), START[0], 0, START[1]); w.add(B('ofinish'), FINISH[0], 0, FINISH[1]);
    progress(0.3);
    // the forest: trees everywhere except the lake, meadows, paths and near the controls
    const r = mulberry(11), near = (x, z, pts, d) => pts.some(p => Math.hypot(x - p[0], z - p[1]) < d);
    const onLine = (x, z, line, d) => { for (let i = 0; i < line.length - 1; i++) { const [a, b] = [line[i], line[i + 1]], l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2; let t = ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / l2; t = Math.max(0, Math.min(1, t)); if (Math.hypot(x - a[0] - t * (b[0] - a[0]), z - a[1] - t * (b[1] - a[1])) < d) return true; } return false; };
    for (let i = 0; i < 420; i++) {
      const x = -44 + r() * 88, z = -40 + r() * 84;
      if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1.5 || MEADOW.some(m => Math.hypot(x - m.x, z - m.z) < m.r) || onLine(x, z, PATH, 1.6) || onLine(x, z, PATH2, 1.6) || onLine(x, z, STREAM, 1.4)) continue;
      if (near(x, z, [START, FINISH, ...CONTROLS.map(c => [c.x, c.z]), ...BOULDERS], 3.2) || Math.hypot(x - HILL.x, z - HILL.z) < HILL.r * 0.55) continue;
      const th = inThick(x, z), k = th ? ['plant_bushLarge', 'plant_bushDetailed', 'plant_bush'][Math.floor(r() * 3)] : ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_pineDefaultA', 'tree_detailed', 'plant_bush', 'stump_round'][Math.floor(r() * 8)];
      const tall = k.startsWith('tree'); const t = w.kit(k, tall ? 5 + r() * 5 : th ? 1.1 + r() * 0.6 : null, x, z, r() * 6, tall ? 0.32 : 0); if (t && tall) w.fadeable(t);
      if (i % 3 === 0) w.kit(['grass_large', 'flower_yellowA', 'log'][i % 9 === 0 ? 2 : i % 2], 0.6, x + 1.4, z - 1.1, r() * 6);
    }
    progress(0.7);
    // the controls and the coach
    w.flags = CONTROLS.map(c => { const f = controlFlag(); w.add(f, c.x, c.n === 3 ? hillY(c.x, c.z) : 0, c.z, c.n * 0.7); f.visible = false; return f; });
    const coach = await w.npc('coach', { body: 'f', skin: 3, hair: 'buns' }, 'counsellor', START[0] + 2.2, START[1] + 1.2, -PI * 0.75, 'Idle_Talking_Loop'); coach.anim = 'Idle_Talking_Loop';
    w.thing({ id: 'coach', x: START[0] + 2.2, z: START[1] + 1.2, npc: coach, icon: '💬', verb: 'Talk to Coach Rita', when: w => !w.isDone('brief'), use: brief });
    CONTROLS.forEach((c, i) => w.thing({ id: 'c' + c.n, x: c.x, z: c.z, r: 2.2, h: c.n === 3 ? HILL.h + 1.4 : 1.4, icon: '🟧', verb: 'Punch control ' + c.n, when: w => w.isDone('brief') && w.leg === i && w.flags[i].visible, use: w => punch(w, c, i) }));
    w.thing({ id: 'finish', x: FINISH[0], z: FINISH[1], r: 2.4, icon: '🏁', verb: 'Run to the finish', when: w => w.leg === CONTROLS.length, use: finish });
    w.got = []; w.leg = -1; w.hooks.push(tick);
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Coach Rita at the start triangle' }]); w.ui.banner('The forest course', 'North is up. Trust your compass.', 2600); ui(w); },
};

/* the compass, the metre counter and the map button */
function ui(w) {
  const c = w.el('h-comp', 'panel'); c.hidden = false;
  c.innerHTML = '<div class="oc-rose"><i class="oc-n">N</i><i class="oc-e">E</i><i class="oc-s">S</i><i class="oc-w">W</i><b class="oc-go"></b><b class="oc-me"></b></div><div class="oc-txt"><span class="oc-want">Talk to the coach</span><span class="oc-dir"></span><span class="oc-m"></span></div><button class="oc-map" aria-label="Open the map">🗺️</button>';
  c.querySelector('.oc-map').onclick = e => { e.stopPropagation(); openMap(w); };
}
function openMap(w) {
  const m = w.el('h-omap', 'panel'); m.hidden = false; w.busy = true;
  const leg = w.leg >= 0 && w.leg < CONTROLS.length ? CONTROLS[w.leg] : null;
  m.innerHTML = '<div class="om-top"><b>🗺️ The map</b><button class="om-x" aria-label="Close the map">✕</button></div>' + mapSVG(w, w.mode === 'practice') + (leg ? '<p class="om-now">Next: control <b>' + leg.n + '</b>, ' + leg.clue.toLowerCase() + ', ' + leg.side + '.</p>' : '') + KEY;
  m.querySelector('.om-x').onclick = e => { e.stopPropagation(); m.hidden = true; w.busy = false; };
}
function legInfo(i) { const from = i === 0 ? START : [CONTROLS[i - 1].x, CONTROLS[i - 1].z], to = i < CONTROLS.length ? [CONTROLS[i].x, CONTROLS[i].z] : FINISH; return { b: round5(bearing(from, to)), m: Math.round(dist(from, to) / 5) * 5, from }; }

async function brief(w) {
  const g = w.npcs.coach; w.faceEach(g);
  await w.say('Coach Rita', 'Welcome to the forest course! Six controls, then the finish. Each control is an orange-and-white flag with a code on it.', { icon: '🧭' });
  await w.say('Coach Rita', 'On the map, white is forest, yellow is open land, green is thick bush that slows you down, blue is water, brown lines show the hill and black shows paths and boulders. Your course is in purple.', { icon: '🗺️' });
  await w.ask({ who: 'Coach Rita', icon: '🧭', q: 'You want to walk east. What bearing is that?', opts: ['90°', '0°', '180°', '270°'], right: 0, why: 'Bearings go clockwise from north: north 0°, east 90°, south 180°, west 270°.' });
  await w.say('Coach Rita', 'For each leg I give you a bearing and a distance. Turn until your direction matches the bearing (red in the shed!), then walk and count your metres. The flags hide in the trees until you are close.', { icon: '🧭' });
  await w.say('Coach Rita', 'One more rule: the map won’t show where you are. In a real event you work that out yourself.' + (w.mode === 'practice' ? ' This is practice, so today it will.' : ''), { icon: '🧭', next: 'Start ▶' });
  w.done('brief', 50); CONTROLS.forEach(c => w.addQuest({ id: 'c' + c.n, text: 'Control ' + c.n + ': ' + c.clue.toLowerCase() })); w.addQuest({ id: 'fin', text: 'The finish' });
  w.startT = w.t; startLeg(w, 0);
}
function startLeg(w, i) {
  w.leg = i; const L = legInfo(i); w.legFrom = new THREE.Vector3(L.from[0], 0, L.from[1]); w.walked = 0; w.lastP = w.pc.root.position.clone(); w.want = L.b;
  const c = CONTROLS[i];
  w.ui.banner(c ? 'Control ' + c.n + ' · ' + L.b + '°' : 'To the finish · ' + L.b + '°', c ? 'About ' + L.m + ' m ' + dirName(L.b) + ' · ' + c.clue.toLowerCase() + ', ' + c.side : 'About ' + L.m + ' m ' + dirName(L.b), 3200);
}
async function punch(w, c, i) {
  SND.coin(); w.got.push(c.n);
  await w.say('Control ' + c.n + ' · ' + c.code, 'You found it! Punch your card: control ' + c.n + ', code ' + c.code + '. ' + c.clue + ', ' + c.side + '.', { icon: '🟧', tag: '🧭 Control ' + c.n + ' of ' + CONTROLS.length, keep: true, next: 'Answer to go on ▶' });
  const all = (DATA.ALL && DATA.ALL.orienteering) || [], q = all[i % all.length];
  if (q) await w.ask({ who: 'Coach Rita', icon: '🧭', tag: '❓ Orienteering', q: q[0], opts: q[1], right: q[2] }); else w.ui.closeCard();
  w.done('c' + c.n, 150); startLeg(w, i + 1);
}
async function finish(w) {
  w.done('fin', 200); const secs = Math.round(w.t - (w.startT || 0));
  await w.say('Coach Rita', 'Finished! Six controls in ' + Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2) + '. Download your time at the finish tent, and check your route on the map with a friend.', { icon: '🏁', next: 'See my result ▶' });
  w.finish({ title: 'Course complete!', stats: [[Math.round(w.total || 0) + ' m', 'walked']], list: ['Your controls', CONTROLS.map(c => [c.icon + ' Control ' + c.n + ' (' + c.code + ')', c.clue + ', ' + c.side])] });
}
/* each frame: the hill, the thick bush, the flags, the compass and the metres */
function tick(w, dt) {
  const p = w.pc.root.position; p.y = hillY(p.x, p.z); w.slow = inThick(p.x, p.z) ? 0.45 : 1;
  const show = w.mode === 'practice' ? 22 : 9;
  w.flags.forEach((f, i) => { const c = CONTROLS[i]; f.visible = w.got.includes(c.n) || (w.leg === i && Math.hypot(p.x - c.x, p.z - c.z) < show); });
  if (w.lastP) { const d = Math.hypot(p.x - w.lastP.x, p.z - w.lastP.z); if (d < 2) { w.walked += d; w.total = (w.total || 0) + d; } w.lastP.copy(p); }
  const el = document.getElementById('h-comp'); if (!el || el.hidden) return;
  const cd = document.getElementById('h-card'); el.style.visibility = cd && !cd.hidden ? 'hidden' : '';
  const head = (360 + 180 - w.pc.root.rotation.y * 180 / PI) % 360, moving = w.vel && w.vel.length() > 0.3;
  el.querySelector('.oc-me').style.transform = 'rotate(' + head.toFixed(0) + 'deg)';
  const go = el.querySelector('.oc-go'); go.hidden = !(w.leg >= 0 && w.leg <= CONTROLS.length); go.style.transform = 'rotate(' + (w.want || 0) + 'deg)';
  if (w.leg >= 0) {
    const off = Math.abs(((head - w.want + 540) % 360) - 180);
    el.querySelector('.oc-want').textContent = (w.leg < CONTROLS.length ? 'To ' + CONTROLS[w.leg].n + ': ' : 'Finish: ') + w.want + '°';
    el.querySelector('.oc-dir').textContent = 'You: ' + Math.round(head) + '° ' + (moving ? off < 12 ? '✓ on the bearing' : off < 35 ? '↻ nearly' : '✗ turn' : '');
    el.querySelector('.oc-dir').className = 'oc-dir ' + (moving && off < 12 ? 'ok' : '');
    el.querySelector('.oc-m').textContent = 'Walked: ' + Math.round(w.walked || 0) + ' m';
  }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
