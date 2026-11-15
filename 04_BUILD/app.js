/* ============================================================================
   HYDRA — build v6.1 · roteiro v16 (D-109) · voz nova (03_MIDIA/audio/nova_locucao) · modo revisão · trilha M (montagem)
   A CENA vem do módulo da trilha A: 04_BUILD/cenario/cenario.js (GEO, PARADAS, EST, construirCenario).
   Este arquivo não constrói arquitetura: decide QUANDO a câmera chega a cada parada e O QUE aparece (PROTOCOLO §2).
   D-305: o espectador ANDA ao lado da mesa e PARA para olhar/ler · nada voa até o rosto · sem piscadas · D-308: sem legenda (?legenda só p/ trabalho).
   Tempo: todo tempo escrito é o do E2 v16; ts() o converte para a voz gravada (§2, mapa por trechos ancorado nos arquivos).
   O silêncio 1:45.0–1:51.0 contém a caminhada até a rotunda e é esticado até ela caber (E2 v16 §2; §1 T_WALK_ROT).
   DADO (muda com o roteiro): §2 CLIPS/B[] · §7 TELAs/keyframes/TPOSE/HEADS · §9 STOPS · marcas T_* no início da §13.
   MÁQUINA (não muda com o roteiro): transporte + voz, pose, loader model(), classe Tesseract, rosa, grade ISO (desligada).
   ========================================================================= */
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GEO, PARADAS, EST, PECAS, construirCenario } from './cenario/cenario.js';

const DEG=Math.PI/180, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const trap=(w,r)=>{ w=clamp(w,0,1); const k=1/(1-r); if(w<r) return k*w*w/(2*r); if(w>1-r){const u=1-w; return 1-k*u*u/(2*r);} return k*(w-r/2); };   // rampa · constante · rampa
const alerp=(a,b,t)=>{const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t;};
const tsE2=s=>{ const m=/^(\d+):(\d+(?:\.\d+)?)$/.exec(s); return m? (+m[1])*60+(+m[2]) : +s; };   // "1:43.6" → 103.6 (tempo do E2; o tempo REAL é ts(), §2)
const $=id=>document.getElementById(id);
/* D-209: galeria clara, pigmento sobre papel — tinta #003D7C, teal #178C8C, laranja #EF7C00 só como acento */
const PAL={gold:'#EF7C00',teal:'#178C8C',pink:'#b0417a',blue:'#003D7C',purple:'#6d3fc0',green:'#1b7f47',red:'#c0392b',txt:'#003D7C',faint:'#6b7a8c',ink:'#003D7C'};
function fail(m){const e=$('err');e.style.display='block';e.textContent+=(e.textContent?'\n':'')+m;console.error(m);}
const boot=(m)=>{$('boot').textContent=m;};


/* =========================  1. PARADAS (do módulo da arquitetura)  ======== */
const QS=new URLSearchParams(location.search);
const CFG={
  eyeY:GEO.eye,
  focus:[0,-0.22,1.35],                   // FOCO no referencial da câmera: [direita, cima, frente] (m)
  GBL:'../GBL/',                          // pasta dos modelos (05_ENTREGA: copiar GBL/ para dentro e trocar para './GBL/')
  tess:{half:1.6,persp:3.2,sub:12,restScale:0.3,tableScale:0.4,aheadScale:0.45,spin:0.5},
  travelRamp:0.22, yawRate:28, vmax:1.5,  // caminhada: rampa · teto de giro (°/s) · pico acima de vmax só AVISA no console (D-305: sem piscada)
  vwalk:+(QS.get('vwalk')||1.45),         // pico usado para DIMENSIONAR a caminhada do silêncio (monólito → rotunda); se ela passa de 6,0 s, o silêncio estica (E2 v16 §2). ?vwalk=1.3 para testar
  lite:QS.has('lite'),                    // ?lite = sem sombras (só para verificação rápida)
  legenda:QS.has('legenda'),              // ?legenda = mostra o texto da voz (modo de trabalho; a peça não tem legenda — D-308)
  mudo:QS.has('mudo'),                    // ?mudo = sem voz e sem o botão de som (verificação)
  revisao:QS.has('revisao'),              // ?revisao = caixa lateral para dirigir a peça (§14)
  estudio:QS.has('estudio'),                 // ?estudio = mesa de direção (D-325)
  telas:QS.get('telas')||'',                 // ?telas=1 liga todas · ?telas=0,4 liga só essas (D-323)
  trecho:QS.get('trecho')||'',            // ?trecho=eluato = roda só 0:10–0:18.6 em laço (estudo de um trecho, D-322)
  quadro:QS.get('quadro')||'full',        // ?quadro=full|key|off — quanto texto a TELA de B1-2 mostra (D-322)
  vrVignette:true, open:true
};
const REVW=CFG.revisao?400:0, viewW=()=>Math.max(320,innerWidth-REVW);   // no modo revisão a cena ocupa a largura menos a caixa lateral
const NAVE=PARADAS.nave, ROT=PARADAS.rotunda;          // [olho x, olho z, alvo x, alvo z, alvo y]
const P_B0=NAVE[0], P_B6=ROT[0], P_B67=ROT[1];         // o percurso inteiro está na §9 (STOPS)
const eyeOf=P=>new THREE.Vector3(P[0],GEO.eye,P[1]), tgtOf=P=>new THREE.Vector3(P[2],P[4],P[3]);
/* ponto a `dist` metros à frente de quem está na parada P (direção horizontal do olhar), `dx` à direita, altura y */
function ahead(P,dist,y,dx=0){ const e=eyeOf(P), t=tgtOf(P); const d=new THREE.Vector3(t.x-e.x,0,t.z-e.z); if(d.lengthSq()<1e-9) d.set(0,0,-1); d.normalize(); return [e.x+d.x*dist-d.z*dx, y, e.z+d.z*dist+d.x*dx]; }
/* paradas LOCAIS da M (não estão no módulo da A — Q-312) e a perna do silêncio, medida aqui porque a §2 precisa dela para esticar o silêncio */
const MAQ_Z=(EST[5]+EST[6])/2;                                          // a maquete fica sobre a mesa, entre as peças f e g
const P_PNL=NAVE[10];                                                    // diante do monólito (D-222: a 3,5 m — o painel inteiro no quadro; Q-312 fechada)
/* B0 local (D-319, pedido do Vinicius no registro P01 de 18/09 — opção C das capturas M07_B0): a entrada anda 1,36 m
   à frente (z 1,5 -> 0,14) e a mira sobe 3,5° (alvo de 1,20 para 1,83 m no centro da mesa). O passo à frente sozinho
   encostava o topo da TELA de entrada na borda do quadro; a mira levantada recompõe e abre a abóbada.
   EXCEÇÃO LOCAL, contra a D-315 — pedido aberto para a A mover `nave[0]`. Perna 1: 4,74 -> 3,62 m, pico 1,21 -> 0,92. */
const P_B0C=[0, 0.14, 0, (GEO.mesa.z0+GEO.mesa.z1)/2, 1.83];
const P_MAQ=NAVE[7];                                                     // a parada da peça f: a maquete fica logo à frente, entre f e g; as placas g·h adiante (D-222: sem parada local)
const VIA_ROT=[];                                                        // D-221: o monólito dissolve — a perna até a rotunda é RETA
const pathLen=pts=>{ let L=0; for(let k=0;k<pts.length-1;k++) L+=Math.hypot(pts[k+1][0]-pts[k][0],pts[k+1][1]-pts[k][1]); return L; };
const L_ROT=pathLen([[P_PNL[0],P_PNL[1]],...VIA_ROT,[P_B67[0],P_B67[1]]]);
const T_WALK_ROT=L_ROT/(CFG.vwalk*(1-CFG.travelRamp));                  // segundos da caminhada painel → rotunda (rampa · constante · rampa)

/* =========================  2. ROTEIRO v16 (D-109) e LOCUÇÃO REAL  ======= */
/* Todo tempo escrito neste arquivo é o do E2 v16 (121 p/min). A função ts() converte para o tempo REAL da voz gravada (D-310):
   um mapa linear por trechos, ancorado no início de cada frase medida nos 17 arquivos de 03_MIDIA/audio/nova_locucao/
   (word timings do reconhecimento de fala + silencedetect −40 dB/0,3 s). Se a voz for regravada, só a tabela CLIPS muda.
   O silêncio 1:45.0–1:51.0 CONTÉM a caminhada até a rotunda (E2 v16 §2): se ela precisa de mais que 6 s, N6 é ancorado ao fim
   dela e tudo depois desloca junto — é o campo `apos` de N6, aplicado ao montar a linha do tempo. */
CFG.AUDIO='../03_MIDIA/audio/nova_locucao/';
const PAUSA_PECA=0.35;    // entre pedaços de um mesmo clipe (a locução saiu em 17 pedaços de uma a duas frases)
/* marks: [tempo E2 do início da frase, segundo DENTRO do arquivo em que a palavra começa]. As marcas dentro de N4 (glifos) e N5 (barras)
   são as palavras que os cues do E2 nomeiam; o tempo E2 delas é o do próprio E2. */
const A_='hf_20260917_';
const CLIPS=[
  {id:'N1', e:[0.6,10.0], parts:[
    {file:A_+'103142_48a9eff4-c074-4758-acc8-80c24737c6ea.mp3', dur:9.56,  marks:[[0.6,0],[2.1,2.44],[6.5,6.30]]}]},
  {id:'N2', e:[10.8,57.7], parts:[
    {file:A_+'103152_584bde70-2029-4f57-90d5-8d50f237c29f.mp3', dur:18.44, marks:[[10.8,0],[20.2,8.48],[25.1,12.97],[28.6,17.31]]},
    {file:A_+'103208_9a6fc642-5c2d-47c6-b305-1e34c7ed39e4.mp3', dur:12.04, marks:[[29.1,0],[35.0,6.46]]},
    {file:A_+'103217_e897b71b-4643-42f8-baf5-e39436f3a14c.mp3', dur:14.45, marks:[[41.9,0],[48.3,6.28],[54.7,12.79]]}]},   // 54.7 ≈ "regardless"
  {id:'N3', e:[58.5,74.8], parts:[
    {file:A_+'103231_cec71923-809c-483d-8847-a7e46f6ee979.mp3', dur:17.40, marks:[[58.5,0],[65.9,6.81],[67.4,8.75],[72.3,12.98]]}]},
  {id:'N4', e:[75.6,88.4], parts:[
    {file:A_+'103245_30337648-4b6f-4485-af30-c16f33f482a8.mp3', dur:13.87, marks:[[75.6,0],[79.6,3.99],[80.5,5.97],[81.4,7.24],[82.3,8.79],[84.0,10.02]]}]},   // GPR · GBR · RF · XGB · "to integrate"
  {id:'N5', e:[89.2,105.0], parts:[
    {file:A_+'103253_2f18d762-02b2-44dd-bb08-4c050f66f6e4.mp3', dur:16.35, marks:[[89.2,0],[95.1,5.61],[97.5,9.08],[99.5,10.79],[101.5,13.18]]}]},   // "migration" · "proliferation"
  {id:'N6', e:[111.0,130.8], apos:['1:45.0',0.6], parts:[                                    // começa 0,6 s depois de chegar à rotunda (caminhada no silêncio)
    {file:A_+'103310_8d8eb649-6f0c-4b4d-b9d0-9c1d5a7b6bcd.mp3', dur:14.52, marks:[[111.0,0],[116.4,5.82],[119.4,9.36],[121.9,12.41]]},
    {file:A_+'103317_e1cbd9d8-0b32-4202-bbcc-17b32eb4ff2b.mp3', dur:7.39,  marks:[[124.4,0]]}]},
  {id:'N7', e:[131.8,156.0], parts:[
    {file:A_+'103324_5426cd6e-5cef-49e1-a92a-a1104b82b3a4.mp3', dur:9.87,  marks:[[131.8,0]]},
    {file:A_+'103334_d76bf0df-d69a-414c-9500-93171f6ad52d.mp3', dur:13.79, marks:[[142.2,0],[151.1,9.17]]}]},
  {id:'N8', e:[156.8,191.4], parts:[
    {file:A_+'103340_49d6beb8-5660-429a-b6f9-2c8a7ac6116f.mp3', dur:12.67, marks:[[156.8,0],[163.2,6.65]]},
    {file:A_+'103348_a4c53e82-4393-4f40-8d26-425d255246f1.mp3', dur:11.73, marks:[[170.6,0],[178.0,6.62]]},
    {file:A_+'103354_fa31855d-7a95-4a62-9ed7-7f2a838aadc7.mp3', dur:7.00,  marks:[[183.4,0]]}]},
  {id:'N9', e:[192.4,220.6], parts:[
    {file:A_+'103358_b832f13d-df4f-4c98-8652-13acc0fc7aa1.mp3', dur:6.11,  marks:[[192.4,0]]},
    {file:A_+'103403_c16b68fe-52b1-4b0b-b241-c18128c63a78.mp3', dur:13.87, marks:[[198.3,0],[209.2,11.10]]},
    {file:A_+'103409_454fa4f1-48e6-487c-81b1-de5e45439aee.mp3', dur:5.96,  marks:[[214.1,0]]}]}
];
const E2_DARK=220.8, E2_TOTAL=227.0;   /* D-501: +6 s para a tela "Thank you for watching" depois do escuro */
const ANCH=[[0,0]], AUDIO_PARTS=[];
function warpOn(anch,e){ if(e<=0) return e; for(let i=0;i<anch.length-1;i++){ const a=anch[i], b=anch[i+1]; if(e<=b[0]) return b[0]>a[0]? a[1]+(e-a[0])*(b[1]-a[1])/(b[0]-a[0]) : b[1]; }
  const a=anch[anch.length-2], b=anch[anch.length-1]; return b[1]+(e-b[0]); }
let SILENCIO_REAL=0;   // quanto durou, de fato, o silêncio antes de N6 (E2: 6,0 s)
{ let prevE=0, prevR=0;
  for(const c of CLIPS){ let r0=prevR+(c.e[0]-prevE);
    if(c.apos){ const rw=warpOn(ANCH,tsE2(c.apos[0]))+T_WALK_ROT+c.apos[1]; if(rw>r0) r0=rw; SILENCIO_REAL=r0-prevR; }
    c.r=[r0,r0]; let cur=r0; c.parts.forEach((p,i)=>{ p.start=cur; for(const [te,tr] of p.marks) ANCH.push([te,cur+tr]); AUDIO_PARTS.push(p); cur+=p.dur+(i<c.parts.length-1?PAUSA_PECA:0); }); c.r[1]=cur;
    ANCH.push([c.e[1],c.r[1]]); prevE=c.e[1]; prevR=c.r[1]; }
  ANCH.push([E2_DARK,prevR+0.2],[E2_TOTAL,prevR+6.4]); ANCH.sort((a,b)=>a[0]-b[0]); }
const warp=e=>warpOn(ANCH,e);
const ts=s=>warp(tsE2(s));
const TOTAL=warp(E2_TOTAL), T_DARK=warp(E2_DARK);

/* blocos v16 (janelas do E2) e o texto de cada clipe — a legenda só aparece em modo de trabalho (?legenda): a peça é narrada (D-308) */
const VO={N1:'This is HYDRA—a map that transforms testing protocols into a tesseract that decodes the true material\'s biological performance.',
  N2:'When testing cements, researchers apply eluates to cells and report the response as an intrinsic property of the material. But laboratories testing the same cement can reach opposite conclusions: one calling it inert, the other bioactive. Why? Because disc size, extraction time, volume, and cell passage dictate the result and the biological response reflects not only the material but also the assay conditions. Therefore, we developed a framework to map how testing conditions shift cellular responses. Our hypothesis was that separating protocol noise would reveal the material\'s true biological behavior—regardless of the test used.',
  N3:'To this end, we controlled cell age, disc surface area, medium volume, and elution time, generating 25 combinations to investigate how these factors, alone or in combination, affect proliferation, mineralization, migration, and safety.',
  N4:'HYDRA then uses an ensemble machine-learning architecture combining Gaussian Process Regression, Gradient Boosting, Random Forest, and XGBoost to integrate these parameters into a four-dimensional response surface.',
  N5:'The results show that cement biological properties depend on the testing protocol. A protocol shift that enhances mineralization can decrease migration while leaving proliferation unchanged. Each biological property follows its own trajectory.',
  N6:'HYDRA reveals that each biological dimension is governed by distinct parameters: proliferation and migration by cell maturity, mineralization by disc surface area, and viability by elution time. Because these drivers are decoupled, no protocol can simultaneously optimize all biological readouts.',
  N7:'HYDRA adjusts for protocol variation by estimating the cellular response expected from each combination of experimental conditions using a reference cement. If the observed response matches HYDRA\'s prediction, it derives from the testing protocol rather than a material-specific effect. A response beyond this prediction indicates the material\'s own bioactivity.',
  N8:'To validate HYDRA, two cements unseen during training were tested under three protocols. Because HYDRA does not care about chemistry, it generates the protocol-based prediction for both cements. In cell growth, for example, both materials followed the predicted surface as the protocols changed. However, one cement produced fewer cells than predicted under every protocol. HYDRA therefore revealed which variations arise from the protocol and which reflect the material\'s biological behavior.',
  N9:'HYDRA provides a reference surface that contextualizes biological data across testing protocols. For biomaterial research, HYDRA provides a quantitative benchmark to determine whether a biological response reflects the material itself or the testing protocol—regardless of how the researcher chooses to run the test. This provides a foundation for evaluating the actual biological properties of regenerative materials.'};
const clip=id=>CLIPS.find(c=>c.id===id);
const B=[
 {id:'B0',  e:[0,10],        name:'O que é o HYDRA',            clips:['N1']},
 {id:'B1-2',e:[10,58],       name:'Problema e hipótese',         clips:['N2']},
 {id:'B3-4',e:[58,75],       name:'Desenho e leituras',          clips:['N3']},
 {id:'B5',  e:[75,89],       name:'O modelo',                    clips:['N4']},
 {id:'B6',  e:[89,105],      name:'A prova da dissociação',      clips:['N5']},
 {id:'B6-2',e:[105,131],     name:'O tesserato e os drivers',    clips:['N6']},
 {id:'B7',  e:[131,156],     name:'Sinal e ruído',               clips:['N7']},
 {id:'B8',  e:[156,192],     name:'Validação externa',           clips:['N8']},
 {id:'B9',  e:[192,E2_TOTAL],name:'Fecho',                       clips:['N9']}
];
B.forEach(b=>{ b.t0=warp(b.e[0]); b.t1=warp(b.e[1]); b.voT=b.clips.map(id=>{ const c=clip(id); return [c.r[0],c.r[1],VO[id]]; }); });
const blockAt=t=>B.find(b=>t<b.t1)||B[B.length-1];

/* =========================  3. CENA  ====================================== */
const canvas=$('gl'), renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.setSize(viewW(),innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.xr.enabled=true; renderer.autoClear=false;
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.toneMapping=THREE.ACESFilmicToneMapping;   // como o banco de provas da A
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(66,viewW()/innerHeight,0.05,600); camera.rotation.order='YXZ';   // far 600: o céu da A está a 320 m
const rig=new THREE.Group(); rig.add(camera); scene.add(rig);
/* planta grande do estúdio (D-326): a peça inteira deitada — Z do mundo na horizontal da tela */
const plantaCam=new THREE.OrthographicCamera(-22,22,7.5,-7.5,28.5,60);
plantaCam.position.set(0,40,-16); plantaCam.up.set(1,0,0); plantaCam.lookAt(0,0,-16);
plantaCam.layers.enable(7); plantaCam.layers.enable(2); plantaCam.layers.enable(1);   /* D-529: os dois sóis (D-231 da A) */
const mapCam=new THREE.OrthographicCamera(-12,12,12,-12,28.5,60); mapCam.position.set(0,40,0); mapCam.up.set(0,0,-1); mapCam.lookAt(0,0,0); mapCam.layers.enable(7); mapCam.layers.enable(2); mapCam.layers.enable(1);   // near 28,5: corta abóbada e teto da rotunda · 7 = o marcador ▲ (as camadas 1 e 2 são o sol de cada sala, módulo da A)
addEventListener('resize',()=>{camera.aspect=viewW()/innerHeight;camera.updateProjectionMatrix();renderer.setSize(viewW(),innerHeight);});
boot('HYDRA · a construir o cenário (trilha A)');
const CEN=await construirCenario(scene,renderer,{ parede:new URLSearchParams(location.search).get('parede')||undefined });   /* ?parede=liso|juntas|ripado|pedra|pedra-clara|pedra-mista só pré-visualiza; o padrão é o do módulo (escolha pendente do Vinicius, trilha A) */
if(CFG.lite) CEN.aplicarLuz({sombras:false});
const guides=new THREE.Group(); scene.add(guides);   // marcações de trabalho — botão 'guias': o percurso (desenhado na §9)
const marker=new THREE.Mesh(new THREE.ConeGeometry(0.4,1,4),new THREE.MeshBasicMaterial({color:PAL.gold})); marker.rotation.x=Math.PI/2; marker.layers.set(7); scene.add(marker);

/* --- objetos abstratos (íons, os 4 modelos) --- */
function ph(kind,color,label,size=1){
  const g=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.15,emissive:color,emissiveIntensity:.15});
  let m; if(kind==='cube')m=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.45),new THREE.MeshBasicMaterial({color,wireframe:true}));
  else m=new THREE.Mesh(new THREE.SphereGeometry(.2*size,26,16),mat);
  g.add(m); if(label) addLabel(g,label,color,.3,.7);
  g.visible=false; scene.add(g); return g;
}
function row(kind,color,labels,gap=0.5,size=1){ const g=new THREE.Group(); labels.forEach((lb,i)=>{const o=ph(kind,color,lb,size); o.visible=true; o.position.x=(i-(labels.length-1)/2)*gap; scene.remove(o); g.add(o); o.userData.i=i;}); g.visible=false; scene.add(g); return g; }
function textTex(text,color,px=44,w=640,h=128){ const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.font='600 '+px+'px ui-monospace,monospace';x.textAlign='center';x.fillStyle=color;x.fillText(text,w/2,h*0.66); const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace; return t; }
function addLabel(g,text,color,y,w=.5){ const l=new THREE.Mesh(new THREE.PlaneGeometry(w,w/5),new THREE.MeshBasicMaterial({map:textTex(text,color),transparent:true,depthWrite:false}));l.position.y=y;g.add(l);g.userData.label=l;return l; }

/* --- TELA por keyframe: entradas {t, txt, st, rep, clear, hide, col}. rep = substitui a última linha;
       clear = limpa; hide = apaga a tela até a próxima linha. st: 'k' kicker · 'h' headline · '' corpo · 'm' mono --- */
/* D-323: as TELAs saem de cena por padrão — a narração carrega o trecho e as peças levam rótulo próprio.
   Ligam-se por console (HYDRA.telas(true) · HYDRA.telas(true,1) só uma) ou por URL (?telas=1 · ?telas=1,3). */
const TELAON={todas:CFG.telas==='1'||CFG.telas==='todas', quais:(CFG.telas&&CFG.telas!=='1'&&CFG.telas!=='todas')?CFG.telas.split(',').map(Number):[]};
const telaLigada=i=>TELAON.todas||TELAON.quais.includes(i);
function tela(w,h,accent,entries){
  const c=document.createElement('canvas'); c.width=1280; c.height=Math.round(1280*h/w); const x=c.getContext('2d');
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false}); const meshes=[];
  const E=entries.map(e=>({...e,t:typeof e.t==='string'?ts(e.t):e.t})).sort((a,b)=>a.t-b.t);
  let lastKey='';
  function state(t){ let lines=[], hidden=false; for(const e of E){ if(t<e.t) break; if(e.clear){lines=[];continue;} if(e.hide){hidden=true;lines=[];continue;} hidden=false; if(e.rep&&lines.length) lines[lines.length-1]=e; else lines.push(e); } return {lines,hidden}; }
  const STEP={k:58,h:82,m:46,'':46};
  /* D-321: a folha é um quadro, não um bilhete pregado no canto. O texto vai CENTRADO (horizontal e vertical),
     o cartão cresce com o conteúdo e cada estilo tem sua letra: versal com entreletra para o kicker, serifa fina
     para o título, humanista para o corpo, monoespaçada só onde há número. */
  const PAD=64, BASE={k:31,h:64,m:35,'':35};
  const SANS='"Helvetica Neue",Inter,"Segoe UI",system-ui,sans-serif';
  const SERIF='"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif';
  const MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  const fontOf=(st,px)=> st==='k' ? '600 '+px+'px '+SANS : st==='h' ? '300 '+px+'px '+SERIF : st==='m' ? '500 '+px+'px '+MONO : '400 '+px+'px '+SANS;
  const track=(st)=>{ try{ x.letterSpacing = st==='k'?'0.16em':(st==='h'?'0.005em':'0em'); }catch(err){} };
  function draw(lines){ x.clearRect(0,0,c.width,c.height); if(!lines.length){ tex.needsUpdate=true; return; }
    const W=c.width, MAXW=W-220;
    const prep=lines.map((e,i)=>{ const st=e.st||'m', txt=st==='k'?e.txt.toUpperCase():e.txt; let px=BASE[st];
      track(st); x.font=fontOf(st,px); while(px>14&&x.measureText(txt).width>MAXW){ px-=1; x.font=fontOf(st,px); }
      return {st,txt,px,col:e.col,gap:i===0?0:(st==='h'?26:(lines[i-1].st==='k'?10:16)),h:px*(st==='h'?1.22:1.3)}; });
    const contentH=prep.reduce((a,p)=>a+p.h+p.gap,0), cardH=Math.min(c.height,Math.round(contentH+2*PAD));
    x.fillStyle='rgba(251,250,246,0.96)'; x.fillRect(0,0,W,cardH);
    x.strokeStyle='rgba(0,61,124,0.16)'; x.lineWidth=3; x.strokeRect(1.5,1.5,W-3,cardH-3);
    x.fillStyle=accent; x.fillRect(0,0,W,7);
    x.textAlign='center'; let y=(cardH-contentH)/2;
    prep.forEach(p=>{ y+=p.gap; track(p.st); x.font=fontOf(p.st,p.px);
      x.fillStyle=p.col||(p.st==='k'?accent:p.st==='h'?PAL.ink:p.st==='m'?'#0d2a4a':'#4a5a6e');
      y+=p.h*0.80; x.fillText(p.txt,W/2,y); y+=p.h*0.20; });
    track(''); x.textAlign='left';
    tex.needsUpdate=true; }
  draw([]);
  let fol=null; const _d=new THREE.Vector3(), _e=new THREE.Vector3();
  return { meshes, mat, entries:E,
    /* place(x,y,z, LEITOR): o painel encara quem o lê — a posição da parada — não um ponto genérico da sala */
    place(px,py,pz,lx,ly,lz){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat); m.position.set(px,py,pz); m.lookAt(lx,ly,lz); scene.add(m); meshes.push(m); return m;},
    /* follow: painel sempre à frente de quem dá a volta na mesa, a `dist` metros na direção do olhar */
    follow(dist,y){ fol={dist,y}; return this.place(0,y,0,0,y,1); },
    tick(P,cam){ if(!fol||!meshes.length) return; const m=meshes[0]; _d.set(P.look.x-P.pos.x,0,P.look.z-P.pos.z); if(_d.lengthSq()<1e-9) return; const hz=_d.length(); _d.normalize();
      const dy=(P.look.y-P.pos.y)/hz; const y=clamp(P.pos.y+dy*fol.dist+(fol.y-P.pos.y),1.15,fol.y);   /* olhar para baixo (placas) → a folha desce junto, sem sair do quadro */
      m.position.set(P.pos.x+_d.x*fol.dist, y, P.pos.z+_d.z*fol.dist); m.lookAt(cam.getWorldPosition(_e)); },
    text(t){ const s=state(t); return s.hidden?'':s.lines.map(l=>l.txt).join(' | '); },
    update(t){ const s=state(t); const key=(s.hidden?'H':'')+s.lines.map(l=>l.txt).join('\n'); if(key!==lastKey){ lastKey=key; draw(s.lines); }
      const vis=!s.hidden&&s.lines.length>0&&telaLigada(this.idx); meshes.forEach(m=>m.visible=vis); } };
}

/* =========================  4. ATLAS + TESSERATO (D-12 · D-103)  ========= */
/* atlas.json = window.ATLAS literal do lab.html. gridVal/sampleScale copiados do Lab.
   D-103: geometria FIXA em SA·ET·EV com CP aninhado (a nativa de PROLIF e HEAL). MINERAL (ET·EV·CP, slider SA)
   e SAFETY (ET·CP·SA, slider EV) são reamostrados: permutação de índices + interpolação linear no eixo que
   estava no slider. Nada é inventado: são os mesmos frames, reindexados.                                */
let A=null, N=14, NSL=7;
const hx=h=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
function sampleScale(sc,t){ t=clamp(t,0,1); let i=0; while(i<sc.length-1&&t>sc[i+1][0]) i++; const a=sc[i], b=sc[Math.min(i+1,sc.length-1)]; const f=(t-a[0])/((b[0]-a[0])||1), ca=hx(a[1]), cb=hx(b[1]);
  return [Math.round(ca[0]+(cb[0]-ca[0])*f),Math.round(ca[1]+(cb[1]-ca[1])*f),Math.round(ca[2]+(cb[2]-ca[2])*f)]; }
const cl=(v,m)=>Math.max(0,Math.min(m,Math.round((v==null?0.5:v)*m)));
function gridVal(d,nc){ const dd=A.grid.domains[d], ax=dd.axes, sl=dd.slider; const ci=cl(nc[sl],NSL-1), i=cl(nc[ax[0]],N-1), j=cl(nc[ax[1]],N-1), k=cl(nc[ax[2]],N-1); return dd.frames[ci][i*N*N+j*N+k]; }
/* valor [0,1] no EIXO COMUM: nc = {SA,ET,EV,CP} normalizados em [0,1] */
function valCommon(d,nc){ const dd=A.grid.domains[d];
  if(dd.slider==='CP') return gridVal(d,nc);                         // PROLIF, HEAL: nativos
  const ax=dd.axes, i=cl(nc[ax[0]],N-1), j=cl(nc[ax[1]],N-1), k=cl(nc[ax[2]],N-1), idx=i*N*N+j*N+k;
  const lv=dd.slider_real, R0=A.grid.ranges[dd.slider], real=R0[0]+nc[dd.slider]*(R0[1]-R0[0]);   // valor real do eixo que estava no slider
  let lo=-1; for(let q=0;q<lv.length;q++){ if(lv[q]>=R0[0]-1e-9) { lo=q; break; } }             // 1º frame dentro da faixa do cubo (SAFETY: EV=5,7; EV=1 e 3,3 ficam fora — LIMIT 03)
  if(real<=lv[lo]) return dd.frames[lo][idx];                                                     // abaixo do 1º frame válido: fixa nele (declarado)
  for(let q=lo;q<lv.length-1;q++){ if(real<=lv[q+1]){ const w=(real-lv[q])/(lv[q+1]-lv[q]); return lerp(dd.frames[q][idx],dd.frames[q+1][idx],w); } }
  return dd.frames[lv.length-1][idx]; }
const domColor=(d,t)=>sampleScale(A.palette.twocol[d],t);
function normGroup(g){ const Rg=A.grid.ranges; const n=k=>(g[k]-Rg[k][0])/(Rg[k][1]-Rg[k][0]); return {SA:n('SA'),ET:n('ET'),EV:n('EV'),CP:n('CP')}; }
const DOMS=['PROLIF','MINERAL','HEAL','SAFETY'], AXES=['SA','ET','EV'], WAX='CP'; const _V=new THREE.Vector3();

class Tesseract{
  /* 4-cubo nativo no eixo comum: x=SA, y=ET, z=EV, w=CP. Rotação real XW/YW/ZW + giro XZ; projeção em perspectiva no w. */
  constructor(o){ this.group=new THREE.Group(); this.ang={xw:0,yw:0,zw:0,xz:0}; this.R=new Float64Array(16); this.persp=o.persp; this.unit=o.half/2.20; this.sub=o.sub;
    this.act=0; this.dom='PROLIF'; this.mix=null; this.pulse={}; this.cur={}; this.spin=o.spin??1; this.fill=1; this.netAlpha=0; this.build(); }
  build(){ const S=this.sub;
    // cascas w=−1 e w=+1
    this.shells=[]; this.cols={}; DOMS.forEach(d=>this.cols[d]={shells:[[],[]],corners:[],meas:[]});
    for(let wb=0;wb<2;wb++){ const pos4=[],idx=[]; let base=0;
      for(let f=0;f<3;f++) for(let fv=0;fv<2;fv++){ const u=(f+1)%3, v=(f+2)%3;
        for(let a=0;a<=S;a++) for(let b=0;b<=S;b++){ const c=[0,0,0]; c[f]=fv; c[u]=a/S; c[v]=b/S; pos4.push(2*c[0]-1,2*c[1]-1,2*c[2]-1,2*wb-1);
          const nc={SA:c[0],ET:c[1],EV:c[2],CP:wb}; DOMS.forEach(d=>{ const rgb=domColor(d,valCommon(d,nc)); this.cols[d].shells[wb].push(rgb[0]/255,rgb[1]/255,rgb[2]/255); }); }
        for(let a=0;a<S;a++) for(let b=0;b<S;b++){ const i0=base+a*(S+1)+b, i1=i0+1, i2=i0+(S+1), i3=i2+1; idx.push(i0,i2,i1,i1,i2,i3); }
        base+=(S+1)*(S+1); }
      const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos4.length/4*3),3)); g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(this.cols.PROLIF.shells[wb]),3)); g.setIndex(idx);
      const m=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:wb?.13:.22,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
      const mesh=new THREE.Mesh(g,m); mesh.frustumCulled=false; mesh.renderOrder=-2; this.group.add(mesh); this.shells.push({mesh,pos4:new Float32Array(pos4),n:pos4.length/4}); }
    // 16 vértices — transparent:true de propósito: sem escrever profundidade, no passo OPACO o chão e as paredes desenhados depois as apagavam (bug achado em 16/09)
    this.corners=[]; const cg=new THREE.SphereGeometry(0.03,14,10);
    for(let i=0;i<16;i++){ const b=[(i>>0)&1,(i>>1)&1,(i>>2)&1,(i>>3)&1]; const nc={SA:b[0],ET:b[1],EV:b[2],CP:b[3]};
      DOMS.forEach(d=>{ const rgb=domColor(d,valCommon(d,nc)); this.cols[d].corners.push(new THREE.Color(rgb[0]/255,rgb[1]/255,rgb[2]/255)); });
      const m=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:this.cols.PROLIF.corners[i].clone(),toneMapped:false,depthWrite:false,transparent:true})); m.renderOrder=-1; this.group.add(m); this.corners.push({mesh:m,p:[2*b[0]-1,2*b[1]-1,2*b[2]-1,2*b[3]-1]}); }
    // 32 arestas, cor do fator (TSECOL)
    this.edges=[]; const eg=new THREE.BoxGeometry(1,1,1); const fac=A.palette.factor, names=[...AXES,WAX]; this.facColor={};
    names.forEach(n=>{ const c=fac[n]||[200,200,200]; this.facColor[n]=new THREE.Color(c[0]/255,c[1]/255,c[2]/255); });
    for(let i=0;i<16;i++) for(let k=0;k<4;k++){ const jv=i^(1<<k); if(jv<i) continue;
      const m=new THREE.Mesh(eg,new THREE.MeshBasicMaterial({color:this.facColor[names[k]].clone(),transparent:true,opacity:.85,toneMapped:false,depthWrite:false})); m.renderOrder=-1; this.group.add(m); this.edges.push({mesh:m,a:i,b:jv,fac:names[k]}); }
    this.cpos=new Array(16);
    // 25 condições medidas (ATLAS.groups), cor por domínio = valor medido na escala vmin–vmax do domínio
    this.meas=[]; const mg=new THREE.SphereGeometry(0.026,12,9);
    A.groups.forEach(gr=>{ const nc=normGroup(gr);
      DOMS.forEach(d=>{ const dd=A.grid.domains[d]; const t=clamp((gr[d]-dd.vmin)/((dd.vmax-dd.vmin)||1),0,1); const rgb=domColor(d,t); this.cols[d].meas.push(new THREE.Color(rgb[0]/255,rgb[1]/255,rgb[2]/255)); });
      const m=new THREE.Mesh(mg,new THREE.MeshBasicMaterial({color:this.cols.PROLIF.meas[this.meas.length].clone(),toneMapped:false,depthWrite:false,transparent:true})); m.renderOrder=-1; m.visible=false; this.group.add(m);
      this.meas.push({mesh:m,p:[2*nc.SA-1,2*nc.ET-1,2*nc.EV-1,2*nc.CP-1],lit:0,grey:0}); });
    // v13 (1:16.0): a MALHA que liga os 25 pontos — cada condição ligada às 3 vizinhas mais próximas no espaço 4D normalizado (direção artística sobre posições reais)
    { const P=this.meas.map(m=>m.p), pairs=new Set(); P.forEach((p,i)=>{ P.map((q,j)=>[j,(p[0]-q[0])**2+(p[1]-q[1])**2+(p[2]-q[2])**2+(p[3]-q[3])**2]).filter(e=>e[0]!==i).sort((x,y)=>x[1]-y[1]).slice(0,3).forEach(e=>pairs.add(Math.min(i,e[0])+'-'+Math.max(i,e[0]))); });
      this.netPairs=[...pairs].map(k=>k.split('-').map(Number)); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.netPairs.length*6),3));
      this.net=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xe8ecf6,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); this.net.frustumCulled=false; this.net.renderOrder=-1; this.net.visible=false; this.group.add(this.net); }
    // rótulos dos eixos (SA · ET · EV · CP), nas pontas
    this.axisLabels=names.map(n=>{ const l=new THREE.Mesh(new THREE.PlaneGeometry(.36,.09),new THREE.MeshBasicMaterial({map:textTex(n,'#'+this.facColor[n].getHexString(),56),transparent:true,depthWrite:false,opacity:0,toneMapped:false})); this.group.add(l); return {mesh:l,name:n,k:names.indexOf(n)}; });
    this.axisAlpha=0;
    // pontos de validação (ATLAS.atlas.valpts): 3 materiais × 3 presets
    this.val=[]; const vg=new THREE.SphereGeometry(0.08,16,12);   /* 8 cm: legível dentro do cubo na galeria clara */ const matCol={ProRoot:'#003D7C',Exp1:'#EF7C00',Exp2:'#6d3fc0'};   // D-209: tinta · laranja · violeta
    (A.atlas.valpts||[]).forEach(v=>{ const m=new THREE.Mesh(vg,new THREE.MeshBasicMaterial({color:matCol[v.mat]||'#fff',toneMapped:false,transparent:true,opacity:0,depthWrite:false})); m.renderOrder=-1; m.visible=false; this.group.add(m);
      this.val.push({mesh:m,mat:v.mat,cond:v.cond,base:new THREE.Color(matCol[v.mat]||'#fff'),p:[2*v.n.SA-1,2*v.n.ET-1,2*v.n.EV-1,2*v.n.CP-1],std:v.v.PROLIF.std,off:0,a:0,jit:[0,0,0]}); });
    this.setActive(0); this.update(0); }
  setActive(a){ this.act=a;
    /* por DENTRO do cubo as cascas cobrem o campo inteiro; baixam a opacidade para a TELA e a grade ISO ficarem legíveis (D-207) */
    const d=camera.getWorldPosition(_V).distanceTo(this.group.position), rad=this.unit*2.2*this.group.scale.x;
    this.inside=smooth((rad*1.3-d)/(rad*0.6));
    const f=lerp(1,0.38,this.inside);
    this.shells.forEach((s,i)=>{ s.mesh.material.opacity=lerp(0.06,i?0.13:0.22,a)*(this.mix?1.35:1)*f*this.fill; }); }
  setDomain(d){ if(Array.isArray(d)){ this.mix=d; this.dom=d[0]; } else { this.dom=d; this.mix=null; } }   // recolore (crossfade no update); lista = faces sobrepostas (v13: PROLIF+HEAL em 1:36.4)
  setMix(on){ this.mix=on?DOMS:null; }                  // as quatro superfícies sobrepostas: média das quatro cores
  targetShell(wb,i){ if(this.mix){ let r=0,g=0,b=0; const L=this.mix; for(const d of L){ const c=this.cols[d].shells[wb]; r+=c[i*3]; g+=c[i*3+1]; b+=c[i*3+2]; } return [r/L.length,g/L.length,b/L.length]; } const c=this.cols[this.dom].shells[wb]; return [c[i*3],c[i*3+1],c[i*3+2]]; }
  targetCol(list){ if(this.mix){ const o=new THREE.Color(0,0,0); for(const d of this.mix){ o.add(this.cols[d][list.k][list.i]); } return o.multiplyScalar(1/this.mix.length); } return this.cols[this.dom][list.k][list.i]; }
  updateR(){ const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]; let M=I.slice();
    const mul=(Xm,Y)=>{const O=new Array(16).fill(0); for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0; for(let k=0;k<4;k++) s+=Xm[i*4+k]*Y[k*4+j]; O[i*4+j]=s;} return O;};
    const plane=(i,j,a)=>{const P=I.slice(),c=Math.cos(a),s=Math.sin(a); P[i*4+i]=c;P[i*4+j]=-s;P[j*4+i]=s;P[j*4+j]=c; return P;};
    M=mul(M,plane(0,3,this.ang.xw)); M=mul(M,plane(1,3,this.ang.yw)); M=mul(M,plane(2,3,this.ang.zw)); M=mul(M,plane(0,2,this.ang.xz)); this.R.set(M); }
  project(p,out){ const Rm=this.R; const x=Rm[0]*p[0]+Rm[1]*p[1]+Rm[2]*p[2]+Rm[3]*p[3], y=Rm[4]*p[0]+Rm[5]*p[1]+Rm[6]*p[2]+Rm[7]*p[3], z=Rm[8]*p[0]+Rm[9]*p[1]+Rm[10]*p[2]+Rm[11]*p[3], w=Rm[12]*p[0]+Rm[13]*p[1]+Rm[14]*p[2]+Rm[15]*p[3];
    const k=this.persp/Math.max(0.8,this.persp-w)*this.unit; out[0]=x*k; out[1]=y*k; out[2]=z*k; return out; }
  update(dt){ const a=this.act, sd=dt*this.spin; this.ang.xw+=sd*0.11*a; this.ang.yw+=sd*0.047*a; this.ang.zw+=sd*0.031*a; this.ang.xz+=sd*(0.05+0.05*a); this.updateR();
    const o=[0,0,0]; const ease=1-Math.exp(-dt*5);
    for(let wb=0;wb<2;wb++){ const sh=this.shells[wb]; const arr=sh.mesh.geometry.attributes.position.array, col=sh.mesh.geometry.attributes.color.array, p=[0,0,0,0];
      for(let i=0;i<sh.n;i++){ p[0]=sh.pos4[i*4];p[1]=sh.pos4[i*4+1];p[2]=sh.pos4[i*4+2];p[3]=sh.pos4[i*4+3]; this.project(p,o); arr[i*3]=o[0];arr[i*3+1]=o[1];arr[i*3+2]=o[2];
        const tc=this.targetShell(wb,i); col[i*3]+=(tc[0]-col[i*3])*ease; col[i*3+1]+=(tc[1]-col[i*3+1])*ease; col[i*3+2]+=(tc[2]-col[i*3+2])*ease; }
      sh.mesh.geometry.attributes.position.needsUpdate=true; sh.mesh.geometry.attributes.color.needsUpdate=true; }
    this.corners.forEach((c,i)=>{ this.project(c.p,o); c.mesh.position.set(o[0],o[1],o[2]); this.cpos[i]=[o[0],o[1],o[2]]; c.mesh.material.color.lerp(this.targetCol({k:'corners',i}),ease); });
    const va=new THREE.Vector3(), vb=new THREE.Vector3(), mid=new THREE.Vector3(), up=new THREE.Vector3(0,1,0), q=new THREE.Quaternion(); const th=0.014;
    this.edges.forEach(e=>{ va.fromArray(this.cpos[e.a]); vb.fromArray(this.cpos[e.b]); mid.addVectors(va,vb).multiplyScalar(0.5); const dir=vb.clone().sub(va), len=dir.length()||1e-6; q.setFromUnitVectors(up,dir.normalize()); e.mesh.position.copy(mid); e.mesh.quaternion.copy(q);
      const pu=this.pulse[e.fac]||0; e.mesh.scale.set(th*(1+2.2*pu),len,th*(1+2.2*pu)); e.mesh.material.color.copy(this.facColor[e.fac]).lerp(new THREE.Color('#ffffff'),pu*0.6); e.mesh.material.opacity=(lerp(0.45,0.85,a)+0.15*pu)*lerp(1,0.8,this.inside||0); });
    this.meas.forEach((m,i)=>{ this.project(m.p,o); m.mesh.position.set(o[0],o[1],o[2]); m.mesh.visible=m.lit>0; m.mesh.scale.setScalar(Math.max(0.001,m.lit)*(this.measBoost||1)); const tc=this.targetCol({k:'meas',i}); m.mesh.material.color.copy(tc).lerp(new THREE.Color('#9aa3c2'),m.grey); });
    // rótulos de eixo: ponta média de cada eixo do cubo externo
    for(const L of this.axisLabels){ let sx=0,sy=0,sz=0,n=0; for(let i=0;i<16;i++){ if(((i>>L.k)&1)===1){ sx+=this.cpos[i][0]; sy+=this.cpos[i][1]; sz+=this.cpos[i][2]; n++; } } L.mesh.position.set(sx/n*1.12,sy/n*1.12,sz/n*1.12); L.mesh.material.opacity=this.axisAlpha; L.mesh.visible=this.axisAlpha>0.01; L.mesh.lookAt(camera.getWorldPosition(_V)); }
    if(this.netAlpha>0.01){ const arr=this.net.geometry.attributes.position.array; this.netPairs.forEach(([i,j],q)=>{ const a2=this.meas[i].mesh.position, b2=this.meas[j].mesh.position; arr[q*6]=a2.x;arr[q*6+1]=a2.y;arr[q*6+2]=a2.z;arr[q*6+3]=b2.x;arr[q*6+4]=b2.y;arr[q*6+5]=b2.z; }); this.net.geometry.attributes.position.needsUpdate=true; }
    this.net.material.opacity=0.55*this.netAlpha; this.net.visible=this.netAlpha>0.01;
    this.val.forEach(v=>{ this.project(v.p,o); const r=Math.hypot(o[0],o[1],o[2])||1; const f=1+v.off/r; v.mesh.position.set(o[0]*f+v.jit[0],o[1]*f+v.jit[1],o[2]*f+v.jit[2]); v.mesh.visible=v.a>0.01; v.mesh.material.opacity=v.a; v.mesh.scale.setScalar(1+v.off*1.5); }); }
}

/* ----- ROSA DE QUATRO PÉTALAS (lab#cymatics): pétala = desfecho, comprimento = valor predito [0,1] num protocolo
        que passeia pelo eixo comum. Com o dado real, as quatro nunca ficam cheias ao mesmo tempo. ----- */
function makeRose(){ const c=document.createElement('canvas'); c.width=c.height=512; const x=c.getContext('2d'); const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:0,toneMapped:false})); m.visible=false; scene.add(m);
  const names=['PROLIF','MINERAL','HEAL','SAFETY'], lab=['growth','mineral','healing','survival'];
  return { mesh:m, draw(t){ x.clearRect(0,0,512,512); const cx=256,cy=256,Rr=210;
      const nc={SA:0.5+0.5*Math.sin(t*0.37),ET:0.5+0.5*Math.sin(t*0.53+1.1),EV:0.5+0.5*Math.sin(t*0.29+2.3),CP:0.5+0.5*Math.sin(t*0.41+0.6)};
      names.forEach((d,i)=>{ const th=-Math.PI/2+i*Math.PI/2; const v=valCommon(d,nc); const col=domColor(d,0.85);
        const petal=(len,fill)=>{ x.beginPath(); for(let s=0;s<=40;s++){ const u=s/40; const r=len*Math.sin(Math.PI*u)**0.8; const a=th+(u-0.5)*0.9; const px=cx+Math.cos(a)*r*Math.max(0.001,Math.sin(Math.PI*u)+0.0)+Math.cos(th)*len*u*0.0; const py=cy+Math.sin(a)*r; if(s===0)x.moveTo(cx,cy); x.lineTo(px,py); } x.closePath(); if(fill){x.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},0.55)`;x.fill();} else {x.strokeStyle=`rgba(${col[0]},${col[1]},${col[2]},0.9)`;x.lineWidth=3;x.stroke();} };
        petal(Rr,false); petal(Rr*clamp(v,0.05,1),true);
        x.fillStyle=PAL.ink; x.font='600 22px ui-monospace,monospace'; x.textAlign='center'; x.fillText(lab[i],cx+Math.cos(th)*(Rr+28),cy+Math.sin(th)*(Rr+28)+8); });
      x.strokeStyle='rgba(0,61,124,0.25)'; x.lineWidth=1; x.beginPath(); x.arc(cx,cy,Rr,0,Math.PI*2); x.stroke(); tex.needsUpdate=true; } };
}

/* ----- GRADE ISO de 27 barras (ATLAS.safety_grid, literal): 3 materiais × 3 passagens × 3 tempos, linha de 70 % ----- */
function makeIsoGrid(){ const g=new THREE.Group(); g.visible=false; scene.add(g);
  const mats=['ProRoot','Exp1','Exp2'], lbl={ProRoot:'ProRoot (reference)',Exp1:'Exp 1',Exp2:'Exp 2'}, ETs=[1,3,5], ETl=['24 h','72 h','120 h'], CPs=[1,4,7];
  const W=3.4, H=1.15, y0=0.15;       // parede: 3,4 m de largura; barras até 1,15 m (=120 %), abaixo da TELA
  const bars=[]; const blockW=W/3, colW=blockW/3.6;
  const back=new THREE.Mesh(new THREE.PlaneGeometry(W+0.3,H+0.7),new THREE.MeshBasicMaterial({color:0xfbfaf6,transparent:true,opacity:.95,toneMapped:false})); back.position.set(0,y0+H/2+0.05,-0.02); g.add(back);
  const line=new THREE.Mesh(new THREE.PlaneGeometry(W+0.1,0.012),new THREE.MeshBasicMaterial({color:PAL.red,toneMapped:false})); line.position.set(0,y0+H*70/120,0.03); g.add(line);
  const lineLab=new THREE.Mesh(new THREE.PlaneGeometry(.5,.1),new THREE.MeshBasicMaterial({map:textTex('70 %',PAL.red,52),transparent:true,depthWrite:false,toneMapped:false})); lineLab.position.set(-W/2-0.35,y0+H*70/120,0.03); g.add(lineLab);
  mats.forEach((mat,mi)=>{ const bx=(mi-1)*blockW;
    const ml=new THREE.Mesh(new THREE.PlaneGeometry(.9,.16),new THREE.MeshBasicMaterial({map:textTex(lbl[mat],PAL.ink,44),transparent:true,depthWrite:false,toneMapped:false})); ml.position.set(bx,y0+H+0.22,0.03); g.add(ml);
    CPs.forEach((cp,ci)=>{ ETs.forEach((et,ei)=>{ const r=A.safety_grid.find(q=>q.mat===mat&&q.CP===cp&&q.ET===et); if(!r) return;
      const x=bx+(ci-1)*colW*1.15+(ei-1)*colW*0.34; const h=H*clamp(r.o,0.5,120)/120; const ok=r.o>=70;
      const m=new THREE.Mesh(new THREE.BoxGeometry(colW*0.3,h,0.06),new THREE.MeshBasicMaterial({color:ok?'#1FA85C':'#ef4444',transparent:true,opacity:.95,toneMapped:false})); m.position.set(x,y0+h/2,0); g.add(m);
      bars.push({mesh:m,mat,cp,et,o:r.o,h}); });
      const cl=new THREE.Mesh(new THREE.PlaneGeometry(.3,.075),new THREE.MeshBasicMaterial({map:textTex('P'+cp,'#4a5a6e',60),transparent:true,depthWrite:false,toneMapped:false})); cl.position.set(bx+(ci-1)*colW*1.15,y0-0.09,0.03); g.add(cl); }); });
  const tl=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.09),new THREE.MeshBasicMaterial({map:textTex('each triplet: 24 h · 72 h · 120 h eluate  ·  ISO grid · 1 mL','#4a5a6e',40,1280,96),transparent:true,depthWrite:false,toneMapped:false})); tl.position.set(0,y0-0.24,0.03); g.add(tl);
  g.traverse(o=>{ o.renderOrder=4; });   // a grade desenha por cima das cascas do tesserato
  return { group:g, bars, setAlpha(a){ g.traverse(o=>{ if(o.material){ o.material.opacity=(o===back?.95:(o.material.map?1:.95))*a; o.material.transparent=true; } }); g.visible=a>0.01; },
           /* pulse(fn): fn(barra) → intensidade [0,1] do pulso (v13: ProRoot 120 h uma a uma; Exp 1/2 120 h juntas) */
           pulse(fn){ bars.forEach(b=>{ const k=fn(b)||0; const s=1+0.35*k; b.mesh.scale.set(s,1,s); const ok=b.o>=70; b.mesh.material.color.set(ok?(k>0?'#4ade80':'#1FA85C'):(k>0?'#ff6b6b':'#ef4444')); }); },
           /* as 27 barras acendem de uma vez (D-26); a coluna de tempo que a VOZ está dizendo fica cheia e as outras recuam */
           emphasis(et,a){ bars.forEach(b=>{ b.mesh.material.opacity=(et===null||b.et===et?0.95:0.32)*a; }); } };
}

/* =========================  5. MODELOS .glb  ============================= */
const loader=new GLTFLoader(); const GLBCACHE={};
function loadGLB(f){ if(!GLBCACHE[f]) GLBCACHE[f]=new Promise((res,rej)=>loader.load(CFG.GBL+f,g=>res(g.scene),undefined,()=>rej(new Error('não carregou '+f)))); return GLBCACHE[f].then(s=>s.clone(true)); }
/* D-09 + D-28: discos de área — fator RESIDUAL por nó sobre o .glb de 14/09 (área de UMA face → área TOTAL, h = 2,06 mm, Q-08) */
const DISC_FIX=[['disc_113mm2',0.933],['disc_169mm2',0.975],['disc_219mm2',1.000]];
function fixDiscs(root){ const big=0.01671, gap=1.26*big; DISC_FIX.forEach((sp,i)=>{ const node=root.getObjectByName(sp[0]); if(!node) return; node.scale.setScalar(sp[1]); node.position.x=(i-1)*gap;
  const lab=node.getObjectByName('label_'+sp[0].split('_')[1]); if(lab){ lab.scale.setScalar(1/sp[1]); lab.position.y=0.0062/sp[1]; } }); }
/* model(spec): holder cujos FILHOS são os elementos nomeados (wrapper centrado → core escala/inclinação → nós).
   spec: {file, fit, el, tilt, fix, nodeScale:{nome:fator}, spread, nomap, labels, medium} */
async function model(spec){
  const holder=new THREE.Group(); holder.userData.spec=spec; holder.visible=false; scene.add(holder);
  try{
    const sc=await loadGLB(spec.file); if(spec.fix) fixDiscs(sc);
    if(spec.nodeScale) for(const n in spec.nodeScale){ const nd=sc.getObjectByName(n); if(nd) nd.scale.multiplyScalar(spec.nodeScale[n]); }
    if(spec.nomap) sc.traverse(o=>{ if(o.isMesh&&o.material&&o.material.map){ o.material=o.material.clone(); o.material.map=null; o.material.needsUpdate=true; } });
    sc.updateMatrixWorld(true);
    const root=sc.children[0]||sc; let els=spec.el||'*'; if(els==='*') els=[root.children.map(c=>c.name)]; els=els.map(e=>e==='*'?root.children.map(c=>c.name):(Array.isArray(e)?e:[e]));
    const wr=[]; for(const names of els){ const w=new THREE.Group(), core=new THREE.Group(), shift=new THREE.Group(); w.add(core); core.add(shift); sc.add(w);
      for(const n of names){ const node=sc.getObjectByName(n); if(!node){fail('nó não encontrado: '+n+' em '+spec.file);continue;} shift.attach(node); }
      wr.push(w); }
    sc.updateMatrixWorld(true);
    const all=new THREE.Box3(); wr.forEach(w=>all.union(new THREE.Box3().setFromObject(w)));
    const size=all.getSize(new THREE.Vector3()), C=all.getCenter(new THREE.Vector3()), s=spec.fit/Math.max(size.x,size.y,size.z,1e-6);
    wr.forEach((w,i)=>{ const b=new THREE.Box3().setFromObject(w), c=b.getCenter(new THREE.Vector3()); const core=w.children[0], shift=core.children[0];
      shift.position.set(-c.x,-c.y,-c.z); core.scale.setScalar(s); core.rotation.x=spec.tilt||0; const sp=spec.spread||1; w.position.set((c.x-C.x)*s*sp,(c.y-C.y)*s*sp,(c.z-C.z)*s*sp);
      if(spec.labels&&spec.labels[i]) addLabel(w,spec.labels[i],spec.labelColor||PAL.ink,(b.max.y-c.y)*s+0.07+(spec.labelDy||0),spec.labelW||0.5);
      sc.remove(w); holder.add(w); });
    if(spec.medium){ const m=holder.getObjectByName(spec.medium); if(m){ m.material=m.material.clone(); holder.userData.medium=m.material; } }
    holder.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; if(o.material&&(o.material.isMeshStandardMaterial||o.material.isMeshPhysicalMaterial)) o.material.envMapIntensity=CEN.luz.env; } });
  }catch(e){ fail(e.message); const w=new THREE.Group(); w.add(new THREE.Mesh(new THREE.BoxGeometry(spec.fit*.6,spec.fit*.6,spec.fit*.6),new THREE.MeshStandardMaterial({color:0x552233,wireframe:true}))); holder.add(w); }
  return holder;
}
/* D-518 (SIMULAÇÃO, desligada por padrão — ?fundir liga): junta as peças de um .glb numa malha por MATERIAL (mesma forma, mesma cor;
   ex.: a célula tem 333 peças → ~10 malhas). Menos chamadas de desenho no Quest. Só para ver a diferença antes de ele decidir. */
const FUNDIR=QS.has('fundir');
function fundir(holder){ let antes=0, depois=0;
  holder.children.forEach(w=>{ const shift=w.children[0]&&w.children[0].children[0]; if(!shift) return; shift.updateMatrixWorld(true);
    const inv=new THREE.Matrix4().copy(shift.matrixWorld).invert(), grupos=new Map(), soltar=[];
    shift.traverse(o=>{ if(!o.isMesh||Array.isArray(o.material)) return; antes++; const g=o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));
      if(!g.index){ const n=g.attributes.position.count, ix=new Uint32Array(n); for(let i=0;i<n;i++) ix[i]=i; g.setIndex(new THREE.BufferAttribute(ix,1)); }
      g.morphAttributes={}; const k=o.material.uuid; if(!grupos.has(k)) grupos.set(k,{mat:o.material,gs:[]}); grupos.get(k).gs.push(g); soltar.push(o); });
    if(!soltar.length) return;
    const novos=[]; for(const {mat,gs} of grupos.values()){ const nomes=Object.keys(gs[0].attributes).filter(a=>gs.every(g=>g.attributes[a]&&g.attributes[a].itemSize===gs[0].attributes[a].itemSize));
      gs.forEach(g=>{ Object.keys(g.attributes).forEach(a=>{ if(!nomes.includes(a)) g.deleteAttribute(a); }); });
      const mg=mergeGeometries(gs,false); if(!mg) return; const m=new THREE.Mesh(mg,mat); m.castShadow=m.receiveShadow=true; novos.push(m); depois++; }
    soltar.forEach(o=>{ o.parent&&o.parent.remove(o); }); shift.children.slice().forEach(c=>{ if(!c.isMesh&&!c.children.length) shift.remove(c); }); novos.forEach(m=>shift.add(m)); });
  return {antes,depois}; }
async function trio(files,fit,gap,labels,tilt){ const holder=new THREE.Group(); holder.visible=false; scene.add(holder);
  for(let i=0;i<files.length;i++){ const h=await model({file:files[i],fit,el:'*',tilt,labels:labels?[labels[i]]:null,labelColor:PAL.pink,labelW:.42,labelDy:.12}); const w=h.children[0]; scene.remove(h); w.position.x=(i-(files.length-1)/2)*gap; w.userData.x0=w.position.x; holder.add(w); }
  return holder; }

/* =========================  6. CARREGAMENTO  ============================== */
boot('HYDRA · a carregar o atlas');
try{ const r=await fetch('./data/atlas.json'); if(!r.ok) throw new Error('HTTP '+r.status); A=await r.json(); if(!A.grid) A.grid=A.atlas.grid; N=A.grid.res||14; NSL=A.grid.nslider||7; }
catch(e){ boot('não consegui ler data/atlas.json — sirva a pasta por http, não por file://'); fail('atlas.json: '+e.message); throw e; }
const M={}; { const specs={
  powders:{file:'cement-powders-4.glb',fit:1.0,el:['cement_powder_1','cement_powder_2','cement_powder_3','cement_powder_4'],tilt:.35},
  radio:{file:'radipacifier-5-10-15g.glb',fit:.8,el:['cement_powder_5g','cement_powder_21g','cement_powder_36g'],tilt:.35},
  caps:{file:'capsulas-cement-a-b.glb',fit:.75,el:['capsule_cement_a','capsule_cement_b'],tilt:.9,spread:2.2},
  discs3:{file:'cement 3 disc.glb',fit:1.25,el:['disc_5mm','disc_10mm','disc_15mm'],tilt:.9,nodeScale:{disc_5mm:3.0,disc_10mm:1.5}},   // nota de build B1: mesmo diâmetro aparente (a voz diz "três misturas")
  disc1:{file:'cement disc.glb',fit:.4,el:[['cement_disc','surface_microcracks']],tilt:.9},
  tube1:{file:'falcon-50ml-rack.glb',fit:.5,el:[['falcon_tube_2']],medium:'tube_2_medium'},
  cellOld:{file:'dpsc-tripolar-old-cell.glb',fit:.5,el:'*',tilt:1.1,labels:['DPSC'],labelColor:PAL.pink},
  discsSA:{file:'ca3sio5-discs-different sizes.glb',fit:1.3,el:['disc_113mm2','disc_169mm2','disc_219mm2'],fix:true,tilt:.9},
  falcon:{file:'falcon-50ml-rack.glb',fit:.85,el:[['tube_rack'],['falcon_tube_1','label_tube_1'],['falcon_tube_2','label_tube_2'],['falcon_tube_3','label_tube_3']]},
  clocks:{file:'digital-clocks-24-72-120h.glb',fit:1.3,el:['digital_clock_2400h','digital_clock_7200h','digital_clock_12000h']},
  prolif:{file:'proliferacao-1-3-5-7d.glb',fit:1.3,el:['petri_dish_1d','petri_dish_3d','petri_dish_5d','petri_dish_7d'],tilt:.95},
  ars:{file:'alizarin-red-14-28d.glb',fit:.72,el:['petri_dish_14d','petri_dish_28d'],tilt:.95},
  heal:{file:'wound-healing-assay-4-dishes.glb',fit:1.3,el:['petri_dish_0h','petri_dish_24h','petri_dish_48h','petri_dish_72h'],tilt:.95},
  cyto:{file:'citotoxicidade-24h-4-grupos.glb',fit:1.3,el:['petri_dish_control','petri_dish_g1','petri_dish_g2','petri_dish_g3'],tilt:.95},
  dishA:{file:'citotoxicidade-24h-4-grupos.glb',fit:.42,el:[['petri_dish_control']],tilt:1.0},   // B0/B5: a placa densa   [CONFIRMAR: qual nó é a densa e qual a quase vazia — Q-201]
  dishB:{file:'citotoxicidade-24h-4-grupos.glb',fit:.42,el:[['petri_dish_g3']],tilt:1.0},        // B0/B5: a placa quase vazia
  /* a sequência do eluato de B1-2 (D-321, pedida no caderno): disco · tubo · disco DENTRO do tubo · eluato pronto · placa com células */
  /* os três tubos leem-se iguais de longe: cada peça leva o seu rótulo, como as vitrines da mesa */
  seqDisco:{file:'ca3sio5-disc.glb',fit:.28,el:'*',tilt:.85,labels:['cement disc'],labelW:.58,labelDy:.02},
  seqTubo:{file:'falcon-50ml.glb',fit:.66,el:'*',tilt:.12,labels:['culture medium'],labelW:.62,labelDy:.02},
  seqTuboDisco:{file:'falcon-with-disc.glb',fit:.66,el:'*',tilt:.12,labels:['disc in medium'],labelW:.62,labelDy:.02},
  seqEluato:{file:'falcon-50mlafter.glb',fit:.66,el:'*',tilt:.12,labels:['eluate'],labelW:.46,labelDy:.02},
  seqPlaca:{file:'placa-com-celulas.glb',fit:.58,el:'*',tilt:.62,labels:['cells'],labelW:.42,labelDy:.03},                                // 36°: vê-se a monocamada sem deixar de ser placa de Petri
  /* D-354 — CENA c2 do caderno dele (0:19.5–0:27.8): gbl22 (cápsula MTA Repair HP) e gbl1 (alizarina D14 · D28) */
  c2cap:{file:'capsula-mta-repair-hp.glb',fit:.5,el:['capsule_cement'],tilt:0},            // D-355: deitada ("de lado"), gira no próprio eixo mostrando "CEMENT"
  c2d14:{file:'inert&bioactive.glb',fit:.5,el:['petri_dish_14d'],tilt:.95},                  // D-355: o .glb dele "inert&bioactive" — placa da esquerda (inert)
  c2d31:{file:'inert&bioactive.glb',fit:.5,el:['petri_dish_31d'],tilt:.95},                  //         placa da direita (bioactive)
  /* D-359 — CENA c3 (caderno dele, 0:29.8–0:41.9): os quatro fatores do protocolo e as curvas de liberação */
  c3disc:{file:'ca3sio5-discs-5-10-15.glb',fit:.9,el:'*',tilt:.85},        // "disc size" — D-361: discos 5·10·15 (troca dele; era gbl5)
  c3tempo:{file:'timer-bancada-tanita-style.glb',fit:.9,el:'*',tilt:.15},   // "extraction time" — D-360: timer de bancada (troca dele; era gbl19)
  c3vol:{file:'falcon-50ml-rack.glb',fit:.9,el:'*',tilt:.15},               // gbl14 — "volume"
  c3cel:{file:'dpsc-tripolar-old-cell.glb',fit:.9,el:'*',tilt:.5},          // gbl13 — "cell passage"
  c3curvas:{file:'curvas-liberacao-3d.glb',fit:.9,el:'*',tilt:.25},         // gbl30 — "the biological (response)"
  /* D-363 — cena da HIPÓTESE (prompt da trilha R, 26/09): outra instância das placas inert/bioactive, só para este trecho */
  hpD14:{file:'inert&bioactive.glb',fit:.3,el:['petri_dish_14d'],tilt:0},
  hpD31:{file:'inert&bioactive.glb',fit:.3,el:['petri_dish_31d'],tilt:0},
  hpCap:{file:'capsula-mta-repair-hp.glb',fit:.13,el:['capsule_cement'],tilt:0},
  /* D-365 — B3-4, o desenho experimental (prompt da trilha R, 26/09): cimento de referência, quadro 4×3 dos fatores, 4 respostas */
  b34ref:{file:'cement disc.glb',fit:.32,el:'*',tilt:.85},
  b34disc:{file:'ca3sio5-discs-different sizes.glb',fit:1,el:['disc_113mm2','disc_169mm2','disc_219mm2'],tilt:.85},
  b34vol:{file:'falcon-50ml-rack.glb',fit:1,el:[['falcon_tube_1','label_tube_1'],['falcon_tube_2','label_tube_2'],['falcon_tube_3','label_tube_3']],tilt:0},
  b34clk:{file:'digital-clocks-24-72-120h.glb',fit:1,el:['digital_clock_2400h','digital_clock_7200h','digital_clock_12000h'],tilt:0},
  b34p7:{file:'proliferacao-1-3-5-7d.glb',fit:.2,el:['petri_dish_7d'],tilt:.95},
  b34p28:{file:'alizarin-red-14-28d.glb',fit:.2,el:['petri_dish_28d'],tilt:.95},
  b34p72:{file:'wound-healing-assay-4-dishes.glb',fit:.2,el:['petri_dish_72h'],tilt:.95},
  b34saf:{file:'citotoxicidade-24h-4-grupos.glb',fit:.36,el:['petri_dish_control','petri_dish_g3'],tilt:.95},   // D-364: "o material" entra no "would reveal"
  nusEmblema:{file:'emblema-nus-relevo.glb',fit:1.15,el:['nus_emblem_relief'],tilt:0},   // D-346: um pouco menor que o D-344 (1,4) — pra não roubar o foco do título
  tituloGlb:{file:'titulo-atlas-cscs-3d.glb',fit:1.9,el:['article_title_3d'],tilt:0}    // D-344: título+autores em 3-D (dele), sem cartão
 };
 const keys=Object.keys(specs); let done=0; const t0=performance.now();
 for(const k of keys){ boot('HYDRA · a carregar modelos · '+(done+1)+'/'+(keys.length+1)+' · '+specs[k].file); M[k]=await model(specs[k]); done++; }
 boot('HYDRA · a carregar modelos · '+(keys.length+1)+'/'+(keys.length+1)+' · células P1 · P4 · P7');
 M.cells=await trio(['dpsc-tripolar-cell-age1.glb','dpsc-tripolar-cell-age4.glb','dpsc-tripolar-cell-age7.glb'],.5,.56,['P1','P4','P7'],1.1);
 /* D-531: o par safe/tóxico do B3-4 deixa de ser as duas placas do citotoxicidade-24h e passa a ser a placa-petri-celulas-destaque (duas cópias; a da direita, a tóxica,
    com o citoplasma puxado para o vermelho para o par continuar legível). Mesmo tamanho total do par antigo (fit .36). */
 { const h=await trio(['placa-petri-celulas-destaque.glb','placa-petri-celulas-destaque.glb'],.17,.21,null,.95); M.b34saf=h;
   h.children[1].traverse(o=>{ if(!o.isMesh||!o.material) return; const nm=o.material.name;
     if(nm==='cells_cytoplasm'){ o.material=o.material.clone(); o.material.color.lerp(new THREE.Color(0xd23a4a),.6); }
     else if(nm==='cells_nuclei'){ o.material=o.material.clone(); o.material.color.set(0xb01e2e); if(o.material.emissive) o.material.emissive.set(0x4a0810); } }); }
 M.b34cel=await trio(['dpsc-tripolar-cell-age1.glb','dpsc-tripolar-cell-age4.glb','dpsc-tripolar-cell-age7.glb'],1,1,null,.5);   // D-365: linha 1 do quadro (sem rótulo)
 M._loadMs=Math.round(performance.now()-t0); }
/* as oito peças da mesa — do módulo da A. Até a D-226 nasciam visíveis desde o início; agora (D-226) a mesa
   começa vazia e cada uma só aparece quando a M chama CEN.mostrarPeca()/mostrarEstacao() — ver D-330, §7 abaixo. */
const PIECES=await CEN.carregarPecas((i,n,f)=>boot('HYDRA · peças da mesa (cenário) · '+i+'/'+n+' · '+f));

/* =========================  7. CONTEÚDO — keyframes e TELAs (roteiro v16)  */
/* Tempos: E2 v16, convertidos para a voz real por ts(). Posições: paradas e cotas do módulo da A (P_*, GEO, EST).
   D-305: nada voa até o rosto. Objetos da mesa acendem NO LUGAR (poça + anel); o que não está na mesa aparece a ≥ 2,2 m,
   ao lado do eixo do olhar, e ACOMPANHA a visão enquanto o espectador anda (referencial da câmera). D-303: TELA até a próxima.
   keyframes: {t, p:[x,y,z] mundo | rel:[dir,cima,frente] no referencial da câmera, s:escala, stag:s por elemento, only:[idx], home} */
let EST_TICK=null;   // D-325
/* PLANTA (D-326): a vista de cima, grande, clicável. O retângulo é o mesmo para desenhar e para converter
   o clique em metros, então não há como os dois saírem de acordo. */
const PLANTA={ on:false, W:620, H:210, x:16, y:150,
  rect(){ return {x:this.x, y:this.y, w:this.W, h:this.H}; },
  /* tela → chão: raio pela câmera ortográfica da planta, cortado no plano y=0 */
  mundo(cx,cy,alturaTela){ const r=this.rect(); const u=(cx-r.x)/r.w, v=1-((alturaTela-cy)-r.y)/r.h;
    if(u<0||u>1||v<0||v>1) return null;
    const nd=new THREE.Vector2(u*2-1,-(v*2-1)), ray=new THREE.Raycaster(); ray.setFromCamera(nd,plantaCam);
    const alvo=new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),alvo)?alvo:null; } };
const KF=[]; let SNAP=true; function K(obj,frames){ frames.forEach(f=>{ if(typeof f.t==='string') f.t=ts(f.t); }); const e=KF.find(k=>k.obj===obj); if(e) e.frames.push(...frames); else KF.push({obj,frames}); }
const F=CFG.focus;
/* D-305: enquanto a cópia animada está em foco, a peça da mesa NÃO some — as duas convivem (nunca houve
   piscada aqui). PIECE_OF é o gancho para o oposto (esconder a peça original enquanto a cópia dela está
   por perto) mas nunca foi ligado (nenhum PIECE_OF.set() no arquivo) — fica como estava, morto de propósito.
   D-226 mudou só o ESTADO INICIAL da peça (nasce escondida; a M revela — D-330), não este comportamento. */
const PIECE_OF=new Map();
function home(obj){ return {p:[0,-6,0],s:.001,home:true}; }     // cópias animadas moram fora de cena; a peça da mesa (módulo da A) fica sempre no lugar
/* aparece a ≥2,2 m crescendo, fica, e some encolhendo — sem trajetória até o rosto.
   D-331: com `pousa` ({p:[x,y,z], s, dur}) a cópia, em vez de encolher e sumir, MOVE devagar (dur segundos,
   padrão POUSA_DUR — "não é rápido, controlado", pedido dele) da posição relativa à câmera até um ponto
   FIXO do mundo, encolhendo até `pousa.s`, e FICA lá (sem quadro de "casa" depois — a última chave (`still`)
   segura pra sempre; `still` também avisa o applyKF para parar de girar o objeto, ver §9). */
function show(obj,t0,t1,rel,s,only,stag,pousa){ const a=ts(t0), b=ts(t1);
  const base=[{t:a-0.02,...home(obj),only},{t:a-0.01,rel,s:.02,only,stag},{t:a+0.5,rel,s,only},{t:b,rel,s,only}];
  if(pousa) return [...base,{t:b+(pousa.dur??POUSA_DUR),p:pousa.p,s:pousa.s,only,still:true}];
  return [...base,{t:b+0.45,rel,s:.001,only},{t:b+0.47,...home(obj)}]; }
function showW(obj,t0,t1,p,s,only){ const a=ts(t0), b=ts(t1); return [{t:a-0.02,...home(obj),only},{t:a-0.01,p,s:.02,only},{t:a+0.5,p,s,only},{t:b,p,s,only},{t:b+0.45,p,s:.001,only},{t:b+0.47,...home(obj)}]; }

/* ---- destaque das peças NA mesa: poça de luz no tampo + anel (uma por peça) ---- */
const POOLTEX=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(255,236,200,0.95)'); g.addColorStop(0.45,'rgba(255,214,150,0.45)'); g.addColorStop(1,'rgba(255,214,150,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
const POOLS=EST.map((z,i)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1.15,1.15),new THREE.MeshBasicMaterial({map:POOLTEX,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));
  m.rotation.x=-Math.PI/2; m.position.set(0,GEO.mesa.h+0.012,z); m.renderOrder=3; scene.add(m);
  const r=new THREE.Mesh(new THREE.RingGeometry(0.38,0.42,64),new THREE.MeshBasicMaterial({color:PAL.gold,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide})); r.rotation.x=-Math.PI/2; r.position.set(0,GEO.mesa.h+0.014,z); r.renderOrder=3; scene.add(r);   // o anel lê sobre o carvalho claro; a poça sozinha some
  return {m,r,l:null,cues:[]}; });   /* sem PointLight: 8 luzes a mais recompilariam todos os materiais e pesam no headset — a poça é aditiva */
const MAQPOOL=(()=>{ const m=POOLS[0].m.clone(); m.material=POOLS[0].m.material.clone(); m.position.z=MAQ_Z; scene.add(m); const r=POOLS[0].r.clone(); r.material=POOLS[0].r.material.clone(); r.position.z=MAQ_Z; r.scale.setScalar(1.25); scene.add(r); return {m,r,l:null,cues:[]}; })();
/* cue de luz: [peça, início, fim] em tempo do E2 — sobe em 0,4 s, fica, desce em 0,8 s */
const LIGHT=(i,t0,t1)=>{ (i==='M'?MAQPOOL:POOLS[i]).cues.push([ts(t0),ts(t1)]); };
/* peças: a pós · b radiopacificador · c cápsulas · d discos de área · e tubos · f relógios · g placas de proliferação · h placas de viabilidade */
LIGHT(0,'0:10.6','0:12.6'); LIGHT(1,'0:11.2','0:13.2'); LIGHT(2,'0:11.8','0:13.8');                       // a formulação, ao passar (a voz não a diz — E2 v16, nota de B1-2)
LIGHT(3,'0:29.1','0:41.9'); LIGHT(5,'0:30.3','0:41.9'); LIGHT(4,'0:31.5','0:41.9');                       // "disc size, extraction time, volume…" — uma a cada 1,2 s (d · f · e)
LIGHT('M','0:41.9','0:58.5');                                                                              // "a framework" — a maquete acende ao longe
LIGHT(3,'1:01.1','1:05.9'); LIGHT(4,'1:01.7','1:05.9'); LIGHT(5,'1:02.3','1:05.9');                       // B3: as famílias reacendem (as peças da mesa SÃO os três níveis)
LIGHT('M','1:05.9','1:29.2');                                                                              // 25 pontos (1:05.9) → o modelo (B5)
LIGHT(6,'1:12.3','1:15.6'); LIGHT(7,'1:14.1','1:15.6');                                                    // placas: proliferação · segurança
/* D-330: a mesa começa vazia (D-226) — cada peça aparece pela primeira vez no MESMO instante em que a poça de
   luz dela acende (a acima); nenhum tempo novo, só o t0 que já guiava o cue visual. Contínuo em t (recalculado
   por quadro lá no tick, não um evento único), então bate igual tocando do início ou dando seek/scrub direto
   para o meio (estúdio, revisão). Fica revelada dali em diante — não esconde de novo (mesmo espírito do
   "nunca se escondem" antigo, D-305, agora só para depois da primeira aparição). */
const REVELA_PECA=POOLS.map(P=>P.cues.length?Math.min(...P.cues.map(c=>c[0])):Infinity);
/* D-333 (decisão dele, 23/09): MESA LIMPA SEMPRE — as 8 peças da A nunca aparecem; na mesa só fica o que pousa
   das animações (D-331/D-332). Com a mesa vazia, o que apontava para as peças sai: as 8 poças de luz das
   estações e as 3 linhas que saíam de d·f·e (0:35 → célula, 0:44 e 1:24 → maquete). Ficam a poça da maquete e
   a 4ª linha (que sai da célula P4, não da mesa). Os tempos da D-330 continuam aqui, desligados: trocar para
   false devolve o comportamento anterior inteiro (peças + poças + linhas), sem mexer em mais nada. */
const MESA_LIMPA=true;

// ---- B0 — entrada da nave · 0:00–0:10 · a mesa inteira recuando à frente; o tesserato dormente ao fundo, sobre o plinto (Q-312: o painel tapa)
const T0=tela(3.6,2.0,PAL.gold,[{t:'0:00.0',txt:'HYDRA',st:'h'},{t:'0:01.4',txt:'HyperDimensional Regenerative Atlas',st:'k'},{t:'0:03.0',txt:'testing protocols → one tesseract',st:''},
  {t:'0:06.5',txt:'the material\'s biological performance, read against the surface',st:''},{t:'0:11.0',hide:true}]);
T0.place(...ahead(P_B0,4.2,2.3), ...eyeOf(P_B0).toArray());

// ---- B1-2 — o problema e a hipótese · 0:10–0:58 · anda ao lado da mesa; a ESTAÇÃO DO ELUATO acompanha a visão, à direita
const T12=tela(3.0,1.5,PAL.teal,[
  /* D-322: quanto texto este trecho mostra. As peças já levam o seu rótulo, então 'key' deixa só a espinha da frase
     e 'off' entrega o trecho à narração — a voz diz tudo e a TELA não repete. */
  ...(CFG.quadro==='off' ? [{t:'0:11.0',hide:true}]
    : CFG.quadro==='key' ? [{t:'0:11.2',txt:'disc → medium → eluate → cells',st:'h'},{t:'0:18.6',txt:'one number → the material',st:'h',rep:true}]
    : [{t:'0:11.0',txt:'how an eluate is made',st:'k'},{t:'0:11.2',txt:'disc → medium → eluate → cells',st:'h'},
       {t:'0:11.9',txt:'a set cement disc · culture medium',st:''},
       {t:'0:12.8',txt:'extraction: the disc sits in the medium',st:'',rep:true},
       {t:'0:13.9',txt:'the eluate — what the cement released',st:'',rep:true},
       {t:'0:15.0',txt:'applied to the cells',st:'',rep:true},
       {t:'0:18.6',txt:'one number → reported as the material',st:'',rep:true}]),
  {t:'0:20.2',clear:true},{t:'0:20.2',txt:'same cement · two laboratories · opposite conclusions',st:'k'},{t:'0:25.1',txt:'inert  ·  bioactive',st:'h'},
  {t:'0:29.1',clear:true},{t:'0:29.1',txt:'disc area · extraction time · volume · cell passage'},{t:'0:35.0',txt:'the response = the material + the assay conditions',st:''},
  {t:'0:41.9',clear:true},{t:'0:41.9',txt:'a framework: map how conditions shift the response',st:'k'},{t:'0:48.3',txt:'hypothesis: separate the protocol → the material\'s own behavior',st:''},
  {t:'0:53.0',txt:'protocol  |  material',st:'h'},{t:'0:58.7',hide:true}]);
T12.follow(4.2,2.15);
const disc1=M.disc1, tube1=M.tube1, ions=row('sphere',PAL.gold,['','','','',''],0.12,0.25), cellOld=M.cellOld, dishA=M.dishA, dishB=M.dishB;
const ST={tube:[0.55,-0.28,2.5], cell:[1.15,-0.22,2.7], dA:[-0.05,-0.36,2.4], dB:[1.75,-0.36,2.8]};   // a estação: à direita do eixo, abaixo da linha do olho
/* D-321 — A SEQUÊNCIA DO ELUATO (0:11 → 0:15.8), pedida no caderno. Substitui a estação estática deste trecho:
   1) disco de Ca3SiO5 e tubo lado a lado · 2) o disco DENTRO do tubo (extração) · 3) o eluato pronto · 4) a placa com
   as células, inclinada 36°. Tudo acompanha a visão enquanto a câmera anda até P1; cada peça balança devagar (§13)
   para a luz da nave correr pelas superfícies. A estação antiga (tubo do rack, célula, placas) entra depois, em 0:15.8. */
/* Os passos ENTRAM E FICAM, da esquerda para a direita: no fim do trecho os quatro estão no ar ao mesmo tempo,
   lado a lado, e leem-se como uma linha de processo. Antes cada um substituía o anterior e piscava (pedido dele). */
/* sem a TELA no caminho (D-323), a linha sobe para a altura do olhar e fecha-se: tudo no meio do quadro */
const SEQ={disco:[-0.86,-0.16,1.92], tubo:[-0.58,-0.02,1.92], comDisco:[-0.05,-0.02,1.90], eluato:[0.48,-0.02,1.90], placa:[1.00,-0.10,1.88]};
const FIM='0:18.0';   // os quatro ficam no ar juntos de 0:15 a 0:18 (pedido dele: sem piscar, e grandes)
/* D-331: em vez de sumir, os 5 objetos da sequência do eluato pousam na mesa — pedido dele (23/09), na nota
   da mira em 0:16,8. "Em linha, alinhados ao lado menor da mesa" = espalhados no EIXO X (GEO.mesa.w = 1,8 m,
   o lado curto — GEO.mesa.z0/z1 = -4/-14,5 é o comprimento de 10,5 m por onde se anda), todos na MESMA
   profundidade z. Essa profundidade: GEO.mesa.z0 − 0,5 (a borda mais perto da entrada, com uma margem) —
   porque a câmera, entre 0:16,8 e 0:20 (conferido com `HYDRA.pose()`), ainda está em z ≈ −2,65, ANTES do
   início físico da mesa (z0 = −4): esta é a primeira coisa que a peça mostra sobre a mesa, antes das 8
   peças da D-226/D-330 mais adiante. Escala pousada = 40% da escala "flutuando perto do rosto" (`s=1`
   aqui já era uma escala de leitura, não o tamanho real do objeto — D-321 nota de build) — pequeno o
   bastante para não dominar o tampo, grande o bastante para ler de perto. "Controlado, não rápido" (pedido
   dele): POUSA_DUR mais longo que o encolhimento padrão (0,45 s) — e o applyKF já usa a mesma curva suave
   (`smooth`) de todas as outras transições, então o pouso desacelera sozinho, sem precisar de nada extra. */
const POUSA_DUR=2.2, POUSA_S=0.4, POUSA_Z=GEO.mesa.z0-0.5;
const POUSA_T0=ts(FIM), POUSA_T=POUSA_T0+POUSA_DUR;   // começo e fim do pouso (mesmo t1=FIM para os 5) — o §13 usa os dois
/* D-332: a ALTURA do pouso. O model() centra a geometria na origem do objeto e inclina o `core` (spec.tilt)
   para mostrar a peça ao rosto — então pôr a origem em mesa.h + 2 cm (D-331) enterrava metade do objeto no
   tampo. Agora: mede o ponto mais baixo das malhas do objeto já na posição de REPOUSO (sem tilt, sem balanço
   — é como ele chega, ver §13) e na escala pousada, e sobe o ponto de pouso exatamente isso. Rótulo fora da
   conta (ele fica no `w`, não no `core`). */
function baseRepouso(obj){ const w=obj&&obj.children[0], core=w&&w.children[0]; if(!core) return 0;
  const sv={p:obj.position.clone(), s:obj.scale.clone(), q:obj.quaternion.clone(), wr:w.rotation.clone(), cx:core.rotation.x};
  obj.position.set(0,0,0); obj.scale.set(1,1,1); obj.quaternion.identity(); w.rotation.set(0,0,0); core.rotation.x=0; obj.updateMatrixWorld(true);
  const b=new THREE.Box3(); core.traverse(o=>{ if(o.isMesh) b.expandByObject(o); });
  obj.position.copy(sv.p); obj.scale.copy(sv.s); obj.quaternion.copy(sv.q); w.rotation.copy(sv.wr); core.rotation.x=sv.cx; obj.updateMatrixWorld(true);
  return b.isEmpty()?0:b.min.y; }
const pousaEm=(obj,x)=>({p:[x, GEO.mesa.h - baseRepouso(obj)*POUSA_S + 0.003, POUSA_Z], s:POUSA_S, dur:POUSA_DUR});
const POUSA={ disco:pousaEm(M.seqDisco,-0.7), tubo:pousaEm(M.seqTubo,-0.35), comDisco:pousaEm(M.seqTuboDisco,0),
  eluato:pousaEm(M.seqEluato,0.35), placa:pousaEm(M.seqPlaca,0.7) };
K(M.seqDisco,     show(M.seqDisco,'0:11.0',FIM,SEQ.disco,1,undefined,undefined,POUSA.disco));
K(M.seqTubo,      show(M.seqTubo,'0:11.0',FIM,SEQ.tubo,1,undefined,undefined,POUSA.tubo));
K(M.seqTuboDisco, show(M.seqTuboDisco,'0:12.8',FIM,SEQ.comDisco,1,undefined,undefined,POUSA.comDisco));
K(M.seqEluato,    show(M.seqEluato,'0:13.9',FIM,SEQ.eluato,1,undefined,undefined,POUSA.eluato));
K(M.seqPlaca,     show(M.seqPlaca,'0:15.0',FIM,SEQ.placa,1,undefined,undefined,POUSA.placa));
/* D-354 — CENA c2 (caderno dele, 26/09): "adicionar o gbl22 rodando lentamente, tilted 45° quando a palavra
   laboratories aparecer · adicionar o gbl1 quando conclusions, num zoom in lento para estarem em full size quando
   calling · halo elegante no item da esquerda em inert e depois no da direita em bioactive (o cimento tem dois
   resultados possíveis) · colocar os três objetos na mesa lentamente durante a transição bioactive → why".
   TEMPOS: medidos no ÁUDIO (envelope do clipe 103152, início real 10,96 s), não na régua de caracteres da legenda
   (que erra até 0,7 s aqui): "But laboratories" 19,46–20,19 · "conclusions" 22,46–23,24 · "one calling" 23,95–24,69 ·
   "it inert," 24,79–25,31 · "the other bio-active" 25,86–27,17 · "Why?" 28,27. Os três (cápsula + as duas placas)
   pousam numa segunda fileira da mesa, atrás dos 5 do eluato (que estão em z −4,5). */
const C2T={lab:19.65, conc:22.46, call:24.20, inert:24.95, bio:26.35, bioFim:27.17, why:28.27, p0:27.20, p1:28.30};   // D-358: pouso termina junto do "Why" (antes 28,9), antes de ele começar a andar em 28,5
/* D-355 (correção dele, com a imagem de referência): composição = cápsula DEITADA em cima, girando no próprio eixo
   de modo que "CEMENT" fique à vista; as duas placas do inert&bioactive.glb embaixo, esquerda (inert) e direita
   (bioactive), de cima como na foto. A cápsula diminui um pouco enquanto as placas chegam. Halo removido (ele: "terrível").
   Na mesa: os três em LINHA, como a primeira fileira (a do eluato, x −0,7…0,7 de 0,35 em 0,35, z −4,5) — aqui uma
   segunda fileira paralela, mesmo passo de 0,35 m, na ordem da fala: cimento · inert · bioactive. */
const C2Z=GEO.mesa.z0-1.2;
const pousa2=(obj,x)=>({p:[x, GEO.mesa.h - baseRepouso(obj)*POUSA_S + 0.003, C2Z], s:POUSA_S});
const C2P={cap:pousa2(M.c2cap,-0.35), d14:pousa2(M.c2d14,0), d31:pousa2(M.c2d31,0.35)};
const C2R={capG:[0,0.30,2.3], capP:[0,0.40,2.3], d14L:[-0.2,-0.12,3.8], d14P:[-0.32,-0.16,1.9], d31L:[0.2,-0.12,3.8], d31P:[0.32,-0.16,1.9]};
K(M.c2cap,[{t:C2T.lab-0.02,...home()},{t:C2T.lab-0.01,rel:C2R.capG,s:.02},{t:C2T.lab+0.8,rel:C2R.capG,s:1.6},{t:C2T.conc,rel:C2R.capG,s:1.6},
  {t:C2T.call,rel:C2R.capP,s:1.15},{t:C2T.p0,rel:C2R.capP,s:1.15},{t:C2T.p1,p:C2P.cap.p,s:C2P.cap.s,still:true}]);
for(const [o,L,P,pp] of [[M.c2d14,C2R.d14L,C2R.d14P,C2P.d14],[M.c2d31,C2R.d31L,C2R.d31P,C2P.d31]])
  K(o,[{t:C2T.conc-0.02,...home()},{t:C2T.conc-0.01,rel:L,s:.02},{t:C2T.conc+0.6,rel:L,s:.55},
    {t:C2T.call,rel:P,s:1},{t:C2T.p0,rel:P,s:1},{t:C2T.p1,p:pp.p,s:pp.s,still:true}]);
/* conferido em captura (4 ângulos): o rótulo "CEMENT" se repete em volta do corpo — qualquer ângulo o mostra */
const C2_TXT=0;
/* D-359 — CENA c3 (caderno dele): "trazer os elementos um a um de acordo com a palavra: gbl5 (disc/specimen size) ·
   gbl19 extraction time · gbl14 volume · gbl13 cell passage; cada um aparece centralizado e, quando o próximo aparece,
   vai para o seu canto (esquerda-topo, direita-topo, esquerda-baixo, direita-baixo) formando um quadrado 2×2 do
   tamanho de UM elemento sozinho; em 'the biological' entra o gbl30 do tamanho desse quadrado; em 'assay' o gbl30
   dissolve e os quatro pousam em linha na mesa". ('gbl 19', 'gb114', 'gb113', 'glb130' = gbl19, gbl14, gbl13, gbl30.)
   TEMPOS medidos no áudio (clipe 103208, início real 29,75 s): "Because disc size," 29,81–31,26 · "extraction time,"
   31,38–32,49 · "volume, and cell passage" 32,61–34,42 · "and the biological" 36,24–37,23 · "…but also the assay" 39,85–40,85
   · "conditions" 40,93. A câmera ANDA de P1 a P2 nesse trecho (0,28 m/s): tudo fica no referencial da vista (rel).
   Pouso: 3ª fileira da mesa, z −9,0 (adiante de quem anda), passo de 0,35 m, na ordem da fala. */
const C3T={disc:30.35, tempo:31.38, vol:32.61, cel:33.45, bio:36.45, assay:40.50, p1:42.30};
/* D-362 (ele: "as partes têm que ir mais para trás"): o quadrado 2×2 fica ATRÁS do elemento que entra no centro — a 2,7 m em vez
   de 1,8 m —, com escala e passo aumentados na mesma proporção (K=2,7/1,8), então o tamanho APARENTE do quadrado não muda e o
   novo elemento do centro não atravessa os que já estão nos cantos. */
/* D-530 (ele, 29/09: "coloque um pouco mais distante, e para cima"): centro 1,8 → 2,1 m e +0,22 m; quadrado 2,7 → 3,1 m e +0,22 m (a fileira de baixo — estante e célula — fica ≥ 10 cm acima do tampo, e não na altura dele como antes); passo do
   quadrado 0,23 → 0,26 (os quatro não se sobrepõem). Escalas iguais — de mais longe ficam um pouco menores. */
const C3K=2.7/1.8, C3S=0.85, C3Q=0.5*C3K, C3Y=0.22, C3C=[0,C3Y-0.30,2.1], C3E=0.28*C3K, C3D=[0,C3Y,3.1];   /* o do centro entra ABAIXO da fileira de cima do quadrado (não a cobre) e um pouco menor */
const C3SQ=[-0.5*C3K,C3Y,3.1];                          // o quadrado vai para a esquerda quando as curvas entram (à direita)
const c3canto=(i,cx)=>{ const q=cx===C3C?C3D:cx; return [q[0]+(i%2?C3E:-C3E), q[1]+(i<2?C3E:-C3E), q[2]]; };   /* D-530: o quadrado usa a altura dele (C3D), não a do centro */
const C3Z=GEO.mesa.z0-5.0;   // à frente de quem anda: da câmera em ~z −6,5 (0:42) a fileira fica ~37° à esquerda, dentro da vista
const c3pousa=(obj,x)=>({p:[x, GEO.mesa.h - baseRepouso(obj)*POUSA_S + 0.003, C3Z], s:POUSA_S});
const C3O=[M.c3disc,M.c3tempo,M.c3vol,M.c3cel], C3IN=[C3T.disc,C3T.tempo,C3T.vol,C3T.cel];
C3O.forEach((o,i)=>{ const t0=C3IN[i], prox=i<3?C3IN[i+1]:C3T.bio, pz=c3pousa(o,-0.525+i*0.35);
  /* D-360: o ÚLTIMO (a célula) entra direto no seu canto, sem passar pelo centro (correção dele) */
  const entra= i<3 ? [{t:t0-0.01,rel:C3C,s:.02},{t:t0+0.45,rel:C3C,s:C3S},{t:prox,rel:C3C,s:C3S},{t:prox+0.6,rel:c3canto(i,C3C),s:C3Q}]
                   : [{t:t0-0.01,rel:c3canto(i,C3C),s:.02},{t:t0+0.45,rel:c3canto(i,C3C),s:C3Q}];
  K(o,[{t:t0-0.02,...home()},...entra,{t:C3T.bio,rel:c3canto(i,C3C),s:C3Q},{t:C3T.bio+0.8,rel:c3canto(i,C3SQ),s:C3Q},
    {t:C3T.assay,rel:c3canto(i,C3SQ),s:C3Q},{t:C3T.p1,p:pz.p,s:pz.s,still:true}]); });
K(M.c3curvas,[{t:C3T.bio-0.02,...home()},{t:C3T.bio-0.01,rel:[0.5*C3K,C3Y,3.1],s:.02},{t:C3T.bio+0.8,rel:[0.5*C3K,C3Y,3.1],s:C3S*C3K},
  {t:C3T.assay,rel:[0.5*C3K,C3Y,3.1],s:C3S*C3K},{t:C3T.assay+0.9,rel:[0.5*C3K,C3Y,3.1],s:.001},{t:C3T.assay+0.92,...home()}]);
/* D-363 — A HIPÓTESE (B1-2), prompt PROMPT_M_hipotese_B1-2.md da trilha R, com as escolhas dele (26/09): SEM a maquete
   (desligada pelo ZERO) — as linhas saem das barras direto para as 4 peças da c3 pousadas na mesa; SEM o rótulo "hypothesis"
   (TELAs desligadas; ele decidiu não pôr rótulo — contra o item 6/8 do prompt da R, registrado no D-363).
   Mensagem: dois laboratórios, mesmo cimento, resultados diferentes; tirando a parte do protocolo (cinza), sobra a do
   material (cor), IGUAL nos dois. Ilustra a hipótese — não prova nada. Barras SEM número, eixo, unidade ou rótulo.
   TEMPOS medidos no áudio (clipe 103217, início real 42,14): "Our hypothesis" 48,42 · "separating" 50,09 ·
   "would reveal" 51,79 · "regardless" 54,95 · fim da frase 56,5. A câmera está parada em P2 e vira para a fileira da c3
   (bloco de olhar o4, 47,8–58,2) para as placas, as barras e as peças ficarem no mesmo quadro. */
const HT={in:48.42, cresce:49.1, sep:50.09, chega:51.6, rev:51.79, pousa:52.6, reg:54.95, sai:57.5, fim:58.0};
const HPR={d14:[-0.2,-0.30,1.2], d31:[0.2,-0.30,1.2]};
/* D-516 (pedido dele: "esses não devem desaparecer, devem repousar na mesa atrás da linha que contém o relógio"): as duas placas com as
   colunas (tubos de vidro com os nódulos) e a cápsula POUSAM numa fileira logo atrás da fileira da c3 (disco · relógio · tubo · célula,
   z −9,0), em z −9,55, antes das fileiras de B3-4 (z −10,45…); pouso de 2 s a partir de 57,5 (a câmera só anda em 59,8) */
const HPZ=GEO.mesa.z0-5.55, HPS=0.7, HPDUR=2.0;
const hpPousa=(obj,x,sc)=>({p:[x, GEO.mesa.h - baseRepouso(obj)*sc + 0.003, HPZ], s:sc});
const HPP={d14:hpPousa(M.hpD14,-0.32,HPS), cap:hpPousa(M.hpCap,0,1), d31:hpPousa(M.hpD31,0.32,HPS)};
K(M.hpD14,[{t:HT.in-0.02,...home()},{t:HT.in-0.01,rel:HPR.d14,s:.02},{t:HT.in+0.8,rel:HPR.d14,s:1},{t:HT.sai,rel:HPR.d14,s:1},{t:HT.sai+HPDUR,p:HPP.d14.p,s:HPP.d14.s,still:true}]);
const HPCAP=[0,-0.08,1.25];
K(M.hpCap,[{t:HT.rev-0.02,...home()},{t:HT.rev-0.01,rel:HPCAP,s:.02},{t:HT.rev+0.7,rel:HPCAP,s:1},{t:HT.sai,rel:HPCAP,s:1},{t:HT.sai+HPDUR,p:HPP.cap.p,s:HPP.cap.s,still:true}]);
const HCAPL=[0,1].map(()=>hpTubo('#e8b7bf',0.0022));
K(M.hpD31,[{t:HT.in-0.02,...home()},{t:HT.in-0.01,rel:HPR.d31,s:.02},{t:HT.in+0.8,rel:HPR.d31,s:1},{t:HT.sai,rel:HPR.d31,s:1},{t:HT.sai+HPDUR,p:HPP.d31.p,s:HPP.d31.s,still:true}]);
/* D-364 (ele aprovou 2 e 3 + a opção (a), 26/09): as barras viram COLUNAS com a linguagem da peça — dentro de um tubo de vidro
   fino, o MATERIAL é uma coluna dos mesmos nódulos vermelhos de alizarina das placas; o PROTOCOLO é "noise" de verdade, uma
   nuvem de partículas cinzas tremendo. (a): o ruído distorce para os DOIS lados — na bioactive ele INFLA (nuvem empilhada em
   cima da coluna vermelha → resultado alto); na inert ele ACHATA (nuvem apertando a coluna vermelha → resultado baixo).
   Tirando o ruído, a coluna da inert CRESCE e a da bioactive BAIXA até a MESMA altura: o "pior resultado" não era pior —
   era o mesmo material. Alturas ilustrativas (não dado), sem número/eixo/rótulo. No "would reveal", a cápsula do cimento
   entra entre as placas e as duas colunas se ligam a ela: isso é o material. */
const HB={R:0.03, tubo:0.38, mat:0.12, obsInert:0.04, ruidoBio:0.22};
const HRED=['#b3203a','#8e1428','#c8374f','#6f0f1f','#a51931'];
const _hS=new THREE.SphereGeometry(1,10,8), _hM4=new THREE.Matrix4(), _hQ=new THREE.Quaternion(), _hV=new THREE.Vector3(), _hSc=new THREE.Vector3();
function hpColuna(){ const g=new THREE.Group(); g.visible=false; scene.add(g);
  const tubo=new THREE.Mesh(new THREE.CylinderGeometry(HB.R,HB.R,1,32,1,true),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:0.1,metalness:0,transparent:true,opacity:0.18,depthWrite:false,side:THREE.DoubleSide}));
  const aro=()=>new THREE.Mesh(new THREE.TorusGeometry(HB.R,0.0012,6,40),new THREE.MeshBasicMaterial({color:'#cfd6de',transparent:true}));
  const a0=aro(), a1=aro(); a0.rotation.x=a1.rotation.x=Math.PI/2; g.add(tubo,a0,a1);
  const NR=110, red=new THREE.InstancedMesh(_hS,new THREE.MeshStandardMaterial({roughness:0.55,metalness:0,transparent:true}),NR);
  const semR=[]; for(let k=0;k<NR;k++){ const u=(k+0.5)/NR; semR.push({y:u, a:k*2.399, r:0.72*HB.R*Math.sqrt((k*0.618)%1), s:0.0075+0.0045*((k*0.37)%1)}); red.setColorAt(k,new THREE.Color(HRED[k%HRED.length])); }
  const NN=140, ruido=new THREE.InstancedMesh(_hS,new THREE.MeshStandardMaterial({color:'#8d949c',roughness:0.9,metalness:0,transparent:true}),NN);
  const semN=[]; for(let k=0;k<NN;k++) semN.push({y:(k+0.5)/NN, a:k*2.399+1.1, r:Math.sqrt((k*0.618+0.3)%1), f:k*0.713, l:k%4, s:0.0035+0.0025*((k*0.53)%1)});
  red.frustumCulled=ruido.frustumCulled=false; g.add(red,ruido); return {g,tubo,a0,a1,red,semR,ruido,semN}; }
const HCOL=[hpColuna(),hpColuna()];
function hpTubo(cor,r){ const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1,8,1,true),new THREE.MeshBasicMaterial({color:cor,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.visible=false; scene.add(m); return m; }
const HLIN=[0,1].map(()=>[0,1,2,3].map(()=>hpTubo('#ffd98a',0.005)));   /* D-388: mais fortes ("muito apagadas") */
/* D-388: FLUXO nas linhas — pontos de luz correndo da coluna para as peças ("animação flow para mostrar que tem movimento") */
const HFLOW=[0,1].map(()=>[0,1,2,3].map(()=>[0,1,2,3].map(()=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(0.009,10,8),new THREE.MeshBasicMaterial({color:'#fff6dc',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.renderOrder=6; m.visible=false; scene.add(m); return m; })));
const HTOPO=hpTubo('#ffffff',0.0025);
const _hA=new THREE.Vector3(), _hB=new THREE.Vector3(), _hUp=new THREE.Vector3(0,1,0);
function hpLiga(m,a,b){ const d=_hB.copy(b).sub(a), L=d.length(); m.position.copy(a).addScaledVector(d,0.5); m.scale.set(1,Math.max(L,1e-4),1); m.quaternion.setFromUnitVectors(_hUp,d.normalize()); }
function hpOpac(g,a){ g.traverse(n=>{ if(n.material) n.material.opacity=a; }); g.visible=a>0.01; }
/* D-365 — B3-4, o DESENHO EXPERIMENTAL (prompt da trilha R, 26/09). Um cimento de referência; 4 fatores × 3 níveis; 25
   combinações; 4 respostas. Adaptações ao estado atual (ZERO/D-334, TELAs desligadas, D-323): a MAQUETE com os 25 pontos volta
   SÓ para este trecho, no referencial da vista (a câmera ANDA de P2 a P3 durante toda a cena — 59,8→74,7 —, então tudo acompanha
   a vista, como nas cenas c3/hipótese); sem TELA (os níveis ficam só nos rótulos impressos dos discos, tubos e relógios).
   Layout: maquete no centro · quadro 4×3 à esquerda (~25°) · as 4 placas à direita (~25°), tudo dentro de ±35°.
   TEMPOS medidos no áudio (clipe 103231, início real 57,39): "To this end," 57,48 · "cell age" ≈59,55 · "disc surface area"
   ≈60,45 · "medium volume" ≈61,75 · "and elution time" 62,66 (→63,0) · "25" ≈64,85 · "alone" ≈68,5 · "in combination" ≈69,4 ·
   "proliferation" 70,32 · "mineralization" 71,66 · "migration" 73,00 · "safety" ≈74,25 · fim 74,74. [CONFIRMAR no fone ±0,3 s]. */
const BT={ref:57.48, cel:59.55, disc:60.45, vol:61.75, tempo:63.0, n25:64.85, alone:68.5, comb:69.4, prol:70.32, min:71.66, mig:73.0, saf:74.25, fim:75.6};
const B34={gx:-0.84, gz:1.8, col:0.20, lin:[0.24,0.08,-0.08,-0.24], maq:[0,-0.02,2.4], px:[0.60,0.84,1.08,1.36], py:-0.02, pz:1.8};
/* normaliza cada linha: a maior peça da linha fica com ~13 cm (a 1,8 m; ~9 cm pedidos a 1,6 m ficavam pequenos demais na vista), as outras na MESMA escala (a proporção dentro da linha é o dado:
   o disco de 219 maior que o de 113, o tubo de 15 mL mais cheio); e põe as três lado a lado, 17 cm entre centros */
function b34Linha(h,alvo=0.13){ if(!h) return; const ws=h.children; let mx=0; ws.forEach(w=>{ const b=new THREE.Box3().setFromObject(w), sz=b.getSize(new THREE.Vector3()); mx=Math.max(mx,sz.x,sz.y,sz.z); });
  const f=mx>0?alvo/mx:1; ws.forEach((w,i)=>{ const core=w.children[0]; if(core) core.scale.multiplyScalar(f); w.position.set((i-(ws.length-1)/2)*B34.col,0,0); }); }
[M.b34cel,M.b34disc,M.b34vol,M.b34clk].forEach(h=>b34Linha(h));
/* a membrana das células tem alfa 0,32 e some na galeria clara — só nesta cena, 0,6 (as cores P1 azul · P4 rosa · P7 laranja) */
M.b34cel&&M.b34cel.traverse(n=>{ if(n.isMesh&&n.material&&/membran/i.test(n.material.name||n.name||'')){ n.material=n.material.clone(); n.material.opacity=Math.max(n.material.opacity,0.6); } });
/* migration: esconder o rótulo "72 h" (os dados vão a 120 h; "72 h" confundiria com o tempo de eluição) */
M.b34p72&&M.b34p72.traverse(n=>{ if(/label/i.test(n.name)) n.visible=false; });
const b34lin=(i,dy=0)=>[B34.gx, B34.lin[i]+dy, B34.gz];
const B34FIM=[{t:BT.fim,s:1},{t:BT.fim+0.5,s:.001}];
/* D-392 (comentário dele no caderno): em vez de sumirem em 1:15.6, o quadro 4×3 e as 4 respostas POUSAM na mesa (1,8 s), em fileiras perto
   de P3 — a mesa fica cheia; a altura exata e a inclinação zero no pouso são acertadas por quadro em B34POUSO (§13b) */
const B34POUSA_DUR=1.8, B34LAND={rows:[0,1,2,3].map(i=>[0,GEO.mesa.h+0.1,-10.45-0.3*i]), resp:[[-0.3,GEO.mesa.h+0.1,-11.7],[0,GEO.mesa.h+0.1,-11.7],[0.3,GEO.mesa.h+0.1,-11.7],[0,GEO.mesa.h+0.1,-12.15]]};   // D-532: 3 na fila de cima (prol · min · mig), safe/tóxico sozinho na de baixo
function b34K(o,t0,rel,s,stag,land){ if(!o) return; K(o,[{t:t0-0.02,...home()},{t:t0-0.01,rel,s:stag?s:.02,stag},{t:t0+0.45,rel,s},{t:BT.fim,rel,s},{t:BT.fim+B34POUSA_DUR,p:land,s,still:true}]); B34POUSO.push(o); }
const B34POUSO=[];
/* o cimento de referência entra sozinho no foco; em "elution time" recua para o canto superior do quadro */
/* D-379: o disco de referência isolado SAI da cena (pedido dele, 26/09) — a chave fica desligada */
if(false&&M.b34ref) K(M.b34ref,[{t:BT.ref-0.02,...home()},{t:BT.ref-0.01,rel:[0,0.04,1.4],s:.02},{t:BT.ref+0.8,rel:[0,0.04,1.4],s:1},{t:BT.tempo,rel:[0,0.04,1.4],s:1},
  {t:BT.tempo+0.8,rel:[B34.gx-0.32,B34.lin[0]+0.1,B34.gz],s:0.35},{t:BT.fim,rel:[B34.gx-0.32,B34.lin[0]+0.1,B34.gz],s:0.35},{t:BT.fim+0.5,rel:[B34.gx-0.32,B34.lin[0]+0.1,B34.gz],s:.001},{t:BT.fim+0.52,...home()}]);
b34K(M.b34cel,BT.cel,b34lin(0),1,0.15,B34LAND.rows[0]); b34K(M.b34disc,BT.disc,b34lin(1),1,0.15,B34LAND.rows[1]); b34K(M.b34vol,BT.vol,b34lin(2),1,0.15,B34LAND.rows[2]); b34K(M.b34clk,BT.tempo,b34lin(3),1,0.15,B34LAND.rows[3]);
/* D-532: 3 placas na linha de cima (prol · min · mig); safe + tóxico na linha de baixo, centradas sob as três. As placas se viram PARA O ESPECTADOR (FACE_VIEWER, em applyKF), não para fora. */
[[M.b34p7,BT.prol,[B34.px[0],B34.py,B34.pz]],[M.b34p28,BT.min,[B34.px[1],B34.py,B34.pz]],[M.b34p72,BT.mig,[B34.px[2],B34.py,B34.pz]],[M.b34saf,BT.saf,[B34.px[1],B34.py-0.22,B34.pz]]].forEach(([o,t0,rel],i)=>b34K(o,t0,rel,1,undefined,B34LAND.resp[i]));
const FACE_VIEWER=new Set([M.b34p7,M.b34p28,M.b34p72,M.b34saf].filter(Boolean));
const B34ROWS=[M.b34cel,M.b34disc,M.b34vol,M.b34clk];
/* cada condição (ATLAS.groups, na ordem dos 25 pontos da maquete) → a coluna de cada linha do quadro */
const B34COND=A.groups.map(g=>[[1,4,7].indexOf(g.CP),[113,169,219].indexOf(g.SA),[5,10,15].indexOf(g.EV),[1,3,5].indexOf(g.ET)]);
const B34G4=A.groups.findIndex(g=>g.g===4), B34G23=A.groups.findIndex(g=>g.g===23);
const B34PAR=hpTubo('#ffffff',0.003);
const SOMBRATEX=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); const g=x.createRadialGradient(64,64,0,64,64,64);
  g.addColorStop(0,'rgba(20,14,8,1)'); g.addColorStop(0.5,'rgba(20,14,8,0.7)'); g.addColorStop(1,'rgba(20,14,8,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();
const SOMBRAS=[[M.seqDisco,POUSA_T],[M.seqTubo,POUSA_T],[M.seqTuboDisco,POUSA_T],[M.seqEluato,POUSA_T],[M.seqPlaca,POUSA_T],
  [M.c2cap,C2T.p1],[M.c2d14,C2T.p1],[M.c2d31,C2T.p1],
  [M.c3disc,C3T.p1],[M.c3tempo,C3T.p1],[M.c3vol,C3T.p1],[M.c3cel,C3T.p1],[M.hpD14,HT.sai+HPDUR],[M.hpD31,HT.sai+HPDUR],[M.hpCap,HT.sai+HPDUR]].map(([o,fim])=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
    new THREE.MeshBasicMaterial({map:SOMBRATEX,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  m.rotation.x=-Math.PI/2; m.renderOrder=2; m.visible=false; scene.add(m); return {o,fim,m,ok:false}; });
K(tube1,show(tube1,'0:18.5','0:58.0',ST.tube,1.3));
/* as cinco esferinhas que subiam do disco saíram (pedido do Vinicius, 18ª parte): a própria sequência conta a extração */
K(cellOld,show(cellOld,'0:18.4','0:58.0',ST.cell,.75));
K(dishA,[...show(dishA,'0:20.2','0:58.0',ST.dA,.8)]);      // monocamada densa   [CONFIRMAR: qual nó é a densa — Q-201]
K(dishB,[...show(dishB,'0:20.2','0:58.0',ST.dB,.8)]);      // quase vazia
/* cartão "= the material" ao lado da célula (0:16.0) → divide-se em "protocol | material" (0:53.0) */
function card(txt,w){ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*0.22),new THREE.MeshBasicMaterial({map:textTex(txt,PAL.ink,Math.min(118,Math.floor(1024*0.92/(txt.length*0.6))),1024,224),transparent:true,depthWrite:false,toneMapped:false})); m.visible=false; scene.add(m); return m; }
const CARD1=card('= the material',0.62), CARD2=card('protocol  |  material',0.8);
K(CARD1,[{t:'0:19.0',rel:[ST.cell[0],ST.cell[1]+0.42,ST.cell[2]],s:.02},{t:'0:19.4',rel:[ST.cell[0],ST.cell[1]+0.42,ST.cell[2]],s:1},{t:'0:53.0',rel:[ST.cell[0],ST.cell[1]+0.42,ST.cell[2]],s:1},{t:'0:53.4',rel:[ST.cell[0],ST.cell[1]+0.42,ST.cell[2]],s:.001},{t:ts('0:53.4')+0.05,p:[0,-6,0],s:.001,home:true}]);
K(CARD2,show(CARD2,'0:53.0','0:58.0',[ST.cell[0],ST.cell[1]+0.42,ST.cell[2]],1));
/* célula P4, a quarta "peça" da lista (não está na mesa): aparece à esquerda do eixo em "cell passage" */
K(M.cells,show(M.cells,'0:32.7','0:41.9',[-0.95,-0.2,2.8],.55,[1]));

// ---- B3-4 — desenho e leituras · 0:58–1:15 · da parada P3 anda até a maquete; as famílias; as placas
const T34=tela(3.2,1.6,PAL.blue,[
  {t:'0:58.7',txt:'one reference cement · ProRoot MTA',st:'k'},{t:'1:00.5',txt:'CELL PASSAGE P1 · P4 · P7   SURFACE AREA 113 · 169 · 219 mm²'},{t:'1:02.5',txt:'ELUTION VOLUME 5 · 10 · 15 mL   ELUTION TIME 24 · 72 · 120 h'},
  {t:'1:05.9',txt:'25 of 81 combinations · triplicate',st:''},{t:'1:07.4',txt:'no factor correlated with another (VIF ≈ 1.0)',st:''},
  {t:'1:12.3',clear:true},{t:'1:12.3',txt:'PROLIFERATION  WST-1 · d1–d7 (AUC)'},{t:'1:12.9',txt:'MINERALIZATION  Alizarin Red S · D14 + D28'},
  {t:'1:13.5',txt:'MIGRATION (healing)  gap closure · µm/h · D0 → D5'},{t:'1:14.1',txt:'SAFETY  viability · < 70% = cytotoxic · ISO 10993-5',col:PAL.red},{t:'1:15.6',hide:true}]);
T34.follow(4.2,2.15);
K(disc1,show(disc1,'0:58.5','1:02.5',[-0.7,-0.18,2.4],.6));                                   // o cimento de referência (a TELA diz o nome)
K(M.cells,show(M.cells,'1:00.5','1:05.9',[-0.95,-0.2,2.8],.55));                              // as três idades, P1 · P4 · P7 (a família que não está na mesa)
K(M.ars,show(M.ars,'1:12.9','1:15.6',[-0.75,-0.25,2.6],.6,[1]));                             // placa D28 vermelha (não está na mesa)
K(M.heal,show(M.heal,'1:13.5','1:15.6',[0.75,-0.25,2.6],.6,[3]));                            // fenda quase fechada (Q-21: o .glb para em 72 h)

// ---- B5 — o modelo · 1:15–1:29 · parado na maquete: os quatro glifos, as linhas, o leave-one-out, a superfície
const T5=tela(3.2,1.5,PAL.gold,[
  {t:'1:15.6',txt:'HYDRA',st:'h'},{t:'1:18.0',txt:'equal-weight ensemble',st:''},{t:'1:19.6',txt:'GPR · GBR · RF · XGBoost'},{t:'1:24.0',txt:'4 parameters → 4 responses',st:''},
  {t:'1:25.6',txt:'leave-one-out R² · growth 0.90 · mineral 0.86 · healing 0.76 · viability 0.93'},{t:'1:29.2',hide:true}]);
T5.follow(3.2,2.15);
K(M.cells,show(M.cells,'1:24.0','1:25.8',[-0.9,-0.2,2.6],.5,[1]));                           // a quarta entrada (passagem) para a 4ª linha até a maquete

// ---- B6 — a prova da dissociação · 1:29–1:45 · anda até o PAINEL inteiro; o painel é o gráfico (D-308): o par 4 → 23 (só a área do disco muda)
const PNL={w:GEO.painel.campo.w-0.06,h:GEO.painel.campo.y1-GEO.painel.campo.y0-0.06,y:(GEO.painel.campo.y0+GEO.painel.campo.y1)/2,z:GEO.painel.z+GEO.painel.d/2-0.04+0.008};   /* no CAMPO rebaixado do monólito (D-223): campo 2,2 × 2,4 m (y 1,1–3,5), face em painel.z+d/2, rebaixo 4 cm; 3 cm de respiro em cada borda */
/* D-371: tempos REAIS medidos no áudio (N5) — antes eram tempos do E2 convertidos. [CONFIRMAR ±0,3 s no fone] */
const PT={h1:90.35,h2:93.08,h3:94.5,rows:[97.64,99.31,101.05],f1:95.88,f2:103.43,f3:105.0,hi:103.43};
const painel=(()=>{ const c=document.createElement('canvas'); c.width=1280; c.height=Math.round(1280*PNL.h/PNL.w); const x=c.getContext('2d'); const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(PNL.w,PNL.h),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false})); m.position.set(0,PNL.y,PNL.z); m.visible=false; scene.add(m);
  const gA=A.groups.find(g=>g.g===4), gB=A.groups.find(g=>g.g===23);              // o par medido: ATLAS.groups, condições 4 e 23 (ET 24 h · EV 15 mL · CP 4; SA 169 → 219)
  /* linha: [rótulo, unidade, domínio, decimais, seta, t E2 em que a barra cresce]. 1:36.1 ≈ "enhances mineralization" (a frase começa em 1:35.1) */
  const ROWS=[['mineralization','ARS','MINERAL',1,'▲','1:36.1'],['migration','µm/h','HEAL',2,'▼','1:37.5'],['proliferation','WST-1 AUC','PROLIF',2,'=','1:39.5']].map((r,i)=>[...r.slice(0,5),PT.rows[i]]);
  let lastKey='';
  function draw(t){ const key=Math.round(t*20); if(key===lastKey) return; lastKey=key; const W=c.width,H=c.height; x.clearRect(0,0,W,H);
    x.fillStyle='rgba(251,250,246,0.97)'; x.fillRect(0,0,W,H); x.fillStyle=PAL.green; x.fillRect(0,0,W,10);
    const txt=(s,px,col,xx,yy,al='left',w='500',fam='system-ui,sans-serif')=>{ x.font=w+' '+px+'px '+fam; x.fillStyle=col; x.textAlign=al; x.fillText(s,xx,yy); };
    const on=(tt)=>t>=ts(tt);
    /* campo em RETRATO (D-223, 2,14 × 2,34 m → 1280 × ~1400 px): cabeçalho em cima; cada linha com o rótulo por cima das duas barras, que usam a largura toda */
    if(t>=PT.h1) txt('TWO OF THE 25 CONDITIONS',36,PAL.green,60,84,'left','700');
    if(t>=PT.h2) txt('24 h  ·  15 mL  ·  P4  — identical',38,'#0d2a4a',60,146,'left','500','ui-monospace,monospace');
    if(t>=PT.h3) txt('only the disc differs:  169  →  219 mm²',38,'#0d2a4a',60,200,'left','500','ui-monospace,monospace');
    // gráfico: três linhas; em cada uma, duas barras 169 mm² (tinta) e 219 mm² (laranja), normalizadas ao maior valor da linha
    const x0=150, x1=W-230, y0=250, rowH=(H-y0-120)/3, bh=rowH*0.26;
    ROWS.forEach(([lab,unit,key2,dec,arrow,tr],i)=>{ if(t<tr) return; const k=smooth((t-tr)/0.6); const v1=gA[key2], v2=gB[key2];
      const scale=Math.max(v1,v2)*1.15; const yy=y0+i*rowH; const hl=barHi(i,t);
      x.globalAlpha=hl; txt(lab,42,PAL.ink,60,yy+54,'left','600'); x.font='600 42px system-ui,sans-serif'; const lw=x.measureText(lab).width; txt(unit,28,'#4a5a6e',60+lw+22,yy+54);
      if(k>0.95) txt(arrow,56,arrow==='▲'?PAL.green:arrow==='▼'?PAL.red:'#4a5a6e',W-60,yy+60,'right','700');
      [[v1,PAL.ink,'169'],[v2,PAL.gold,'219']].forEach(([v,col,p],j)=>{ const by=yy+84+j*(bh+22); const bw=(x1-x0)*clamp(v/scale,0,1)*k;
        x.fillStyle=col; x.fillRect(x0,by,bw,bh);
        txt(p,28,'#4a5a6e',60,by+bh*0.66); if(k>0.95) txt(v.toFixed(dec),34,'#0d2a4a',x0+bw+16,by+bh*0.68,'left','600','ui-monospace,monospace'); });
      x.globalAlpha=1; });
    x.fillStyle='#d9d4c8'; x.fillRect(60,H-96,W-120,2);
    const foot=t>=PT.f3?'mineralization ↔ proliferation: not correlated (n.s.)':t>=PT.f2?'each readout: its own trajectory':t>=PT.f1?'same cement · same extraction · same cells':'';
    if(foot) txt(foot,34,'#4a5a6e',60,H-44,'left','500');
    tex.needsUpdate=true; }
  /* realce do roteiro: 1:41.5 as três barras, uma a uma, 0,5 s cada */
  function barHi(i,t){ const a=PT.hi; if(t>=a&&t<a+1.6){ const k=Math.floor((t-a)/0.52); return k===i?1:0.4; } return 1; }
  return {m,draw}; })();
/* os objetos de B6 acompanham a visão (a câmera anda de 1:28.4 a 1:36.0) e, parada, ficam numa fileira ABAIXO do campo (y < 1,1 m), a ~2,3 m do olho — o campo fica a 3,1 m e nada o cobre (D-223) */
K(M.discsSA,show(M.discsSA,'1:29.2','1:44.6',[-0.1,-0.74,2.3],1.0,[1,2]));                      // só os dois discos: 169 e 219 mm²
K(M.clocks,show(M.clocks,'1:30.8','1:44.6',[-0.95,-0.78,2.4],.55,[0]));                       // os três que não mudam: 24 h · tubo 15 mL · P4
K(M.falcon,show(M.falcon,'1:31.3','1:44.6',[0.55,-0.72,2.3],.6,[3]));
K(M.cells,show(M.cells,'1:31.8','1:44.6',[1.0,-0.76,2.4],.65,[1]));

// ---- B6-2 · B7 · B8 · B9 — rotunda. Uma folha à frente do plinto; troca de contexto por bloco.
const T6=tela(3.2,1.5,PAL.gold,[
  {t:'1:53.6',txt:'4 responses · 4 drivers',st:'k'},{t:'1:56.4',txt:'PROLIFERATION · MIGRATION   ← cell passage'},{t:'1:59.4',txt:'MINERALIZATION   ← surface area'},
  {t:'2:01.9',txt:'SAFETY   ← elution time (ISO extraction series) · cell passage (these 25 conditions)'},{t:'2:04.4',txt:'no protocol fills all four at once',st:''},
  {t:'2:11.8',clear:true},{t:'2:11.8',txt:'reference cement · any combination of conditions → expected response',st:'k'},{t:'2:22.2',txt:'matches the prediction → explained by the protocol'},
  {t:'2:31.1',txt:'off the prediction → the material\'s own effect'},
  {t:'2:36.8',clear:true},{t:'2:36.8',txt:'2 experimental cements + the reference · 3 new protocols · none in training',st:'k'},{t:'2:43.2',txt:'the model receives only the protocol → the same prediction for every cement'},
  {t:'2:50.6',txt:'PROLIFERATION · external R² 0.87  (mineral 0.85 · healing 0.80)'},{t:'2:58.0',txt:'Exp 1 · below the surface at all three protocols · −2.1 · −2.9 · −4.4 σ',col:PAL.gold},
  {t:'3:03.4',txt:'protocol effect  |  the material\'s own effect',st:'h'},
  {t:'3:12.4',clear:true},{t:'3:12.4',txt:'one reference surface · any testing protocol',st:'k'},{t:'3:18.3',txt:'the material itself  ·  or the testing protocol'},
  {t:'3:29.2',txt:'within the protocol space HYDRA was built on'},{t:'3:34.1',txt:'a foundation for evaluating regenerative materials',st:'h'}]);
const T6m=T6.place(...ahead(P_B67,3.8,2.45), ...eyeOf(P_B67).toArray()); T6m.renderOrder=6;
const models4=row('cube',PAL.gold,['GPR','GBR','RF','XGB'],0.45);
const tess=new Tesseract(CFG.tess); scene.add(tess.group);
/* a MAQUETE sobre a mesa (D-203: a mesma geometria, em escala de mesa) — some da mesa quando o HYDRA cresce no plinto (1:45.0) */
const maq=new Tesseract(CFG.tess); maq.setDomain('PROLIF'); scene.add(maq.group);
const rose=makeRose(); rose.mesh.position.set(...ahead(P_B67,2.4,1.55,1.45));
const iso=makeIsoGrid(); iso.setAlpha(0);    // grade ISO FORA da peça (D-107): fica desligada, não apagada
function haloMesh(color,r=0.09){ const m=new THREE.Mesh(new THREE.RingGeometry(r*0.78,r,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false})); m.renderOrder=5; m.visible=false; return m; }
/* esferas brancas (B7 2:22.2 · 2:31.1 · B9 3:18.3): ILUSTRATIVAS (Q-303) — vivem na ilustração ILL, à frente do espectador */
const WHITE=['mid','early','late'].map((k,i)=>{ const v=(A.atlas.valpts||[]).find(q=>q.mat==='ProRoot'&&q.cond.startsWith(k)); const p=v?[2*v.n.SA-1,2*v.n.ET-1,2*v.n.EV-1,2*v.n.CP-1]:[0,0,0,0];
  const s=new THREE.Mesh(new THREE.SphereGeometry(0.065,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); s.renderOrder=5; s.visible=false; tess.group.add(s);
  const h=haloMesh(PAL.ink,0.12); tess.group.add(h); return {s,h,p}; });
/* B8: três posições de protocolo (early · mid · late, presets da validação) — um halo por posição; anéis nas três esferas do Exp 1 */
const HALOS3=['early','mid','late'].map(()=>{ const h=haloMesh(PAL.teal,0.1); tess.group.add(h); return h; });
const RINGS3=['early','mid','late'].map(()=>{ const r=haloMesh(PAL.gold,0.08); tess.group.add(r); return r; });
const ringW=haloMesh(PAL.gold,0.12); tess.group.add(ringW);
/* B0: dentro do tesserato dormente, uma esfera branca pousa sobre a superfície (0:06.5–0:10.0) */
const B0S=new THREE.Mesh(new THREE.SphereGeometry(0.09,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); B0S.renderOrder=5; B0S.visible=false; tess.group.add(B0S);
/* ---- linhas de luz (feixes): tubo → célula (0) · peças → célula / maquete / HYDRA (1–4) · B8: a linha que percorre as três posições (5–6) ---- */
const BEAMS=[...Array(8)].map(()=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,1,8),new THREE.MeshBasicMaterial({color:PAL.gold,transparent:true,opacity:.7,depthWrite:false,toneMapped:false})); m.visible=false; m.renderOrder=5; scene.add(m); return m; });
const _ba=new THREE.Vector3(), _bb=new THREE.Vector3();
function beamSet(i,a,b,alpha,color){ const m=BEAMS[i]; if(!(alpha>0.01)||!a||!b){ m.visible=false; return; } _ba.copy(a); _bb.copy(b).sub(a); const len=_bb.length(); if(len<1e-4){ m.visible=false; return; }
  m.visible=true; m.position.copy(a).addScaledVector(_bb,0.5); m.scale.set(1,len,1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),_bb.normalize()); m.material.opacity=0.75*alpha; if(color) m.material.color.set(color); }
/* B7/B9: a ilustração "sobre a superfície × acima dela" mora num grupo próprio à frente do espectador (não gira com o cubo) */
const ILL=new THREE.Group(); ILL.visible=false; scene.add(ILL);
const ILL_Y=x=>-0.06*x*x+0.03*x;   // a "superfície prevista": um arco suave
const ILL_SURF=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([-1.2,-0.6,0,0.6,1.2].map(x=>new THREE.Vector3(x,ILL_Y(x),0))),48,0.007,6,false),new THREE.MeshBasicMaterial({color:PAL.teal,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
ILL_SURF.renderOrder=5; ILL.add(ILL_SURF);
const LAB_EXP=new THREE.Mesh(new THREE.PlaneGeometry(.42,.09),new THREE.MeshBasicMaterial({map:textTex('expected',PAL.ink,52),transparent:true,depthWrite:false,opacity:0,toneMapped:false})); LAB_EXP.renderOrder=6; LAB_EXP.visible=false;
[WHITE[0].s,WHITE[0].h,WHITE[2].s,WHITE[2].h,ringW,LAB_EXP].forEach(o=>ILL.add(o));   // saem do cubo para a ilustração de B7/B9
const GLOW=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:PAL.gold,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); GLOW.visible=false; GLOW.renderOrder=5; scene.add(GLOW);
const RUNNER=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,10),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); RUNNER.visible=false; RUNNER.renderOrder=6; tess.group.add(RUNNER);   // B8: o ponto que percorre a superfície
/* B8 2:36.8 — as duas cápsulas "voltam da mesa" (uma cópia; a peça fica na mesa) e ENTRAM no tesserato; somem com as esferas em 3:12.4 */
K(M.caps,[{t:ts('2:36.8')-0.02,...home(M.caps)},{t:'2:36.8',rel:[0,-0.3,2.3],s:.02,stag:.3},{t:'2:37.5',rel:[0,-0.3,2.3],s:.5},{t:'2:38.3',rel:[0,-0.18,2.9],s:.42},{t:'2:39.1',rel:[0,-0.05,3.5],s:.001},{t:ts('2:39.1')+0.05,...home(M.caps)}]);
const TELAS=[T0,T12,T34,T5,T6];
TELAS.forEach((x,i)=>{ x.idx=i; });   // D-323: índice para a chave HYDRA.telas(v,i)
KF.forEach(k=>k.frames.sort((a,b)=>a.t-b.t));

/* poses do HYDRA (dado): [t E2, x,y,z, escala, atividade] — REST dormente sobre o plinto; no silêncio (1:45.0) cresce e envolve o espectador
   que chega (D-211b); em B8 (2:36.8) avança 1 m para as três posições × três esferas caberem no quadro (o espectador fica na pele do cubo);
   recua ao repouso em 3:34.1 */
const REST=[0,GEO.rot.plH+1.0,GEO.rot.z], AROUND=ahead(P_B67,0.9,1.6), FRONT=ahead(P_B67,1.9,1.55);
const TPOSE=[
  ['0:00.0',...REST,0.5,0.12],['1:45.0',...REST,0.5,0.12],['1:50.4',...AROUND,1,1],
  ['2:36.8',...AROUND,1,1],['2:38.8',...FRONT,1,1],
  ['3:34.1',...FRONT,1,1],['3:40.6',...REST,0.5,0.12]
].map(r=>[ts(r[0]),...r.slice(1)]);
function tessPose(t){ let a=TPOSE[TPOSE.length-1], b=a; for(let i=0;i<TPOSE.length-1;i++){ if(t>=TPOSE[i][0]&&t<TPOSE[i+1][0]){ a=TPOSE[i]; b=TPOSE[i+1]; break; } }
  const k=a===b?1:smooth((t-a[0])/(b[0]-a[0])); return {x:lerp(a[1],b[1],k),y:lerp(a[2],b[2],k),z:lerp(a[3],b[3],k),s:lerp(a[4],b[4],k),act:lerp(a[5],b[5],k)}; }
const MAQ=[0,GEO.mesa.h+0.55,MAQ_Z];
/* recolorações v16 (E2 B6-2): PROLIF+HEAL (CP) · MINERAL (SA) · SAFETY (SEM pulso de aresta — nota de build do E2) — D-103: TELA T · recolore T+0,3 · arestas T+0,9 */
const HEADS=[['1:56.4',['PROLIF','HEAL'],'CP'],['1:59.4','MINERAL','SA'],['2:01.9','SAFETY',null]].map(h=>[ts(h[0]),h[1],h[2]]);
/* luzes dos quatro fatores da mesa até a célula (0:35.0) e até a maquete (0:44.5 · 1:24.0) */
const FACTOR_PIECES=[3,5,4];   // d área · f tempo · e volume (a quarta, a passagem, é a célula P4 exibida)

/* =========================  8. TRANSPORTE (relógio monotônico, D-10)  ==== */
const T={_t:0,_playing:true,_speed:1,origin:performance.now(),
  get t(){return this._t;}, set t(v){this._t=((v%TOTAL)+TOTAL)%TOTAL;this.resync();SNAP=true;},
  get playing(){return this._playing;}, set playing(p){this._playing=!!p;this.resync();},
  get speed(){return this._speed;}, set speed(v){this._speed=v;this.resync();},
  resync(){this.origin=performance.now()-this._t*1000/this._speed;},
  tick(now){if(this._playing){const e=Math.max(0,(now-this.origin)/1000*this._speed); this._t=e%TOTAL;}}};

/* ---- A VOZ: os arquivos de 03_MIDIA/audio tocam ESCRAVOS do relógio da peça (D-310).
   Cada pedaço começa em p.start (tempo real, §2). O relógio manda: se o áudio derivar mais de 0,25 s, ele é reposicionado;
   pausa, scrub, velocidade (playbackRate) e free-fly seguem o transporte. O navegador só toca som depois de um gesto:
   o botão "iniciar com som", um clique na cena, o ▶ ou a entrada no VR. ?mudo = sem voz (verificação). ---- */
const AUD={on:false, muted:CFG.mudo, els:AUDIO_PARTS.map(p=>{ const a=new Audio(); a.preload='auto'; a.addEventListener('error',()=>fail('áudio não carregou: '+p.file)); return {p,a}; })};
/* o arquivo vira blob na memória: assim o áudio é "seekable" em qualquer servidor (o http.server do Python não aceita Range e o scrub voltaria ao 0) */
AUD.els.forEach(({p,a})=>{ fetch(CFG.AUDIO+p.file).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.blob(); }).then(b=>{ a.src=URL.createObjectURL(b); }).catch(()=>{ a.src=CFG.AUDIO+p.file; }); });
function audioSync(t){ for(const {p,a} of AUD.els){ const local=t-p.start; const act=AUD.on&&!AUD.muted&&T.playing&&(!fly.on||fly.play)&&local>=0&&local<p.dur-0.04;
    if(act){ if(a.playbackRate!==T.speed) a.playbackRate=T.speed; if(Math.abs(a.currentTime-local)>0.25) a.currentTime=local; if(a.paused) a.play().catch(()=>{}); }
    else if(!a.paused) a.pause(); } }
function startSound(restart){ AUD.on=true; $('snd')?.classList.add('gone'); if(restart) T.t=0; T.playing=true; $('bPlay').textContent='❚❚'; audioSync(T.t); }


/* =========================  9. POSE DA CÂMERA — anda · para · lê (D-305, roteiro v16)  == */
/* O espectador ANDA ao lado da mesa enquanto a voz fala e PARA onde precisa olhar ou ler (D-305). Sem piscadas:
   toda perna é uma caminhada contínua (rampa · velocidade constante · rampa). Tempos: E2 v16 → voz real por ts().
   Lugares: paradas da A (NAVE, ROT). Exceções locais, declaradas na §1 (Q-312): P_MAQ (ao lado da maquete, vê maquete e placas),
   P_PNL (o painel inteiro no quadro) e o passo atrás de B8 (3:11.0, "a câmera recua um passo").
   A perna do silêncio (painel → rotunda, VIA_ROT) tem duração fixa T_WALK_ROT: o silêncio do E2 é esticado até ela caber (§2).
   via: pontos [x,z] da perna que CHEGA à parada. turns: giros do olhar dentro da parada ([t, [x,y,z]]). legLook: giro durante a perna. */
/* D-335 (decisão dele, 23/09): SEM O ROTEIRO GRAVADO. O caminho de câmera pré-definido (STOPS, abaixo) sai de cena:
   quem decide ONDE a pessoa está e QUANDO são só as marcas "ficar aqui" do estúdio (PERC). Sem nenhuma marca, ela
   fica parada na entrada. Antes da 1ª marca fica no lugar da 1ª; depois da última, no lugar da última; entre duas,
   anda em linha reta com a mesma rampa das pernas antigas (22 % acelerando · constante · 22 % freando).
   O olhar, sem mira, aponta para onde ela vai andar (sem movimento à frente: para onde veio; nunca andou: nave
   adentro, −z), um pouco abaixo da horizontal. As miras (MIRA) continuam mandando no olhar como antes.
   STOPS e a pose antiga ficam no arquivo (poseRoteiro) — SEM_ROTEIRO=false devolve o roteiro da v8.0. */
const SEM_ROTEIRO=true;
const LOOK_MAQ=[0,GEO.mesa.h+0.55,MAQ_Z], LOOK_PLACAS=[0,GEO.mesa.h+0.15,(EST[6]+EST[7])/2], LOOK_FAM=[0,GEO.mesa.h+0.2,EST[4]];
const STOPS=[
  {id:'B0 · entrada',              P:P_B0C,   a:'0:00.0', b:'0:10.0'},
  {id:'P1 · estação do eluato',    P:NAVE[2], a:'0:15.5', b:'0:29.1'},                                                       // anda devagar 0:29.1–0:41.9 pelas peças d · f · e
  {id:'P3 · a hipótese',           P:NAVE[5], a:'0:41.9', b:'1:02.5', turns:[['0:41.9',LOOK_MAQ],['0:58.5',LOOK_FAM]]},       // vira para a maquete ao longe; B3: as famílias
  {id:'M · maquete e placas',      P:P_MAQ,   a:'1:11.5', b:'1:28.4', legLook:['1:05.9',LOOK_MAQ], turns:[['1:11.5',LOOK_MAQ],['1:12.3',LOOK_PLACAS],['1:14.8',LOOK_MAQ]]},   // 25 pontos vistos chegando; placas; o modelo
  {id:'B6 · o monólito',           P:P_PNL,   a:'1:36.0', b:'1:45.0', via:[[1.4,GEO.mesa.z1-0.4]]},   // passa pelo pé da mesa (0,5 m de folga) e entra no eixo diante do monólito; chega para a 1ª barra
  {id:'B6-2–B8 · a 4,6 m do plinto',P:P_B67,  a:null,     b:'3:11.0', via:VIA_ROT},                                            // a = fim da caminhada do silêncio (T_WALK_ROT)
  {id:'B9 · um passo atrás',       P:[P_B67[0],P_B67[1]+0.7,P_B67[2],P_B67[3],P_B67[4]], a:'3:12.4', b:null}
];
STOPS.forEach(S=>{ S.a=S.a===null?ts('1:45.0')+T_WALK_ROT:ts(S.a); S.b=S.b===null?TOTAL:ts(S.b); if(S.turns) S.turns=S.turns.map(([tt,p])=>[ts(tt),p]); if(S.legLook) S.legLook=[ts(S.legLook[0]),S.legLook[1]]; });
STOPS.forEach((S,i)=>{ S.idx=i; const Nn=STOPS[i+1]; if(!Nn) return;
  const pts=[[S.P[0],S.P[1]],...(Nn.via||[]),[Nn.P[0],Nn.P[1]]], seg=[], cum=[0]; let L=0;
  for(let k=0;k<pts.length-1;k++){ const d=Math.hypot(pts[k+1][0]-pts[k][0],pts[k+1][1]-pts[k][1]); seg.push(d); L+=d; cum.push(L); }
  const T_=Nn.a-S.b; S.leg={pts,seg,cum,L,T:T_,via:!!Nn.via,peak:T_>0?L/T_/(1-CFG.travelRamp):0,look:Nn.legLook||null};
  if(S.leg.peak>CFG.vmax) console.warn('HYDRA · perna '+S.id+' → '+Nn.id+': pico '+S.leg.peak.toFixed(2)+' m/s acima de '+CFG.vmax); });
/* marcações de trabalho (botão 'guias'): o percurso inteiro, com os desvios — D-335: só se o roteiro gravado estiver ligado */
if(!SEM_ROTEIRO){ const pts=[]; STOPS.forEach(S=>{ if(S.leg) S.leg.pts.forEach(p=>pts.push(new THREE.Vector3(p[0],0.03,p[1]))); });
  guides.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:PAL.gold})));
  STOPS.forEach(S=>{ const m=new THREE.Mesh(new THREE.RingGeometry(0.22,0.3,32),new THREE.MeshBasicMaterial({color:PAL.gold,side:THREE.DoubleSide})); m.rotation.x=-Math.PI/2; m.position.set(S.P[0],0.03,S.P[1]); guides.add(m); }); }

const POSE={pos:new THREE.Vector3(),look:new THREE.Vector3(),u:0,block:B[0],blink:0,side:0,moving:false,speed:0};
let ORIG_ON=false;   // D-328: "original" — comparar com o roteiro sem as marcas, só enquanto está segurado
function stopLook(S,t){ let p=[S.P[2],S.P[4],S.P[3]]; if(S.turns) for(const [tt,q] of S.turns) if(t>=tt) p=q; return p; }
function pathAt(leg,s){ const P=leg.pts, n=P.length-1; for(let k=0;k<n;k++){ if(s<=leg.cum[k+1]||k===n-1){ const u=(s-leg.cum[k])/(leg.seg[k]||1e-6); return [lerp(P[k][0],P[k+1][0],u),lerp(P[k][1],P[k+1][1],u)]; } } return P[n]; }
const trapD=(w,r)=>{ const k=1/(1-r); w=clamp(w,0,1); return w<r? k*w/r : w>1-r? k*(1-w)/r : k; };   // derivada da rampa: velocidade relativa
function poseRoteiro(t,out){
  let side=STOPS.length-1;
  out.moving=false; out.speed=0; out.blink=0; out.jumped=false;
  for(let i=0;i<STOPS.length;i++){ const S=STOPS[i], Nn=STOPS[i+1];
    if(t<=S.b||!Nn){ side=i; out.pos.set(S.P[0],CFG.eyeY,S.P[1]); out.look.set(...stopLook(S,t)); out.u=i; break; }
    if(t<Nn.a){ side=i; const leg=S.leg, wr=(t-S.b)/leg.T, w=trap(wr,CFG.travelRamp), s=w*leg.L; const [x,z]=pathAt(leg,s);
      out.pos.set(x,CFG.eyeY,z); out.moving=true; out.speed=leg.L/leg.T*trapD(wr,CFG.travelRamp); out.u=i+w;
      const l0=stopLook(S,S.b), l1=[Nn.P[2],Nn.P[4],Nn.P[3]];
      if(leg.look&&t>=leg.look[0]) out.look.set(...leg.look[1]);                                            // giro no meio da perna (o teto CFG.yawRate suaviza)
      else if(leg.via){ const ah=pathAt(leg,s+5); const k0=smooth(w/0.25), k1=smooth((w-0.62)/0.38);
        for(let c=0;c<3;c++){ const pa=c===0?ah[0]:c===1?1.5:ah[1]; out.look.setComponent(c,lerp(lerp(l0[c],pa,k0),l1[c],k1)); } }   // olha para onde anda; perto do fim, para o alvo
      else out.look.set(lerp(l0[0],l1[0],w),lerp(l0[1],l1[1],w),lerp(l0[2],l1[2],w));
      break; } }
  out.side=side; return out;
}
/* D-335: a pose só pelas marcas "ficar aqui" (sem roteiro gravado). ORIG_ON ("original") = sem marcas = parado na entrada. */
/* D-336: a POSIÇÃO INICIAL é a mesma do roteiro anterior (B0 · entrada, P_B0C: x 0 · z 0,14, olhando o centro da mesa
   a 1,83 m de altura — exatamente o 1º quadro da v8.0). Ela é uma marca implícita em 0:00: vale sempre, a não ser
   que ele ponha uma marca própria em 0:00. Com ela, a 1ª marca dele é alcançada ANDANDO desde a entrada. */
const INICIO={t:0, x:P_B0C[0], z:P_B0C[1], look:[P_B0C[2],P_B0C[4],P_B0C[3]]};
const percComInicio=()=>{ const L=PERC.list; return (L.length&&L[0].t<0.05)? L : [INICIO,...L]; };
function rumoMarcas(t,L){   // direção [dx,dz] do próximo trecho com deslocamento; senão do último já andado; senão null (= olhar da entrada)
  for(let i=0;i<L.length-1;i++){ const a=L[i], b=L[i+1]; if(b.t<=t) continue; const dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz); if(d>0.02) return [dx/d,dz/d]; }
  for(let i=L.length-2;i>=0;i--){ const a=L[i], b=L[i+1]; if(b.t>t) continue; const dx=b.x-a.x, dz=b.z-a.z, d=Math.hypot(dx,dz); if(d>0.02) return [dx/d,dz/d]; }
  return null; }
function poseMarcas(t,out){ const L=ORIG_ON?[INICIO]:percComInicio(), n=L.length; let x,z, i=-1;
  out.moving=false; out.speed=0; out.blink=0; out.jumped=false; out.side=0;
  if(!n){ x=P_B0C[0]; z=P_B0C[1]; out.u=0; }
  else if(t<=L[0].t){ x=L[0].x; z=L[0].z; out.u=0; }
  else if(t>=L[n-1].t){ x=L[n-1].x; z=L[n-1].z; out.u=n-1; }
  else { i=0; while(i<n-1&&t>=L[i+1].t) i++; const a=L[i], b=L[i+1], D=Math.max(0.01,b.t-a.t), u=(t-a.t)/D, w=trap(u,CFG.travelRamp);
    x=lerp(a.x,b.x,w); z=lerp(a.z,b.z,w); out.u=i+w; const len=Math.hypot(b.x-a.x,b.z-a.z);
    if(len>0.02){ out.moving=true; out.speed=len/D*trapD(u,CFG.travelRamp); } }
  out.pos.set(x,CFG.eyeY,z);
  const h=rumoMarcas(t,L);
  if(h) out.look.set(x+h[0]*6, CFG.eyeY-0.25, z+h[1]*6);
  else if(Math.hypot(x-INICIO.x,z-INICIO.z)<0.02) out.look.set(...INICIO.look);   // parada na entrada, nunca andou: o olhar da entrada
  else out.look.set(x, CFG.eyeY-0.25, z-6);
  return out; }
function pose(t,out){
  const b=blockAt(t);
  if(SEM_ROTEIRO){ if(ORIG_ON) poseMarcas(t,out); else DIR.pose(t,out); } else poseRoteiro(t,out);   // D-337: a direção v9 (paradas + olhares)
  if(!ORIG_ON){
    if(!SEM_ROTEIRO&&PERC.list.length) PERC.aplicar(t,out);    // D-325: os pontos "ficar aqui" mandam no LUGAR (sem roteiro, já mandaram acima)
    if(!SEM_ROTEIRO&&MIRA.list.length) MIRA.aplicar(t,out);    // D-324: as miras antigas só valem com o roteiro gravado (sem ele, os olhares da D-337)
  }
  out.block=b; out.inLoop=false; return out;
}
/* =========================  9b. MIRAS (D-324)  ===========================
   Uma MIRA é "no segundo t, olhe para cá". A peça passa EXATAMENTE por cada mira no seu segundo e, entre duas,
   o giro é contínuo (nada de corte). Antes da primeira e depois da última, o olhar volta ao roteiro numa
   costura de 1,2 s. A POSIÇÃO não muda: mira decide para onde se olha, não por onde se anda.
   Console: HYDRA.mira() grava · HYDRA.miras() lista · HYDRA.mira(false,i) apaga uma · HYDRA.mira(false) apaga todas. */
/* PERCURSO (D-325): cada marca é "neste segundo o espectador está AQUI". Entre duas marcas a peça caminha
   em linha reta com rampa; antes da primeira e depois da última costura com o trilho do roteiro em 1,2 s.
   O espectador final não anda: continua levado: isto é só quem decide para onde. */
const PERC={ list:[], key:'hydra.percurso.v16', BLEND:1.2,
  carregar(){ try{ this.list=JSON.parse(localStorage.getItem(this.key)||'[]'); }catch(e){ this.list=[]; } this.ordena(); },
  salvar(){ try{ localStorage.setItem(this.key,JSON.stringify(this.list)); }catch(e){} },
  ordena(){ this.list.sort((a,b)=>a.t-b.t); },
  add(t){ t=(t===undefined?T.t:t); const p=new THREE.Vector3(); scene.updateMatrixWorld(true); camera.getWorldPosition(p);
    const m={t:+t.toFixed(2), x:+p.x.toFixed(3), z:+p.z.toFixed(3), bloco:blockAt(t).id};
    const i=this.list.findIndex(q=>Math.abs(q.t-t)<0.25); if(i>=0) this.list[i]=m; else this.list.push(m);
    this.ordena(); this.salvar(); if(typeof MIRA!=='undefined'&&MIRA.reindex) MIRA.reindex();   /* o caminho mudou: refazer os pontos de passagem */
    return this.aviso(); },
  /* o que a tela precisa saber: se o trecho cabe no tempo. O número em si vai para o caderno. */
  aviso(){ return this.list.map((m,i)=>{ const n=this.list[i+1]; let vel=null, L=null;
      if(n){ L=Math.hypot(n.x-m.x,n.z-m.z); vel=L/Math.max(0.01,n.t-m.t)/(1-CFG.travelRamp); }
      let cabe=vel===null?true:vel<=CFG.vmax, chegada=null;
      if(i===0&&typeof SEM_ROTEIRO!=='undefined'&&SEM_ROTEIRO&&m.t>=0.05){ const d=Math.hypot(m.x-INICIO.x,m.z-INICIO.z); chegada=+(d/Math.max(0.01,m.t)/(1-CFG.travelRamp)).toFixed(2); if(chegada>CFG.vmax) cabe=false; }   // D-336: da entrada até a 1ª marca
      return {i,t:m.t,x:m.x,z:m.z,bloco:m.bloco,m:L===null?null:+L.toFixed(2),pico:vel===null?null:+vel.toFixed(2),chegada,cabe}; }); },
  aplicar(t,out){ const L=this.list, n=L.length, B=this.BLEND;
    if(t<L[0].t-B||t>L[n-1].t+B) return;
    const px=out.pos.x, pz=out.pos.z;
    if(t<L[0].t){ const k=smooth((t-(L[0].t-B))/B); out.pos.x=lerp(px,L[0].x,k); out.pos.z=lerp(pz,L[0].z,k); return; }
    if(t>=L[n-1].t){ const k=smooth((t-L[n-1].t)/B); out.pos.x=lerp(L[n-1].x,px,k); out.pos.z=lerp(L[n-1].z,pz,k); return; }
    let i=0; while(i<n-1&&t>=L[i+1].t) i++;
    const a=L[i], b=L[i+1], w=smooth((t-a.t)/Math.max(0.01,b.t-a.t));
    out.pos.x=lerp(a.x,b.x,w); out.pos.z=lerp(a.z,b.z,w); } };
PERC.carregar();
const MIRA={ list:[], key:'hydra.miras.v16', BLEND:1.2, DIST:6,
  carregar(){ try{ this.list=JSON.parse(localStorage.getItem(this.key)||'[]'); }catch(e){ this.list=[]; } this.ordena(); },
  salvar(){ try{ localStorage.setItem(this.key,JSON.stringify(this.list)); }catch(e){} },
  ordena(){ this.list.sort((a,b)=>a.t-b.t); },
  atual(){ if(fly.on) return {yaw:fly.yaw,pitch:fly.pitch};
    scene.updateMatrixWorld(true); const e=new THREE.Euler().setFromQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()),'YXZ');
    return {yaw:e.y/DEG, pitch:e.x/DEG}; },
  /* D-327: a mira pode guardar um ALVO (ponto da sala) e um MODO —
     fixo = olha o ponto até a mira seguinte · passar = olha até passar por ele e então vira para o próximo
     · solto = interpola os ângulos, como antes. Sem alvo, é sempre 'solto'. */
  add(t,alvo,modo){ const a=this.atual(); t=(t===undefined?T.t:t);
    const i=this.list.findIndex(m=>Math.abs(m.t-t)<0.25);              // marcar duas vezes quase no mesmo instante CORRIGE a mira
    const m={t:+t.toFixed(2), yaw:+a.yaw.toFixed(2), pitch:+a.pitch.toFixed(2), bloco:blockAt(t).id};
    if(alvo){ m.alvo=[+alvo.x.toFixed(2),+alvo.y.toFixed(2),+alvo.z.toFixed(2)]; m.modo=modo||'fixo'; }
    if(i>=0){ const v=this.list[i]; m.rot=v.rot; m.foto=v.foto; this.list[i]=m; } else this.list.push(m);
    this.ordena(); this.reindex(); this.salvar(); return this.aviso(); },
  /* o instante em que a câmera passa mais perto do alvo: calculado quando a lista muda, não a cada quadro */
  reindex(){ this.calc=true; const tmp={pos:new THREE.Vector3(),look:new THREE.Vector3(),u:0,block:B[0],blink:0,side:0,moving:false,speed:0};
    this.list.forEach((m,i)=>{ m._tp=null; if(m.modo!=='passar'||!m.alvo) return; const n=this.list[i+1]; if(!n) return;
      let melhor=1e9, tp=m.t;
      for(let k=0;k<=24;k++){ const tt=m.t+(n.t-m.t)*k/24; pose(tt,tmp);
        const d=Math.hypot(tmp.pos.x-m.alvo[0],tmp.pos.z-m.alvo[2]); if(d<melhor){ melhor=d; tp=tt; } }
      m._tp=tp; }); this.calc=false; },
  /* quanto a câmera teria de girar por segundo entre miras vizinhas: acima de CFG.yawRate enjoa no headset */
  aviso(){ const out=this.list.map((m,i)=>{ const n=this.list[i+1]; let vel=null;
      if(n){ const d=Math.abs(((n.yaw-m.yaw+180)%360+360)%360-180), dt=Math.max(0.01,n.t-m.t); vel=+(d/dt).toFixed(1); }
      const mm=Math.floor(m.t/60), ss=(m.t%60).toFixed(1).padStart(4,'0');
      return {i, t:mm+':'+ss, bloco:m.bloco, yaw:m.yaw, pitch:m.pitch, ateProxima:vel===null?'—':vel+'°/s'+(vel>CFG.yawRate?'  ⚠ acima de '+CFG.yawRate:'')}; });
    return out; },
  alvo(m,out){ const yr=m.yaw*DEG, pr=m.pitch*DEG, d=this.DIST;
    out.look.set(out.pos.x-Math.sin(yr)*Math.cos(pr)*d, out.pos.y+Math.sin(pr)*d, out.pos.z-Math.cos(yr)*Math.cos(pr)*d); },
  mix(a,b,k,out){ const m={yaw:alerp(a.yaw*DEG,b.yaw*DEG,k)/DEG, pitch:lerp(a.pitch,b.pitch,k)}; this.alvo(m,out); },
  /* ângulo do olhar do ROTEIRO neste instante, para costurar a entrada e a saída das miras */
  doRoteiro(out){ const dx=out.look.x-out.pos.x, dy=out.look.y-out.pos.y, dz=out.look.z-out.pos.z, hz=Math.hypot(dx,dz);
    return {yaw:Math.atan2(-dx,-dz)/DEG, pitch:Math.atan2(dy,hz)/DEG}; },
  /* ângulo que aponta de `pos` para um alvo do mundo */
  angDe(alvo,pos){ const dx=alvo[0]-pos.x, dy=alvo[1]-pos.y, dz=alvo[2]-pos.z, hz=Math.hypot(dx,dz);
    return {yaw:Math.atan2(-dx,-dz)/DEG, pitch:Math.atan2(dy,hz)/DEG}; },
  /* o que ESTA mira pede agora: com alvo, aponta para ele de onde a câmera está; sem alvo, o ângulo gravado */
  angDaMira(m,out){ return m.alvo? this.angDe(m.alvo,out.pos) : {yaw:m.yaw,pitch:m.pitch}; },
  aplicar(t,out){ if(this.calc) return; const L=this.list, n=L.length, B=this.BLEND, VIRA=0.9;
    if(t<L[0].t-B||t>L[n-1].t+B) return;                                  // fora do trecho marcado, manda o roteiro
    if(t<L[0].t){ const k=smooth((t-(L[0].t-B))/B); this.mix(this.doRoteiro(out),this.angDaMira(L[0],out),k,out); return; }
    if(t>=L[n-1].t){ const k=smooth((t-L[n-1].t)/B); this.mix(this.angDaMira(L[n-1],out),this.doRoteiro(out),k,out); return; }
    let i=0; while(i<n-1&&t>=L[i+1].t) i++;
    const a=L[i], b=L[i+1], A=this.angDaMira(a,out), Bq=this.angDaMira(b,out);
    if(a.alvo&&a.modo==='fixo'){                                 /* segura o alvo e vira só ao entrar na próxima mira */
      this.mix(A,Bq,clamp(smooth((t-(b.t-VIRA))/VIRA),0,1),out); return; }
    if(a.alvo&&a.modo==='passar'){                               /* segura até passar pelo ponto, aí vira para o próximo */
      const tp=(a._tp===null||a._tp===undefined)?(a.t+b.t)/2:a._tp;
      this.mix(A,Bq,clamp(smooth((t-tp)/VIRA),0,1),out); return; }
    this.mix(A,Bq,smooth((t-a.t)/Math.max(0.01,b.t-a.t)),out); } };
MIRA.calc=false; MIRA.carregar();
/* =========================  9c. DIREÇÃO v9 (D-337)  ==========================
   Duas trilhas independentes, como ele pediu (23/09):
   LUGAR — uma sequência de PARADAS {x,z, chega, sai}. P0 é a entrada (D-336, fixa). Ele marca os lugares antes
     (na planta) e depois, ouvindo a narração, diz "começa a andar" (= `sai` da parada em que está). A caminhada
     até a próxima é reta, com a rampa de sempre (22 % acelera · constante · 22 % freia), e chega sozinha na
     velocidade padrão VPADRAO — a menos que ele marque "chega aqui" (`chega` explícito), que então define a
     velocidade. Toda caminhada tem distância, tempo e velocidade explícitos; pico acima de VAMBAR = amarelo,
     acima de CFG.vmax = vermelho (números provisórios até o teste no Quest — trilha Q).
   OLHAR — blocos {de, até, alvo:[x,y,z]} por cima de qualquer trecho, inclusive de uma caminhada. Começa a virar
     em `de`, volta em `até` (curvas de TRANS s; o giro na tela ainda obedece o teto de conforto CFG.yawRate).
     Fora dos blocos: olha para onde vai andar (parado: para a próxima parada; sem nenhuma: o olhar da entrada).
   As marcas antigas (D-325 "ficar aqui" em instantes, D-324/D-327 miras) são convertidas uma vez, na 1ª carga. */
let DIR_ARQ=null; try{ const r=await fetch('data/direcao.json',{cache:'no-store'}); if(r.ok) DIR_ARQ=await r.json(); }catch(e){}   // D-338
const DIR={ key:'hydra.direcao.v9', paradas:[], olhares:[], cenas:[], VPADRAO:0.7, VAMBAR:1.0, TRANS:0.8, _ag:null, _agKey:'',
  id(){ return Math.random().toString(36).slice(2,8); },
  /* D-338: a direção também vem num ARQUIVO da peça (data/direcao.json) — é o que o Quest usa (lá não há o navegador dele)
     e é como a M entrega uma passada. Arquivo com `rev` nova = substitui a do navegador (a anterior fica guardada em
     'hydra.direcao.v9.backup'); mesma `rev` = vale o que ele editou no navegador. */
  carregar(){ let d=null; try{ d=JSON.parse(localStorage.getItem(this.key)||'null'); }catch(e){}
    const A=DIR_ARQ; let vista=null; try{ vista=localStorage.getItem(this.key+'.rev'); }catch(e){}
    if(A&&Array.isArray(A.paradas)&&(A.rev!==vista||!d)){
      try{ if(d) localStorage.setItem(this.key+'.backup',JSON.stringify(d)); localStorage.setItem(this.key+'.rev',A.rev||''); }catch(e){}
      this.paradas=JSON.parse(JSON.stringify(A.paradas)); this.olhares=JSON.parse(JSON.stringify(A.olhares||[])); this.cenas=JSON.parse(JSON.stringify(A.cenas||[])); this.entrada(); this.salvar(); this.textos(A); return; }
    if(d&&Array.isArray(d.paradas)){ this.paradas=d.paradas; this.olhares=Array.isArray(d.olhares)?d.olhares:[]; this.cenas=Array.isArray(d.cenas)?d.cenas:[]; this.entrada(); this.normOlhares(); this.textos(A); }
    else this.migrar(); },
  /* D-356 (regra dele): a nota de cada item na timeline é sempre o PROMPT FINAL do que está montado — não a instrução
     original dele nem anotações [M, …]. A M reescreve os textos em direcao.json → `textos` {cenas,paradas,olhares: {id: texto}}
     com `textosRev` nova. Isso troca SÓ os textos (por id) no que está no navegador dele — horários, lugares e alvos
     que ele editou ficam intactos (diferente de `rev`, que substitui tudo). */
  textos(A){ if(!A||!A.textos||!A.textosRev) return; let vista=null; try{ vista=localStorage.getItem(this.key+'.textosRev'); }catch(e){}
    if(vista===A.textosRev) return; const T_=A.textos;
    for(const [lista,campo,mapa] of [[this.cenas,'texto',T_.cenas],[this.paradas,'nome',T_.paradas],[this.olhares,'nome',T_.olhares]])
      if(mapa) for(const it of lista) if(mapa[it.id]!=null) it[campo]=mapa[it.id];
    /* D-387: paradas removidas / ajustadas pela M (por id), a pedido dele — o resto das paradas fica como ele deixou */
    if(T_.paradasRemover) this.paradas=this.paradas.filter(p=>!T_.paradasRemover.includes(p.id));
    /* D-515: paradas NOVAS da M (ex.: pontos de passagem), inseridas logo depois da parada `depois`, se o id ainda não existe */
    if(Array.isArray(T_.paradasNovas)) for(const nv of T_.paradasNovas){ if(this.paradas.some(x=>x.id===nv.id)) continue; const k=this.paradas.findIndex(x=>x.id===nv.depois); const it=JSON.parse(JSON.stringify(nv)); delete it.depois; if(k>=0) this.paradas.splice(k+1,0,it); }
    if(T_.paradasAjuste) for(const p of this.paradas){ const aj=T_.paradasAjuste[p.id]; if(aj) Object.assign(p,aj); }
    if(T_.cenasAjuste) for(const c of this.cenas){ const aj=T_.cenasAjuste[c.id]; if(aj) Object.assign(c,aj); }   /* D-390: horários de cena corrigidos pela M (sobreposições) */
    /* D-380: alvos de olhar revistos pela M (por id) — só o alvo muda; horários ficam os dele */
    if(T_.alvos) for(const it of this.olhares) if(T_.alvos[it.id]){ it.alvo=T_.alvos[it.id].slice(); it.tipo='ponto'; }
    /* D-363: itens NOVOS que a M entrega (ex.: um bloco de olhar para uma cena) entram se o id ainda não existe — sem tocar nos dele */
    const N_=A.novos||{}; for(const [lista,arr] of [[this.olhares,N_.olhares],[this.cenas,N_.cenas]]) if(Array.isArray(arr)) for(const it of arr) if(!lista.some(x=>x.id===it.id)) lista.push(JSON.parse(JSON.stringify(it)));
    /* D-398: horários/alvos de blocos de olhar revistos pela M (por id), depois dos novos — como paradasAjuste/cenasAjuste */
    if(T_.olharesAjuste) for(const it of this.olhares){ const aj=T_.olharesAjuste[it.id]; if(aj){ Object.assign(it,JSON.parse(JSON.stringify(aj))); if(aj.alvo) it.tipo='ponto'; } }
    try{ localStorage.setItem(this.key+'.textosRev',A.textosRev); }catch(e){} this.salvar(); },
  salvar(){ this._ag=null; this.normOlhares(); try{ localStorage.setItem(this.key,JSON.stringify({v:9,paradas:this.paradas,olhares:this.olhares,cenas:this.cenas})); }catch(e){} },
  entrada(){ let p0=this.paradas[0]; if(!p0||!p0.fixo){ p0={id:'P0',fixo:true,nome:'entrada',x:0,z:0,chega:0,sai:null}; this.paradas.unshift(p0); }
    p0.x=INICIO.x; p0.z=INICIO.z; p0.chega=0; },
  migrar(){ this.paradas=[]; this.olhares=[]; let perc=[], miras=[];
    try{ perc=JSON.parse(localStorage.getItem('hydra.percurso.v16')||'[]'); miras=JSON.parse(localStorage.getItem('hydra.miras.v16')||'[]'); }catch(e){}
    perc.sort((a,b)=>a.t-b.t); miras.sort((a,b)=>a.t-b.t); this.entrada();
    const p0=this.paradas[0], g=[];
    perc.forEach(m=>{ const u=g[g.length-1];                                   // pontos seguidos no mesmo lugar = uma parada
      if(u&&Math.hypot(u.x-m.x,u.z-m.z)<0.1){ u.sai=m.t; if(m.rot) u.nome=(u.nome?u.nome+' / ':'')+m.rot; }
      else g.push({id:this.id(),x:m.x,z:m.z,chega:m.t,sai:m.t,nome:m.rot||''}); });
    if(g.length&&Math.hypot(g[0].x-p0.x,g[0].z-p0.z)<0.1&&g[0].chega<0.05){ p0.sai=g[0].sai; g.shift(); }
    else if(g.length) p0.sai=0;                                                  // D-336: saía da entrada em 0:00
    g.forEach(p=>this.paradas.push(p));
    const o=[]; miras.forEach(m=>{ if(!m.alvo) return; const u=o[o.length-1];  // miras seguidas no mesmo alvo = um bloco
      if(u&&u.alvo.every((v,i)=>Math.abs(v-m.alvo[i])<0.01)){ u.ate=m.t; if(m.rot) u.nome=(u.nome?u.nome+' / ':'')+m.rot; }
      else o.push({id:this.id(),de:m.t,ate:null,alvo:m.alvo.slice(),nome:m.rot||''}); });
    o.forEach(b=>{ if(b.ate===null||b.ate<=b.de) b.ate=+(b.de+2).toFixed(2); });
    this.olhares=o; this.salvar(); },
  /* o horário efetivo de tudo: chega/sai de cada parada e a caminhada que SAI dela (anda) */
  /* D-348: campo opcional `y` em cada parada — desnível (m) somado a CFG.eyeY, para trilhos que sobem
     (ex.: a rampa em espiral da rotunda). Ausente/0 = comportamento de sempre (chão plano). A distância
     `L` já soma o desnível (3-D: Math.hypot aceita 3 eixos), então o ritmo do passo continua honesto numa
     subida em vez de medir só a projeção no chão. */
  agenda(){ const key=JSON.stringify(this.paradas); if(this._ag&&this._agKey===key) return this._ag;
    const P=this.paradas, A=[];
    for(let k=0;k<P.length;k++){ const p=P[k], a={k,p,x:p.x,z:p.z,y:p.y||0,chega:null,sai:null,anda:null,erro:null};
      if(k===0) a.chega=0;
      else { const q=A[k-1];
        if(q.chega!==null&&q.sai!==null){ const L=Math.hypot(p.x-q.x,p.z-q.z,(p.y||0)-q.y), auto=(p.chega==null);
          const ate=auto? q.sai+L/this.VPADRAO : p.chega, T_=ate-q.sai, v=T_>0.05?L/T_:Infinity, pico=v/(1-CFG.travelRamp);
          const st=T_<=0.05?'erro':pico>CFG.vmax?'vermelho':pico>this.VAMBAR?'amarelo':'ok';
          a.chega=Math.max(ate,q.sai); q.anda={de:q.sai,ate:a.chega,L,T:Math.max(T_,0),v,pico,st,auto}; } }
      if(a.chega!==null&&p.sai!=null){ a.sai=Math.max(p.sai,a.chega); if(p.sai<a.chega-0.05) a.erro='sai antes de chegar'; }
      A.push(a); }
    this._ag=A; this._agKey=key; return A; },
  /* em que parada a pessoa está em t (ou de qual está saindo, se anda) */
  onde(t){ const A=this.agenda(); let r={k:0,anda:false};
    for(let k=0;k<A.length;k++){ const a=A[k]; if(a.chega===null) break;
      if(t<a.chega){ r={k:k-1,anda:true}; break; } r={k,anda:false}; if(a.sai===null||t<=a.sai) break; }
    return r; },
  rumo(A,cur){ for(let k=cur;k<A.length-1;k++){ const dx=A[k+1].x-A[k].x, dz=A[k+1].z-A[k].z; if(Math.hypot(dx,dz)>0.02) return [dx,dz]; }
    for(let k=cur;k>0;k--){ const dx=A[k].x-A[k-1].x, dz=A[k].z-A[k-1].z; if(Math.hypot(dx,dz)>0.02) return [dx,dz]; }
    return null; },
  virar(A,kd,d,t,tChega,durLeg){ const a=A[kd]; if(!a||a.sai==null||!(durLeg>0)) return d; const dO=this.rumo(A,kd); if(!dO) return d;
    const yI=Math.atan2(d[0],d[1]), yO=Math.atan2(dO[0],dO[1]), ang=Math.abs(alerp(yI,yO,1)-yI)/DEG; if(ang<1) return d;
    const Tv=Math.max(0.05,Math.min(durLeg*0.6,Math.max(1.5,ang/30))), w=smooth((t-(tChega-Tv))/Tv); if(w<=0) return d;
    const y=alerp(yI,yO,w); return [Math.sin(y),Math.cos(y)]; },
  pose(t,out){ const A=this.agenda(); let x=A[0].x, z=A[0].z, y=A[0].y||0, d=null, cur=0;
    out.moving=false; out.speed=0; out.blink=0; out.jumped=false; out.side=0;
    for(let k=0;k<A.length;k++){ const a=A[k]; if(a.chega===null) break;
      if(t<a.chega){ const q=A[k-1], w0=q.anda;
        /* D-366: "trem mudando de trilho" — cada perna tinha a sua rampa (freia a ZERO e vira seco em cada parada de passagem,
           como a m4b da quina da mesa e os pontos da rampa em espiral). Agora as paradas de passagem (fica 0 s) se juntam num
           só TRAJETO: uma curva suave (B-spline quadrática, os pontos de passagem como controle), percorrida por comprimento de arco, com UMA
           rampa de saída na parada real anterior e UMA de chegada na próxima parada real. A direção de olhar é a tangente. */
        const pas=this.passagem(A,k);
        if(pas){ const T_=pas.t1-pas.t0, sN=T_>0?clamp((t-pas.t0)/T_,0,1):1, w=trap(sN,CFG.travelRamp), P=pas.curva.getPointAt(w), tg=pas.curva.getTangentAt(Math.min(w,0.999));
          x=P.x; z=P.z; y=P.y; out.moving=true; out.speed=T_>0?pas.L/T_*trapD(sN,CFG.travelRamp):0; d=this.virar(A,pas.i1,[tg.x,tg.z],t,pas.t1,T_); cur=pas.i0; out.u=pas.i0+w*(pas.i1-pas.i0); break; }
        const s=w0.T>0?clamp((t-w0.de)/w0.T,0,1):1, w=trap(s,CFG.travelRamp);
        x=lerp(q.x,a.x,w); z=lerp(q.z,a.z,w); y=lerp(q.y||0,a.y||0,w); out.moving=w0.L>0.02; out.speed=w0.T>0?w0.L/w0.T*trapD(s,CFG.travelRamp):0;
        d=this.virar(A,k,[a.x-q.x,a.z-q.z],t,a.chega,w0.T); cur=k-1; out.u=k-1+w; break; }
      x=a.x; z=a.z; y=a.y||0; cur=k; out.u=k; if(a.sai===null||t<=a.sai) break; }
    /* D-367 (rev.): ao chegar numa parada real, a cabeça não pula mais para a próxima perna (era o salto de 33° em m1, m6, m7):
       vira DURANTE o fim da caminhada, nos últimos ≥1,5 s (~30°/s médio, até 60% da perna) — chega já olhando para onde vai
       e, parado, continua olhando para lá (como sempre foi). */
    if(!d||Math.hypot(d[0],d[1])<0.02) d=this.rumo(A,cur);
    out.pos.set(x,CFG.eyeY+y,z);
    if(d){ const n=Math.hypot(d[0],d[1]); out.look.set(x+d[0]/n*6,CFG.eyeY-0.25,z+d[1]/n*6); } else out.look.set(...INICIO.look);
    this.olhar(t,out); return out; },
  /* D-366: o trajeto que contém a perna (k-1 → k): estende para trás e para a frente enquanto houver paradas de passagem
     (chega == sai, ou seja, fica 0 s). null se a perna é isolada (sem passagem nas pontas) — aí vale a perna reta de antes. */
  passagem(A,k){ const pas0=j=>j>0&&j<A.length-1&&A[j].chega!==null&&A[j].sai!==null&&Math.abs(A[j].sai-A[j].chega)<0.05;
    let i0=k-1, i1=k; while(pas0(i0)) i0--; while(pas0(i1)&&A[i1+1]&&A[i1+1].chega!==null) i1++;
    if(i1-i0<2) return null;
    const key=i0+':'+i1+':'+A.slice(i0,i1+1).map(a=>a.x+','+a.z+','+(a.y||0)).join('|'); this._pas=this._pas||{};
    if(!this._pas[key]){ const P=A.slice(i0,i1+1).map(a=>new THREE.Vector3(a.x,a.y||0,a.z)), n=P.length-1, M_=(i)=>P[i].clone().add(P[i+1]).multiplyScalar(0.5);
      /* B-spline quadrática: as paradas de passagem são PONTOS DE CONTROLE — a curva sai da parada real, arredonda cada canto
         (não passa pelo vértice, corta por dentro) e chega na próxima parada real; tangente contínua, sem "trem mudando de trilho" */
      const curva=new THREE.CurvePath(); if(n===2) curva.add(new THREE.QuadraticBezierCurve3(P[0],P[1],P[2]));
      else { curva.add(new THREE.QuadraticBezierCurve3(P[0],P[1],M_(1))); for(let i=2;i<n-1;i++) curva.add(new THREE.QuadraticBezierCurve3(M_(i-1),P[i],M_(i))); curva.add(new THREE.QuadraticBezierCurve3(M_(n-2),P[n-1],P[n])); }
      this._pas[key]={curva,L:curva.getLength(),i0,i1}; }
    const r=this._pas[key]; return {...r,t0:A[i0].sai,t1:A[i1].chega}; },
  /* D-367 — a trilha OLHAR fica SEMPRE PREENCHIDA (pedido dele): não existe mais "sem bloco = olha para onde anda escondido".
     Cada bloco vai do seu `de` até o `de` do próximo; o que era o vazio vira um bloco visível do tipo "anda". Tipos:
       ponto     — olha um ponto do espaço (alvo), modo "fixo" ou "passa" (até passar do ponto, D-353)
       anda      — olha para onde anda, na altura do olho (levemente para baixo, −3°)
       horizonte — uma direção fixa (yaw), nivelada
       mesa      — o tampo da mesa à frente de quem anda
     Toda divisa é uma transição suave (campo `trans`, s; padrão 1,5) de direção E altura — não há mais volta seca ao
     "padrão" quando um bloco acaba (era o pulo da vista na chegada ao monólito). */
  TRANS_PADRAO:1.5,
  normOlhares(){ let O=this.olhares.filter(o=>o&&typeof o.de==='number').sort((a,b)=>a.de-b.de);
    O.forEach(o=>{ if(!o.tipo) o.tipo=(o.alvo?'ponto':'anda'); if(!o.id) o.id=this.id(); });
    const novo=(de,ate)=>({id:this.id(),tipo:'anda',de:+de.toFixed(2),ate,nome:'para onde anda',auto:true});
    const R=[]; if(!O.length||O[0].de>0.05) R.push(novo(0,O.length?O[0].de:null));
    O.forEach((o,k)=>{ const n=O[k+1]; if(R.length&&R[R.length-1].ate!=null&&R[R.length-1].ate<o.de-0.05) R.push(novo(R[R.length-1].ate,o.de));
      if(R.length) R[R.length-1].ate=o.de; R.push(o);
      if(n){ if(o.ate==null||o.ate>n.de) o.ate=n.de; } else if(o.ate!=null&&o.ate<TOTAL-0.05){ R.push(novo(o.ate,null)); } else o.ate=null; });
    /* um "para onde anda" automático curtinho (<0,3 s) entre dois blocos é sobra de arredondamento: sai, e o anterior se estende */
    for(let i=R.length-2;i>=1;i--){ const o=R[i]; if(o.tipo==='anda'&&(o.auto||o.nome==='para onde anda')&&o.ate!=null&&o.ate-o.de<0.3){ R[i-1].ate=R[i+1].de; R.splice(i,1); } }
    if(R.length) R[R.length-1].ate=null; this.olhares=R; },
  angBloco(o,t,out,base){
    if(o.tipo==='anda') return {yaw:base.yaw, pitch:-3};
    if(o.tipo==='horizonte') return {yaw:o.yaw??base.yaw, pitch:0};
    if(o.tipo==='mesa'){ const z=clamp(out.pos.z-2.2,GEO.mesa.z1+0.3,GEO.mesa.z0-0.3); return MIRA.angDe([clamp(out.pos.x*0.3,-0.5,0.5),GEO.mesa.h+0.05,z],out.pos); }
    const g=MIRA.angDe(o.alvo||[0,CFG.eyeY,out.pos.z-5],out.pos);
    if(o.modo==='passa'){ const dy=Math.abs(((g.yaw-base.yaw)%360+540)%360-180), w=1-smooth((dy-70)/40); return {yaw:alerp(base.yaw*DEG,g.yaw*DEG,w)/DEG, pitch:lerp(-3,g.pitch,w)}; }
    return g; },
  olhar(t,out){ const O=this.olhares; if(!O.length) return;
    const base=MIRA.doRoteiro(out); let k=0; for(let i=0;i<O.length;i++){ if(O[i].de<=t+1e-6) k=i; else break; }
    const o=O[k], a=this.angBloco(o,t,out,base);
    let r=a; if(k>0){ const len=((o.ate??TOTAL)-o.de), Tr=Math.max(0.05,Math.min(o.trans??this.TRANS_PADRAO,len*0.8)), w=smooth((t-o.de)/Tr);
      if(w<1){ const p=this.angBloco(O[k-1],t,out,base); r={yaw:alerp(p.yaw*DEG,a.yaw*DEG,w)/DEG, pitch:lerp(p.pitch,a.pitch,w)}; } }
    MIRA.alvo(r,out); } };
DIR.carregar();
/* D-329: NOTAS mora aqui (escopo do módulo), não dentro do bloco `if(CFG.estudio)` — senão o caderno
   (função briefingMD, chamada fora desse bloco) nunca enxergaria a lista, por escopo de bloco do JS */
const NOTAS={ list:[], key:'hydra.notas.estudio.v16',
  carregar(){ try{ this.list=JSON.parse(localStorage.getItem(this.key)||'[]'); }catch(e){ this.list=[]; } },
  salvar(){ try{ localStorage.setItem(this.key,JSON.stringify(this.list)); }catch(e){} } };
NOTAS.carregar();
/* camFrame: o referencial em que os objetos são apresentados.
   Desktop = a câmera (o que você vê). VR = o RIG (para onde a peça aponta), porque a cabeça é livre:
   objetos no FOCO têm de ficar onde o roteiro põe, não colados no olhar de quem virou a cabeça.
   `eye` é sempre a cabeça de verdade — é para ela que os rótulos se viram.                        */
function camFrame(){ const eye=new THREE.Vector3(); camera.getWorldPosition(eye); let f,o;
  if(renderer.xr.isPresenting){ f=new THREE.Vector3(0,0,-1).applyQuaternion(rig.quaternion); o=new THREE.Vector3(rig.position.x,rig.position.y+(XRH0??CFG.eyeY),rig.position.z); }   /* D-526: era rig.y + 1,60 — com o rig já descontando a altura real, os objetos subiam (1,60 − altura medida) */
  else { f=new THREE.Vector3(); camera.getWorldDirection(f); o=eye.clone(); }
  const up=new THREE.Vector3(0,1,0); const r=new THREE.Vector3().crossVectors(f,up).normalize(); const u=new THREE.Vector3().crossVectors(r,f).normalize();
  return {o,eye,f,r,u,yaw:Math.atan2(-f.x,-f.z)}; }
/* D-526 ("os itens da primeira parte estão muito altos"; pessoa em pé de 1,70 m → olho ≈ 1,60): tudo que é apresentado no referencial da
   câmera desce 0,25 m — os centros ficam perto da linha do olho ou abaixo, e o topo fica no máximo ~15° acima dela */
const APRES_DY=-0.25; let APRES_K=1;   /* a hipótese (P2, colada na mesa, já abaixo do olho) fica como estava: descer a enfiava na borda da mesa */
function resolve(fr,cf){ if(fr.p) return new THREE.Vector3(fr.p[0],fr.p[1],fr.p[2]); const [dx,dy,dz]=fr.rel; return cf.o.clone().addScaledVector(cf.r,dx).addScaledVector(cf.u,dy+APRES_DY*APRES_K).addScaledVector(cf.f,dz); }
/* D-530: a descida da D-526 vale só para o que estava alto de fato (tubos da abertura, cápsula da c2, modelos de B5). A c3, a hipótese e o
   B3-4 voltam às posições de antes ("por muito tempo eu não reclamei da altura dessa parte"). Isenção por OBJETO, não por janela de tempo. */
const APRES_ISENTO=new Set([M.c3disc,M.c3tempo,M.c3vol,M.c3cel,M.c3curvas,M.hpCap,M.hpD14,M.hpD31,M.b34cel,M.b34clk,M.b34disc,M.b34p28,M.b34p7,M.b34p72,M.b34ref,M.b34saf,M.b34vol].filter(Boolean));
function applyKF(t,dt){ const cf=camFrame(); const ease=SNAP?1:1-Math.exp(-dt*6); SNAP=false;
  for(const {obj,frames} of KF){ const f0=frames[0]; const pi=PIECE_OF.get(obj), piece=pi===undefined?null:PIECES[pi];
    if(t<f0.t){ obj.visible=false; if(piece) piece.visible=true; continue; }
    let a=frames[frames.length-1], b=a, k=1;
    for(let i=0;i<frames.length-1;i++){ if(t>=frames[i].t&&t<frames[i+1].t){a=frames[i];b=frames[i+1];k=smooth((t-a.t)/(b.t-a.t));break;} }
    /* em casa (D-211): a cópia animada some e a peça da mesa (módulo da A) aparece; fora de casa, o contrário */
    if(a.home&&b.home){ obj.visible=false; if(piece) piece.visible=true; continue; }
    if(piece) piece.visible=false;
    const wasHidden=!obj.visible; obj.visible=true;
    APRES_K=APRES_ISENTO.has(obj)?0:1; const pa=resolve(a,cf), pb=resolve(b,cf); APRES_K=1; obj.position.lerpVectors(pa,pb,k); obj.scale.setScalar(lerp(a.s??1,b.s??1,k));
    /* D-331: pousado (a e b são o mesmo quadro `still`, sem próxima chave) — para de girar de vez, fica como está */
    if(!(a.still&&b.still)){
      const relW=(a.rel?1-k:0)+(b.rel?k:0); const ud=obj.userData; ud.spinYaw=(ud.spinYaw||0)+0.25*dt;
      const target=FACE_VIEWER.has(obj)?Math.atan2(cf.eye.x-obj.position.x,cf.eye.z-obj.position.z)+0.08*Math.sin(t*0.7+obj.id):alerp(ud.spinYaw,cf.yaw+0.2*Math.sin(t*0.7+obj.id),relW); obj.rotation.y=(ud.init&&!wasHidden)?alerp(obj.rotation.y,target,ease):target; ud.init=true;
    }
    const st=[...frames].reverse().find(f=>f.stag&&f.t<=t); const only=(k<0.5?a:b).only;
    if(obj.children.length>1){ obj.children.forEach((ch,i)=>{ let pop=1; if(st) pop=smooth((t-(st.t+i*st.stag))/0.6); if(only&&!only.includes(i)) pop=0; ch.visible=pop>0; ch.scale.setScalar(Math.max(0.001,pop)); }); }
    obj.traverse(o=>{ if(o.userData.label) o.userData.label.lookAt(cf.eye); });
  } }
/* D-528 (mesaFolga) SAIU na D-530: empurrava a peça PARA CIMA ao entrar sobre a mesa — "é POUSAR na mesa, não subir para a mesa". */


/* =========================  10. FREE-FLY  ================================ */
const fly={on:false,yaw:0,pitch:0,pos:new THREE.Vector3(),keys:new Set(),wasPlaying:true,ret:0,from:null,spd:1,play:false,hold:false};
/* a faixa do free-fly diz onde você está em relação à peça e o que dá para fazer daqui (D-317) */
function flyInfo(){ const d=fly.pos.distanceTo(POSE.pos);
  if(fly.hold){ $('ff').innerHTML='FREE-FLY <b>CONGELADO</b> — a vista está travada; o mouse é seu (menu, registrar, escrever). <b>Enter</b> ou <b>clique na cena</b> volta a voar · <b>P</b> '+(fly.play?'pausa':'deixa correr daqui')+' · <b>G</b> vai à câmera da peça · <b>F</b> devolve à peça'; return; }
  /* D-328: no estúdio, G e R fazem outra coisa (ou nada) — o texto do HUD tem de dizer a verdade em cada modo */
  const reg=CFG.estudio?'':' · <b>R</b> registra';
  const gTxt=CFG.estudio?'vai à sugestão mais próxima':'volta à câmera da peça (<b>'+d.toFixed(1)+' m</b>)';
  $('ff').innerHTML='FREE-FLY — <b>WASD</b> · <b>E/Q</b> ou <b>roda do mouse</b> sobe/desce · mouse · <b>Shift</b> corre · velocidade <b>'+fly.spd.toFixed(1)+'×</b> <b>[ ]</b> · <b>Enter</b> congela a vista e solta o mouse · <b>P</b> '+(fly.play?'pausar':'assistir daqui')+' · <b>G</b> '+gTxt+reg+' · <b>F</b> devolve'; }
function enterFly(){ if(fly.on)return; fly.on=true; document.body.classList.add('ff'); fly.wasPlaying=T.playing; T.playing=false; fly.ret=0; fly.play=false; fly.hold=false; flyInfo();
  camera.getWorldPosition(fly.pos); fly.yaw=camera.rotation.y/DEG; fly.pitch=camera.rotation.x/DEG; $('bFly').classList.add('on'); if(!renderer.xr.isPresenting) canvas.requestPointerLock?.(); }
function exitFly(){ if(!fly.on)return; fly.on=false; fly.play=false; fly.hold=false; document.body.classList.remove('ff'); $('bFly').classList.remove('on'); if(document.pointerLockElement)document.exitPointerLock(); fly.from={pos:fly.pos.clone(),yaw:fly.yaw,pitch:fly.pitch}; fly.ret=0.0001; }
const toggleFly=()=>fly.on?exitFly():enterFly();
addEventListener('keydown',e=>{const k=e.key.toLowerCase(); if(/input|textarea/i.test(e.target.tagName))return;
  if(k==='f'){toggleFly();e.preventDefault();return;} if(k==='r'&&!CFG.estudio){ if(REV.on&&!fly.on) revMark(); else registerHere(); e.preventDefault(); return;} if(k==='h'){document.body.classList.toggle('hidehud');return;}
  if(k==='escape'&&fly.on){exitFly();return;} if(k===' '&&!fly.on){togglePlay();e.preventDefault();return;}
  if(fly.on&&fly.hold&&k==='enter'){ flyHold(false); e.preventDefault(); return; }
  if(fly.on){ if(k==='enter'&&!fly.hold){ flyHold(true); e.preventDefault(); return; }
    if(k==='p'){ fly.play=!fly.play; if(fly.play&&!AUD.on) startSound(false); flyInfo(); e.preventDefault(); return; }
    if(k==='g'&&!CFG.estudio){ fly.pos.copy(POSE.pos); const aim=AIM; aim.position.copy(POSE.pos); aim.lookAt(POSE.look); aim.rotation.order='YXZ'; fly.yaw=aim.rotation.y/DEG; fly.pitch=aim.rotation.x/DEG; flyInfo(); e.preventDefault(); return; }
    if(k==='['||k===']'){ fly.spd=clamp(+(fly.spd*(k==='['?0.7:1.4)).toFixed(2),0.2,8); flyInfo(); e.preventDefault(); return; }
    if(!fly.hold) fly.keys.add(k); }});
addEventListener('keyup',e=>fly.keys.delete(e.key.toLowerCase())); addEventListener('blur',()=>fly.keys.clear());
/* ao registrar voando, o voo CONGELA (D-317): o mouse é solto para escrever e a vista não se mexe.
   Sair do pointer lock por conta própria continua devolvendo à peça — só o congelamento segura. */
function flyHold(on){ if(!fly.on) return; fly.hold=on; fly.keys.clear();
  if(on){ if(document.pointerLockElement) document.exitPointerLock(); }
  else if(!renderer.xr.isPresenting) canvas.requestPointerLock?.();
  flyInfo(); }
document.addEventListener('pointerlockchange',()=>{ if(fly.on&&!fly.hold&&!document.pointerLockElement) exitFly(); });
addEventListener('mousemove',e=>{ if(!fly.on||!document.pointerLockElement)return; fly.yaw-=e.movementX*0.13; fly.pitch=clamp(fly.pitch-e.movementY*0.13,-85,85); });
function stepFly(dt){ if(fly.hold) return; const sp=(fly.keys.has('shift')?4:2.4)*fly.spd*dt, yr=fly.yaw*DEG, pr=fly.pitch*DEG;
  const fwd=new THREE.Vector3(-Math.sin(yr)*Math.cos(pr),Math.sin(pr),-Math.cos(yr)*Math.cos(pr)), rt=new THREE.Vector3(Math.cos(yr),0,-Math.sin(yr)); const Kk=fly.keys;
  if(Kk.has('w')||Kk.has('arrowup'))fly.pos.addScaledVector(fwd,sp); if(Kk.has('s')||Kk.has('arrowdown'))fly.pos.addScaledVector(fwd,-sp);
  if(Kk.has('d')||Kk.has('arrowright'))fly.pos.addScaledVector(rt,sp); if(Kk.has('a')||Kk.has('arrowleft'))fly.pos.addScaledVector(rt,-sp);
  if(Kk.has('e')||Kk.has(' '))fly.pos.y+=sp; if(Kk.has('q')||Kk.has('c'))fly.pos.y-=sp; }

/* =========================  11. REGISTRO DE POSIÇÕES E PEDIDOS (D-317)  == */
/* Um registro é um PONTO NO ESPAÇO COM CONTEXTO: onde a câmera estava, que frase tocava naquele segundo,
   o que estava no ar — e o que o Vinicius quer ali. Três tipos: câmera (use esta vista) · problema (isto está
   errado) · pedido (mostre isto quando falar aquilo). O export sai em markdown legível, não só coordenadas,
   e junta as notas do modo revisão: um caderno só. */
const LSKEY='hydra360.v4.registros'; let REG=[];
try{ REG=JSON.parse(localStorage.getItem(LSKEY)||'null')||JSON.parse(localStorage.getItem('hydra360.v3.positions')||'[]'); }catch(e){ REG=[]; }
REG.forEach(e=>{ if(!e.tipo) e.tipo='camera'; if(e.nota===undefined) e.nota=''; });
const saveReg=()=>{try{localStorage.setItem(LSKEY,JSON.stringify(REG));}catch(e){}};
const fmt=s=>{s=Math.max(0,s);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');};
const escR=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TIPOS=[['camera','câmera','use esta vista'],['problema','problema','isto está errado'],['pedido','pedido','mostre isto quando falar…']];
const TIPOLB=t=>(TIPOS.find(x=>x[0]===t)||TIPOS[0])[1];
let regTipo='camera';
/* o contexto vem do mesmo motor do modo revisão (§14): frase, palavra, câmera, TELAs e o que acontece */
function regCtx(t){ try{ if(!REV.ev.length) revBuild(); const k=revSegAt(t), sg=REV.segs[k], wi=sg?revWord(sg,t):-1, c=revCtx(t);
    return {fala:sg?sg.txt:'', falaE2:sg?sg.e:'', palavra:(sg&&wi>=0)?sg.txt.split(/\s+/)[wi]:'', cam:c.cam, telas:c.tela, acontece:c.acontece, tE2:unwarp(t)}; }
  catch(err){ return {fala:'',falaE2:'',palavra:'',cam:[],telas:[],acontece:[],tE2:t}; } }
function registerHere(){ const p=new THREE.Vector3(); scene.updateMatrixWorld(true); camera.getWorldPosition(p); const yaw=((camera.rotation.y/DEG)%360+360)%360, pitch=camera.rotation.x/DEG; const b=blockAt(T.t);
  const c=regCtx(T.t); if(T.playing){ T.playing=false; $('bPlay').textContent='▶'; }
  const alvo=POSE.side, parado=T.t<=STOPS[alvo].b;
  REG.push({id:'P'+String(REG.length+1).padStart(2,'0'),label:b.id+' · '+fmt(T.t),tipo:regTipo,acao:parado?'mover':'nova',alvo:alvo,nota:'',block:b.id,t:+T.t.toFixed(2),tE2:+c.tE2.toFixed(2),u:+POSE.u.toFixed(4),
    pos:[+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)],yaw:+yaw.toFixed(2),pitch:+pitch.toFixed(2),voando:fly.on,
    fala:c.fala,falaE2:c.falaE2,palavra:c.palavra,camera:c.cam.join(' · '),telas:c.telas,acontece:c.acontece});
  if(fly.on) flyHold(true);
  saveReg(); renderReg(true); const bt=$('bReg'); bt.textContent='registrado ✓'; setTimeout(()=>{bt.innerHTML='Registrar aqui<kbd>R</kbd>';},900); }
function verDaqui(e){ T.t=e.t; T.playing=false; $('bPlay').textContent='▶'; if(!fly.on) enterFly(); flyHold(true); fly.pos.set(e.pos[0],e.pos[1],e.pos[2]); fly.yaw=e.yaw; fly.pitch=e.pitch; fly.play=false; flyInfo(); }
function renderReg(focusLast){ $('rn').textContent=REG.length; const h=$('rl');
  if(!REG.length){h.innerHTML='<div class="empty">Nada registrado. <b>F</b> para voar, <b>R</b> para registrar — e escreva ali o que você quer. Sobrevive a recarregar; exporta em markdown.</div>';return;}
  h.innerHTML=''; const ord=REG.slice().sort((x,y)=>x.t-y.t);
  ord.forEach(e=>{ const d=document.createElement('div'); d.className='item rg-'+e.tipo;
    const ctx=[e.fala?'<b>fala</b> “'+escR(e.fala.length>90?e.fala.slice(0,88)+'…':e.fala)+'”':'', e.camera?'<b>câmera</b> '+escR(e.camera):'',
      (e.acontece&&e.acontece.length)?'<b>no ar</b> '+escR(e.acontece.slice(0,3).join('; ')):''].filter(Boolean).join('<br>');
    d.innerHTML='<div class="top"><button class="sm rdt" data-d="-0.5" title="marca meio segundo antes">−</button><button class="sm rgo" title="levar a peça a este instante">'+fmt(e.t)+'</button><button class="sm rdt" data-d="0.5" title="marca meio segundo depois">+</button><input value="'+String(e.label).replace(/"/g,'&quot;')+'" title="apelido deste registro (opcional)" placeholder="apelido…"><button class="ghost rdel">✕</button></div>'+
      '<div class="tipos">'+TIPOS.map(([k,lb,hint])=>'<button class="sm tp'+(e.tipo===k?' on':'')+'" data-k="'+k+'" title="'+hint+'">'+lb+'</button>').join('')+
      '<button class="sm rsee" title="voar até este ponto e olhar daqui">ver daqui</button></div>'+
      '<div class="tipos acoes">'+ACOES.map(([k,lb])=>'<button class="sm acb'+((e.acao||'mover')===k?' on':'')+'" data-a="'+k+'" title="'+lb+'">'+lb+'</button>').join('')+'</div>'+
      '<div class="mat"></div>'+
      '<textarea rows="2" placeholder="'+(e.tipo==='problema'?'o que está errado aqui…':e.tipo==='pedido'?'quando falar…, mostre…, desse jeito…':'por que esta vista…')+'"></textarea>'+
      '<div class="co">'+(ctx?ctx+'<br>':'')+'<span>pos</span> '+e.pos.map(v=>v.toFixed(2)).join(', ')+'  <span>yaw</span> '+e.yaw.toFixed(1)+'° <span>pitch</span> '+e.pitch.toFixed(1)+'°'+
      (e.voando?' <span>free-fly</span>':'')+'<br><span>t</span> '+fmt(e.t)+' ('+escR(e.block)+')  <span>E2</span> '+fmt(e.tE2||e.t)+'</div>';
    d.querySelector('input').oninput=ev=>{e.label=ev.target.value;saveReg();};
    const ta=d.querySelector('textarea'); ta.value=e.nota||''; ta.oninput=()=>{ e.nota=ta.value; saveReg(); };
    d.querySelectorAll('.tp').forEach(btn=>btn.onclick=()=>{ e.tipo=btn.dataset.k; regTipo=e.tipo; saveReg(); renderReg(); });
    d.querySelectorAll('.acb').forEach(btn=>btn.onclick=()=>{ if(!btn.dataset.a) return; e.acao=btn.dataset.a; saveReg(); renderReg(); });
    { const mb=d.querySelector('.mat'), inp=document.createElement('input'); inp.type='file'; inp.multiple=true; inp.style.display='none';
      inp.onchange=()=>{ if(inp.files.length) addMaterial(e,[...inp.files]); };
      const add=document.createElement('button'); add.className='sm'; add.textContent='+ material'; add.title='figura, quadro de simulação, vídeo de referência para esta parada (ou arraste em cima)';
      add.onclick=()=>inp.click(); mb.appendChild(add); mb.appendChild(inp);
      (e.material||[]).forEach((m,mi)=>{ const w=document.createElement('span'); w.className='mit';
        w.innerHTML=(m.thumb?'<img src="'+m.thumb+'">':'<i>▤</i>')+'<span>'+escR(m.nome)+'</span>';
        const x=document.createElement('button'); x.className='ghost'; x.textContent='✕';
        x.onclick=()=>{ e.material.splice(mi,1); saveRegSafe(); renderReg(); }; w.appendChild(x); mb.appendChild(w); });
      d.ondragover=ev=>{ ev.preventDefault(); d.classList.add('drop'); }; d.ondragleave=()=>d.classList.remove('drop');
      d.ondrop=ev=>{ ev.preventDefault(); d.classList.remove('drop'); if(ev.dataTransfer.files.length) addMaterial(e,[...ev.dataTransfer.files]); }; }
    d.querySelector('.rgo').onclick=()=>{ T.t=e.t; };
    d.querySelectorAll('.rdt').forEach(btn=>btn.onclick=()=>{ const auto=e.label===e.block+' · '+fmt(e.t); e.t=+Math.max(0,Math.min(TOTAL,e.t+ +btn.dataset.d)).toFixed(2);
      const c=regCtx(e.t); e.tE2=+c.tE2.toFixed(2); e.fala=c.fala; e.falaE2=c.falaE2; e.palavra=c.palavra; e.camera=c.cam.join(' · '); e.telas=c.telas; e.acontece=c.acontece; e.block=blockAt(e.t).id; if(auto) e.label=e.block+' · '+fmt(e.t);
      T.t=e.t; saveReg(); renderReg(); }); d.querySelector('.rsee').onclick=()=>verDaqui(e);
    d.querySelector('.rdel').onclick=()=>{ REG=REG.filter(x=>x!==e); saveReg(); renderReg(); };
    h.appendChild(d); if(focusLast&&e===REG[REG.length-1]) setTimeout(()=>{ ta.focus(); d.scrollIntoView({block:'nearest'}); },30); }); }
/* MATERIAL (D-318): figuras, quadros de simulação, vídeos de referência presos a UMA parada — é o que
   diz "quero ISTO aqui". O arquivo inteiro não cabe no localStorage (cota de ~5 MB), então guardo nome,
   tipo, tamanho e uma miniatura de 320 px; o original você me manda no chat, com o mesmo nome. */
function thumbOf(file){ return new Promise(res=>{ if(!/^image\//.test(file.type)) return res('');
  const fr=new FileReader(); fr.onload=()=>{ const im=new Image(); im.onload=()=>{ const k=Math.min(1,320/Math.max(im.width,im.height,1)), c=document.createElement('canvas');
      c.width=Math.max(1,Math.round(im.width*k)); c.height=Math.max(1,Math.round(im.height*k));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height); try{ res(c.toDataURL('image/jpeg',0.72)); }catch(err){ res(''); } };
    im.onerror=()=>res(''); im.src=fr.result; }; fr.onerror=()=>res(''); fr.readAsDataURL(file); }); }
function saveRegSafe(){ try{ localStorage.setItem(LSKEY,JSON.stringify(REG)); return true; }catch(err){ return false; } }
async function addMaterial(e,files){ e.material=e.material||[];
  for(const f of files){ const thumb=await thumbOf(f); e.material.push({nome:f.name, tipo:f.type||'?', kb:Math.round(f.size/1024), thumb}); }
  if(!saveRegSafe()){ e.material.forEach(m=>m.thumb=''); if(!saveRegSafe()) fail('registro cheio: apague algum material'); }
  renderReg(); }
/* SIMULAÇÃO (D-318): um registro não é um quadro — é uma PARADA proposta. O tempo de cada perna é fixo pela voz,
   então mover uma parada muda a distância e, com isso, a VELOCIDADE. Aqui a rota é recalculada com os registros
   aplicados e devolve a tabela nova + o que não cabe. Nada é aplicado na peça: isto é conta, não mudança. */
const ACOES=[['mover','mover esta parada'],['nova','parada nova (precisa de segundos)'],['olhar','só o olhar daqui'],['nada','só comentário']];
function lookFrom(e,dist){ const yr=e.yaw*DEG, pr=e.pitch*DEG, d=dist||6;
  return [e.pos[0]-Math.sin(yr)*Math.cos(pr)*d, e.pos[2]-Math.cos(yr)*Math.cos(pr)*d, e.pos[1]+Math.sin(pr)*d]; }
function simular(){
  const base=STOPS.map(S=>({id:S.id,P:S.P.slice(),a:S.a,b:S.b,via:(S.via||null)}));
  const aplicados=[], recusados=[];
  REG.forEach(e=>{ const ac=e.acao||'mover';
    if(ac==='nada'||e.tipo==='problema'&&ac!=='mover'){ return; }
    const k=Math.min(base.length-1,Math.max(0,e.alvo!==undefined?e.alvo:0));
    if(ac==='nova'){ recusados.push(e.id+' ('+fmt(e.t)+'): parada NOVA — o tempo entre as falas já está todo usado; diga de onde tiram-se os segundos (encurtar a parada anterior, ou a R corta a fala).'); return; }
    const [lx,lz,ly]=lookFrom(e,Math.hypot(e.pos[0]-base[k].P[2],e.pos[2]-base[k].P[3])||6);
    if(ac==='olhar'){ base[k].P[2]=lx; base[k].P[3]=lz; base[k].P[4]=ly; aplicados.push(e.id+' → olhar da parada "'+base[k].id+'"'); }
    else { base[k].P[0]=e.pos[0]; base[k].P[1]=e.pos[2]; base[k].P[2]=lx; base[k].P[3]=lz; base[k].P[4]=ly; aplicados.push(e.id+' → move a parada "'+base[k].id+'"'); } });
  const legs=[]; let avisos=[];
  for(let i=0;i<base.length-1;i++){ const S=base[i], N=base[i+1];
    const pts=[[S.P[0],S.P[1]],...(N.via||[]),[N.P[0],N.P[1]]]; let L=0;
    for(let q=0;q<pts.length-1;q++) L+=Math.hypot(pts[q+1][0]-pts[q][0],pts[q+1][1]-pts[q][1]);
    const T_=N.a-S.b, pico=T_>0?L/T_/(1-CFG.travelRamp):0, atual=STOPS[i].leg?STOPS[i].leg:{L:0,peak:0};
    legs.push({de:S.id,para:N.id,L:+L.toFixed(2),L0:+atual.L.toFixed(2),T:+T_.toFixed(2),pico:+pico.toFixed(2),pico0:+atual.peak.toFixed(2)});
    if(pico>CFG.vmax) avisos.push('perna '+S.id+' → '+N.id+': pico '+pico.toFixed(2)+' m/s (teto '+CFG.vmax+') — não cabe no tempo da voz.'); }
  return {legs,aplicados,recusados,avisos,nota:'Folga de móveis e enquadramento das TELAs [NÃO VERIFICADO] nesta conta — só distância, tempo e velocidade.'}; }
function simularMD(){ const r=simular(); const L=['## Simulação da rota com estes registros','',
  '| perna | m (hoje → pedido) | s | pico m/s (hoje → pedido) |','|---|---|---|---|'];
  r.legs.forEach(g=>L.push('| '+g.de+' → '+g.para+' | '+g.L0+' → **'+g.L+'** | '+g.T+' | '+g.pico0+' → **'+g.pico+'** |'));
  L.push('', r.aplicados.length?'**Aplicados:** '+r.aplicados.join('; '):'**Aplicados:** nenhum');
  if(r.recusados.length) L.push('','**Não dá para simular:**','', ...r.recusados.map(x=>'- '+x));
  if(r.avisos.length) L.push('','**Estoura o conforto:**','', ...r.avisos.map(x=>'- '+x));
  L.push('', '_'+r.nota+'_',''); return L.join('\n'); }
/* D-337: a direção v9 no caderno — as paradas com os horários e cada caminhada com distância, tempo e velocidade;
   os olhares com o alvo. É isto que ele cola aqui para a trilha M montar. */
function dirMD(){ const f=s=>{ s=Math.max(0,s); return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'); }, n=v=>v.toFixed(2).replace('.',',');
  const ST={ok:'ok',amarelo:'⚠ rápida',vermelho:'⛔ rápida demais',erro:'⛔ chega antes de sair'};
  const A=DIR.agenda(), L=['## Lugar — paradas e caminhadas (direção v9, D-337)','',
    '_Velocidade padrão '+n(DIR.VPADRAO)+' m/s quando a chegada não foi marcada ("auto"). Aviso: pico acima de '+n(DIR.VAMBAR)+' m/s = ⚠; acima de '+n(CFG.vmax)+' m/s = ⛔ — provisórios até o teste no Quest._','',
    '| # | parada | lugar (x · z) | chega | sai | fica | caminhada até a próxima |','|---|---|---|---|---|---|---|'];
  A.forEach(a=>{ const w=a.anda, fica=(a.chega!==null&&a.sai!==null)?n(a.sai-a.chega)+' s':(a.chega!==null?'até o fim':'—');
    L.push('| P'+a.k+' | '+(a.p.nome||'—')+(a.erro?' ⛔ '+a.erro:'')+' | '+n(a.x)+' · '+n(a.z)+' | '+(a.chega===null?'_sem horário_':f(a.chega)+(a.k>0&&a.p.chega==null?' (auto)':''))+' | '+(a.sai===null?'—':f(a.sai))+' | '+fica+' | '+
      (w? n(w.L)+' m em '+n(w.T)+' s · '+n(w.v)+' m/s (pico '+n(w.pico)+') · '+ST[w.st] : '—')+' |'); });
  L.push('','## Olhar (direção v9, D-337)','');
  if(!DIR.olhares.length) L.push('_(nenhum bloco — o olhar segue para onde a pessoa anda)_');
  else { L.push('| de | até | olhar para | alvo (x · y · z) | nota |','|---|---|---|---|---|');
    [...DIR.olhares].sort((a,b)=>a.de-b.de).forEach(o=>L.push('| '+f(o.de)+' | '+(o.ate==null?'o fim':f(o.ate))+' | '+({anda:'para onde anda',horizonte:'horizonte',mesa:'mesa'}[o.tipo]||(o.modo==='passa'?'ponto · até passar':'ponto · fixo'))+(o.trans!=null?' · transição '+n(o.trans)+' s':'')+' | '+(o.alvo&&o.tipo==='ponto'?o.alvo.map(v=>n(v)).join(' · '):'—')+' | '+(o.nome||'—')+' |')); }
  L.push('','## Cena — o que mostrar (instruções dele para a trilha M montar, D-339)','');
  if(!DIR.cenas.length) L.push('_(nenhuma instrução)_');
  else { L.push('| de | até | instrução |','|---|---|---|');
    [...DIR.cenas].sort((a,b)=>a.de-b.de).forEach(c=>L.push('| '+f(c.de)+' | '+(c.ate==null?'o fim':f(c.ate))+' | '+(c.texto||'_(vazia)_').replace(/\n/g,' · ').replace(/\|/g,'/')+' |')); }
  L.push(''); return L; }
/* o caderno: registros de lugar + notas do modo revisão, na ordem do tempo */
function briefingMD(){ const L=['# HYDRA — caderno de direção','','Gerado em '+new Date().toLocaleString('pt-BR')+' · '+window.HYDRA.version,
  '','Tempo real = na voz gravada · E2 = roteiro v16. `pos`/`yaw`/`pitch` = vista exata (dá para reproduzir com `HYDRA.fly`).',''];
  const its=REG.map(e=>({t:e.t,kind:'reg',e})).concat((REV.notes||[]).map(n=>({t:n.t,kind:'nota',e:n}))).sort((x,y)=>x.t-y.t);
  L.push(...dirMD());   // D-337: a direção v9 — o que manda na peça agora
  if(REG.length) L.push(simularMD());
  if(!SEM_ROTEIRO&&MIRA.list.length){ L.push('## Miras marcadas (para onde a câmera olha)','','| # | tempo | bloco | yaw | pitch | giro até a próxima |','|---|---|---|---|---|---|');
    MIRA.aviso().forEach(m=>L.push('| '+m.i+' | '+m.t+' | '+m.bloco+' | '+m.yaw+'° | '+m.pitch+'° | '+m.ateProxima+' |'));
    L.push('', '_A posição não muda: a mira decide só para onde se olha. Entre duas miras o giro é contínuo; antes da primeira e depois da última o olhar volta ao roteiro em 1,2 s._',''); }
  /* D-329: o texto livre escrito no cartão de cada marca do Estúdio (ficar aqui / olhar assim / anotação)
     agora vai para o caderno — antes ficava só na tela (`rot`) e se perdia ao copiar/exportar */
  if(!SEM_ROTEIRO){ const tSS=s=>{ s=Math.max(0,s); return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'); };
    const estIt=[]; PERC.list.forEach(m=>estIt.push({v:'FICAR AQUI',t:m.t,bloco:m.bloco,rot:m.rot||''}));
    MIRA.list.forEach(m=>estIt.push({v:'OLHAR ASSIM',t:m.t,bloco:m.bloco,rot:m.rot||'',modo:m.modo}));
    NOTAS.list.forEach(m=>estIt.push({v:'ANOTADO',t:m.t,bloco:m.bloco,rot:m.rot||''}));
    const comTexto=estIt.filter(m=>m.rot).sort((a,b)=>a.t-b.t);
    if(comTexto.length){ L.push('## Notas escritas nas marcas do Estúdio','');
      comTexto.forEach(m=>L.push('- **'+m.v+' · '+tSS(m.t)+' · '+m.bloco+'**'+(m.modo?' ('+({fixo:'fixa no ponto',passar:'fixa até passar',solto:'gira livre'}[m.modo]||m.modo)+')':'')+' — '+m.rot));
      L.push(''); } }
  its.forEach(it=>{ const e=it.e;
    if(it.kind==='reg'){ const apelido=(e.label&&e.label!==e.block+' · '+fmt(e.t))?' — '+e.label:'';
      L.push('## '+fmt(e.t)+' · '+e.block+' · **'+TIPOLB(e.tipo).toUpperCase()+'**'+apelido,'',
      '- **O que eu quero:** '+(e.nota?e.nota:'_(vazio)_'),
      '- **Ação pedida:** '+((ACOES.find(x=>x[0]===(e.acao||'mover'))||ACOES[0])[1])+(e.acao==='mover'||e.acao==='olhar'?' (parada "'+(STOPS[e.alvo]?STOPS[e.alvo].id:'?')+'")':''),
      '- **Fala nesse instante:** '+(e.fala?'“'+e.fala+'”'+(e.palavra?' (na palavra “'+e.palavra+'”)':''):'—'),
      '- **Câmera da peça:** '+(e.camera||'—'),
      '- **No ar:** '+([].concat(e.telas||[],e.acontece||[]).join('; ')||'—'),
      '- **Material que guia esta parada:** '+((e.material&&e.material.length)?e.material.map(m=>'`'+m.nome+'` ('+(m.tipo||'?')+', '+m.kb+' KB)').join('; ')+' — mande estes arquivos no chat junto com o caderno':'—'),
      '- **Vista registrada:** pos '+e.pos.join(', ')+' · yaw '+e.yaw+'° · pitch '+e.pitch+'°'+(e.voando?' (free-fly)':'')+' · E2 '+fmt(e.tE2||e.t),''); }
    else L.push('## '+fmt(e.t)+' · '+e.bloco+' · **MOMENTO**'+(e.palavra?' — “'+e.palavra+'”':''),'',
      '- **O que eu quero:** '+(e.nota||'_(vazio)_'),'- **Fala:** '+(e.fala||'—'),'- **Câmera da peça:** '+(e.camera||'—'),
      '- **No ar:** '+([].concat(e.telas||[],e.acontece||[]).join('; ')||'—'),
      '- **Vista no momento da marca:** '+(e.pos?'pos '+e.pos.join(', ')+' · yaw '+e.yaw+'° · pitch '+e.pitch+'°':'—'),''); });
  return L.join('\n'); }
function regDownload(name,text,mime){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:(mime||'text/markdown')+';charset=utf-8'})); a.download=name; a.click(); }
$('bSim').onclick=()=>{ const r=simular(); const box=$('rsim');
  box.innerHTML='<b>rota com os registros aplicados</b><br>'+r.legs.map(g=>g.de.split(' · ')[0]+' → '+g.para.split(' · ')[0]+': '+g.L0+' → '+g.L+' m · pico '+g.pico0+' → '+(g.pico>CFG.vmax?'<b class="bad">'+g.pico+'</b>':g.pico)+' m/s').join('<br>')+
    (r.recusados.length?'<br><b class="bad">'+escR(r.recusados.join(' ')) +'</b>':'')+(r.avisos.length?'<br><b class="bad">'+escR(r.avisos.join(' '))+'</b>':'');
  box.style.display='block'; };
$('bExp').onclick=()=>regDownload('hydra_caderno.md',briefingMD());
$('bJson').onclick=()=>regDownload('hydra_registros.json',JSON.stringify({piece:window.HYDRA.version,exported:new Date().toISOString(),config:CFG,registros:REG,notas:REV.notes||[]},null,2),'application/json');
$('bCopy').onclick=()=>{(navigator.clipboard?.writeText(briefingMD())||Promise.reject()).then(()=>{$('bCopy').textContent='copiado ✓';setTimeout(()=>$('bCopy').textContent='Copy',900);},()=>regDownload('hydra_caderno.md',briefingMD()));};
$('bReg').onclick=registerHere; $('bFly').onclick=toggleFly;


/* =========================  12. UI  ====================================== */
function togglePlay(){ if(!T.playing&&!AUD.on){ startSound(false); return; } T.playing=!T.playing;$('bPlay').textContent=T.playing?'❚❚':'▶';}
$('bPlay').onclick=togglePlay; $('bRew').onclick=()=>{T.t=0;}; $('bSpd').onclick=()=>{T.speed=T.speed===1?0.5:T.speed===0.5?2:1;$('bSpd').textContent=T.speed+'×';};
let showGuides=false; try{showGuides=localStorage.getItem('hydra360.guides')==='1';}catch(e){} guides.visible=showGuides; $('bGuides').classList.toggle('on',showGuides);
$('bGuides').onclick=()=>{showGuides=!showGuides;guides.visible=showGuides;$('bGuides').classList.toggle('on',showGuides);try{localStorage.setItem('hydra360.guides',showGuides?'1':'0');}catch(e){}};
let showMap=true; $('bMap').onclick=()=>{showMap=!showMap;$('bMap').classList.toggle('on',showMap);$('maplab').style.display=showMap?'':'none';}; $('bMap').classList.add('on');
let scrubbing=false; $('scrub').addEventListener('input',e=>{scrubbing=true;T.t=TOTAL*e.target.value/1000;}); $('scrub').addEventListener('change',()=>{scrubbing=false;});
B.forEach(b=>{const bt=document.createElement('button');bt.innerHTML=b.id+'<small>'+b.name+'</small>';bt.onclick=()=>{T.t=b.t0+0.01;};b.btn=bt;$('jump').appendChild(bt);});
let fps=60,hudAcc=0;
function updateHUD(){ const p=new THREE.Vector3(); camera.getWorldPosition(p); const yaw=((camera.rotation.y/DEG)%360+360)%360, pitch=camera.rotation.x/DEG;
  $('lp').textContent=p.x.toFixed(2)+', '+p.y.toFixed(2)+', '+p.z.toFixed(2); $('ld').textContent='yaw '+yaw.toFixed(1)+'°  pitch '+pitch.toFixed(1)+'°'; $('lu').textContent=(SEM_ROTEIRO?'P'+DIR.onde(T.t).k+(DIR.onde(T.t).anda?' → P'+(DIR.onde(T.t).k+1):''):STOPS[POSE.side].id)+(POSE.moving?' · andando '+POSE.speed.toFixed(2)+' m/s':' · parado')+(fly.on?' · você está a '+fly.pos.distanceTo(POSE.pos).toFixed(1)+' m da câmera da peça':'');
  const b=POSE.block; $('ls').innerHTML='<b>'+b.id+'</b> · '+b.name; $('clock').textContent=fmt(T.t)+' / '+fmt(TOTAL)+'  '+Math.round(fps)+'fps'; if(!scrubbing)$('scrub').value=Math.round(T.t/TOTAL*1000);
  B.forEach(x=>x.btn.classList.toggle('cur',x===b)); const s=CFG.legenda?b.voT.find(v=>T.t>=v[0]&&T.t<v[1]):null; $('voB').textContent=b.id+' · '+b.name.toUpperCase(); $('voT').textContent=s?s[2]:''; }



/* =========================  13. LOOP  ==================================== */
const fadeEl=document.createElement('div'); fadeEl.style.cssText='position:fixed;inset:0;background:#000;pointer-events:none;z-index:8;opacity:0'; document.body.appendChild(fadeEl);
renderReg(); $('boot').classList.add('gone'); try{const vb=VRButton.createButton(renderer); vb.style.bottom='auto'; vb.style.top='12px'; vb.style.left='50%'; vb.style.transform='translateX(-50%)'; document.body.appendChild(vb);}catch(e){}
if(CFG.legenda) document.body.classList.add('legenda');
/* som: a peça espera no 0:00 até o gesto (sem ele o navegador cala a voz); no headset, entrar no VR é o gesto e a peça recomeça */
if(CFG.mudo){ $('snd')?.classList.add('gone'); } else { T.playing=false; $('bPlay').textContent='▶'; }
$('bSnd')?.addEventListener('click',e=>{ e.stopPropagation(); startSound(true); });
canvas.addEventListener('pointerdown',ev=>{ if(AVISO.on){ AVISO.clique(ev); return; } if(fly.on&&fly.hold){ flyHold(false); return; } if(!AUD.on&&!fly.on) startSound(false); });
let XRH0=null, XRCAL=[];   // D-366: altura da cabeça medida no começo da sessão VR · D-526: remedida a cada início (mediana de 24 quadros)
renderer.xr.addEventListener('sessionstart',()=>{ XRH0=null; XRCAL.length=0; if(!AVISO.reset()) startSound(true); });   // D-377: no headset, a tela de avisos aparece de novo antes da peça
T.resync(); let last=performance.now(), FRAME=0, camQ=null, rigYaw=null;
const AIM=new THREE.PerspectiveCamera();   // objeto-mira: é uma câmera para que lookAt aponte o −z
const tH=ts;
/* marcas de tempo da v16 (E2, CUES de cada bloco) — a MÁQUINA abaixo só lê estas constantes */
const T_MAQP0=tH('0:02.1'), T_TESSP0=tH('0:04.6'), T_B0SURF=tH('0:06.5'), T_B0OFF=tH('0:10.0'),
      T_TUBE=tH('0:18.8'), T_SEQ_GIRO=tH('0:12.8'), T_BEAM0=tH('0:19.2'), T_BEAM0_END=tH('0:20.1'), T_WHY=tH('0:28.6'),
      T_LINES_CELL=tH('0:35.0'), T_LINES_CELL_END=tH('0:41.9'), T_LINES_MAQ=tH('0:44.5'), T_LINES_MAQ_END=tH('0:48.3'), T_MAQP1=tH('0:48.3'),
      T_CASCADE=tH('1:05.9'), CASC=(tH('1:07.4')-tH('1:05.9'))/25, T_CPULSE=tH('1:07.4'),
      T_MODEL=tH('1:15.6'), T_GLYPH=tH('1:18.0'), T_FUSE=['1:19.6','1:20.5','1:21.4','1:22.3'].map(tH), T_LINES_MAQ2=tH('1:24.0'), T_LINES_MAQ2_END=tH('1:25.6'),
      T_LOO=tH('1:25.6'), T_LOO_END=tH('1:28.1'), T_SURF=tH('1:28.4'),
      T_PNL=tH('1:29.2'), T_DISCP=tH('1:32.6'), T_PNL_OFF=tH('1:44.6'), T_MONO_OUT=tH('1:45.0'),
      T_GROW=tH('1:45.0'), T_ARRIVE=STOPS.find(S=>S.P===P_B67).a, T_VOICE=tH('1:51.0'), T_TELA_ON=tH('1:53.6'),
      T_MIX=tH('2:04.4'), T_ROSE_END=tH('2:10.8'),
      T_B7=tH('2:11.8'), T_HALO=tH('2:11.8'), T_W1=tH('2:22.2'), T_W2=tH('2:31.1'), T_RINGW=tH('2:33.0'), T_WOFF=tH('2:35.8'),
      T_VAL=tH('2:36.8'), T_SAME=tH('2:43.2'), T_SETTLE=tH('2:50.6'), T_RUN_END=tH('2:57.2'), T_BELOW=tH('2:58.0'), T_RING=tH('3:03.4'), T_VALOFF=tH('3:12.4'),
      T_B9=tH('3:12.4'), T_W9=tH('3:18.3'), T_W9OFF=tH('3:23.3'), T_EDGES=tH('3:29.2'), T_RECEDE=tH('3:34.1'), T_DIM=tH('3:40.4');
const env=(t,a,b,up=0.5,down=0.5)=> (t<a||t>=b+down)?0:smooth((t-a)/up)*(1-smooth((t-b)/down));   // sobe em `up`, fica, desce em `down`
const pulse1=(t,a,d=1.0)=>{ const u=(t-a)/d; return (u>=0&&u<1)?Math.sin(Math.PI*u):0; };
const INK=new THREE.Color(PAL.ink), TEALC=new THREE.Color(PAL.teal), C_MED0=new THREE.Color('#b6d7ff'), C_MED1=new THREE.Color('#8b5cf6');
const _w1=new THREE.Vector3(), _w2=new THREE.Vector3(), _eye=new THREE.Vector3(), _upL=new THREE.Vector3(), _al=new THREE.Vector3(), _al2=new THREE.Vector3(), _qi=new THREE.Quaternion(), _tq=new THREE.Quaternion();
const _bw=[0,1,2,3].map(()=>new THREE.Vector3()), _o=[0,0,0], _o2=[0,0,0], _h3=[0,1,2].map(()=>new THREE.Vector3());
const pieceW=(i,out)=>{ const p=PIECES&&PIECES[i]; if(!p) return null; p.getWorldPosition(out); out.x=0; out.z=EST[i]; out.y=GEO.mesa.h+0.18; return out; };
const LUZP={position:new THREE.Vector3(), layers:camera.layers};   // luzDaSala lê a posição NO MUNDO (no VR a câmera é filha do rig)
const veil=new THREE.Mesh(new THREE.SphereGeometry(0.3,16,12),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,side:THREE.BackSide,depthTest:false,depthWrite:false}));
veil.renderOrder=999; veil.frustumCulled=false; camera.add(veil);
const POSN=['early','mid','late'];
/* as malhas do monólito (material MATS.monolito): para apagar a sombra durante a dissolução (D-221) */
const MONO={sombra:true,campo:null,malhas:[]}; CEN.mundo.traverse(o=>{ if(o.isMesh&&CEN.materiais&&o!==CEN.materiais.campoMalha&&(o.material===CEN.materiais.monolito||o.material===CEN.materiais.painelFrente)) MONO.malhas.push(o); });
const valOf=(mat,ci)=>tess.val.find(v=>v.mat===mat&&v.cond.startsWith(POSN[ci]));
/* D-340: O TESSERATO DO LAB.HTML na abertura (pedido dele, 25/09). É o desenho do lab.html (seção "01 · Protocol
   tesseract", função drawTess) portado quase linha a linha: 4-cubo SA·ET·EV·CP, 24 faces 2-D subdivididas 9×9 e
   pintadas com a resposta PROLIF (escala de duas cores do lab), arestas coloridas por fator (SA verde-água · ET
   dourado · EV azul · CP rosa, claro = nível baixo → escuro = alto), 16 vértices e a ★ do pico previsto; mesma
   rotação 4-D (XW + tombo YZ). Diferença: o fundo é TRANSPARENTE (o cubo flutua na nave, sem o quadro preto) e o
   desenho vai numa textura de um plano a 2,4 m, na altura do olho, virado para quem olha — é uma imagem plana
   (sem estéreo verdadeiro no headset). Tempo: aparece 1,0→1,6 s, gira, some 7,2→8,0 s.
   [NÃO VERIFICADO no Quest: o desenho em canvas 2-D é refeito a cada 2 quadros — medir o custo no headset.] */
const LABTESS=(()=>{ const T0=1.0, T1=8.0, FIN=0.6, FOUT=0.8, W=640, H=600;
  const TWO={PROLIF:[[0,'#e8a800'],[.5,'#efe6d6'],[1,'#6d28d9']]}, ECOL={SA:[45,212,191],ET:[251,191,36],EV:[96,165,250],CP:[244,114,182]}, AX=['SA','ET','EV','CP'];
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
  const fcv=document.createElement('canvas'); fcv.width=W; fcv.height=H; const fg=fcv.getContext('2d');
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.75*H/W),mat); mesh.renderOrder=7; mesh.visible=false;
  mesh.position.set(INICIO.x, 1.72, INICIO.z-2.4); scene.add(mesh);
  const dom='PROLIF', cmap=v=>sampleScale(TWO[dom],v);
  const sat=(c,k)=>{ const y=0.299*c[0]+0.587*c[1]+0.114*c[2]; return c.map(v=>Math.max(0,Math.min(255,Math.round(y+(v-y)*k)))); };
  const TV=[]; for(let m=0;m<16;m++) TV.push([(m>>0)&1,(m>>1)&1,(m>>2)&1,(m>>3)&1]);
  const val=c=>gridVal(dom,{SA:c[0],ET:c[1],EV:c[2],CP:c[3]});
  const FACES=[]; for(let d1=0;d1<4;d1++) for(let d2=d1+1;d2<4;d2++){ const fx=[0,1,2,3].filter(x=>x!==d1&&x!==d2); for(let a=0;a<2;a++) for(let b=0;b<2;b++) FACES.push({d1,d2,fx,fv:[a,b]}); }
  let cache=null, peak=null;
  function build(){ const S=9, quads=[];
    FACES.forEach(f=>{ for(let i=0;i<S;i++) for(let j=0;j<S;j++){ const c00=[0,0,0,0]; f.fx.forEach((ax,k)=>c00[ax]=f.fv[k]);
      const c10=c00.slice(), c01=c00.slice(), c11=c00.slice(), u0=i/S, u1=(i+1)/S, v0=j/S, v1=(j+1)/S;
      c00[f.d1]=u0; c00[f.d2]=v0; c10[f.d1]=u1; c10[f.d2]=v0; c01[f.d1]=u0; c01[f.d2]=v1; c11[f.d1]=u1; c11[f.d2]=v1;
      const cvs=[val(c00),val(c10),val(c11),val(c01)]; quads.push({corners:[c00,c10,c11,c01],cv:cvs,v:(cvs[0]+cvs[1]+cvs[2]+cvs[3])/4}); } });
    let lo=1e9, hi=-1e9; quads.forEach(q=>q.cv.forEach(v=>{ if(v<lo) lo=v; if(v>hi) hi=v; })); cache={quads,lo,hi};
    /* ★ o pico previsto — a mesma busca do tsBar() do lab */
    const dd=A.grid.domains[dom], ax=dd.axes, sl=dd.slider; let mx=-1, mc=null;
    for(let si=0;si<NSL;si++) for(let i=0;i<N;i++) for(let j=0;j<N;j++) for(let k=0;k<N;k++){ const v=dd.frames[si][i*N*N+j*N+k];
      if(v>mx){ mx=v; const nc={}; nc[ax[0]]=i/(N-1); nc[ax[1]]=j/(N-1); nc[ax[2]]=k/(N-1); nc[sl]=si/(NSL-1); mc=nc; } }
    peak=[mc.SA,mc.ET,mc.EV,mc.CP]; }
  const S_=v=>(v-cache.lo)/((cache.hi-cache.lo)||1);
  function rot(p,ang){ let x=p[0]-0.5, y=p[1]-0.5, z=p[2]-0.5, w=p[3]-0.5, c=Math.cos(ang), s=Math.sin(ang), t=x*c-w*s; w=x*s+w*c; x=t;
    const a2=ang*0.6; c=Math.cos(a2); s=Math.sin(a2); t=y*c-z*s; z=y*s+z*c; y=t; return [x,y,z,w]; }
  function proj(p,ang,rotY){ const [x,y,z,w]=rot(p,ang), k4=2.2/(2.2-w); const X=x*k4, Y=y*k4, Z=z*k4;
    const X3=X*Math.cos(rotY)-Z*Math.sin(rotY), Z3=X*Math.sin(rotY)+Z*Math.cos(rotY), k3=3.0/(3.0-Z3), sc=Math.min(W,H)*0.40;
    return [W/2+X3*k3*sc, H/2+Y*k3*sc, Z3]; }
  function draw(ang,rotY){ if(!cache) build(); g.clearRect(0,0,W,H);
    const qs=cache.quads.map(q=>{ const P=q.corners.map(c=>proj(c,ang,rotY)); return {P,cv:q.cv,v:q.v,z:(P[0][2]+P[1][2]+P[2][2]+P[3][2])/4}; }); qs.sort((a,b)=>b.z-a.z);
    let zmn=1e9, zmx=-1e9; qs.forEach(q=>{ if(q.z<zmn) zmn=q.z; if(q.z>zmx) zmx=q.z; }); fg.clearRect(0,0,W,H);
    qs.forEach(q=>{ let lo=0, hi=0; for(let k=1;k<4;k++){ if(q.cv[k]<q.cv[lo]) lo=k; if(q.cv[k]>q.cv[hi]) hi=k; }
      const front=(q.z-zmn)/((zmx-zmn)||1), al=((0.22+S_(q.v)*0.55)*(0.5+0.5*front)).toFixed(3); let fill;
      if(hi===lo){ const c=sat(cmap(S_(q.v)),1.5); fill='rgba('+c+','+al+')'; }
      else { const gr=fg.createLinearGradient(q.P[lo][0],q.P[lo][1],q.P[hi][0],q.P[hi][1]), a=sat(cmap(S_(q.cv[lo])),1.5), b=sat(cmap(S_(q.cv[hi])),1.5);
        gr.addColorStop(0,'rgba('+a+','+al+')'); gr.addColorStop(1,'rgba('+b+','+al+')'); fill=gr; }
      fg.fillStyle=fill; fg.beginPath(); fg.moveTo(q.P[0][0],q.P[0][1]); for(let k=1;k<4;k++) fg.lineTo(q.P[k][0],q.P[k][1]); fg.closePath(); fg.fill(); });
    g.save(); g.filter='blur(2px)'; g.drawImage(fcv,0,0); g.restore();
    const P=TV.map(c=>proj(c,ang,rotY));
    g.strokeStyle='rgba(150,162,196,0.16)'; g.lineWidth=1.4;
    for(let i=0;i<16;i++) for(let j=i+1;j<16;j++){ let d=0; for(let k=0;k<4;k++) if(TV[i][k]!==TV[j][k]) d++; if(d!==1) continue; g.beginPath(); g.moveTo(P[i][0],P[i][1]); g.lineTo(P[j][0],P[j][1]); g.stroke(); }
    for(let i=0;i<16;i++) for(let j=i+1;j<16;j++){ let d=0, da=0; for(let k=0;k<4;k++) if(TV[i][k]!==TV[j][k]){ d++; da=k; } if(d!==1) continue;
      const cc=ECOL[AX[da]], loP=TV[i][da]===0?P[i]:P[j], hiP=TV[i][da]===0?P[j]:P[i];
      const lc='rgb('+cc.map(v=>Math.round(v+(255-v)*0.48))+')', dc='rgb('+cc.map(v=>Math.round(v*0.55))+')';
      const gr=g.createLinearGradient(loP[0],loP[1],hiP[0],hiP[1]); gr.addColorStop(0,lc); gr.addColorStop(1,dc);
      g.strokeStyle=gr; g.lineWidth=3.2; g.beginPath(); g.moveTo(P[i][0],P[i][1]); g.lineTo(P[j][0],P[j][1]); g.stroke(); }
    for(let i=0;i<16;i++){ g.fillStyle='rgba(235,242,255,0.95)'; g.strokeStyle='rgba(0,0,0,.5)'; g.lineWidth=1; g.beginPath(); g.arc(P[i][0],P[i][1],3.4,0,7); g.fill(); g.stroke(); }
    const pp=proj(peak,ang,rotY); g.fillStyle='#fff'; g.strokeStyle='rgba(0,0,0,.7)'; g.lineWidth=1.4; g.font='700 22px Inter,system-ui,sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    g.strokeText('★',pp[0],pp[1]); g.fillText('★',pp[0],pp[1]); tex.needsUpdate=true; }
  let tick=0;
  return { mesh, T0, T1, tick(t){ const a=t<T0||t>T1?0:smooth((t-T0)/FIN)*(1-smooth((t-(T1-FOUT))/FOUT));
      mesh.visible=a>0.005; mat.opacity=a; if(!mesh.visible) return;
      const cw=camera.getWorldPosition(_V); mesh.lookAt(cw.x,mesh.position.y,cw.z);
      if((tick++%2)===0||T.playing===false) draw(0.9+(t-T0)*0.55, 0.35*Math.sin((t-T0)*0.4)); } }; })();
/* D-343 (25/09): tira o HYDRA dos primeiros segundos — em vez do tesserato (D-340/LABTESS, código mantido acima
   mas não chamado mais), a abertura mostra o CARTAZ do trabalho: o emblema da NUS (relevo, .glb) e o título +
   autores (texto, canvas — decisão da M: título fica melhor em texto porque ele muda com facilidade — trocar uma
   letra é editar uma string aqui, nunca mais tocar Blender/exportar .glb de novo; o emblema, ao contrário, é fixo,
   tem relevo 3-D de verdade e faz sentido como modelo). Ficam parados à frente de quem entra, a mesma distância do
   antigo tesserato, até 7,5 s (era 8,0 s com o tesserato — INICIO/P0.sai ajustados junto, ver direcao.json rev -g),
   quando a peça começa a andar; então ambos SOMEM em fade (não cortam), como ele pediu. O emblema gira bem pouco
   (±8°, período ~20 s) para o relevo pegar luz enquanto olha; o conjunto (emblema + texto) balança junto, bem de
   leve, na mesma direção — não é dois objetos independentes, é uma composição só se movendo. O "click to start"
   que ele pediu já existia (botão #snd, ligava o som no primeiro toque) — só troquei o texto para inglês e
   deixei mais visível (CSS abaixo). */
/* D-344 (25/09, correção do D-343): ele mandou de volta — símbolo da NUS MUITO maior, título+autores SEM cartão/
   quadro (flutuando soltos), e tirar o texto "NUS Faculty of Dentistry". E ele trouxe o próprio título em 3-D:
   `titulo-atlas-cscs-3d.glb` (node `article_title_3d`, letras extrudidas — título E autores já vêm juntos nesse
   modelo, duas linhas). Então o canvas de texto (D-343) inteiro saiu; agora são só os DOIS .glb dele, sem nenhuma
   peça de texto minha. */
const INTRO=(()=>{ const T1=7.5, FOUT=0.6;
  const logo=M.nusEmblema, tit=M.tituloGlb; logo.visible=true; tit.visible=true;
  const baseX=INICIO.x, baseZ=INICIO.z-2.6;
  const titY=CFG.eyeY-0.10, logoY=titY+0.63;   // emblema bem acima, título logo abaixo do centro da vista
  const fadeMat=(o,a)=>o.traverse(n=>{ if(n.isMesh&&n.material){ if(!n.material.transparent){ n.material=n.material.clone(); n.material.transparent=true; } n.material.opacity=a; n.renderOrder=8; } });
  logo.position.set(baseX,logoY,baseZ); tit.position.set(baseX,titY,baseZ+0.01);
  /* D-345: "preciso de um fundo mais branco para conseguir ler... um transparecia bem suave só para facilitar
     a leitura" — sem virar cartão/quadro de novo (ele já tirou isso no D-344): um halo branco BEM suave atrás
     do emblema+título, radial (sem borda, sem canto reto — funde com o fundo nas pontas), só para dar contraste.
     D-346 (correção): ele apontou, com fotos marcadas, que a "tela" (o halo) não cobria tudo — sobrava
     arquitetura atravessando por trás de pontas do título/emblema — e que ela desenhava ATRÁS do texto por
     engano (renderOrder do halo, 6, era MAIOR que o do texto, 0 por padrão → halo pintava por cima). Corrigido:
     (a) o halo agora é dimensionado a partir da caixa real do emblema+título (Box3), com folga, em vez de um
     tamanho fixo arbitrário; (b) renderOrder do halo é MENOR que o do texto (halo primeiro, texto por cima);
     (c) depthTest desligado no halo, para a arquitetura próxima (arcos, vãos) nunca "atravessar" o painel
     enquanto ele estiver visível (só ocorre nesta janela parada da abertura). */
  const logoBox=new THREE.Box3().setFromObject(logo), titBox=new THREE.Box3().setFromObject(tit);
  const combined=logoBox.clone().union(titBox);
  /* D-352: o halo radial (D-345…D-350) era forte só no MEIO — nas pontas do título, onde ele marcou em vermelho, o
     gradiente já estava quase transparente e a arquitetura aparecia atrás ("o quadro não está lá"). Agora é um QUADRO:
     branco ALFA constante sobre toda a caixa real do emblema+título + margem PAD, e só DEPOIS da margem esfuma em FEATHER.
     Geometria (vista de quem entra): câmera em z 0,14, quadro em z baseZ−0,08 → d ≈ 2,68 m; o quadro fica 8 cm atrás do
     texto, então parece 3% menor — compensado por K=(d_quadro/d_texto). SWAY = o balanço lateral (±3,5 cm) e o giro do
     emblema (±8°) cabem dentro da margem. Tudo em metros; a textura é desenhada pixel a pixel (distância ao retângulo). */
  const PAD=0.22, FEATHER=0.30, SWAY=0.05, RAIO=0.08, ALFA=0.6;   // ALFA: semitransparente (pedido dele) — a arquitetura aparece de leve atrás
  const dTxt=Math.abs(INICIO.z-baseZ), K=(dTxt+0.08)/dTxt;
  const bw=(combined.max.x-combined.min.x)+2*(PAD+SWAY), bh=(combined.max.y-combined.min.y)+2*PAD;   // miolo sólido
  const haloW=(bw+2*FEATHER)*K, haloH=(bh+2*FEATHER)*K;
  const haloOffY=(combined.max.y+combined.min.y)/2-titY;   // deslocamento vertical do centro da caixa em relação a titY
  const PXM=420, HW=Math.round((bw+2*FEATHER)*PXM), HH=Math.round((bh+2*FEATHER)*PXM);
  const hc=document.createElement('canvas'); hc.width=HW; hc.height=HH; const hg=hc.getContext('2d');
  { const img=hg.createImageData(HW,HH), px=img.data, hx=bw/2-RAIO, hy=bh/2-RAIO;
    for(let j=0;j<HH;j++){ const y=(j+0.5)/PXM-(bh/2+FEATHER); for(let i=0;i<HW;i++){ const x=(i+0.5)/PXM-(bw/2+FEATHER);
      const qx=Math.max(Math.abs(x)-hx,0), qy=Math.max(Math.abs(y)-hy,0), dist=Math.hypot(qx,qy)-RAIO;   // >0 fora do miolo
      const u=Math.min(1,Math.max(0,dist/FEATHER)), a=dist<=0?ALFA:ALFA*(1-u*u*(3-2*u)), o=(j*HW+i)*4;
      px[o]=255; px[o+1]=255; px[o+2]=255; px[o+3]=Math.round(a*255); } }
    hg.putImageData(img,0,0); }
  const htex=new THREE.CanvasTexture(hc); htex.colorSpace=THREE.SRGBColorSpace;
  const hmat=new THREE.MeshBasicMaterial({map:htex,transparent:true,opacity:1,depthWrite:false,depthTest:false,toneMapped:false});
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(haloW,haloH),hmat); halo.renderOrder=4;
  const haloY=titY+haloOffY, haloZ=baseZ-0.08;
  halo.position.set(baseX,haloY,haloZ); scene.add(halo);
  return { halo, tick(t){ const a=t>=T1?0:t>=T1-FOUT?1-smooth((t-(T1-FOUT))/FOUT):1;
      const on=a>0.005; logo.visible=on; tit.visible=on; halo.visible=on; fadeMat(logo,a); fadeMat(tit,a); hmat.opacity=a;
      if(!on) return;
      const bx=baseX+0.035*Math.sin(t*0.28), by=0.014*Math.sin(t*0.42+0.6);
      logo.position.set(bx,logoY+by,baseZ); logo.rotation.y=0.14*Math.sin(t*0.32);
      tit.position.set(bx,titY+by,baseZ+0.01); tit.rotation.y=0.07*Math.sin(t*0.32);
      halo.position.set(bx,haloY+by,haloZ); const cw=camera.getWorldPosition(_V); halo.lookAt(cw.x,halo.position.y,cw.z); } }; })();
/* D-334 (decisão dele, 23/09): ZERO — ele vai animar tudo de novo, do começo. Sai TODO o conteúdo animado da M:
   cópias flutuando, estações, TELAs, linhas, poças, a maquete na mesa, os glifos, o HYDRA (tesserato, ilustrações
   de B7–B9, rosa) e o gráfico do monólito. Ficam: a arquitetura (A), a mesa vazia, o caminho da câmera (e as marcas
   do estúdio), a voz, o estúdio e os 5 objetos da sequência do eluato que pousam (D-321/D-331/D-332). A PEDRA do
   monólito continua dissolvendo em 1:45 — a câmera passa por onde ela está; só o campo/gráfico não acende mais.
   A v7.7 inteira está em _arquivo_M/app_v7.7.js · ZERO=false devolve tudo sem mexer em mais nada. */
const ZERO=true;
const SEQ5=[M.seqDisco,M.seqTubo,M.seqTuboDisco,M.seqEluato,M.seqPlaca];
if(ZERO){
  for(let i=KF.length-1;i>=0;i--) if(!SEQ5.includes(KF[i].obj)&&![M.c2cap,M.c2d14,M.c2d31,M.c3disc,M.c3tempo,M.c3vol,M.c3cel,M.c3curvas,M.hpD14,M.hpD31,M.hpCap,M.b34ref,M.b34cel,M.b34disc,M.b34vol,M.b34clk,M.b34p7,M.b34p28,M.b34p72,M.b34saf].includes(KF[i].obj)){ KF[i].obj.visible=false; KF.splice(i,1); }
  TELAS.forEach(x=>x.meshes.forEach(m=>{ m.visible=false; }));
  [...POOLS,MAQPOOL].forEach(P=>{ P.m.visible=false; P.r.visible=false; });
  BEAMS.forEach(b=>{ b.visible=false; });
  [maq.group,models4,GLOW,painel.m,tess.group,B0S,ILL,RUNNER,rose.mesh,...HALOS3,...RINGS3].forEach(o=>{ if(o) o.visible=false; });
  CEN.campoPainel(false);
}
/* =========================  13b. E7 — ROTEIRO DE MONTAGEM v16 (trilha R, D-110) · D-368…D-374  =================
   A peça do B3-4 ao loop, com UMA maquete só (D-110 §0.3): nasce em B3-4 com os 25 objetos metálicos, recebe o modelo em
   B5, pousa no fim da mesa, levanta no silêncio de B6-2, vai ao plinto e se DESDOBRA no tesserato (que não existe antes de
   1:45 — D-110 §0.1). Tudo em tempo REAL do áudio (E7T, medido: marcas do reconhecimento de fala nos CLIPS + envelope de
   energia por frase, 10 ms). [CONFIRMAR ±0,3 s no fone].
   Coordenadas: o grupo MQ tem o mesmo referencial da casca INTERNA do tesserato (meio-lado MQH = 0,554 local, a da casca
   w=−1 com persp 3,2): x = área (SA), y = tempo (ET), z = volume (EV), níveis −MQL · 0 · +MQL; a passagem (CP) desloca ±25 %
   do espaçamento pela diagonal (P1 −, P4 0, P7 +). Maquete: aresta 45 cm. No tesserato o MESMO grupo é copiado na pose da
   casca interna — os objetos nunca se movem uns em relação aos outros. */
const E7T={ fw0:42.3, fw1:48.0,
  b5:75.64, ens:76.85, gpr:79.58, gb:81.56, rf:82.83, xgb:84.38, integ:85.61, surf:88.16, b5fim:89.2, pousa0:89.3, pousa1:90.6,
  campo:90.0, res:90.35, dep:93.08, metal:94.5, b6off:106.3,
  sil:106.61, voo1:110.0, leg0:143.0, unf0:138.35, abre1:139.85, cresce1:141.85,   /* D-393: o cubo fica CUBO no plinto até os discos voltarem (voltaFim 2:18.35); só então desdobra em HYDRA */
  reveal:115.16, prolif:120.95, migr:122.06, mineral:124.38, safety:127.72, nao:132.49, roseOff:137.6,
  b7:138.42, cada:143.64, ref:147.11, bate:150.12, alem:158.4, b7off:162.4,
  b8:163.21, dois:164.75, porque:169.86, tres:167.95, quim:170.64, pred:174.32, cresc:176.26, segue:179.1, menos:184.8, cada8:186.3, arise:190.7, comp:193.48,
  b9:196.31, refs:197.66, b9L:202.85, quant:206.07, mat:210.46, prot:211.37, how:214.51, fund:217.99, fim:222.8 };
const E7={ framework:QS.get('framework')!=='0' };   // D-110 §3.1: o beat do framework (maquete vazia 0:41.9–0:44.9) — padrão ligado; ?framework=0 desliga
const MQH=0.554, MQL=0.44, MQ_ARESTA=0.45, S_MAQ=MQ_ARESTA/(2*MQH);
const LVL={SA:[113,169,219],ET:[1,3,5],EV:[5,10,15],CP:[1,4,7]};
const CPCOL=['#D1E6F5','#ED5787','#FF691F'].map(c=>new THREE.Color(c));   // P1 azul-claro · P4 rosa · P7 laranja (membranas das dpsc-tripolar-cell-age1/4/7)
const DIAM=[0.030,0.037,0.042].map(d=>d/MQ_ARESTA*2*MQH);                 // 3,0 · 3,7 · 4,2 cm na maquete → unidades locais
const BEAD=0.025/MQ_ARESTA*2*MQH, ROUGH=[0.12,0.35,0.55], CINZA=new THREE.Color('#b9bdc6');
/* normal map de ruído fino (acabamento jateado) — gerado aqui, sem arquivo */
const RUIDO=(()=>{ const n=128, d=new Uint8Array(n*n*4); for(let i=0;i<n*n;i++){ const a=Math.random()*6.283, r=Math.random()*0.6; d[i*4]=128+Math.cos(a)*r*127; d[i*4+1]=128+Math.sin(a)*r*127; d[i*4+2]=255; d[i*4+3]=255; }
  const t=new THREE.DataTexture(d,n,n); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3,3); t.needsUpdate=true; return t; })();
const MQ=new THREE.Group(); MQ.visible=false; scene.add(MQ);
/* 12 arestas do cubo (tinta, finas) */
/* D-394: um material por EIXO (x = área SA · y = tempo ET · z = volume EV) — no plinto, enquanto os discos falam, as arestas do fator da frase
   se tingem com a cor do fator (TSECOL do lab); a espessura acompanha a escala (no plinto o cubo cresce e fica a ~10 m) */
const MQE=[], MQEM=[0,1,2].map(()=>new THREE.MeshBasicMaterial({color:PAL.ink,transparent:true,opacity:0.85,depthWrite:false,toneMapped:false}));
{ const g=new THREE.BoxGeometry(1,1,1), w=0.006;
  for(let a=0;a<3;a++) for(const u of [-1,1]) for(const v of [-1,1]){ const m=new THREE.Mesh(g,MQEM[a]); const p=[0,0,0], sc=[w,w,w]; sc[a]=2*MQH+w; p[(a+1)%3]=u*MQH; p[(a+2)%3]=v*MQH; m.position.set(...p); m.scale.set(...sc); m.userData.a=a; MQ.add(m); MQE.push(m); } }
const MQEMAT={ set opacity(v){ MQEM.forEach(m=>{ m.opacity=v; }); } };
const _mqInk=new THREE.Color(PAL.ink), _mqTint=new THREE.Color();
function mqeEstilo(wLocal,tint){ MQE.forEach(m=>{ const a=m.userData.a, sc=[wLocal,wLocal,wLocal]; sc[a]=2*MQH+wLocal; m.scale.set(...sc); });
  MQEM.forEach((m,a)=>{ const k=tint?tint[a]:null; if(k&&k.k>0.001){ _mqTint.setRGB(k.c[0]/255,k.c[1]/255,k.c[2]/255); m.color.copy(_mqInk).lerp(_mqTint,k.k); } else m.color.copy(_mqInk); }); }
/* os 25 objetos (ATLAS.groups, na ordem g1…g25) */
const GEOS={esf:new THREE.IcosahedronGeometry(0.5,3), oct:new THREE.OctahedronGeometry(0.56), tet:new THREE.TetrahedronGeometry(0.64)};
const C25=A.groups.map((g,i)=>{ const L={SA:LVL.SA.indexOf(g.SA),ET:LVL.ET.indexOf(g.ET),EV:LVL.EV.indexOf(g.EV),CP:LVL.CP.indexOf(g.CP)};
  const mat=new THREE.MeshPhysicalMaterial({color:CINZA.clone(),metalness:1,roughness:0.12,clearcoat:0.3,clearcoatRoughness:0.15,envMapIntensity:1.15,transparent:true,opacity:1,
    normalMap:L.EV===2?RUIDO:null, normalScale:new THREE.Vector2(0,0), anisotropy:0});
  const h=new THREE.Group(); MQ.add(h);
  const ms={esf:new THREE.Mesh(GEOS.esf,mat),oct:new THREE.Mesh(GEOS.oct,mat),tet:new THREE.Mesh(GEOS.tet,mat)}; for(const k in ms) h.add(ms[k]);
  const forma=['esf','oct','tet'][L.ET], off=(L.CP-1)*0.25*MQL/Math.sqrt(3);
  const p3=new THREE.Vector3((L.SA-1)*MQL+off,(L.ET-1)*MQL+off,(L.EV-1)*MQL+off);
  const gx=i%5, gz=Math.floor(i/5), p0=new THREE.Vector3((gx-2)*0.19,0,(gz-2)*0.19);
  return {g:g.g,i,L,mat,h,ms,forma,p3,p0,d:DIAM[L.SA]}; });
/* o "campo de cor" de B5 (superfície de resposta, 20 %): 6×6×6 manchas suaves entre os objetos, cor = PROLIF previsto (CP no meio) */
const CAMPO=(()=>{ const n=6, pos=[], col=[]; for(let a=0;a<n;a++) for(let b=0;b<n;b++) for(let c=0;c<n;c++){ const u=[a,b,c].map(q=>q/(n-1));
    pos.push((u[0]*2-1)*0.5,(u[1]*2-1)*0.5,(u[2]*2-1)*0.5); const rgb=domColor('PROLIF',valCommon('PROLIF',{SA:u[0],ET:u[1],EV:u[2],CP:0.5})); col.push(rgb[0]/255,rgb[1]/255,rgb[2]/255); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
  const m=new THREE.Points(g,new THREE.PointsMaterial({size:0.26,map:POOLTEX,vertexColors:true,transparent:true,opacity:0,depthWrite:false,toneMapped:false,sizeAttenuation:true}));
  m.visible=false; MQ.add(m); return m; })();
/* sombra de contato da maquete pousada no fim da mesa */
/* D-515: a maquete não pousa mais na ponta da mesa (ficava atrás de quem anda para P5) — pára À VISTA, flutuando ~1,9 m à frente de P5,
   um pouco à direita e abaixo do gráfico do monólito (não tapa a linha de visão), e de lá voa para o plinto, de frente para a pessoa */
const MQLAND=[1.0,1.1,-16.4];
const MQSOMBRA=new THREE.Mesh(new THREE.PlaneGeometry(MQ_ARESTA*1.3,MQ_ARESTA*1.3),new THREE.MeshBasicMaterial({map:SOMBRATEX,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
MQSOMBRA.rotation.x=-Math.PI/2; MQSOMBRA.position.set(MQLAND[0],GEO.mesa.h+0.003,MQLAND[2]); MQSOMBRA.visible=false; scene.add(MQSOMBRA);

/* ---- B5: os quatro modelos de ML (glb do Vinicius, nós nomeados) ---- */
boot('HYDRA · E7 · modelos de ML');
const ML=[]; for(const f of ['gaussian-process-regression-3d.glb','gradient-boosting-regressor-3d.glb','random-forest-3d.glb','xgboost-3d.glb']){
  const h=await model({file:f,fit:0.78,el:'*',tilt:0}); const meshes=[];
  h.traverse(o=>{ if(o.isMesh&&o.material){ o.material=o.material.clone(); o.material.transparent=true; o.userData.op0=o.material.opacity; o.userData.L=0; o.castShadow=false; meshes.push(o); } });
  ML.push({h,meshes,n:nm=>h.getObjectByName(nm)}); }
const mlSet=(root,L,glow)=>{ if(!root) return; root.traverse(o=>{ if(o.isMesh){ o.userData.L=L; if(glow!==undefined) o.userData.glow=glow; } }); };
const MLOUT=[ML[0].n('mean_function'),ML[1].n('final_prediction'),ML[2].n('mean_prediction'),ML[3].n('final_prediction')];
const MLPOS=[[-1.35,0.30,2.55],[-0.46,0.52,2.85],[0.46,0.52,2.85],[1.35,0.30,2.55]];   /* D-388: mais espaço ("tudo muito espremido") — arco mais largo e alto, usando o vazio acima da maquete */
const MLBEAM=[0,1,2,3].map(()=>hpTubo('#ffd98a',0.004));   // quatro feixes de MESMA espessura (pesos iguais)
/* ---- B6-2 → B9: objetos próprios ---- */
boot('HYDRA · E7 · cápsulas');
const B7CAP=await model({file:'capsula-mta-repair-hp.glb',fit:0.26,el:['capsule_cement'],tilt:0});
const B8REF=await model({file:'capsula-mta-repair-hp.glb',fit:0.6,el:['capsule_cement'],tilt:0});
const B8A=await model({file:'capsulas-cement-a-b.glb',fit:0.6,el:['capsule_cement_a'],tilt:0});
const B8B=await model({file:'capsulas-cement-a-b.glb',fit:0.6,el:['capsule_cement_b'],tilt:0});
/* D-392: B9 "for biomaterials research… whether a biological response reflects the material itself or the testing protocol" (comentário
   dele: usar os glb) — de um lado do HYDRA as RESPOSTAS do material (gbl29 inert&bioactive · gbl21 wound healing), do outro os quatro
   elementos do PROTOCOLO (discos 5·10·15 · timer · tubos · célula) */
boot('HYDRA · E7 · B9');
const B9MAT=[await model({file:'inert&bioactive.glb',fit:1.0,el:'*',tilt:0.9}), await model({file:'wound-healing-assay-4-dishes.glb',fit:1.0,el:'*',tilt:0.9})];
const B9PROT=[await model({file:'ca3sio5-discs-5-10-15.glb',fit:0.6,el:'*',tilt:0.85}), await model({file:'timer-bancada-tanita-style.glb',fit:0.6,el:'*',tilt:0.15}),
  await model({file:'falcon-50ml-rack.glb',fit:0.6,el:'*',tilt:0.15}), await model({file:'dpsc-tripolar-old-cell.glb',fit:0.6,el:'*',tilt:0.5})];
const FUNDIU=FUNDIR?B9PROT.map(fundir):null;
/* D-522: objetos que flutuam (B7–B9) sem sombra projetada — a sombra deles cairia metros abaixo, no chão; só pesava no mapa de sombra */
[...B9MAT,...B9PROT,B8REF,B8A,B8B,B7CAP].forEach(h=>h&&h.traverse(o=>{ if(o.isMesh) o.castShadow=false; }));
/* cores dos MATERIAIS em B8 — tiradas das tampas das cápsulas (nunca as cores das passagens) */
const corTampa=(h,re,fb)=>{ let c=null; h.traverse(o=>{ if(!c&&o.isMesh&&re.test(o.name)&&o.material&&o.material.color) c=o.material.color.clone(); }); return c||new THREE.Color(fb); };
/* D-502: tampa do cimento A (Exp 1) VERDE em vez de laranja (pedido dele, 27/09) — a tampa é cor sólida no .glb (sem textura), então
   é tingida aqui, sem glb novo; MATCOR.Exp1 lê a tampa, então esferas, linha e tudo do Exp 1 ficam verdes junto (e o laranja deixa de
   competir com o laranja da passagem P7) */
const VERDE_EXP1='#22A861';
B8A.traverse(o=>{ if(o.isMesh&&/cap_(wall|dome|rim)/.test(o.name)&&o.material){ o.material=o.material.clone(); o.material.color.set(VERDE_EXP1); } });
const MATCOR={ProRoot:new THREE.Color('#ffffff'),Exp1:corTampa(B8A,/cap_(wall|dome)/,'#EF7C00'),Exp2:corTampa(B8B,/cap_(wall|dome)/,'#003D7C')};
/* B6: g4 e g23 em tamanho de mão (× 4), o elo com a maquete */
const B6MET=[4,23].map(gid=>{ const c=C25.find(o=>o.g===gid); const mat=c.mat.clone(); mat.color.copy(CPCOL[c.L.CP]); mat.roughness=ROUGH[c.L.EV]; mat.normalScale.set(0.6,0.6);
  const m=new THREE.Mesh(GEOS[c.forma],mat); m.scale.setScalar([0.037,0.042][gid===4?0:1]*4); m.visible=false; scene.add(m); return m; });
/* B7 · B8 · B9: esferas brancas FOSCAS (a medição) e halos, no referencial do MQ */
/* D-384: marcadores de B7/B8 legíveis dentro do HYDRA (pedido dele: "difícil de ver, dar mais contraste") — desenham POR CIMA das faces
   (renderOrder alto, sem teste de profundidade) e as esferas têm contorno escuro */
const esfFosca=(cor,r)=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),new THREE.MeshBasicMaterial({color:cor,transparent:true,opacity:0,toneMapped:false}));
  const o=new THREE.Mesh(new THREE.SphereGeometry(r*1.22,20,14),new THREE.MeshBasicMaterial({color:0x0b1020,side:THREE.BackSide,transparent:true,opacity:0})); o.renderOrder=0; m.add(o);
  /* D-388: desenham ANTES das faces (renderOrder 1 < 3) e com teste de profundidade — as faces passam por cima e tingem, então lê-se DENTRO
     do HYDRA (a D-384 punha por cima de tudo e parecia colado na frente); o contorno escuro e as faces a 45 % mantêm o contraste */
  m.renderOrder=1; m.visible=false; m.onBeforeRender=()=>{ o.material.opacity=m.material.opacity*0.9; }; MQ.add(m); return m; };
/* D-392: esferas de medição com MATÉRIA (pedido dele: "bolinhas brancas parecem nuvens, cartoon — dar textura"): cerâmica fosca
   com microporosidade (o normal map de ruído dos objetos jateados), iluminada pela sala; sem contorno de desenho animado */
const esfReal=(cor,r)=>{ const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,22),new THREE.MeshPhysicalMaterial({color:cor,roughness:0.42,metalness:0,clearcoat:0.5,clearcoatRoughness:0.25,
    normalMap:RUIDO,normalScale:new THREE.Vector2(0.45,0.45),sheen:0.3,transparent:true,opacity:0,envMapIntensity:1.2}));
  m.renderOrder=1; m.visible=false; MQ.add(m); return m; };
const halo7=(cor,r)=>{ const m=haloMesh(cor,r*1.25); m.geometry.dispose(); m.geometry=new THREE.RingGeometry(r*1.25*0.62,r*1.25,48); m.renderOrder=1; MQ.add(m); return m; };
const VPOS=(v)=>{ const L=k=>(v.n[k]*2-1)*MQL, off=(v.n.CP*2-1)*0.25*MQL/Math.sqrt(3); return new THREE.Vector3(L('SA')+off,L('ET')+off,L('EV')+off); };
const VALS=(A.atlas.valpts||[]).map(v=>({mat:v.mat,ci:['early','mid','late'].findIndex(k=>v.cond.startsWith(k)),std:v.v.PROLIF.std,p:VPOS(v),s:esfReal('#ffffff',0.05)}));
const P7=VALS.find(v=>v.mat==='ProRoot'&&v.ci===1).p, P7B=VALS.find(v=>v.mat==='ProRoot'&&v.ci===0).p;
const W7=[esfReal('#ffffff',0.06),esfReal('#ffffff',0.06)], H7=[halo7('#0b2a52',0.09),halo7('#0b2a52',0.09)], R7=halo7('#ffb020',0.08);
const TRACO=new THREE.Mesh(new THREE.CylinderGeometry(0.004,0.004,0.14,6),new THREE.MeshBasicMaterial({color:PAL.teal,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); TRACO.visible=false; MQ.add(TRACO);
const H8=[0,1,2].map(()=>halo7('#0b2a52',0.1)), R8=[0,1,2].map(()=>halo7('#ffb020',0.08));
const L8X=[0,1].map(()=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1,8),new THREE.MeshBasicMaterial({color:'#EF7C00',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.visible=false; MQ.add(m); return m; });
const RUN8=esfFosca('#ffffff',0.03), L8=[0,1].map(()=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1,8),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.visible=false; MQ.add(m); return m; });
/* o HYDRA no plinto: centro, escala (aresta externa ≈ 3,4 m) — longe de quem está em m6/m7 (7–10 m), com o olhar sugerido o5 */
const HYD={c:new THREE.Vector3(0,GEO.rot.plH+3.35,GEO.rot.z),   /* D-398: mais alto (pedido dele) — centro a 4,2 m, na altura dos olhos de quem está em P7 na rampa */
    /* D-380: flutua ("mágico"), mas mais baixo que a D-376 ("muito alto"): centro a 3,6 m, ~1,9 m de ar sobre o plinto */
  s:1.93, vel:+(QS.get('hspin')||0.55), persp:CFG.tess.persp};   // s: aresta externa ≈ 3,4 m no d4 = 2,2 do lab
tess.spin=0.25;
/* D-396: placa no plinto (texto dele, caderno 27/09): faixa curva na face do plinto — uma voltada para P6 (frente, +z) e outra para P7 (rampa) */
const PLACA=(()=>{ const txt=['Actual representation of HYDRA,','reconstructed from 25 experimental groups'], ARC=3.4, H=0.46, Rp=GEO.rot.plR+0.012;
  const c=document.createElement('canvas'); c.width=2048; c.height=Math.round(2048*H/ARC); const x=c.getContext('2d');
  x.fillStyle='rgba(12,14,20,0.82)'; x.beginPath(); x.roundRect(8,8,c.width-16,c.height-16,40); x.fill(); x.textAlign='center'; x.textBaseline='middle'; x.fillStyle='#ffffff';
  x.font='700 104px Inter,system-ui,sans-serif'; x.fillText(txt[0],c.width/2,c.height*0.33); x.font='500 92px Inter,system-ui,sans-serif'; x.fillStyle='#d9deec'; x.fillText(txt[1],c.width/2,c.height*0.7);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=8;
  const P7_=[5.126,-40.057], th7=Math.atan2(P7_[0]-HYD.c.x,P7_[1]-GEO.rot.z);
  return [0,th7].map(th=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(Rp,Rp,H,64,1,true,th-ARC/Rp/2,ARC/Rp),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
    m.position.set(HYD.c.x,0.47,GEO.rot.z); m.visible=false; scene.add(m); return m; }); })();
/* B6: onde ficam as peças (fileira abaixo do campo do monólito, 27 cm à frente da face) */
const B6Z=PNL.z+0.27, B6Y=0.78;
const E7K=[];
function kW(obj,a,b,p,s,only){ K(obj,[{t:a-0.02,...home(obj),only},{t:a-0.01,p,s:.02,only,still:true},{t:a+0.45,p,s,only,still:true},{t:b,p,s,only,still:true},{t:b+0.4,p,s:.001,only,still:true},{t:b+0.42,...home(obj)}]); E7K.push(obj); }
/* D-397: o monólito é só o monólito (pedido dele: "o espectador já entendeu o que significam; dar ênfase aos resultados sem glb") —
   saíram os discos, relógio, tubo, célula da fileira de B6 e os metálicos g4/g23 (kW/B6MET desligados) */
KF.forEach(k=>k.frames.sort((a,b)=>a.t-b.t));
/* B6-2: a rosa ao lado do tesserato */
rose.mesh.position.set(HYD.c.x-2.9,HYD.c.y-0.8,HYD.c.z+2.2); rose.mesh.scale.setScalar(1.5);

const E7S={ campo:null, roomRot:null, desdobra:0 };
const _e7a=new THREE.Vector3(), _e7b=new THREE.Vector3(), _e7c=new THREE.Vector3(), _e7q=new THREE.Quaternion();
function e7env(t,a,b,up=0.5,down=0.5){ return env(t,a,b,up,down); }
function mqEnvMap(){ const rot=camera.getWorldPosition(_e7a).z<GEO.rot.z+GEO.rot.R+1; if(rot===E7S.roomRot) return; E7S.roomRot=rot;
  const e=rot?(CEN.materiais.plinto&&CEN.materiais.plinto.envMap):(CEN.materiais.aco&&CEN.materiais.aco.envMap);
  [...C25.map(c=>c.mat),...B6MET.map(m=>m.material)].forEach(m=>{ m.envMap=e||null; m.needsUpdate=true; }); }
/* pose do MQ no referencial da vista (rel) */
function mqRel(cf,rel,s){ MQ.position.copy(cf.o).addScaledVector(cf.r,rel[0]).addScaledVector(cf.u,rel[1]).addScaledVector(cf.f,rel[2]); MQ.quaternion.setFromAxisAngle(_hUp,cf.yaw+0.35); MQ.scale.setScalar(s); }
const E7REL={b34:B34.maq, b5:[0,-0.30,1.95], fw:[0,0.30,4.6]};
const mlOp=(o,L)=>{ o.material.opacity=o.userData.op0*lerp(0.15,1,L); };

/* D-392: pouso das peças de B3-4 — inclinação de apresentação vai a zero, alinhadas com a mesa, e a base encosta no tampo */
const B34SOMB=new Map();
function E7b34pouso(t){ if(t<BT.fim) return; const k=smooth((t-BT.fim)/B34POUSA_DUR);
  for(const o of B34POUSO){ if(!o.visible) continue; o.rotation.y=alerp(o.rotation.y,0,k);
    o.children.forEach(w=>{ const core=w.children[0]; if(core&&o.userData.spec) core.rotation.x=(o.userData.spec.tilt||0)*(1-k); });
    if(k>=0.999){ if(o.userData.dyMesa===undefined){ o.updateMatrixWorld(true); const b=new THREE.Box3(); o.traverse(n=>{ if(n.isMesh&&n.visible) b.expandByObject(n,true); }); o.userData.dyMesa=b.isEmpty()?0:(GEO.mesa.h+0.002-b.min.y);
        const sz=b.getSize(new THREE.Vector3()), cc=b.getCenter(new THREE.Vector3()); const m=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(sz.x,0.05)*1.2,Math.max(sz.z,0.05)*1.2),new THREE.MeshBasicMaterial({map:SOMBRATEX,transparent:true,opacity:0.75,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
        m.rotation.x=-Math.PI/2; m.position.set(cc.x,GEO.mesa.h+0.003,cc.z); m.renderOrder=2; scene.add(m); B34SOMB.set(o,m); }
      o.position.y+=o.userData.dyMesa; }
    else if(o.userData.dyMesa!==undefined){ o.userData.dyMesa=undefined; const m=B34SOMB.get(o); if(m){ scene.remove(m); B34SOMB.delete(o); } } } }
function E7tick(t,dt,snap){
  const cf=camFrame(); mqEnvMap(); E7b34pouso(t);
  /* ===== 1. a pose da maquete, do beat do framework ao fim ===== */
  let vis=false, alpha=1, objA=1;
  if(E7.framework&&t>=E7T.fw0-0.05&&t<E7T.fw1+0.6){ vis=true; alpha=smooth((t-E7T.fw0)/0.6)*(1-smooth((t-E7T.fw1)/0.6)); objA=0; mqRel(cf,E7REL.fw,0.3/(2*MQH)); }
  else if(t>=BT.ref-0.05&&t<E7T.pousa0){ vis=true; alpha=smooth((t-BT.ref)/0.6);
    const k=smooth((t-BT.fim)/0.9); const rel=[lerp(E7REL.b34[0],E7REL.b5[0],k),lerp(E7REL.b34[1],E7REL.b5[1],k),lerp(E7REL.b34[2],E7REL.b5[2],k)]; mqRel(cf,rel,S_MAQ); }
  else if(t>=E7T.pousa0&&t<E7T.sil){ vis=true;   /* pousa no fim da mesa (1,3 s, controlado), como todo o resto da peça */
    const k=smooth((t-E7T.pousa0)/(E7T.pousa1-E7T.pousa0)); mqRel(cf,E7REL.b5,S_MAQ); const q0=MQ.quaternion.clone(), p0=MQ.position.clone();
    MQ.position.lerpVectors(p0,_e7a.set(...MQLAND),k); MQ.quaternion.slerpQuaternions(q0,_e7q.identity(),k); }
  else if(t>=E7T.sil&&t<E7T.fim+0.5){ vis=true; E7pl(t); }
  MQ.updateMatrixWorld(true);
  MQ.visible=vis&&alpha>0.005; MQEMAT.opacity=0.85*alpha*(1-E7S.desdobra); if(t<E7T.voo1) mqeEstilo(0.006,null);
  const sombra=false;   /* D-515: flutua, sem sombra de contato */ MQSOMBRA.visible=sombra; if(sombra) MQSOMBRA.material.opacity=0.7*smooth((t-(E7T.pousa1-0.2))/0.3)*(1-smooth((t-E7T.sil)/0.4));
  /* ===== 2. os 25 objetos: estados A (lista) → B (código) → C (espaço) ===== */
  const kCor=smooth((t-BT.cel)/0.5), kTam=smooth((t-BT.disc)/0.5), kAca=smooth((t-BT.vol)/0.5), kFor=smooth((t-BT.tempo)/0.5);
  const CASC=1.5/25, comb=pulse1(t,BT.comb,0.6), sat=E7sat(t);
  const on=MQ.visible&&objA>0&&t>=BT.ref;
  C25.forEach((c,i)=>{ c.h.visible=on; if(!on) return;
    const up=smooth((t-(BT.n25+i*CASC))/0.6);
    const d=lerp(BEAD,c.d,kTam), yA=-MQH+d/2+0.004;
    c.h.position.set(lerp(c.p0.x,c.p3.x,up),lerp(yA,c.p3.y,up),lerp(c.p0.z,c.p3.z,up));
    let s=d*(1+0.25*pulse1(t,BT.n25+i*CASC+0.5,0.35)+0.35*comb+((c.g===4||c.g===23)?0.6*pulse1(t,BT.alone,0.6):0));
    s*=E7pulsoTam(t,c);
    const tgt=c.forma; for(const k in c.ms){ const w=k==='esf'?(tgt==='esf'?1:1-kFor):(k===tgt?kFor:0); c.ms[k].visible=w>0.01; c.ms[k].scale.setScalar(Math.max(0.001,w)*s); }
    c.h.rotation.y=t*0.25+i; c.h.rotation.x=0.3*Math.sin(t*0.2+i);
    const m=c.mat; m.color.copy(CINZA).lerp(CPCOL[c.L.CP],kCor); m.roughness=lerp(0.12,ROUGH[c.L.EV],kAca);
    m.anisotropy=c.L.EV===1?0.7*kAca:0; m.normalScale.set(0.6*kAca*(c.L.EV===2?1:0),0.6*kAca*(c.L.EV===2?1:0));
    /* dessatura em B8 (a cor passa a ser dos materiais) */
    if(sat<1){ m.color.lerp(CINZA,1-sat); } m.opacity=lerp(0.3,1,sat)*alpha; m.transparent=m.opacity<0.999; m.depthWrite=m.opacity>0.95;
    m.emissive.copy(CPCOL[c.L.CP]).multiplyScalar(E7brilhoCor(t,c)); m.emissiveIntensity=1; });
  /* g4 ↔ g23 em "alone" (B3-4): a linha fina */
  { const ap=pulse1(t,BT.alone,0.6); const a=C25.find(c=>c.g===4), b=C25.find(c=>c.g===23);
    if(ap>0.01&&on){ hpLiga(B34PAR,a.h.getWorldPosition(_e7a),b.h.getWorldPosition(_e7b)); B34PAR.material.opacity=0.9*ap; B34PAR.visible=true; } else B34PAR.visible=false; }
  /* ===== 3. B5 — o modelo ===== */
  E7b5(t,cf);
  /* ===== 4. B6 — campo do monólito, gráfico, g4/g23 em tamanho de mão ===== */
  { const diss=t<T_MONO_OUT?0:smooth((t-T_MONO_OUT)/1.5); const campo=t>=E7T.campo&&diss<0.999; if(campo!==E7S.campo){ E7S.campo=campo; CEN.campoPainel(campo); }
    const pa=smooth((t-E7T.campo)/0.6)*(1-smooth(diss/0.45)); painel.m.visible=pa>0.01&&t<T_MONO_OUT+1.5; painel.m.material.opacity=pa; if(painel.m.visible) painel.draw(t);
    const k=pulse1(t,PT.rows[0]-0.3,0.9); if(k>0&&M.discsSA.visible){ const ch=M.discsSA.children; if(ch[2]) ch[2].scale.multiplyScalar(1+0.15*k); }
    const ma=0;   /* D-397: g4/g23 em tamanho de mão saíram */
    B6MET.forEach((m,j)=>{ m.visible=ma>0.01; if(!m.visible) return; const w=M.discsSA.children[j+1]; if(w&&M.discsSA.visible) w.getWorldPosition(_e7a); else _e7a.set(j?0.2:-0.3,B6Y,B6Z); m.position.set(_e7a.x,B6Y+0.30,B6Z); m.rotation.y=t*0.3; m.material.opacity=ma; m.material.transparent=ma<0.999; }); }
  /* ===== 5. B6-2 → B9 — o HYDRA ===== */
  E7hydra(t,dt,snap);
}
/* saturação dos objetos (1 = cor da passagem; 0 = metal cinza, 70 % transparente) — B8 */
function E7sat(t){ return 1-smooth((t-E7T.b8)/0.8)*(1-smooth((t-E7T.refs)/0.8)); }
/* B6-2: MINERALIZATION — os objetos pulsam pelo TAMANHO (os maiores mais forte) */
function E7pulsoTam(t,c){ const p=pulse1(t,DSC_T.min,0.9); return 1+p*0.25*(c.L.SA+1)/3; }
/* B6-2: PROLIF+MIGRATION — os objetos brilham pela COR (a cor é a passagem) · B7: piscam em sequência */
function E7brilhoCor(t,c){ let b=0.8*pulse1(t,DSC_T.prol,0.9); b=Math.max(b,0.9*pulse1(t,E7T.cada+c.i*0.05,0.15)); return b; }

function E7b5(t,cf){
  const on=t>=E7T.b5-0.05&&t<E7T.b5fim+0.7; ML.forEach(m=>{ m.h.visible=on; });
  if(!on){ MLBEAM.forEach(b=>{ b.visible=false; }); E7campo(t); return; }
  const a=smooth((t-E7T.b5)/0.6)*(1-smooth((t-E7T.b5fim)/0.6)), pz=1+0.08*pulse1(t,E7T.ens,0.3);
  ML.forEach((m,i)=>{ const p=MLPOS[i]; m.h.position.copy(cf.o).addScaledVector(cf.r,p[0]).addScaledVector(cf.u,p[1]+APRES_DY).addScaledVector(cf.f,p[2]);   /* D-526 */
    m.h.lookAt(cf.eye.x,m.h.position.y,cf.eye.z); m.h.scale.setScalar(pz); });
  /* quem acende quando (L: 0 silhueta 15 % → 1 cheio) */
  const L=(t0,d=0.15)=>smooth((t-t0)/d);
  const G=ML[0], g=E7T.gpr; for(let k=1;k<=6;k++) mlSet(G.n('observation_'+k),L(g+0.1*(k-1),0.1));
  for(let k=1;k<=4;k++) mlSet(G.n('posterior_sample_'+k),L(g+0.55+0.1*(k-1),0.2)); mlSet(G.n('mean_function'),L(g+1.0,0.3)); mlSet(G.n('uncertainty_2sigma'),L(g+1.2,0.25));
  const B=ML[1], b=E7T.gb; for(let k=1;k<=4;k++) mlSet(B.n('tree_'+k),L(b+0.2*(k-1),0.15)); for(let k=1;k<=3;k++) mlSet(B.n('sum_node_'+k),L(b+0.2*k-0.05,0.1));
  mlSet(B.n('additive_path'),L(b+0.8,0.15)); mlSet(B.n('arrow_head'),L(b+0.85,0.1)); mlSet(B.n('final_prediction'),L(b+0.95,0.1));
  const R=ML[2], r=E7T.rf; for(let k=1;k<=6;k++){ mlSet(R.n('tree_'+k),L(r,0.3)); mlSet(R.n('vote_'+k),L(r+0.5,0.2)); }
  mlSet(R.n('center_stem'),L(r+0.7,0.15)); mlSet(R.n('mean_prediction'),L(r+0.9,0.1)); mlSet(R.n('mean_symbol'),L(r+0.9,0.1));
  const X=ML[3], x=E7T.xgb; for(let k=1;k<=5;k++){ const t0=x+0.2*(k-1); mlSet(X.n('tree_'+k),L(t0,0.15)); mlSet(X.n('add_link_'+k),L(t0+0.15,0.1)); mlSet(X.n('sum_node_'+k),L(t0+0.15,0.1)); }
  mlSet(X.n('additive_column'),L(x+0.9,0.15)); mlSet(X.n('final_prediction'),L(x+1.0,0.1));
  ML.forEach((m,i)=>m.meshes.forEach(o=>{ let Lv=o.userData.L||0;
    if(i===2&&o.name==='predicted_leaf') o.material.emissive&&o.material.emissive.setRGB(1,0.85,0.4).multiplyScalar(0.8*pulse1(t,E7T.rf+0.3,0.5));
    if(i===3&&/^pruned_/.test(o.name)){ const tr=+((o.parent&&o.parent.name||'').split('_')[1]||1); Lv=Lv*(1-0.88*smooth((t-(E7T.xgb+0.2*(tr-1)+0.15))/0.3)); }
    mlOp(o,Lv); o.material.opacity*=a; o.visible=a>0.01; }));
  /* quatro feixes de MESMA espessura, das quatro saídas a um ponto sobre a maquete */
  const alvo=MQ.localToWorld(_e7c.set(0,MQH+0.25,0)), fa=smooth((t-E7T.integ)/0.8)*(1-smooth((t-E7T.b5fim)/0.5));
  MLBEAM.forEach((bm,i)=>{ const o=MLOUT[i]; if(!o||fa<0.01){ bm.visible=false; return; } o.getWorldPosition(_e7a); _e7b.copy(_e7a).lerp(alvo,Math.min(1,(t-E7T.integ)/0.8)); hpLiga(bm,_e7a,_e7b); bm.material.opacity=0.85*fa; bm.visible=true; });
  E7campo(t); }
/* o campo de cor: espalha em "four-dimensional response surface", fica com a maquete até o desdobramento */
function E7campo(t){ const a=smooth((t-E7T.surf)/1.0)*(1-smooth((t-E7T.voo1)/1.0)); CAMPO.visible=MQ.visible&&a>0.01; if(!CAMPO.visible) return;
  CAMPO.material.opacity=0.2*a; CAMPO.scale.setScalar(Math.max(0.02,smooth((t-E7T.surf)/1.0))); }

/* ===== O HYDRA: voo da mesa ao plinto, desdobramento, recolorações, B7, B8, B9, recolhimento ===== */
function E7pl(t){ /* pose do MQ do silêncio em diante (a do tesserato vem de E7hydra) */
  if(t<E7T.voo1){ const k=smooth((t-E7T.sil)/(E7T.voo1-E7T.sil)); _e7a.set(...MQLAND); _e7b.copy(HYD.c);
    MQ.position.lerpVectors(_e7a,_e7b,k); MQ.position.y+=Math.sin(Math.PI*k)*1.6; MQ.quaternion.identity(); MQ.scale.setScalar(S_MAQ); } }
/* ===== D-375: O TESSERATO VERDADEIRO — a drawTess() do lab.html (seção "02 TESSERACT") portada para 3-D de verdade =====
   Pedido dele: "fiel ao lab; tem que ser o tesserato verdadeiro" (a maquete da mesa pode ser simulada). Mesma matemática, linha a linha:
   24 faces 2-D do 4-cubo (d1<d2, as outras duas coordenadas em 0/1), cada uma 9×9; valor = gridVal(dom,{SA,ET,EV,CP}) (a MESMA função do
   lab, sem a reamostragem da D-103); cor = TWOCOL[dom] com tsS (contraste esticado ao mín–máx das faces; SAFETY absoluto) e saturação
   ×1,5; alfa do quad = (0,22 + tsS(v)·0,55)·(0,5 + 0,5·frente). Movimento: XW = ang + YZ (tombo) = 0,6·ang; ang += 0,02·spin(0,3) por
   quadro do lab → 0,36 rad/s. Projeção 4-D d4 = 2,2 (k4 = d4/(d4−w)). Arestas: cor TSECOL em gradiente, CLARO no nível baixo do fator →
   ESCURO no alto. 16 vértices; ★ = pico previsto (a mesma busca do tsBar). As 25 condições (atlas.anchors) e os pontos de validação
   (valpts) são projetados pela MESMA rotação — como os marcadores do lab.
   O que não dá para portar e ficou de fora: o fundo escuro #05060c do canvas (aqui é a sala), o blur de 2 px das faces, a perspectiva 3-D
   d3 = 3,0 (aqui é a câmera de verdade), o arraste com o mouse. Gradiente dentro do quad: o lab pinta um gradiente linear do canto mais
   baixo ao mais alto; aqui é a interpolação de cor por vértice (Gouraud) — visualmente equivalente, não idêntico. */
const LABTWO={PROLIF:[[0,'#e8a800'],[.5,'#efe6d6'],[1,'#6d28d9']],MINERAL:[[0,'#11b5a4'],[.5,'#e9f1ee'],[1,'#c01a63']],HEAL:[[0,'#f08a24'],[.5,'#efe9e0'],[1,'#1d4ed8']],SAFETY:[[0,'#d11f3a'],[.5,'#f7c948'],[1,'#1fa85c']]};
const LABECOL={SA:[45,212,191],ET:[251,191,36],EV:[96,165,250],CP:[244,114,182]}, LABAX=['SA','ET','EV','CP'];
const LT=(()=>{ const SUB=9, D4=2.2, g=new THREE.Group(); g.visible=false; scene.add(g);
  const sat=(c,k)=>{ const y=0.299*c[0]+0.587*c[1]+0.114*c[2]; return c.map(v=>Math.max(0,Math.min(255,Math.round(y+(v-y)*k)))); };
  const val=(d,c)=>gridVal(d,{SA:c[0],ET:c[1],EV:c[2],CP:c[3]});
  const FACES=[]; for(let d1=0;d1<4;d1++) for(let d2=d1+1;d2<4;d2++){ const fx=[0,1,2,3].filter(x=>x!==d1&&x!==d2); for(let a=0;a<2;a++) for(let b=0;b<2;b++) FACES.push({d1,d2,fx,fv:[a,b]}); }
  const Q=[]; FACES.forEach(f=>{ for(let i=0;i<SUB;i++) for(let j=0;j<SUB;j++){ const c00=[0,0,0,0]; f.fx.forEach((ax,k)=>c00[ax]=f.fv[k]);
    const c10=c00.slice(), c01=c00.slice(), c11=c00.slice(), u0=i/SUB, u1=(i+1)/SUB, v0=j/SUB, v1=(j+1)/SUB;
    c00[f.d1]=u0; c00[f.d2]=v0; c10[f.d1]=u1; c10[f.d2]=v0; c01[f.d1]=u0; c01[f.d2]=v1; c11[f.d1]=u1; c11[f.d2]=v1; Q.push([c00,c10,c11,c01]); } });
  const NQ=Q.length, NV=NQ*4, P4=new Float32Array(NV*4); Q.forEach((q,k)=>q.forEach((c,m)=>P4.set(c,(k*4+m)*4)));
  /* cor e alfa-base por domínio (como o tsBuildCache + tsS + tsCmap + tsSat do lab) */
  const COL={}; for(const d of ['PROLIF','MINERAL','HEAL','SAFETY']){ const cv=Q.map(q=>q.map(c=>val(d,c))); let lo=1e9,hi=-1e9; cv.forEach(a=>a.forEach(v=>{ if(v<lo) lo=v; if(v>hi) hi=v; }));
    const S=v=>d==='SAFETY'?v:(v-lo)/((hi-lo)||1), rgb=new Float32Array(NV*3), a0=new Float32Array(NQ);
    cv.forEach((a,k)=>{ a.forEach((v,m)=>{ const c=sat(sampleScale(LABTWO[d],S(v)),1.5); rgb.set([c[0]/255,c[1]/255,c[2]/255],(k*4+m)*3); }); a0[k]=0.22+S((a[0]+a[1]+a[2]+a[3])/4)*0.55; });
    /* ★ pico previsto: a busca do tsBar() */
    const dd=A.grid.domains[d], ax=dd.axes, sl=dd.slider; let mx=-1, mc=null;
    for(let si=0;si<NSL;si++) for(let i=0;i<N;i++) for(let j=0;j<N;j++) for(let k=0;k<N;k++){ const v=dd.frames[si][i*N*N+j*N+k]; if(v>mx){ mx=v; const nc={}; nc[ax[0]]=i/(N-1); nc[ax[1]]=j/(N-1); nc[ax[2]]=k/(N-1); nc[sl]=si/(NSL-1); mc=nc; } }
    COL[d]={rgb,a0,peak:[mc.SA,mc.ET,mc.EV,mc.CP],lo:d==='SAFETY'?0:lo,hi:d==='SAFETY'?1:hi}; }
  const geo=new THREE.BufferGeometry(), pos=new Float32Array(NV*3), col=new Float32Array(NV*4), idx=new Uint32Array(NQ*6);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,4)); geo.setIndex(new THREE.BufferAttribute(idx,1));
  const fmat=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const faces=new THREE.Mesh(geo,fmat); faces.frustumCulled=false; faces.renderOrder=3; g.add(faces);
  /* arestas: gradiente claro (nível baixo) → escuro (alto), como o lab */
  const TV=[]; for(let m=0;m<16;m++) TV.push([(m>>0)&1,(m>>1)&1,(m>>2)&1,(m>>3)&1]);
  const EDG=[]; for(let i=0;i<16;i++) for(let j=i+1;j<16;j++){ let d=0,da=0; for(let k=0;k<4;k++) if(TV[i][k]!==TV[j][k]){ d++; da=k; } if(d!==1) continue;
    const cc=LABECOL[LABAX[da]], lc=cc.map(v=>(v+(255-v)*0.48)/255), dc=cc.map(v=>v*0.55/255);
    const cg=new THREE.CylinderGeometry(1,1,1,8,1,true), n=cg.attributes.position.count, ca=new Float32Array(n*3);
    for(let q=0;q<n;q++){ const hi=cg.attributes.position.getY(q)>0; ca.set(hi?dc:lc,q*3); } cg.setAttribute('color',new THREE.BufferAttribute(ca,3));
    const m=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,toneMapped:false})); m.renderOrder=4; g.add(m);
    EDG.push({m,lo:TV[i][da]===0?i:j,hi:TV[i][da]===0?j:i,fac:LABAX[da]}); }
  const vg=new THREE.SphereGeometry(1,10,8), VT=TV.map(()=>{ const m=new THREE.Mesh(vg,new THREE.MeshBasicMaterial({color:0xebf2ff,transparent:true,opacity:0.9,depthWrite:false,toneMapped:false})); m.renderOrder=5; g.add(m); return m; });
  const star=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.font='700 52px Inter,system-ui,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.lineWidth=5; x.strokeStyle='rgba(0,0,0,.7)'; x.strokeText('★',32,34); x.fillStyle='#fff'; x.fillText('★',32,34);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,toneMapped:false})); sp.renderOrder=6; g.add(sp); return sp; })();
  /* tsProj do lab SEM a perspectiva 3-D (aqui é a câmera): XW = ang, tombo YZ = 0,6·ang, k4 = d4/(d4−w). Y do canvas desce → y do mundo sobe (−Y) */
  function proj(p,ang,d4,out,o=0){ let x=p[o]-0.5, y=p[o+1]-0.5, z=p[o+2]-0.5, w=p[o+3]-0.5, c=Math.cos(ang), s=Math.sin(ang), t=x*c-w*s; w=x*s+w*c; x=t;
    const a2=ang*0.6; c=Math.cos(a2); s=Math.sin(a2); t=y*c-z*s; z=y*s+z*c; y=t; const k=d4/(d4-w); out[0]=x*k; out[1]=-y*k; out[2]=z*k; return out; }
  const _o=[0,0,0], _a=new THREE.Vector3(), _b=new THREE.Vector3(), _up=new THREE.Vector3(0,1,0), ord=new Array(NQ).fill(0).map((_,i)=>i), zq=new Float32Array(NQ), cur={rgb:new Float32Array(NV*3),a0:new Float32Array(NQ)};
  let init=false;
  const st={ang:0,d4:D4,dom:'PROLIF',mix:null,alpha:1,faceMul:1,pulse:{SA:0,ET:0,EV:0,CP:0},edgeR:0.0048,vtxR:0.01,dentro:0};   /* dentro: 0 → 1 apaga as barras de dentro (D-507) */
  function update(dt,camLocal){
    /* cor-alvo (um domínio, ou a média de vários) com transição suave, como a troca de domínio do lab */
    const L=st.mix||[st.dom], e=init?1-Math.exp(-dt*(st.rate||1.6)):1; init=true;   /* D-380: troca de cor ~2 s (antes ~0,6 s: "as cores trocam muito rápido") */
    for(let q=0;q<NV*3;q++){ let v=0; for(const d of L) v+=COL[d].rgb[q]; cur.rgb[q]+=(v/L.length-cur.rgb[q])*e; }
    for(let q=0;q<NQ;q++){ let v=0; for(const d of L) v+=COL[d].a0[q]; cur.a0[q]+=(v/L.length-cur.a0[q])*e; }
    /* D-507 (desempenho no Quest): sem faces (final), nada de projetar/ordenar os 1944 quads — é o que pesava junto com a sobreposição */
    const semFaces=st.alpha*st.faceMul<0.004; faces.visible=!semFaces;
    if(!semFaces){
    for(let v=0;v<NV;v++){ proj(P4,st.ang,st.d4,_o,v*4); pos[v*3]=_o[0]; pos[v*3+1]=_o[1]; pos[v*3+2]=_o[2]; }
    /* profundidade de cada quad vista de quem olha (para a "frente" do lab e a ordem de desenho de trás para a frente) */
    let zmn=1e9,zmx=-1e9; for(let q=0;q<NQ;q++){ let d=0; for(let m=0;m<4;m++){ const b=(q*4+m)*3; d+=(pos[b]-camLocal.x)**2+(pos[b+1]-camLocal.y)**2+(pos[b+2]-camLocal.z)**2; } zq[q]=-d; if(zq[q]<zmn) zmn=zq[q]; if(zq[q]>zmx) zmx=zq[q]; }
    for(let q=0;q<NQ;q++){ const front=(zq[q]-zmn)/((zmx-zmn)||1), al=cur.a0[q]*(0.5+0.5*front)*st.alpha*st.faceMul;
      for(let m=0;m<4;m++){ const v=q*4+m; col[v*4]=cur.rgb[v*3]; col[v*4+1]=cur.rgb[v*3+1]; col[v*4+2]=cur.rgb[v*3+2]; col[v*4+3]=al; } }
    ord.sort((a,b)=>zq[a]-zq[b]); for(let k=0;k<NQ;k++){ const q=ord[k], b=q*4; idx.set([b,b+1,b+2,b,b+2,b+3],k*6); }
    geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true; geo.index.needsUpdate=true; }
    const VP=TV.map(c=>{ proj(c,st.ang,st.d4,_o); return new THREE.Vector3(_o[0],_o[1],_o[2]); });
    /* D-507: "tirar as barras de dentro" — peso de cada vértice pelo raio projetado (casca interna ≈ 0, externa ≈ 1); com st.dentro → 1 as
       arestas e vértices de dentro (e as ligações) somem suavemente e fica a casca externa girando */
    let rmn=1e9,rmx=-1e9; const RV=VP.map(v=>{ const r=v.length(); if(r<rmn) rmn=r; if(r>rmx) rmx=r; return r; });
    const WV=RV.map(r=>{ const u=clamp(((r-rmn)/((rmx-rmn)||1)-0.35)/0.4,0,1); return 1-st.dentro*(1-u*u*(3-2*u)); });
    VT.forEach((m,i)=>{ m.position.copy(VP[i]); m.scale.setScalar(st.vtxR); m.material.opacity=0.9*st.alpha*WV[i]; m.visible=WV[i]>0.02; });
    EDG.forEach(E=>{ const a=VP[E.lo], b=VP[E.hi]; _b.copy(b).sub(a); const len=_b.length()||1e-6, pu=st.pulse[E.fac]||0;
      E.m.position.copy(a).addScaledVector(_b,0.5); E.m.quaternion.setFromUnitVectors(_up,_b.normalize()); E.m.scale.set(st.edgeR*(1+2.2*pu),len,st.edgeR*(1+2.2*pu)); const wE=Math.min(WV[E.lo],WV[E.hi]); E.m.material.opacity=st.alpha*wE; E.m.visible=wE>0.02; });
    const pk=COL[st.dom].peak; proj(pk,st.ang,st.d4,_o); star.position.set(_o[0],_o[1],_o[2]); star.scale.setScalar(0.06); star.material.opacity=st.alpha; }
  return {g,st,update,proj,COL,faces,innerHalf:d4=>0.5*d4/(d4+0.5)}; })();
tess.group.visible=false;
/* D-380: ESCALA DE COR ao lado do HYDRA (pedido dele: "tem que explicar o que é cada cor… o sistema de cores tem que ficar mais evidente").
   As 4 respostas com a sua escala de duas cores do lab (TWOCOL) — a ativa acesa, as outras apagadas — e, grande, a escala da ativa com os
   valores reais nas pontas (as mesmas pontas do contraste das faces: mín–máx das faces; SAFETY absoluta), em unidades do lab (CYUNIT).
   A cada troca de resposta a escala "sobe" do baixo para o alto em ~2 s, junto com a recoloração do tesserato. */
/* D-389: LEGENDA DINÂMICA (pedido dele: "ela pode medir um ponto dentro do hydra e, à medida que as cores mudam no ponto, a legenda
   representa"). Uma SONDA — um ponto branco com aro escuro — passeia devagar dentro do HYDRA (um protocolo que muda aos poucos); um fio
   liga a sonda à barra. A barra é a escala da propriedade pintada; a SETA na barra mostra o valor previsto no ponto da sonda, e o
   quadradinho ao lado tem a cor exata do ponto. Quando o HYDRA troca de propriedade, a barra escorre para a escala nova e a seta anda
   junto. Sem números: só o nome, high/low. */
const ORD4=['PROLIF','HEAL','MINERAL','SAFETY'];
function domSeq(t){ const f=(a,passo,ini,dur)=>{ const i=Math.max(0,Math.floor((t-a)/passo)); return {de:ORD4[(ini+Math.max(0,i-1))%4],para:ORD4[(ini+i)%4],t0:a+i*passo,i0:i,dur}; };
  /* D-392 (comentário dele no caderno): em "HYDRA adjusts … reference cement" as cores passam RÁPIDO pelas quatro (o espectador aprende a
     legenda primeiro), depois mais devagar; em "To validate" legenda e sonda somem e o HYDRA fica em proliferação */
  /* D-393: o ciclo rápido começa quando o HYDRA termina de se formar (cresce1 = 2:21.85), não em "HYDRA adjusts" (2:18.42) */
  const Q0=E7T.leg0, Q1=E7T.leg0+10, passoQ=(Q1-Q0)/4;   /* D-514: 2,5 s por cor (era ~1,3 s: "muito rápida, mal consegui ver") */
  if(t<Q0) return {de:'PROLIF',para:'PROLIF',t0:E7T.cresce1,dur:2};
  if(t<Q1){ const r=f(Q0,passoQ,0,0.9); if(r.i0===0) r.de='PROLIF'; return r; }
  if(t<E7T.b8){ const r=f(Q1,8,0,2); r.de=r.i0===0?'SAFETY':r.de; return r; }
  if(t<197.66){ const iS=Math.floor((E7T.b8-Q1)/8); return {de:ORD4[iS%4],para:'PROLIF',t0:E7T.b8,dur:2}; }
  /* D-395: B9 — "a reference surface … across testing protocols" (3:17.66 → 3:22.85) percorre as quatro, rápido, e volta a PROLIFERAÇÃO
     quando a legenda e as linhas de B8 voltam (as esferas são dados de crescimento celular: a cor tem de ser a mesma propriedade) */
  const pB=(E7T.b9L-E7T.refs)/4; if(t<E7T.refs+3*pB){ const r=f(E7T.refs,pB,1,0.6); if(r.i0===0) r.de='PROLIF'; return r; }
  return {de:'SAFETY',para:'PROLIF',t0:E7T.refs+3*pB,dur:0.6}; }   /* B9 e o final */
const LEG=(()=>{ const NOME={PROLIF:'PROLIFERATION',HEAL:'MIGRATION',MINERAL:'MINERALIZATION',SAFETY:'SAFETY'};
  const cw=420, ch=900, PW=1.4, PH=PW*ch/cw, c=document.createElement('canvas'); c.width=cw; c.height=ch; const x=c.getContext('2d'); const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(PW,PH),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false})); m.renderOrder=7; m.visible=false; scene.add(m);
  const bx=cw/2-50, bw=130, by1=160, by0=810, h=by0-by1;
  const L2W=(px,py,out)=>out.set((px/cw-0.5)*PW,(0.5-py/ch)*PH,0.004);
  /* a seta (triângulo) e o quadradinho com a cor do ponto — malhas por cima do painel, movidas por quadro (o canvas só redesenha na troca) */
  const seta=new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(-0.12,0.06,0),new THREE.Vector3(-0.12,-0.06,0)]),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  seta.renderOrder=8; m.add(seta);
  const qd=new THREE.Mesh(new THREE.PlaneGeometry(0.1,0.1),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,toneMapped:false})); qd.renderOrder=8; m.add(qd);
  const qda=new THREE.Mesh(new THREE.PlaneGeometry(0.12,0.12),new THREE.MeshBasicMaterial({color:0x0b1020,transparent:true,depthWrite:false})); qda.renderOrder=8; m.add(qda);
  const rgb=a=>'rgb('+a.map(Math.round).join(',')+')'; let chave='';
  function draw(de,para,k){ const key=de+'>'+para+'|'+Math.round(k*40); if(key===chave) return; chave=key; x.clearRect(0,0,cw,ch);
    x.fillStyle='rgba(12,14,20,0.8)'; x.beginPath(); x.roundRect(0,0,cw,ch,28); x.fill(); x.textAlign='center'; x.textBaseline='alphabetic';
    x.save(); x.beginPath(); x.rect(0,16,cw,90); x.clip(); x.font='700 44px Inter,system-ui,sans-serif'; x.fillStyle='#ffffff';
    if(k<1&&de!==para){ const a=k<0.5?1-k*2:(k-0.5)*2; x.globalAlpha=a; x.fillText(k<0.5?NOME[de]:NOME[para],cw/2,82); } else x.fillText(NOME[para],cw/2,82); x.restore(); x.globalAlpha=1;   /* D-391: um nome de cada vez (antes sobrepunham) */
    const front=by0-h*k;
    for(let yy=by0;yy>by1;yy--){ const u=(by0-yy)/h, cA=sampleScale(LABTWO[de],u), cB=sampleScale(LABTWO[para],u), w=smooth((yy-front+40)/80);   /* abaixo da frente = já na escala nova */
      x.fillStyle=rgb([cA[0]+(cB[0]-cA[0])*w,cA[1]+(cB[1]-cA[1])*w,cA[2]+(cB[2]-cA[2])*w]); x.fillRect(bx,yy-1,bw,1.5); }
    x.strokeStyle='rgba(255,255,255,.6)'; x.lineWidth=3; x.strokeRect(bx,by1,bw,h);
    x.fillStyle='#ffffff'; x.font='800 54px Inter,system-ui,sans-serif'; x.fillText('high',bx+bw/2,by1-14); x.fillText('low',bx+bw/2,by0+62);
    tex.needsUpdate=true; }
  const _v=new THREE.Vector3();
  return { m, pontaSeta:new THREE.Vector3(),
    tick(t,seq,alfa,centro,escala,S,corPt){ const k=smooth((t-seq.t0)/(seq.dur||2));
      m.visible=alfa>0.01; if(!m.visible) return false; draw(seq.de,seq.para,k); m.material.opacity=alfa;
      const cw_=camera.getWorldPosition(new THREE.Vector3()), f=new THREE.Vector3().subVectors(cw_,centro).setY(0).normalize(), r=new THREE.Vector3(-f.z,0,f.x);
      m.position.copy(centro).addScaledVector(r,-(escala*1.55+0.7)).addScaledVector(f,0.4); m.position.y=centro.y+0.15; m.lookAt(cw_.x,m.position.y,cw_.z);
      const py=by0-h*clamp(S,0,1); L2W(bx-4,py,seta.position); L2W(bx+bw+44,py,qd.position); qda.position.copy(qd.position); qda.position.z-=0.001;
      qd.material.color.setRGB(corPt[0]/255,corPt[1]/255,corPt[2]/255); [seta,qd,qda].forEach(o=>{ o.material.opacity=alfa; });
      m.updateMatrixWorld(true); L2W(bx-60,py,_v); this.pontaSeta.copy(m.localToWorld(_v)); return true; } }; })();
/* a sonda: ponto branco com aro, dentro do HYDRA, e o fio até a seta */
const SONDA=(()=>{ const g=new THREE.Group(); g.visible=false; scene.add(g);
  const p=new THREE.Mesh(new THREE.SphereGeometry(0.05,16,12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,toneMapped:false})); p.renderOrder=9; g.add(p);
  const aro=new THREE.Mesh(new THREE.RingGeometry(0.075,0.1,40),new THREE.MeshBasicMaterial({color:0x0b1020,transparent:true,side:THREE.DoubleSide})); aro.renderOrder=9; g.add(aro);
  const fio=hpTubo('#ffffff',0.009); fio.renderOrder=9;
  const n=t=>[0.5+0.32*Math.sin(t*0.21),0.5+0.32*Math.sin(t*0.17+1),0.5+0.32*Math.sin(t*0.13+2),0.5+0.32*Math.sin(t*0.19+3)];
  return { g, fio, n, tick(pos,alfa,ponta){ g.visible=alfa>0.01; fio.visible=g.visible&&!!ponta; if(!g.visible) return; g.position.copy(pos);
    const cw=camera.getWorldPosition(new THREE.Vector3()); aro.lookAt(cw); p.material.opacity=alfa; aro.material.opacity=alfa; aro.scale.setScalar(1+0.25*Math.sin(performance.now()*0.004));   /* halo pulsando */
    if(ponta){ hpLiga(fio,pos,ponta); fio.material.opacity=0.8*alfa; } } }; })();
const _sd=[0,0,0], _sdV=new THREE.Vector3(), PROBE_W=new THREE.Vector3(); let PROBE_A=0; const LN7=hpTubo('#ffb020',0.008); LN7.renderOrder=9;
function sondaValor(d,nc){ const C=LT.COL[d], v=gridVal(d,{SA:nc[0],ET:nc[1],EV:nc[2],CP:nc[3]}); const S=d==='SAFETY'?v:(v-C.lo)/((C.hi-C.lo)||1);
  const c=sampleScale(LABTWO[d],S), y=0.299*c[0]+0.587*c[1]+0.114*c[2]; return {S, cor:c.map(q=>Math.max(0,Math.min(255,y+(q-y)*1.5)))}; }
/* D-381: notinha no canto inferior direito do HYDRA (pedido dele). O texto dele dizia "75 groups"; os dados são 25 CONDIÇÕES (grupos),
   cada uma em triplicata (dossiê §88, index#design) — 75 seriam amostras, e o ATLAS.replicates traz 9 réplicas em PROLIF/MINERAL (DIS-5).
   Ficou a forma que não erra nenhum dos dois; trocar é esta string. [CONFIRMAR com ele] */
const NOTA_DADOS=(()=>{ const TX=['Real experimental data:','25 conditions, each tested in triplicate,','for proliferation, migration,','mineralization and safety.'];
  const c=document.createElement('canvas'); c.width=640; c.height=190; const x=c.getContext('2d');
  x.fillStyle='rgba(12,14,20,0.72)'; x.beginPath(); x.roundRect(0,0,640,190,20); x.fill();
  x.fillStyle='#d9deec'; x.font='600 30px Inter,system-ui,sans-serif'; x.textAlign='left'; x.textBaseline='alphabetic'; TX.forEach((l,i)=>{ x.font=(i?'500 ':'700 ')+'30px Inter,system-ui,sans-serif'; x.fillText(l,26,48+i*40); });
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,1.3*190/640),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false})); m.renderOrder=7; m.visible=false; scene.add(m);
  return { m, tick(alfa,centro,meia){ m.visible=alfa>0.01; if(!m.visible) return; m.material.opacity=alfa;
    const cw=camera.getWorldPosition(new THREE.Vector3()), f=new THREE.Vector3().subVectors(cw,centro).setY(0).normalize(), dir=new THREE.Vector3(f.z,0,-f.x);
    m.position.copy(centro).addScaledVector(dir,meia*1.55+0.8).addScaledVector(f,0.4); m.position.y=centro.y-0.95;   /* embaixo da escala, no canto inferior direito */ m.lookAt(cw.x,m.position.y,cw.z); } }; })();
const _ltCam=new THREE.Vector3(), _ltP=[0,0,0], ANCN=A.groups.map(gr=>{ const an=(A.atlas.anchors||[]).find(a=>a.g===gr.g); return an?[an.n.SA,an.n.ET,an.n.EV,an.n.CP]:[0.5,0.5,0.5,0.5]; });
const VALN=(A.atlas.valpts||[]).map(v=>[v.n.SA,v.n.ET,v.n.EV,v.n.CP]), _vIn=[0,0,0,0];
/* bola garantidamente DENTRO do HYDRA no referencial do MQ: a 4-bola inscrita (raio 0,5) projeta com k ≥ d4/(d4+0,5), o que no MQ dá raio MQH */
const R_DENTRO=MQH*0.85;
const dentroHydra=p=>{ const L=p.length(); if(L>R_DENTRO) p.multiplyScalar(R_DENTRO/L); return p; };
const LTS={ang:0,last:null,yaw:null};
/* =========================  13d. B6-2 — OS DISCOS POLARES, v2 "PALCO + FILEIRA" (PROMPT_M_discos_B6-2_v2.md, D-111) · D-393  ==============
   Texturas e eixos como no prompt v1 (D-385): drawCymatic do lab.html, K = 1, LV = 9 anéis, RIDGE, vinheta, bilinear; P/M/H normalizados
   pela fatia, SAFETY absoluta na COR. O que mudou (v2): os quatro discos saem do CUBO no plinto e ficam numa FILEIRA pequena abaixo da
   vista (raio 0,18, brilho 0,55); cada frase leva ao PALCO (raio 0,55) no máximo DOIS; pílulas de eixo só no palco; sem recuo em
   profundidade; SEM seta (saiu do shader e do tick), sem grade 2×2. Em "no protocol can simultaneously optimize" (best = 2:12.49) as
   ZONAS DE MELHOR (vN = (v−smin)/(smax−smin) por fatia, SAFETY também; zona vN ≥ 0,80; contorno 1−smoothstep(0,0,025,|vN−0,80|))
   acendem em MIGRATION (raio ET) e SAFETY; fora da zona cai a 35 %; best+1,2 s os dois deslizam ao centro e se SOBREPÕEM, mapas a 15 %,
   só as zonas acesas — elas não se tocam. volta = fim medido de "readouts" (2:17.15): cada disco voa para um CANTO do cubo; no
   encontro (voltaFim 2:18.35) o cubo desdobra em HYDRA (D-393, caderno 27/09). */
const DSC_T={ out:115.16, noLugar:116.66, prol:120.95, min:124.38, saf:127.72, dec:130.01, best:132.49, volta:137.15, voltaFim:138.35 };
const DSC=(()=>{ const RIDGE=[226,238,255], LV=9, S=512;
  /* D-525: tabela de cor (1024 níveis) — mesma escala, sem reler o hex a cada pixel (a carga dos estados dinâmicos caía de ~2,5 s) */
  const LUT={}; const cor=(d,t)=>{ let L=LUT[d]; if(!L){ L=LUT[d]=[]; for(let q=0;q<1024;q++) L.push(sampleScale(LABTWO[d],q/1023)); } return L[Math.round(clamp(t,0,1)*1023)]; }, mis=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
  const bil=(s,fa,fb)=>{ const M=s.length-1; let x=fa*M,y=fb*M,i=Math.min(Math.floor(x),M-1),j=Math.min(Math.floor(y),M-1),dx=x-i,dy=y-j; return s[i][j]*(1-dx)*(1-dy)+s[i+1][j]*dx*(1-dy)+s[i][j+1]*(1-dx)*dy+s[i+1][j+1]*dx*dy; };
  function fatia(d,raio,ang,fixos){ const s=[]; for(let i=0;i<N;i++){ const row=[]; for(let j=0;j<N;j++){ const nc=Object.assign({},fixos); nc[raio]=i/(N-1); nc[ang]=j/(N-1); row.push(gridVal(d,nc)); } s.push(row); } return s; }
  /* textura (cor) + máscara de ZONA (R = dentro vN ≥ 0,80 · G = contorno), a mesma geometria polar */
  function textura(d,slice,zona){ const c=document.createElement('canvas'); c.width=c.height=S; const x=c.getContext('2d'), img=x.createImageData(S,S), px=img.data, cx=S/2, cy=S/2, Rr=S*0.47;
    const cz=document.createElement('canvas'); cz.width=cz.height=S; const xz=cz.getContext('2d'), iz=xz.createImageData(S,S), pz=iz.data;
    let smin=1e9,smax=-1e9; slice.forEach(r=>r.forEach(v=>{ if(v<smin) smin=v; if(v>smax) smax=v; })); const den=(smax-smin)||1;
    let nZ=0, sx=0, sy=0, yTop=1e9; const dentro=new Uint8Array(S*S);
    for(let y=0;y<S;y++) for(let xx=0;xx<S;xx++){ const dx=xx-cx, dy=y-cy, rr=Math.sqrt(dx*dx+dy*dy), o=(y*S+xx)*4; pz[o+3]=255; if(rr>Rr){ px[o+3]=0; continue; }
      const r=rr/Rr, ang=Math.atan2(dy,dx), aa=((ang/Math.PI)*0.5+0.5)*1, sec=aa-Math.floor(aa), aN=Math.abs(sec*2-1);   // K = 1
      const v=bil(slice,r,aN), vs=d==='SAFETY'?v:(v-smin)/den; let col=cor(d,vs);
      const lv=vs*LV, fr=Math.abs(lv-Math.round(lv)), ridge=Math.exp(-Math.pow(fr/0.045,2)); col=mis(col,RIDGE,ridge*0.92);
      const vig=Math.min(1,(1-r)*5.5); px[o]=col[0]; px[o+1]=col[1]; px[o+2]=col[2]; px[o+3]=Math.round(255*vig);
      if(zona&&r<0.97){ const vN=(v-smin)/den, ins=vN>=0.80?1:0, ct=1-Math.min(1,Math.max(0,Math.abs(vN-0.80)/0.025)); const cts=ct*ct*(3-2*ct);
        pz[o]=ins*255; pz[o+1]=Math.round(cts*255); if(ins){ dentro[y*S+xx]=1; nZ++; sx+=xx; sy+=y; if(y<yTop) yTop=y; } } }
    x.putImageData(img,0,0); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.NoColorSpace; t.anisotropy=4;
    let tz=null, zinfo=null; if(zona){ xz.putImageData(iz,0,0); tz=new THREE.CanvasTexture(cz); tz.colorSpace=THREE.NoColorSpace;
      const ux=p=>(p-cx)/(S/2), uy=p=>-(p-cy)/(S/2);   /* em unidades do raio do disco (±1) */
      zinfo={frac:nZ/(Math.PI*Rr*Rr), cx:nZ?ux(sx/nZ):0, cy:nZ?uy(sy/nZ):0, topo:nZ?uy(yTop):0, dentro}; }
    return {t,tz,zinfo,slice,smin,smax}; }
  const M5=0.5;
  const F={ PROLIF:textura('PROLIF',fatia('PROLIF','CP','SA',{ET:M5,EV:M5})), HEAL:textura('HEAL',fatia('HEAL','CP','SA',{ET:M5,EV:M5})),
            MINERAL:textura('MINERAL',fatia('MINERAL','CP','SA',{ET:M5,EV:M5})), SAFETY:textura('SAFETY',fatia('SAFETY','ET','SA',{CP:0,EV:M5}),true),
            HEAL_ET:textura('HEAL',fatia('HEAL','ET','SA',{CP:0,EV:M5}),true) };
  const ZERO_T=(()=>{ const t=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1); t.needsUpdate=true; return t; })();
  /* pílulas (D-391: escura, texto branco, ponto na cor do fator) — agora SEPARADAS: raio (idade / extração) e ângulo (tamanho do disco) */
  const cssE=k=>'rgb('+LABECOL[k].join(',')+')';
  function pilula(x,s,px,py,col){ x.font='700 24px Inter,system-ui,sans-serif'; const w=x.measureText(s).width+44, h=36; x.fillStyle='rgba(10,12,18,.86)'; x.beginPath(); x.roundRect(px-w/2,py-h/2,w,h,18); x.fill();
    if(col){ x.fillStyle=col; x.beginPath(); x.arc(px-w/2+17,py,7,0,7); x.fill(); } x.fillStyle='#ffffff'; x.fillText(s,px+(col?10:0),py+1); }
  function rotulos(tipo){ const c=document.createElement('canvas'); c.width=c.height=S; const x=c.getContext('2d'); x.textAlign='center'; x.textBaseline='middle';
    if(tipo==='SA'){ pilula(x,'larger disc',S*0.215,S*0.5,cssE('SA')); pilula(x,'smaller disc',S*0.785,S*0.5,cssE('SA')); }
    else { const [c0,c1,cc]=tipo==='CP'?['young cells','aged cells',cssE('CP')]:['short extraction','long extraction',cssE('ET')];
      pilula(x,c0,S/2,S/2+44,cc); pilula(x,c1,S/2,S*0.08,cc); x.strokeStyle=cc; x.lineWidth=3; x.beginPath(); x.arc(S/2,S/2,5,0,7); x.stroke(); }
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  const ROT={CP:rotulos('CP'),ET:rotulos('ET'),SA:rotulos('SA')};
  function pilulaTex(s){ const c=document.createElement('canvas'); c.width=320; c.height=56; const x=c.getContext('2d'); x.textAlign='center'; x.textBaseline='middle';
    x.font='700 30px Inter,system-ui,sans-serif'; const w=Math.min(316,x.measureText(s).width+40); x.fillStyle='rgba(255,255,255,.95)'; x.beginPath(); x.roundRect(160-w/2,6,w,44,22); x.fill();
    x.fillStyle='#0b1020'; x.fillText(s,160,29); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  function nome(s){ const c=document.createElement('canvas'); c.width=512; c.height=80; const x=c.getContext('2d'); x.font='700 44px Inter,system-ui,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.lineWidth=8; x.strokeStyle='rgba(8,10,16,.8)'; x.strokeText(s,256,42); x.fillStyle='#ffffff'; x.fillText(s,256,42); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  const VS='varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }';
  /* zone: 0 → 1 liga o modo zona (fora cai a `fora`, contorno branco); a zona fica com o brilho cheio */
  const FS=`uniform sampler2D mapA, mapB, zonaA, zonaB; uniform float mixB, bright, waveR, waveA, alpha, zone, fora; varying vec2 vUv;
    void main(){ vec2 p=vUv*2.0-1.0; float r=length(p)/0.94; vec4 c=mix(texture2D(mapA,vUv),texture2D(mapB,vUv),mixB); vec3 col=c.rgb;
      if(waveR>=0.0){ float g=exp(-pow((r-waveR)/0.05,2.0)); col=mix(col,vec3(1.0),g*0.85); }
      if(waveA>=0.0){ float ang=atan(-p.y,p.x); float aa=(ang/3.14159265)*0.5+0.5; float aN=abs(fract(aa)*2.0-1.0); float g=exp(-pow((aN-waveA)/0.05,2.0))*step(r,1.0); col=mix(col,vec3(1.0),g*0.85); }
      vec4 z=mix(texture2D(zonaA,vUv),texture2D(zonaB,vUv),mixB); float pres=bright;
      if(zone>0.0){ pres=bright*mix(1.0,mix(fora,1.0,z.r),zone); col=mix(col,vec3(1.0),z.g*zone*0.95); pres=max(pres,z.g*zone*alpha); }
      gl_FragColor=vec4(col,c.a*alpha*pres); }`;   /* "brilho" = presença: apagado fica translúcido (escurecer ficava barrento na parede clara) */
  const R=0.4, G=new THREE.Group(); G.visible=false; scene.add(G);
  /* fileira (x ao longo de right, y relativo ao olho), na ordem do prompt v2 */
  const DEF=[['PROLIF','PROLIFERATION',-0.69],['MINERAL','MINERALIZATION',-0.23],['HEAL','MIGRATION',0.23],['SAFETY','SAFETY',0.69]];
  const D=DEF.map(([d,n,fx],i)=>{ const g=new THREE.Group(); G.add(g);
    const zA=d==='SAFETY'?F.SAFETY.tz:ZERO_T, zB=d==='HEAL'?F.HEAL_ET.tz:zA;
    const u={mapA:{value:F[d].t},mapB:{value:d==='HEAL'?F.HEAL_ET.t:F[d].t},zonaA:{value:zA},zonaB:{value:zB},mixB:{value:0},bright:{value:0.55},waveR:{value:-1},waveA:{value:-1},alpha:{value:1},zone:{value:0},fora:{value:0.35}};
    const disc=new THREE.Mesh(new THREE.CircleGeometry(R,72),new THREE.ShaderMaterial({uniforms:u,vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false})); disc.renderOrder=20; g.add(disc);
    const aro=new THREE.Mesh(new THREE.RingGeometry(R*0.94,R*0.94+0.01,72),new THREE.MeshBasicMaterial({color:0x10131a,transparent:true,depthWrite:false})); aro.position.z=0.001; aro.renderOrder=21; g.add(aro);
    const pl=k=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(2*R,2*R),new THREE.MeshBasicMaterial({map:ROT[k],transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.position.z=0.002; m.renderOrder=22; g.add(m); return m; };
    const rot={}; for(const k of (d==='PROLIF'?['CP']:d==='MINERAL'?['SA']:d==='SAFETY'?['ET']:['CP','ET'])) rot[k]=pl(k);
    const lab=new THREE.Mesh(new THREE.PlaneGeometry(0.5,0.078),new THREE.MeshBasicMaterial({map:nome(n),transparent:true,depthWrite:false,toneMapped:false})); lab.position.set(0,-R-0.05,0.002); lab.renderOrder=22; g.add(lab);
    let best=null; if(d==='HEAL'||d==='SAFETY'){ const zi=(d==='HEAL'?F.HEAL_ET:F.SAFETY).zinfo;
      best=new THREE.Mesh(new THREE.PlaneGeometry(0.34,0.34*56/320),new THREE.MeshBasicMaterial({map:pilulaTex(d==='HEAL'?'best migration':'best safety'),transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
      if(Math.abs(zi.cx)>0.45) best.position.set(Math.sign(zi.cx)*(0.94*R+0.19),0,0.004); else best.position.set(zi.cx*R*0.94,Math.min(0.86,zi.topo+0.12)*R*0.94,0.004);   /* zona na borda → a pílula fica FORA do disco, ao lado dela; zona no miolo → logo acima */ best.renderOrder=23; g.add(best); }
    return {d,g,u,aro,rot,lab,best,fx,i}; });
  return {G,D,F,textura,fatia,ZERO_T,pilulaTex}; })();
/* verificação de aceite (prompt v2 §8): valores nos extremos e as zonas — no console (window.DSC_CHECK) */
{ const g=(d,nc)=>gridVal(d,nc); const R_=(d,v)=>{ const dd=A.grid.domains[d]; return dd.vmin+(dd.vmax-dd.vmin)*v; };
  const zH=DSC.F.HEAL_ET.zinfo, zS=DSC.F.SAFETY.zinfo; let sob=0; for(let q=0;q<zH.dentro.length;q++) if(zH.dentro[q]&&zS.dentro[q]) sob++;
  window.DSC_CHECK={ prolifCentroP1:R_('PROLIF',g('PROLIF',{CP:0,SA:0.5,ET:0.5,EV:0.5})), prolifBordaP7:R_('PROLIF',g('PROLIF',{CP:1,SA:0.5,ET:0.5,EV:0.5})),
    mineralEsqAreaGrande:R_('MINERAL',g('MINERAL',{SA:1,CP:0.5,ET:0.5,EV:0.5})), mineralDirAreaPequena:R_('MINERAL',g('MINERAL',{SA:0,CP:0.5,ET:0.5,EV:0.5})),
    migrET24:R_('HEAL',g('HEAL',{ET:0,CP:0,SA:0.5,EV:0.5})), migrET120:R_('HEAL',g('HEAL',{ET:1,CP:0,SA:0.5,EV:0.5})),
    safET24:R_('SAFETY',g('SAFETY',{ET:0,CP:0,SA:0.5,EV:0.5})), safET120:R_('SAFETY',g('SAFETY',{ET:1,CP:0,SA:0.5,EV:0.5})),
    /* zonas (unidades do raio do disco: x < 0 = esquerda = disco maior; |c| pequeno = miolo = extração curta) */
    zonaMigr:{frac:+zH.frac.toFixed(3),cx:+zH.cx.toFixed(2),cy:+zH.cy.toFixed(2),rCentroide:+Math.hypot(zH.cx,zH.cy).toFixed(2)},
    zonaSaf:{frac:+zS.frac.toFixed(3),cx:+zS.cx.toFixed(2),cy:+zS.cy.toFixed(2),rCentroide:+Math.hypot(zS.cx,zS.cy).toFixed(2)},
    zonasSobrepostasPx:sob }; }
/* D-525: ESTADOS DINÂMICOS — o fator que fica fixo em cada disco varre, só nos trechos em que o disco está PARADO (sem esticar a peça).
   Fatias reais do modelo (5 estados, a do meio = a textura de hoje), mesma normalização por fatia de sempre; entre dois estados a troca é
   rápida (segura 55 %, funde 45 %), para o olho ver estados calculados e não a mistura. Fator escolhido pela maior mudança medida (27/09):
   PROLIF → volume · MINERAL e MIGRATION → tempo de extração · SAFETY e MIGRATION na sobreposição → passagem celular (P1→P7; zonas nunca se tocam). */
const DSCSW=(()=>{ const K=5, X=[0,0.25,0.5,0.75,1];
  const SET={ PROLIF:{d:'PROLIF',r:'CP',a:'SA',fx:{ET:.5,EV:.5},v:'EV'}, MINERAL:{d:'MINERAL',r:'CP',a:'SA',fx:{ET:.5,EV:.5},v:'ET'}, HEAL:{d:'HEAL',r:'CP',a:'SA',fx:{ET:.5,EV:.5},v:'ET'},
    SAFETY:{d:'SAFETY',r:'ET',a:'SA',fx:{CP:0,EV:.5},v:'CP',z:true}, HEAL_ET:{d:'HEAL',r:'ET',a:'SA',fx:{CP:0,EV:.5},v:'CP',z:true} };
  const nrm=sl=>{ const f=sl.flat(); let mn=1e9,mx=-1e9; f.forEach(v=>{ if(v<mn) mn=v; if(v>mx) mx=v; }); return f.map(v=>(v-mn)/((mx-mn)||1)); };
  const dif=(a,b)=>{ const A_=nrm(a),B_=nrm(b); let s=0; for(let q=0;q<A_.length;q++) s+=Math.abs(A_[q]-B_[q]); return s/A_.length; };
  const R=0.4, bestPos=zi=>Math.abs(zi.cx)>0.45?[Math.sign(zi.cx)*(0.94*R+0.19),0]:[zi.cx*R*0.94,Math.min(0.86,zi.topo+0.12)*R*0.94];
  const FR={}; const t0=performance.now();
  for(const k in SET){ const s=SET[k], base=X.indexOf(s.fx[s.v]);
    const fr=X.map((x,i)=>{ const sl=DSC.fatia(s.d,s.r,s.a,Object.assign({},s.fx,{[s.v]:x})); return i===base?Object.assign({},DSC.F[k],{slice:sl}):DSC.textura(s.d,sl,!!s.z); });
    const ext=base===0?K-1:(dif(fr[base].slice,fr[0].slice)>=dif(fr[base].slice,fr[K-1].slice)?0:K-1);
    FR[k]={base,ext,v:s.v,fr,best:s.z?fr.map(f=>bestPos(f.zinfo)):null}; }
  const ms=performance.now()-t0;
  /* indicador: nome do fator + trilho com as duas pontas em palavras (sem números) e um ponto que anda */
  const TXT={EV:['elution volume','less','more'],ET:['extraction time','short','long'],CP:['cell passage','young','aged']};
  const W=0.62, IW=512, IH=104, XL=150, XR=362;
  function indTex(v){ const c=document.createElement('canvas'); c.width=IW; c.height=IH; const x=c.getContext('2d'); const [n,a,b]=TXT[v], col='rgb('+LABECOL[v].join(',')+')';
    x.fillStyle='rgba(10,12,18,.86)'; x.beginPath(); x.roundRect(4,4,IW-8,IH-8,26); x.fill();
    x.textAlign='center'; x.textBaseline='middle'; x.font='700 28px Inter,system-ui,sans-serif'; x.fillStyle='#ffffff'; x.fillText('↻  '+n,IW/2,32);
    x.strokeStyle=col; x.lineWidth=5; x.lineCap='round'; x.beginPath(); x.moveTo(XL,72); x.lineTo(XR,72); x.stroke();
    x.font='600 22px Inter,system-ui,sans-serif'; x.fillStyle='#d8dcea'; x.textAlign='right'; x.fillText(a,XL-16,73); x.textAlign='left'; x.fillText(b,XR+16,73);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; }
  const TEX={EV:indTex('EV'),ET:indTex('ET'),CP:indTex('CP')};
  const IND={}; DSC.D.forEach(o=>{ const g=new THREE.Group(); g.position.set(0,-R-0.15,0.003); o.g.add(g);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(W,W*IH/IW),new THREE.MeshBasicMaterial({map:TEX.EV,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); m.renderOrder=23; g.add(m);
    const dot=new THREE.Mesh(new THREE.CircleGeometry(0.017,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,toneMapped:false})); dot.renderOrder=24; dot.position.z=0.001; g.add(dot);
    const u=o.u; IND[o.d]={g,m,dot,a:0,tl:null,def:{mapA:u.mapA.value,mapB:u.mapB.value,zonaA:u.zonaA.value,zonaB:u.zonaB.value},bestDef:o.best?o.best.position.clone():null}; });
  const ida=(t,a,b,k,ind)=>{ if(t<a||t>b) return null; const e=Math.sin(Math.PI*(t-a)/(b-a)); return {k,p:FR[k].base+(FR[k].ext-FR[k].base)*e,ind}; };
  /* janelas PARADAS (depois da chegada ao lugar e da onda do eixo) */
  function estado(d,t){ const T_=DSC_T;
    if(d==='HEAL'||d==='SAFETY'){ const a=T_.best+2.0; if(t>=a){ const k=d==='HEAL'?'HEAL_ET':'SAFETY'; return {k,p:(K-1)*clamp((t-a)/2.4,0,1),ind:d==='HEAL'}; } }
    return ida(t,117.0,120.8,d,false) || ((d==='PROLIF'||d==='HEAL')?ida(t,T_.prol+1.6,T_.min+0.3,d,true):null) || (d==='MINERAL'?ida(t,T_.min+1.6,T_.saf+0.3,d,true):null); }
  function aplicar(o,t,palco,alpha){ const I=IND[o.d], u=o.u, e=estado(o.d,t);
    if(e){ const F_=FR[e.k]; let i=Math.floor(e.p), f=e.p-i; if(i>=K-1){ i=K-2; f=1; } const w=smooth(clamp((f-0.55)/0.45,0,1));
      u.mapA.value=F_.fr[i].t; u.mapB.value=F_.fr[i+1].t; u.mixB.value=w;
      if(F_.best||o.d==='SAFETY'){ u.zonaA.value=F_.fr[i].tz||DSC.ZERO_T; u.zonaB.value=F_.fr[i+1].tz||DSC.ZERO_T; }
      if(F_.best&&o.best){ const A_=F_.best[i],B_=F_.best[i+1]; o.best.position.x=lerp(A_[0],B_[0],w); o.best.position.y=lerp(A_[1],B_[1],w); }
      if(I.m.material.map!==TEX[F_.v]) I.m.material.map=TEX[F_.v];
      I.dot.position.x=lerp(XL,XR,(i+w)/(K-1))/IW*W-W/2; I.dot.position.y=-(72-IH/2)/IH*(W*IH/IW); I.dot.material.color.setRGB(...LABECOL[F_.v].map(c=>c/255));
    } else if(o.d!=='HEAL'||t<DSC_T.saf+0.9){ u.mapA.value=I.def.mapA; u.mapB.value=I.def.mapB; u.zonaA.value=I.def.zonaA; u.zonaB.value=I.def.zonaB; if(o.d!=='HEAL') u.mixB.value=0; if(o.best&&I.bestDef) o.best.position.copy(I.bestDef); }
    else { u.mapA.value=I.def.mapA; u.mapB.value=I.def.mapB; u.zonaA.value=I.def.zonaA; u.zonaB.value=I.def.zonaB; if(o.best&&I.bestDef) o.best.position.copy(I.bestDef); }
    const alvo=e&&e.ind?1:0, dt=I.tl==null?1:Math.min(1,Math.abs(t-I.tl)); I.tl=t; I.a+=(alvo-I.a)*Math.min(1,dt*6); if(Math.abs(alvo-I.a)<0.002) I.a=alvo;
    const op=I.a*alpha*Math.max(palco,o.d==='HEAL'?smooth((t-(DSC_T.best+1.2))/0.8):0); I.m.material.opacity=op; I.dot.material.opacity=op; I.g.visible=op>0.002; }
  /* verificação: as zonas de MIGRATION × SAFETY em cada passagem (na textura final, em pixels) */
  const sob=FR.HEAL_ET.fr.map((h,q)=>{ const s=FR.SAFETY.fr[q]; let n=0; for(let z=0;z<h.zinfo.dentro.length;z++) if(h.zinfo.dentro[z]&&s.zinfo.dentro[z]) n++; return n; });
  window.DSC_SWEEP={ms:Math.round(ms),K,fator:Object.fromEntries(Object.entries(FR).map(([k,v])=>[k,{v:v.v,base:v.base,ext:v.ext}])),
    zonaMigrPorP:FR.HEAL_ET.fr.map(f=>+f.zinfo.frac.toFixed(3)),zonaSafPorP:FR.SAFETY.fr.map(f=>+f.zinfo.frac.toFixed(3)),sobrepostasPxPorP:sob};
  return {FR,aplicar,estado,IND}; })();
/* lugares (prompt v2 §2): fileira · palco sozinho · palco em dupla · centro (sobreposição); transição 0,8 s ease-in-out */
const R_DSC0=0.4;
const DSCLUG={ solo:{x:0,y:0.05,r:0.55,br:1}, pL:{x:-0.62,y:0.05,r:0.55,br:1}, pR:{x:0.62,y:0.05,r:0.55,br:1}, ctr:{x:0,y:0.05,r:0.55,br:1} };
const DSCEV={ PROLIF:[[DSC_T.prol,'pL'],[DSC_T.min,'fila']], HEAL:[[DSC_T.prol,'pR'],[DSC_T.min,'fila'],[DSC_T.dec,'pL'],[DSC_T.best+1.2,'ctr']],
  MINERAL:[[DSC_T.min,'solo'],[DSC_T.saf,'fila']], SAFETY:[[DSC_T.saf,'solo'],[DSC_T.dec,'pR'],[DSC_T.best+1.2,'ctr']] };
/* os quatro cantos (tetraédricos) do cubo para onde cada disco volta */
const DSCCANTO={PROLIF:[-1,1,-1],MINERAL:[-1,-1,1],HEAL:[1,1,1],SAFETY:[1,-1,-1]};
const _dA=new THREE.Vector3(), _dB=new THREE.Vector3(), _dC=new THREE.Vector3(), _dP={pos:new THREE.Vector3(),look:new THREE.Vector3(),u:0,blink:0,side:0,moving:false,speed:0};
function dscLugar(o,t){ const fila={x:o.fx,y:-0.85,r:0.18,br:0.55}; const L=k=>k==='fila'?fila:DSCLUG[k];
  let a=fila, b=fila, t0=-1e9; for(const [te,k] of DSCEV[o.d]){ if(t>=te){ a=b; b=L(k); t0=te; } }
  const w=smooth((t-t0)/0.8); return {x:lerp(a.x,b.x,w),y:lerp(a.y,b.y,w),r:lerp(a.r,b.r,w),br:lerp(a.br,b.br,w)}; }
function DSCtick(t,cubo){ const T_=DSC_T, on=t>=T_.out-0.05&&t<T_.voltaFim+0.05; DSC.G.visible=on; if(!on) return 0;
  DIR.pose(T_.dec,_dP);   /* D-515: pela pose PARADA em P6 (a pessoa ainda anda quando os discos saem) */ const eye=_dA.copy(_dP.pos);
  const f=_dB.subVectors(HYD.c,eye).setY(0).normalize(); const centro=eye.clone().addScaledVector(f,2.2); centro.y=CFG.eyeY;
  const yaw=Math.atan2(-f.x,-f.z); const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const sai=smooth((t-T_.out)/1.5), volta=smooth((t-T_.volta)/(T_.voltaFim-T_.volta));
  const kz=smooth((t-T_.best)/0.6), kSob=smooth((t-(T_.best+1.2))/0.8);
  const pu=(a,d)=>{ const x=t-a; return x>=0&&x<d?x/d:-1; };
  DSC.D.forEach(o=>{ const {d,g,u}=o, L=dscLugar(o,t);
    /* sobreposição: SAFETY um fio à frente (não disputam a profundidade) */
    const alvo=centro.clone().addScaledVector(right,L.x).add(_dC.set(0,L.y,0)).addScaledVector(f,d==='SAFETY'?-0.02*kSob:0);
    const canto=cubo.localToWorld(_dC.set(...DSCCANTO[d]).multiplyScalar(MQH));
    const sBase=L.r/0.4;   /* R do disco = 0,4 */
    if(t<T_.volta){ g.position.lerpVectors(cubo.position,alvo,sai); g.scale.setScalar(Math.max(0.001,sai*sBase)); }
    else { g.position.lerpVectors(alvo,canto,volta); g.scale.setScalar(Math.max(0.001,sBase*(1-0.92*volta))); }
    g.rotation.set(0,yaw,0);
    const palco=clamp((L.r-0.18)/(0.55-0.18),0,1);
    u.bright.value=L.br; u.alpha.value=Math.min(sai,1-smooth((t-(T_.voltaFim-0.25))/0.25));
    /* as ondas, cada uma depois que o disco chega ao palco (+0,8 s): raio (P, M em "cell maturity"; SAFETY; M e S em "decoupled"), ângulo (MINERAL) */
    let wr=-1, wa=-1; const p1=pu(T_.prol+0.8,0.8), p2=pu(T_.min+0.8,0.8), p3=pu(T_.saf+0.8,0.8), p4=pu(T_.dec+0.8,0.8);
    if(p1>=0&&(d==='PROLIF'||d==='HEAL')) wr=p1; if(p2>=0&&d==='MINERAL') wa=p2; if(p3>=0&&d==='SAFETY') wr=p3; if(p4>=0&&(d==='HEAL'||d==='SAFETY')) wr=p4;
    u.waveR.value=wr; u.waveA.value=wa;
    /* Migration: textura passa ao raio ET em saf+1,0 (0,6 s), ainda na fileira */
    if(d==='HEAL') u.mixB.value=smooth((t-(T_.saf+1.0))/0.6);
    /* zonas: só HEAL_ET e SAFETY; fora 35 % → 15 % na sobreposição */
    if(d==='HEAL'||d==='SAFETY'){ u.zone.value=kz; u.fora.value=lerp(0.35,0.15,kSob); } else u.zone.value=0;
    /* pílulas de eixo só no palco, na frase do fator */
    const aP=palco*(1-smooth((t-T_.volta)/0.3));
    for(const k in o.rot){ let a=aP;
      if(d==='HEAL') a*=k==='CP'?(t<T_.min?1:0):(t>=T_.dec?1:0);
      o.rot[k].material.opacity=a*(1-kz); }   /* nas zonas só ficam as pílulas "best …" */
    if(o.best) o.best.material.opacity=kz*(1-smooth((t-T_.volta)/0.3));
    o.lab.scale.setScalar(Math.max(1,0.8*R_DSC0/Math.max(0.01,L.r))); o.lab.position.y=-R_DSC0-0.05*o.lab.scale.x; o.lab.material.opacity=u.alpha.value*Math.max(0.6,L.br)*(d==='HEAL'||d==='SAFETY'?1-kSob:1);   /* sobrepostos, os nomes se atropelavam — ficam as pílulas "best …" */   /* nome legível também na fileira (~0,4 m) */ o.aro.material.opacity=u.alpha.value*L.br*(1-0.7*kSob*(d==='HEAL'||d==='SAFETY'?1:0));
    DSCSW.aplicar(o,t,palco,u.alpha.value); });   /* D-525 */
  return sai*(1-volta); }

/* D-393: o CUBO no plinto — aresta 1,2 m (a maquete de 45 cm a ~10 m sumia), arestas de ~2 cm; é dele que saem os discos e é nele que eles entram */
const S_CUBO=1.2/(2*MQH);
function E7hydra(t,dt,snap){
  tess.group.visible=false;
  const ativo=t>=E7T.voo1&&t<E7T.fim+0.5;
  if(!ativo){ LT.g.visible=false; [...B9MAT,...B9PROT,...PLACA].forEach(h=>{ h.visible=false; }); L8X.forEach(l=>{ l.visible=false; }); DSC.G.visible=false; SONDA.g.visible=false; SONDA.fio.visible=false; LEG.m.visible=false; NOTA_DADOS.m.visible=false; LTS.ang=0; LTS.yaw=null; E7S.desdobra=0; rose.mesh.visible=false; E7b7(t,false); E7b8(t,false); return; }
  /* D-393 (caderno 27/09 + prompt v2): voo1 → unf0 é CUBO (a maquete crescida, sem faces do tesserato). Os discos saem dele e voltam a
     quatro cantos; no encontro (unf0 = voltaFim) o cubo externo BROTA do interno — d4 de 60 (cascas coladas) até 2,2 (a do lab); cresce
     (abre1 → cresce1) até aresta externa ≈ 3,4 m. */
  const cubo=t<E7T.unf0; LT.g.visible=!cubo;
  const abre=smooth((t-E7T.unf0)/(E7T.abre1-E7T.unf0)), u=abre, fin=smooth((t-E7T.fund)/2.5);
  /* D-399 GRAND FINALE (caderno 27/09): de "a foundation" até o escuro o HYDRA ACELERA e CRESCE até engolir quem olha — ease-in cúbico,
     cresce 4,5× e o centro anda 55 % do caminho até a cabeça; o escuro (T_DIM → T_DARK) chega com a pessoa dentro dele */
  const tEng=Math.max(0.5,T_DARK-0.3-E7T.fund), eng=clamp((t-E7T.fund)/tEng,0,1), engE=eng*eng*eng;
  const d4=lerp(60,2.2,u); LT.st.d4=d4; E7S.desdobra=u;
  const vel=HYD.vel*smooth((t-E7T.abre1)/1.5)*(1+1.4*fin+4*engE);
  if(LTS.last===null||snap||Math.abs(t-LTS.last)>0.5) LTS.ang=Math.max(0,(t-E7T.abre1-0.75))*HYD.vel+Math.max(0,t-E7T.fund-1.25)*HYD.vel*1.4+HYD.vel*4*Math.pow(eng,4)/4*tEng;
  else LTS.ang+=vel*Math.max(0,t-LTS.last); LTS.last=t;
  LT.st.ang=LTS.ang;
  const sCubo=lerp(S_MAQ,S_CUBO,smooth((t-E7T.voo1)/2.0));
  const sMq=lerp(sCubo,HYD.s,smooth((t-E7T.abre1)/(E7T.cresce1-E7T.abre1)))*(1+0.3*fin)*(1+3.5*engE), G=sMq*MQH/LT.innerHalf(d4);
  const cw=camera.getWorldPosition(_e7a);
  const bob=(0.05+0.04*u)*Math.sin(t*1.1); LT.g.position.copy(HYD.c); LT.g.position.y+=bob; if(engE>0) LT.g.position.lerp(cw,0.55*engE); LT.g.scale.setScalar(G);   /* flutua: sobe e desce de leve */
  /* o conjunto fica de frente para quem olha (como a tela do lab), virando devagar quando a pessoa anda */
  const yawT=Math.atan2(cw.x-HYD.c.x,cw.z-HYD.c.z); if(LTS.yaw===null) LTS.yaw=yawT; else LTS.yaw=alerp(LTS.yaw,yawT,1-Math.exp(-dt*0.8));
  LT.g.quaternion.setFromAxisAngle(_hUp,LTS.yaw); LT.g.updateMatrixWorld(true);
  MQ.position.copy(LT.g.position); MQ.scale.setScalar(sMq); MQ.quaternion.copy(LT.g.quaternion); MQ.updateMatrixWorld(true);
  /* os discos polares saem do cubo e voltam a ele (DSCtick usa a pose do MQ) */
  const kDsc=DSCtick(t,MQ);
  /* arestas do cubo: ~2 cm no plinto; tingem na cor do fator da frase (área em "disc surface area", tempo em "elution time" e na dupla
     MIGRATION × SAFETY, ambos pelo raio ET); a passagem (CP, "cell maturity") não é eixo do cubo — ali brilham os objetos (E7brilhoCor);
     no encontro dos discos as doze arestas acendem em branco */
  { const kSA=e7env(t,DSC_T.min,DSC_T.saf,0.4,0.5), kET=e7env(t,DSC_T.saf,DSC_T.volta,0.4,0.5), fl=pulse1(t,E7T.unf0-0.25,0.9);
    const W_=[255,255,255], tint=[{c:LABECOL.SA,k:kSA},{c:LABECOL.ET,k:kET},{c:W_,k:0}].map(q=>fl>q.k?{c:W_,k:fl}:q);
    mqeEstilo((0.02+0.015*fl)/Math.max(0.05,sMq),tint); }
  const fade=smooth((t-E7T.unf0)/0.6);
  /* recolorações: o HYDRA muda de cor — percorre as quatro em B7 (rápido) e no começo de B9; proliferação em B8 e onde as linhas de B8 voltam (B9) */
  const SEQ=domSeq(t); let dom=SEQ.para, mix=null; LT.st.rate=SEQ.dur<1?6:1.6;
  LT.st.dom=mix?mix[0]:dom; LT.st.mix=mix;
  const pu=(a,d)=>{ const x=t-a; return x>=0&&x<d?Math.sin(Math.PI*x/d):0; }, P_=LT.st.pulse; for(const n of LABAX) P_[n]=0;
  LABAX.forEach((n,i)=>{ P_[n]=Math.max(P_[n],pu(E7T.how+i*0.8,0.8)); });
  { const k=0.5*pu(E7T.unf0,0.9); if(k>0) for(const n of LABAX) P_[n]=Math.max(P_[n],k); }
  if(fin>0) for(const n of LABAX) P_[n]=Math.max(P_[n],0.55*fin);   /* final: as quatro famílias de arestas acesas juntas */
  const glow=0.4*fin+0.45*pulse1(t,E7T.unf0,0.9)+0.3*pulse1(t,E7T.arise,0.8)+0.3*pulse1(t,E7T.refs,0.8);
  LT.st.alpha=Math.min(1.4,fade*(1+glow));
  /* D-507 (desempenho + "muito carregado"): no final as faces somem enquanto ele cresce (zeram a ~65 % do caminho), as barras de dentro
     também, e fica a casca externa luminosa girando e engolindo a pessoa */
  LT.st.faceMul=(1-0.55*Math.max(env(t,E7T.b7,E7T.refs,1.0,1.0),env(t,E7T.b9L,E7T.fund,1.0,1.0)))*(1-smooth(eng/0.65));
  LT.st.dentro=smooth(eng/0.5);   /* D-384: em B7/B8 (e onde B8 volta em B9) as faces baixam para as esferas e linhas lerem */
  if(LT.g.visible){ _ltCam.copy(cw); LT.g.worldToLocal(_ltCam); LT.update(dt,_ltCam); }
  /* D-392/D-395: janelas — legenda do fim do desdobramento (cresce1) até logo depois de "a reference cement" (2:28.5); em B9 volta em
     "For biomaterial research" (3:22.85) até "a foundation"; a SONDA fica até "To validate" (2:43.2) e volta com a legenda em B9.
     Em "matches HYDRA's prediction" a sonda é levada para DENTRO do halo e fica; em "beyond this prediction" volta a passear e uma linha do
     halo até ela mostra a distância (o efeito próprio do material). Em "the material itself" (3:30.46) a legenda ganha ÊNFASE. */
  { /* D-514: a legenda entra DEPOIS da placa do plinto (não disputam) e fica até "To validate", junto com a sonda — ~20 s para ler */
    const wL=Math.max(e7env(t,E7T.leg0,E7T.b8,1.0,0.5),e7env(t,E7T.b9L,E7T.fund,1.0,0.8)), wP=Math.max(e7env(t,E7T.leg0,E7T.b8,1.0,0.5),e7env(t,E7T.b9L,E7T.fund,1.0,0.8));
    const emL=e7env(t,E7T.mat,E7T.prot,0.25,0.4), emN=e7env(t,E7T.prot,E7T.fund,0.3,0.6);
    const aL=fade*wL*(1-kDsc)*(1-0.45*emN), aP=fade*wP*(1-kDsc), nc=SONDA.n(t), k=smooth((t-SEQ.t0)/(SEQ.dur||2)), A_=sondaValor(SEQ.de,nc), B_=sondaValor(SEQ.para,nc);
    const S=lerp(A_.S,B_.S,k), cor=[0,1,2].map(q=>lerp(A_.cor[q],B_.cor[q],k));
    LT.proj(nc,LT.st.ang,d4,_sd); _sdV.set(_sd[0],_sd[1],_sd[2]); LT.g.localToWorld(_sdV);
    const kH=smooth((t-(E7T.bate-1.0))/1.0)*(1-smooth((t-E7T.alem)/1.5)); if(kH>0){ const hw=MQ.localToWorld(_e7c.copy(P7)); _sdV.lerp(hw,kH); }
    PROBE_W.copy(_sdV); PROBE_A=aP;
    LEG.m.scale.setScalar(1+0.14*emL);
    const ok=LEG.tick(t,SEQ,aL,LT.g.position,G*0.647,S,cor); SONDA.tick(_sdV,aP*(1-0.45*emN),ok?LEG.pontaSeta:null);
    const aLn=aP*e7env(t,E7T.alem+0.6,E7T.b8,0.6,0.4); if(aLn>0.01){ hpLiga(LN7,MQ.localToWorld(_e7c.copy(P7)),_sdV); LN7.material.opacity=0.9*aLn; LN7.visible=true; } else LN7.visible=false; }
  NOTA_DADOS.tick(0,   /* D-389: a nota de dados saiu (pedido dele) */LT.g.position,G*0.647);
  /* D-396: a placa no plinto — "Actual representation of HYDRA, reconstructed from 25 experimental groups" (texto dele), do HYDRA formado ao escuro */
  { /* D-514: a placa aparece SOZINHA — no desdobramento (2:18.8–2:22.4, antes da legenda) e em "a reference surface" (3:16.3–3:22.4, antes de a legenda voltar) */
    const aPl=Math.max(e7env(t,E7T.unf0+0.45,E7T.leg0-0.6,0.6,0.5),e7env(t,E7T.b9,E7T.b9L-0.45,0.8,0.5)); PLACA.forEach(m=>{ m.visible=aPl>0.01; m.material.opacity=aPl; }); }
  /* as 25 condições e os pontos de validação seguem a MESMA projeção (unidades do MQ = lab × G / sMq) */
  const kq=G/sMq, bl=u;
  C25.forEach((c,i)=>{ if(!c.h.visible) return; LT.proj(ANCN[i],LT.st.ang,d4,_ltP); c.h.position.set(lerp(c.p3.x,_ltP[0]*kq,bl),lerp(c.p3.y,_ltP[1]*kq,bl),lerp(c.p3.z,_ltP[2]*kq,bl)); });
  /* D-503 (pedido dele: "os pontos não podem estar fora — pode posicionar dentro, mesmo que não seja bem na quina"): os pontos de
     validação são puxados para o centro no 4-D (×0,55 em torno de 0,5) antes da projeção — continuam girando com o HYDRA, sempre por dentro */
  VALS.forEach((v,i)=>{ const n=VALN[i]; for(let q=0;q<4;q++) _vIn[q]=0.5+(n[q]-0.5)*0.55; LT.proj(_vIn,LT.st.ang,d4,_ltP); v.p.set(_ltP[0]*kq,_ltP[1]*kq,_ltP[2]*kq); });
  /* a maquete (arestas) some no desdobramento */
  MQEMAT.opacity=0.85*(1-u);
  if(fin>0) C25.forEach(c=>{ c.mat.emissive.copy(CPCOL[c.L.CP]).multiplyScalar(0.7*fin); });
  /* D-507: as 25 condições (metal com clearcoat, transparentes) saem no engolir — pesam no Quest e ficariam "dentro" */
  if(eng>0){ const kO=1-smooth((eng-0.15)/0.35); C25.forEach(c=>{ c.h.scale.setScalar(Math.max(0.001,kO)); c.h.visible=c.h.visible&&kO>0.01; }); } else C25.forEach(c=>{ c.h.scale.setScalar(1); });
  rose.mesh.visible=false; /* D-385: a rosa saiu da peça (prompt dos discos §3.2) */
  E7b9props(t); E7b7(t,true); E7b8(t,true); }
function faceCam(m){ m.lookAt(camera.getWorldPosition(_e7a)); }
/* D-395: B9 — os quatro elementos do PROTOCOLO (discos 5·10·15 · timer · tubos · célula) à ESQUERDA do HYDRA em "or the testing protocol"
   (pedido dele: parâmetros do protocolo à esquerda; a legenda e a cápsula — o material — ficam à direita). As placas de Petri
   (inert&bioactive · wound healing, B9MAT) saíram. */
function E7b9props(t){ const cam=camera.getWorldPosition(new THREE.Vector3()), f=new THREE.Vector3().subVectors(cam,HYD.c).setY(0).normalize(), r=new THREE.Vector3(-f.z,0,f.x), esc=LT.g.scale.x*0.647;
  const aP=e7env(t,E7T.prot,E7T.fund,0.6,0.8);
  B9MAT.forEach(h=>{ h.visible=false; });
  B9PROT.forEach((h,i)=>{ const a=aP*smooth((t-(E7T.prot+i*0.25))/0.5); h.visible=a>0.01; if(!h.visible) return; const cx=i%2, cy=Math.floor(i/2);
    h.position.copy(HYD.c).addScaledVector(r,esc*1.5+1.0+cx*1.3).addScaledVector(f,0.5); h.position.y=HYD.c.y+0.65-cy*1.35;
    h.scale.setScalar(Math.max(0.001,a)*1.6);   /* D-395: maiores (vistos de P7, a ~10 m) */ h.lookAt(cam.x,h.position.y,cam.z); const w=h.children[0]; if(w) w.rotation.y=0.3*Math.sin(t*0.6+i); }); }
/* B7 — sinal e ruído, dentro do tesserato */
function E7b7(t,on){
  /* D-393: B7 começa a desenhar quando o HYDRA termina de se formar (cresce1), não em "HYDRA adjusts" (o cubo ainda está desdobrando) */
  const B7V=Math.max(E7T.b7,E7T.cresce1), a=on?e7env(t,B7V,E7T.b7off,0.5,0.5):0, inB9=t>=E7T.mat-0.5;
  const aH=inB9?0:a;   /* D-395: em B9 as esferas/halos que piscavam saíram — quem volta são a legenda e as linhas de B8 */
  /* o halo desliza pela superfície e para entre os objetos; ali acende o traço (valor predito, sem número) */
  const sl=smooth((t-B7V)/1.0); H7[0].position.lerpVectors(_e7a.set(-0.55,0.35,0.5),P7,inB9?1:sl); H7[0].visible=aH>0.01; H7[0].material.opacity=0.9*aH; faceCam(H7[0]);
  const aT=a*smooth((t-(B7V+1.0))/0.4); TRACO.position.copy(P7).add(_e7b.set(0,0.07,0)); TRACO.visible=aT>0.01; TRACO.material.opacity=aT;
  /* a cápsula gbl22 (o cimento de referência) ao lado do halo */
  const aC=on?e7env(t,E7T.ref,E7T.b7off,0.5,0.4):0; B7CAP.visible=aC>0.01; if(B7CAP.visible){ MQ.localToWorld(B7CAP.position.copy(P7).add(_e7b.set(0.2,0.14,0.05))); B7CAP.scale.setScalar(Math.max(0.001,aC)*MQ.scale.x/1.6); const w=B7CAP.children[0], c=w&&w.children[0]; if(c) c.rotation.x=t*0.6; B7CAP.lookAt(camera.getWorldPosition(_e7a)); }
  /* 1ª esfera (fosca) assenta no halo — "matches HYDRA's prediction"; em B9, pisca SOBRE a superfície ("or the testing protocol") */
  const t1=inB9?E7T.prot:E7T.bate, a1=inB9?(on?e7env(t,E7T.prot,E7T.prot+0.5,0.2,0.4):0):(on?e7env(t,E7T.bate,E7T.b7off,0.4,0.5):0), dr=1-smooth((t-t1)/0.8);
  W7[0].position.copy(P7).add(_e7b.set(0,0.4*dr,0)); W7[0].visible=false; W7[0].material.opacity=a1;   /* D-392: em B7 quem assenta no halo é a SONDA da legenda */
  /* 2ª esfera para ACIMA da superfície, anel fecha em volta — "beyond this prediction"; em B9 pisca ("the material itself") */
  const t2=inB9?E7T.mat:E7T.alem, a2=inB9?(on?e7env(t,E7T.mat,E7T.prot+0.5,0.2,0.4):0):(on?e7env(t,E7T.alem,E7T.b7off,0.4,0.5):0), dr2=1-smooth((t-t2)/0.8);
  H7[1].position.copy(P7B); H7[1].visible=false; H7[1].material.opacity=0.8*a2; faceCam(H7[1]);
  W7[1].position.copy(P7B).add(_e7b.set(0,0.42+0.3*dr2,0));   /* D-384: bem acima da superfície */ W7[1].visible=false; W7[1].material.opacity=a2;
  const aR=inB9?0:(on?e7env(t,E7T.alem+0.8,E7T.b7off,0.6,0.5):0); R7.position.copy(MQ.worldToLocal(_e7c.copy(PROBE_W))); R7.scale.setScalar(lerp(2.2,1,smooth((t-(E7T.alem+0.8))/0.8))); R7.visible=aR>0.01; R7.material.opacity=aR; faceCam(R7); }
/* B8 — validação externa (base D-314), dentro do tesserato no plinto */
const DOWN=new THREE.Vector3();
function E7b8(t,on){
  const aAll=on?e7env(t,E7T.b8,E7T.refs,0.8,0.6):0;
  /* as cápsulas: gbl22 ao centro, A (Exp 1) e B (Exp 2) dos lados — à frente do tesserato, do lado de quem olha */
  const aC=on?e7env(t,E7T.dois,E7T.porque,0.8,0.5):0; const cam=camera.getWorldPosition(_e7a);   /* D-392: ao lado do HYDRA (onde era a legenda); saem em "Because HYDRA" */   /* D-380: as cápsulas saem em "In cell growth" (2:56.3), pedido dele */
  _e7b.copy(cam).sub(HYD.c).setY(0).normalize(); const lado=_e7c.set(-_e7b.z,0,_e7b.x);
  /* D-395: cápsulas bem MAIORES (pedido dele) — ×1,7 (≈ 1 m) e mais espaçadas (1,25 m) */
  /* D-395: em B9, "the material itself" (3:30.46): a cápsula gbl22 volta, AO LADO da legenda (o material ↔ a escala do HYDRA) */
  const aC9=on?e7env(t,E7T.mat,E7T.fund,0.4,0.8):0;
  [[B8REF,0],[B8A,-1],[B8B,1]].forEach(([h,k])=>{ const a=k===0?aC9:aC;   /* D-502: em "two cements" só os DOIS cimentos (verde = Exp 1, azul = Exp 2); a gbl22 só volta em B9 */ h.visible=a>0.01; if(!h.visible) return; const esc=LT.g.scale.x*0.647, noB9=aC9>aC&&k===0;
    h.position.copy(HYD.c).addScaledVector(lado,-(esc*1.55+0.7+(noB9?1.5:0))).addScaledVector(_e7b,0.4); h.position.y=HYD.c.y+0.15-(noB9?0:0.7*k)+0.03*Math.sin(t*1.3+k);
    h.scale.setScalar(Math.max(0.001,a)*(noB9?2.3:1.7)); h.lookAt(cam.x,h.position.y,cam.z); const w=h.children[0], c=w&&w.children[0]; if(c) c.rotation.x=0.4*Math.sin(t*0.5+k); });
  /* "abaixo" = 12 cm + 9 cm por σ além da banda (ilustrativo, D-314) — em metros do mundo, convertidos para o MQ; para baixo do MUNDO */
  DOWN.set(0,-1,0).applyQuaternion(_e7q.copy(MQ.quaternion).invert()).divideScalar(MQ.scale.x||1);
  const settle=smooth((t-E7T.segue)/1.0), same=t>=E7T.quim&&t<E7T.cresc;
  /* D-395: em B9 ("For biomaterial research", 3:22.85) voltam a referência e o Exp 1 com as duas linhas */
  const a9=on?e7env(t,E7T.b9L,E7T.fund,0.6,0.8):0;
  VALS.forEach(v=>{ const a=on?Math.max(e7env(t,E7T.tres+v.ci*0.2,E7T.refs,0.6,0.6),v.mat==='Exp2'?0:a9):0; v.s.visible=a>0.01; if(!v.s.visible) return;
    /* D-395 (overlap, foto dele): as três esferas de uma posição LADO A LADO no x local (que olha para a pessoa), 0,2 entre centros
       (raio 0,075) — antes um triângulo de 7→3,5 cm, e elas se fundiam. A de referência fica NO halo. */
    const k=v.mat==='ProRoot'?0:v.mat==='Exp1'?-1:1;
    v.s.position.copy(v.p).add(_e7b.set(0.2*k,0,0));
    const sd=Math.abs(v.std||0); let below=0;
    /* D-384: discordância EXAGERADA (pedido dele: "não parece que os pontos estão fora") — 0,25 m + 0,20 m por σ além da banda (antes 0,12 + 0,09); ilustrativo */
    if(v.mat==='Exp1') below=smooth((t-E7T.menos)/1.0)*(0.25+0.20*Math.max(0,sd-2));
    else if(sd>2) below=settle*(0.25+0.20*(sd-2));
    if(below>0) v.s.position.addScaledVector(DOWN,below);
    dentroHydra(v.s.position);   /* D-503: nunca fora do HYDRA (a descida do Exp 1 fica, só não atravessa a casca) */
    /* D-391: "pirulito de resíduo" (revisor de materiais): haste do halo previsto até a esfera medida; vermelha fora da banda ±2σ */
    { const st=v.haste; if(!st) { v.haste=hpTubo('#ffffff',0.006); v.haste.renderOrder=1; scene.remove(v.haste); MQ.add(v.haste); } const H=v.haste; const alvo=_e7c.copy(v.p).add(_e7b.set(0,0,0)); if(below>0.02&&a>0.01){ hpLiga(H,v.p,v.s.position); H.material.color.set(sd>2?'#e0213b':'#ffffff'); H.material.opacity=a; H.visible=true; } else H.visible=false; }
    const col=t>=E7T.cresc?MATCOR[v.mat]:MATCOR.ProRoot; v.s.material.color.copy(col); v.s.material.opacity=a;
    let sc=1.5*(1+0.35*(same?0.5+0.5*Math.sin((t-E7T.quim)*6):0)); if(v.mat==='Exp1') sc*=1+0.45*pulse1(t,E7T.cada8,0.5); v.s.scale.setScalar(sc); v.below=below; });
  /* um halo por posição (o mesmo para os três materiais) */
  H8.forEach((h,ci)=>{ const v=VALS.find(q=>q.mat==='ProRoot'&&q.ci===ci); const a=on?e7env(t,E7T.pred+ci*0.15,E7T.refs,0.4,0.6):0; h.position.copy(v.p); h.visible=a>0.01; h.material.opacity=0.85*a; faceCam(h); });
  /* a linha que percorre a superfície de posição em posição, subindo e descendo */
  /* D-395: a linha de REFERÊNCIA fica (pedido dele: "uma é o padrão") até "reference surface" e volta em B9; o corredor só nos 3,2 s iniciais */
  const emL=e7env(t,E7T.mat,E7T.prot,0.25,0.4), emN=e7env(t,E7T.prot,E7T.fund,0.3,0.6), ln=(1-0.5*emL)*(1+0.25*emN), gr=1+1.2*emN;   /* ênfase: legenda em "the material itself", linhas em "the testing protocol" */
  const aL=on?Math.max(e7env(t,E7T.segue,E7T.refs,0.5,0.6),a9):0, aRun=on?e7env(t,E7T.segue,E7T.segue+3.2,0.5,0.8):0; const P=[0,1,2].map(ci=>VALS.find(q=>q.mat==='ProRoot'&&q.ci===ci).p);
  L8.forEach((l,j)=>{ l.renderOrder=6; if(aL<0.01){ l.visible=false; return; } hpLiga(l,P[j],P[j+1]); l.scale.x=l.scale.z=gr; l.material.opacity=Math.min(1,0.8*aL*ln); l.visible=true; });
  /* D-395: a SEGUNDA linha, LARANJA (cor da tampa do Exp 1), liga as três esferas do Exp 1 quando ele desvia ("a outra desvia") */
  const aX=on?Math.max(e7env(t,E7T.menos+0.6,E7T.refs,0.6,0.6),a9):0; const PX=[0,1,2].map(ci=>VALS.find(q=>q.mat==='Exp1'&&q.ci===ci).s.position);
  L8X.forEach((l,j)=>{ l.renderOrder=6; if(aX<0.01){ l.visible=false; return; } hpLiga(l,PX[j],PX[j+1]);   /* D-505: a linha que DESVIA é LARANJA (pedido dele) — cor do desvio, não do material; as esferas do Exp 1 seguem verdes como a tampa */ l.scale.x=l.scale.z=gr; l.material.opacity=Math.min(1,0.9*aX*ln); l.visible=true; });
  if(aRun>0.01){ const u=((t-E7T.segue)/1.6)%2, uu=u<1?u:2-u; RUN8.position.copy(uu<0.5?P[0].clone().lerp(P[1],uu*2):P[1].clone().lerp(P[2],(uu-0.5)*2)); RUN8.visible=true; RUN8.material.opacity=aRun; } else RUN8.visible=false;
  /* anéis nas três do Exp 1 */
  R8.forEach((r,ci)=>{ const v=VALS.find(q=>q.mat==='Exp1'&&q.ci===ci); const a=on?e7env(t,E7T.comp+ci*0.2,E7T.refs,0.6,0.6):0; r.position.copy(v.s.position); r.scale.setScalar(lerp(2.2,1,smooth((t-(E7T.comp+ci*0.2))/0.6))); r.visible=a>0.01; r.material.opacity=a; faceCam(r); });
  if(aAll<0.01&&!on){ VALS.forEach(v=>{ v.s.visible=false; }); } }

/* =========================  13c. B-1 — TELA DE AVISOS DE CONFORTO (E7 B-1, trilha R, 26/09) · D-377  =========================
   Antes do cartaz. Fundo PRETO fixo, nada se move. Seis cartões ao mesmo tempo, grade 3 × 2, a 1,5 m, na altura do olhar, dentro de ±30°
   (largura total 1,62 m → ±28,4°). Ícone de traço simples numa cor (o 6 em cor de alerta) + frase em inglês. Botão "✓ I understand — Start"
   travado e apagado nos primeiros 5 s (uma barra fina mostra o tempo de leitura); ativa aos 5 s; clique (mouse · Enter · gatilho ou pinça no
   headset) → 2 s parado com o ✓ preenchendo → fade → cartaz e a peça em 0:00; a voz só começa aí. No headset, entrar no VR mostra a tela de
   novo, ancorada na cabeça. A duração do cartão 5 é o TOTAL do app.js (se o silêncio de B6-2 mudar, muda sozinha).
   Fora dela: ?estudio, ?revisao e ?semaviso (modos de trabalho e testes). */
/* D-519 (teste no Quest: "o quadro do início e do fim ficaram bloqueados por uma tela preta, só enxergava por baixo o botão"): as telas
   eram ancoradas UMA vez; no headset a pose da cabeça no instante da âncora pode ainda não ser a real (a tela nasce acima/de lado e só a
   parte de baixo cai na vista). Agora elas ACOMPANHAM a cabeça com calma ("tag-along", padrão de UI em VR): se a tela sair de ±20° da
   direção do olhar ou de 20 cm da altura dos olhos, ela desliza de volta à frente, na altura do olho — sem ficar grudada na cabeça. */
const _ag_a=new THREE.Vector3(), _ag_p=new THREE.Vector3(), _ag_f=new THREE.Vector3(), _ag_g=new THREE.Vector3(), _ag_q=new THREE.Quaternion();
function tagAlong(g,st,dist,dy,dt){ camera.updateMatrixWorld(true); _ag_p.setFromMatrixPosition(camera.matrixWorld); camera.getWorldQuaternion(_ag_q);
  _ag_f.set(0,0,-1).applyQuaternion(_ag_q); _ag_f.y=0; if(_ag_f.lengthSq()<1e-6) return; _ag_f.normalize();
  _ag_a.copy(_ag_p).addScaledVector(_ag_f,dist); _ag_a.y=_ag_p.y+dy;
  _ag_g.copy(g.position).sub(_ag_p).setY(0); const lg=_ag_g.length(); if(lg>1e-6) _ag_g.multiplyScalar(1/lg);
  const ang=lg>1e-6?Math.acos(clamp(_ag_g.dot(_ag_f),-1,1)):Math.PI, dh=Math.abs(g.position.y-_ag_a.y), dd=Math.abs(lg-dist);
  if(ang>0.35||dh>0.2||dd>0.6) st.seguindo=true;
  if(st.seguindo){ const k=1-Math.exp(-Math.min(dt,0.1)*3); g.position.lerp(_ag_a,k); g.rotation.set(0,alerp(g.rotation.y,Math.atan2(-_ag_f.x,-_ag_f.z),k),0); g.updateMatrixWorld(true);
    if(ang<0.04&&dh<0.02&&dd<0.05) st.seguindo=false; } }
/* D-521 (pedido dele: "coloque o quadro de aviso mais para trás, para ler tudo sem mexer a cabeça"): a 2,7 m (era 1,5) e 10 % maior, com o
   CENTRO do conjunto (cartões → botão, ~1,3 m de altura) na altura do olho — tudo cabe em ±15° vertical e ±18° horizontal */
const AV_D=2.7, AV_S=1.1, AV_DY=0.18;
const AVISO=(()=>{ const ativo0=!(CFG.estudio||CFG.revisao||QS.has('semaviso'));
  const sc=new THREE.Scene(); sc.background=new THREE.Color(0x000000); const g=new THREE.Group(); sc.add(g);
  const INK='#e8ecf6', ALERTA='#ffb020', CARD='#15171d';
  const durTxt=(()=>{ const s=Math.round(TOTAL); return Math.floor(s/60)+' min '+(s%60)+' s'; })(), durClk=(()=>{ const s=Math.round(TOTAL); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); })();
  const FR=['Stand still, feet apart.','Do not walk. Just look around.','The room will move around you. Stay where you are.','If you feel dizzy, remove the headset.',
    'Duration: '+durTxt+'. You can stop at any time.','Not recommended for people prone to seizures or motion sickness.'];
  const CW=512, CH=420;
  function pessoa(x,cx,cy,s,pes){ x.beginPath(); x.arc(cx,cy-62*s,15*s,0,7); x.stroke(); x.beginPath(); x.moveTo(cx,cy-46*s); x.lineTo(cx,cy+8*s);
    x.moveTo(cx,cy-34*s); x.lineTo(cx-20*s,cy-2*s); x.moveTo(cx,cy-34*s); x.lineTo(cx+20*s,cy-2*s);
    const a=pes?26:10; x.moveTo(cx,cy+8*s); x.lineTo(cx-a*s,cy+62*s); x.moveTo(cx,cy+8*s); x.lineTo(cx+a*s,cy+62*s); x.stroke(); }
  function seta(x,x0,y0,x1,y1){ x.beginPath(); x.moveTo(x0,y0); x.lineTo(x1,y1); x.stroke(); const a=Math.atan2(y1-y0,x1-x0), h=16;
    x.beginPath(); x.moveTo(x1,y1); x.lineTo(x1-h*Math.cos(a-0.45),y1-h*Math.sin(a-0.45)); x.moveTo(x1,y1); x.lineTo(x1-h*Math.cos(a+0.45),y1-h*Math.sin(a+0.45)); x.stroke(); }
  function arcoSeta(x,cx,cy,r,a0,a1){ x.beginPath(); x.arc(cx,cy,r,a0,a1); x.stroke(); const ex=cx+r*Math.cos(a1), ey=cy+r*Math.sin(a1), tg=a1+Math.PI/2, h=14;
    x.beginPath(); x.moveTo(ex,ey); x.lineTo(ex-h*Math.cos(tg-0.5),ey-h*Math.sin(tg-0.5)); x.moveTo(ex,ey); x.lineTo(ex-h*Math.cos(tg+0.5),ey-h*Math.sin(tg+0.5)); x.stroke(); }
  const ICONE=[
    (x,cx,cy)=>{ pessoa(x,cx,cy,1.25,true); x.beginPath(); x.moveTo(cx-70,cy+80); x.lineTo(cx+70,cy+80); x.stroke(); },
    (x,cx,cy)=>{ pessoa(x,cx,cy+10,1.2,false); arcoSeta(x,cx,cy-66,44,Math.PI*1.05,Math.PI*1.75); arcoSeta(x,cx,cy-66,44,Math.PI*0.05,Math.PI*0.75); },
    (x,cx,cy)=>{ pessoa(x,cx,cy,1.2,false); seta(x,cx-110,cy-20,cx+110,cy-20); },
    (x,cx,cy)=>{ x.beginPath(); x.arc(cx-20,cy+30,34,0,7); x.stroke(); x.beginPath(); x.moveTo(cx-20,cy+64); x.lineTo(cx-20,cy+92); x.stroke();
      x.beginPath(); x.roundRect(cx-68,cy-70,96,44,12); x.stroke(); x.beginPath(); x.moveTo(cx-40,cy-26); x.lineTo(cx-40,cy-10); x.moveTo(cx,cy-26); x.lineTo(cx,cy-10); x.stroke();
      seta(x,cx+50,cy-30,cx+50,cy-92); x.beginPath(); for(let k=0;k<=60;k++){ const a=k*0.32, r=2+k*0.45; const px=cx+80+Math.cos(a)*r, py=cy+36+Math.sin(a)*r; k?x.lineTo(px,py):x.moveTo(px,py); } x.stroke(); },
    (x,cx,cy)=>{ x.beginPath(); x.arc(cx,cy,78,0,7); x.stroke(); x.font='700 50px ui-monospace,monospace'; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle=INK; x.fillText(durClk,cx,cy+2); },
    (x,cx,cy)=>{ x.beginPath(); x.moveTo(cx,cy-84); x.lineTo(cx+92,cy+74); x.lineTo(cx-92,cy+74); x.closePath(); x.stroke(); x.lineWidth=12; x.beginPath(); x.moveTo(cx,cy-30); x.lineTo(cx,cy+22); x.stroke(); x.beginPath(); x.arc(cx,cy+48,5,0,7); x.fill(); } ];
  function cartao(i){ const c=document.createElement('canvas'); c.width=CW; c.height=CH; const x=c.getContext('2d');
    x.fillStyle=CARD; x.beginPath(); x.roundRect(0,0,CW,CH,28); x.fill(); const cor=i===5?ALERTA:INK;
    x.strokeStyle=cor; x.fillStyle=cor; x.lineWidth=7; x.lineCap='round'; x.lineJoin='round'; ICONE[i](x,CW/2,138);
    x.fillStyle=i===5?ALERTA:'#ffffff'; x.font='600 33px Inter,system-ui,sans-serif'; x.textAlign='center'; x.textBaseline='alphabetic';
    const pal=FR[i].split(' '), lin=[]; let l=''; for(const w of pal){ const tl=l?l+' '+w:w; if(x.measureText(tl).width>CW-56&&l){ lin.push(l); l=w; } else l=tl; } lin.push(l);
    lin.forEach((s,k)=>x.fillText(s,CW/2,300+k*40-(lin.length-2)*20));
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t; }
  const W=0.5, H=W*CH/CW, GX=0.06, GY=0.06;
  for(let i=0;i<6;i++){ const m=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:cartao(i),toneMapped:false})); const c=i%3, r=Math.floor(i/3);
    m.position.set((c-1)*(W+GX),(0.5-r)*(H+GY)+0.06,0); g.add(m); }
  /* D-506: 7ª instrução (pedido dele): higiene do equipamento — faixa na largura da grade, logo abaixo dela, mesmo estilo dos cartões
     (ícone de traço + frase); a grade 3 × 2 fica como está (4 colunas passaria de ±30°). Nota e botão descem 15 cm (botão ≈ −28°). */
  const HIG=0.12, DHIG=HIG+0.03;
  { const NW=3*W+2*GX, px=1000, c=document.createElement('canvas'); c.width=Math.round(NW*px); c.height=Math.round(HIG*px); const x=c.getContext('2d');
    x.fillStyle=CARD; x.beginPath(); x.roundRect(0,0,c.width,c.height,24); x.fill();
    const cx=90, cy=c.height/2; x.strokeStyle=INK; x.fillStyle=INK; x.lineWidth=6; x.lineCap='round'; x.lineJoin='round';
    x.beginPath(); x.roundRect(cx-46,cy-22,92,44,14); x.stroke(); x.beginPath(); x.arc(cx-20,cy,9,0,7); x.stroke(); x.beginPath(); x.arc(cx+20,cy,9,0,7); x.stroke();   /* óculos de VR */
    const brilho=(bx,by,r)=>{ x.beginPath(); x.moveTo(bx-r,by); x.lineTo(bx+r,by); x.moveTo(bx,by-r); x.lineTo(bx,by+r); x.stroke(); }; x.lineWidth=4; brilho(cx+56,cy-30,9); brilho(cx-58,cy+30,7);
    x.fillStyle='#ffffff'; x.font='600 33px Inter,system-ui,sans-serif'; x.textAlign='left'; x.textBaseline='middle'; x.fillText('This equipment may not have been sanitized since its last use.',180,cy+1);
    const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(NW,HIG),new THREE.MeshBasicMaterial({map:tx,toneMapped:false})); m.position.set(0,-0.5*(H+GY)+0.06-H/2-0.03-HIG/2,0); g.add(m); }
  /* D-378: nota em faixa própria, abaixo da grade, letra menor que a dos cartões, sem ícone */
  { const NT='This immersive piece was independently developed by Vinicius Rosa to share this research. Comfort settings have not been exhaustively optimized for every viewer. Viewer discretion is advised.';
    const NW=3*W+2*GX, px=1000, c=document.createElement('canvas'); c.width=Math.round(NW*px); c.height=120; const x=c.getContext('2d');
    x.fillStyle='#0e1015'; x.beginPath(); x.roundRect(0,0,c.width,c.height,18); x.fill();
    x.fillStyle='#b9bfcf'; x.font='500 24px Inter,system-ui,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    const pal=NT.split(' '), lin=[]; let l=''; for(const w of pal){ const tl=l?l+' '+w:w; if(x.measureText(tl).width>c.width-60&&l){ lin.push(l); l=w; } else l=tl; } lin.push(l);
    lin.forEach((s,k)=>x.fillText(s,c.width/2,c.height/2+(k-(lin.length-1)/2)*32));
    const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace; tx.anisotropy=4;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(NW,NW*c.height/c.width),new THREE.MeshBasicMaterial({map:tx,toneMapped:false})); m.position.set(0,-0.5*(H+GY)+0.06-H/2-0.03-DHIG-NW*c.height/c.width/2,0); /* 3 cm abaixo da faixa de higiene */ g.add(m); }
  /* botão */
  const bc=document.createElement('canvas'); bc.width=900; bc.height=150; const bx=bc.getContext('2d'); const btex=new THREE.CanvasTexture(bc); btex.colorSpace=THREE.SRGBColorSpace;
  const btn=new THREE.Mesh(new THREE.PlaneGeometry(0.72,0.12),new THREE.MeshBasicMaterial({map:btex,transparent:true,toneMapped:false})); btn.position.set(0,-0.5*(H+GY)+0.06-H/2-0.03-DHIG-0.12-0.03-0.06,0); /* 3 cm abaixo da nota (≈ −0,62 m: −22° do eixo) */ g.add(btn);
  let ultimo='';
  function desenhaBotao(ler,conf){ const key=Math.round(ler*40)+'|'+Math.round(conf*40); if(key===ultimo) return; ultimo=key; const x=bx, w=900, h=150; x.clearRect(0,0,w,h);
    const pronto=ler>=1; x.globalAlpha=pronto?1:0.35; x.fillStyle=pronto?'#1fa85c':'#3a3d46'; x.beginPath(); x.roundRect(4,4,w-8,h-38,24); x.fill();
    /* o ✓: círculo que preenche nos 2 s de confirmação */
    const cx=86, cy=(h-34)/2+4; x.strokeStyle='#ffffff'; x.lineWidth=5; x.beginPath(); x.arc(cx,cy,30,0,7); x.stroke();
    if(conf>0){ x.fillStyle='#ffffff'; x.beginPath(); x.moveTo(cx,cy); x.arc(cx,cy,30,-Math.PI/2,-Math.PI/2+conf*2*Math.PI); x.closePath(); x.fill(); }
    x.strokeStyle=conf>0?'#1fa85c':'#ffffff'; x.lineWidth=7; x.lineCap='round'; x.beginPath(); x.moveTo(cx-14,cy+1); x.lineTo(cx-3,cy+12); x.lineTo(cx+16,cy-12); x.stroke();
    x.fillStyle='#ffffff'; x.font='700 50px Inter,system-ui,sans-serif'; x.textAlign='left'; x.textBaseline='middle'; x.fillText('I understand — Start',150,cy+2);
    /* a barra fina do tempo de leitura (5 s) */
    x.globalAlpha=1; x.fillStyle='#2a2d35'; x.fillRect(40,h-18,w-80,6); x.fillStyle=pronto?'#1fa85c':'#9aa3c2'; x.fillRect(40,h-18,(w-80)*Math.min(1,ler),6); btex.needsUpdate=true; }
  const st={on:ativo0, t0:null, clique:null, ancorado:false, fim:0};
  /* D-508 (teste no Quest: "o aviso não aparece, nem o thank you"): a câmera do XR (xr.getCamera) não tem pai — getWorldPosition nela
     devolvia a cabeça em coordenadas do RIG, não do mundo (e ainda sobrescrevia a matriz dela). A câmera da peça é filha do rig e o three.js
     a atualiza com a pose da cabeça: é ela que dá a posição real. Reserva: se em 1,5 s o headset não der a altura, ancora assim mesmo. */
  function ancorar(forca){ const cam=camera; cam.updateMatrixWorld(true); const p=cam.getWorldPosition(new THREE.Vector3());
    if(renderer.xr.isPresenting&&cam.position.y<0.3&&!forca) return false;   // o headset ainda não deu a altura da cabeça
    const q=cam.getWorldQuaternion(new THREE.Quaternion()), f=new THREE.Vector3(0,0,-1).applyQuaternion(q); f.y=0; if(f.lengthSq()<1e-6) f.set(0,0,-1); f.normalize();
    g.position.copy(p).addScaledVector(f,AV_D); g.position.y=p.y+AV_DY; g.scale.setScalar(AV_S); g.rotation.set(0,Math.atan2(-f.x,-f.z),0); g.updateMatrixWorld(true); return true; }
  function podeClicar(now){ return st.on&&st.t0!==null&&st.clique===null&&(now-st.t0)/1000>=5; }
  function confirmar(){ const now=performance.now(); if(!podeClicar(now)) return false; st.clique=now;
    /* desbloqueia o áudio DENTRO do gesto (o play de verdade só vem 2 s depois) */
    AUD.els.forEach(({a})=>{ try{ a.muted=true; const p=a.play(); if(p) p.then(()=>{ a.pause(); a.muted=false; }).catch(()=>{ a.muted=false; }); }catch(e){} }); return true; }
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  return { get on(){ return st.on; }, scene:sc,
    reset(){ if(!ativo0) return false; st.on=true; st.t0=null; st.clique=null; st.ancorado=false; st.pedido=null; st.fim=0; ultimo=''; T.t=0; T.playing=false; return true; },
    clique(ev){ const r=canvas.getBoundingClientRect(); ptr.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1); ray.setFromCamera(ptr,camera); if(ray.intersectObject(btn).length) confirmar(); },
    select(){ confirmar(); }, tecla(){ confirmar(); },
    /* devolve true enquanto a tela de avisos está no ar (o loop desenha esta cena no lugar da peça) */
    tick(now){ if(!st.on) return false; T.t=0; T.playing=false; $('snd')?.classList.add('gone');
      if(st.pedido===undefined||st.pedido===null) st.pedido=now;
      if(!st.ancorado){ st.ancorado=ancorar((now-st.pedido)>1500); if(st.ancorado) st.t0=now; }
      else { tagAlong(g,st,AV_D,AV_DY,(now-(st.ult||now))/1000); } st.ult=now;
      const ler=st.t0===null?0:Math.min(1,(now-st.t0)/5000), conf=st.clique===null?0:Math.min(1,(now-st.clique)/2000); desenhaBotao(ler,conf);
      st.fim=st.clique===null?0:smooth((now-st.clique-1500)/500);   // o último meio segundo dos 2 s escurece (fade)
      g.traverse(o=>{ if(o.material){ o.material.transparent=true; o.material.opacity=1-st.fim; } });
      if(conf>=1){ st.on=false; st.pedido=null; XRH0=null; XRCAL.length=0; startSound(true); return false; }   /* D-526: cada visitante que aperta Start é medido de novo (antes valia a altura do começo da sessão — e desde a D-509 a sessão não acaba entre visitantes) */
      return true; } }; })();
{ const c0=renderer.xr.getController(0), c1=renderer.xr.getController(1); [c0,c1].forEach(c=>{ c.addEventListener('select',()=>{ if(AVISO.on) AVISO.select(); }); scene.add(c); }); }
addEventListener('keydown',e=>{ if(AVISO.on&&(e.key==='Enter'||e.key===' ')){ AVISO.tecla(); e.preventDefault(); e.stopImmediatePropagation(); } },true);

/* =========================  13e. FECHO — "THANK YOU FOR WATCHING" (caderno 27/09) · D-501  =========================
   Depois do escuro do grand finale (T_DARK), antes do loop: tela PRETA própria (cena à parte, como a de avisos), à frente de quem olha,
   na altura do olhar, a 2,8 m: "Thank you for watching" · emblema da NUS (o mesmo .glb do cartaz) · título + autores (o mesmo .glb do
   cartaz, que já traz as duas coisas) · "Prepared by Vinicius Rosa". Entra em 0,8 s, sai nos últimos 0,6 s. A peça ficou 6 s mais longa
   (E2_TOTAL 221 → 227; o cartão de duração da tela de avisos acompanha sozinho). */
const THX=(()=>{ const sc=new THREE.Scene(); sc.background=new THREE.Color(0x000000); const g=new THREE.Group(); sc.add(g);
  sc.add(new THREE.AmbientLight(0xffffff,2.6)); const dl=new THREE.DirectionalLight(0xffffff,2.4); dl.position.set(0.4,0.8,2.5); sc.add(dl);   /* D-504: o emblema estava escuro */
  const T0=T_DARK+0.1, mats=[];
  const clone=o=>{ const c=o.clone(true); c.traverse(n=>{ if(n.isMesh&&n.material){ n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone(); (Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{ m.transparent=true; m.opacity=1; mats.push(m); }); } }); c.visible=true; c.position.set(0,0,0); c.rotation.set(0,0,0); return c; };
  const txt=(s,font,cor,Wm)=>{ const c=document.createElement('canvas'); c.width=2048; c.height=200; const x=c.getContext('2d'); x.font=font; x.fillStyle=cor; x.textAlign='center'; x.textBaseline='middle'; x.fillText(s,1024,104);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; const m=new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}); mats.push(m); return new THREE.Mesh(new THREE.PlaneGeometry(Wm,Wm*200/2048),m); };
  const topo=txt('Thank you for watching','700 120px Inter,system-ui,sans-serif','#ffffff',2.2);
  const logo=clone(M.nusEmblema), tit=clone(M.tituloGlb);
  /* D-504: emblema mais claro — além da luz, auto-iluminação com a própria cor/textura (o relevo continua pegando a direcional) */
  logo.traverse(n=>{ if(n.isMesh&&n.material&&n.material.emissive){ const m=n.material; if(m.map){ m.emissiveMap=m.map; m.emissive.setRGB(1,1,1); } else m.emissive.copy(m.color); m.emissiveIntensity=0.45; m.needsUpdate=true; } });
  /* D-504: crédito para quem apresenta (pedido dele: "presenter: Clarice"; "VR prepared by Vinicius") */
  const apr=txt('Presenter: Clarice F. Sabino','600 84px Inter,system-ui,sans-serif','#ffffff',2.1);   /* D-521: nome completo (dele) */
  const pe=txt('VR prepared by Vinicius Rosa','500 76px Inter,system-ui,sans-serif','#d3d8e4',1.8);
  /* empilha pela caixa real de cada peça (medida, não chutada) */
  const itens=[[topo,0.10],[logo,0.12],[tit,0.16],[apr,0.02],[pe,0]]; const alt=itens.map(([o])=>{ const b=new THREE.Box3().setFromObject(o); return {h:b.max.y-b.min.y, cy:(b.max.y+b.min.y)/2}; });
  const H=itens.reduce((a,[o,gap],i)=>a+alt[i].h+gap,0); let y=H/2;
  itens.forEach(([o,gap],i)=>{ y-=alt[i].h/2; o.position.y=y-alt[i].cy; y-=alt[i].h/2+gap; g.add(o); });
  /* o emblema e o título .glb são escuros (feitos para o cartaz claro): um CARTÃO branco arredondado atrás dos dois, só ali */
  { g.updateMatrixWorld(true); const b=new THREE.Box3().setFromObject(logo).union(new THREE.Box3().setFromObject(tit)); const P=0.12, w=b.max.x-b.min.x+2*P, h=b.max.y-b.min.y+2*P;
    const c=document.createElement('canvas'); c.width=1024; c.height=Math.round(1024*h/w); const x=c.getContext('2d'); x.fillStyle='#ffffff'; x.beginPath(); x.roundRect(0,0,c.width,c.height,Math.round(0.06/w*1024)); x.fill();
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; const m=new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false}); mats.push(m);
    const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m); card.position.set((b.max.x+b.min.x)/2,(b.max.y+b.min.y)/2,b.min.z-0.03); card.renderOrder=-1; g.add(card); }
  const st={anc:false};
  function ancorar(){ const cam=camera; cam.updateMatrixWorld(true); const p=cam.getWorldPosition(new THREE.Vector3());   /* D-508: a câmera da peça (filha do rig), não a do XR */
    const q=cam.getWorldQuaternion(new THREE.Quaternion()), f=new THREE.Vector3(0,0,-1).applyQuaternion(q); f.y=0; if(f.lengthSq()<1e-6) f.set(0,0,-1); f.normalize();
    g.position.copy(p).addScaledVector(f,2.8); g.position.y=p.y-0.05; g.rotation.set(0,Math.atan2(-f.x,-f.z),0); g.updateMatrixWorld(true); }
  return { scene:sc, T0, tick(t){ const on=t>=T0&&t<TOTAL; if(!on){ st.anc=false; return false; } const now_=performance.now(); if(!st.anc){ ancorar(); st.anc=true; } else tagAlong(g,st,2.8,-0.05,(now_-(st.ult||now_))/1000); st.ult=now_;
      const a=smooth((t-T0)/0.8)*(1-smooth((t-(TOTAL-0.7))/0.6)); mats.forEach(m=>{ m.opacity=a; }); logo.rotation.y=0.12*Math.sin((t-T0)*0.5); return true; } }; })();
let T_ANT=null, SOMB_P=null;
renderer.setAnimationLoop(now=>{
  FRAME++; const raw=(now-last)/1000; last=now; const dt=Math.min(0.05,raw), dtW=Math.min(0.25,raw); fps+=((raw>0?1/raw:60)-fps)*0.06;
  if(fly.on){ stepFly(dtW); if(fly.play) T.tick(now); } else T.tick(now);
  if(CFG.trecho==='eluato'&&(T.t>ts('0:18.8')||T.t<ts('0:09.9'))) T.t=ts('0:09.9');   // laço do estudo do trecho (D-322)
  pose(T.t,POSE);
  if(fly.on){ camera.position.copy(fly.pos); camera.rotation.set(fly.pitch*DEG,fly.yaw*DEG,0); if(FRAME%15===0) flyInfo(); }
  else if(renderer.xr.isPresenting){
    /* VR (D-205): o headset controla a cabeça; a peça move o RIG — posição = o percurso, yaw = para onde se olha, com o mesmo teto de giro */
    /* D-366: a peça foi desenhada com o olho a CFG.eyeY (1,60 m). No Quest ('local-floor') o olho era a altura REAL da cabeça —
       sentado ficava ~0,4 m abaixo. Calibra uma vez no começo da sessão (a altura da cabeça nos primeiros quadros) e desloca o
       chão da peça para o olho cair em 1,60 m; o movimento vertical da cabeça depois continua valendo. */
    { const xc=renderer.xr.getCamera(), hy=xc.getWorldPosition(_V).y-rig.position.y; if(XRH0===null&&hy>0.3){ XRCAL.push(hy); if(XRCAL.length>=24){ const s_=XRCAL.slice().sort((a,b)=>a-b); XRH0=s_[12]; } } }   /* D-526: mediana, não o 1º quadro */
    rig.position.set(POSE.pos.x,POSE.pos.y-(XRH0??CFG.eyeY),POSE.pos.z);
    const yaw=Math.atan2(-(POSE.look.x-POSE.pos.x),-(POSE.look.z-POSE.pos.z));
    if(rigYaw===null||SNAP) rigYaw=yaw; else { const d=((yaw-rigYaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI, mx=CFG.yawRate*DEG*dt; rigYaw+=clamp(d,-mx,mx); }
    rig.rotation.y=rigYaw; rig.updateMatrixWorld(true);
  }
  else if(fly.ret>0){ fly.ret=Math.min(1,fly.ret+dt/0.8); const k=smooth(fly.ret); const tmp=AIM; tmp.position.copy(POSE.pos); tmp.lookAt(POSE.look); tmp.rotation.order='YXZ';
    camera.position.lerpVectors(fly.from.pos,POSE.pos,k); camera.rotation.set(lerp(fly.from.pitch*DEG,tmp.rotation.x,k),lerp(fly.from.yaw*DEG,tmp.rotation.y,k),0); if(fly.ret>=1){fly.ret=0;T.playing=fly.wasPlaying;camQ=null;} }
  else { camera.position.copy(POSE.pos); const tq=AIM; tq.position.copy(POSE.pos); tq.lookAt(POSE.look);
    if(SNAP||!camQ) camQ=tq.quaternion.clone(); else camQ.rotateTowards(tq.quaternion,CFG.yawRate*DEG*dt);
    camera.quaternion.copy(camQ); camera.rotation.setFromQuaternion(camQ,'YXZ'); }
  camera.updateMatrixWorld();
  /* D-509: terminada a peça (o tempo dá a volta em TOTAL), volta à tela de avisos e espera o play — não recomeça sozinha (fora do estúdio) */
  if(T.playing&&T_ANT!==null&&T_ANT>TOTAL-2&&T.t<1.0&&!fly.on) AVISO.reset(); T_ANT=T.t;
  const avOn=AVISO.tick(now);   // D-377: B-1, a tela de avisos antes do cartaz
  const t=T.t, snapFrame=SNAP;
  const thxOn=!avOn&&THX.tick(t);   // D-501: a tela final   // SNAP é consumido por applyKF; o resto do frame usa esta cópia
  if(EST_TICK) EST_TICK(t,dt);   // D-325: a mesa de direção acompanha o tempo
  applyKF(t,dt); if(!ZERO){ TELAS.forEach(x=>x.update(t)); T12.tick(POSE,camera); T34.tick(POSE,camera); T5.tick(POSE,camera); }
  /* luz da sala onde a cabeça está (módulo da A) + caixa de sombra do sol acompanhando a cabeça */
  { const cw=camera.getWorldPosition(_V); CEN.seguirSombra({position:cw}); LUZP.position.copy(cw); CEN.luzDaSala(LUZP);
    /* D-522: a sombra "congelada" da D-517 SAIU (ele: "na parte do HYDRA a sombra/luz muda totalmente, dá um pulo quando entra") — a caixa
       da sombra acompanha a cabeça e, congelada, pulava a cada 0,6 m e ao entrar na rotunda. A sombra volta a ser calculada todo quadro; a
       economia vem de outro lugar: os objetos que FLUTUAM no ar (HYDRA, cápsulas, protocolo, modelos de ML) não projetam mais sombra. */
    renderer.shadowMap.autoUpdate=true; }
  /* no VR o three.js r160 desenha cada olho com câmeras próprias (camadas 0+1 e 0+2, fixas) — as mesmas camadas 1/2 que a A usa para o sol
     de cada sala (Q-311). As câmeras do XR recebem a máscara da câmera da peça. [NÃO VERIFICADO no headset] */
  if(renderer.xr.isPresenting){ const xc=renderer.xr.getCamera(), mk=camera.layers.mask; xc.layers.mask=mk; xc.cameras.forEach(c=>{ c.layers.mask=mk; }); }
  if(!ZERO){   /* D-334: tudo daqui até a sequência do eluato é conteúdo animado da v7.7 — desligado no ZERO */
  /* poças de luz sobre as peças da mesa (cues LIGHT da §7) */
  { const poolA=P=>{ let a=0; for(const [c0,c1] of P.cues){ if(t>=c0&&t<c1+0.8) a=Math.max(a,smooth((t-c0)/0.4)*(1-smooth((t-c1)/0.8))); } return a; };
    for(const P of [...POOLS,MAQPOOL]){ const a=(MESA_LIMPA&&P!==MAQPOOL)?0:poolA(P); P.m.material.opacity=0.85*a; P.m.visible=a>0.005; P.r.material.opacity=0.9*a; P.r.visible=a>0.005; P.r.scale.setScalar((P===MAQPOOL?1.25:1)*(1+0.04*Math.sin(t*3))); } }
  /* D-330: revela cada peça da mesa quando chega a vez dela (REVELA_PECA, calculado acima a partir das poças) */
  for(let i=0;i<REVELA_PECA.length;i++) CEN.mostrarPeca(i, !MESA_LIMPA && t>=REVELA_PECA[i]);
  // ---- B1-2: o meio muda de tom · linha tubo → célula · "Why?" as placas pulsam
  if(tube1.userData.medium) tube1.userData.medium.color.lerpColors(C_MED0,C_MED1,smooth((t-T_TUBE)/5));
  beamSet(0,tube1.position,cellOld.position,env(t,T_BEAM0,T_BEAM0_END),PAL.gold);
  { const k=1+0.18*pulse1(t,T_WHY,0.8); if(k>1){ dishA.scale.multiplyScalar(k); dishB.scale.multiplyScalar(k); } }
  // ---- as quatro linhas das peças: → célula (0:35.0) · → maquete (0:44.5 · 1:24.0). A quarta (a passagem) sai da célula P4 exibida
  { let tgt=null, a=0, fourth=null;
    if(t>=T_LINES_CELL&&t<T_LINES_CELL_END+0.5){ a=env(t,T_LINES_CELL,T_LINES_CELL_END); tgt=cellOld.position; fourth=M.cells.children[1]; }
    else if(t>=T_LINES_MAQ&&t<T_LINES_MAQ_END+0.5){ a=env(t,T_LINES_MAQ,T_LINES_MAQ_END); tgt=maq.group.position; fourth=cellOld; }
    else if(t>=T_LINES_MAQ2&&t<T_LINES_MAQ2_END+0.5){ a=env(t,T_LINES_MAQ2,T_LINES_MAQ2_END); tgt=maq.group.position; fourth=M.cells.children[1]; }
    FACTOR_PIECES.forEach((pi,k)=>{ const p=(a>0.01&&!MESA_LIMPA)?pieceW(pi,_bw[k]):null; beamSet(1+k,p,tgt,p?a:0,PAL.teal); });
    if(fourth&&a>0.01&&fourth.visible!==false&&M.cells.visible!==false){ fourth.getWorldPosition(_bw[3]); beamSet(4,_bw[3],tgt,a,PAL.teal); } else beamSet(4,null,null,0);
    if(tgt===cellOld.position){ const k=1+0.12*pulse1(t,T_LINES_CELL+0.5,1.0); if(k>1) cellOld.scale.multiplyScalar(k); } }
  // ---- a MAQUETE sobre a mesa (até 1:45.0): pulsa em "a map" (0:02.1) e em "framework" (0:48.3) · 25 pontos em cascata (1:05.9) · pulso (1:07.4)
  //      · brilha mais em "HYDRA" (1:15.6) · leave-one-out (1:25.6) · a superfície acende (1:28.4) e fica — é o que cresce em 1:45.0
  { const on=t<T_GROW+0.6; maq.group.visible=on;
    if(on){ const pz=0.35*pulse1(t,T_MAQP0,0.9)+0.25*pulse1(t,T_MAQP1,0.9);
      const s=CFG.tess.tableScale*(1+pz)*(t<T_GROW?1:Math.max(0.001,1-smooth((t-T_GROW)/0.6))); maq.group.position.set(...MAQ); maq.group.scale.setScalar(s);
      const model=smooth((t-T_MODEL)/0.8), surf=smooth((t-T_SURF)/0.8);
      maq.fill=2.2+0.8*model+1.0*surf+1.2*pulse1(t,T_MAQP0,0.9); maq.setActive(0.2+0.3*model); maq.measBoost=4.0+1.5*model; maq.axisAlpha=0; maq.setDomain('PROLIF');
      const pl=1+0.6*pulse1(t,T_CPULSE,0.8);
      maq.meas.forEach((m,i)=>{ let lit=t<T_CASCADE?0:smooth((t-(T_CASCADE+i*CASC))/0.4);
        if(t>=T_LOO&&t<T_LOO_END+0.3){ const step=(T_LOO_END-T_LOO)/25, u=(t-(T_LOO+i*step))/step; m.grey=(u>=0&&u<1.6)?1-smooth(u/1.6):0; } else m.grey=0;   // leave-one-out literal: um a um fica cinza e volta
        m.lit=lit*pl; });
      maq.update(dt); maq.edges.forEach(e=>e.mesh.material.color.lerp(INK,0.85)); maq.meas.forEach(m=>m.mesh.material.color.offsetHSL(0,0.15,-0.28)); } }   // arestas em tinta: legível sobre a mesa clara (D-209)
  // ---- B5: os quatro glifos orbitam a MAQUETE e se fundem, um em cada nome (1:19.6 · 1:20.5 · 1:21.4 · 1:22.3), num ponto de luz
  { const on=t>=T_GLYPH&&t<T_FUSE[3]+0.1; models4.visible=on; let fused=0; const eyeW=camera.getWorldPosition(_eye);
    if(on){ models4.position.copy(maq.group.position); models4.scale.setScalar(0.55); models4.quaternion.identity();
      models4.children.forEach((c,i)=>{ const w=smooth((t-T_GLYPH)/(T_FUSE[i]-T_GLYPH)); if(w>=0.99) fused++; const an=t*1.6+i*Math.PI/2, rr=lerp(1.3,0.02,w);
        c.position.set(rr*Math.cos(an),0.22*Math.sin(an*0.7),rr*Math.sin(an)); c.visible=w<0.99; c.scale.setScalar(lerp(0.9,0.05,w)); c.userData.label?.lookAt(eyeW); }); }
    else for(let i=0;i<4;i++) if(t>=T_FUSE[i]) fused++;
    const ga=env(t,T_FUSE[0],T_LINES_MAQ2_END+0.6,0.3,0.6); GLOW.visible=ga>0.01; GLOW.position.copy(maq.group.position); GLOW.material.opacity=0.9*ga; GLOW.scale.setScalar(0.03+0.02*fused); }
  }   // fim do !ZERO (poças → glifos)
  // ---- B1-2: a sequência do eluato balança devagar (D-321) — a luz da nave corre pelas superfícies
  //      D-332: durante o pouso (POUSA_T0 → POUSA_T, a mesma curva do movimento) o balanço e a inclinação de
  //      apresentação (spec.tilt, que mostrava a peça ao rosto) vão a zero — o objeto chega na mesa na posição
  //      natural dele (disco e placa deitados, tubos em pé). O giro do tubo-com-disco congela no início do pouso.
  { const SW=[M.seqDisco,M.seqTubo,M.seqTuboDisco,M.seqEluato,M.seqPlaca];
    SW.forEach((o,i)=>{ if(!o||!o.visible) return; const w=o.children[0]; if(!w) return;
      const kp=t<=POUSA_T0?0:t>=POUSA_T?1:smooth((t-POUSA_T0)/POUSA_DUR), f=1-kp;
      w.rotation.z=f*0.075*Math.sin(t*0.55+i*1.7); w.rotation.x=f*0.055*Math.sin(t*0.38+i*2.3);
      /* o tubo COM o disco gira devagar (19°/s: uma volta em 19 s, e ele fica 5 s no ar) para o disco aparecer lá dentro */
      w.rotation.y=(o===M.seqTuboDisco)? (Math.min(t,POUSA_T0)-T_SEQ_GIRO)*0.33 : 0;
      const core=w.children[0]; if(core&&o.userData.spec) core.rotation.x=f*(o.userData.spec.tilt||0); }); }
  // ---- D-355: CENA c2 — cápsula deitada gira no eixo longo em volta do lado do "CEMENT"; placas balançam de leve;
  //      no pouso o balanço e a inclinação de apresentação vão a zero (a cápsula fica com o "CEMENT" para fora)
  { const kp=t<=C2T.p0?0:t>=C2T.p1?1:smooth((t-C2T.p0)/(C2T.p1-C2T.p0)), f=1-kp, CA=(window.C2_TXT??C2_TXT);
    [M.c2cap,M.c2d14,M.c2d31].forEach((o,i)=>{ if(!o||!o.visible) return; const w=o.children[0]; if(!w) return; const core=w.children[0];
      w.rotation.z=f*0.05*Math.sin(t*0.5+i*1.3); w.rotation.y=0;
      if(o===M.c2cap){ if(core) core.rotation.x=CA+(Math.min(t,C2T.p1)-C2T.lab)*0.6; }   /* gira no eixo longo (~34°/s); o rótulo "CEMENT" dá a volta no corpo, então fica sempre à vista */
      else if(core&&o.userData.spec) core.rotation.x=f*(o.userData.spec.tilt||0); }); }
  // ---- D-359: CENA c3 — balanço leve; inclinação de apresentação vai a zero no pouso; as curvas dissolvem (opacidade) em "assay"
  { const kp=t<=C3T.assay?0:t>=C3T.p1?1:smooth((t-C3T.assay)/(C3T.p1-C3T.assay)), f=1-kp;
    C3O.forEach((o,i)=>{ if(!o||!o.visible) return; const w=o.children[0]; if(!w) return; const core=w.children[0];
      w.rotation.z=f*0.05*Math.sin(t*0.5+i*1.7); w.rotation.x=f*0.04*Math.sin(t*0.37+i);
      if(core&&o.userData.spec) core.rotation.x=f*(o.userData.spec.tilt||0); });
    const cv=M.c3curvas; if(cv&&cv.visible){ const a=1-smooth((t-C3T.assay)/0.9);
      cv.traverse(n=>{ if(n.isMesh&&n.material){ if(!n.userData.c3){ n.material=n.material.clone(); n.material.transparent=true; n.userData.c3=n.material.opacity; } n.material.opacity=n.userData.c3*a; } });
      const w=cv.children[0], core=w&&w.children[0]; if(core) core.rotation.x=cv.userData.spec.tilt||0; } }
  // ---- D-363/D-364: a HIPÓTESE — colunas (material = nódulos vermelhos, protocolo = ruído cinza) sobre as placas; o ruído
  //      sai pelas linhas até as 4 peças da c3; a coluna da inert cresce e a da bioactive baixa até a mesma altura; a cápsula
  //      (o material) entra entre as placas e se liga às duas colunas
  { /* D-516: colunas e placas FICAM (pousam na mesa); só as linhas até as peças e o ruído somem */
    const vis=t>=HT.in, fade=1, fadeL=1-smooth((t-HT.sai)/(HT.fim-HT.sai));
    const pecas=[M.c3disc,M.c3tempo,M.c3vol,M.c3cel];
    const topoPeca=pecas.map(o=>{ const b=new THREE.Box3(); if(o&&o.visible) o.traverse(n=>{ if(n.isMesh&&n.visible) b.expandByObject(n); }); return b.isEmpty()?null:new THREE.Vector3((b.min.x+b.max.x)/2,b.max.y+0.01,(b.min.z+b.max.z)/2); });
    const pulsoPeca=pulse1(t,HT.chega,0.5); if(pulsoPeca>0) pecas.forEach(o=>{ if(o&&o.visible) o.scale.multiplyScalar(1+0.08*pulsoPeca); });
    const pulsoJunto=pulse1(t,HT.reg,0.4);
    const cresce=smooth((t-HT.cresce)/0.7);                       // 49,1: as colunas crescem até o resultado OBSERVADO
    const solta=smooth((t-HT.sep)/0.35), via=smooth((t-HT.sep-0.35)/(HT.chega-HT.sep-0.35));   // 50,09: o ruído sobe e viaja
    const revela=smooth((t-HT.rev)/(HT.pousa-HT.rev));            // 51,79: a inert se expande até o material, a bioactive já está nele
    const topos=[];
    [M.hpD14,M.hpD31].forEach((o,j)=>{ const C=HCOL[j];
      if(!vis||!o||!o.visible){ C.g.visible=false; HLIN[j].forEach(l=>{ l.visible=false; }); HFLOW[j].forEach(L=>L.forEach(p=>{ p.visible=false; })); return; }
      if(pulsoJunto>0) o.scale.multiplyScalar(1+0.06*pulsoJunto);
      const bx=new THREE.Box3(); o.traverse(n=>{ if(n.isMesh) bx.expandByObject(n); });
      const base=new THREE.Vector3((bx.min.x+bx.max.x)/2, bx.max.y+0.002, (bx.min.z+bx.max.z)/2);
      C.g.visible=true; C.g.position.copy(base); const sc=o.scale.x; C.g.scale.setScalar(sc);   /* D-516: a coluna acompanha a escala da placa (pousada a 70 %) */
      if(t>HT.sai+HPDUR+0.2&&C.parado&&!snapFrame){ topos.push(C.topo); return; } C.parado=t>HT.sai+HPDUR+0.2;
      const aT=cresce*fade; C.tubo.material.opacity=0.18*aT; C.a0.material.opacity=C.a1.material.opacity=0.8*aT;
      C.tubo.scale.set(1,HB.tubo,1); C.tubo.position.y=HB.tubo/2; C.a0.position.y=0; C.a1.position.y=HB.tubo;
      /* altura da coluna vermelha (material): bioactive = 12 cm sempre; inert = achatada a 4 cm pelo ruído, volta a 12 cm na revelação */
      const hMat=(j===0? lerp(HB.obsInert,HB.mat,revela) : HB.mat)*cresce;
      C.red.material.opacity=fade; for(let k=0;k<C.semR.length;k++){ const q=C.semR[k]; const y=q.y*hMat;
        _hV.set(Math.cos(q.a)*q.r, y+q.s*0.6, Math.sin(q.a)*q.r); _hSc.setScalar(q.s*(hMat>0.002?1:0.001)); _hM4.compose(_hV,_hQ,_hSc); C.red.setMatrixAt(k,_hM4); }
      C.red.instanceMatrix.needsUpdate=true;
      /* o ruído: bioactive = nuvem empilhada EM CIMA (infla 22 cm); inert = nuvem APERTANDO em volta e por cima da coluna achatada */
      const aN=cresce*(1-smooth((t-HT.chega)/0.3))*fade; C.ruido.material.opacity=Math.min(1,aN*1.2); C.ruido.visible=aN>0.01;
      for(let k=0;k<C.semN.length;k++){ const q=C.semN[k]; const tr=0.0035*Math.sin(t*23+q.f*7), tr2=0.0035*Math.cos(t*19+q.f*5);
        let x,y,z;
        if(j===1){ y=hMat+q.y*HB.ruidoBio*cresce; const rr=q.r*0.8*HB.R; x=Math.cos(q.a)*rr+tr; z=Math.sin(q.a)*rr+tr2; }
        else { y=q.y*(HB.obsInert+0.03)*cresce; const rr=(0.55+0.4*q.r)*HB.R; x=Math.cos(q.a)*rr+tr; z=Math.sin(q.a)*rr+tr2; }
        y+=0.10*solta;
        if(t>=HT.sep+0.35){ const alvo=topoPeca[q.l]; if(alvo){ _hA.set(base.x+x*sc,base.y+y*sc,base.z+z*sc); _hA.lerp(alvo,via); x=(_hA.x-base.x)/sc; y=(_hA.y-base.y)/sc; z=(_hA.z-base.z)/sc; } }
        _hV.set(x,y,z); _hSc.setScalar(q.s); _hM4.compose(_hV,_hQ,_hSc); C.ruido.setMatrixAt(k,_hM4); }
      C.ruido.instanceMatrix.needsUpdate=true;
      C.topo=new THREE.Vector3(base.x, base.y+hMat*sc+0.006, base.z); topos.push(C.topo);
      /* linhas coluna → as 4 peças da mesa, acesas do "separating" até o fim */
      HLIN[j].forEach((l,i)=>{ const alvo=topoPeca[i]; const a=smooth((t-HT.sep)/0.3)*fadeL; if(!alvo||a<=0.01){ l.visible=false; HFLOW[j][i].forEach(q=>{ q.visible=false; }); return; }
        _hA.set(base.x,base.y+0.05,base.z); hpLiga(l,_hA,alvo); l.material.opacity=0.85*a; l.visible=true;
        HFLOW[j][i].forEach((p,k)=>{ const u=((t-HT.sep)*0.7+k/4+i*0.13)%1; p.position.lerpVectors(_hA,alvo,u); p.material.opacity=a*Math.sin(Math.PI*u); p.visible=true; }); });
      HFLOW[j].forEach((L,i)=>{ if(!topoPeca[i]||smooth((t-HT.sep)/0.3)*fadeL<=0.01) L.forEach(p=>{ p.visible=false; }); }); });
    /* linha fina ligando os dois topos depois da revelação (mesma altura), pulsa uma vez */
    const a2=smooth((t-HT.pousa)/0.3)*fadeL; if(vis&&a2>0.01&&topos.length===2){ hpLiga(HTOPO,topos[0],topos[1]); HTOPO.material.opacity=(0.6+0.4*pulse1(t,HT.pousa,0.6))*a2; HTOPO.visible=true; } else HTOPO.visible=false;
    /* a cápsula (o material): gira devagar no eixo longo; linhas finas das duas colunas até ela */
    const cap=M.hpCap; if(cap&&cap.visible){ const w=cap.children[0], core=w&&w.children[0]; if(core) core.rotation.x=t<HT.sai?(t-HT.rev)*0.6:(HT.sai-HT.rev)*0.6*(1-smooth((t-HT.sai)/HPDUR));   /* D-516: pára de girar e deita reta ao pousar */
      const cp=cap.getWorldPosition(new THREE.Vector3()); const a3=smooth((t-HT.pousa)/0.4)*fadeL;
      HCAPL.forEach((l,j)=>{ if(!topos[j]||a3<=0.01){ l.visible=false; return; } hpLiga(l,topos[j],cp); l.material.opacity=0.8*a3; l.visible=true; }); }
    else HCAPL.forEach(l=>{ l.visible=false; }); }
  // ---- D-365: B3-4 — a maquete (25 pontos) no referencial da vista; cascata das 25 condições com as peças piscando juntas;
  //      "alone" = g4 e g23 (só a área do disco muda) ligados por uma linha; "in combination" = todos pulsam
  /* D-368: a maquete de B3-4 agora é o cubo com os 25 objetos metálicos (E7tick, §13b) — aqui ficam só as peças do quadro piscando */
  { const on=t>=BT.ref-0.1&&t<BT.fim+0.6; maq.group.visible=false;
    if(on){ const comb=pulse1(t,BT.comb,0.6), CASC=1.5/25;
      /* as peças do quadro piscam: na cascata, as 4 de cada condição junto com o seu objeto; em "alone", só a linha dos discos (169 e 219); em "in combination", todas */
      B34ROWS.forEach((h,r)=>{ if(!h||!h.visible) return; h.children.forEach((w,c)=>{ let b=0;
        B34COND.forEach((cd,i)=>{ if(cd[r]===c) b=Math.max(b,pulse1(t,BT.n25+i*CASC+0.5,0.22)); });
        if(r===1&&(c===1||c===2)) b=Math.max(b,pulse1(t,BT.alone,0.6));
        b=Math.max(b,comb); w.scale.multiplyScalar(1+0.3*b); }); });
      /* o disco de referência gira devagar */
      const w=M.b34ref&&M.b34ref.children[0]; if(w) w.rotation.y=(t-BT.ref)*0.5; } }

  // ---- D-358: SOMBRA DE CONTATO sob tudo que pousa na mesa (eluato + CENA c2). A conta do pouso já deixava o fundo de
  //      cada objeto a ~2 mm do tampo (medido), mas sem sombra embaixo dele o olho lê "flutuando": a sombra do sol cai
  //      deslocada, longe do ponto de apoio. Uma mancha escura suave, do tamanho da pegada real do objeto (caixa medida já
  //      pousado), colada no tampo, aparece no instante em que ele encosta.
  for(const s of SOMBRAS){ const o=s.o; if(!o||!o.visible||t<s.fim){ s.m.visible=false; continue; }
    if(!s.ok){ o.updateMatrixWorld(true); const bx=new THREE.Box3(); o.traverse(n=>{ if(n.isMesh&&n.visible) bx.expandByObject(n,true); });
      if(bx.isEmpty()) continue; const c=bx.getCenter(new THREE.Vector3()), sz=bx.getSize(new THREE.Vector3());
      s.m.position.set(c.x,GEO.mesa.h+0.003,c.z); s.m.scale.set(Math.max(sz.x,0.04)*1.25,Math.max(sz.z,0.04)*1.25,1); s.ok=true; }
    s.m.visible=true; s.m.material.opacity=0.8*smooth((t-s.fim)/0.35); }
  if(ZERO) E7tick(t,dt,snapFrame);   // D-368…D-374: E7 — maquete, B5, B6, o HYDRA de B6-2 a B9
  INTRO.tick(t);   // D-343: cartaz de abertura (emblema NUS + título/autores) — substitui o tesserato (D-340/LABTESS, desligado)
  // ---- O MONÓLITO (D-223): pedra inteira desde 0:00, no eixo; o CAMPO acende na entrada de B6 (campoPainel); dissolve só no silêncio de B6-2 (1:45.0 → +1,5 s)
  { const diss=t<T_MONO_OUT?0:smooth((t-T_MONO_OUT)/1.5); CEN.dissolverPainel(diss);
    const sombra=diss<0.02; if(sombra!==MONO.sombra){ MONO.sombra=sombra; MONO.malhas.forEach(m=>{ m.castShadow=sombra; }); }   /* a sombra não dissolve com o shader: apaga-se ao começar */
    if(!ZERO){ const campo=t>=T_PNL-0.3&&diss<0.999; if(campo!==MONO.campo){ MONO.campo=campo; CEN.campoPainel(campo); }
    painel.m.material.opacity=smooth((t-(T_PNL-0.3))/0.6)*(1-smooth(diss/0.45)); } }   /* o gráfico acende com o campo e some antes da pedra (senão fica um fantasma de papel no ar) */
  if(!ZERO){   /* D-334: gráfico de B6 e todo o HYDRA — desligados no ZERO */
  // ---- B6: o painel-gráfico (par 4 → 23) · os dois discos pulsam em 1:32.6 (o de 219 mm² um tom mais claro: escala, não cor — .glb)
  { const on=t>=T_PNL-0.3&&t<T_MONO_OUT+1.5; painel.m.visible=on; if(on) painel.draw(t);
    const k=pulse1(t,T_DISCP,0.9); if(k>0&&M.discsSA.visible){ const ch=M.discsSA.children; if(ch[1]) ch[1].scale.multiplyScalar(1+0.12*k); if(ch[2]) ch[2].scale.multiplyScalar(1+0.22*k); } }
  // ---- O HYDRA (rotunda)
  { const P=tessPose(t); tess.group.position.set(P.x,P.y,P.z); tess.group.scale.setScalar(P.s); tess.measBoost=clamp(1.1/Math.max(P.s,1e-3),1.1,3);
    const glow=0.6*pulse1(t,T_B7,1.2)+0.6*pulse1(t,T_B9,1.2)+0.5*pulse1(t,T_VOICE,1.0)+1.0*pulse1(t,T_TESSP0,1.0)+0.8*env(t,T_B0SURF,T_B0OFF,0.5,0.4);   // "o campo de cor brilha" · B0: pulsa em "a tesseract", a superfície ondula
    tess.fill=(t<T_GROW? 2.0 : lerp(2.0,1.0,smooth((t-T_GROW)/Math.max(1,T_ARRIVE-T_GROW))))*(1+glow);
    tess.setActive(P.act);
    const b8=t>=T_VAL&&t<T_VALOFF+0.6;
    tess.meas.forEach((m,i)=>{ let lit=t<T_GROW+1.5?0:smooth((t-(T_GROW+1.5+i*0.05))/0.6);
      lit*=1+0.7*pulse1(t,T_B7+i*0.01,1.0)+0.5*pulse1(t,T_B9,1.0)+0.4*pulse1(t,T_VOICE,1.0); lit*=lerp(1,0.55,env(t,T_VAL,T_VALOFF,0.8,0.6));   // em B8 as 25 recuam para as esferas da validação lerem
      m.grey=0; m.lit=lit; });
    tess.netAlpha=0;
    const ax=smooth((t-(T_GROW+3.5))/2.0); tess.axisAlpha=ax*(1-smooth((t-T_RECEDE)/2));
    let dom='PROLIF'; for(const h of HEADS){ if(t>=h[0]+0.3) dom=h[1]; } if(t>=T_B7) dom='PROLIF'; tess.setDomain(dom);   // B7 · B8: a face é PROLIFERATION ("cell growth")
    if(t>=T_MIX&&t<T_B7) tess.setMix(true);   // 2:04.4 as colorações se sobrepõem num só corpo
    for(const n of ['SA','ET','EV','CP']) tess.pulse[n]=0;
    for(const h of HEADS){ if(!h[2]) continue; const u=t-(h[0]+0.9); if(u>=0&&u<1.3) tess.pulse[h[2]]=Math.sin(Math.PI*clamp(u/1.3,0,1)); }
    ['SA','ET','EV','CP'].forEach((n,i)=>{ const u=t-(T_EDGES+i*0.8); if(u>=0&&u<0.8) tess.pulse[n]=Math.max(tess.pulse[n],Math.sin(Math.PI*u/0.8)); });   // 3:29.2: "how the researcher chooses to run the test"
    { const k=0.5*pulse1(t,T_VOICE,0.9)+0.7*pulse1(t,T_TESSP0,1.0); if(k>0) for(const n of ['SA','ET','EV','CP']) tess.pulse[n]=Math.max(tess.pulse[n],k); }   // 1:51.0 "HYDRA reveals" · 0:04.6 "a tesseract"
    /* B8: o corpo 3D gira devagar até a diagonal early → late ficar DEITADA à frente do espectador (as três posições no quadro); fora de B8 volta ao neutro (Q-305) */
    { _tq.identity(); const vE=valOf('ProRoot',0), vL=valOf('ProRoot',2);
      if(b8&&vE&&vL){ tess.project(vE.p,_o); tess.project(vL.p,_o2); _al.set(_o[0]-_o2[0],_o[1]-_o2[1],_o[2]-_o2[2]); if(_al.lengthSq()>1e-6){ const fr=camFrame(); _tq.setFromUnitVectors(_al.normalize(),fr.r); } }
      if(snapFrame) tess.group.quaternion.copy(_tq); else tess.group.quaternion.slerp(_tq,1-Math.exp(-dt*(b8?1.2:0.6))); }
    _upL.set(0,1,0).applyQuaternion(_qi.copy(tess.group.quaternion).invert()).divideScalar(tess.group.scale.x||1);   // "acima" do mundo, no referencial do cubo
    // B8: três posições × três esferas (referência · Exp 1 · Exp 2). 2:43.2 pulsam juntas na mesma cor · 2:50.6 as da referência (e Exp 2) assentam;
    //     Exp 2 em late · dilute fica um pouco abaixo (−2,6 σ) · 2:58.0 as três do Exp 1 descem, cada vez mais fundo (−2,1 · −2,9 · −4,4 σ). Escala: 12 cm + 9 cm por σ além da banda (ilustrativa)
    const settle=smooth((t-T_SETTLE)/1.0);
    tess.val.forEach(v=>{ v.pl=0; v.departed=0; const ci=POSN.findIndex(k=>v.cond.startsWith(k)); v.ci=ci;
      v.a=env(t,T_VAL+ci*0.25,T_VALOFF,0.8,0.6);
      const k=v.mat==='ProRoot'?0:v.mat==='Exp1'?1:2, ang=k*2*Math.PI/3, spread=lerp(0.05,0.02,settle); v.jit=[spread*Math.cos(ang),spread*Math.sin(ang),0];
      const same=t>=T_SAME&&t<T_SETTLE; v.pl=same?0.5+0.5*Math.sin((t-T_SAME)*6):0; v.mesh.material.color.copy(same?TEALC:v.base); v.off=0;
      const sd=Math.abs(v.std||0); let below=0;
      if(v.mat==='Exp1') below=smooth((t-T_BELOW)/1.4)*(0.12+0.09*Math.max(0,sd-2));
      else if(sd>2) below=settle*(0.12+0.09*(sd-2));
      if(below>0){ v.jit=[v.jit[0]-_upL.x*below, v.jit[1]-_upL.y*below, v.jit[2]-_upL.z*below]; v.departed=below; } });
    tess.update(dt);
    if(ax<1) tess.edges.forEach(e=>e.mesh.material.color.lerp(INK,1-ax));   // antes de se formar: linha de tinta (D-209)
    tess.meas.forEach(m=>m.mesh.material.color.offsetHSL(0,0.15,-0.25));   /* Q-308: na galeria clara as 25 esferas na cor do atlas somem; escurecer mantém a ordem dos tons */
    tess.val.forEach(v=>{ if(v.a>0.01) v.mesh.scale.multiplyScalar(1+0.35*v.pl+(v.mat==='Exp1'&&v.departed>0.1?0.25*Math.max(0,Math.sin(t*5)):0)); });   // "pulsam juntas" · o Exp 1 pulsa abaixo
    const eyeW=camera.getWorldPosition(_eye);
    // B0 (0:06.5–0:10.0): dentro do tesserato dormente, uma esfera branca pousa sobre a superfície (posição mid — ilustrativa)
    { const a=env(t,T_B0SURF,T_B0OFF,0.5,0.4); if(a>0.01){ tess.project(WHITE[0].p,_o); const drop=1-smooth((t-T_B0SURF)/1.2); B0S.position.set(_o[0]+_upL.x*0.6*drop,_o[1]+_upL.y*0.6*drop,_o[2]+_upL.z*0.6*drop); } B0S.visible=a>0.01; B0S.material.opacity=a; }
    /* B7 (e B9): ILUSTRAÇÃO fixa à frente de quem está parado (as esferas brancas são ilustrativas — Q-303), fora do giro do cubo:
       uma linha = a superfície prevista · o halo desliza por ela e para · a 1ª esfera branca assenta no halo · a 2ª para ACIMA do seu halo, vazio · anel */
    { const inB9=t>=T_W9-1; const on=(t>=T_HALO-0.1&&t<T_WOFF+0.7)||(t>=T_W9-0.1&&t<T_W9OFF+0.7); ILL.visible=on;
      if(on){ const fr=camFrame(); ILL.position.copy(fr.o).addScaledVector(fr.f,2.4).addScaledVector(fr.u,-0.12); ILL.lookAt(fr.eye); }
      const hA=Math.max(env(t,T_HALO,T_WOFF,0.5,0.6),env(t,T_W9,T_W9OFF,0.4,0.6)); const slide=inB9?1:smooth((t-T_HALO)/2.4);
      ILL_SURF.material.opacity=0.8*hA; ILL_SURF.visible=hA>0.01;
      const h0=WHITE[0].h; h0.position.set(lerp(1.05,-0.45,slide),ILL_Y(lerp(1.05,-0.45,slide)),0); h0.quaternion.identity(); h0.visible=hA>0.01; h0.material.opacity=0.9*hA;
      const lA=inB9?hA:hA*smooth((t-(T_HALO+2.4))/0.5); LAB_EXP.position.set(h0.position.x,h0.position.y-0.2,0); LAB_EXP.quaternion.identity(); LAB_EXP.visible=lA>0.01; LAB_EXP.material.opacity=lA;
      const s1t=inB9?T_W9:T_W1, s1A=Math.max(env(t,T_W1,T_WOFF,0.6,0.5),env(t,T_W9,T_W9OFF,0.4,0.5)), drop=1-smooth((t-s1t)/1.0);
      WHITE[0].s.position.set(h0.position.x,h0.position.y+0.55*drop,0.01); WHITE[0].s.visible=s1A>0.01; WHITE[0].s.material.opacity=s1A;
      const s2t=inB9?T_W9:T_W2, s2A=Math.max(env(t,T_W2,T_WOFF,0.6,0.5),env(t,T_W9,T_W9OFF,0.4,0.5)), drop2=1-smooth((t-s2t)/1.0);
      const h2=WHITE[2].h; h2.position.set(0.55,ILL_Y(0.55),0); h2.quaternion.identity(); h2.visible=s2A>0.01; h2.material.opacity=0.9*s2A;
      WHITE[2].s.position.set(0.55,ILL_Y(0.55)+0.34+0.45*drop2,0.01); WHITE[2].s.visible=s2A>0.01; WHITE[2].s.material.opacity=s2A;
      WHITE[1].s.visible=false; WHITE[1].h.visible=false;
      const aR=env(t,T_RINGW,T_WOFF,0.8,0.5); ringW.position.copy(WHITE[2].s.position); ringW.quaternion.identity(); ringW.scale.setScalar(lerp(2.2,1,smooth((t-T_RINGW)/0.8))); ringW.visible=aR>0.01; ringW.material.opacity=aR; }
    // B8: um halo por posição (2:36.8 tênue · 2:43.2 cheio) · a linha que percorre a superfície de posição em posição (2:50.6–2:57.2) · anéis nas três do Exp 1 (3:03.4)
    { HALOS3.forEach((h,ci)=>{ const v=valOf('ProRoot',ci); const a=Math.max(0.45*env(t,T_VAL+ci*0.25,T_VALOFF,0.8,0.6),env(t,T_SAME+ci*0.2,T_VALOFF,0.4,0.6));
        if(v){ tess.project(v.p,_o); h.position.set(_o[0],_o[1],_o[2]); _h3[ci].copy(h.position); } h.visible=a>0.01; h.material.opacity=0.85*a; h.lookAt(eyeW); });
      const aL=env(t,T_SETTLE,T_RUN_END,0.6,0.8); tess.group.updateMatrixWorld();
      if(aL>0.01){ const w0=tess.group.localToWorld(_h3[0].clone()), w1=tess.group.localToWorld(_h3[1].clone()), w2=tess.group.localToWorld(_h3[2].clone()); beamSet(5,w0,w1,aL,PAL.teal); beamSet(6,w1,w2,aL,PAL.teal);
        const u=((t-T_SETTLE)/3.2)%2, uu=u<1?u:2-u; RUNNER.position.copy(uu<0.5?_h3[0].clone().lerp(_h3[1],uu*2):_h3[1].clone().lerp(_h3[2],(uu-0.5)*2)); RUNNER.visible=true; RUNNER.material.opacity=aL; }
      else { beamSet(5,null,null,0); beamSet(6,null,null,0); RUNNER.visible=false; }
      RINGS3.forEach((r,ci)=>{ const v=valOf('Exp1',ci); const a=v?env(t,T_RING+ci*0.25,T_VALOFF,0.8,0.6):0; if(v){ r.position.copy(v.mesh.position); r.scale.setScalar(lerp(2.2,1,smooth((t-(T_RING+ci*0.25))/0.8))); } r.visible=a>0.01; r.material.opacity=a; r.lookAt(eyeW); }); }
    // rosa de quatro pétalas: 2:04.4 → 2:10.8
    const ra=smooth((t-T_MIX)/1.2)*(1-smooth((t-T_ROSE_END)/0.8)); rose.mesh.visible=ra>0.01; rose.mesh.material.opacity=ra; if(ra>0.01){ rose.draw(t); rose.mesh.lookAt(eyeW); }
    T6m.material.opacity=t>=T_DIM?lerp(1,0.35,smooth((t-T_DIM)/0.4)):1; T6m.material.depthTest=!(tess.inside>0.05); }
  }   // fim do !ZERO (gráfico B6 + HYDRA)
  // escuro: abertura (0 → 1 s) · baixa em 3:40.4 · escuro em 3:40.8 · o loop recomeça em 3:41.0
  const dark=Math.max(t<1.0?1-t:0, t>=T_DARK?1: t>=T_DIM? clamp((t-T_DIM)/Math.max(0.05,T_DARK-T_DIM),0,1)*0.6 : 0);
  fadeEl.style.opacity=(renderer.xr.isPresenting||avOn||thxOn)?0:dark; veil.material.opacity=(renderer.xr.isPresenting&&!avOn&&!thxOn)?dark:0; veil.visible=veil.material.opacity>0.001;
  // silêncio protegido 1:45.0 → a voz volta (1:51.0 no E2; aqui, a chegada à rotunda + 0,6 s): só o HYDRA crescendo e a caminhada — nem HUD, nem legenda
  { const sil=t>=T_GROW&&t<T_VOICE&&!fly.on; if(sil!==document.body.classList.contains('silence')) document.body.classList.toggle('silence',sil); }
  audioSync(t);
  hudAcc+=dtW; if(hudAcc>0.066&&!renderer.xr.isPresenting){hudAcc=0;updateHUD();}
  marker.position.set(camera.position.x,0.6,camera.position.z); marker.rotation.z=-camera.rotation.y;
  if(REV.on&&!renderer.xr.isPresenting) revTick(t);
  /* D-520 (Quest: "um quadro preto bloqueia as instruções; só vejo o Iniciar levantando a cabeça" — e antes "o aviso não aparece, nem o
     thank you"): no headset o setScissor/setViewport do tamanho da JANELA ficava aplicado ao framebuffer do XR e só um retângulo era
     desenhado; o resto do olho ficava preto. Na cena principal o cálculo da sombra devolvia o render target do XR e desfazia o recorte
     sem querer — por isso só as telas de aviso/final (sem sombra) sofriam; e, com a sombra congelada na rotunda (D-517), a peça também
     sofreria ali. No XR: nada de viewport/scissor/clear manuais — o three.js cuida dos dois olhos. */
  if(renderer.xr.isPresenting){ renderer.setScissorTest(false); renderer.render(avOn?AVISO.scene:thxOn?THX.scene:scene,camera); return; }
  const W=viewW(),H=innerHeight; renderer.setViewport(0,0,W,H); renderer.setScissor(0,0,W,H); renderer.setScissorTest(true); renderer.clear(); if(avOn){ renderer.render(AVISO.scene,camera); renderer.setScissorTest(false); return; } if(thxOn){ renderer.render(THX.scene,camera); renderer.setScissorTest(false); return; } renderer.render(scene,camera);
  if(PLANTA.on&&!renderer.xr.isPresenting){ const r=PLANTA.rect(W,H);
    renderer.setViewport(r.x,r.y,r.w,r.h); renderer.setScissor(r.x,r.y,r.w,r.h); renderer.clearDepth();
    const fg=scene.fog; scene.fog=null; renderer.render(scene,plantaCam); scene.fog=fg; }
  if(showMap&&!renderer.xr.isPresenting){ const m=Math.min(300,Math.floor(W*0.22)); const x=W-m-14, y=44; mapCam.position.set(camera.position.x,40,camera.position.z); mapCam.lookAt(camera.position.x,0,camera.position.z);
    renderer.setViewport(x,y,m,m); renderer.setScissor(x,y,m,m); renderer.clearDepth(); const fg=scene.fog; scene.fog=null; renderer.render(scene,mapCam); scene.fog=fg; }
  renderer.setScissorTest(false);
});
window.HYDRA={aviso:AVISO,e7:{MQ,C25,E7T,ML,HYD,VALS,CAMPO,MQE,LT,B9PROT,FUNDIU},renderer,dir:DIR,CFG,B,T,CEN,PIECES,GEO,camera,fly,models:M,tess,maq,painel,rose,iso,STOPS,POSE,pose,TELAS,WHITE,CLIPS,ANCH,warp,ts,AUD,startSound,BEAMS,POOLS,MAQPOOL,HALOS3,RINGS3,ILL,atlas:()=>A,valCommon,intro:INTRO,
  L_ROT,T_WALK_ROT,SILENCIO_REAL,
  get rev(){return REV;}, get frame(){return FRAME;}, get playing(){return T.playing;}, pause(){T.playing=false;}, get registry(){return REG;}, caderno(){return briefingMD();}, simular(){return simular();}, get notas(){return REV.notes;}, get revelaPeca(){return REVELA_PECA;}, get pousa(){return {POUSA,POUSA_T,POUSA_DUR,POUSA_S};},
  /* D-323: as TELAs começam desligadas. telas() diz o estado · telas(true) liga todas · telas(true,1) liga só a 1
     (0 entrada · 1 B1-2 · 2 B3-4 · 3 B5 · 4 rotunda) · telas(false) desliga tudo. */
  /* D-324 — MIRAS: no segundo em que você está, "olhe para cá".
     mira() grava (marcar de novo a menos de 0,25 s corrige a mira) · miras() lista com o giro °/s até a próxima
     · mira(false,i) apaga uma · mira(false) apaga todas. A posição segue o trilho; isto muda só o olhar. */
  mira(v,i){ if(v===undefined) return MIRA.add();
    if(v===false){ if(i===undefined) MIRA.list=[]; else MIRA.list.splice(i,1); MIRA.salvar(); return MIRA.aviso(); }
    return MIRA.add(typeof v==='number'?v:undefined); },
  miras(){ return MIRA.aviso(); },
  percurso(){ return PERC.aviso(); },
  /* acesso direto às listas, para o console e para os testes */
  get perc(){ return PERC; }, get mira_(){ return MIRA; },
  telas(v,i){ if(v===undefined) return {todas:TELAON.todas,quais:[...TELAON.quais],nomes:['0 entrada','1 B1-2','2 B3-4','3 B5','4 rotunda']};
    if(i===undefined){ TELAON.todas=!!v; TELAON.quais=[]; } else { TELAON.todas=false; TELAON.quais=v?[...new Set([...TELAON.quais,i])]:TELAON.quais.filter(q=>q!==i); }
    return this.telas(); },
  seek(s){T.t=clamp(s,0,TOTAL-0.01);}, goto(id){const b=B.find(x=>x.id===id);if(b)T.t=b.t0+0.01;}, total:TOTAL,
  audio(){ return AUD.els.map(({p,a})=>({file:p.file.slice(0,22),start:+p.start.toFixed(2),dur:p.dur,ready:a.readyState,paused:a.paused,ct:+a.currentTime.toFixed(2),err:a.error?a.error.code:0})); },
  version:'v9.53 · roteiro v16 (D-109) · voz nova · monólito desde 0:00 (D-223) · registro com contexto, simulação de rota e material (D-317/D-318) · B0 à frente (D-319) · sequência do eluato (D-321) · TELAs desligadas (D-323) · miras (D-324) · estúdio: planta, alvos e modos de olhar, preview (D-325…D-327) · estúdio: arrastar marcas, laço A↔B, legenda clicável, ajuda, duplicar, original (D-328) · caderno leva o texto das marcas do estúdio (D-329) · mesa começa vazia, peças revelam com a peça (D-226/D-330) · sequência do eluato pousa na mesa em vez de sumir (D-331), no tampo e em repouso (D-332) · mesa limpa sempre (D-333) · ZERO: só a sequência do eluato fica, o resto sai para ser animado de novo (D-334) · sem o roteiro gravado: a câmera vai só pelas marcas "ficar aqui" (D-335) · posição inicial igual ao roteiro anterior (D-336) · Estúdio de Direção v9: lugar/olhar em trilhas separadas, planta editável, velocidade explícita (D-337) · direção também por arquivo data/direcao.json, chega ao Quest (D-338) · trilha CENA (o que mostrar) + correção do arraste na timeline (D-339) · primeira estação olha centrado (D-339) · tesserato do lab.html na abertura, 1–8 s (D-340, agora desligado) · biblioteca GBL com código e miniatura (D-341) · cartaz de abertura: emblema NUS grande + título/autores em 3-D dele, sem cartão, halo branco suave pra legibilidade, até 7,5 s, fade out, "click to start" em inglês (D-343/D-344/D-345) · emblema um pouco menor pra não roubar foco do título (D-346) · halo do cartaz redimensionado pela caixa real do emblema+título com folga, ordem de desenho corrigida (texto sobre o halo) e sem ser atravessado pela arquitetura próxima (D-347) · desvio da quina da mesa entre m4 e m5 (D-347b) · motor da direção ganhou desnível opcional (campo y), P7 sobe pela rampa em espiral de verdade até ~2,5 m, seguindo a curva, olhar fixo no plinto desde a saída da rotunda (D-348) · halo do cartaz de abertura com contraste bem mais forte, ele continuava sumindo contra a parede clara mesmo com o tamanho/render order corretos (D-350) · o halo virou QUADRO: branco constante sobre toda a caixa do emblema+título com margem, esfumando só fora dela (D-352) · olhar com modo fixo/até passar, duplo clique na trilha OLHAR mira na tela e Enter grava (D-353) · CENA c2: cápsula MTA girando a 45° em "laboratories", placas de alizarina D14·D28 em zoom de "conclusions" a "calling", halo dourado em "inert" (esquerda) e "bioactive" (direita), os três pousam na mesa entre "bioactive" e "Why" — tempos medidos no áudio (D-354) · CENA c2 refeita pela imagem dele: cápsula deitada em cima girando com "CEMENT" à vista e diminuindo quando as placas do inert&bioactive.glb chegam embaixo; sem halo; na mesa os três em linha como a 1ª fileira (D-355) · as notas da timeline são sempre o prompt final do que está montado, atualizadas por arquivo sem mexer no que ele editou (D-356) · sombra de contato sob tudo que pousa na mesa e pouso da CENA c2 terminando junto do "Why" (D-358) · CENA c3: disco, tempo, volume e célula entram um a um no centro e formam um 2×2; as curvas de liberação entram em "the biological" e dissolvem em "assay"; os quatro pousam em linha na mesa — tempos medidos no áudio (D-359) · c3: a célula entra direto no seu canto; extraction time = timer de bancada (D-360) · c3: disc size = ca3sio5-discs-5-10-15 (D-361) · c3: o 2×2 fica atrás do elemento que entra, sem se atravessarem (D-362) · a hipótese em B1-2: barras protocolo+material sobre as placas inert/bioactive, a parte do protocolo volta pelas linhas às 4 peças da mesa, a do material fica igual nas duas (D-363) · hipótese refeita: colunas de nódulos (material) e ruído cinza (protocolo) em tubos de vidro; o ruído infla a bioactive e achata a inert; sem ele as duas ficam iguais; a cápsula entra como "o material" (D-364) · B3-4, o desenho experimental: cimento de referência, quadro 4×3 dos fatores, maquete com os 25 pontos em cascata piscando as peças de cada condição, g4↔g23 em "alone", as 4 respostas à direita (D-365) · caminhada contínua por curva suave nas paradas de passagem (quina da mesa, rampa) e olho travado em 1,60 m no VR, sentado ou em pé (D-366) · OLHAR sempre preenchida com 4 tipos de bloco (para onde anda, horizonte, mesa, ponto) e transição suave entre blocos; ✂ dividir no duplo clique das 3 trilhas; ajuda reescrita (D-367) · E7 inteiro: maquete-cubo com 25 objetos metálicos (forma=tempo, tamanho=área, cor=passagem, acabamento=volume), beat do framework, B5 com os 4 modelos de ML animados e feixes iguais, maquete pousa no fim da mesa, B6 no monólito com tempos medidos, o tesserato nasce da maquete no plinto em 1:50 e faz B6-2, B7, B8 e B9 até recolher na maquete (D-368…D-374) · o tesserato VERDADEIRO do lab.html em 3-D (D-375) · HYDRA flutuando alto, mais rápido, grand finale sem recolher (D-376) · B-1: tela de avisos de conforto antes do cartaz (D-377) · nota de autoria/discrição abaixo da grade (D-378) · B3-4 sem o disco de referência isolado (D-379) · HYDRA mais baixo e mais lento, escala de cor ao lado, cores trocam em ~2 s, cápsulas saem em 2:56, olhar da rampa no HYDRA (D-380) · nota de dados no canto inferior direito do HYDRA (D-381) · a escala explica também as arestas (fatores) e os objetos (passagem) (D-382) · legenda simples (D-383) · marcadores de B7/B8 por cima das faces e discordância exagerada (D-384) · B6-2 com os discos polares do lab (D-385) · legenda como barra de tensão que transita entre as propriedades; em B9 o HYDRA percorre as quatro (D-386) · sem a parada 7 da rotunda: fica na 6 até 3:00 e sobe a rampa direto (D-387) · linhas da hipótese com fluxo, B5 com mais espaço, marcadores de B8 dentro do HYDRA (D-388) · legenda dinâmica com sonda, o HYDRA muda de cor em B7 e B9, sem a nota de dados (D-389) · cenas sem sobreposição (D-390) · ajustes dos revisores: rótulos dos discos em pílula, legenda maior, pirulito de resíduo em B8, HYDRA some atrás dos discos (D-391) · caderno 27/09: B3-4 pousa na mesa, B7 com cores rápidas e a sonda entrando no halo, cápsulas de B8 ao lado do HYDRA, esferas com textura, B9 com as respostas e o protocolo dos dois lados (D-392) · B6-2 pelo prompt v2 (palco + fileira, zonas de melhor, sobreposição, sem seta); o cubo só vira HYDRA quando os discos voltam aos cantos dele (D-393) · arestas do cubo por eixo, tingidas pelo fator (D-394) · B8: cápsulas maiores, esferas lado a lado, linha de referência fica e linha laranja do Exp 1; B9: legenda e linhas voltam, ênfases, protocolo à esquerda, sem placas de Petri (D-395) · placa no plinto (D-396) · monólito sem glb (D-397) · P6 mais perto e P7 mais cedo, HYDRA a 4,2 m (D-398) · grand finale engole quem olha (D-399) · tela final "Thank you for watching", +6 s (D-501) · pontos de validação sempre dentro do HYDRA, tampa do Exp 1 verde e só dois cimentos em "two cements", tela final com presenter e emblema claro (D-502…D-504) · linha dissonante laranja (D-505) · instrução de higiene no card de avisos (D-506) · final leve: faces e barras de dentro somem no engolir, 25 objetos saem (D-507) · aviso e Thank you ancorados na cabeça real no Quest (D-508) · fim da peça volta à tela de avisos (D-509) · legenda depois da placa, 2,5 s por cor, até "To validate"; caminhadas mais lentas (D-514) · olhar fixo no monólito de 1:12 a 1:47, curva suave P4→P5, maquete pára à vista, só anda quando o monólito se desfaz (D-515) · a hipótese pousa na mesa atrás da fileira do relógio (D-516) · (sombra congelada da D-517 desfeita na D-522) · telas de aviso e final acompanham a cabeça (D-519) · no headset sem recorte de janela (tela preta no aviso/final) (D-520) · aviso mais para trás (2,7 m) e centrado no olho; Presenter: Clarice F. Sabino (D-521) · sombra de novo a cada quadro; objetos flutuantes sem sombra projetada (D-522) · discos polares mostram a troca de estado enquanto parados; na sobreposição a passagem celular P1→P7 move a zona de migração (D-525) · objetos apresentados 0,25 m mais baixos; no headset a altura é medida a cada Start e o referencial usa a altura medida (D-526) · c3, hipótese e B3-4 de volta às posições de antes; c3 um pouco mais longe e mais alta, pousa descendo (D-530) · safe/tóxico com a placa-petri-celulas-destaque (D-531) · placas de B3-4 viradas para o espectador, 3 + 2 (D-532) · soleira sem salto de luz da A integrada (D-231 → D-529) · paradas do módulo · trilha M · 2026-09-26'};

/* =========================  14. MODO REVISÃO (?revisao)  ================= */
/* Caixa lateral para o Vinicius dirigir a peça enquanto assiste: a FALA de agora (com a palavra estimada), o que a câmera faz,
   o que está na tela e o que acontece, e um campo para escrever a instrução daquele momento ("quando falar X, faça Y").
   As notas ficam no navegador (sobrevivem a recarregar) e saem por Copiar / Baixar. "Baixar folha" gera a folha completa:
   cada fala × o que acontece hoje × espaço para a mudança.
   A lista de eventos é montada do próprio código (paradas, TELAs, keyframes, poças) + REV_EFX (efeitos da §13, escritos à mão:
   quem mudar a §13 atualiza aqui). Nada disto aparece sem ?revisao. */
const REV_FALAS=[   // [tempo E2, texto] — E2 v16, tabelas FRASES de cada bloco (idênticas ao E6 §5.4)
 ['0:00.6','This is HYDRA—'],['0:02.1','a map that transforms testing protocols into a tesseract'],['0:06.5','that decodes the true material\'s biological performance.'],
 ['0:10.8','When testing cements, researchers apply eluates to cells and report the response as an intrinsic property of the material.'],['0:20.2','But laboratories testing the same cement can reach opposite conclusions:'],['0:25.1','one calling it inert, the other bioactive.'],['0:28.6','Why?'],
 ['0:29.1','Because disc size, extraction time, volume, and cell passage dictate the result'],['0:35.0','and the biological response reflects not only the material but also the assay conditions.'],['0:41.9','Therefore, we developed a framework to map how testing conditions shift cellular responses.'],['0:48.3','Our hypothesis was that separating protocol noise would reveal the material\'s true biological behavior—regardless of the test used.'],
 ['0:58.5','To this end, we controlled cell age, disc surface area, medium volume, and elution time,'],['1:05.9','generating 25 combinations'],['1:07.4','to investigate how these factors, alone or in combination, affect'],['1:12.3','proliferation, mineralization, migration, and safety.'],
 ['1:15.6','HYDRA then uses an ensemble machine-learning architecture combining'],['1:19.6','Gaussian Process Regression, Gradient Boosting, Random Forest, and XGBoost'],['1:24.0','to integrate these parameters into a four-dimensional response surface.'],
 ['1:29.2','The results show that cement biological properties depend on the testing protocol.'],['1:35.1','A protocol shift that enhances mineralization can decrease migration while leaving proliferation unchanged.'],['1:41.5','Each biological property follows its own trajectory.'],
 ['1:51.0','HYDRA reveals that each biological dimension is governed by distinct parameters:'],['1:56.4','proliferation and migration by cell maturity,'],['1:59.4','mineralization by disc surface area,'],['2:01.9','and viability by elution time.'],['2:04.4','Because these drivers are decoupled, no protocol can simultaneously optimize all biological readouts.'],
 ['2:11.8','HYDRA adjusts for protocol variation by estimating the cellular response expected from each combination of experimental conditions using a reference cement.'],['2:22.2','If the observed response matches HYDRA\'s prediction, it derives from the testing protocol rather than a material-specific effect.'],['2:31.1','A response beyond this prediction indicates the material\'s own bioactivity.'],
 ['2:36.8','To validate HYDRA, two cements unseen during training were tested under three protocols.'],['2:43.2','Because HYDRA does not care about chemistry, it generates the protocol-based prediction for both cements.'],['2:50.6','In cell growth, for example, both materials followed the predicted surface as the protocols changed.'],['2:58.0','However, one cement produced fewer cells than predicted under every protocol.'],['3:03.4','HYDRA therefore revealed which variations arise from the protocol and which reflect the material\'s biological behavior.'],
 ['3:12.4','HYDRA provides a reference surface that contextualizes biological data across testing protocols.'],['3:18.3','For biomaterial research, HYDRA provides a quantitative benchmark to determine whether a biological response reflects the material itself or the testing protocol—'],['3:29.2','regardless of how the researcher chooses to run the test.'],['3:34.1','This provides a foundation for evaluating the actual biological properties of regenerative materials.']
];
/* efeitos da §13 (não saem de keyframe): [início E2, fim E2, texto] */
const REV_EFX=[
 ['0:02.1','0:03.0','a maquete sobre a mesa pulsa uma vez'],['0:04.6','0:05.6','o HYDRA dormente (plinto) pulsa; as arestas acendem'],['0:06.5','0:10.0','dentro do HYDRA dormente: a superfície ondula e uma esfera branca pousa sobre ela'],
 ['0:11.4','0:16.4','o meio do tubo muda de cor'],['0:12.0','0:16.0','linha de luz: tubo → célula'],['0:28.6','0:29.4','as duas placas pulsam uma vez'],
 ['0:35.0','0:41.9','quatro linhas de luz: peças d · f · e + célula P4 → célula da estação, que pulsa'],['0:44.5','0:48.3','quatro linhas de luz: peças d · f · e + célula → maquete'],['0:48.3','0:49.2','a maquete pulsa'],
 ['1:05.9','1:07.4','maquete: 25 pontos acendem em cascata'],['1:07.4','1:08.2','maquete: os 25 pontos pulsam'],
 ['1:15.6','1:29.2','maquete: brilha mais, pontos nítidos'],['1:18.0','1:22.3','quatro glifos (GPR · GBR · RF · XGB) orbitam a maquete e se fundem, um em cada nome'],['1:19.6','1:26.2','ponto de luz no centro da maquete'],
 ['1:24.0','1:25.6','quatro linhas de luz: peças d · f · e + célula P4 → maquete'],['1:25.6','1:28.1','leave-one-out: cada um dos 25 pontos fica cinza e volta'],['1:28.4','1:45.0','maquete: a superfície entre os pontos acende e fica'],
 ['0:00.0','1:45.0','o MONÓLITO está inteiro no eixo desde o início (pedra, campo apagado); tapa a vista direta da rotunda (D-223)'],['1:28.9','1:29.5','o CAMPO do monólito acende (campoPainel)'],['1:45.0','1:46.5','SILÊNCIO de B6-2: o MONÓLITO se dissolve (0 → 1)'],
 ['1:29.2','1:44.6','PAINEL-GRÁFICO aceso: título "two of the 25 conditions"'],['1:30.8','1:44.6','painel: "24 h · 15 mL · P4 — identical"'],['1:32.6','1:44.6','painel: "only the disc differs: 169 → 219 mm²"; os dois discos pulsam (219 maior)'],
 ['1:36.1','1:44.6','painel: barra mineralization 169 → 219 ▲ (12.5 → 16.7)'],['1:37.5','1:44.6','painel: barra migration ▼ (1.78 → 1.50)'],['1:39.5','1:44.6','painel: barra proliferation = (3.75 → 3.88)'],
 ['1:41.5','1:43.1','painel: as três barras realçam uma a uma'],['1:43.0','1:44.6','painel: rodapé "mineralization ↔ proliferation: not correlated (n.s.)"'],
 ['1:45.0','1:51.0','SILÊNCIO: a maquete some da mesa; o HYDRA cresce no plinto e envolve quem chega; sem TELA nem HUD (a caminhada estica este silêncio)'],['1:48.5','3:34.1','arestas coloridas por fator e rótulos SA · ET · EV · CP'],
 ['1:51.0','1:52.0','o HYDRA pulsa uma vez ("HYDRA reveals")'],
 ['1:56.4','1:59.4','recolore: PROLIFERATION + HEALING; arestas de CP pulsam'],['1:59.4','2:01.9','recolore: MINERALIZATION; arestas de SA pulsam'],['2:01.9','2:04.4','recolore: SAFETY (sem pulso de aresta)'],
 ['2:04.4','2:11.8','as colorações se sobrepõem num corpo só'],['2:04.4','2:10.8','rosa de quatro pétalas à direita'],
 ['2:11.8','2:13.0','as 25 esferas pulsam e o campo de cor brilha'],['2:11.8','2:35.8','ilustração à frente: linha da superfície; um halo desliza e para; rótulo "expected"'],
 ['2:22.2','2:35.8','1ª esfera branca desce e assenta no halo'],['2:31.1','2:35.8','2ª esfera branca para ACIMA do seu halo vazio'],['2:33.0','2:35.8','anel laranja fecha em volta da 2ª esfera'],
 ['2:36.8','2:38.8','o HYDRA avança 1 m: o espectador fica na pele do cubo (as três posições cabem no quadro)'],
 ['2:36.8','3:12.4','três posições de protocolo (early · mid · late) × três esferas (referência · Exp 1 · Exp 2); o cubo gira para deitar a diagonal à frente; as 25 recuam'],
 ['2:43.2','2:50.6','em cada posição as três esferas pulsam juntas na mesma cor (teal); um halo por posição'],
 ['2:50.6','2:57.2','face PROLIFERATION: referência e Exp 2 assentam (Exp 2 um pouco abaixo em late · dilute); uma linha de luz percorre as três posições'],
 ['2:58.0','3:12.4','as três esferas do Exp 1 descem, cada vez mais fundo (−2,1 · −2,9 · −4,4 σ), e pulsam'],['3:03.4','3:12.4','anéis laranja em volta das três esferas do Exp 1'],
 ['3:11.0','3:12.4','a câmera recua um passo'],
 ['3:12.4','3:13.6','as esferas de B8 somem; o campo de cor brilha uma vez'],['3:18.3','3:23.3','duas esferas brancas: uma sobre a superfície, outra acima'],
 ['3:29.2','3:32.4','as quatro famílias de arestas pulsam, SA · ET · EV · CP, 0,8 s cada'],['3:34.1','3:40.6','o HYDRA recua para o repouso, sobre o plinto'],['3:40.4','3:40.8','TELA e HYDRA baixam a intensidade'],['3:40.8','3:41.0','escuro → recomeça']
];
const REV={on:CFG.revisao, notes:[], key:'hydra.revisao.v16.notas', ev:[], segs:[], lastSeg:-1, lastKey:''};
function unwarp(r){ for(let i=0;i<ANCH.length-1;i++){ const a=ANCH[i], b=ANCH[i+1]; if(r<=b[1]) return b[1]>a[1]? a[0]+(r-a[1])*(b[0]-a[0])/(b[1]-a[1]) : b[0]; } const a=ANCH[ANCH.length-1]; return a[0]+(r-a[1]); }
const fmtE=s=>{ s=Math.max(0,s); return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'); };
function revBuild(){
  /* falas → tempo real; fim = início da seguinte ou fim do clipe */
  REV.segs=REV_FALAS.map(([e,txt])=>{ const eE=tsE2(e); const c=CLIPS.find(c=>eE>=c.e[0]-1e-6&&eE<=c.e[1]+1e-6)||CLIPS[CLIPS.length-1];
    return {e, eE, txt, r0:warp(eE), clip:c, semAudio:false}; });
  REV.segs.forEach((s,i)=>{ const n=REV.segs[i+1]; s.r1=(n&&n.clip===s.clip)? n.r0 : s.clip.r[1]; s.block=blockAt(s.r0+0.01); });
  const ev=[];
  /* câmera */
  if(!SEM_ROTEIRO) STOPS.forEach((S,i)=>{ ev.push({t0:S.a,t1:S.b,cat:'câmera',txt:'parada · '+S.id});
    if(S.turns) S.turns.forEach(([tt,p])=>ev.push({t0:tt,t1:S.b,cat:'câmera',txt:'gira para '+(p===LOOK_MAQ?'a maquete':p===LOOK_PLACAS?'as placas g · h':p===LOOK_FAM?'as famílias d · e · f':'('+p.map(v=>v.toFixed(1)).join(', ')+')')}));
    if(S.legLook) ev.push({t0:S.legLook[0],t1:S.a,cat:'câmera',txt:'andando, vira para a maquete'});
    if(S.leg){ const N=STOPS[i+1]; ev.push({t0:S.b,t1:N.a,cat:'câmera',txt:'anda '+S.leg.L.toFixed(1)+' m até '+N.id+' (pico '+S.leg.peak.toFixed(2)+' m/s)'}); } });
  /* TELAs: cada linha, do momento em que entra até a folha limpar/apagar */
  const TN=['TELA de entrada','TELA que acompanha (B1-2)','TELA que acompanha (B3-4)','TELA que acompanha (B5)','TELA da rotunda'];
  if(!ZERO) TELAS.forEach((T_,k)=>{ const E=T_.entries; E.forEach((e,j)=>{ if(e.clear||e.hide) return; const end=E.slice(j+1).find(q=>q.clear||q.hide||(q.rep&&!e.rep)); ev.push({t0:e.t,t1:end?end.t:TOTAL,cat:'tela',txt:TN[k]+': "'+e.txt+'"'}); }); });
  /* objetos (keyframes): intervalos fora de casa */
  const NAMES=new Map([[tube1,'tubo com o disco'],[disc1,'disco de cimento'],[cellOld,'célula DPSC'],[ions,'partículas subindo do disco'],[dishA,'placa densa'],[dishB,'placa quase vazia'],[CARD1,'cartão "= the material"'],[CARD2,'cartão "protocol | material"'],
    [M.cells,'células'],[M.discsSA,'discos de área'],[M.falcon,'tubos'],[M.clocks,'relógios'],[M.ars,'placas de alizarina'],[M.heal,'placas de cicatrização'],[M.caps,'cápsulas']]);
  const SUB={cells:['P1','P4','P7'],discsSA:['113 mm²','169 mm²','219 mm²'],falcon:['rack','5 mL','10 mL','15 mL'],clocks:['24 h','72 h','120 h'],ars:['D14','D28'],heal:['0 h','24 h','48 h','72 h']};
  const keyOf=new Map(Object.entries(M).map(([k,o])=>[o,k]));
  KF.forEach(({obj,frames})=>{ const nm=NAMES.get(obj); if(!nm) return; let s0=null;
    frames.forEach((f,i)=>{ const prevHome=i===0||frames[i-1].home, nextHome=i===frames.length-1||frames[i+1].home;
      if(!f.home&&prevHome) s0=f; if(!f.home&&nextHome&&s0){ const k=keyOf.get(obj), only=s0.only||f.only; const sub=only&&SUB[k]? ' '+only.map(j=>SUB[k][j]).join(' · ') : '';
        ev.push({t0:s0.t,t1:f.t,cat:'objeto',txt:nm+sub+(s0.rel?' — no referencial da câmera (acompanha a visão)':' — fixo no lugar')}); s0=null; } }); });
  /* poças de luz nas peças da mesa */
  const PN=['a · pós','b · radiopacificador','c · cápsulas','d · discos de área','e · tubos','f · relógios','g · placas de proliferação','h · placas de viabilidade'];
  if(!ZERO) POOLS.forEach((P,i)=>P.cues.forEach(([a,b])=>ev.push({t0:a,t1:b,cat:'luz',txt:'acende a peça '+PN[i]})));
  if(!ZERO) MAQPOOL.cues.forEach(([a,b])=>ev.push({t0:a,t1:b,cat:'luz',txt:'acende a maquete'}));
  REV_EFX.forEach(([a,b,txt])=>ev.push({t0:ts(a),t1:ts(b),cat:'efeito',txt}));
  REV.ev=ev.sort((x,y)=>x.t0-y.t0);
}
function revSegAt(t){ let k=-1; for(let i=0;i<REV.segs.length;i++){ if(t>=REV.segs[i].r0-0.05) k=i; else break; } return k; }
function revWord(s,t){ const w=s.txt.split(/\s+/); if(t<s.r0) return -1; const dur=Math.max(0.3,(s.r1-s.r0)*0.94), tot=s.txt.length; let acc=0; const u=(t-s.r0)/dur*tot;
  for(let i=0;i<w.length;i++){ acc+=w[i].length+1; if(u<acc) return i; } return w.length-1; }
/* D-328: o inverso de revWord — a que instante pertence a palavra i (mesma régua de caracteres) — para a legenda clicável do estúdio */
function wordTime(s,i){ const w=s.txt.split(/\s+/); const dur=Math.max(0.3,(s.r1-s.r0)*0.94), tot=s.txt.length; let acc=0;
  for(let k=0;k<Math.min(i,w.length);k++) acc+=w[k].length+1;
  return s.r0+clamp(acc/Math.max(1,tot),0,1)*dur; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function revCtx(t){ const on=REV.ev.filter(e=>t>=e.t0&&t<e.t1); return {cam:on.filter(e=>e.cat==='câmera').map(e=>e.txt), tela:TELAS.map(x=>x.text(t)).filter(Boolean), acontece:on.filter(e=>e.cat!=='câmera'&&e.cat!=='tela').map(e=>e.txt)}; }
function revSave(){ try{ localStorage.setItem(REV.key,JSON.stringify(REV.notes)); }catch(e){} }
function revMark(){ const t=T.t; T.playing=false; $('bPlay').textContent='▶'; const k=revSegAt(t), s=REV.segs[k], wi=s?revWord(s,t):-1, ctx=revCtx(t);
  const _p=new THREE.Vector3(); scene.updateMatrixWorld(true); camera.getWorldPosition(_p);
  REV.notes.push({id:Date.now(), t:+t.toFixed(2), tE2:+unwarp(t).toFixed(2), bloco:blockAt(t).id, fala:s?s.txt:'', palavra:s&&wi>=0?s.txt.split(/\s+/)[wi]:'', camera:ctx.cam.join(' · '),
    telas:ctx.tela, acontece:ctx.acontece, pos:[+_p.x.toFixed(3),+_p.y.toFixed(3),+_p.z.toFixed(3)], yaw:+(((camera.rotation.y/DEG)%360+360)%360).toFixed(2), pitch:+(camera.rotation.x/DEG).toFixed(2), nota:''});
  revSave(); revRenderNotes(true); }
function revRenderNotes(focusLast){ const box=$('revNotes'); box.innerHTML=''; $('revN').textContent=REV.notes.length;
  if(!REV.notes.length){ box.innerHTML='<div class="rv-empty">Pause no momento e aperte <b>Marcar</b> (tecla <b>N</b> ou <b>R</b>; a vista da câmera vai junto). Escreva o que quer: "quando falar X, a câmera… e mostra… desse jeito".</div>'; return; }
  REV.notes.slice().sort((a,b)=>a.t-b.t).forEach(n=>{ const d=document.createElement('div'); d.className='rv-note';
    d.innerHTML='<div class="rv-nh"><button class="rv-go">'+fmtE(n.t)+'</button><span>'+esc(n.bloco)+' · E2 '+fmtE(n.tE2)+(n.palavra?' · "<b>'+esc(n.palavra)+'</b>"':'')+'</span><button class="ghost rv-del">✕</button></div><textarea rows="3" placeholder="quando falar…, a câmera…, mostrar…, desse jeito…"></textarea>';
    const ta=d.querySelector('textarea'); ta.value=n.nota; ta.oninput=()=>{ n.nota=ta.value; revSave(); };
    d.querySelector('.rv-go').onclick=()=>{ T.t=n.t; }; d.querySelector('.rv-del').onclick=()=>{ REV.notes=REV.notes.filter(x=>x!==n); revSave(); revRenderNotes(); };
    box.appendChild(d); if(focusLast&&n===REV.notes[REV.notes.length-1]) setTimeout(()=>{ ta.focus(); d.scrollIntoView({block:'nearest'}); },30); }); }
function revNotesMD(){ const L=['# HYDRA v16 — notas de revisão','','Gerado em '+new Date().toLocaleString('pt-BR')+' · '+window.HYDRA.version,''];
  REV.notes.slice().sort((a,b)=>a.t-b.t).forEach(n=>{ L.push('## '+n.bloco+' · '+fmtE(n.t)+' (E2 '+fmtE(n.tE2)+')'+(n.palavra?' — "'+n.palavra+'"':''),'','- **Fala:** '+(n.fala||'—'),'- **Câmera naquele momento:** '+(n.camera||'—'),'- **Instrução:** '+(n.nota||'_(vazia)_'),''); });
  return L.join('\n'); }
function revFolhaMD(){ const L=['# HYDRA v16 — folha de cues (o que acontece hoje em cada fala)','','Tempo real = na voz gravada · E2 = roteiro v16. Escreva a mudança em **Mudança:**. Gerada do próprio app.js ('+window.HYDRA.version+').',''];
  let lastB='';
  REV.segs.forEach((s,i)=>{ if(s.block.id!==lastB){ L.push('## '+s.block.id+' — '+s.block.name,''); lastB=s.block.id; }
    const inSeg=REV.ev.filter(e=>e.t0<s.r1-0.05&&e.t1>s.r0+0.05);
    L.push('### '+fmtE(s.r0)+' (E2 '+s.e+')'+'','> '+s.txt,'');
    ['câmera','tela','objeto','luz','efeito'].forEach(cat=>{ let xs=inSeg.filter(e=>e.cat===cat); if(!xs.length) return; let tail='';
      if(cat==='tela'){ const novas=xs.filter(e=>e.t0>=s.r0-0.05), cont=xs.length-novas.length; if(cont) tail=(novas.length?'; ':'')+'_continuam no ar: '+cont+' linha'+(cont>1?'s':'')+'_'; xs=novas; }
      L.push('- **'+cat+':** '+xs.map(e=>e.txt+(e.t0>=s.r0-0.05?' _(entra '+fmtE(e.t0)+')_':'')).join('; ')+tail); });
    L.push('- **Mudança:** ',''); });
  return L.join('\n'); }
function revDownload(name,text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})); a.download=name; a.click(); }
function revTick(t){ const k=revSegAt(t), s=REV.segs[k], wi=s?revWord(s,t):-1, key=k+'|'+wi+'|'+Math.floor(t*4);
  if(key===REV.lastKey) return; REV.lastKey=key;
  $('revClock').textContent=fmtE(t)+'  ·  E2 '+fmtE(unwarp(t))+'  ·  '+blockAt(t).id;
  const fala=(j,cls)=>{ const x=REV.segs[j]; if(!x) return ''; const ws=x.txt.split(/\s+/).map((w,i)=>'<span class="'+(j===k&&i===wi?'rv-w':'')+'">'+esc(w)+'</span>').join(' ');
    return '<div class="'+cls+'" data-i="'+j+'"><small>'+fmtE(x.r0)+(x.semAudio?' · sem áudio':'')+'</small> '+ws+'</div>'; };
  $('revFala').innerHTML=fala(k-1,'rv-f rv-dim')+fala(k,'rv-f')+fala(k+1,'rv-f rv-dim');
  $('revFala').querySelectorAll('.rv-f').forEach(el=>el.onclick=()=>{ T.t=REV.segs[+el.dataset.i].r0; });
  const c=revCtx(t), li=a=>a.length?a.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li class="rv-dim">—</li>';
  $('revCam').innerHTML=li(c.cam); $('revTela').innerHTML=li(c.tela); $('revAcont').innerHTML=li(c.acontece);
  const nx=REV.ev.find(e=>e.t0>t+0.05&&e.cat!=='tela'); $('revNext').innerHTML=nx?'<b>'+fmtE(nx.t0)+'</b> '+esc(nx.cat)+': '+esc(nx.txt):'—'; }
if(CFG.trecho){ document.body.classList.add('hidehud','trecho'); if(showMap) $('bMap').click(); }   // o estudo de trecho abre limpo (sem HUD e sem planta); H traz o HUD de volta
if(REV.on){
  document.body.classList.add('revisao'); revBuild();
  try{ REV.notes=JSON.parse(localStorage.getItem(REV.key)||'[]'); }catch(e){ REV.notes=[]; }
  if(showMap){ $('bMap').click(); }
  const P=$('rev'); P.style.display='flex'; revRenderNotes();
  $('revMark').onclick=revMark;
  $('revPrev').onclick=()=>{ const k=revSegAt(T.t); const s=REV.segs[Math.max(0,(T.t-REV.segs[Math.max(k,0)].r0>1.0)?k:k-1)]; if(s) T.t=s.r0; };
  $('revNextF').onclick=()=>{ const k=revSegAt(T.t); const s=REV.segs[Math.min(REV.segs.length-1,k+1)]; if(s) T.t=s.r0; };
  $('revCopy').onclick=()=>{ (navigator.clipboard?.writeText(briefingMD())||Promise.reject()).then(()=>{ $('revCopy').textContent='copiado ✓'; setTimeout(()=>$('revCopy').textContent='Copiar caderno',1200); },()=>revDownload('hydra_caderno.md',briefingMD())); };
  $('revDl').onclick=()=>revDownload('hydra_caderno.md',briefingMD());
  $('revFolha').onclick=()=>revDownload('hydra_folha_cues_v16.md',revFolhaMD());
  addEventListener('keydown',e=>{ if(/input|textarea/i.test(e.target.tagName)||fly.on) return; const k=e.key.toLowerCase();
    if(k==='n'){ revMark(); e.preventDefault(); } else if(k==='arrowleft'){ $('revPrev').click(); e.preventDefault(); } else if(k==='arrowright'){ $('revNextF').click(); e.preventDefault(); } });
  addEventListener('resize',()=>{ REV.lastKey=''; });
}

/* =========================  15. ESTÚDIO DE DIREÇÃO (D-325)  ==============
   Uma tela só para dirigir: onde estou · o que vem · um botão para marcar.
   Três verbos, e só três: OLHAR ASSIM (direção do olhar) · FICAR AQUI (lugar no tempo) · SÓ ANOTAR (recado).
   Os números (metros, m/s) não aparecem: vão para o caderno. Na cena, anéis de sugestão dizem
   "mais ou menos aqui, neste segundo", nos momentos em que a narração pede um lugar. */
/* D-337: o estúdio antigo (D-325…D-328) só com ?estudio8 — o de agora é o estudio9.js, logo abaixo */
if(CFG.estudio&&QS.has('estudio8')){
  document.body.classList.add('estudio'); if(showMap) $('bMap').click();
  if(!REV.ev.length) revBuild();
  const $e=id=>document.getElementById(id);
  const fmtS=s=>{ s=Math.max(0,s); return Math.floor(s/60)+':'+(s%60).toFixed(1).padStart(4,'0'); };
  /* os momentos em que a peça PEDE um lugar: início de bloco e entrada de cada fala */
  const CHAVES=(()=>{ const set=new Map();
    B.forEach(b=>set.set(+b.t0.toFixed(2),{t:b.t0,rot:b.id+' · '+b.name,tipo:'bloco'}));
    REV.segs.forEach(sg=>{ const k=+sg.r0.toFixed(2); if(!set.has(k)) set.set(k,{t:sg.r0,rot:sg.txt.slice(0,44),tipo:'fala'}); });
    return [...set.values()].sort((a,b)=>a.t-b.t); })();
  /* a sugestão de LUGAR em cada momento-chave é a posição que o roteiro usa hoje naquele segundo */
  const _p={pos:new THREE.Vector3(),look:new THREE.Vector3(),u:0,block:B[0],blink:0,side:0,moving:false,speed:0};
  const SUG=CHAVES.map(c=>{ pose(c.t,_p); return {t:c.t, x:_p.pos.x, z:_p.pos.z, rot:c.rot, tipo:c.tipo}; });
  /* anéis no chão: só os seis mais próximos do instante, senão a nave vira um campo de anéis */
  const anel=(()=>{ const g=new THREE.Group(); scene.add(g);
    const feitos=SUG.map(sg=>{ const o=new THREE.Group();
      const r=new THREE.Mesh(new THREE.RingGeometry(0.30,0.40,40),new THREE.MeshBasicMaterial({color:PAL.teal,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
      r.rotation.x=-Math.PI/2; r.position.y=0.02; o.add(r);
      const lab=new THREE.Mesh(new THREE.PlaneGeometry(.40,.10),new THREE.MeshBasicMaterial({map:textTex(fmt(sg.t),'#0d2a4a',52,640,160),transparent:true,depthWrite:false,toneMapped:false}));
      lab.position.set(0,0.30,0); o.add(lab); o.position.set(sg.x,0,sg.z); o.visible=false; g.add(o); return {o,lab,sg}; });
    return {g,feitos,
      tick(t,camPos){ if(SEM_ROTEIRO){ g.visible=false; return; }   /* D-335: as sugestões eram o caminho gravado */
        const mostrar=fly.on||!T.playing;   /* ao assistir a peça correndo, a cena fica limpa */
        if(!mostrar){ if(g.visible){ g.visible=false; } return; } g.visible=true;
        const perto=SUG.map((sg,i)=>[Math.abs(sg.t-t),i]).sort((a,b)=>a[0]-b[0]).slice(0,6).map(a=>a[1]);
        feitos.forEach((f,i)=>{ const on=perto.includes(i); f.o.visible=on; if(!on) return;
          const d=Math.abs(f.sg.t-t), a=clamp(1-d/26,0.18,1); f.o.children[0].material.opacity=0.16+0.38*a;
          f.lab.material.opacity=0.20+0.5*a; f.lab.lookAt(camPos); }); } }; })();
  const proxSug=t=>SUG.filter(s=>s.t>t+0.15)[0]||null;
  /* D-328: momentos-chave para o Alt+seta "pular para o próximo/anterior" — os mesmos da CHAVES, achatados em uma lista de tempos */
  const CHAVES_T=CHAVES.map(c=>c.t);
  function proxChave(t,dir){ const L=CHAVES_T; if(!L.length) return t;
    if(dir>0){ const n=L.find(x=>x>t+0.05); return n===undefined?L[L.length-1]:n; }
    const r=[...L].reverse().find(x=>x<t-0.05); return r===undefined?L[0]:r; }
  /* D-328: trecho A↔B marcado arrastando na timeline, para repetir enquanto ajusta uma marca difícil */
  const AB={a:null,b:null,on:false};
  function desenhaAB(){ const el=$e('tlAB'), has=AB.a!==null;
    el.classList.toggle('on',has);
    if(has){ el.style.left=(AB.a/TOTAL*100)+'%'; el.style.width=((AB.b-AB.a)/TOTAL*100)+'%'; }
    $e('ebLoop').disabled=!has;
    $e('ebLoop').title=has?('repete '+fmtS(AB.a)+' → '+fmtS(AB.b)):'arraste na timeline para marcar um trecho';
    $e('ebLoopX').style.display=has?'':'none'; }
  /* ---- estado do topo ---- */
  let lastTopo='';
  const elVoz=$e('etVoz');
  /* D-328: legenda com PALAVRA clicável — reaproveita o motor de tempo-por-palavra do modo revisão (revWord/wordTime) */
  function vozRender(sg,k,t){ if(!sg){ elVoz.innerHTML=''; elVoz.dataset.seg=''; return; }
    elVoz.dataset.seg=k; const wi=revWord(sg,t), ws=sg.txt.split(/\s+/);
    elVoz.innerHTML='“'+ws.map((w,i)=>'<span data-i="'+i+'" class="'+(i===wi?'on':'')+'">'+esc(w)+'</span>').join(' ')+'”'; }
  elVoz.addEventListener('click',ev=>{ const sp=ev.target.closest('span[data-i]'); if(!sp) return;
    const k=+elVoz.dataset.seg, sg=REV.segs[k]; if(!sg) return; T.t=wordTime(sg,+sp.dataset.i); T.playing=false; });
  function topo(t){ const b=blockAt(t), k=revSegAt(t), sg=REV.segs[k], nx=proxSug(t);
    const key=Math.floor(t*4)+'|'+b.id+'|'+k; if(key===lastTopo) return; lastTopo=key;
    $e('etRel').textContent=fmtS(t); $e('etTot').textContent='/ '+fmt(TOTAL);
    $e('etBloco').textContent=b.id; $e('etNome').textContent=b.name;
    $e('etProx').textContent=nx? ('próximo momento: '+fmt(nx.t)+'  ·  '+nx.rot) : 'último trecho';
    vozRender(sg,k,t);
    $e('ebPlay').textContent=T.playing?'❚❚':'▶'; }
  /* ---- linha do tempo ---- */
  function tlBlocos(){ const h=$e('tlBlocos'); h.innerHTML='';
    B.forEach(b=>{ const d=document.createElement('div'); d.style.left=(b.t0/TOTAL*100)+'%'; d.style.width=((b.t1-b.t0)/TOTAL*100)+'%'; d.textContent=b.id; h.appendChild(d); });
    const p=$e('tlParadas'); p.innerHTML=''; SUG.filter(s=>s.tipo==='bloco').forEach(s=>{ const i=document.createElement('i'); i.style.left=(s.t/TOTAL*100)+'%'; p.appendChild(i); }); }
  /* D-328: arrastar uma marca move o instante dela; um clique simples (sem arrastar) só pula para lá, como antes */
  function tlMarcas(){ const h=$e('tlMarcas'); h.innerHTML='';
    itens().forEach(it=>{ const b=document.createElement('b'); b.className=it.verbo; b.style.left=(it.t/TOTAL*100)+'%';
      b.title=fmtS(it.t)+(it.rot?' · '+it.rot:'');
      let drag=null;
      b.addEventListener('pointerdown',ev=>{ ev.stopPropagation(); ev.preventDefault(); T.playing=false;
        drag={x0:ev.clientX,r:$e('estTl').getBoundingClientRect(),moved:false}; b.setPointerCapture(ev.pointerId); });
      b.addEventListener('pointermove',ev=>{ if(!drag) return;
        if(Math.abs(ev.clientX-drag.x0)>3){ drag.moved=true; b.classList.add('arrastando');
          const t=clamp((ev.clientX-drag.r.left)/drag.r.width*TOTAL,0,TOTAL-0.01);
          b.style.left=(t/TOTAL*100)+'%'; b.title=fmtS(t); T.t=t; } });
      b.addEventListener('pointerup',ev=>{ if(!drag) return; b.classList.remove('arrastando');
        if(!drag.moved){ T.t=it.t; drag=null; return; }
        const t=clamp((ev.clientX-drag.r.left)/drag.r.width*TOTAL,0,TOTAL-0.01);
        const L=it.fonte==='perc'?PERC.list:it.fonte==='mira'?MIRA.list:NOTAS.list;
        const obj=L[it.idx]; obj.t=+t.toFixed(2); obj.bloco=blockAt(t).id; L.sort((a,c)=>a.t-c.t);
        (it.fonte==='perc'?PERC:it.fonte==='mira'?MIRA:NOTAS).salvar();
        if(it.fonte==='perc'||it.fonte==='mira') MIRA.reindex();
        drag=null; lista(); });
      h.appendChild(b); }); }
  /* ---- a lista: miras + percurso + notas, em ordem de tempo ---- */
  /* D-329: NOTAS agora é módulo (perto de PERC/MIRA) — aqui só recarrega, caso o localStorage tenha mudado desde o load */
  NOTAS.carregar();
  function itens(){ const L=[];
    PERC.list.forEach((m,i)=>L.push({verbo:'parar',rotulo:'FICAR AQUI',t:m.t,rot:m.rot||'',idx:i,fonte:'perc',foto:m.foto}));
    MIRA.list.forEach((m,i)=>L.push({verbo:'olhar',rotulo:'OLHAR ASSIM',t:m.t,rot:m.rot||'',idx:i,fonte:'mira',foto:m.foto}));
    NOTAS.list.forEach((m,i)=>L.push({verbo:'nota',rotulo:'ANOTADO',t:m.t,rot:m.rot||'',idx:i,fonte:'nota',foto:m.foto}));
    return L.sort((a,b)=>a.t-b.t); }
  function lista(){ const box=$e('elLista'), L=itens(); $e('elN').textContent=L.length;
    if(!L.length){ box.innerHTML='<p class="e-vazio">Nada marcado ainda.<br><b>Enter</b> marca o que você quer no instante em que está.</p>'; tlMarcas(); return; }
    box.innerHTML=''; const aviso=PERC.aviso();
    L.forEach(it=>{ const d=document.createElement('div'); d.className='e-it '+it.verbo;
      const av=it.fonte==='perc'?aviso[it.idx]:null, ruim=av&&!av.cabe;
      d.innerHTML='<div class="l1"><span class="verbo">'+it.rotulo+'</span><span class="qd">'+fmtS(it.t)+'</span>'+(ruim?'<span class="qd" style="color:#ff9db4">muito longe para o tempo</span>':'')+'</div>'+
        (it.rot?'<div class="l2">'+escR(it.rot)+'</div>':'')+
        (it.fonte==='mira'&&MIRA.list[it.idx]&&MIRA.list[it.idx].alvo?'<div class="l3">'+({fixo:'fixa no ponto',passar:'fixa até passar',solto:'gira livre'}[MIRA.list[it.idx].modo]||'')+'</div>':'')+
        (it.foto?'<img class="l4" src="'+it.foto+'" style="width:100%;border-radius:6px;margin-top:6px">':'')+
        '<div class="acts"><button class="sm ir">ir</button><button class="sm ver">ver de lá</button><button class="sm ed">editar</button><button class="sm dup">duplicar</button><button class="ghost del">✕</button></div>';
      d.querySelector('.ir').onclick=()=>{ T.t=it.t; };
      d.querySelector('.ver').onclick=()=>{ T.t=it.t; T.playing=false; if(!fly.on) enterFly(); flyHold(true);
        if(it.fonte==='perc'){ const m=PERC.list[it.idx]; fly.pos.set(m.x,CFG.eyeY,m.z); }
        if(it.fonte==='mira'){ const m=MIRA.list[it.idx]; fly.yaw=m.yaw; fly.pitch=m.pitch; } flyInfo(); };
      d.querySelector('.ed').onclick=()=>abrirCartao(it);
      d.querySelector('.dup').onclick=()=>duplicar(it);
      d.querySelector('.del').onclick=()=>{ if(it.fonte==='perc'){ PERC.list.splice(it.idx,1); PERC.salvar(); }
        else if(it.fonte==='mira'){ MIRA.list.splice(it.idx,1); MIRA.salvar(); }
        else { NOTAS.list.splice(it.idx,1); NOTAS.salvar(); } lista(); };
      box.appendChild(d); });
    tlMarcas(); }
  /* D-328: duplicar copia a marca inteira (olhar/lugar/alvo/modo/texto/foto) para o instante em que você está agora —
     ou 1 s depois da original, se você estiver parado exatamente nela */
  function duplicar(it){ const L0=it.fonte==='perc'?PERC.list:it.fonte==='mira'?MIRA.list:NOTAS.list, src=L0[it.idx];
    const t=Math.abs(T.t-it.t)>0.3?T.t:clamp(it.t+1,0,TOTAL-0.01);
    const cp=JSON.parse(JSON.stringify(src)); cp.t=+t.toFixed(2); cp.bloco=blockAt(t).id;
    const i=L0.findIndex(q=>Math.abs(q.t-t)<0.25); if(i>=0) L0[i]=cp; else L0.push(cp);
    L0.sort((a,b)=>a.t-b.t); (it.fonte==='perc'?PERC:it.fonte==='mira'?MIRA:NOTAS).salvar();
    if(it.fonte==='perc'||it.fonte==='mira') MIRA.reindex();
    lista(); }
  /* ---- o cartão de marcar ---- */
  let op='olhar', EDIT=null, novaVista=true, modo='fixo', alvoSel=null;
  /* os quatro alvos que a peça tem: o ponto certo, na altura certa */
  const ALVOS={ mesa:()=>new THREE.Vector3(0,GEO.mesa.h+0.06,clamp(camera.position.z,GEO.mesa.z0,GEO.mesa.z1)),
    maquete:()=>new THREE.Vector3(0,GEO.mesa.h+0.55,(EST[5]+EST[6])/2),
    monolito:()=>new THREE.Vector3(0,(GEO.painel.campo.y0+GEO.painel.campo.y1)/2,GEO.painel.z),
    plinto:()=>new THREE.Vector3(0,1.75,GEO.rot.z) };
  /* o que está no centro do quadro: é para ISSO que "olhar assim" aponta, quando há alguma coisa lá */
  const rayC=new THREE.Raycaster();
  /* o raio testa só o que interessa (peças animadas, maquete, tesserato, gráfico) — cruzar a arquitetura inteira
     custava 30 s por marca, porque são milhares de malhas de pedra. Sem acerto: o tampo da mesa se o olhar desce,
     senão um ponto a 6 m à frente. */
  const CAND=()=>[maq.group,tess.group,painel.m,...Object.values(M).filter(o=>o&&o.isObject3D)].filter(o=>o&&o.visible);   /* D-334: o raio do three.js acerta objeto invisível — só o que está em cena */
  function alvoDoCentro(){ rayC.setFromCamera(new THREE.Vector2(0,0),camera);
    let hits=[]; try{ hits=rayC.intersectObjects(CAND(),true).filter(h=>h.distance>0.5); }catch(e){}
    if(hits.length) return hits[0].point.clone();
    const d=new THREE.Vector3(); camera.getWorldDirection(d);
    if(d.y<-0.05){ const k=(GEO.mesa.h-camera.position.y)/d.y, p=camera.position.clone().addScaledVector(d,k);
      if(k>0.5&&k<14&&Math.abs(p.x)<GEO.mesa.w/2+0.4&&p.z<GEO.mesa.z0&&p.z>GEO.mesa.z1) return p; }
    return camera.position.clone().addScaledVector(d,6); }
  function apontarPara(v){ const p=camera.position, dx=v.x-p.x, dy=v.y-p.y, dz=v.z-p.z, hz=Math.hypot(dx,dz);
    const yaw=Math.atan2(-dx,-dz)/DEG, pitch=Math.atan2(dy,hz)/DEG;
    if(!fly.on) enterFly(); fly.yaw=yaw; fly.pitch=pitch; flyInfo(); }
  /* miniatura e live preview saem de um renderizador PEQUENO e próprio (320 × 200, com buffer preservado):
     ler o quadro grande de volta custa caro — no headless chegou a 21 s por marca. */
  const prevCv=$e('prevGl'); prevCv.width=320; prevCv.height=200;
  const prevR=new THREE.WebGLRenderer({canvas:prevCv,antialias:false,preserveDrawingBuffer:true});
  prevR.setPixelRatio(1); prevR.setSize(320,200,false); prevR.outputColorSpace=renderer.outputColorSpace;
  prevR.toneMapping=renderer.toneMapping; prevR.toneMappingExposure=renderer.toneMappingExposure;
  const camPeca=new THREE.PerspectiveCamera(camera.fov,320/200,0.05,400); camPeca.layers.mask=camera.layers.mask;
  let prevOn=!QS.has('sempreview'), prevAcc=0;   /* ?sempreview: no headless dois renderizadores por software ficam lentos demais */
  const FOTO_ON=!QS.has('semfoto');   /* ?semfoto desliga a miniatura: no headless o readback por software leva segundos */
  function foto(){ if(!FOTO_ON) return ''; try{ prevR.render(scene,camera); return prevCv.toDataURL('image/jpeg',0.62); }catch(e){ return ''; } }
  /* o preview mostra sempre a PEÇA (a câmera dirigida), mesmo enquanto você voa livre pela sala */
  function prevTick(t,dt){ if(!prevOn) return; prevAcc+=dt; if(prevAcc<0.08) return; prevAcc=0;
    camPeca.position.copy(POSE.pos); const aim=AIM; aim.position.copy(POSE.pos); aim.lookAt(POSE.look);
    aim.rotation.order='YXZ'; camPeca.rotation.set(aim.rotation.x,aim.rotation.y,0); camPeca.updateMatrixWorld(true);
    try{ prevR.render(scene,camPeca); }catch(e){} }
  /* o cartão serve para criar e para EDITAR: com um item, vem preenchido e a vista só muda se você pedir */
  function abrirCartao(it){ T.playing=false; $e('ebPlay').textContent='▶'; if(fly.on) flyHold(true);
    if(it&&!it.fonte) it=null;   /* proteção: só um item da lista abre o modo edição */
    EDIT=it||null; novaVista=!it;
    if(it){ T.t=it.t; $e('ecTxt').value=it.rot||'';
      if(it.fonte==='mira'){ const m=MIRA.list[it.idx]; modo=m.modo||'solto'; }
      sel(it.verbo==='parar'?'ficar':it.verbo==='olhar'?'olhar':'nota'); }
    else { $e('ecTxt').value=''; sel(op); }
    $e('ecVista').classList.toggle('on',novaVista);
    $e('ecVista').style.display=it?'':'none';
    $e('ecDica').textContent=it?'editando · Enter salva · Esc cancela':'Enter salva · Esc cancela';
    $e('ecOk').textContent=it?'Salvar alterações':'Salvar';
    cartaoTempo(); $e('estCartao').classList.add('on'); setTimeout(()=>$e('ecTxt').focus(),30); }
  function cartaoTempo(){ const t=EDIT?EDIT.t:T.t; $e('ecQuando').textContent=fmtS(t);
    $e('ecBloco').textContent=blockAt(t).id+' · '+blockAt(t).name; }
  function moverCartao(d){ const t0=(EDIT?EDIT.t:T.t), t=clamp(t0+d,0,TOTAL-0.01);
    if(EDIT){ const L=EDIT.fonte==='perc'?PERC.list:EDIT.fonte==='mira'?MIRA.list:NOTAS.list; L[EDIT.idx].t=+t.toFixed(2); EDIT.t=+t.toFixed(2);
      L.sort((a,b)=>a.t-b.t); EDIT.idx=L.findIndex(q=>Math.abs(q.t-t)<0.001);
      (EDIT.fonte==='perc'?PERC:EDIT.fonte==='mira'?MIRA:NOTAS).salvar(); }
    T.t=t; cartaoTempo(); }
  function fecharCartao(){ $e('estCartao').classList.remove('on'); EDIT=null; }
  function sel(o){ op=o; document.querySelectorAll('#estCartao .c-ops button').forEach(b=>b.classList.toggle('sel',b.dataset.op===o));
    $e('ecModos').style.display=(o==='olhar')?'flex':'none'; selModo(); }
  function salvar(){ const rot=$e('ecTxt').value.trim();
    if(EDIT){ const antigo=EDIT.fonte, mesmo=(antigo==='perc'&&op==='ficar')||(antigo==='mira'&&op==='olhar')||(antigo==='nota'&&op==='nota');
      const L=antigo==='perc'?PERC.list:antigo==='mira'?MIRA.list:NOTAS.list, it=L[EDIT.idx];
      if(mesmo){ it.rot=rot; if(novaVista){ const f=foto(); it.foto=f;
          if(op==='ficar'){ const p=new THREE.Vector3(); scene.updateMatrixWorld(true); camera.getWorldPosition(p); it.x=+p.x.toFixed(3); it.z=+p.z.toFixed(3); }
          if(op==='olhar'){ const a=MIRA.atual(); it.yaw=+a.yaw.toFixed(2); it.pitch=+a.pitch.toFixed(2);
            const al=alvoSel||alvoDoCentro(); it.alvo=[+al.x.toFixed(2),+al.y.toFixed(2),+al.z.toFixed(2)]; alvoSel=null; } }
        if(op==='olhar') it.modo=modo; MIRA.reindex();
        (antigo==='perc'?PERC:antigo==='mira'?MIRA:NOTAS).salvar(); }
      else { const t=it.t, foto0=novaVista?foto():it.foto; L.splice(EDIT.idx,1);           /* trocou de verbo: sai de uma lista, entra na outra */
        (antigo==='perc'?PERC:antigo==='mira'?MIRA:NOTAS).salvar();
        criar(op,t,rot,foto0); }
      EDIT=null; fecharCartao(); lista(); return; }
    criar(op,T.t,rot,foto()); fecharCartao(); lista(); }
  function criar(o,t,rot,f){
    if(o==='olhar'){ const alvo=alvoSel||alvoDoCentro(); MIRA.add(t,alvo,modo); alvoSel=null;
      document.querySelectorAll('#estCtrl .alvo').forEach(x=>x.classList.remove('on'));
      const m=MIRA.list.find(q=>Math.abs(q.t-t)<0.26); if(m){ m.rot=rot; m.foto=f; } MIRA.salvar(); }
    else if(o==='ficar'){ PERC.add(t); const m=PERC.list.find(q=>Math.abs(q.t-t)<0.26); if(m){ m.rot=rot; m.foto=f; } PERC.salvar(); }
    else { NOTAS.list.push({t:+t.toFixed(2),rot,foto:f,bloco:blockAt(t).id}); NOTAS.list.sort((a,b)=>a.t-b.t); NOTAS.salvar(); } }
  document.querySelectorAll('#estCartao .c-ops button').forEach(b=>{ b.onclick=()=>sel(b.dataset.op); });
  $e('ecOk').onclick=salvar; $e('ecX').onclick=()=>{ EDIT=null; fecharCartao(); };
  $e('ecVista').onclick=()=>{ novaVista=!novaVista; $e('ecVista').classList.toggle('on',novaVista); };
  $e('ecM').onclick=()=>moverCartao(-0.5); $e('ecP').onclick=()=>moverCartao(0.5);
  $e('ecTxt').addEventListener('keydown',ev=>{ if(ev.key==='Enter'&&!ev.shiftKey){ ev.preventDefault(); salvar(); }
    if(ev.key==='Escape'){ ev.preventDefault(); fecharCartao(); } });
  /* ---- controles ---- */
  $e('ebPlay').onclick=()=>{ togglePlay(); };
  $e('ebM1').onclick=()=>{ T.t=clamp(T.t-1,0,TOTAL-0.01); };
  $e('ebP1').onclick=()=>{ T.t=clamp(T.t+1,0,TOTAL-0.01); };
  $e('ebFly').onclick=()=>toggleFly();
  $e('ebAlt').onclick=()=>{ if(fly.on){ fly.pos.y=CFG.eyeY; flyInfo(); } };
  $e('ebNiv').onclick=()=>{ if(fly.on){ fly.pitch=0; flyInfo(); } };
  $e('ebSug').onclick=()=>{ const s=proxSug(T.t)||SUG[SUG.length-1]; if(!s) return; T.t=s.t;
    if(fly.on){ fly.pos.set(s.x,CFG.eyeY,s.z); flyInfo(); } };
  document.querySelectorAll('#estCtrl .alvo').forEach(b=>{ b.onclick=()=>{ alvoSel=ALVOS[b.dataset.alvo](); apontarPara(alvoSel);
    document.querySelectorAll('#estCtrl .alvo').forEach(x=>x.classList.toggle('on',x===b)); }; });
  document.querySelectorAll('#ecModos button').forEach(b=>{ b.onclick=()=>{ modo=b.dataset.modo; selModo(); }; });
  function selModo(){ document.querySelectorAll('#ecModos button').forEach(b=>b.classList.toggle('on',b.dataset.modo===modo)); }
  $e('ebPv').onclick=()=>{ prevOn=!prevOn; $e('ebPv').classList.toggle('on',prevOn); document.body.classList.toggle('semprev',!prevOn); };
  $e('ebPl').onclick=()=>{ PLANTA.on=!PLANTA.on; $e('ebPl').classList.toggle('on',PLANTA.on); document.body.classList.toggle('semplanta',!PLANTA.on); };
  $e('ebMarcar').onclick=()=>abrirCartao();   /* sem a seta, o clique entrava como 'item a editar' */
  $e('elCaderno').onclick=()=>regDownload('hydra_caderno.md',briefingMD());
  $e('elCopy').onclick=()=>{ (navigator.clipboard?.writeText(briefingMD())||Promise.reject()).then(()=>{ $e('elCopy').textContent='copiado ✓'; setTimeout(()=>$e('elCopy').textContent='Copiar',1100); },()=>regDownload('hydra_caderno.md',briefingMD())); };
  /* D-328: clique na timeline pula o tempo (como antes); arrastar (fora de uma marca) marca um trecho A↔B para repetir */
  { let tlDrag=null; const tlEl=$e('estTl');
    tlEl.addEventListener('pointerdown',ev=>{ if(ev.target.closest('#tlMarcas')) return;
      tlDrag={x0:ev.clientX,r:tlEl.getBoundingClientRect(),moved:false}; tlEl.setPointerCapture(ev.pointerId); });
    tlEl.addEventListener('pointermove',ev=>{ if(!tlDrag) return;
      if(Math.abs(ev.clientX-tlDrag.x0)>4){ tlDrag.moved=true;
        const ta=clamp((tlDrag.x0-tlDrag.r.left)/tlDrag.r.width*TOTAL,0,TOTAL);
        const tb=clamp((ev.clientX-tlDrag.r.left)/tlDrag.r.width*TOTAL,0,TOTAL);
        AB.a=Math.min(ta,tb); AB.b=Math.max(ta,tb); desenhaAB(); } });
    tlEl.addEventListener('pointerup',ev=>{ if(!tlDrag) return;
      if(!tlDrag.moved) T.t=clamp((ev.clientX-tlDrag.r.left)/tlDrag.r.width*TOTAL,0,TOTAL-0.01);
      tlDrag=null; }); }
  $e('ebLoop').onclick=()=>{ if(AB.a===null) return; AB.on=!AB.on; $e('ebLoop').classList.toggle('on',AB.on); };
  $e('ebLoopX').onclick=()=>{ AB.a=AB.b=null; AB.on=false; $e('ebLoop').classList.remove('on'); desenhaAB(); };
  desenhaAB();
  /* D-328: "original" — segurar mostra a peça sem as suas marcas, para comparar; soltar volta ao normal */
  function origOn(on){ ORIG_ON=on; $e('ebOrig').classList.toggle('on',on); }
  $e('ebOrig').addEventListener('pointerdown',()=>origOn(true));
  addEventListener('pointerup',()=>origOn(false)); addEventListener('pointercancel',()=>origOn(false));
  function abrirHelp(){ $e('estHelp').classList.add('on'); } function fecharHelp(){ $e('estHelp').classList.remove('on'); }
  $e('ebAjuda').onclick=abrirHelp; $e('ehX').onclick=fecharHelp;
  $e('estHelp').addEventListener('click',ev=>{ if(ev.target.id==='estHelp') fecharHelp(); });
  /* D-328: tudo que existe está aqui — se não está nesta lista, não existe (mesmo texto da página avulsa ajuda_estudio.html) */
  $e('ehBody').innerHTML=`
    <h5>Sempre</h5><table>
      <tr><td class="k">Espaço</td><td class="d">toca / pausa (fora do voo)</td></tr>
      <tr><td class="k">Enter</td><td class="d">marca aqui — abre o cartão; dentro do voo, congela a vista (solta o mouse) e Enter de novo destrava</td></tr>
      <tr><td class="k">Esc</td><td class="d">fecha o cartão de marcação · fecha esta ajuda · sai do voo livre</td></tr>
      <tr><td class="k">F</td><td class="d">entra / sai do voo livre</td></tr>
      <tr><td class="k">O (segurar)</td><td class="d">mostra a peça <b>sem</b> as suas marcas, para comparar com o roteiro original — solta e volta ao normal (o botão "original" faz o mesmo)</td></tr>
      <tr><td class="k">?</td><td class="d">abre / fecha esta ajuda</td></tr>
    </table>
    <h5>Dentro do voo livre (F)</h5><table>
      <tr><td class="k">WASD ou ↑↓←→</td><td class="d">anda / vira</td></tr>
      <tr><td class="k">mouse</td><td class="d">olha ao redor</td></tr>
      <tr><td class="k">Shift (segurar)</td><td class="d">anda mais rápido</td></tr>
      <tr><td class="k">E ou Espaço</td><td class="d">sobe · <b>Q ou C</b> desce</td></tr>
      <tr><td class="k">roda do mouse</td><td class="d">sobe/desce fino, sem soltar o olhar</td></tr>
      <tr><td class="k">[ e ]</td><td class="d">diminui / aumenta a velocidade do voo</td></tr>
      <tr><td class="k">X</td><td class="d">centra a altura (volta à altura de pé)</td></tr>
      <tr><td class="k">N</td><td class="d">nivela o horizonte (zera a inclinação)</td></tr>
      <tr><td class="k">G</td><td class="d">vai à sugestão de posição mais próxima</td></tr>
    </table>
    <h5>Navegando no tempo (fora do voo)</h5><table>
      <tr><td class="k">← →</td><td class="d">anda 0,1 s</td></tr>
      <tr><td class="k">Shift + ← →</td><td class="d">anda 1 s</td></tr>
      <tr><td class="k">Alt + ← →</td><td class="d">pula para o próximo/anterior momento-chave (início de bloco ou de fala)</td></tr>
      <tr><td class="k">clique na timeline</td><td class="d">pula para aquele instante</td></tr>
      <tr><td class="k">arrastar na timeline</td><td class="d">fora de uma marca, seleciona um trecho A↔B para repetir</td></tr>
      <tr><td class="k">↺ A↔B</td><td class="d">liga/desliga o laço do trecho selecionado · <b>✕ trecho</b> apaga a seleção</td></tr>
      <tr><td class="k">arrastar uma marca ▮</td><td class="d">move o instante dela · um clique simples só pula para lá</td></tr>
      <tr><td class="k">clique numa palavra</td><td class="d">na fala mostrada no topo, pula para o instante daquela palavra</td></tr>
    </table>
    <h5>Na sala</h5><table>
      <tr><td class="k">clique na planta</td><td class="d">"ficar aqui" neste segundo (a peça caminha até lá)</td></tr>
      <tr><td class="k">mesa / maquete / monólito / plinto</td><td class="d">aponta o olhar para aquele ponto — entra em voo se preciso</td></tr>
      <tr><td class="k">P</td><td class="d">mostra/esconde a planta</td></tr>
      <tr><td class="k">V</td><td class="d">mostra/esconde o preview ao vivo</td></tr>
    </table>
    <h5>No cartão de marcar</h5><table>
      <tr><td class="k">Olhar assim / Ficar aqui / Só anotar</td><td class="d">o que esta marca faz</td></tr>
      <tr><td class="k">fixa · fixa até passar · gira livre</td><td class="d">(só em "olhar assim") como o olhar se comporta até a próxima marca</td></tr>
      <tr><td class="k">usar a vista atual</td><td class="d">grava de novo a posição/ângulo em que você está agora</td></tr>
      <tr><td class="k">− / +</td><td class="d">move o instante da marca meio segundo</td></tr>
      <tr><td class="k">← → (dentro do cartão)</td><td class="d">move 0,1 s · Shift move 1 s</td></tr>
      <tr><td class="k">Enter / Esc</td><td class="d">salva / cancela</td></tr>
    </table>
    <h5>Na lista de marcas (painel da direita)</h5><table>
      <tr><td class="k">ir</td><td class="d">pula para o instante da marca</td></tr>
      <tr><td class="k">ver de lá</td><td class="d">entra em voo já na posição/ângulo daquela marca</td></tr>
      <tr><td class="k">editar</td><td class="d">reabre o cartão para mudar</td></tr>
      <tr><td class="k">duplicar</td><td class="d">copia esta marca para o instante em que você está (ou 1 s depois, se estiver parado nela)</td></tr>
      <tr><td class="k">✕</td><td class="d">apaga a marca</td></tr>
    </table>`;
  /* D-328: roda do mouse sobe/desce durante o voo, fino — além do E/Q já existente */
  addEventListener('wheel',ev=>{ if(!fly.on||fly.hold) return; ev.preventDefault();
    fly.pos.y=clamp(fly.pos.y-ev.deltaY*0.0022,0.15,3.4); },{passive:false});
  addEventListener('keydown',ev=>{ if(/input|textarea/i.test(ev.target.tagName)) return; const k=ev.key.toLowerCase();
    if(k==='o'&&!ev.repeat){ origOn(true); ev.preventDefault(); return; }
    if(k==='?'||(k==='/'&&ev.shiftKey)){ if($e('estHelp').classList.contains('on')) fecharHelp(); else abrirHelp(); ev.preventDefault(); return; }
    if($e('estHelp').classList.contains('on')){ if(k==='escape'){ fecharHelp(); ev.preventDefault(); } return; }
    if($e('estCartao').classList.contains('on')){
      if(k==='escape'){ EDIT=null; fecharCartao(); ev.preventDefault(); return; }
      if(!fly.on){ if(k==='arrowleft'){ moverCartao(ev.shiftKey?-1:-0.1); ev.preventDefault(); return; }
        if(k==='arrowright'){ moverCartao(ev.shiftKey?1:0.1); ev.preventDefault(); return; } }
      return; }
    if(k==='enter'){ abrirCartao(); ev.preventDefault(); return; }
    if(k==='escape'){ if(fly.on) exitFly(); ev.preventDefault(); return; }
    if(k==='x'){ if(fly.on){ fly.pos.y=CFG.eyeY; flyInfo(); } ev.preventDefault(); return; }
    if(k==='n'){ if(fly.on){ fly.pitch=0; flyInfo(); } ev.preventDefault(); return; }
    if(k==='g'){ $e('ebSug').click(); ev.preventDefault(); return; }
    if(k==='p'&&!fly.on){ $e('ebPl').click(); ev.preventDefault(); return; }
    if(k==='v'){ $e('ebPv').click(); ev.preventDefault(); return; }
    /* D-328: setas fora do voo = anda no tempo — 0,1 s · Shift 1 s · Alt pula para o momento-chave mais próximo */
    if(!fly.on&&(k==='arrowleft'||k==='arrowright')){ const dir=k==='arrowright'?1:-1;
      if(ev.altKey) T.t=proxChave(T.t,dir); else T.t=clamp(T.t+dir*(ev.shiftKey?1:0.1),0,TOTAL-0.01);
      T.playing=false; ev.preventDefault(); return; } });
  addEventListener('keyup',ev=>{ if(ev.key.toLowerCase()==='o') origOn(false); });
  /* ---- a planta: clicar no chão marca FICAR AQUI no segundo em que você está ---- */
  PLANTA.on=true;
  const marcaPlanta=(x,z)=>{ const t=T.t; PERC.add(t); const m=PERC.list.find(q=>Math.abs(q.t-t)<0.26);
    if(m){ m.x=+x.toFixed(3); m.z=+z.toFixed(3); m.rot=m.rot||''; } PERC.salvar(); lista(); desenhaPercurso(); };
  /* 'pointerdown' com captura: chega ANTES do handler do canvas que liga o som — clicar na planta não põe a peça a tocar */
  canvas.addEventListener('pointerdown',ev=>{ if(!PLANTA.on) return; const p=PLANTA.mundo(ev.clientX,ev.clientY,innerHeight);
    if(!p) return; ev.preventDefault(); ev.stopPropagation(); marcaPlanta(p.x,p.z); },true);
  canvas.addEventListener('mousemove',ev=>{ if(!PLANTA.on) return; const p=PLANTA.mundo(ev.clientX,ev.clientY,innerHeight);
    $e('plDica').textContent=p?('x '+p.x.toFixed(1)+'  z '+p.z.toFixed(1)):''; });
  /* o caminho que as suas marcas desenham, visível na planta e na sala */
  const percLinha=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:PAL.gold,transparent:true,opacity:.85,toneMapped:false}));
  percLinha.frustumCulled=false; scene.add(percLinha);
  const percPtos=new THREE.Group(); scene.add(percPtos);
  function desenhaPercurso(){ const pts=PERC.list.map(m=>new THREE.Vector3(m.x,0.06,m.z));
    percLinha.geometry.dispose(); percLinha.geometry=new THREE.BufferGeometry().setFromPoints(pts); percLinha.visible=pts.length>1;
    while(percPtos.children.length) percPtos.remove(percPtos.children[0]);
    PERC.list.forEach(m=>{ const o=new THREE.Mesh(new THREE.CircleGeometry(0.26,24),new THREE.MeshBasicMaterial({color:PAL.gold,transparent:true,opacity:.9,side:THREE.DoubleSide,toneMapped:false}));
      o.rotation.x=-Math.PI/2; o.position.set(m.x,0.05,m.z); percPtos.add(o); }); }
  desenhaPercurso();
  tlBlocos(); lista();
  EST_TICK=(t,dt)=>{ topo(t); anel.tick(t,camera.position); $e('tlCursor').style.left=(t/TOTAL*100)+'%'; prevTick(t,dt||0.016);
    if(AB.on&&AB.a!==null&&T.playing&&t>=AB.b-0.02) T.t=AB.a; };   // D-328: laço A↔B só durante a reprodução
  const listaOrig=lista; lista=function(){ listaOrig(); desenhaPercurso(); };
}
/* D-337: ESTÚDIO DE DIREÇÃO v9 — duas trilhas (LUGAR · OLHAR), planta como editor de lugar, voo só para ver e mirar.
   Mora em estudio9.js; recebe daqui só o que precisa. */
if(CFG.estudio&&!QS.has('estudio8')){
  if(!REV.ev.length) revBuild(); if(showMap) $('bMap').click();
  import('./estudio9.js').then(m=>m.iniciar({THREE,T,TOTAL,B,blockAt,REV,revSegAt,revWord,wordTime,fly,enterFly,exitFly,flyHold,camera,scene,renderer,
    PLANTA,plantaCam,DIR,GEO,CFG,POSE,pose,INICIO,fmt,togglePlay,caderno:briefingMD,regDownload,
    setTick:f=>{ EST_TICK=f; }, fail})).catch(e=>fail('estúdio v9: '+e.message));
}
