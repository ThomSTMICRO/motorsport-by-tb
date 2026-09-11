// Service worker minimal : rend le site installable (PWA) et garde un accès
// hors-ligne de base à la coquille du site. Ne précharge pas les gros
// fichiers (modèle 3D, vidéos) — seulement l'essentiel pour ouvrir l'appli.
const CACHE_NAME = 'motorsport-shell-v1';
const PRECACHE_URLS = [
  './index.html',
  './formation.html',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon-32.png',
  './icon-192.png',
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(name){ return name !== CACHE_NAME; })
             .map(function(name){ return caches.delete(name); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;

  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; // laisse passer les ressources externes (polices, LaCentrale...)

  // Navigation (chargement de page) : réseau d'abord, cache en secours hors-ligne.
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Le reste (CSS, images, favicons...) : cache d'abord, réseau en secours + mise à jour du cache.
  event.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
