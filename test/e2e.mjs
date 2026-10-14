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

async function principal() {
  console.log(`Pasta de teste: ${DIR}\nPorta: ${PORTA}\n`);
  const { c, logs } = await conectarStdio();
  await esperar(150);

  console.log('# Conexão');
  const { tools } = await c.listTools();
  checar(tools.length === 21, `21 ferramentas anunciadas (${tools.length})`);
  checar(/laboratório de criação/.test(c.getInstructions() || ''), 'instruções do servidor chegam ao cliente');
  checar(tools.every((t) => t.description && t.description.length > 20), 'toda ferramenta tem descrição');
  checar(tools.find((t) => t.name === 'cl_apagar').annotations?.destructiveHint === true, 'apagar marcada como destrutiva');
  const prompt = await c.getPrompt({ name: 'cl_novo', arguments: { descricao: 'um quiz de capitais' } });
  checar(/quiz de capitais/.test(prompt.messages[0].content.text), 'prompt cl_novo monta o pedido');
  const guia = await c.readResource({ uri: 'creative-lovable://guia' });
  checar(/Fluxo recomendado/.test(guia.contents[0].text), 'recurso creative-lovable://guia legível');
  checar(logs.join('').includes(`painel em ${BASE}`), 'painel iniciou na porta pedida');

  console.log('\n# Projetos');
  let r = await chamar(c, 'cl_projetos', {});
  checar(/Nenhum projeto/.test(txt(r)), 'lista vazia no começo');
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Loja da Ana', modelo: 'web', descricao: 'site de doces' });
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
  r = await chamar(c, 'cl_criar_projeto', { nome: 'App React', modelo: 'react' });
  r = await chamar(c, 'cl_verificar', { projeto: 'app-react' });
  checar(/Nenhum problema/.test(txt(r)), 'modelo react (JSX) passa na verificação', txt(r));
  await chamar(c, 'cl_escrever', { projeto: 'app-react', caminho: 'src/main.jsx', conteudo: "import App from './Inexistente.jsx';\nconst x = <div>oi</div>;\n" });
  r = await chamar(c, 'cl_verificar', { projeto: 'app-react' });
  checar(/Inexistente.jsx/.test(txt(r)), 'import local inexistente é apontado', txt(r));
  r = await chamar(c, 'cl_criar_projeto', { nome: 'Coletor', modelo: 'jogo' });
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
  checar(lista.tools.length === 21, 'cliente HTTP local lista as ferramentas sem token');
  r = await ch.callTool({ name: 'cl_projetos', arguments: {} });
  checar(/4 projetos|5 projetos/.test(txt(r)), 'cliente HTTP chama ferramentas', txt(r));
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
