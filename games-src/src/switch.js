/* Switch Run (G-Switch style): run along a floor and a ceiling full of gaps. Tap to flip gravity and land on the other side.
   Collect the nine fruits of the Spirit and reach the finish. Play against bots, or with your class in a room (up to 8 players,
   ready-made chat phrases only, names letters only). Rounds last 2 minutes. */
import { THREE, clamp, lerp, damp, rng, G, P, merge, mesh, MAT, sprite, sign, setSky, SND } from './core.js';
import { prop, BUILD } from './props.js';
import { loadKit, kit } from './kit.js';
import { makeCharacter, myLook, SKIN_TONES, HAIR } from './character.js';

const PI = Math.PI, LEN = 640, TOP = 6, SPEED = 8.5, GRAV = 34, ROUND = 120;
const FRUIT = [['❤️', 'Love'], ['😊', 'Joy'], ['🕊️', 'Peace'], ['⏳', 'Longsuffering'], ['🤲', 'Gentleness'], ['⭐', 'Goodness'], ['⚓', 'Faith'], ['🐑', 'Meekness'], ['🛑', 'Temperance']];
const PHRASES = ['👋 Hi!', '🍀 Good luck!', '🔥 Let’s go!', '😮 Wow!', '👏 Nice one!', '😂', '🙏 Well played', '🔁 Again?'];
const BOTS = [{ n: 'Ann', c: 2 * 8 + 1 }, { n: 'Ravi', c: 3 * 8 + 4 }, { n: 'Keisha', c: 1 * 8 + 3 }];
const COLS = ['#D3243A', '#2F6DB5', '#2E7D4F', '#E8641E', '#8E5BB5', '#E9B649', '#1F9E9E', '#B5452C'];
Object.assign(BUILD, {
  slab: (len, c = '#5E8F3E', side = '#7A5C3A') => merge([P(G.box(len, 0.35, 4), c, [len / 2, -0.175, 0]), P(G.box(len, 0.9, 3.9), side, [len / 2, -0.8, 0])]),
  finishgate: () => merge([P(G.box(0.3, TOP + 1.6, 0.3), '#F4F1EA', [0, TOP / 2, -2.1]), P(G.box(0.3, TOP + 1.6, 0.3), '#F4F1EA', [0, TOP / 2, 2.1]), ...Array.from({ length: 8 }, (_, i) => P(G.box(0.12, (TOP + 1) / 8, 4.2), i % 2 ? '#1E1F22' : '#FFFFFF', [0, -0.2 + (i + 0.5) * (TOP + 1) / 8, 0]))]),
});

/* look <-> one number: body (1 bit), skin (3), hair (2), skirt (1) */
const lookCode = l => ((l.body === 'f' ? 1 : 0) << 6) | (clamp(l.skin | 0, 0, 7) << 3) | ((HAIR[l.body === 'f' ? 'f' : 'm'].indexOf(l.hair) & 3) << 1) | (l.bottom === 'skirt' ? 1 : 0);
const lookOf = c => { const body = (c >> 6) & 1 ? 'f' : 'm'; return { body, skin: Math.min((c >> 3) & 7, SKIN_TONES.length - 1), hair: HAIR[body][(c >> 1) & 3] || HAIR[body][0], bottom: c & 1 ? 'skirt' : 'trousers' }; };

export const SWITCHES = {
  switchrun: { key: 'switchrun', gid: 'switch:run', title: 'Switch Run', icon: '🔁', kind: 'switch', music: 'run',
    blurb: 'Run along the floor and the ceiling. Tap to flip gravity over the gaps, collect the nine fruits of the Spirit, and race your class to the finish.',
    howTo: 'Tap to flip gravity (only when you’re standing on something).',
    sky: { top: '#3F6FB5', bottom: '#F2D7B0', fogNear: 60, fogFar: 160, sun: '#FFE8C0', sunI: 2.2, sunPos: [-6, 12, 10], hemi: 1.5, skyLight: '#DDEBFF', groundLight: '#556B3A' },
    modes: { multi: ['👥', 'Play with your class', 'Start a room or join one with its code. Up to 8 players.'], endless: ['🤖', 'Race the bots', 'You against Ann, Ravi and Keisha.'], practice: ['🐢', 'Practice', 'On your own. Learn the flips.'] }, board: 'endless', levels: 1 },
};

export class Switch {
  constructor(eng, key, mode, opt, ui) { this.eng = eng; this.T = SWITCHES[key]; this.key = key; this.mode = mode; this.opt = opt || {}; this.ui = ui; this.level = 1; this.noSwipe = true; this.ghosts = {}; this.chars = []; }
  async load(progress) {
    progress && progress(0.15); await loadKit(['tree_default', 'tree_oak', 'tree_palmTall', 'plant_bushLarge']);
    const look = myLook(); this.myCode = lookCode(look);
    this.pc = await makeCharacter(look); progress && progress(0.5);
    if (this.mode === 'endless' && !this.opt.idle) this.bots = await Promise.all(BOTS.map(b => makeCharacter(lookOf(b.c), 'pathfinder')));
    progress && progress(0.8);
    this.seed = (Math.random() * 1e9) >>> 0; this.build(this.seed); progress && progress(1);
  }
  /* ---------- the course: platforms on the floor and the ceiling; a gap on one side always has ground on the other ---------- */
  course(seed) {
    const r = rng(seed), floor = [], ceil = [];
    let x = 0, side = 0; const add = (arr, a, b) => arr.push([a, b]);
    let fx = 0, cx = 0;   // where the current platform on each side started
    x = 26; while (x < LEN - 30) {
      const d = x / LEN, gw = 2.6 + d * 2.4 + r() * 1.2;
      if (side === 0) { add(floor, fx, x); fx = x + gw; } else { add(ceil, cx, x); cx = x + gw; }
      x += gw + 7 + r() * 9 * (1 - d * 0.5); if (r() < 0.72) side = 1 - side;
    }
    add(floor, fx, LEN + 30); add(ceil, cx, LEN + 30);
    // fruits along the way, in the order of the verse
    const fruits = FRUIT.map((f, i) => { const fx2 = 40 + i * ((LEN - 80) / 9) + r() * 20; return { x: fx2, y: r() < 0.5 ? 1.1 : TOP - 1.1, f, i }; });
    return { floor, ceil, fruits };
  }
  solid(arr, x) { for (const s of arr) if (x >= s[0] && x <= s[1]) return true; return false; }
  build(seed, go) {
    const { scene } = this.eng; while (scene.children.length) scene.remove(scene.children[0]);
    setSky(scene, this.T.sky); this.world = new THREE.Group(); scene.add(this.world);
    const C = this.C = this.course(seed); this.seed = seed;
    C.floor.forEach(([a, b]) => { const m = mesh(prop('slab', Math.round((b - a) * 10) / 10)); m.position.set(a, 0, 0); this.world.add(m); });
    C.ceil.forEach(([a, b]) => { const m = mesh(prop('slab', Math.round((b - a) * 10) / 10, '#B5452C', '#8E5F33')); m.position.set(a, TOP, 0); m.rotation.x = PI; this.world.add(m); });
    this.fruitObjs = C.fruits.map(fr => { const s = sprite([fr.f[0]], 1.2, 1.2, { bg: 'rgba(255,255,255,.85)', fg: '#2A1C00', w: 128, h: 128, r: 64 }); s.position.set(fr.x, fr.y, 0); this.world.add(s); return s; });
    const fg = mesh(prop('finishgate')); fg.position.set(LEN, 0, 0); this.world.add(fg);
    const fl = sign(['🏁 Finish'], 3, 0.8, { bg: '#1F4D3A', fg: '#F2C14E', r: 10 }); fl.position.set(LEN, TOP + 1.4, 2.3); this.world.add(fl);
    // distance markers and a hilly backdrop
    for (let x = 100; x < LEN; x += 100) { const s = sign([x + ' m'], 1.6, 0.6, { bg: '#F4EFE2', fg: '#1F4D3A', r: 8 }); s.position.set(x, TOP / 2, -2.4); this.world.add(s); }
    const r = rng(seed + 7); for (let x = -20; x < LEN + 60; x += 7) { const t = kit(['tree_default', 'tree_oak', 'tree_palmTall', 'plant_bushLarge'][Math.floor(r() * 4)], 5 + r() * 6); if (t) { t.position.set(x + r() * 4, -6 - r() * 3, -10 - r() * 14); this.world.add(t); } }
    const hill = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 300, 90), new THREE.MeshLambertMaterial({ color: '#5E8F3E' })); hill.rotation.x = -PI / 2; hill.position.set(LEN / 2, -7, 5); this.world.add(hill);
    this.world.add(this.pc.root); this.pc.root.rotation.y = PI / 2; if (this.pc.shadow) this.pc.shadow.visible = false;
    this.runners = [this.newRunner('me', 'You', this.pc, this.myCode)];
    (this.bots || []).forEach((ch, i) => { this.world.add(ch.root); ch.root.rotation.y = PI / 2; if (ch.shadow) ch.shadow.visible = false; const R = this.newRunner('bot' + i, BOTS[i].n, ch, BOTS[i].c, true); R.speedK = [0.99, 0.975, 0.96][i]; this.runners.push(R); });
    Object.values(this.ghosts).forEach(gh => { if (gh.ch) this.world.add(gh.ch.root); if (gh.tag) this.world.add(gh.tag); });
    this.me = this.runners[0]; this.reset(go);
  }
  newRunner(id, name, ch, code, bot) {
    const tag = sprite([name], 2.2, 0.5, { bg: 'rgba(0,0,0,.55)', fg: '#FFFFFF', w: 384, h: 88, r: 30 }); this.world.add(tag);
    return { id, name, ch, code, bot, x: 0, y: 0, vy: 0, g: -1, ground: true, alive: true, fell: 0, got: new Set(), score: 0, fin: 0, tag, lastFlip: 0, lane: 0 };
  }
  /* go: a class race is starting, so straight to the countdown (no lobby). */
  reset(go) {
    this.state = go ? 'count' : this.mode === 'multi' && !this.opt.idle ? 'lobby' : 'intro'; this.t = 0; this.ended = false; this.count = 0;
    this.runners.forEach((R, i) => { Object.assign(R, { x: -i * 1.4, y: 0, vy: 0, g: -1, ground: true, alive: true, fell: 0, got: new Set(), score: 0, fin: 0, lane: (i - 1) * 0.9 }); this.fruitObjs.forEach(f => { f.visible = true; }); this.pose(R); });
    this.hud(true);
    if (this.state === 'lobby') this.lobby();
  }
  pose(R) {
    const ch = R.ch, up = R.g > 0; ch.root.position.set(R.x, R.y, R.lane || 0); ch.root.rotation.set(up ? PI : 0, PI / 2, 0);
    R.tag.position.set(R.x, up ? R.y - 2.3 : R.y + 2.3, R.lane || 0); R.tag.visible = R.alive || this.state === 'lobby';
    ch.root.visible = R.alive;
  }
  /* ---------- input ---------- */
  input(dir) { if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') this.flip(this.me); }
  tapAt() { if (this.state === 'run') this.flip(this.me); }
  flip(R) {
    if (this.state !== 'run' || !R.alive || R.fin) return;
    if (!R.ground && this.t - R.leftGround > 0.12) return;   // only from the ground (a tiny bit of grace)
    R.g = -R.g; R.ground = false; R.vy = R.g * 4; R.leftGround = -9; if (R === this.me) SND.jump();
  }
  go() { if (this.state !== 'intro') return; this.state = 'count'; this.count = 3.2; SND.unlock(); this.eng.watch = true; }
  /* ---------- each frame ---------- */
  idleView(dt) { this.runners.forEach(R => R.ch.update(dt)); this.pc.play('Sprint_Loop'); const t = this.eng.time, c = this.eng.camera, tall = innerHeight > innerWidth; this.me.x = (t * 3) % 60; this.pose(this.me); c.position.set(this.me.x + 3, 3, tall ? 22 : 15); c.lookAt(this.me.x + 3, tall ? 1.5 : 3, 0); }
  camera(dt, snap) { const c = this.eng.camera, tall = innerHeight > innerWidth, x = this.me.x + (tall ? 3.5 : 6), want = new THREE.Vector3(x, TOP / 2, tall ? 16.5 : 14.5); if (snap) c.position.copy(want); else c.position.lerp(want, 1 - Math.exp(-6 * dt)); c.lookAt(c.position.x, TOP / 2 - (tall ? 0.6 : 0), 0); }
  update(dt) {
    this.runners.forEach(R => R.ch.update(dt)); Object.values(this.ghosts).forEach(gh => gh.ch && gh.ch.update(dt));
    if (this.state === 'lobby') { const tp = document.getElementById('h-tap'); if (tp) tp.hidden = true; this.camera(dt, true); this.runners.forEach(R => this.pose(R)); return; }
    if (this.state === 'intro') { this.camera(dt, true); this.runners.forEach(R => { R.ch.play('Idle_Loop'); this.pose(R); }); return; }
    if (this.state === 'count') {
      const left = this.mp ? (this.startAt - this.mp.now()) / 1000 : this.count; if (!this.mp) this.count -= dt;
      const n = Math.ceil(left); if (n !== this.lastN) { this.lastN = n; if (n > 0 && n <= 3) { this.ui.banner(String(n), '', 700); SND.lane(); } }
      if (left <= 0) { this.state = 'run'; this.ui.banner('GO!', 'Tap to flip', 900); SND.power(); SND.startMusic('run'); this.runners.forEach(R => R.ch.play('Sprint_Loop', { fade: 0.1 })); }
      this.camera(dt); return;
    }
    if (this.state !== 'run') { this.camera(dt); this.ghostsMove(dt); return; }
    this.t += dt;
    this.runners.forEach(R => this.step(R, dt));
    this.ghostsMove(dt);
    if (this.mp) { this.sendT = (this.sendT || 0) - dt; if (this.sendT <= 0) { this.sendT = 0.15; this.mp.send(this.state0()); } }
    const others = this.mp ? Object.entries(this.mpPlayers || {}).filter(([u]) => u !== this.mp.uid).every(([, p]) => p.r > 0 || p.at < this.mp.now() - 8000) : this.runners.every(R => R.fin || !R.bot);
    if ((this.me.fin && (others || this.t - this.me.fin > 8)) || this.t >= ROUND) this.finish();
    this.camera(dt); this.hud();
  }
  step(R, dt) {
    if (R.fin) { R.x += SPEED * 0.4 * dt; this.pose(R); return; }
    if (!R.alive) { R.fell -= dt; if (R.fell <= 0) this.respawn(R); return; }
    if (R.bot) this.think(R, dt);
    R.x += SPEED * (R.bot ? R.speedK || 1 : 1) * dt;
    R.vy += R.g * GRAV * dt; R.y += R.vy * dt;
    const onFloor = this.solid(this.C.floor, R.x), onCeil = this.solid(this.C.ceil, R.x), was = R.ground;
    R.ground = false;
    if (R.g < 0 && onFloor && R.y <= 0 && R.y > -1.2) { R.y = 0; R.vy = 0; R.ground = true; }
    if (R.g > 0 && onCeil && R.y >= TOP && R.y < TOP + 1.2) { R.y = TOP; R.vy = 0; R.ground = true; }
    if (was && !R.ground) R.leftGround = this.t;
    if (R.y < -9 || R.y > TOP + 9) { R.alive = false; R.fell = 1.2; if (R === this.me) { SND.hit(); this.ui.toast('Fell off! Back to the last marker', 'bad'); } }
    // fruits
    this.C.fruits.forEach((fr, i) => { if (!R.got.has(i) && Math.abs(fr.x - R.x) < 0.9 && Math.abs(fr.y - (R.g > 0 ? R.y - 0.9 : R.y + 0.9)) < 1.3) { R.got.add(i); R.score += 100; if (R === this.me) { this.fruitObjs[i].visible = false; SND.coin(); this.ui.toast(fr.f[0] + ' ' + fr.f[1], 'good'); } } });
    if (R.x >= LEN) { R.fin = this.t; R.score += Math.max(0, Math.round(1200 - this.t * 8)); if (R === this.me) { SND.win(); this.ui.banner('Finished!', this.place(R) + ' place', 1600); } }
    const anim = R.ground ? 'Sprint_Loop' : 'Jump_Loop'; R.ch.play(anim, { fade: 0.12 });
    this.pose(R);
  }
  respawn(R) { const back = Math.max(0, Math.floor((R.x - 12) / 25) * 25); const safe = [back, back + 5, back + 10, back - 5].find(x => this.solid(this.C.floor, x) && this.solid(this.C.floor, x + 3)) ?? back; R.x = safe; R.y = 0; R.vy = 0; R.g = -1; R.alive = true; R.ground = true; }
  /* bots look a little ahead and flip when their side runs out (and sometimes they're late) */
  think(R, dt) {
    if (!R.ground) return; const ahead = R.x + 1.0;
    const mine = R.g < 0 ? this.C.floor : this.C.ceil, other = R.g < 0 ? this.C.ceil : this.C.floor;
    if (!this.solid(mine, ahead) && this.solid(other, R.x + 2.2)) { if (R.wait === undefined) R.wait = Math.random() < 0.06 ? 0.3 : Math.random() * 0.06; R.wait -= dt; if (R.wait <= 0) { R.wait = undefined; this.flip(R); } }
  }
  place(R) { const all = this.board(); return ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][all.findIndex(b => b.me === (R === this.me) && b.name === (R === this.me ? 'You' : R.name))] || ''; }
  board() {
    const rows = this.runners.map(R => ({ name: R === this.me ? 'You' : R.name, me: R === this.me, fin: R.fin, x: R.x, score: R.score }));
    if (this.mp) Object.entries(this.mpPlayers || {}).forEach(([u, p]) => { if (u !== this.mp.uid) rows.push({ name: p.n, me: false, fin: p.r ? p.r / 1000 : 0, x: p.x || 0, score: p.s || 0 }); });
    return rows.sort((a, b) => (a.fin && b.fin) ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.x - a.x);
  }
  state0() { const R = this.me; return { n: this.myName, at: this.mp.now(), c: this.myCode, s: R.score, x: Math.round(R.x * 10) / 10, y: Math.round(R.y * 10) / 10, g: R.g, r: R.fin ? Math.round(R.fin * 1000) : 0, a: R.alive }; }
  ghostsMove(dt) {
    Object.values(this.ghosts).forEach(gh => { const p = gh.p; if (!p || !gh.ch) return; const lag = this.state === 'run' && !p.r ? Math.min(0.5, (this.mp.now() - p.at) / 1000) : 0;
      gh.x = damp(gh.x, (p.x || 0) + lag * SPEED, 10, dt); gh.y = damp(gh.y, p.y || 0, 14, dt); const up = (p.g || -1) > 0;
      gh.ch.root.position.set(gh.x, gh.y, gh.lane); gh.ch.root.rotation.set(up ? PI : 0, PI / 2, 0); gh.ch.root.visible = p.a !== false;
      gh.tag.position.set(gh.x, up ? gh.y - 2.3 : gh.y + 2.3, gh.lane); gh.ch.play(this.state === 'run' ? 'Sprint_Loop' : 'Idle_Loop', { fade: 0.2 }); });
  }
  finish() {
    if (this.ended) return; this.ended = true; this.state = 'over'; SND.stopMusic();
    const rows = this.board(), pos = rows.findIndex(r => r.me) + 1, R = this.me;
    if (this.mp) { this.mp.send(this.state0()); this.mp.finish(); }
    const score = R.score + (rows.length > 1 ? Math.max(0, (rows.length - pos) * 150) : 0);
    const res = { won: true, score, level: 1, stars: R.got.size === 9 ? 3 : R.got.size >= 5 ? 2 : 1, title: R.fin ? (rows.length > 1 ? ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][pos - 1] + ' place!' : 'Finished!') : 'Time’s up!',
      stats: [[R.got.size + '/9', 'fruits'], [Math.round(Math.min(R.x, LEN)) + ' m', 'distance'], [R.fin ? fmt(R.fin) : '–', 'time'], [score, 'points']],
      list: ['The race', rows.map((r, i) => [(i + 1) + '. ' + r.name, r.fin ? fmt(r.fin) : Math.round(Math.min(r.x, LEN)) + ' m'])], save: this.mode === 'practice' ? '' : 'endless', correct: R.got.size, wrong: 0, dodged: {} };
    setTimeout(() => this.ui.end(res), 1400);
  }
  hud(force) { const R = this.me, rows = this.runners.length > 1 || this.mp ? this.board() : null; this.ui.hud({ score: R.score, coins: R.got.size, coinIcon: '🍇', hearts: null, dist: 0, label: this.state === 'lobby' ? 'Class room' : this.state === 'intro' ? this.T.title : Math.round(Math.min(R.x, LEN)) + ' m' + (rows ? ' · ' + (['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'][rows.findIndex(r => r.me)] || '') : '') + ' · ' + fmt(Math.max(0, ROUND - this.t)), shield: 0, magnet: 0, double: 0, badges: null }, force); }

  /* ---------- the class room (lobby) ---------- */
  el() { let e = document.getElementById('h-lobby'); if (!e) { e = document.createElement('div'); e.id = 'h-lobby'; e.className = 'panel walk-ui'; document.getElementById('s-hud').appendChild(e); } e.hidden = false; return e; }
  async lobby() {
    const e = this.el(); let nm = ''; try { nm = localStorage.getItem('gq3d-mpname') || ''; } catch (er) { nm = ''; }
    e.innerHTML = '<b class="lb-t">👥 Play with your class</b><label>Your first name<input id="lb-name" maxlength="24" autocomplete="off" value="' + nm.replace(/"/g, '') + '" placeholder="First name"></label>'
      + '<button class="lb-go" data-lb="host">Start a room</button><div class="lb-or">or join one</div><div class="lb-join"><input id="lb-code" maxlength="8" autocomplete="off" placeholder="CODE" autocapitalize="characters"><button data-lb="join">Join</button></div><p class="lb-msg"></p><p class="lb-note">Names are letters only. Chat is ready-made phrases only.</p>';
    const msg = t => { e.querySelector('.lb-msg').textContent = t; };
    e.onclick = async ev => {
      const b = ev.target.closest('[data-lb]'); if (!b) return; ev.stopPropagation();
      const M = await import('./mp.js'); const name = M.cleanName(e.querySelector('#lb-name').value);
      if (!name) { msg('Type your first name (letters only).'); return; }
      try { localStorage.setItem('gq3d-mpname', name); } catch (er) { /* private mode */ }
      msg('Connecting…'); this.myName = name;
      try {
        await M.connect(); let room;
        if (b.dataset.lb === 'host') { let code = M.newCode(); room = new M.Room(code, 'switch'); await room.host(this.seed); }
        else { const code = M.cleanCode(e.querySelector('#lb-code').value); if (code.length < 4) { msg('Type the room code.'); return; } room = new M.Room(code, 'switch'); await room.join(); }
        this.mp = { room, uid: room.uid, now: M.now, send: s => room.send(s), finish: () => room.finish() }; this.mpRoom = room;
        await room.me({ n: name, at: M.now(), c: this.myCode, s: 0, x: 0, y: 0, g: -1, r: 0, a: true });
        room.listen({ meta: m => this.onMeta(m), players: p => this.onPlayers(p), chat: c => this.onChat(c) });
        this.room();
      } catch (er) { const k = er && er.message; msg(k === 'nomatch' ? 'No room with that code.' : k === 'started' ? 'That room has already started.' : k === 'full' ? 'That room is full (8 players).' : 'Couldn’t connect. Check your internet.'); }
    };
  }
  room() {
    const e = this.el(), host = this.mpRoom.isHost;
    e.innerHTML = '<b class="lb-t">Room code</b><div class="lb-code">' + this.mpRoom.code + '</div><p class="lb-note">' + (host ? 'Tell your friends this code. Start when everyone is in.' : 'Waiting for the host to start…') + '</p><div class="lb-list"></div>'
      + '<div class="lb-chat">' + PHRASES.map((p, i) => '<button data-say="' + i + '">' + p + '</button>').join('') + '</div>' + (host ? '<button class="lb-go" data-start>▶ Start the race</button>' : '') + '<button class="lb-leave" data-leave>Leave</button>';
    e.onclick = ev => { const s = ev.target.closest('[data-say]'); if (s) { this.mpRoom.say(+s.dataset.say); return; }
      if (ev.target.closest('[data-start]')) { const seed = (Math.random() * 1e9) >>> 0; this.mpRoom.start(seed, this.mp.now() + 4500); return; }
      if (ev.target.closest('[data-leave]')) { this.mpRoom.leave(); this.mp = null; this.mpRoom = null; this.lobby(); } };
    this.drawList();
  }
  drawList() { const e = document.querySelector('#h-lobby .lb-list'); if (!e || !this.mpRoom) return; const ps = this.mpPlayers || {};
    e.innerHTML = Object.entries(ps).map(([u, p]) => '<span class="lb-p' + (u === this.mp.uid ? ' me' : '') + '"><i style="background:' + COLS[Math.abs(hashS(u)) % COLS.length] + '"></i>' + esc(p.n) + (this.mpRoom.meta && this.mpRoom.meta.host === u ? ' ⭐' : '') + (this.say && this.say[u] ? ' <em>' + PHRASES[this.say[u]] + '</em>' : '') + '</span>').join('') || '<span class="lb-p">…</span>'; }
  async onPlayers(ps) {
    this.mpPlayers = ps; this.drawList();
    for (const [u, p] of Object.entries(ps)) { if (u === this.mp.uid || this.ghosts[u]) continue; const gh = this.ghosts[u] = { p, x: p.x || 0, y: 0, lane: -1.2 - (Object.keys(this.ghosts).length % 3) * 0.9 };
      makeCharacter(lookOf(p.c | 0), 'pathfinder').then(ch => { if (!this.ghosts[u]) return; gh.ch = ch; ch.root.rotation.y = PI / 2; if (ch.shadow) ch.shadow.visible = false; this.world.add(ch.root); gh.tag = sprite([p.n], 2.2, 0.5, { bg: 'rgba(0,0,0,.55)', fg: '#FFFFFF', w: 384, h: 88, r: 30 }); this.world.add(gh.tag); }); }
    Object.keys(this.ghosts).forEach(u => { if (!ps[u]) { const gh = this.ghosts[u]; if (gh.ch) this.world.remove(gh.ch.root); if (gh.tag) this.world.remove(gh.tag); delete this.ghosts[u]; } else this.ghosts[u].p = ps[u]; });
  }
  onChat(c) { if (!this.say) this.say = {}; this.say[c.u] = c.p; this.drawList(); if (this.state === 'run' || this.state === 'over') { const p = (this.mpPlayers || {})[c.u]; if (p) this.ui.toast(p.n + ': ' + PHRASES[c.p], 'good'); } setTimeout(() => { if (this.say && this.say[c.u] === c.p) { delete this.say[c.u]; this.drawList(); } }, 5000); }
  onMeta(m) {
    if (!m) { if (this.state === 'lobby' && this.mpRoom && !this.mpRoom.isHost) { this.ui.toast('The host closed the room', 'bad'); this.mpRoom = null; this.mp = null; this.lobby(); } return; }
    if (m.state === 'run' && this.state === 'lobby') { this.build(m.seed, true); const e = document.getElementById('h-lobby'); if (e) e.hidden = true; this.state = 'count'; this.startAt = m.start; this.lastN = null; SND.unlock(); this.eng.watch = true; }
  }
  stop() { if (this.mpRoom) { this.mpRoom.leave(); this.mpRoom = null; } const e = document.getElementById('h-lobby'); if (e) e.hidden = true; }
}
const fmt = s => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hashS = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
