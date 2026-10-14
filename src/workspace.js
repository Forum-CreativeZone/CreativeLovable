import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { ErroCreative } from './config.js';
import { MODELOS } from './modelos.js';
import { aplicarEdicoes } from './edicao.js';

/** Pastas que nunca entram em listagens, versões nem exportações. */
export const IGNORAR = new Set([
  'node_modules', '.git', '.creative', 'dist', 'build', '.next', '.cache', '.vite', '.turbo',
  'coverage', '__pycache__', '.venv', 'venv', '.DS_Store', 'Thumbs.db',
]);
const MAX_ARQUIVO_VERSAO = 2 * 1024 * 1024;
const MAX_TOTAL_VERSAO = 40 * 1024 * 1024;
const MAX_LEITURA = 300 * 1024;
const MAX_ARQUIVOS = 3000;

export function slugify(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
const agora = () => new Date().toISOString();
const ehBinario = (buf) => buf.subarray(0, 8000).includes(0);
export const contarLinhas = (s) => (s ? s.split('\n').length - (s.endsWith('\n') ? 1 : 0) : 0);
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

export class Workspace {
  constructor(dir) {
    this.dir = dir;
  }

  async garantir() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  raiz(slug) { return path.join(this.dir, slug); }
  metaPath(slug) { return path.join(this.raiz(slug), '.creative', 'projeto.json'); }
  versoesDir(slug) { return path.join(this.raiz(slug), '.creative', 'versoes'); }

  // ---------- projetos ----------
  async listar() {
    let itens = [];
    try { itens = await fs.readdir(this.dir, { withFileTypes: true }); } catch { return []; }
    const out = [];
    for (const d of itens) {
      if (!d.isDirectory() || d.name.startsWith('.') || d.name.startsWith('_')) continue;
      try { out.push(await this.meta(d.name)); } catch { /* pasta que não é projeto do Creative Lovable */ }
    }
    return out.sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''));
  }

  async meta(slug) {
    const m = JSON.parse(await fs.readFile(this.metaPath(slug), 'utf8'));
    return { ...m, slug };
  }

  async salvarMeta(meta) {
    const { slug, ...resto } = meta;
    await fs.mkdir(path.dirname(this.metaPath(slug)), { recursive: true });
    await fs.writeFile(this.metaPath(slug), JSON.stringify(resto, null, 2));
  }

  async tocar(slug) {
    try { const m = await this.meta(slug); m.atualizadoEm = agora(); await this.salvarMeta(m); } catch { /* sem meta */ }
  }

  /** Acha um projeto pelo identificador (slug) ou pelo nome. */
  async projeto(ref) {
    if (!ref || typeof ref !== 'string') {
      throw new ErroCreative('Informe o projeto (nome ou identificador). Use cl_projetos para ver a lista.');
    }
    for (const s of [ref.trim(), slugify(ref)]) {
      if (s && !/[\\/]/.test(s) && !s.startsWith('.') && fss.existsSync(this.metaPath(s))) return this.meta(s);
    }
    const todos = await this.listar();
    const achado = todos.find((p) => String(p.nome).toLowerCase() === ref.trim().toLowerCase());
    if (achado) return achado;
    throw new ErroCreative(`Projeto "${ref}" não encontrado. ` + (todos.length
      ? 'Projetos existentes: ' + todos.map((p) => p.slug).join(', ') + '.'
      : 'Ainda não há projetos; crie um com cl_criar_projeto.'));
  }

  async criar({ nome, modelo = 'html', descricao = '' }) {
    if (!MODELOS[modelo]) throw new ErroCreative(`O modelo "${modelo}" não existe. Opções: ${Object.keys(MODELOS).join(', ')}.`);
    const base = slugify(nome);
    if (!base) throw new ErroCreative('Dê ao projeto um nome com pelo menos uma letra ou número.');
    let slug = base;
    for (let i = 2; fss.existsSync(this.raiz(slug)); i++) slug = `${base}-${i}`;
    const arquivos = MODELOS[modelo].arquivos(String(nome).trim(), slug);
    for (const [rel, conteudo] of Object.entries(arquivos)) {
      const abs = path.join(this.raiz(slug), rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, conteudo);
    }
    const meta = {
      slug, nome: String(nome).trim().slice(0, 80), modelo,
      descricao: String(descricao || '').slice(0, 600), criadoEm: agora(), atualizadoEm: agora(),
    };
    await this.salvarMeta(meta);
    await this.salvarVersao(slug, `Projeto criado a partir do modelo "${modelo}"`);
    return { meta, arquivos: Object.keys(arquivos) };
  }

  // ---------- caminhos ----------
  resolver(slug, caminho, { permitirRaiz = false } = {}) {
    if (typeof caminho !== 'string' || (!caminho.trim() && !permitirRaiz)) throw new ErroCreative('Informe o caminho do arquivo, relativo à raiz do projeto (ex.: index.html ou src/App.jsx).');
    const raiz = this.raiz(slug);
    const limpo = caminho.replace(/\\/g, '/').replace(/^\.?\/+/, '').trim();
    const abs = path.resolve(raiz, limpo);
    if (abs !== raiz && !abs.startsWith(raiz + path.sep)) throw new ErroCreative(`O caminho "${caminho}" sai da pasta do projeto.`);
    if (abs === raiz && !permitirRaiz) throw new ErroCreative('Informe um arquivo, não a pasta do projeto.');
    const rel = path.relative(raiz, abs).split(path.sep).join('/');
    if (rel.split('/')[0] === '.creative') throw new ErroCreative('A pasta .creative é interna do Creative Lovable.');
    return { abs, rel };
  }

  async garantirDentro(slug, abs) {
    // Protege contra links simbólicos que apontam para fora do projeto.
    const raizReal = await fs.realpath(this.raiz(slug));
    let alvo = abs;
    while (!fss.existsSync(alvo)) alvo = path.dirname(alvo);
    const real = await fs.realpath(alvo);
    if (real !== raizReal && !real.startsWith(raizReal + path.sep)) throw new ErroCreative('Esse caminho aponta para fora do projeto.');
  }

  async *percorrer(slug, sub = '') {
    const pasta = path.join(this.raiz(slug), sub);
    let itens = [];
    try { itens = await fs.readdir(pasta, { withFileTypes: true }); } catch { return; }
    itens.sort((a, b) => a.name.localeCompare(b.name));
    for (const d of itens) {
      if (IGNORAR.has(d.name)) continue;
      const rel = sub ? `${sub}/${d.name}` : d.name;
      if (d.isDirectory()) yield* this.percorrer(slug, rel);
      else if (d.isFile()) yield rel;
    }
  }

  async listarArquivos(slug) {
    const out = [];
    for await (const rel of this.percorrer(slug)) {
      const st = await fs.stat(path.join(this.raiz(slug), rel));
      out.push({ caminho: rel, bytes: st.size });
      if (out.length >= MAX_ARQUIVOS) break;
    }
    return out;
  }

  // ---------- arquivos ----------
  async ler(slug, caminho, linhaInicio, linhaFim) {
    const { abs, rel } = this.resolver(slug, caminho);
    await this.garantirDentro(slug, abs);
    let buf;
    try { buf = await fs.readFile(abs); } catch (e) {
      if (e.code === 'ENOENT') throw new ErroCreative(`O arquivo "${rel}" não existe. Use cl_arquivos para ver os arquivos do projeto.`);
      if (e.code === 'EISDIR') throw new ErroCreative(`"${rel}" é uma pasta.`);
      throw e;
    }
    if (ehBinario(buf)) return { rel, binario: true, bytes: buf.length, texto: '', total: 0, ini: 0, fim: 0 };
    const conteudo = buf.toString('utf8').replace(/\r\n/g, '\n');
    const linhas = conteudo.split('\n');
    if (conteudo.endsWith('\n')) linhas.pop();
    const total = linhas.length;
    let ini = Math.max(1, Math.floor(linhaInicio || 1));
    let fim = Math.min(total, Math.floor(linhaFim || total));
    if (ini > total) throw new ErroCreative(`O arquivo tem ${total} linhas.`);
    let texto = linhas.slice(ini - 1, fim).join('\n');
    let cortado = false;
    if (texto.length > MAX_LEITURA) {
      let soma = 0;
      let j = ini - 1;
      for (; j < fim; j++) { soma += linhas[j].length + 1; if (soma > MAX_LEITURA) break; }
      fim = Math.max(ini, j);
      texto = linhas.slice(ini - 1, fim).join('\n');
      cortado = true;
    }
    return { rel, binario: false, bytes: buf.length, texto, total, ini, fim, cortado };
  }

  async escrever(slug, caminho, conteudo) {
    const { abs, rel } = this.resolver(slug, caminho);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await this.garantirDentro(slug, abs);
    const existia = fss.existsSync(abs);
    const texto = String(conteudo ?? '');
    await fs.writeFile(abs, texto);
    await this.tocar(slug);
    return { rel, existia, bytes: Buffer.byteLength(texto), linhas: contarLinhas(texto) };
  }

  async editar(slug, caminho, edicoes) {
    const { abs, rel } = this.resolver(slug, caminho);
    await this.garantirDentro(slug, abs);
    let atual;
    try { atual = await fs.readFile(abs, 'utf8'); } catch (e) {
      if (e.code === 'ENOENT') throw new ErroCreative(`O arquivo "${rel}" não existe. Para criar, use cl_escrever.`);
      throw e;
    }
    if (!Array.isArray(edicoes) || !edicoes.length) throw new ErroCreative('Envie pelo menos uma edição com "buscar" e "substituir".');
    const r = aplicarEdicoes(atual, edicoes);
    if (!r.ok) throw new ErroCreative(`Nada foi alterado em ${rel}. ${r.erro}`);
    await fs.writeFile(abs, r.texto);
    await this.tocar(slug);
    return { rel, resultados: r.resultados, linhas: contarLinhas(r.texto), bytes: Buffer.byteLength(r.texto) };
  }

  async apagar(slug, caminho) {
    const { abs, rel } = this.resolver(slug, caminho);
    await this.garantirDentro(slug, abs);
    if (!fss.existsSync(abs)) throw new ErroCreative(`"${rel}" não existe.`);
    await fs.rm(abs, { recursive: true, force: true });
    await this.tocar(slug);
    return { rel };
  }

  async mover(slug, de, para) {
    const a = this.resolver(slug, de);
    const b = this.resolver(slug, para);
    await this.garantirDentro(slug, a.abs);
    await this.garantirDentro(slug, path.dirname(b.abs));
    if (!fss.existsSync(a.abs)) throw new ErroCreative(`"${a.rel}" não existe.`);
    if (fss.existsSync(b.abs)) throw new ErroCreative(`Já existe "${b.rel}". Apague antes ou escolha outro nome.`);
    await fs.mkdir(path.dirname(b.abs), { recursive: true });
    await fs.rename(a.abs, b.abs);
    await this.tocar(slug);
    return { de: a.rel, para: b.rel };
  }

  async buscar(slug, padrao, { regex = false, diferenciarMaiusculas = false } = {}) {
    if (!padrao) throw new ErroCreative('Informe o que buscar.');
    let re;
    try {
      re = new RegExp(regex ? padrao : padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), diferenciarMaiusculas ? '' : 'i');
    } catch (e) { throw new ErroCreative('Expressão regular inválida: ' + e.message); }
    const achados = [];
    for await (const rel of this.percorrer(slug)) {
      const abs = path.join(this.raiz(slug), rel);
      const st = await fs.stat(abs);
      if (st.size > 1024 * 1024) continue;
      const buf = await fs.readFile(abs);
      if (ehBinario(buf)) continue;
      buf.toString('utf8').split('\n').forEach((linha, i) => {
        if (achados.length < 200 && re.test(linha)) achados.push(`${rel}:${i + 1}: ${linha.trim().slice(0, 200)}`);
      });
      if (achados.length >= 200) break;
    }
    return achados;
  }

  // ---------- versões ----------
  async fotografar(slug) {
    const arquivos = [];
    let total = 0;
    const pulados = [];
    for await (const rel of this.percorrer(slug)) {
      const buf = await fs.readFile(path.join(this.raiz(slug), rel));
      if (buf.length > MAX_ARQUIVO_VERSAO || total + buf.length > MAX_TOTAL_VERSAO) { pulados.push(rel); continue; }
      total += buf.length;
      arquivos.push(ehBinario(buf)
        ? { caminho: rel, base64: buf.toString('base64') }
        : { caminho: rel, conteudo: buf.toString('utf8') });
    }
    const hash = crypto.createHash('sha1');
    for (const a of arquivos) hash.update(a.caminho + '\0' + (a.conteudo ?? a.base64) + '\0');
    return { arquivos, total, pulados, hash: hash.digest('hex') };
  }

  async versoes(slug) {
    let nomes = [];
    try { nomes = await fs.readdir(this.versoesDir(slug)); } catch { return []; }
    const out = [];
    for (const n of nomes.filter((x) => /^\d+\.json$/.test(x)).sort()) {
      try {
        const v = JSON.parse(await fs.readFile(path.join(this.versoesDir(slug), n), 'utf8'));
        out.push({ n: v.n, mensagem: v.mensagem, data: v.data, arquivos: v.arquivos.length, bytes: v.total, hash: v.hash });
      } catch { /* versão corrompida é ignorada */ }
    }
    return out;
  }

  async salvarVersao(slug, mensagem) {
    const lista = await this.versoes(slug);
    const foto = await this.fotografar(slug);
    const ultima = lista[lista.length - 1];
    if (ultima && ultima.hash === foto.hash) return { n: ultima.n, criada: false, mensagem: ultima.mensagem };
    const n = (ultima ? ultima.n : 0) + 1;
    await fs.mkdir(this.versoesDir(slug), { recursive: true });
    const registro = { n, mensagem: String(mensagem || 'Versão ' + n).slice(0, 200), data: agora(), hash: foto.hash, total: foto.total, arquivos: foto.arquivos };
    await fs.writeFile(path.join(this.versoesDir(slug), String(n).padStart(4, '0') + '.json'), JSON.stringify(registro));
    await this.tocar(slug);
    return { n, criada: true, arquivos: foto.arquivos.length, bytes: foto.total, pulados: foto.pulados };
  }

  async restaurar(slug, n) {
    const arquivo = path.join(this.versoesDir(slug), String(n).padStart(4, '0') + '.json');
    if (!fss.existsSync(arquivo)) throw new ErroCreative(`A versão ${n} não existe. Use cl_versoes para ver a lista.`);
    const alvo = JSON.parse(await fs.readFile(arquivo, 'utf8'));
    const seguranca = await this.salvarVersao(slug, `Antes de restaurar a v${n}`);
    const manter = new Set(alvo.arquivos.map((a) => a.caminho));
    for await (const rel of this.percorrer(slug)) {
      if (!manter.has(rel)) await fs.rm(path.join(this.raiz(slug), rel), { force: true });
    }
    for (const a of alvo.arquivos) {
      const abs = path.join(this.raiz(slug), a.caminho);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, a.base64 != null ? Buffer.from(a.base64, 'base64') : a.conteudo);
    }
    const nova = await this.salvarVersao(slug, `Restaurado da v${n}`);
    return { de: n, seguranca: seguranca.criada ? seguranca.n : null, nova: nova.n, arquivos: alvo.arquivos.length };
  }

  // ---------- exportação ----------
  async exportarZip(slug) {
    const zip = new JSZip();
    const pasta = zip.folder(slug);
    let qtd = 0;
    for await (const rel of this.percorrer(slug)) {
      pasta.file(rel, await fs.readFile(path.join(this.raiz(slug), rel)));
      qtd++;
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const destino = path.join(this.dir, '_exportados');
    await fs.mkdir(destino, { recursive: true });
    const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const arquivo = path.join(destino, `${slug}-${carimbo}.zip`);
    await fs.writeFile(arquivo, buf);
    return { arquivo, arquivos: qtd, bytes: buf.length };
  }

  resumoArvore(arquivos) {
    const total = arquivos.reduce((s, a) => s + a.bytes, 0);
    return plural(arquivos.length, 'arquivo', 'arquivos') + ', ' + (total / 1024).toFixed(1) + ' KB';
  }
}
