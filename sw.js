/* Keeps the app on the phone so it opens quickly and with weak signal. The data itself always comes from the Google Sheet. */
var CACHE = 'gq-1c0b129c45', FILES = ["./", "counsellor.html", "gq.js", "icon-192.png", "icon-512.png", "index.html", "learn.html", "manifest.webmanifest", "parent.html", "sanctuary.html"];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch', function(e){
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(e.request, { ignoreSearch: true }).then(function(hit){
      var net = fetch(e.request).then(function(r){ if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(function(){ return hit; });
      return hit || net;
    });
  }));
});
