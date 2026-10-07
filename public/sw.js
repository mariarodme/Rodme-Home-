const CACHE='rodme-offline-dev';
const FILES=/*PRECACHE*/ [];
const scope=new URL('./',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new URL(file,scope).href));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(key=>key.startsWith('rodme-offline-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(scope)||url.pathname.includes('/api/'))return;
 if(event.request.mode==='navigate'){
  const network=fetch(event.request);
  event.respondWith((async()=>{
   const cached=await caches.match(new URL('index.html',scope).href);
   if(!cached)return network;
   return Promise.race([network.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),1500))]);
  })());return;
 }
 event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok&&(url.pathname.includes('/images/')||url.pathname.includes('/ocr/'))){const cache=await caches.open(CACHE);try{await cache.put(event.request,response.clone());}catch{}}return response;})());
});
