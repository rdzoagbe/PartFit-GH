const CACHE='partfit-v3-20260813';
const CORE=['./','./index.html','./styles.css','./extras.css','./data.js','./app.js','./extras.js','./portal-shell.js','./portal-paypickup.js','./portal-account.js','./portal-orders-page.js','./portal-track.js','./portal-home-page.js','./portal-pages.js','./portal-faq.js','./portal-contact.js','./portal-policy.js','./portal-bootstrap.js','./portal-shell.css','./portal-home.css','./portal-account.css','./portal-orders.css','./portal-support.css','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));return;
 }
 e.respondWith(caches.match(e.request).then(hit=>{const net=fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>hit);return hit||net}));
});
