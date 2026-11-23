/* Build It (Knots & Lashings OD 3, Pack Camp OD 1, Fire & Camp Cooking OD 2): three builds at the campsite.
   Lash a signal tower (the wind tests every lashing), pitch a tent (the rain tests the site and the pegs)
   and lay a fire (it only catches if the order and the lay are right). The rules follow the Learning Lab explorers:
   square lashing where poles cross at a right angle, diagonal lashing (started with a timber hitch) where they cross at
   an angle and spring apart, shear lashing for two poles opened into an A-frame; teepee for boiling, log cabin for
   cooking coals, lean-to in the wind, star fire to save wood. */
import { THREE, G, P, merge, MAT, sprite, SND } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
const TW = { x: -9, z: -4 }, TE = { x: 7, z: -6 }, FI = { x: 0, z: 6 };
Object.assign(BUILD, {
  pole: (len = 4, r = 0.07) => merge([P(G.cyl(r, r, len, 7), '#B9894F', [0, len / 2, 0])]),
  lashmark: () => merge([P(G.cyl(0.11, 0.11, 0.22, 8), '#E8DDB5', [0, 0, 0])]),
  firering: () => { const p = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * PI; p.push(P(G.dod(0.22), '#8A867E', [Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9])); } p.push(P(G.cyl(0.85, 0.85, 0.03, 16), '#3A2E24', [0, 0.01, 0])); return merge(p); },
  bucket: () => merge([P(G.cyl(0.22, 0.18, 0.4, 10), '#8D9AA6', [0, 0.2, 0]), P(G.cyl(0.2, 0.2, 0.02, 10), '#4A84B8', [0, 0.36, 0]), P(G.tor(0.21, 0.015, 4, 10, PI), '#5A626B', [0, 0.42, 0], [0, PI / 2, 0])]),
  tinder: () => merge([P(G.cone(0.28, 0.18, 7), '#D9C27A', [0, 0.09, 0])]),
  kindling: () => merge([0, 1, 2, 3, 4, 5].map(i => P(G.cyl(0.02, 0.02, 0.7, 4), '#9C7A4E', [Math.cos(i) * 0.12, 0.3, Math.sin(i) * 0.12], [0.35 * Math.cos(i), 0, 0.35 * Math.sin(i)]))),
  fuel: () => merge([0, 1, 2, 3].map(i => P(G.cyl(0.07, 0.07, 1.0, 6), '#6E4424', [0, 0.18 + (i > 1 ? 0.14 : 0), 0], [PI / 2, (i % 2) * PI / 2 + (i > 1 ? 0 : 0), 0], [1, 1, 1]))),
  flame: () => merge([P(G.cone(0.32, 0.8, 7), '#F28C28', [0, 0.4, 0]), P(G.cone(0.18, 0.6, 6), '#FFD45A', [0, 0.35, 0])]),
  site: (c = '#6B8F45') => merge([P(G.cyl(1.4, 1.4, 0.02, 18), c, [0, 0.01, 0])]),
  deadtree: () => merge([P(G.cyl(0.18, 0.28, 5, 6), '#5E4B3A', [0, 2.5, 0]), P(G.cyl(0.06, 0.1, 2.2, 5), '#5E4B3A', [0.7, 4.0, 0], [0, 0, -0.9]), P(G.cyl(0.05, 0.08, 1.6, 5), '#5E4B3A', [-0.6, 3.6, 0.2], [0.3, 0, 0.9])]),
  tentA: () => { const p = [P(G.box(2.2, 0.03, 2.6), '#3E4A5C', [0, 0.015, 0])]; p.push(P(G.box(1.62, 0.04, 2.5), '#2E7D4F', [-0.55, 0.78, 0], [0, 0, 0.95]), P(G.box(1.62, 0.04, 2.5), '#2E7D4F', [0.55, 0.78, 0], [0, 0, -0.95]));
    p.push(P(G.cyl(0.03, 0.03, 1.55, 5), '#9AA3AE', [0, 0.77, 1.25]), P(G.cyl(0.03, 0.03, 1.55, 5), '#9AA3AE', [0, 0.77, -1.25])); return merge(p); },
  puddle: () => merge([P(G.cyl(1.6, 1.6, 0.02, 18), '#4A84B8', [0, 0.02, 0])]),
});
/* the tower: [name, a, b, r] poles, and the six joints */
const POLES = [['fl1', [-1.2, 0, 0.9], [0, 4.6, 0.9]], ['fl2', [1.2, 0, 0.9], [0, 4.6, 0.9]], ['bl1', [-1.2, 0, -0.9], [0, 4.6, -0.9]], ['bl2', [1.2, 0, -0.9], [0, 4.6, -0.9]],
  ['fledge', [-1.0, 1.6, 0.98], [1.0, 1.6, 0.98]], ['bledge', [-1.0, 1.6, -0.98], [1.0, 1.6, -0.98]], ['ridge', [0, 4.45, 1.2], [0, 4.45, -1.2]], ['brace1', [-0.8, 0.4, 0.98], [0.75, 2.8, -0.98]], ['brace2', [0.8, 0.4, 0.98], [-0.75, 2.8, -0.98]]];
const JOINTS = [
  { id: 'j1', name: 'the top of the front legs', at: [0, 4.4, 0.9], poles: ['fl1', 'fl2'], lash: 'shear', why: 'Two poles side by side, opened into an A-frame: shear lashing.' },
  { id: 'j2', name: 'the top of the back legs', at: [0, 4.4, -0.9], poles: ['bl1', 'bl2'], lash: 'shear', why: 'The back A-frame is the same: shear lashing.' },
  { id: 'j3', name: 'the front crossbar', at: [-1.0, 1.6, 0.95], poles: ['fledge'], lash: 'square', why: 'The crossbar meets the leg at a right angle: square lashing.' },
  { id: 'j4', name: 'the back crossbar', at: [-1.0, 1.6, -0.95], poles: ['bledge'], lash: 'square', why: 'Same as the front: a square lashing for poles that cross at a right angle.' },
  { id: 'j5', name: 'the ridge pole on top', at: [0, 4.5, 0.9], poles: ['ridge'], lash: 'square', why: 'The ridge crosses the A-frames at a right angle: square lashing.' },
  { id: 'j6', name: 'the X-brace on the side', at: [0, 1.6, 0], poles: ['brace1', 'brace2'], lash: 'diagonal', why: 'The braces cross at an angle and want to spring apart: diagonal lashing.' },
];
const LASH = { shear: 'Shear lashing', square: 'Square lashing', diagonal: 'Diagonal lashing' };
const START_KNOT = { shear: 'Clove hitch', square: 'Clove hitch', diagonal: 'Timber hitch' };

export const BUILDIT = {
  key: 'build', gid: 'build:it', title: 'Build It', topic: 'lashing', icon: '🪢', kind: 'walk', music: 'calm',
  blurb: 'Three builds at the campsite: lash a signal tower, pitch a tent and lay a fire. Then the wind, the rain and the match test your work.',
  howTo: 'Tap where to go, or hold and drag to walk. At each build, choose and then tap when the marker is in the green.',
  sky: { top: '#5E9BD6', bottom: '#F2E2B8', fogNear: 45, fogFar: 120, sun: '#FFE8C0', sunI: 2.3, sunPos: [-6, 12, -4], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#6E9E4A', modes: { endless: ['🪢', 'Camp builds', 'Tower, tent and fire, then the tests. About 8 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'plant_bush', 'rock_largeA', 'grass_large', 'flower_yellowA', 'stump_round', 'log', 'log_stack'],
  start: [0, 0, 14], startRy: PI, bounds: [-18, -16, 18, 18], intro: [8, 34, 22], questTitle: 'Builds', coinIcon: '🪢', camK: 0.95,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    // the tower (built pole by pole as you lash)
    w.tower = new THREE.Group(); w.tower.position.set(TW.x, 0, TW.z); w.world.add(w.tower); w.poles = {};
    POLES.forEach(([id, a, b]) => { const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), m = B('pole', d.length()); m.position.copy(A); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.visible = false; w.tower.add(m); w.poles[id] = m; });
    w.marks = JOINTS.map(j => { const m = B('lashmark'); m.position.set(...j.at); m.visible = false; w.tower.add(m); return m; });
    const pile = w.add(new THREE.Group(), TW.x + 2.8, 0, TW.z + 2.4); for (let i = 0; i < 7; i++) { const m = B('pole', 4.4); m.rotation.z = PI / 2; m.position.set(-2.2, 0.08 + (i % 3) * 0.14, i * 0.18); pile.add(m); } w.pile = pile; w.box(TW.x + 0.5, TW.z + 2.2, TW.x + 3.2, TW.z + 3.8);
    w.circle(TW.x, TW.z, 1.9);
    // the tent area: three sites to choose from
    w.sites = { good: [TE.x + 2.5, TE.z - 1.5], dip: [TE.x - 2.4, TE.z - 1.8], tree: [TE.x, TE.z + 3] };
    w.add(B('site', '#7DA453'), ...[w.sites.good[0], 0, w.sites.good[1]]); w.add(B('site', '#5C7F3C'), w.sites.dip[0], -0.04, w.sites.dip[1]); w.add(B('site', '#6E9E4A'), w.sites.tree[0], 0, w.sites.tree[1]);
    w.add(B('deadtree'), w.sites.tree[0] + 0.9, 0, w.sites.tree[1] - 0.6); w.circle(w.sites.tree[0] + 0.9, w.sites.tree[1] - 0.6, 0.35);
    w.tent = B('tentA'); w.tent.visible = false; w.world.add(w.tent); w.puddle = B('puddle'); w.puddle.visible = false; w.world.add(w.puddle);
    // the fire circle
    w.add(B('firering'), FI.x, 0, FI.z); w.circle(FI.x, FI.z, 1.05); w.bucketM = w.add(B('bucket'), FI.x + 1.8, 0, FI.z + 0.6); w.bucketM.visible = false;
    w.fireParts = { tinder: B('tinder'), kindling: B('kindling'), fuel: B('fuel'), flame: B('flame') }; Object.values(w.fireParts).forEach(m => { m.visible = false; w.add(m, FI.x, 0, FI.z); });
    w.kit('log_stack', 1.2, FI.x - 2.6, FI.z + 1.2, 0.3, 0.6);
    // trees around the campsite
    const r = mulberry(9);
    for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 38, z = -16 + r() * 34; if (Math.hypot(x, z - 4) < 15 || Math.hypot(x - TW.x, z - TW.z) < 5 || Math.hypot(x - TE.x, z - TE.z) < 6) continue;
      const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'plant_bush', 'rock_largeA'][Math.floor(r() * 7)];
      const t = w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6, k.startsWith('tree') ? 0.35 : 0.5); if (t && k.startsWith('tree') && z > 0) w.fadeable(t); }
    for (let i = 0; i < 40; i++) w.kit(['grass_large', 'flower_yellowA', 'stump_round'][i % 3], 0.5, (r() - 0.5) * 34, -14 + r() * 30, r() * 6);
    progress(0.6);
    const ben = await w.npc('ben', { body: 'm', skin: 4, hair: 'short' }, 'counsellor', 1.8, 12.5, PI * 0.8, 'Idle_Talking_Loop'); ben.anim = 'Idle_Talking_Loop';
    w.thing({ id: 'ben', x: 1.8, z: 12.5, npc: ben, icon: '💬', verb: 'Talk to Counsellor Ben', when: w => !w.isDone('brief') || (w.isDone('tower') && w.isDone('tent') && w.isDone('fire') && !w.isDone('tests')), use: talkBen });
    w.thing({ id: 'tower', x: TW.x + 1.6, z: TW.z + 1.6, r: 2.4, icon: '🪢', verb: 'Lash the signal tower', when: w => w.isDone('brief') && !w.isDone('tower'), use: lashTower });
    w.thing({ id: 'tent', x: TE.x, z: TE.z, r: 3.2, icon: '⛺', verb: 'Pitch the tent', when: w => w.isDone('brief') && !w.isDone('tent'), use: pitchTent });
    w.thing({ id: 'fire', x: FI.x + 1.3, z: FI.z + 1.3, r: 2.4, icon: '🔥', verb: 'Lay the fire', when: w => w.isDone('brief') && !w.isDone('fire'), use: layFire });
    w.res = { tower: 0, tentSite: 'good', pegs: true, fly: true, fire: true }; w.hooks.push(animate);
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Counsellor Ben' }]); w.ui.banner('The campsite', 'Three builds. Then the tests.', 2600); },
};

async function talkBen(w) {
  const b = w.npcs.ben; w.faceEach(b);
  if (!w.isDone('brief')) {
    await w.say('Counsellor Ben', 'Three jobs before dark: lash the signal tower, pitch your tent, and lay tonight’s cooking fire. Do them in any order.', { icon: '🧑🏾‍🏫' });
    await w.say('Counsellor Ben', 'When all three are done, come back. The wind will test the tower, the rain will test the tent, and the match will test the fire.', { icon: '🧑🏾‍🏫', next: 'Let’s build ▶' });
    w.done('brief', 50); w.addQuest({ id: 'tower', text: 'Lash the signal tower' }); w.addQuest({ id: 'tent', text: 'Pitch the tent' }); w.addQuest({ id: 'fire', text: 'Lay the fire' }); w.addQuest({ id: 'tests', text: 'Back to Counsellor Ben for the tests' });
    return;
  }
  await tests(w);
}

/* ---------- the tower ---------- */
const wraps = (w, label) => w.timing({ label, steps: 3, speed: 1.05, verb: 'Pull tight', step: async () => { SND.pop(); await w.anim('Interact', 450); }, miss: async () => { await w.anim('Hit_Knockback', 500); w.ui.toast('Too loose! Pull it tight again', 'bad'); } });
async function lashTower(w) {
  w.face(w.pc, TW.x, TW.z); const seen = {};
  for (const [i, j] of JOINTS.entries()) {
    j.poles.forEach(id => { w.poles[id].visible = true; }); SND.lane();
    const opts = ['shear', 'square', 'diagonal'];
    const ok = await w.ask({ who: 'Joint ' + (i + 1) + ' of 6', icon: '🪢', tag: '🪢 Lash the tower', q: 'Which lashing for ' + j.name + '?', opts: opts.map(o => LASH[o]), right: opts.indexOf(j.lash), why: j.why, keep: true });
    j.ok = ok;
    if (!seen[j.lash]) { seen[j.lash] = true; const kn = ['Clove hitch', 'Timber hitch', 'Square knot'];
      await w.ask({ who: LASH[j.lash], icon: '🪢', tag: '🪢 The first knot', q: 'Which knot starts a ' + LASH[j.lash].toLowerCase() + '?', opts: kn, right: kn.indexOf(START_KNOT[j.lash]), why: j.lash === 'diagonal' ? 'The timber hitch goes around both poles diagonally and grips them.' : 'A clove hitch on one pole starts it, and another clove hitch finishes it.', keep: true }); }
    w.ui.closeCard();
    const misses = await wraps(w, 'Joint ' + (i + 1) + ': wrapping turns, then frapping');
    w.marks[i].visible = true; if (misses > 1) j.ok = false;
    w.busy = true;
  }
  w.res.tower = JOINTS.filter(j => !j.ok).length;
  w.done('tower', 300 - w.res.tower * 60); w.busy = false;
}

/* ---------- the tent ---------- */
async function pitchTent(w) {
  const SITES = [['good', 'On the flat, slightly higher ground, nothing dead overhead'], ['dip', 'In the dip, out of the wind'], ['tree', 'Under the big dead tree, for shade']];
  const order = SITES.slice().sort(() => Math.random() - 0.5);
  w.askRight = SITES[0][1]; const c = await w.choose({ who: 'Your tent', icon: '⛺', tag: '⛺ Pitch the tent', q: 'Where will you pitch it?', opts: order.map(x => x[1]), keep: true }); w.askRight = null;
  const pick = order[c][0]; w.res.tentSite = pick;
  if (pick === 'good') { w.right++; w.points += 100; SND.good(); w.ui.cardFeedback(true, 'Flat, a little higher, and nothing dead overhead.'); }
  else { w.wrong++; SND.bad(); w.ui.cardFeedback(false, pick === 'dip' ? 'Rain runs downhill and pools in a dip. You’ll find out tonight.' : 'Dead branches can fall in the wind. Never pitch under a dead tree.'); w.learn.push(['Where to pitch a tent', 'On flat, slightly higher ground, with nothing dead overhead']); }
  await wait(pick === 'good' ? 2300 : 3600);
  const at = w.sites[w.res.tentSite]; w.tent.position.set(at[0], w.res.tentSite === 'dip' ? -0.04 : 0, at[1]); w.tent.rotation.y = 0; w.tent.visible = true; w.tent.scale.set(1, 0.05, 1);
  await w.ask({ who: 'Your tent', icon: '⛺', tag: '⛺ Pitch the tent', q: 'Which way should the door face?', opts: ['Away from the wind', 'Into the wind', 'It doesn’t matter'], right: 0, why: 'With the back to the wind, rain and wind stay out of the door.', keep: true });
  await w.ask({ who: 'Your tent', icon: '⛺', tag: '⛺ Pitch the tent', q: 'Which corners do you peg first?', opts: ['Opposite corners, so the floor is square and tight', 'All the corners on one side', 'Any order'], right: 0, why: 'Opposite corners first pull the floor square, then the rest.', keep: true });
  const pegs = await w.ask({ who: 'Your tent', icon: '⛺', tag: '⛺ Pitch the tent', q: 'How do the pegs go in?', opts: ['At about 45°, leaning away from the tent', 'Straight up and down', 'Leaning toward the tent'], right: 0, why: 'Angled away from the tent, the pull of the guy line can’t lift them out.', keep: true });
  w.res.pegs = pegs; w.ui.closeCard();
  await w.timing({ label: 'Hammer in the pegs', steps: 4, speed: 1.1, verb: 'Hammer', step: async i => { SND.pop(); w.tent.scale.y = 0.25 + (i + 1) * 0.19; await w.anim('Interact', 380); }, miss: async () => { await w.anim('Hit_Knockback', 500); w.ui.toast('Bent the peg! Again', 'bad'); } });
  w.tent.scale.y = 1; w.busy = true;
  const fly = await w.ask({ who: 'Your tent', icon: '⛺', tag: '⛺ The fly sheet', q: 'The fly sheet (the outer cover) should…', opts: ['Not touch the inner tent, so rain runs off', 'Lie right on the inner tent', 'Stay in the bag'], right: 0, why: 'Where the fly touches the inner tent, water soaks through.' });
  w.res.fly = fly;
  w.done('tent', 250 - (w.res.tentSite !== 'good' ? 80 : 0) - (pegs ? 0 : 40) - (fly ? 0 : 40));
}

/* ---------- the fire ---------- */
async function layFire(w) {
  w.face(w.pc, FI.x, FI.z);
  await w.ask({ who: 'Tonight’s fire', icon: '🔥', tag: '🔥 Lay the fire', q: 'Before you start, what do you put next to the fire circle?', opts: ['A bucket of water or sand', 'Your sleeping bag', 'Nothing yet'], right: 0, why: 'Water or sand ready before you light: for safety, and to put it out.', keep: true });
  w.bucketM.visible = true;
  const order = ['tinder', 'kindling', 'fuel'], names = { tinder: 'Tinder (dry grass, shavings)', kindling: 'Kindling (thin dry sticks)', fuel: 'Fuel (bigger logs)' };
  let good = true;
  for (let k = 0; k < 3; k++) {
    const left = order.filter(o => !w.fireParts[o].visible);
    const ok = await w.ask({ who: 'Tonight’s fire', icon: '🔥', tag: '🔥 Layer ' + (k + 1) + ' of 3', q: k ? 'What goes on next?' : 'What goes in first?', opts: left.map(o => names[o]), right: left.indexOf(order[k]), keepOrder: true, why: 'Tinder catches the match, kindling catches the tinder, and fuel catches the kindling.', keep: true });
    if (!ok) good = false; w.fireParts[order[k]].visible = true; SND.pop();
  }
  const lay = await w.ask({ who: 'Tonight’s fire', icon: '🔥', tag: '🔥 The lay', q: 'You’ll cook dinner on it. Which fire lay?', opts: ['Log cabin', 'Teepee', 'Star fire', 'Lean-to'], right: 0, why: 'Log cabin: steady heat and coals for cooking. Teepee is fast and hot, good for boiling.', keep: true });
  const side = await w.ask({ who: 'Tonight’s fire', icon: '🔥', tag: '🔥 Light it', q: 'Where do you strike the match and light it?', opts: ['Low down, on the side the wind comes from', 'On the side the wind blows toward', 'From the top'], right: 0, why: 'Lit low on the upwind side, the wind pushes the flame into the fire.' });
  w.res.fire = good && lay && side; w.res.fireLay = lay;
  w.done('fire', 250 - (good ? 0 : 80) - (lay ? 0 : 40) - (side ? 0 : 40));
}

/* ---------- the tests ---------- */
async function tests(w) {
  w.busy = true;
  // wind on the tower
  w.camOverride = { pos: new THREE.Vector3(TW.x + 6, 4.5, TW.z + 7), look: new THREE.Vector3(TW.x, 2.2, TW.z) }; await wait(1200);
  w.wind = 1; await wait(3200);
  const bad = w.res.tower;
  if (bad >= 2) { w.fall = 0.001; SND.bad(); await wait(1800); w.learn.push(['The tower fell', 'Square lashing where poles cross at a right angle, diagonal where they cross at an angle, shear for the A-frame legs']); }
  w.wind = 0;
  await w.say('🌬️ The wind test', bad === 0 ? 'The tower sways and stands firm. Every lashing held!' : bad === 1 ? 'One joint slips and the tower wobbles, but it stands. Check that lashing.' : 'Wrong lashings slip, and the tower falls! Lash it again with the right lashing at each joint.', { icon: '🪢', tag: '🌬️ Test 1 of 3', keep: true });
  // rain on the tent
  w.ui.closeCard(); const at = w.sites[w.res.tentSite]; w.camOverride = { pos: new THREE.Vector3(at[0] + 4, 3.6, at[1] + 6), look: new THREE.Vector3(at[0], 0.6, at[1]) }; w.rain = true; await wait(2400);
  if (w.res.tentSite === 'dip') { w.puddle.position.set(at[0], 0, at[1]); w.puddle.visible = true; w.puddle.scale.setScalar(0.1); w.grow = 1; await wait(1800); }
  w.rain = false;
  const tentMsg = w.res.tentSite === 'dip' ? 'The rain runs downhill into the dip, and your tent sits in a puddle.' : w.res.tentSite === 'tree' ? 'A dead branch crashes down next to the tent in the wind. Too close!' : !w.res.pegs ? 'The pegs pull out in the wind, and one corner flaps loose.' : !w.res.fly ? 'Water soaks through where the fly touches the inner tent.' : 'Dry inside. A good pitch!';
  await w.say('🌧️ The rain test', tentMsg, { icon: '⛺', tag: '🌧️ Test 2 of 3', keep: true });
  // the match
  w.ui.closeCard(); w.camOverride = { pos: new THREE.Vector3(FI.x + 3, 2.6, FI.z + 4), look: new THREE.Vector3(FI.x, 0.4, FI.z) }; await wait(1100);
  const blows = await w.timing({ label: 'Blow gently at the base', steps: 3, speed: 1.0, verb: 'Blow', step: async i => { w.fireParts.flame.visible = w.res.fire; w.flameK = w.res.fire ? 0.35 + i * 0.3 : 0; SND.noise(0.3, 0.1, 0, 800); await wait(450); }, miss: async () => { w.ui.toast('Too hard! You blew it out', 'bad'); await wait(400); } });
  w.busy = true;
  await w.say('🔥 The match test', w.res.fire ? 'It catches, and the log cabin burns down to good cooking coals. Dinner time!' : 'It smokes and goes out. Tinder first, then kindling, then fuel, the right lay, and light it low on the upwind side.', { icon: '🔥', tag: '🔥 Test 3 of 3', keep: true });
  void blows;
  await w.ask({ who: 'Counsellor Ben', icon: '🧑🏾‍🏫', q: 'Before you leave camp, the fire must be…', opts: ['Cold: drown it, stir it, feel it', 'Covered with leaves', 'Left to burn out by itself'], right: 0, why: 'Drown it with water, stir the ashes, and feel with the back of your hand that it’s cold.' });
  w.camOverride = null; w.done('tests', 200);
  w.finish({ title: bad === 0 && w.res.tentSite === 'good' && w.res.fire ? 'Camp built!' : 'Camp tested!', stats: [[(6 - bad) + '/6', 'lashings held']] });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* the wind sways the tower (stiff when every lashing is right), it can fall; rain; flames */
function animate(w, dt) {
  const t = w.eng.time, bad = w.res.tower;
  if (w.fall) { w.fall += dt * 1.6; const a = Math.min(PI / 2 - 0.08, w.fall * w.fall); w.tower.rotation.z = -a; }
  else { const amp = w.wind ? (bad === 0 ? 0.015 : 0.06 + bad * 0.03) : 0; w.tower.rotation.z = Math.sin(t * (bad ? 3 : 5)) * amp; w.tower.rotation.x = Math.sin(t * 2.3) * amp * 0.5; }
  if (w.grow) { const s = Math.min(1, w.puddle.scale.x + dt * 0.6); w.puddle.scale.set(s, 1, s); if (s >= 1) w.grow = 0; }
  if (w.rain) { if (!w.drops) { w.drops = []; for (let i = 0; i < 60; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), new THREE.MeshBasicMaterial({ color: '#BFD8F0' })); w.world.add(d); w.drops.push(d); } }
    const c = w.tent.position; w.drops.forEach((d, i) => { d.visible = true; d.position.set(c.x + ((i * 37) % 60) / 10 - 3, 6 - ((t * 9 + i * 0.7) % 6), c.z + ((i * 53) % 60) / 10 - 3); }); }
  else if (w.drops) w.drops.forEach(d => { d.visible = false; });
  const f = w.fireParts && w.fireParts.flame; if (f && f.visible) { const k = w.flameK || 0.5; f.scale.set(k * (1 + Math.sin(t * 13) * 0.1), k * (1 + Math.sin(t * 17) * 0.15), k); }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
