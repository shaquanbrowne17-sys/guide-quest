/* Guide Quest website: talks to the club's Google Sheet through the Apps Script web app. */
(function(){
  var API = "https://script.google.com/macros/s/AKfycbyRuA_fj-944KbijPYtqUN89UI3G-6Sp-UfUwpoZzmOSvmAe5oBOrFEVS-z0zSfKiUT/exec", SITE = "https://shaquanbrowne17-sys.github.io/guide-quest/";
  window.GQ_STATIC = true;
  function post(fn, args, tries){
    return fetch(API, { method: 'POST', body: JSON.stringify({ fn: fn, args: args, base: SITE }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new TypeError('network ' + r.status); return r.json(); })
      .then(function(j){ if (!j || !j.ok) { var e = new Error((j && j.error) || 'error'); e.server = true; throw e; } return j.result; })
      .catch(function(e){
        if (!e.server && (tries || 0) < 1) return new Promise(function(res){ setTimeout(res, 1200); }).then(function(){ return post(fn, args, 1); });
        throw e;
      });
  }
  window.gqCall = function(fn, args){ return window.__gqLocal ? window.__gqLocal(fn, args || []) : post(fn, args || [], 0); };
  function runner(ok, fail){
    return new Proxy({}, { get: function(_, name){
      if (name === 'withSuccessHandler') return function(f){ return runner(f, fail); };
      if (name === 'withFailureHandler') return function(f){ return runner(ok, f); };
      if (name === 'withUserObject') return function(){ return runner(ok, fail); };
      return function(){
        var args = [].slice.call(arguments);
        window.gqCall(name, args).then(function(r){ if (ok) ok(r); }, function(e){ if (fail) fail(e instanceof Error ? e : new Error(String(e))); });
      };
    }});
  }
  window.google = { script: { run: runner(null, null) } };

  /* Each page asks for its data, then runs. The last copy is kept on the phone so the app opens with weak signal. */
  window.gqStart = function(extra){
    var app = document.getElementById('app'), q = {};
    new URLSearchParams(location.search).forEach(function(v, k){ q[k] = v; });
    Object.keys(extra || {}).forEach(function(k){ q[k] = extra[k]; });
    var key = 'gq-boot:' + JSON.stringify(q), done = false;
    function go(boot, stale){
      if (done) return; done = true;
      window.__GQBOOT = boot; window.GQ_STALE = !!stale;
      if (app) app.innerHTML = '';
      [].forEach.call(document.querySelectorAll('script[type="text/gq"]'), function(s){ var n = document.createElement('script'); n.textContent = s.textContent; document.body.appendChild(n); });
    }
    function fail(){
      var cached = null; try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){}
      if (cached){ go(cached, true); return; }
      if (app) app.innerHTML = '<div class="gq-load"><b>No internet connection</b><p>Guide Quest needs the internet the first time it opens. Check your data or Wi-Fi.</p><button onclick="location.reload()">Try again</button></div>';
    }
    if (app) app.innerHTML = '<div class="gq-load"><span class="gq-spin"></span><p>Opening Guide Quest…</p></div>';
    window.gqCall('api_boot', [q]).then(function(b){
      try { localStorage.setItem(key, JSON.stringify(b.boot)); } catch(e){}
      if (b.title) document.title = b.title;
      go(b.boot, false);
    }, function(e){ if (e && e.server) { if (app) app.innerHTML = '<div class="gq-load"><b>Something went wrong</b><p>' + String(e.message).replace(/[<>&]/g, '') + '</p><button onclick="location.reload()">Try again</button></div>'; } else fail(); });
  };

  if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.__gqLocal) {
    window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
  }
})();
