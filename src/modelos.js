// Modelos iniciais de projeto. Cada um devolve um mapa { caminho: conteúdo }.

const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const html = (nome) => ({
  'index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(nome)}</title>
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900 antialiased">
  <main class="max-w-3xl mx-auto px-6 py-16">
    <p class="text-sm font-semibold uppercase tracking-widest text-orange-600">Creative Lovable</p>
    <h1 class="mt-2 text-4xl font-bold tracking-tight">${h(nome)}</h1>
    <p class="mt-3 text-slate-600">Projeto pronto. A IA conectada ao Creative Lovable vai construir o app aqui.</p>
  </main>
  <script>
    // JavaScript do app
  </script>
</body>
</html>
`,
});

const web = (nome) => ({
  'index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(nome)}</title>
<link rel="stylesheet" href="css/estilo.css">
</head>
<body>
  <header class="topo">
    <div class="container">
      <strong>${h(nome)}</strong>
      <nav><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
    </div>
  </header>
  <main class="container">
    <section class="hero">
      <h1>${h(nome)}</h1>
      <p>Site criado pelo Creative Lovable. A IA vai preencher as seções.</p>
      <button id="acao" class="botao">Começar</button>
    </section>
    <section id="sobre"><h2>Sobre</h2><p>Conteúdo da seção.</p></section>
    <section id="contato"><h2>Contato</h2><p>Conteúdo da seção.</p></section>
  </main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
`,
  'css/estilo.css': `:root {
  --fundo: #f7f7f5;
  --texto: #16181d;
  --suave: #5c6270;
  --destaque: #c4441c;
  --raio: 12px;
  --fonte: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--fonte); background: var(--fundo); color: var(--texto); line-height: 1.6; }
.container { width: min(1080px, 100% - 32px); margin-inline: auto; }
.topo { border-bottom: 1px solid #e3e5e9; background: #fff; }
.topo .container { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.topo nav { display: flex; gap: 20px; }
.topo a { color: var(--suave); text-decoration: none; }
.hero { padding-block: 72px 48px; }
.hero h1 { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.05; margin: 0; }
.hero p { color: var(--suave); font-size: 1.15rem; max-width: 56ch; }
section { padding-block: 32px; }
.botao { background: var(--destaque); color: #fff; border: 0; border-radius: var(--raio); padding: 12px 20px; font: inherit; font-weight: 600; cursor: pointer; }
.botao:hover { filter: brightness(.95); }
`,
  'js/app.js': `const botao = document.querySelector('#acao');
botao?.addEventListener('click', () => {
  document.querySelector('#sobre')?.scrollIntoView({ behavior: 'smooth' });
});
`,
});

const jogo = (nome) => ({
  'index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title>${h(nome)}</title>
<style>
  html, body { margin: 0; height: 100%; background: #0d1117; overflow: hidden; touch-action: none; }
  canvas { display: block; width: 100vw; height: 100vh; }
  #hud { position: fixed; top: 12px; left: 16px; color: #e6edf3; font: 600 16px system-ui, sans-serif; pointer-events: none; text-shadow: 0 1px 2px #000; }
</style>
</head>
<body>
<canvas id="tela"></canvas>
<div id="hud"></div>
<script src="jogo.js"></script>
</body>
</html>
`,
  'jogo.js': `// Base de jogo em canvas: laço com passo fixo, entrada de teclado e toque, cenas e colisão simples.
const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
const hud = document.getElementById('hud');
let L = 0, A = 0;

function redimensionar() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  L = window.innerWidth; A = window.innerHeight;
  tela.width = Math.round(L * dpr); tela.height = Math.round(A * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', redimensionar);
redimensionar();

// ---- entrada ----
const teclas = new Set();
window.addEventListener('keydown', (e) => { teclas.add(e.key.toLowerCase()); if (e.key === ' ') e.preventDefault(); });
window.addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
const toque = { ativo: false, x: 0, y: 0 };
tela.addEventListener('pointerdown', (e) => { toque.ativo = true; toque.x = e.clientX; toque.y = e.clientY; if (cena === 'menu' || cena === 'fim') iniciar(); });
tela.addEventListener('pointermove', (e) => { toque.x = e.clientX; toque.y = e.clientY; });
window.addEventListener('pointerup', () => { toque.ativo = false; });

// ---- estado ----
let cena = 'menu';
let jogador, moedas, inimigos, pontos, tempo, recorde = 0;

function iniciar() {
  jogador = { x: L / 2, y: A / 2, r: 14, vel: 260 };
  moedas = []; inimigos = []; pontos = 0; tempo = 0;
  for (let i = 0; i < 5; i++) moedas.push(novaMoeda());
  cena = 'jogando';
}
const aleat = (a, b) => a + Math.random() * (b - a);
const novaMoeda = () => ({ x: aleat(30, L - 30), y: aleat(60, A - 30), r: 8 });
function novoInimigo() {
  const lado = Math.floor(Math.random() * 4);
  const x = lado === 0 ? -20 : lado === 1 ? L + 20 : aleat(0, L);
  const y = lado === 2 ? -20 : lado === 3 ? A + 20 : aleat(0, A);
  const ang = Math.atan2(jogador.y - y, jogador.x - x);
  const v = aleat(90, 160) + tempo * 2;
  return { x, y, r: 11, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v };
}
const colide = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.r + b.r) ** 2;

// ---- atualização com passo fixo ----
const PASSO = 1 / 60;
let acumulado = 0, ultimo = performance.now(), proxInimigo = 1.5;

function atualizar(dt) {
  if (cena !== 'jogando') { if (teclas.has(' ') || teclas.has('enter')) iniciar(); return; }
  tempo += dt;
  let dx = 0, dy = 0;
  if (teclas.has('arrowleft') || teclas.has('a')) dx -= 1;
  if (teclas.has('arrowright') || teclas.has('d')) dx += 1;
  if (teclas.has('arrowup') || teclas.has('w')) dy -= 1;
  if (teclas.has('arrowdown') || teclas.has('s')) dy += 1;
  if (toque.ativo) { dx = toque.x - jogador.x; dy = toque.y - jogador.y; if (Math.hypot(dx, dy) < 4) dx = dy = 0; }
  const n = Math.hypot(dx, dy) || 1;
  jogador.x = Math.max(jogador.r, Math.min(L - jogador.r, jogador.x + (dx / n) * jogador.vel * dt));
  jogador.y = Math.max(jogador.r, Math.min(A - jogador.r, jogador.y + (dy / n) * jogador.vel * dt));

  for (let i = moedas.length - 1; i >= 0; i--) if (colide(jogador, moedas[i])) { moedas[i] = novaMoeda(); pontos += 10; }
  proxInimigo -= dt;
  if (proxInimigo <= 0) { inimigos.push(novoInimigo()); proxInimigo = Math.max(0.35, 1.5 - tempo / 40); }
  for (const e of inimigos) { e.x += e.vx * dt; e.y += e.vy * dt; if (colide(jogador, e)) { cena = 'fim'; recorde = Math.max(recorde, pontos); } }
  inimigos = inimigos.filter((e) => e.x > -60 && e.x < L + 60 && e.y > -60 && e.y < A + 60);
}

// ---- desenho ----
function circulo(x, y, r, cor) { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function texto(t, y, tam = 28) { ctx.fillStyle = '#e6edf3'; ctx.font = '700 ' + tam + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(t, L / 2, y); }

function desenhar() {
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, L, A);
  if (cena === 'menu') { texto(${JSON.stringify(String(nome))}, A / 2 - 20, 40); texto('Espaço ou toque para jogar', A / 2 + 24, 18); hud.textContent = ''; return; }
  for (const m of moedas) circulo(m.x, m.y, m.r, '#f2c14e');
  for (const e of inimigos) circulo(e.x, e.y, e.r, '#ff5a5f');
  circulo(jogador.x, jogador.y, jogador.r, '#4ecdc4');
  hud.textContent = 'Pontos: ' + pontos + '   Tempo: ' + tempo.toFixed(1) + 's   Recorde: ' + recorde;
  if (cena === 'fim') { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, L, A); texto('Fim de jogo', A / 2 - 20, 40); texto(pontos + ' pontos · espaço ou toque para recomeçar', A / 2 + 24, 18); }
}

function quadro(agora) {
  acumulado += Math.min(0.25, (agora - ultimo) / 1000);
  ultimo = agora;
  while (acumulado >= PASSO) { atualizar(PASSO); acumulado -= PASSO; }
  desenhar();
  requestAnimationFrame(quadro);
}
requestAnimationFrame(quadro);
`,
});

const react = (nome, slug) => ({
  'package.json': JSON.stringify({
    name: slug,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
    devDependencies: { vite: '^5.4.10', '@vitejs/plugin-react': '^4.3.3' },
  }, null, 2) + '\n',
  'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ plugins: [react()] });
`,
  'index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(nome)}</title>
</head>
<body>
<div id="raiz"></div>
<script type="module" src="/src/main.jsx"></script>
</body>
</html>
`,
  'src/main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './estilo.css';

createRoot(document.getElementById('raiz')).render(<App />);
`,
  'src/App.jsx': `import { useState } from 'react';

export default function App() {
  const [itens, setItens] = useState(['Planejar telas', 'Criar componentes']);
  const [novo, setNovo] = useState('');
  const adicionar = (e) => {
    e.preventDefault();
    if (!novo.trim()) return;
    setItens([...itens, novo.trim()]);
    setNovo('');
  };
  return (
    <main className="app">
      <h1>{${JSON.stringify(String(nome))}}</h1>
      <p className="sub">App React criado pelo Creative Lovable.</p>
      <form onSubmit={adicionar} className="linha">
        <label htmlFor="novo" className="oculto">Nova tarefa</label>
        <input id="novo" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova tarefa" />
        <button>Adicionar</button>
      </form>
      <ul>{itens.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </main>
  );
}
`,
  'src/estilo.css': `:root { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #16181d; background: #f6f7f9; }
body { margin: 0; }
.app { max-width: 640px; margin: 64px auto; padding: 0 16px; }
h1 { font-size: 2.4rem; margin: 0; letter-spacing: -0.02em; }
.sub { color: #5c6270; }
.linha { display: flex; gap: 8px; margin: 24px 0; }
input { flex: 1; padding: 10px 12px; border: 1px solid #cfd4db; border-radius: 10px; font: inherit; }
button { padding: 10px 16px; border: 0; border-radius: 10px; background: #c4441c; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
li { padding: 10px 0; border-bottom: 1px solid #e3e5e9; }
.oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`,
});

const api = (nome, slug) => ({
  'package.json': JSON.stringify({
    name: slug,
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: { dev: 'node --watch src/servidor.js', start: 'node src/servidor.js' },
  }, null, 2) + '\n',
  'src/servidor.js': `// API em Node puro (sem dependências). Rotas JSON em /api e arquivos estáticos em /public.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA = Number(process.env.PORT || 3000);
const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const tarefas = [{ id: 1, titulo: 'Primeira tarefa', feita: false }];
let proximoId = 2;

const json = (res, status, dados) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
};
const lerCorpo = (req) => new Promise((ok, erro) => {
  let c = '';
  req.on('data', (p) => { c += p; if (c.length > 1e6) req.destroy(); });
  req.on('end', () => { try { ok(c ? JSON.parse(c) : {}); } catch (e) { erro(e); } });
});
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname === '/api/saude') return json(res, 200, { ok: true });
    if (url.pathname === '/api/tarefas' && req.method === 'GET') return json(res, 200, tarefas);
    if (url.pathname === '/api/tarefas' && req.method === 'POST') {
      const { titulo } = await lerCorpo(req);
      if (!titulo) return json(res, 400, { erro: 'Informe o título.' });
      const t = { id: proximoId++, titulo: String(titulo), feita: false };
      tarefas.push(t);
      return json(res, 201, t);
    }
    const m = url.pathname.match(/^\\/api\\/tarefas\\/(\\d+)$/);
    if (m) {
      const i = tarefas.findIndex((t) => t.id === Number(m[1]));
      if (i < 0) return json(res, 404, { erro: 'Tarefa não encontrada.' });
      if (req.method === 'PATCH') { Object.assign(tarefas[i], await lerCorpo(req)); return json(res, 200, tarefas[i]); }
      if (req.method === 'DELETE') { tarefas.splice(i, 1); return json(res, 204, {}); }
    }
    const arquivo = path.join(PUBLICO, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!arquivo.startsWith(PUBLICO)) return json(res, 403, { erro: 'Proibido.' });
    const conteudo = await fs.readFile(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(conteudo);
  } catch (e) {
    if (e.code === 'ENOENT') return json(res, 404, { erro: 'Não encontrado.' });
    console.error(e);
    json(res, 500, { erro: 'Erro interno.' });
  }
});

servidor.listen(PORTA, () => console.log('API rodando em http://localhost:' + PORTA));
`,
  'public/index.html': `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(nome)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 560px; margin: 48px auto; padding: 0 16px; color: #16181d; }
  form { display: flex; gap: 8px; } input { flex: 1; padding: 8px 10px; } li { padding: 6px 0; }
</style>
</head>
<body>
<h1>${h(nome)}</h1>
<form id="f"><label for="t" hidden>Tarefa</label><input id="t" placeholder="Nova tarefa"><button>Adicionar</button></form>
<ul id="lista"></ul>
<script>
async function carregar() {
  const r = await fetch('/api/tarefas');
  const tarefas = await r.json();
  document.getElementById('lista').innerHTML = tarefas.map((t) => '<li>' + t.titulo + '</li>').join('');
}
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault();
  const campo = document.getElementById('t');
  if (!campo.value.trim()) return;
  await fetch('/api/tarefas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: campo.value }) });
  campo.value = '';
  carregar();
});
carregar();
</script>
</body>
</html>
`,
});

const vazio = (nome) => ({
  'README.md': `# ${h(nome)}\n\nProjeto criado pelo Creative Lovable.\n`,
});

export const MODELOS = {
  html: { titulo: 'Página única', descricao: 'Um index.html com Tailwind pelo CDN. Ideal para landing pages, protótipos e apps simples.', arquivos: html, servidor: 'estatico' },
  web: { titulo: 'Site em arquivos', descricao: 'index.html + css/ + js/. Para sites com várias seções e código organizado.', arquivos: web, servidor: 'estatico' },
  jogo: { titulo: 'Jogo em canvas', descricao: 'Laço de jogo com passo fixo, teclado e toque, cenas e colisão. Base para jogos 2D.', arquivos: jogo, servidor: 'estatico' },
  react: { titulo: 'App React (Vite)', descricao: 'React 18 + Vite. Precisa de npm install; o preview roda com cl_iniciar_servidor.', arquivos: react, servidor: 'dev' },
  api: { titulo: 'API Node', descricao: 'Servidor HTTP em Node puro com rotas JSON e página em public/. Roda com cl_iniciar_servidor.', arquivos: api, servidor: 'dev' },
  vazio: { titulo: 'Vazio', descricao: 'Só um README. Para qualquer outro tipo de software.', arquivos: vazio, servidor: 'estatico' },
};
