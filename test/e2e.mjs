// Teste de ponta a ponta: sobe o Creative Lovable como um cliente MCP real faria (stdio e HTTP) e exercita todas as ferramentas.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(RAIZ, 'bin', 'creative-lovable-mcp.js');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-e2e-'));
const PORTA = 4700 + Math.floor(Math.random() * 200);
const BASE = `http://localhost:${PORTA}`;

let ok = 0, falhas = 0;
const checar = (cond, msg, extra) => { if (cond) { ok++; console.log('  ok  ' + msg); } else { falhas++; console.log('  FALHOU  ' + msg + (extra ? '\n          ' + String(extra).slice(0, 400) : '')); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const txt = (r) => (r.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');

function req(metodo, rota, { corpo, cabecalhos = {}, host } = {}) {
  return new Promise((ok2, erro) => {
    const r = http.request({ host: '127.0.0.1', port: PORTA, path: rota, method: metodo, headers: { ...(host ? { Host: host } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...cabecalhos } }, (res) => {
      let c = ''; res.on('data', (d) => { c += d; }); res.on('end', () => ok2({ status: res.statusCode, tipo: res.headers['content-type'] || '', corpo: c }));
    });
    r.on('error', erro);
    if (corpo) r.write(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    r.end();
  });
}

function ouvirEventos() {
  const eventos = [];
  const r = http.get({ host: '127.0.0.1', port: PORTA, path: '/api/eventos' }, (res) => {
    let buf = '';
    res.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const bloco = buf.slice(0, i); buf = buf.slice(i + 2);
        const tipo = (bloco.match(/^event: (.+)$/m) || [])[1];
        const dados = (bloco.match(/^data: (.+)$/m) || [])[1];
        if (tipo) eventos.push({ tipo, dados: dados ? JSON.parse(dados) : null });
      }
    });
  });
  return { eventos, fechar: () => r.destroy() };
}

async function conectarStdio(extraArgs = []) {
  const t = new StdioClientTransport({ command: process.execPath, args: [BIN, '--dir', DIR, '--porta', String(PORTA), ...extraArgs], stderr: 'pipe' });
  const logs = [];
  t.stderr?.on('data', (d) => logs.push(String(d)));
  const c = new Client({ name: 'teste-e2e', version: '1.0.0' });
  await c.connect(t);
  return { c, logs };
}
const chamar = (c, name, args) => c.callTool({ name, arguments: args });
const chamarLongo = (c, name, args) => c.callTool({ name, arguments: args }, undefined, { timeout: 240000 });

async function principal() {
  console.log(`Pasta de teste: ${DIR}\nPorta: ${PORTA}\n`);
  const { c, logs } = await conectarStdio();
  await esperar(150);

  console.log('# Conexão');
  const { tools } = await c.listTools();
  checar(tools.length === 33, `33 ferramentas anunciadas (${tools.length})`);
  checar(/laboratório e estúdio de criação/.test(c.getInstructions() || ''), 'instruções do servidor chegam ao cliente');
  checar(tools.every((t) => t.description && t.description.length > 20), 'toda ferramenta tem descrição');
  checar(tools.find((t) => t.name === 'cl_apagar').annotations?.destructiveHint === true, 'apagar marcada como destrutiva');
  const prompt = await c.getPrompt({ name: 'cl_novo', arguments: { descricao: 'um quiz de capitais' } });
  checar(/quiz de capitais/.test(prompt.messages[0].content.text), 'prompt cl_novo monta o pedido');
  const guia = await c.readResource({ uri: 'creative-lovable://guia' });
  checar(/modo estúdio/.test(guia.contents[0].text), 'recurso creative-lovable://guia legível');
  const manual = await c.readResource({ uri: 'creative-lovable://principios' });
  checar(/Manual do estúdio/.test(manual.contents[0].text), 'recurso creative-lovable://principios (manual do estúdio) legível');
  checar(logs.join('').includes(`painel em ${BASE}`), 'painel iniciou na porta pedida');

  console.log('\n# Projetos');
  let r = await chamar(c, 'cl_projetos', {});
  checar(/Nenhum projeto/.test(txt(r)), 'lista vazia no começo');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Loja da Ana', modelo: 'web', descricao: 'site de doces', modo: 'livre' });
  checar(!r.isError && /loja-da-ana/.test(txt(r)) && fs.existsSync(path.join(DIR, 'loja-da-ana', 'css', 'estilo.css')), 'projeto web criado com arquivos do modelo');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Loja da Ana', modelo: 'html' });
  checar(/loja-da-ana-2/.test(txt(r)), 'nome repetido ganha sufixo');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'X', modelo: 'inexistente' });
  checar(r.isError, 'modelo inválido é recusado');
  r = await chamar(c, 'cl_projetos', {});
  checar(/2 projetos/.test(txt(r)) && /preview\/loja-da-ana\//.test(txt(r)), 'lista mostra projetos com link de preview');
  r = await chamar(c, 'cl_versoes', { projeto: 'Loja da Ana' });
  checar(/v1 .*modelo "web"/.test(txt(r)), 'v1 salva na criação e busca por nome funciona');

  console.log('\n# Arquivos e edição');
  const sse = ouvirEventos();
  await esperar(100);
  const html = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<title>Loja</title>\n<link rel="stylesheet" href="css/estilo.css">\n</head>\n<body>\n<h1 id="t">Doces da Ana</h1>\n<img src="img/logo.png" alt="">\n<script>\nconst preco = 10;\nfunction total(q) { return q * preco }\nconsole.log(total(2)\n</script>\n<script type="module" src="js/app.js"></script>\n</body>\n</html>\n';
  r = await chamar(c, 'cl_escrever', { projeto: 'loja-da-ana', caminho: 'index.html', conteudo: html });
  checar(/Atualizado: index.html \(18 linhas/.test(txt(r)), 'escrever atualiza e conta linhas', txt(r));
  await esperar(400);
  checar(sse.eventos.some((e) => e.tipo === 'atividade' && /index.html/.test(e.dados.texto)), 'painel recebe atividade ao vivo');
  checar(sse.eventos.some((e) => e.tipo === 'arquivos' && e.dados.projeto === 'loja-da-ana'), 'painel recebe aviso de arquivo mudado');
  r = await chamar(c, 'cl_verificar', { projeto: 'loja-da-ana' });
  const v1 = txt(r);
  checar(/index.html:15/.test(v1) && /sintaxe/i.test(v1), 'verificar acha erro de sintaxe na linha certa do HTML', v1);
  checar(/img\/logo.png/.test(v1) && /não existe/.test(v1), 'verificar acha imagem inexistente', v1);
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'index.html', edicoes: [{ buscar: 'console.log(total(2)', substituir: 'console.log(total(2));' }, { buscar: '<img src="img/logo.png" alt="">\n', substituir: '' }] });
  checar(!r.isError && /2 trechos|edição 1: exato/.test(txt(r)), 'editar aplica duas trocas', txt(r));
  r = await chamar(c, 'cl_verificar', { projeto: 'loja-da-ana' });
  checar(/Nenhum problema/.test(txt(r)), 'verificar limpo depois da correção', txt(r));
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'index.html', edicoes: [{ buscar: '<h1 id="t">Doces da Aninha</h1>', substituir: 'x' }] });
  checar(r.isError && /linha mais parecida é a 9/.test(txt(r)), 'edição sem achar o trecho sugere a linha parecida', txt(r));
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'index.html', edicoes: [{ buscar: '      <h1   id="t">Doces da Ana</h1>', substituir: '<h1 id="t">Doces Finos da Ana</h1>' }] });
  checar(!r.isError && /ignorando espaços/.test(txt(r)), 'edição tolerante a espaços', txt(r));
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'css/estilo.css', edicoes: [{ buscar: 'var(--suave)', substituir: '#444' }] });
  checar(r.isError && /aparece 2 vezes/.test(txt(r)), 'trecho repetido exige mais contexto', txt(r));
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'css/estilo.css', edicoes: [{ buscar: 'var(--suave)', substituir: 'var(--texto)', todas: true }] });
  checar(!r.isError && /2 trocas/.test(txt(r)), 'com "todas" troca as duas ocorrências', txt(r));
  r = await chamar(c, 'cl_editar', { projeto: 'loja-da-ana', caminho: 'css/estilo.css', edicoes: [{ buscar: 'padding-block', substituir: 'padding-block-x', todas: true }, { buscar: 'nao-existe-isso', substituir: '' }] });
  checar(r.isError && !fs.readFileSync(path.join(DIR, 'loja-da-ana', 'css', 'estilo.css'), 'utf8').includes('padding-block-x'), 'edição é atômica: falha numa, nada muda');
  r = await chamar(c, 'cl_ler', { projeto: 'loja-da-ana', caminho: 'index.html', linha_inicio: 9, linha_fim: 9 });
  checar(/linhas 9-9 de 17/.test(txt(r)) && /Doces Finos da Ana/.test(txt(r)), 'ler um intervalo de linhas', txt(r));
  r = await chamar(c, 'cl_ler', { projeto: 'loja-da-ana', caminho: '../../../etc/passwd' });
  checar(r.isError && /sai da pasta/.test(txt(r)), 'caminho para fora do projeto é bloqueado');
  r = await chamar(c, 'cl_ler', { projeto: 'loja-da-ana', caminho: '.creative/projeto.json' });
  checar(r.isError && /interna/.test(txt(r)), 'pasta .creative protegida');
  r = await chamar(c, 'cl_escrever', { projeto: 'loja-da-ana', caminho: 'pages/sobre.html', conteudo: '<!doctype html><title>Sobre</title><p>Sobre nós</p>' });
  checar(fs.existsSync(path.join(DIR, 'loja-da-ana', 'pages', 'sobre.html')), 'escrever cria subpastas');
  r = await chamar(c, 'cl_mover', { projeto: 'loja-da-ana', de: 'pages/sobre.html', para: 'sobre.html' });
  checar(!r.isError && fs.existsSync(path.join(DIR, 'loja-da-ana', 'sobre.html')), 'mover arquivo');
  r = await chamar(c, 'cl_buscar', { projeto: 'loja-da-ana', termo: 'Doces Finos' });
  checar(/index.html:9:/.test(txt(r)), 'buscar devolve arquivo:linha', txt(r));
  r = await chamar(c, 'cl_buscar', { projeto: 'loja-da-ana', termo: 'preco\\s*=\\s*\\d+', regex: true });
  checar(/index.html:11/.test(txt(r)), 'buscar com expressão regular', txt(r));
  r = await chamar(c, 'cl_arquivos', { projeto: 'loja-da-ana' });
  checar(/index.html/.test(txt(r)) && /sobre.html/.test(txt(r)) && !/\.creative/.test(txt(r)), 'listar arquivos sem a pasta interna');
  r = await chamar(c, 'cl_apagar', { projeto: 'loja-da-ana', caminho: 'pages' });
  checar(!fs.existsSync(path.join(DIR, 'loja-da-ana', 'pages')), 'apagar pasta');

  console.log('\n# Preview e painel');
  let h = await req('GET', '/preview/loja-da-ana/');
  const arquivoHtml = fs.readFileSync(path.join(DIR, 'loja-da-ana', 'index.html'), 'utf8');
  checar(h.status === 200 && h.corpo.includes('data-creative-runtime') && h.corpo.includes('Doces Finos da Ana'), 'preview serve o HTML com o runtime');
  checar(h.corpo.split('\n').length === arquivoHtml.split('\n').length, 'runtime não muda os números de linha');
  h = await req('GET', '/preview/loja-da-ana/css/estilo.css');
  checar(h.status === 200 && /text\/css/.test(h.tipo), 'preview serve CSS com o tipo certo');
  h = await req('GET', '/preview/loja-da-ana/..%2F..%2F..%2Fetc%2Fpasswd');
  checar(h.status === 403 || h.status === 404, 'preview bloqueia caminho para fora (' + h.status + ')');
  h = await req('GET', '/preview/loja-da-ana/.creative/projeto.json');
  checar(h.status === 403, 'preview não expõe .creative');
  h = await req('GET', '/');
  checar(h.status === 200 && /Creative Lovable · painel/.test(h.corpo), 'painel abre');
  h = await req('GET', '/api/projetos');
  checar(h.status === 200 && JSON.parse(h.corpo).projetos.length === 2, 'API lista os projetos');
  h = await req('GET', '/api/projetos', { host: 'site-malicioso.com' });
  checar(h.status === 403, 'acesso com Host estranho é recusado (proteção contra DNS rebinding)');
  r = await chamar(c, 'cl_preview', { projeto: 'loja-da-ana' });
  checar(new RegExp(`${BASE}/#/loja-da-ana`).test(txt(r)) && /Preview direto/.test(txt(r)), 'cl_preview devolve os links', txt(r));

  console.log('\n# Erros do navegador e seleção');
  h = await req('POST', '/api/projetos/loja-da-ana/erros', { corpo: { tipo: 'erro', mensagem: 'TypeError: carrinho is undefined', arquivo: 'js/app.js', linha: 7, coluna: 3 }, cabecalhos: { 'X-Creative': '1' } });
  checar(h.status === 200, 'runtime consegue relatar erro');
  h = await req('POST', '/api/projetos/loja-da-ana/erros', { corpo: { mensagem: 'falso' } });
  checar(h.status === 403, 'relato sem cabeçalho do Creative Lovable é recusado');
  h = await req('POST', '/api/projetos/loja-da-ana/erros', { corpo: { mensagem: 'falso' }, cabecalhos: { 'X-Creative': '1', Origin: 'https://site-malicioso.com' } });
  checar(h.status === 403, 'relato vindo de outro site é recusado');
  r = await chamar(c, 'cl_erros', { projeto: 'loja-da-ana' });
  checar(/carrinho is undefined em js\/app.js:7:3/.test(txt(r)) && !/falso/.test(txt(r)), 'cl_erros mostra o erro do navegador', txt(r));
  r = await chamar(c, 'cl_verificar', { projeto: 'loja-da-ana' });
  checar(/Erros vistos no navegador \(1\)/.test(txt(r)), 'verificar inclui erros do navegador');
  r = await chamar(c, 'cl_erros', { projeto: 'loja-da-ana', limpar: true });
  r = await chamar(c, 'cl_erros', { projeto: 'loja-da-ana' });
  checar(/nenhum erro registrado/.test(txt(r)), 'limpar zera a lista');
  r = await chamar(c, 'cl_selecao', { projeto: 'loja-da-ana' });
  checar(/Nenhum elemento selecionado/.test(txt(r)), 'sem seleção ainda');
  await req('POST', '/api/projetos/loja-da-ana/selecao', { corpo: { tag: 'h1', caminho: 'h1#t', texto: 'Doces Finos da Ana', html: '<h1 id="t">Doces Finos da Ana</h1>', pagina: '/' }, cabecalhos: { 'X-Creative': '1' } });
  r = await chamar(c, 'cl_selecao', { projeto: 'loja-da-ana' });
  checar(/Seletor: h1#t/.test(txt(r)) && /Doces Finos/.test(txt(r)), 'cl_selecao lê o elemento escolhido no painel');
  r = await chamar(c, 'cl_capturar_tela', { projeto: 'loja-da-ana' });
  checar(!r.isError && (/indisponível/.test(txt(r)) || r.content.some((x) => x.type === 'image')), 'captura de tela explica como ativar quando falta o Playwright');

  console.log('\n# Versões');
  r = await chamar(c, 'cl_salvar_versao', { projeto: 'loja-da-ana', mensagem: 'Título novo e página sobre' });
  checar(/v2 salva/.test(txt(r)), 'salvar v2', txt(r));
  r = await chamar(c, 'cl_salvar_versao', { projeto: 'loja-da-ana', mensagem: 'de novo' });
  checar(/Nada mudou desde a v2/.test(txt(r)), 'sem mudança não cria versão');
  await chamar(c, 'cl_escrever', { projeto: 'loja-da-ana', caminho: 'index.html', conteudo: 'quebrado' });
  r = await chamar(c, 'cl_restaurar', { projeto: 'loja-da-ana', versao: 2 });
  checar(/virou a v4/.test(txt(r)) && /v3/.test(txt(r)) && fs.readFileSync(path.join(DIR, 'loja-da-ana', 'index.html'), 'utf8').includes('Doces Finos'), 'restaurar volta os arquivos e guarda o estado anterior', txt(r));
  r = await chamar(c, 'cl_restaurar', { projeto: 'loja-da-ana', versao: 1 });
  checar(!fs.existsSync(path.join(DIR, 'loja-da-ana', 'sobre.html')), 'restaurar remove arquivos que não existiam na versão');
  r = await chamar(c, 'cl_versoes', { projeto: 'loja-da-ana' });
  checar(/v5 .*Restaurado da v1/.test(txt(r)), 'histórico registra a restauração', txt(r));
  h = await req('POST', '/api/projetos/loja-da-ana/restaurar', { corpo: { versao: 4 }, cabecalhos: { 'X-Creative': '1' } });
  checar(h.status === 200 && fs.readFileSync(path.join(DIR, 'loja-da-ana', 'index.html'), 'utf8').includes('Doces Finos'), 'painel também restaura versões');

  console.log('\n# Comandos e servidor');
  r = await chamar(c, 'cl_executar', { projeto: 'loja-da-ana', comando: 'node -e "console.log(6*7)"' });
  checar(!r.isError && /Código de saída: 0/.test(txt(r)) && /\n42/.test(txt(r)), 'executar node e ler a saída', txt(r));
  r = await chamar(c, 'cl_executar', { projeto: 'loja-da-ana', comando: 'rm -rf /' });
  checar(r.isError && /não está liberado/.test(txt(r)), 'programa fora da lista é bloqueado');
  r = await chamar(c, 'cl_executar', { projeto: 'loja-da-ana', comando: 'node -v && rm -rf .' });
  checar(r.isError && /encadeamento/.test(txt(r)), 'encadeamento de comandos é bloqueado');
  r = await chamar(c, 'cl_executar', { projeto: 'loja-da-ana', comando: 'node -e "process.exit(3)"' });
  checar(r.isError && /Código de saída: 3/.test(txt(r)), 'código de saída diferente de zero vira erro');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Minha API', modelo: 'api' });
  const portaApi = 5200 + Math.floor(Math.random() * 300);
  await chamar(c, 'cl_editar', { projeto: 'minha-api', caminho: 'src/servidor.js', edicoes: [{ buscar: 'process.env.PORT || 3000', substituir: `process.env.PORT || ${portaApi}` }] });
  r = await chamar(c, 'cl_iniciar_servidor', { projeto: 'minha-api' });
  checar(new RegExp(`localhost:${portaApi}`).test(txt(r)), 'iniciar servidor detecta a URL', txt(r));
  const saude = await fetch(`http://localhost:${portaApi}/api/saude`).then((x) => x.json()).catch((e) => ({ erro: e.message }));
  checar(saude.ok === true, 'a API do projeto responde', JSON.stringify(saude));
  r = await chamar(c, 'cl_preview', { projeto: 'minha-api' });
  checar(new RegExp(`App rodando em: http://localhost:${portaApi}`).test(txt(r)), 'preview aponta para o servidor do projeto');
  r = await chamar(c, 'cl_verificar', { projeto: 'minha-api' });
  checar(/Nenhum problema/.test(txt(r)), 'modelo api passa na verificação', txt(r));
  r = await chamar(c, 'cl_parar_servidor', { projeto: 'minha-api' });
  await esperar(300);
  const parado = await fetch(`http://localhost:${portaApi}/api/saude`).then(() => 'respondeu').catch(() => 'parado');
  checar(/Servidor parado/.test(txt(r)) && parado === 'parado', 'parar servidor encerra o processo');

  console.log('\n# Modelos react e jogo');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'App React', modelo: 'react', modo: 'livre' });
  r = await chamar(c, 'cl_verificar', { projeto: 'app-react' });
  checar(/Nenhum problema/.test(txt(r)), 'modelo react (JSX) passa na verificação', txt(r));
  await chamar(c, 'cl_escrever', { projeto: 'app-react', caminho: 'src/main.jsx', conteudo: "import App from './Inexistente.jsx';\nconst x = <div>oi</div>;\n" });
  r = await chamar(c, 'cl_verificar', { projeto: 'app-react' });
  checar(/Inexistente.jsx/.test(txt(r)), 'import local inexistente é apontado', txt(r));
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Coletor', modelo: 'jogo', modo: 'livre' });
  r = await chamar(c, 'cl_verificar', { projeto: 'coletor' });
  checar(/Nenhum problema/.test(txt(r)), 'modelo jogo passa na verificação', txt(r));

  console.log('\n# Exportar');
  r = await chamar(c, 'cl_exportar', { projeto: 'loja-da-ana' });
  const zipPath = (txt(r).match(/Zip criado: (.+\.zip)/) || [])[1];
  checar(zipPath && fs.existsSync(zipPath), 'zip criado', txt(r));
  if (zipPath) {
    const zip = await JSZip.loadAsync(fs.readFileSync(zipPath));
    const nomes = Object.keys(zip.files);
    checar(nomes.includes('loja-da-ana/index.html') && !nomes.some((n) => n.includes('.creative')), 'zip tem os arquivos e não tem a pasta interna');
  }

  console.log('\n# Estúdio: etapas e portões');
  const P = 'navalha-e-cafe';
  const FX = path.join(RAIZ, 'test', 'fixtures');
  const lerFx = (rel) => fs.readFileSync(path.join(FX, rel), 'utf8');
  const estudioApi = (sub, corpo, cab = { 'X-Creative': '1' }) => req(corpo ? 'POST' : 'GET', `/api/projetos/${P}/estudio${sub}`, { corpo, cabecalhos: cab });
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Navalha e Café', modelo: 'html' });
  checar(/modo estúdio/.test(txt(r)) && /cl_briefing/.test(txt(r)), 'projeto visual nasce no modo estúdio', txt(r));
  r = await chamar(c, 'cl_escrever', { projeto: P, caminho: 'index.html', conteudo: '<h1>pressa</h1>' });
  checar(r.isError && /Modo estúdio/.test(txt(r)) && /Briefing/.test(txt(r)), 'código da página bloqueado antes do briefing', txt(r));
  r = await chamar(c, 'cl_escrever', { projeto: P, caminho: 'docs/notas.md', conteudo: '# anotações' });
  checar(!r.isError, 'documentação pode ser escrita antes das aprovações');
  r = await chamar(c, 'cl_briefing', { projeto: P, tipo: 'landing', assunto: 'site moderno' });
  checar(r.isError && /Pergunte ao usuário/.test(txt(r)) && /assunto concreto/.test(txt(r)), 'briefing vago devolve as perguntas', txt(r));
  const briefing = {
    projeto: P, tipo: 'landing', assunto: 'Agenda online da barbearia Navalha e Café, em Natal',
    publico: 'Homens de 25 a 45 anos que trabalham no centro e cortam o cabelo a cada 3 semanas',
    objetivo: 'Agendar um horário pelo site', tom: ['caloroso', 'artesanal', 'direto'],
    conteudo: 'Corte na tesoura R$ 45 (40 min). Barba com toalha quente R$ 35. Corte e barba R$ 70. Terça a sábado, 9h às 19h. Rua Chile, 112, Ribeira, Natal. WhatsApp (84) 99999-0000. Café coado na hora. Barbeiros: Rafael e Joca. Desde 2014.',
    marca: { nome: 'Navalha e Café' },
  };
  r = await chamar(c, 'cl_briefing', briefing);
  checar(!r.isError && fs.existsSync(path.join(DIR, P, 'docs', 'BRIEFING.md')), 'briefing registrado e salvo em docs/BRIEFING.md', txt(r));

  console.log('\n# Estúdio: biblioteca e direção de arte');
  r = await chamar(c, 'cl_catalogo', { tipo: 'direcoes', projeto: P });
  checar(/Convenção do setor/.test(txt(r)) && /Fontes curadas/.test(txt(r)) && /Estilos candidatos/.test(txt(r)), 'catálogo monta o material das direções a partir do briefing');
  r = await chamar(c, 'cl_catalogo', { tipo: 'ux', termo: 'formulário' });
  checar(!r.isError && /Forms|Form/.test(txt(r)), 'busca nas diretrizes de UX (português para inglês)', txt(r));
  r = await chamar(c, 'cl_catalogo', { tipo: 'fontes', projeto: P });
  checar(/Títulos:/.test(txt(r)) && !/Títulos:[^\n]*\bInter\b/.test(txt(r)), 'fontes curadas não sugerem fontes saturadas');
  const generica = { nome: 'Moderna', conceito: 'Um site moderno, clean e elegante', referencia: 'sites modernos', assinatura: 'design clean', cores: { marca: '#7c3aed' }, tipografia: { titulos: 'Inter', texto: 'Inter' } };
  r = await chamar(c, 'cl_propor_direcoes', { projeto: P, propostas: [generica, { ...generica, nome: 'Moderna 2' }] });
  checar(r.isError && /Inter/.test(txt(r)) && /Roxo/.test(txt(r)) && /conceito/.test(txt(r)) && /mesma ideia/.test(txt(r)), 'direções genéricas e parecidas são recusadas', txt(r));
  const direcoes = JSON.parse(lerFx('direcoes.json'));
  r = await chamar(c, 'cl_propor_direcoes', { projeto: P, propostas: direcoes });
  checar(!r.isError && /d1 "Oficina de bairro"/.test(txt(r)) && /aprovação/.test(txt(r)), 'direções distintas aceitas e aguardando aprovação', txt(r));
  r = await chamar(c, 'cl_gerar_design_system', { projeto: P });
  checar(r.isError && /aprovada/.test(txt(r)), 'design system exige direção aprovada');
  let h2 = await estudioApi('/config', { aprovacao: 'painel' });
  checar(h2.status === 200, 'usuário muda a política de aprovação pelo painel');
  r = await chamar(c, 'cl_aprovar', { projeto: P, etapa: 'direcao', id: 'd1', palavras_do_usuario: 'vai com a primeira' });
  checar(r.isError && /só pelo painel/.test(txt(r)), 'com aprovação só no painel, a IA não aprova pela conversa');
  h2 = await estudioApi('/aprovar', { etapa: 'direcao', id: 'd1' }, {});
  checar(h2.status === 403, 'aprovação pelo painel exige o cabeçalho X-Creative');
  h2 = await estudioApi('/aprovar', { etapa: 'direcao', id: 'd1' });
  checar(h2.status === 200 && JSON.parse(h2.corpo).situacao.etapas[1].feita, 'usuário aprova a direção pelo painel');

  console.log('\n# Estúdio: design system');
  r = await chamar(c, 'cl_gerar_design_system', { projeto: P });
  const ds = (f) => path.join(DIR, P, 'design-system', f);
  const pares = txt(r).match(/Contraste: (\d+)\/(\d+) pares passam/);
  checar(!r.isError && pares && pares[1] === pares[2], 'design system gerado com todos os pares de contraste WCAG AA', txt(r));
  checar(['tokens.css', 'base.css', 'componentes.css', 'componentes.js', 'tokens.json', 'DESIGN.md', 'index.html', 'tailwind-tema.js', 'tailwind.preset.js', 'tailwind-v4.css'].every((f) => fs.existsSync(ds(f))), 'arquivos do design system criados');
  const tokensCss = fs.readFileSync(ds('tokens.css'), 'utf8');
  checar(/--cor-marca:/.test(tokensCss) && /--tamanho-4xl: clamp\(/.test(tokensCss) && /--espaco-secao: clamp\(/.test(tokensCss) && /\[data-tema="escuro"\]/.test(tokensCss), 'tokens com cor, escala fluida, espaço e tema escuro');
  const dtcg = JSON.parse(fs.readFileSync(ds('tokens.json'), 'utf8'));
  checar(dtcg.cor.marca['500'].$type === 'color' && /^#[0-9a-f]{6}$/.test(dtcg.cor.marca['500'].$value.hex) && dtcg.tamanho.base.$value.unit === 'px', 'tokens.json no formato DTCG');
  checar(/^---\nversion: alpha\nname: "Oficina de bairro"/.test(fs.readFileSync(ds('DESIGN.md'), 'utf8')), 'DESIGN.md no formato aberto (frontmatter + seções)');
  h2 = await req('GET', `/preview/${P}/design-system/index.html`);
  checar(h2.status === 200 && /Oficina de bairro/.test(h2.corpo), 'apresentação do design system abre no preview');
  const { analisarJs } = await import('../src/verificar.js');
  const { REACT } = await import('../src/estudio/componentes.js');
  const jsxQuebrado = Object.entries(REACT).filter(([, cod]) => analisarJs(cod, { jsx: true, modo: 'module' }));
  checar(!jsxQuebrado.length, `componentes React têm JSX válido (${Object.keys(REACT).length} arquivos)`, jsxQuebrado.map(([k]) => k).join(', '));
  r = await chamar(c, 'cl_componente', {});
  checar(/botao:/.test(txt(r)) && /abas:/.test(txt(r)), 'lista de componentes');
  r = await chamar(c, 'cl_componente', { nome: 'abas', projeto: P });
  checar(/role="tablist"/.test(txt(r)) && /var\(--cor-/.test(txt(r)) && /Abas\.jsx/.test(txt(r)), 'componente vem com HTML, CSS de tokens e React');

  console.log('\n# Estúdio: arquitetura');
  r = await chamar(c, 'cl_arquitetura', { projeto: P, paginas: [{ caminho: 'index.html', titulo: 'Início', objetivo: 'agendar', secoes: [{ tipo: 'hero', proposito: 'x', conteudo: 'lorem ipsum' }] }] });
  checar(r.isError && /4 seções/.test(txt(r)) && /enchimento/.test(txt(r)), 'arquitetura rasa ou com enchimento é recusada', txt(r));
  const arquitetura = {
    projeto: P,
    paginas: [{ caminho: 'index.html', titulo: 'Início', objetivo: 'Fazer a pessoa agendar um horário em menos de um minuto', secoes: [
      { tipo: 'abertura', titulo: 'Corte na tesoura, café coado na hora', proposito: 'Dizer o que é, onde fica e levar à agenda', conteudo: 'Título com o benefício, horário de funcionamento e botão Agendar', layout: 'duas colunas assimétricas 7/5 com bilhetes de horário' },
      { tipo: 'servicos', titulo: 'Serviços e preços', proposito: 'Mostrar preço fechado antes de agendar', conteudo: 'Corte R$ 45, barba R$ 35, corte e barba R$ 70 com duração', layout: 'lista tipo cardápio com preços alinhados' },
      { tipo: 'agenda', titulo: 'Agende em três passos', proposito: 'Converter: escolher serviço, dia e deixar contato', conteudo: 'Formulário com serviço, dia, nome e WhatsApp e confirmação na tela', componentes: ['campo', 'botao'] },
      { tipo: 'onde', titulo: 'Onde fica', proposito: 'Tirar a dúvida de endereço e horário', conteudo: 'Rua Chile 112, Ribeira; tabela de horário; botão de WhatsApp', componentes: ['tabela'] },
    ] }],
    responsivo: 'No celular as colunas empilham: título e botão primeiro, bilhetes logo abaixo, formulário em largura total.',
  };
  r = await chamar(c, 'cl_arquitetura', arquitetura);
  checar(!r.isError && fs.existsSync(path.join(DIR, P, 'docs', 'ARQUITETURA.md')), 'arquitetura registrada em docs/ARQUITETURA.md', txt(r));
  r = await chamar(c, 'cl_escrever', { projeto: P, caminho: 'index.html', conteudo: '<h1>ainda não</h1>' });
  checar(r.isError && /Arquitetura/.test(txt(r)), 'código continua bloqueado até a arquitetura ser aprovada');
  h2 = await estudioApi('/ajuste', { etapa: 'arquitetura', texto: 'Coloque o endereço antes dos preços' });
  r = await chamar(c, 'cl_status', { projeto: P });
  checar(h2.status === 200 && /Coloque o endereço antes dos preços/.test(txt(r)), 'pedido de ajuste do painel chega à IA pelo cl_status');
  await estudioApi('/config', { aprovacao: 'painel-ou-conversa' });
  r = await chamar(c, 'cl_aprovar', { projeto: P, etapa: 'arquitetura', palavras_do_usuario: 'pode seguir assim' });
  checar(!r.isError && /Arquitetura aprovada/.test(txt(r)), 'aprovação pela conversa registrada com as palavras do usuário', txt(r));

  console.log('\n# Estúdio: auditoria e entrega');
  r = await chamar(c, 'cl_escrever', { projeto: P, caminho: 'index.html', conteudo: lerFx('generico.html') });
  checar(!r.isError, 'código liberado depois das aprovações');
  r = await chamarLongo(c, 'cl_auditar', { projeto: P });
  const notaGenerica = Number((txt(r).match(/Nota (\d+)\/100/) || [])[1]);
  const navegadorReal = /navegador real/.test(txt(r));
  checar(notaGenerica < 40 && /REPROVADA/.test(txt(r)), `página com cara de IA reprovada (nota ${notaGenerica}${navegadorReal ? ', com navegador' : ', só código'})`, txt(r).slice(0, 600));
  checar(['Gradiente roxo', 'lorem ipsum', 'Inter', 'emojis', 'clichê', 'número de efeito', 'tokens.css'].every((t) => txt(r).includes(t)), 'auditoria aponta gradiente, enchimento, fonte, emoji, clichê, número inventado e falta do design system');
  r = await chamar(c, 'cl_exportar', { projeto: P });
  checar(r.isError && /auditoria aprovada/.test(txt(r)), 'exportação bloqueada com a auditoria reprovada');
  for (const f of ['index.html', 'css/estilo.css', 'js/agenda.js']) await chamar(c, 'cl_escrever', { projeto: P, caminho: f, conteudo: lerFx('navalha/' + f) });
  r = await chamarLongo(c, 'cl_auditar', { projeto: P });
  const notaBoa = Number((txt(r).match(/Nota (\d+)\/100/) || [])[1]);
  checar(notaBoa >= 80 && /APROVADA/.test(txt(r)) && /0 crítico/.test(txt(r)), `página feita no processo do estúdio aprovada (nota ${notaBoa})`, txt(r).slice(0, 1200));
  if (navegadorReal) checar((r.content || []).filter((x) => x.type === 'image').length === 2, 'auditoria devolve as capturas do computador e do celular');
  h2 = await estudioApi('');
  const sit = JSON.parse(h2.corpo);
  checar(h2.status === 200 && sit.historico.length === 2 && sit.etapas.find((e) => e.fase === 'auditoria').feita, 'painel recebe a situação e o histórico de notas');
  if (navegadorReal) {
    h2 = await req('GET', `/api/projetos/${P}/estudio/captura?n=2&nome=computador.jpg`);
    checar(h2.status === 200 && /image\/jpeg/.test(h2.tipo), 'painel serve a captura da auditoria');
  }
  h2 = await req('GET', `/api/projetos/${P}/estudio/captura?n=2&nome=../../projeto.json`);
  checar(h2.status === 400, 'rota de captura recusa caminhos estranhos');
  r = await chamar(c, 'cl_aprovar', { projeto: P, etapa: 'entrega', palavras_do_usuario: 'aprovado, pode entregar' });
  r = await chamar(c, 'cl_status', { projeto: P });
  checar(/Entregue em/.test(txt(r)), 'entrega aprovada', txt(r));
  r = await chamar(c, 'cl_exportar', { projeto: P });
  checar(!r.isError && /Zip criado/.test(txt(r)), 'exportação liberada depois da auditoria aprovada');
  await chamar(c, 'cl_editar', { projeto: P, caminho: 'css/estilo.css', edicoes: [{ buscar: '.rodape{', substituir: '.rodape{margin-block-start:0;' }] });
  r = await chamar(c, 'cl_status', { projeto: P });
  checar(/Audite de novo/.test(txt(r)), 'mudança depois da entrega pede nova auditoria');

  console.log('\n# Estúdio: refino, crítica, Figma e permissões');
  r = await chamar(c, 'cl_refinar', { projeto: P, comando: 'ousar', foco: 'abertura' });
  checar(/# Ousar/.test(txt(r)) && /--tamanho-4xl/.test(txt(r)) && /Young Serif/.test(txt(r)), 'refino usa os tokens e a direção do projeto');
  r = await chamarLongo(c, 'cl_criticar', { projeto: P });
  checar(/Crítica de direção de arte/.test(txt(r)) && /horários como bilhetes/.test(txt(r)), 'crítica traz a rubrica com a assinatura da direção');
  r = await chamar(c, 'cl_exportar_figma', { projeto: P });
  const codigoFigma = path.join(DIR, P, 'design-system', 'figma', 'code.js');
  checar(!r.isError && fs.existsSync(codigoFigma) && JSON.parse(fs.readFileSync(path.join(DIR, P, 'design-system', 'figma', 'manifest.json'), 'utf8')).main === 'code.js', 'plugin do Figma gerado');
  const { criarFigmaSimulado, rodarPlugin } = await import('./figma-simulado.mjs');
  const fontesFigma = [['Inter', 'Regular'], ['Inter', 'Bold'], ['Young Serif', 'Regular'], ['Hanken Grotesk', 'Regular'], ['Hanken Grotesk', 'SemiBold'], ['JetBrains Mono', 'Regular']];
  const sim = criarFigmaSimulado(fontesFigma);
  const msgFigma = await rodarPlugin(fs.readFileSync(codigoFigma, 'utf8'), sim.figma);
  const totalVars = sim.variaveis.length;
  checar(/Design system importado/.test(msgFigma || '') && sim.colecoes.some((x) => x.modes.length === 2) && sim.textos.length === 11, 'plugin cria variáveis com modos claro/escuro e estilos de texto', msgFigma);
  sim.figma._fechado = undefined;
  await rodarPlugin(fs.readFileSync(codigoFigma, 'utf8'), sim.figma);
  checar(sim.variaveis.length === totalVars, 'rodar o plugin de novo atualiza sem duplicar');
  await estudioApi('/config', { permissoes: { rede: false, apagar: false } });
  r = await chamar(c, 'cl_executar', { projeto: P, comando: 'npm install left-pad' });
  checar(r.isError && /internet/.test(txt(r)), 'sem permissão de rede, comandos que baixam pacotes são recusados');
  r = await chamar(c, 'cl_executar', { projeto: P, comando: 'node -e "console.log(1)"' });
  checar(!r.isError, 'comandos locais continuam liberados');
  r = await chamar(c, 'cl_apagar', { projeto: P, caminho: 'js/agenda.js' });
  checar(r.isError && /Apagar arquivos está desligado/.test(txt(r)), 'sem permissão de apagar, nada é apagado');
  r = await chamar(c, 'cl_projetos', {});
  checar(/navalha-e-cafe[^\n]*estúdio:/.test(txt(r)) && /loja-da-ana [^\n]*modo livre/.test(txt(r)), 'lista de projetos mostra o modo e a etapa');

  console.log('\n# Duas IAs ao mesmo tempo (mesma pasta)');
  const segunda = await conectarStdio();
  await esperar(200);
  checar(segunda.logs.join('').includes('painel já aberto por outro Creative Lovable'), 'a segunda instância reaproveita o painel da primeira');
  await req('POST', '/api/projetos/coletor/erros', { corpo: { tipo: 'erro', mensagem: 'ReferenceError: placar', linha: 3 }, cabecalhos: { 'X-Creative': '1' } });
  r = await chamar(segunda.c, 'cl_erros', { projeto: 'coletor' });
  checar(/ReferenceError: placar/.test(txt(r)), 'a segunda instância lê os erros do painel compartilhado', txt(r));
  const antes = sse.eventos.length;
  await chamar(segunda.c, 'cl_escrever', { projeto: 'coletor', caminho: 'notas.md', conteudo: '# notas' });
  await esperar(400);
  checar(sse.eventos.slice(antes).some((e) => e.tipo === 'atividade' && /notas.md/.test(e.dados.texto)), 'atividade da segunda IA aparece no painel');
  await segunda.c.close();

  sse.fechar();
  await c.close();
  await esperar(300);

  console.log('\n# Modo HTTP com token');
  const TOKEN = 'segredo-123';
  const PORTA_HTTP = PORTA + 300;
  const srv = spawn(process.execPath, [BIN, '--http', '--dir', DIR, '--porta', String(PORTA_HTTP), '--token', TOKEN], { stdio: ['ignore', 'ignore', 'pipe'] });
  let logHttp = '';
  srv.stderr.on('data', (d) => { logHttp += d; });
  for (let i = 0; i < 50 && !/MCP em/.test(logHttp); i++) await esperar(100);
  checar(/MCP em http:\/\/localhost:\d+\/mcp/.test(logHttp), 'servidor HTTP sobe com endpoint /mcp', logHttp);
  const urlMcp = (logHttp.match(/MCP em (\S+)/) || [])[1];
  const ch = new Client({ name: 'teste-http', version: '1.0.0' });
  await ch.connect(new StreamableHTTPClientTransport(new URL(urlMcp)));
  const lista = await ch.listTools();
  checar(lista.tools.length === 33, 'cliente HTTP local lista as ferramentas sem token');
  r = await ch.callTool({ name: 'cl_projetos', arguments: {} });
  checar(/[4-7] projetos/.test(txt(r)), 'cliente HTTP chama ferramentas', txt(r));
  await ch.close();
  const remoto = (cab) => new Promise((ok2) => {
    const q = http.request({ host: '127.0.0.1', port: Number(new URL(urlMcp).port), path: '/mcp', method: 'POST', headers: { Host: 'creative.exemplo.com', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...cab } }, (res) => { res.resume(); ok2(res.statusCode); });
    q.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }));
  });
  checar(await remoto({}) === 401, 'acesso remoto sem token é recusado');
  checar(await remoto({ Authorization: 'Bearer errado' }) === 401, 'token errado é recusado');
  checar(await remoto({ Authorization: `Bearer ${TOKEN}` }) === 200, 'token certo libera o acesso remoto');
  srv.kill('SIGTERM');
  await esperar(200);

  console.log(`\nResultado: ${ok} ok, ${falhas} falhas`);
  fs.rmSync(DIR, { recursive: true, force: true });
  process.exit(falhas ? 1 : 0);
}

principal().catch((e) => { console.error(e); process.exit(2); });
