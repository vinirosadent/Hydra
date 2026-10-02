/* =============================================================================
   HYDRA — LUZ ASSADA DA ROTUNDA  ·  módulo da trilha A (D-523 · D-228 · D-229 · D-230)
   -----------------------------------------------------------------------------
   O que é: um lightmap de RICOCHETE (luz indireta de um salto) para as lajes de
   pedra da rotunda — chão e tambor. Ele SÓ SOMA (D-228): o sol e a sombra em
   tempo real continuam exatamente como estão; o three.js soma o lightMap à
   irradiância indireta, nunca multiplica.

   Quem usa:
     - cenario.js chama carregarLuzAssada() no fim de construirCenario(). A M não
       precisa fazer nada. `?semlightmap` na URL (ou opts.lightmap = false) desliga.
     - bake.html (o assador, mesma pasta) usa gerarUV2Rotunda() — a MESMA função —
       para que o atlas assado e a peça em execução nunca discordem de onde cada
       laje cai no atlas.

   Por que não há malha nova: as lajes de nave e rotunda estão mescladas nas
   mesmas 12 malhas (MATS.pedraMalhas), de propósito (chamadas de desenho). Cada
   laje da rotunda ganha coordenada real no atlas; as da nave apontam todas para
   um texel preto no meio de uma região vazia — soma zero.

   Armadilha que custou um chat inteiro (D-229): no three.js r160 o índice do
   canal NÃO é o nome do atributo. channel 0 → 'uv', 1 → 'uv1', 2 → 'uv2'. O
   atributo aqui chama 'uv2', então a textura usa channel = 2.
   ============================================================================= */
import * as THREE from 'three';

/* Layout do atlas (0..1). Chão embaixo à esquerda da metade de cima, tambor na
   metade de baixo inteira. O quadrante de cima à direita fica vazio: é onde mora
   o texel da nave, longe de qualquer borda, para a filtragem bilinear não puxar
   luz de lugar nenhum. */
export const ATLAS_ROT = {
  tamanho: 512,
  chao:   { u0: 0.02, u1: 0.48, v0: 0.52, v1: 0.98, meia: 12 },   // quadrado de 24 m em volta de (0, rot.z)
  tambor: { u0: 0.02, u1: 0.98, v0: 0.02, v1: 0.48 },             // ângulo 0..2π × altura 0..hPar
  nave:   [0.75, 0.75],
  png:    'luz/rotunda_lm.png',                 // monólito INTEIRO (ele tapa parte do sol que entra pelo portal)
  pngSem: 'luz/rotunda_lm_sem_monolito.png',    // monólito DISSOLVIDO
  json:   'luz/rotunda_lm.json',
};

const DOISPI = Math.PI * 2;
const embrulha = a => { a = (a + Math.PI) % DOISPI; if (a < 0) a += DOISPI; return a - Math.PI; };  // (-π, π]

/** Gera o atributo `uv2` das malhas mescladas de pedra. Classifica LAJE A LAJE
    (componente conexa do índice — cada laje tem vértices próprios), nunca vértice
    a vértice: uma laje com metade dos vértices num lugar do atlas e metade noutro
    esticaria um triângulo pelo atlas inteiro.
    `ehParede(mesh)` diz se a malha é do grupo parede (tambor) ou chão.
    Devolve contagens, para conferência. */
export function gerarUV2Rotunda(malhas, ehParede, GEO) {
  const R = GEO.rot, ZC = GEO.nave.z1 - 1;           // a mesma costura do portal (dentro da espessura dele)
  const A = ATLAS_ROT, C = A.chao, T = A.tambor;
  const out = { lajesChao: 0, lajesTambor: 0, lajesNave: 0 };
  for (const mesh of malhas) {
    const g = mesh.geometry, pos = g.attributes.position, n = pos.count;
    const uv2 = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv2[i*2] = A.nave[0]; uv2[i*2+1] = A.nave[1]; }
    // componentes conexas pelo índice (union-find)
    const pai = new Int32Array(n); for (let i = 0; i < n; i++) pai[i] = i;
    const acha = i => { while (pai[i] !== i) { pai[i] = pai[pai[i]]; i = pai[i]; } return i; };
    const idx = g.index ? g.index.array : null;
    const nTri = idx ? idx.length / 3 : n / 3;
    for (let t = 0; t < nTri; t++) {
      const a = idx ? idx[t*3] : t*3, b = idx ? idx[t*3+1] : t*3+1, c = idx ? idx[t*3+2] : t*3+2;
      const ra = acha(a), rb = acha(b), rc = acha(c);
      if (ra !== rb) pai[rb] = ra;
      const ra2 = acha(a); if (ra2 !== rc) pai[rc] = ra2;
    }
    const grupos = new Map();
    for (let i = 0; i < n; i++) { const r = acha(i); let l = grupos.get(r); if (!l) grupos.set(r, l = []); l.push(i); }
    const parede = ehParede(mesh);
    for (const vs of grupos.values()) {
      let cx = 0, cy = 0, cz = 0;
      for (const i of vs) { cx += pos.getX(i); cy += pos.getY(i); cz += pos.getZ(i); }
      cx /= vs.length; cy /= vs.length; cz /= vs.length;
      if (cz > ZC) { out.lajesNave++; continue; }
      if (parede) {
        const r = Math.hypot(cx, cz - R.z);
        if (Math.abs(r - R.R) > 0.8) { out.lajesNave++; continue; }
        let tc = Math.atan2(cx, cz - R.z); if (tc < 0) tc += DOISPI;       // 0 = eixo do portal (+z)
        for (const i of vs) {
          const th = tc + embrulha(Math.atan2(pos.getX(i), pos.getZ(i) - R.z) - tc);   // sem salto na costura
          uv2[i*2]   = T.u0 + (th / DOISPI) * (T.u1 - T.u0);
          uv2[i*2+1] = T.v0 + Math.min(1, Math.max(0, pos.getY(i) / R.hPar)) * (T.v1 - T.v0);
        }
        out.lajesTambor++;
      } else {
        if (Math.abs(cx) > C.meia || Math.abs(cz - R.z) > C.meia) { out.lajesNave++; continue; }
        for (const i of vs) {
          uv2[i*2]   = C.u0 + ((pos.getX(i) + C.meia) / (2*C.meia)) * (C.u1 - C.u0);
          uv2[i*2+1] = C.v0 + ((pos.getZ(i) - R.z + C.meia) / (2*C.meia)) * (C.v1 - C.v0);
        }
        out.lajesChao++;
      }
    }
    g.setAttribute('uv2', new THREE.BufferAttribute(uv2, 2));
  }
  return out;
}

/** Põe a luz assada nas malhas. Os materiais MATS.pedraVar/pedraVarChao são usados só
    por estas malhas (o monólito usa um clone), então dá para pôr direto neles. A chave de
    programa do three.js já inclui o lightMap (a customProgramCacheKey é SOMADA à chave
    automática, não a substitui) — não há risco de reaproveitar programa sem lightmap.

    Os dois estados do monólito (D-230, proposta do gate 1): o lightMap nativo guarda o
    estado "monólito inteiro"; um segundo sampler, enxertado no shader, guarda o estado
    "dissolvido", e os dois se misturam pelo MESMO uniforme que dissolverPainel(t) já
    move (`diss`). t = 0 → inteiro, t = 1 → dissolvido, sem salto e sem nada para a M. */
export function aplicarLuzAssada(malhas, texA, texB, intensidade, diss) {
  for (const m of malhas) {
    const mat = m.material;
    mat.lightMap = texA;
    mat.lightMapIntensity = intensidade;
    if (texB && diss && !mat.userData.lm2) {
      const orig = mat.onBeforeCompile, chave = mat.customProgramCacheKey;
      mat.onBeforeCompile = (sh, r) => {
        if (orig) orig.call(mat, sh, r);
        sh.uniforms.uLmB = { value: texB };
        sh.uniforms.uLmMix = diss;                                  // o mesmo objeto do monólito
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D uLmB;\nuniform float uLmMix;')
          .replace('#include <lights_fragment_maps>',
            '#include <lights_fragment_maps>\n#if defined( RE_IndirectDiffuse ) && defined( USE_LIGHTMAP )\n' +
            '\tirradiance += ( texture2D( uLmB, vLightMapUv ).rgb - texture2D( lightMap, vLightMapUv ).rgb ) * lightMapIntensity * uLmMix;\n#endif');
      };
      mat.customProgramCacheKey = () => (chave ? chave.call(mat) : '') + '|lm2';
      mat.userData.lm2 = true;
    }
    mat.needsUpdate = true;
  }
}

/** Carrega os dois PNG + o JSON e aplica. Se faltar arquivo, avisa e a cena segue sem
    luz assada (nunca quebra a peça). Devolve o controle, ou null. */
export async function carregarLuzAssada(malhas, ehParede, GEO, base, diss) {
  const t0 = performance.now();
  try {
    const url = k => new URL(ATLAS_ROT[k], base).href;
    const info = await (await fetch(url('json'))).json();
    const ld = new THREE.TextureLoader();
    const prep = tex => {
      tex.channel = 2;                              // atributo 'uv2' (ver o cabeçalho)
      tex.colorSpace = THREE.SRGBColorSpace;        // o PNG guarda sRGB: mais degraus nos tons baixos
      tex.flipY = true;                             // o assador grava a linha de cima = v 1
      tex.generateMipmaps = false;                  // atlas com ilhas: mipmap misturaria ilha com vazio
      tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
      return tex;
    };
    const [texA, texB] = await Promise.all([ld.loadAsync(url('png')).then(prep),
                                            ld.loadAsync(url('pngSem')).then(prep).catch(() => null)]);
    gerarUV2Rotunda(malhas, ehParede, GEO);
    const base0 = info.escala * (info.ganho ?? 1);
    aplicarLuzAssada(malhas, texA, texB, base0, diss);
    info.msCarga = Math.round(performance.now() - t0);        // para conferência (D-523: ≤ +3 s)
    let ligada = true, ajuste = 1;
    const poe = () => { for (const m of malhas) m.material.lightMapIntensity = ligada ? base0 * ajuste : 0; };
    return {
      info, texturas: [texA, texB],
      /** liga/desliga sem recompilar (só a intensidade) — para ?revisao */
      ligar(v) { ligada = !!v; poe(); },
      /** multiplica a força (1 = como está no JSON) */
      forca(k) { ajuste = k; poe(); },
    };
  } catch (e) {
    console.warn('cenário: luz assada não carregou — seguindo sem ela', e);
    return null;
  }
}
