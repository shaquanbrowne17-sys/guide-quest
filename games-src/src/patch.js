/* Honours Patch Hunt (Honours Guide, LE 1 and OD 4): a camp obstacle course with six zones. Cross each zone's obstacle,
   try the honour at its station, say which area it belongs to, and the patch goes on your sash.
   The honour areas and tips follow the Honours Guide lessons in the Learning Lab. */
import { THREE, G, P, merge, MAT, sign, SND } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  beam: () => merge([P(G.cyl(0.13, 0.13, 5.2, 8), '#8A5A2B', [0, 0.75, 0], [PI / 2, 0, 0]), ...[-2.2, 2.2].map(z => P(G.box(0.9, 0.7, 0.14), '#6E4424', [0, 0.35, z]))]),
  cwall: () => { const p = [P(G.box(2.6, 2.4, 0.25), '#8A5A2B', [0, 1.2, -0.6]), P(G.box(2.6, 0.15, 1.6), '#6E4424', [0, 2.4, 0.3]), P(G.box(2.6, 2.4, 0.12), '#7A4E26', [0, 1.2, 1.1])];
    const cols = ['#D3243A', '#F2C14E', '#2F6DB5', '#2E7D4F']; for (let i = 0; i < 14; i++) p.push(P(G.ico(0.09, 0), cols[i % 4], [-1.0 + (i * 0.71) % 2.0, 0.3 + (i * 0.37) % 2.0, -0.75])); return merge(p); },
  stonepath: () => merge([P(G.box(2.6, 0.04, 5.6), '#3B5A6E', [0, -0.03, 0]), ...[-2, -1, 0, 1, 2].map((z, i) => P(G.cyl(0.42, 0.48, 0.24, 7), '#9A958B', [i % 2 ? 0.35 : -0.35, 0.08, z]))]),
  swingrig: () => merge([...[-1.4, 1.4].flatMap(x => [P(G.box(0.14, 3.4, 0.14), '#6E4424', [x, 1.7, -0.35], [0.12, 0, 0]), P(G.box(0.14, 3.4, 0.14), '#6E4424', [x, 1.7, 0.35], [-0.12, 0, 0])]), P(G.box(3.0, 0.16, 0.16), '#6E4424', [0, 3.35, 0]),
    P(G.box(2.8, 0.03, 3.4), '#5A4630', [0, 0.0, 0])]),
  rope1: () => merge([P(G.cyl(0.03, 0.03, 2.9, 5), '#D9C27A', [0, -1.45, 0]), P(G.ico(0.09, 0), '#C9A46A', [0, -2.9, 0])]),
  crawlnet: () => { const p = []; for (const x of [-1.2, 1.2]) for (const z of [-2.2, 0, 2.2]) p.push(P(G.box(0.08, 0.75, 0.08), '#6E4424', [x, 0.37, z])); for (let i = 0; i < 9; i++) p.push(P(G.box(2.4, 0.02, 0.03), '#3A3F47', [0, 0.72, -2.2 + i * 0.55])); for (let i = 0; i < 7; i++) p.push(P(G.box(0.03, 0.02, 4.4), '#3A3F47', [-1.2 + i * 0.4, 0.72, 0])); return merge(p); },
  tyres: () => merge([0, 1, 2, 3, 4, 5].map(i => P(G.tor(0.36, 0.13, 6, 12), '#1E1F22', [i % 2 ? 0.45 : -0.45, 0.13, -2.25 + i * 0.9], [PI / 2, 0, 0]))),
  oven: () => merge([P(G.box(1.6, 0.8, 1.4), '#B9A27A', [0, 0.4, 0]), P(G.ball(0.75, 10, 6), '#C9673F', [0, 0.8, 0], null, [1, 0.8, 1]), P(G.box(0.5, 0.4, 0.1), '#2A1C10', [0, 1.0, 0.68]), P(G.cyl(0.1, 0.1, 0.6, 6), '#8D8A84', [0.3, 1.6, -0.2])]),
  aidtent: () => merge([P(G.cyl(0, 1.9, 2.0, 4), '#F4F1EA', [0, 1.0, 0], [0, PI / 4, 0], [1.2, 1, 1]), P(G.box(0.5, 0.14, 0.04), '#D3243A', [0, 1.1, 1.18]), P(G.box(0.14, 0.5, 0.04), '#D3243A', [0, 1.1, 1.18])]),
  workbench: () => merge([P(G.box(2.0, 0.1, 0.8), '#C9A46A', [0, 0.85, 0]), ...[[-0.9, -0.3], [0.9, -0.3], [-0.9, 0.3], [0.9, 0.3]].map(([x, z]) => P(G.box(0.1, 0.85, 0.1), '#6E4424', [x, 0.42, z])),
    P(G.box(1.4, 0.06, 0.24), '#E9C98A', [0, 0.93, 0.1]), P(G.box(0.5, 0.12, 0.02), '#9AA3AE', [0.4, 1.02, -0.2]), P(G.box(0.12, 0.1, 0.06), '#8E5F33', [0.7, 1.02, -0.2])]),
  coop: () => merge([P(G.box(1.8, 1.1, 1.2), '#C9A46A', [0, 0.85, 0]), P(G.cyl(0, 1.4, 0.6, 4), '#7A3B2E', [0, 1.7, 0], [0, PI / 4, 0], [1, 1, 0.75]), ...[-0.85, 0.85].flatMap(x => [P(G.box(0.08, 0.3, 0.08), '#6E4424', [x, 0.15, -0.55]), P(G.box(0.08, 0.3, 0.08), '#6E4424', [x, 0.15, 0.55])]), P(G.box(0.4, 0.4, 0.05), '#4A3220', [0, 0.85, 0.62])]),
  hen: (c = '#F4F1EA') => merge([P(G.ico(0.18, 1), c, [0, 0.22, 0], null, [0.9, 0.9, 1.2]), P(G.ico(0.1, 1), c, [0, 0.38, 0.14]), P(G.cone(0.035, 0.08, 4), '#F2C14E', [0, 0.37, 0.25], [PI / 2, 0, 0]), P(G.box(0.03, 0.07, 0.07), '#D3243A', [0, 0.48, 0.14]), P(G.box(0.02, 0.12, 0.02), '#F2C14E', [0.06, 0.06, 0]), P(G.box(0.02, 0.12, 0.02), '#F2C14E', [-0.06, 0.06, 0])]),
  logseat: () => merge([P(G.cyl(0.2, 0.2, 1.6, 8), '#7A5230', [0, 0.2, 0], [0, 0, PI / 2])]),
  control: () => merge([P(G.box(0.06, 1.0, 0.06), '#8A5A2B', [0, 0.5, 0]), P(G.box(0.34, 0.17, 0.34), '#FFFFFF', [0, 1.12, 0]), P(G.box(0.34, 0.17, 0.34), '#E8641E', [0, 0.95, 0]), P(G.box(0.05, 0.08, 0.04), '#D3243A', [0.2, 0.8, 0])]),
  hedge: (len = 4) => merge([P(G.box(len, 0.9, 0.7), '#3F7F2E', [0, 0.45, 0])]),
});

const AREAS = ['Household Arts', 'Health and Science', 'Vocational', 'Outdoor Industries', 'Outreach Ministries', 'Wilderness Master (OD 4)'];
const ZONES = [
  { id: 'baking', honour: 'Baking', area: 0, icon: '🍞', ob: 'beam', obName: 'the balance beam', station: 'oven', act: 'Knead the dough', anim: 'Interact',
    tip: 'What is an honour? A skill with its own list of requirements. An instructor teaches it, checks your work and signs it off, and you get a patch for your sash.' },
  { id: 'firstaid', honour: 'First Aid', area: 1, icon: '🩹', ob: 'cwall', obName: 'the climbing wall', station: 'aidtent', act: 'Practise tying a sling', anim: 'Fixing_Kneeling',
    tip: 'How to choose: pick something you enjoy. You’ll finish it.' },
  { id: 'carpentry', honour: 'Carpentry', area: 2, icon: '🪚', ob: 'stonepath', obName: 'the stepping stones', station: 'workbench', act: 'Sand a plank', anim: 'Push_Loop',
    tip: 'Find an instructor: someone in your church or community who knows it.' },
  { id: 'poultry', honour: 'Poultry Raising', area: 3, icon: '🐔', ob: 'swingrig', obName: 'the rope swing', station: 'coop', act: 'Feed the hens', anim: 'Farm_PlantSeed',
    tip: 'Plan your time: most honours take several weeks.' },
  { id: 'story', honour: 'Christian Storytelling', area: 4, icon: '📖', ob: 'crawlnet', obName: 'the crawl net', station: 'campfire', act: 'Tell a Bible story by the fire', anim: 'Idle_Talking_Loop',
    tip: 'New means new: for LE 1 and OD 4 it must be an honour you haven’t earned before.' },
  { id: 'orient', honour: 'Orienteering', area: 5, icon: '🧭', ob: 'tyres', obName: 'the tyre run', station: 'control', act: 'Punch the control', anim: 'Interact',
    tip: 'Look for overlaps: Orienteering counts for OD 4 and the Wilderness Master, which also includes Backpacking, Camp Craft, Knot Tying and Tents.' },
];
const R0 = 5.5, R1 = 10.5, RS = 13.6;   // obstacle start, obstacle end, station
const dirOf = i => { const a = (i / ZONES.length) * PI * 2 + PI / 6; return [Math.sin(a), Math.cos(a), a]; };
const at = (i, r) => { const [sx, cz] = dirOf(i); return [sx * r, cz * r]; };

export const PATCH = {
  key: 'patch', gid: 'hunt:patch', title: 'Honours Patch Hunt', topic: 'honours', icon: '🎖️', kind: 'walk', music: 'calm',
  blurb: 'A camp obstacle course with six zones. Cross the beam, the wall, the stones, the swing, the net and the tyres, try each honour, and fill your sash.',
  howTo: 'Tap where to go, or hold and drag to walk. On an obstacle, tap when the marker is in the green.',
  sky: { top: '#5A97D6', bottom: '#F4E2B8', fogNear: 60, fogFar: 150, sun: '#FFE8C0', sunI: 2.3, sunPos: [-8, 12, 6], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#5E6A3A' },
  ground: '#6FA04A', modes: { endless: ['🎖️', 'The patch hunt', 'Six zones, six patches. About 8 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'rock_largeA', 'flower_yellowA'],
  start: [0, 0, 3.2], startRy: PI, bounds: [-19, -19, 19, 19], intro: [6, 40, 26], questTitle: 'Patches', coinIcon: '🎖️',
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    // the camp in the middle: flagpole, tents, a sign
    w.put('flagpole', null, 0, 0); w.circle(0, 0, 0.3);
    [[-2.6, -2.2, 0.4, '#E07A2C'], [2.6, -2.0, -0.4, '#2F6DB5']].forEach(([x, z, r, c]) => { w.put('tent', [c], x, z, r); w.circle(x, z, 1.4); });
    const s = sign(['🎖️ Honours Patch Hunt', 'Six zones · six patches'], 3.4, 0.9, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); w.add(s, 0, 2.6, -1.4);
    // six zones round the camp
    w.zones = ZONES.map((z, i) => {
      const [dx, dz, a] = dirOf(i), [x0, z0] = at(i, R0), [x1, z1] = at(i, R1), [xs, zs] = at(i, RS), [xm, zm] = at(i, (R0 + R1) / 2);
      const ob = w.put(z.ob, null, xm, zm, a); w.circle(xm, zm, z.ob === 'swingrig' ? 1.7 : 1.3); w.circle(xm - dx * 1.3, zm - dz * 1.3, 0.75); w.circle(xm + dx * 1.3, zm + dz * 1.3, 0.75);
      if (z.ob === 'swingrig') { const rp = B('rope1'); rp.rotation.order = 'YXZ'; rp.position.set(xm, 3.35, zm); w.world.add(rp); z.ropeObj = rp; z.ropeA = a; }
      // hedges either side, so the obstacle is the way in
      const px = Math.cos(a), pz = -Math.sin(a);
      const [hm, hn] = at(i, 8.6); [-1, 1].forEach(sd => { const hx = hm + px * sd * 2.0, hz = hn + pz * sd * 2.0; w.put('hedge', [4.0], hx, hz, a + PI / 2); for (let t = -1.5; t <= 1.5; t += 1) w.circle(hx + dx * t * 1.1, hz + dz * t * 1.1, 0.48); });
      // the station
      const st = w.put(z.station, null, xs, zs, a + PI); w.circle(xs, zs, 0.9);
      if (z.station === 'campfire') { w.fire = w.add(B('flame'), xs, 0.1, zs); [[1.4, 0], [-1.4, 0], [0, 1.4]].forEach(([ox, oz], k) => w.add(B('logseat'), xs + ox * Math.cos(a) + oz * Math.sin(a), 0, zs - ox * Math.sin(a) + oz * Math.cos(a), a + (k < 2 ? PI / 2 : 0))); }
      if (z.station === 'coop') { z.hens = [0, 1, 2, 3].map(k => w.add(B('hen', k % 2 ? '#F4F1EA' : '#B5652C'), xs + Math.cos(k * 1.7) * 1.6, 0, zs + Math.sin(k * 1.7) * 1.6, k)); }
      const lab = sign([z.icon + ' ' + z.honour, AREAS[z.area].replace(' (OD 4)', '')], 2.6, 0.75, { bg: '#F4EFE2', fg: '#1F4D3A', r: 8 }); w.add(lab, xs + dx * 1.2, 2.4, zs + dz * 1.2, a + PI);
      const pr = sign([String(i + 1)], 0.6, 0.6, { bg: '#F2C14E', fg: '#2A1C00', r: 30 }); w.add(pr, x0 - dx * 0.2 + px * 1.5, 1.4, z0 - dz * 0.2 + pz * 1.5, a + PI);
      return Object.assign(z, { i, a, dx, dz, x0, z0, x1, z1, xs, zs, crossed: false, got: false });
    });
    // trees round the edge
    const r = mul(3); for (let k = 0; k < 46; k++) { const ang = r() * PI * 2, rad = 16.5 + r() * 5, n = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'rock_largeA'][k % 6]; w.kit(n, n.startsWith('tree') ? 5 + r() * 4 : null, Math.sin(ang) * rad, Math.cos(ang) * rad, r() * 6, 0.5); }
    for (let k = 0; k < 16; k++) w.kit('flower_yellowA', 0.5, (r() - 0.5) * 8, (r() - 0.5) * 8 + 2, r() * 6);
    progress(0.5);
    const d = await w.npc('director', { body: 'm', skin: 1, hair: 'buzzed', scale: 1.0 }, 'counsellor', 1.2, 1.6, PI * 0.9, 'Idle_Talking_Loop'); d.anim = 'Idle_Talking_Loop';
    w.thing({ id: 'director', x: 1.2, z: 1.6, npc: d, icon: '💬', verb: 'Talk to Director Pat', when: w => !w.isDone('start') || (w.zones.every(z => z.got) && !w.isDone('plan')), use: talkDirector });
    w.zones.forEach(z => {
      w.thing({ id: 'ob_' + z.id, x: z.x0, z: z.z0, r: 2.6, h: 1.0, stand: [z.x0 - z.dx * 0.3, z.z0 - z.dz * 0.3], icon: '🏃', verb: 'Cross ' + z.obName, when: w => w.isDone('start') && !z.crossed, use: w => cross(w, z) });
      w.thing({ id: 'st_' + z.id, x: z.xs, z: z.zs, r: 2.4, h: 1.6, icon: z.icon, verb: z.act, when: w => z.crossed && !z.got, use: w => station(w, z) });
    });
    w.hooks.push(animate);
  },
  begin(w) { w.setQuests([{ id: 'start', text: 'Talk to Director Pat at the flagpole' }]); w.ui.banner('Honours Patch Hunt', 'Six zones. Fill your sash.', 2600); drawSash(w); },
};

function drawSash(w) {
  const el = w.el('h-sash'); el.hidden = false;
  el.innerHTML = ZONES.map(z => '<i class="' + (z.got ? 'got' : '') + '" title="' + z.honour + '">' + (z.got ? z.icon : '') + '</i>').join('');
}
async function talkDirector(w) {
  w.faceEach(w.npcs.director); const DI = '🧑🏾‍✈️', DP = 'Director Pat';
  if (!w.isDone('start')) {
    await w.say(DP, 'Welcome to the patch hunt! Six zones, six honours. Each zone has an obstacle on the way in. Get across, try the honour, and the patch goes on your sash.', { icon: DI });
    await w.say(DP, 'On an obstacle, tap when the white marker is in the green. Miss, and you wobble. Off you go!', { icon: DI });
    w.done('start', 50); ZONES.forEach(z => w.addQuest({ id: z.id, text: z.icon + ' ' + z.honour + ' (zone ' + (z.i + 1) + ')' }));
    return;
  }
  await w.say(DP, 'A full sash! Now the real thing. For LE 1 and OD 4 you choose two new honours.', { icon: DI });
  await w.ask({ who: DP, icon: DI, q: 'LE 1: which of these would count?', opts: ['A lifestyle honour you haven’t earned before, like Carpentry', 'An honour you already have', 'A video game you’re good at'], right: 0, why: 'LE 1: one new honour in a lifestyle area (Household Arts, Health and Science, Vocational, Outdoor Industries or Outreach Ministries).' });
  await w.ask({ who: DP, icon: DI, q: 'OD 4: which one counts toward the Wilderness Master award?', opts: ['Camp Craft', 'Baking', 'Poultry Raising'], right: 0, why: 'The Wilderness Master includes Backpacking, Camp Craft, Knot Tying, Orienteering and Tents.' });
  const pick = await w.choose({ who: DP, icon: '📝', q: 'Which lifestyle honour would you like to start?', opts: ['Cooking or Baking', 'First Aid', 'Computers', 'Gardening', 'Christian Storytelling'] });
  void pick;
  await w.say(DP, 'Great choice. Ask your counsellor who can teach it. When you finish, record the honour name and date, your instructor’s name and a photo of your work, then tap “Done – ask my counsellor to check”.', { icon: DI, next: 'Finish ▶' });
  w.done('plan', 100);
  w.finish({ title: 'A full sash!', stats: [[w.zones.filter(z => z.got).length + '/6', 'patches']], list: ['Your sash', w.zones.map(z => [z.icon + ' ' + z.honour, AREAS[z.area]])] });
}
/* the obstacles: each one is a short timing game */
async function cross(w, z) {
  const p = w.pc.root.position, D = (r, y = 0) => { const [x, zz] = at(z.i, r); return [x, y, zz]; };
  await w.tween(D(R0 - 0.3), 0.35, 'Walk_Loop'); w.face(w.pc, z.x1, z.z1);
  const wob = async () => { await w.anim('Hit_Chest', 600); w.ui.toast('Wobble! Try again', 'bad'); };
  let misses = 0, n;
  if (z.ob === 'beam') { n = 4; misses = await w.timing({ label: 'Balance beam: step when it’s green', steps: n, speed: 0.9, verb: 'Step', step: i => w.tween(D(R0 + 0.4 + (i + 1) * 1.05, 0.88), 0.55, 'Walk_Loop', 0.08), miss: wob }); }
  else if (z.ob === 'cwall') { n = 3; misses = await w.timing({ label: 'Climbing wall: grab the hold', steps: n, speed: 1.0, verb: 'Climb', step: i => w.tween(D(R0 + 1.5, (i + 1) * 0.8), 0.9, 'ClimbUp_1m', 0, { face: false, once: true }), miss: wob });
    await w.tween(D(R0 + 2.6, 2.48), 0.6, 'Walk_Loop'); await w.tween(D(R0 + 4.3, 0), 0.7, 'Jump_Loop', 0.4); }
  else if (z.ob === 'stonepath') { n = 5; misses = await w.timing({ label: 'Stepping stones: jump on the green', steps: n, speed: 1.05, verb: 'Jump', step: i => w.tween([...(() => { const [x, zz] = at(z.i, R0 + 0.5 + i * 1.0); const px = Math.cos(z.a) * (i % 2 ? 0.35 : -0.35), pz = -Math.sin(z.a) * (i % 2 ? 0.35 : -0.35); return [x + px, 0.2, zz + pz]; })()], 0.45, 'Jump_Loop', 0.5),
    miss: async () => { await w.anim('Hit_Knockback', 700); w.ui.toast('Splash! Try again', 'bad'); } }); }
  else if (z.ob === 'swingrig') { n = 1; misses = await w.timing({ label: 'Rope swing: let go on the green', steps: n, speed: 1.15, zone: 0.16, verb: 'Swing!', step: async () => { z.swing = 1; await w.tween(D(R1 - 0.3, 0), 1.1, 'Jump_Loop', 1.4); z.swing = 0; }, miss: async () => { await w.anim('Hit_Knockback', 800); w.ui.toast('Into the mud! Try again', 'bad'); } }); }
  else if (z.ob === 'crawlnet') { n = 4; misses = await w.timing({ label: 'Crawl net: crawl on the green', steps: n, speed: 0.95, verb: 'Crawl', step: i => w.tween(D(R0 + 0.3 + (i + 1) * 1.15, 0), 0.8, 'Crouch_Fwd_Loop'), miss: async () => { await w.anim('Crouch_Idle_Loop', 500); w.ui.toast('Snagged! Try again', 'bad'); } }); }
  else { n = 6; misses = await w.timing({ label: 'Tyre run: hop on the green', steps: n, speed: 1.2, zone: 0.28, verb: 'Hop', step: i => w.tween([...(() => { const [x, zz] = at(z.i, R0 + 0.3 + i * 0.9); const s = i % 2 ? 0.45 : -0.45; return [x + Math.cos(z.a) * s, 0.15, zz - Math.sin(z.a) * s]; })()], 0.32, 'Jog_Fwd_Loop', 0.35), miss: wob }); }
  await w.tween(D(R1 + 0.2), 0.4, 'Walk_Loop'); p.y = 0;
  z.crossed = true; w.points += Math.max(30, 150 - misses * 40); if (!misses) w.ui.toast('Clean run! No wobbles', 'good');
  w.busy = false; w.pc.play('Idle_Loop', { fade: 0.2 });
}
async function station(w, z) {
  w.face(w.pc, z.xs, z.zs); await w.anim(z.anim, 1500);
  const others = [0, 1, 2, 3, 4, 5].filter(k => k !== z.area).sort(() => Math.random() - 0.5).slice(0, 2);
  await w.ask({ who: z.honour + ' honour', icon: z.icon, tag: '🎖️ Zone ' + (z.i + 1), q: 'Which area is the ' + z.honour + ' honour in?', opts: [AREAS[z.area], ...others.map(k => AREAS[k])], right: 0, why: z.tip });
  z.got = true; SND.power(); drawSash(w); w.done(z.id, 150);
  if (w.zones.every(q => q.got)) w.addQuest({ id: 'plan', text: 'Back to Director Pat: choose your new honours' });
}
function animate(w, dt) {
  const t = w.eng.time;
  w.zones.forEach(z => { if (z.ropeObj) z.ropeObj.rotation.x = z.swing ? -0.9 : Math.sin(t * 1.3) * 0.25; if (z.ropeObj) z.ropeObj.rotation.y = z.ropeA; if (z.hens) z.hens.forEach((h, k) => { h.rotation.x = Math.max(0, Math.sin(t * 3 + k * 2)) * 0.5; }); });
  if (w.fire) { w.fire.scale.y = 1 + Math.sin(t * 9) * 0.12; w.fire.rotation.y = t; }
  const el = document.getElementById('h-sash'); if (el) el.hidden = w.state !== 'play';
}
function mul(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
