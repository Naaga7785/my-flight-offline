/* MY FLIGHT 2.0 production offline cache; preserves legacy and test caches. */
const CACHE='my-flight-production-v14-revision-pdf-20261031';
const ASSETS=['./','./index.html','./seed.js','./offline.js','./duty.js','./advanced.js','./excel-import.js','./jszip.min.js','./manifest.webmanifest','./icon.svg'];
const scope=new URL(self.registration.scope);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('my-flight-production-')&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 e.respondWith((async()=>{
  const c=await caches.open(CACHE);
  try{const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r}
  catch(err){const old=await c.match(e.request,{ignoreSearch:true});if(old)return old;throw err}
 })());
});
