/* Guide Quest 3D: the arcade page (menus, HUD, results, class boards). */
import { Engine, Input, SND, THREE, esc, store, today, setSky, clamp } from './core.js';
import { Runner, LEVELS, levelPlan } from './runner.js';
import { THEMES } from './themes.js';
import { Train, TRAINS } from './train.js';
import { Defender, DEFENDERS } from './defender.js';
import { Escape, ESCAPES } from './escape.js';
import { Canoe, CANOES } from './canoe.js';
const DEFS = Object.assign({}, THEMES, TRAINS, DEFENDERS, ESCAPES, CANOES);
const CLASSES = { train: Train, defend: Defender, escape: Escape, canoe: Canoe };
import { makeCharacter, myLook, saveLook, SKIN_TONES, HAIR } from './character.js';
import { loadKit } from './kit.js';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const TOKEN = (() => { const t = (Q.get('t') || '').replace(/[^\w-]/g, ''); if (t) return t; try { return localStorage.getItem('gq-sanct-me') || ''; } catch (e) { return ''; } })();
const GROUPS = [['🏹 Adventures', 'Defend the temple, escape the room, paddle through our church’s story.', ['temple', 'breakfree', 'canoe']], ['🚂 Choice trains', 'No obstacles: read the question and pick your track.', ['flags', 'honourline', 'healthline']], ['🏃 Runs', 'Dodge the pressures, grab the good stuff.', ['seawall', 'choices', 'honour']]];
const MODES_TRAIN = { practice: ['🎯', 'Practice', 'Slow, no hearts lost. The train waits for you.'], levels: ['🪜', 'Levels', '10 levels. More stops, a bit faster.'], endless: ['♾️', 'Endless', 'Keep going until 3 wrong tracks.'], daily: ['📅', 'Daily Challenge', '10 stops, the same for everyone today.'] };
const MODES = { practice: ['🎯', 'Practice', 'Slow, no hearts lost. Learn the moves.'], levels: ['🪜', 'Levels', '10 levels. Each one a bit faster.'], endless: ['♾️', 'Endless', 'Keeps speeding up. Beat the class.'], daily: ['📅', 'Daily Challenge', 'Same run for everyone today.'] };
const ui = {};
let eng, game = null, input, view = 'menu', curKey = Q.get('g') || '', curMode = '', paused = false;

function api(fn, args) { return window.gqCall ? window.gqCall(fn, args) : Promise.reject(new Error('offline')); }
function backUrl() { const k = curKey && DEFS[curKey] ? DEFS[curKey].topic : ''; return 'learn.html?p=learn' + (k ? '&k=' + k : '') + (Q.get('t') ? '&t=' + encodeURIComponent(Q.get('t')) : ''); }
function boardHTML(top, note) {
  if (!top || !top.length) return '<p class="mute">No scores yet. Be the first!</p>' + (note || '');
  return '<ol class="board">' + top.map(x => '<li class="' + (x.me ? 'me' : '') + '"><b>' + x.rank + '</b><span>' + esc(x.name) + '</span><em>' + x.score + '</em></li>').join('') + '</ol>' + (note || '');
}
const joinNote = () => TOKEN ? '' : '<p class="mute">Open Guide Quest from your class link to save your scores.</p>';

/* ---------- screens ---------- */
function show(id) { document.querySelectorAll('.scr').forEach(s => s.hidden = s.id !== id); }
function arcade() {
  view = 'arcade'; curKey = ''; show('s-arcade'); stopGame(); idleScene('seawall');
  $('#s-arcade .cards').innerHTML = meCard() + GROUPS.map(g => '<h4 class="grp">' + g[0] + '</h4><p class="mute grp-p">' + esc(g[1]) + '</p>' + g[2].map(k => { const T = DEFS[k]; return '<button class="gcard" data-g="' + k + '"><span class="gi">' + T.icon + '</span><b>' + esc(T.title) + '</b><small>' + esc(T.blurb) + '</small></button>'; }).join('')).join('');
}
function menu(key) {
  const T = DEFS[key]; if (!T) return arcade();
  view = 'menu'; curKey = key; show('s-menu'); stopGame(); idleScene(key);
  $('#m-title').textContent = T.title; $('#m-icon').textContent = T.icon; $('#m-blurb').textContent = T.blurb;
  const MM = T.modes || (T.kind === 'train' ? MODES_TRAIN : MODES);
  $('#m-modes').innerHTML = Object.keys(MM).map(m => '<button class="mode" data-mode="' + m + '"><span>' + MM[m][0] + '</span><b>' + MM[m][1] + '</b><small>' + MM[m][2] + '</small></button>').join('');
  $('#m-me').innerHTML = meCard();
  $('#m-levels').hidden = true;
  const b = $('#m-board'); b.innerHTML = '<p class="mute">Loading the class board…</p>'; const bm = T.board || 'endless';
  api('l_top3', [T.gid, TOKEN, bm]).then(r => { b.innerHTML = '<h4>Class top 5 · ' + (bm === 'daily' ? 'today' : T.boardName || 'Endless') + '</h4>' + boardHTML(r.top, joinNote()); }, () => { b.innerHTML = '<p class="mute">Class board needs the internet.</p>'; });
  history.replaceState(null, '', '?g=' + key + (Q.get('t') ? '&t=' + encodeURIComponent(Q.get('t')) : ''));
}
function levels() {
  const NL = (DEFS[curKey] && DEFS[curKey].levels) || LEVELS, names = (DEFS[curKey] && DEFS[curKey].levelTitles) || [];
  const L = store('gq3d-lv-' + curKey) || {}, box = $('#m-levels'); let open = 1; for (let i = 1; i <= NL; i++) if (L[i]) open = i + 1;
  box.innerHTML = '<div class="lvgrid' + (names.length ? ' named' : '') + '">' + Array.from({ length: NL }, (_, i) => { const n = i + 1, st = L[n] || 0, lock = n > open;
    return '<button class="lv' + (lock ? ' lock' : '') + '" data-lv="' + n + '"' + (lock ? ' disabled' : '') + '><b>' + (lock ? '🔒' : n) + '</b>' + (names[i] ? '<em>' + esc(names[i]) + '</em>' : '') + '<small>' + (lock ? '' : '★'.repeat(st) + '<s>' + '★'.repeat(3 - st) + '</s>') + '</small></button>'; }).join('') + '</div>';
  box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* a calm scene behind the menus: the Pathfinder waiting on the track */
let idle = null;
async function idleScene(key) {
  if (idle && idle.key === key) return; const my = idle = { key };
  const T = DEFS[key]; setSky(eng.scene, T.sky); eng.zoom(1);
  try {
    if (CLASSES[T.kind] && T.kind !== 'train') {
      const r = new CLASSES[T.kind](eng, key, 'practice', { idle: true }, quietUI); await r.load();
      if (idle !== my || game) return; eng.zoom(1);
      my.r = r; eng.update = dt => r.idleView(dt); return;
    }
    if (T.kind === 'train') {
      const r = new Train(eng, key, 'practice', {}, quietUI); await r.load();
      if (idle !== my || game) return;
      my.r = r; r.pc.root.rotation.y = 0; r.pc.play('Idle_Loop');
      eng.update = dt => { r.pc.update(dt); r.waterU.uT.value = eng.time; const t = eng.time * 0.12, tall = innerHeight > innerWidth, R = tall ? 13 : 10, c = r.wagon.position; eng.camera.position.set(c.x + Math.sin(t) * R, tall ? 5.5 : 5, c.z - Math.cos(t) * R); eng.camera.lookAt(c.x, tall ? -3.2 : 1.2, c.z); r.smokeUpdate(dt); };
      return;
    }
    const r = new Runner(eng, key, 'practice', {}, quietUI); await r.load();
    if (idle !== my || game) return;
    my.r = r; eng.update = dt => { r.pc.update(dt); const t = eng.time * 0.15, tall = innerHeight > innerWidth, R = tall ? 4.8 : 3.4; eng.camera.position.set(Math.sin(t) * R, tall ? 1.1 : 1.6, -Math.cos(t) * R - 0.5); eng.camera.lookAt(0, tall ? -1.25 : 1.1, 0); if (r.sea) r.sea.update(eng.time, 0); };
    r.pc.root.rotation.y = 0; r.pc.play('Idle_Loop');
  } catch (e) { console.error(e); }
}
const quietUI = { hud() {}, toast() {}, fact() {}, question() {}, answer() {}, end() {}, hint() {}, tquestion() {}, tprogress() {}, tresult() {}, card() { return new Promise(() => {}); }, banner() {}, closeCard() {} };

/* ---------- playing ---------- */
async function play(mode, level) {
  curMode = mode; view = 'game'; show('s-load'); $('#load-bar').style.width = '5%'; SND.unlock();
  idle = null; stopGame();
  const Cls = CLASSES[DEFS[curKey].kind] || Runner;
  eng.zoom(1); const g = new Cls(eng, curKey, mode, { level, autostart: false }, gameUI);
  try { await g.load(p => { $('#load-bar').style.width = Math.round(p * 100) + '%'; }); } catch (e) { console.error(e); $('#load-msg').textContent = 'Couldn’t load the game. Check your internet and try again.'; return; }
  game = g; window.__gq3dGame = g; show('s-hud'); paused = false;
  $('#h-badges').hidden = !g.T.badges; $('#h-tap').hidden = false; $('#h-tq').hidden = true;
  $('#h-tap small').textContent = g.T.howTo || (g.T.kind === 'train' ? 'Read the question, then swipe ← or → (or tap your answer)' : '← → change lanes · ↑ jump · ↓ slide');
  const MM = g.T.modes || MODES; $('#h-mode').textContent = mode === 'levels' ? (g.T.levelName || 'Level') + ' ' + level : (MM[mode] || MODES[mode] || [0, mode])[1];
  input.on.noSwipe = !!g.noSwipe; $('#h-card').hidden = true; $('#h-banner').hidden = true;
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
    const key = [h.score, h.coins, h.hearts, h.dist, h.label, Math.ceil(h.shield), Math.ceil(h.magnet), Math.ceil(h.double), h.badges].join('|'); if (key === lastHud && !force) return; lastHud = key;
    $('#h-score').textContent = h.score; $('#h-coins').textContent = h.coins; $('#h-cicon').textContent = h.coinIcon || '🔺';
    $('#h-hearts').innerHTML = h.hearts == null ? '' : h.hearts === Infinity ? '<span class="inf">Practice</span>' : h.hearts > 5 ? '❤️ ×' + h.hearts : '❤️'.repeat(Math.max(0, h.hearts)) + '<s>' + '❤️'.repeat(Math.max(0, 3 - Math.max(0, h.hearts))) + '</s>';
    const unit = h.unit ? ' ' + h.unit : ' m'; $('#h-dist').textContent = h.label || (h.target ? h.dist + ' / ' + h.target + unit : h.dist + unit);
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
  /* the train games: a big question card, two answers, and a bar that shrinks as the junction comes */
  tquestion(J) {
    const q = $('#h-tq'); if (!J) { q.hidden = true; return; }
    const o = J.q.opts, lab = (x, i) => x.flag ? (x.flag === 'green' ? '🟢 GREEN flag' : '🔴 RED flag') : x.text;
    const col = (x, i) => x.flag ? (x.flag === 'green' ? '#2E9E57' : '#D23B3B') : (i ? '#B5452C' : '#2F6DB5');
    q.innerHTML = '<p>' + esc(J.q.text) + '</p><div class="tq-bar"><i></i></div><div class="tq-opts">' + o.map((x, i) => '<button data-pick="' + i + '" class="' + (J.choice === (i ? 1 : -1) ? 'on' : '') + '" style="--c:' + col(x, i) + '"><i>' + (i ? '➡' : '⬅') + '</i><span>' + esc(lab(x, i)) + '</span></button>').join('') + '</div><small>' + (J.choice ? 'Track set. You can still change it.' : 'Swipe or tap to pick your track') + '</small>';
    q.hidden = false;
  },
  tprogress(f, urgent) { const b = document.querySelector('#h-tq .tq-bar i'); if (b) b.style.width = Math.round(f * 100) + '%'; $('#h-tq').classList.toggle('urgent', !!urgent); },
  /* a card in the middle of the screen: a question, a person talking, a choice. Resolves with the button index. */
  card(o) {
    const c = $('#h-card'); clearTimeout(c._t);
    c.innerHTML = (o.tag ? '<span class="cd-tag">' + esc(o.tag) + '</span>' : '') + '<div class="cd-head">' + (o.icon ? '<span class="cd-ic">' + o.icon + '</span>' : '') + '<div>' + (o.who ? '<small>' + esc(o.who) + '</small>' : '') + '<b>' + esc(o.title || '') + '</b></div></div>'
      + (o.text ? '<p>' + esc(o.text) + '</p>' : '') + (o.html || '') + '<div class="cd-opts' + (o.opts && o.opts.length > 2 ? ' col' : '') + '">' + (o.opts || ['OK']).map((t, i) => '<button data-cardopt="' + i + '" class="' + (o.primary === i ? 'go' : '') + '">' + esc(t) + '</button>').join('') + '</div>';
    c.hidden = false; c.classList.remove('ok', 'no');
    return new Promise(res => { c._res = res; });
  },
  cardFeedback(ok, text) { const c = $('#h-card'); c.classList.add(ok ? 'ok' : 'no'); const f = document.createElement('p'); f.className = 'cd-fb'; f.textContent = (ok ? '✓ ' : '✗ ') + text; c.appendChild(f); c.querySelectorAll('[data-cardopt]').forEach(b => b.disabled = true); },
  closeCard() { const c = $('#h-card'); c.hidden = true; c._res = null; },
  banner(text, sub, ms) { const b = $('#h-banner'); b.innerHTML = '<b>' + esc(text) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : ''); b.hidden = false; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, ms || 2200); },
  tresult(ok, title, why) {
    const r = $('#h-tres'); r.className = ok ? 'good' : 'bad'; r.innerHTML = '<b>' + (ok ? '✓ ' : '✗ ') + esc(title) + '</b>' + (why ? '<p>' + esc(why) + '</p>' : ''); r.hidden = false; clearTimeout(r._t);
    r._t = setTimeout(() => { r.hidden = true; }, ok ? 2600 : 4200);
  },
  end(res) { results(res); },
};

function results(res) {
  show('s-end'); const T = DEFS[curKey], saveMode = res.save || (curMode === 'daily' ? 'daily' : curMode === 'endless' ? 'endless' : '');
  let h = '<div class="end-top">' + (res.won ? '<div class="stars">' + '★'.repeat(res.stars) + '<s>' + '★'.repeat(3 - res.stars) + '</s></div><h2>' + esc(res.title || ((T.levelName || 'Level') + ' ' + res.level + ' complete!')) + '</h2>' : '<h2>' + esc(res.title || (curMode === 'levels' ? 'So close!' : 'Run over')) + '</h2>') + '</div>';
  if (res.stats) h += '<div class="stats">' + res.stats.map(x => '<div><b>' + esc(String(x[0])) + '</b><small>' + esc(x[1]) + '</small></div>').join('') + '</div>' + (res.list && res.list[1].length ? '<h4>' + esc(res.list[0]) + '</h4><ul class="facts">' + res.list[1].map(m => '<li>' + (m[0] ? '<b>' + esc(m[0]) + '</b> ' : '') + esc(m[1] || '') + '</li>').join('') + '</ul>' : '');
  else if (res.kind === 'train') h += '<div class="stats"><div><b>' + res.score + '</b><small>points</small></div><div><b>' + res.correct + '</b><small>right tracks</small></div><div><b>' + res.wrong + '</b><small>in the swamp</small></div><div><b>' + (res.correct + res.wrong) + '</b><small>stops</small></div></div>' + (res.missed.length ? '<h4>Look at these again</h4><ul class="facts">' + res.missed.map(m => '<li><b>' + esc(m[0]) + '</b> → ' + esc(m[1]) + (m[2] ? '. ' + esc(m[2]) : '') + '</li>').join('') + '</ul>' : '');
  else h += '<div class="stats"><div><b>' + res.score + '</b><small>points</small></div><div><b>' + res.dist + ' m</b><small>distance</small></div><div><b>' + res.coins + '</b><small>triangles</small></div>' + (res.correct + res.wrong ? '<div><b>' + res.correct + '/' + (res.correct + res.wrong) + '</b><small>answers</small></div>' : '<div><b>' + Object.keys(res.dodged).reduce((a, k) => a + res.dodged[k], 0) + '</b><small>said no</small></div>') + '</div>';
  const dodged = Object.keys(res.dodged || {}); if (dodged.length) h += '<h4>You said no to</h4><div class="chips">' + dodged.map(k => '<span>' + esc(k) + ' ×' + res.dodged[k] + '</span>').join('') + '</div>';
  if (res.facts && res.facts.length) h += '<h4>What you learned</h4><ul class="facts">' + res.facts.map(f => '<li><b>' + esc(f[0]) + '</b> ' + esc(f[1]) + '</li>').join('') + '</ul>';
  h += '<div class="saved"></div><div class="btns">';
  const maxL = T.levels || LEVELS, hasNext = res.won && curMode === 'levels' && res.level < maxL;
  if (hasNext) h += '<button class="btn go" data-act="next">Next ' + esc((T.levelName || 'level').toLowerCase()) + ' ▶</button>';
  h += '<button class="btn' + (hasNext ? '' : ' go') + '" data-act="again">' + (res.won ? 'Play again' : 'Try again') + '</button><button class="btn" data-act="menu">Menu</button></div>';
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
function meCard() {
  const l = myLook(), fresh = !store('gq3d-look'), hn = { buzzed: 'short hair', parted: 'parted hair', short: 'very short hair', buns: 'buns', long: 'long hair' };
  return '<button class="mecard' + (fresh ? ' fresh' : '') + '" data-act="custom"><span class="me-sw" style="background:' + SKIN_TONES[l.skin] + '"></span><span><b>' + (fresh ? 'Make your Pathfinder' : 'Your Pathfinder') + '</b><small>' + (l.body === 'f' ? 'Girl' : 'Boy') + ' · ' + (hn[l.hair] || '') + ' · ' + (l.bottom === 'skirt' ? 'skirt' : 'trousers') + '</small></span><em>Change ✏️</em></button>';
}
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
  document.addEventListener('pointerdown', e => { const b = e.target.closest('[data-pick]'); if (b && game && game.pick) { e.preventDefault(); game.pick(+b.dataset.pick); } });
  document.addEventListener('click', e => { const b = e.target.closest('[data-cardopt]'); if (!b || b.disabled) return; const c = $('#h-card'); if (c._res) { const r = c._res; c._res = null; r(+b.dataset.cardopt); } });
  input = new Input($('#cv'), {
    press: (x, y) => { if (game && !paused && game.press) game.press(x, y); }, drag: (x, y, dx, dy) => { if (game && !paused && game.drag) game.drag(x, y, dx, dy); }, release: (x, y) => { if (game && !paused && game.release) game.release(x, y); }, swipe: d => { if (game && !paused) game.input(d); }, tap: (x, y) => { if (game && game.state === 'intro') game.go(); else if (game && !paused && game.tapAt) game.tapAt(x, y); }, pause: () => pause(!paused) });
  $('#h-tap').addEventListener('pointerdown', () => { $('#h-tap').hidden = true; if (game) game.go(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-g],[data-mode],[data-lv],[data-act],[data-look]'); if (!b) return;
    SND.unlock();
    if (b.dataset.g) menu(b.dataset.g);
    else if (b.dataset.mode) { const m = b.dataset.mode; if (m === 'levels' && (DEFS[curKey].levels || LEVELS) > 1) levels(); else play(m, 1); }
    else if (b.dataset.lv) play('levels', +b.dataset.lv);
    else if (b.dataset.look) { const [k, v] = b.dataset.look.split(':'); look[k] = k === 'skin' ? +v : v; if (k === 'body') { look.hair = HAIR[v][0]; look.bottom = v === 'f' ? 'skirt' : 'trousers'; } saveLook(look); drawCustom(); }
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
  if (DEFS[curKey]) menu(curKey); else arcade();
  sendPending();
  window.__gq3d = { play, menu, arcade, custom, results, DEFS };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
