// Comandos que a IA pode rodar dentro da pasta do projeto, sem shell e com lista de programas permitidos.
import spawn from 'cross-spawn';
import { spawn as spawnNativo } from 'node:child_process';
import fss from 'node:fs';
import path from 'node:path';
import { ErroCreative, log } from './config.js';

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const URL_LOCAL = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d{2,5})[^\s'"]*/i;
const PROIBIDOS = /[;&|<>`]|\$\(/;

export function dividirComando(cmd) {
  const s = String(cmd || '').trim();
  if (!s) throw new ErroCreative('Informe o comando.');
  const partes = [];
  let atual = '', aspas = null, temToken = false;
  for (const ch of s) {
    if (aspas) { if (ch === aspas) aspas = null; else atual += ch; continue; }
    if (ch === '"' || ch === "'") { aspas = ch; temToken = true; continue; }
    if (/\s/.test(ch)) { if (temToken) { partes.push(atual); atual = ''; temToken = false; } continue; }
    if (PROIBIDOS.test(ch)) throw new ErroCreative('O comando não pode ter encadeamento ou redirecionamento (; & | > < ` $( ). Rode um comando por vez.');
    atual += ch; temToken = true;
  }
  if (aspas) throw new ErroCreative('O comando tem aspas sem fechar.');
  if (temToken) partes.push(atual);
  return partes;
}

export class Processos {
  constructor(config, aoEvento = () => {}) {
    this.config = config;
    this.aoEvento = aoEvento;
    this.servidores = new Map(); // slug -> { filho, comando, url, inicio }
    this.logs = new Map(); // slug -> [{ts, fonte, texto}]
    process.on('exit', () => this.pararTodos());
  }

  validar(cmd) {
    const partes = dividirComando(cmd);
    const prog = path.basename(partes[0]).replace(/\.(cmd|exe|bat)$/i, '').toLowerCase();
    if (!this.config.comandos.length) throw new ErroCreative('A execução de comandos está desativada neste Creative Lovable (CL_SEM_COMANDOS=1).');
    if (!this.config.comandos.includes(prog)) {
      throw new ErroCreative(`O programa "${partes[0]}" não está liberado. Permitidos: ${this.config.comandos.join(', ')}. O usuário pode mudar isso com CL_COMANDOS.`);
    }
    return partes;
  }

  registrar(slug, fonte, texto) {
    const lista = this.logs.get(slug) || [];
    for (const linha of String(texto).replace(ANSI, '').split(/\r?\n/)) {
      if (!linha.trim()) continue;
      lista.push({ ts: Date.now(), fonte, texto: linha.slice(0, 500) });
    }
    while (lista.length > 400) lista.shift();
    this.logs.set(slug, lista);
  }

  ultimasLinhas(slug, n = 40, { soErros = false } = {}) {
    const lista = (this.logs.get(slug) || []).filter((l) => !soErros || l.fonte === 'stderr' || /error|erro|failed|exception/i.test(l.texto));
    return lista.slice(-n);
  }

  limparLogs(slug) { this.logs.delete(slug); }

  env() {
    return { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', BROWSER: 'none', CI: process.env.CI || '' };
  }

  /** Roda até terminar. */
  executar(slug, raiz, cmd, tempoLimiteS = 120) {
    const partes = this.validar(cmd);
    const limite = Math.min(Math.max(Number(tempoLimiteS) || 120, 5), 900) * 1000;
    return new Promise((resolver) => {
      const inicio = Date.now();
      let saida = '';
      const anexar = (fonte) => (d) => {
        const t = d.toString();
        saida += t;
        if (saida.length > 200000) saida = saida.slice(-150000);
        this.registrar(slug, fonte, t);
      };
      let filho;
      try {
        filho = spawn(partes[0], partes.slice(1), { cwd: raiz, env: this.env(), windowsHide: true });
      } catch (e) {
        resolver({ codigo: -1, saida: 'Não foi possível iniciar: ' + e.message, duracaoMs: 0, estourou: false });
        return;
      }
      this.aoEvento({ tipo: 'atividade', projeto: slug, texto: `Rodando: ${cmd}` });
      filho.stdout?.on('data', anexar('stdout'));
      filho.stderr?.on('data', anexar('stderr'));
      let estourou = false;
      const timer = setTimeout(() => { estourou = true; this.matar(filho); }, limite);
      filho.on('error', (e) => { saida += '\n' + e.message; });
      filho.on('close', (codigo) => {
        clearTimeout(timer);
        resolver({ codigo: codigo ?? -1, saida: saida.replace(ANSI, ''), duracaoMs: Date.now() - inicio, estourou });
      });
    });
  }

  /** Inicia um processo longo (servidor de desenvolvimento) e espera ele anunciar uma URL. */
  async iniciar(slug, raiz, cmd, esperaS = 40) {
    await this.parar(slug);
    const partes = this.validar(cmd);
    this.limparLogs(slug);
    let filho;
    try {
      filho = spawn(partes[0], partes.slice(1), { cwd: raiz, env: this.env(), windowsHide: true, detached: process.platform !== 'win32' });
    } catch (e) {
      throw new ErroCreative('Não foi possível iniciar: ' + e.message);
    }
    const info = { filho, comando: cmd, url: null, inicio: Date.now(), ativo: true, codigo: null };
    this.servidores.set(slug, info);
    return await new Promise((resolver) => {
      let resolvido = false;
      const fim = (motivo) => { if (resolvido) return; resolvido = true; clearTimeout(timer); resolver({ ...this.info(slug), motivo }); };
      const olhar = (fonte) => (d) => {
        const t = d.toString().replace(ANSI, '');
        this.registrar(slug, fonte, t);
        if (!info.url) {
          const m = t.match(URL_LOCAL);
          if (m) {
            info.url = m[0].replace('0.0.0.0', 'localhost').replace('[::1]', 'localhost').replace(/[.,)]+$/, '');
            this.aoEvento({ tipo: 'servidor', projeto: slug, url: info.url, ativo: true });
            fim('url');
          }
        }
      };
      filho.stdout?.on('data', olhar('stdout'));
      filho.stderr?.on('data', olhar('stderr'));
      filho.on('error', (e) => { this.registrar(slug, 'stderr', e.message); });
      filho.on('close', (codigo) => {
        info.ativo = false; info.codigo = codigo;
        this.aoEvento({ tipo: 'servidor', projeto: slug, url: null, ativo: false, codigo });
        fim('encerrou');
      });
      const timer = setTimeout(() => fim('tempo'), Math.min(Math.max(esperaS, 5), 180) * 1000);
    });
  }

  info(slug) {
    const s = this.servidores.get(slug);
    if (!s) return { ativo: false };
    return { ativo: s.ativo, url: s.url, comando: s.comando, desde: new Date(s.inicio).toISOString(), codigo: s.codigo };
  }

  matar(filho) {
    if (!filho || filho.exitCode !== null) return;
    try {
      if (process.platform === 'win32') spawnNativo('taskkill', ['/pid', String(filho.pid), '/T', '/F'], { windowsHide: true });
      else process.kill(-filho.pid, 'SIGTERM');
    } catch {
      try { filho.kill('SIGTERM'); } catch { /* já encerrado */ }
    }
  }

  async parar(slug) {
    const s = this.servidores.get(slug);
    if (!s) return false;
    this.servidores.delete(slug);
    if (s.ativo) {
      this.matar(s.filho);
      await new Promise((r) => { const t = setTimeout(r, 2500); s.filho.once('close', () => { clearTimeout(t); r(); }); });
    }
    return true;
  }

  pararTodos() {
    for (const s of this.servidores.values()) if (s.ativo) this.matar(s.filho);
  }

  comandoPadrao(raiz) {
    try {
      const pkg = JSON.parse(fss.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
      if (pkg.scripts?.dev) return 'npm run dev';
      if (pkg.scripts?.start) return 'npm start';
    } catch { /* sem package.json */ }
    return null;
  }

  precisaInstalar(raiz) {
    try {
      const pkg = JSON.parse(fss.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
      const temDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length > 0;
      return temDeps && !fss.existsSync(path.join(raiz, 'node_modules'));
    } catch { return false; }
  }
}

export function logProcesso(...a) { log(...a); }
