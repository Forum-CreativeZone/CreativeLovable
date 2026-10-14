// Motor de auditoria: regras próprias contra o visual "feito por IA", consistência com o design system,
// acessibilidade (axe-core), responsivo e técnica, no código e no navegador real. Dá uma nota de 0 a 100.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { parse } from 'parse5';
import { parse as parseCor } from 'culori';
import { oklch } from './cor.js';
import { ehSaturada, nomeOficial } from './fontes.js';
import { carregar, abrirNavegador } from '../captura.js';

const require = createRequire(import.meta.url);

export const SEVERIDADES = ['critico', 'alto', 'medio', 'baixo'];
export const CATEGORIAS = { design: 'Design', sistema: 'Design system', conteudo: 'Conteúdo', acessibilidade: 'Acessibilidade', responsivo: 'Responsivo', tecnica: 'Técnica' };
const PESO = { critico: 12, alto: 6, medio: 3, baixo: 1 };
const TETO = { critico: 36, alto: 18, medio: 9, baixo: 3 };

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Frases que denunciam texto genérico de IA (português e inglês). */
const CLICHES = [
  'bem-vindo ao', 'bem-vindo a', 'bem vindo ao', 'solucoes inovadoras', 'transforme seu negocio', 'transforme sua', 'proximo nivel', 'eleve sua', 'eleve o seu', 'eleve seu',
  'desbloqueie', 'revolucione', 'revolucionari', 'experiencia unica', 'qualidade e excelencia', 'excelencia em', 'compromisso com a qualidade', 'a melhor solucao',
  'solucoes sob medida', 'tudo o que voce precisa', 'potencialize', 'alavanque', 'impulsione seu', 'impulsione sua', 'no mundo digital', 'mundo cada vez mais', 'somos apaixonados',
  'sua jornada', 'tecnologia de ponta', 'inovacao e tecnologia', 'simplifique sua vida', 'descubra o poder', 'mais do que um', 'nao e apenas um', 'de forma simples e rapida',
  'welcome to', 'unlock', 'elevate', 'seamless', 'cutting-edge', 'next level', 'empower', 'supercharge', 'revolutionize', 'game-changer', 'fast-paced', 'look no further',
  'unleash', 'streamline your', 'harness the power', 'world-class', 'best-in-class',
];
const VAGOS = /^(saiba mais|clique aqui|leia mais|veja mais|ver mais|learn more|click here|read more)$/i;
const PLACEHOLDER_IMG = /placehold|placeholder|picsum\.photos|dummyimage|via\.placeholder|unsplash\.it|source\.unsplash|lorempixel|fakeimg/i;
const EMOJI = /\p{Extended_Pictographic}/u;

function achado(id, categoria, severidade, mensagem, extra = {}) {
  return { id, categoria, severidade, mensagem, ...extra };
}

// ---------------- HTML ----------------

const attr = (n, nome) => n.attrs?.find((a) => a.name === nome)?.value;
const linha = (n) => n.sourceCodeLocation?.startLine || 0;

function* caminhar(n) {
  yield n;
  const filhos = n.content ? n.content.childNodes : n.childNodes;
  if (filhos) for (const f of filhos) yield* caminhar(f);
}

function textoDe(n) {
  if (n.nodeName === '#text') return n.value;
  if (n.tagName === 'script' || n.tagName === 'style' || n.tagName === 'template') return '';
  let s = '';
  for (const f of n.childNodes || []) s += textoDe(f);
  return s;
}

function nomeAcessivel(n, porId) {
  const aria = attr(n, 'aria-label') || attr(n, 'title');
  if (aria && aria.trim()) return aria.trim();
  const ref = attr(n, 'aria-labelledby');
  if (ref) return ref.split(/\s+/).map((id) => (porId.get(id) ? textoDe(porId.get(id)) : '')).join(' ').trim();
  let s = textoDe(n).trim();
  if (!s) for (const x of caminhar(n)) if (x.tagName === 'img' && attr(x, 'alt')) s += attr(x, 'alt');
  if (!s) for (const x of caminhar(n)) if (x.tagName === 'svg') { const t = (x.childNodes || []).find((c) => c.tagName === 'title'); if (t) s += textoDe(t); }
  return s.trim();
}

/** Números de efeito ("+10.000 clientes", "98%") que não aparecem no briefing. */
function numerosSemFonte(textos, brief) {
  const fonte = semAcento(brief?.conteudo || '') + ' ' + semAcento(JSON.stringify(brief?.extras || ''));
  const digitosFonte = fonte.replace(/[^\d]/g, ' ');
  const out = [];
  for (const { texto, ln } of textos) {
    const t = texto.trim();
    if (t.length > 60) continue;
    const m = t.match(/(\+\s?\d[\d.,]*\s?(mil|k|m)?\+?|\d[\d.,]*\s?(mil|k)\+?|\d[\d.,]*\+|\d{1,3}(?:[.,]\d+)?\s?%|\d[.,]\d\s?(estrelas|\/5|★))/i);
    if (!m) continue;
    const digitos = m[0].replace(/[^\d]/g, '');
    if (!digitos || digitosFonte.includes(digitos) || digitosFonte.replace(/\s/g, '').includes(digitos)) continue;
    out.push({ texto: t, ln });
  }
  return out;
}

function analisarHtml(rel, html, ctx) {
  const out = [];
  let doc;
  try { doc = parse(html, { sourceCodeLocationInfo: true }); } catch (e) { return [achado('html-invalido', 'tecnica', 'alto', `HTML não pôde ser lido: ${e.message}`, { arquivo: rel })]; }
  const nos = [...caminhar(doc)];
  const porId = new Map(nos.filter((n) => attr(n, 'id')).map((n) => [attr(n, 'id'), n]));
  const tag = (t) => nos.filter((n) => n.tagName === t);
  const add = (id, cat, sev, msg, n, extra = {}) => out.push(achado(id, cat, sev, msg, { arquivo: rel, linha: n ? linha(n) : 0, ...extra }));

  const htmlEl = tag('html')[0];
  if (htmlEl && !attr(htmlEl, 'lang')) add('sem-lang', 'acessibilidade', 'alto', 'Falta lang no <html> (ex.: <html lang="pt-BR">). Leitores de tela leem com a pronúncia errada.', htmlEl);
  const metas = tag('meta');
  if (!metas.some((m) => attr(m, 'name') === 'viewport')) add('sem-viewport', 'responsivo', 'alto', 'Falta <meta name="viewport" content="width=device-width, initial-scale=1">; no celular a página aparece minúscula.', null);
  const titulo = tag('title')[0];
  if (!titulo || !textoDe(titulo).trim()) add('sem-titulo', 'tecnica', 'medio', 'Falta <title> com o nome da página e da marca.', titulo);
  if (['site', 'landing', 'ecommerce'].includes(ctx.brief?.tipo) && !metas.some((m) => attr(m, 'name') === 'description')) add('sem-descricao', 'tecnica', 'baixo', 'Falta <meta name="description"> (aparece no Google e ao compartilhar).', null);

  if (ctx.exigirSistema) {
    const usa = tag('link').some((l) => /tokens\.css/.test(attr(l, 'href') || ''));
    if (!usa) add('sem-design-system', 'sistema', 'critico', 'A página não carrega design-system/tokens.css. Use o <head> que cl_gerar_design_system devolveu e construa só com os tokens.', null);
    const familias = ctx.familias;
    for (const l of tag('link')) {
      const href = attr(l, 'href') || '';
      if (!/fonts\.googleapis\.com/.test(href)) continue;
      for (const m of href.matchAll(/family=([^&:;]+)/g)) {
        const nome = decodeURIComponent(m[1].replace(/\+/g, ' '));
        if (!familias.includes(nomeOficial(nome) || nome)) {
          add('fonte-fora', ehSaturada(nome) ? 'design' : 'sistema', ehSaturada(nome) ? 'alto' : 'medio', `A página carrega a fonte "${nome}", que não faz parte do design system (${familias.join(', ')}).`, l);
        }
      }
    }
  }

  for (const img of tag('img')) {
    if (attr(img, 'alt') == null) add('img-sem-alt', 'acessibilidade', 'alto', `Imagem sem alt (${attr(img, 'src') || 'sem src'}). Descreva a imagem ou use alt="" se for decorativa.`, img);
    if (PLACEHOLDER_IMG.test(attr(img, 'src') || '')) add('img-placeholder', 'conteudo', 'alto', `Imagem de enchimento (${attr(img, 'src')}). Use imagens reais do cliente ou um elemento gráfico próprio.`, img);
  }
  const vagos = [];
  for (const a of tag('a')) {
    const href = attr(a, 'href');
    if (href == null || href === '' || href === '#' || /^javascript:/i.test(href)) {
      if (!attr(a, 'role') && !attr(a, 'aria-current')) add('link-morto', 'tecnica', 'medio', `Link sem destino real (href="${href ?? ''}"): "${textoDe(a).trim().slice(0, 40)}". Aponte para a seção, página ou ação de verdade.`, a);
    }
    if (attr(a, 'target') === '_blank' && !/noopener|noreferrer/.test(attr(a, 'rel') || '')) add('blank-sem-rel', 'tecnica', 'baixo', 'Link com target="_blank" sem rel="noopener".', a);
    const nome = nomeAcessivel(a, porId);
    if (!nome) add('link-sem-nome', 'acessibilidade', 'alto', 'Link sem texto nem aria-label (ícone sozinho?). Leitores de tela não sabem para onde ele leva.', a);
    if (VAGOS.test(nome)) vagos.push(a);
  }
  for (const b of tag('button')) {
    if (!nomeAcessivel(b, porId)) add('botao-sem-nome', 'acessibilidade', 'alto', 'Botão sem texto nem aria-label.', b);
    if (VAGOS.test(nomeAcessivel(b, porId))) vagos.push(b);
  }
  if (vagos.length >= 2) add('texto-vago', 'conteudo', 'medio', `${vagos.length} links ou botões dizem só "Saiba mais"/"Clique aqui". Diga o que acontece ("Ver preços do corte", "Agendar sábado").`, vagos[0]);

  const campos = tag('input').filter((i) => !['hidden', 'submit', 'button', 'reset', 'image'].includes((attr(i, 'type') || 'text').toLowerCase()))
    .concat(tag('select'), tag('textarea'));
  for (const c of campos) {
    const id = attr(c, 'id');
    const temLabel = (id && tag('label').some((l) => attr(l, 'for') === id)) || attr(c, 'aria-label') || attr(c, 'aria-labelledby');
    let pai = c.parentNode; let dentro = false;
    while (pai) { if (pai.tagName === 'label') { dentro = true; break; } pai = pai.parentNode; }
    if (!temLabel && !dentro) add('campo-sem-rotulo', 'acessibilidade', 'alto', `Campo ${attr(c, 'name') || attr(c, 'type') || c.tagName} sem rótulo (<label>). Placeholder não substitui rótulo.`, c);
  }

  const h = nos.filter((n) => /^h[1-6]$/.test(n.tagName || ''));
  const h1 = h.filter((n) => n.tagName === 'h1');
  if (h1.length === 0) add('sem-h1', 'acessibilidade', 'medio', 'A página não tem <h1>.', null);
  if (h1.length > 1) add('varios-h1', 'acessibilidade', 'medio', `A página tem ${h1.length} <h1>; deixe um só, com o assunto da página.`, h1[1]);
  for (let i = 1; i < h.length; i++) {
    const a = Number(h[i - 1].tagName[1]); const b = Number(h[i].tagName[1]);
    if (b > a + 1) { add('titulo-pulado', 'acessibilidade', 'baixo', `Hierarquia de títulos pula de <h${a}> para <h${b}>.`, h[i]); break; }
  }
  if (h1[0] && /^(bem[- ]vind|welcome)/i.test(textoDe(h1[0]).trim())) add('titulo-generico', 'conteudo', 'medio', `O título principal é "${textoDe(h1[0]).trim().slice(0, 60)}". Diga o que a pessoa ganha aqui, com as palavras do público.`, h1[0]);

  for (const n of nos) {
    if (!n.tagName) continue;
    if (['div', 'span', 'li', 'p', 'img'].includes(n.tagName) && attr(n, 'onclick') && !attr(n, 'role')) add('clique-em-div', 'acessibilidade', 'medio', `<${n.tagName} onclick> não funciona com teclado. Use <button>.`, n);
    const ti = Number(attr(n, 'tabindex'));
    if (ti > 0) add('tabindex-positivo', 'acessibilidade', 'medio', `tabindex="${ti}" bagunça a ordem do teclado. Use 0 ou -1.`, n);
    if (n.tagName === 'iframe' && !attr(n, 'title')) add('iframe-sem-titulo', 'acessibilidade', 'medio', 'iframe sem title.', n);
    if (n.tagName === 'video' && attr(n, 'autoplay') != null && attr(n, 'muted') == null) add('video-som', 'acessibilidade', 'medio', 'Vídeo com autoplay e som. Use muted ou deixe a pessoa dar o play.', n);
  }

  // Emoji como ícone: elementos curtos que são só emoji, ou títulos e botões que começam com emoji.
  let emojis = 0; let primeiroEmoji = null;
  for (const n of nos) {
    if (!n.tagName || ['script', 'style'].includes(n.tagName)) continue;
    const proprio = (n.childNodes || []).filter((c) => c.nodeName === '#text').map((c) => c.value).join('').trim();
    if (!proprio) continue;
    const soEmoji = proprio.length <= 4 && EMOJI.test(proprio) && !/[\p{L}\p{N}]/u.test(proprio);
    const comeca = /^(h[1-6]|button|a|li|strong)$/.test(n.tagName) && EMOJI.test([...proprio][0] || '');
    if (soEmoji || comeca) { emojis++; primeiroEmoji = primeiroEmoji || n; }
  }
  if (emojis >= 2) add('emoji-icone', 'design', 'medio', `${emojis} emojis usados como ícone. É uma das marcas de site feito por IA: use ícones de traço consistentes (SVG) ou nenhum.`, primeiroEmoji);

  // Texto: enchimento, clichês, números inventados.
  const textos = [];
  for (const n of nos) if (n.nodeName === '#text' && n.value.trim() && !['script', 'style'].includes(n.parentNode?.tagName)) textos.push({ texto: n.value, ln: linha(n.parentNode) || linha(n) });
  const tudo = semAcento(textos.map((t) => t.texto).join(' \n '));
  if (/lorem ipsum|dolor sit amet/.test(tudo)) add('lorem', 'conteudo', 'critico', 'Há "lorem ipsum" na página. Use o conteúdo real do briefing.', null);
  const vistos = new Set();
  for (const c of CLICHES) {
    if (vistos.size >= 6) break;
    const re = new RegExp('(^|[^a-z])' + c.replace(/[-]/g, '[- ]') + '([^a-z]|$)');
    if (!re.test(tudo)) continue;
    const t = textos.find((x) => re.test(semAcento(x.texto)));
    const frase = (t?.texto || c).trim().slice(0, 80);
    if (vistos.has(frase)) continue;
    vistos.add(frase);
    add('cliche', 'conteudo', 'medio', `Texto clichê: "${frase}". Troque por algo específico deste negócio.`, null, { linha: t?.ln || 0 });
  }
  for (const n of numerosSemFonte(textos, ctx.brief).slice(0, 3)) {
    add('numero-sem-fonte', 'conteudo', 'medio', `"${n.texto}" parece um número de efeito que não está no briefing. Use só dados reais do cliente (ou tire).`, null, { linha: n.ln });
  }
  if (ctx.brief?.marca?.nome && !semAcento(tudo).includes(semAcento(ctx.brief.marca.nome).split(' ')[0])) add('sem-marca', 'conteudo', 'medio', `O nome da marca (${ctx.brief.marca.nome}) não aparece na página.`, null);

  // Classes do Tailwind que denunciam o "visual de IA".
  const classes = nos.map((n) => attr(n, 'class') || '').join(' ');
  if (/\bbg-gradient-to-\w+\b[^"]*\b(from|via|to)-(purple|violet|indigo|fuchsia)-\d+/.test(classes) || /\b(from|via)-(purple|violet|indigo)-\d+\b[\s\S]*\bto-(blue|pink|cyan|indigo|purple)-\d+/.test(classes)) {
    add('gradiente-roxo', 'design', 'alto', 'Gradiente roxo/azul (classes from-purple/to-blue): a estética padrão de site gerado por IA. Use as cores da direção aprovada.', null);
  }
  if (/\bbg-clip-text\b/.test(classes) && /\btext-transparent\b/.test(classes)) add('texto-gradiente', 'design', 'medio', 'Texto com gradiente (bg-clip-text text-transparent): tique visual de IA e piora a leitura.', null);
  const vidro = (classes.match(/\bbackdrop-blur(-\w+)?\b/g) || []).length;
  if (vidro > 3) add('vidro-demais', 'design', 'baixo', `${vidro} elementos com desfoque de vidro (backdrop-blur). Use só onde há algo atrás para desfocar.`, null);
  const fofos = (classes.match(/\brounded-(2xl|3xl)\b/g) || []).length;
  const sombras = (classes.match(/\bshadow-(xl|2xl)\b/g) || []).length;
  if (fofos > 6 && sombras > 4) add('cartoes-fofos', 'design', 'baixo', 'Muitos blocos com rounded-2xl + shadow-xl: o "cartão flutuante" genérico. Use os raios e sombras do design system.', null);
  if (/\b(from|to|via|bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/.test(classes) && ctx.exigirSistema) {
    const n = (classes.match(/\b(bg|text|border|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g) || []).length;
    add('cores-tailwind', 'sistema', n > 10 ? 'alto' : 'medio', `${n} classes de cor padrão do Tailwind (ex.: bg-blue-600). Use as cores do design system (bg-marca, text-texto-suave… com design-system/tailwind-tema.js) ou as variáveis CSS.`, null);
  }
  let centrados = 0;
  for (const n of nos) {
    const c = attr(n, 'class') || ''; const st = attr(n, 'style') || '';
    if ((/\btext-center\b/.test(c) || /text-align:\s*center/.test(st)) && textoDe(n).trim().length > 200) centrados++;
  }
  if (centrados >= 2) add('texto-centralizado', 'design', 'baixo', `${centrados} blocos de texto longo centralizados. Texto corrido alinhado à esquerda lê melhor.`, null);

  // CSS embutido
  for (const st of tag('style')) {
    const css = textoDe({ childNodes: st.childNodes });
    out.push(...analisarCss(rel, css, ctx, linha(st) - 1));
  }
  let inline = 0; let primeiro = null;
  for (const n of nos) {
    const st = attr(n, 'style');
    if (st && /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i.test(st) && !/var\(--/.test(st)) { inline++; primeiro = primeiro || n; }
  }
  if (inline && ctx.exigirSistema) add('cor-inline', 'sistema', inline > 3 ? 'medio' : 'baixo', `${inline} elementos com cor fixa em style="". Use as variáveis do design system.`, primeiro);
  return out;
}

// ---------------- CSS ----------------

function corDe(s) { try { return parseCor(s); } catch { return null; } }

function gradienteRoxoAzul(valor) {
  const cores = (valor.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/gi) || []).map(corDe).filter(Boolean).map((c) => oklch(c));
  const fortes = cores.filter((c) => (c.c || 0) > 0.09 && Number.isFinite(c.h));
  const roxo = fortes.some((c) => c.h >= 270 && c.h <= 330);
  const azul = fortes.some((c) => c.h >= 200 && c.h < 270);
  return roxo && (azul || fortes.filter((c) => c.h >= 270 && c.h <= 330).length >= 2);
}

function analisarCss(rel, css, ctx, desloc = 0) {
  const out = [];
  const add = (id, cat, sev, msg, ln, extra = {}) => out.push(achado(id, cat, sev, msg, { arquivo: rel, linha: ln ? ln + desloc : 0, ...extra }));
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const linhas = semComentarios.split('\n');
  const lnDe = (idx) => semComentarios.slice(0, idx).split('\n').length;
  const ehTokens = /(^|\/)design-system\//.test(rel);
  if (ehTokens) return out;

  if (ctx.exigirSistema) {
    const literais = [];
    linhas.forEach((l, i) => {
      const decl = l.replace(/var\([^)]*\)/g, '');
      if (/^\s*--/.test(l)) return;
      const m = decl.match(/#[0-9a-f]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d|oklch\(\s*[\d.]/gi);
      if (m && /:/.test(decl)) literais.push({ ln: i + 1, valor: m[0], texto: l.trim().slice(0, 80) });
    });
    if (literais.length) {
      add('cor-fora', 'sistema', literais.length > 8 ? 'alto' : 'medio', `${literais.length} cores fixas fora do design system (ex.: linha ${literais[0].ln}: ${literais[0].texto}). Troque por var(--cor-…).`, literais[0].ln, { exemplos: literais.slice(0, 5).map((x) => `${x.ln}: ${x.texto}`) });
    }
    const fontes = [];
    for (const m of semComentarios.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
      const v = m[1].trim();
      if (/var\(--fonte-|inherit|initial|unset/.test(v)) continue;
      fontes.push({ ln: lnDe(m.index), v });
    }
    for (const m of semComentarios.matchAll(/(?:^|[;{\s])font\s*:\s*([^;}]+)/gi)) {
      const v = m[1].trim();
      if (/var\(--fonte-|inherit/.test(v) || !/[a-z]{3,}/i.test(v.replace(/\b(bold|italic|normal|\d+(px|rem|em|%)?)\b/g, ''))) continue;
      fontes.push({ ln: lnDe(m.index), v });
    }
    for (const f of fontes.slice(0, 3)) {
      const nome = f.v.split(',')[0].replace(/["']/g, '').trim();
      const saturada = ehSaturada(nome);
      add('fonte-fora', saturada ? 'design' : 'sistema', saturada ? 'alto' : 'medio', `font-family "${f.v.slice(0, 60)}" fora do design system. Use var(--fonte-titulos), var(--fonte-texto) ou var(--fonte-mono).`, f.ln);
    }
    const tamanhos = [...semComentarios.matchAll(/font-size\s*:\s*([\d.]+(px|rem|em|pt))/gi)];
    if (tamanhos.length > 2) add('tamanho-fora', 'sistema', 'baixo', `${tamanhos.length} tamanhos de fonte fixos (ex.: ${tamanhos[0][1]}). Use var(--tamanho-…) da escala fluida.`, lnDe(tamanhos[0].index));
  }
  for (const m of semComentarios.matchAll(/(?:background(?:-image)?)\s*:\s*([^;}]*gradient\([^;}]*)/gi)) {
    if (gradienteRoxoAzul(m[1])) { add('gradiente-roxo', 'design', 'alto', 'Gradiente roxo/azul: a estética padrão de site gerado por IA. Use as cores da direção aprovada.', lnDe(m.index)); break; }
  }
  if (/background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/i.test(semComentarios)) add('texto-gradiente', 'design', 'medio', 'Texto com gradiente (background-clip: text): tique visual de IA e piora a leitura.', lnDe(semComentarios.search(/background-clip\s*:\s*text/i)));
  // Borda grossa só de um lado em bloco arredondado: o "cartão com aba" de IA.
  for (const m of semComentarios.matchAll(/\{([^{}]*)\}/g)) {
    const b = m[1];
    if (/border-(left|right|inline-start|inline-end)\s*:\s*([3-9]|\d{2,})px/i.test(b) && /border-radius\s*:\s*(\d{2,}|[6-9])px/i.test(b)) {
      add('borda-lateral', 'design', 'medio', 'Borda grossa só de um lado num bloco arredondado: o detalhe mais reconhecível de interface gerada por IA. Tire ou use outro recurso (fundo, ícone, tipografia).', lnDe(m.index));
      break;
    }
  }
  if (/transition\s*:\s*all\b/i.test(semComentarios)) add('transicao-all', 'tecnica', 'baixo', '"transition: all" anima propriedades sem querer e pesa. Liste as propriedades (transform, opacity, color).', lnDe(semComentarios.search(/transition\s*:\s*all\b/i)));
  const layoutAnim = semComentarios.match(/transition(?:-property)?\s*:[^;]*\b(width|height|top|left|margin|padding)\b/i);
  if (layoutAnim) add('anima-layout', 'tecnica', 'baixo', `Transição em ${layoutAnim[1]} força recálculo de layout. Anime transform e opacity.`, lnDe(layoutAnim.index));
  const anima = /@keyframes|animation\s*:/i.test(semComentarios);
  if (anima && !/prefers-reduced-motion/i.test(semComentarios) && !ctx.temReducaoGlobal) add('sem-reducao-movimento', 'acessibilidade', 'medio', 'Há animações sem @media (prefers-reduced-motion: reduce). Quem pede menos movimento precisa ver o estado final sem animação.', lnDe(semComentarios.search(/@keyframes|animation\s*:/i)));
  const z = semComentarios.match(/z-index\s*:\s*(\d{4,})/);
  if (z) add('z-index-alto', 'tecnica', 'baixo', `z-index: ${z[1]}. Use a escala --z-menu, --z-dialogo, --z-aviso.`, lnDe(z.index));
  const imp = (semComentarios.match(/!important/g) || []).length;
  if (imp > 5) add('important', 'tecnica', 'baixo', `${imp} !important: sinal de CSS brigando consigo mesmo.`, 0);
  const vidro = (semComentarios.match(/backdrop-filter\s*:\s*blur/gi) || []).length;
  if (vidro > 3) add('vidro-demais', 'design', 'baixo', `${vidro} regras com desfoque de vidro. Use só onde há algo atrás para desfocar.`, 0);
  return out;
}

function analisarJsx(rel, codigo, ctx) {
  const out = [];
  const add = (id, cat, sev, msg, ln = 0) => out.push(achado(id, cat, sev, msg, { arquivo: rel, linha: ln }));
  const lnDe = (idx) => codigo.slice(0, idx).split('\n').length;
  const t = semAcento(codigo);
  if (/lorem ipsum|dolor sit amet/.test(t)) add('lorem', 'conteudo', 'critico', 'Há "lorem ipsum" no código. Use o conteúdo real.', lnDe(t.search(/lorem ipsum|dolor sit amet/)));
  for (const c of CLICHES.slice(0, 40)) {
    const i = t.indexOf(c);
    if (i >= 0 && /[>"'`]/.test(t.slice(Math.max(0, i - 40), i))) { add('cliche', 'conteudo', 'medio', `Texto clichê perto de "${codigo.slice(i, i + 50).trim()}". Troque por algo específico.`, lnDe(i)); break; }
  }
  const imgs = [...codigo.matchAll(/src=["'{`]([^"'`}]*)/g)].filter((m) => PLACEHOLDER_IMG.test(m[1]));
  if (imgs.length) add('img-placeholder', 'conteudo', 'alto', `Imagem de enchimento (${imgs[0][1]}).`, lnDe(imgs[0].index));
  if (ctx.exigirSistema) {
    const cores = [...codigo.matchAll(/(?:color|background|backgroundColor|borderColor|fill|stroke)\s*:\s*['"`](#[0-9a-f]{3,8}|rgba?\(|hsla?\()/gi)];
    if (cores.length) add('cor-fora', 'sistema', cores.length > 5 ? 'alto' : 'medio', `${cores.length} cores fixas em estilos inline. Use var(--cor-…).`, lnDe(cores[0].index));
  }
  if (/bg-clip-text/.test(codigo) && /text-transparent/.test(codigo)) add('texto-gradiente', 'design', 'medio', 'Texto com gradiente (bg-clip-text text-transparent).', lnDe(codigo.indexOf('bg-clip-text')));
  if (/\b(from|via)-(purple|violet|indigo)-\d+\b/.test(codigo) && /\bto-(blue|pink|cyan|indigo|purple)-\d+\b/.test(codigo)) add('gradiente-roxo', 'design', 'alto', 'Gradiente roxo/azul nas classes.', lnDe(codigo.search(/\b(from|via)-(purple|violet|indigo)-\d+\b/)));
  const emojis = (codigo.match(/>\s*\p{Extended_Pictographic}️?\s*</gu) || []).length;
  if (emojis >= 2) add('emoji-icone', 'design', 'medio', `${emojis} emojis como ícone.`);
  return out;
}

// ---------------- coleta ----------------

const EXT_PAGINA = /\.html?$/i;
const EXT_CSS = /\.css$/i;
const EXT_JSX = /\.(jsx|tsx|js|ts|vue|svelte)$/i;
const FORA = /^(design-system|docs|node_modules|dist|build|public\/vendor)\//;

export async function analisarEstatico({ workspace, slug, brief, sistema, exigirSistema }) {
  const arquivos = await workspace.listarArquivos(slug);
  const ctx = {
    brief, exigirSistema,
    familias: sistema ? [sistema.tipografia.titulos.familia, sistema.tipografia.texto.familia, sistema.tipografia.mono.familia] : [],
    temReducaoGlobal: false,
  };
  const achados = [];
  const paginas = [];
  const raiz = workspace.raiz(slug);
  const conteudos = new Map();
  for (const a of arquivos) {
    if (FORA.test(a.caminho) || a.bytes > 1024 * 1024) continue;
    if (EXT_PAGINA.test(a.caminho) || EXT_CSS.test(a.caminho) || (EXT_JSX.test(a.caminho) && /^(src|app|components|pages)\//.test(a.caminho))) {
      conteudos.set(a.caminho, await fs.readFile(path.join(raiz, a.caminho), 'utf8'));
    }
  }
  ctx.temReducaoGlobal = [...conteudos.entries()].some(([k, v]) => EXT_CSS.test(k) && /prefers-reduced-motion/.test(v));
  for (const [rel, txt] of conteudos) {
    if (EXT_PAGINA.test(rel)) { paginas.push(rel); achados.push(...analisarHtml(rel, txt, ctx)); }
    else if (EXT_CSS.test(rel)) achados.push(...analisarCss(rel, txt, ctx));
    else achados.push(...analisarJsx(rel, txt, ctx));
  }
  if (exigirSistema && !paginas.length && [...conteudos.keys()].some((k) => EXT_JSX.test(k))) {
    const usa = [...conteudos.entries()].some(([k, v]) => EXT_JSX.test(k) && /design-system\/tokens\.css/.test(v)) || [...conteudos.entries()].some(([k, v]) => EXT_CSS.test(k) && /tokens\.css/.test(v));
    if (!usa) achados.push(achado('sem-design-system', 'sistema', 'critico', 'O app não importa design-system/tokens.css (faça import "../design-system/tokens.css" no main.jsx).', { arquivo: 'src/main.jsx' }));
  }
  if (exigirSistema && !fss.existsSync(path.join(raiz, 'design-system', 'tokens.css'))) {
    achados.push(achado('sistema-ausente', 'sistema', 'critico', 'design-system/tokens.css não existe. Gere o design system com cl_gerar_design_system.', {}));
  }
  return { achados, paginas: paginas.sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b))) };
}

// ---------------- navegador ----------------

const IMPACTO = { critical: 'critico', serious: 'alto', moderate: 'medio', minor: 'baixo' };

async function examinarPagina(pagina, { erros }) {
  return pagina.evaluate(() => {
    const vw = window.innerWidth;
    const caminho = (el) => {
      const partes = [];
      for (let e = el; e && e.nodeType === 1 && partes.length < 4; e = e.parentElement) {
        let p = e.tagName.toLowerCase();
        if (e.id) { p += '#' + e.id; partes.unshift(p); break; }
        const c = (e.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean)[0];
        if (c) p += '.' + c;
        partes.unshift(p);
      }
      return partes.join(' > ');
    };
    const transbordo = document.documentElement.scrollWidth > vw + 1;
    const largos = [];
    if (transbordo) {
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('[data-creative-ui]')) continue;
        const r = el.getBoundingClientRect();
        if (r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed') { largos.push(caminho(el) + ` (${Math.round(r.right)}px)`); if (largos.length > 3) break; }
      }
    }
    const pequenos = [];
    for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch]')) {
      if (el.closest('[data-creative-ui]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      const emTexto = el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /^(P|LI|SPAN|TD|DD|FIGCAPTION|LABEL)$/.test(el.parentElement.tagName);
      if (!emTexto && (r.width < 24 || r.height < 24)) pequenos.push(caminho(el) + ` (${Math.round(r.width)}x${Math.round(r.height)})`);
    }
    const familias = new Map();
    const tamanhos = new Set();
    let textoMinusculo = 0;
    for (const el of document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,button,span,label,td,th,small,strong,em,blockquote,figcaption,input,dd,dt')) {
      if (el.closest('[data-creative-ui]')) continue;
      const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!temTexto) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      familias.set(fam, (familias.get(fam) || 0) + 1);
      tamanhos.add(Math.round(parseFloat(cs.fontSize)));
      if (parseFloat(cs.fontSize) < 12) textoMinusculo++;
    }
    const h1 = document.querySelector('main h1, h1');
    let tituloGrande = null;
    if (h1) {
      const r = h1.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(h1).fontSize);
      const n = h1.textContent.trim().length;
      if ((fs >= 56 && n > 40) || r.height > window.innerHeight * 0.5) tituloGrande = { fs: Math.round(fs), n, altura: Math.round(r.height) };
    }
    const cta = [...document.querySelectorAll('main a.botao, main button.botao, main [class*="btn"], main [class*="cta"], main a[href^="#"][class], main button[type=submit]')]
      .find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('nav'); });
    const ctaTopo = cta ? Math.round(cta.getBoundingClientRect().top + window.scrollY) : null;
    let rotulos = 0;
    for (const h of document.querySelectorAll('h1, h2')) {
      const ant = h.previousElementSibling;
      if (!ant || ant.children.length > 1) continue;
      const t = ant.textContent.trim();
      if (!t || t.length > 48) continue;
      const cs = getComputedStyle(ant);
      const pequeno = parseFloat(cs.fontSize) < parseFloat(getComputedStyle(h).fontSize) * 0.6;
      const espacado = cs.textTransform === 'uppercase' || cs.fontVariantCaps.includes('small-caps') || parseFloat(cs.letterSpacing) > parseFloat(cs.fontSize) * 0.04;
      if (pequeno && espacado) rotulos++;
    }
    const imagensQuebradas = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && !i.closest('[data-creative-ui]')).map((i) => i.getAttribute('src'));
    return {
      transbordo, largos, pequenos: pequenos.slice(0, 6), totalPequenos: pequenos.length, tituloGrande, ctaTopo, ctaTexto: cta ? cta.textContent.trim().slice(0, 40) : null, rotulos, alturaTela: window.innerHeight,
      familias: [...familias.entries()].sort((a, b) => b[1] - a[1]), tamanhos: [...tamanhos].sort((a, b) => a - b), textoMinusculo, imagensQuebradas,
      alturaPagina: document.documentElement.scrollHeight,
    };
  }).then((r) => ({ ...r, erros }));
}

async function rodarAxe(pagina, fonteAxe) {
  if (fonteAxe) await pagina.addScriptTag({ content: fonteAxe });
  return pagina.evaluate(async () => {
    const r = await window.axe.run({ exclude: [['[data-creative-ui]'], ['[data-creative-runtime]']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'],
    });
    return r.violations.map((v) => ({ id: v.id, impacto: v.impact, ajuda: v.help, url: v.helpUrl, nos: v.nodes.slice(0, 3).map((n) => ({ alvo: n.target.join(' '), resumo: (n.failureSummary || '').split('\n').slice(0, 2).join(' ') })), total: v.nodes.length }));
  });
}

/**
 * Abre as páginas num Chromium invisível, no computador e no celular, roda o axe-core, mede e fotografa.
 * Devolve null quando não há navegador disponível.
 */
export async function analisarNoNavegador({ urlBase, paginas, sistema, dirCapturas, temaAutomatico }) {
  const pw = await carregar();
  if (!pw) return null;
  let navegador;
  try { navegador = await abrirNavegador(pw); } catch (e) { return { indisponivel: String(e.message || e).split('\n')[0] }; }
  const fonteAxe = await fs.readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
  const achados = [];
  const capturas = [];
  const metricas = { paginas: [] };
  const familiasDs = sistema ? [sistema.tipografia.titulos.familia, sistema.tipografia.texto.familia, sistema.tipografia.mono.familia] : null;
  const alvo = (p) => new URL(p.replace(/^\/+/, ''), urlBase.endsWith('/') ? urlBase : urlBase + '/').href;
  const lista = paginas.length ? paginas.slice(0, 5) : [''];
  if (dirCapturas) await fs.mkdir(dirCapturas, { recursive: true });
  try {
    for (const [i, p] of lista.entries()) {
      const rotulo = p || 'index';
      for (const vista of [{ nome: 'computador', w: 1280, h: 800 }, { nome: 'celular', w: 390, h: 844, mobile: true }]) {
        const ctxNav = await navegador.newContext({ viewport: { width: vista.w, height: vista.h }, deviceScaleFactor: 1, isMobile: !!vista.mobile, hasTouch: !!vista.mobile, colorScheme: sistema?.modo === 'escuro' ? 'dark' : 'light' });
        const pagina = await ctxNav.newPage();
        const erros = [];
        pagina.on('pageerror', (e) => erros.push({ tipo: 'erro', texto: e.message }));
        pagina.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_PROXY/.test(m.text())) erros.push({ tipo: 'console', texto: m.text() }); });
        pagina.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(new URL(urlBase).origin) && !/\/api\/eventos/.test(u)) erros.push({ tipo: 'recurso', texto: 'Não carregou: ' + u.replace(new URL(urlBase).origin, '') }); });
        try {
          await pagina.goto(alvo(p), { waitUntil: 'load', timeout: 25000 });
        } catch (e) {
          achados.push(achado('pagina-nao-abre', 'tecnica', 'critico', `A página ${rotulo} não abriu no navegador: ${String(e.message).split('\n')[0]}`, { arquivo: p }));
          await ctxNav.close();
          continue;
        }
        await pagina.waitForTimeout(400);
        const m = await examinarPagina(pagina, { erros });
        if (vista.nome === 'computador') {
          const v = await rodarAxe(pagina, fonteAxe).catch(() => []);
          for (const x of v) {
            achados.push(achado('axe-' + x.id, 'acessibilidade', IMPACTO[x.impacto] || 'medio',
              `${x.ajuda} (${x.total} ${x.total === 1 ? 'ocorrência' : 'ocorrências'}) em ${x.nos.map((n) => n.alvo).join('; ')}`, { arquivo: p, fonte: 'axe-core', referencia: x.url, detalhe: x.nos[0]?.resumo }));
          }
          if (familiasDs && sistema) {
            const fora = m.familias.filter(([f]) => !familiasDs.includes(f) && !/^(system-ui|-apple-system|sans-serif|serif|monospace|Arial|Times New Roman|Courier New)$/i.test(f) && !/fallback|reserva/i.test(f));
            if (fora.length) achados.push(achado('fonte-fora-render', 'sistema', 'medio', `Texto renderizado com fontes fora do sistema: ${fora.map(([f, n]) => `${f} (${n})`).slice(0, 3).join(', ')}.`, { arquivo: p }));
          }
          if (m.tituloGrande) achados.push(achado('titulo-gigante', 'design', 'medio', `O título principal tem ${m.tituloGrande.n} caracteres em ${m.tituloGrande.fs}px e ocupa ${m.tituloGrande.altura}px de altura. Frase longa em tamanho de cartaz domina a tela: encurte o texto ou use um passo menor da escala.`, { arquivo: p }));
          if (m.ctaTopo != null && m.ctaTopo > m.alturaTela) achados.push(achado('acao-abaixo-da-dobra', 'design', 'medio', `A ação principal ("${m.ctaTexto}") só aparece depois de rolar (${m.ctaTopo}px; a tela tem ${m.alturaTela}px). Ela precisa estar no primeiro scroll.`, { arquivo: p }));
          if (m.rotulos >= 1) achados.push(achado('rotulo-acima-titulo', 'design', m.rotulos >= 3 ? 'medio' : 'baixo', `${m.rotulos} rótulo(s) pequeno(s) em caixa alta logo acima de títulos: tique de página gerada por IA. Deixe o título falar sozinho.`, { arquivo: p }));
          if (m.tamanhos.length > 12) achados.push(achado('escala-ignorada', 'sistema', 'baixo', `${m.tamanhos.length} tamanhos de fonte diferentes na página (${m.tamanhos.join(', ')}px). Uma escala usa 6 a 9.`, { arquivo: p }));
          metricas.paginas.push({ pagina: rotulo, familias: m.familias.slice(0, 5), tamanhos: m.tamanhos, altura: m.alturaPagina });
          if (temaAutomatico) {
            await pagina.emulateMedia({ colorScheme: sistema?.modo === 'escuro' ? 'light' : 'dark' });
            await pagina.waitForTimeout(150);
            const v2 = await rodarAxe(pagina, '').catch(() => []);
            for (const x of v2.filter((y) => y.id === 'color-contrast')) achados.push(achado('axe-contraste-tema', 'acessibilidade', 'alto', `No tema alternativo: ${x.ajuda} (${x.total}) em ${x.nos.map((n) => n.alvo).join('; ')}`, { arquivo: p, fonte: 'axe-core' }));
            if (i === 0 && dirCapturas) {
              const arq = path.join(dirCapturas, 'computador-tema.jpg');
              await pagina.screenshot({ path: arq, type: 'jpeg', quality: 70 });
              capturas.push({ nome: 'computador-tema', pagina: rotulo, arquivo: arq });
            }
            await pagina.emulateMedia({ colorScheme: sistema?.modo === 'escuro' ? 'dark' : 'light' });
          }
        } else {
          if (m.ctaTopo != null && m.ctaTopo > m.alturaTela * 1.15) achados.push(achado('acao-abaixo-da-dobra-celular', 'responsivo', 'baixo', `No celular, a ação principal ("${m.ctaTexto}") fica a ${m.ctaTopo}px do topo; a tela tem ${m.alturaTela}px.`, { arquivo: p }));
          if (m.transbordo) achados.push(achado('transborda-celular', 'responsivo', 'alto', `No celular (390px) a página rola para o lado. Elementos largos: ${m.largos.join('; ') || 'não identificados'}.`, { arquivo: p }));
          if (m.totalPequenos) achados.push(achado('alvo-pequeno', 'responsivo', m.totalPequenos > 4 ? 'medio' : 'baixo', `${m.totalPequenos} alvos de toque menores que 24px no celular: ${m.pequenos.slice(0, 3).join('; ')}. O mínimo confortável é 44px.`, { arquivo: p }));
          if (m.textoMinusculo > 2) achados.push(achado('texto-minusculo', 'responsivo', 'medio', `${m.textoMinusculo} textos com menos de 12px no celular.`, { arquivo: p }));
        }
        for (const e of m.erros.slice(0, 5)) {
          achados.push(achado(e.tipo === 'recurso' ? 'recurso-falhou' : 'erro-js', 'tecnica', e.tipo === 'erro' ? 'critico' : 'alto', `${e.tipo === 'recurso' ? '' : 'Erro no navegador: '}${e.texto}`.slice(0, 300), { arquivo: p }));
        }
        if (m.imagensQuebradas.length) achados.push(achado('imagem-quebrada', 'tecnica', 'alto', `Imagens que não carregam: ${m.imagensQuebradas.slice(0, 3).join(', ')}.`, { arquivo: p }));
        if (i === 0 && dirCapturas) {
          const arq = path.join(dirCapturas, vista.nome + '.jpg');
          await pagina.screenshot({ path: arq, type: 'jpeg', quality: 72 });
          capturas.push({ nome: vista.nome, pagina: rotulo, arquivo: arq });
        }
        await ctxNav.close();
      }
    }
  } finally {
    await navegador.close().catch(() => {});
  }
  // Erros iguais nas duas larguras contam uma vez.
  const vistos = new Set();
  const unicos = achados.filter((a) => { const k = a.id + '|' + a.mensagem; if (vistos.has(k)) return false; vistos.add(k); return true; });
  return { achados: unicos, capturas, metricas };
}

// ---------------- Impeccable (opcional) ----------------

let caminhoImpeccable;
function localizarImpeccable() {
  if (caminhoImpeccable !== undefined) return caminhoImpeccable;
  caminhoImpeccable = null;
  const [maior, menor] = process.versions.node.split('.').map(Number);
  if (maior < 22 || (maior === 22 && menor < 18) || process.env.CL_SEM_IMPECCABLE === '1') return null;
  try {
    const pkg = require.resolve('impeccable/package.json');
    const cli = path.join(path.dirname(pkg), 'cli', 'bin', 'cli.js');
    if (fss.existsSync(cli)) caminhoImpeccable = cli;
  } catch { /* não instalado */ }
  return caminhoImpeccable;
}

/** Roda o detector do Impeccable (Apache-2.0) nas páginas, se estiver instalado. */
export function rodarImpeccable(arquivos, cwd, { tempoMs = 60000 } = {}) {
  const cli = localizarImpeccable();
  if (!cli || !arquivos.length) return Promise.resolve({ estado: cli ? 'sem-arquivos' : 'indisponivel', achados: [] });
  return new Promise((ok) => {
    const p = spawn(process.execPath, [cli, 'detect', '--json', '--no-config', ...arquivos], { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } });
    let saida = '';
    const t = setTimeout(() => { p.kill('SIGKILL'); ok({ estado: 'tempo-esgotado', achados: [] }); }, tempoMs);
    p.stdout.on('data', (d) => { saida += d; });
    p.on('error', () => { clearTimeout(t); ok({ estado: 'falhou', achados: [] }); });
    p.on('close', () => {
      clearTimeout(t);
      try {
        const inicio = saida.indexOf('[');
        const lista = JSON.parse(saida.slice(inicio));
        ok({ estado: 'ok', achados: Array.isArray(lista) ? lista : [] });
      } catch { ok({ estado: 'falhou', achados: [] }); }
    });
  });
}

/** Regras que o próprio Creative Lovable já mede melhor no navegador real. */
const PULAR_IMPECCABLE = new Set(['low-contrast', 'side-tab', 'gradient-text', 'purple-gradient', 'emoji-icons', 'missing-alt', 'broken-image', 'script-error', 'skipped-heading', 'overused-font']);
/** Regras de layout que, na leitura de arquivos, não resolvem as variáveis CSS do design system (falsos positivos). */
const LAYOUT_IMPECCABLE = new Set(['cramped-padding', 'body-text-viewport-edge', 'edge-flush-cards', 'text-overflow', 'text-occlusion', 'first-viewport-column-overflow', 'clipped-overflow-container', 'tight-leading', 'heading-rhythm', 'line-length', 'monotonous-spacing', 'flat-type-hierarchy', 'tiny-text', 'undersized-ui-text']);

function converterImpeccable(lista, raiz, comAxe) {
  const out = [];
  const vistos = new Set();
  for (const f of lista) {
    if (comAxe && PULAR_IMPECCABLE.has(f.antipattern)) continue;
    if (LAYOUT_IMPECCABLE.has(f.antipattern)) continue;
    const arquivo = f.file ? path.relative(raiz, f.file).split(path.sep).join('/') : '';
    const chave = f.antipattern + '|' + arquivo + '|' + (f.snippet || '');
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    const sev = f.severity === 'error' ? 'alto' : f.severity === 'warning' ? 'medio' : 'baixo';
    out.push(achado('impeccable-' + f.antipattern, f.category === 'slop' ? 'design' : 'tecnica', sev,
      `${f.name}: ${f.description}${f.snippet ? ` (${String(f.snippet).slice(0, 120)})` : ''}`, { arquivo, linha: f.line || 0, fonte: 'impeccable' }));
  }
  return out.slice(0, 25);
}

// ---------------- nota ----------------

export function pontuar(achados, notaMinima = 80) {
  const porRegra = new Map();
  for (const a of achados) {
    const k = a.id + '|' + a.severidade;
    porRegra.set(k, Math.min(TETO[a.severidade], (porRegra.get(k) || 0) + PESO[a.severidade]));
  }
  const total = [...porRegra.values()].reduce((s, v) => s + v, 0);
  const porCategoria = {};
  for (const cat of Object.keys(CATEGORIAS)) {
    const m = new Map();
    for (const a of achados.filter((x) => x.categoria === cat)) {
      const k = a.id + '|' + a.severidade;
      m.set(k, Math.min(TETO[a.severidade], (m.get(k) || 0) + PESO[a.severidade]));
    }
    porCategoria[cat] = Math.max(0, 100 - [...m.values()].reduce((s, v) => s + v, 0));
  }
  const contagem = Object.fromEntries(SEVERIDADES.map((s) => [s, achados.filter((a) => a.severidade === s).length]));
  const nota = Math.max(0, Math.round(100 - total));
  return { nota, porCategoria, contagem, aprovada: nota >= notaMinima && contagem.critico === 0 };
}

/**
 * Auditoria completa. ctx: { workspace, slug, brief, sistema, exigirSistema, urlBase, notaMinima, dirCapturas, navegador }
 */
export async function auditar(ctx) {
  const inicio = Date.now();
  const estatico = await analisarEstatico(ctx);
  const achados = [...estatico.achados];
  let nav = null;
  let cobertura = 'estatica';
  if (ctx.navegador !== false && ctx.urlBase) {
    nav = await analisarNoNavegador({ urlBase: ctx.urlBase, paginas: estatico.paginas, sistema: ctx.sistema, dirCapturas: ctx.dirCapturas, temaAutomatico: ctx.sistema?.temaAutomatico });
    if (nav && !nav.indisponivel) { achados.push(...nav.achados); cobertura = 'navegador'; }
  }
  if (cobertura === 'estatica') {
    achados.push(achado('sem-navegador', 'acessibilidade', 'medio', ctx.urlBase
      ? 'Auditoria sem navegador: contraste real, teclado e responsivo não foram medidos. Instale o playwright-core no Creative Lovable (veja cl_capturar_tela).'
      : 'Auditoria sem navegador: o app não está rodando. Inicie com cl_iniciar_servidor e audite de novo.', {}));
  }
  const raiz = ctx.workspace.raiz(ctx.slug);
  const imp = await rodarImpeccable(estatico.paginas.map((p) => path.join(raiz, p)), raiz);
  achados.push(...converterImpeccable(imp.achados, raiz, cobertura === 'navegador'));
  const ordem = (a) => SEVERIDADES.indexOf(a.severidade);
  achados.sort((a, b) => ordem(a) - ordem(b) || a.categoria.localeCompare(b.categoria));
  const nota = pontuar(achados, ctx.notaMinima);
  return {
    ...nota, notaMinima: ctx.notaMinima, achados, cobertura, paginas: estatico.paginas,
    capturas: nav?.capturas || [], metricas: nav?.metricas || null, impeccable: imp.estado,
    navegadorIndisponivel: nav?.indisponivel || (nav === null && ctx.urlBase ? 'playwright não instalado' : null),
    duracaoMs: Date.now() - inicio, em: new Date().toISOString(),
  };
}

const ROTULO_SEV = { critico: 'CRÍTICO', alto: 'alto', medio: 'médio', baixo: 'baixo' };

/** Relatório em texto para a IA. */
export function relatorioTexto(r, { limite = 40 } = {}) {
  const l = [];
  l.push(`Nota ${r.nota}/100 (mínimo ${r.notaMinima}) · ${r.aprovada ? 'APROVADA' : 'REPROVADA'} · cobertura: ${r.cobertura === 'navegador' ? 'código + navegador real (computador e celular)' : 'só código'}`);
  l.push(`Problemas: ${r.contagem.critico} crítico(s), ${r.contagem.alto} alto(s), ${r.contagem.medio} médio(s), ${r.contagem.baixo} baixo(s).`);
  l.push('Por área: ' + Object.entries(r.porCategoria).map(([k, v]) => `${CATEGORIAS[k]} ${v}`).join(' · '));
  if (r.impeccable === 'ok') l.push('Detector Impeccable: rodou.');
  if (r.achados.length) {
    l.push('');
    for (const a of r.achados.slice(0, limite)) {
      l.push(`- [${ROTULO_SEV[a.severidade]}] ${CATEGORIAS[a.categoria]}: ${a.mensagem}${a.arquivo ? ` (${a.arquivo}${a.linha ? ':' + a.linha : ''})` : ''}${a.fonte ? ` [${a.fonte}]` : ''}`);
      if (a.exemplos) l.push(...a.exemplos.slice(1, 4).map((e) => `    ${e}`));
    }
    if (r.achados.length > limite) l.push(`… e mais ${r.achados.length - limite}.`);
  }
  return l.join('\n');
}
