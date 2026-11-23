/* Sister Grace's Street (Serving Others, CO 1): the class visits Sister Grace, who lives alone.
   Plan with your leader, greet her at eye level, listen, ask before you move anything, do real jobs
   (sweep, water, an errand with an adult, the rubbish), read a promise, sing, pray, keep it short, come back.
   Everything follows the Serving Others lessons in the Learning Lab. */
import { THREE, G, P, merge, MAT } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  /* a Guyanese house up on posts, with the "bottom house" underneath */
  stiltbody: (c = '#F2D16B', trim = '#FFFFFF', roof = '#8A9AA6') => merge([
    P(G.box(8.2, 0.25, 6.2), '#B9A27A', [0, 2.62, 0]), P(G.box(8, 2.6, 6), c, [0, 4.0, 0]),
    ...[-2.6, 0, 2.6].map(x => P(G.box(1.3, 1.1, 0.06), '#5A8FB8', [x, 4.2, 3.03])), ...[-2.6, 0, 2.6].map(x => P(G.box(1.5, 0.12, 0.1), trim, [x, 3.6, 3.06])),
    ...[-2.6, 0, 2.6].map(x => P(G.box(0.08, 1.2, 0.1), trim, [x, 4.2, 3.06])), P(G.box(8.3, 0.15, 6.3), trim, [0, 5.3, 0]),
    P(G.cyl(0, 6.4, 2.0, 4), roof, [0, 6.35, 0], [0, PI / 4, 0], [1, 1, 0.78]), P(G.box(1.2, 2.0, 0.08), '#7B4E26', [3.4, 3.7, 3.03])]),
  stiltposts: () => merge([[-3.8, -2.8], [-3.8, 0], [-3.8, 2.8], [0, -2.8], [0, 2.8], [3.8, -2.8], [3.8, 0], [3.8, 2.8]].map(([x, z]) => P(G.box(0.26, 2.55, 0.26), '#E9E2D3', [x, 1.27, z])).concat([P(G.box(8, 0.06, 6), '#BDB6A8', [0, 0.03, 0])])),
  stairs: () => { const p = []; for (let i = 0; i < 9; i++) p.push(P(G.box(1.2, 0.08, 0.32), '#8A5A2B', [0, 0.28 + i * 0.28, -i * 0.3])); p.push(P(G.box(0.08, 3.0, 3.2), '#E9E2D3', [-0.62, 1.4, -1.25], [-0.72, 0, 0]), P(G.box(0.08, 3.0, 3.2), '#E9E2D3', [0.62, 1.4, -1.25], [-0.72, 0, 0])); return merge(p); },
  picket: (len = 2) => { const p = [P(G.box(len, 0.08, 0.06), '#FFFFFF', [0, 0.45, 0]), P(G.box(len, 0.08, 0.06), '#FFFFFF', [0, 0.95, 0])]; for (let x = -len / 2 + 0.1; x <= len / 2; x += 0.22) p.push(P(G.box(0.1, 1.2, 0.05), '#FFFFFF', [x, 0.6, 0.04])); return merge(p); },
  gatepost: () => merge([P(G.box(0.22, 1.5, 0.22), '#E9E2D3', [0, 0.75, 0]), P(G.box(0.3, 0.1, 0.3), '#2E7D4F', [0, 1.55, 0])]),
  road: (len = 80, w = 6) => { const p = [P(G.box(len, 0.04, w), '#4A4D52', [0, 0.02, 0])]; for (let x = -len / 2 + 2; x < len / 2; x += 4) p.push(P(G.box(1.8, 0.01, 0.14), '#F2E6C8', [x, 0.045, 0])); return merge(p); },
  drain: (len = 80) => merge([P(G.box(len, 0.04, 0.9), '#3F5A4A', [0, -0.18, 0]), P(G.box(len, 0.25, 0.12), '#B9B4AA', [0, 0, -0.5]), P(G.box(len, 0.25, 0.12), '#B9B4AA', [0, 0, 0.5])]),
  culvert: () => merge([P(G.box(2.4, 0.12, 1.3), '#9A958B', [0, 0.06, 0])]),
  path: (len) => merge([P(G.box(1.6, 0.03, len), '#CFC8B8', [0, 0.015, 0])]),
  rocker: () => merge([P(G.box(0.62, 0.08, 0.58), '#7B4E26', [0, 0.46, 0]), P(G.box(0.62, 0.75, 0.08), '#7B4E26', [0, 0.85, -0.28], [-0.12, 0, 0]),
    ...[-0.3, 0.3].map(x => P(G.tor(0.6, 0.03, 4, 10, 0.9), '#5A3A22', [x, 0.62, 0.05], [0, PI / 2, PI / 2 + 0.95])), ...[-0.3, 0.3].map(x => P(G.box(0.05, 0.3, 0.5), '#5A3A22', [x, 0.66, 0]))]),
  table: () => merge([P(G.box(1.3, 0.07, 0.8), '#A8743F', [0, 0.78, 0]), ...[[-0.58, -0.33], [0.58, -0.33], [-0.58, 0.33], [0.58, 0.33]].map(([x, z]) => P(G.box(0.06, 0.78, 0.06), '#6E4424', [x, 0.39, z]))]),
  hammock: () => merge([P(G.tor(1.6, 0.05, 4, 16, PI * 0.36), '#D3243A', [0, 2.1, 0], [0, 0, PI * 1.32], [1, 0.5, 1]), P(G.box(2.4, 0.04, 0.7), '#E9B649', [0, 0.95, 0], [0, 0, 0])]),
  tank: () => merge([P(G.cyl(0.7, 0.7, 1.4, 12), '#1E1F22', [0, 2.5, 0]), P(G.cyl(0.3, 0.3, 0.1, 10), '#1E1F22', [0, 3.25, 0]), ...[[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].map(([x, z]) => P(G.box(0.12, 1.8, 0.12), '#7B5A3A', [x, 0.9, z])),
    P(G.box(1.5, 0.1, 1.5), '#7B5A3A', [0, 1.8, 0]), P(G.cyl(0.04, 0.04, 1.6, 6), '#6B6F76', [0.45, 1.0, 0.75]), P(G.box(0.16, 0.08, 0.2), '#B5452C', [0.45, 0.35, 0.82])]),
  pot: () => merge([P(G.cyl(0.26, 0.2, 0.42, 10), '#B5532C', [0, 0.21, 0]), P(G.cyl(0.24, 0.24, 0.04, 10), '#4A3420', [0, 0.4, 0])]),
  leafy: (c = '#7E8C3A') => merge([P(G.ico(0.3, 0), c, [0, 0.7, 0], null, [1, 1.2, 1]), P(G.ico(0.22, 0), c, [0.18, 0.88, 0.05]), P(G.ico(0.2, 0), c, [-0.15, 0.9, -0.08]), P(G.cyl(0.03, 0.03, 0.35, 5), '#5A6E2A', [0, 0.52, 0])]),
  flowerpop: () => merge([...[[0, 1.12, 0], [0.16, 1.05, 0.1], [-0.15, 1.06, -0.05]].map(p => P(G.ico(0.07, 0), '#D3243A', p))]),
  broom: () => merge([P(G.cyl(0.025, 0.025, 1.5, 5), '#C9A46A', [0, 0.75, 0]), P(G.cone(0.2, 0.42, 7), '#D9C27A', [0, 0.1, 0], [PI, 0, 0], [1, 1, 0.5])]),
  bucket: () => merge([P(G.cyl(0.2, 0.15, 0.32, 10), '#2F6DB5', [0, 0.16, 0]), P(G.tor(0.18, 0.012, 4, 10, PI), '#9AA3AE', [0, 0.32, 0], [0, 0, 0])]),
  rubbish: () => merge([P(G.ico(0.3, 1), '#1E1F22', [0, 0.28, 0], null, [1, 1.1, 0.9]), P(G.cone(0.1, 0.18, 6), '#1E1F22', [0, 0.62, 0])]),
  bin: () => merge([P(G.cyl(0.36, 0.3, 0.95, 10), '#2E7D4F', [0, 0.48, 0]), P(G.cyl(0.38, 0.38, 0.06, 10), '#24613D', [0, 0.98, 0])]),
  shoebox: () => merge([P(G.box(0.45, 0.2, 0.3), '#D8CFC0', [0, 0.1, 0]), P(G.box(0.48, 0.05, 0.33), '#B5452C', [0, 0.22, 0])]),
  basket: () => merge([P(G.cyl(0.26, 0.2, 0.22, 10), '#B98A4F', [0, 0.11, 0]), P(G.tor(0.22, 0.02, 4, 10, PI), '#8E5F33', [0, 0.22, 0]), P(G.ico(0.09, 0), '#F2A93B', [0.08, 0.26, 0.04]), P(G.ico(0.08, 0), '#E2412C', [-0.08, 0.25, -0.03]),
    P(G.cap(0.04, 0.22, 3, 6), '#F2D16B', [0, 0.27, 0.08], [0, 0, 1.2])]),
  grocery: () => merge([P(G.box(0.36, 0.38, 0.24), '#F4EFE2', [0, 0.19, 0]), P(G.box(0.12, 0.2, 0.06), '#E9B649', [0.07, 0.45, 0]), P(G.cap(0.04, 0.2, 3, 6), '#F2D16B', [-0.08, 0.42, 0], [0, 0, 0.5])]),
  counter: () => merge([P(G.box(2.4, 1.0, 0.7), '#8E5F33', [0, 0.5, 0]), P(G.box(2.5, 0.06, 0.8), '#C9A46A', [0, 1.02, 0]), P(G.box(0.3, 0.35, 0.3), '#D3243A', [-0.8, 1.2, 0]), P(G.box(0.25, 0.3, 0.25), '#2F6DB5', [-0.45, 1.2, 0]), P(G.cyl(0.08, 0.08, 0.2, 8), '#E9B649', [0.6, 1.15, 0])]),
  leaf: (c) => merge([P(G.box(0.24, 0.02, 0.13), c, [0, 0.02, 0])]),
});

const GRACE_LOOK = { body: 'f', skin: 1, hair: 'buns', hairColor: '#CFCFCF', bottom: 'skirt', scale: 0.9 };
const GRACE_DRESS = { shirt: '#8E5BB5', trim: '#6C3F93', trousers: '#8E5BB5', socks: '#8E5BB5', shoes: '#5A3A22', belt: '#6C3F93', buckle: '#6C3F93', patch: '#8E5BB5', rim: '#8E5BB5' };
const VERSES = [['Psalm 23:1', 'The LORD is my shepherd; I shall not want.'],
  ['Isaiah 41:10', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.'],
  ['Matthew 11:28', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.']];

export const GRACE = {
  key: 'grace', gid: 'walk:serve', title: 'Sister Grace’s Street', topic: 'visit', icon: '🏡', kind: 'walk', music: 'calm',
  blurb: 'Visit Sister Grace with your class. Greet her, listen, ask first, then do real jobs: sweep, water, run an errand, take out the rubbish. Read, sing and pray before you go.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap a person or a ❗ to go to it.',
  sky: { top: '#5A97D6', bottom: '#F4E2B8', fogNear: 60, fogFar: 150, sun: '#FFE8C0', sunI: 2.3, sunPos: [-8, 12, 6], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#5E6A3A' },
  ground: '#6FA04A', modes: { endless: ['🏡', 'The visit', 'Saturday afternoon at Sister Grace’s house. About 10 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_oak', 'tree_fat', 'tree_palmTall', 'tree_palmBend', 'plant_bushLarge', 'flower_redA', 'flower_yellowA', 'car_van'],
  start: [0, 0, 9.6], startRy: PI, bounds: [-34, -14, 34, 22], intro: [10, 45, 30], questTitle: 'The visit', coinIcon: '💛', toolAnim: { broom: 'Push_Loop' },
  async build(w, progress) {
    // the street, the drains and the neighbours
    w.put('road', [90, 6], 0, 10); w.put('drain', [90], 0, 5.6); w.put('drain', [90], 0, 14.4); w.put('culvert', null, 0, 5.6);
    w.box(-45, 5.05, -1.25, 6.15); w.box(1.25, 5.05, 21.75, 6.15); w.box(24.25, 5.05, 45, 6.15); w.box(-45, 13.85, 45, 14.95); w.put('culvert', null, 23, 5.6);
    w.put('path', [9], 0, 0.2);
    [[-17, -5, '#9ED3E8', '#2F6DB5'], [17, -5, '#F2B8A8', '#B5452C'], [-29, -5, '#C9E8B0', '#2E7D4F'], [29, -5, '#F2EBDD', '#7A3B2E'], [-15, 21, '#F2EBDD', '#2E7D4F'], [-27, 21, '#E9B649', '#7A3B2E'], [8, 21, '#9ED3E8', '#24578F']].forEach(([x, z, c, t]) => {
      const h = w.put('house', [c, t, 6, 6], x, z, z > 10 ? PI : 0); w.solid(h, 0.4); w.fadeable(h); });
    const church = w.put('church', null, -32, 21.5, PI); w.solid(church, 0.3); w.fadeable(church);
    const shop = w.put('shop', ['#E9B649', '#B5452C', 5], 23, -1.0, 0); w.solid(shop, 0.2); w.fadeable(shop);
    w.put('counter', null, 23, 2.3); w.box(21.8, 1.95, 24.2, 2.65);
    [-24, -10, 10, 24, 34].forEach(x => { w.put('lamp', null, x, 15.3, PI / 2); w.circle(x, 15.3, 0.15); });
    [[-12, 3], [12, 3], [-20, 2], [14.5, 17.5], [30, 17], [-9, 17]].forEach(([x, z], i) => { const t = w.kit(i % 2 ? 'tree_palmTall' : 'tree_palmBend', 7 + (i % 3), x, z, i, 0.3); if (t) w.fadeable(t); });
    // Sister Grace's yard and house
    for (const [x0, x1] of [[-9, -1.1], [1.1, 9]]) for (let x = x0; x < x1 - 0.1; x += 2) w.put('picket', [Math.min(2, x1 - x)], x + Math.min(2, x1 - x) / 2, 4.5);
    for (let z = -13; z < 4.5; z += 2) { w.put('picket', [2], -9, z + 1, PI / 2); w.put('picket', [2], 9, z + 1, PI / 2); }
    for (let x = -9; x < 9; x += 2) w.put('picket', [2], x + 1, -14);
    w.box(-9.2, 4.4, -1.1, 4.6); w.box(1.1, 4.4, 9.2, 4.6); w.box(-9.2, -14.2, -8.9, 4.6); w.box(8.9, -14.2, 9.2, 4.6); w.box(-9.2, -14.2, 9.2, -13.9);
    w.put('gatepost', null, -1.15, 4.5); w.put('gatepost', null, 1.15, 4.5);
    const posts = w.put('stiltposts', null, 0, -8); [[-3.8, -2.8], [-3.8, 0], [-3.8, 2.8], [0, -2.8], [0, 2.8], [3.8, -2.8], [3.8, 0], [3.8, 2.8]].forEach(([x, z]) => w.circle(x, z - 8, 0.2));
    w.fadeable(w.put('stiltbody', null, 0, -8));
    w.put('stairs', null, 4.7, -5.2, PI); w.box(4.05, -8.5, 5.35, -5.0);
    w.put('rocker', null, -1.6, -6.4); w.put('table', null, 1.4, -6.6); w.box(0.75, -7.0, 2.05, -6.2);
    w.put('hammock', null, -1.6, -10.2); w.put('tank', null, 6.6, -11.8); w.box(5.85, -12.55, 7.35, -11.05);
    const tree = w.kit('tree_oak', 7.5, -5.6, -0.6, 0.4, 0.45); if (tree) w.fadeable(tree);
    w.kit('tree_fat', 6, 6.2, -12.6 + 0.1, 1.2, 0.4); w.kit('plant_bushLarge', 1.4, -7.6, -12, 0, 0.5); w.kit('plant_bushLarge', 1.3, 7.8, -8, 1, 0.5);
    for (let i = 0; i < 10; i++) w.kit(i % 2 ? 'flower_redA' : 'flower_yellowA', 0.6, -8.2 + (i % 5) * 0.4, 3.6 - Math.floor(i / 5) * 0.5, i);
    progress(0.3);
    // the people
    const g = await w.npc('grace', GRACE_LOOK, GRACE_DRESS, -1.6, -6.5, 0, 'Sitting_Idle_Loop'); g.anim = 'Sitting_Idle_Loop';
    const c = await w.npc('counsellor', { body: 'f', skin: 2, hair: 'long', bottom: 'skirt', scale: 1.0 }, 'counsellor', -2.2, 8.6, PI * 0.85, 'Idle_Talking_Loop'); c.anim = 'Idle_Talking_Loop';
    await w.npc('pf1', { body: 'm', skin: 0, hair: 'short' }, 'pathfinder', -4.9, 7.8, PI * 0.6);
    await w.npc('pf2', { body: 'f', skin: 3, hair: 'buns', bottom: 'skirt' }, 'pathfinder', -6.4, 7.7, PI * 0.7);
    const shopk = await w.npc('shop', { body: 'm', skin: 3, hair: 'parted', scale: 1.0 }, { shirt: '#E9E3D3', trim: '#C9C2B0', trousers: '#3A3F4A' }, 23, 1.55, 0);
    progress(0.8);
    const van = w.car('car_van', 5.2, -5.2, 10, PI / 2);
    // things to carry and use
    const B = n => new THREE.Mesh(prop(n), MAT.flat);
    w.basketObj = w.add(B('basket'), -8.5, 0, 8.6);
    w.broomObj = w.add(B('broom'), -4.15, 0, -5.0, 0); w.broomObj.rotation.z = 0.18;
    w.bucketObj = w.add(B('bucket'), 5.6, 0, -11.3);
    w.bagObj = w.add(B('rubbish'), 2.8, 0, -11.4); w.boxObj = w.add(B('shoebox'), 2.0, 0, -11.6);
    w.put('bin', null, 2.4, 3.6); w.circle(2.4, 3.6, 0.38);
    w.plants = [[7.9, -3], [7.9, -0.5], [7.9, 2], [5.6, 3.6]].map(([x, z], i) => { w.put('pot', null, x, z); w.circle(x, z, 0.3); const l = w.add(B('leafy'), x, 0, z, i); l.rotation.z = 0.35; l.scale.set(1, 0.7, 1); return { x, z, leaf: l, wet: false }; });
    // leaves under the mango tree
    const cols = ['#A8863A', '#C79A3A', '#7E8C3A', '#9C6B2E'];
    w.leaves = []; for (let i = 0; i < 34; i++) { const a = i * 2.39, r = 0.8 + Math.sqrt((i + 1) / 34) * 3.2; const lf = w.add(new THREE.Mesh(prop('leaf', cols[i % 4]), MAT.flat), -5.4 + Math.cos(a) * r * 1.1, 0, -0.2 + Math.sin(a) * r * 0.8, a); w.leaves.push(lf); }
    w.hooks.push(sweep, checkJobs);
    // who you can talk to
    w.thing({ id: 'counsellor', x: -2.2, z: 8.6, npc: c, icon: '💬', verb: 'Talk to your counsellor', when: w => !w.isDone('meet') || (w.quests.some(q => q.id === 'shop' && !q.done) && !w.shopTrip && !w.carrying), use: talkCounsellor });
    w.thing({ id: 'van', x: -8.5, z: 8.6, h: 0.8, icon: '🧺', verb: 'Pick up the fruit basket', when: w => w.isDone('meet') && !w.gotBasket, use: async w => { w.gotBasket = true; w.world.remove(w.basketObj); w.carry('basket', B('basket')); w.ui.toast('Take it to Sister Grace under her house'); } });
    w.thing({ id: 'grace', x: -1.6, z: -6.5, icon: '💬', verb: 'Talk to Sister Grace', stand: [-0.45, -5.35], when: graceReady, use: talkGrace });
    w.thing({ id: 'broom', x: -4.15, z: -5.0, h: 1.5, icon: '🧹', verb: 'Take the broom', when: w => w.quests.some(q => q.id === 'sweep' && !q.done) && !w.tool && !w.carrying, use: async w => { w.broomObj.visible = false; const b = B('broom'); b.position.set(0.28, 0.05, 0.55); b.rotation.x = 0.55; w.hold('broom', b); w.ui.toast('Walk over the leaves to sweep them up'); } });
    w.thing({ id: 'bucket', x: 5.6, z: -11.3, h: 1.0, icon: '🪣', verb: 'Fill the bucket at the tank', stand: [5.4, -10.2], when: w => w.quests.some(q => q.id === 'water' && !q.done) && !w.tool && !w.carrying, use: async w => { w.bucketObj.visible = false; await w.anim('Interact', 900); const b = B('bucket'); b.position.set(0.32, 0.55, 0.12); w.hold('bucket', b); w.ui.toast('Water each thirsty plant along the fence'); } });
    w.plants.forEach((p, i) => w.thing({ id: 'plant' + i, x: p.x, z: p.z, h: 1.1, r: 1.5, icon: '💧', verb: 'Water the plant', when: w => w.tool === 'bucket' && !p.wet, use: async w => { await w.anim('Farm_Watering', 1500); p.wet = true; p.leaf.rotation.z = 0; p.leaf.scale.set(1.15, 1.2, 1.15); const f = B('flowerpop'); f.position.set(p.x, 0, p.z); w.world.add(f);
      if (w.plants.every(z => z.wet)) { w.putDown(); w.bucketObj.visible = true; w.done('water'); } } }));
    w.thing({ id: 'shop', x: 23, z: 1.55, r: 2.3, icon: '🛒', verb: 'Buy Sister Grace’s groceries', stand: [23, 3.5], when: w => w.shopTrip && !w.gotGroceries, use: shopVisit });
    w.thing({ id: 'rubbish', x: 2.8, z: -11.4, h: 1.0, icon: '🗑️', verb: 'Take out the rubbish', stand: [2.6, -10.2], when: w => w.quests.some(q => q.id === 'rubbish' && !q.done) && !w.carrying && !w.tool, use: rubbishBag });
    w.thing({ id: 'bin', x: 2.4, z: 3.6, h: 1.1, icon: '🗑️', verb: 'Put it in the bin', when: w => w.carrying === 'rubbish', use: async w => { w.drop(); await w.anim('Interact', 700); w.done('rubbish'); } });
    void shopk; void van; void posts;
  },
  begin(w) { w.setQuests([{ id: 'meet', text: 'Talk to your counsellor by the van' }]); w.ui.banner('Sister Grace’s Street', 'Saturday, 3 p.m. Your class is visiting.', 2600); },
};

/* ---------- the story ---------- */
const WHO = { c: 'Counsellor Ann', g: 'Sister Grace', s: 'Mr Persaud' };
function graceReady(w) {
  if (!w.isDone('meet')) return false;
  if (w.carrying === 'basket' || w.carrying === 'groceries') return true;
  if (!w.isDone('basket')) return false;
  const jobs = ['sweep', 'water', 'shop', 'rubbish'];
  return jobs.every(j => w.isDone(j)) && !w.isDone('gather');
}
async function talkCounsellor(w) {
  const c = w.npcs.counsellor; w.faceEach(c);
  if (!w.isDone('meet')) {
    await w.say(WHO.c, 'Happy Sabbath! Today our class is visiting Sister Grace. She is 84 and lives alone. Her knees are bad, so she can’t get out much.', { icon: '🙋🏾‍♀️' });
    await w.ask({ who: WHO.c, icon: '🙋🏾‍♀️', q: 'Why do we visit together, with me, and not on our own?', opts: ['It’s safer. We never visit someone’s home on our own.', 'Because it’s faster that way.', 'So someone can film it for social media.'], right: 0,
      why: 'Go as a group, with an adult. Your leader also asks first and sets a time that suits them.' });
    await w.say(WHO.c, 'I phoned her yesterday, and she said 3 o’clock suits her. Bring the fruit basket from the van. Something small is perfect.', { icon: '🙋🏾‍♀️' });
    w.done('meet', 50); w.addQuest({ id: 'basket', text: 'Bring the fruit basket to Sister Grace' });
    w.walkNpc(c, [[0, 7.8], [0, 3.4], [1.8, -3.6], [2.6, -5.2]], n => { w.face(n, -1.6, -6.5); n.anim = 'Idle_Loop'; });
    w.walkNpc(w.npcs.pf1, [[-1.2, 7.4], [-0.6, 3.6], [-3.0, -3.4]], n => { w.face(n, -1.6, -6.5); });
    w.walkNpc(w.npcs.pf2, [[-0.4, 7.9], [0.4, 3.4], [-0.2, -3.2]], n => { w.face(n, -1.6, -6.5); });
    return;
  }
  // the errand
  await w.say(WHO.c, 'Shall we go to Mr Persaud’s shop for Sister Grace? I’ll come with you. Errands are done with an adult.', { icon: '🙋🏾‍♀️' });
  w.shopTrip = true; w.follow(c); w.ui.toast('Mr Persaud’s shop is down the street, to the right');
}
async function talkGrace(w) {
  const g = w.npcs.grace; w.face(w.pc, -1.6, -6.5);
  if (w.carrying === 'basket') {
    w.drop(); const b = new THREE.Mesh(prop('basket'), MAT.flat); w.add(b, 1.2, 0.81, -6.6);
    await w.say(WHO.g, 'Oh my! Mangoes and bananas! Come, come, children.', { icon: '👵🏾' });
    await w.ask({ who: WHO.g, icon: '👵🏾', q: 'Sister Grace is in her rocking chair. How do you greet her?', opts: ['Say your name, smile, and sit down at her eye level', 'Stand over her and talk loudly', 'Wave from the gate and check your phone'], right: 0,
      why: 'Sit at eye level and face her. Many older people hear better when they can see your face. Phones away.' });
    await w.say(WHO.g, 'When I was a girl we carried water from the standpipe in buckets, and on Sunday afternoons the whole family walked on the seawall.', { icon: '👵🏾' });
    await w.say(WHO.g, 'Did I tell you about the standpipe? We carried the water in buckets, you know…', { icon: '👵🏾' });
    await w.ask({ who: WHO.g, icon: '👵🏾', q: 'She starts the same story again. What do you do?', opts: ['Listen kindly and ask her a question about it', 'Tell her she already told you', 'Start talking about your phone game'], right: 0,
      why: 'Listen kindly anyway. It matters to her. “Swift to hear, slow to speak” (James 1:19).' });
    await w.say(WHO.g, 'You are good children. The mango tree drops leaves all over the yard, my plants are thirsty, the rubbish needs to go out, and I need a few things from Mr Persaud’s shop. But don’t tire yourselves!', { icon: '👵🏾' });
    await w.ask({ who: WHO.c, icon: '🙋🏾‍♀️', q: 'Before you start, what is the rule for helping in someone’s home?', opts: ['Ask first, then help', 'Do whatever you think is best', 'Move things wherever they look tidy'], right: 0, why: 'Ask before you move anything. It’s her home.' });
    w.done('basket'); [['sweep', 'Sweep the leaves under the mango tree'], ['water', 'Water the four plants by the fence'], ['shop', 'Fetch groceries from the shop (with your counsellor)'], ['rubbish', 'Take the rubbish to the bin']].forEach(([id, text]) => w.addQuest({ id, text }));
    w.ui.banner('Four jobs', 'Do them in any order', 2200); return;
  }
  if (w.carrying === 'groceries') {
    w.drop(); const gb = new THREE.Mesh(prop('grocery'), MAT.flat); w.add(gb, 1.7, 0.81, -6.5);
    await w.say(WHO.g, 'Bread, rice, bananas and milk, and the change and the receipt too. Thank you, darling.', { icon: '👵🏾' });
    w.done('shop'); const c = w.npcs.counsellor; w.follow(c, false); w.walkNpc(c, [[2.6, -5.2]], n => w.face(n, -1.6, -6.5)); return;
  }
  // everyone gathers round: read, sing, pray, close
  ['pf1', 'pf2', 'counsellor'].forEach(id => w.face(w.npcs[id], -1.6, -6.5));
  const v = await w.choose({ who: WHO.g, icon: '👵🏾', q: 'Sister Grace asks you to read her a Bible promise. Which one?', opts: VERSES.map(x => x[0]), keep: true });
  await w.say(VERSES[v][0] + ' (KJV)', '“' + VERSES[v][1] + '”', { icon: '📖', next: 'Amen ▶' });
  await w.say(WHO.g, 'That one is a favourite of mine. Read it again next time, eh?', { icon: '👵🏾' });
  const h = await w.choose({ who: 'Everyone', icon: '🎵', q: 'Which hymn do you sing together?', opts: ['Amazing Grace', 'What a Friend We Have in Jesus', 'Blessed Assurance'] });
  ['pf1', 'pf2', 'counsellor'].forEach(id => w.npcs[id].play('Idle_Talking_Loop', { fade: 0.3 })); w.pc.play('Idle_Talking_Loop', { fade: 0.3 }); w.ui.banner('🎵 ' + ['Amazing Grace', 'What a Friend We Have in Jesus', 'Blessed Assurance'][h], 'Sister Grace sings along', 2600);
  await new Promise(r => setTimeout(r, 2800));
  ['pf1', 'pf2', 'counsellor'].forEach(id => w.npcs[id].play('Idle_Loop', { fade: 0.3 }));
  await w.ask({ who: WHO.c, icon: '🙋🏾‍♀️', q: 'How do you pray with her?', opts: ['Ask if you may pray with her, and keep it short and personal', 'Pray for 20 minutes about everything you can think of', 'Leave without asking'], right: 0, why: 'Ask first. A short, personal prayer means a lot.' });
  await w.ask({ who: WHO.c, icon: '🙋🏾‍♀️', q: 'You’ve been here 40 minutes, and Sister Grace looks tired. What now?', opts: ['Say goodbye, and plan the next visit with her', 'Stay another two hours', 'Leave quietly without saying goodbye'], right: 0,
    why: 'About 30 to 45 minutes is enough for someone who is unwell. Then keep your promise to come back. Adopting someone means helping more than once.' });
  await w.say(WHO.g, 'God bless you, my children. Come back soon, eh? Next Sabbath?', { icon: '👵🏾', next: 'We will! ▶' });
  w.done('gather', 200); w.npcs.grace.play('Sitting_Idle_Loop'); w.finish({ title: 'Sister Grace says thank you!', list: ['Remember', [['Matthew 25:40', '“Inasmuch as ye have done it unto one of the least of these my brethren, ye have done it unto me.”']]] });
}
async function shopVisit(w) {
  const s = w.npcs.shop; w.faceEach(s);
  await w.say(WHO.s, 'Afternoon! Sister Grace’s usual? Bread, rice, bananas and a tin of milk. Here you go.', { icon: '🧔🏽' });
  await w.ask({ who: WHO.s, icon: '🧔🏽', q: 'Mr Persaud gives you the bag, the receipt and $300 change. What do you do with the change?', opts: ['Give it all back to Sister Grace with the receipt', 'Keep it as a tip for yourself', 'Buy sweets with it'], right: 0,
    why: '“He that is faithful in that which is least is faithful also in much” (Luke 16:10).' });
  w.gotGroceries = true; w.carry('groceries', new THREE.Mesh(prop('grocery'), MAT.flat)); w.ui.toast('Take the groceries to Sister Grace');
}
async function rubbishBag(w) {
  await w.ask({ who: 'By the back steps', icon: '📦', q: 'Next to the rubbish bag there is an old shoebox full of photos. What do you do?', opts: ['Ask Sister Grace before you move it', 'Throw it out with the rubbish', 'Take a few photos home'], right: 0, why: 'Ask before you move anything.' });
  await w.say(WHO.g + ' (calling from her chair)', 'Those are photos of my husband, Lionel! Thank you for asking. Put them on my table, please.', { icon: '👵🏾' });
  w.boxObj.position.set(0.9, 0.81, -6.8); w.world.remove(w.bagObj); w.carry('rubbish', new THREE.Mesh(prop('rubbish'), MAT.flat), 0.75, 0.32); w.ui.toast('The bin is by the gate');
}
/* sweeping: the broom brushes up any leaf it passes over */
function sweep(w, dt) {
  if (w.tool !== 'broom' || !w.leaves.length) return;
  const p = w.pc.root.position, ry = w.pc.root.rotation.y, bx = p.x + Math.sin(ry) * 0.6, bz = p.z + Math.cos(ry) * 0.6;
  w.leaves = w.leaves.filter(l => { if (Math.hypot(l.position.x - bx, l.position.z - bz) < 0.8 || Math.hypot(l.position.x - p.x, l.position.z - p.z) < 0.5) { w.world.remove(l); return false; } return true; });
  if (w.leaves.length <= 3) { w.leaves.forEach(l => w.world.remove(l)); w.leaves = []; w.putDown(); w.broomObj.visible = true; w.done('sweep'); }
}
function checkJobs(w) {
  if (!w.quests.some(q => q.id === 'gather') && ['sweep', 'water', 'shop', 'rubbish'].every(j => w.isDone(j))) { w.addQuest({ id: 'gather', text: 'Read, sing and pray with Sister Grace' }); w.ui.banner('All four jobs done!', 'Gather round Sister Grace', 2400); }
}
