// Motor de design system: transforma a direção de arte aprovada em tokens (cor OKLCH com contraste garantido,
// tipografia e espaço fluidos, forma, sombra, movimento) e gera os arquivos do projeto.
import { calculateTypeScale, calculateSpaceScale, calculateClamp } from 'utopia-core';
import { escala, hex, oklch, contraste, garantirContraste, textoSobre, ehCreme, PASSOS } from './cor.js';
import { infoFonte, pilhaDeFontes, urlGoogleFonts } from './fontes.js';
import { cssComponentes, JS_COMPONENTES, REACT, COMPONENTES } from './componentes.js';
import { resumoDirecao } from './direcao.js';

const LARGURA_MIN = 360;
const LARGURA_MAX = 1280;
const NOMES_TAMANHO = { '-2': 'xs', '-1': 'sm', 0: 'base', 1: 'md', 2: 'lg', 3: 'xl', 4: '2xl', 5: '3xl', 6: '4xl' };

const ok = (l, c, h) => hex({ mode: 'oklch', l: Math.min(1, Math.max(0, l)), c: Math.max(0, c), h });
const L = (cor) => oklch(cor).l ?? 0;
const H = (cor, padrao = 250) => (Number.isFinite(oklch(cor).h) ? oklch(cor).h : padrao);
const C = (cor) => oklch(cor).c ?? 0;

/** Ajusta a luminosidade de uma cor de preenchimento até o texto escolhido ter contraste 4.5:1 sobre ela. */
function preenchimentoLegivel(cor) {
  const sobre = textoSobre(cor);
  if (contraste(sobre, cor) >= 4.5) return { fundo: hex(cor), texto: sobre, ajustada: false };
  const o = oklch(cor);
  const escurecer = sobre === '#ffffff';
  for (let i = 1; i <= 40; i++) {
    const c = ok(o.l + (escurecer ? -0.012 : 0.012) * i, o.c, o.h);
    const t = textoSobre(c);
    if (contraste(t, c) >= 4.5) return { fundo: c, texto: t, ajustada: true };
  }
  return { fundo: escurecer ? '#1a1a1a' : '#f2f2f2', texto: escurecer ? '#ffffff' : '#111111', ajustada: true };
}

function neutros(direcao) {
  const t = direcao.cores.neutros;
  const marcaH = H(direcao.cores.marca);
  const [c, h] = t === 'frio' ? [0.014, 255] : t === 'quente' ? [0.014, 70] : [0.006, marcaH];
  const out = {};
  const Ls = { 50: 0.985, 100: 0.965, 200: 0.925, 300: 0.87, 400: 0.72, 500: 0.58, 600: 0.49, 700: 0.41, 800: 0.32, 900: 0.24, 950: 0.17 };
  for (const p of PASSOS) out[p] = ok(Ls[p], c * (p >= 900 ? 0.9 : 1), h);
  return { escala: out, croma: c, matiz: h };
}

function status(nome, h, c, fundo, escuro) {
  const base = ok(escuro ? 0.72 : 0.55, c, h);
  const preench = preenchimentoLegivel(ok(escuro ? 0.65 : 0.52, c, h));
  const suave = escuro ? ok(0.27, c * 0.35, h) : ok(0.955, c * 0.22, h);
  return {
    [nome]: preench.fundo,
    [`sobre-${nome}`]: preench.texto,
    [`${nome}-hover`]: ok(L(preench.fundo) + (escuro ? 0.05 : -0.05), c, h),
    [`${nome}-texto`]: garantirContraste(garantirContraste(base, fundo, 4.5), suave, 4.5),
    [`${nome}-suave`]: suave,
  };
}

/** Cores semânticas de um tema (claro ou escuro) com contraste verificado. */
function tema(direcao, n, escuro, alto) {
  const { escala: ne, croma, matiz } = n;
  const marca = direcao.cores.marca;
  const acento = direcao.cores.acento || marca;
  let fundo;
  if (direcao.modo === (escuro ? 'escuro' : 'claro') && direcao.cores.fundo) fundo = direcao.cores.fundo;
  else if (escuro) fundo = ok(0.17, croma * 1.2, matiz);
  else {
    // Fundo claro quase neutro: o calor fica nas superfícies e bordas, sem cair no "creme de IA".
    let c = croma * 0.45;
    fundo = ok(0.986, c, matiz);
    while (ehCreme(fundo) && c > 0.0005) { c *= 0.6; fundo = ok(0.986, c, matiz); }
  }
  const lf = L(fundo);
  const superficie = escuro ? ok(lf + 0.035, croma * 1.2, matiz) : (lf < 0.99 ? ok(Math.min(1, lf + 0.012), croma * 0.4, matiz) : ne[50]);
  const superficie2 = escuro ? ok(lf + 0.07, croma * 1.2, matiz) : ok(lf - 0.03, croma, matiz);
  const elevada = escuro ? ok(lf + 0.09, croma * 1.2, matiz) : superficie;
  const texto = garantirContraste(escuro ? ok(alto ? 0.97 : 0.94, croma * 0.6, matiz) : ok(alto ? 0.16 : 0.22, croma * 0.9, matiz), fundo, 7);
  const textoSuave = garantirContraste(garantirContraste(escuro ? ok(0.8, croma, matiz) : ne[700], fundo, 4.5), superficie2, 4.5);
  const textoFraco = garantirContraste(escuro ? ok(0.62, croma, matiz) : ne[500], fundo, 3);
  const borda = escuro ? ok(lf + 0.12, croma, matiz) : ok(lf - 0.075, croma, matiz);
  const bordaForte = escuro ? ok(lf + 0.22, croma, matiz) : ok(lf - 0.16, croma, matiz);
  const bordaCampo = garantirContraste(garantirContraste(bordaForte, superficie, 3), fundo, 3);

  // Marca: no escuro, uma marca escura demais clareia para continuar visível.
  let marcaBase = marca;
  if (escuro && L(marca) < 0.55) marcaBase = ok(Math.max(0.65, L(marca) + 0.25), C(marca), H(marca));
  const pm = preenchimentoLegivel(marcaBase);
  const pa = preenchimentoLegivel(escuro && L(acento) < 0.55 ? ok(Math.max(0.65, L(acento) + 0.25), C(acento), H(acento)) : acento);
  const hm = H(marca);
  const ha = H(acento);
  const marcaSuave = escuro ? ok(0.27, Math.min(C(marca), 0.12) * 0.45, hm) : ok(0.955, Math.min(C(marca), 0.12) * 0.3, hm);
  const acentoSuave = escuro ? ok(0.27, Math.min(C(acento), 0.12) * 0.45, ha) : ok(0.955, Math.min(C(acento), 0.12) * 0.3, ha);
  const marcaTexto = garantirContraste(garantirContraste(marcaBase, fundo, 4.5), marcaSuave, 4.5);
  const foco = garantirContraste(marcaTexto, fundo, 3);

  return {
    fundo, superficie, 'superficie-2': superficie2, elevada,
    texto, 'texto-suave': textoSuave, 'texto-fraco': textoFraco,
    borda, 'borda-forte': bordaForte, 'borda-campo': bordaCampo,
    marca: pm.fundo, 'sobre-marca': pm.texto,
    'marca-hover': ok(L(pm.fundo) + (pm.texto === '#ffffff' ? -0.06 : 0.06), C(pm.fundo), hm),
    'marca-texto': marcaTexto,
    'marca-suave': marcaSuave,
    acento: pa.fundo, 'sobre-acento': pa.texto,
    'acento-hover': ok(L(pa.fundo) + (pa.texto === '#ffffff' ? -0.06 : 0.06), C(pa.fundo), ha),
    'acento-texto': garantirContraste(garantirContraste(pa.fundo, fundo, 4.5), acentoSuave, 4.5),
    'acento-suave': acentoSuave,
    foco,
    ...status('sucesso', 150, 0.13, fundo, escuro),
    ...status('aviso', 75, 0.13, fundo, escuro),
    ...status('perigo', 27, 0.17, fundo, escuro),
    selecao: escuro ? ok(0.4, Math.min(C(marca), 0.12) * 0.6, hm) : ok(0.88, Math.min(C(marca), 0.12) * 0.5, hm),
    sombra: escuro ? ok(0.05, 0.01, matiz) : ok(0.25, croma * 1.5, matiz),
  };
}

function verificarContrastes(nome, t) {
  const pares = [
    ['texto', 'fundo', 4.5], ['texto', 'superficie', 4.5], ['texto-suave', 'fundo', 4.5], ['texto-suave', 'superficie', 4.5], ['texto-suave', 'superficie-2', 4.5],
    ['texto-fraco', 'fundo', 3], ['marca-texto', 'fundo', 4.5], ['sobre-marca', 'marca', 4.5], ['sobre-acento', 'acento', 4.5],
    ['borda-campo', 'superficie', 3], ['foco', 'fundo', 3], ['perigo-texto', 'fundo', 4.5], ['sucesso-texto', 'fundo', 4.5], ['aviso-texto', 'fundo', 4.5],
    ['sobre-perigo', 'perigo', 4.5], ['marca-texto', 'marca-suave', 4.5], ['perigo-texto', 'perigo-suave', 4.5], ['sucesso-texto', 'sucesso-suave', 4.5], ['aviso-texto', 'aviso-suave', 4.5],
  ];
  return pares.map(([a, b, minimo]) => {
    const r = contraste(t[a], t[b]);
    return { tema: nome, frente: a, fundo: b, razao: r, minimo, ok: r >= minimo };
  });
}

function pesos(nome, alvo) {
  const info = infoFonte(nome);
  if (!info) return alvo;
  const ps = info.pesos;
  if (ps.includes(alvo)) return alvo;
  return ps.reduce((m, p) => (Math.abs(p - alvo) < Math.abs(m - alvo) ? p : m), ps[0]);
}

/** Gera o objeto completo do design system a partir da direção aprovada. */
export function gerarSistema(direcao, brief = {}) {
  const n = neutros(direcao);
  const alto = direcao.contraste !== 'suave';
  const claro = tema(direcao, n, false, alto);
  const escuro = tema(direcao, n, true, alto);
  const escalas = { marca: escala(direcao.cores.marca), neutro: n.escala };
  delete escalas.marca._base;
  if (direcao.cores.acento) { escalas.acento = escala(direcao.cores.acento); delete escalas.acento._base; }

  // Tipografia
  const it = infoFonte(direcao.tipografia.titulos);
  const ix = infoFonte(direcao.tipografia.texto);
  const im = direcao.tipografia.mono ? infoFonte(direcao.tipografia.mono) : infoFonte('JetBrains Mono');
  const pesoTitulos = it.categoria === 'display' || it.pesos.length === 1 ? pesos(it.nome, it.pesos.includes(400) && it.pesos.length === 1 ? 400 : 700)
    : it.categoria === 'serif' ? pesos(it.nome, 600) : pesos(it.nome, 700);
  const pesoTexto = pesos(ix.nome, 400);
  const pesoForte = pesos(ix.nome, 600);
  const dens = { compacta: [15, 17, 1.2, 1.25], confortavel: [16, 18, 1.2, 1.28], arejada: [17, 20, 1.2, 1.333] }[direcao.densidade];
  const extraTitulo = it.categoria === 'display' || (it.categoria === 'serif' && direcao.densidade !== 'compacta') ? 0.04 : 0;
  const tipo = calculateTypeScale({
    minWidth: LARGURA_MIN, maxWidth: LARGURA_MAX, minFontSize: dens[0], maxFontSize: dens[1],
    minTypeScale: dens[2], maxTypeScale: dens[3] + extraTitulo, positiveSteps: 6, negativeSteps: 2,
  });
  const tamanhos = {};
  for (const s of tipo) tamanhos[NOMES_TAMANHO[s.step]] = { clamp: s.clamp, min: Math.round(s.minFontSize * 10) / 10, max: Math.round(s.maxFontSize * 10) / 10 };
  const espacamentoTitulos = it.categoria === 'sans-serif' ? '-0.022em' : it.categoria === 'serif' ? '-0.012em' : '0em';

  // Espaço
  const esp = { compacta: [14, 16], confortavel: [16, 20], arejada: [18, 24] }[direcao.densidade];
  const espaco = calculateSpaceScale({
    minWidth: LARGURA_MIN, maxWidth: LARGURA_MAX, minSize: esp[0], maxSize: esp[1],
    positiveSteps: [1.5, 2, 3, 4, 6], negativeSteps: [0.75, 0.5, 0.25], customSizes: ['l-3xl'],
  });
  const espacos = Object.fromEntries(espaco.sizes.map((s) => [s.label, { clamp: s.clamp, min: s.minSize, max: s.maxSize }]));
  const secao = { compacta: [40, 88], confortavel: [56, 120], arejada: [72, 168] }[direcao.densidade];
  espacos.secao = { clamp: calculateClamp({ minWidth: LARGURA_MIN, maxWidth: LARGURA_MAX, minSize: secao[0], maxSize: secao[1] }), min: secao[0], max: secao[1] };

  // Forma
  const raios = {
    reto: { sm: 0, md: 2, lg: 3, botao: 2, campo: 2, cartao: 3 },
    suave: { sm: 4, md: 8, lg: 12, botao: 8, campo: 8, cartao: 12 },
    arredondado: { sm: 8, md: 14, lg: 22, botao: 14, campo: 12, cartao: 22 },
    pilula: { sm: 10, md: 16, lg: 26, botao: 999, campo: 14, cartao: 26 },
  }[direcao.forma.raio];
  const bordaLargura = { nenhuma: 0, fina: 1, marcada: 2 }[direcao.forma.borda];
  const sombraCor = 'var(--cor-sombra)';
  const sombras = {
    nenhuma: { 1: 'none', 2: '0 0 0 1px var(--cor-borda-forte)', 3: `0 20px 48px -12px color-mix(in oklch,${sombraCor} 30%,transparent)`, botao: 'none' },
    sutil: {
      1: `0 1px 2px color-mix(in oklch,${sombraCor} 8%,transparent),0 1px 1px color-mix(in oklch,${sombraCor} 4%,transparent)`,
      2: `0 2px 4px color-mix(in oklch,${sombraCor} 6%,transparent),0 10px 24px -6px color-mix(in oklch,${sombraCor} 14%,transparent)`,
      3: `0 4px 8px color-mix(in oklch,${sombraCor} 8%,transparent),0 24px 56px -12px color-mix(in oklch,${sombraCor} 28%,transparent)`,
      botao: `0 1px 2px color-mix(in oklch,${sombraCor} 12%,transparent)`,
    },
    marcada: {
      1: `0 2px 4px color-mix(in oklch,${sombraCor} 10%,transparent),0 8px 20px -6px color-mix(in oklch,${sombraCor} 18%,transparent)`,
      2: `0 4px 8px color-mix(in oklch,${sombraCor} 10%,transparent),0 18px 40px -10px color-mix(in oklch,${sombraCor} 30%,transparent)`,
      3: `0 8px 16px color-mix(in oklch,${sombraCor} 12%,transparent),0 36px 80px -16px color-mix(in oklch,${sombraCor} 42%,transparent)`,
      botao: `0 2px 6px color-mix(in oklch,${sombraCor} 18%,transparent)`,
    },
    dura: { 1: '3px 3px 0 var(--cor-texto)', 2: '5px 5px 0 var(--cor-texto)', 3: '8px 8px 0 var(--cor-texto)', botao: '3px 3px 0 var(--cor-texto)' },
  }[direcao.forma.sombra];

  const movimento = {
    minimo: { rapida: 100, media: 160, lenta: 240, saida: 'cubic-bezier(.2,0,0,1)', entrada: 'cubic-bezier(.4,0,1,1)' },
    sutil: { rapida: 140, media: 240, lenta: 420, saida: 'cubic-bezier(.22,1,.36,1)', entrada: 'cubic-bezier(.55,0,1,.45)' },
    expressivo: { rapida: 180, media: 360, lenta: 640, saida: 'cubic-bezier(.16,1,.3,1)', entrada: 'cubic-bezier(.7,0,.84,0)' },
  }[direcao.movimento];

  const pilhas = { titulos: pilhaDeFontes(it.nome), texto: pilhaDeFontes(ix.nome), mono: pilhaDeFontes(im.nome) };
  const urlFontes = urlGoogleFonts([
    { nome: it.nome, pesos: [pesoTitulos, it.categoria === 'serif' ? 400 : pesoTitulos] },
    { nome: ix.nome, pesos: [pesoTexto, pesoForte] },
    { nome: im.nome, pesos: [400] },
  ]);
  const temaAutomatico = ['app', 'dashboard'].includes(brief?.tipo);
  const contrastes = [...verificarContrastes('claro', claro), ...verificarContrastes('escuro', escuro)];

  return {
    nome: direcao.nome,
    direcaoId: direcao.id,
    modo: direcao.modo,
    temaAutomatico,
    escalas,
    temas: { claro, escuro },
    tipografia: {
      titulos: { familia: it.nome, categoria: it.categoria, peso: pesoTitulos, pilha: pilhas.titulos.fontFamily },
      texto: { familia: ix.nome, categoria: ix.categoria, peso: pesoTexto, pesoForte, pilha: pilhas.texto.fontFamily },
      mono: { familia: im.nome, pilha: pilhas.mono.fontFamily },
      tamanhos, espacamentoTitulos, entrelinhas: { titulos: 1.08, compacta: 1.3, texto: direcao.densidade === 'compacta' ? 1.5 : 1.62 },
      url: urlFontes,
      fontFaces: [pilhas.titulos.fontFaces, pilhas.texto.fontFaces, pilhas.mono.fontFaces].filter(Boolean).join('\n'),
    },
    espacos,
    raios, bordaLargura, sombras, movimento,
    larguras: { texto: '68ch', conteudo: '1200px', larga: '1440px' },
    contrastes,
    ajustes: contrastes.filter((c) => !c.ok),
  };
}

// ---------------- arquivos ----------------

const px = (n) => (n === 999 ? '999px' : `${n}px`);

function blocoTema(t) {
  return Object.entries(t).map(([k, v]) => `  --cor-${k}: ${v};`).join('\n');
}

export function cssTokens(s) {
  const principal = s.temas[s.modo];
  const outro = s.modo === 'claro' ? 'escuro' : 'claro';
  const ty = s.tipografia;
  const linhas = [];
  linhas.push(`/* Tokens do design system "${s.nome}" (gerado pelo Creative Lovable). Não edite à mão: gere de novo com cl_gerar_design_system. */`);
  if (ty.fontFaces) linhas.push('/* Fontes de reserva com métricas ajustadas (Capsize): o texto não pula quando a fonte da web carrega. */\n' + ty.fontFaces);
  linhas.push(':root {');
  linhas.push('  /* Escalas de cor (OKLCH) */');
  for (const [nome, esc] of Object.entries(s.escalas)) for (const p of PASSOS) linhas.push(`  --${nome}-${p}: ${esc[p]};`);
  linhas.push(`\n  /* Tema ${s.modo} (principal) */`);
  linhas.push(blocoTema(principal));
  linhas.push(`  color-scheme: ${s.modo === 'escuro' ? 'dark' : 'light'};`);
  linhas.push('\n  /* Tipografia */');
  linhas.push(`  --fonte-titulos: ${ty.titulos.pilha};`);
  linhas.push(`  --fonte-texto: ${ty.texto.pilha};`);
  linhas.push(`  --fonte-mono: ${ty.mono.pilha};`);
  for (const [k, v] of Object.entries(ty.tamanhos)) linhas.push(`  --tamanho-${k}: ${v.clamp};`);
  linhas.push(`  --peso-titulos: ${ty.titulos.peso};`);
  linhas.push(`  --peso-texto: ${ty.texto.peso};`);
  linhas.push(`  --peso-forte: ${ty.texto.pesoForte};`);
  linhas.push(`  --entrelinha-titulos: ${ty.entrelinhas.titulos};`);
  linhas.push(`  --entrelinha-compacta: ${ty.entrelinhas.compacta};`);
  linhas.push(`  --entrelinha-texto: ${ty.entrelinhas.texto};`);
  linhas.push(`  --espacamento-titulos: ${ty.espacamentoTitulos};`);
  linhas.push('\n  /* Espaço (fluido entre 360px e 1280px de tela) */');
  for (const [k, v] of Object.entries(s.espacos)) linhas.push(`  --espaco-${k}: ${v.clamp};`);
  linhas.push('  --espaco-pagina: clamp(1rem, 0.6rem + 2.2vw, 2.5rem);');
  linhas.push('\n  /* Forma */');
  for (const [k, v] of Object.entries(s.raios)) linhas.push(`  --raio-${k}: ${px(v)};`);
  linhas.push(`  --borda-largura: ${s.bordaLargura}px;`);
  linhas.push(`  --borda-cartao: ${Math.max(1, s.bordaLargura)}px solid ${s.bordaLargura ? 'var(--cor-borda)' : 'transparent'};`);
  linhas.push('\n  /* Profundidade */');
  for (const [k, v] of Object.entries(s.sombras)) linhas.push(`  --sombra-${k}: ${v};`);
  linhas.push('\n  /* Movimento */');
  linhas.push(`  --duracao-rapida: ${s.movimento.rapida}ms;`);
  linhas.push(`  --duracao-media: ${s.movimento.media}ms;`);
  linhas.push(`  --duracao-lenta: ${s.movimento.lenta}ms;`);
  linhas.push(`  --curva-saida: ${s.movimento.saida};`);
  linhas.push(`  --curva-entrada: ${s.movimento.entrada};`);
  linhas.push('\n  /* Layout */');
  linhas.push(`  --largura-texto: ${s.larguras.texto};`);
  linhas.push(`  --largura-conteudo: ${s.larguras.conteudo};`);
  linhas.push(`  --largura-larga: ${s.larguras.larga};`);
  linhas.push('  --z-menu: 100;\n  --z-sobreposto: 200;\n  --z-dialogo: 300;\n  --z-aviso: 400;');
  linhas.push('}');
  const blocoOutro = `${blocoTema(s.temas[outro])}\n  color-scheme: ${outro === 'escuro' ? 'dark' : 'light'};`;
  linhas.push(`\n/* Tema ${outro}: ative com <html data-tema="${outro}">${s.temaAutomatico ? ' (ou automático pela preferência do sistema)' : ''}. */`);
  linhas.push(`[data-tema="${outro}"] {\n${blocoOutro}\n}`);
  linhas.push(`[data-tema="${s.modo}"] {\n${blocoTema(principal)}\n  color-scheme: ${s.modo === 'escuro' ? 'dark' : 'light'};\n}`);
  if (s.temaAutomatico) {
    linhas.push(`@media (prefers-color-scheme: ${outro === 'escuro' ? 'dark' : 'light'}) {\n  :root:not([data-tema]) {\n${blocoOutro.replace(/^/gm, '  ')}\n  }\n}`);
  }
  linhas.push('\n@media (prefers-reduced-motion: reduce) {\n  :root { --duracao-rapida: 0ms; --duracao-media: 0ms; --duracao-lenta: 0ms; }\n}');
  return linhas.join('\n') + '\n';
}

export const CSS_BASE = `/* Base do design system (gerado pelo Creative Lovable): reset moderno, tipografia e utilitários de layout. */
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-padding-top:5rem}
@media (prefers-reduced-motion: no-preference){html{scroll-behavior:smooth}}
body{margin:0;min-block-size:100dvh;background:var(--cor-fundo);color:var(--cor-texto);font-family:var(--fonte-texto);font-size:var(--tamanho-base);
  font-weight:var(--peso-texto);line-height:var(--entrelinha-texto);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
img,picture,video,canvas,svg{display:block;max-inline-size:100%;block-size:auto}
input,button,textarea,select{font:inherit;color:inherit}
p,li,figcaption{text-wrap:pretty;overflow-wrap:break-word}
h1,h2,h3,h4{font-family:var(--fonte-titulos);font-weight:var(--peso-titulos);line-height:var(--entrelinha-titulos);letter-spacing:var(--espacamento-titulos);text-wrap:balance;margin:0}
h1{font-size:var(--tamanho-3xl)}
h2{font-size:var(--tamanho-2xl);line-height:1.12}
h3{font-size:var(--tamanho-lg);line-height:1.2}
h4{font-size:var(--tamanho-md);line-height:1.25}
.display{font-size:var(--tamanho-4xl);line-height:1.02}
p,ul,ol,dl,blockquote,figure,pre{margin:0}
small{font-size:var(--tamanho-sm)}
strong,b{font-weight:var(--peso-forte)}
code,kbd,samp,pre{font-family:var(--fonte-mono);font-size:.92em}
a{color:var(--cor-marca-texto);text-decoration-thickness:.08em;text-underline-offset:.18em}
a:hover{text-decoration-thickness:.14em}
:focus-visible{outline:2px solid var(--cor-foco);outline-offset:2px}
::selection{background:var(--cor-selecao);color:var(--cor-texto)}
hr{border:0;border-block-start:1px solid var(--cor-borda);margin:0}
table{border-collapse:collapse}
[hidden]{display:none!important}

/* Layout */
.conteiner{inline-size:min(100% - 2 * var(--espaco-pagina),var(--largura-conteudo));margin-inline:auto}
.conteiner--largo{inline-size:min(100% - 2 * var(--espaco-pagina),var(--largura-larga))}
.conteiner--texto{inline-size:min(100% - 2 * var(--espaco-pagina),var(--largura-texto))}
.secao{padding-block:var(--espaco-secao)}
.fluxo>*+*{margin-block-start:var(--fluxo,1em)}
.pilha{display:flex;flex-direction:column;gap:var(--espaco,var(--espaco-s))}
.agrupar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--espaco,var(--espaco-xs))}
.grade-auto{display:grid;gap:var(--espaco,var(--espaco-m));grid-template-columns:repeat(auto-fit,minmax(min(100%,var(--min,16rem)),1fr))}
.medida{max-inline-size:var(--largura-texto)}
.texto-suave{color:var(--cor-texto-suave)}
.destaque{font-size:var(--tamanho-lg);line-height:1.45;color:var(--cor-texto-suave)}
.visualmente-oculto{position:absolute!important;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
.pular-conteudo{position:absolute;inset-inline-start:var(--espaco-s);inset-block-start:-100px;z-index:var(--z-aviso);padding:var(--espaco-xs) var(--espaco-s);background:var(--cor-marca);color:var(--cor-sobre-marca);border-radius:var(--raio-sm)}
.pular-conteudo:focus{inset-block-start:var(--espaco-s)}
`;

/** Tokens no formato DTCG (Design Tokens Community Group, versão 2025.10). */
export function tokensDtcg(s) {
  const cor = (h) => {
    const c = hex(h).slice(1);
    const comps = [0, 2, 4].map((i) => Math.round((parseInt(c.slice(i, i + 2), 16) / 255) * 10000) / 10000);
    return { $type: 'color', $value: { colorSpace: 'srgb', components: comps, alpha: 1, hex: '#' + c } };
  };
  const dim = (v) => ({ $type: 'dimension', $value: { value: v, unit: 'px' } });
  const out = {
    $description: `Design system "${s.nome}" gerado pelo Creative Lovable. Tamanhos fluidos estão no valor máximo (tela de ${LARGURA_MAX}px); o mínimo fica em $extensions.`,
    cor: {}, tema: {},
    fonte: {
      titulos: { $type: 'fontFamily', $value: [s.tipografia.titulos.familia, s.tipografia.titulos.categoria === 'serif' ? 'serif' : 'sans-serif'] },
      texto: { $type: 'fontFamily', $value: [s.tipografia.texto.familia, 'sans-serif'] },
      mono: { $type: 'fontFamily', $value: [s.tipografia.mono.familia, 'monospace'] },
    },
    peso: {
      titulos: { $type: 'fontWeight', $value: s.tipografia.titulos.peso },
      texto: { $type: 'fontWeight', $value: s.tipografia.texto.peso },
      forte: { $type: 'fontWeight', $value: s.tipografia.texto.pesoForte },
    },
    tamanho: {}, espaco: {}, raio: {},
    duracao: {
      rapida: { $type: 'duration', $value: { value: s.movimento.rapida, unit: 'ms' } },
      media: { $type: 'duration', $value: { value: s.movimento.media, unit: 'ms' } },
      lenta: { $type: 'duration', $value: { value: s.movimento.lenta, unit: 'ms' } },
    },
    curva: {
      saida: { $type: 'cubicBezier', $value: s.movimento.saida.match(/[\d.]+/g).map(Number) },
      entrada: { $type: 'cubicBezier', $value: s.movimento.entrada.match(/[\d.]+/g).map(Number) },
    },
  };
  for (const [nome, esc] of Object.entries(s.escalas)) {
    out.cor[nome] = {};
    for (const p of PASSOS) out.cor[nome][p] = cor(esc[p]);
  }
  for (const [nomeTema, t] of Object.entries(s.temas)) {
    out.tema[nomeTema] = {};
    for (const [k, v] of Object.entries(t)) out.tema[nomeTema][k] = cor(v);
  }
  for (const [k, v] of Object.entries(s.tipografia.tamanhos)) out.tamanho[k] = { ...dim(v.max), $extensions: { 'creative-lovable': { min: v.min, clamp: v.clamp } } };
  for (const [k, v] of Object.entries(s.espacos)) out.espaco[k] = { ...dim(v.max), $extensions: { 'creative-lovable': { min: v.min, clamp: v.clamp } } };
  for (const [k, v] of Object.entries(s.raios)) out.raio[k] = dim(v);
  return out;
}

function mapaTailwind() {
  const cores = ['fundo', 'superficie', 'superficie-2', 'elevada', 'texto', 'texto-suave', 'texto-fraco', 'borda', 'borda-forte', 'foco'];
  const colors = Object.fromEntries(cores.map((c) => [c, `var(--cor-${c})`]));
  for (const g of ['marca', 'acento', 'sucesso', 'aviso', 'perigo']) {
    colors[g] = { DEFAULT: `var(--cor-${g})`, hover: `var(--cor-${g}-hover)`, texto: `var(--cor-${g}-texto)`, suave: `var(--cor-${g}-suave)`, sobre: `var(--cor-sobre-${g})` };
  }
  return {
    colors,
    fontFamily: { titulos: 'var(--fonte-titulos)', texto: 'var(--fonte-texto)', mono: 'var(--fonte-mono)' },
    fontSize: Object.fromEntries(Object.values(NOMES_TAMANHO).map((k) => [k, `var(--tamanho-${k})`])),
    spacing: Object.fromEntries(['3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', 'secao'].map((k) => [k, `var(--espaco-${k})`])),
    borderRadius: Object.fromEntries(['sm', 'md', 'lg', 'botao', 'campo', 'cartao'].map((k) => [k, `var(--raio-${k})`])),
    boxShadow: { 1: 'var(--sombra-1)', 2: 'var(--sombra-2)', 3: 'var(--sombra-3)' },
    transitionDuration: { rapida: 'var(--duracao-rapida)', media: 'var(--duracao-media)', lenta: 'var(--duracao-lenta)' },
    transitionTimingFunction: { saida: 'var(--curva-saida)', entrada: 'var(--curva-entrada)' },
    maxWidth: { texto: 'var(--largura-texto)', conteudo: 'var(--largura-conteudo)', larga: 'var(--largura-larga)' },
  };
}

export function tailwindArquivos() {
  const m = mapaTailwind();
  const json = JSON.stringify(m, null, 2);
  const cdn = `// Tema do design system para o Tailwind 3 pelo CDN. Carregue DEPOIS de <script src="https://cdn.tailwindcss.com">.
(function () {
  var tema = ${json.replace(/\n/g, '\n  ')};
  window.temaDesignSystem = tema;
  if (window.tailwind) window.tailwind.config = Object.assign({}, window.tailwind.config, { theme: { extend: tema } });
})();
`;
  const preset = `// Preset do Tailwind 3 (build): no tailwind.config.js use presets: [temaDesignSystem] importando este arquivo.
export default { theme: { extend: ${json.replace(/\n/g, '\n  ')} } };
`;
  const v4 = ['/* Tailwind 4: @import "tailwindcss"; @import "./design-system/tailwind-v4.css"; (com tokens.css carregado). */', '@theme inline {'];
  for (const [k, v] of Object.entries(m.colors)) {
    if (typeof v === 'string') v4.push(`  --color-${k}: ${v};`);
    else for (const [s, val] of Object.entries(v)) v4.push(`  --color-${k}${s === 'DEFAULT' ? '' : '-' + s}: ${val};`);
  }
  for (const [k, v] of Object.entries(m.fontFamily)) v4.push(`  --font-${k}: ${v};`);
  for (const [k, v] of Object.entries(m.fontSize)) v4.push(`  --text-${k}: ${v};`);
  for (const [k, v] of Object.entries(m.spacing)) v4.push(`  --spacing-${k}: ${v};`);
  for (const [k, v] of Object.entries(m.borderRadius)) v4.push(`  --radius-${k}: ${v};`);
  for (const [k, v] of Object.entries(m.boxShadow)) v4.push(`  --shadow-${k}: ${v};`);
  v4.push('}');
  return { 'tailwind-tema.js': cdn, 'tailwind.preset.js': preset, 'tailwind-v4.css': v4.join('\n') + '\n' };
}

/** Trecho do <head> para usar o design system numa página. */
export function cabecalhoHtml(s, prefixo = 'design-system/') {
  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    s.tipografia.url ? `<link rel="stylesheet" href="${s.tipografia.url}">` : '',
    `<link rel="stylesheet" href="${prefixo}tokens.css">`,
    `<link rel="stylesheet" href="${prefixo}base.css">`,
    `<link rel="stylesheet" href="${prefixo}componentes.css">`,
    `<script src="${prefixo}componentes.js" defer></script>`,
  ].filter(Boolean).join('\n');
}

const yamlStr = (v) => (typeof v === 'number' ? String(v) : JSON.stringify(String(v)));

/** DESIGN.md no formato aberto do Google Labs (frontmatter YAML com tokens + seções em prosa). */
export function designMd(s, direcao, brief) {
  const t = s.temas[s.modo];
  const ty = s.tipografia;
  const tam = (k) => `${ty.tamanhos[k].max}px`;
  const fm = ['---', 'version: alpha', `name: ${yamlStr(s.nome)}`, `description: ${yamlStr(direcao.conceito.slice(0, 240))}`, 'colors:'];
  const cores = {
    primary: t.marca, 'on-primary': t['sobre-marca'], 'primary-hover': t['marca-hover'], 'primary-text': t['marca-texto'], 'primary-soft': t['marca-suave'],
    secondary: t.acento, 'on-secondary': t['sobre-acento'], background: t.fundo, surface: t.superficie, 'surface-2': t['superficie-2'],
    text: t.texto, 'text-muted': t['texto-suave'], 'text-subtle': t['texto-fraco'], border: t.borda, 'border-strong': t['borda-forte'], focus: t.foco,
    success: t['sucesso-texto'], warning: t['aviso-texto'], error: t['perigo-texto'],
  };
  for (const p of PASSOS) cores[`brand-${p}`] = s.escalas.marca[p];
  for (const p of PASSOS) cores[`neutral-${p}`] = s.escalas.neutro[p];
  for (const [k, v] of Object.entries(cores)) fm.push(`  ${k}: ${yamlStr(v)}`);
  fm.push('typography:');
  const niveis = {
    display: ['titulos', '4xl', ty.titulos.peso, 1.05, ty.espacamentoTitulos], 'headline-lg': ['titulos', '3xl', ty.titulos.peso, 1.12, ty.espacamentoTitulos],
    'headline-md': ['titulos', 'xl', ty.titulos.peso, 1.2, ty.espacamentoTitulos], 'title': ['titulos', 'lg', ty.titulos.peso, 1.25, '0em'],
    'body-lg': ['texto', 'md', ty.texto.peso, 1.55, '0em'], body: ['texto', 'base', ty.texto.peso, ty.entrelinhas.texto, '0em'],
    'body-sm': ['texto', 'sm', ty.texto.peso, 1.5, '0em'], label: ['texto', 'sm', ty.texto.pesoForte, 1.2, '0.01em'], caption: ['texto', 'xs', ty.texto.peso, 1.4, '0.01em'],
  };
  for (const [nome, [fam, k, peso, lh, ls]] of Object.entries(niveis)) {
    fm.push(`  ${nome}:`, `    fontFamily: ${yamlStr(ty[fam].familia)}`, `    fontSize: ${tam(k)}`, `    fontWeight: ${peso}`, `    lineHeight: ${lh}`, `    letterSpacing: ${ls}`);
  }
  fm.push('rounded:');
  for (const [k, v] of Object.entries(s.raios)) fm.push(`  ${k}: ${px(v)}`);
  fm.push('spacing:');
  for (const [k, v] of Object.entries(s.espacos)) fm.push(`  ${k}: ${v.max}px`);
  fm.push('components:',
    '  button-primary:', '    backgroundColor: "{colors.primary}"', '    textColor: "{colors.on-primary}"', '    rounded: "{rounded.botao}"', '    typography: "{typography.label}"',
    '  button-secondary:', '    backgroundColor: "transparent"', '    textColor: "{colors.text}"', '    borderColor: "{colors.border-strong}"', '    rounded: "{rounded.botao}"',
    '  card:', '    backgroundColor: "{colors.surface}"', '    rounded: "{rounded.cartao}"', '    padding: "{spacing.m}"',
    '  input:', '    backgroundColor: "{colors.surface}"', '    borderColor: "{colors.border-strong}"', '    rounded: "{rounded.campo}"',
    '---');

  const contr = s.contrastes.filter((c) => c.tema === s.modo);
  const corpo = `
# ${s.nome}

## Overview

${direcao.conceito}

- **Para quem:** ${brief?.publico || 'público do briefing'}
- **Objetivo da peça:** ${brief?.objetivo || ''}
- **Tom:** ${(brief?.tom || []).join(', ')}
- **Referência visual:** ${direcao.referencia}
- **Assinatura:** ${direcao.assinatura}
${direcao.layout ? `- **Composição:** ${direcao.layout}\n` : ''}
## Colors

Paleta construída em OKLCH a partir da cor da marca ${direcao.cores.marca}${direcao.cores.acento ? ` e do acento ${direcao.cores.acento}` : ''}, com neutros ${direcao.cores.neutros === 'quente' ? 'levemente quentes' : direcao.cores.neutros === 'frio' ? 'levemente frios' : 'tingidos pela marca'}. Modo principal: ${s.modo}. Os dois temas (claro e escuro) estão em \`tokens.css\`.

- **Marca (${t.marca}):** botões principais e destaques. Texto sobre ela: ${t['sobre-marca']} (${contraste(t['sobre-marca'], t.marca)}:1).
- **Marca para texto (${t['marca-texto']}):** links e palavras de destaque sobre o fundo (${contraste(t['marca-texto'], t.fundo)}:1).
- **Fundo (${t.fundo}) e superfície (${t.superficie}):** a base das páginas e dos cartões.
- **Texto (${t.texto}):** ${contraste(t.texto, t.fundo)}:1 sobre o fundo. Texto suave (${t['texto-suave']}): ${contraste(t['texto-suave'], t.fundo)}:1.
${direcao.cores.estrategia ? `\nEstratégia: ${direcao.cores.estrategia}\n` : ''}
Contraste verificado (WCAG 2.2 AA): ${contr.filter((c) => c.ok).length} de ${contr.length} pares passam.${contr.some((c) => !c.ok) ? ' Falham: ' + contr.filter((c) => !c.ok).map((c) => `${c.frente} sobre ${c.fundo} (${c.razao}:1)`).join(', ') + '.' : ''}

## Typography

- **Títulos:** ${ty.titulos.familia}, peso ${ty.titulos.peso}, espaçamento ${ty.espacamentoTitulos}.
- **Texto:** ${ty.texto.familia}, peso ${ty.texto.peso} (destaques ${ty.texto.pesoForte}), entrelinha ${ty.entrelinhas.texto}, linhas de no máximo ${s.larguras.texto}.
- **Mono:** ${ty.mono.familia}, para números, código e dados.

${direcao.tipografia.justificativa}

Escala fluida (Utopia) de ${ty.tamanhos.base.min}px a ${ty.tamanhos.base.max}px no texto base, crescendo até ${ty.tamanhos['4xl'].max}px no maior título. Use só as variáveis \`--tamanho-*\`.

## Layout

Densidade ${direcao.densidade}. Espaços fluidos \`--espaco-3xs\` a \`--espaco-3xl\` e \`--espaco-secao\` (${s.espacos.secao.min}px a ${s.espacos.secao.max}px) entre seções. Conteúdo até ${s.larguras.conteudo}; texto corrido até ${s.larguras.texto}. Margem lateral \`--espaco-pagina\`.

## Elevation & Depth

Sombra ${direcao.forma.sombra}${direcao.forma.sombra === 'dura' ? ' (deslocada e sólida, sem desfoque)' : ''}: \`--sombra-1\` para cartões, \`--sombra-2\` para hover e menus, \`--sombra-3\` para diálogos.

## Shapes

Raio ${direcao.forma.raio}: cartões ${px(s.raios.cartao)}, botões ${px(s.raios.botao)}, campos ${px(s.raios.campo)}. Bordas ${direcao.forma.borda} (${s.bordaLargura}px).

## Components

Biblioteca em \`componentes.css\` (HTML) e \`react/\` (quando o projeto é React): ${Object.values(COMPONENTES).map((c) => c.nome.toLowerCase()).join(', ')}. Peça o código de cada um com \`cl_componente\`.

## Do's and Don'ts

- Faça: use só as variáveis de \`tokens.css\`; nenhuma cor, fonte ou tamanho solto no CSS das páginas.
- Faça: escreva com o conteúdo real do briefing, na voz do tom definido.
- Faça: varie o ritmo das seções (largura, alinhamento, densidade) para guiar a leitura.
${direcao.evitar.map((e) => `- Não faça: ${e}`).join('\n')}
- Não faça: gradiente roxo-azul, texto com gradiente, emoji como ícone, grade de 3 cartões iguais em toda seção, rótulo em caixa alta acima de cada título, fontes da lista saturada.
- Use \`.display\` (--tamanho-4xl) só em títulos curtos; frases longas ficam no tamanho do h1.
`;
  return fm.join('\n') + '\n' + corpo;
}

/** Página de apresentação do design system (abre no preview em design-system/index.html). */
export function paginaApresentacao(s, direcao, brief) {
  const swatches = (nome, esc) => `<div class="ap-escala"><h3>${nome}</h3><ol>${PASSOS.map((p) => `<li style="--c:${esc[p]}"><span class="ap-cor" aria-hidden="true"></span><span class="ap-rotulo"><b>${p}</b> ${esc[p]}</span></li>`).join('')}</ol></div>`;
  const semanticas = ['fundo', 'superficie', 'superficie-2', 'texto', 'texto-suave', 'borda', 'marca', 'marca-texto', 'marca-suave', 'acento', 'foco', 'sucesso', 'aviso', 'perigo'];
  const temaTabela = (nome) => `<div class="ap-tema" data-tema="${nome}"><h3>Tema ${nome}</h3><ul>${semanticas.map((k) => `<li><span class="ap-pastilha" style="background:var(--cor-${k})"></span><code>--cor-${k}</code><span>${s.temas[nome][k]}</span></li>`).join('')}</ul></div>`;
  const amostra = (brief?.assunto || direcao.nome).replace(/[<>&]/g, '');
  const tamanhos = Object.entries(s.tipografia.tamanhos).reverse().map(([k, v]) => `<div class="ap-tipo"><code>--tamanho-${k}</code><span class="ap-tipo-amostra" style="font-size:var(--tamanho-${k});${['4xl', '3xl', '2xl', 'xl', 'lg'].includes(k) ? 'font-family:var(--fonte-titulos);font-weight:var(--peso-titulos);letter-spacing:var(--espacamento-titulos);line-height:1.1' : ''}">${k === 'base' || k === 'sm' || k === 'xs' || k === 'md' ? 'Texto corrido para ler sem esforço, com números 0123456789.' : amostra}</span><small>${v.min}px a ${v.max}px</small></div>`).join('');
  const espacos = Object.entries(s.espacos).map(([k, v]) => `<li><code>--espaco-${k}</code><span class="ap-barra" style="inline-size:var(--espaco-${k})"></span><small>${v.min}–${v.max}px</small></li>`).join('');
  const contr = s.contrastes.map((c) => `<tr><td>${c.tema}</td><td><code>${c.frente}</code> sobre <code>${c.fundo}</code></td><td class="num">${c.razao}:1</td><td>${c.ok ? '<span class="selo selo--sucesso">passa</span>' : '<span class="selo selo--perigo">falha</span>'}</td></tr>`).join('');
  const comps = ['botao', 'campo', 'selo', 'alerta', 'cartao', 'abas', 'sanfona', 'interruptor', 'tabela', 'vazio'].map((k) => `<div class="ap-comp"><h3>${COMPONENTES[k].nome}</h3><div class="ap-comp-demo">${COMPONENTES[k].html}</div></div>`).join('');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design system · ${s.nome.replace(/[<>&]/g, '')}</title>
${cabecalhoHtml(s, '')}
<style>
.ap-topo{display:flex;flex-wrap:wrap;gap:var(--espaco-s);align-items:end;justify-content:space-between;padding-block:var(--espaco-xl) var(--espaco-l);border-block-end:1px solid var(--cor-borda)}
.ap-topo p{max-inline-size:60ch}
.ap-secao{padding-block:var(--espaco-l);border-block-end:1px solid var(--cor-borda);display:grid;gap:var(--espaco-m)}
.ap-secao>h2{font-size:var(--tamanho-2xl)}
.ap-escalas{display:grid;gap:var(--espaco-m)}
.ap-escala h3{font-size:var(--tamanho-md);margin-block-end:var(--espaco-2xs);text-transform:capitalize}
.ap-escala ol{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:4px;margin:0;padding:0;list-style:none}
.ap-cor{display:block;block-size:3.5rem;border-radius:var(--raio-sm);background:var(--c);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--cor-texto) 10%,transparent)}
.ap-rotulo{display:block;font:var(--tamanho-xs)/1.3 var(--fonte-mono);color:var(--cor-texto-suave);margin-block-start:4px;overflow-wrap:anywhere}
.ap-rotulo b{display:block;color:var(--cor-texto)}
.ap-temas{display:grid;gap:var(--espaco-m);grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))}
.ap-tema{padding:var(--espaco-m);border-radius:var(--raio-cartao);background:var(--cor-fundo);color:var(--cor-texto);border:1px solid var(--cor-borda)}
.ap-tema ul{list-style:none;margin:var(--espaco-s) 0 0;padding:0;display:grid;gap:6px;font-size:var(--tamanho-sm)}
.ap-tema li{display:grid;grid-template-columns:1.5rem 1fr auto;gap:var(--espaco-xs);align-items:center}
.ap-tema li span:last-child{font-family:var(--fonte-mono);color:var(--cor-texto-suave);font-size:var(--tamanho-xs)}
.ap-pastilha{inline-size:1.5rem;block-size:1.5rem;border-radius:6px;box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--cor-texto) 15%,transparent)}
.ap-tipo{display:grid;grid-template-columns:9rem 1fr 7rem;gap:var(--espaco-s);align-items:baseline;padding-block:var(--espaco-2xs);border-block-end:1px dashed var(--cor-borda)}
.ap-tipo code,.ap-tipo small{color:var(--cor-texto-suave);font-size:var(--tamanho-xs)}
.ap-tipo-amostra{min-inline-size:0;overflow-wrap:anywhere}
.ap-espacos{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.ap-espacos li{display:grid;grid-template-columns:9rem 1fr 6rem;gap:var(--espaco-s);align-items:center;font-size:var(--tamanho-xs);color:var(--cor-texto-suave)}
.ap-barra{display:block;block-size:.75rem;background:var(--cor-marca);border-radius:2px}
.ap-formas{display:flex;flex-wrap:wrap;gap:var(--espaco-m)}
.ap-forma{inline-size:9rem;block-size:6rem;display:grid;place-items:center;background:var(--cor-superficie);border:var(--borda-cartao);font-size:var(--tamanho-xs);color:var(--cor-texto-suave)}
.ap-comps{display:grid;gap:var(--espaco-m);grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr))}
.ap-comp{display:grid;gap:var(--espaco-xs);align-content:start}
.ap-comp>h3{font-size:var(--tamanho-sm);font-family:var(--fonte-texto);font-weight:var(--peso-forte);letter-spacing:.06em;text-transform:uppercase;color:var(--cor-texto-suave)}
.ap-comp-demo{display:flex;flex-wrap:wrap;gap:var(--espaco-xs);align-items:flex-start;padding:var(--espaco-m);border:1px solid var(--cor-borda);border-radius:var(--raio-lg);background:var(--cor-fundo)}
.ap-comp-demo>*{flex:1 1 100%}
.ap-comp-demo>.botao,.ap-comp-demo>.selo,.ap-comp-demo>a.botao{flex:0 0 auto}
@media (max-width:40rem){.ap-escala ol{grid-template-columns:repeat(6,minmax(0,1fr))}.ap-tipo,.ap-espacos li{grid-template-columns:1fr}}
</style>
</head>
<body>
<a class="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
<main id="conteudo" class="conteiner">
  <header class="ap-topo">
    <div class="pilha" style="--espaco:var(--espaco-xs)">
      <h1>${s.nome.replace(/[<>&]/g, '')} <span class="texto-suave">· design system</span></h1>
      <p class="destaque">${direcao.conceito.replace(/[<>&]/g, '')}</p>
    </div>
    <button class="botao botao--secundario" type="button" id="alternarTema">Ver tema ${s.modo === 'claro' ? 'escuro' : 'claro'}</button>
  </header>
  <section class="ap-secao" aria-labelledby="t-cor"><h2 id="t-cor">Cor</h2>
    <div class="ap-escalas">${Object.entries(s.escalas).map(([k, v]) => swatches(k, v)).join('')}</div>
    <div class="ap-temas">${temaTabela('claro')}${temaTabela('escuro')}</div>
  </section>
  <section class="ap-secao" aria-labelledby="t-tipo"><h2 id="t-tipo">Tipografia</h2>
    <p class="texto-suave">${s.tipografia.titulos.familia} nos títulos, ${s.tipografia.texto.familia} no texto, ${s.tipografia.mono.familia} para dados.</p>
    <div>${tamanhos}</div>
  </section>
  <section class="ap-secao" aria-labelledby="t-espaco"><h2 id="t-espaco">Espaço</h2><ul class="ap-espacos">${espacos}</ul></section>
  <section class="ap-secao" aria-labelledby="t-forma"><h2 id="t-forma">Forma e profundidade</h2>
    <div class="ap-formas">${['sm', 'md', 'lg', 'cartao'].map((r) => `<div class="ap-forma" style="border-radius:var(--raio-${r})">--raio-${r}</div>`).join('')}${[1, 2, 3].map((n) => `<div class="ap-forma" style="border-radius:var(--raio-cartao);box-shadow:var(--sombra-${n})">--sombra-${n}</div>`).join('')}</div>
  </section>
  <section class="ap-secao" aria-labelledby="t-comp"><h2 id="t-comp">Componentes</h2><div class="ap-comps">${comps}</div></section>
  <section class="ap-secao" aria-labelledby="t-contraste"><h2 id="t-contraste">Contraste (WCAG 2.2 AA)</h2>
    <div class="tabela-rolagem" role="region" aria-label="Contraste" tabindex="0"><table class="tabela"><thead><tr><th scope="col">Tema</th><th scope="col">Par</th><th scope="col" class="num">Razão</th><th scope="col">Resultado</th></tr></thead><tbody>${contr}</tbody></table></div>
  </section>
</main>
<script>
document.getElementById('alternarTema').addEventListener('click', function () {
  var raiz = document.documentElement, principal = ${JSON.stringify(s.modo)}, outro = principal === 'claro' ? 'escuro' : 'claro';
  var atual = raiz.getAttribute('data-tema') || principal;
  var novo = atual === principal ? outro : principal;
  raiz.setAttribute('data-tema', novo);
  this.textContent = 'Ver tema ' + (novo === 'claro' ? 'escuro' : 'claro');
});
</script>
</body>
</html>
`;
}

/** Todos os arquivos do design system, prontos para gravar no projeto. */
export function arquivosDoSistema(s, direcao, brief, { react = false } = {}) {
  const arquivos = {
    'design-system/tokens.css': cssTokens(s),
    'design-system/base.css': CSS_BASE,
    'design-system/componentes.css': cssComponentes(),
    'design-system/componentes.js': JS_COMPONENTES,
    'design-system/tokens.json': JSON.stringify(tokensDtcg(s), null, 2) + '\n',
    'design-system/DESIGN.md': designMd(s, direcao, brief),
    'design-system/index.html': paginaApresentacao(s, direcao, brief),
  };
  for (const [nome, conteudo] of Object.entries(tailwindArquivos())) arquivos['design-system/' + nome] = conteudo;
  if (react) for (const [nome, conteudo] of Object.entries(REACT)) arquivos['design-system/react/' + nome] = conteudo;
  return arquivos;
}

export { resumoDirecao };
