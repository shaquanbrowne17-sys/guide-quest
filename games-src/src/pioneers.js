/* Pioneers Walk (Adventist Pioneers, SD 3): walk through the places where the pioneers lived and worked, from
   William Miller's farm to J. N. Andrews leaving for Switzerland. Each place has a drawn plaque (no photos), a pioneer
   who tells their story, and a question. At the end you pick three stories to tell at worship.
   The facts follow the Adventist Pioneers explorer in the Learning Lab. */
import { THREE, G, P, merge, MAT, sign, SND } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  farmhouse: (c = '#EDE4CF') => merge([P(G.box(5, 3, 4), c, [0, 1.5, 0]), P(G.cyl(0, 3.8, 1.8, 4), '#5A4632', [0, 3.9, 0], [0, PI / 4, 0], [1, 1, 0.75]), P(G.box(1, 1.9, 0.08), '#4A3220', [0, 0.95, 2.02]),
    P(G.box(0.8, 0.8, 0.06), '#BFD8F0', [-1.5, 1.8, 2.02]), P(G.box(0.8, 0.8, 0.06), '#BFD8F0', [1.5, 1.8, 2.02]), P(G.box(0.5, 1.2, 0.5), '#8A4A3A', [1.4, 4.4, -0.6])]),
  hall: () => merge([P(G.box(7, 3.6, 5), '#F2EEE4', [0, 1.8, 0]), P(G.cyl(0, 5, 2, 4), '#3E4A5C', [0, 4.6, 0], [0, PI / 4, 0], [1, 1, 0.72]), P(G.box(1.4, 2.3, 0.08), '#5A3A22', [0, 1.15, 2.52]),
    P(G.box(0.7, 1.4, 0.06), '#BFD8F0', [-2.2, 2.0, 2.52]), P(G.box(0.7, 1.4, 0.06), '#BFD8F0', [2.2, 2.0, 2.52]), P(G.box(1.2, 1.4, 1.2), '#F2EEE4', [0, 5.2, 1.6]), P(G.cone(0.9, 1.6, 4), '#3E4A5C', [0, 6.7, 1.6], [0, PI / 4, 0])]),
  corn: () => { const p = []; for (let i = 0; i < 6; i++) p.push(P(G.cyl(0.03, 0.04, 2.0, 4), '#7FA653', [0, 1.0, -1.25 + i * 0.5]), P(G.box(0.5, 0.03, 0.1), '#8FB65F', [0.2, 1.3, -1.25 + i * 0.5], [0, 0.5 * i, 0.4]), P(G.cyl(0.05, 0.05, 0.25, 5), '#E8C547', [0.06, 1.5, -1.25 + i * 0.5])); return merge(p); },
  press: () => merge([P(G.box(1.6, 0.9, 0.9), '#5A4632', [0, 0.45, 0]), P(G.box(0.12, 1.6, 0.12), '#2E2E33', [-0.7, 1.4, 0]), P(G.box(0.12, 1.6, 0.12), '#2E2E33', [0.7, 1.4, 0]), P(G.box(1.6, 0.18, 0.5), '#2E2E33', [0, 2.15, 0]),
    P(G.cyl(0.05, 0.05, 0.9, 6), '#2E2E33', [0.9, 1.5, 0], [0, 0, PI / 2]), P(G.box(0.9, 0.04, 0.6), '#F4F1EA', [0, 0.93, 0])]),
  chart: () => merge([P(G.box(0.08, 1.8, 0.08), '#6E4424', [-0.9, 0.9, 0]), P(G.box(0.08, 1.8, 0.08), '#6E4424', [0.9, 0.9, 0]), P(G.box(2.0, 1.2, 0.04), '#F4EFE2', [0, 1.4, 0.04])]),
  plaque: () => merge([P(G.box(0.1, 1.1, 0.1), '#4A3A2A', [0, 0.55, 0]), P(G.box(1.2, 0.8, 0.08), '#B8892A', [0, 1.35, 0])]),
  wagonwheel: () => merge([P(G.tor(0.5, 0.05, 4, 14), '#6E4424', [0, 0.5, 0]), ...[0, 1, 2, 3].map(i => P(G.box(0.04, 0.95, 0.04), '#6E4424', [0, 0.5, 0], [0, 0, i * PI / 4]))]),
  lane: (len) => merge([P(G.box(3.2, 0.03, len), '#BFA77A', [0, 0.015, 0])]),
  sea: () => merge([P(G.box(30, 0.04, 12), '#3E7FB0', [0, -0.02, 0])]),
});

const C1840 = { shirt: '#2B2F38', trim: '#1E2126', trousers: '#2B2F38', belt: '#141414', shoes: '#111111', buckle: '#9AA3AE', socks: '#2B2F38', patch: '#2B2F38', rim: '#2B2F38' };
const DRESS = c => ({ shirt: c, trim: c, trousers: c, belt: c, shoes: '#111111', buckle: c, socks: c, patch: c, rim: c });
/* the places, south to north along the lane */
const PLACES = [
  { id: 'miller', who: 'William Miller', years: '1782–1849', where: 'His farm, Low Hampton, New York', z: 30, side: -1, look: { body: 'm', skin: 0, hair: 'parted', hairColor: '#CFCFCF' }, outfit: C1840, build: 'farmhouse', extra: 'chart',
    story: ['I’m William Miller, a Baptist farmer and preacher here in New York.', 'I studied the Bible verse by verse. Daniel 8:14 says: “Unto two thousand and three hundred days; then shall the sanctuary be cleansed.”', 'I preached that Jesus would come around 1844. On 22 October 1844 He did not come. We call it the Great Disappointment.'],
    q: 'Which verse did Miller study about the 2300 days?', opts: ['Daniel 8:14', 'John 3:16', 'Revelation 14:6'], why: '“Unto two thousand and three hundred days; then shall the sanctuary be cleansed.” (Daniel 8:14, KJV)' },
  { id: 'edson', who: 'Hiram Edson', years: '1806–1882', where: 'His cornfield, near Port Gibson, New York', z: 18, side: 1, look: { body: 'm', skin: 0, hair: 'short', hairColor: '#5A4632' }, outfit: { shirt: '#6E5A3C', trim: '#5A4632', trousers: '#3A3F4A' }, build: 'corn',
    story: ['I’m Hiram Edson. The morning after the Disappointment, 23 October 1844, I crossed this cornfield to visit other believers.', 'I understood that the sanctuary in Daniel 8:14 is in heaven. Jesus had begun a new work in the Most Holy Place. He had not come to earth yet.'],
    q: 'Where is the sanctuary Edson understood Daniel 8:14 was talking about?', opts: ['In heaven', 'In Jerusalem', 'In his church'], why: 'Jesus began a new work in the Most Holy Place of the heavenly sanctuary.' },
  { id: 'bates', who: 'Joseph Bates', years: '1792–1872', where: 'The harbour, Fairhaven, Massachusetts', z: 6, side: -1, look: { body: 'm', skin: 0, hair: 'short', hairColor: '#D8D8D8' }, outfit: 'captain', build: 'dock',
    story: ['I’m Joseph Bates. I went to sea as a boy and became a ship’s captain.', 'I gave up alcohol and tobacco long before most people did.', 'In 1845 I accepted the seventh-day Sabbath, and in 1846 I wrote a tract about it. I spent my savings spreading the message.'],
    q: 'What did Joseph Bates accept in 1845 and write about in 1846?', opts: ['The seventh-day Sabbath', 'The health message', 'Foreign missions'], why: 'Bates: the sea captain of the Sabbath.' },
  { id: 'ellen', who: 'Ellen G. White', years: '1827–1915', where: 'A prayer meeting, Portland, Maine', z: -6, side: 1, look: { body: 'f', skin: 0, hair: 'buns', hairColor: '#3A2A1A', bottom: 'skirt' }, outfit: DRESS('#3A3350'), build: 'farmhouse', bc: '#E6DCCB',
    story: ['I’m Ellen Harmon, later Ellen G. White. In December 1844, when I was 17, I had my first vision while praying with friends.', 'God used me as a messenger to guide the young church for 70 years. I wrote many books, including Steps to Christ and The Desire of Ages.', '“We have nothing to fear for the future, except as we shall forget the way the Lord has led us, and His teaching in our past history.” (Life Sketches, 196)'],
    q: 'How old was Ellen when she had her first vision in December 1844?', opts: ['17', '27', '12'], why: 'Ellen White: 17 years old, first vision in 1844.' },
  { id: 'james', who: 'James White', years: '1821–1881', where: 'The printer’s, Middletown, Connecticut', z: -18, side: -1, look: { body: 'm', skin: 0, hair: 'parted', hairColor: '#4A3A2A' }, outfit: C1840, build: 'farmhouse', bc: '#D9CBB0', extra: 'press',
    story: ['I’m James White, Ellen’s husband, a preacher and publisher. We married in 1846.', 'In 1849 I printed our first paper, Present Truth. Later came the Review and Herald.', 'I served as General Conference president three times. Help me print the first copies!'],
    q: 'What was the name of James White’s first paper, in 1849?', opts: ['Present Truth', 'Signs of the Times', 'The Youth’s Instructor'], why: 'James White: the publisher. Present Truth, 1849.', press: true },
  { id: 'org', who: 'John Byington', years: '1798–1887', where: 'The meeting hall, Battle Creek, Michigan', z: -30, side: 1, look: { body: 'm', skin: 0, hair: 'short', hairColor: '#E2E2E2' }, outfit: 'pastor', build: 'hall',
    story: ['Welcome to Battle Creek! In 1860 we chose the name “Seventh-day Adventist”.', 'In 1863 the General Conference was organised here, and I, John Byington, was its first president.'],
    q: 'When was the General Conference organised?', opts: ['1863', '1844', '1874'], why: '1860 the name, 1863 the General Conference.' },
  { id: 'andrews', who: 'J. N. Andrews', years: '1829–1883', where: 'Leaving for Europe, 1874', z: -42, side: -1, look: { body: 'm', skin: 0, hair: 'parted', hairColor: '#3A2A1A' }, outfit: C1840, build: 'ship',
    story: ['I’m John Nevins Andrews, a Bible scholar. In 1874 I am sailing to Switzerland with my children, Charles and Mary.', 'I am the church’s first official overseas missionary.', 'Today the church is in more than 200 countries, including Guyana.'],
    q: 'Where did J. N. Andrews go as the first official overseas missionary in 1874?', opts: ['Switzerland', 'Guyana', 'Australia'], why: 'Andrews: first missionary, 1874, Switzerland.' },
];

export const PIONEERS = {
  key: 'pioneers', gid: 'walk:pioneers', title: 'Pioneers Walk', topic: 'pioneers', icon: '📜', kind: 'walk', music: 'calm',
  blurb: 'Walk through the places where the Adventist pioneers lived and worked, from Miller’s farm to Andrews sailing for Switzerland. Pick three stories to tell.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap a pioneer to hear their story.',
  sky: { top: '#7FA9D6', bottom: '#F1E6C8', fogNear: 45, fogFar: 120, sun: '#FFE8C0', sunI: 2.2, sunPos: [-6, 12, 6], hemi: 1.5, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#7BA05A', modes: { endless: ['📜', 'The pioneers walk', 'Seven places, seven stories. About 8 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'fence_simple', 'fence_planks', 'rock_largeA', 'grass_large', 'flower_yellowA', 'log_stack'],
  start: [0, 0, 40], startRy: PI, bounds: [-14, -50, 14, 44], intro: [8, 40, 24], questTitle: 'The pioneers', coinIcon: '📜', camK: 0.95,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    w.add(B('lane', 96), 0, 0, -3);
    for (const [i, pl] of PLACES.entries()) {
      const x = pl.side * 7.5, z = pl.z, face = pl.side > 0 ? -PI / 2 : PI / 2;
      if (pl.build === 'farmhouse') { const h = w.add(B('farmhouse', pl.bc), x + pl.side * 2.5, 0, z - 1, face); w.solid(h, 0.1); w.fadeable(h); }
      else if (pl.build === 'hall') { const h = w.add(B('hall'), x + pl.side * 3.5, 0, z, face); w.solid(h, 0.1); w.fadeable(h); }
      else if (pl.build === 'corn') { for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) w.add(B('corn'), x + pl.side * (1.2 + r * 1.0), 0, z - 2 + c * 3, 0); w.box(pl.side > 0 ? x + 0.8 : x - 6.2, z - 3.5, pl.side > 0 ? x + 6.2 : x - 0.8, z - 2.4); }
      else if (pl.build === 'dock') { w.add(B('sea'), pl.side * 22, 0, z); w.box(pl.side > 0 ? 8 : -40, z - 6, pl.side > 0 ? 40 : -8, z + 6); w.add(B('dock', 7), x - pl.side * 0.2, -0.2, z, PI / 2); }
      else if (pl.build === 'ship') { w.add(B('sea'), pl.side * 22, 0, z); w.box(pl.side > 0 ? 8 : -40, z - 6, pl.side > 0 ? 40 : -8, z + 6); w.add(B('dock', 7), x, -0.2, z, PI / 2); w.add(B('ship'), pl.side * 15, -0.4, z, 0); }
      if (pl.extra === 'chart') { w.add(B('chart'), x + pl.side * 0.4, 0, z + 2.4, face); const s = sign(['2300 days', 'Daniel 8:14'], 1.8, 1.0, { bg: '#F4EFE2', fg: '#2A1C10', r: 6 }); w.add(s, x + pl.side * 0.4 - pl.side * 0.05, 1.4, z + 2.4, face); }
      if (pl.extra === 'press') { w.press = w.add(B('press'), x + pl.side * 0.2, 0, z + 2.2, face); w.circle(x + pl.side * 0.2, z + 2.2, 0.9); }
      // the plaque by the lane
      const px = pl.side * 2.6, pz = z + 2.6; w.add(B('plaque'), px, 0, pz, face + PI); const ps = sign([pl.who, pl.years, pl.where], 1.15, 0.75, { bg: '#B8892A', fg: '#2A1C00', r: 4 }); w.add(ps, px, 1.35, pz, face + PI); w.circle(px, pz, 0.15);
      const npc = await w.npc(pl.id, pl.look, pl.outfit, x, z, -face, 'Idle_Talking_Loop'); npc.anim = 'Idle_Talking_Loop';
      w.thing({ id: pl.id, x, z, npc, icon: '📜', verb: 'Meet ' + pl.who, when: w => w.isDone('brief') && !w.isDone(pl.id), use: w => meet(w, pl) });
      progress(0.1 + i * 0.1);
    }
    const r = mulberry(4);
    for (let i = 0; i < 110; i++) { const x = (r() - 0.5) * 30, z = -50 + r() * 94; if (Math.abs(x) < 13 && PLACES.some(p => Math.abs(z - p.z) < 6)) continue; if (Math.abs(x) < 3) continue;
      if ((z < 12 && z > 0) || (z < -36)) { if (Math.abs(x) > 6) continue; }
      const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'plant_bushLarge', 'rock_largeA'][Math.floor(r() * 6)]; const t = w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6, k.startsWith('tree') ? 0.35 : 0.5); if (t && k.startsWith('tree') && Math.abs(x) < 9) w.fadeable(t); }
    for (let i = 0; i < 40; i++) w.kit(['grass_large', 'flower_yellowA', 'fence_simple'][i % 3], i % 3 === 2 ? 1 : 0.5, (i % 2 ? -1 : 1) * (3 + r() * 9), -48 + r() * 90, r() * 6);
    const guide = await w.npc('guide', { body: 'f', skin: 2, hair: 'long' }, 'counsellor', 2.2, 37.5, PI * 0.8, 'Idle_Talking_Loop'); guide.anim = 'Idle_Talking_Loop';
    w.thing({ id: 'guide', x: 2.2, z: 37.5, npc: guide, icon: '💬', verb: 'Talk to Counsellor Joy', when: w => !w.isDone('brief'), use: brief });
    w.met = [];
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Counsellor Joy at the start' }]); w.ui.banner('The pioneers walk', 'Seven places, from 1844 to 1874.', 2600); },
};

async function brief(w) {
  w.faceEach(w.npcs.guide);
  await w.say('Counsellor Joy', 'This lane walks you through the places where our church began, from William Miller’s farm in the 1840s to J. N. Andrews sailing for Switzerland in 1874.', { icon: '👩🏾‍🏫' });
  await w.say('Counsellor Joy', 'Meet each pioneer and hear their story. At the end, choose three stories to tell at worship (SD 3).', { icon: '👩🏾‍🏫', next: 'Start walking ▶' });
  w.done('brief', 50); PLACES.forEach(p => w.addQuest({ id: p.id, text: p.who + ' (' + p.years + ')' }));
}
async function meet(w, pl) {
  const n = w.npcs[pl.id]; w.faceEach(n);
  for (const [i, t] of pl.story.entries()) await w.say(pl.who, t, { icon: '📜', tag: '📜 ' + pl.where, keep: i < pl.story.length - 1 });
  if (pl.press) {
    w.ui.closeCard();
    await w.timing({ label: 'Pull the press: print Present Truth', steps: 3, speed: 1.0, verb: 'Pull', step: async () => { SND.pop(); await w.anim('Interact', 500); }, miss: async () => { w.ui.toast('Smudged! Try again', 'bad'); await new Promise(r => setTimeout(r, 400)); } });
    w.ui.toast('🗞️ Present Truth, July 1849: a thousand copies', 'good'); w.busy = true;
  }
  await w.ask({ who: pl.who, icon: '📜', tag: '❓ ' + pl.who, q: pl.q, opts: pl.opts, right: 0, why: pl.why });
  w.met.push(pl); w.done(pl.id, 150);
  if (w.met.length === PLACES.length) await finale(w);
}
async function finale(w) {
  await w.say('Counsellor Joy', 'You walked from 1844 to 1874! For SD 3 you outline and tell three pioneer stories at worship. Which three will you tell?', { icon: '👩🏾‍🏫', keep: true });
  const picked = [];
  for (let k = 0; k < 3; k++) {
    const left = PLACES.filter(p => !picked.includes(p));
    const c = await w.choose({ who: 'Your worship talk', icon: '📜', tag: '📜 Story ' + (k + 1) + ' of 3', q: k ? 'And story ' + (k + 1) + '?' : 'Your first story?', opts: left.map(p => p.who), keep: k < 2 });
    picked.push(left[c]);
  }
  await w.say('Your three stories', picked.map((p, i) => (i + 1) + '. ' + p.who + ': ' + p.why).join(' '), { icon: '📝', next: 'Finish ▶' });
  w.finish({ title: 'From 1844 to 1874!', list: ['Your three stories', picked.map(p => ['📜 ' + p.who + ' (' + p.years + ')', p.story[p.story.length - 1].slice(0, 140)])] });
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
