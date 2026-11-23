/* Trail Hike (Pack Camp, OD 1): pack your backpack, then hike to camp over a stream, a log bridge and a rock step.
   What you packed matters on the way: rain, a scraped knee, thirst, a fork in the trail, nightfall and mosquitoes.
   The packing rules follow the Pack Camp explorer (heavy things in the middle, close to your back; a full pack about a
   fifth of your body weight at most; a mosquito net in Guyana's interior; boil, filter or treat stream water). */
import { THREE, G, P, merge, MAT, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { DATA } from './data.js';

const PI = Math.PI;
Object.assign(BUILD, {
  hstream: () => merge([P(G.box(90, 0.05, 3.2), '#3E7FB0', [0, 0.0, 0]), P(G.box(90, 0.12, 0.4), '#9C8A6A', [0, 0.02, -1.8]), P(G.box(90, 0.12, 0.4), '#9C8A6A', [0, 0.02, 1.8])]),
  ravine: () => merge([P(G.box(90, 0.05, 5.0), '#2E2A24', [0, 0.0, 0]), P(G.box(90, 0.3, 0.5), '#6B5B45', [0, 0.1, -2.7]), P(G.box(90, 0.3, 0.5), '#6B5B45', [0, 0.1, 2.7])]),
  rockstep: () => merge([P(G.box(90, 2.2, 3.0), '#8C857A', [0, 1.1, 0]), P(G.box(90, 0.2, 3.0), '#6E9E4A', [0, 2.25, 0])]),
  htrail: (len) => merge([P(G.box(2.2, 0.03, len), '#BFA77A', [0, 0.015, 0])]),
  packtable: () => merge([P(G.box(2.4, 0.08, 1.0), '#C9A46A', [0, 0.8, 0]), ...[[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]].map(([x, z]) => P(G.box(0.08, 0.8, 0.08), '#6E4424', [x, 0.4, z])),
    P(G.box(0.5, 0.7, 0.35), '#2F6DB5', [-0.6, 1.2, 0]), P(G.box(0.3, 0.2, 0.2), '#D3243A', [0.3, 0.94, 0.1]), P(G.cyl(0.08, 0.08, 0.3, 8), '#9AA3AE', [0.8, 0.99, -0.1])]),
  signpost: () => merge([P(G.box(0.12, 2.0, 0.12), '#6E4424', [0, 1.0, 0]), P(G.box(1.1, 0.25, 0.05), '#C9A46A', [0.45, 1.75, 0], [0, 0, 0.12]), P(G.box(1.1, 0.25, 0.05), '#C9A46A', [-0.45, 1.45, 0], [0, 0, -0.12])]),
  campfire2: () => merge([P(G.cyl(0.7, 0.75, 0.12, 10), '#6B6B6B', [0, 0.06, 0]), ...[0, 1, 2, 3].map(i => P(G.cyl(0.07, 0.07, 1.0, 6), '#6E4424', [0, 0.25, 0], [0.5, i * PI / 2, 0]))]),
});

/* what you can pack (weights in kg, rounded) */
const ITEMS = [
  { id: 'rain', name: 'Rain jacket', icon: '🧥', kg: 0.4, need: true },
  { id: 'aid', name: 'First-aid kit', icon: '🩹', kg: 0.3, need: true },
  { id: 'water', name: 'Water bottles (2 L)', icon: '💧', kg: 2.1, need: true },
  { id: 'torch', name: 'Torch (flashlight)', icon: '🔦', kg: 0.2, need: true },
  { id: 'net', name: 'Mosquito net', icon: '🕸️', kg: 0.3, need: true },
  { id: 'map', name: 'Map and compass', icon: '🧭', kg: 0.15, need: true },
  { id: 'whistle', name: 'Whistle', icon: '📣', kg: 0.05, need: true },
  { id: 'snack', name: 'Trail snacks', icon: '🥜', kg: 0.5, need: true },
  { id: 'console', name: 'Video game console', icon: '🎮', kg: 4.5 },
  { id: 'speaker', name: 'Big speaker', icon: '🔊', kg: 2.5 },
  { id: 'pot', name: 'Cast-iron pot', icon: '🍲', kg: 3.5 },
  { id: 'jar', name: 'Glass jar of peanut butter', icon: '🫙', kg: 0.8 },
  { id: 'dryer', name: 'Hair dryer', icon: '💨', kg: 0.6 },
];
const BASE = 6;   // sleeping bag, clothes, food and your share of the tent, already in the pack
const LIMIT = 11;   // about a fifth of a 55 kg Guide
const TRAIL = { start: [0, 44], camp: [0, -42] };

export const HIKE = {
  key: 'hike', gid: 'hike:obstacle', title: 'Trail Hike', topic: 'packcamp', icon: '🎒', kind: 'walk', music: 'calm',
  blurb: 'Pack your backpack, then hike to camp over a stream, a log bridge and a rock step. What you packed matters on the way.',
  howTo: 'Pick what goes in your pack, then tap where to go, or hold and drag to walk. On an obstacle, tap when the marker is in the green.',
  sky: { top: '#5E9BD6', bottom: '#F2E2B8', fogNear: 45, fogFar: 120, sun: '#FFE8C0', sunI: 2.3, sunPos: [-6, 12, -4], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#6E9E4A', modes: { endless: ['🎒', 'The trail', 'Pack, hike, make camp. About 8 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_palmTall', 'tree_pineRoundC', 'tree_detailed', 'plant_bushLarge', 'plant_bush', 'rock_largeA', 'rock_smallA', 'grass_large', 'flower_redA', 'flower_yellowA', 'stump_round', 'log', 'tent_detailedOpen', 'tent_smallClosed', 'campfire_stones', 'campfire_logs'],
  start: [0, 0, 42], startRy: PI, bounds: [-14, -48, 14, 47], intro: [8, 40, 24], questTitle: 'The hike', coinIcon: '🎒', camK: 0.95,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    // the trail, the stream (z 28), the ravine with its log bridge (z 2), the rock step (z -22), camp (z -42)
    [[0, 36, 14], [0, 15, 18], [-1.5, -10, 16], [0, -32, 12]].forEach(([x, z, len]) => w.add(B('htrail', len), x, 0, z));
    w.add(B('hstream'), 0, 0, 28); w.box(-50, 26.2, 50, 29.8); w.add(B('stonepath'), 0, 0, 28);
    w.add(B('ravine'), 0, 0, 2); w.box(-50, -0.8, 50, 4.8); w.add(B('beam'), 0, 0, 2);
    w.add(B('rockstep'), 0, 0, -22); w.box(-50, -23.6, 50, -20.4); w.add(B('cwall'), 0, 0, -20.5, PI);
    w.add(B('packtable'), 2.6, 0, 41); w.box(1.4, 40.4, 3.8, 41.6);
    w.add(B('signpost'), 0.4, 0, -6.5); w.circle(0.4, -6.5, 0.2);
    // camp
    w.kit('tent_detailedOpen', 2.2, -4, -42, 0.4, 1.2); w.kit('tent_smallClosed', 1.8, 4.2, -43, -0.3, 1.0); w.add(B('campfire2'), 0, 0, -38.5); w.circle(0, -38.5, 0.8);
    progress(0.35);
    const r = mulberry(5);
    for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 30, z = -47 + r() * 94; if (Math.abs(x) < 3.2 || (z > 25 && z < 31) || (z > -1.5 && z < 5.5) || (z > -25 && z < -19) || (z < -34 && Math.abs(x) < 9)) continue;
      const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_palmTall', 'tree_pineRoundC', 'tree_detailed', 'plant_bushLarge', 'plant_bush', 'rock_largeA'][Math.floor(r() * 9)];
      const t = w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6, k.startsWith('tree') ? 0.35 : 0.5); if (t && k.startsWith('tree') && Math.abs(x) < 9) w.fadeable(t); }
    for (let i = 0; i < 60; i++) w.kit(['grass_large', 'flower_redA', 'flower_yellowA', 'rock_smallA', 'stump_round'][i % 5], 0.5, (r() - 0.5) * 26, -46 + r() * 90, r() * 6);
    progress(0.65);
    const ann = await w.npc('ann', { body: 'f', skin: 2, hair: 'long' }, 'counsellor', -2.2, 40.2, PI * 0.7, 'Idle_Talking_Loop'); ann.anim = 'Idle_Talking_Loop';
    w.thing({ id: 'ann', x: -2.2, z: 40.2, npc: ann, icon: '🎒', verb: 'Pack with Counsellor Ann', when: w => !w.isDone('pack'), use: pack });
    w.thing({ id: 'stream', x: 0, z: 31.6, r: 2.2, stand: [0, 31.6], icon: '🪨', verb: 'Cross the stepping stones', when: w => w.isDone('pack') && !w.isDone('stream'), use: stream });
    w.thing({ id: 'log', x: 0, z: 5.6, r: 2.2, stand: [0, 5.6], icon: '🪵', verb: 'Cross the log bridge', when: w => w.isDone('stream') && !w.isDone('log'), use: logBridge });
    w.thing({ id: 'climb', x: 0, z: -19.2, r: 2.2, stand: [0, -19.2], icon: '🧗', verb: 'Climb the rock step', when: w => w.isDone('log') && !w.isDone('climb'), use: climb });
    w.thing({ id: 'camp', x: 0, z: -37, r: 2.6, icon: '⛺', verb: 'Make camp', when: w => w.isDone('climb') && !w.isDone('camp'), use: camp });
    w.packed = {}; w.events = {}; w.hooks.push(trailEvents);
  },
  begin(w) { w.setQuests([{ id: 'pack', text: 'Pack your backpack with Counsellor Ann' }]); w.ui.banner('Trailhead', 'Pack well. The trail will test it.', 2600); },
};

function kg(w) { return BASE + ITEMS.filter(i => w.packed[i.id]).reduce((s, i) => s + i.kg, 0); }
function has(w, id) { return !!w.packed[id]; }
async function pack(w) {
  const ann = w.npcs.ann; w.faceEach(ann);
  await w.say('Counsellor Ann', 'Your sleeping bag, clothes, food and your share of the tent are already in (about ' + BASE + ' kg). Now pick what else goes in. Pack what the trail needs, and nothing it doesn’t.', { icon: '🎒' });
  w.ui.closeCard(); w.busy = true;
  await new Promise(res => {
    const el = w.el('h-pack', 'panel'); el.hidden = false;
    const draw = () => { const k = kg(w), over = k > LIMIT;
      el.innerHTML = '<b>🎒 Pack your backpack</b><div class="pk-bar' + (over ? ' over' : '') + '"><i style="width:' + Math.min(100, k / 14 * 100).toFixed(0) + '%"></i><s style="left:' + (LIMIT / 14 * 100).toFixed(0) + '%"></s></div><small>' + k.toFixed(1) + ' kg' + (over ? ' · too heavy! Limit about ' + LIMIT + ' kg' : ' · limit about ' + LIMIT + ' kg (a fifth of your body weight)') + '</small>'
        + '<div class="pk-grid">' + ITEMS.map(i => '<button data-pk="' + i.id + '" aria-pressed="' + has(w, i.id) + '"><span>' + i.icon + '</span>' + i.name + '<small>' + i.kg + ' kg</small></button>').join('') + '</div><button class="pk-go">Done packing ▶</button>';
      el.querySelectorAll('[data-pk]').forEach(b => { b.onclick = e => { e.stopPropagation(); const id = b.dataset.pk; w.packed[id] = !w.packed[id]; SND.lane(); draw(); }; });
      el.querySelector('.pk-go').onclick = e => { e.stopPropagation(); el.hidden = true; res(); }; };
    draw();
  });
  const extra = ITEMS.filter(i => !i.need && has(w, i.id)), k = kg(w);
  if (extra.length) await w.say('Counsellor Ann', 'Hmm, ' + extra.map(i => i.name.toLowerCase()).join(', ') + '? That’s ' + extra.reduce((s, i) => s + i.kg, 0).toFixed(1) + ' kg you’ll carry all day for nothing. ' + (k > LIMIT ? 'Your pack is over the limit, so you’ll be slower.' : 'Leave it at home next time.'), { icon: '🎒' });
  else await w.say('Counsellor Ann', 'Nice and light: ' + k.toFixed(1) + ' kg. No extra weight.', { icon: '🎒' });
  const q = ((DATA.ALL && DATA.ALL.packcamp) || [])[0];
  if (q) await w.ask({ who: 'Counsellor Ann', icon: '🎒', q: q[0], opts: q[1], right: q[2] });
  w.slowPack = k > LIMIT ? 0.72 : 1;
  w.done('pack', 100 - extra.length * 30); ['stream', 'log', 'climb', 'camp'].forEach((id, i) => w.addQuest({ id, text: ['Cross the stream on the stepping stones', 'Cross the ravine on the log bridge', 'Climb the rock step', 'Make camp before dark'][i] }));
  w.ui.banner('On the trail', 'Follow the path north.', 2200);
}
const wob = async w => { await w.anim('Hit_Knockback', 700); w.ui.toast('Wobble! Try again', 'bad'); };
async function stream(w) {
  await w.tween([0, 0, 31.2], 0.4, 'Walk_Loop');
  const misses = await w.timing({ label: 'Stepping stones: jump on the green', steps: 5, speed: 1.0, verb: 'Jump', step: i => w.tween([i % 2 ? 0.35 : -0.35, 0.2, 30 - i * 1.0 - 0.5], 0.45, 'Jump_Loop', 0.5), miss: async () => { await w.anim('Hit_Knockback', 700); w.ui.toast('Splash! Wet feet. Try again', 'bad'); } });
  await w.tween([0, 0, 24.6], 0.5, 'Walk_Loop'); w.done('stream', Math.max(60, 150 - misses * 30));
}
async function logBridge(w) {
  await w.tween([0, 0, 5.2], 0.3, 'Walk_Loop');
  const misses = await w.timing({ label: 'Log bridge: step when it’s green', steps: 4, speed: 0.9, verb: 'Step', step: i => w.tween([0, 0.88, 4.6 - (i + 1) * 1.05], 0.55, 'Walk_Loop', 0.08), miss: wob });
  await w.tween([0, 0, -1.6], 0.5, 'Walk_Loop'); w.done('log', Math.max(60, 150 - misses * 30));
}
async function climb(w) {
  const misses = await w.timing({ label: 'Rock step: grab the hold', steps: 3, speed: 1.0, verb: 'Climb', step: i => w.tween([0, (i + 1) * 0.75, -19.6 - i * 0.2], 0.9, 'ClimbUp_1m', 0, { face: false, once: true }), miss: wob });
  await w.tween([0, 2.3, -21.6], 0.5, 'Walk_Loop'); await w.tween([0, 0, -24.6], 0.6, 'Jump_Loop', 0.3); w.done('climb', Math.max(60, 150 - misses * 30));
}
/* things that happen on the way: the pack decides how it goes */
async function event(w, o) {
  w.busy = true; w.target = null; w.path = null; w.pending = null; w.pc.play('Idle_Loop', { fade: 0.2 });
  const ok = has(w, o.item), it = ITEMS.find(i => i.id === o.item);
  if (ok) { w.points += 100; SND.good(); w.right++; await w.say(o.title, o.good, { icon: it.icon, tag: '🎒 Good thing you packed it' }); }
  else { SND.bad(); w.wrong++; w.t += 30; w.learn.push([o.title, 'Pack the ' + it.name.toLowerCase()]); await w.say(o.title, o.bad + ' (+30 seconds)', { icon: '😬', tag: '🎒 Not in your pack: ' + it.name.toLowerCase() }); }
  if (o.q) { const q = ((DATA.ALL && DATA.ALL.packcamp) || [])[o.q]; if (q) await w.ask({ who: 'Counsellor Ann', icon: '🎒', q: q[0], opts: q[1], right: q[2] }); }
  w.ui.closeCard(); w.busy = false; w.drawQuests();
}
const EVENTS = [
  { z: 16, item: 'rain', title: 'A tropical downpour!', good: 'On goes your rain jacket. You stay dry and warm, and keep walking.', bad: 'You’re soaked through and shivering. You stop to wring out your clothes.' },
  { z: 9, item: 'snack', title: 'Snack break', good: 'A handful of peanuts and raisins: energy for the next climb.', bad: 'Your stomach growls and your legs feel heavy. You share a friend’s snack.' },
  { z: -6, item: 'map', title: 'A fork in the trail, and the sign is broken', good: 'You turn your map to north and check the compass: camp is to the north. You take the right path.', bad: 'You guess, go the wrong way, and have to walk back.' },
  { z: -12, item: 'aid', title: 'You slip and scrape your knee', good: 'Clean it, a plaster from your first-aid kit, and you’re on your way.', bad: 'No first-aid kit. You wait for a counsellor to bring one.' },
  { z: -16, item: 'whistle', title: 'You lose sight of the group in the bush', good: 'Stay where you are, and blow your whistle: three blasts. They find you in a minute.', bad: 'You shout until your voice is gone, and it takes a long time to find you.', q: 2 },
  { z: -28, item: 'water', title: 'Hot and thirsty', good: 'A long drink from your bottle.', bad: 'Your bottle isn’t there. The stream water must be boiled, filtered or treated first.', q: 3 },
  { z: -33, item: 'torch', title: 'The sun is going down', good: 'Torch on. You see the roots on the path.', bad: 'It’s getting dark and you trip over roots. A friend lends you light.' },
];
function trailEvents(w, dt) {
  w.slow = w.slowPack || 1;
  if (w.busy || w.state !== 'play' || !w.isDone('pack')) return;
  const z = w.pc.root.position.z;
  for (const e of EVENTS) if (!w.events[e.z] && z < e.z) { w.events[e.z] = true; event(w, e); break; }
}
async function camp(w) {
  await event(w, { item: 'net', title: 'Camp in the interior: mosquitoes!', good: 'You hang your mosquito net over your sleeping bag. A good night’s sleep.', bad: 'No net. You get bitten all night, and mosquitoes can carry dengue and malaria.', q: 4 });
  const q = ((DATA.ALL && DATA.ALL.packcamp) || [])[5]; if (q) await w.ask({ who: 'Counsellor Ann', icon: '⛺', q: q[0], opts: q[1], right: q[2] });
  w.done('camp', 200);
  const missed = ITEMS.filter(i => i.need && !has(w, i.id)), extra = ITEMS.filter(i => !i.need && has(w, i.id));
  w.finish({ title: 'You made camp!', stats: [[kg(w).toFixed(1) + ' kg', 'pack weight']], list: missed.length || extra.length ? ['Next time', missed.map(i => [i.icon + ' ' + i.name, 'Pack it']).concat(extra.map(i => [i.icon + ' ' + i.name, 'Leave it at home']))] : ['Your pack', [['🎒 Everything you needed', 'and nothing you didn’t']]] });
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
