// ─────────────────────────────────────────────────────────────────────────────
// JokenPo — Service Worker
//
// É isso que faz o jogo se comportar como app instalado: na primeira visita os
// arquivos ficam guardados no aparelho, e a partir daí carregam do disco, sem
// depender do GitHub. Funciona até offline.
//
// IMPORTANTE: ao mudar qualquer arquivo do jogo, suba o número da VERSAO abaixo.
// Sem isso, o navegador continua servindo a versão antiga que está no cache.
// ─────────────────────────────────────────────────────────────────────────────
const VERSAO = 'jokenpo-v5';
const CACHE_APP = VERSAO + '-app';
const CACHE_MIDIA = VERSAO + '-midia';

// arquivos pequenos: baixados de uma vez na instalação
const ESSENCIAIS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './characters.js',
  './sound.js',
  './manifest.json',
  './assets/img/poster.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_APP)
      // addAll falha inteiro se UM arquivo faltar; adicionar um por um é mais
      // tolerante (um asset renomeado não impede a instalação)
      .then(cache => Promise.all(
        ESSENCIAIS.map(url => cache.add(url).catch(e => console.warn('[SW] pulei', url)))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => !n.startsWith(VERSAO)).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

const ehMidiaGrande = url => /\.(mp4|webm|mp3|ogg|wav)$/i.test(url.pathname);

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fontes do Google, CDNs: deixa passar

  // Pedidos com Range (o <video> pedindo pedaço do arquivo) NÃO passam pelo
  // cache. O Cache API não entende Range e o Safari rejeita a resposta inteira,
  // o que quebrava o vídeo no iPhone. O jogo já baixa os clipes por fetch()
  // completo antes de tocar, então essa rota nem é usada na prática.
  if (req.headers.has('range')) return;

  const nomeCache = ehMidiaGrande(url) ? CACHE_MIDIA : CACHE_APP;

  evento.respondWith(
    caches.match(req).then(guardado => {
      if (guardado) {
        // vídeo já guardado: devolve do disco e não gasta rede nenhuma
        if (ehMidiaGrande(url)) return guardado;
        // código/imagem: devolve rápido e atualiza por trás
        fetch(req).then(res => {
          if (res && res.ok) caches.open(nomeCache).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return guardado;
      }

      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(nomeCache).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// permite o jogo pedir "baixe tudo agora" e acompanhar o progresso
self.addEventListener('message', evento => {
  const dados = evento.data || {};
  if (dados.tipo !== 'BAIXAR_MIDIA' || !Array.isArray(dados.urls)) return;

  const cliente = evento.source;
  caches.open(CACHE_MIDIA).then(async cache => {
    let feitos = 0;
    for (const url of dados.urls) {
      try {
        if (!(await cache.match(url))) await cache.add(url);
      } catch (e) {
        console.warn('[SW] não baixei', url);
      }
      feitos++;
      if (cliente) cliente.postMessage({ tipo: 'PROGRESSO_MIDIA', feitos, total: dados.urls.length });
    }
    if (cliente) cliente.postMessage({ tipo: 'MIDIA_PRONTA' });
  });
});
