/* Teach the Juniors (Teach It, OL 3): plan with your staff mentor, set up the room, then teach two parts of the
   Knot Tying honour to six Juniors. Explain, show, let them try (help the stuck ones, give the bored ones a job),
   check each one, and finish with a review. Everything follows the Teach It lessons in the Learning Lab. */
import { THREE, G, P, merge, MAT, sign } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  jdesk: () => merge([P(G.box(1.2, 0.06, 0.6), '#C9A46A', [0, 0.58, 0]), ...[[-0.55, -0.25], [0.55, -0.25], [-0.55, 0.25], [0.55, 0.25]].map(([x, z]) => P(G.box(0.05, 0.58, 0.05), '#6B6F76', [x, 0.29, z]))]),
  jchair: () => merge([P(G.box(0.42, 0.05, 0.4), '#2F6DB5', [0, 0.33, 0]), P(G.box(0.42, 0.42, 0.05), '#2F6DB5', [0, 0.56, 0.2]), ...[[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].map(([x, z]) => P(G.box(0.04, 0.33, 0.04), '#6B6F76', [x, 0.165, z]))]),
  board: () => merge([P(G.box(4.2, 2.0, 0.08), '#F7F7F5', [0, 1.9, 0]), P(G.box(4.4, 0.1, 0.12), '#9AA3AE', [0, 0.86, 0.04]), P(G.box(4.4, 0.08, 0.1), '#9AA3AE', [0, 2.94, 0])]),
  tablef: () => merge([P(G.box(2.2, 0.08, 0.9), '#8E5F33', [0, 0.78, 0]), ...[[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]].map(([x, z]) => P(G.box(0.07, 0.78, 0.07), '#5A3A22', [x, 0.39, z]))]),
  cupb: () => merge([P(G.box(1.0, 2.1, 1.8), '#7A5230', [0, 1.05, 0]), P(G.box(0.04, 1.9, 0.8), '#8E6239', [0.51, 1.05, -0.42]), P(G.box(0.04, 1.9, 0.8), '#8E6239', [0.51, 1.05, 0.42]), P(G.box(0.05, 0.2, 0.05), '#D4AF37', [0.55, 1.1, -0.1]), P(G.box(0.05, 0.2, 0.05), '#D4AF37', [0.55, 1.1, 0.1])]),
  ropebox: () => merge([P(G.box(0.6, 0.3, 0.42), '#B98A4F', [0, 0.15, 0]), ...[[-0.15, 0], [0.12, 0.05], [0, -0.08]].map(([x, z], i) => P(G.tor(0.11, 0.035, 5, 12), ['#F2E6C8', '#D3243A', '#2F6DB5'][i], [x, 0.33, z], [PI / 2, 0, 0]))]),
  rope: (c = '#F2E6C8') => merge([P(G.tor(0.12, 0.03, 5, 12), c, [0, 0.03, 0], [PI / 2, 0, 0]), P(G.box(0.3, 0.05, 0.05), c, [0.18, 0.03, 0.05], [0, 0.4, 0])]),
  knotposter: () => merge([P(G.box(1.1, 1.4, 0.03), '#F2C14E', [0, 0, 0]), P(G.box(0.9, 0.08, 0.04), '#2F6DB5', [0, 0.3, 0.01]), P(G.box(0.9, 0.08, 0.04), '#D3243A', [0, 0.1, 0.01]),
    P(G.tor(0.14, 0.04, 5, 12), '#2F6DB5', [-0.12, -0.25, 0.02]), P(G.tor(0.14, 0.04, 5, 12), '#D3243A', [0.12, -0.25, 0.02])]),
  window2: () => merge([P(G.box(1.8, 1.3, 0.05), '#BFE3F2', [0, 0, 0]), P(G.box(1.9, 0.08, 0.1), '#FFFFFF', [0, -0.66, 0.02]), P(G.box(0.06, 1.3, 0.08), '#FFFFFF', [0, 0, 0.03])]),
});

const KIDS = [
  { id: 'tyrell', name: 'Tyrell', look: { body: 'm', skin: 0, hair: 'buzzed' } }, { id: 'keisha', name: 'Keisha', look: { body: 'f', skin: 1, hair: 'buns', bottom: 'skirt' } },
  { id: 'joel', name: 'Joel', look: { body: 'm', skin: 3, hair: 'short' } }, { id: 'amaya', name: 'Amaya', look: { body: 'f', skin: 2, hair: 'long', bottom: 'skirt' } },
  { id: 'dev', name: 'Dev', look: { body: 'm', skin: 2, hair: 'parted' } }, { id: 'sarah', name: 'Sarah', look: { body: 'f', skin: 4, hair: 'short', bottom: 'skirt' } },
];
const SEATS = [[-3.4, -1.4], [0, -1.4], [3.4, -1.4], [-3.4, 2.0], [0, 2.0], [3.4, 2.0]];
const EVENTS = {
  stuck: { icon: '✋', verb: n => 'Help ' + n, q: n => n + ' can’t get the knot and is close to tears.', opts: ['Stay calm, show again slowly, and praise each try', 'Tie it for them so you can move on', 'Tell them to watch the others'], why: 'A Junior who can’t get it: stay calm, show again slowly, and praise each try.' },
  bored: { icon: '🥱', verb: n => 'Check on ' + n, q: n => n + ' finished fast, is bored, and is poking the others.', opts: ['Give them a job: be your helper and help a friend', 'Tell them to sit still and wait', 'Let them leave early'], why: 'A bored Junior: give them a job, like handing out the rope or being your helper.' },
  chat: { icon: '💬', verb: n => 'Go to ' + n, q: n => n + ' is chatting with a friend instead of practising.', opts: ['Walk over, smile, and ask them to show you their knot', 'Shout from the front', 'Ignore it until the end'], why: 'Go over calmly and bring them back to the activity: ask to see their knot.' },
};
const ORDER = ['stuck', 'bored', 'chat', 'stuck', 'stuck', 'bored', 'chat'];
const TRY_SECS = 60;

export const TEACH = {
  key: 'teach', gid: 'class:room', title: 'Teach the Juniors', topic: 'teach', icon: '🧑🏾‍🏫', kind: 'walk', music: 'calm',
  blurb: 'Plan with your staff mentor, set up the room, then teach two parts of the Knot Tying honour to six Juniors. Help the stuck ones, keep the bored ones busy, and check that everyone can do it.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap a person or a ❗ to go to it.',
  sky: { top: '#7FA9D6', bottom: '#F2E6C8', fogNear: 60, fogFar: 140, sun: '#FFF1D8', sunI: 2.0, sunPos: [6, 12, 8], hemi: 1.7, skyLight: '#F4F1EA', groundLight: '#8A7A60' },
  ground: '#6FA04A', modes: { endless: ['🧑🏾‍🏫', 'The lesson', 'Sabbath afternoon in the church hall. About 8 minutes.'] }, board: 'endless', levels: 1,
  start: [5.6, 0, 6.2], startRy: PI * 1.1, bounds: [-7.6, -6.4, 7.6, 7.2], intro: [-6, 30, 22], camK: 0.78, questTitle: 'Your lesson', coinIcon: '🪢',
  async build(w, progress) {
    const B = (n, ...a) => new THREE.Mesh(prop(n, ...a), MAT.flat);
    // the hall: floor, three walls, windows, the board
    w.add(new THREE.Mesh(merge([P(G.box(16.4, 0.1, 14.6), '#C9A46A', [0, -0.04, 0]), ...Array.from({ length: 16 }, (_, i) => P(G.box(0.02, 0.11, 14.6), '#B48E57', [-7.5 + i, -0.035, 0]))]), MAT.flat));
    w.add(new THREE.Mesh(merge([P(G.box(16.4, 3.4, 0.2), '#EFE6D2', [0, 1.7, -7.3]), P(G.box(0.2, 3.4, 14.6), '#E6DCC4', [-8.2, 1.7, 0])]), MAT.flat));
    const right = w.add(new THREE.Mesh(merge([P(G.box(0.2, 3.4, 9.2), '#E6DCC4', [8.2, 1.7, -2.7]), P(G.box(0.2, 1.0, 2.6), '#E6DCC4', [8.2, 2.9, 3.1]), P(G.box(0.2, 3.4, 1.6), '#E6DCC4', [8.2, 1.7, 6.5])]), MAT.flat)); w.fadeable(right);
    w.box(-8.4, -7.5, 8.4, -7.1); w.box(-8.4, -7.5, -8.0, 7.4); w.box(8.0, -7.5, 8.4, 1.8); w.box(8.0, 4.4, 8.4, 7.4);
    [[-5.2, -7.18], [5.2, -7.18]].forEach(([x, z]) => w.add(B('window2'), x, 2.0, z));
    w.add(B('window2'), -8.08, 2.0, -1.5, PI / 2); w.add(B('window2'), -8.08, 2.0, 3.0, PI / 2);
    w.add(B('board'), 0, 0, -7.15); w.boardSign = sign(['Knot Tying', 'square knot · clove hitch'], 3.6, 0.9, { bg: '#F7F7F5', fg: '#1F4D3A', r: 8 }); w.add(w.boardSign, 0, 2.45, -7.08); w.boardSign.visible = false;
    w.poster = w.add(B('knotposter'), 2.95, 1.9, -7.12); w.poster.visible = false;
    const verse = sign(['“Train up a child in the way he should go”', 'Proverbs 22:6'], 4.2, 0.6, { bg: '#1F4D3A', fg: '#F2C14E', r: 8 }); w.add(verse, -4.6, 3.05, -7.17);
    w.put('tablef', null, 0, -4.9); w.box(-1.15, -5.4, 1.15, -4.4);
    w.put('cupb', null, -7.4, -4.6); w.box(-7.95, -5.55, -6.85, -3.65);
    w.ropeBox = w.add(B('ropebox'), -7.4, 2.1, -4.9); w.posterRoll = w.add(new THREE.Mesh(merge([P(G.cyl(0.07, 0.07, 1.1, 8), '#F2C14E', [0, 0, 0], [0, 0, PI / 2])]), MAT.flat), -7.4, 2.2, -4.2);
    w.tableRopes = w.add(B('ropebox'), 0, 0.82, -4.9); w.tableRopes.visible = false;
    progress(0.2);
    // six Juniors at their desks, facing the board
    w.kids = [];
    for (let i = 0; i < KIDS.length; i++) {
      const k = KIDS[i], [x, z] = SEATS[i];
      w.put('jdesk', null, x, z - 0.6); w.put('jchair', null, x, z, PI); w.box(x - 0.65, z - 0.95, x + 0.65, z + 0.3);
      const n = await w.npc(k.id, Object.assign({ scale: 0.7 }, k.look), 'pathfinder', x, z + 0.05, PI, 'Sitting_Idle_Loop', 0.0); n.anim = 'Sitting_Idle_Loop';
      w.cols = w.cols.filter(c => c !== n.col);
      const rp = w.add(B('rope', ['#F2E6C8', '#D3243A', '#2F6DB5'][i % 3]), x + 0.2, 0.62, z - 0.6, i); rp.visible = false;
      w.kids.push({ k, n, x, z, rope: rp, ev: null, checked: false, done: 0 });
      progress(0.2 + i * 0.1);
    }
    const m = await w.npc('mentor', { body: 'f', skin: 1, hair: 'long', bottom: 'skirt', scale: 1.0 }, 'counsellor', 6.0, 3.6, -PI * 0.7, 'Idle_Talking_Loop'); m.anim = 'Idle_Talking_Loop';
    // things to use
    w.thing({ id: 'mentor', x: 6.0, z: 3.6, npc: m, icon: '💬', verb: 'Talk to Sister Joy', when: mentorReady, use: talkMentor });
    w.thing({ id: 'cupboard', x: -7.4, z: -4.6, h: 2.1, stand: [-6.3, -4.6], icon: '📦', verb: 'Take the box of ropes', when: w => w.isDone('plan') && !w.isDone('ropes') && !w.carrying, use: async w => { w.ropeBox.visible = false; await w.anim('PickUp_Table', 700); w.carry('ropes', B('ropebox')); } });
    w.thing({ id: 'table', x: 0, z: -4.9, h: 1.0, stand: [0, -3.7], icon: '🪢', verb: 'Put the ropes on the table', when: w => w.carrying === 'ropes', use: async w => { w.drop(); w.tableRopes.visible = true; await w.anim('Interact', 700); w.kids.forEach(k => { k.rope.visible = true; }); w.done('ropes', 100); w.ui.toast('A rope for every Junior, enough for everyone', 'good'); } });
    w.thing({ id: 'poster', x: -7.4, z: -4.2, h: 2.1, stand: [-6.3, -4.0], icon: '🖼️', verb: 'Take the knot poster', when: w => w.isDone('ropes') && !w.isDone('poster') && !w.carrying, use: async w => { w.posterRoll.visible = false; await w.anim('PickUp_Table', 700); const p = B('knotposter'); p.scale.setScalar(0.45); w.carry('poster', p, 1.0, 0.32); } });
    w.thing({ id: 'boardpost', x: 2.95, z: -6.9, h: 2.4, stand: [2.95, -5.9], icon: '📌', verb: 'Put the poster up', when: w => w.carrying === 'poster', use: async w => { w.drop(); await w.anim('Interact', 800); w.poster.visible = true; w.done('poster', 100); } });
    w.thing({ id: 'explain', x: -0.8, z: -6.9, h: 2.4, stand: [-0.8, -5.8], icon: '🗣️', verb: 'Explain at the board', when: w => w.phase === 'explain', use: doExplain });
    w.thing({ id: 'show', x: 0, z: -4.9, h: 1.0, stand: [0, -5.85], icon: '🪢', verb: 'Show the knot slowly', when: w => w.phase === 'show', use: doShow });
    w.thing({ id: 'review', x: -0.8, z: -6.9, h: 2.4, stand: [-0.8, -5.8], icon: '🎲', verb: 'Finish with a review', when: w => w.phase === 'review', use: doReview });
    w.kids.forEach(kd => {
      Object.keys(EVENTS).forEach(kind => w.thing({ id: kd.k.id + '_' + kind, x: kd.x, z: kd.z, h: 0.9, r: 1.6, stand: [kd.x + 0.95, kd.z - 0.2], icon: EVENTS[kind].icon, verb: EVENTS[kind].verb(kd.k.name), when: w => w.phase === 'try' && kd.ev && kd.ev.kind === kind, use: w => helpKid(w, kd) }));
      w.thing({ id: kd.k.id + '_check', x: kd.x, z: kd.z, h: 0.9, r: 1.6, stand: [kd.x + 0.95, kd.z - 0.2], icon: '✔️', verb: 'Check ' + kd.k.name + '’s knots', when: w => w.phase === 'check' && !kd.checked, use: w => checkKid(w, kd) });
    });
    w.hooks.push(tryPhase);
  },
  begin(w) { w.phase = 'plan'; w.setQuests([{ id: 'plan', text: 'Plan your lesson with Sister Joy, your staff mentor' }]); w.ui.banner('Teach the Juniors', 'Sabbath, 3 p.m. Six Juniors are waiting.', 2600); },
};

const JOY = 'Sister Joy', JI = '🙋🏾‍♀️';
function mentorReady(w) { return !w.isDone('plan') || (w.isDone('poster') && !w.started) || (w.isDone('review') && !w.isDone('after')); }
async function talkMentor(w) {
  w.faceEach(w.npcs.mentor);
  if (!w.isDone('plan')) {
    await w.say(JOY, 'Happy Sabbath! For OL 3 you’ll teach two parts of an honour to the Juniors. I’m your staff mentor: let’s plan it together.', { icon: JI });
    await w.ask({ who: JOY, icon: JI, q: 'Which honour will you teach?', opts: ['Knot Tying: you know it well, and it’s hands-on', 'One you’ve never done, learned this morning', 'Whatever the Juniors shout first'], right: 0, why: 'Choose the honour together with your mentor: one you know well, or learn it first.' });
    await w.ask({ who: JOY, icon: JI, q: 'Which two parts will work well for Juniors?', opts: ['Tie a square knot, and tie a clove hitch', 'Write the history of rope-making', 'Tie every knot in the book from memory'], right: 0, why: 'Hands-on is best. Break it into small steps they can show you.' });
    await w.ask({ who: JOY, icon: JI, q: 'Which plan works best?', opts: ['Explain → Show → Let them try → Check', 'Talk for 25 minutes, then a quiz', 'Show it once, then home time'], right: 0, why: 'Explain, show, let them try, check. That’s the order in the Learning Lab.' });
    await w.ask({ who: JOY, icon: JI, q: 'How long can Juniors listen before they need to do something?', opts: ['Not long: a few minutes, then switch to doing', 'About 20 minutes', 'The whole lesson'], right: 0, why: 'Keep talks short, then switch to doing.' });
    await w.say(JOY, 'Good plan! Get the box of ropes from the cupboard, enough for everyone, and put up the knot poster. Then we start.', { icon: JI });
    w.done('plan', 100); w.addQuest({ id: 'ropes', text: 'Bring the box of ropes to the front table' }); w.addQuest({ id: 'poster', text: 'Put the knot poster up by the board' });
    return;
  }
  if (!w.started) {
    await w.say(JOY, 'Ready? You have 30 minutes. I’ll sit at the back and watch. Start at the board.', { icon: JI });
    w.started = true; w.points += 50; w.walkNpc(w.npcs.mentor, [[6.6, 5.4]], n => { w.face(n, 0, -5); n.anim = 'Idle_FoldArms_Loop'; n.play('Idle_FoldArms_Loop'); });
    w.addQuest({ id: 'explain', text: 'Explain the square knot at the board' }); w.phase = 'explain';
    ['show', 'try', 'check', 'review'].forEach(id => w.addQuest({ id, text: { show: 'Show it slowly at the front table', try: 'Let them try: walk round and help', check: 'Check each Junior can tie it (0/6)', review: 'Finish with a review' }[id] }));
    return;
  }
  await w.say(JOY, 'Well done! The Juniors loved it. Let’s talk about how it went.', { icon: JI });
  await w.ask({ who: JOY, icon: JI, q: 'What do you write down after you teach?', opts: ['What worked, and what you would change', 'Nothing, it’s over', 'Only the Juniors who got it wrong'], right: 0, why: 'Write what worked and what you would change, ask your mentor for feedback, and record it in your app: the honour, the two parts, the date and your mentor.' });
  w.done('after', 100);
  w.finish({ title: 'You taught the Juniors!', list: ['Remember', [['Proverbs 27:17', '“Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.”'], ['OL 3', 'Record the honour, the two parts you taught, the date and your mentor, then tap “Done – ask my counsellor to check”.']]] });
}
async function doExplain(w) {
  w.face(w.pc, 0, 2); w.boardSign.visible = true; w.pc.play('Idle_Talking_Loop', { fade: 0.2 });
  await w.ask({ who: 'At the board', icon: '🗣️', q: 'How do you explain the square knot?', opts: ['In simple words: it joins two ropes and lies flat, so first-aiders use it for bandages', 'Read a long definition from a book', 'Skip it, they’ll work it out'], right: 0, why: 'Explain: say what it is and why it matters, in simple words.' });
  w.done('explain', 120); w.phase = 'show';
}
async function doShow(w) {
  w.face(w.pc, 0, 2); await w.anim('Interact', 1100);
  await w.ask({ who: 'At the front table', icon: '🪢', q: 'How do you show it?', opts: ['Slowly, where everyone can see, then once more', 'Fast, so it looks impressive', 'Only to the front row'], right: 0, why: 'Show: demonstrate slowly, where everyone can see.' });
  w.done('show', 120); w.phase = 'try'; w.tryT = TRY_SECS; w.evI = 0; w.nextEv = 2; w.helped = 0; w.late = 0;
  w.kids.forEach(k => { k.n.anim = 'Sitting_Talking_Loop'; k.n.play('Sitting_Talking_Loop', { fade: 0.3 }); });
  w.ui.banner('Let them try!', 'Walk round and help where you see ✋ 🥱 💬', 2400);
}
/* during "try": problems pop up; get to them before they spread */
function tryPhase(w, dt) {
  if (w.phase !== 'try' || w.state !== 'play') return;
  w.tryT -= dt; w.nextEv -= dt;
  const open = w.kids.filter(k => k.ev);
  if (w.nextEv <= 0 && w.evI < ORDER.length && open.length < 2) {
    const free = w.kids.filter(k => !k.ev && k.done < 2); const kd = free[(w.evI * 4) % free.length];
    if (kd) { kd.ev = { kind: ORDER[w.evI], t0: w.t }; w.evI++; kd.n.play(kd.ev.kind === 'chat' ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop', { fade: 0.2 }); }
    w.nextEv = 6.5;
  }
  open.forEach(k => { if (!k.ev.warned && w.t - k.ev.t0 > 14) { k.ev.warned = true; w.late++; w.ui.toast(k.k.name + ' needs you!', 'bad'); } });
  const q = w.quests.find(z => z.id === 'try'); const s = Math.max(0, Math.ceil(w.tryT));
  const txt = 'Let them try: walk round and help (' + Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2) + ')'; if (q && q.text !== txt) { q.text = txt; w.drawQuests(); }
  if (w.tryT <= 0 && !open.length && w.evI >= ORDER.length && !w.busy) {
    w.done('try', 150 + Math.max(0, 3 - w.late) * 50); w.phase = 'check';
    w.kids.forEach(k => { k.n.anim = 'Sitting_Idle_Loop'; k.n.play('Sitting_Idle_Loop', { fade: 0.3 }); });
    w.ui.banner('Now check', 'Each Junior shows you both knots', 2200);
  } else if (w.tryT <= 0 && w.evI < ORDER.length) w.nextEv = Math.min(w.nextEv, 0.5);
}
async function helpKid(w, kd) {
  const ev = kd.ev, E = EVENTS[ev.kind]; w.face(w.pc, kd.x, kd.z);
  const fast = w.t - ev.t0 < 10;
  const ok = await w.ask({ who: kd.k.name, icon: E.icon, tag: '🪢 While they practise', q: E.q(kd.k.name), opts: E.opts, right: 0, why: E.why });
  kd.ev = null; kd.done++; if (ok && fast) w.points += 50;
  kd.n.play('Sitting_Talking_Loop', { fade: 0.2 }); w.helped++;
}
async function checkKid(w, kd) {
  w.face(w.pc, kd.x, kd.z); kd.n.play('Sitting_Talking_Loop', { fade: 0.2 }); await w.anim('Idle_Loop', 1000);
  kd.checked = true; kd.n.play('Sitting_Idle_Loop', { fade: 0.3 }); w.points += 40;
  w.ui.toast('✓ ' + kd.k.name + ' ties a square knot and a clove hitch', 'good');
  const n = w.kids.filter(k => k.checked).length, q = w.quests.find(z => z.id === 'check'); if (q) { q.text = 'Check each Junior can tie it (' + n + '/6)'; w.drawQuests(); }
  if (n === w.kids.length) { w.done('check', 150); w.phase = 'review'; }
}
async function doReview(w) {
  w.face(w.pc, 0, 2);
  await w.ask({ who: 'At the board', icon: '🎲', q: 'How do you finish the lesson?', opts: ['A quick review game, then praise what they learned', 'Just say “That’s all”', 'A hard test with marks'], right: 0, why: 'Finish: review with a quick game and praise what they learned.' });
  w.kids.forEach(k => { k.n.anim = 'Sitting_Talking_Loop'; k.n.play('Sitting_Talking_Loop', { fade: 0.3 }); });
  w.done('review', 120); w.phase = 'done'; w.addQuest({ id: 'after', text: 'Talk with Sister Joy about how it went' });
}
