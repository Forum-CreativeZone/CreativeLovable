// Servidor HTTP local: painel, preview dos projetos, eventos ao vivo, erros do navegador e, no modo --http, o endpoint MCP.
import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { VERSAO, log } from './config.js';
import { injetarRuntime } from './runtime.js';
import { IGNORAR } from './workspace.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARQUIVO_PAINEL = path.join(AQUI, '..', 'painel', 'index.html');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.xml': 'application/xml',
};

const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const hostSemPorta = (h) => String(h || '').toLowerCase().replace(/:\d+$/, '');
const ehHostLocal = (h) => HOSTS_LOCAIS.has(hostSemPorta(h));

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req, limite = 2 * 1024 * 1024) {
  return new Promise((ok, falha) => {
    let tam = 0;
    const partes = [];
    req.on('data', (p) => { tam += p.length; if (tam > limite) { falha(Object.assign(new Error('Corpo grande demais'), { status: 413 })); req.destroy(); } else partes.push(p); });
    req.on('end', () => {
      const texto = Buffer.concat(partes).toString('utf8');
      if (!texto) return ok({});
      try { ok(JSON.parse(texto)); } catch { falha(Object.assign(new Error('JSON inválido'), { status: 400 })); }
    });
    req.on('error', falha);
  });
}

function sondar(porta) {
  return new Promise((ok) => {
    const req = http.get({ host: '127.0.0.1', port: porta, path: '/api/saude', timeout: 700 }, (res) => {
      let c = '';
      res.on('data', (d) => { c += d; });
      res.on('end', () => { try { ok(JSON.parse(c)); } catch { ok({ ocupado: true }); } });
    });
    req.on('timeout', () => { req.destroy(); ok(null); });
    req.on('error', () => ok(null));
  });
}

export class Painel {
  constructor({ config, workspace, processos, estudio }) {
    this.config = config;
    this.workspace = workspace;
    this.processos = processos;
    this.estudio = estudio;
    this.erros = new Map();
    this.selecoes = new Map();
    this.atividade = [];
    this.clientes = new Set();
    this.url = null;
    this.proprio = false;
    this.fabricaMcp = null;
    this.servidor = null;
    this.debounce = new Map();
  }

  // ---------- ciclo de vida ----------
  async iniciar({ fabricaMcp = null } = {}) {
    this.fabricaMcp = fabricaMcp;
    const visivel = ['0.0.0.0', '127.0.0.1', '::'].includes(this.config.host) ? 'localhost' : this.config.host;
    for (let porta = this.config.porta; porta < this.config.porta + 20; porta++) {
      const outro = await sondar(porta);
      if (outro) {
        if (!fabricaMcp && outro.creative && outro.dir === this.config.dir) {
          this.url = `http://localhost:${porta}`;
          this.proprio = false;
          log(`painel já aberto por outro Creative Lovable em ${this.url}; usando o mesmo.`);
          return this;
        }
        continue;
      }
      try {
        await this.escutar(porta);
        this.url = `http://${visivel}:${porta}`;
        this.proprio = true;
        this.vigiar();
        log(`painel em ${this.url}` + (fabricaMcp ? ` · MCP em ${this.url}/mcp` : ''));
        return this;
      } catch (e) {
        if (e.code === 'EADDRINUSE' || e.code === 'EACCES') continue;
        throw e;
      }
    }
    log('não achei porta livre para o painel; seguindo sem painel.');
    return this;
  }

  escutar(porta) {
    return new Promise((ok, falha) => {
      const srv = http.createServer((req, res) => this.tratar(req, res).catch((e) => {
        if (!res.headersSent) json(res, e.status || 500, { erro: e.status ? e.message : 'Erro interno do Creative Lovable.' });
        if (!e.status) log('erro no painel:', e);
      }));
      srv.keepAliveTimeout = 65000;
      srv.once('error', falha);
      srv.listen(porta, this.config.host, () => { srv.off('error', falha); this.servidor = srv; ok(); });
    });
  }

  fechar() {
    for (const c of this.clientes) { try { c.res.end(); } catch { /* fechado */ } }
    this.clientes.clear();
    this.vigia?.close();
    return new Promise((ok) => (this.servidor ? this.servidor.close(() => ok()) : ok()));
  }

  vigiar() {
    try {
      this.vigia = fss.watch(this.workspace.dir, { recursive: true }, (_evento, nome) => {
        if (!nome) return;
        const partes = String(nome).split(/[\\/]/);
        const slug = partes[0];
        if (!slug || slug.startsWith('.') || slug.startsWith('_') || partes.length < 2) return;
        if (partes.slice(1).some((p) => IGNORAR.has(p))) return;
        this.avisarArquivos(slug);
      });
      this.vigia.on('error', () => { /* pasta removida ou sem suporte */ });
    } catch {
      log('observação recursiva de arquivos indisponível; o preview recarrega pelas ferramentas do Creative Lovable.');
    }
  }

  avisarArquivos(slug) {
    clearTimeout(this.debounce.get(slug));
    this.debounce.set(slug, setTimeout(() => { this.debounce.delete(slug); this.emitir({ tipo: 'arquivos', projeto: slug }); }, 120));
  }

  // ---------- API usada pelas ferramentas (funciona também com o painel de outro Creative Lovable) ----------
  get disponivel() { return !!this.url; }
  urlPreview(slug) { return this.url ? `${this.url}/preview/${encodeURIComponent(slug)}/` : null; }
  urlPainel(slug) { return this.url ? `${this.url}/#/${encodeURIComponent(slug)}` : null; }

  async chamarOutro(metodo, rota, corpo) {
    const r = await fetch(this.url + rota, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'X-Creative': '1' },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(3000),
    });
    return r.json();
  }

  notificar(ev) {
    if (!this.url) return;
    if (ev.tipo === 'arquivos') return this.proprio ? this.avisarArquivos(ev.projeto) : this.chamarOutro('POST', '/api/eventos', ev).catch(() => {});
    if (this.proprio) this.emitir(ev);
    else this.chamarOutro('POST', '/api/eventos', ev).catch(() => {});
  }

  async lerErros(slug, { limpar = false } = {}) {
    if (!this.url) return [];
    if (!this.proprio) {
      try { return (await this.chamarOutro('POST', `/api/projetos/${encodeURIComponent(slug)}/erros/ler`, { limpar })).erros || []; } catch { return []; }
    }
    const lista = (this.erros.get(slug) || []).slice();
    if (limpar) { this.erros.delete(slug); this.emitir({ tipo: 'erros-limpos', projeto: slug }); }
    return lista;
  }

  async lerSelecao(slug) {
    if (!this.url) return null;
    if (!this.proprio) {
      try { return (await this.chamarOutro('GET', `/api/projetos/${encodeURIComponent(slug)}/selecao`)).selecao || null; } catch { return null; }
    }
    return this.selecoes.get(slug) || null;
  }

  // ---------- eventos ----------
  emitir(ev) {
    ev.ts = ev.ts || Date.now();
    if (ev.tipo === 'atividade') {
      this.atividade.push(ev);
      if (this.atividade.length > 300) this.atividade.splice(0, this.atividade.length - 300);
    }
    const linha = `event: ${ev.tipo}\ndata: ${JSON.stringify(ev)}\n\n`;
    for (const c of this.clientes) {
      if (c.projeto && (c.projeto !== ev.projeto || ev.tipo !== 'arquivos')) continue;
      try { c.res.write(linha); } catch { /* cliente saiu */ }
    }
  }

  registrarErro(slug, e) {
    const lista = this.erros.get(slug) || [];
    const msg = String(e.mensagem || '').slice(0, 800);
    if (!msg) return;
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.mensagem === msg && ultimo.linha === (e.linha || 0)) { ultimo.vezes++; ultimo.ts = Date.now(); return; }
    const item = {
      tipo: String(e.tipo || 'erro').slice(0, 20), mensagem: msg, arquivo: String(e.arquivo || '').slice(0, 300),
      linha: Number(e.linha) || 0, coluna: Number(e.coluna) || 0, pagina: String(e.pagina || '').slice(0, 300),
      pilha: String(e.pilha || '').slice(0, 1200), vezes: 1, ts: Date.now(),
    };
    lista.push(item);
    while (lista.length > 50) lista.shift();
    this.erros.set(slug, lista);
    this.emitir({ tipo: 'erro', projeto: slug, erro: item });
  }

  // ---------- HTTP ----------
  autorizado(req, url) {
    if (ehHostLocal(req.headers.host)) return true;
    if (!this.config.token) return false;
    const auth = String(req.headers.authorization || '');
    return auth === `Bearer ${this.config.token}` || url.searchParams.get('token') === this.config.token;
  }

  async tratar(req, res) {
    const url = new URL(req.url, 'http://creative.local');
    let rota;
    try { rota = decodeURIComponent(url.pathname); } catch { return json(res, 400, { erro: 'Endereço inválido.' }); }

    if (!this.autorizado(req, url)) {
      return json(res, this.config.token ? 401 : 403, {
        erro: this.config.token ? 'Token ausente ou inválido.' : 'O Creative Lovable só aceita acesso local. Para acesso remoto, inicie com --token.',
      });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origem = req.headers.origin;
      if (origem && origem !== 'null') {
        let ok = false;
        try { const o = new URL(origem); ok = o.host === req.headers.host || HOSTS_LOCAIS.has(o.hostname) || o.hostname === '[::1]'; } catch { ok = false; }
        if (!ok) return json(res, 403, { erro: 'Origem não permitida.' });
      }
    }

    if (rota === '/mcp') return this.tratarMcp(req, res);
    if (rota === '/' || rota === '/index.html') return this.servirPainel(res);
    if (rota === '/api/saude') {
      return json(res, 200, {
        creative: true, versao: VERSAO, dir: this.config.dir, mcp: !!this.fabricaMcp, pid: process.pid,
        bin: path.join(AQUI, '..', 'bin', 'creative-lovable-mcp.js'), url: this.url, comandos: this.config.comandos,
      });
    }
    if (rota.startsWith('/preview/')) return this.servirPreview(req, res, rota);
    if (rota.startsWith('/api/')) return this.tratarApi(req, res, rota, url);
    if (rota === '/favicon.ico') { res.writeHead(204); return res.end(); }
    return json(res, 404, { erro: 'Não encontrado.' });
  }

  async servirPainel(res) {
    const html = await fs.readFile(ARQUIVO_PAINEL, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  }

  exigirCabecalho(req) {
    if (req.headers['x-creative'] !== '1') throw Object.assign(new Error('Cabeçalho X-Creative ausente.'), { status: 403 });
  }

  async tratarApi(req, res, rota, url) {
    const m = req.method;
    if (rota === '/api/eventos' && m === 'GET') return this.abrirEventos(req, res, url);
    if (rota === '/api/eventos' && m === 'POST') {
      this.exigirCabecalho(req);
      const ev = await lerCorpo(req);
      if (ev && typeof ev.tipo === 'string') {
        if (ev.tipo === 'arquivos' && ev.projeto) this.avisarArquivos(String(ev.projeto));
        else this.emitir(ev);
      }
      return json(res, 200, { ok: true });
    }
    if (rota === '/api/atividade') return json(res, 200, { atividade: this.atividade.slice(-120) });
    if (rota === '/api/projetos' && m === 'GET') {
      const lista = await this.workspace.listar();
      const projetos = [];
      for (const p of lista) {
        let fase = null;
        if (p.estudio && this.estudio) {
          const s = await this.estudio.situacao(p.slug).catch(() => null);
          if (s) fase = s.etapas.every((e) => e.feita) ? 'entregue' : s.faseAtual + (s.etapas.find((e) => e.fase === s.faseAtual)?.estado === 'aguardando-aprovacao' ? ':aguardando' : '');
        }
        projetos.push({ ...p, fase, servidor: this.processos.info(p.slug), erros: (this.erros.get(p.slug) || []).length });
      }
      return json(res, 200, { dir: this.config.dir, versao: VERSAO, mcp: !!this.fabricaMcp, projetos });
    }
    const pm = rota.match(/^\/api\/projetos\/([^/]+)(\/.*)?$/);
    if (!pm) return json(res, 404, { erro: 'Rota desconhecida.' });
    const slug = pm[1];
    const sub = pm[2] || '';
    let meta;
    try { meta = await this.workspace.projeto(slug); } catch { return json(res, 404, { erro: 'Projeto não encontrado.' }); }
    if (meta.slug !== slug) return json(res, 404, { erro: 'Projeto não encontrado.' });

    if (sub === '' && m === 'GET') {
      const [arquivos, versoes] = await Promise.all([this.workspace.listarArquivos(slug), this.workspace.versoes(slug)]);
      return json(res, 200, {
        meta, arquivos, versoes: versoes.map(({ hash, ...v }) => v), servidor: this.processos.info(slug),
        erros: this.erros.get(slug) || [], selecao: this.selecoes.get(slug) || null,
        logs: this.processos.ultimasLinhas(slug, 80), preview: this.urlPreview(slug),
      });
    }
    if (sub === '/arquivo' && m === 'GET') {
      const r = await this.workspace.ler(slug, url.searchParams.get('caminho') || '').catch((e) => ({ erro: e.message }));
      return json(res, r.erro ? 400 : 200, r);
    }
    if (sub === '/restaurar' && m === 'POST') {
      this.exigirCabecalho(req);
      const { versao } = await lerCorpo(req);
      const r = await this.workspace.restaurar(slug, Number(versao)).catch((e) => ({ erro: e.message }));
      if (!r.erro) {
        this.emitir({ tipo: 'atividade', projeto: slug, texto: `Você restaurou a v${versao} pelo painel (nova v${r.nova})` });
        this.emitir({ tipo: 'versao', projeto: slug });
        this.avisarArquivos(slug);
      }
      return json(res, r.erro ? 400 : 200, r);
    }
    if (sub === '/erros' && m === 'POST') {
      this.exigirCabecalho(req);
      this.registrarErro(slug, await lerCorpo(req, 64 * 1024));
      return json(res, 200, { ok: true });
    }
    if (sub === '/erros/ler' && m === 'POST') {
      this.exigirCabecalho(req);
      const { limpar } = await lerCorpo(req);
      return json(res, 200, { erros: await this.lerErros(slug, { limpar: !!limpar }) });
    }
    if (sub.startsWith('/estudio') && this.estudio) return this.tratarEstudio(req, res, slug, sub, url);
    if (sub === '/selecao' && m === 'GET') return json(res, 200, { selecao: this.selecoes.get(slug) || null });
    if (sub === '/selecao' && m === 'POST') {
      this.exigirCabecalho(req);
      const s = await lerCorpo(req, 64 * 1024);
      const sel = {
        tag: String(s.tag || '').slice(0, 30), caminho: String(s.caminho || '').slice(0, 600), texto: String(s.texto || '').slice(0, 200),
        html: String(s.html || '').slice(0, 2000), pagina: String(s.pagina || '/').slice(0, 300), classes: String(s.classes || '').slice(0, 300), ts: Date.now(),
      };
      this.selecoes.set(slug, sel);
      this.emitir({ tipo: 'selecao', projeto: slug, selecao: sel });
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { erro: 'Rota desconhecida.' });
  }

  /** Rotas do estúdio: situação, aprovações, pedidos de ajuste, configurações e capturas da auditoria. */
  async tratarEstudio(req, res, slug, sub, url) {
    const m = req.method;
    const e = this.estudio;
    if (sub === '/estudio' && m === 'GET') {
      const s = await e.situacao(slug);
      const auditorias = await e.listarAuditorias(slug);
      const historico = auditorias.map((a) => ({ n: a.n, nota: a.nota, aprovada: a.aprovada, em: a.em }));
      return json(res, 200, { ...s, historico });
    }
    if (sub === '/estudio/captura' && m === 'GET') {
      const n = String(url.searchParams.get('n') || '');
      const nome = String(url.searchParams.get('nome') || '');
      if (!/^\d{1,6}$/.test(n) || !/^[a-z-]{3,30}\.jpg$/.test(nome)) return json(res, 400, { erro: 'Captura inválida.' });
      const arq = path.join(e.dirCapturas(slug, Number(n)), nome);
      if (!fss.existsSync(arq)) return json(res, 404, { erro: 'Captura não encontrada.' });
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
      return fss.createReadStream(arq).pipe(res);
    }
    if (m !== 'POST') return json(res, 404, { erro: 'Rota desconhecida.' });
    this.exigirCabecalho(req);
    const corpo = await lerCorpo(req, 64 * 1024);
    const ok = async (texto) => {
      this.emitir({ tipo: 'atividade', projeto: slug, texto });
      this.emitir({ tipo: 'estudio', projeto: slug });
      return json(res, 200, { ok: true, situacao: await e.situacao(slug) });
    };
    try {
      if (sub === '/estudio/aprovar') {
        const etapa = String(corpo.etapa || '');
        const r = await e.aprovar(slug, etapa, { id: corpo.id ? String(corpo.id) : undefined, por: 'painel' });
        return ok(`Você aprovou pelo painel: ${etapa === 'direcao' ? 'direção "' + r.nome + '"' : etapa}`);
      }
      if (sub === '/estudio/ajuste') {
        const texto = String(corpo.texto || '').trim();
        if (texto.length < 3) return json(res, 400, { erro: 'Escreva o que você quer mudar.' });
        await e.registrarFeedback(slug, String(corpo.etapa || 'direcao'), texto);
        return ok(`Você pediu um ajuste: "${texto.slice(0, 80)}"`);
      }
      if (sub === '/estudio/config') {
        const c = await e.salvarConfig(slug, corpo);
        return ok(`Configurações do projeto mudaram: modo ${c.modo}, aprovação ${c.aprovacao}, nota mínima ${c.notaMinima}, comandos ${c.permissoes.comandos ? 'sim' : 'não'}, internet ${c.permissoes.rede ? 'sim' : 'não'}, apagar ${c.permissoes.apagar ? 'sim' : 'não'}`);
      }
    } catch (x) {
      return json(res, 400, { erro: x.message });
    }
    return json(res, 404, { erro: 'Rota desconhecida.' });
  }

  abrirEventos(req, res, url) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write(`retry: 2000\nevent: ola\ndata: ${JSON.stringify({ versao: VERSAO })}\n\n`);
    const cliente = { res, projeto: url.searchParams.get('projeto') || null };
    this.clientes.add(cliente);
    const batida = setInterval(() => { try { res.write(': ping\n\n'); } catch { /* saiu */ } }, 25000);
    req.on('close', () => { clearInterval(batida); this.clientes.delete(cliente); });
  }

  async servirPreview(req, res, rota) {
    const m = rota.match(/^\/preview\/([^/]+)(\/.*)?$/);
    if (!m) return json(res, 404, { erro: 'Não encontrado.' });
    const slug = m[1];
    if (!m[2]) { res.writeHead(302, { Location: `/preview/${encodeURIComponent(slug)}/` }); return res.end(); }
    if (!fss.existsSync(this.workspace.metaPath(slug))) return json(res, 404, { erro: 'Projeto não encontrado.' });
    const raiz = this.workspace.raiz(slug);
    const rel = m[2].replace(/^\/+/, '');
    let abs = path.resolve(raiz, rel);
    if (abs !== raiz && !abs.startsWith(raiz + path.sep)) return json(res, 403, { erro: 'Fora do projeto.' });
    if (rel.split('/')[0] === '.creative') return json(res, 403, { erro: 'Pasta interna.' });
    let st = await fs.stat(abs).catch(() => null);
    if (st?.isDirectory()) {
      const indice = path.join(abs, 'index.html');
      if (fss.existsSync(indice)) { abs = indice; st = await fs.stat(abs); } else return this.listarPasta(res, slug, raiz, abs);
    }
    if (!st) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>Não encontrado</title><body style="font:15px system-ui;padding:32px;color:#333"><h1 style="font-size:20px">Arquivo não encontrado</h1><p>${rel.replace(/[<>&]/g, '')} não existe neste projeto.</p></body>`);
    }
    const ext = path.extname(abs).toLowerCase();
    const tipo = TIPOS[ext] || 'application/octet-stream';
    if (ext === '.html' || ext === '.htm') {
      const html = await fs.readFile(abs, 'utf8');
      res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
      return res.end(injetarRuntime(html, slug));
    }
    res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-store', 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fss.createReadStream(abs).pipe(res);
  }

  async listarPasta(res, slug, raiz, abs) {
    const itens = (await fs.readdir(abs, { withFileTypes: true })).filter((d) => !IGNORAR.has(d.name));
    const relPasta = path.relative(raiz, abs).split(path.sep).join('/');
    const links = itens.map((d) => {
      const alvo = (relPasta ? relPasta + '/' : '') + d.name + (d.isDirectory() ? '/' : '');
      return `<li><a href="/preview/${encodeURIComponent(slug)}/${alvo.split('/').map(encodeURIComponent).join('/')}">${d.name.replace(/[<>&]/g, '')}${d.isDirectory() ? '/' : ''}</a></li>`;
    }).join('');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(injetarRuntime(`<!doctype html><html><head><meta charset="utf-8"><title>${slug}</title></head><body style="font:15px system-ui;padding:32px;color:#333"><h1 style="font-size:20px">Arquivos de ${slug.replace(/[<>&]/g, '')}${relPasta ? ' / ' + relPasta.replace(/[<>&]/g, '') : ''}</h1><p>Não há index.html nesta pasta.</p><ul>${links}</ul></body></html>`, slug));
  }

  async tratarMcp(req, res) {
    if (!this.fabricaMcp) return json(res, 404, { erro: 'O endpoint MCP só existe com creative-lovable-mcp --http.' });
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' });
      return res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Use POST neste endpoint.' }, id: null }));
    }
    if (!String(req.headers['content-type'] || '').includes('application/json')) {
      return json(res, 415, { jsonrpc: '2.0', error: { code: -32000, message: 'Envie Content-Type: application/json.' }, id: null });
    }
    const corpo = await lerCorpo(req, 8 * 1024 * 1024);
    const servidor = this.fabricaMcp();
    const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { transporte.close().catch(() => {}); servidor.close().catch(() => {}); });
    await servidor.connect(transporte);
    await transporte.handleRequest(req, res, corpo);
  }
}
