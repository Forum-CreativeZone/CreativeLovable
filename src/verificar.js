// Verificação estática sem navegador: sintaxe de JS/JSX (inclusive scripts dentro do HTML),
// JSON válido e referências locais (src, href, import, url()) que apontam para arquivos inexistentes.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import { MODELOS } from './modelos.js';

const ParserJsx = acorn.Parser.extend(acornJsx());
const MAX = 60;

function tentar(Parser, codigo, sourceType) {
  try {
    Parser.parse(codigo, { ecmaVersion: 'latest', sourceType, allowHashBang: true, allowAwaitOutsideFunction: sourceType === 'module' });
    return null;
  } catch (e) {
    return { linha: e.loc?.line || 0, coluna: (e.loc?.column ?? 0) + 1, pos: e.pos ?? 0, mensagem: String(e.message).replace(/\s*\(\d+:\d+\)\s*$/, '') };
  }
}

/** Analisa JS. modo: 'module' | 'script' | 'auto'. Devolve null ou {linha, coluna, mensagem}. */
export function analisarJs(codigo, { modo = 'auto', jsx = false } = {}) {
  const P = jsx ? ParserJsx : acorn.Parser;
  if (modo !== 'auto') return tentar(P, codigo, modo);
  const m = tentar(P, codigo, 'module');
  if (!m) return null;
  const s = tentar(P, codigo, 'script');
  if (!s) return null;
  return m.pos >= s.pos ? m : s;
}

const EXTERNO = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{\{|\$\{|data:|blob:)/i;
const limparRef = (r) => r.split('#')[0].split('?')[0].trim();

function existe(abs, extensoes = []) {
  if (fss.existsSync(abs)) return true;
  for (const ext of extensoes) {
    if (fss.existsSync(abs + ext)) return true;
    if (fss.existsSync(path.join(abs, 'index' + ext))) return true;
  }
  return false;
}

function linhaDoIndice(texto, i) {
  let n = 1;
  for (let k = 0; k < i && k < texto.length; k++) if (texto.charCodeAt(k) === 10) n++;
  return n;
}

export async function verificarProjeto(workspace, slug) {
  const meta = await workspace.meta(slug);
  const raiz = workspace.raiz(slug);
  const ehDev = MODELOS[meta.modelo]?.servidor === 'dev' || fss.existsSync(path.join(raiz, 'vite.config.js'));
  const problemas = [];
  const add = (p) => { if (problemas.length < MAX) problemas.push(p); };
  const extsImport = ehDev ? ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json'] : ['.js', '.mjs'];
  let verificados = 0;
  const arquivos = [];
  for await (const rel of workspace.percorrer(slug)) arquivos.push(rel);

  const checarRefLocal = (relArquivo, ref, linha, origem) => {
    const limpo = limparRef(ref);
    if (!limpo || EXTERNO.test(ref)) return;
    let abs;
    if (limpo.startsWith('/')) {
      if (!ehDev) {
        add({ tipo: 'aviso', arquivo: relArquivo, linha, mensagem: `${origem} "${ref}" começa com "/". No preview estático use caminho relativo (ex.: "${limpo.slice(1)}").` });
        return;
      }
      const naRaiz = path.join(raiz, limpo);
      const noPublic = path.join(raiz, 'public', limpo);
      if (existe(naRaiz, extsImport) || existe(noPublic, extsImport)) return;
      abs = naRaiz;
    } else {
      abs = path.resolve(path.dirname(path.join(raiz, relArquivo)), limpo);
    }
    if (!abs.startsWith(raiz)) return;
    if (!existe(abs, extsImport)) add({ tipo: 'erro', arquivo: relArquivo, linha, mensagem: `${origem} "${ref}" aponta para um arquivo que não existe.` });
  };

  for (const rel of arquivos) {
    const ext = path.extname(rel).toLowerCase();
    if (!['.html', '.htm', '.js', '.mjs', '.cjs', '.jsx', '.json', '.css'].includes(ext)) continue;
    const abs = path.join(raiz, rel);
    const st = await fs.stat(abs);
    if (st.size > 1.5 * 1024 * 1024) continue;
    const texto = (await fs.readFile(abs, 'utf8')).replace(/\r\n/g, '\n');
    verificados++;

    if (ext === '.json') {
      try { JSON.parse(texto); } catch (e) {
        const pos = Number((String(e.message).match(/position (\d+)/) || [])[1]);
        add({ tipo: 'erro', arquivo: rel, linha: Number.isFinite(pos) ? linhaDoIndice(texto, pos) : undefined, mensagem: 'JSON inválido: ' + e.message });
      }
      continue;
    }

    if (ext === '.css') {
      for (const m of texto.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) checarRefLocal(rel, m[1], linhaDoIndice(texto, m.index), 'url()');
      continue;
    }

    if (ext === '.js' || ext === '.mjs' || ext === '.cjs' || ext === '.jsx') {
      const err = analisarJs(texto, { modo: ext === '.mjs' ? 'module' : ext === '.cjs' ? 'script' : 'auto', jsx: ext === '.jsx' || /<[A-Z][A-Za-z]*[\s/>]/.test(texto) && ehDev });
      if (err) add({ tipo: 'erro', arquivo: rel, linha: err.linha, coluna: err.coluna, mensagem: 'Erro de sintaxe: ' + err.mensagem });
      for (const m of texto.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm)) {
        const espec = m[1] || m[2] || m[3];
        if (espec && (espec.startsWith('./') || espec.startsWith('../') || espec.startsWith('/'))) checarRefLocal(rel, espec, linhaDoIndice(texto, m.index), 'import');
      }
      continue;
    }

    // HTML
    for (const m of texto.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const attrs = m[1];
      const tipo = ((attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || '').toLowerCase();
      const temSrc = /\bsrc\s*=/i.test(attrs);
      const codigo = m[2];
      const deslocamento = linhaDoIndice(texto, m.index + m[0].indexOf('>') + 1) - 1;
      if (temSrc || !codigo.trim()) continue;
      if (tipo === 'application/json' || tipo === 'importmap' || tipo === 'application/ld+json') {
        try { JSON.parse(codigo); } catch (e) { add({ tipo: 'erro', arquivo: rel, linha: deslocamento + 1, mensagem: `JSON inválido no <script type="${tipo}">: ${e.message}` }); }
        continue;
      }
      const ehJsx = tipo === 'text/babel' || tipo === 'text/jsx';
      if (tipo && !['module', 'text/javascript', 'application/javascript', 'text/babel', 'text/jsx'].includes(tipo)) continue;
      const err = analisarJs(codigo, { modo: tipo === 'module' ? 'module' : ehJsx ? 'auto' : 'script', jsx: ehJsx });
      if (err) {
        const dica = /'import' and 'export' may appear only/.test(err.mensagem) ? ' (use <script type="module"> para usar import/export)' : '';
        add({ tipo: 'erro', arquivo: rel, linha: deslocamento + err.linha, coluna: err.coluna, mensagem: 'Erro de sintaxe no <script>: ' + err.mensagem + dica });
      }
    }
    for (const m of texto.matchAll(/<(script|link|img|source|audio|video|iframe|a)\b[^>]*?\b(src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const tag = m[1].toLowerCase();
      if (tag === 'link' && /rel\s*=\s*["']?(preconnect|dns-prefetch)/i.test(m[0])) continue;
      if (tag === 'a' && !/\.(html?|pdf|png|jpe?g|svg|zip)$/i.test(limparRef(m[3]))) continue;
      checarRefLocal(rel, m[3], linhaDoIndice(texto, m.index), `<${tag} ${m[2]}>`);
    }
  }

  if (!ehDev && !arquivos.some((a) => /^index\.html?$/i.test(a)) && arquivos.some((a) => /\.html?$/i.test(a))) {
    add({ tipo: 'aviso', arquivo: '', mensagem: 'Não há index.html na raiz. O preview abre a lista de arquivos; crie um index.html como página inicial.' });
  }
  return { problemas, verificados };
}
