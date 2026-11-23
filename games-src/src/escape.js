/* Break Free: a 3D escape room (Temperance, HF 2). The door is chained with padlocks. Tap things in the room,
   your Pathfinder walks over, answer what you find to open a padlock. Say no to the temptations. Break free. */
import { THREE, clamp, lerp, damp, rng, hash, today, pick, shuffle, G, P, merge, mesh, MAT, sign, sprite, setSky, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { makeCharacter, myLook } from './character.js';
import { PRESSURES } from './themes.js';
import { DATA } from './data.js';

Object.assign(BUILD, {
  bed: () => merge([P(G.box(2.0, 0.45, 3.0), '#7B5A3A', [0, 0.25, 0]), P(G.box(1.9, 0.25, 2.9), '#F4F1EA', [0, 0.6, 0]), P(G.box(1.9, 0.08, 2.0), '#2F6DB5', [0, 0.75, 0.45]), P(G.box(1.2, 0.2, 0.55), '#FFFFFF', [0, 0.82, -1.1]), P(G.box(2.0, 1.1, 0.12), '#7B5A3A', [0, 0.8, -1.5])]),
  desk: () => merge([P(G.box(2.2, 0.1, 1.0), '#A8743F', [0, 1.0, 0]), ...[[-1, -0.42], [-1, 0.42], [1, -0.42], [1, 0.42]].map(([x, z]) => P(G.box(0.08, 1.0, 0.08), '#6E4B2C', [x, 0.5, z])), P(G.box(0.7, 0.5, 0.9), '#8E5F33', [0.65, 0.45, 0])]),
  laptop: () => merge([P(G.box(0.7, 0.04, 0.48), '#3A3F47', [0, 0.02, 0]), P(G.box(0.7, 0.46, 0.04), '#3A3F47', [0, 0.25, -0.24], [-0.25, 0, 0]), P(G.box(0.62, 0.38, 0.01), '#7FC4FF', [0, 0.25, -0.215], [-0.25, 0, 0])]),
  shelf: () => { const p = [P(G.box(1.8, 2.4, 0.45), '#8A5A2B', [0, 1.2, 0])]; const cols = ['#B5452C', '#2F6DB5', '#2E7D4F', '#E9B649', '#7B3FB8', '#F4F1EA'];
    for (let r = 0; r < 4; r++) { p.push(P(G.box(1.7, 0.05, 0.42), '#6E4424', [0, 0.25 + r * 0.55, 0.02])); for (let i = 0; i < 9; i++) p.push(P(G.box(0.12, 0.38 + (i % 3) * 0.05, 0.3), cols[(i + r) % 6], [-0.72 + i * 0.17, 0.47 + r * 0.55, 0.05])); } return merge(p); },
  wardrobe: () => merge([P(G.box(1.6, 2.6, 0.7), '#C9A46A', [0, 1.3, 0]), P(G.box(0.02, 2.4, 0.02), '#6E4B2C', [0, 1.3, 0.36]), P(G.box(0.06, 0.3, 0.06), '#D4A93A', [-0.12, 1.4, 0.37]), P(G.box(0.06, 0.3, 0.06), '#D4A93A', [0.12, 1.4, 0.37])]),
  rug: (c = '#B5452C') => merge([P(G.cyl(1.6, 1.6, 0.03, 20), c, [0, 0.015, 0]), P(G.cyl(1.2, 1.2, 0.035, 20), '#F2C14E', [0, 0.02, 0])]),
  lamp2: () => merge([P(G.cyl(0.2, 0.25, 0.06, 10), '#2A2D33', [0, 0.03, 0]), P(G.cyl(0.03, 0.03, 1.5, 6), '#2A2D33', [0, 0.8, 0]), P(G.cyl(0.18, 0.32, 0.35, 10), '#F7E7B8', [0, 1.6, 0])]),
  fridge: () => merge([P(G.box(1.0, 2.1, 0.8), '#E9EDF0', [0, 1.05, 0]), P(G.box(0.04, 0.5, 0.04), '#9AA3AE', [0.38, 1.5, 0.41]), P(G.box(0.98, 0.02, 0.02), '#C9CED3', [0, 1.3, 0.41])]),
  stove: () => merge([P(G.box(1.0, 1.0, 0.75), '#F4F4F4', [0, 0.5, 0]), P(G.box(0.96, 0.03, 0.7), '#2A2D33', [0, 1.01, 0]), ...[[-0.25, -0.17], [0.25, -0.17], [-0.25, 0.17], [0.25, 0.17]].map(([x, z]) => P(G.cyl(0.12, 0.12, 0.02, 12), '#55585F', [x, 1.035, z])), P(G.box(0.7, 0.45, 0.02), '#2A2D33', [0, 0.45, 0.38])]),
  table: () => merge([P(G.box(1.8, 0.08, 1.1), '#A8743F', [0, 0.8, 0]), ...[[-0.8, -0.45], [-0.8, 0.45], [0.8, -0.45], [0.8, 0.45]].map(([x, z]) => P(G.box(0.08, 0.8, 0.08), '#6E4B2C', [x, 0.4, z]))]),
  chair: () => merge([P(G.box(0.5, 0.06, 0.5), '#8A5A2B', [0, 0.48, 0]), P(G.box(0.5, 0.6, 0.06), '#8A5A2B', [0, 0.8, -0.22]), ...[[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]].map(([x, z]) => P(G.box(0.05, 0.48, 0.05), '#6E4B2C', [x, 0.24, z]))]),
  fruitbowl: () => merge([P(G.cyl(0.3, 0.2, 0.15, 12), '#F4F1EA', [0, 0.08, 0]), P(G.ball(0.1, 6, 4), '#F2A23A', [-0.08, 0.2, 0]), P(G.ball(0.1, 6, 4), '#D3243A', [0.1, 0.2, 0.04]), P(G.ball(0.09, 6, 4), '#9CC34A', [0.02, 0.22, -0.1]), P(G.cap(0.05, 0.2, 6), '#F2D23A', [0, 0.26, 0.08], [0, 0, 1.2])]),
  cupboard: () => merge([P(G.box(2.2, 1.0, 0.7), '#E9DCC0', [0, 0.5, 0]), P(G.box(2.24, 0.05, 0.74), '#6E6A62', [0, 1.02, 0]), P(G.box(2.2, 0.8, 0.45), '#E9DCC0', [0, 2.1, -0.12]), ...[-0.55, 0.55].flatMap(x => [P(G.box(0.02, 0.85, 0.02), '#A99F8B', [x, 0.5, 0.36]), P(G.box(0.02, 0.7, 0.02), '#A99F8B', [x, 2.1, 0.11])])]),
  sink: () => merge([P(G.box(1.2, 1.0, 0.7), '#E9DCC0', [0, 0.5, 0]), P(G.box(0.6, 0.12, 0.4), '#C9CED3', [0, 0.97, 0]), P(G.cyl(0.02, 0.02, 0.3, 6), '#9AA3AE', [0, 1.15, -0.2]), P(G.box(0.02, 0.02, 0.15), '#9AA3AE', [0, 1.3, -0.13])]),
  lockers: () => { const p = []; const cols = ['#2F6DB5', '#2F6DB5', '#B5452C', '#2F6DB5']; for (let i = 0; i < 4; i++) { p.push(P(G.box(0.58, 2.2, 0.6), cols[i], [-0.9 + i * 0.6, 1.1, 0]), P(G.box(0.3, 0.04, 0.01), '#1B1D22', [-0.9 + i * 0.6, 1.9, 0.31]), P(G.box(0.3, 0.04, 0.01), '#1B1D22', [-0.9 + i * 0.6, 1.8, 0.31]), P(G.box(0.04, 0.12, 0.03), '#C9CED3', [-0.72 + i * 0.6, 1.2, 0.31])); } return merge(p); },
  bench2: () => merge([P(G.box(2.2, 0.08, 0.45), '#A8743F', [0, 0.45, 0]), P(G.box(0.08, 0.45, 0.35), '#55585F', [-0.9, 0.22, 0]), P(G.box(0.08, 0.45, 0.35), '#55585F', [0.9, 0.22, 0])]),
  weights: () => merge([P(G.box(1.6, 0.06, 0.5), '#2A2D33', [0, 0.9, 0]), P(G.box(0.06, 0.9, 0.06), '#2A2D33', [-0.75, 0.45, 0]), P(G.box(0.06, 0.9, 0.06), '#2A2D33', [0.75, 0.45, 0]), ...[-0.5, -0.1, 0.3].flatMap((x, i) => [P(G.cyl(0.07, 0.07, 0.45, 8), '#9AA3AE', [x, 1.0, 0], [0, 0, Math.PI / 2]), P(G.cyl(0.12 + i * 0.02, 0.12 + i * 0.02, 0.06, 10), '#1B1D22', [x - 0.2, 1.0, 0], [0, 0, Math.PI / 2]), P(G.cyl(0.12 + i * 0.02, 0.12 + i * 0.02, 0.06, 10), '#1B1D22', [x + 0.2, 1.0, 0], [0, 0, Math.PI / 2])])]),
  mirror: () => merge([P(G.box(1.2, 1.8, 0.06), '#D4A93A', [0, 1.5, 0]), P(G.box(1.08, 1.68, 0.02), '#CFE7F2', [0, 1.5, 0.035])]),
  cooler: () => merge([P(G.box(0.5, 1.0, 0.5), '#E9EDF0', [0, 0.5, 0]), P(G.cyl(0.2, 0.2, 0.5, 12), '#7FC4FF', [0, 1.25, 0]), P(G.box(0.05, 0.05, 0.08), '#2F6DB5', [0, 0.8, 0.27])]),
  plant: () => merge([P(G.cyl(0.25, 0.2, 0.45, 10), '#B5452C', [0, 0.22, 0]), P(G.ico(0.45, 0), '#4E8F3A', [0, 0.85, 0]), P(G.ico(0.32, 0), '#5E9C47', [0.2, 1.1, 0.1])]),
  door: () => merge([P(G.box(1.5, 2.7, 0.1), '#8A5A2B', [0.75, 1.35, 0]), P(G.box(1.3, 1.1, 0.03), '#7B4E26', [0.75, 1.95, 0.06]), P(G.box(1.3, 1.1, 0.03), '#7B4E26', [0.75, 0.75, 0.06]), P(G.ball(0.06, 8, 6), '#D4A93A', [1.3, 1.3, 0.1])]),
  doorframe: () => merge([P(G.box(0.18, 2.9, 0.3), '#E9DCC0', [-0.09, 1.45, 0]), P(G.box(0.18, 2.9, 0.3), '#E9DCC0', [1.59, 1.45, 0]), P(G.box(1.86, 0.18, 0.3), '#E9DCC0', [0.75, 2.85, 0])]),
  chain: (len = 2.6) => { const p = []; const n = Math.round(len / 0.16); for (let i = 0; i < n; i++) p.push(P(G.tor(0.08, 0.022, 4, 8), '#8E959E', [0, (i - n / 2) * 0.16, 0], [0, i % 2 ? Math.PI / 2 : 0, 0])); return merge(p); },
  padlock: () => merge([P(G.box(0.34, 0.3, 0.14), '#D4A93A', [0, 0, 0]), P(G.tor(0.11, 0.03, 5, 10, Math.PI), '#C9CED3', [0, 0.15, 0]), P(G.cyl(0.03, 0.03, 0.03, 8), '#3A2A10', [0, -0.02, 0.075], [Math.PI / 2, 0, 0])]),
  can: () => merge([P(G.cyl(0.07, 0.07, 0.2, 10), '#39D353', [0, 0.1, 0]), P(G.cyl(0.071, 0.071, 0.03, 10), '#EDEDED', [0, 0.2, 0])]),
  phonesmall: () => merge([P(G.box(0.16, 0.02, 0.3), '#1B1D22', [0, 0.01, 0]), P(G.box(0.14, 0.005, 0.27), '#7FC4FF', [0, 0.022, 0])]),
  vapesmall: () => merge([P(G.cyl(0.03, 0.03, 0.22, 8), '#353A42', [0, 0.03, 0], [0, 0, Math.PI / 2]), P(G.box(0.04, 0.012, 0.015), '#38E1F2', [0, 0.06, 0])]),
  pillbottle: () => merge([P(G.cyl(0.06, 0.06, 0.16, 10), '#E9A23A', [0, 0.08, 0]), P(G.cyl(0.065, 0.065, 0.05, 10), '#F4F4F4', [0, 0.18, 0])]),
});

const T_ROOMS = [
  { name: 'My bedroom', door: -3.95, win: 3.0, floor: '#C9A46A', wall: '#DCE8F2', wall2: '#CFE0EE', q: () => DATA.Q.temperance, rug: '#2F6DB5',
    things: [
      { id: 'phone', kind: 'clue', icon: '📱', label: 'The phone on the bed', p: ['phonesmall'], at: [-2.6, 0.84, 0.7], hit: [0.6, 0.4, 0.6], stand: [-1.3, 0.9] },
      { id: 'laptop', kind: 'clue', icon: '💻', label: 'The laptop', p: ['laptop'], at: [1.6, 1.05, -3.55], hit: [0.9, 0.7, 0.7], stand: [1.6, -2.4] },
      { id: 'shelf', kind: 'clue', icon: '📚', label: 'The bookshelf', p: ['shelf'], at: [-4.15, 0, -2.4], ry: Math.PI / 2, hit: [0.6, 2.4, 1.8], stand: [-3.0, -2.4] },
      { id: 'poster', kind: 'clue', icon: '🖼️', label: 'The poster', sign: ['MY BODY', 'IS A TEMPLE', '1 Cor 6:19'], at: [-1.6, 1.9, -4.38], hit: [1.4, 1.6, 0.4], stand: [-1.6, -3.0] },
      { id: 'energy', kind: 'tempt', icon: '⚡', label: 'An energy drink', p: ['can'], at: [2.3, 1.05, -3.4], hit: [0.4, 0.5, 0.4], stand: [2.4, -2.4],
        ask: 'There’s an energy drink on your desk. “Drink it and stay up all night!”', yes: 'Drink it', no: 'No thanks, I’ll sleep', fact: PRESSURES.energy.fact },
    ],
    decor: [['bed', [-2.9, 0, 1.0], 0], ['desk', [1.6, 0, -3.6], 0], ['wardrobe', [-4.05, 0, 2.6], Math.PI / 2], ['lamp2', [3.6, 0, -3.6], 0], ['plant', [-0.2, 0, -3.9], 0], ['chair', [1.4, 0, -2.8], Math.PI]] },
  { name: 'The kitchen', door: 1.8, win: -1.4, floor: '#BFB7A8', wall: '#F2E6C8', wall2: '#EADBB8', q: () => DATA.Q.nutrition, rug: '#2E7D4F',
    things: [
      { id: 'fridge', kind: 'clue', icon: '🧊', label: 'The fridge', p: ['fridge'], at: [-3.8, 0, -3.8], ry: Math.PI / 4, hit: [1.2, 2.2, 1.2], stand: [-2.6, -2.6] },
      { id: 'stove', kind: 'clue', icon: '🍳', label: 'The stove', p: ['stove'], at: [0.4, 0, -4.0], hit: [1.1, 1.2, 0.9], stand: [0.4, -2.9] },
      { id: 'bowl', kind: 'clue', icon: '🍎', label: 'The fruit bowl', p: ['fruitbowl'], at: [0.6, 0.84, 1.0], hit: [0.7, 0.6, 0.7], stand: [0.6, 2.2] },
      { id: 'cupboard', kind: 'clue', icon: '🗄️', label: 'The cupboard', p: ['cupboard'], at: [-4.1, 0, 0.6], ry: Math.PI / 2, hit: [0.8, 2.6, 2.3], stand: [-2.8, 0.6] },
      { id: 'bet', kind: 'tempt', icon: '🎰', label: 'A message on the phone', p: ['phonesmall'], at: [1.4, 0.86, 0.8], hit: [0.5, 0.4, 0.5], stand: [1.6, 2.1],
        ask: 'A message pops up: “Bet $1,000 and win big tonight! 🎰”', yes: 'Place the bet', no: 'Delete it', fact: PRESSURES.betting.fact },
    ],
    decor: [['table', [0.6, 0, 1.0], 0], ['chair', [-0.6, 0, 1.0], Math.PI / 2], ['chair', [1.8, 0, 1.0], -Math.PI / 2], ['sink', [-1.4, 0, -4.0], 0], ['plant', [3.8, 0, -3.8], 0]] },
  { name: 'The locker room', door: 1.8, win: 0.7, floor: '#9FB3C2', wall: '#E3ECF2', wall2: '#D3E0EA', q: () => DATA.Q.fitness, rug: null,
    things: [
      { id: 'lockers', kind: 'clue', icon: '🔐', label: 'The lockers', p: ['lockers'], at: [-1.6, 0, -4.1], hit: [2.4, 2.3, 0.7], stand: [-1.6, -2.8] },
      { id: 'bench', kind: 'clue', icon: '🪑', label: 'The bench', p: ['bench2'], at: [0.6, 0, 0.6], hit: [2.2, 0.6, 0.5], stand: [0.6, 1.7] },
      { id: 'weights', kind: 'clue', icon: '🏋️', label: 'The weights', p: ['weights'], at: [-3.8, 0, 0.8], ry: Math.PI / 2, hit: [0.6, 1.2, 1.7], stand: [-2.6, 0.8] },
      { id: 'mirror', kind: 'clue', icon: '🪞', label: 'The mirror', p: ['mirror'], at: [-4.38, 0, -2.6], ry: Math.PI / 2, hit: [0.2, 1.9, 1.3], stand: [-3.2, -2.6] },
      { id: 'pills', kind: 'tempt', icon: '💊', label: 'A bottle of pills', p: ['pillbottle'], at: [1.4, 0.49, 0.6], hit: [0.4, 0.4, 0.4], stand: [1.6, 1.7],
        ask: 'Someone left pills on the bench: “These make you stronger fast. Take some.”', yes: 'Take some', no: 'No. I won’t take pills that aren’t mine', fact: PRESSURES.pills.fact },
    ],
    decor: [['cooler', [3.8, 0, -3.9], 0], ['plant', [3.8, 0, 3.0], 0]] },
];

export const ESCAPES = {
  breakfree: {
    key: 'breakfree', gid: 'escape:free', title: 'Break Free', topic: 'temperance', icon: '🔓', music: 'calm', kind: 'escape',
    blurb: 'An escape room. The door is chained shut. Tap things in the room, answer what you find to open each padlock, and say no to the temptations.',
    howTo: 'Tap things in the room. Drag to turn the room.',
    sky: { top: '#2A2F45', bottom: '#5A5F7A', fogNear: 60, fogFar: 140, sun: '#FFF1DA', sunI: 2.0, sunPos: [5, 10, 8], hemi: 1.6, skyLight: '#FFFFFF', groundLight: '#7A6A5A' },
    modes: { levels: ['🚪', 'Rooms', 'Three rooms: bedroom, kitchen, locker room.'], daily: ['📅', 'Daily Escape', 'One room, the same for everyone today. Fastest wins.'], practice: ['🎯', 'Practice', 'No clock. Take your time.'] },
    levels: 3, levelName: 'Room', levelTitles: T_ROOMS.map(r => r.name), board: 'daily',
  },
};

export class Escape {
  constructor(eng, key, mode, opt, ui) {
    this.eng = eng; this.T = ESCAPES[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui; this.noSwipe = true;
    this.seed = mode === 'daily' ? hash(today() + key) : (Math.random() * 1e9) >>> 0; this.r = rng(this.seed);
    this.level = mode === 'levels' ? (this.opt.level || 1) : 0;
    this.room = T_ROOMS[mode === 'daily' ? Math.floor(this.r() * 3) : mode === 'levels' ? (this.level - 1) % 3 : 0];
  }
  async load(progress) { progress && progress(0.3); this.pc = await makeCharacter(myLook()); progress && progress(0.9); this.build(); progress && progress(1); }
  build() {
    const { scene } = this.eng, R = this.room; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky); scene.fog = null;
    const p = [P(G.box(9, 0.3, 9), R.floor, [0, -0.15, 0]), P(G.box(9.2, 3.6, 0.22), R.wall, [0, 1.8, -4.6]), P(G.box(0.22, 3.6, 9.2), R.wall2, [-4.6, 1.8, 0]), P(G.box(9.2, 0.16, 0.26), '#FFFFFF', [0, 0.08, -4.48]), P(G.box(0.26, 0.16, 9.2), '#FFFFFF', [-4.48, 0.08, 0])];
    for (let i = 0; i < 9; i++) p.push(P(G.box(0.02, 0.005, 9), shade(R.floor, -12), [-4.5 + i, 0.002, 0]));
    p.push(P(G.box(1.8, 1.2, 0.05), '#BFE3F2', [R.win, 2.0, -4.47]), P(G.box(1.9, 0.08, 0.1), '#FFFFFF', [R.win, 1.4, -4.45]));
    this.roomMesh = mesh(merge(p)); scene.add(this.roomMesh);
    if (R.rug) { const rg = mesh(prop('rug', R.rug)); rg.position.set(0.4, 0, -0.6); scene.add(rg); }
    R.decor.forEach(([n, at, ry]) => { const m = mesh(prop(n)); m.position.set(...at); m.rotation.y = ry; scene.add(m); });
    // the door, chained shut with one padlock per clue
    this.doorG = new THREE.Group(); this.doorG.position.set(R.door, 0, -4.48); scene.add(this.doorG);
    this.doorG.add(mesh(prop('doorframe'))); this.doorLeaf = new THREE.Group(); this.doorLeaf.add(mesh(prop('door'))); this.doorG.add(this.doorLeaf); this.doorLeaf.position.z = 0.02;
    this.light = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.7), new THREE.MeshBasicMaterial({ color: '#FFF6D8' })); this.light.position.set(0.75, 1.35, -0.06); this.doorG.add(this.light);
    const exit = sign(['EXIT 🚪'], 1.2, 0.4, { bg: '#2E9E57', fg: '#FFFFFF', r: 10 }); exit.position.set(0.75, 3.15, 0.16); this.doorG.add(exit);
    this.chains = new THREE.Group(); this.doorG.add(this.chains);
    [[0.75, 1.4, 0.75], [0.75, 1.4, -0.75]].forEach(([x, y, a]) => { const c = mesh(prop('chain', 3.0)); c.position.set(x, y, 0.18); c.rotation.z = a; this.chains.add(c); });
    const clues = R.things.filter(t => t.kind === 'clue');
    this.locks = clues.map((c, i) => { const l = mesh(prop('padlock')); l.position.set(0.35 + (i % 2) * 0.8, 1.75 - Math.floor(i / 2) * 0.65, 0.3); this.chains.add(l);
      const n = sprite([String(i + 1)], 0.28, 0.28, { bg: '#1F4D3A', fg: '#F2C14E', w: 128, h: 128, r: 64 }); n.position.set(0, -0.28, 0.05); l.add(n); return { m: l, open: false, id: c.id }; });
    // the things to tap
    this.things = R.things.map(t => {
      let obj;
      if (t.sign) { obj = sign(t.sign, 1.3, 1.5, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); }
      else { obj = new THREE.Group(); t.p.forEach(n => obj.add(mesh(prop(n)))); }
      obj.position.set(...t.at); if (t.ry) obj.rotation.y = t.ry; scene.add(obj);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(...t.hit), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(t.at[0], t.at[1] + t.hit[1] / 2 - (t.sign ? t.hit[1] / 2 : 0), t.at[2]); hit.userData.thing = t; scene.add(hit);
      const sp = sprite(['✨'], 0.55, 0.55, { bg: null, w: 128, h: 128 }); sp.position.set(t.at[0], t.at[1] + t.hit[1] + 0.45 - (t.sign ? t.hit[1] / 2 : 0), t.at[2]); scene.add(sp);
      return Object.assign({ obj, hitM: hit, sp, done: false, tries: 0 }, t);
    });
    scene.add(this.pc.root); this.pc.root.position.set(1.0, 0, 2.6); this.pc.root.rotation.y = Math.PI; this.pc.play('Idle_Loop');
    this.qpool = shuffle(this.r, this.room.q().slice()); this.qi = 0;
    this.camA = 0.75; this.reset();
  }
  reset() {
    this.t = 0; this.mistakes = 0; this.tempted = 0; this.resisted = 0; this.busy = false; this.walk = null; this.state = 'intro'; this.introT = 0; this.ended = false; this.facts = []; this.hud(true);
  }
  go() { if (this.state !== 'intro') return; this.state = 'play'; SND.unlock(); SND.startMusic('calm'); this.ui.banner(this.room.name, 'Open all ' + this.locks.length + ' padlocks to break free', 2600); }
  input() {}
  press(x, y) { this.pressX = x; this.pressA = this.camA; this.dragging = false; }
  drag(x, y, dx) { if (Math.abs(dx) > 8) this.dragging = true; this.camA = clamp(this.pressA - dx * 0.006, 0.15, 1.4); }
  release() {}
  tapAt(x, y) {
    if (this.state === 'intro') { this.go(); return; }
    if (this.state !== 'play' || this.busy || this.dragging) return;
    const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), this.eng.camera);
    const hits = rc.intersectObjects(this.things.map(t => t.hitM), false); if (!hits.length) return;
    const t = hits[0].object.userData.thing, th = this.things.find(z => z.id === t.id); if (th.done) { this.ui.toast('Already done ✓'); return; }
    this.busy = true; SND.lane(); this.walkTo(th.stand, th.at, () => this.use(th));
  }
  walkTo(xz, look, then) { this.walk = { to: new THREE.Vector3(xz[0], 0, xz[1]), look: new THREE.Vector3(look[0], 0, look[2]), then }; this.pc.play('Walk_Loop', { fade: 0.15 }); }
  async use(th) {
    this.pc.play('Interact', { once: true, fade: 0.15 });
    await wait(500);
    if (th.kind === 'tempt') {
      const c = await this.ui.card({ tag: 'Temptation', icon: th.icon, title: th.label, text: th.ask, opts: [th.no, th.yes], primary: 0 });
      if (c === 0) { this.resisted++; this.t = Math.max(0, this.t - 10); SND.good(); this.ui.cardFeedback(true, '“Temperance” is self-control: a fruit of the Spirit (Galatians 5:23). 10 seconds off your time!'); }
      else { this.tempted++; this.t += 20; SND.bad(); this.ui.cardFeedback(false, th.fact + ' (+20 seconds)'); this.facts.push([th.label, th.fact]); }
      th.done = true; th.sp.visible = false; await wait(2600); this.ui.closeCard(); this.idle(); return;
    }
    const q = this.nextQ(); const lockNo = this.locks.findIndex(l => l.id === th.id) + 1;
    const opts = q[1].map((o, i) => [o, i]); const order = q[1].length === 2 ? opts : shuffle(this.r, opts);
    const c = await this.ui.card({ tag: '🔒 Padlock ' + lockNo, icon: th.icon, title: q[0], who: th.label, opts: order.map(o => o[0]) });
    const ok = order[c][1] === q[2];
    if (ok) { SND.good(); this.ui.cardFeedback(true, q[3] || 'Correct!'); th.done = true; th.sp.visible = false; await wait(1800); this.ui.closeCard(); this.unlock(th.id); }
    else { this.mistakes++; th.tries++; this.t += this.mode === 'practice' ? 0 : 10; SND.bad(); this.ui.cardFeedback(false, 'The answer: ' + q[1][q[2]] + '. ' + (q[3] || '') + ' Try this one again for a new question.'); await wait(3200); this.ui.closeCard(); }
    this.idle();
  }
  nextQ() { if (this.qi >= this.qpool.length) { this.qpool = shuffle(this.r, this.room.q().slice()); this.qi = 0; } return this.qpool[this.qi++]; }
  idle() { this.busy = false; if (this.state === 'play') this.pc.play('Idle_Loop', { fade: 0.25 }); }
  unlock(id) {
    const l = this.locks.find(z => z.id === id); l.open = true; l.fall = 0; SND.power();
    const left = this.locks.filter(z => !z.open).length; this.ui.toast(left ? '🔓 Padlock open! ' + left + ' to go' : '🔓 All padlocks open!', 'good');
    if (!left) { this.state = 'free'; this.freeT = 0; this.pc.play('Yes', { once: true, fade: 0.2 }); }
  }
  /* ---------- the frame ---------- */
  idleView(dt) { this.pc.update(dt); const a = 0.75 + Math.sin(this.eng.time * 0.25) * 0.4; this.camPlace(a, innerHeight > innerWidth); }
  camPlace(a, tall) { const c = this.eng.camera, R = tall ? 14.5 : 13.5; c.position.set(Math.sin(a) * R, tall ? 11.5 : 10, Math.cos(a) * R); c.lookAt(-0.3, tall ? -0.6 : 0.6, -0.3); }
  update(dt) {
    const pc = this.pc; pc.update(dt); const tall = innerHeight > innerWidth;
    if (this.state === 'intro') { this.introT += dt; this.camPlace(lerp(1.5, this.camA, clamp(this.introT / 2, 0, 1)), tall); if (this.opt.autostart && this.introT > 2) this.go(); return; }
    this.camPlace(this.camA, tall);
    this.things.forEach(t => { if (t.sp.visible) t.sp.position.y += Math.sin(this.eng.time * 3 + t.at[0]) * 0.004; });
    if (this.state === 'play' && this.mode !== 'practice' && !this.busy) this.t += dt; else if (this.state === 'play' && this.mode !== 'practice') this.t += dt * 0.5;
    if (this.walk) {
      const w = this.walk, pos = pc.root.position, d = w.to.clone().sub(pos); d.y = 0; const dist = d.length();
      if (dist > 0.05) { const step = Math.min(dist, 2.4 * dt); pos.addScaledVector(d.normalize(), step); pc.root.rotation.y = Math.atan2(d.x, d.z); }
      else { const lk = w.look.clone().sub(pos); pc.root.rotation.y = Math.atan2(lk.x, lk.z); const f = w.then; this.walk = null; f && f(); }
    }
    this.locks.forEach(l => { if (l.open && l.fall < 1) { l.fall += dt * 1.5; l.m.position.y -= dt * 3 * l.fall; l.m.rotation.z += dt * 4; if (l.fall >= 1) l.m.visible = false; } });
    if (this.state === 'free') {
      this.freeT += dt;
      if (this.freeT > 0.6 && this.chains.visible) { this.chains.position.y -= dt * 3; this.chains.children.forEach(c => { c.rotation.x += dt * 2; }); if (this.chains.position.y < -1.3) this.chains.visible = false; }
      if (this.freeT > 1.2) this.doorLeaf.rotation.y = -Math.min(1.6, (this.freeT - 1.2) * 1.6);
      if (this.freeT > 2.0 && !this.walk && !this.leaving) { this.leaving = true; this.walkTo([this.room.door + 0.75, -3.6], [this.room.door + 0.75, 0, -6], () => { this.pc.play('Dance_Loop', { fade: 0.3 }); this.end(true); }); }
    }
    this.hud();
  }
  end(won) {
    if (this.ended) return; this.ended = true; this.state = 'won'; SND.stopMusic(); SND.win(); this.ui.banner('You broke free!', this.room.name, 2400);
    const secs = Math.round(this.t), score = Math.max(100, 1500 - secs * 6 - this.mistakes * 60 - this.tempted * 120 + this.resisted * 50);
    const stars = this.mistakes === 0 && this.tempted === 0 && (this.mode === 'practice' || secs <= 120) ? 3 : this.mistakes <= 2 && this.tempted === 0 ? 2 : 1;
    const res = { won: true, score, level: this.level || 1, stars, title: this.room.name + ': you broke free!', save: this.mode === 'daily' ? 'daily' : '',
      stats: [[fmt(secs), 'time'], [this.mistakes, 'wrong answers'], [this.resisted + '/' + (this.resisted + this.tempted), 'said no'], [score, 'points']],
      list: ['Remember', this.facts], correct: 0, wrong: 0, dodged: {} };
    setTimeout(() => this.ui.end(res), 2600);
  }
  hud(force) { const open = this.locks ? this.locks.filter(l => l.open).length : 0; this.ui.hud({ score: open, coins: this.resisted, coinIcon: '🛡️', hearts: null, dist: 0, label: (this.mode === 'practice' ? '' : '⏱ ' + fmt(Math.round(this.t || 0)) + ' · ') + '🔓 ' + open + '/' + (this.locks ? this.locks.length : 4), shield: 0, magnet: 0, double: 0, badges: null }, force); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = s => Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
function shade(hex, amt) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt / 255); return '#' + c.getHexString(); }
