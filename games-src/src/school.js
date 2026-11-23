/* School Days (Sharing Jesus, CO 2): lunch break at a Guyanese secondary school.
   Six friends, six situations. Be a friend first, listen, tell your story (before, how, now),
   pray for them by name, and invite them to something. Follows the Sharing Jesus lessons. */
import { THREE, G, P, merge, MAT, setSky } from './core.js';
import { prop, BUILD } from './props.js';

const PI = Math.PI;
Object.assign(BUILD, {
  block2: () => { const p = [P(G.box(30, 3.2, 6), '#F2E6C8', [0, 1.6, 0]), P(G.box(30, 0.3, 8), '#D9CDB0', [0, 3.35, 1]), P(G.box(30, 3.0, 6), '#F2E6C8', [0, 5.0, 0]), P(G.box(30.6, 0.4, 7.6), '#2F5FA8', [0, 6.7, 0.6]),
    P(G.box(30, 0.9, 0.1), '#2F5FA8', [0, 3.95, 4.95])];
    for (let x = -13; x <= 13; x += 3.25) { p.push(P(G.box(1.6, 1.2, 0.06), '#9ED3E8', [x, 1.9, 3.02]), P(G.box(1.6, 1.2, 0.06), '#9ED3E8', [x, 5.1, 3.02]), P(G.box(0.12, 3.3, 0.12), '#E9E2D3', [x + 1.6, 1.65, 4.9])); }
    for (let x = -11.4; x <= 13; x += 6.5) p.push(P(G.box(1.1, 2.2, 0.08), '#7B5A3A', [x, 1.1, 3.04]));
    return merge(p); },
  roundbench: () => merge([P(G.tor(1.6, 0.25, 4, 16), '#8A5A2B', [0, 0.45, 0], [PI / 2, 0, 0], [1, 1, 0.5]), ...Array.from({ length: 6 }, (_, i) => P(G.box(0.12, 0.45, 0.12), '#5A3A22', [Math.cos(i * PI / 3) * 1.6, 0.22, Math.sin(i * PI / 3) * 1.6]))]),
  court: () => { const p = [P(G.box(12, 0.04, 8), '#3E7D5A', [0, 0.02, 0]), P(G.box(12, 0.01, 0.08), '#FFFFFF', [0, 0.045, 3.9]), P(G.box(12, 0.01, 0.08), '#FFFFFF', [0, 0.045, -3.9]), P(G.box(0.08, 0.01, 8), '#FFFFFF', [5.9, 0.045, 0]), P(G.box(0.08, 0.01, 8), '#FFFFFF', [-5.9, 0.045, 0]), P(G.box(0.08, 0.01, 8), '#FFFFFF', [0, 0.045, 0]), P(G.tor(1.2, 0.04, 3, 20), '#FFFFFF', [0, 0.045, 0], [PI / 2, 0, 0])];
    for (const sd of [-1, 1]) p.push(P(G.cyl(0.08, 0.08, 3.0, 6), '#6B6F76', [sd * 5.6, 1.5, 0]), P(G.box(0.08, 1.0, 1.6), '#FFFFFF', [sd * 5.4, 3.0, 0]), P(G.tor(0.24, 0.025, 4, 12), '#E2412C', [sd * 5.1, 2.7, 0], [PI / 2, 0, 0]));
    return merge(p); },
  picnic: () => merge([P(G.box(2.2, 0.07, 0.9), '#A8743F', [0, 0.76, 0]), P(G.box(2.2, 0.06, 0.35), '#8E5F33', [0, 0.45, 0.75]), P(G.box(2.2, 0.06, 0.35), '#8E5F33', [0, 0.45, -0.75]),
    ...[-0.9, 0.9].map(x => P(G.box(0.08, 0.76, 0.08), '#5A3A22', [x, 0.38, 0])), ...[-0.9, 0.9].flatMap(x => [P(G.box(0.07, 0.45, 0.07), '#5A3A22', [x, 0.22, 0.75]), P(G.box(0.07, 0.45, 0.07), '#5A3A22', [x, 0.22, -0.75])])]),
  canteen: () => merge([P(G.box(6, 3.0, 5), '#E9B649', [0, 1.5, 0]), P(G.box(6.6, 0.2, 6.2), '#B5452C', [0, 3.1, 0.4]), P(G.box(4.4, 1.0, 0.08), '#2A2D33', [0, 1.8, 2.52]), P(G.box(4.6, 0.12, 0.6), '#F4F1EA', [0, 1.15, 2.75])]),
  wallseg: (len = 4) => merge([P(G.box(len, 1.6, 0.22), '#E3DCCB', [0, 0.8, 0]), P(G.box(len, 0.12, 0.3), '#2F5FA8', [0, 1.65, 0])]),
  gguy: () => merge([P(G.cyl(0.06, 0.08, 6, 6), '#D9D9D9', [0, 3, 0]), P(G.box(1.8, 1.1, 0.03), '#169B62', [0.92, 5.4, 0]),
    P(G.tri(0.58, 0.035), '#FFFFFF', [0.66, 5.4, 0.02], [PI / 2, 0, -PI / 2], [1.9, 1, 1]), P(G.tri(0.52, 0.04), '#FCD116', [0.62, 5.4, 0.03], [PI / 2, 0, -PI / 2], [1.85, 1, 0.9]),
    P(G.tri(0.33, 0.045), '#000000', [0.38, 5.4, 0.04], [PI / 2, 0, -PI / 2], [1.4, 1, 1]), P(G.tri(0.28, 0.05), '#CE1126', [0.36, 5.4, 0.05], [PI / 2, 0, -PI / 2], [1.35, 1, 0.9])]),
  ball: () => merge([P(G.ico(0.13, 1), '#E07A2C', [0, 0.13, 0])]),
  book: () => merge([P(G.box(0.22, 0.04, 0.3), '#1F4D3A', [0, 0, 0])]),
});

const F = (body, skin, hair, x) => Object.assign({ body, skin, hair, bottom: body === 'f' ? 'skirt' : 'trousers' }, x || {});
const FRIENDS = [
  { id: 'jordan', name: 'Jordan', where: 'under the samaan tree', look: F('m', 1, 'short'), at: [-2.9, 3.75, 0], anim: 'Sitting_Idle_Loop', stand: [-2.9, 5.3], icon: '😔' },
  { id: 'ravi', name: 'Ravi', where: 'alone in the canteen', look: F('m', 3, 'parted'), at: [-11.2, -3.75, 0], anim: 'Sitting_Idle_Loop', stand: [-11.2, -1.55], r: 2.6, icon: '🍛' },
  { id: 'maya', name: 'Maya', where: 'on the basketball court', look: F('f', 2, 'long'), at: [9.4, 2.4, -0.4], anim: 'Idle_Loop', stand: [9.4, 3.9], icon: '🏀' },
  { id: 'kevin', name: 'Kevin', where: 'by the school block', look: F('m', 0, 'buzzed'), at: [5.5, -7.6, 0.2], anim: 'Idle_FoldArms_Loop', stand: [5.5, -6.1], icon: '🙄' },
  { id: 'aaliyah', name: 'Aaliyah', where: 'by the flagpole', look: F('f', 1, 'buns'), at: [6.6, 8.4, -0.5], anim: 'Idle_Loop', stand: [6.0, 9.8], icon: '📖' },
  { id: 'shanice', name: 'Shanice', where: 'on the bench by the stairs', look: F('f', 0, 'short'), at: [-9.5, -7.3, 0], anim: 'Sitting_Idle_Loop', stand: [-9.5, -5.8], icon: '😶' },
];

export const SCHOOL = {
  key: 'school', gid: 'walk:share', title: 'School Days', topic: 'witness', icon: '🏫', kind: 'walk', music: 'calm', outfit: 'school',
  blurb: 'Lunch break at school. Six friends, six situations. Be a friend first, listen, tell your story, pray for them by name, and invite them.',
  howTo: 'Tap where to go, or hold and drag to walk. Tap a friend to talk.',
  sky: { top: '#4F92D8', bottom: '#F2E6C4', fogNear: 60, fogFar: 150, sun: '#FFE8C0', sunI: 2.3, sunPos: [6, 12, 8], hemi: 1.55, skyLight: '#E3EDFF', groundLight: '#6A6A55' },
  ground: '#7FA65A', modes: { endless: ['🏫', 'Lunch break', 'Talk with six friends. About 10 minutes.'] }, board: 'endless', levels: 1,
  kit: ['tree_oak', 'tree_fat', 'tree_palmTall', 'plant_bushLarge', 'flower_redA', 'flower_yellowA'],
  start: [0, 0, 11.5], startRy: PI, bounds: [-19.4, -8.4, 19.4, 13.4], intro: [-12, 40, 30], questTitle: 'Friends to talk to', coinIcon: '🙏',
  async build(w, progress) {
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(40, 23), new THREE.MeshLambertMaterial({ color: '#CFC6B2' })); yard.rotation.x = -PI / 2; yard.position.set(0, 0.005, 2.5); w.world.add(yard);
    w.fadeable(w.put('block2', null, 0, -12)); w.box(-15, -15, 15, -9.2); for (let x = -13; x <= 13; x += 3.25) w.circle(x + 1.6, -7.1, 0.14);
    w.put('court', null, 11, 1); w.box(5.35, 0.85, 5.5, 1.15); w.box(16.5, 0.85, 16.65, 1.15);
    const ct = w.put('canteen', null, -16.4, -2.4, PI / 2); w.solid(ct, 0.1);
    w.put('picnic', null, -11.2, -3.0, 0); w.box(-12.3, -3.9, -10.1, -2.1);
    w.put('picnic', null, -11.2, 1.6, 0); w.box(-12.3, 0.7, -10.1, 2.5);
    w.put('roundbench', null, -2.9, 2.1); w.circle(-2.9, 2.1, 1.85);
    const tree = w.kit('tree_oak', 10, -2.9, 2.1, 0.3, 0.5); if (tree) w.fadeable(tree);
    w.put('gguy', null, 4.6, 8.2); w.circle(4.6, 8.2, 0.15);
    w.put('bench', null, -9.5, -7.6, 0); w.box(-10.4, -7.85, -8.6, -7.35);
    w.put('bench', null, 7.8, 8.3, -PI / 2);
    // the school wall and gate
    for (let x = -20; x < 20; x += 4) if (x !== -4 && x !== 0) w.put('wallseg', [4], x + 2, 14);
    w.put('wallseg', [2], -3, 14); w.put('wallseg', [2], 3, 14);
    for (let z = -10; z < 14; z += 4) { w.put('wallseg', [4], -20, z + 2, PI / 2); w.put('wallseg', [4], 20, z + 2, PI / 2); }
    [[-17, 11], [17, 11], [-17, -6], [17.5, -6.5], [12, 11.5]].forEach(([x, z], i) => w.kit(i % 2 ? 'tree_palmTall' : 'tree_fat', i % 2 ? 7 : 5, x, z, i, 0.35));
    for (let i = 0; i < 8; i++) w.kit(i % 2 ? 'flower_redA' : 'flower_yellowA', 0.6, -6 + i * 0.5, 12.8, i);
    const ball = new THREE.Mesh(prop('ball'), MAT.flat); w.add(ball, 10.2, 0, 2.9);
    progress(0.25);
    w.friends = {};
    for (let i = 0; i < FRIENDS.length; i++) {
      const f = FRIENDS[i]; const n = await w.npc(f.id, f.look, 'school', f.at[0], f.at[1], f.at[2], f.anim); n.anim = f.anim; w.friends[f.id] = { f, n, talked: false, invited: false };
      w.thing({ id: f.id, x: f.at[0], z: f.at[1], stand: f.stand, r: f.r || 1.7, icon: f.icon, verb: 'Talk to ' + f.name, when: w => !w.friends[f.id].talked && w.state === 'play', use: TALK[f.id] });
      progress(0.25 + (i + 1) / FRIENDS.length * 0.7);
    }
    w.thing({ id: 'gate', x: 0, z: 13.2, h: 1.6, icon: '🌇', verb: 'Meet your friends at the gate', when: w => w.quests.some(q => q.id === 'vespers' && !q.done), use: vespers });
    w.hooks.push(checkFriends);
  },
  begin(w) { w.setQuests(FRIENDS.map(f => ({ id: f.id, text: f.name + ', ' + f.where }))); w.prayers = 0; w.ui.banner('Lunch break', 'Six friends. Be a friend first.', 2600); },
};

/* ---------- the conversations ---------- */
function ok(w, id) { const fr = w.friends[id]; fr.talked = true; }
async function pray(w, id) {
  const name = w.friends[id].f.name;
  await w.choose({ who: 'Your prayer list', icon: '🙏', q: 'Add ' + name + ' to your prayer list?', text: 'Pray for them by name, every day.', opts: ['🙏 Yes, I’ll pray for ' + name + ' every day'] });
  w.prayers = (w.prayers || 0) + 1; w.done(id); w.friends[id].n.play(w.friends[id].f.anim, { fade: 0.3 });
}
function invite(w, id) { w.friends[id].invited = true; }
const me = id => ({ who: FRIENDS.find(f => f.id === id).name, icon: FRIENDS.find(f => f.id === id).icon });
const TALK = {
  async jordan(w) {
    const J = me('jordan'); w.face(w.pc, -2.9, 3.75);
    await w.ask({ ...J, who: 'Under the samaan tree', q: 'Jordan is sitting alone with his head down. What do you do first?', opts: ['Sit with him and ask how he’s doing', 'Hand him a tract and walk away', 'Tell him to cheer up'], right: 0, why: 'Friend first. People listen to their friends.' });
    await w.say('Jordan', 'Exams are next week, and my parents keep fighting. I can’t sleep.', { icon: J.icon });
    await w.ask({ ...J, q: 'What do you say?', opts: ['“That sounds really hard. What’s been the hardest part this week?”', '“Just pray more and you’ll be fine.”', '“At least you’re not failing like Kevin.”'], right: 0, why: 'Good listeners look at you, don’t interrupt, and ask questions.' });
    await w.say('Jordan', 'Mostly at night. It goes round and round in my head. Thanks for asking. Nobody asks.', { icon: J.icon });
    await w.ask({ ...J, q: 'Jordan looks a bit better. What next?', opts: ['Offer to pray with him, now or later', 'Preach about the end of the world', 'Tell everyone about his parents'], right: 0, why: 'Offer to pray with them. And keep what they tell you private.' });
    await w.say('Jordan', 'Yeah… okay. Can you pray now? Quick, before the bell.', { icon: J.icon, next: '🙏 Pray together ▶' });
    invite(w, 'jordan'); ok(w, 'jordan'); await pray(w, 'jordan');
  },
  async ravi(w) {
    const R = me('ravi'); w.face(w.pc, -11.2, -3.75);
    await w.ask({ ...R, who: 'In the canteen', q: 'A new student is eating alone. What do you do?', opts: ['Sit with him and introduce yourself', 'Wait for him to come to you', 'Laugh about his accent with your friends'], right: 0, why: 'Notice someone: a classmate who sits alone. Be friendly every day.' });
    await w.say('Ravi', 'I’m Ravi. We just moved from Berbice. I don’t know anybody here yet.', { icon: R.icon });
    await w.ask({ ...R, q: 'What could you invite him to?', opts: ['Football at lunch tomorrow, and Pathfinders on Sunday', 'Nothing. He’ll find friends eventually.', 'A two-hour Bible study on his first day'], right: 0, why: 'Invite them to something fun first, like Pathfinders or a sports day.' });
    await w.say('Ravi', 'Football? For real? I play striker. And Pathfinders… what do you do there?', { icon: R.icon, next: '“Camping, drills, honours. Come see!” ▶' });
    invite(w, 'ravi'); ok(w, 'ravi'); await pray(w, 'ravi');
  },
  async maya(w) {
    const M = me('maya'); w.faceEach(w.friends.maya.n);
    await w.say('Maya', 'Party at Keisha’s on Friday night! You’re coming, right?', { icon: M.icon });
    await w.ask({ ...M, q: 'What do you say?', opts: ['“I keep the Sabbath from Friday sunset. Come with me to youth vespers! Music, and food after.”', '“Parties are sinful. You’ll be lost.”', '“Okay. I’ll sneak out.”'], right: 0, why: 'Answer kindly and honestly, then invite. Invite, don’t preach.' });
    await w.say('Maya', 'Vespers? Is that the one with the guitars? Hmm… okay, maybe. If you save me a seat.', { icon: M.icon });
    invite(w, 'maya'); ok(w, 'maya'); await pray(w, 'maya');
  },
  async kevin(w) {
    const K = me('kevin'); w.faceEach(w.friends.kevin.n);
    await w.say('Kevin', 'Church is boring. And the Bible is just old stories.', { icon: K.icon });
    await w.ask({ ...K, q: 'What do you do?', opts: ['Stay calm and ask what makes him say that', 'Argue until he admits he’s wrong', 'Make fun of what he believes'], right: 0, why: '“Let your speech be alway with grace” (Colossians 4:6). Respect and kindness make people listen.' });
    await w.say('Kevin', 'My mum dragged me every week, and everybody acted fake. So what’s so special about Jesus for you, anyway?', { icon: K.icon, next: 'Tell your story ▶' });
    const b = ['I worried all the time about what people thought of me.', 'I was angry a lot and didn’t care about anyone.', 'I went to church, but Jesus didn’t feel real to me.'];
    const h = ['At Pathfinder camp, at the campfire, I prayed and meant it.', 'When I was sick, my grandmother prayed with me every night.', 'I started reading Steps to Christ, and it made sense.'];
    const n = ['Now I have peace, even when things go wrong.', 'Now I know I’m loved, and I want to help people.', 'Now I talk to God every day, like a friend.'];
    const c1 = await w.choose({ who: 'Your story · 1 of 3', icon: '⏮️', q: 'BEFORE: what was your life like?', opts: b });
    const c2 = await w.choose({ who: 'Your story · 2 of 3', icon: '✨', q: 'HOW: how did Jesus meet you?', opts: h });
    const c3 = await w.choose({ who: 'Your story · 3 of 3', icon: '😊', q: 'NOW: what’s different now?', opts: n });
    w.points += 150; await w.say('Your story', b[c1] + ' ' + h[c2] + ' ' + n[c3], { icon: '💬', tag: 'Before, how, now · about a minute', next: 'Tell Kevin ▶' });
    await w.say('Kevin', 'Hm. I didn’t know that about you. That’s… actually real. Maybe I’ll come to that camp-out.', { icon: K.icon });
    invite(w, 'kevin'); ok(w, 'kevin'); await pray(w, 'kevin');
  },
  async aaliyah(w) {
    const A = me('aaliyah'); w.faceEach(w.friends.aaliyah.n);
    await w.say('Aaliyah', 'My grandmother died last month. If God is good, why did that happen?', { icon: A.icon });
    await w.ask({ ...A, q: 'What do you do?', opts: ['Say you’re sorry, listen, and be honest that you don’t have every answer', 'Tell her it was God’s plan, so she shouldn’t be sad', 'Change the subject quickly'], right: 0,
      why: '“I don’t know, but I’ll find out” is fine. Jesus Himself cried when His friend Lazarus died: “Jesus wept” (John 11:35).' });
    await w.ask({ ...A, q: 'She asks if the Bible says anything about death. What do you do?', opts: ['Share a promise, and offer to look into it together', 'Say you don’t do Bible stuff at school', 'Give her a long lecture'], right: 0,
      why: '“And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying” (Revelation 21:4).' });
    await w.say('Aaliyah', 'No more death… I like that. Can we read more on Friday? Just us, and maybe your youth group?', { icon: A.icon });
    invite(w, 'aaliyah'); ok(w, 'aaliyah'); await pray(w, 'aaliyah');
  },
  async shanice(w) {
    const S = me('shanice'); w.face(w.pc, -9.5, -7.3);
    await w.say('Shanice', 'I stopped going to church. A lady there said my skirt was too short, in front of everybody.', { icon: S.icon });
    await w.ask({ ...S, q: 'What do you say?', opts: ['“I’m really sorry that happened to you.” Then listen.', '“She was probably right.”', '“Just get over it.”'], right: 0, why: 'Listen, say you’re sorry it happened, and show her Jesus is different.' });
    await w.ask({ ...S, q: 'What can you tell her about Jesus?', opts: ['He welcomed people others judged, like the woman at the well (John 4)', 'He only likes perfect people', 'Church people are never wrong'], right: 0, why: 'Show them Jesus is different.' });
    await w.say('Shanice', 'The woman at the well… I remember that story. Okay. If you’re there, maybe I’ll come to the seawall walk on Sunday.', { icon: S.icon });
    invite(w, 'shanice'); ok(w, 'shanice'); await pray(w, 'shanice');
  },
};
function checkFriends(w) {
  if (w.state !== 'play' || w.quests.some(q => q.id === 'vespers')) return;
  if (FRIENDS.every(f => w.isDone(f.id))) { w.addQuest({ id: 'vespers', text: 'Friday evening: meet your friends at the gate' }); w.ui.banner('The bell! School’s out.', 'Meet your friends at the gate on Friday evening', 2600); }
}
async function vespers(w) {
  setSky(w.eng.scene, { top: '#2B3F7A', bottom: '#F2A86B', fogNear: 50, fogFar: 140, sun: '#FFB27A', sunI: 1.6, sunPos: [-10, 4, 6], hemi: 1.1, skyLight: '#B8C4FF', groundLight: '#4A4A40' });
  w.ui.banner('Friday evening', 'Youth vespers at church', 2400);
  const came = FRIENDS.filter(f => w.friends[f.id].invited);
  came.forEach((f, i) => { const n = w.friends[f.id].n, a = -PI / 2 + (i - (came.length - 1) / 2) * 0.42; n.anim = 'Idle_Loop'; n.root.position.y = 0; w.walkNpc(n, [[Math.cos(a) * 2.4, 13.2 + Math.sin(a) * 2.4 - 0.4]], m => w.face(m, 0, 12.4)); });
  await new Promise(r => setTimeout(r, 3800));
  await w.say('Friday evening', came.length + ' of your friends came to vespers with you! Keep being their friend, whatever they decide. The Holy Spirit changes hearts. Your part is to be a friend and invite.', { icon: '🌇', next: 'Amen ▶' });
  w.done('vespers', 300); came.forEach(f => w.friends[f.id].n.play('Yes', { fade: 0.2 }));
  w.finish({ title: came.length + ' friends came to vespers!', stats: [[w.prayers || 0, 'on your prayer list']], list: ['Remember', [['Proverbs 18:24', '“A man that hath friends must shew himself friendly.”'], ['1 Peter 3:15', '“Be ready always to give an answer to every man that asketh you a reason of the hope that is in you with meekness and fear.”']]] });
}
