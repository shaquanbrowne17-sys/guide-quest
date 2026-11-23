/* Pathfinder Camp (everyone, multiplayer): an open camp world with a town, a church, a forest and a river.
   Play with your class (a room code, like Switch Run) and see each other walking around, or play on your own.
   Shared quests: light the campfire together (four logs), find the eight Memory Gem scrolls, and clear the fallen log
   (it needs two people, one at each end). Each Guide also helps Sister Grace with her groceries; on your own,
   Counsellor Ann takes the other end of the log.
   The class room only shares names (letters only), looks, positions and ready-made chat phrases. */
import { THREE, G, P, merge, MAT, sprite, SND, clamp } from './core.js';
import { prop, BUILD } from './props.js';
import { makeCharacter, myLook, HAIR, SKIN_TONES } from './character.js';
import { DATA } from './data.js';

const PI = Math.PI;
const PHRASES = ['👋 Hi!', '🙌 Over here!', '🪵 Bring a log!', '🪢 Help me lift!', '💎 Found one!', '🔥 Fire’s lit!', '🙏 Thanks!', '⛪ To the church!'];
const FIRE = { x: 0, z: 6 }, WOOD = { x: -6, z: 10 }, SHOP = { x: 22, z: 4 }, GRACE = { x: 22, z: -12 }, CHURCH = { x: 0, z: -30 }, LOG = { x: -14, z: -14, len: 7 };
const SCROLLS = [[-28, 20], [30, 22], [-32, -4], [12, -20], [-6, -22], [34, -26], [-26, -30], [8, 26]];
const lookCode = l => ((l.body === 'f' ? 1 : 0) << 6) | (clamp(l.skin | 0, 0, 7) << 3) | ((HAIR[l.body === 'f' ? 'f' : 'm'].indexOf(l.hair) & 3) << 1) | (l.bottom === 'skirt' ? 1 : 0);
const lookOf = c => { const body = (c >> 6) & 1 ? 'f' : 'm'; return { body, skin: Math.min((c >> 3) & 7, SKIN_TONES.length - 1), hair: HAIR[body][(c >> 1) & 3] || HAIR[body][0], bottom: c & 1 ? 'skirt' : 'trousers' }; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLS = ['#F2C14E', '#5FD08A', '#7FB6F0', '#F07A6A', '#C99BF0', '#F0A35A', '#6FE0D8', '#F07AC0'];
const hashS = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

Object.assign(BUILD, {
  scroll: () => merge([P(G.cyl(0.08, 0.08, 0.5, 8), '#F4EFE2', [0, 0.3, 0], [0, 0, PI / 2]), P(G.cyl(0.1, 0.1, 0.06, 8), '#8A5A2B', [0.27, 0.3, 0], [0, 0, PI / 2]), P(G.cyl(0.1, 0.1, 0.06, 8), '#8A5A2B', [-0.27, 0.3, 0], [0, 0, PI / 2])]),
  bigl: (len = 7) => merge([P(G.cyl(0.45, 0.5, len, 10), '#6E4424', [0, 0.45, 0], [0, 0, PI / 2]), P(G.cyl(0.42, 0.42, 0.02, 10), '#C9A46A', [len / 2, 0.45, 0], [0, 0, PI / 2]), P(G.cyl(0.42, 0.42, 0.02, 10), '#C9A46A', [-len / 2, 0.45, 0], [0, 0, PI / 2])]),
  river: () => merge([P(G.box(90, 0.04, 6), '#3E7FB0', [0, 0, 0]), P(G.box(90, 0.1, 0.5), '#9C8A6A', [0, 0.02, -3.2]), P(G.box(90, 0.1, 0.5), '#9C8A6A', [0, 0.02, 3.2])]),
  bridge2: () => { const p = [P(G.box(3, 0.16, 8), '#8A5A2B', [0, 0.25, 0])]; for (const x of [-1.4, 1.4]) { p.push(P(G.box(0.1, 0.1, 8), '#6E4424', [x, 1.0, 0])); for (let z = -3.8; z <= 3.8; z += 1.9) p.push(P(G.box(0.12, 0.8, 0.12), '#6E4424', [x, 0.6, z])); } return merge(p); },
  firering: () => { const p = [P(G.cyl(0.62, 0.62, 0.03, 12), '#3A332C', [0, 0.015, 0])]; for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; p.push(P(G.dod(0.2), '#8E8E8A', [Math.cos(a) * 0.78, 0.12, Math.sin(a) * 0.78], [i, i * 2, 0])); } return merge(p); },
  logpiece: () => merge([P(G.cyl(0.12, 0.12, 0.9, 7), '#7A5230', [0, 0, 0], [0, 0, PI / 2])]),
  groceries: () => merge([P(G.box(0.4, 0.35, 0.25), '#C9A46A', [0, 0.18, 0]), P(G.ico(0.08, 0), '#E2412C', [-0.08, 0.38, 0]), P(G.box(0.05, 0.22, 0.05), '#5FA83A', [0.1, 0.42, 0])]),
});

export const CAMP = {
  key: 'camp', gid: 'camp:open', title: 'Pathfinder Camp', topic: 'packcamp', icon: '🏕️', kind: 'walk', music: 'calm',
  blurb: 'An open camp world: light the campfire together, find eight Memory Gem scrolls, clear the fallen log with a friend, and help in town. Play with your class.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap 💬 to send a ready-made message.',
  sky: { top: '#5E9BD6', bottom: '#F2E2B8', fogNear: 55, fogFar: 140, sun: '#FFE8C0', sunI: 2.3, sunPos: [-6, 12, -4], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#556B3A' },
  ground: '#6E9E4A', modes: { multi: ['👥', 'With your class', 'One Guide starts a room, the others join with the code (up to 8).'], endless: ['🏕️', 'On your own', 'Counsellor Ann helps with the two-person jobs.'] }, board: 'endless', levels: 1,
  kit: ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_palmTall', 'plant_bushLarge', 'plant_bush', 'rock_largeA', 'grass_large', 'flower_yellowA', 'flower_redA', 'tent_detailedOpen', 'tent_smallClosed', 'log_stack'],
  start: [0, 0, 16], startRy: PI, bounds: [-40, -38, 40, 34], intro: [10, 48, 30], questTitle: 'Camp', coinIcon: '🏕️', camK: 1.0,
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    // camp
    w.add(B('firering'), FIRE.x, 0, FIRE.z); w.circle(FIRE.x, FIRE.z, 0.9); w.fireLogs = [0, 1, 2, 3].map(i => { const m = B('logpiece'); w.add(m, FIRE.x + Math.cos(i * PI / 2) * 0.25, 0.15 + (i > 1 ? 0.15 : 0), FIRE.z + Math.sin(i * PI / 2) * 0.25, i * PI / 2); m.visible = false; return m; });
    w.flame = sprite(['🔥'], 1.6, 1.6, { bg: 'rgba(0,0,0,0)', fg: '#FF8A2A', w: 128, h: 128 }); w.add(w.flame, FIRE.x, 0.9, FIRE.z); w.flame.visible = false;
    w.kit('log_stack', 1.3, WOOD.x, WOOD.z, 0.3, 0.8);
    [[-10, 18, 0.5], [-4, 22, 0.2], [6, 22, -0.3], [12, 16, -0.6]].forEach(([x, z, ry], i) => w.kit(i % 2 ? 'tent_smallClosed' : 'tent_detailedOpen', 2.2, x, z, ry, 1.2));
    // town and Sister Grace
    [[22, 4, '#EDE4CF'], [30, 4, '#E6DCCB'], [22, -12, '#F2E2C0'], [30, -12, '#D9CBB0']].forEach(([x, z, c], i) => { const h = w.add(B('farmhouse', c), x, 0, z + (i < 2 ? 4 : -4), i < 2 ? PI : 0); w.solid(h, 0.1); w.fadeable(h); });
    const sg = sign_(w, 'Camp Store', SHOP.x, 2.6, SHOP.z + 1.6, PI);
    // church
    const ch = w.add(B('hall'), CHURCH.x, 0, CHURCH.z - 3, 0); w.solid(ch, 0.1); w.fadeable(ch); void sg;
    // the river and the bridge, and the fallen log on the forest path
    w.add(B('river'), 0, 0, -6); w.box(-50, -9, -2, -3); w.box(2, -9, 50, -3); w.add(B('bridge2'), 0, 0, -6);
    w.bigLog = w.add(B('bigl', LOG.len), LOG.x, 0, LOG.z, 0); w.logBox = { x0: LOG.x - LOG.len / 2, x1: LOG.x + LOG.len / 2, z0: LOG.z - 0.5, z1: LOG.z + 0.5 }; w.cols.push(w.logBox);
    progress(0.4);
    // scrolls with Memory Gems
    w.scrolls = SCROLLS.map(([x, z], i) => { const m = B('scroll'); w.add(m, x, 0, z, i); return m; });
    // forest everywhere else
    const r = mulberry(21);
    for (let i = 0; i < 260; i++) { const x = (r() - 0.5) * 80, z = -38 + r() * 72;
      if (Math.hypot(x - FIRE.x, z - FIRE.z - 6) < 14 || (x > 15 && x < 37 && z > -20 && z < 12) || Math.hypot(x - CHURCH.x, z - CHURCH.z) < 9 || (z > -10 && z < -2) || Math.abs(x) < 2.5 || (Math.abs(z - LOG.z) < 4.5 && x < -2 && x > LOG.x - LOG.len / 2 - 4) || SCROLLS.some(s => Math.hypot(x - s[0], z - s[1]) < 2.5)) continue;
      const k = ['tree_default', 'tree_oak', 'tree_tall', 'tree_pineRoundC', 'tree_palmTall', 'plant_bushLarge', 'plant_bush', 'rock_largeA'][Math.floor(r() * 8)];
      const t = w.kit(k, k.startsWith('tree') ? 5 + r() * 5 : null, x, z, r() * 6, k.startsWith('tree') ? 0.35 : 0.5); if (t && k.startsWith('tree')) w.fadeable(t); }
    for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 76, z = -36 + r() * 68; if (z > -10 && z < -2) continue; w.kit(['grass_large', 'flower_yellowA', 'flower_redA'][i % 3], 0.5, x, z, r() * 6); }
    progress(0.7);
    const ann = await w.npc('ann', { body: 'f', skin: 2, hair: 'long' }, 'counsellor', 3, 9, PI * 0.8, 'Idle_Talking_Loop'); ann.anim = 'Idle_Talking_Loop';
    const grace = await w.npc('grace', { body: 'f', skin: 3, hair: 'buns', hairColor: '#D8D8D8', bottom: 'skirt' }, { shirt: '#B5452C', trim: '#7A2E1D', trousers: '#7A2E1D' }, GRACE.x, GRACE.z + 1.5, 0, 'Idle_Loop');
    const shop = await w.npc('shop', { body: 'm', skin: 4, hair: 'short' }, { shirt: '#2F6DB5', trim: '#24578F', trousers: '#3A3F4A' }, SHOP.x, SHOP.z + 2.0, PI, 'Idle_Loop');
    w.thing({ id: 'ann', x: 3, z: 9, npc: ann, icon: '💬', verb: 'Talk to Counsellor Ann', when: w => !w.isDone('brief') || (w.allShared() && !w.isDone('church')), use: talkAnn });
    w.thing({ id: 'wood', x: WOOD.x, z: WOOD.z, r: 2.2, icon: '🪵', verb: 'Take a log', when: w => w.isDone('brief') && !w.carrying && w.logsIn() < 4, use: w => { w.carry('log', new THREE.Mesh(prop('logpiece'), MAT.flat)); } });
    w.thing({ id: 'fire', x: FIRE.x, z: FIRE.z, r: 2.2, icon: '🔥', verb: 'Put the log on the fire', when: w => w.carrying === 'log', use: addLog });
    w.thing({ id: 'shop', x: SHOP.x, z: SHOP.z + 2.0, npc: shop, icon: '🛒', verb: 'Pick up Sister Grace’s groceries', when: w => w.isDone('brief') && !w.carrying && !w.isDone('grace'), use: w => { w.carry('groceries', new THREE.Mesh(prop('groceries'), MAT.flat)); w.ui.toast('🛒 Groceries for Sister Grace', 'good'); } });
    w.thing({ id: 'grace', x: GRACE.x, z: GRACE.z + 1.5, npc: grace, icon: '🧺', verb: 'Bring Sister Grace her groceries', when: w => w.carrying === 'groceries', use: helpGrace });
    w.thing({ id: 'logA', x: LOG.x - LOG.len / 2 - 0.6, z: LOG.z + 1.2, r: 1.6, icon: '🪢', verb: 'Hold this end of the log', when: w => w.isDone('brief') && !w.lifted() && w.my.hold < 0 && w.annEnd !== 0, use: w => holdEnd(w, 0) });
    w.thing({ id: 'logB', x: LOG.x + LOG.len / 2 + 0.6, z: LOG.z + 1.2, r: 1.6, icon: '🪢', verb: 'Hold this end of the log', when: w => w.isDone('brief') && !w.lifted() && w.my.hold < 0 && w.annEnd !== 1, use: w => holdEnd(w, 1) });
    SCROLLS.forEach(([x, z], i) => w.thing({ id: 'g' + i, x, z, r: 1.8, h: 0.8, icon: '💎', verb: 'Read the scroll', when: w => w.isDone('brief') && !(w.gemBits() & (1 << i)), use: w => readScroll(w, i) }));
    w.thing({ id: 'church', x: CHURCH.x, z: CHURCH.z + 0.5, r: 2.4, icon: '⛪', verb: 'Evening worship', when: w => w.isDone('brief') && w.allShared(), use: worship });
    w.my = { gems: 0, logs: 0, hold: -1, lift: false }; w.ghosts = {}; w.others = {}; w.annEnd = -1; w.annHold = false;
    w.gemBits = () => Object.values(w.others).reduce((b, p) => b | ((p.s | 0) & 255), w.my.gems);
    w.logsIn = () => Math.min(4, Object.values(w.others).reduce((n, p) => n + ((p.g | 0) & 7), w.my.logs));
    w.lifted = () => w.my.lift || Object.values(w.others).some(p => (p.g | 0) & 32);
    w.allShared = () => w.logsIn() >= 4 && w.gemBits() === 255 && w.lifted();
    w.hooks.push(tick);
  },
  begin(w) { w.setQuests([{ id: 'brief', text: 'Talk to Counsellor Ann by the campfire' }]); w.ui.banner('Pathfinder Camp', w.mode === 'multi' ? 'Start a room or join your class.' : 'A day at camp.', 2600); if (w.mode === 'multi') lobby(w); },
  stop(w) { if (w.room) { w.room.leave(); w.room = null; } ['h-chat', 'h-lobby'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; }); },
};
function sign_(w, text, x, y, z, ry) { const s = sprite([text], 2.4, 0.6, { bg: '#1F4D3A', fg: '#F2C14E', w: 512, h: 128, r: 20 }); w.add(s, x, y, z, ry); return s; }

async function talkAnn(w) {
  w.faceEach(w.npcs.ann);
  if (w.isDone('brief') && w.allShared()) { await w.say('Counsellor Ann', 'Fire lit, all eight scrolls found and the path is clear. Everyone to the church for evening worship!', { icon: '👩🏾‍🏫' }); return; }
  await w.say('Counsellor Ann', 'Welcome to camp! Jobs for everyone: light the campfire (four logs from the wood pile), find the eight Memory Gem scrolls hidden around camp, and clear the fallen log on the forest path. It needs two people, one at each end.', { icon: '👩🏾‍🏫' });
  await w.say('Counsellor Ann', (w.room ? 'Work together: what one of you does counts for the whole class. ' : 'If you need a second pair of hands, I’ll come. ') + 'And Sister Grace in town is waiting for her groceries from the store.', { icon: '👩🏾‍🏫', next: 'Let’s go ▶' });
  w.done('brief', 50);
  [['fire', 'Light the campfire (4 logs)'], ['gems', 'Find the 8 Memory Gem scrolls'], ['log', 'Clear the fallen log (2 people)'], ['grace', 'Bring Sister Grace her groceries'], ['church', 'Evening worship at the church']].forEach(([id, text]) => w.addQuest({ id, text }));
}
async function addLog(w) { w.drop(); w.my.logs++; SND.coin(); w.points += 60; w.ui.toast('🪵 ' + w.logsIn() + ' of 4 logs on the fire', 'good'); }
async function helpGrace(w) {
  w.faceEach(w.npcs.grace); w.drop();
  await w.say('Sister Grace', 'Thank you, child! These old knees don’t like the hill to the store. God bless you.', { icon: '👵🏾' });
  await w.ask({ who: 'Sister Grace', icon: '👵🏾', q: 'Sister Grace offers you money for helping. What do you say?', opts: ['“Thank you, but I was glad to help.”', '“How much?”', 'Take it and leave'], right: 0, why: 'Serving others is its own reward: “It is more blessed to give than to receive.” (Acts 20:35, KJV)' });
  w.done('grace', 150);
}
async function readScroll(w, i) {
  const gems = (DATA.GEMS || []), g = gems.length ? gems[(i * 3) % gems.length] : ['Psalm 119:105', 'Thy word is a lamp unto my feet, and a light unto my path.'];
  w.my.gems |= 1 << i; SND.coin(); w.points += 80; w.scrolls[i].visible = false;
  const n = bits(w.gemBits());
  await w.say('💎 Memory Gem ' + n + ' of 8', '“' + g[1] + '” (' + g[0] + ', KJV)', { icon: '📜', tag: '💎 Memory Gem scroll' });
}
async function holdEnd(w, end) {
  w.my.hold = end; w.face(w.pc, LOG.x, LOG.z); w.pc.play('Crouch_Idle_Loop', { fade: 0.2 }); SND.lane();
  w.ui.toast(w.room ? 'Holding this end. Someone take the other end!' : 'Holding this end…', 'good');
  if (w.room || w.annEnd === 1 - end) return;
  // on your own, Counsellor Ann comes over the bridge to the other end (you can let go and come back)
  const ann = w.npcs.ann, p = ann.root.position, ox = LOG.x + (end ? -1 : 1) * (LOG.len / 2 + 0.6), at = [ox, LOG.z + 1.0];
  w.annHold = false; w.annEnd = 1 - end;
  await w.say('Counsellor Ann', 'Wait there, I’ll take the other end!', { icon: '👩🏾‍🏫' });
  w.walkNpc(ann, p.z > -6 ? [[p.x, -1], [0, -1], [0, -11], [ox, -11], at] : [[p.x, -11], [ox, -11], at], () => { w.annHold = true; ann.play('Crouch_Idle_Loop', { fade: 0.2 }); });
}
async function lift(w) {
  w.busy = true; w.ui.closeCard();
  const ok = await w.timing({ label: 'Lift together: 1, 2, 3, lift!', steps: 2, speed: 1.0, zone: 0.3, verb: 'Lift', step: async () => { SND.power(); w.bigLog.position.y += 0.35; await w.anim('Interact', 500); }, miss: async () => { w.ui.toast('Together! Try again', 'bad'); await new Promise(r => setTimeout(r, 400)); } });
  void ok; w.my.lift = true; clearLog(w); w.my.hold = -1; w.done('log', 200); w.busy = false;
  if (w.annEnd >= 0) { w.annHold = false; w.annEnd = -1; const a = w.npcs.ann.root.position; w.walkNpc(w.npcs.ann, [[a.x, -11], [0, -11], [0, -1], [3, -1], [3, 9]]); }
}
function clearLog(w) { if (w.logGone) return; w.logGone = true; w.cols = w.cols.filter(c => c !== w.logBox); w.bigLog.position.set(LOG.x, 0, LOG.z - 2.0); }
async function worship(w) {
  await w.say('Evening worship', 'The whole camp sits together as the sun goes down. Tonight’s text: “For where two or three are gathered together in my name, there am I in the midst of them.” (Matthew 18:20, KJV)', { icon: '⛪' });
  await w.ask({ who: 'Counsellor Ann', icon: '👩🏾‍🏫', q: 'What made today work?', opts: ['Everyone helped, and some jobs needed two', 'One person did everything', 'Nobody needed anyone'], right: 0, why: '“Two are better than one.” (Ecclesiastes 4:9, KJV)' });
  w.done('church', 200);
  w.finish({ title: 'A day at camp!', stats: [[bits(w.my.gems) + '/8', 'scrolls you found'], [w.my.logs + '', 'logs you carried']] });
}
const bits = n => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };

/* ---------- the class room ---------- */
function lobby(w) {
  w.busy = true; const e = w.el('h-lobby', 'panel'); e.hidden = false; let nm = ''; try { nm = localStorage.getItem('gq3d-mpname') || ''; } catch (er) { nm = ''; }
  e.innerHTML = '<b class="lb-t">👥 Pathfinder Camp with your class</b><label>Your first name<input id="lb-name" maxlength="24" autocomplete="off" value="' + esc(nm) + '" placeholder="First name"></label>'
    + '<button class="lb-go" data-lb="host">Start a room</button><div class="lb-or">or join one</div><div class="lb-join"><input id="lb-code" maxlength="8" autocomplete="off" placeholder="CODE" autocapitalize="characters"><button data-lb="join">Join</button></div><p class="lb-msg"></p><button class="lb-solo" data-lb="solo">Play on my own</button><p class="lb-note">Names are letters only. Chat is ready-made phrases only.</p>';
  const msg = t => { e.querySelector('.lb-msg').textContent = t; };
  e.onclick = async ev => {
    const b = ev.target.closest('[data-lb]'); if (!b) return; ev.stopPropagation();
    if (b.dataset.lb === 'solo') { e.hidden = true; w.busy = false; w.ui.toast('Counsellor Ann will help with the two-person jobs', 'good'); return; }
    const M = await import('./mp.js'); const name = M.cleanName(e.querySelector('#lb-name').value);
    if (!name) { msg('Type your first name (letters only).'); return; }
    try { localStorage.setItem('gq3d-mpname', name); } catch (er) { /* private mode */ }
    msg('Connecting…');
    try {
      await M.connect(); let room;
      if (b.dataset.lb === 'host') { room = new M.Room(M.newCode(), 'camp'); await room.host(1); } else { const code = M.cleanCode(e.querySelector('#lb-code').value); if (code.length < 4) { msg('Type the room code.'); return; } room = new M.Room(code, 'camp'); await room.join(); }
      await enterRoom(w, room, name, M.now);
    } catch (er) { const k = er && er.message; msg(k === 'nomatch' ? 'No camp room with that code.' : k === 'full' ? 'That room is full (8 players).' : 'Couldn’t connect. Check your internet.'); }
  };
}
/* in the room: send where I am, and listen for the others and their messages */
async function enterRoom(w, room, name, now) {
  w.room = room; w.myName = name; w.now = now; w.myCode = lookCode(myLook());
  await room.me(state(w)); room.listen({ meta: m => { if (!m && w.room && !w.room.isHost) soloAgain(w); }, players: p => players(w, p), chat: c => onChat(w, c) });
  const e = document.getElementById('h-lobby'); if (e) e.hidden = true; w.busy = false; chatUI(w);
  w.ui.toast('Room ' + room.code + (room.isHost ? ': tell your class the code' : ': joined!'), 'good');
}
CAMP.enterRoom = enterRoom;   // (the tests use a pretend room, because they can't reach Firebase)
/* the host left: the room is gone, so carry on alone (Counsellor Ann helps again) */
function soloAgain(w) {
  if (!w.room) return; w.ui.toast('The host closed the room. Carry on on your own!', 'bad');
  w.room.leave(); w.room = null; players(w, {}); const c = document.getElementById('h-chat'); if (c) c.hidden = true;
}
function state(w) { const p = w.pc.root.position, moving = w.vel && w.vel.length() > 0.3; return { n: w.myName, at: w.now(), c: w.myCode | 0, s: w.my.gems, x: Math.round(p.x * 10) / 10, y: moving ? 1 : 0, z: Math.round(p.z * 10) / 10, r: Math.round(w.pc.root.rotation.y * 100) / 100, g: (w.my.logs & 7) | (w.my.hold === 0 ? 8 : 0) | (w.my.hold === 1 ? 16 : 0) | (w.my.lift ? 32 : 0), a: true }; }
function players(w, ps) {
  const me = w.room && w.room.uid; w.others = {};
  Object.entries(ps || {}).forEach(([u, p]) => { if (u === me) return; w.others[u] = p;
    if (!w.ghosts[u]) { const gh = w.ghosts[u] = { p, pos: new THREE.Vector3(p.x || 0, 0, p.z || 0) };
      makeCharacter(lookOf(p.c | 0), 'pathfinder').then(ch => { if (!w.ghosts[u]) return; gh.ch = ch; w.world.add(ch.root); ch.root.position.copy(gh.pos); gh.tag = sprite([p.n], 2.0, 0.46, { bg: COLS[Math.abs(hashS(u)) % COLS.length], fg: '#1D1B2B', w: 384, h: 88, r: 30 }); w.world.add(gh.tag); }); }
    else w.ghosts[u].p = p; });
  const cnt = document.querySelector('#h-chat .ch-code i'); if (cnt) cnt.textContent = Object.keys(w.others).length + 1;
  Object.keys(w.ghosts).forEach(u => { if (!w.others[u]) { const gh = w.ghosts[u]; if (gh.ch) w.world.remove(gh.ch.root); if (gh.tag) w.world.remove(gh.tag); delete w.ghosts[u]; } });
}
function onChat(w, c) { const p = c.u === (w.room && w.room.uid) ? { n: 'You' } : w.others[c.u]; if (p && PHRASES[c.p]) w.ui.toast(p.n + ': ' + PHRASES[c.p], 'good'); }
function chatUI(w) {
  const e = w.el('h-chat', 'panel'); e.hidden = false;
  e.innerHTML = '<span class="ch-code">Room <b>' + esc(w.room.code) + '</b> · <i>1</i> here</span><button class="ch-open" aria-label="Send a message">💬</button><div class="ch-list" hidden>' + PHRASES.map((p, i) => '<button data-say="' + i + '">' + p + '</button>').join('') + '</div>';
  e.onclick = ev => { ev.stopPropagation(); const s = ev.target.closest('[data-say]'); const l = e.querySelector('.ch-list'); if (s) { w.room && w.room.say(+s.dataset.say); l.hidden = true; return; } if (ev.target.closest('.ch-open')) l.hidden = !l.hidden; };
}

/* ---------- each frame ---------- */
function tick(w, dt) {
  if (w.room) { w.sendT = (w.sendT || 0) + dt; if (w.sendT > 0.2) { w.sendT = 0; w.room.send(state(w)); } }
  Object.values(w.ghosts).forEach(gh => { if (!gh.ch) return; const p = gh.p, to = new THREE.Vector3(p.x || 0, 0, p.z || 0); gh.pos.lerp(to, 1 - Math.exp(-8 * dt)); gh.ch.root.position.copy(gh.pos); gh.ch.root.rotation.y = p.r || 0;
    gh.ch.play((p.g | 0) & 24 ? 'Crouch_Idle_Loop' : p.y ? 'Walk_Loop' : 'Idle_Loop', { fade: 0.2 }); gh.ch.update(dt); if (gh.tag) gh.tag.position.set(gh.pos.x, 2.5, gh.pos.z); });
  // the shared jobs
  const logs = w.logsIn(); w.fireLogs.forEach((m, i) => { m.visible = i < logs; });
  if (logs >= 4 && !w.flame.visible) { w.flame.visible = true; SND.power(); w.ui.banner('The campfire is lit!', 'Four logs, many hands.', 2200); }
  if (logs >= 4 && w.isDone('brief') && !w.isDone('fire')) w.done('fire', 200);
  if (w.flame.visible) { const k = 1 + Math.sin(w.eng.time * 11) * 0.06; w.flame.scale.set(1.6 * k, 1.6 * (k + 0.05), 1); }
  const gb = w.gemBits(); w.scrolls.forEach((s, i) => { s.visible = !(gb & (1 << i)); s.rotation.y += dt; s.position.y = 0.1 + Math.sin(w.eng.time * 2 + i) * 0.08; });
  if (gb === 255 && !w.isDone('gems') && w.isDone('brief')) { w.done('gems', 200); w.ui.banner('All eight scrolls found!', 'Say one of them by heart tonight.', 2200); }
  if (w.lifted() && !w.my.lift && !w.busy) { if (!w.logGone) { clearLog(w); w.my.hold = -1; } if (w.isDone('brief') && !w.isDone('log')) w.done('log', 150); }
  // two people at the two ends lift the log
  if (w.my.hold >= 0 && !w.busy && !w.lifted()) {
    const p = w.pc.root.position, endX = LOG.x + (w.my.hold ? 1 : -1) * (LOG.len / 2 + 0.6);
    if (Math.hypot(p.x - endX, p.z - LOG.z - 1.2) > 2.5) w.my.hold = -1;
    else { const otherEnd = w.my.hold ? 8 : 16, partner = (w.annHold && w.annEnd === 1 - w.my.hold) || Object.values(w.others).some(o => (o.g | 0) & otherEnd); if (partner) lift(w); }
  }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
