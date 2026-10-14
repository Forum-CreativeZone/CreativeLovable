// Catálogo de fontes (Google Fonts + fontes de sistema) com métricas para pilhas de fallback sem salto de layout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFontStack } from '@capsizecss/core';

const ARQUIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'fontes.json');
const CATEGORIAS = { s: 'sans-serif', r: 'serif', d: 'display', h: 'manuscrita', m: 'monoespaçada' };

/**
 * Famílias que viraram o padrão de qualquer site gerado por IA: só quando forem da marca do cliente.
 * Inclui a lista de fontes saturadas do Impeccable (Paul Bakaus, Apache-2.0), a "nova monocultura".
 */
export const FONTES_SATURADAS = [
  'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Space Grotesk', 'Playfair Display',
  'Raleway', 'Nunito', 'Arial', 'Helvetica', 'DM Sans', 'Plus Jakarta Sans',
  'Fraunces', 'Instrument Sans', 'Instrument Serif', 'Geist', 'Geist Mono', 'Mona Sans', 'Recoleta',
];

/**
 * Seleção curada de famílias do Google Fonts com personalidade e boa execução, por papel e tom.
 * papel: t = títulos, x = texto corrido, a = ambos, m = monoespaçada.
 */
const CURADAS = `
Fraunces|a|editorial,caloroso,artesanal,ousado
Newsreader|a|editorial,classico,calmo
Instrument Serif|t|elegante,editorial,luxuoso
DM Serif Display|t|elegante,classico
Young Serif|t|caloroso,retro,artesanal
Gloock|t|ousado,editorial,elegante
Bodoni Moda|t|luxuoso,elegante,classico
Cormorant Garamond|t|luxuoso,elegante,classico
Libre Caslon Display|t|classico,institucional,editorial
Literata|x|editorial,calmo,humano
Source Serif 4|a|editorial,institucional,calmo
Spectral|x|editorial,elegante,calmo
Crimson Pro|x|classico,editorial
EB Garamond|a|classico,luxuoso,editorial
Petrona|a|caloroso,humano,editorial
Brygada 1918|a|classico,institucional
Besley|t|retro,caloroso,editorial
Zilla Slab|t|tecnico,caloroso,retro
Bitter|x|humano,tecnico
Vollkorn|x|classico,caloroso
Ultra|t|ousado,retro
Caprasimo|t|divertido,retro,caloroso
Bricolage Grotesque|a|ousado,jovem,artesanal,caloroso
Familjen Grotesk|a|preciso,editorial,institucional
Schibsted Grotesk|a|editorial,preciso,institucional
Hanken Grotesk|x|humano,calmo,institucional
Instrument Sans|a|preciso,elegante,tecnico
Onest|x|humano,acessivel,calmo
Geist|a|tecnico,preciso,futurista
Archivo|a|tecnico,institucional,compacto
Public Sans|x|institucional,acessivel
IBM Plex Sans|a|tecnico,institucional
Red Hat Display|t|humano,institucional
Red Hat Text|x|humano,institucional
Albert Sans|x|geometrico,calmo,humano
Figtree|x|humano,jovem,acessivel
Be Vietnam Pro|x|humano,jovem
Atkinson Hyperlegible Next|x|acessivel,humano
Lexend|x|acessivel,calmo
Rethink Sans|x|humano,jovem
Funnel Display|t|ousado,jovem,futurista
Funnel Sans|x|jovem,humano
Host Grotesk|a|preciso,tecnico,calmo
Golos Text|x|humano,institucional
Mona Sans|a|tecnico,ousado,preciso
Hubot Sans|t|tecnico,futurista
Epilogue|a|ousado,editorial
Karla|x|humano,retro
Libre Franklin|a|institucional,classico
Commissioner|a|humano,calmo
Geologica|a|tecnico,futurista,geometrico
Wix Madefor Display|t|humano,institucional
Wix Madefor Text|x|humano,institucional
Reddit Sans|x|jovem,humano
Sofia Sans|a|compacto,tecnico
Mozilla Headline|t|ousado,editorial
Mozilla Text|x|humano,editorial
SUSE|a|tecnico,geometrico
Gabarito|t|geometrico,jovem,ousado
Parkinsans|t|divertido,jovem,geometrico
Spline Sans|a|tecnico,jovem
League Spartan|t|geometrico,ousado
Jost|a|geometrico,elegante,retro
Radio Canada Big|t|humano,ousado
Syne|t|ousado,futurista
Unbounded|t|ousado,futurista,jovem
Anybody|t|ousado,divertido,compacto
Bowlby One|t|ousado,retro
Dela Gothic One|t|ousado,brutal
Darker Grotesque|t|editorial,ousado
Barlow Condensed|t|compacto,tecnico,esportivo
Saira Condensed|t|tecnico,futurista,compacto
Six Caps|t|ousado,editorial,compacto
Italiana|t|elegante,luxuoso
Michroma|t|futurista,tecnico
Krona One|t|ousado,futurista
Shrikhand|t|divertido,retro
Bagel Fat One|t|divertido,jovem
Gasoek One|t|ousado,brutal
Rubik Mono One|t|ousado,jogo,brutal
Bungee|t|ousado,jogo,retro
Press Start 2P|t|jogo,retro
Silkscreen|t|jogo,retro,tecnico
Pixelify Sans|a|jogo,divertido
Jersey 10|t|jogo,esportivo,retro
Handjet|t|jogo,futurista
VT323|t|retro,tecnico,jogo
JetBrains Mono|m|tecnico,preciso
IBM Plex Mono|m|tecnico,institucional
DM Mono|m|tecnico,calmo
Space Mono|m|tecnico,retro
Fragment Mono|m|tecnico,preciso
Martian Mono|m|tecnico,futurista
Azeret Mono|m|tecnico,preciso
Red Hat Mono|m|tecnico,humano
Geist Mono|m|tecnico,futurista
Chivo Mono|m|tecnico,editorial
Spline Sans Mono|m|tecnico,jovem
Kode Mono|m|tecnico,jogo
`.trim().split('\n').map((l) => { const [nome, papel, humor] = l.split('|'); return { nome, papel, humor: humor.split(',') }; });

/** Sinônimos dos adjetivos de tom (como o usuário fala) para o vocabulário das fontes curadas. */
const TOM_PARA_HUMOR = [
  [/sofistic|eleg|chique|refin/, 'elegante'], [/luxo|premium|exclusiv/, 'luxuoso'], [/edito|revista|jornal|leitura/, 'editorial'],
  [/cl[aá]ssic|tradic|atemporal|s[eé]ri/, 'classico'], [/calor|acolhe|afetu|pr[oó]xim|familiar/, 'caloroso'], [/t[eé]cnic|engenh|dev|dados|cient/, 'tecnico'],
  [/precis|rigor|exat|limp|clean|minimal/, 'preciso'], [/institu|confi|s[eé]rio|corporat|oficial|segur/, 'institucional'], [/divert|l[uú]dic|brincal|alegr|engra/, 'divertido'],
  [/ousad|forte|impact|marcante|energ|intens/, 'ousado'], [/artesan|manual|feito [àa] m[aã]o|org[aâ]nic|natural/, 'artesanal'], [/retr|vintage|nost[aá]lg|antig/, 'retro'],
  [/futur|tecnol|inova|sci|digital/, 'futurista'], [/calm|sereno|tranquil|suave|leve/, 'calmo'], [/human|simp[aá]t|amig|acess[ií]vel|gentil/, 'humano'],
  [/jovem|moderno|descolad|urbano|street/, 'jovem'], [/inclus|acessib|leg[ií]vel|idoso/, 'acessivel'], [/geom[eé]tric|construt/, 'geometrico'],
  [/brutal|cru|industrial|punk/, 'brutal'], [/jogo|game|arcade|pixel|gamer/, 'jogo'], [/esport|atl[eé]t|fitness|academia/, 'esportivo'], [/compact|denso/, 'compacto'],
];

/** Converte adjetivos livres de tom no vocabulário de humor das fontes. */
export function humoresDoTom(tom = []) {
  const out = new Set();
  for (const t of tom) {
    const s = String(t).toLowerCase();
    for (const [re, h] of TOM_PARA_HUMOR) if (re.test(s)) out.add(h);
  }
  return [...out];
}

/**
 * Sugere fontes curadas para um tom (lista de adjetivos). Devolve títulos, texto e mono ordenados por afinidade.
 * Nunca sugere famílias saturadas.
 */
export function sugerirFontes(tom = [], { limite = 8 } = {}) {
  const humores = humoresDoTom(tom);
  const pontuar = (f) => f.humor.reduce((s, h) => s + (humores.includes(h) ? 2 : 0), 0) + (humores.length ? 0 : 1);
  const validas = CURADAS.filter((f) => nomeOficial(f.nome) && !ehSaturada(f.nome)).map((f) => ({ ...f, pontos: pontuar(f) }));
  const ordenar = (lista) => lista.sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome)).slice(0, limite)
    .map((f) => ({ nome: nomeOficial(f.nome), categoria: infoFonte(f.nome).categoria, humor: f.humor, pesos: infoFonte(f.nome).pesos }));
  return {
    humores,
    titulos: ordenar(validas.filter((f) => f.papel === 't' || f.papel === 'a')),
    texto: ordenar(validas.filter((f) => f.papel === 'x' || f.papel === 'a')),
    mono: ordenar(validas.filter((f) => f.papel === 'm')).slice(0, 4),
  };
}

let dados = null;
let indice = null;
function carregar() {
  if (dados) return;
  dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')).familias;
  indice = new Map(Object.keys(dados).map((n) => [normalizar(n), n]));
}
const normalizar = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Nome oficial da família, ou null. Aceita variações de caixa e espaço. */
export function nomeOficial(nome) {
  carregar();
  return indice.get(normalizar(nome)) || null;
}

export function infoFonte(nome) {
  carregar();
  const oficial = nomeOficial(nome);
  if (!oficial) return null;
  const [c, capHeight, ascent, descent, lineGap, unitsPerEm, xHeight, xWidthAvg, pesos, italico, google] = dados[oficial];
  return {
    nome: oficial, categoria: CATEGORIAS[c], cat: c, google: !!google, italico: !!italico,
    pesos: String(pesos).split(',').map(Number),
    metricas: { familyName: oficial, capHeight, ascent, descent, lineGap, unitsPerEm, xHeight, xWidthAvg, category: c === 'r' ? 'serif' : c === 'm' ? 'monospace' : 'sans-serif' },
  };
}

export const ehSaturada = (nome) => FONTES_SATURADAS.some((f) => normalizar(f) === normalizar(nome));

/** Procura fontes por termo e/ou categoria. */
export function buscarFontes({ termo = '', categoria = '', limite = 40 } = {}) {
  carregar();
  const t = normalizar(termo);
  const cat = Object.entries(CATEGORIAS).find(([, v]) => v === categoria || v.startsWith(categoria))?.[0] || '';
  const out = [];
  for (const n of Object.keys(dados)) {
    const [c, , , , , , , , pesos, , google] = dados[n];
    if (!google) continue;
    if (cat && c !== cat) continue;
    if (t && !normalizar(n).includes(t)) continue;
    out.push({ nome: n, categoria: CATEGORIAS[c], pesos: String(pesos).split(',').map(Number), saturada: ehSaturada(n) });
    if (out.length >= limite) break;
  }
  return out;
}

/** URL do Google Fonts (css2) para as famílias e pesos pedidos. */
export function urlGoogleFonts(familias) {
  const partes = [];
  for (const f of familias) {
    const info = infoFonte(f.nome);
    if (!info || !info.google) continue;
    const pedidos = (f.pesos && f.pesos.length ? f.pesos : [400]).filter((p) => info.pesos.includes(p));
    const pesos = pedidos.length ? pedidos : [info.pesos.includes(400) ? 400 : info.pesos[0]];
    const familia = info.nome.replace(/ /g, '+');
    partes.push(pesos.length === 1 && pesos[0] === 400 ? `family=${familia}` : `family=${familia}:wght@${[...new Set(pesos)].sort((a, b) => a - b).join(';')}`);
  }
  return partes.length ? `https://fonts.googleapis.com/css2?${partes.join('&')}&display=swap` : null;
}

const FALLBACK = { r: 'Times New Roman', m: 'Courier New' };
const GENERICO = { s: 'sans-serif', r: 'serif', d: 'sans-serif', h: 'cursive', m: 'monospace' };

/**
 * Pilha de fontes com fallback métrico (size-adjust/ascent-override) gerado pelo Capsize,
 * para o texto não "pular" quando a fonte da web carrega.
 */
export function pilhaDeFontes(nome) {
  const info = infoFonte(nome);
  if (!info) return { fontFamily: `${JSON.stringify(String(nome))}, sans-serif`, fontFaces: '' };
  if (!info.google) return { fontFamily: `${JSON.stringify(info.nome)}, ${GENERICO[info.cat]}`, fontFaces: '' };
  const fallback = infoFonte(FALLBACK[info.cat] || 'Arial');
  try {
    const pilha = createFontStack([info.metricas, fallback.metricas]);
    return { fontFamily: `${pilha.fontFamily}, ${GENERICO[info.cat]}`, fontFaces: pilha.fontFaces };
  } catch {
    return { fontFamily: `${JSON.stringify(info.nome)}, ${GENERICO[info.cat]}`, fontFaces: '' };
  }
}
