/* Visita Técnica — funcionamento sem internet */
const VERSAO = "vt-1.0.3";
const ARQUIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "libs/jspdf.umd.min.js",
  "libs/jspdf.plugin.autotable.min.js",
  "libs/xlsx.full.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== "vt-fontes").map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Serviço de envio: nunca passa pelo cache
  if (url.hostname.endsWith("script.google.com") || url.hostname.endsWith("googleusercontent.com")) return;

  // Fontes do Google: guarda depois do primeiro uso
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("vt-fontes").then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; } catch (err) { return new Response("", { status: 504 }); }
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Página: tenta a versão nova na internet; sem internet, usa a guardada
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put("index.html", cp)); return r; })
        .catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Demais arquivos: do aparelho primeiro
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); return r;
  })));
});
