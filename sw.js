/* Keeps the app on the phone so it opens quickly and with weak signal. The data itself always comes from the Google Sheet. */
var CACHE = 'gq-c05941fea4-n', FILES = ["./", "counsellor.html", "gq.js", "icon-192.png", "icon-512.png", "index.html", "learn.html", "manifest.webmanifest", "parent.html", "readings/cs.json", "readings/da7.json", "readings/friends.json", "readings/gal5.json", "readings/sc.json", "readings/te.json", "sanctuary.html"];
/* One saved copy per page, whatever is after the "?". The newest page is always tried first; the saved copy is used
   when there is no signal, or when the network takes more than 4 seconds. */
function key(u){ var p = u.pathname; if (/\/$/.test(p)) p += 'index.html'; return u.origin + p; }
function fresh(url){ return fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' })); }
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(FILES.map(function(f){
      var u = new URL(f, self.registration.scope);
      return fetch(new Request(u.href, { cache: 'reload' })).then(function(r){ if (r.ok && !r.redirected) return c.put(key(u), r); }).catch(function(){});
    }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  var k = key(u);
  e.respondWith(caches.open(CACHE).then(function(c){
    var net = fresh(u.href).then(function(r){
      if (r.redirected) return Response.redirect(r.url, 302);
      if (r.ok) c.put(k, r.clone());
      return r;
    });
    var saved = function(){ return c.match(k); };
    var slow = new Promise(function(res){ setTimeout(res, 4000); }).then(saved).then(function(hit){ return hit || net; });
    return Promise.race([net.catch(function(){ return saved().then(function(hit){ return hit || Response.error(); }); }), slow]);
  }));
});
