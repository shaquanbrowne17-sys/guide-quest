/* The three runs: what you dodge, what you collect, the questions, and the scenery. Facts are short, accurate and sourced. */
import { THREE, G, P, merge, mesh, MAT, sign, sprite, pick, shuffle } from './core.js';
import { prop } from './props.js';
import { kit, kitScene } from './kit.js';
import { DATA } from './data.js';

/* Things young people are pressured with. kind: block = change lanes, low = jump, high = slide. */
export const PRESSURES = {
  vape: { prop: 'vape', kind: 'block', label: '💨 Vape', fact: 'Most vapes contain nicotine. It is very addictive and can harm a teenager’s growing brain. (CDC)' },
  cigarette: { prop: 'cigarette', kind: 'low', label: '🚬 Cigarettes', fact: 'Cigarette smoke has more than 7,000 chemicals, and at least 69 of them can cause cancer. (CDC)' },
  alcohol: { prop: 'bottle', kind: 'block', label: '🍺 Alcohol', fact: 'Alcohol slows the brain: judgement, balance and reactions all get worse. “Wine is a mocker, strong drink is raging.” (Proverbs 20:1)' },
  weed: { prop: 'weed', kind: 'high', label: '🌿 Weed', fact: 'Using marijuana as a teenager can harm memory, attention and learning. (CDC)' },
  hookah: { prop: 'hookah', kind: 'block', label: '🫧 Hookah', fact: 'The water in a hookah does not make the smoke safe. One session can mean far more smoke than one cigarette. (CDC)' },
  energy: { prop: 'cans', kind: 'low', label: '⚡ Energy drinks', fact: 'Energy drinks are loaded with caffeine and sugar. Children’s doctors say teens should not drink them. (American Academy of Pediatrics)' },
  lean: { prop: 'lean', kind: 'block', label: '🥤 “Lean”', fact: '“Lean” is cough syrup with codeine, an opioid. It can slow or stop your breathing.' },
  pills: { prop: 'pills', kind: 'low', label: '💊 Pills', fact: 'Never take pills that were not prescribed for you. Fake pills can contain deadly drugs. (DEA)' },
  betting: { prop: 'phone', kind: 'block', label: '🎰 Betting app', screen: ['🎰', '7  7  7', 'BET NOW'], fact: 'Betting apps are built so the house wins in the long run, and they are designed to keep you playing.' },
  pic: { prop: 'bubble', kind: 'high', label: '📸 “Send me a pic”', board: ['send me a pic 😏'], fact: 'Never send private pictures. Once sent, you can’t take them back. Tell a trusted adult.' },
  scroll: { prop: 'scroll', kind: 'high', label: '🌙 3 a.m. scrolling', board: ['🌙 3:07 AM', 'just one more video…'], fact: 'Teenagers need 8 to 10 hours of sleep. Screens late at night make it harder to fall asleep. (AASM)' },
  junk: { prop: 'junk', kind: 'low', label: '🍟 Junk food & soda', fact: 'A can of regular soda has about 9 teaspoons of sugar.' },
  skip: { prop: 'banner', kind: 'high', label: '😏 “Skip class!”', board: ['Skip class? 😏', 'I dare you'], fact: '“My son, if sinners entice thee, consent thou not.” (Proverbs 1:10) Real friends want you to win.' },
  video: { prop: 'screen', kind: 'block', label: '📺 Violent video', screen: ['💥', 'WATCH', '18+'], fact: '“I will set no wicked thing before mine eyes.” (Psalm 101:3) What you watch shapes what you think.' },
  music: { prop: 'speaker', kind: 'block', label: '🎧 Dirty lyrics', fact: 'Choose music that builds you up. “Whatsoever things are pure… think on these things.” (Philippians 4:8)' },
  gossip: { prop: 'bubble', kind: 'high', label: '🗣️ Gossip', board: ['Did you hear about…'], fact: '“A talebearer revealeth secrets.” (Proverbs 11:13) Change the subject instead.' },
  party: { prop: 'banner', kind: 'high', label: '🎉 Wild party', board: ['PARTY 🍾', 'no parents!'], fact: 'Choose places you’d be happy for Jesus to go with you.' },
  swear: { prop: 'bubble', kind: 'high', label: '🤬 Swearing', board: ['#@!%&*'], fact: '“Let no corrupt communication proceed out of your mouth.” (Ephesians 4:29)' },
  log: { prop: 'log', kind: 'low', label: null },
  branch: { prop: 'branch', kind: 'high', label: null },
  rock: { prop: 'rock', kind: 'block', label: null },
};
const FLAGS_GREEN = ['Respects your “no”', 'Encourages your walk with God', 'Is kind to your family', 'Keeps their promises', 'Is honest with you', 'Supports your goals', 'Is happy when you see your friends', 'Says sorry when they are wrong'];
const FLAGS_RED = ['Pressures you to keep secrets from your parents', 'Asks you for private pictures', 'Gets angry when you say no', 'Checks your phone without asking', 'Wants you to skip school or church for them', 'Puts you down in front of others', 'Says “If you loved me, you would…”', 'Tries to cut you off from your friends'];

/* a question from the Learning Lab bank: the right answer and two others */
function mc(q, r) {
  const right = q[1][q[2]], others = shuffle(r, q[1].filter((_, i) => i !== q[2])).slice(0, 2);
  const opts = shuffle(r, [right, ...others]).map(t => ({ text: t, ok: t === right }));
  return { text: q[0], opts, why: q[3] || '' };
}
export const THEMES = {
  seawall: {
    key: 'seawall', gid: 'run:seawall', title: 'Seawall Fun Run', topic: 'fitness', icon: '🌊', music: 'run',
    blurb: 'Run the Georgetown seawall at sunrise. Grab water and fruit, and dodge what young people get pushed into.',
    sky: { top: '#5E9BD6', bottom: '#F5D6A6', fogNear: 45, fogFar: 125, sun: '#FFE6B8', sunI: 2.3, sunPos: [-10, 9, 4], hemi: 1.5, skyLight: '#CFE3FF', groundLight: '#8A7A5A' },
    kit: ['tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'tree_palmShort', 'plant_bushLarge', 'plant_bush', 'rock_largeA', 'rock_largeC', 'log', 'flower_redA', 'flower_yellowA', 'grass_large', 'car_sedan', 'car_taxi', 'car_van', 'car_truck', 'car_police'],
    obstacles: ['vape', 'cigarette', 'alcohol', 'weed', 'hookah', 'energy', 'lean', 'pills', 'junk', 'scroll'],
    pickups: [['water', '💧 Water: drink plenty in the heat'], ['mango', '🥭 Fruit: real energy, no crash']],
    gates(r) { return shuffle(r, [...DATA.Q.fitness, ...DATA.Q.nutrition]).map(q => mc(q, r)); },
  },
  choices: {
    key: 'choices', gid: 'run:choices', title: 'Choices Run', topic: 'choices', icon: '🚩', music: 'run',
    blurb: 'Race through town and say no: dodge “send me a pic”, “skip class”, betting apps, vapes and more.',
    sky: { top: '#4F95DA', bottom: '#CDE6F5', fogNear: 45, fogFar: 125, sun: '#FFF4DE', sunI: 2.2, sunPos: [8, 12, 6], hemi: 1.6, skyLight: '#DDEBFF', groundLight: '#7E7A70' },
    kit: ['tree_default', 'tree_oak', 'tree_fat', 'plant_bushLarge', 'flower_redA', 'flower_purpleA', 'car_sedan', 'car_taxi', 'car_van', 'car_police', 'car_delivery', 'car_suv', 'car_cone'],
    obstacles: ['pic', 'skip', 'betting', 'scroll', 'alcohol', 'vape', 'weed', 'pills', 'energy'],
    pickups: [['shieldmini', null]],
    gates(r) {
      const flags = shuffle(r, [...FLAGS_GREEN.map(t => [t, true]), ...FLAGS_RED.map(t => [t, false])]).map(([t, green]) => {
        const g = { text: '🟢', ok: green, flag: 'green' }, red = { text: '🔴', ok: !green, flag: 'red' };
        return { text: 'Someone who… ' + t, opts: r() < 0.5 ? [g, red] : [red, g], two: true, why: green ? 'That’s a GREEN flag: healthy and safe.' : 'That’s a RED flag. Talk to a trusted adult.' };
      });
      const qs = shuffle(r, DATA.Q.choices).map(q => mc(q, r)); const out = [];
      flags.forEach((f, i) => { out.push(f); if (i % 2 === 1 && qs.length) out.push(qs.shift()); });
      return out;
    },
  },
  honour: {
    key: 'honour', gid: 'run:honour', title: 'Honour Run', topic: 'legion', icon: '🏅', music: 'run',
    blurb: 'Run the camp trail. Collect the six Legion of Honour badges and dodge what pulls you away.',
    sky: { top: '#4A7FC0', bottom: '#F7C98A', fogNear: 40, fogFar: 118, sun: '#FFD9A0', sunI: 2.1, sunPos: [10, 7, 2], hemi: 1.4, skyLight: '#E3E8FF', groundLight: '#5E6A3A' },
    kit: ['tree_pineTallA_detailed', 'tree_pineRoundC', 'tree_pineDefaultA', 'tree_oak', 'tree_detailed', 'tree_tall', 'plant_bushLarge', 'plant_bushDetailed', 'rock_largeA', 'rock_tallB', 'rock_smallA', 'stump_round', 'log_large', 'log_stack', 'tent_detailedOpen', 'tent_smallClosed', 'campfire_stones', 'campfire_logs', 'sign', 'mushroom_redGroup', 'flower_yellowA', 'grass_large', 'fence_simple'],
    obstacles: ['video', 'music', 'gossip', 'party', 'swear', 'vape', 'alcohol', 'log', 'branch', 'rock'],
    pickups: [],
    badges: DATA.LEGION_SIX,
    gates(r) {
      const sc = shuffle(r, Object.keys(DATA.HONOUR).flatMap(k => DATA.HONOUR[k].map(x => [k, x]))).map(([, x]) => {
        const good = { text: x[1], ok: true }, bad = { text: x[2], ok: false };
        return { text: x[0], opts: r() < 0.5 ? [good, bad] : [bad, good], two: true, why: '“Whatsoever ye do, do all to the glory of God.” (1 Corinthians 10:31)' };
      });
      const qs = shuffle(r, DATA.Q.legion).map(q => mc(q, r)); const out = [];
      sc.forEach((s, i) => { out.push(s); if (i % 2 === 1 && qs.length) out.push(qs.shift()); });
      return out;
    },
  },
};

/* ---------- scenery ---------- */
const TILE = 30;
export { TILE };
/* height of the seawall beach at x (it slopes gently down to the sea) */
const SANDY = x => -2.05 + (x + 13.5) * 0.046;
const C = new THREE.Color();
function strip(w, d, color, x, y = 0) { return P(G.box(w, 0.2, d), color, [x, y - 0.1, 0]); }
export function groundTile(key) {
  const p = [];
  if (key === 'seawall') {
    /* the Georgetown seawall: the promenade on top, the wall people sit on, concrete steps down to a shelly beach, the brown Atlantic */
    p.push(strip(7.4, TILE, '#CFC6B4', 0));
    for (let z = -TILE / 2; z < TILE / 2; z += 3) p.push(P(G.box(7.4, 0.02, 0.05), '#BDB4A1', [0, 0.004, z]));
    p.push(P(G.box(0.6, 0.42, TILE), '#C4BBA7', [-4.0, 0.21, 0]), P(G.box(0.7, 0.07, TILE), '#D6CEBC', [-4.0, 0.45, 0]));
    for (let i = 0; i < 3; i++) p.push(P(G.box(0.92, 0.7, TILE), i % 2 ? '#B3AA95' : '#A89F8A', [-4.75 - i * 0.9, -0.45 - i * 0.55 - 0.35, 0]));
    p.push(P(G.box(14, 0.6, TILE), '#D9C49B', [-13.5, -2.35, 0], [0, 0, 0.046]));
    let sd = 7; const rr = () => { sd = (sd * 9301 + 49297) % 233280; return sd / 233280; };
    for (let i = 0; i < 80; i++) {
      const x = -7.3 - rr() * 9, z = (rr() - 0.5) * TILE, y = SANDY(x) + 0.015, c = ['#F4EFE6', '#F2D7CF', '#E9DFC9', '#FFFFFF', '#E6C9A8'][Math.floor(rr() * 5)], sc = 0.6 + rr() * 0.9;
      p.push(rr() < 0.7 ? P(G.cone(0.13, 0.06, 7), c, [x, y, z], [0, rr() * 6, 0], [sc, sc, sc * 1.2]) : P(G.ball(0.08, 6, 4), c, [x, y + 0.02, z], [0, rr() * 6, 0], [sc, sc * 0.6, sc * 1.4]));
    }
    p.push(strip(6.2, TILE, '#6FA04A', 6.8)); p.push(strip(6, TILE, '#4A4D52', 12.9, -0.02));
    for (let z = -TILE / 2; z < TILE / 2; z += 6) p.push(P(G.box(0.15, 0.02, 2.6), '#F2EBD8', [12.9, 0.005, z]));
    p.push(strip(30, TILE, '#7FAE56', 30.8, -0.04));
  } else if (key === 'choices') {
    p.push(strip(7.6, TILE, '#4B4E54', 0));
    for (const x of [-1.15, 1.15]) for (let z = -TILE / 2; z < TILE / 2; z += 5) p.push(P(G.box(0.12, 0.02, 2.4), '#F2EBD8', [x, 0.005, z]));
    for (const s of [-1, 1]) { p.push(P(G.box(0.25, 0.32, TILE), '#C9C2B4', [s * 3.95, 0.06, 0])); p.push(strip(3.4, TILE, '#BDB5A6', s * 5.8, 0.18)); p.push(strip(40, TILE, '#7FAE56', s * 27.5, 0)); }
    for (let z = -TILE / 2; z < TILE / 2; z += 1.5) for (const s of [-1, 1]) p.push(P(G.box(3.4, 0.01, 0.04), '#ABA394', [s * 5.8, 0.185, z]));
  } else {
    p.push(strip(7.2, TILE, '#A9814F', 0));
    for (let i = 0; i < 26; i++) p.push(P(G.dod(0.12 + (i % 3) * 0.05), '#8D8A84', [((i * 37) % 70) / 10 - 3.5, 0.02, ((i * 53) % TILE) - TILE / 2], [i, i * 2, 0], [1, 0.4, 1]));
    for (const s of [-1, 1]) { p.push(strip(1.2, TILE, '#8E8A3E', s * 4.2, 0.01)); p.push(strip(44, TILE, '#5E8F3E', s * 26.8, 0.02)); }
  }
  return mesh(merge(p));
}
/* decor for one side of the track at track distance s. returns objects with x and an offset along the track */
export function decor(key, r, side) {
  const out = [], add = (o, x, dz = 0, ry) => { if (!o) return; o.position.x = x; o.userData.dz = dz; if (ry != null) o.rotation.y = ry; else o.rotation.y = r() * Math.PI * 2; out.push(o); };
  if (key === 'seawall') {
    if (side < 0) {
      if (r() < 0.15) { const rk = kit(pick(r, ['rock_largeA', 'rock_largeC']), null, 2 + r() * 2); const rx = -7.6 - r() * 4; add(rk, rx); if (rk) rk.position.y = SANDY(rx) - 0.05; }
      if (r() < 0.12) { const lg = kit('log', null, 3); const lx = -9 - r() * 5; add(lg, lx); if (lg) lg.position.y = SANDY(lx); }
      if (r() < 0.06) add(mesh(prop('kite', pick(r, ['#D3243A', '#2F5FA8', '#F2C14E', '#2E8A6E']), pick(r, ['#F2C14E', '#F4F4F4', '#7B3FB8']))), -14 - r() * 20, 0, 0), out[out.length - 1] && (out[out.length - 1].position.y = 9 + r() * 7, out[out.length - 1].scale.setScalar(2.2), out[out.length - 1].rotation.z = (r() - 0.5) * 0.6);
      if (r() < 0.05) add(boat(r), -24 - r() * 30, 0, r() * 6);
      return out;
    }
    const k = r();
    if (k < 0.34) add(kit(pick(r, ['tree_palmTall', 'tree_palmBend', 'tree_palmDetailedTall', 'tree_palmShort']), 6 + r() * 3), 4.6 + r() * 4);
    else if (k < 0.48) add(mesh(prop('bench')), 4.4, 0, -Math.PI / 2);
    else if (k < 0.62) add(mesh(prop('lamp')), 4.2, 0, Math.PI);
    else if (k < 0.75) add(kit(pick(r, ['plant_bushLarge', 'plant_bush']), 0.9 + r() * 0.5), 5 + r() * 3);
    if (r() < 0.22) { const car = kitScene(pick(r, ['car_sedan', 'car_taxi', 'car_van', 'car_truck', 'car_police']), 4.4); add(car, 11.4 + (r() < 0.5 ? 0 : 3), r() * 8, r() < 0.5 ? 0 : Math.PI); }
    if (r() < 0.45) add(house(r), 19 + r() * 8, r() * 6, -Math.PI / 2 + (r() - 0.5) * 0.2);
    if (r() < 0.04) add(mesh(prop('bandstand')), 7.6, 0, 0);
    if (r() < 0.25) add(kit(pick(r, ['tree_palmTall', 'tree_palmDetailedTall']), 7 + r() * 3), 16.5 + r() * 2);
  } else if (key === 'choices') {
    const s = side, k = r();
    if (k < 0.3) add(mesh(prop('lamp')), s * 4.3, 0, s < 0 ? 0 : Math.PI);
    else if (k < 0.55) add(kit(pick(r, ['tree_default', 'tree_oak', 'tree_fat']), 5 + r() * 2), s * 6.6);
    else if (k < 0.65) add(kitScene('car_cone', 0.7), s * 4.3);
    if (r() < 0.75) { const b = r() < 0.12 ? mesh(prop('school')) : r() < 0.1 ? mesh(prop('church')) : r() < 0.55 ? shop(r) : house(r); add(b, s * (11 + r() * 3), 0, s < 0 ? Math.PI / 2 : -Math.PI / 2); }
    if (r() < 0.3) { const car = kitScene(pick(r, ['car_sedan', 'car_taxi', 'car_van', 'car_police', 'car_delivery', 'car_suv']), 4.4); add(car, s * 7.6, 0, 0); }
  } else {
    const s = side, n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) add(kit(pick(r, ['tree_pineTallA_detailed', 'tree_pineRoundC', 'tree_pineDefaultA', 'tree_oak', 'tree_detailed', 'tree_tall']), 6 + r() * 5), s * (5.5 + r() * 22), (r() - 0.5) * 8);
    const k = r();
    if (k < 0.2) add(kit(pick(r, ['rock_largeA', 'rock_tallB', 'rock_smallA']), null, 3 + r() * 3), s * (5 + r() * 4));
    else if (k < 0.35) add(kit(pick(r, ['stump_round', 'log_large', 'log_stack']), null, 3), s * (5 + r() * 3));
    else if (k < 0.5) add(kit(pick(r, ['plant_bushLarge', 'plant_bushDetailed', 'mushroom_redGroup', 'flower_yellowA', 'grass_large']), null, 4), s * (4.9 + r() * 3));
    if (r() < 0.12) { add(kit(pick(r, ['tent_detailedOpen', 'tent_smallClosed']), null, 4.5), s * (9 + r() * 3)); add(kit('campfire_stones', null, 4), s * 7.2, 3); add(flame(), s * 7.2, 3, 0); }
    if (r() < 0.05) add(mesh(prop('flagpole')), s * 5.2, 0, s < 0 ? 0 : Math.PI);
    if (r() < 0.06) add(kit('sign', null, 5), s * 4.6, 0, s < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  return out;
}
function flame() { const m = new THREE.Mesh(prop('flame'), MAT.glow); m.userData.flame = true; return m; }
const HOUSE_COLS = [['#F2EBDD', '#2E7D4F'], ['#E9C46A', '#8A3B2E'], ['#BFE0E8', '#2F5FA8'], ['#F4D3C4', '#B5452C'], ['#DDE8C9', '#5A7A2A'], ['#FFFFFF', '#7A3B2E']];
function house(r) { const c = pick(r, HOUSE_COLS); return mesh(prop('house', c[0], c[1], 5 + Math.floor(r() * 3), 5)); }
function shop(r) { return mesh(prop('shop', pick(r, ['#E9B649', '#9ED3B8', '#F4A6A0', '#B9D4F0', '#F2E6C8']), pick(r, ['#B5452C', '#2F5FA8', '#2E7D4F', '#7B3FB8']), 5 + Math.floor(r() * 3))); }
function boat(r) { const c = pick(r, ['#2F5FA8', '#B5452C', '#2E7D4F']); return mesh(merge([P(G.box(1.6, 0.6, 5), c, [0, 0, 0]), P(G.box(1.4, 0.1, 4.6), '#F4F1EA', [0, 0.32, 0]), P(G.cyl(0.05, 0.05, 3, 6), '#7B5A3A', [0, 1.8, 0.4]), P(G.box(0.04, 2, 1.6), '#F4F1EA', [0, 2.0, 0.9])])); }

/* things that stay at the horizon (they don't move with the track) */
export function backdrop(key, scene) {
  const g = new THREE.Group(); g.name = 'backdrop';
  if (key === 'seawall') {
    const sk = mesh(prop('skyline')); sk.position.set(70, -0.5, -150); sk.scale.set(2.2, 2.2, 2); g.add(sk);
    const lh = mesh(prop('lighthouse')); lh.position.set(26, 0, -120); lh.scale.setScalar(1.6); g.add(lh);
  } else if (key === 'choices') {
    for (let i = 0; i < 5; i++) { const h = mesh(prop('hill', 30 + i * 6, i % 2 ? '#6E9E4A' : '#7FAE56')); h.position.set((i - 2) * 55, -2, -160); g.add(h); }
  } else {
    const t1 = mesh(prop('tepui', 70, 26, '#7D7A86')); t1.position.set(-60, -2, -165); g.add(t1);
    const t2 = mesh(prop('tepui', 50, 20, '#8A8794')); t2.position.set(55, -2, -170); g.add(t2);
    for (let i = 0; i < 4; i++) { const h = mesh(prop('hill', 28, i % 2 ? '#4E7F38' : '#5E8F3E')); h.position.set((i - 1.5) * 50, -3, -140); g.add(h); }
  }
  g.traverse(o => { if (o.isMesh) o.material = o.material.clone(), o.material.fog = true; });
  scene.add(g); return g;
}

/* the sea beside the seawall: gentle low-poly waves */
export function sea(scene) {
  /* the brown Atlantic: rolling low-poly waves, and the swash running up the beach toward the wall and back */
  const geo = new THREE.PlaneGeometry(240, 260, 60, 60); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({ color: '#8A7E5E', specular: '#FFF1D0', shininess: 70, flatShading: true });
  const u = { uT: { value: 0 }, uS: { value: 0 } }; mat.userData.u = u;
  mat.onBeforeCompile = sh => { Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n float zz = position.z - uS; float sh = smoothstep(120.0, 60.0, position.x + 120.0); transformed.y += (sin(position.x * 0.45 + uT * 1.9) * 0.28 + sin(zz * 0.3 + uT * 1.2) * 0.14 + sin(position.x * 0.21 + zz * 0.15 + uT * 0.8) * 0.16) * (0.4 + 0.6 * sh);'); };
  const m = new THREE.Mesh(geo, mat); m.position.set(-132, -2.22, -90); scene.add(m);
  const fm = () => new THREE.MeshBasicMaterial({ color: '#F3EBDA', transparent: true, opacity: 0.6, depthWrite: false });
  const swash = [0, 1, 2].map(i => { const f = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 260, 1, 1).rotateZ(0), fm()); f.rotation.x = -Math.PI / 2; f.position.set(-19, -3.0, -90); f.renderOrder = 2; scene.add(f); return f; });
  return { update(t, s) { u.uT.value = t; u.uS.value = s;
    swash.forEach((f, i) => { const ph = (t * 0.16 + i / 3) % 1, k = Math.sin(ph * Math.PI); f.position.x = -17.5 + k * (6.5 + (i === 1 ? 2.2 : 0)); f.position.y = SANDY(f.position.x) + 0.03; f.rotation.y = 0; f.rotation.x = -Math.PI / 2; f.rotation.z = 0; f.material.opacity = 0.65 * (1 - ph) * (ph < 0.08 ? ph / 0.08 : 1); f.scale.x = 0.6 + k; }); } };
}
