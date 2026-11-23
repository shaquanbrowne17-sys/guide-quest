/* Nature Photographer (Nature Parables, NS 1): walk the creek trail with a camera, like Jesus learning from nature
   as a child (The Desire of Ages, chapter 7). Photograph seven things, and each photo opens its lesson.
   Lessons and texts follow the Nature Parables explorer (KJV). */
import { THREE, G, P, merge, MAT, sign } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  creek: (len = 70, w = 4) => merge([P(G.box(len, 0.04, w), '#3B2E1E', [0, -0.06, 0]), P(G.box(len, 0.12, 0.5), '#9C8A6A', [0, -0.02, -w / 2 - 0.2]), P(G.box(len, 0.12, 0.5), '#9C8A6A', [0, -0.02, w / 2 + 0.2])]),
  footbridge: () => { const p = [P(G.box(2.2, 0.12, 5.6), '#8A5A2B', [0, 0.3, 0])]; for (const x of [-1.05, 1.05]) { p.push(P(G.box(0.08, 0.08, 5.6), '#6E4424', [x, 1.0, 0])); for (let z = -2.6; z <= 2.6; z += 1.3) p.push(P(G.box(0.1, 0.8, 0.1), '#6E4424', [x, 0.65, z])); } return merge(p); },
  pond: (r = 4) => merge([P(G.cyl(r, r, 0.04, 28), '#2F3A2A', [0, -0.04, 0]), P(G.tor(r + 0.1, 0.22, 4, 28), '#9C8A6A', [0, 0, 0], [PI / 2, 0, 0])]),
  vlily: (r = 1) => merge([P(G.cyl(r, r, 0.06, 16), '#4E8F3A', [0, 0.02, 0]), P(G.tor(r, 0.06, 4, 16), '#B5452C', [0, 0.08, 0], [PI / 2, 0, 0])]),
  vflower: () => merge([P(G.cone(0.22, 0.3, 8), '#F7F3EA', [0, 0.15, 0]), P(G.cone(0.14, 0.32, 8), '#F2B8C8', [0, 0.22, 0])]),
  nest: () => merge([P(G.tor(0.32, 0.12, 6, 12), '#7A5C3A', [0, 0, 0], [PI / 2, 0, 0]), P(G.cyl(0.3, 0.2, 0.12, 10), '#6E4B2C', [0, -0.06, 0])]),
  bird: (c = '#C9543A') => merge([P(G.ico(0.17, 1), c, [0, 0, 0], null, [1, 0.9, 1.3]), P(G.ico(0.11, 1), c, [0, 0.13, 0.15]), P(G.cone(0.04, 0.12, 5), '#F2C14E', [0, 0.12, 0.29], [PI / 2, 0, 0]),
    P(G.box(0.03, 0.12, 0.22), '#7A2E1D', [0.15, 0.02, -0.02], [0, 0, -0.3]), P(G.box(0.03, 0.12, 0.22), '#7A2E1D', [-0.15, 0.02, -0.02], [0, 0, 0.3]), P(G.box(0.12, 0.03, 0.16), '#7A2E1D', [0, 0.02, -0.24])]),
  chick: () => merge([P(G.ico(0.08, 1), '#F2D16B', [0, 0, 0]), P(G.cone(0.035, 0.07, 5), '#E2412C', [0, 0.06, 0.04], [-0.8, 0, 0])]),
  sheep: () => merge([P(G.ico(0.45, 1), '#F4F1EA', [0, 0.75, 0], null, [1, 0.8, 1.3]), P(G.ico(0.2, 1), '#F4F1EA', [0, 1.0, 0.35]), P(G.box(0.24, 0.26, 0.32), '#2A2420', [0, 0.85, 0.62]),
    ...[[-0.2, -0.3], [0.2, -0.3], [-0.2, 0.3], [0.2, 0.3]].map(([x, z]) => P(G.box(0.08, 0.45, 0.08), '#2A2420', [x, 0.22, z])), P(G.box(0.14, 0.06, 0.1), '#2A2420', [0.16, 0.95, 0.56]), P(G.box(0.14, 0.06, 0.1), '#2A2420', [-0.16, 0.95, 0.56])]),
  staff: () => merge([P(G.cyl(0.03, 0.03, 1.8, 5), '#8A5A2B', [0, 0.9, 0]), P(G.tor(0.15, 0.03, 4, 10, PI * 1.2), '#8A5A2B', [0.15, 1.8, 0], [0, 0, 0])]),
  rail: (len = 4) => merge([P(G.box(len, 0.08, 0.08), '#A8743F', [0, 0.9, 0]), P(G.box(len, 0.08, 0.08), '#A8743F', [0, 0.5, 0]), P(G.box(0.1, 1.0, 0.1), '#7B5A3A', [-len / 2, 0.5, 0]), P(G.box(0.1, 1.0, 0.1), '#7B5A3A', [len / 2, 0.5, 0])]),
  anthill: () => merge([P(G.cone(0.9, 0.7, 9), '#9C6B3E', [0, 0.35, 0]), P(G.cyl(0.12, 0.12, 0.05, 8), '#3A2A1A', [0.1, 0.68, 0.1])]),
  ant: () => merge([P(G.ico(0.045, 0), '#6B2A1A', [0, 0.04, -0.05]), P(G.ico(0.035, 0), '#6B2A1A', [0, 0.04, 0.03]), P(G.box(0.16, 0.01, 0.12), '#5FA83A', [0, 0.11, 0], [0.3, 0, 0.2])]),
  sunflower: (h = 2) => merge([P(G.cyl(0.04, 0.05, h, 5), '#5A8F2A', [0, h / 2, 0]), P(G.box(0.3, 0.02, 0.18), '#5A8F2A', [0.15, h * 0.5, 0], [0, 0, 0.4]), P(G.box(0.3, 0.02, 0.18), '#5A8F2A', [-0.15, h * 0.65, 0], [0, 0, -0.4]),
    P(G.cyl(0.22, 0.22, 0.08, 14), '#6E4424', [0, h, 0.04], [PI / 2, 0, 0]), ...Array.from({ length: 12 }, (_, i) => P(G.cone(0.08, 0.26, 4), '#F2C14E', [Math.cos(i * PI / 6) * 0.33, h + Math.sin(i * PI / 6) * 0.33, 0.02], [0, 0, i * PI / 6 - PI / 2]))]),
  trellis: () => { const p = []; for (const x of [-2, 0, 2]) p.push(P(G.box(0.12, 2.4, 0.12), '#7B5A3A', [x, 1.2, 0])); for (const y of [0.8, 1.6, 2.35]) p.push(P(G.box(4.2, 0.07, 0.07), '#A8743F', [0, y, 0]));
    for (let i = 0; i < 26; i++) { const x = -2 + (i * 0.6) % 4.2, y = 0.5 + ((i * 0.37) % 1.9); p.push(P(G.ico(0.22, 0), i % 3 ? '#3F7F2E' : '#5A9A3A', [x, y, 0.05 * (i % 2 ? 1 : -1)], null, [1, 0.8, 0.5])); }
    for (let i = 0; i < 8; i++) p.push(P(G.ico(0.1, 1), '#5B2A6E', [-1.7 + i * 0.5, 0.9 + (i % 3) * 0.45, 0.16]));
    return merge(p); },
  seedling: () => merge([P(G.cyl(0.02, 0.02, 0.25, 4), '#5A8F2A', [0, 0.12, 0]), P(G.box(0.14, 0.01, 0.07), '#6FB33A', [0.06, 0.25, 0], [0, 0, 0.4]), P(G.box(0.14, 0.01, 0.07), '#6FB33A', [-0.06, 0.25, 0], [0, 0, -0.4]), P(G.cyl(0.18, 0.2, 0.06, 8), '#5A3E26', [0, 0.02, 0])]),
});

const SHOTS = [
  { id: 'birds', name: 'Birds feeding their young', where: 'in the low tree near the start', icon: '🐦', at: [-11, 3.5], cam: [[-9.2, 3.2, 6.0], [-11.4, 2.2, 3.4]],
    fact: 'Parent birds fly back and forth with food for their chicks many times an hour.', meaning: 'God takes care of us', text: 'Matthew 6:26', verse: 'Behold the fowls of the air: for they sow not, neither do they reap, nor gather into barns; yet your heavenly Father feedeth them. Are ye not much better than they?' },
  { id: 'ants', name: 'Leafcutter ants at work', where: 'beside the path', icon: '🐜', at: [5, 5], cam: [[5.6, 1.6, 7.6], [4.8, 0.2, 5.2]],
    fact: 'Leafcutter ants don’t eat the leaves. They carry them home to grow the fungus they eat.', meaning: 'Work hard and plan ahead', text: 'Proverbs 6:6', verse: 'Go to the ant, thou sluggard; consider her ways, and be wise:' },
  { id: 'sheep', name: 'A shepherd and his sheep', where: 'in the pasture on the right', icon: '🐑', at: [15, 4], cam: [[12.5, 2.6, 9.5], [15.5, 0.8, 3.5]],
    fact: 'In Bible times shepherds called their sheep by name, and the sheep knew their voice (John 10:3–4).', meaning: 'Jesus knows and protects us', text: 'John 10:11', verse: 'I am the good shepherd: the good shepherd giveth his life for the sheep.' },
  { id: 'lilies', name: 'Giant water lilies', where: 'in the pond across the creek', icon: '🪷', at: [12, -15], stand: [10.6, -10.0], r: 5.4, cam: [[10.5, 3.6, -8.5], [12, 0, -15]],
    fact: 'The giant water lily (Victoria amazonica) is Guyana’s national flower. Its round leaves can grow up to about 3 metres across.', meaning: 'God clothes the flowers, so don’t worry', text: 'Matthew 6:28', verse: 'And why take ye thought for raiment? Consider the lilies of the field, how they grow; they toil not, neither do they spin:' },
  { id: 'seed', name: 'A tiny seed, a giant tree', where: 'at the big silk cotton tree', icon: '🌱', at: [-14, -15.5], cam: [[-11.4, 2.3, -10.6], [-14, 1.9, -16.8]],
    fact: 'A silk cotton (kapok) tree can grow taller than a 15-storey building, from a seed smaller than a pea.', meaning: 'Faith grows from small beginnings', text: 'Matthew 13:31', verse: 'Another parable put he forth unto them, saying, The kingdom of heaven is like to a grain of mustard seed, which a man took, and sowed in his field:' },
  { id: 'sun', name: 'Sunflowers facing the sun', where: 'in the garden behind the bridge', icon: '🌻', at: [-3.5, -17], cam: [[-6.5, 2.4, -12.2], [-3.5, 2.0, -18]],
    fact: 'Young sunflowers turn to follow the sun across the sky each day.', meaning: 'We grow by turning to Jesus', text: 'John 8:12', verse: 'Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life.' },
  { id: 'vine', name: 'A passion fruit vine', where: 'on the trellis by the garden', icon: '🍇', at: [4, -19], cam: [[4.2, 1.9, -15.2], [4, 1.3, -19]],
    fact: 'Fruit only grows on branches joined to the vine. Cut a branch off and it dries up.', meaning: 'Stay joined to Jesus to bear fruit', text: 'John 15:5', verse: 'I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing.' },
];

export const NATURE = {
  key: 'nature', gid: 'photo:nature', title: 'Nature Photographer', topic: 'parable', icon: '📷', kind: 'walk', music: 'calm',
  blurb: 'Walk the creek trail with a camera, the way Jesus learned from nature as a child. Photograph seven things, and each photo opens its lesson.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap a 📷 to take a photo.',
  sky: { top: '#5E9BD6', bottom: '#F2E2B8', fogNear: 55, fogFar: 140, sun: '#FFE8C0', sunI: 2.3, sunPos: [-6, 12, -4], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#6E9E4A', modes: { endless: ['📷', 'The creek trail', 'Seven photos, seven lessons. About 8 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_fat', 'tree_tall', 'tree_palmTall', 'tree_pineRoundC', 'plant_bushLarge', 'plant_bush', 'flower_redA', 'flower_yellowA', 'flower_purpleA', 'rock_largeA', 'rock_smallA', 'mushroom_redGroup', 'grass_large', 'stump_round', 'log'],
  start: [0, 0, 10], startRy: PI, bounds: [-26, -24, 26, 16], intro: [8, 42, 26], questTitle: 'Photos', coinIcon: '📷',
  async build(w, progress) {
    const B = n => new THREE.Mesh(prop(n), MAT.flat);
    w.put('creek', [70, 4], 0, -6); w.put('footbridge', null, 0, -6, PI / 2); w.box(-40, -8.2, -1.25, -3.8); w.box(1.25, -8.2, 40, -3.8);
    // the trail
    [[0, 6, 0, 9], [0, -1, 0, 5], [0, -12, 0, 7], [5, -12, PI / 2, 8], [-5, -12, PI / 2, 8], [8, 4, PI / 2, 14], [-6, 4, PI / 2, 10]].forEach(([x, z, ry, len]) => w.add(new THREE.Mesh(prop('path_', len), MAT.flat), x, 0, z, ry));
    // the pond and its lilies
    w.put('pond', [4], 12, -15); w.circle(12, -15, 4.2);
    [[11, -14.2, 1.3], [13.3, -16, 1.0], [12.6, -13.2, 0.8], [10.8, -16.4, 0.9]].forEach(([x, z, r], i) => { w.add(new THREE.Mesh(prop('vlily', r), MAT.flat), x, 0, z, i); if (i < 2) w.add(B('vflower'), x + 0.2, 0.05, z + 0.2); });
    // the giant tree and its seedling
    const big = w.kit('tree_fat', 16, -14, -18.5, 0.3, 1.0); if (big) w.fadeable(big);
    w.add(B('seedling'), -14, 0, -15.5); w.add(new THREE.Mesh(prop('sign_'), MAT.flat), -15.2, 0, -15.3, 0.3); const sg = sign(['A tiny seed…'], 0.66, 0.3, { bg: '#F4EFE2', fg: '#2A1C10', r: 8 }); w.add(sg, -15.2 + 0.012, 0.85, -15.3 + 0.07, 0.3);
    // sunflowers, vine
    for (let i = 0; i < 9; i++) { const f = w.add(new THREE.Mesh(prop('sunflower', 1.8 + (i % 3) * 0.25), MAT.flat), -5 + (i % 3) * 1.0, 0, -18.4 - Math.floor(i / 3) * 0.9, PI * 0.15); w.circle(f.position.x, f.position.z, 0.15); }
    w.put('trellis', null, 4, -19.6); w.box(1.9, -19.8, 6.1, -19.4);
    // the pasture
    for (const [x, z, ry] of [[15, 8, 0], [11, 8, 0], [19, 8, 0], [21, 4, PI / 2], [21, 0, PI / 2], [15, -1, 0], [19, -1, 0]]) { w.put('rail', [4], x, z, ry); }
    w.box(9, 7.9, 21.1, 8.1); w.box(20.9, -1.1, 21.1, 8.1); w.box(13, -1.1, 21.1, -0.9);
    w.sheep = []; [[16.5, 5.5, 0.4], [18.5, 3.2, 2.2], [17.2, 1.2, 4], [19.4, 6.2, 1], [14.8, 2.2, 5.5]].forEach(([x, z, ry]) => { const s = w.add(B('sheep'), x, 0, z, ry); w.circle(x, z, 0.55); w.sheep.push(s); });
    const shep = await w.npc('shepherd', { body: 'm', skin: 1, hair: 'short' }, { shirt: '#C9A46A', trim: '#8A6A3A', trousers: '#6E4B2C' }, 15, 4, -0.6);
    const st = B('staff'); st.position.set(0.32, 0, 0.1); shep.root.add(st);
    // the nest
    w.kit('tree_default', 4.2, -12.2, 3.0, 0.5, 0.35);
    const nest = w.add(B('nest'), -11.2, 2.0, 3.5); w.chicks = [0, 1, 2].map(i => w.add(B('chick'), -11.3 + i * 0.12, 2.08, 3.45 + (i % 2) * 0.1, 0.3));
    w.mom = w.add(B('bird'), -11.0, 2.35, 3.85, PI); void nest;
    // the ants
    w.add(B('anthill'), 6.6, 0, 4.4); w.circle(6.6, 4.4, 0.8); w.kit('plant_bushLarge', 1.4, 3.0, 6.0, 0, 0.5);
    w.ants = []; for (let i = 0; i < 14; i++) { const a = w.add(B('ant'), 0, 0, 0); a.u = i / 14; w.ants.push(a); }
    // the woods
    const r = mulberry(7);
    for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 52, z = -24 + r() * 40; if (Math.abs(x) < 3 || (x > 8 && x < 22 && z > -2 && z < 9) || (Math.hypot(x - 12, z + 15) < 6) || (z > -10 && z < -2) || (x > -8 && x < 8 && z < -14) || Math.hypot(x + 14, z + 16) < 4) continue;
      const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_palmTall', 'tree_pineRoundC', 'plant_bushLarge', 'plant_bush', 'rock_largeA'][Math.floor(r() * 8)];
      const t = w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6, k.startsWith('tree') ? 0.35 : 0.5); if (t && k.startsWith('tree') && z > -4) w.fadeable(t); }
    for (let i = 0; i < 40; i++) w.kit(['flower_redA', 'flower_yellowA', 'flower_purpleA', 'mushroom_redGroup', 'grass_large'][i % 5], 0.5, (r() - 0.5) * 48, -22 + r() * 36, r() * 6);
    progress(0.6);
    const guide = await w.npc('guide', { body: 'm', skin: 2, hair: 'buzzed', scale: 1.0 }, 'counsellor', -2.0, 7.6, PI * 0.8, 'Idle_Talking_Loop'); guide.anim = 'Idle_Talking_Loop';
    w.photos = [];
    w.thing({ id: 'guide', x: -2.0, z: 7.6, npc: guide, icon: '💬', verb: 'Talk to Brother Mark', when: w => !w.isDone('brief'), use: brief });
    SHOTS.forEach(s => w.thing({ id: s.id, x: s.at[0], z: s.at[1], r: s.r || 3.2, stand: s.stand, h: s.id === 'birds' ? 2.6 : 1.4, icon: '📷', verb: 'Photograph: ' + s.name.toLowerCase(), when: w => w.isDone('brief') && !w.isDone(s.id), use: w => shoot(w, s) }));
    w.hooks.push(animate);
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Brother Mark at the trail sign' }]); w.ui.banner('The creek trail', 'Take your camera. Look closely.', 2600); },
};
Object.assign(BUILD, {
  path_: (len) => merge([P(G.box(1.8, 0.03, len), '#BFA77A', [0, 0.015, 0])]),
  sign_: () => merge([P(G.box(0.08, 0.9, 0.08), '#6E4424', [0, 0.45, 0]), P(G.box(0.7, 0.35, 0.05), '#F4EFE2', [0, 0.85, 0.04])]),
});

async function brief(w) {
  const g = w.npcs.guide; w.faceEach(g);
  await w.say('Brother Mark', 'When Jesus was a boy, He learned from the Scriptures, from nature and from the work of His hands (The Desire of Ages, chapter 7).', { icon: '🧑🏾‍🏫' });
  await w.say('Brother Mark', 'He saw lessons everywhere: seeds, birds, lilies, sheep. Seven of them are hiding on this trail. Photograph each one, and find what it teaches.', { icon: '🧑🏾‍🏫' });
  w.done('brief', 50); SHOTS.forEach(s => w.addQuest({ id: s.id, text: s.name + ' (' + s.where + ')' }));
}
async function shoot(w, s) {
  const url = await w.snap(s.cam[0], s.cam[1]);
  const others = SHOTS.filter(x => x !== s).map(x => x.meaning).sort(() => Math.random() - 0.5).slice(0, 2);
  await w.say(s.icon + ' ' + s.name, s.fact, { tag: '📷 Photo ' + (w.photos.length + 1) + ' of ' + SHOTS.length, html: '<img class="cd-photo" src="' + url + '" alt="">', keep: true, next: 'What does it teach? ▶' });
  await w.ask({ who: s.name, icon: s.icon, tag: '📖 Nature parable', q: 'What lesson does this teach?', opts: [s.meaning, ...others], right: 0, why: '“' + s.verse + '” (' + s.text + ', KJV)' });
  w.photos.push({ s, url }); w.camOverride = null; w.done(s.id, 150);
  if (w.photos.length === SHOTS.length) await finale(w);
}
async function finale(w) {
  await w.say('Brother Mark', 'Seven photos, seven lessons! Now make your own parable: observe, find the lesson, add a Bible text, and tell it.', { icon: '🧑🏾‍🏫' });
  const c = await w.choose({ who: 'Your parable', icon: '📷', q: 'Which photo will you use for your own parable?', opts: w.photos.map(p => p.s.icon + ' ' + p.s.name) });
  const p = w.photos[c].s;
  await w.say('Your parable', 'Observe: ' + p.fact + ' Lesson: ' + p.meaning + '. Text: ' + p.text + '. Tell it in 3 to 5 minutes, bring the real thing or your photo, ask “What do you think this teaches us?”, and end with a short prayer.', { icon: '📝', next: 'Finish ▶' });
  w.finish({ title: 'Seven photos, seven lessons!', list: ['Your photos', w.photos.map(x => [x.s.icon + ' ' + x.s.name, x.s.meaning + ' (' + x.s.text + ')'])] });
}
/* birds bob, chicks beg, ants march, sheep graze */
function animate(w, dt) {
  const t = w.eng.time;
  w.chicks.forEach((c, i) => { c.position.y = 2.08 + Math.max(0, Math.sin(t * 6 + i * 2)) * 0.06; });
  w.mom.position.y = 2.35 + Math.sin(t * 3) * 0.04; w.mom.rotation.x = Math.sin(t * 3) * 0.2;
  w.ants.forEach(a => { a.u = (a.u + dt * 0.05) % 1; const x0 = 3.2, z0 = 5.6, x1 = 6.3, z1 = 4.5, u = a.u; a.position.set(x0 + (x1 - x0) * u, 0, z0 + (z1 - z0) * u + Math.sin(u * PI * 3) * 0.25); a.rotation.y = Math.atan2(x1 - x0, z1 - z0); });
  w.sheep.forEach((s, i) => { s.rotation.x = Math.max(0, Math.sin(t * 0.6 + i * 1.7)) * 0.25; });
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
