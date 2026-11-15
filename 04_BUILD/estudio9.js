/* HYDRA · ESTÚDIO DE DIREÇÃO v9 (D-337) — trilha M
   Duas trilhas separadas na linha do tempo:
     LUGAR  — FICA (verde-água) e ANDA (dourado; laranja = rápida; vermelho = rápida demais), com m e m/s escritos.
     OLHAR  — blocos violeta "olha para X de tal a tal", por cima de qualquer trecho, inclusive de uma caminhada.
   Fluxo: marca TODAS as paradas antes, clicando na PLANTA (à direita). Depois toca a peça e, na palavra certa,
   aperta "COMEÇA A ANDAR" (Enter). A chegada sai sozinha na velocidade padrão; "CHEGA AQUI" (C) fixa a chegada.
   O voo (F) serve só para ver e mirar: voando, L marca o centro da vista como alvo do olhar.
   Os dados moram em DIR (app.js §9c) e no navegador (localStorage 'hydra.direcao.v9'). */
export function iniciar(C){
  const {THREE,T,TOTAL,B,blockAt,REV,revSegAt,revWord,wordTime,fly,enterFly,exitFly,camera,PLANTA,plantaCam,DIR,GEO,CFG,POSE,togglePlay,regDownload}=C;
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const fmt=s=>{ s=Math.max(0,s); return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'); };
  const num=v=>v.toFixed(2).replace('.',',');
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parseT=s=>{ s=String(s).trim().replace(',','.'); if(!s) return null; const m=s.match(/^(\d+):(\d+(?:\.\d+)?)$/); const v=m?(+m[1])*60+(+m[2]):+s; return isFinite(v)?clamp(v,0,TOTAL-0.01):NaN; };
  const COR={cena:'#6ec1ff',fica:'#2dd4bf',ok:'#ffc84b',amarelo:'#ff9f1a',vermelho:'#ff4d6d',erro:'#ff4d6d',olhar:'#b58cff',voz:'#56608a',sem:'#7b83a6'};
  const ST={ok:'ok',amarelo:'rápida',vermelho:'rápida demais',erro:'chega antes de sair'};

  /* ------------------------------------------------------------------ interface */
  document.body.classList.add('dir9');
  const css=document.createElement('style'); css.textContent=`
  body.dir9 #reg,body.dir9 #loc,body.dir9 #maplab,body.dir9 #tr,body.dir9 #rev,body.dir9 #est,body.dir9 #vo,body.dir9 #snd{display:none!important}
  .d9{position:fixed;z-index:12;background:rgba(10,13,26,.88);border:1px solid rgba(255,255,255,.10);border-radius:10px;color:#c2c9e6;font:12px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;backdrop-filter:blur(6px)}
  .d9 button{font:600 11px system-ui,sans-serif;color:#e8ecf6;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:6px 9px;cursor:pointer;white-space:nowrap}
  .d9 button:hover{background:rgba(255,255,255,.15)} .d9 button.on{background:rgba(181,140,255,.25);border-color:rgba(181,140,255,.7)}
  .d9 button.andar{background:rgba(255,200,75,.18);border-color:rgba(255,200,75,.55);color:#ffd97a}
  .d9 button.chega{background:rgba(45,212,191,.16);border-color:rgba(45,212,191,.55);color:#8ff2e4}
  .d9 button.cena{background:rgba(110,193,255,.16);border-color:rgba(110,193,255,.55);color:#bfe3ff}
  .d9 button.olha{background:rgba(181,140,255,.16);border-color:rgba(181,140,255,.55);color:#d9c6ff}
  .d9 kbd{font:10px ui-monospace,monospace;color:#7b83a6;border:1px solid rgba(255,255,255,.14);border-radius:4px;padding:0 4px;margin-left:4px}
  .d9 h5{margin:0;padding:8px 10px 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#7b83a6;display:flex;justify-content:space-between;align-items:center}
  #d9Topo{top:10px;left:10px;padding:8px 12px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
  #d9Topo .t{font:600 20px ui-monospace,monospace;color:#fff} #d9Topo .t small{font-size:12px;color:#7b83a6;margin-left:4px}
  #d9Topo .b{color:#ffc84b;font-weight:600} #d9Topo .o{color:#8ff2e4}
  #d9Voz{flex-basis:100%;font-size:15px;line-height:1.5;color:#fff} #d9Voz span{cursor:pointer;border-radius:3px;padding:0 1px} #d9Voz span:hover{background:rgba(255,255,255,.18)} #d9Voz span.on{background:rgba(255,200,75,.35)}
  #d9Lado{left:10px;width:318px;overflow:auto}
  #d9Lado .it{margin:0 8px 6px;padding:6px 8px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:rgba(255,255,255,.03)}
  #d9Lado .it.sel{border-color:#fff;background:rgba(255,255,255,.08)} #d9Lado .it.agora{box-shadow:inset 3px 0 0 #2dd4bf}
  #d9Lado .l1{display:flex;gap:6px;align-items:center} #d9Lado .l1 b{font:700 12px ui-monospace,monospace;color:#2dd4bf;min-width:24px}
  #d9Lado .it.ol .l1 b{color:#b58cff}
  #d9Lado input{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#e8ecf6;font:11.5px ui-monospace,monospace;padding:3px 5px;width:66px}
  #d9Lado input.nome{flex:1;width:auto;font-family:system-ui,sans-serif} #d9Lado input.auto{color:#7b83a6;font-style:italic}
  #d9Lado .l2{display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap;font-size:11px;color:#7b83a6}
  #d9Lado .anda{margin-top:5px;font:11px ui-monospace,monospace;padding:3px 6px;border-radius:5px;background:rgba(255,200,75,.08)}
  #d9Lado .anda.amarelo{background:rgba(255,159,26,.14);color:#ffc27a} #d9Lado .anda.vermelho,#d9Lado .anda.erro{background:rgba(255,77,109,.16);color:#ff9db4}
  #d9Lado .sm{padding:2px 6px;font-size:10px} #d9Lado .x{background:none;border-color:transparent;color:#7b83a6}
  #d9Lado textarea{width:100%;box-sizing:border-box;margin-top:5px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:#e8ecf6;font:12px system-ui,sans-serif;padding:4px 6px;resize:vertical}
  #d9Lado .it.ce .l1 b{color:#6ec1ff}
  #d9Lado .vazio{margin:0 10px 8px;color:#7b83a6;line-height:1.5}
  #d9Planta{right:10px;pointer-events:none;background:transparent;backdrop-filter:none;border-color:rgba(255,255,255,.18)} #d9Planta h5{pointer-events:none;background:rgba(10,13,26,.9);border-radius:10px 10px 0 0}
  body.dir9 #VRButton{display:none!important}
  #d9Lado input.ch{width:88px}
  #d9PlCv{position:fixed;z-index:13;cursor:crosshair}
  #d9Base{left:10px;right:10px;bottom:10px;padding:6px 8px 4px}
  #d9Bot{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-bottom:5px}
  #d9Bot .sep{width:1px;height:22px;background:rgba(255,255,255,.12);margin:0 3px}
  #d9Bot .lab{font-size:10px;color:#7b83a6;letter-spacing:.08em;text-transform:uppercase}
  #d9Msg{flex:1;min-width:180px;text-align:right;font-size:11.5px;color:#ffd97a;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  #d9Tl{display:block;width:100%;height:130px;cursor:pointer;border-radius:6px}
  #d9Help{display:none;position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.55)} #d9Help.on{display:flex;align-items:center;justify-content:center}
  #d9Help .in{max-width:640px;max-height:84vh;overflow:auto;padding:18px 22px;line-height:1.55}
  #d9Help td{padding:3px 12px 3px 0;vertical-align:top} #d9Help td:first-child{white-space:nowrap;color:#ffd97a;font-family:ui-monospace,monospace}
  #d9Help h4{margin:12px 0 4px;color:#fff}
  #d9Gbl2{display:none;position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.55)} #d9Gbl2.on{display:flex;align-items:center;justify-content:center}
  #d9Gbl2 .in{max-width:760px;max-height:84vh;overflow:auto;padding:18px 22px;line-height:1.55}
  #d9GblGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
  #d9GblGrid .g{cursor:pointer;border:1px solid rgba(255,255,255,.10);border-radius:8px;padding:6px;background:rgba(255,255,255,.03);text-align:center;transition:background .1s}
  #d9GblGrid .g:hover{background:rgba(255,255,255,.10);border-color:rgba(181,140,255,.6)}
  #d9GblGrid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:5px;background:#12141f;display:block}
  #d9GblGrid .cod{font:700 12px ui-monospace,monospace;color:#b58cff;margin-top:5px}
  #d9GblGrid .nome{font-size:10px;color:#7b83a6;margin-top:2px;word-break:break-word;line-height:1.3}
  #d9Mira{position:fixed;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;z-index:14;pointer-events:none;display:none}
  body.ff #d9Mira{display:block}
  #d9Edit{display:none;position:fixed;z-index:50;width:300px;box-shadow:0 10px 34px rgba(0,0,0,.5)}
  #d9Edit.on{display:block}
  #d9Edit .hd{cursor:move;display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.10);font:700 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff;user-select:none}
  #d9Edit .hd .x{cursor:pointer;color:#7b83a6;padding:0 4px} #d9Edit .hd .x:hover{color:#fff}
  #d9Edit .bd{padding:10px}
  #d9Edit label{display:block;font-size:10.5px;color:#7b83a6;margin:8px 0 3px}
  #d9Edit label:first-child{margin-top:0}
  #d9Edit input,#d9Edit textarea{width:100%;box-sizing:border-box;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.14);border-radius:6px;color:#e8ecf6;font:12.5px system-ui,sans-serif;padding:6px 7px}
  #d9Edit input[type=text].mono,#d9Edit input.t{font:12.5px ui-monospace,monospace}
  #d9Edit textarea{font:12.5px system-ui,sans-serif;resize:vertical;min-height:60px}
  #d9Edit .row3{display:flex;gap:6px} #d9Edit .row3 input{width:0;flex:1}
  #d9Edit .ft{display:flex;gap:8px;justify-content:flex-end;padding:10px;border-top:1px solid rgba(255,255,255,.10)}
  #d9Edit .ft button.salvar{background:rgba(45,212,191,.18);border-color:rgba(45,212,191,.6);color:#8ff2e4}
  #d9Edit .err{color:#ff9db4;font-size:11px;min-height:14px;margin-top:6px}`;
  document.head.appendChild(css);
  const wrap=document.createElement('div'); wrap.innerHTML=`
  <div class="d9" id="d9Topo"><span class="t" id="d9T">0:00.0<small>/ ${fmt(TOTAL).slice(0,-2)}</small></span><span class="b" id="d9B"></span><span class="o" id="d9Onde"></span><div id="d9Voz"></div></div>
  <div class="d9" id="d9Lado"><h5><span>LUGAR · paradas</span><span><button class="sm" id="d9LimpaP" title="apaga todas as paradas (menos a entrada)">limpar</button></span></h5><div id="d9ListaP"></div>
    <h5><span>OLHAR · blocos</span><span id="d9NO"></span></h5><div id="d9ListaO"></div>
    <h5><span>CENA · o que mostrar</span><span id="d9NC"></span></h5><div id="d9ListaC"></div></div>
  <div class="d9" id="d9Planta"><h5><span>PLANTA · clique = parada · arraste = mover · roda = zoom</span><span><span id="d9PlModo"></span> <button class="sm" id="d9PlTudo" style="pointer-events:auto;padding:2px 6px;font-size:10px">ver tudo</button></span></h5></div>
  <canvas id="d9PlCv"></canvas>
  <div class="d9" id="d9Base"><div id="d9Bot">
    <button id="d9Play" title="Espaço">▶</button><button id="d9M1">−1s</button><button id="d9P1">+1s</button>
    <span class="sep"></span>
    <button class="andar" id="d9Anda" title="a pessoa sai da parada em que está, agora">▶ COMEÇA A ANDAR<kbd>Enter</kbd></button>
    <button class="chega" id="d9Chega" title="a pessoa chega na parada para onde anda, agora (define a velocidade)">■ CHEGA AQUI<kbd>C</kbd></button>
    <span class="sep"></span>
    <button class="olha" id="d9Olha" title="começa a olhar para o alvo, agora">◎ OLHA<kbd>L</kbd></button>
    <button class="olha" id="d9Solta" title="para de olhar, agora — volta a olhar para onde anda">○ SOLTA<kbd>K</kbd></button>
    <button class="cena" id="d9Cena" title="nova instrução do que mostrar, a partir de agora">✎ CENA<kbd>N</kbd></button>
    <span class="lab">alvo</span>
    <button class="al" data-a="mesa">mesa</button><button class="al" data-a="fileira">fileira</button><button class="al" data-a="monolito">monólito</button><button class="al" data-a="plinto">plinto</button><button class="al" data-a="planta">na planta</button>
    <span class="sep"></span>
    <button id="d9Voa" title="voar para ver e mirar (não marca lugar)">voar<kbd>F</kbd></button>
    <span class="sep"></span>
    <button id="d9Undo" title="Ctrl+Z">↶ desfazer</button><button id="d9Cad">baixar caderno</button><button id="d9Copy">copiar caderno</button><button id="d9Gbl" title="biblioteca de modelos .glb — código de cada um p/ citar na CENA">▦ GBL</button><button id="d9Aj">?</button>
    <span id="d9Msg"></span></div>
    <canvas id="d9Tl"></canvas></div>
  <div class="d9" id="d9Help"><div class="in d9" style="position:static">
    <b style="font-size:15px;color:#fff">Estúdio de direção — como usar</b>
    <p style="color:#aab2d0;margin:6px 0 0">A peça é dirigida em <b>3 trilhas independentes</b> na linha do tempo. Cada uma responde a UMA pergunta:</p>
    <table style="margin-top:6px"><tr><td>LUGAR</td><td><b>onde a pessoa está</b> — fica parada ou anda até a próxima parada.</td></tr>
    <tr><td>OLHAR</td><td><b>para onde ela olha</b> — sempre preenchida, do início ao fim: cada bloco vale até o próximo começar.</td></tr>
    <tr><td>CENA</td><td><b>o que aparece</b> — instruções em texto para a trilha M montar.</td></tr></table>
    <h4>Regra de ouro: duplo clique abre a caixa</h4>
    <table><tr><td>duplo clique num bloco</td><td>abre a caixa daquele bloco (LUGAR, OLHAR ou CENA) com tudo que dá para mudar nele.</td></tr>
    <tr><td>✂ dividir (na caixa)</td><td>corta o bloco no instante em que você deu o duplo clique. Vira dois blocos iguais; depois mude só um deles. No LUGAR, cria uma parada de passagem naquele ponto do caminho.</td></tr>
    <tr><td>salvar / cancelar</td><td>nada muda até salvar. Enter salva, Esc cancela.</td></tr></table>
    <h4>OLHAR — os 4 tipos de bloco (campo "olhar para")</h4>
    <table><tr><td style="color:#6b7390">→ para onde anda</td><td>olha em frente, na direção do caminho (parado: continua na última direção). É o padrão; buracos viram este tipo.</td></tr>
    <tr><td style="color:#5aa9ff">═ horizonte</td><td>olhar reto, na altura dos olhos (sem inclinar para cima/baixo). 🎯 mirar grava só a direção.</td></tr>
    <tr><td style="color:#c9a36b">▭ mesa</td><td>olha para a mesa à frente de onde a pessoa está, acompanhando enquanto anda.</td></tr>
    <tr><td style="color:#b58cff">● ponto</td><td>olha fixo para um ponto (monólito, plinto, fileira, ou um ponto qualquer). A cabeça acompanha o ponto enquanto anda — chega na frente dele já olhando na mesma altura, sem salto.<br>
      <i>modo "fixo"</i>: olha o ponto o bloco inteiro. <i>modo "até passar"</i>: solta sozinho quando o ponto fica para trás.</td></tr>
    <tr><td>🎯 mirar</td><td>aparece a mira no centro da tela: mova a vista (ou voe com F) até o que quer olhar e aperte <b>Enter</b> para gravar. Esc cancela.</td></tr>
    <tr><td>transição (s)</td><td>quanto tempo a cabeça leva para virar do bloco anterior para este (padrão ${num(DIR.TRANS_PADRAO)} s; nunca mais que 80% do bloco). Maior = mais suave. Use ~0,05 s para corte seco.</td></tr>
    <tr><td>arrastar a divisa</td><td>entre dois blocos de OLHAR há uma alça: arraste para mudar quando um termina e o outro começa.</td></tr></table>
    <h4>LUGAR — paradas e caminhadas (planta à direita)</h4>
    <table><tr><td>clique no chão</td><td>nova parada no fim (P1, P2, …). P0 é a entrada, fixa. Arrastar = mudar o lugar.</td></tr>
    <tr><td>Enter · ANDA</td><td>sai AGORA da parada atual para a próxima (chegada automática a ${num(DIR.VPADRAO)} m/s).</td></tr>
    <tr><td>C · CHEGA</td><td>chega AGORA na próxima parada (define a velocidade).</td></tr>
    <tr><td>cores</td><td>verde-água = fica · dourado = anda · laranja = rápido (&gt; ${num(DIR.VAMBAR)} m/s) · vermelho = rápido demais (&gt; ${num(CFG.vmax)} m/s).</td></tr></table>
    <h4>Atalhos enquanto toca</h4>
    <table><tr><td>L · OLHA</td><td>começa um bloco "ponto" AGORA, no alvo escolhido (ou na mira, se estiver voando).</td></tr>
    <tr><td>K · SOLTA</td><td>começa um bloco "para onde anda" AGORA.</td></tr>
    <tr><td>N · CENA</td><td>nova instrução de cena a partir de agora (4 s) e abre o texto.</td></tr>
    <tr><td>Espaço · ← →</td><td>toca/pausa · 0,1 s (Shift 1 s, Alt pula de fala)</td></tr>
    <tr><td>F / Esc</td><td>voar (WASD, mouse, E/Q) / volta à câmera da peça</td></tr>
    <tr><td>Delete · Ctrl+Z · ?</td><td>apaga o selecionado · desfaz · esta ajuda</td></tr></table>
    <p style="color:#7b83a6">Tudo fica no navegador e sai em "baixar/copiar caderno" — cole o caderno no chat da trilha M.</p>
    <button id="d9AjX">fechar</button></div></div>
  <div class="d9" id="d9Gbl2"><div class="in d9" style="position:static">
    <b style="font-size:15px;color:#fff">Biblioteca GBL — modelos disponíveis</b>
    <p style="color:#7b83a6;margin:4px 0 12px">Clique numa miniatura para copiar o código (ex.: <code>gbl4</code>) — use-o na CENA: "pegue gbl4 e...". Lista gerada da pasta GBL/ pela trilha M — largou um .glb novo na pasta GBL? Clique em "↻ atualizar": ele aparece na hora com o código definitivo (a miniatura vem quando a M gerar).</p>
    <div id="d9GblGrid"></div>
    <button id="d9GblR" style="margin-top:12px">↻ atualizar</button>
    <button id="d9GblX" style="margin-top:12px">fechar</button></div></div>
  <div class="d9" id="d9Edit"><div class="hd"><span id="d9EditT">editar</span><span class="x" id="d9EditX">✕</span></div>
    <div class="bd" id="d9EditBd"></div>
    <div class="err" id="d9EditErr"></div>
    <div class="ft"><button id="d9EditCancelar">cancelar</button><button class="salvar" id="d9EditSalvar">salvar</button></div></div>
  <svg id="d9Mira" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7" fill="none" stroke="#b58cff" stroke-width="1.6"/><path d="M11 0v6M11 16v6M0 11h6M16 11h6" stroke="#b58cff" stroke-width="1.6"/></svg>`;
  document.body.appendChild(wrap);

  /* ------------------------------------------------------------------ estado da interface */
  let sel=null;            // {tipo:'p'|'o', id}
  let alvoArm=null;        // alvo escolhido para o próximo OLHA: {nome, fn}
  let plModo='parada';     // 'parada' | 'alvo'
  let msgT=0;
  const msg=(s,cor)=>{ const m=$('d9Msg'); m.textContent=s; m.style.color=cor||'#ffd97a'; msgT=performance.now(); };
  const U=[]; const snap=()=>{ U.push(JSON.stringify({p:DIR.paradas,o:DIR.olhares})); if(U.length>150) U.shift(); };
  const mudar=(fn,texto)=>{ snap(); fn(); DIR.salvar(); listas(); if(texto) msg(texto); };
  function desfazer(){ const s=U.pop(); if(!s){ msg('nada para desfazer'); return; } const d=JSON.parse(s); DIR.paradas=d.p; DIR.olhares=d.o; DIR.entrada(); DIR.salvar(); if(sel&&!achar(sel)) sel=null; listas(); msg('desfeito'); }
  const achar=s=>s&&(s.tipo==='p'?DIR.paradas.find(p=>p.id===s.id):s.tipo==='c'?DIR.cenas.find(o=>o.id===s.id):DIR.olhares.find(o=>o.id===s.id));
  const idxP=id=>DIR.paradas.findIndex(p=>p.id===id);

  /* os alvos rápidos — pontos da sala na altura certa */
  const ALVOS={
    mesa:{nome:'mesa', fn:()=>[0,+(GEO.mesa.h+0.06).toFixed(2),+clamp(POSE.pos.z,GEO.mesa.z1,GEO.mesa.z0).toFixed(2)]},
    fileira:{nome:'fileira do eluato', fn:()=>[0,+(GEO.mesa.h+0.1).toFixed(2),+(GEO.mesa.z0-0.5).toFixed(2)]},
    monolito:{nome:'monólito', fn:()=>[0,+((GEO.painel.campo.y0+GEO.painel.campo.y1)/2).toFixed(2),GEO.painel.z]},
    plinto:{nome:'plinto', fn:()=>[0,1.75,GEO.rot.z]} };
  /* o centro da vista, voando: o tampo da mesa se a mira desce até ele; senão um ponto a 6 m (sem cruzar a arquitetura — custava 30 s) */
  function alvoDoCentro(){ const d=new THREE.Vector3(); camera.getWorldDirection(d); const p=camera.position;
    if(d.y<-0.05){ const k=(GEO.mesa.h-p.y)/d.y, q=p.clone().addScaledVector(d,k); if(k>0.3&&k<20&&Math.abs(q.x)<GEO.mesa.w/2+0.3&&q.z<GEO.mesa.z0+0.3&&q.z>GEO.mesa.z1-0.3) return [+q.x.toFixed(2),+q.y.toFixed(2),+q.z.toFixed(2)]; }
    const q=p.clone().addScaledVector(d,6); return [+q.x.toFixed(2),+q.y.toFixed(2),+q.z.toFixed(2)]; }

  /* ------------------------------------------------------------------ ações */
  function comecaAndar(){ const t=+T.t.toFixed(2), r=DIR.onde(t), A=DIR.agenda();
    if(r.anda){ msg('já está andando de P'+r.k+' para P'+(r.k+1)+' — para mudar a saída, arraste a borda na trilha LUGAR','#ff9db4'); return; }
    const k=r.k; if(k>=DIR.paradas.length-1){ msg('P'+k+' é a última parada — marque a próxima na planta antes','#ff9db4'); return; }
    mudar(()=>{ DIR.paradas[k].sai=t; const n=DIR.paradas[k+1]; if(n.chega!=null&&n.chega<=t+0.05) n.chega=null; },null);
    const w=DIR.agenda()[k].anda; sel={tipo:'p',id:DIR.paradas[k+1].id}; listas();
    msg('P'+k+' sai em '+fmt(t)+' → anda '+num(w.L)+' m até P'+(k+1)+' · chega '+fmt(w.ate)+' · '+num(w.v)+' m/s ('+ST[w.st]+')', w.st==='ok'?'#ffd97a':'#ff9db4'); }
  function chegaAqui(){ const t=+T.t.toFixed(2), r=DIR.onde(t);
    const k=r.anda? r.k+1 : r.k; if(k===0){ msg('a entrada não tem chegada — ela é o começo','#ff9db4'); return; }
    const A=DIR.agenda(), q=A[k-1]; if(q.sai===null||q.sai>=t-0.05){ msg('P'+(k-1)+' ainda não saiu antes deste instante','#ff9db4'); return; }
    mudar(()=>{ const p=DIR.paradas[k]; p.chega=t; if(p.sai!=null&&p.sai<t) p.sai=t; },null);
    const w=DIR.agenda()[k-1].anda; sel={tipo:'p',id:DIR.paradas[k].id}; listas();
    msg('P'+k+' chega em '+fmt(t)+' · '+num(w.L)+' m em '+num(w.T)+' s · '+num(w.v)+' m/s ('+ST[w.st]+')', w.st==='ok'?'#8ff2e4':'#ff9db4'); }
  function olha(alvo,nome){ const t=+T.t.toFixed(2);
    if(!alvo){ if(fly.on){ alvo=alvoDoCentro(); nome='mira do voo'; }
      else if(alvoArm){ alvo=alvoArm.fn(); nome=alvoArm.nome; }
      else { plModo='alvo'; msg('clique na PLANTA onde a pessoa deve olhar (ou escolha um alvo)'); return; } }
    mudar(()=>{ DIR.olhares.forEach(o=>{ if(o.de<t&&(o.ate==null||o.ate>t)) o.ate=t; });   // o anterior termina aqui
      const o={id:DIR.id(),tipo:'ponto',de:t,ate:null,alvo,nome:nome||''}; DIR.olhares.push(o); sel={tipo:'o',id:o.id}; },
      'olhar começa em '+fmt(t)+' → '+(nome||'alvo')+' · K solta'); }
  function solta(){ const t=+T.t.toFixed(2);   /* D-367: SOLTA = começa aqui um bloco "para onde anda" (a trilha fica sempre preenchida) */
    mudar(()=>{ const o={id:DIR.id(),tipo:'anda',de:t,ate:null,nome:'para onde anda'}; DIR.olhares.push(o); sel={tipo:'o',id:o.id}; },'a partir de '+fmt(t)+' olha para onde anda'); }
  function apagarSel(){ if(!sel) return; if(sel.tipo==='p'){ const i=idxP(sel.id); if(i<=0){ msg('a entrada não sai'); return; }
      mudar(()=>{ const p=DIR.paradas[i-1]; DIR.paradas.splice(i,1); if(i===DIR.paradas.length) p.sai=null; },'P'+i+' apagada'); }
    else if(sel.tipo==='c') mudar(()=>{ DIR.cenas=DIR.cenas.filter(o=>o.id!==sel.id); },'instrução de cena apagada');
    else mudar(()=>{ DIR.olhares=DIR.olhares.filter(o=>o.id!==sel.id); },'olhar apagado'); sel=null; listas(); }
  /* D-339: CENA — "de tal a tal, mostre X, o objeto gira 2 vezes…": texto livre com início e fim, para a trilha M montar */
  function cena(){ const t=+T.t.toFixed(2); let id;
    mudar(()=>{ const c={id:DIR.id(),de:t,ate:+Math.min(t+4,TOTAL-0.01).toFixed(2),texto:''}; DIR.cenas.push(c); sel={tipo:'c',id:c.id}; id=c.id; },
      'nova instrução de cena em '+fmt(t)+' (4 s — arraste as bordas) · escreva na lista à esquerda');
    setTimeout(()=>{ const ta=document.querySelector('#d9ListaC .it[data-id="'+id+'"] textarea'); if(ta){ ta.focus(); ta.scrollIntoView({block:'nearest'}); } },30); }
  function escolherAlvo(key,btn){
    if(key==='planta'){ plModo=plModo==='alvo'?'parada':'alvo'; msg(plModo==='alvo'?'clique na PLANTA onde olhar':''); marcaAlvos(); return; }
    const a=ALVOS[key]; const o=sel&&sel.tipo==='o'&&achar(sel);
    if(o){ mudar(()=>{ o.alvo=a.fn(); o.nome=a.nome; },'o olhar selecionado agora mira '+a.nome); return; }
    alvoArm=(alvoArm&&alvoArm===a)?null:a; plModo='parada'; marcaAlvos(); msg(alvoArm?'alvo: '+a.nome+' — L começa a olhar para ele':''); }
  function marcaAlvos(){ document.querySelectorAll('#d9Bot .al').forEach(b=>b.classList.toggle('on', b.dataset.a==='planta'? plModo==='alvo' : alvoArm===ALVOS[b.dataset.a]));
    $('d9PlModo').textContent=plModo==='alvo'?'● clique = ALVO do olhar':''; }
  $('d9Play').onclick=()=>togglePlay(); $('d9M1').onclick=()=>{ T.t=T.t-1; }; $('d9P1').onclick=()=>{ T.t=T.t+1; };
  $('d9Cena').onclick=cena; $('d9Anda').onclick=comecaAndar; $('d9Chega').onclick=chegaAqui; $('d9Olha').onclick=()=>olha(); $('d9Solta').onclick=solta;
  document.querySelectorAll('#d9Bot .al').forEach(b=>{ b.onclick=()=>escolherAlvo(b.dataset.a,b); });
  $('d9Voa').onclick=()=>{ if(!fly.on) enterFly(); };
  $('d9Undo').onclick=desfazer;
  $('d9Cad').onclick=()=>regDownload('hydra_caderno.md',C.caderno());
  $('d9Copy').onclick=()=>{ (navigator.clipboard?.writeText(C.caderno())||Promise.reject()).then(()=>msg('caderno copiado — cole no chat da trilha M'),()=>regDownload('hydra_caderno.md',C.caderno())); };
  $('d9Aj').onclick=()=>$('d9Help').classList.add('on'); $('d9AjX').onclick=()=>$('d9Help').classList.remove('on');
  let gblCarregado=false;
  function abrirGbl(){ $('d9Gbl2').classList.add('on'); if(!gblCarregado){ gblCarregado=true; carregarGbl(); } }
  /* D-349b: botão "↻ atualizar" — refaz a busca do manifesto sem precisar de F5. Não regenera o manifesto
     em si (isso continua exigindo a trilha M, que roda o gerador com Playwright); só força o navegador a
     buscar de novo o data/gbl_manifest.json depois que ele avisa que já atualizei. */
  async function carregarGbl(){ const grid=$('d9GblGrid'); grid.textContent='carregando…';
    try{ const r=await fetch('data/gbl_manifest.json',{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status); const man=await r.json();
      /* D-357: o "↻ atualizar" também lê a PASTA GBL/ (a listagem que o servidor local devolve) — arquivo novo que ainda não
         está no manifesto aparece na hora, com o código que o gerador da M vai dar a ele (mesma regra: arquivos novos em ordem
         alfabética, a partir do maior código + 1 — então o código não muda quando a M gerar a miniatura). Sem miniatura até lá. */
      try{ let lista=null;
          /* o servidor da peça (servir_quest.js/.py) responde /__gbl com a lista; o servidor simples de teste devolve a listagem da pasta */
          try{ const rj=await fetch('/__gbl',{cache:'no-store'}); if(rj.ok){ const j=await rj.json(); if(Array.isArray(j.arquivos)) lista=j.arquivos; } }catch(e){}
          if(!lista){ const rg=await fetch('../GBL/',{cache:'no-store'}); if(rg.ok) lista=[...(await rg.text()).matchAll(/href="([^"]+\.glb)"/gi)].map(m=>decodeURIComponent(m[1])); }
          if(lista){ const conhecidos=new Set(man.itens.map(i=>i.arquivo));
          const novos=[...new Set(lista)].filter(f=>!conhecidos.has(f)).sort((x,y)=>x<y?-1:x>y?1:0);
          let prox=Math.max(0,...man.itens.map(i=>+String(i.codigo).slice(3)||0))+1;
          novos.forEach(f=>man.itens.push({codigo:'gbl'+(prox++),arquivo:f,miniatura:null,novo:true})); } }catch(e){}
      grid.innerHTML=''; for(const it of man.itens){ const d=document.createElement('div'); d.className='g'; d.title=it.arquivo+' — clique para copiar '+it.codigo;
        d.innerHTML=(it.novo?`<div style="aspect-ratio:1;border-radius:5px;background:#12141f;display:flex;align-items:center;justify-content:center;text-align:center;font-size:10px;color:#b58cff;padding:6px">NOVO<br>sem miniatura ainda</div>`
          :`<img src="data/${it.miniatura||''}" loading="lazy" onerror="this.style.opacity=.2">`)+`<div class="cod">${esc(it.codigo)}</div><div class="nome">${esc(it.arquivo)}</div>`;
        d.onclick=()=>{ (navigator.clipboard?.writeText(it.codigo)||Promise.reject()).then(()=>msg(it.codigo+' copiado — cole na CENA'),()=>msg('código: '+it.codigo)); };
        grid.appendChild(d); }
      const nn=man.itens.filter(i=>i.novo).length; msg(man.itens.length+' modelos na biblioteca'+(nn?' · '+nn+' novo(s) da pasta GBL, sem miniatura ainda':'')); }
    catch(e){ grid.textContent='não consegui ler data/gbl_manifest.json ('+e.message+') — peça à trilha M para gerar/atualizar'; } }
  $('d9Gbl').onclick=abrirGbl; $('d9GblX').onclick=()=>$('d9Gbl2').classList.remove('on'); $('d9GblR').onclick=carregarGbl;
  $('d9PlTudo').onclick=()=>{ L.keep=false; layout(); };
  $('d9LimpaP').onclick=()=>{ if(DIR.paradas.length<2) return; mudar(()=>{ DIR.paradas.splice(1); DIR.paradas[0].sai=null; },'paradas apagadas (Ctrl+Z desfaz)'); sel=null; };

  /* ------------------------------------------------------------------ D-350: popup de edição — duplo clique num item da
     timeline (LUGAR/OLHAR/CENA) abre uma caixa arrastável com os mesmos campos da lista à esquerda + botão "salvar",
     para não precisar procurar o item na lista da direita. Os campos e a validação espelham exatamente os de listas(). */
  const campo=(bd,label,val)=>{ const lab=document.createElement('label'); lab.textContent=label; bd.appendChild(lab);
    const inp=document.createElement('input'); inp.value=val; bd.appendChild(inp); return inp; };
  function fecharEdit(){ $('d9Edit').classList.remove('on'); $('d9EditSalvar').textContent='salvar'; }
  function posEdit(x,y){ const el=$('d9Edit'); el.style.left='-9999px'; el.style.top='-9999px'; el.classList.add('on');
    const w=el.offsetWidth||300, h=el.offsetHeight||200;
    const px=clamp((x??innerWidth/2-w/2),8,innerWidth-w-8), py=clamp((y??innerHeight/2-h/2),8,innerHeight-h-8);
    Object.assign(el.style,{left:px+'px',top:py+'px'}); }
  /* D-367: OLHAR sempre preenchido; tipos do bloco; ✂ dividir nas três trilhas */
  const TIPOS_O=[['ponto','um ponto (mira na tela)'],['anda','para onde anda'],['horizonte','horizonte (direção fixa, nivelada)'],['mesa','a mesa (o tampo à frente)'],
    ['@monolito','o monólito'],['@plinto','o plinto'],['@fileira','a fileira do eluato'],['@mesa','a mesa (ponto fixo no tampo)']];
  const nomeTipo=o=>({anda:'para onde anda',horizonte:'horizonte',mesa:'a mesa'}[o.tipo]||(o.nome||'um ponto'));
  let dblT=null, dblAnda=null;   // o instante do duplo clique (para ✂ dividir) e, no LUGAR, a caminhada clicada
  function dividirBtn(bd,fn,rotulo){ const b=document.createElement('button'); b.textContent='✂ dividir aqui'+(dblT!=null?' ('+fmt(dblT)+')':''); b.title=rotulo; b.style.cssText='margin-top:10px;margin-left:6px'; b.onclick=fn; bd.appendChild(b); return b; }
  function abrirEdit(tipo,id,x,y){
    const item = tipo==='p'?DIR.paradas.find(p=>p.id===id) : tipo==='o'?DIR.olhares.find(o=>o.id===id) : DIR.cenas.find(c=>c.id===id);
    if(!item) return; sel={tipo,id}; listas();
    const bd=$('d9EditBd'); bd.innerHTML=''; $('d9EditErr').textContent='';
    const els={}; let salvar;
    if(tipo==='p'){
      const isEntrada=idxP(id)===0;
      $('d9EditT').textContent='LUGAR · '+(isEntrada?'entrada':(item.nome||id));
      if(!isEntrada){ els.nome=campo(bd,'nome',item.nome||''); els.chega=campo(bd,'chega (vazio = automático)',item.chega!=null?fmt(item.chega):''); }
      els.sai=campo(bd,isEntrada?'sai':'sai (vazio = até o fim)',item.sai!=null?fmt(item.sai):'');
      salvar=()=>{ const saiV=parseT(els.sai.value); if(Number.isNaN(saiV)){ $('d9EditErr').textContent='sai: horário inválido'; return; }
        let chegaV, nomeV; if(!isEntrada){ chegaV=parseT(els.chega.value); if(Number.isNaN(chegaV)){ $('d9EditErr').textContent='chega: horário inválido'; return; } nomeV=els.nome.value; }
        mudar(()=>{ item.sai=saiV; if(!isEntrada){ item.chega=chegaV; item.nome=nomeV; } },'P'+idxP(id)+' atualizada'); fecharEdit(); };
      if(dblAnda&&dblT!=null){ const k=idxP(id), t=+dblT.toFixed(2); dividirBtn(bd,()=>{ const o={pos:new THREE.Vector3(),look:new THREE.Vector3()}; DIR.pose(t,o);
          mudar(()=>{ DIR.paradas.splice(k,0,{id:DIR.id(),x:+o.pos.x.toFixed(3),z:+o.pos.z.toFixed(3),y:+(o.pos.y-CFG.eyeY).toFixed(3),chega:t,sai:t,nome:'ponto de passagem'}); },'novo ponto de passagem em '+fmt(t)+' — arraste-o na planta para curvar a caminhada'); fecharEdit(); },'põe um ponto de passagem nesta caminhada, onde a pessoa está neste instante (fica 0 s; a caminhada continua contínua)'); }
    } else if(tipo==='o'){
      $('d9EditT').textContent='OLHAR · '+fmt(item.de)+(item.ate!=null?' → '+fmt(item.ate):' → fim');
      const lab=document.createElement('label'); lab.textContent='olhar para'; bd.appendChild(lab);
      const selT=document.createElement('select'); selT.innerHTML=TIPOS_O.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');
      Object.assign(selT.style,{width:'100%',background:'rgba(0,0,0,.3)',color:'#e8ecf6',border:'1px solid rgba(255,255,255,.14)',borderRadius:'6px',padding:'6px'}); bd.appendChild(selT);
      selT.value=item.tipo==='ponto'||!item.tipo?'ponto':item.tipo;
      const boxP=document.createElement('div'); bd.appendChild(boxP);
      const selM=seletorModo(boxP,item.modo);
      const lab2=document.createElement('label'); lab2.textContent='alvo (x · y · z) — ou use 🎯 mirar'; boxP.appendChild(lab2);
      const row=document.createElement('div'); row.className='row3'; const A0=item.alvo||[0,1.6,-10];
      const alvoIns=[0,1,2].map(i=>{ const inp=document.createElement('input'); inp.className='t'; inp.value=(A0[i]??0); row.appendChild(inp); return inp; }); boxP.appendChild(row);
      const mostra=()=>{ boxP.style.display=(selT.value==='ponto')?'':'none'; }; selT.onchange=mostra; mostra();
      els.nome=campo(bd,'nome (opcional)',item.nome||'');
      els.de=campo(bd,'começa em',fmt(item.de));
      els.tr=campo(bd,'transição a partir do bloco anterior (s)',String(item.trans??DIR.TRANS_PADRAO).replace('.',','));
      const bm=document.createElement('button'); bm.textContent='🎯 mirar na tela'; bm.title='a câmera vai para o começo do bloco; mouse/WASD aponta; Enter grava'; bm.style.marginTop='10px'; bd.appendChild(bm);
      bm.onclick=()=>{ fecharEdit(); comecarMira(item.id,item.de,selM.value, selT.value==='horizonte'?'horizonte':'ponto'); };
      if(dblT!=null&&dblT>item.de+0.2&&dblT<(item.ate??TOTAL)-0.2) dividirBtn(bd,()=>{ const t=+dblT.toFixed(2); mudar(()=>{ const n=JSON.parse(JSON.stringify(item)); n.id=DIR.id(); n.de=t; n.trans=0.05; item.ate=t; DIR.olhares.push(n); sel={tipo:'o',id:n.id}; },'bloco dividido em '+fmt(t)+' — os dois lados olham igual; mude um deles'); fecharEdit(); },'corta este bloco em dois neste instante');
      salvar=()=>{ const deV=parseT(els.de.value); if(deV===null||Number.isNaN(deV)){ $('d9EditErr').textContent='começa em: horário inválido'; return; }
        const tr=parseFloat((els.tr.value||'').replace(',','.')); if(!Number.isFinite(tr)||tr<0){ $('d9EditErr').textContent='transição: número de segundos'; return; }
        const v=selT.value, alvo=alvoIns.map(inp=>{ const n=parseFloat((inp.value||'0').replace(',','.')); return Number.isFinite(n)?n:0; });
        mudar(()=>{ item.de=deV; item.trans=tr; item.nome=els.nome.value;
          if(v[0]==='@'){ const a=ALVOS[v.slice(1)]; item.tipo='ponto'; item.alvo=a.fn(); item.modo=selM.value; item.nome=els.nome.value||a.nome; }
          else if(v==='ponto'){ item.tipo='ponto'; item.alvo=alvo; item.modo=selM.value; }
          else { item.tipo=v; if(v==='horizonte'&&item.yaw==null) item.yaw=POSE?Math.atan2(-(POSE.look.x-POSE.pos.x),-(POSE.look.z-POSE.pos.z))*180/Math.PI:0; } },'olhar atualizado'); fecharEdit(); };
    } else {
      $('d9EditT').textContent='CENA';
      els.de=campo(bd,'de',fmt(item.de));
      els.ate=campo(bd,'até (vazio = o fim)',item.ate!=null?fmt(item.ate):'');
      const lab=document.createElement('label'); lab.textContent='o que aparece'; bd.appendChild(lab);
      const ta=document.createElement('textarea'); ta.value=item.texto||''; bd.appendChild(ta); els.texto=ta;
      if(dblT!=null&&dblT>item.de+0.2&&dblT<(item.ate??TOTAL)-0.2) dividirBtn(bd,()=>{ const t=+dblT.toFixed(2); mudar(()=>{ const n=JSON.parse(JSON.stringify(item)); n.id=DIR.id(); n.de=t; item.ate=t; DIR.cenas.push(n); sel={tipo:'c',id:n.id}; },'cena dividida em '+fmt(t)); fecharEdit(); },'corta esta instrução em duas neste instante (o texto fica nas duas)');
      salvar=()=>{ const deV=parseT(els.de.value); if(deV===null||Number.isNaN(deV)){ $('d9EditErr').textContent='de: horário inválido'; return; }
        const ateV=parseT(els.ate.value); if(Number.isNaN(ateV)||(ateV!==null&&ateV<=deV)){ $('d9EditErr').textContent='até: precisa vir depois de "de"'; return; }
        mudar(()=>{ item.de=deV; item.ate=ateV; item.texto=els.texto.value; },'cena atualizada'); fecharEdit(); };
    }
    posEdit(x,y);
    $('d9EditSalvar').onclick=salvar; $('d9EditCancelar').onclick=fecharEdit;
  }
  /* D-353: modo do olhar — "fixo" (olha o ponto parado ou andando, até o fim do bloco) ou "passa" (olha o ponto
     enquanto ele está à frente e solta sozinho quando ele passa para o lado). Ele escolhe em cada bloco. */
  function seletorModo(bd,modo){ const lab=document.createElement('label'); lab.textContent='modo'; bd.appendChild(lab);
    const s=document.createElement('select'); s.innerHTML='<option value="fixo">fixo — olha o ponto parado e andando, até o fim do bloco</option><option value="passa">até passar — olha enquanto está à frente, solta quando o ponto passa</option>';
    s.value=modo==='passa'?'passa':'fixo'; Object.assign(s.style,{width:'100%',background:'rgba(0,0,0,.3)',color:'#e8ecf6',border:'1px solid rgba(255,255,255,.14)',borderRadius:'6px',padding:'6px'}); bd.appendChild(s); return s; }
  /* D-353: duplo clique num ESPAÇO VAZIO da trilha OLHAR → escolhe o modo → mira na tela (voo + mira no centro) → Enter grava */
  function abrirNovoOlhar(t,x,y){ const bd=$('d9EditBd'); bd.innerHTML=''; $('d9EditErr').textContent='';
    $('d9EditT').textContent='NOVO OLHAR · '+fmt(t);
    const p=document.createElement('p'); p.style.cssText='margin:0 0 6px;font-size:11.5px;color:#aab2d0;line-height:1.45';
    p.innerHTML='Escolha o modo e clique <b>mirar</b>: a câmera vai para este instante, aparece a mira no centro. Mouse (e WASD) aponta · <b>Enter</b> grava · <b>Esc</b> cancela.'; bd.appendChild(p);
    const selM=seletorModo(bd,'fixo'); posEdit(x,y);
    $('d9EditSalvar').textContent='🎯 mirar'; $('d9EditSalvar').onclick=()=>{ fecharEdit(); comecarMira(null,t,selM.value); };
    $('d9EditCancelar').onclick=fecharEdit; }
  let mira=null;   // {id|null, t, modo} enquanto ele está mirando
  function comecarMira(id,t,modo,tipo){ T.t=t; if(T.playing) togglePlay(); mira={id,t,modo,tipo:tipo||'ponto'};
    if(!fly.on) enterFly();
    /* o voo começa de onde a PEÇA está neste instante (a câmera só se atualiza no próximo quadro) */
    { const o={pos:new THREE.Vector3(),look:new THREE.Vector3()}; DIR.pose(t,o); fly.pos.copy(o.pos);
      const dx=o.look.x-o.pos.x, dy=o.look.y-o.pos.y, dz=o.look.z-o.pos.z; fly.yaw=Math.atan2(-dx,-dz)*180/Math.PI; fly.pitch=Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI; }
    msg('MIRANDO ('+(modo==='passa'?'até passar':'fixo')+') — mouse/WASD aponta · Enter grava · Esc cancela','#b58cff'); }
  function gravarMira(){ const m=mira; mira=null; const alvo=alvoDoCentro();
    if(m.id){ const o=DIR.olhares.find(o=>o.id===m.id); if(o){ mudar(()=>{ if(m.tipo==='horizonte'){ o.tipo='horizonte'; o.yaw=fly.yaw; } else { o.tipo='ponto'; o.alvo=alvo; o.modo=m.modo; } },m.tipo==='horizonte'?'horizonte gravado':'alvo regravado · '+alvo.map(v=>num(v)).join(' · ')); sel={tipo:'o',id:o.id}; } }
    else { const prox=DIR.olhares.filter(o=>o.de>m.t+0.05).map(o=>o.de).sort((a,b)=>a-b)[0];
      mudar(()=>{ DIR.olhares.forEach(o=>{ if(o.de<m.t&&(o.ate==null||o.ate>m.t)) o.ate=m.t; });
        const o={id:DIR.id(),tipo:'ponto',de:m.t,ate:prox??null,alvo,nome:'',modo:m.modo}; DIR.olhares.push(o); sel={tipo:'o',id:o.id}; },
        'olhar ('+(m.modo==='passa'?'até passar':'fixo')+') gravado em '+fmt(m.t)+(prox!=null?' até '+fmt(prox):' até o fim')+' · arraste as bordas para ajustar'); }
    exitFly(); T.t=m.t; listas(); }
  /* Enter/Esc da mira em captura: roda ANTES do teclado do voo (que usaria Enter para congelar a vista) */
  addEventListener('keydown',e=>{ if(!mira) return;
    if(e.key==='Enter'){ e.preventDefault(); e.stopImmediatePropagation(); if(fly.on) gravarMira(); else mira=null; }
    else if(e.key==='Escape'){ mira=null; msg('mira cancelada'); } },true);
  $('d9EditX').onclick=fecharEdit;
  (()=>{ const hd=document.querySelector('#d9Edit .hd'); let drag=null;
    hd.addEventListener('pointerdown',ev=>{ if(ev.target.id==='d9EditX') return; const el=$('d9Edit'), box=el.getBoundingClientRect();
      drag={dx:ev.clientX-box.left,dy:ev.clientY-box.top}; hd.setPointerCapture(ev.pointerId); });
    hd.addEventListener('pointermove',ev=>{ if(!drag) return; const el=$('d9Edit'), w=el.offsetWidth, h=el.offsetHeight;
      const x=clamp(ev.clientX-drag.dx,4,innerWidth-w-4), y=clamp(ev.clientY-drag.dy,4,innerHeight-h-4);
      Object.assign(el.style,{left:x+'px',top:y+'px'}); });
    hd.addEventListener('pointerup',ev=>{ drag=null; try{ hd.releasePointerCapture(ev.pointerId); }catch(e){} }); })();

  /* ------------------------------------------------------------------ listas (esquerda) */
  function listas(){ const A=DIR.agenda(), bp=$('d9ListaP'); bp.innerHTML='';
    A.forEach(a=>{ const p=a.p, d=document.createElement('div'); d.className='it'+(sel&&sel.tipo==='p'&&sel.id===p.id?' sel':''); d.dataset.id=p.id;
      const autoCh=a.k>0&&p.chega==null&&a.chega!==null;
      const fica=a.chega===null?'sem horário':(a.sai===null?'fica até o fim':'fica '+num(a.sai-a.chega)+' s');
      d.innerHTML=`<div class="l1"><b>P${a.k}</b><input class="nome" value="${esc(p.nome||'')}" placeholder="${a.k?'nome desta parada…':'entrada'}" ${a.k?'':'disabled'}>
        <button class="sm ir">ir</button>${a.k?'<button class="sm x del">✕</button>':''}</div>
        <div class="l2">${a.k?`chega <input class="ch${autoCh?' auto':''}" value="${p.chega!=null?fmt(p.chega):''}" placeholder="${a.chega!==null?'auto '+fmt(a.chega):'—'}">`:'chega 0:00.0'}
        sai <input class="sa" value="${p.sai!=null?fmt(p.sai):''}" placeholder="${a.chega===null?'—':'fica'}"> <span>${fica}</span>${a.erro?` <span style="color:#ff9db4">⛔ ${a.erro}</span>`:''}</div>`+
        (a.anda?`<div class="anda ${a.anda.st}">↳ anda ${num(a.anda.L)} m em ${num(a.anda.T)} s · <b>${num(a.anda.v)} m/s</b> (pico ${num(a.anda.pico)}) · ${ST[a.anda.st]}${a.anda.auto?' · chegada auto':''}</div>`
        :(a.k<A.length-1&&a.chega!==null?'<div class="l2">↳ ainda sem saída — toque e aperte COMEÇA A ANDAR</div>':''));
      d.onclick=e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='BUTTON') return; sel={tipo:'p',id:p.id}; listas(); };
      d.querySelector('.ir').onclick=()=>{ sel={tipo:'p',id:p.id}; if(a.chega!==null) T.t=a.chega+0.01; listas(); };
      const del=d.querySelector('.del'); if(del) del.onclick=()=>{ sel={tipo:'p',id:p.id}; apagarSel(); };
      const nm=d.querySelector('.nome'); nm.onchange=()=>mudar(()=>{ p.nome=nm.value; });
      const ch=d.querySelector('.ch'); if(ch) ch.onchange=()=>{ const v=parseT(ch.value); if(Number.isNaN(v)){ msg('horário inválido','#ff9db4'); listas(); return; } mudar(()=>{ p.chega=v; },v===null?'P'+a.k+': chegada automática':'P'+a.k+' chega em '+fmt(v)); };
      const sa=d.querySelector('.sa'); sa.onchange=()=>{ const v=parseT(sa.value); if(Number.isNaN(v)){ msg('horário inválido','#ff9db4'); listas(); return; } mudar(()=>{ p.sai=v; },v===null?'P'+a.k+' fica até o fim':'P'+a.k+' sai em '+fmt(v)); };
      bp.appendChild(d); });
    if(A.length<2){ const v=document.createElement('p'); v.className='vazio'; v.innerHTML='Só a entrada. <b>Clique na planta</b> para marcar as paradas, na ordem em que a pessoa vai passar por elas.'; bp.appendChild(v); }
    const bo=$('d9ListaO'); bo.innerHTML=''; const O=[...DIR.olhares].sort((a,b)=>a.de-b.de); $('d9NO').textContent=O.length;
    O.forEach(o=>{ const d=document.createElement('div'); d.className='it ol'+(sel&&sel.tipo==='o'&&sel.id===o.id?' sel':''); d.dataset.id=o.id;
      d.innerHTML=`<div class="l1"><b>◎</b><input class="nome" value="${esc(o.nome||'')}" placeholder="para onde…"><button class="sm ir">ir</button><button class="sm x del">✕</button></div>
        <div class="l2">de <input class="de" value="${fmt(o.de)}"> até <input class="at" value="${o.ate!=null?fmt(o.ate):''}" placeholder="o fim"> <span>${o.tipo==='ponto'&&o.alvo?'alvo '+o.alvo.map(v=>v.toFixed(1)).join(' · '):esc(nomeTipo(o))}</span>${o.modo==='passa'?' <b style="color:#b58cff">· até passar</b>':''}</div>`;
      d.onclick=e=>{ if(e.target.tagName==='INPUT'||e.target.tagName==='BUTTON') return; sel={tipo:'o',id:o.id}; listas(); };
      d.querySelector('.ir').onclick=()=>{ sel={tipo:'o',id:o.id}; T.t=o.de+0.01; listas(); };
      d.querySelector('.del').onclick=()=>{ sel={tipo:'o',id:o.id}; apagarSel(); };
      const nm=d.querySelector('.nome'); nm.onchange=()=>mudar(()=>{ o.nome=nm.value; });
      const de=d.querySelector('.de'); de.onchange=()=>{ const v=parseT(de.value); if(v===null||Number.isNaN(v)){ msg('horário inválido','#ff9db4'); listas(); return; } mudar(()=>{ o.de=v; if(o.ate!=null&&o.ate<=v) o.ate=+(v+1).toFixed(2); }); };
      const at=d.querySelector('.at'); at.onchange=()=>{ const v=parseT(at.value); if(Number.isNaN(v)||(v!==null&&v<=o.de)){ msg('o fim tem de vir depois do começo','#ff9db4'); listas(); return; } mudar(()=>{ o.ate=v; }); };
      bo.appendChild(d); });
    const bc=$('d9ListaC'); bc.innerHTML=''; const CC=[...DIR.cenas].sort((a,b)=>a.de-b.de); $('d9NC').textContent=CC.length;
    CC.forEach(c=>{ const d=document.createElement('div'); d.className='it ce'+(sel&&sel.tipo==='c'&&sel.id===c.id?' sel':''); d.dataset.id=c.id;
      d.innerHTML=`<div class="l1"><b>✎</b><span style="flex:1;font-size:11px;color:#7b83a6">de <input class="de" value="${fmt(c.de)}"> até <input class="at" value="${c.ate!=null?fmt(c.ate):''}" placeholder="o fim"></span><button class="sm ir">ir</button><button class="sm x del">✕</button></div>
        <textarea rows="3" placeholder="o que aparece, onde, como se move… ex.: mostrar o disco na frente, girar 2 vezes, some em 0:12">${esc(c.texto||'')}</textarea>`;
      d.onclick=e=>{ if(/INPUT|BUTTON|TEXTAREA/.test(e.target.tagName)) return; sel={tipo:'c',id:c.id}; listas(); };
      d.querySelector('.ir').onclick=()=>{ sel={tipo:'c',id:c.id}; T.t=c.de+0.01; listas(); };
      d.querySelector('.del').onclick=()=>{ sel={tipo:'c',id:c.id}; apagarSel(); };
      const ta=d.querySelector('textarea'); ta.onchange=()=>mudar(()=>{ c.texto=ta.value; });
      const de=d.querySelector('.de'); de.onchange=()=>{ const v=parseT(de.value); if(v===null||Number.isNaN(v)){ msg('horário inválido','#ff9db4'); listas(); return; } mudar(()=>{ c.de=v; if(c.ate!=null&&c.ate<=v) c.ate=+(v+1).toFixed(2); }); };
      const at=d.querySelector('.at'); at.onchange=()=>{ const v=parseT(at.value); if(Number.isNaN(v)||(v!==null&&v<=c.de)){ msg('o fim tem de vir depois do começo','#ff9db4'); listas(); return; } mudar(()=>{ c.ate=v; }); };
      bc.appendChild(d); });
    if(!CC.length){ const v=document.createElement('p'); v.className='vazio'; v.innerHTML='Nenhuma instrução. No instante certo, aperte <b>N</b> (✎ CENA) e escreva o que deve aparecer — sai no caderno para a trilha M montar.'; bc.appendChild(v); }
    if(!O.length){ const v=document.createElement('p'); v.className='vazio'; v.innerHTML='Sem blocos: a pessoa olha para onde anda. Escolha um <b>alvo</b> e aperte <b>L</b> no instante em que ela deve olhar.'; bo.appendChild(v); } }

  /* ------------------------------------------------------------------ layout */
  const TLH=130, BARH=46; let L={};
  function layout(){ const W=innerWidth, H=innerHeight, base=Math.max(TLH+BARH, $('d9Base').getBoundingClientRect().height)+20;
    const top=$('d9Topo').getBoundingClientRect().bottom+8;
    const ph=Math.max(200,H-base-10-26-10), pw=clamp(Math.round(ph*0.52),200,Math.round(W*0.33));
    const old=L; L={W,H,pw,ph,px:W-10-pw,pyTop:10+26,base}; if(old.keep){ L.keep=true; L.cx=old.cx; L.zc=old.zc; L.hh=old.hh; }
    const pl=$('d9Planta'); Object.assign(pl.style,{top:'10px',width:pw+'px',height:(ph+26)+'px'});
    const cv=$('d9PlCv'), dpr=devicePixelRatio||1; Object.assign(cv.style,{left:L.px+'px',top:L.pyTop+'px',width:pw+'px',height:ph+'px'}); cv.width=Math.round(pw*dpr); cv.height=Math.round(ph*dpr);
    const lado=$('d9Lado'); Object.assign(lado.style,{top:Math.max(80,top)+'px',bottom:(base)+'px'});
    $('d9Topo').style.maxWidth=(W-pw-40)+'px';
    /* a planta 3D: câmera de cima, a entrada embaixo e a rotunda em cima; cobre a nave inteira e a rotunda */
    const a=pw/ph, x0=-11.6, x1=11.6, z0=4.2, z1=GEO.rot.z-GEO.rot.R-0.6, zc=(z0+z1)/2; let hh=(z0-z1)/2, hw=hh*a; if(hw<(x1-x0)/2){ hw=(x1-x0)/2; hh=hw/a; }
    L.a=a; L.hh0=hh; L.zc0=zc; if(!L.hh||!L.keep){ L.hh=hh; L.zc=zc; L.cx=0; } L.hw=L.hh*a; aplicarCam();
    PLANTA.rect=()=>({x:L.px, y:H-L.pyTop-ph, w:pw, h:ph}); PLANTA.on=true;
    const tl=$('d9Tl'); tl.width=Math.round(tl.clientWidth*dpr); tl.height=Math.round(TLH*dpr);
    listas(); }
  /* a câmera da planta: zoom na roda (em torno do mouse), arrastar com o botão direito desloca, "ver tudo" volta */
  function aplicarCam(){ L.hw=L.hh*L.a; Object.assign(plantaCam,{left:-L.hw,right:L.hw,top:L.hh,bottom:-L.hh}); plantaCam.up.set(0,0,-1);
    plantaCam.position.set(L.cx,40,L.zc); plantaCam.lookAt(L.cx,0,L.zc); plantaCam.updateProjectionMatrix(); }
  const W2S=(x,z)=>[ ((x-L.cx)/L.hw+1)/2*L.pw, (1+(z-L.zc)/L.hh)/2*L.ph ];
  const S2W=(px,py)=>[ L.cx+(px/L.pw*2-1)*L.hw, L.zc+(py/L.ph*2-1)*L.hh ];

  /* ------------------------------------------------------------------ planta: desenho + clique/arraste */
  const pcv=$('d9PlCv'), pg=pcv.getContext('2d');
  function seta(g,x0,y0,x1,y1,cor){ const a=Math.atan2(y1-y0,x1-x0), mx=(x0+x1)/2, my=(y0+y1)/2; g.fillStyle=cor; g.beginPath();
    g.moveTo(mx+7*Math.cos(a),my+7*Math.sin(a)); g.lineTo(mx-5*Math.cos(a)+5*Math.sin(a),my-5*Math.sin(a)-5*Math.cos(a)); g.lineTo(mx-5*Math.cos(a)-5*Math.sin(a),my-5*Math.sin(a)+5*Math.cos(a)); g.fill(); }
  function rotulo(g,txt,x,y,cor){ g.font='600 10.5px ui-monospace,monospace'; const w=g.measureText(txt).width+8; g.fillStyle='rgba(10,13,26,.82)'; g.fillRect(x-w/2,y-8,w,15); g.fillStyle=cor; g.textAlign='center'; g.fillText(txt,x,y+3); }
  function desenhaPlanta(){ const dpr=devicePixelRatio||1; pg.setTransform(dpr,0,0,dpr,0,0); pg.clearRect(0,0,L.pw,L.ph);
    const A=DIR.agenda(), t=T.t;
    for(let k=0;k<A.length-1;k++){ const a=A[k], b=A[k+1], [x0,y0]=W2S(a.x,a.z), [x1,y1]=W2S(b.x,b.z), w=a.anda;
      pg.lineWidth=w?3:2; pg.setLineDash(w?[]:[6,5]); const cor=w?COR[w.st]:COR.sem; pg.strokeStyle=cor; pg.beginPath(); pg.moveTo(x0,y0); pg.lineTo(x1,y1); pg.stroke(); pg.setLineDash([]);
      if(Math.hypot(x1-x0,y1-y0)>24) seta(pg,x0,y0,x1,y1,cor);
      if(w) rotulo(pg,num(w.L)+' m · '+num(w.v)+' m/s',(x0+x1)/2+0,(y0+y1)/2-12,cor); }
    const on=DIR.olhares.filter(o=>t>=o.de&&(o.ate==null||t<o.ate));
    DIR.olhares.filter(o=>o.tipo==='ponto'&&o.alvo).forEach(o=>{ const [x,y]=W2S(o.alvo[0],o.alvo[2]); pg.strokeStyle=COR.olhar; pg.globalAlpha=on.includes(o)?1:0.45; pg.lineWidth=1.6;
      pg.beginPath(); pg.arc(x,y,5,0,7); pg.moveTo(x-9,y); pg.lineTo(x+9,y); pg.moveTo(x,y-9); pg.lineTo(x,y+9); pg.stroke(); pg.globalAlpha=1; });
    A.forEach(a=>{ const [x,y]=W2S(a.x,a.z), s=sel&&sel.tipo==='p'&&sel.id===a.p.id;
      pg.fillStyle=a.chega===null?COR.sem:COR.fica; pg.beginPath(); if(a.k===0) pg.rect(x-9,y-9,18,18); else pg.arc(x,y,10,0,7); pg.fill();
      if(s){ pg.strokeStyle='#fff'; pg.lineWidth=2.5; pg.stroke(); }
      pg.fillStyle='#0a0d1a'; pg.font='700 10px ui-monospace,monospace'; pg.textAlign='center'; pg.fillText('P'+a.k,x,y+3.5);
      const tx=a.chega===null?'sem horário':(a.k?fmt(a.chega):'0:00')+(a.sai!=null?'–'+fmt(a.sai):'→');
      rotulo(pg,tx,x,y+21,a.chega===null?COR.sem:'#e8ecf6'); });
    /* a pessoa agora: ponto + para onde olha */
    const [px,py]=W2S(POSE.pos.x,POSE.pos.z), [lx,ly]=W2S(POSE.look.x,POSE.look.z), d=Math.hypot(lx-px,ly-py)||1;
    pg.strokeStyle=on.length?COR.olhar:'#ffffff'; pg.lineWidth=2; pg.beginPath(); pg.moveTo(px,py); pg.lineTo(px+(lx-px)/d*26,py+(ly-py)/d*26); pg.stroke();
    if(on.length&&on[0].tipo==="ponto"&&on[0].alvo){ const [ax,ay]=W2S(on[0].alvo[0],on[0].alvo[2]); pg.setLineDash([3,4]); pg.beginPath(); pg.moveTo(px,py); pg.lineTo(ax,ay); pg.stroke(); pg.setLineDash([]); }
    pg.fillStyle='#fff'; pg.beginPath(); pg.arc(px,py,5,0,7); pg.fill(); pg.strokeStyle='#ff4d6d'; pg.lineWidth=2; pg.stroke();
    if(fly.on){ const [fx,fy]=W2S(fly.pos.x,fly.pos.z); pg.fillStyle='#b58cff'; pg.beginPath(); pg.arc(fx,fy,4,0,7); pg.fill(); rotulo(pg,'você voando',fx,fy-12,'#d9c6ff'); } }
  let plDrag=null, plPan=null;
  pcv.addEventListener('contextmenu',ev=>ev.preventDefault());
  pcv.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=pcv.getBoundingClientRect(), [wx,wz]=S2W(ev.clientX-r.left,ev.clientY-r.top);
    const f=ev.deltaY>0?1.2:1/1.2, nh=clamp(L.hh*f,2.5,L.hh0*1.4); const k=nh/L.hh; L.cx=wx+(L.cx-wx)*k; L.zc=wz+(L.zc-wz)*k; L.hh=nh; L.keep=true; aplicarCam(); },{passive:false});
  pcv.addEventListener('pointerdown',ev=>{ const r=pcv.getBoundingClientRect(), mx=ev.clientX-r.left, my=ev.clientY-r.top; ev.preventDefault(); ev.stopPropagation();
    if(ev.button===2||ev.button===1){ plPan={x:ev.clientX,y:ev.clientY,cx:L.cx,zc:L.zc}; pcv.setPointerCapture(ev.pointerId); return; }
    const A=DIR.agenda(); let hit=null, best=14; A.forEach(a=>{ const [x,y]=W2S(a.x,a.z), dd=Math.hypot(x-mx,y-my); if(dd<best){ best=dd; hit=a; } });
    const [wx,wz]=S2W(mx,my);
    if(plModo==='alvo'){ const naMesa=Math.abs(wx)<GEO.mesa.w/2+0.2&&wz<GEO.mesa.z0+0.2&&wz>GEO.mesa.z1-0.2;
      const alvo=[+wx.toFixed(2),+(naMesa?GEO.mesa.h+0.1:1.4).toFixed(2),+wz.toFixed(2)]; plModo='parada'; marcaAlvos();
      const o=sel&&sel.tipo==='o'&&achar(sel); if(o&&!ev.altKey){ mudar(()=>{ o.tipo='ponto'; o.alvo=alvo; o.nome=o.nome||'ponto na planta'; },'alvo do olhar selecionado mudou'); return; }
      olha(alvo,'ponto na planta'); return; }
    if(hit){ sel={tipo:'p',id:hit.p.id}; listas(); if(hit.k>0){ snap(); plDrag={p:hit.p,moveu:false}; pcv.setPointerCapture(ev.pointerId); } return; }
    mudar(()=>{ const p={id:DIR.id(),x:+wx.toFixed(3),z:+wz.toFixed(3),chega:null,sai:null,nome:''}; DIR.paradas.push(p); sel={tipo:'p',id:p.id}; },
      'P'+DIR.paradas.length+' marcada — toque a peça e aperte COMEÇA A ANDAR na parada anterior'); });
  pcv.addEventListener('pointermove',ev=>{ if(plPan){ L.cx=plPan.cx-(ev.clientX-plPan.x)/L.pw*2*L.hw; L.zc=plPan.zc-(ev.clientY-plPan.y)/L.ph*2*L.hh; L.keep=true; aplicarCam(); return; }
    if(!plDrag) return; const r=pcv.getBoundingClientRect(); const [wx,wz]=S2W(ev.clientX-r.left,ev.clientY-r.top);
    plDrag.p.x=+wx.toFixed(3); plDrag.p.z=+wz.toFixed(3); plDrag.moveu=true; });
  pcv.addEventListener('pointerup',()=>{ if(plPan){ plPan=null; return; } if(!plDrag) return; if(plDrag.moveu){ DIR.salvar(); listas(); msg('P'+idxP(plDrag.p.id)+' mudou de lugar'); } else U.pop(); plDrag=null; });

  /* ------------------------------------------------------------------ linha do tempo */
  const tcv=$('d9Tl'), tg=tcv.getContext('2d');
  let v0=0, v1=TOTAL; const ROW={regua:[0,16],voz:[18,38],lugar:[41,73],olhar:[76,98],cena:[101,127]};
  const t2x=t=>(t-v0)/(v1-v0)*tcv.clientWidth, x2t=x=>v0+x/tcv.clientWidth*(v1-v0);
  function bloco(g,t0,t1,y0,y1,cor,txt,opt={}){ const x0=t2x(t0), x1=t2x(t1); if(x1<0||x0>tcv.clientWidth) return; const w=Math.max(1,x1-x0);
    g.globalAlpha=opt.alfa??0.85; g.fillStyle=cor; g.fillRect(x0,y0,w,y1-y0); g.globalAlpha=1;
    if(opt.listra){ g.save(); g.beginPath(); g.rect(x0,y0,w,y1-y0); g.clip(); g.strokeStyle='rgba(10,13,26,.35)'; g.lineWidth=3; for(let x=x0-40;x<x1+40;x+=9){ g.beginPath(); g.moveTo(x,y1); g.lineTo(x+14,y0); g.stroke(); } g.restore(); }
    if(opt.sel){ g.strokeStyle='#fff'; g.lineWidth=2; g.strokeRect(x0+1,y0+1,w-2,y1-y0-2); }
    if(txt&&w>28){ g.save(); g.beginPath(); g.rect(x0+3,y0,w-6,y1-y0); g.clip(); g.fillStyle=opt.tc||'#0a0d1a'; g.font=(opt.f||'600 10.5px ui-monospace,monospace'); g.textAlign='left'; g.fillText(txt,x0+5,(y0+y1)/2+4); g.restore(); } }
  function desenhaTl(){ const dpr=devicePixelRatio||1, W=tcv.clientWidth; if(tcv.width!==Math.round(W*dpr)){ tcv.width=Math.round(W*dpr); tcv.height=Math.round(TLH*dpr); }
    const g=tg; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,TLH); g.fillStyle='rgba(255,255,255,.035)';
    for(const k of ['voz','lugar','olhar','cena']) g.fillRect(0,ROW[k][0],W,ROW[k][1]-ROW[k][0]);
    /* régua + blocos do roteiro */
    const step=(v1-v0)>120?10:(v1-v0)>40?5:(v1-v0)>12?1:0.5; g.fillStyle='#7b83a6'; g.font='10px ui-monospace,monospace'; g.textAlign='left';
    for(let s=Math.ceil(v0/step)*step;s<=v1;s+=step){ const x=t2x(s); g.fillRect(x,12,1,4); if((s/step)%2===0||step>=5) g.fillText(fmt(s).replace('.0',''),x+2,10); }
    B.forEach(b=>{ const x=t2x(b.t0); if(x<0||x>W) return; g.fillStyle='rgba(255,200,75,.5)'; g.fillRect(x,0,1,TLH); g.fillStyle='#ffc84b'; g.fillText(b.id,x+3,ROW.voz[1]+0); });
    /* VOZ */
    REV.segs.forEach(s=>bloco(g,s.r0,s.r1,ROW.voz[0]+2,ROW.voz[1]-2,COR.voz,s.txt,{alfa:.7,tc:'#e8ecf6',f:'10.5px system-ui,sans-serif'}));
    /* LUGAR */
    const A=DIR.agenda();
    A.forEach(a=>{ if(a.chega===null) return; const s=sel&&sel.tipo==='p'&&sel.id===a.p.id;
      bloco(g,a.chega,a.sai===null?TOTAL:a.sai,ROW.lugar[0]+2,ROW.lugar[1]-2,COR.fica,'P'+a.k+(a.p.nome?' · '+a.p.nome:'')+' · fica',{sel:s,alfa:a.sai===null?0.45:0.85});
      if(a.anda){ const w=a.anda, sd=sel&&sel.tipo==='p'&&A[a.k+1]&&sel.id===A[a.k+1].p.id;
        bloco(g,w.de,w.ate,ROW.lugar[0]+2,ROW.lugar[1]-2,COR[w.st],'→P'+(a.k+1)+' · '+num(w.L)+' m · '+num(w.v)+' m/s',{listra:true,sel:sd}); } });
    /* OLHAR */
    /* CENA: empilha blocos que se sobrepõem em duas meias-faixas */
    { const C_=[...DIR.cenas].sort((a,b)=>a.de-b.de), fim=[]; C_.forEach(c=>{ let lane=fim.findIndex(e=>e<=c.de); if(lane<0){ lane=fim.length; fim.push(0); } fim[lane]=c.ate??TOTAL;
        const n=Math.min(2,Math.max(1,fim.length)), h=(ROW.cena[1]-ROW.cena[0]-4)/2, y0=ROW.cena[0]+2+Math.min(lane,1)*h;
        bloco(g,c.de,c.ate??TOTAL,y0,y0+h-1,COR.cena,'✎ '+(c.texto||'(escreva o que mostrar)'),{sel:sel&&sel.tipo==='c'&&sel.id===c.id,f:'600 10px system-ui,sans-serif'}); }); }
    [...DIR.olhares].sort((a,b)=>a.de-b.de).forEach(o=>{ const cor={anda:'#6b7390',horizonte:'#5aa9ff',mesa:'#c9a36b'}[o.tipo]||COR.olhar, ic={anda:'→',horizonte:'═',mesa:'▭'}[o.tipo]||'◎';
      bloco(g,o.de,o.ate==null?TOTAL:o.ate,ROW.olhar[0]+2,ROW.olhar[1]-2,cor,ic+' '+nomeTipo(o)+(o.modo==='passa'?' · até passar':''),{sel:sel&&sel.tipo==='o'&&sel.id===o.id,alfa:0.85}); });
    /* nomes das faixas */
    g.font='700 9.5px system-ui,sans-serif'; g.textAlign='left';
    for(const [k,n] of [['voz','VOZ'],['lugar','LUGAR'],['olhar','OLHAR'],['cena','CENA']]){ g.fillStyle='rgba(10,13,26,.85)'; g.fillRect(0,ROW[k][0],44,14); g.fillStyle='#c2c9e6'; g.fillText(n,4,ROW[k][0]+10); }
    /* alça sob o mouse */
    if(hov){ g.fillStyle='#fff'; g.fillRect(t2x(hov.t)-1.5,ROW[hov.row][0],3,ROW[hov.row][1]-ROW[hov.row][0]); }
    /* cursor */
    const cx=t2x(T.t); g.fillStyle='#ff4d6d'; g.fillRect(cx-1,0,2,TLH); }
  /* o que está sob o mouse: alças (bordas arrastáveis) e corpos */
  function alcas(){ const H=[], A=DIR.agenda();
    A.forEach(a=>{ if(a.chega===null) return;
      if(a.sai!==null) H.push({row:'lugar',t:a.sai,kind:'sai',p:a.p});
      if(a.anda) H.push({row:'lugar',t:a.anda.ate,kind:'chega',p:A[a.k+1].p}); });
    [...DIR.olhares].sort((a,b)=>a.de-b.de).forEach((o,i)=>{ if(i>0) H.push({row:'olhar',t:o.de,kind:'divisa',o}); });
    DIR.cenas.forEach(o=>{ H.push({row:'cena',t:o.de,kind:'de',o}); if(o.ate!=null) H.push({row:'cena',t:o.ate,kind:'ate',o}); });
    return H; }
  const rowAt=y=>Object.keys(ROW).find(k=>y>=ROW[k][0]&&y<ROW[k][1])||null;
  function alcaEm(x,y){ const r=rowAt(y); if(r!=='lugar'&&r!=='olhar'&&r!=='cena') return null; let best=null, bd=6; alcas().forEach(h=>{ if(h.row!==r) return; const d=Math.abs(t2x(h.t)-x); if(d<bd){ bd=d; best=h; } }); return best; }
  let hov=null, tlDrag=null;
  tcv.addEventListener('pointermove',ev=>{ const r=tcv.getBoundingClientRect(), x=ev.clientX-r.left, y=ev.clientY-r.top;
    if(!tlDrag){ hov=alcaEm(x,y); tcv.style.cursor=hov?'ew-resize':'pointer'; return; }
    const t=+clamp(x2t(x),0,TOTAL-0.01).toFixed(2);
    if(tlDrag.kind==='seek'){ T.t=t; return; }
    if(!tlDrag.moveu&&Math.abs(x-tlDrag.x0)<4) return;   /* D-339: um clique para ir a um instante NÃO arrasta borda nenhuma (antes 1 px mudava a chegada) */
    tlDrag.moveu=true;
    if(tlDrag.kind==='sai'){ const a=DIR.agenda()[idxP(tlDrag.p.id)]; tlDrag.p.sai=Math.max(t,a.chega??0); }
    else if(tlDrag.kind==='chega'){ const A=DIR.agenda(), k=idxP(tlDrag.p.id), q=A[k-1], L_=Math.hypot(tlDrag.p.x-q.x,tlDrag.p.z-q.z);
      const tmin=q.sai+L_/(CFG.vmax*(1-CFG.travelRamp));  /* D-339: arrastando, a chegada para no limite do vermelho */
      tlDrag.p.chega=+Math.max(t,tmin).toFixed(2); }
    else if(tlDrag.kind==='de'){ tlDrag.o.de=Math.min(t,(tlDrag.o.ate??TOTAL)-0.2); }
    else if(tlDrag.kind==='divisa'){ const O=[...DIR.olhares].sort((a,b)=>a.de-b.de), i=O.indexOf(tlDrag.o), pv=O[i-1], nx=O[i+1];
      tlDrag.o.de=+clamp(t,(pv?pv.de:0)+0.2,(nx?nx.de:TOTAL)-0.2).toFixed(2); if(pv) pv.ate=tlDrag.o.de; }
    else if(tlDrag.kind==='ate'){ tlDrag.o.ate=Math.max(t,tlDrag.o.de+0.2); }
    else if(tlDrag.kind==='move'){ const d=t-tlDrag.t0; tlDrag.o.de=+clamp(tlDrag.de0+d,0,TOTAL-0.2).toFixed(2); if(tlDrag.ate0!=null) tlDrag.o.ate=+(tlDrag.o.de+(tlDrag.ate0-tlDrag.de0)).toFixed(2); }
    T.t=t; });
  tcv.addEventListener('pointerdown',ev=>{ const r=tcv.getBoundingClientRect(), x=ev.clientX-r.left, y=ev.clientY-r.top, t=clamp(x2t(x),0,TOTAL-0.01), row=rowAt(y);
    tcv.setPointerCapture(ev.pointerId); const h=alcaEm(x,y);
    if(h){ snap(); tlDrag={...h,moveu:false,x0:x}; if(h.p) sel={tipo:'p',id:h.p.id}; if(h.o) sel={tipo:h.row==='cena'?'c':'o',id:h.o.id}; listas(); return; }
    if(row==='olhar'||row==='cena'){ const L_=row==='olhar'?DIR.olhares:DIR.cenas; const o=[...L_].reverse().find(o=>t>=o.de&&t<(o.ate??TOTAL));
      if(o&&row==='olhar'){ sel={tipo:'o',id:o.id}; listas(); }
      else if(o){ snap(); sel={tipo:'c',id:o.id}; tlDrag={kind:'move',o,t0:t,de0:o.de,ate0:o.ate,moveu:false,x0:x}; listas(); return; } }
    if(row==='lugar'){ const A=DIR.agenda(); for(const a of A){ if(a.chega===null) continue;
        if(t>=a.chega&&t<(a.sai??TOTAL)){ sel={tipo:'p',id:a.p.id}; break; }
        if(a.anda&&t>=a.anda.de&&t<a.anda.ate){ sel={tipo:'p',id:A[a.k+1].p.id}; break; } } listas(); }
    T.t=t; tlDrag={kind:'seek',moveu:false}; });
  tcv.addEventListener('pointerup',()=>{ if(!tlDrag) return; if(tlDrag.kind!=='seek'){ if(tlDrag.moveu){ DIR.salvar(); listas(); } else U.pop(); } tlDrag=null; });
  tcv.addEventListener('dblclick',ev=>{ const r=tcv.getBoundingClientRect(), x=ev.clientX-r.left, y=ev.clientY-r.top, h=alcaEm(x,y); dblT=clamp(x2t(x),0,TOTAL-0.01); dblAnda=null;
    if(h&&h.kind==='chega'&&h.p.chega!=null){ mudar(()=>{ h.p.chega=null; },'chegada volta ao automático ('+num(DIR.VPADRAO)+' m/s)'); return; }
    /* D-350: duplo clique no CORPO de um bloco (não numa alça) abre o popup de edição — mesma lógica de "quem está
       nesta linha, neste instante" já usada no pointerdown (linha 411 acima) para selecionar ao clicar. */
    const t=clamp(x2t(x),0,TOTAL-0.01), row=rowAt(y);
    if(row==='olhar'||row==='cena'){ const L_=row==='olhar'?DIR.olhares:DIR.cenas; const o=[...L_].reverse().find(o=>t>=o.de&&t<(o.ate??TOTAL));
      if(o){ abrirEdit(row==='olhar'?'o':'c',o.id,ev.clientX,ev.clientY); return; }
      if(row==='olhar'){ abrirNovoOlhar(+t.toFixed(2),ev.clientX,ev.clientY); return; } }
    if(row==='lugar'){ const A=DIR.agenda(); for(const a of A){ if(a.chega===null) continue;
        if(t>=a.chega&&t<(a.sai??TOTAL)){ abrirEdit('p',a.p.id,ev.clientX,ev.clientY); return; }
        if(a.anda&&t>=a.anda.de&&t<a.anda.ate){ dblAnda=true; abrirEdit('p',A[a.k+1].p.id,ev.clientX,ev.clientY); return; } } } });
  tcv.addEventListener('wheel',ev=>{ ev.preventDefault(); const r=tcv.getBoundingClientRect(), tm=x2t(ev.clientX-r.left), span=v1-v0;
    if(ev.shiftKey){ const d=span*0.1*Math.sign(ev.deltaY||ev.deltaX); v0=clamp(v0+d,0,TOTAL-span); v1=v0+span; return; }
    const ns=clamp(span*(ev.deltaY>0?1.25:0.8),6,TOTAL), u=(tm-v0)/span; v0=clamp(tm-u*ns,0,TOTAL-ns); v1=v0+ns; },{passive:false});

  /* ------------------------------------------------------------------ topo: tempo, bloco, onde, voz com palavras clicáveis */
  const vozEl=$('d9Voz'); let lastSeg=-2, lastW=-2;
  vozEl.addEventListener('click',ev=>{ const sp=ev.target.closest('span[data-i]'); if(!sp) return; const sg=REV.segs[+vozEl.dataset.seg]; if(sg) T.t=wordTime(sg,+sp.dataset.i); });
  function topo(t){ $('d9T').firstChild.nodeValue=fmt(t); const b=blockAt(t); $('d9B').textContent=b.id+' · '+b.name;
    const r=DIR.onde(t), A=DIR.agenda(); $('d9Onde').textContent=r.anda? 'andando P'+r.k+' → P'+(r.k+1)+' ('+num(A[r.k].anda.v)+' m/s)' : 'parada P'+r.k+(A[r.k].sai!=null?' até '+fmt(A[r.k].sai):' (sem saída marcada)');
    const k=revSegAt(t), sg=REV.segs[k], wi=sg?revWord(sg,t):-1;
    if(k!==lastSeg){ lastSeg=k; vozEl.dataset.seg=k; vozEl.innerHTML=sg? '“'+sg.txt.split(/\s+/).map((w,i)=>'<span data-i="'+i+'">'+esc(w)+'</span>').join(' ')+'”' : ''; lastW=-2; }
    if(wi!==lastW){ lastW=wi; vozEl.querySelectorAll('span').forEach((s,i)=>s.classList.toggle('on',i===wi)); }
    $('d9Play').textContent=T.playing?'❚❚':'▶';
    const oc=r.anda?null:A[r.k].p.id; document.querySelectorAll('#d9ListaP .it').forEach(d=>d.classList.toggle('agora',d.dataset.id===oc));
    if(msgT&&performance.now()-msgT>7000){ $('d9Msg').textContent=''; msgT=0; } }

  /* ------------------------------------------------------------------ teclado */
  /* D-367: com a caixa aberta, Enter salva e Esc cancela (Enter dentro do texto da CENA continua quebrando linha) */
  addEventListener('keydown',e=>{ if(!$('d9Edit').classList.contains('on')) return;
    if(e.key==='Escape'){ fecharEdit(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if(e.key==='Enter'&&!/textarea/i.test(e.target.tagName)&&!/button/i.test(e.target.tagName)){ $('d9EditSalvar').click(); e.preventDefault(); e.stopImmediatePropagation(); } },true);
  addEventListener('keydown',e=>{ if(/input|textarea/i.test(e.target.tagName)) return; const k=e.key;
    if(k==='?'){ $('d9Help').classList.toggle('on'); e.preventDefault(); return; }
    if(k==='Escape'){ $('d9Help').classList.remove('on'); $('d9Gbl2').classList.remove('on'); if(plModo==='alvo'){ plModo='parada'; marcaAlvos(); } return; }
    if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='z'){ desfazer(); e.preventDefault(); return; }
    if(k.toLowerCase()==='l'){ olha(); e.preventDefault(); return; }
    if(fly.on) return;                                   // voando, o resto das teclas é do voo
    if(k==='Enter'){ comecaAndar(); e.preventDefault(); return; }
    if(k.toLowerCase()==='c'){ chegaAqui(); e.preventDefault(); return; }
    if(k.toLowerCase()==='k'){ solta(); e.preventDefault(); return; }
    if(k.toLowerCase()==='n'){ cena(); e.preventDefault(); return; }
    if(k==='Delete'||k==='Backspace'){ apagarSel(); e.preventDefault(); return; }
    if(k==='ArrowLeft'||k==='ArrowRight'){ const d=k==='ArrowLeft'?-1:1;
      if(e.altKey){ const L_=REV.segs.map(s=>s.r0), t=T.t; const n=d>0?L_.find(x=>x>t+0.05):[...L_].reverse().find(x=>x<t-0.05); if(n!==undefined) T.t=n; }
      else T.t=T.t+d*(e.shiftKey?1:0.1); e.preventDefault(); } });
  addEventListener('resize',layout);

  /* ------------------------------------------------------------------ por quadro */
  let acc=0;
  C.setTick((t,dt)=>{ acc+=dt||0.016; if(acc<0.033) return; acc=0;
    if(T.playing&&(t<v0||t>v1)){ const span=v1-v0; v0=clamp(t-span*0.1,0,TOTAL-span); v1=v0+span; }
    if(mira&&!fly.on){ mira=null; msg('mira cancelada'); }
    topo(t); desenhaTl(); desenhaPlanta(); });
  layout(); marcaAlvos();
  msg(DIR.paradas.length<2?'comece marcando as paradas na planta (clique no chão) · ? = ajuda':'? = ajuda');
  window.HYDRA_EST9={desenhaTl,desenhaPlanta,listas,layout,comecaAndar,chegaAqui,olha,solta,escolherAlvo,W2S,S2W,get L(){return L;}};
}
