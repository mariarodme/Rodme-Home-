const CACHE='rodme-offline-dev';
const FILES=/*PRECACHE*/ [];
const scope=new URL('./',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new URL(file,scope).href));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(key=>key.startsWith('rodme-offline-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(scope)||url.pathname.includes('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>{const cached=await caches.match(new URL('index.html',scope).href);return cached||new Response('Abre Rodme Home una vez con internet para usarla sin conexión.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});}));return;
 }
 event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;return fetch(event.request);})());
});
