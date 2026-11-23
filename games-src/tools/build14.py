#!/usr/bin/env python3
"""Version 17 build: Listen reads only what is on screen, the Reading room pop-up player, new explorer covers and 3D games.
Reads gq13/ (Version 16.1), writes gq14/. Run from the scratchpad folder."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT, G = os.path.join(HERE, 'gq13'), os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'gq14'), os.path.join(HERE, 'g14')
os.makedirs(OUT, exist_ok=True)
def rd(p): return open(p, encoding='utf-8').read()
def g(name): return rd(os.path.join(G, name))
def rep(s, old, new, count=1, label=''):
    n = s.count(old)
    if n != count: sys.exit('build14: expected %d of %r, found %d (%s)' % (count, old[:90], n, label))
    return s.replace(old, new)
FILES = ('Code.gs', 'Index.html', 'Counsellor.html', 'Parent.html', 'Learn.html', 'Sanctuary.html')
T = {f: rd(os.path.join(SRC, f)) for f in FILES}

# ---------- Learning Lab ----------
l = T['Learn.html']
l = rep(l, '</style>', g('x17.css') + '\n' + g('covers.css') + '\n</style>', 1, 'css')
# Fruit basket gains levels, bombs, combos and Endless (Version 17, Release 2)
_fa = l.index('  /* ======================= GAME: Fruit basket (Galatians 5:22–23 in order) ======================= */')
_fb = l.index("NGAMES.fruit = function(){", _fa); _fb = l.index('\n', l.index("}); };", _fb)) + 1
l = l[:_fa] + g('g_fruit2.js') + l[_fb:]
l = rep(l, '</style>', g('fruit2.css') + '\n</style>', 1, 'fruit css')
l = rep(l, '  /* ======================= RENDER + EVENTS ======================= */', g('covers.js') + '\n' + g('x17.js') + '\n  /* ======================= RENDER + EVENTS ======================= */', 1, 'js')
# Listen: only what is on screen
l = rep(l, "if ((a = b.getAttribute('data-x3say'))) { gkSpeakLong(x3Say(a.split(':')[1])); return; }",
        "if ((a = b.getAttribute('data-x3say'))) { x17Say(x3SayNow(a.split(':')[1])); return; }", 1, 'x3 say')
l = rep(l, "if (cc) sayIt(w2Text(sp[0], cc)); return; }", "if (cc) x17Say(w2TextNow(sp[0], cc)); return; }", 1, 'w2 say')
l = rep(l, "  function sayIt(text){ gkSpeakLong(text); }", "  function sayIt(text){ x17Say(text); }", 1, 'sayIt')
l = rep(l, "        gkSpeakLong(text);\n      }\n    };\n    show();", "        x17Say(text);\n      }\n    };\n    show();", 1, 'story say')
l = rep(l, "  function render(){\n    app.innerHTML = S.read ?", "  function render(){\n    x17ViewChange();\n    app.innerHTML = S.read ?", 1, 'render hook')
l = rep(l, "h += sceneHTML(k, 'learn') + '<p class=\"taphint\">Tap a picture to open it big.</p>';",
        "h += COVERS[k] ? COVERS[k](k) : sceneHTML(k, 'learn') + '<p class=\"taphint\">Tap a picture to open it big.</p>';", 1, 'covers')
# 3D arcade links: on the hub and at the top of the Game tab
l = rep(l, "    h += '<div class=\"grid\">' + order.filter(", "    h += x17ArcadeBanner() + '<div class=\"grid\">' + order.filter(", 1, 'arcade hub')
l = rep(l, "      h += gamePanelHTML(k);\n", "      h += x17Arcade(k) + gamePanelHTML(k);\n", 1, 'arcade topic')
T['Learn.html'] = l

# ---------- Server: 3D game boards (endless best and a daily board) ----------
c = T['Code.gs']
c += '''

/* =====================================================================
   VERSION 17: the 3D arcade on the website. Endless keeps each Guide's
   best; the Daily Challenge has a board for each day.
   ===================================================================== */
GAME_IDS['run:seawall'] = 'Seawall Fun Run (3D)';
GAME_IDS['run:choices'] = 'Choices Run (3D)';
GAME_IDS['run:honour'] = 'Honour Run (3D)';
GAME_IDS['defend:temple'] = 'Body Temple Defender (3D)';
GAME_IDS['escape:free'] = 'Break Free escape room (3D)';
GAME_IDS['canoe:journey'] = 'Canoe Journey (3D)';
GAME_IDS['train:flags'] = 'Red Flag Express (3D train)';
GAME_IDS['train:honour'] = 'Honour Line (3D train)';
GAME_IDS['train:health'] = 'Health Line (3D train)';
/* names kept ready for the games still to come, so they need no server change */
GAME_IDS['switch:run'] = 'Switch Run (multiplayer)';
GAME_IDS['race:kart'] = 'Kart race (3D)';
GAME_IDS['race:canoe'] = 'Canoe race (3D)';
GAME_IDS['race:bike'] = 'Bike race (3D)';
GAME_IDS['photo:nature'] = 'Nature photographer (3D)';
GAME_IDS['hunt:patch'] = 'Patch hunt (3D)';
GAME_IDS['hunt:compass'] = 'Compass hunt (3D)';
GAME_IDS['build:it'] = 'Build it (3D)';
GAME_IDS['camp:kitchen'] = 'Camp kitchen (3D)';
GAME_IDS['hike:obstacle'] = 'Obstacle hike (3D)';
GAME_IDS['walk:serve'] = 'Serving Others walk (3D)';
GAME_IDS['walk:share'] = 'Sharing Jesus walk (3D)';
GAME_IDS['class:room'] = 'Classroom (3D)';
GAME_IDS['walk:pioneers'] = 'Pioneers walk-through (3D)';
GAME_IDS['camp:open'] = 'Pathfinder Camp (multiplayer)';
API_FNS.l_game3 = 1; API_FNS.l_top3 = 1;
function gameLabel3_(game, mode) {
  var name = GAME_IDS[cleanGame_(game)];
  return mode === 'daily' ? name + ' · Daily ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') : name;
}
/** A finished 3D game (mode 'endless' or 'daily'). Keeps the Guide's best and returns the class top 5. */
function l_game3(t, game, score, mode) {
  t = cleanToken_(t); mode = mode === 'daily' ? 'daily' : 'endless';
  var label = gameLabel3_(game, mode);
  score = Math.round(Number(score));
  if (!(score >= 0 && score <= 100000)) throw new Error('bad-request');
  var g = guideByToken_(t);
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = setupGames_(), rows = gameRows_(), mine = rows.filter(function (x) { return x.t === g.t && x.game === label; })[0];
    var best = score, now = new Date(), prev = mine ? mine.best : 0;
    if (mine) {
      best = Math.max(mine.best, score);
      sh.getRange(mine.row, 1, 1, 5).setValues([[safe_(g.name), label, best, mine.plays + 1, now]]);
    } else {
      sh.appendRow([safe_(g.name), label, best, 1, now, g.t]);
      rows.push({ row: sh.getLastRow(), name: g.name, game: label, best: best, plays: 1, last: now, t: g.t });
    }
    return { best: best, newBest: score > prev, top: gameTop_(rows, label, 5, g.t) };
  } finally { lock.releaseLock(); }
}
/** The class board for a 3D game, for anyone with the class link. */
function l_top3(game, t, mode) {
  mode = mode === 'daily' ? 'daily' : 'endless';
  var label = gameLabel3_(game, mode); t = cleanToken_(t);
  var rows = gameRows_(), mine = t ? rows.filter(function (x) { return x.t === t && x.game === label; })[0] : null;
  return { best: mine ? mine.best : 0, top: gameTop_(rows, label, 5, t) };
}
'''
T['Code.gs'] = c

# ---------- Version 17.6: class boards ----------
l = T['Learn.html']
l = rep(l, '</style>', g('x18.css') + '\n</style>', 1, 'boards css')
l = rep(l, '  /* ======================= RENDER + EVENTS ======================= */', g('x18map.js') + g('x18.js') + '\n  /* ======================= RENDER + EVENTS ======================= */', 1, 'boards js')
l = rep(l, "var S = { topic: (L[B.topic] || B.topic === 'gems') ? B.topic : '',", "var S = { topic: (L[B.topic] || B.topic === 'gems' || B.topic === 'boards') ? B.topic : '',", 1, 'boards topic')
l = rep(l, "app.innerHTML = S.read ? x16ReaderHTML() : S.topic === 'gems' ? gemsHTML()", "app.innerHTML = S.read ? x16ReaderHTML() : S.topic === 'boards' ? x18HTML() : S.topic === 'gems' ? gemsHTML()", 1, 'boards route')
l = rep(l, "    h += x17ArcadeBanner() + '<div class=\"grid\">' + order.filter(", "    h += x18Banner() + x17ArcadeBanner() + '<div class=\"grid\">' + order.filter(", 1, 'boards hub')
T['Learn.html'] = l
i = T['Index.html']
i = rep(i, "</style>", ".hf2steps{display:flex;flex-direction:column;gap:8px}.hf2btns{display:flex;gap:8px;flex-wrap:wrap}.hf2msg{font-size:14px;color:var(--muted);margin:0}.hf2msg:empty{display:none}\n</style>", 1, 'hf2 css')
i = rep(i, "{t:'rows',k:'log',n:3,cols:['My training','Minutes'],rowlabel:'Week',narrow:true,when:['way','A Fun Run, after a training programme'],legacy:['log','run']},",
        "{t:'rows',k:'log',n:3,cols:['My training','Minutes'],rowlabel:'Week',narrow:true,when:['way','A Fun Run, after a training programme'],legacy:['log','run']},\n      {t:'hf2steps',when:['way','A Fun Run, after a training programme']},", 1, 'hf2 field')
i = rep(i, "    if (fd.t === 'game') return GAMES[fd.game]();", "    if (fd.t === 'hf2steps') return hf2StepsHTML();\n    if (fd.t === 'game') return GAMES[fd.game]();", 1, 'hf2 render')
i = rep(i, "  app.addEventListener('click', function(e){\n    if (e.target && e.target.dataset && e.target.dataset.phclose){", g('x18i.js') + "  app.addEventListener('click', function(e){\n    if (e.target && e.target.dataset && e.target.dataset.phclose){", 1, 'hf2 js')
i = rep(i, "        + '<a class=\"labtile\" href=\"'+esc(LAB + '&k=gems&from=home')+'\">", "        + '<a class=\"labtile\" href=\"'+esc(LAB + '&k=boards&from=home')+'\"><span class=\"li\" aria-hidden=\"true\">🏆</span><span>Class boards<small>Steps, reading, service</small></span></a>'\n        + '<a class=\"labtile\" href=\"'+esc(LAB + '&k=gems&from=home')+'\">", 1, 'boards tile')
T['Index.html'] = i
k = T['Counsellor.html']
k = rep(k, '</style>', g('x18c.css') + '\n</style>', 1, 'cb css')
k = rep(k, "['sanct','lab','questions','games','gems']", "['sanct','lab','questions','games','boards','gems']", 2, 'cb tabs')
k = rep(k, "    else if (S.tab === 'gems') body = xnav() + renderGems();", "    else if (S.tab === 'gems') body = xnav() + renderGems();\n    else if (S.tab === 'boards') body = xnav() + renderBoards();", 1, 'cb body')
k = rep(k, "[['sanct','Sanctuary'],['lab','Learning Lab'],['games','Games'],['gems','Memory Gems'],['questions','Questions']]", "[['sanct','Sanctuary'],['lab','Learning Lab'],['games','Games'],['boards','Class boards'],['gems','Memory Gems'],['questions','Questions']]", 1, 'cb xnav')
k = rep(k, "  /* ---------- Games: every Guide's best score in each new game ---------- */", g('x18c.js') + "\n  /* ---------- Games: every Guide's best score in each new game ---------- */", 1, 'cb js')
T['Counsellor.html'] = k
c = T['Code.gs']
c = rep(c, "var topic = (TOPICS[p.k] && p.k !== 'sanctuary') || p.k === 'gems' ? String(p.k) : '';", "var topic = (TOPICS[p.k] && p.k !== 'sanctuary') || p.k === 'gems' || p.k === 'boards' ? String(p.k) : '';", 2, 'boards boot')
c = rep(c, "title: topic === 'gems' ? 'Memory Gems · Learning Lab' :", "title: topic === 'boards' ? 'Class boards · Learning Lab' : topic === 'gems' ? 'Memory Gems · Learning Lab' :", 1, 'boards title')
c = rep(c, ".setTitle(topic === 'gems' ? 'Memory Gems · Learning Lab' :", ".setTitle(topic === 'boards' ? 'Class boards · Learning Lab' : topic === 'gems' ? 'Memory Gems · Learning Lab' :", 1, 'boards title 2')
c = rep(c, "  if (mine.length >= 8) throw new Error('photo-limit');", "  if (mine.length >= (code === 'HF2' ? 40 : 8)) throw new Error('photo-limit');", 1, 'hf2 photos')
c += g('boards.gs')
T['Code.gs'] = c

for f in FILES:
    open(os.path.join(OUT, f), 'w', encoding='utf-8').write(T[f])
print('build14 ok')
