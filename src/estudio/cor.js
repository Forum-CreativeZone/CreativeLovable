// Matemática de cor em OKLCH (Culori): escalas de 12 passos, contraste WCAG e detecção de paletas-clichê.
import { converter, formatHex, parse, toGamut, wcagContrast, differenceCiede2000 } from 'culori';

const paraOklch = converter('oklch');
const noGamut = toGamut('rgb', 'oklch');
const deltaE = differenceCiede2000();

export const PASSOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Âncoras de luminosidade perceptual (OKLCH L) por passo.
const L = { 50: 0.985, 100: 0.96, 200: 0.92, 300: 0.86, 400: 0.76, 500: 0.66, 600: 0.57, 700: 0.48, 800: 0.39, 900: 0.3, 950: 0.22 };
// Curva de croma em sino: baixa nas pontas, máxima no meio.
const C = { 50: 0.12, 100: 0.22, 200: 0.38, 300: 0.58, 400: 0.82, 500: 0.97, 600: 1, 700: 0.92, 800: 0.8, 900: 0.66, 950: 0.55 };

export const ehHex = (s) => typeof s === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
export const hex = (cor) => formatHex(noGamut(typeof cor === 'string' ? parse(cor) : cor));
export const oklch = (cor) => paraOklch(typeof cor === 'string' ? parse(cor) : cor);
export const contraste = (a, b) => Math.round(wcagContrast(a, b) * 100) / 100;
export const distancia = (a, b) => deltaE(parse(a), parse(b));

/**
 * Escala de 12 passos ao redor de uma cor. O hex original fica fixo no passo de luminosidade mais próxima.
 * @param {string} base hex
 * @param {{ manterCroma?: number, deslocarMatiz?: boolean }} opcoes manterCroma 0..1 (0.05 = neutro tingido)
 */
export function escala(base, { manterCroma = 1, deslocarMatiz = true } = {}) {
  const o = oklch(base);
  const h = Number.isFinite(o.h) ? o.h : 250;
  const cMax = Math.max(o.c, 0.02) * manterCroma;
  const out = {};
  for (const p of PASSOS) {
    const desloc = deslocarMatiz ? (p <= 300 ? 4 : p >= 700 ? -4 : 0) * (manterCroma < 0.3 ? 0.3 : 1) : 0;
    out[p] = hex({ mode: 'oklch', l: L[p], c: cMax * C[p], h: h + desloc });
  }
  if (manterCroma >= 0.99) {
    let perto = 500;
    for (const p of PASSOS) if (Math.abs(L[p] - o.l) < Math.abs(L[perto] - o.l)) perto = p;
    out[perto] = hex(base);
    out._base = perto;
  }
  return out;
}

/** Ajusta a luminosidade de uma cor até atingir o contraste mínimo contra o fundo. */
export function garantirContraste(cor, fundo, minimo = 4.5) {
  if (contraste(cor, fundo) >= minimo) return hex(cor);
  const o = oklch(cor);
  const escurecer = (oklch(fundo).l ?? 1) > 0.5;
  for (let i = 1; i <= 60; i++) {
    const l = Math.min(1, Math.max(0, o.l + (escurecer ? -0.01 : 0.01) * i));
    const c = hex({ mode: 'oklch', l, c: o.c, h: o.h });
    if (contraste(c, fundo) >= minimo) return c;
  }
  return escurecer ? '#000000' : '#ffffff';
}

/** Melhor cor de texto sobre um fundo (branco ou quase-preto do mesmo matiz). */
export function textoSobre(fundo) {
  const o = oklch(fundo);
  const escuro = hex({ mode: 'oklch', l: 0.2, c: Math.min(o.c || 0, 0.03), h: o.h || 0 });
  return contraste('#ffffff', fundo) >= contraste(escuro, fundo) ? '#ffffff' : escuro;
}

export function matiz(cor) {
  const o = oklch(cor);
  return Number.isFinite(o.h) ? o.h : null;
}
export function diferencaMatiz(a, b) {
  const ha = matiz(a), hb = matiz(b);
  if (ha == null || hb == null) return 0;
  const d = Math.abs(ha - hb) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Procura as combinações de cor que denunciam "site de IA".
 * @param {{ marca: string, modo: 'claro'|'escuro', serifDisplay?: boolean, neutros?: string }} p
 */
export function clichesDeCor({ marca, modo, serifDisplay = false, neutros = 'neutra' }) {
  const achados = [];
  const o = oklch(marca);
  const h = o.h ?? 0;
  if (modo === 'claro' && neutros === 'quente' && serifDisplay && distancia(marca, '#D97757') < 18) {
    achados.push('Creme com serifa e acento terracota: é a combinação mais comum em sites gerados por IA.');
  } else if (distancia(marca, '#D97757') < 10) {
    achados.push('Acento muito próximo do terracota #D97757, cor de interface do próprio Claude; lê como clichê.');
  }
  if (modo === 'escuro' && o.c > 0.17 && ((h > 105 && h < 150) || (h > 20 && h < 45))) {
    achados.push('Fundo escuro com um único acento verde-ácido ou vermelhão saturado: padrão batido de IA.');
  }
  if (h > 265 && h < 305 && o.c > 0.12) {
    achados.push('Roxo/violeta saturado como marca: é o tom padrão de muitos templates de IA. Use só se a marca já for assim.');
  }
  return achados;
}

/**
 * Fundo creme/bege: claro, quente e levemente amarelado. Mesma heurística do detector do Impeccable
 * (Paul Bakaus, Apache-2.0): menor canal >= 209, r >= g >= b e r - b entre 6 e 48.
 */
export function ehCreme(cor) {
  const h = hex(cor).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return Math.min(r, g, b) >= 209 && r >= g && g >= b && r - b >= 6 && r - b <= 48;
}

/** Faixa de cor clara/escura de um fundo: útil para saber o modo de uma página. */
export const ehEscura = (cor) => (oklch(cor).l ?? 1) < 0.5;
