const CACHE='rodme-offline-dev';
const FILES=/*PRECACHE*/ [];
const scope=new URL('./',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(FILES.map(file=>new URL(file,scope).href));await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await Promise.all((await caches.keys()).filter(key=>key.startsWith('rodme-offline-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(scope)||url.pathname.includes('/api/'))return;
 if(event.request.mode==='navigate'){
  // Always prefer fresh HTML while online. An old offline shell can keep showing
  // a broken sign-in page after a deployment on slower mobile connections.
  event.respondWith((async()=>{
   try{
    const response=await fetch(event.request,{cache:'no-store'});
    if(response.ok)return response;
    throw new Error('Network response unavailable');
   }catch{
    const cached=await caches.match(new URL('index.html',scope).href);
    if(cached)return cached;
    return Response.error();
   }
  })());return;
 }
 event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok&&(url.pathname.includes('/images/')||url.pathname.includes('/ocr/'))){const cache=await caches.open(CACHE);try{await cache.put(event.request,response.clone());}catch{}}return response;})());
});
