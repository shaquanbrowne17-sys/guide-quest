/* Guide Quest 3D: the arcade page (menus, HUD, results, class boards). */
import { Engine, Input, SND, THREE, esc, store, today, setSky, clamp } from './core.js';
import { Runner, LEVELS, levelPlan } from './runner.js';
import { THEMES } from './themes.js';
import { makeCharacter, myLook, saveLook, SKIN_TONES, HAIR } from './character.js';
import { loadKit } from './kit.js';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const TOKEN = (() => { const t = (Q.get('t') || '').replace(/[^\w-]/g, ''); if (t) return t; try { return localStorage.getItem('gq-sanct-me') || ''; } catch (e) { return ''; } })();
const GAMES = [
  { key: 'seawall', kind: 'run' }, { key: 'choices', kind: 'run' }, { key: 'honour', kind: 'run' },
];
const MODES = { practice: ['🎯', 'Practice', 'Slow, no hearts lost. Learn the moves.'], levels: ['🪜', 'Levels', '10 levels. Each one a bit faster.'], endless: ['♾️', 'Endless', 'Keeps speeding up. Beat the class.'], daily: ['📅', 'Daily Challenge', 'Same run for everyone today.'] };
const ui = {};
let eng, game = null, input, view = 'menu', curKey = Q.get('g') || '', curMode = '', paused = false;

function api(fn, args) { return window.gqCall ? window.gqCall(fn, args) : Promise.reject(new Error('offline')); }
function backUrl() { const k = curKey && THEMES[curKey] ? THEMES[curKey].topic : ''; return 'learn.html?p=learn' + (k ? '&k=' + k : '') + (Q.get('t') ? '&t=' + encodeURIComponent(Q.get('t')) : ''); }
function boardHTML(top, note) {
  if (!top || !top.length) return '<p class="mute">No scores yet. Be the first!</p>' + (note || '');
  return '<ol class="board">' + top.map(x => '<li class="' + (x.me ? 'me' : '') + '"><b>' + x.rank + '</b><span>' + esc(x.name) + '</span><em>' + x.score + '</em></li>').join('') + '</ol>' + (note || '');
}
const joinNote = () => TOKEN ? '' : '<p class="mute">Open Guide Quest from your class link to save your scores.</p>';

/* ---------- screens ---------- */
function show(id) { document.querySelectorAll('.scr').forEach(s => s.hidden = s.id !== id); }
function arcade() {
  view = 'arcade'; curKey = ''; show('s-arcade'); stopGame(); idleScene('seawall');
  $('#s-arcade .cards').innerHTML = GAMES.map(g => { const T = THEMES[g.key]; return '<button class="gcard" data-g="' + g.key + '"><span class="gi">' + T.icon + '</span><b>' + esc(T.title) + '</b><small>' + esc(T.blurb) + '</small></button>'; }).join('');
}
function menu(key) {
  const T = THEMES[key]; if (!T) return arcade();
  view = 'menu'; curKey = key; show('s-menu'); stopGame(); idleScene(key);
  $('#m-title').textContent = T.title; $('#m-icon').textContent = T.icon; $('#m-blurb').textContent = T.blurb;
  $('#m-modes').innerHTML = Object.keys(MODES).map(m => '<button class="mode" data-mode="' + m + '"><span>' + MODES[m][0] + '</span><b>' + MODES[m][1] + '</b><small>' + MODES[m][2] + '</small></button>').join('');
  $('#m-levels').hidden = true;
  const b = $('#m-board'); b.innerHTML = '<p class="mute">Loading the class board…</p>';
  api('l_top3', [T.gid, TOKEN, 'endless']).then(r => { b.innerHTML = '<h4>Class top 5 · Endless</h4>' + boardHTML(r.top, joinNote()); }, () => { b.innerHTML = '<p class="mute">Class board needs the internet.</p>'; });
  history.replaceState(null, '', '?g=' + key + (Q.get('t') ? '&t=' + encodeURIComponent(Q.get('t')) : ''));
}
function levels() {
  const L = store('gq3d-lv-' + curKey) || {}, box = $('#m-levels'); let open = 1; for (let i = 1; i <= LEVELS; i++) if (L[i]) open = i + 1;
  box.innerHTML = '<div class="lvgrid">' + Array.from({ length: LEVELS }, (_, i) => { const n = i + 1, st = L[n] || 0, lock = n > open;
    return '<button class="lv' + (lock ? ' lock' : '') + '" data-lv="' + n + '"' + (lock ? ' disabled' : '') + '><b>' + (lock ? '🔒' : n) + '</b><small>' + (lock ? '' : '★'.repeat(st) + '<s>' + '★'.repeat(3 - st) + '</s>') + '</small></button>'; }).join('') + '</div>';
  box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* a calm scene behind the menus: the Pathfinder waiting on the track */
let idle = null;
async function idleScene(key) {
  if (idle && idle.key === key) return; const my = idle = { key };
  const T = THEMES[key]; setSky(eng.scene, T.sky);
  try {
    const r = new Runner(eng, key, 'practice', {}, quietUI); await r.load();
    if (idle !== my || game) return;
    my.r = r; eng.update = dt => { r.pc.update(dt); const t = eng.time * 0.15, tall = innerHeight > innerWidth, R = tall ? 4.8 : 3.4; eng.camera.position.set(Math.sin(t) * R, tall ? 1.1 : 1.6, -Math.cos(t) * R - 0.5); eng.camera.lookAt(0, tall ? -1.25 : 1.1, 0); if (r.sea) r.sea.update(eng.time, 0); };
    r.pc.root.rotation.y = 0; r.pc.play('Idle_Loop');
  } catch (e) { console.error(e); }
}
const quietUI = { hud() {}, toast() {}, fact() {}, question() {}, answer() {}, end() {}, hint() {} };

/* ---------- playing ---------- */
async function play(mode, level) {
  curMode = mode; view = 'game'; show('s-load'); $('#load-bar').style.width = '5%'; SND.unlock();
  idle = null; stopGame();
  const g = new Runner(eng, curKey, mode, { level, autostart: false }, gameUI);
  try { await g.load(p => { $('#load-bar').style.width = Math.round(p * 100) + '%'; }); } catch (e) { console.error(e); $('#load-msg').textContent = 'Couldn’t load the game. Check your internet and try again.'; return; }
  game = g; window.__gq3dGame = g; show('s-hud'); paused = false;
  $('#h-badges').hidden = !g.T.badges; $('#h-tap').hidden = false;
  $('#h-mode').textContent = mode === 'levels' ? 'Level ' + level : MODES[mode][1];
  eng.update = dt => { if (!paused) g.update(dt); };
}
function stopGame() { if (game) { game = null; window.__gq3dGame = null; } SND.stopMusic(); eng.watch = false; }
function pause(on) {
  if (!game || game.state === 'over' || game.state === 'won') return;
  paused = on; $('#s-pause').hidden = !on; if (on) SND.stopMusic(); else if (game.state === 'run') SND.startMusic(game.T.music);
}

/* the in-game UI the runner talks to */
let lastHud = '';
const gameUI = {
  hud(h, force) {
    const key = [h.score, h.coins, h.hearts, h.dist, Math.ceil(h.shield), Math.ceil(h.magnet), Math.ceil(h.double), h.badges].join('|'); if (key === lastHud && !force) return; lastHud = key;
    $('#h-score').textContent = h.score; $('#h-coins').textContent = h.coins;
    $('#h-hearts').innerHTML = h.hearts === Infinity ? '<span class="inf">Practice</span>' : '❤️'.repeat(Math.max(0, h.hearts)) + '<s>' + '❤️'.repeat(Math.max(0, 3 - Math.max(0, h.hearts))) + '</s>';
    $('#h-dist').textContent = h.target ? h.dist + ' / ' + h.target + ' m' : h.dist + ' m';
    $('#h-prog').style.width = h.target ? clamp(h.dist / h.target * 100, 0, 100) + '%' : '0';
    $('#h-power').innerHTML = [['🛡️', h.shield], ['🧲', h.magnet], ['✨', h.double]].filter(p => p[1] > 0).map(p => '<span>' + p[0] + ' ' + Math.ceil(p[1]) + '</span>').join('');
    if (h.badgeList) $('#h-badges').innerHTML = h.badgeList.map((b, i) => '<span class="' + (i < h.badges ? 'on' : '') + '" title="' + esc(b[1]) + '">' + b[0] + '</span>').join('');
  },
  toast(text, kind) {
    if (kind === 'go') $('#h-tap').hidden = true;
    const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = text; $('#h-toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), kind === 'go' ? 900 : 2300); setTimeout(() => t.remove(), kind === 'go' ? 1300 : 2800);
  },
  fact(label, fact, hearts) {
    const f = $('#h-fact'); f.innerHTML = '<b>' + esc(label) + '</b><p>' + esc(fact || '') + '</p>'; f.hidden = false; f.classList.remove('out'); clearTimeout(f._t);
    f._t = setTimeout(() => { f.classList.add('out'); setTimeout(() => { f.hidden = true; }, 400); }, 4200);
  },
  hint(text) { const h = $('#h-hint'); h.textContent = text; h.hidden = false; clearTimeout(h._t); h._t = setTimeout(() => { h.hidden = true; }, 2600); },
  question(g) {
    const q = $('#h-q');
    if (!g) { q.hidden = true; return; }
    const cols = ['', '', '']; g.opts.forEach(o => { cols[o.lane] = '<div class="qo" style="--c:' + o.color + '"><i>' + esc(o.letter) + '</i>' + (o.flag ? '<span>' + (o.flag === 'green' ? 'GREEN flag' : 'RED flag') + '</span>' : '<span>' + esc(o.text) + '</span>') + '</div>'; });
    if (g.q.two) cols[1] = '<div class="qo none"><span>⬅ choose ➡</span></div>';
    q.innerHTML = '<p>' + esc(g.q.text) + '</p><div class="qopts">' + cols.join('') + '</div><small>Run through your answer</small>'; q.hidden = false;
  },
  answer(ok, why) { this.toast((ok ? '✓ Correct! ' : '✗ Not quite. ') + why, ok ? 'good' : 'bad'); },
  end(res) { results(res); },
};

function results(res) {
  show('s-end'); const T = THEMES[curKey], saveMode = curMode === 'daily' ? 'daily' : curMode === 'endless' ? 'endless' : '';
  let h = '<div class="end-top">' + (res.won ? '<div class="stars">' + '★'.repeat(res.stars) + '<s>' + '★'.repeat(3 - res.stars) + '</s></div><h2>Level ' + res.level + ' complete!</h2>' : curMode === 'levels' ? '<h2>So close!</h2>' : '<h2>Run over</h2>') + '</div>';
  h += '<div class="stats"><div><b>' + res.score + '</b><small>points</small></div><div><b>' + res.dist + ' m</b><small>distance</small></div><div><b>' + res.coins + '</b><small>triangles</small></div><div><b>' + res.correct + '/' + (res.correct + res.wrong) + '</b><small>answers</small></div></div>';
  const dodged = Object.keys(res.dodged); if (dodged.length) h += '<h4>You said no to</h4><div class="chips">' + dodged.map(k => '<span>' + esc(k) + ' ×' + res.dodged[k] + '</span>').join('') + '</div>';
  if (res.facts.length) h += '<h4>What you learned</h4><ul class="facts">' + res.facts.map(f => '<li><b>' + esc(f[0]) + '</b> ' + esc(f[1]) + '</li>').join('') + '</ul>';
  h += '<div class="saved"></div><div class="btns">';
  if (res.won && res.level < LEVELS) h += '<button class="btn go" data-act="next">Next level ▶</button>';
  h += '<button class="btn' + (res.won && res.level < LEVELS ? '' : ' go') + '" data-act="again">' + (res.won ? 'Play again' : 'Try again') + '</button><button class="btn" data-act="menu">Menu</button></div>';
  $('#end-body').innerHTML = h;
  if (curMode === 'levels' && res.won) { const L = store('gq3d-lv-' + curKey) || {}; L[res.level] = Math.max(L[res.level] || 0, res.stars); store('gq3d-lv-' + curKey, L); }
  const bestKey = 'gq3d-best-' + curKey + '-' + curMode + (curMode === 'daily' ? '-' + today() : ''); const prev = store(bestKey) || 0; if (res.score > prev) store(bestKey, res.score);
  const sv = $('#end-body .saved');
  if (saveMode) {
    if (!TOKEN) { sv.innerHTML = joinNote(); api('l_top3', [T.gid, '', saveMode]).then(r => { sv.innerHTML = '<h4>Class top 5</h4>' + boardHTML(r.top, joinNote()); }, () => {}); return; }
    sv.innerHTML = '<p class="mute">Saving your score…</p>';
    const send = () => api('l_game3', [TOKEN, T.gid, res.score, saveMode]);
    send().then(r => { sv.innerHTML = (r.newBest ? '<p class="new">🎉 New best score!</p>' : '<p class="mute">Your best: ' + r.best + '</p>') + '<h4>Class top 5 · ' + (saveMode === 'daily' ? 'today' : 'Endless') + '</h4>' + boardHTML(r.top); },
      () => { const q = store('gq3d-pending') || []; q.push([T.gid, res.score, saveMode, Date.now()]); store('gq3d-pending', q.slice(-20)); sv.innerHTML = '<p class="mute">No internet. Your score will be sent next time.</p>'; });
  } else if (curMode === 'practice') sv.innerHTML = '<p class="mute">Practice scores aren’t saved. Try Endless or the Daily Challenge to get on the class board.</p>';
}
function sendPending() {
  if (!TOKEN) return; const q = store('gq3d-pending') || []; if (!q.length) return; store('gq3d-pending', []);
  q.forEach(p => { if (p[2] === 'daily' && new Date(p[3]).toDateString() !== new Date().toDateString()) return; api('l_game3', [TOKEN, p[0], p[1], p[2]]).catch(() => {}); });
}

/* ---------- My Pathfinder ---------- */
let look = myLook(), prevChar = null;
async function custom() {
  view = 'custom'; show('s-custom'); idle = null; stopGame(); look = myLook(); await drawCustom();
}
async function drawCustom() {
  const hairs = HAIR[look.body === 'f' ? 'f' : 'm'], hn = { buzzed: 'Short', parted: 'Parted', short: 'Very short', buns: 'Buns', long: 'Long' };
  $('#c-opts').innerHTML = '<h4>Body</h4><div class="seg">' + [['m', 'Boy'], ['f', 'Girl']].map(b => '<button data-look="body:' + b[0] + '" class="' + (look.body === b[0] ? 'on' : '') + '">' + b[1] + '</button>').join('') + '</div>'
    + '<h4>Skin</h4><div class="seg sw">' + SKIN_TONES.map((c, i) => '<button data-look="skin:' + i + '" class="' + (look.skin === i ? 'on' : '') + '" style="background:' + c + '" aria-label="Skin tone ' + (i + 1) + '"></button>').join('') + '</div>'
    + '<h4>Hair</h4><div class="seg">' + hairs.map(h => '<button data-look="hair:' + h + '" class="' + (look.hair === h ? 'on' : '') + '">' + hn[h] + '</button>').join('') + '</div>'
    + '<h4>Uniform</h4><div class="seg">' + [['trousers', 'Trousers'], ['skirt', 'Skirt']].map(b => '<button data-look="bottom:' + b[0] + '" class="' + (look.bottom === b[0] ? 'on' : '') + '">' + b[1] + '</button>').join('') + '</div>';
  const my = {}; prevChar = my;
  const c = await makeCharacter(look); if (prevChar !== my) return;
  const s = eng.scene; while (s.children.length) s.remove(s.children[0]);
  setSky(s, { top: '#7FB2E0', bottom: '#F0E2C8', fogNear: 30, fogFar: 90, sunPos: [3, 6, 6] });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 40), new THREE.MeshLambertMaterial({ color: '#D9CBB0' })); floor.rotation.x = -Math.PI / 2; s.add(floor);
  s.add(c.root); c.play('Idle_Loop');
  eng.update = dt => { c.update(dt); c.root.rotation.y += dt * 0.5; const tall = innerHeight > innerWidth; eng.camera.position.set(0, tall ? 1.0 : 1.25, tall ? 4.7 : 3.6); eng.camera.lookAt(0, tall ? -1.15 : 0.95, 0); };
}

/* ---------- start ---------- */
function boot() {
  eng = new Engine($('#cv')); window.__gq3dEng = eng;
  eng.onHide = () => pause(true);
  input = new Input($('#cv'), { swipe: d => { if (game && !paused) game.input(d); }, tap: () => { if (game && game.state === 'intro') game.go(); }, pause: () => pause(!paused) });
  $('#h-tap').addEventListener('pointerdown', () => { $('#h-tap').hidden = true; if (game) game.go(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-g],[data-mode],[data-lv],[data-act],[data-look]'); if (!b) return;
    SND.unlock();
    if (b.dataset.g) menu(b.dataset.g);
    else if (b.dataset.mode) { const m = b.dataset.mode; if (m === 'levels') levels(); else play(m); }
    else if (b.dataset.lv) play('levels', +b.dataset.lv);
    else if (b.dataset.look) { const [k, v] = b.dataset.look.split(':'); look[k] = k === 'skin' ? +v : v; if (k === 'body') look.hair = HAIR[v][0]; saveLook(look); drawCustom(); }
    else {
      const a = b.dataset.act;
      if (a === 'again') play(curMode, game ? game.level : 1);
      else if (a === 'next') play('levels', (game ? game.level : 0) + 1);
      else if (a === 'menu') { pause(false); paused = false; $('#s-pause').hidden = true; menu(curKey); }
      else if (a === 'resume') pause(false);
      else if (a === 'pause') pause(true);
      else if (a === 'arcade') arcade();
      else if (a === 'custom') custom();
      else if (a === 'custom-done') { if (curKey) menu(curKey); else arcade(); }
      else if (a === 'back') location.href = backUrl();
      else if (a === 'sound') { const on = SND.toggle(); document.querySelectorAll('[data-act=sound]').forEach(x => x.textContent = on ? '🔊' : '🔇'); if (on && game && game.state === 'run' && !paused) SND.startMusic(game.T.music); }
    }
  });
  document.querySelectorAll('[data-act=sound]').forEach(x => x.textContent = SND.on ? '🔊' : '🔇');
  if (THEMES[curKey]) menu(curKey); else arcade();
  sendPending();
  window.__gq3d = { play, menu, arcade, custom, results, THEMES };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
