/* Copia local de la app. La página se pide siempre a la red primero, para que
   las actualizaciones lleguen solas; si no hay conexión, se sirve la copia. */
var C='arquero-v37';
var FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable.png'];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(C).then(function(c){ return c.addAll(FILES); })
    .then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(k){
    return Promise.all(k.filter(function(x){ return x!==C; }).map(function(x){ return caches.delete(x); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET') return;
  var url=new URL(e.request.url);
  /* Lo que viene de otros servidores (la nube de Firebase, por ejemplo) nunca pasa por la copia local:
     si no, se quedaría para siempre con la primera respuesta. */
  if(url.origin!==self.location.origin) return;
  var esPagina = e.request.mode==='navigate'
    || /\/(index\.html)?$/.test(url.pathname);
  if(esPagina){
    e.respondWith(
      fetch(e.request).then(function(r){
        var copia=r.clone();
        caches.open(C).then(function(c){ c.put(e.request,copia); });
        return r;
      }).catch(function(){
        return caches.match(e.request).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r){
    return r || fetch(e.request).then(function(res){
      var copia=res.clone();
      caches.open(C).then(function(c){ c.put(e.request,copia); });
      return res;
    }).catch(function(){ return caches.match('./index.html'); });
  }));
});
