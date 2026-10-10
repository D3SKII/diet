const CACHE='diet-shell-v1';
const FILES=['./','./index.html','./style.css','./app.js','./data.js','./domain.js','./storage.js','./config.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('diet-shell-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return res;}).catch(()=>caches.match(event.request)));});
