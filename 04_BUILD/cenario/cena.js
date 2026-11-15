/* =============================================================================
   HYDRA — banco de provas do cenário  ·  trilha A
   Não é a peça. É a arquitetura de `cenario.js` com painel de controle, para o
   Vinicius escolher luz, material e o modo do tesserato vendo e clicando.

   Tudo o que é arquitetura vem do MÓDULO. Este arquivo só tem: câmera, painel e
   o tesserato de teste. Se algo da cena estiver errado, o conserto é em
   `cenario.js` — que é o mesmo arquivo que a trilha M importa.
   ============================================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GEO, PARADAS, EST, LUZ_PADRAO, construirCenario, porNaParada } from './cenario.js';

const $ = s => document.querySelector(s);
const boot = t => { const b = $('#boot'); if (b) b.textContent = t; };
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const lerp  = (a,b,t) => a + (b-a)*t;

const DEF = { cena:'nave', modo:'percurso', parada:0, ...LUZ_PADRAO,
              som:'1', tm:'aces', grao:0.55, pol:0.32, tess:'off', tessR:6.4 };
const S = { ...DEF };

/* ---------- renderer, cena, câmera ------------------------------------------ */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
const HQ = location.search.includes('hq');
renderer.setPixelRatio(location.search.includes('px2') ? 2 : Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const TM = { aces:THREE.ACESFilmicToneMapping, agx:THREE.AgXToneMapping, cine:THREE.CineonToneMapping,
             rein:THREE.ReinhardToneMapping, lin:THREE.LinearToneMapping };
renderer.toneMapping = TM.aces;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
const AIM    = new THREE.PerspectiveCamera(58, 1, 0.1, 600);   // mira: lookAt de câmera aponta o −z
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.target.set(0, 1.2, -18); controls.enabled = false;

boot('cenário · a construir');
/* Tratamento da parede pela URL: ?parede=liso | juntas | ripado (padrão juntas). */
const PAREDE = (new URLSearchParams(location.search).get('parede')) || 'pedra-clara';
const CEN = await construirCenario(scene, renderer, { sombraHQ: HQ, parede: PAREDE });
window.CENARIO = CEN;          // acesso direto ao modulo, para depurar

/* ---------- tesserato de teste (tinta × luminoso) ---------------------------- */
function fazTesserato() {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const V4 = []; for (let i = 0; i < 16; i++) V4.push([(i&1?1:-1),(i&2?1:-1),(i&4?1:-1),(i&8?1:-1)]);
  const E = []; for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i^(1<<b); if (j > i) E.push([i,j]); }
  const FACES = []; for (const w of [0,8]) for (let k = 0; k < 3; k++) for (const s of [0,1]) {
    const fr = [0,1,2].filter(q => q !== k);
    FACES.push([[0,0],[1,0],[1,1],[0,1]].map(([u,v]) => w|(s<<k)|(u<<fr[0])|(v<<fr[1]))); }
  const mE = new THREE.MeshStandardMaterial({ color:0x003D7C, roughness:0.45 });
  const mD = new THREE.MeshStandardMaterial({ color:0x003D7C, roughness:0.4 });
  const TINT = [0x178C8C, 0xEF7C00, 0x003D7C];
  const eg = new THREE.CylinderGeometry(1,1,1,7,1), dg = new THREE.SphereGeometry(1,12,9);
  const arestas = E.map(() => { const m = new THREE.Mesh(eg, mE); m.castShadow = true; g.add(m); return m; });
  const nos = V4.map(() => { const m = new THREE.Mesh(dg, mD); m.castShadow = true; m.scale.setScalar(0.035); g.add(m); return m; });
  const faces = FACES.map((q,i) => { const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12),3));
    geo.setIndex([0,1,2,0,2,3]);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color:TINT[i%3], roughness:0.85,
      transparent:true, opacity:0.14, side:THREE.DoubleSide, depthWrite:false }));
    m.renderOrder = 3; g.add(m); return m; });
  const ang = {xw:0,yw:0,zw:0,xz:0}, p3 = Array.from({length:16}, () => new THREE.Vector3());
  const up = new THREE.Vector3(0,1,0), va = new THREE.Vector3(), vb = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    grupo: g,
    modo(m) {
      g.visible = (m !== 'off'); const luz = (m === 'luz');
      mE.emissive = new THREE.Color(luz ? 0x2ea8c8 : 0x000000); mE.emissiveIntensity = luz ? 1.6 : 0;
      mE.color.set(luz ? 0x5fd3e8 : 0x003D7C);
      mD.emissive = new THREE.Color(luz ? 0xffc34b : 0x000000); mD.emissiveIntensity = luz ? 2.2 : 0;
      mD.color.set(luz ? 0xffd98a : 0x003D7C);
      faces.forEach(f => { f.material.opacity = luz ? 0.10 : 0.15;
        f.material.blending = luz ? THREE.AdditiveBlending : THREE.NormalBlending;
        f.material.needsUpdate = true; });
      arestas.forEach(e => e.castShadow = !luz); nos.forEach(d => d.castShadow = !luz);
    },
    atualiza(dt) {
      if (!g.visible) return;
      ang.xw += dt*0.10; ang.yw += dt*0.043; ang.zw += dt*0.029; ang.xz += dt*0.055;
      const cw=Math.cos(ang.xw), sw=Math.sin(ang.xw), cy=Math.cos(ang.yw), sy=Math.sin(ang.yw),
            cz=Math.cos(ang.zw), sz=Math.sin(ang.zw), cx=Math.cos(ang.xz), sx=Math.sin(ang.xz);
      for (let i = 0; i < 16; i++) {
        let [x,y,z,w] = V4[i]; let t;
        t = x*cw - w*sw; w = x*sw + w*cw; x = t;
        t = y*cy - w*sy; w = y*sy + w*cy; y = t;
        t = z*cz - w*sz; w = z*sz + w*cz; z = t;
        t = x*cx - z*sx; z = x*sx + z*cx; x = t;
        const k = 2.6/Math.max(0.9, 2.6 - w);
        p3[i].set(x*k, y*k, z*k).multiplyScalar(0.1724);   // normaliza: escala = raio em metros
      }
      arestas.forEach((m,i) => { va.copy(p3[E[i][0]]); vb.copy(p3[E[i][1]]);
        m.position.addVectors(va,vb).multiplyScalar(0.5);
        const d = vb.clone().sub(va), len = d.length() || 1e-6;
        q.setFromUnitVectors(up, d.normalize()); m.quaternion.copy(q); m.scale.set(0.017, len, 0.017); });
      nos.forEach((m,i) => m.position.copy(p3[i]));
      faces.forEach((m,i) => { const a = m.geometry.attributes.position.array;
        FACES[i].forEach((vi,k) => { a[k*3] = p3[vi].x; a[k*3+1] = p3[vi].y; a[k*3+2] = p3[vi].z; });
        m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); });
    } };
}
const TESS = fazTesserato();

/* ---------- caminhar a pé (WASD + mouse) ------------------------------------ */
const KEY = {};
addEventListener('keydown', e => { if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  KEY[e.code] = true; if (S.modo === 'wasd' && ['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', e => { KEY[e.code] = false; });
let yaw = 0, pitch = 0, arrasta = false, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', e => { if (S.modo !== 'wasd') return;
  arrasta = true; lx = e.clientX; ly = e.clientY; canvas.style.cursor = 'grabbing'; });
addEventListener('pointerup', () => { arrasta = false; canvas.style.cursor = ''; });
addEventListener('pointermove', e => { if (!arrasta || S.modo !== 'wasd') return;
  yaw -= (e.clientX-lx)*0.0032; pitch = clamp(pitch - (e.clientY-ly)*0.0032, -1.15, 1.15);
  lx = e.clientX; ly = e.clientY; });
const EU = new THREE.Euler(0,0,0,'YXZ');
function semear() { const d = new THREE.Vector3(); camera.getWorldDirection(d);
  yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(clamp(d.y, -1, 1)); }
function andarWASD(dt) {
  const sp = (KEY.ShiftLeft || KEY.ShiftRight ? 4.0 : 1.6)*dt;
  const f = (KEY.KeyW||KEY.ArrowUp?1:0) - (KEY.KeyS||KEY.ArrowDown?1:0);
  const r = (KEY.KeyD||KEY.ArrowRight?1:0) - (KEY.KeyA||KEY.ArrowLeft?1:0);
  if (f || r) { const n = Math.hypot(f,r);
    camera.position.x += ((-Math.sin(yaw)*f + Math.cos(yaw)*r)/n)*sp;
    camera.position.z += ((-Math.cos(yaw)*f - Math.sin(yaw)*r)/n)*sp; }
  camera.position.y = GEO.eye;
  EU.set(pitch, yaw, 0); camera.quaternion.setFromEuler(EU);
}

/* ---------- percurso --------------------------------------------------------- */
let iSeg = 0, u = 0, espera = 0, andando = true;
function porEm(p) { camera.position.set(p[0], GEO.eye, p[1]);
  AIM.position.copy(camera.position); AIM.lookAt(p[2], p[4], p[3]); camera.quaternion.copy(AIM.quaternion); }
function passo(dt) {
  const lista = PARADAS[S.cena];
  if (S.modo === 'foto')  return;                      // câmera fixada por CEN.olhar()
  if (S.modo === 'wasd')  { andarWASD(dt); return; }
  if (S.modo === 'livre') { controls.update(); return; }
  if (!andando) { porNaParada(camera, AIM, S.cena, S.parada); return; }
  if (espera > 0) { espera -= dt; porNaParada(camera, AIM, S.cena, iSeg); return; }
  if (iSeg >= lista.length - 1) { iSeg = 0; u = 0; espera = 2.2; return; }
  const A = lista[iSeg], B = lista[iSeg+1];
  const dur = Math.max(1.6, Math.hypot(B[0]-A[0], B[1]-A[1]) / 0.8);
  u += dt/dur;
  if (u >= 1) { u = 0; iSeg++; espera = 3.0; S.parada = clamp(iSeg, 0, lista.length-1);
    $('#parada').value = S.parada; $('#paradav').textContent = S.parada; return; }
  const e = u < 0.5 ? 2*u*u : 1 - Math.pow(-2*u + 2, 2)/2;
  porEm([lerp(A[0],B[0],e), lerp(A[1],B[1],e), lerp(A[2],B[2],e), lerp(A[3],B[3],e), lerp(A[4],B[4],e)]);
}

/* ---------- aplicar ---------------------------------------------------------- */
function aplicar() {
  renderer.toneMapping = TM[S.tm] || TM.aces;
  renderer.shadowMap.type = (S.som === '2') ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  CEN.aplicarLuz({ sunEl:S.sunEl, sunAz:S.sunAz, sun:S.sun, sunC:S.sunC,
                   sunElRot:S.sunElRot, sunAzRot:S.sunAzRot, sunRot:S.sunRot,
                   skyT:S.skyT, skyH:S.skyH, env:S.env, exp:S.exp, sombras:(S.som !== '0') });
  CEN.materiais.chao.roughness = lerp(0.80, 0.18, S.pol);
  TESS.modo(S.tess);
  TESS.grupo.scale.setScalar(S.tessR);
  TESS.grupo.position.set(0, GEO.rot.plH + S.tessR*0.52, GEO.rot.z);
  controls.enabled = (S.modo === 'livre');
  canvas.style.cursor = (S.modo === 'wasd') ? 'grab' : '';
}

/* ---------- painel ----------------------------------------------------------- */
function ui() {
  const chips = $('#cenas');
  for (const [k, lab] of [['nave','a nave da mesa'], ['rotunda','a rotunda']]) {
    const b = document.createElement('button'); b.textContent = lab; b.dataset.k = k;
    b.onclick = () => { S.cena = k; S.parada = 0; iSeg = 0; u = 0; espera = 1.0;
      $('#parada').max = PARADAS[k].length - 1; marcar(); aplicar(); };
    chips.appendChild(b);
  }
  const marcar = () => [...chips.children].forEach(b => b.classList.toggle('on', b.dataset.k === S.cena));
  marcar();

  const bind = (id, key, fmt, depois) => {
    const el = $('#'+id), v = $('#'+id+'v'); if (!el) return;
    const set = () => { const val = el.type === 'range' ? parseFloat(el.value) : el.value;
      S[key] = val; if (v) v.textContent = fmt ? fmt(val) : val; aplicar(); if (depois) depois(); };
    el.value = S[key]; if (v) v.textContent = fmt ? fmt(S[key]) : S[key];
    el.addEventListener('input', set); el.addEventListener('change', set);
  };
  bind('sunEl','sunEl',v=>v+'°'); bind('sunAz','sunAz',v=>v+'°'); bind('sun','sun',v=>v.toFixed(1));
  bind('sunC','sunC'); bind('som','som'); bind('skyT','skyT'); bind('skyH','skyH');
  bind('env','env',v=>v.toFixed(2)); bind('tm','tm'); bind('exp','exp',v=>v.toFixed(2));
  bind('cPar','cPar'); bind('cCha','cCha'); bind('cMad','cMad');
  bind('grao','grao',v=>v.toFixed(2)); bind('pol','pol',v=>v.toFixed(2));
  bind('tess','tess'); bind('tessR','tessR',v=>v.toFixed(1));

  const sm = $('#modo');
  sm.addEventListener('change', () => {
    if (sm.value === 'wasd') { semear(); andando = false;
      $('#andar').classList.remove('on'); $('#andar').textContent = '▶ andar'; }
    $('#hud').innerHTML = sm.value === 'wasd'
      ? '<b>W A S D</b> = andar · <b>Shift</b> = correr · arraste = olhar · <b>H</b> = esconder painel'
      : 'arraste = olhar · roda = aproximar · <b>H</b> = esconder painel';
  });
  bind('modo','modo');

  const pr = $('#parada'); pr.max = PARADAS[S.cena].length - 1;
  pr.addEventListener('input', () => { S.parada = +pr.value; $('#paradav').textContent = pr.value;
    andando = false; $('#andar').classList.remove('on'); $('#andar').textContent = '▶ andar'; iSeg = S.parada; });
  $('#paradav').textContent = S.parada;

  $('#andar').classList.add('on');
  $('#andar').onclick = () => { andando = !andando; $('#andar').classList.toggle('on', andando);
    $('#andar').textContent = andando ? '❚❚ parar' : '▶ andar';
    if (andando) { iSeg = S.parada; u = 0; espera = 0.6; } };
  $('#reset').onclick = () => { Object.assign(S, DEF);
    for (const k in DEF) { const el = $('#'+k); if (el) { el.value = DEF[k];
      const v = $('#'+k+'v'); if (v) v.textContent = DEF[k]; } } marcar(); aplicar(); };
  $('#copy').onclick = () => { const diff = {}; for (const k in DEF) if (S[k] !== DEF[k]) diff[k] = S[k];
    $('#json').value = JSON.stringify({ cenario: diff }, null, 2); $('#out').style.display = 'flex'; };
  $('#cp2').onclick = () => { $('#json').select(); document.execCommand('copy'); };
  $('#close').onclick = () => $('#out').style.display = 'none';
  addEventListener('keydown', e => { if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hideui'); });
}

/* ---------- loop -------------------------------------------------------------- */
function resize() { renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = AIM.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix(); AIM.updateProjectionMatrix(); }
addEventListener('resize', resize);

let last = performance.now()/1000, frame = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now()/1000, dt = Math.min(0.06, now - last); last = now;
  passo(dt); TESS.atualiza(dt); CEN.seguirSombra(camera); CEN.luzDaSala(camera);
  renderer.render(scene, camera); frame++;
  if (frame === 2) $('#boot').classList.add('gone');
  window.CEN = { frame, cam: camera.position.toArray().map(v => +v.toFixed(2)), S,
    set(k,v) { S[k] = v; aplicar(); },
    /* Fixa a câmera onde se quiser, para render de verificação. */
    olhar(px,py,pz, tx,ty,tz, fov) { S.modo = 'foto'; andando = false;
      camera.position.set(px,py,pz); AIM.position.set(px,py,pz); AIM.lookAt(tx,ty,tz);
      camera.quaternion.copy(AIM.quaternion);
      if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); } },
    ir(cena,i) { S.cena = cena; S.parada = i; iSeg = i; u = 0; andando = false;
      const el = $('#parada'); if (el) { el.max = PARADAS[cena].length-1; el.value = i; $('#paradav').textContent = i; }
      $('#andar').classList.remove('on'); $('#andar').textContent = '▶ andar'; aplicar(); } };
}

resize(); ui(); aplicar();
await CEN.carregarPecas((i,n,f) => boot(`cenário · ${i}/${n} · ${f}`));
boot('cenário · pronto');
loop();
