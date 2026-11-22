#!/usr/bin/env python3
"""Version 17 build: Listen reads only what is on screen, the Reading room pop-up player, new explorer covers and 3D games.
Reads gq13/ (Version 16.1), writes gq14/. Run from the scratchpad folder."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT, G = os.path.join(HERE, 'gq13'), os.path.join(HERE, 'gq14'), os.path.join(HERE, 'g14')
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

for f in FILES:
    open(os.path.join(OUT, f), 'w', encoding='utf-8').write(T[f])
print('build14 ok')
