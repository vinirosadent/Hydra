/* HYDRA — service worker da cópia offline (trilha Q · D-405)
   Serve a peça a partir do Cache Storage do navegador do Quest, sem internet.
   Quem BAIXA os arquivos é a página inicial (index.html na raiz), não este arquivo:
   download feito pela página não tem limite de tempo e mostra progresso.
   Este arquivo nunca precisa mudar entre versões da peça.

   Regras:
   - Uma cópia só é usada se estiver COMPLETA (marcador __hydra_completo__ gravado no fim do download).
   - Havendo mais de uma completa, usa a mais recente.
   - precache.json: rede primeiro (3 s), cache se estiver offline — é por ele que a página sabe se há versão nova.
   - Todo o resto: cache primeiro; se não estiver na cópia, tenta a rede.
*/
const PREFIXO = 'hydra-';
const MARCA = '__hydra_completo__';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function copiaCompleta() {
  const nomes = (await caches.keys()).filter(n => n.startsWith(PREFIXO));
  let melhor = null, quando = -1;
  for (const n of nomes) {
    const c = await caches.open(n);
    const m = await c.match(new URL(MARCA, self.registration.scope).href);
    if (!m) continue;
    let t = 0; try { t = (await m.json()).quando || 0; } catch (e) {}
    if (t > quando) { quando = t; melhor = c; }
  }
  return melhor;
}

function comTempo(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo')), ms))]);
}

async function responder(req) {
  const url = new URL(req.url);
  const escopo = new URL(self.registration.scope);
  // fora do site (outra origem) ou fora do escopo: deixa passar
  if (url.origin !== escopo.origin || !url.pathname.startsWith(escopo.pathname)) return fetch(req);

  // "pasta/" → "pasta/index.html"
  let chave = url.origin + url.pathname;
  if (chave.endsWith('/')) chave += 'index.html';

  // download feito pela página inicial: sempre da rede, nunca de uma cópia antiga
  if (url.searchParams.has('hydra-baixar')) return fetch(req);

  // a lista de arquivos e a página inicial: rede primeiro, para enxergar versão nova.
  // Resposta só vale se for mesmo nossa (Wi-Fi de congresso pode devolver página de login com 200).
  const ehLista = url.pathname.endsWith('/precache.json');
  if (ehLista || chave === escopo.href + 'index.html') {
    try {
      const r = await comTempo(fetch(req, { cache: 'no-store' }), 3000);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const txt = await r.clone().text();
      const nossa = ehLista ? /"ver"\s*:/.test(txt) && /"files"\s*:/.test(txt) : txt.includes('__hydra_launcher__');
      if (!nossa) throw new Error('resposta estranha');
      return r;
    } catch (e) {
      const c = await copiaCompleta();
      const r = c && await c.match(chave, { ignoreSearch: true });
      if (r) return r;
      if (ehLista) return new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } });
      try { return await fetch(req); } catch (e2) { return new Response('HYDRA: offline and no stored copy yet.', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
    }
  }

  const c = await copiaCompleta();
  if (c) {
    const r = await c.match(chave, { ignoreSearch: true });
    if (r) return r;
  }
  try { return await fetch(req); }
  catch (e) {
    return new Response('HYDRA offline: este arquivo não está na cópia guardada — ' + url.pathname,
      { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(responder(e.request));
});
