/* Camp Kitchen (Nutrition HF 3, Fire & Camp Cooking OD 2): cook a three-course camp dinner against the clock.
   Wash your hands, fetch from the food box, chop on the log, cook on the fire (take the pot off before it burns),
   and serve each course at the table. The main course is a healthy plate as the Nutrition explorer teaches it:
   half vegetables, a quarter whole grains, a quarter protein (beans, peas or dhal), and water to drink. */
import { THREE, G, P, merge, MAT, sprite, SND } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
const ING = {
  pumpkin: { name: 'Pumpkin', icon: '🎃', chop: true, c: '#E8892B' }, onion: { name: 'Onion', icon: '🧅', chop: true, c: '#E9D7B5' },
  rice: { name: 'Brown rice', icon: '🍚', c: '#C9A46A' }, peas: { name: 'Split peas', icon: '🫛', c: '#E2C24A' }, water: { name: 'Water', icon: '💧', c: '#4A84B8' },
  cucumber: { name: 'Cucumber', icon: '🥒', chop: true, c: '#5A9A3A' }, tomato: { name: 'Tomato', icon: '🍅', chop: true, c: '#D3243A' },
  pineapple: { name: 'Pineapple', icon: '🍍', chop: true, c: '#E2B23A' }, banana: { name: 'Banana', icon: '🍌', chop: true, c: '#F2D16B' }, mango: { name: 'Mango', icon: '🥭', chop: true, c: '#F2A33A' },
};
const DISHES = [
  { id: 'soup', name: 'Pumpkin soup', icon: '🥣', course: 1, pot: 0, needs: ['pumpkin', 'onion', 'water'], cook: 16 },
  { id: 'rice', name: 'Brown rice', icon: '🍚', course: 2, pot: 1, needs: ['rice', 'water'], cook: 18 },
  { id: 'dhal', name: 'Dhal', icon: '🍲', course: 2, pot: 0, needs: ['peas', 'water'], cook: 16 },
  { id: 'salad', name: 'Cucumber and tomato salad', icon: '🥗', course: 2, needs: ['cucumber', 'tomato'] },
  { id: 'fruit', name: 'Fruit salad', icon: '🍍', course: 3, needs: ['pineapple', 'banana', 'mango'] },
];
const COURSES = { 1: 'Starter', 2: 'Main course', 3: 'Dessert' };
const LIMIT = 330, BURN = 25;   // seconds for the whole dinner, seconds a ready pot can wait before it burns
const POS = { wash: [-6, 4], box: [-6, -2], log: [-1.5, -4.5], water: [4.5, -4.5], fire: [5.5, 1], table: [0, 6] };

Object.assign(BUILD, {
  ktable: () => merge([P(G.box(3.2, 0.1, 1.2), '#C9A46A', [0, 0.85, 0]), ...[[-1.5, -0.5], [1.5, -0.5], [-1.5, 0.5], [1.5, 0.5]].map(([x, z]) => P(G.box(0.1, 0.85, 0.1), '#6E4424', [x, 0.42, z])), P(G.box(3.4, 0.06, 0.3), '#A8743F', [0, 0.45, 0.9]), P(G.box(3.4, 0.06, 0.3), '#A8743F', [0, 0.45, -0.9])]),
  foodbox: () => merge([P(G.box(1.4, 0.8, 0.9), '#2F6DB5', [0, 0.4, 0]), P(G.box(1.45, 0.12, 0.95), '#24548C', [0, 0.84, 0]), P(G.ico(0.16, 0), '#E8892B', [-0.4, 0.98, 0]), P(G.ico(0.12, 0), '#5A9A3A', [0.1, 0.96, 0.1]), P(G.ico(0.12, 0), '#D3243A', [0.4, 0.96, -0.1])]),
  choplog: () => merge([P(G.cyl(0.45, 0.5, 0.7, 10), '#8A5A2B', [0, 0.35, 0]), P(G.cyl(0.42, 0.42, 0.02, 10), '#D9B98A', [0, 0.71, 0]), P(G.box(0.35, 0.02, 0.07), '#9AA3AE', [0.1, 0.74, 0.1], [0, 0.6, 0])]),
  washstand: () => merge([P(G.box(0.08, 0.9, 0.08), '#6E4424', [0, 0.45, 0]), P(G.cyl(0.35, 0.25, 0.2, 10), '#9AA3AE', [0, 1.0, 0]), P(G.cyl(0.3, 0.3, 0.02, 10), '#4A84B8', [0, 1.08, 0]), P(G.box(0.18, 0.1, 0.12), '#F4F1EA', [0.25, 1.12, 0.2])]),
  kfire: () => { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * PI; p.push(P(G.dod(0.2), '#8A867E', [Math.cos(a) * 1.3, 0.1, Math.sin(a) * 0.75])); }
    p.push(P(G.box(0.08, 1.2, 0.08), '#5A5A5A', [-1.5, 0.6, 0]), P(G.box(0.08, 1.2, 0.08), '#5A5A5A', [1.5, 0.6, 0]), P(G.box(3.1, 0.06, 0.06), '#5A5A5A', [0, 1.2, 0])); return merge(p); },
  coals: () => merge([0, 1, 2, 3, 4, 5].map(i => P(G.dod(0.14), i % 2 ? '#C9481E' : '#3A2A22', [Math.cos(i) * 0.5 - 0.6 + (i % 3) * 0.6, 0.08, Math.sin(i * 2) * 0.3]))),
  kpot: () => merge([P(G.cyl(0.34, 0.28, 0.42, 12), '#2E2E33', [0, 0, 0]), P(G.tor(0.34, 0.03, 4, 12), '#47474F', [0, 0.21, 0], [PI / 2, 0, 0]), P(G.tor(0.12, 0.015, 4, 8, PI), '#47474F', [0, 0.36, 0])]),
  kbucket: () => merge([P(G.cyl(0.25, 0.2, 0.45, 10), '#8D9AA6', [0, 0.22, 0]), P(G.cyl(0.23, 0.23, 0.02, 10), '#4A84B8', [0, 0.4, 0])]),
  bowl: (c = '#F4F1EA') => merge([P(G.cyl(0.2, 0.12, 0.12, 10), '#F4F1EA', [0, 0.06, 0]), P(G.cyl(0.17, 0.17, 0.02, 10), c, [0, 0.11, 0])]),
  food: (c = '#E8892B') => merge([P(G.ico(0.14, 0), c, [0, 0.14, 0])]),
  chopped: (c = '#E8892B') => merge([0, 1, 2, 3].map(i => P(G.box(0.08, 0.08, 0.08), c, [Math.cos(i * 1.6) * 0.1, 0.06, Math.sin(i * 1.6) * 0.1]))),
});

export const KITCHEN = {
  key: 'kitchen', gid: 'camp:kitchen', title: 'Camp Kitchen', topic: 'nutrition', icon: '🍲', kind: 'walk', music: 'calm',
  blurb: 'Cook a three-course camp dinner against the clock: wash, fetch, chop, cook and serve. The main course is a healthy plate.',
  howTo: 'Tap a station to go to it. Carry one thing at a time. Take each pot off the fire when it’s ready, before it burns.',
  sky: { top: '#E59A5B', bottom: '#F6D7A6', fogNear: 40, fogFar: 110, sun: '#FFD7A0', sunI: 2.0, sunPos: [8, 6, -6], hemi: 1.45, skyLight: '#FFE4C4', groundLight: '#556B3A' },
  ground: '#6E9E4A', modes: { endless: ['🍲', 'Dinner for the class', 'Three courses in 5½ minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'rock_largeA', 'grass_large', 'tent_detailedOpen', 'tent_smallClosed', 'log_stack'],
  start: [0, 0, 9], startRy: PI, bounds: [-11, -9, 11, 12], intro: [6, 30, 18], questTitle: 'Dinner', coinIcon: '🍲', camK: 0.82, speed: 3.8,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    w.add(B('ktable'), POS.table[0], 0, POS.table[1]); w.box(POS.table[0] - 1.7, POS.table[1] - 0.7, POS.table[0] + 1.7, POS.table[1] + 0.7);
    w.add(B('foodbox'), POS.box[0], 0, POS.box[1], PI / 2); w.box(POS.box[0] - 0.5, POS.box[1] - 0.75, POS.box[0] + 0.5, POS.box[1] + 0.75);
    w.add(B('choplog'), POS.log[0], 0, POS.log[1]); w.circle(POS.log[0], POS.log[1], 0.5);
    w.add(B('washstand'), POS.wash[0], 0, POS.wash[1]); w.circle(POS.wash[0], POS.wash[1], 0.4);
    w.add(B('kbucket'), POS.water[0], 0, POS.water[1]); w.circle(POS.water[0], POS.water[1], 0.3);
    w.add(B('kfire'), POS.fire[0], 0, POS.fire[1], PI / 2); w.add(B('coals'), POS.fire[0], 0, POS.fire[1], PI / 2); w.box(POS.fire[0] - 0.9, POS.fire[1] - 1.6, POS.fire[0] + 0.9, POS.fire[1] + 1.6);
    w.pots = [0, 1].map(i => { const m = B('kpot'); w.add(m, POS.fire[0], 0.62, POS.fire[1] + (i ? 0.75 : -0.75)); return { m, dish: null, added: [], t: 0, state: 'empty' }; });
    w.flames = [0, 1].map(i => { const f = sprite(['🔥'], 0.7, 0.7, { bg: 'rgba(0,0,0,0)', fg: '#FF8A2A', w: 128, h: 128 }); w.add(f, POS.fire[0], 0.3, POS.fire[1] + (i ? 0.75 : -0.75)); return f; });
    w.kit('tent_detailedOpen', 2.2, -8, 9, 0.6, 1.2); w.kit('tent_smallClosed', 1.8, 8.5, 9.5, -0.4, 1.0); w.kit('log_stack', 1.2, 8.5, 2.5, 0.3, 0.6);
    const r = mulberry(3);
    for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 30, z = -12 + r() * 28; if (Math.abs(x) < 11 && z > -9 && z < 12) continue; const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'rock_largeA'][Math.floor(r() * 6)]; w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6); }
    progress(0.6);
    const cook = await w.npc('cook', { body: 'f', skin: 1, hair: 'buns' }, 'counsellor', -2.4, 8.6, PI * 0.8, 'Idle_Talking_Loop'); cook.anim = 'Idle_Talking_Loop';
    w.served = {}; w.onTable = {}; w.held = null; w.washed = false; w.course = 1;
    w.thing({ id: 'cook', x: -2.4, z: 8.6, npc: cook, icon: '💬', verb: 'Talk to Sister Mae', when: w => !w.isDone('brief'), use: brief });
    const T = (id, p, icon, verb, use, h = 1.3) => w.thing({ id, x: p[0], z: p[1], r: 1.8, h, icon, verb, when: w => w.isDone('brief') && !w.over, use });
    T('wash', POS.wash, '🧼', 'Wash your hands', wash);
    T('box', POS.box, '🧺', 'Take food from the box', takeFood);
    T('log', POS.log, '🔪', 'Chop on the log', chop);
    T('water', POS.water, '💧', 'Fill a cup of water', takeWater);
    w.thing({ id: 'pot0', x: POS.fire[0] - 1.0, z: POS.fire[1] - 0.75, r: 1.8, h: 1.2, icon: '🍲', verb: 'Pot 1', when: w => w.isDone('brief') && !w.over, use: w => pot(w, 0) });
    w.thing({ id: 'pot1', x: POS.fire[0] - 1.0, z: POS.fire[1] + 0.75, r: 1.8, h: 1.2, icon: '🍲', verb: 'Pot 2', when: w => w.isDone('brief') && !w.over, use: w => pot(w, 1) });
    T('table', POS.table, '🍽️', 'The serving table', table);
    w.hooks.push(tick);
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Sister Mae, the camp cook' }]); w.ui.banner('Camp kitchen', 'Dinner for the whole class.', 2600); },
};
const itemName = h => (h.chopped ? 'Chopped ' + ING[h.id].name.toLowerCase() : h.dish ? DISHES.find(d => d.id === h.dish).name : ING[h.id].name);
function carryItem(w, h) {
  const c = h.dish ? '#C9A46A' : ING[h.id].c, m = new THREE.Mesh(prop(h.dish ? 'bowl' : h.chopped ? 'chopped' : 'food', h.dish ? (DISHES.find(d => d.id === h.dish).id === 'soup' ? '#E8892B' : '#E2C24A') : c), MAT.flat);
  w.held = h; w.carry(h.dish || h.id, m, 0.95, 0.38); orders(w);
}
function emptyHands(w) { w.held = null; w.drop(); orders(w); }
async function brief(w) {
  const c = w.npcs.cook; w.faceEach(c);
  await w.say('Sister Mae', 'The class is hungry! Three courses: pumpkin soup, then the main plate, then fruit salad. You have five and a half minutes.', { icon: '👩🏾‍🍳' });
  await w.ask({ who: 'Sister Mae', icon: '👩🏾‍🍳', q: 'Before you touch any food, what do you do?', opts: ['Wash your hands with soap and water', 'Wipe them on your shirt', 'Nothing, the fire kills the germs'], right: 0, why: 'Clean hands keep germs out of the food.' });
  await w.ask({ who: 'Sister Mae', icon: '👩🏾‍🍳', q: 'The main course is a healthy plate. What fills half of it?', opts: ['Fruits and vegetables', 'Rice', 'Dhal'], right: 0, why: 'Half fruits and vegetables, a quarter whole grains (our brown rice), a quarter protein (our dhal).' });
  await w.say('Sister Mae', 'Carry one thing at a time. Things to cut go to the chopping log first. When a pot is ready, take it off before it burns. Go!', { icon: '👩🏾‍🍳', next: 'Start cooking ▶' });
  w.done('brief', 50); DISHES.forEach(d => w.addQuest({ id: d.id, text: d.icon + ' ' + d.name + ' (' + COURSES[d.course].toLowerCase() + ')' }));
  w.startT = w.t; panel(w); orders(w);
}
async function wash(w) { if (w.washed) { w.ui.toast('Your hands are clean', 'good'); return; } await w.anim('Interact', 900); w.washed = true; SND.good(); w.points += 50; w.ui.toast('🧼 Clean hands', 'good'); orders(w); }
function needed(w) { const out = []; DISHES.forEach(d => { if (w.served[d.id] || w.onTable[d.id] === 'done') return; const p = d.pot != null ? w.pots[d.pot] : null; if (p && p.dish === d.id && p.state !== 'filling') return; const have = d.pot != null ? (p && p.dish === d.id ? p.added : []) : (w.onTable[d.id] || []); d.needs.forEach(n => { if (n !== 'water' && !have.includes(n) && !out.includes(n)) out.push(n); }); }); return out; }
async function takeFood(w) {
  if (!w.washed) { SND.bad(); w.wrong++; w.learn.push(['Before touching food', 'Wash your hands with soap']); await w.say('Sister Mae', 'Hands first! Wash them at the wash stand before you touch the food.', { icon: '👩🏾‍🍳' }); return; }
  if (w.held) { w.ui.toast('Your hands are full: ' + itemName(w.held), 'bad'); return; }
  const list = needed(w); if (!list.length) { w.ui.toast('Nothing more needed from the box', 'good'); return; }
  const c = await w.choose({ who: 'The food box', icon: '🧺', tag: '🧺 Take one thing', q: 'What do you need next?', opts: list.map(n => ING[n].icon + ' ' + ING[n].name) });
  carryItem(w, { id: list[c] });
}
async function takeWater(w) { if (w.held) { w.ui.toast('Your hands are full: ' + itemName(w.held), 'bad'); return; } await w.anim('Interact', 500); carryItem(w, { id: 'water' }); }
async function chop(w) {
  const h = w.held; if (!h || h.dish || !ING[h.id].chop || h.chopped) { w.ui.toast(h ? 'That doesn’t need chopping' : 'Bring something to chop', 'bad'); return; }
  await w.timing({ label: 'Chop the ' + ING[h.id].name.toLowerCase(), steps: 3, speed: 1.3, zone: 0.3, verb: 'Chop', step: async () => { SND.pop(); await w.anim('Interact', 280); }, miss: async () => { w.ui.toast('Careful with the knife!', 'bad'); await new Promise(r => setTimeout(r, 300)); } });
  h.chopped = true; carryItem(w, h);
}
async function pot(w, i) {
  const P_ = w.pots[i], h = w.held;
  if (P_.state === 'ready' || P_.state === 'burnt') {
    if (h) { w.ui.toast('Free your hands first', 'bad'); return; }
    const d = DISHES.find(x => x.id === P_.dish); const burnt = P_.state === 'burnt';
    P_.state = 'empty'; P_.dish = null; P_.added = []; P_.t = 0;
    if (burnt) { SND.bad(); w.wrong++; w.learn.push(['A pot burnt', 'Take it off the fire as soon as it’s ready']); w.ui.toast('Burnt! Start the ' + d.name.toLowerCase() + ' again', 'bad'); orders(w); return; }
    SND.coin(); carryItem(w, { dish: d.id }); return;
  }
  if (P_.state === 'cooking') { w.ui.toast(DISHES.find(x => x.id === P_.dish).name + ' is cooking…', 'good'); return; }
  if (!h || h.dish) { w.ui.toast(P_.dish ? 'Bring what the ' + DISHES.find(x => x.id === P_.dish).name.toLowerCase() + ' needs' : 'Bring something to cook', 'bad'); return; }
  const want = DISHES.filter(d => d.pot === i && !w.served[d.id] && w.onTable[d.id] !== 'done' && (!P_.dish || P_.dish === d.id));
  const d = want.find(x => x.needs.includes(h.id) && !P_.added.includes(h.id));
  if (!d) { w.ui.toast(ING[h.id].name + ' doesn’t go in pot ' + (i + 1) + ' now', 'bad'); return; }
  if (ING[h.id].chop && !h.chopped) { w.ui.toast('Chop it first, on the log', 'bad'); return; }
  P_.dish = d.id; P_.state = 'filling'; P_.added.push(h.id); emptyHands(w); SND.pop();
  if (d.needs.every(n => P_.added.includes(n))) { P_.state = 'cooking'; P_.t = 0; w.ui.toast('🔥 ' + d.name + ' is cooking', 'good'); }
  orders(w);
}
async function table(w) {
  const h = w.held; if (!h) { w.ui.toast('Bring food to the table', 'bad'); return; }
  if (h.dish) { const d = DISHES.find(x => x.id === h.dish); w.onTable[d.id] = 'done'; emptyHands(w); SND.coin(); await serve(w); return; }
  const d = DISHES.find(x => x.pot == null && x.needs.includes(h.id) && w.onTable[x.id] !== 'done' && !(w.onTable[x.id] || []).includes(h.id));
  if (!d) { w.ui.toast(ING[h.id].name + ' goes in a pot', 'bad'); return; }
  if (!h.chopped) { w.ui.toast('Chop it first, on the log', 'bad'); return; }
  const got = w.onTable[d.id] = (w.onTable[d.id] || []).concat(h.id); emptyHands(w); SND.pop();
  if (d.needs.every(n => got.includes(n))) w.onTable[d.id] = 'done';
  await serve(w);
}
/* when every dish of the next course is on the table, it is served */
async function serve(w) {
  orders(w);
  for (;;) {
    const c = w.course, ds = DISHES.filter(d => d.course === c);
    if (c > 3 || !ds.every(d => w.onTable[d.id] === 'done')) break;
    ds.forEach(d => { w.served[d.id] = true; w.done(d.id, 150); }); SND.power();
    w.ui.banner(COURSES[c] + ' served!', c === 2 ? 'Half vegetables, a quarter rice, a quarter dhal.' : c === 1 ? 'Now the main course.' : 'Dinner is done!', 2400);
    w.course++; orders(w);
  }
  if (w.course > 3) await end(w);
}
async function end(w) {
  w.over = true; const secs = Math.round(w.t - w.startT);
  await w.ask({ who: 'Sister Mae', icon: '👩🏾‍🍳', q: 'What is the best drink with dinner?', opts: ['Water', 'Soda', 'An energy drink'], right: 0, why: 'Water: no added sugar.' });
  await w.say('Sister Mae', 'Dinner for the whole class in ' + Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2) + '! Now everyone helps wash up, and the fire is put out cold.', { icon: '👩🏾‍🍳', next: 'Finish ▶' });
  w.finish({ title: secs <= LIMIT ? 'Dinner served on time!' : 'Dinner served!', stats: [[Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2), 'cooking time']] });
}
/* the panel with the courses, the pots and the clock */
function panel(w) { const e = w.el('h-kit', 'panel'); e.hidden = false; }
function orders(w) {
  const e = document.getElementById('h-kit'); if (!e || e.hidden) return;
  const left = Math.max(0, LIMIT - Math.round(w.t - (w.startT || 0)));
  const pots = w.pots.map((p, i) => { const d = p.dish && DISHES.find(x => x.id === p.dish); return '<span class="kp ' + p.state + '">Pot ' + (i + 1) + ': ' + (d ? d.icon + ' ' + d.name + (p.state === 'filling' ? ' (' + p.added.length + '/' + d.needs.length + ')' : p.state === 'cooking' ? ' ' + Math.max(0, Math.ceil(d.cook - p.t)) + 's' : p.state === 'ready' ? ' ✅ take it off!' : p.state === 'burnt' ? ' 🔥 burnt' : '') : 'empty') + '</span>'; }).join('');
  e.innerHTML = '<b>⏱ ' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2) + ' · ' + (COURSES[w.course] || 'Done') + '</b>' + pots + '<span class="kh">' + (w.held ? '✋ ' + itemName(w.held) : w.washed ? '✋ Empty hands' : '🧼 Wash your hands first') + '</span>';
}
function tick(w, dt) {
  if (!w.isDone('brief') || w.over) return;
  w.pots.forEach((p, i) => {
    w.flames[i].visible = p.state === 'cooking' || p.state === 'ready' || p.state === 'burnt'; w.flames[i].scale.setScalar(0.7 + Math.sin(w.eng.time * 12 + i) * 0.08);
    if (p.state === 'cooking') { p.t += dt; const d = DISHES.find(x => x.id === p.dish); if (p.t >= d.cook) { p.state = 'ready'; p.t = 0; SND.lane(); w.ui.toast('✅ ' + d.name + ' is ready! Take it off', 'good'); } }
    else if (p.state === 'ready') { p.t += dt; if (p.t > BURN) { p.state = 'burnt'; SND.bad(); w.ui.toast('🔥 Pot ' + (i + 1) + ' is burning!', 'bad'); } }
    p.m.position.y = 0.62 + (p.state === 'cooking' || p.state === 'ready' ? Math.abs(Math.sin(w.eng.time * 9 + i)) * 0.015 : 0);
  });
  const e = document.getElementById('h-kit'), cd = document.getElementById('h-card'); if (e) e.style.visibility = cd && !cd.hidden ? 'hidden' : '';
  w.kt = (w.kt || 0) + dt; if (w.kt > 0.5) { w.kt = 0; orders(w); }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
