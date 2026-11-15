/* =============================================================================
   HYDRA — CENÁRIO  ·  módulo da trilha A (arquitetura)
   -----------------------------------------------------------------------------
   Esta é a ÚNICA fonte da arquitetura da peça: geometria, materiais, luz e as
   coordenadas das paradas. A trilha M (montagem) importa daqui e NÃO reconstrói
   a cena por conta própria — se a nave mudar, muda num lugar só.

   Uso:
       import { GEO, PARADAS, EST, construirCenario } from './cenario/cenario.js';
       const CEN = await construirCenario(scene, renderer);
       CEN.aplicarLuz({ sunEl:56, exp:0.72 });          // opcional
       await CEN.carregarPecas();                       // os 8 .glb sobre a mesa

   O que este módulo NÃO faz, de propósito: tempo, câmera, TELAs, tesserato.
   Isso é da trilha M. Ver 00_ESTADO/PROTOCOLO.md §1 e §2.

   Cotas conferidas contra 04_BUILD/planta/planta_hydra.svg (D-210).
   ============================================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { carregarLuzAssada } from './luz_assada.js';   // D-230: ricochete assado da rotunda

const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const lerp  = (a,b,t) => a + (b-a)*t;

/* ---------- 1. A PLANTA, EM METROS (D-210) ---------------------------------- */
export const GEO = {
  /* D-222: a nave curta. A v16 anda 8 s em 221; a planta de 42 m tinha virado
     16 s de silencio so' para chegar a' rotunda. Agora: mesa com
     QUATRO estacoes (duas pecas cada — reserva de espaco, o conteudo o Vinicius
     define depois), o monolito 1 m antes do portal, e a rotunda logo atras.
     Tres numeros mandam — z1 da nave, z1 da mesa, folga do monolito — e o
     resto deriva, entao encurtar de novo e' mudar UM numero.
     D-227 (27/09): mesa 10,5 -> 8,8 m (z1 -14,5 -> -12,8), para a M abrir uma
     diagonal reta de P4 a P5 sem raspar a quina. */
  nave:   { z0: 3,  z1: -20, hx: 7, hPar: 9, hCrown: 13 },   // 14 × 23, abóbada a 13
  mesa:   { z0: -4, z1: -12.8, w: 1.8, h: 0.78 },            // 8,8 × 1,8, tampo a 0,78 (D-227: era 10,5 m/z1 -14,5)
  /* D-223: o monolito e' MONOLITO — 3,0 x 6,0 x 0,8, presente desde o B0,
     no eixo, tapando de proposito a vista direta da rotunda. O campo de
     conteudo e' so' uma janela de 2,2 x 2,4 a' altura do olho; acima dela a
     pedra sobe mais 2,5 m. Imponente e' justamente nao caber no quadro de
     perto: inteiro, so' de longe. */
  painel: { z: -19, w: 3.0, h: 5.4, d: 0.8, campo: { w: 2.2, y0: 1.1, y1: 3.5 } },
  rot:    { z: -32, R: 11, hPar: 14, ocR: 4, plR: 3, plH: 0.85 },  // = nave.z1 − 12
  /* D-225: a faixa flutuante da legenda de narracao. UM objeto so', que a M
     reposiciona (faixa.position.set) e mostra/esconde (faixaMostrar) quando
     precisa — nao acompanha a camera o tempo todo, nao existe uma por parada.
     Mesmo carvalho do tampo (T.oak), moldura rasa (0,8 cm), sem dissolucao. */
  faixa:  { w: 0.90, h: 0.22, d: 0.05, campo: { w: 0.74, h: 0.13 } },
  eye:    1.6,
};
GEO.painel.z = GEO.nave.z1 + 1.0;         // o monolito, 1 m antes do fim da nave
GEO.rot.z    = GEO.nave.z1 - 12;          // borda do tambor 1 m alem do fim da nave; portal entra 0,35
GEO.vault = (() => {                      // arco circular de meia-corda hx e flecha rise
  const w = GEO.nave.hx, rise = GEO.nave.hCrown - GEO.nave.hPar;
  const R = (rise*rise + w*w) / (2*rise);
  return { R, yc: GEO.nave.hCrown - R, half: Math.asin(w / R) };
})();

/** z de cada uma das oito peças sobre a mesa, na ordem da narração (a…h). */
/** z de cada peca sobre a mesa. Passo de 2,35 m nos 19 m da D-307 (era 3,10 m
    em 24 m); sobra 1,40 m na cabeceira e 1,15 m no pe'. */
/** D-222: QUATRO estacoes a 2,5 m, duas pecas por estacao (a 0,9 m entre si).
    Continuam OITO entradas, na ordem a…h, para nada que indexa EST mudar. */
export const EST = (() => {
  // D-227: mesa 10,5 -> 8,8 m. Centros recalculados para manter a MESMA margem
  // de 1,05 m entre a peca mais externa e a ponta da mesa nos dois lados (era
  // assim antes: 1,5 m do centro ao z0/z1, menos 0,45 m de meia-estacao). Os
  // 3 vaos entre estacoes encolhem de 2,5 m para (8,8 - 3,0)/3 = 1,93 m; a
  // largura de cada estacao (d = 0,45 m) nao muda, e' do objeto, nao da mesa.
  const c = [-5.5, -7.43, -9.37, -11.3], d = 0.45, out = [];
  for (const z of c) out.push(z + d, z - d);
  return out;
})();

/** Os .glb, na mesma ordem de EST. [arquivo, maior dimensão em metros]. */
export const PECAS = [
  ['cement-powders-4.glb',             0.95],
  ['radipacifier-5-10-15g.glb',        0.85],
  ['capsulas-cement-a-b.glb',          0.52],
  ['ca3sio5-discs-different sizes.glb',1.05],
  ['falcon-50ml-rack.glb',             0.80],
  ['digital-clocks-24-72-120h.glb',    1.05],
  ['proliferacao-1-3-5-7d.glb',        1.05],
  ['citotoxicidade-24h-4-grupos.glb',  1.05],
];

/** Paradas: [olho x, olho z, alvo x, alvo z, alvo y]. A altura do olho é GEO.eye.
    Entra pelo eixo (a mesa recuando à frente), anda AO LADO da mesa — a câmera não
    atravessa a mesa —, volta ao eixo diante do painel. Na rotunda para a 4,6 m do
    plinto, fora dele (D-211). */
export const PARADAS = (() => {
  const zm = (GEO.mesa.z0 + GEO.mesa.z1)/2, zp = GEO.painel.z, zr = GEO.rot.z;
  return {
    nave: [
      [0,  1.5,  0, zm, 1.20],                                   // 0 · entrada, a mesa inteira
      [0, -1.5,  0, zm, 1.10],                                   // 1 · cabeceira
      ...EST.map((z,i) => [2.3 - i*0.06, z + 2.4, 0, z, 1.02]),  // 2…9 · uma por peça, a ~3,1 m
      /* 10 · diante do monolito, a 3,5 m: cabe inteiro no quadro (3,2 m de altura
         a 3,5 m com o olho a 1,6 -> 2,0 m acima do olho num fov de 60). Era a
         1,8 m e cortava o topo — a Q-312 da M. Absorve o P_PNL local dela. */
      [0, zp + 3.5, 0, zp, 1.75],
    ],
    rotunda: [
      [0,   zr + 10.0, 0, zr, 2.60],   // 0 · entrada da rotunda
      [0,   zr + 7.6,  0, zr, 2.20],   // 1 · a 4,6 m do plinto (D-211)
      [5.6, zr + 5.4,  0, zr, 2.40],   // 2 · arco lateral
      [0,   zr + 7.6,  0, zr, 5.40],   // 3 · o objeto sobre o plinto
      [0,   zr + 7.0,  0, zr, 9.00],   // 4 · para cima, o óculo
    ],
  };
})();

/** Tratamento das superficies cegas (empenas da nave e tambor da rotunda).
    A 10-20 m de distancia textura de superficie nao existe: o que se ve e'
    incidente arquitetonico. Por isso o tratamento e' geometria, nao imagem.
      'liso'   — gesso continuo (o que havia)
      'juntas' — rasgo de sombra a cada 2,4 m + rodape negativo (a parede flutua)
      'ripado' — 'juntas' + ripas verticais de carvalho no tambor e nas empenas
      'pedra'  — NAVE INTEIRA e tambor em travertino aparelhado, fiada a cada 1,2 m
      'pedra-clara' — a mesma pedra lavada: 55% de croma a menos e L 208->223.
                 Medido: o travertino nao e' escuro (L 208 contra 232 do gesso),
                 ele e' QUENTE. Clarear de verdade e' tirar amarelo, nao so' brilho.
      'pedra-mista' — igual, mas os montantes entre as janelas ficam em gesso
                 branco: sao eles que desenham as faixas de luz no chao.
                 Dentro da rotunda a luz e' quase toda difusa (o sol entra pelo
                 oculo e cai no chao, nao na parede): relevo branco sobre branco
                 nao gera sombra nenhuma. O que le' ali e' TOM, nao relevo.
    Escolha do Vinicius; muda em opts.parede. */
export const PAREDES = ['liso', 'juntas', 'ripado', 'pedra', 'pedra-clara', 'pedra-mista'];

/** A luz aprovada. A montagem pode sobrepor com aplicarLuz(). */
export const LUZ_PADRAO = {
  sunEl: 56, sunAz: 116, sun: 3.4, sunC: '#ffeed6',
  /* O segundo sol, so' da rotunda. Mais baixo e girado para que o feixe do
     oculo bata na parede que o espectador encara, e mais fraco que o da nave
     para a mancha nao estourar em branco. */
  sunElRot: 32, sunAzRot: 340, sunRot: 2.3,
  skyT: '#7fa9cd', skyH: '#f6ebd8', env: 0.92,
  exp: 0.72, sombras: true,
  cPar: '#ffffff', cCha: '#ffffff', cMad: '#ffffff',
};

/** Quantos metros de mundo cabem num lado de cada textura. */
export const METROS = { oak:1.20, pedra:2.00, gesso:2.00, metal:0.25, papel:0.60, vidro:1.50,
  /* A pedra de parede anda no passo da fiada (1,20 m): uma repeticao da imagem
     = uma fiada de pedra, entao a emenda do ladrilho cai sempre numa junta
     desenhada. A do chao fica em 2,00 m, que e' o passo da junta do piso. */
  pedraPar:1.20 };
/** Tamanho da mancha da variacao macro, em metros. Quanto maior, mais lenta a
    ondulacao de tom — e e' ela que apaga a leitura de 'mesmo azulejo'. */
export const MACRO_M = 14.0;

/* ---------- 2. CONSTRUÇÃO ---------------------------------------------------- */
export async function construirCenario(scene, renderer, opts = {}) {
  const TEX = opts.tex || new URL('../tex/', import.meta.url).href;
  const GBL = opts.gbl || new URL('../../GBL/', import.meta.url).href;
  const L   = { ...LUZ_PADRAO, ...(opts.luz || {}) };
  const tipoParede = opts.parede || 'pedra';
  const ehPedra = tipoParede.startsWith('pedra');
  const nPedra = (tipoParede === 'pedra-clara') ? 'pedraclara' : 'pedra';

  /* --- 2.1 texturas ------------------------------------------------------- */
  const TL = new THREE.TextureLoader();
  const carrega = (f, srgb) => {
    const t = TL.load(TEX + f);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const jogo = n => ({ map: carrega(n+'_color.jpg', true), rgh: carrega(n+'_rough.jpg'), nrm: carrega(n+'_normal.png') });
  const T = { oak: jogo('oak'), pedra: jogo('pedra'), gesso: jogo('gesso'),
              metal: jogo('metal'), papel: jogo('papel'), vidro: carrega('vidro_rough.jpg') };
  /* A pedra da parede. Na versao clara so' o albedo muda — rugosidade e normal
     sao os mesmos do travertino natural, entao isto nao custa memoria nenhuma
     no Quest alem de um mapa de cor. */
  /* As seis variantes da mesma pedra. Medidas uma a uma e casadas em L*a*b*
     (media, contraste e escala de grao dentro de +-1) — e' o casamento que faz
     a troca de laje passar despercebida, nao a beleza de cada imagem. */
  T.pedraVar = [1,2,3,4,5,6].map(i => jogo('pedra_v' + i));

  T.pedraP = (nPedra === 'pedraclara')
    ? { map: carrega('pedraclara_color.jpg', true), rgh: T.pedra.rgh, nrm: T.pedra.nrm }
    : T.pedra;

  /* Mapa de variacao macro: ruido de valor em tres oitavas, costurado por
     construcao (o indice da grade e' tomado modulo N, entao as bordas casam).
     Cinza medio 0,5; o shader converte para um fator de tom perto de 1. */
  const MACROTEX = (() => {
    const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
    let se = 987654321;
    const rnd = () => { se = (se*1664525 + 1013904223) >>> 0; return se/4294967296; };
    const oitava = (g) => {                       // grade g x g, interpolada
      const v = new Float32Array(g*g);
      for (let i = 0; i < g*g; i++) v[i] = rnd();
      const su = t => t*t*(3 - 2*t);
      return (u, w) => {
        const fu = u*g, fw = w*g, i0 = Math.floor(fu), j0 = Math.floor(fw);
        const tu = su(fu - i0), tw = su(fw - j0);
        const i1 = (i0+1) % g, j1 = (j0+1) % g, ii = ((i0 % g)+g) % g, jj = ((j0 % g)+g) % g;
        const a = v[jj*g+ii], b = v[jj*g+i1], e = v[j1*g+ii], f = v[j1*g+i1];
        return (a + (b-a)*tu) + ((e + (f-e)*tu) - (a + (b-a)*tu))*tw;
      };
    };
    const o1 = oitava(3), o2 = oitava(7), o3 = oitava(17);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i/N, w = j/N;
      let n = 0.60*o1(u,w) + 0.28*o2(u,w) + 0.12*o3(u,w);
      n = Math.min(1, Math.max(0, n));
      const k = (j*N+i)*4, g = Math.round(n*255);
      d[k] = d[k+1] = d[k+2] = g; d[k+3] = 255;
    }
    x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  })();

  /* Enxerta a variacao macro num material ja' pronto. O shader amostra o mapa
     de macro na MESMA vMapUv do albedo, so' que numa escala muito menor —
     por isso o fator e' metrosDaImagem/MACRO_M. */
  let _nMacro = 0;
  const comMacro = (m, metrosImagem, forca = 0.13) => {
    const esc = metrosImagem / MACRO_M, id = 'macro' + (_nMacro++);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uMac = { value: MACROTEX };
      sh.uniforms.uMacE = { value: esc };
      sh.uniforms.uMacF = { value: forca };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>',
                 '#include <common>\nuniform sampler2D uMac;\nuniform float uMacE;\nuniform float uMacF;')
        .replace('#include <map_fragment>',
                 '#include <map_fragment>\n\t{ float mk = texture2D(uMac, vMapUv*uMacE).r;'
                 + ' diffuseColor.rgb *= (1.0 - uMacF) + 2.0*uMacF*mk; }');
    };
    m.customProgramCacheKey = () => id;
    return m;
  };

  /* A variacao macro em coordenada de MUNDO. Amostrada na UV da laje ela
     ficaria igual em todas as lajes — viraria o proprio padrao que existe para
     apagar. Em mundo, a mancha atravessa lajes e objetos: e' como pedra de
     verdade se comporta. A projecao escolhe o par de eixos pela normal
     (triplanar simplificado), entao serve para chao e parede com o mesmo codigo. */
  const comMacroMundo = (m, forca = 0.13) => {
    const id = 'macroW' + (_nMacro++);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uMac = { value: MACROTEX };
      sh.uniforms.uMacE = { value: 1.0/MACRO_M };
      sh.uniforms.uMacF = { value: forca };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPmu;\nvarying vec3 vNmu;')
        .replace('#include <begin_vertex>',
                 '#include <begin_vertex>\n\tvPmu = (modelMatrix*vec4(position,1.0)).xyz;'
                 + '\n\tvNmu = normalize(mat3(modelMatrix)*normal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>',
                 '#include <common>\nuniform sampler2D uMac;\nuniform float uMacE;\nuniform float uMacF;'
                 + '\nvarying vec3 vPmu;\nvarying vec3 vNmu;')
        .replace('#include <map_fragment>',
                 '#include <map_fragment>\n\t{ vec3 an = abs(normalize(vNmu));'
                 + '\n\t  vec2 uvM = (an.y > 0.5) ? vPmu.xz : ((an.x > an.z) ? vPmu.zy : vPmu.xy);'
                 + '\n\t  float mk = texture2D(uMac, uvM*uMacE).r;'
                 + '\n\t  diffuseColor.rgb *= (1.0 - uMacF) + 2.0*uMacF*mk; }');
    };
    m.customProgramCacheKey = () => id;
    return m;
  };

  /* A DISSOLUCAO do monolito. Um ruido em coordenada de mundo decide, fragmento
     a fragmento, quem ja' foi: abaixo do limiar o fragmento e' descartado, e a
     casca de 6 % logo acima dele acende — e' a borda quente que faz a coisa
     parecer consumida em vez de apagada. uDiss = 0 inteiro, 1 sumiu.
     [NAO VERIFICADO no Quest] A sombra NAO dissolve junto: o mapa de sombra usa
     o material de profundidade, que nao leva este shader. Se incomodar, a M
     desliga castShadow do monolito quando a dissolucao comeca. */
  const comDissolucao = (m) => {
    const id = 'diss' + (_nMacro++);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uMac = { value: MACROTEX };
      sh.uniforms.uDiss = DISS;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPdi;')
        .replace('#include <begin_vertex>',
                 '#include <begin_vertex>\n\tvPdi = (modelMatrix*vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>',
                 '#include <common>\nuniform sampler2D uMac;\nuniform float uDiss;\nvarying vec3 vPdi;')
        .replace('#include <map_fragment>',
                 '#include <map_fragment>\n\t{ float dn = texture2D(uMac, vPdi.xy*0.35 + vPdi.z*0.11).r;'
                 + '\n\t  if (dn < uDiss) discard;'
                 + '\n\t  diffuseColor.rgb = mix(vec3(1.0, 0.86, 0.62), diffuseColor.rgb,'
                 + ' smoothstep(uDiss, uDiss + 0.06, dn)); }');
    };
    m.customProgramCacheKey = () => id;
    return m;
  };

  /** Um material por superfície: cada um com a sua repetição, vinda do tamanho físico. */
  const mat = (t, metros, largura, altura, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, ...extra });
    const rx = largura/metros, ry = altura/metros;
    for (const [k, tex] of [['map',t.map], ['roughnessMap',t.rgh], ['normalMap',t.nrm]]) {
      if (!tex) continue;
      const c = tex.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; m[k] = c;
    }
    return m;
  };

  const N = GEO.nave, V = GEO.vault, M = GEO.mesa, P = GEO.painel, R = GEO.rot;
  const Lnave = N.z0 - N.z1, Lmesa = M.z0 - M.z1, zcN = (N.z0+N.z1)/2, zcM = (M.z0+M.z1)/2;

  const MATS = {
    chao:   comMacro(mat(T.pedra, METROS.pedra, 1, 1, { roughness: 0.62 }), METROS.pedra, 0.15),  // UV em metros, assada na malha
    parede: comMacro(mat(T.gesso, METROS.gesso, Lnave, N.hPar, { roughness: 0.95 }), METROS.gesso, 0.09),
    drum:   mat(T.gesso, METROS.gesso, 2*Math.PI*R.R, R.hPar, { roughness: 0.95, side: THREE.DoubleSide }),
    teto:   mat(T.gesso, METROS.gesso, 2*R.R, 2*R.R, { roughness: 0.95 }),
    /* O veio do carvalho corre no eixo u da imagem (medido: grad_y >> grad_x).
       Cada peca de madeira recebe a repeticao da SUA face — era esse o bug do
       padrao repetido no avental: ele herdava a repeticao do comprimento da mesa. */
    tampo:    mat(T.oak, METROS.oak, METROS.oak, METROS.oak, { roughness: 0.85 }), // UV propria
    mesaBorda: mat(T.oak, METROS.oak, Lmesa, 0.09, { roughness: 0.85 }),  // canto longo do tampo
    mesaPonta: mat(T.oak, METROS.oak, M.w,   0.09, { roughness: 0.85 }),  // topo do tampo
    mesaLado: mat(T.oak, METROS.oak, M.w - 0.36, M.h - 0.09, { roughness: 0.85 }), // cavalete
    ripa:   mat(T.oak, METROS.oak, 0.08, 2.4, { roughness: 0.85 }),
    /* A empena e' ExtrudeGeometry: a UV ja' sai em METROS de mundo, entao a
       repeticao aqui e' 1/METROS e nao o tamanho da face. */
    pedraEmp:  comMacro(mat(T.pedraP, METROS.pedraPar, 1, 1, { roughness: 0.42 }), METROS.pedraPar),
    pedraFlanco: comMacro(mat(T.pedraP, METROS.pedraPar, Lnave, 0.9,  { roughness: 0.42 }), METROS.pedraPar),
    pedraFriso:  comMacro(mat(T.pedraP, METROS.pedraPar, Lnave, 1.1,  { roughness: 0.42 }), METROS.pedraPar),
    pedraMont:   comMacro(mat(T.pedraP, METROS.pedraPar, 0.86, 7.5, { roughness: 0.42 }), METROS.pedraPar),
    pedraDrum: comMacro(mat(T.pedraP, METROS.pedraPar, 2*Math.PI*R.R, R.hPar, { roughness: 0.42, side: THREE.DoubleSide }), METROS.pedraPar),
    sulco:  new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 1.0 }),
    aco:    mat(T.metal, METROS.metal, 0.3, 4, { roughness: 0.35, metalness: 0.72 }),
    papel:  mat(T.papel, METROS.papel, P.campo.w, P.campo.y1 - P.campo.y0, { roughness: 0.93 }),  // o campo, nao o monolito
    plinto: mat(T.pedra, METROS.pedra, 2*Math.PI*R.plR, R.plH, { roughness: 0.32 }),
    tinta:  new THREE.MeshStandardMaterial({ color: 0x003D7C, roughness: 0.5 }),
    branco: new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.9 }),
  };
  /* ---- A PEDRA EM LAJES (D-220) -----------------------------------------
     Um material por variante. A UV de cada laje ja' sai 0..1, entao a repeticao
     do material e' 1x1: a imagem cobre a placa inteira e nao se repete dentro
     dela. Seis materiais -> seis chamadas de desenho para TODA a pedra da cena,
     contra as dezenas de hoje (cada montante e' um objeto). */
  const LAJE = 1.20, LAJE_CHAO = 2.00;
  MATS.pedraVar = T.pedraVar.map(t =>
    comMacroMundo(mat(t, 1, 1, 1, { roughness: 0.42, side: THREE.DoubleSide })));
  /* O chao tem o acabamento dele: mais polido pelo uso (0,62 contra 0,42 da
     parede). Sao mais seis materiais, mas material e' barato perto de perder um
     acabamento que ja' estava certo. */
  MATS.pedraVarChao = T.pedraVar.map(t =>
    comMacroMundo(mat(t, 1, 1, 1, { roughness: 0.62 }), 0.15));
  /* O miolo: o que fica ATRAS do revestimento. Pedra aparelhada de verdade e'
     placa sobre massa; aqui a massa continua sendo a caixa que ja' existia, so'
     que num material liso e barato. Ela ainda faz a sombra e tapa a vista. */
  MATS.pedraBase = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.6 });

  const NVAR = MATS.pedraVar.length;
  /* Dois grupos: 0 = parede, 1 = chao. Cada um com as suas seis variantes. */
  const lote = [Array.from({length: NVAR}, () => []), Array.from({length: NVAR}, () => [])];
  const juntasV = [];                         // as linhas de junta entre placas
  let _sem = 20260916;
  const rnd = () => { _sem = (_sem*1664525 + 1013904223) >>> 0; return _sem/4294967296; };

  /* Uma laje: quad com UV 0..1, posto direto em coordenada de mundo. Alem da
     variante, sorteia-se o espelhamento em u e em v — quatro aparencias por
     imagem, de graca, e espelhar preserva a direcao da estria (horizontal). */
  const _A = new THREE.Vector3(), _B = new THREE.Vector3();
  const poeLaje = (ox,oy,oz, U, V, grupo = 0) => {
    const g = new THREE.BufferGeometry();
    const n = _A.copy(U).cross(V).normalize();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      ox, oy, oz,
      ox+U.x, oy+U.y, oz+U.z,
      ox+U.x+V.x, oy+U.y+V.y, oz+U.z+V.z,
      ox+V.x, oy+V.y, oz+V.z ], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(
      [n.x,n.y,n.z, n.x,n.y,n.z, n.x,n.y,n.z, n.x,n.y,n.z], 3));
    const eu = rnd() > 0.5, ev = rnd() > 0.5;
    const u0 = eu?1:0, u1 = eu?0:1, v0 = ev?1:0, v1 = ev?0:1;
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0,v0, u1,v0, u1,v1, u0,v1], 2));
    g.setIndex([0,1,2, 0,2,3]);
    lote[grupo][(rnd()*NVAR)|0].push(g);
    /* A junta: as duas bordas de entrada da placa (as outras duas sao as bordas
       de entrada da placa vizinha, entao nada e' desenhado duas vezes). Fica
       3 mm a' frente da face para nao brigar no z-buffer. */
    const e = 0.003;
    const ax = ox + n.x*e, ay = oy + n.y*e, az = oz + n.z*e;
    juntasV.push(ax, ay, az,  ax+U.x, ay+U.y, az+U.z);
    juntasV.push(ax, ay, az,  ax+V.x, ay+V.y, az+V.z);
  };

  /* Cobre um retangulo. O passo real e' ajustado para caber um numero INTEIRO
     de lajes: a junta tem de cair na borda da superficie, senao sobra uma tira
     cortada no canto — que e' exatamente o defeito que se quer evitar. */
  const lajear = (ox,oy,oz, ux,uy,uz, vx,vy,vz, passo, grupo = 0) => {
    const U = new THREE.Vector3(ux,uy,uz), V = new THREE.Vector3(vx,vy,vz);
    const P = passo || LAJE;
    const cu = Math.max(1, Math.round(U.length()/P)), cv = Math.max(1, Math.round(V.length()/P));
    const du = U.divideScalar(cu), dv = V.divideScalar(cv);
    for (let i = 0; i < cu; i++) for (let j = 0; j < cv; j++)
      poeLaje(ox + du.x*i + dv.x*j, oy + du.y*i + dv.y*j, oz + du.z*i + dv.z*j, du, dv, grupo);
  };

  /* O tambor: a laje acompanha a curva. Cada uma e' subdividida em tres
     colunas para a curvatura nao facetar, e a normal aponta para dentro. */
  const lajearTambor = (raio, y0, y1, a0, a1, cz) => {
    const cu = Math.max(1, Math.round((a1-a0)*raio/LAJE)), cv = Math.max(1, Math.round((y1-y0)/LAJE));
    const da = (a1-a0)/cu, dy = (y1-y0)/cv, SUB = 3;
    for (let i = 0; i < cu; i++) for (let j = 0; j < cv; j++) {
      const g = new THREE.BufferGeometry(), pos = [], nor = [], uvs = [], idx = [];
      const eu = rnd() > 0.5, ev = rnd() > 0.5;
      for (let k = 0; k <= SUB; k++) {
        const a = a0 + da*(i + k/SUB), sn = Math.sin(a), cs = Math.cos(a);
        let u = k/SUB; if (eu) u = 1-u;
        for (let m = 0; m < 2; m++) {
          const y = y0 + dy*(j + m);
          let v = m; if (ev) v = 1-v;
          pos.push(sn*raio, y, cz + cs*raio);
          nor.push(-sn, 0, -cs);                       // para dentro
          uvs.push(u, v);
        }
      }
      for (let k = 0; k < SUB; k++) {
        const b = k*2;
        idx.push(b, b+1, b+3, b, b+3, b+2);
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor,3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
      g.setIndex(idx);
      lote[0][(rnd()*NVAR)|0].push(g);
      // junta: o prumo de entrada da placa e a fiada de baixo
      const aI = a0 + da*i, sI = Math.sin(aI), cI = Math.cos(aI), rj = raio - 0.004;
      const yA = y0 + dy*j, yB = y0 + dy*(j+1);
      juntasV.push(sI*rj, yA, cz + cI*rj,  sI*rj, yB, cz + cI*rj);
      for (let k = 0; k < SUB; k++) {
        const b1 = a0 + da*(i + k/SUB), b2 = a0 + da*(i + (k+1)/SUB);
        juntasV.push(Math.sin(b1)*rj, yA, cz + Math.cos(b1)*rj,
                     Math.sin(b2)*rj, yA, cz + Math.cos(b2)*rj);
      }
    }
  };

  MATS.vidro = new THREE.MeshStandardMaterial({
    color: 0xeaf2f6, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  { const c = T.vidro.clone(); c.repeat.set(Lnave/METROS.vidro, 6/METROS.vidro); c.needsUpdate = true;
    MATS.vidro.roughnessMap = c; }                                  // poeira e escorrido no vidro

  /* --- 2.2 céu e luz do céu ---------------------------------------------- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top:{value:new THREE.Color(L.skyT)}, hor:{value:new THREE.Color(L.skyH)},
                gnd:{value:new THREE.Color(0xe0d5c2)}, sunDir:{value:new THREE.Vector3(0,1,0)} },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vD; uniform vec3 top,hor,gnd,sunDir;
      void main(){ float h=vD.y;
        vec3 c = h>0.0 ? mix(hor,top,pow(h,0.52)) : mix(hor,gnd,pow(-h,0.42));
        float d=max(dot(normalize(vD),normalize(sunDir)),0.0);
        c += vec3(1.0,0.95,0.86)*pow(d,7.0)*0.16;
        c += vec3(1.0,0.93,0.80)*pow(d,900.0)*6.0;
        gl_FragColor=vec4(c,1.0); }` });
  const skyGeo = new THREE.SphereGeometry(320, 32, 18);
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  /* ARMADILHA: fromScene() tem far=100 por padrão e o domo está a 320 m — sem o
     far explícito o environment sai PRETO e toda superfície vertical fica escura. */
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  const refazerEnv = () => { if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.03, 0.5, 900); scene.environment = envRT.texture; };

  const sol = new THREE.DirectionalLight(0xfff3e0, L.sun);
  sol.castShadow = true; sol.shadow.mapSize.set(opts.sombraHQ ? 3072 : 2048, opts.sombraHQ ? 3072 : 2048);
  sol.shadow.camera.near = 1; sol.shadow.camera.far = 170;
  sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.05;
  scene.add(sol, sol.target);
  const preencher = new THREE.HemisphereLight(0xdfeaf2, 0xe9e2d5, 0.25);
  scene.add(preencher);
  const dir = (el, az) => { el *= Math.PI/180; az *= Math.PI/180;
    return new THREE.Vector3(Math.cos(el)*Math.sin(az), Math.sin(el), Math.cos(el)*Math.cos(az)); };
  const dirSol = () => dir(L.sunEl, L.sunAz);

  /* CAMADA 2 = sol da nave, CAMADA 1 = sol da rotunda. O renderer compara a
     camada da LUZ com a da CAMERA (nao com a do objeto): uma luz esta' ligada
     ou desligada para o quadro inteiro. Entao acende-se o sol da sala em que a
     camera esta', e a troca cai na soleira do portal. Ver luzDaSala(). */
  const CAM_NAVE = 2, CAM_ROT = 1;
  const solRot = new THREE.DirectionalLight(0xfff3e0, L.sunRot);
  solRot.castShadow = true;
  solRot.shadow.mapSize.set(opts.sombraHQ ? 3072 : 2048, opts.sombraHQ ? 3072 : 2048);
  solRot.shadow.camera.near = 1; solRot.shadow.camera.far = 220;
  solRot.shadow.bias = -0.0006; solRot.shadow.normalBias = 0.05;
  { const sc = solRot.shadow.camera; sc.left = -15; sc.right = 15; sc.top = 16; sc.bottom = -16;
    sc.updateProjectionMatrix(); }
  solRot.layers.set(CAM_ROT); solRot.target.layers.set(CAM_ROT);
  sol.layers.set(CAM_NAVE);   sol.target.layers.set(CAM_NAVE);
  scene.add(solRot, solRot.target);

  /* --- 2.3 geometria ------------------------------------------------------ */
  const mundo = new THREE.Group(); scene.add(mundo);
  const caixa = (w,h,d,m,x,y,z,sombra=true) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m);
    o.position.set(x,y,z); o.castShadow = sombra; o.receiveShadow = true; mundo.add(o); return o; };

  /* O chao e' um so' visualmente, mas precisa de duas malhas: a da nave recebe
     o sol A, a da rotunda recebe o sol C. A emenda cai exatamente na soleira
     do portal, onde a junta do piso ja' existe — nao se ve'. */
  /* Coordenada PAR, de proposito: as bordas do plano caem na grade de 2,00 m
     das juntas do piso, entao uma repeticao da textura = uma placa desenhada.
     -40 fica dentro da espessura do portal (-39,0 a -40,35), nao se ve'. */
  const ZCORTE = N.z1 - 1;                 // dentro da espessura do portal
  if (ehPedra) {
    /* O chao vira mosaico de lajes de 2,00 m — o mesmo passo da junta que ja'
       era desenhada. Agora a junta E' a borda da placa, entao a coincidencia e'
       exata por construcao e nao por ajuste de numero. */
    lajear(-35, 0, 37,  70,0,0,  0,0,-150, LAJE_CHAO, 1);
  } else {
    for (const [comp, zc] of [[37 - ZCORTE, (37 + ZCORTE)/2], [ZCORTE + 113, (ZCORTE - 113)/2]]) {
      const g = new THREE.PlaneGeometry(70, comp); g.rotateX(-Math.PI/2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i)*70, uv.getY(i)*comp);
      uv.needsUpdate = true;
      const o = new THREE.Mesh(g, MATS.chao); o.position.set(0, 0, zc);
      o.receiveShadow = true; mundo.add(o);
    }
  }

  // juntas do piso a cada 2,0 m — so' no modo sem pedra: com pedra, a junta ja'
  // e' a borda da placa e sai desenhada junto com ela (ver juntasV)
  if (!ehPedra) { const junta = new THREE.MeshBasicMaterial({ color: 0xd9d2c6, transparent: true, opacity: 0.5,
      depthWrite: false, toneMapped: false });
    const gj = new THREE.BufferGeometry(), v = [];
    for (let x = -34; x <= 34; x += 2) v.push(x,0.004,-113, x,0.004,37);
    for (let z = -113; z <= 37; z += 2) v.push(-34,0.004,z, 34,0.004,z);
    gj.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
    const lj = new THREE.LineSegments(gj, junta); lj.renderOrder = 1; mundo.add(lj); }

  // laterais da nave: base, friso e os montantes entre as janelas altas.
  // São os montantes que desenham as faixas de luz no chão — o carácter do espaço.
  for (const sx of [-1, 1]) {
    const semLiso = tipoParede !== 'liso';
    const matMassa = ehPedra ? MATS.pedraBase : MATS.parede;
    const matMont  = ehPedra ? MATS.pedraBase : MATS.parede;
    const hBase = semLiso ? 0.9 : 1.0, yBase = semLiso ? 0.55 : 0.5;
    caixa(0.5, hBase, Lnave, matMassa, sx*(N.hx+0.25), yBase, zcN);
    caixa(0.5, 1.1, Lnave, ehPedra ? MATS.pedraBase : MATS.parede, sx*(N.hx+0.25), 8.45, zcN);
    const nMont = Math.floor((Lnave - 0.6 - 0.43)/2.85) + 1;   // so' os que cabem na nave
    for (let k = 0; k < nMont; k++)
      caixa(0.52, 7.5, 0.86, matMont, sx*(N.hx+0.25), 4.75, N.z0 - 0.6 - k*2.85);
    /* O revestimento: placas de 1,20 m sobre a massa, 3 mm a' frente para nao
       brigar no z-buffer. So' nas faces que se veem — por tras nao ha' pedra,
       como numa obra de verdade. */
    if (ehPedra) {
      /* A face que se ve' e' a mais proxima do centro da nave, e o revestimento
         fica 3 mm A' FRENTE dela — ou seja, deslocado PARA o centro, que e'
         -sx. O flanco tem 0,50 de largura (meia: 0,25) e o montante 0,52
         (meia: 0,26); errar essa meia-largura poe a placa dentro da massa e
         ela some, que foi o que aconteceu na primeira passada. */
      const e = 0.003;
      const xF = sx*(N.hx - e);                              // face interna do flanco
      const xc = sx*(N.hx + 0.25);                           // eixo dos montantes
      const xM = sx*(N.hx - 0.01 - e);                       // face interna do montante
      const dz = -sx;
      lajear(xF, yBase - hBase/2, zcN + dz*Lnave/2,  0,0,-dz*Lnave,  0,hBase,0);
      lajear(xF, 8.45 - 0.55,     zcN + dz*Lnave/2,  0,0,-dz*Lnave,  0,1.1,0);
      for (let k = 0; k < nMont; k++) {
        const zc = N.z0 - 0.6 - k*2.85;
        lajear(xM, 1.0, zc + dz*0.43,  0,0,-dz*0.86,  0,6.5,0);              // face interna
        /* as duas ilhargas: a normal tem de sair de cada uma para o seu lado,
           senao a placa recebe a luz pelas costas */
        lajear(xc + 0.26, 1.0, zc - 0.43 - e,  -0.52,0,0,  0,6.5,0);         // normal -z
        lajear(xc - 0.26, 1.0, zc + 0.43 + e,   0.52,0,0,  0,6.5,0);         // normal +z
      }
    }
    const gg = new THREE.PlaneGeometry(Lnave, 7.4);
    const m = new THREE.Mesh(gg, MATS.vidro); m.rotation.y = sx*Math.PI/2;
    m.position.set(sx*(N.hx+0.02), 4.7, zcN); mundo.add(m);
  }
  /* ---- as empenas: LUNETA, e nao retangulo --------------------------------
     O erro anterior era arquitetonico, nao de textura: a empena era uma laje
     retangular de 13,4 m atras de uma abobada de 13 m. Dai o 'quadrado com uma
     abobada atras' — os cantos da laje apareciam para fora da curva e o topo
     cruzava as nervuras. Agora a empena e' recortada pelo MESMO raio e pelo
     MESMO centro da abobada (V.R, V.yc), entao o encontro e' exato: a curva da
     parede E' a curva da casca. Chanfro de 1,5 cm em todas as arestas de brinde. */
  const matEmp = ehPedra ? MATS.pedraEmp : MATS.parede;
  const arcoY  = x => V.yc + Math.sqrt(Math.max(0, V.R*V.R - x*x));
  const PORTAL = { w: 5.0, h: 6.0, d: 1.35 };      // vão que liga a nave à rotunda

  const extrude = (forma, prof, z) => {
    const g = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: true,
      bevelThickness: 0.015, bevelSize: 0.015, bevelOffset: 0, bevelSegments: 1 });
    const o = new THREE.Mesh(g, matEmp);
    o.position.z = z; o.castShadow = o.receiveShadow = true; mundo.add(o); return o;
  };
  const arcoAte = (sh, x0, x1) => {               // percorre o arco de x0 a x1
    const n = 40;
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0)*i/n; sh.lineTo(x, arcoY(x)); }
  };

  /* Empena de tras: a FACHADA. Era luneta cheia — parede macica do chao ao
     arco — e por isso o espectador aparecia num espaco sem entrada: olhando
     para tras nao havia porta nenhuma por onde ele pudesse ter vindo. Agora tem
     o vao (6,0 x 7,0, maior que o do fundo porque este e' a fachada) e um oculo
     acima dele. Mesma tecnica da empena do fundo: duas ombreiras e uma verga —
     o oculo e' um furo na verga, que o ExtrudeGeometry aceita em holes. */
  const ENTR = { w: 6.0, h: 7.0, ocY: 9.8, ocR: 1.6 };
  { const w = ENTR.w/2, esp = 0.5;
    for (const sx of [-1, 1]) {                       // as duas ombreiras
      const sh = new THREE.Shape();
      sh.moveTo(sx*N.hx, 0); sh.lineTo(sx*w, 0); sh.lineTo(sx*w, arcoY(w));
      arcoAte(sh, sx*w, sx*N.hx); sh.lineTo(sx*N.hx, 0);
      extrude(sh, esp, N.z0);
    }
    const v = new THREE.Shape();                      // a verga, com o oculo
    v.moveTo(-w, ENTR.h); v.lineTo(w, ENTR.h); v.lineTo(w, arcoY(w));
    arcoAte(v, w, -w); v.lineTo(-w, ENTR.h);
    const oc = new THREE.Path();
    oc.absarc(0, ENTR.ocY, ENTR.ocR, 0, Math.PI*2, true);
    v.holes.push(oc);
    extrude(v, esp, N.z0);
  }

  // empena do fundo: duas ombreiras e uma verga, o vão de 5,0 × 6,0 no meio
  { const w = PORTAL.w/2;
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(sx*N.hx, 0); sh.lineTo(sx*w, 0); sh.lineTo(sx*w, arcoY(w));
      arcoAte(sh, sx*w, sx*N.hx); sh.lineTo(sx*N.hx, 0);
      extrude(sh, PORTAL.d, N.z1 - PORTAL.d);
    }
    const v = new THREE.Shape();
    v.moveTo(-w, PORTAL.h); v.lineTo(w, PORTAL.h); v.lineTo(w, arcoY(w));
    arcoAte(v, w, -w); v.lineTo(-w, PORTAL.h);
    extrude(v, PORTAL.d, N.z1 - PORTAL.d);
  }

  /* Tratamento das superficies cegas. O que da' carater a 10-20 m e' ritmo e
     sombra — a mesma logica das juntas do chao, que ja' funcionam. */
  if (tipoParede !== 'liso') {
    // rodape negativo nas ilhargas: a parede nao encosta no chao, flutua 8 cm
    for (const sx of [-1, 1])
      caixa(0.07, 0.09, Lnave, MATS.sulco, sx*(N.hx + 0.02), 0.045, zcN, false);
    // rasgos verticais nas empenas: acompanham a luneta, param sob o arco
    const rasgo = (z) => {
      for (const x of [-6.0, -4.6, -3.2, 3.2, 4.6, 6.0])
        caixa(0.06, arcoY(x) - 0.5, 0.035, MATS.sulco, x, 0.2 + (arcoY(x) - 0.5)/2, z, false);
    };
    if (!ehPedra) { rasgo(N.z0 - 0.02); rasgo(N.z1 + 0.02); }  // na pedra quem desenha e' a fiada
  }
  if (ehPedra) {
    /* Fiada a cada 1,2 m. Linha, nao relevo — e' o que le' em luz difusa. */
    const lm = new THREE.LineBasicMaterial({ color: tipoParede === 'pedra-clara' ? 0xb9b4ab : 0xa79a86, transparent: true, opacity: 0.55,
      depthWrite: false, toneMapped: false });
    const lv = [];
    for (const z of [N.z0 - 0.01, N.z1 + 0.01])
      for (let y = 1.2; y <= 12.9; y += 1.2) {
        // a fiada acompanha a luneta: só existe onde há parede
        const xm = (y > V.yc) ? Math.sqrt(Math.max(0, V.R*V.R - (y - V.yc)**2)) : N.hx;
        const x1 = Math.min(N.hx, xm);
        if (x1 < 0.2) continue;
        if (z === N.z1 + 0.01 && y < PORTAL.h) {   // no fundo o meio é o vão
          lv.push(-x1, y, z, -PORTAL.w/2, y, z); lv.push(PORTAL.w/2, y, z, x1, y, z);
        } else lv.push(-x1, y, z, x1, y, z);
      }
    for (const x of [-4.6, -3.2, 3.2, 4.6])                    // juntas de prumo
      lv.push(x, 0, N.z1 + 0.01, x, arcoY(x) - 0.3, N.z1 + 0.01);
    // fiada de prumo nos flancos, a cada 2,85 m (o ritmo dos montantes)
    for (const sx of [-1, 1]) {
      for (let z = N.z0 - 0.6; z > N.z1; z -= 2.85) {
        lv.push(sx*(N.hx - 0.005), 0.12, z, sx*(N.hx - 0.005), 1.0, z);
        lv.push(sx*(N.hx - 0.005), 7.92, z, sx*(N.hx - 0.005), 8.98, z);
      }
      lv.push(-0 + sx*(N.hx - 0.005), 0.55, N.z0, sx*(N.hx - 0.005), 0.55, N.z1);
    }
    const gl3 = new THREE.BufferGeometry();
    gl3.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
    const ls3 = new THREE.LineSegments(gl3, lm); ls3.renderOrder = 1; mundo.add(ls3);
  }
  if (tipoParede === 'ripado') {
    // ripas verticais de carvalho ladeando o vao do fundo — instanciadas, 1 draw call
    const gr = new THREE.BoxGeometry(0.14, 8.4, 0.10), passo = 0.30;
    const nL = Math.floor(4.6 / passo), inst = new THREE.InstancedMesh(gr, MATS.ripa, nL*2);
    inst.castShadow = inst.receiveShadow = true;
    const m4 = new THREE.Matrix4();
    for (let sI = 0; sI < 2; sI++) for (let i = 0; i < nL; i++) {
      const sx = sI ? 1 : -1;
      m4.makeTranslation(sx*(2.3 + i*passo), 4.3, N.z1 + 0.06);
      inst.setMatrixAt(sI*nL + i, m4);
    }
    inst.instanceMatrix.needsUpdate = true; mundo.add(inst);
  }

  /* A abobada. O vidro so' entra quando pedido (opts.vidro) — sem ele a
     estrutura pode ser julgada sozinha, que e' o ponto agora.

     A NERVURA passa a ter PERFIL. Era um tubo de 0,085 m de raio: 17 cm num vao
     de 14 m, que a 13 m de altura subtende quase nada e le' como linha riscada.
     Pior, tubo redondo nao tem face plana — nao faz sombra propria, e e' a
     sombra que da' peso. Agora e' um I: alma de 45 cm, mesas de 30 x 6 cm, que
     e' a ordem de grandeza que uma nervura desse vao teria de verdade. */
  { if (opts.vidro) {
      const casca = new THREE.CylinderGeometry(V.R, V.R, Lnave, 64, 1, true, Math.PI - V.half, 2*V.half);
      casca.rotateX(Math.PI/2);
      const m = new THREE.Mesh(casca, MATS.vidro); m.position.set(0, V.yc, zcN); mundo.add(m);
    }

    const ALMA = 0.45, ESPA = 0.05, MESA = 0.30, ESPM = 0.06;
    /* A secao do I, no plano (radial, z), em volta do eixo do arco. Doze
       vertices, percorridos numa volta so' — a costura ao longo do arco fecha
       o perfil inteiro sem tampa lateral nenhuma. */
    const A = ALMA/2, Me = ESPM, E = ESPA/2, M = MESA/2;
    const SEC = [[-A,-M],[-A,M],[-A+Me,M],[-A+Me,E],[A-Me,E],[A-Me,M],
                 [A,M],[A,-M],[A-Me,-M],[A-Me,-E],[-A+Me,-E],[-A+Me,-M]];
    const NP = 24, nerv = [];
    const nVao = Math.max(4, Math.round(Lnave/3));           // nervura a cada ~3 m
    for (let k = 0; k <= nVao; k++) {
      const zc = N.z0 - k*(Lnave/nVao);
      const pos = [], idx = [];
      for (let i = 0; i <= NP; i++) {
        const th = -V.half + (2*V.half)*i/NP, sn = Math.sin(th), cs = Math.cos(th);
        for (const [dr, dz] of SEC) {
          const r = V.R + dr;
          pos.push(sn*r, V.yc + cs*r, zc + dz);
        }
      }
      const n = SEC.length;
      for (let i = 0; i < NP; i++) for (let j = 0; j < n; j++) {
        const a = i*n + j, b = i*n + (j+1)%n, c = (i+1)*n + (j+1)%n, d = (i+1)*n + j;
        idx.push(a,b,c, a,c,d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      nerv.push(g);
    }
    { const g = mergeGeometries(nerv, false);
      const o = new THREE.Mesh(g, MATS.aco);
      o.castShadow = true; o.receiveShadow = true; mundo.add(o);
      nerv.length = 0; }

    // longarinas: caixao de 12 x 22 cm, nao vareta de 11 cm
    for (let k = -3; k <= 3; k++) {
      const th = k*(V.half/3.4);
      const o = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, Lnave), MATS.aco);
      o.rotation.z = -th;                       // a altura do caixao aponta no raio
      o.position.set(V.R*Math.sin(th), V.yc + V.R*Math.cos(th), zcN);
      o.castShadow = true; mundo.add(o);
    } }

  /* A mesa. Uma mesa de 24 m e' feita de TABUAS, e e' isso que salva a textura:
     seis reguas no sentido do comprimento, cada uma cortada em pecas de ~2,8 m
     com emendas desencontradas, e cada peca leva o seu proprio pedaco da imagem
     (deslocamento e espelho sorteados). O padrao nunca se repete lado a lado.
     Uma geometria, um draw call, uma textura — nada mais pesado do que antes. */
  {
    const NB = 6, larg = M.w / NB, mt = METROS.oak;
    const pos = [], uv = [], nor = [];
    let semente = 20260916;
    const sorteio = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 4294967296; };
    for (let c = 0; c < NB; c++) {
      const x0 = -M.w/2 + c*larg, x1 = x0 + larg;
      let z = M.z0 - sorteio()*1.8;                       // emenda inicial desencontrada
      if (z < M.z0 - 0.01) {                              // primeiro pedaco curto, ate a emenda
        empurra(x0, x1, M.z0, z);
      }
      while (z > M.z1) {
        const zn = Math.max(M.z1, z - (2.2 + sorteio()*1.4));
        empurra(x0, x1, z, zn); z = zn;
      }
    }
    function empurra(x0, x1, za, zb) {
      const ou = sorteio(), ov = sorteio(), esp = sorteio() > 0.5 ? -1 : 1;
      // veio ao longo de u -> u mapeia o comprimento (z), v mapeia a largura (x)
      const u0 = ou, u1 = ou + (za - zb)/mt*esp, v0 = ov, v1 = ov + (x1 - x0)/mt;
      const q = [[x0, za, u0, v0], [x1, za, u0, v1], [x1, zb, u1, v1], [x0, zb, u1, v0]];
      for (const [a, b, c2] of [[0,1,2], [0,2,3]]) for (const k of [a,b,c2]) {
        pos.push(q[k][0], M.h + 0.0012, q[k][1]); uv.push(q[k][2], q[k][3]); nor.push(0,1,0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
    const tampo = new THREE.Mesh(g, MATS.tampo);
    tampo.receiveShadow = true; mundo.add(tampo);
    /* As emendas. Sem elas o tampo vira uma prancha unica de 24 m — o que nao
       existe. E' a mesma receita das juntas do chao, que ja' funcionam: linha
       fina, escura, desenhada como geometria e nao pintada na textura. */
    { const gl2 = new THREE.BufferGeometry(), lv = [];
      for (let i = 0; i < pos.length; i += 18) {                 // 2 triangulos = 1 peca
        const xa = pos[i], xb = pos[i+3], za = pos[i+2], zb = pos[i+11];
        lv.push(xa, M.h+0.0018, za, xa, M.h+0.0018, zb);         // lado esquerdo
        lv.push(xb, M.h+0.0018, za, xb, M.h+0.0018, zb);         // lado direito
        lv.push(xa, M.h+0.0018, za, xb, M.h+0.0018, za);         // topo (emenda de topo)
      }
      gl2.setAttribute('position', new THREE.Float32BufferAttribute(lv, 3));
      const lm = new THREE.LineBasicMaterial({ color: 0x8a6f4c, transparent: true, opacity: 0.42,
        depthWrite: false, toneMapped: false });
      const ls = new THREE.LineSegments(gl2, lm); ls.renderOrder = 1; mundo.add(ls); }
    // corpo do tampo: cada face com a repeticao da propria face (px,nx,py,ny,pz,nz)
    const B = MATS.mesaBorda, Pt = MATS.mesaPonta;
    const laje = new THREE.Mesh(new THREE.BoxGeometry(M.w, 0.09, Lmesa), [B,B,B,B,Pt,Pt]);
    laje.position.set(0, M.h - 0.045, zcM); laje.castShadow = laje.receiveShadow = true; mundo.add(laje);
    // cavaletes
    for (const z of [M.z0-1.6, zcM, M.z1+1.6])
      caixa(M.w-0.36, M.h-0.09, 0.44, MATS.mesaLado, 0, (M.h-0.09)/2, z);
  }

  /* A FAIXA flutuante da legenda de narracao (D-225). Corpo em MOLDURA de
     quatro barras, nao ExtrudeGeometry: o carvalho precisa da UV propria por
     face — foi esse o bug do avental em D-220 — e a moldura da' isso de
     graca, como mesaBorda/mesaLado. Mesmo T.oak do tampo, nenhuma textura
     nova. Rebaixo de 8 mm com placa de fundo (miolo barato, nao se ve'), sem
     mecanismo de dissolucao: so' liga e desliga com faixaMostrar(). Comeca
     escondida e numa posicao provisoria — a M poe onde precisar antes de
     chamar faixaMostrar(true). */
  const faixa = new THREE.Group(); faixa.visible = false;
  { const F = GEO.faixa, mgX = (F.w - F.campo.w)/2, mgY = (F.h - F.campo.h)/2;
    const cx = (F.campo.w + F.w)/4, cy = (F.campo.h + F.h)/4, REB = 0.008;
    const barra = (w,h,x,y,m) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, F.d), m);
      o.position.set(x, y, 0); o.castShadow = o.receiveShadow = true; faixa.add(o);
    };
    MATS.faixaTB = mat(T.oak, METROS.oak, F.w, mgY, { roughness: 0.85 });        // barras de cima/baixo
    MATS.faixaLR = mat(T.oak, METROS.oak, mgX, F.campo.h, { roughness: 0.85 });  // barras dos lados
    barra(F.w, mgY, 0, cy, MATS.faixaTB); barra(F.w, mgY, 0, -cy, MATS.faixaTB);
    barra(mgX, F.campo.h, cx, 0, MATS.faixaLR); barra(mgX, F.campo.h, -cx, 0, MATS.faixaLR);
    // o miolo atras do rebaixo — sem ele o buraco atravessa a moldura; nao se ve', material barato
    const fundoMat = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.7 });
    const fundo = new THREE.Mesh(new THREE.BoxGeometry(F.campo.w, F.campo.h, F.d - REB), fundoMat);
    fundo.position.set(0, 0, -REB/2); fundo.castShadow = fundo.receiveShadow = true; faixa.add(fundo);
    // o campo: comeca num tom neutro; a M poe a textura do texto em materiais.faixaCampo.map
    MATS.faixaCampo = new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.9 });
    const campo = new THREE.Mesh(new THREE.PlaneGeometry(F.campo.w, F.campo.h), MATS.faixaCampo);
    campo.position.set(0, 0, F.d/2 - REB + 0.002); campo.receiveShadow = true; faixa.add(campo);
  }
  faixa.position.set(0, 1.85, zcM);           // provisorio — a M reposiciona antes de mostrar
  mundo.add(faixa);

  /* O MONOLITO. Era uma lamina de 7 cm com uma folha colada na frente — um
     cartaz, sem peso nenhum, e ainda por cima no eixo, tapando o que esta'
     atras. Agora e' uma estela: pedra da mesma familia dos montantes, 45 cm de
     espessura, embasamento proprio, e o campo de conteudo REBAIXADO de verdade
     (moldura vazada por ExtrudeGeometry, com a placa de fundo atras), entao o
     rebaixo tem ombreira e faz sombra. E ele se dissolve — ver dissolverPainel. */
  const DISS = { value: 0 };
  { const PD = P.d, mgX = (P.w - P.campo.w)/2, mgB = P.campo.y0, mgT = P.h - P.campo.y1;
    const mono = MATS.pedraVar ? MATS.pedraVar[2].clone() : MATS.parede.clone();
    mono.side = THREE.FrontSide; mono.roughness = 0.40;
    comDissolucao(mono);
    const campo = MATS.papel.clone(); comDissolucao(campo);

    // a moldura: retangulo cheio com o campo furado, extrudado para tras
    const sh = new THREE.Shape();
    sh.moveTo(-P.w/2, 0); sh.lineTo(P.w/2, 0); sh.lineTo(P.w/2, P.h);
    sh.lineTo(-P.w/2, P.h); sh.lineTo(-P.w/2, 0);
    const fu = new THREE.Path();
    fu.moveTo(-P.w/2 + mgX, mgB); fu.lineTo(P.w/2 - mgX, mgB);
    fu.lineTo(P.w/2 - mgX, P.h - mgT); fu.lineTo(-P.w/2 + mgX, P.h - mgT);
    fu.lineTo(-P.w/2 + mgX, mgB);
    sh.holes.push(fu);
    /* O rebaixo tem 4 cm, nao a espessura toda: fundo demais viraria um nicho,
       com o conteudo enfiado num buraco e a ombreira jogando sombra por cima
       dele. 4 cm e' o que uma inscricao rebaixada tem — ombreira visivel, uma
       linha de sombra, e nada mais. A massa atras e' macica. */
    const REB = 0.04, zF = P.z + PD/2;               // face da frente
    const gm = new THREE.ExtrudeGeometry(sh, { depth: REB, bevelEnabled: true,
      bevelThickness: 0.006, bevelSize: 0.006, bevelOffset: 0, bevelSegments: 1 });
    const om = new THREE.Mesh(gm, mono);
    om.position.set(0, 0, zF - REB);
    om.castShadow = om.receiveShadow = true; mundo.add(om);

    // o corpo macico, atras da moldura
    const gb = new THREE.BoxGeometry(P.w, P.h, PD - REB);
    const of_ = new THREE.Mesh(gb, mono);
    of_.position.set(0, P.h/2, zF - REB - (PD - REB)/2);
    of_.castShadow = of_.receiveShadow = true; mundo.add(of_);

    /* O campo comeca INVISIVEL: no B0 o monolito e' pedra inteira, e o rebaixo
       mostra a pedra do corpo macico logo atras. O conteudo e' projetado nele so'
       na hora certa (B6) — ver campoPainel(). Quadro branco parado desde o
       comeco anunciaria o que ainda nao foi dito. */
    const gc = new THREE.PlaneGeometry(P.w - 2*mgX, P.h - mgB - mgT);
    const oc2 = new THREE.Mesh(gc, campo);
    oc2.position.set(0, (mgB + P.h - mgT)/2, zF - REB + 0.003);
    oc2.receiveShadow = true; oc2.visible = false; mundo.add(oc2);
    MATS.campoMalha = oc2;

    // embasamento: a estela pousa em alguma coisa, nao brota do chao
    const ob = new THREE.Mesh(new THREE.BoxGeometry(P.w + 0.5, 0.28, PD + 0.5), mono);
    ob.position.set(0, 0.14, P.z);
    ob.castShadow = ob.receiveShadow = true; mundo.add(ob);

    MATS.painelFrente = campo;
    MATS.monolito = mono; }

  // a rotunda
  /* O vão do tambor casa com o portal: a ombreira de pedra encosta na face
     interna do tambor (x = ±2,5 → z = −40,29; a empena vai até −40,35). */
  { const vao = Math.asin(PORTAL.w/2/R.R);
    const parede = new THREE.CylinderGeometry(R.R, R.R, R.hPar, 96, 1, true, vao, 2*Math.PI - 2*vao);
    const o = new THREE.Mesh(parede, ehPedra ? MATS.pedraBase : MATS.drum);
    o.position.set(0, R.hPar/2, R.z); o.castShadow = o.receiveShadow = true; mundo.add(o);
    // revestimento do tambor, 3 cm para dentro da massa
    if (ehPedra) lajearTambor(R.R - 0.03, 0.10, R.hPar - 1.20, vao, 2*Math.PI - vao, R.z);
    /* O tambor liso e' um volume geometrico e nada mais. O que o torna arquitetura
       e' o ritmo vertical batendo contra a espiral horizontal da rampa. */
    if (tipoParede !== 'liso') {
      const sulcoIn = new THREE.MeshStandardMaterial({ color: 0x9a9184, roughness: 1.0, side: THREE.DoubleSide });
      const nF = 24, aro = (raio, alt, y) => {          // aro escuro: rodape e cornija
        const m2 = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, alt, 96, 1, true), sulcoIn);
        m2.position.set(0, y, R.z); mundo.add(m2); };
      aro(R.R - 0.03, 0.10, 0.05);                      // rodape negativo: o tambor flutua
      aro(R.R - 0.05, 0.09, R.hPar - 1.15);             // rasgo de cornija
      /* Lesenas de gesso com 13 cm de profundidade: sob a luz do oculo elas
         fazem a propria sombra — e' sombra de verdade, nao linha pintada. */
      const gf = new THREE.BoxGeometry(0.30, R.hPar - 1.5, 0.22);
      const fin = new THREE.InstancedMesh(gf, MATS.parede, nF - 1);
      fin.castShadow = fin.receiveShadow = true;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const v3 = new THREE.Vector3(), un = new THREE.Vector3(1,1,1);
      for (let k = 1; k < nF; k++) {
        const th = k * 2*Math.PI/nF, rr = R.R - 0.12;
        e.set(0, th, 0); q.setFromEuler(e);
        v3.set(Math.sin(th)*rr, (R.hPar - 1.5)/2 + 0.12, R.z + Math.cos(th)*rr);
        fin.setMatrixAt(k - 1, m4.compose(v3, q, un));
      }
      fin.visible = !ehPedra;   // em pedra quem desenha e' a fiada
      fin.instanceMatrix.needsUpdate = true; mundo.add(fin);
    }
    if (ehPedra) {
      const lm2 = new THREE.LineBasicMaterial({ color: tipoParede === 'pedra-clara' ? 0xb9b4ab : 0xa79a86, transparent: true, opacity: 0.55,
        depthWrite: false, toneMapped: false });
      const lv2 = [], rr2 = R.R - 0.02, NS = 96;
      for (let y = 1.2; y <= R.hPar - 1.0; y += 1.2)
        for (let k = 0; k < NS; k++) {
          const t1 = k*2*Math.PI/NS, t2 = (k+1)*2*Math.PI/NS;
          lv2.push(Math.sin(t1)*rr2, y, R.z + Math.cos(t1)*rr2,
                   Math.sin(t2)*rr2, y, R.z + Math.cos(t2)*rr2);
        }
      for (let k = 0; k < 16; k++) {                 // juntas de prumo a cada 22,5°
        const t1 = k*2*Math.PI/16;
        lv2.push(Math.sin(t1)*rr2, 0, R.z + Math.cos(t1)*rr2,
                 Math.sin(t1)*rr2, R.hPar - 1.0, R.z + Math.cos(t1)*rr2);
      }
      const gl4 = new THREE.BufferGeometry();
      gl4.setAttribute('position', new THREE.Float32BufferAttribute(lv2, 3));
      const ls4 = new THREE.LineSegments(gl4, lm2); ls4.renderOrder = 1; mundo.add(ls4);
    }
    if (tipoParede === 'ripado') {
      // tambor ripado em carvalho: a rampa branca passa a' frente de uma parede quente
      const passo = 0.32, nR = Math.round(2*Math.PI*R.R/passo);
      const gr2 = new THREE.BoxGeometry(0.15, R.hPar - 1.6, 0.11);
      const rip = new THREE.InstancedMesh(gr2, MATS.ripa, nR);
      rip.castShadow = rip.receiveShadow = true;
      const m5 = new THREE.Matrix4(), q2 = new THREE.Quaternion(), e2 = new THREE.Euler();
      const v4 = new THREE.Vector3(), un2 = new THREE.Vector3(1,1,1);
      let usados = 0;
      for (let k = 0; k < nR; k++) {
        const th = k * 2*Math.PI/nR;
        if (Math.abs(Math.atan2(Math.sin(th), Math.cos(th))) < vao + 0.04) continue;  // deixa o vao livre
        const rr = R.R - 0.06;
        e2.set(0, th, 0); q2.setFromEuler(e2);
        v4.set(Math.sin(th)*rr, (R.hPar - 1.6)/2 + 0.14, R.z + Math.cos(th)*rr);
        rip.setMatrixAt(usados++, m5.compose(v4, q2, un2));
      }
      rip.count = usados; rip.instanceMatrix.needsUpdate = true; mundo.add(rip);
    }
    // teto com óculo: é o anel que projeta o disco de luz
    const anel = new THREE.RingGeometry(R.ocR, R.R + 0.4, 72, 1); anel.rotateX(Math.PI/2);
    const a = new THREE.Mesh(anel, MATS.teto);
    a.position.set(0, R.hPar, R.z); a.castShadow = a.receiveShadow = true; mundo.add(a);
    /* ---- a rampa em espiral, 1,5 volta ------------------------------------
       Antes era uma fita de papel: superficie unica, sem espessura, comecando
       suspensa a 1,90 m do chao com o corte a' mostra. Era isso que abria o
       rasgo azul no limiar — via-se o INTRADORSO da fita, iluminado so' pelo
       ceu. Agora e' laje: 28 cm de espessura com intradorso proprio, guarda-
       corpo de 12 cm com pingadeira, e o arranque sai do chao. */
    const seg = 300, voltas = 1.5, PAT = 0.70, y0 = 0.10, y1 = 11.4, ri = 8.25, ro = 10.85;
    const ANG = voltas*Math.PI*2 + PAT;          // + 40 graus de patamar no nivel, no fim
    const ESP = 0.28, GCH = 1.02, GCE = 0.12;
    /* AS DUAS PONTAS ACABAM EM ZERO. Nada de bloco cortado no ar: a borda
       interna da fita sai da parede do tambor (largura zero), a laje engrossa
       de 0 ate' 28 cm, o guarda-corpo cresce de 0 ate' 1,02 m — e no fim tudo
       volta a zero e a fita e' reabsorvida pela parede. Uma funcao de cheio k:
       k=0 nas pontas, k=1 no corpo, com entrada suave (smoothstep). */
    const ENT = 0.10, SAI = 0.20;                // fracao do percurso em cada ponta
    const suave = x => { const c = Math.min(1, Math.max(0, x)); return c*c*(3 - 2*c); };
    const P = [], I = [];
    const v = (x,y,z) => { P.push(x,y,z); return P.length/3 - 1; };
    const quad = (a,b,c,d) => { I.push(a,b,c, a,c,d); };
    let ant = null;
    for (let i = 0; i <= seg; i++) {
      const t = i/seg, aa = 0.55 + t*ANG;
      const ts = Math.min(1, t*ANG/(voltas*Math.PI*2));   // para de subir no patamar
      const y = y0 + (y1-y0)*ts;
      const k = Math.min(suave(t/ENT), suave((1 - t)/SAI));   // o cheio da fita
      const riK = ro - (ro - ri)*k;                 // a borda interna sai da parede
      const espK = ESP*k, gchK = GCH*k, gceK = GCE*k;
      const sn = Math.sin(aa), cs = Math.cos(aa);
      const yb = Math.max(0.02, y - espK);
      const A = {
        ti: v(sn*riK, y, cs*riK),        to: v(sn*ro, y, cs*ro),           // topo
        bi: v(sn*riK, yb, cs*riK),       bo: v(sn*ro, yb, cs*ro),          // intradorso
        gi: v(sn*riK, y+gchK, cs*riK),   gj: v(sn*(riK+gceK), y+gchK, cs*(riK+gceK)),
        gk: v(sn*(riK+gceK), y, cs*(riK+gceK)),
      };
      if (ant) {
        quad(ant.gk, A.gk, A.to, ant.to);          // piso (do guarda-corpo à borda)
        quad(A.bi, A.bo, ant.bo, ant.bi);          // intradorso
        quad(ant.to, A.to, A.bo, ant.bo);          // aba externa
        quad(A.ti, ant.ti, ant.bi, A.bi);          // aba interna
        quad(ant.ti, A.ti, A.gi, ant.gi);          // face interna do guarda-corpo
        quad(A.gi, ant.gi, ant.gj, A.gj);          // topo do guarda-corpo
        quad(ant.gj, A.gj, A.gk, ant.gk);          // face externa do guarda-corpo
      }
      ant = A;
    }
    { const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P,3)); g.setIndex(I);
      g.computeVertexNormals();
      MATS.rampa = new THREE.MeshStandardMaterial({
        color: 0xf3efe7, roughness: 0.82, side: THREE.DoubleSide });
      const m = new THREE.Mesh(g, MATS.rampa);
      m.position.z = R.z; m.castShadow = m.receiveShadow = true; mundo.add(m);
      // sem cabeceiras: as pontas tem largura e espessura zero, nao ha' corte
    }
    // plinto com friso de tinta
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(R.plR, R.plR, R.plH, 72), MATS.plinto);
    pl.position.set(0, R.plH/2, R.z); pl.castShadow = pl.receiveShadow = true; mundo.add(pl);
    const fr = new THREE.Mesh(new THREE.CylinderGeometry(R.plR+0.03, R.plR+0.03, 0.11, 72), MATS.tinta);
    fr.position.set(0, 0.055, R.z); fr.castShadow = true; mundo.add(fr); }

  /* --- 2.4 oclusão de contato -------------------------------------------- */
  /* Sombra de sol não é oclusão. Sem esta mancha macia, todo objeto flutua. */
  const AOTEX = (() => {
    const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), im = x.createImageData(n,n), d = im.data;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = i/(n-1)*2-1, v = j/(n-1)*2-1, r = Math.min(1, Math.hypot(u,v));
      const k = (j*n+i)*4; d[k] = d[k+1] = d[k+2] = 0; d[k+3] = Math.pow(1-r, 2.2)*255; }
    x.putImageData(im,0,0);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; })();
  const contato = (w, d2, x, y, z, op) => {
    const g = new THREE.PlaneGeometry(w, d2); g.rotateX(-Math.PI/2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: AOTEX, transparent: true, opacity: op,
      depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.set(x,y,z); m.renderOrder = 2; mundo.add(m); return m; };
  contato(M.w*2.6, Lmesa+3.0, 0, 0.015, zcM, 0.50);
  contato(P.w*2.4, 2.2, 0, 0.015, P.z, 0.55);
  contato(R.plR*3.0, R.plR*3.0, 0, 0.015, R.z, 0.50);

  /* --- 2.5 aplicar a luz -------------------------------------------------- */
  function aplicarLuz(cfg = {}) {
    Object.assign(L, cfg);
    renderer.toneMappingExposure = L.exp;
    renderer.shadowMap.enabled = !!L.sombras;
    sol.intensity = L.sun; sol.color.set(L.sunC); sol.castShadow = !!L.sombras;
    solRot.intensity = L.sunRot; solRot.color.set(L.sunC); solRot.castShadow = !!L.sombras;
    { const d2 = dir(L.sunElRot, L.sunAzRot);
      solRot.target.position.set(0, 0, GEO.rot.z);
      solRot.position.set(d2.x*95, d2.y*95, GEO.rot.z + d2.z*95);
      solRot.target.updateMatrixWorld(); }
    preencher.intensity = 0.22*L.env;
    preencher.groundColor.set(L.cCha === '#ffffff' ? 0xe9e2d5 : L.cCha);
    preencher.color.set(L.skyT);
    skyMat.uniforms.top.value.set(L.skyT);
    skyMat.uniforms.hor.value.set(L.skyH);
    skyMat.uniforms.sunDir.value.copy(dirSol());
    for (const k in MATS) if (MATS[k].isMeshStandardMaterial) MATS[k].envMapIntensity = L.env;
    refazerEnv();
    if (typeof refazerSondas === 'function') refazerSondas();
  }

  /** Move a caixa de sombra com a câmera: 2 cm por texel em vez de 6. Chamar por frame. */
  function seguirSombra(camera) {
    const d = dirSol(), cx = camera.position.x, cz = camera.position.z;
    sol.target.position.set(cx, 0, cz);
    sol.position.set(cx + d.x*70, d.y*70, cz + d.z*70);
    const sc = sol.shadow.camera, meia = opts.sombraHQ ? 16 : 24;
    sc.left = -meia; sc.right = meia; sc.top = meia; sc.bottom = -meia; sc.updateProjectionMatrix();
  }

  /* --- 2.6 as oito peças sobre a mesa ------------------------------------- */
  const loader = new GLTFLoader();
  let pecasHolders = [];   // D-226: referência module-scope para mostrarPeca()/mostrarEstacao()
  async function carregarPecas(aoCarregar) {
    const saida = [];
    for (let i = 0; i < PECAS.length; i++) {
      const [arq, fit] = PECAS[i];
      if (aoCarregar) aoCarregar(i+1, PECAS.length, arq);
      try {
        const gl = await new Promise((res, rej) => loader.load(GBL + arq, g => res(g.scene), undefined, rej));
        const holder = new THREE.Group(), core = new THREE.Group();
        holder.add(core); core.add(gl); gl.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(gl);
        const sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
        gl.position.sub(c);
        core.scale.setScalar(fit / Math.max(sz.x, sz.y, sz.z, 1e-6));
        core.updateMatrixWorld(true);
        core.position.y -= new THREE.Box3().setFromObject(core).min.y;   // assenta no tampo
        holder.position.set(0, GEO.mesa.h, EST[i]);
        holder.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true;
          if (o.material?.isMeshStandardMaterial) o.material.envMapIntensity = L.env; } });
        holder.visible = false;   // D-226: mesa começa vazia — a M revela com mostrarPeca()/mostrarEstacao()
        mundo.add(holder);
        const decal = contato(fit*2.5, fit*2.5, 0, GEO.mesa.h + 0.006, EST[i], 0.42);
        decal.visible = false;
        holder.userData.decal = decal;
        saida.push(holder);
      } catch (e) { console.warn('cenário: não carregou', arq, e); saida.push(null); }
    }
    pecasHolders = saida;
    return saida;
  }

  /* --- 2.5b sondas de ambiente, uma por sala -------------------------------
     Um material com envMap proprio ignora scene.environment. Entao a nave fica
     com a sonda da nave (ve' a abobada de vidro e o ceu) e a rotunda com a da
     rotunda (ve' o oculo e as proprias paredes). O resultado e' gradiente
     vertical de verdade: escuro em baixo, claro perto do oculo — e o metal
     passa a refletir a sala, nao o ceu aberto (era dai o tom azulado). */
  const SONDAS = [
    { em: [0, 4.0, zcN], alvo: ['parede','pedraFlanco','pedraEmp','pedraMont','aco','papel',
                                'tampo','mesaBorda','mesaPonta','mesaLado','ripa','branco',
                                'faixaTB','faixaLR'] },
    { em: [0, 5.0, R.z], alvo: ['drum','pedraDrum','teto','plinto','rampa','tinta'] },
  ];
  const cubeRT = [], cubeCam = [];
  for (let i = 0; i < SONDAS.length; i++) {
    cubeRT[i] = new THREE.WebGLCubeRenderTarget(opts.sombraHQ ? 256 : 128,
      { type: THREE.HalfFloatType });
    cubeCam[i] = new THREE.CubeCamera(0.4, 900, cubeRT[i]);
    cubeCam[i].position.set(...SONDAS[i].em);
    // cada sonda enxerga o sol da sua sala (a camada vai em cada uma das 6 faces)
    for (const c of cubeCam[i].children) c.layers.enable(i === 0 ? CAM_NAVE : CAM_ROT);
    scene.add(cubeCam[i]);
  }
  let sondaRT = [];
  function refazerSondas() {
    // D-231: luzDaSala() baixa a forca de um dos sois perto da soleira; a sonda
    // de cada sala tem de ver o sol dela sempre na forca cheia.
    const iSol = sol.intensity, iRot = solRot.intensity;
    sol.intensity = L.sun; solRot.intensity = L.sunRot;
    try { refazerSondas0(); } finally { sol.intensity = iSol; solRot.intensity = iRot; }
  }
  function refazerSondas0() {
    for (let i = 0; i < SONDAS.length; i++) {
      for (const n of SONDAS[i].alvo) if (MATS[n]) MATS[n].envMap = null;   // nao se auto-reflete
    }
    for (let i = 0; i < SONDAS.length; i++) {
      cubeCam[i].update(renderer, scene);
      if (sondaRT[i]) sondaRT[i].dispose();
      sondaRT[i] = pmrem.fromCubemap(cubeRT[i].texture);
      for (const n of SONDAS[i].alvo) if (MATS[n]) {
        MATS[n].envMap = sondaRT[i].texture; MATS[n].needsUpdate = true; }
    }
  }

  /** Acende o sol da sala onde a camera esta'. Chamar por quadro, junto com
      seguirSombra().

      D-231 — a soleira sem salto de luz. Ate' a D-230 a troca era um corte em
      SOLEIRA (z -17): num quadro o sol da nave apagava e o da rotunda acendia, e
      a mancha do oculo aparecia do nada. Agora ha' uma FAIXA em z na qual os
      dois sois ficam acesos e trocam de forca pela posicao de quem anda:
        sol    = L.sun    * (1 - k)      solRot = L.sunRot * k
        k = smoothstep, 0 no inicio da faixa, 1 no fim (suave nas pontas).
      A faixa (decisao dele, 29/09): comeca 1 m depois de P5 (z -14, a ultima
      parada da nave; ninguem para dentro dela) e termina na face do monolito
      (z -18,6): "a luz tem de chegar antes que a pessoa veja a rotunda
      completamente, quando comecar a atravessar a pedra".
      Custo e travadas: o NUMERO de luzes nao muda nunca durante a peca — os
      dois sois ficam sempre na lista (a camera sempre com as duas camadas), e o
      sol da sala onde a pessoa NAO esta' fica com forca 0 e sem redesenhar a
      sombra (shadow.autoUpdate = false). Mudar o numero de luzes obriga o
      three.js a compilar outra versao dos shaders na hora, e isso trava o quadro
      no Quest — medido: preparar a versao "dois sois" de antemao nao basta,
      porque os materiais da M mudam de estado durante a peca e alguns shaders
      novos ainda nasciam dentro da faixa. Fora da faixa: 1 mapa de sombra por
      quadro, como antes; dentro dela, 2.
      ?soleiraseca na URL (ou opts.soleiraSeca) volta ao corte antigo, identico
      ao de antes da D-231 (uma camada so', um sol so' na lista). */
  const SOLEIRA = N.z1 + 3;                               // o corte antigo (?soleiraseca)
  const SOL_Z0 = N.z1 + 5;                                // -15: 1 m depois de P5 (z -14)
  const SOL_Z1 = GEO.painel.z + GEO.painel.d / 2;         // -18,6: a face do monolito
  const SECA = !!opts.soleiraSeca ||
    (typeof location !== 'undefined' && new URLSearchParams(location.search).has('soleiraseca'));
  const soleira = { z0: SOL_Z0, z1: SOL_Z1, seca: SECA, k: 0 };   // para conferencia
  const SOMBRA_FORA = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(5, 5, 5);   // leva tudo para fora do mapa
  sol.shadow.needsUpdate = solRot.shadow.needsUpdate = true;      // os dois mapas nascem desenhados uma vez
  function luzDaSala(camera) {
    const z = camera.position.z;
    if (SECA) {
      const naRotunda = z < SOLEIRA;
      camera.layers.enable(naRotunda ? CAM_ROT : CAM_NAVE);
      camera.layers.disable(naRotunda ? CAM_NAVE : CAM_ROT);
      sol.intensity = L.sun; solRot.intensity = L.sunRot;
      sol.shadow.autoUpdate = solRot.shadow.autoUpdate = true;
      soleira.k = naRotunda ? 1 : 0;
      return;
    }
    const u = clamp((SOL_Z0 - z) / (SOL_Z0 - SOL_Z1), 0, 1), k = u * u * (3 - 2 * u);
    camera.layers.enable(CAM_NAVE); camera.layers.enable(CAM_ROT);   // sempre as duas: o numero de luzes nao muda
    sol.intensity = L.sun * (1 - k); solRot.intensity = L.sunRot * k;
    sol.shadow.autoUpdate = k < 1;                         // sombra so' de quem ilumina
    solRot.shadow.autoUpdate = k > 0;
    // D-231b — o sol apagado continua na conta do shader, mas a sombra dele
    // aponta para FORA da cena: todo pixel cai fora do mapa e o shader pula a
    // amostragem da sombra (17 leituras) — era o que pesava na rotunda no Quest.
    // Quando o sol volta a acender, o three.js recalcula a matriz no mesmo quadro.
    if (k >= 1) sol.shadow.matrix.copy(SOMBRA_FORA);
    if (k <= 0) solRot.shadow.matrix.copy(SOMBRA_FORA);
    soleira.k = k;
  }

  /* As lajes entram em cena: uma malha por variante. Mesclar aqui e' o que
     transforma alguns milhares de quads em SEIS objetos — a documentacao da
     Meta poe a troca de material e a chamada de desenho como custo maior que
     memoria de textura, e e' esse custo que a mesclagem corta.
     [NAO VERIFICADO no Quest 3S: medido so' no navegador.] */
  MATS.pedraMalhas = [];
  let nLajes = 0;
  if (ehPedra) {
    let nq = 0;
    for (const [grupo, mats] of [[0, MATS.pedraVar], [1, MATS.pedraVarChao]]) {
      for (let i = 0; i < NVAR; i++) {
        if (!lote[grupo][i].length) continue;
        nq += lote[grupo][i].length;
        const g = mergeGeometries(lote[grupo][i], false);
        const o = new THREE.Mesh(g, mats[i]);
        o.castShadow = false; o.receiveShadow = true;     // a massa por tras ja' faz a sombra
        mundo.add(o); MATS.pedraMalhas.push(o);
        lote[grupo][i].length = 0;
      }
    }
    nLajes = nq;
    /* A junta. Linha e nao sulco: sulco custaria geometria em toda borda de
       placa, e a 3 m de distancia os dois leem igual. A cor e' a mesma da
       junta do piso que ja' existia. */
    const gj = new THREE.BufferGeometry();
    gj.setAttribute('position', new THREE.Float32BufferAttribute(juntasV, 3));
    const lj = new THREE.LineSegments(gj, new THREE.LineBasicMaterial({
      color: 0xbdb3a4, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }));
    lj.renderOrder = 1; mundo.add(lj); MATS.juntas = lj;
    juntasV.length = 0;
  }

  /* D-230 — luz assada (ricochete de um salto) nas lajes da rotunda. So' SOMA
     a' luz indireta (D-228): sol e sombra em tempo real ficam como estao.
     Desliga com ?semlightmap na URL ou opts.lightmap = false. Vem antes de
     aplicarLuz() para as sondas de reflexo ja' enxergarem a pedra com ricochete. */
  const semLM = opts.lightmap === false ||
    (typeof location !== 'undefined' && new URLSearchParams(location.search).has('semlightmap'));
  const luzAssada = (ehPedra && !semLM)
    ? await carregarLuzAssada(MATS.pedraMalhas, m => MATS.pedraVar.includes(m.material), GEO, import.meta.url, DISS)
    : null;

  /* D-230 — esperar as texturas antes de fotografar as sondas de reflexo. As imagens
     chegam depois que o codigo acima termina; sem esta espera as sondas saiam com a
     pedra ainda sem imagem, e os reflexos da peca dependiam do tempo de carga (achado
     ao comparar render com e sem luz assada: nave e teto da rotunda mudavam de cor sem
     nenhuma relacao com o lightmap). Teto de 20 s: se algo nao chegar, segue assim mesmo. */
  await (async () => {
    const texs = new Set();
    scene.traverse(o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) for (const k of ['map', 'roughnessMap', 'normalMap']) if (m[k]?.isTexture) texs.add(m[k]); });
    const pronta = t => { const im = t.image; return !!im && ((im.width > 0 && im.height > 0) || !!im.data); };
    const t0 = performance.now();
    while ([...texs].some(t => !pronta(t)) && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 100));
  })();

  aplicarLuz();
  refazerSondas();
  /** A dissolucao do monolito: 0 = inteiro, 1 = sumiu. Quem anima e' a M. */
  const dissolverPainel = t => { DISS.value = Math.min(1, Math.max(0, t)); };

  /** Acende o campo do monolito (o conteudo de B6). Comeca apagado: ate' la' o
      rebaixo e' pedra. */
  const campoPainel = v => { if (MATS.campoMalha) MATS.campoMalha.visible = !!v; };

  /** Mostra ou esconde a faixa de legenda (D-225). Comeca escondida. A M
      reposiciona com faixa.position.set(x,y,z) — e faixa.rotation.y se
      precisar virar — antes de chamar faixaMostrar(true), e troca o texto
      pondo uma textura em materiais.faixaCampo.map (needsUpdate = true). */
  const faixaMostrar = v => { faixa.visible = !!v; };

  /** Revela ou esconde uma das 8 peças da mesa (D-226: a mesa começa vazia).
      i = 0..7, na mesma ordem de PECAS/EST (0=a, 1=b, ... 7=h). Esconde junto
      a mancha de contato no tampo, senão a sombra fica sem o objeto. */
  const mostrarPeca = (i, v) => {
    const h = pecasHolders[i]; if (!h) return;
    h.visible = !!v;
    if (h.userData.decal) h.userData.decal.visible = !!v;
  };

  /** Conveniência: as 8 peças vêm em 4 estações de 2 (EST — cada centro gera
      um par a ±0,45 m). k = 0..3 revela/esconde o par inteiro de uma vez. */
  const mostrarEstacao = (k, v) => { mostrarPeca(k*2, v); mostrarPeca(k*2+1, v); };

  return { mundo, materiais: MATS, dissolverPainel, campoPainel, faixa, faixaMostrar, mostrarPeca, mostrarEstacao, refazerSondas, luzDaSala, solRot, sol, preencher, ceu: skyMat, luz: L, parede: tipoParede,
           aplicarLuz, seguirSombra, refazerEnv, carregarPecas, contato, TEX, GBL, nLajes, luzAssada, soleira };
}

/** Põe a câmera numa parada. `mira` tem que ser uma PerspectiveCamera:
    o lookAt de um Object3D aponta o +z, o de uma câmera aponta o −z. */
export function porNaParada(camera, mira, cena, i) {
  const p = PARADAS[cena][clamp(i, 0, PARADAS[cena].length - 1)];
  camera.position.set(p[0], GEO.eye, p[1]);
  mira.position.copy(camera.position);
  mira.lookAt(p[2], p[4], p[3]);
  camera.quaternion.copy(mira.quaternion);
  return p;
}

export { clamp, lerp };
